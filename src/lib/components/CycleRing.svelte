<script lang="ts">
	import type { GatePassage, VenusJourney } from '../astro/cycle';
	import { formatShortDate, formatTime, formatZodiac } from '../format';

	/**
	 * The cycle as a dial: one turn of the wheel is one synodic cycle, from the inferior
	 * conjunction where Venus disappears to the next.
	 *
	 * Reading clockwise from the top, which is the inferior conjunction:
	 *
	 * - the first half (the morning star) occupies the right side up to the superior
	 *   conjunction at the bottom, the second half (the evening star) the left side;
	 * - the retrograde window straddles the top, because it is centred on the inferior
	 *   conjunction;
	 * - the inframonde is the darkest arc inside it;
	 * - each of the ticks is a Moon-Venus conjunction, filled when the passage opens a
	 *   full gate and hollow when the Moon misses Venus by more than the orb.
	 */
	interface Props {
		journey: VenusJourney;
		selected?: GatePassage | null;
		onselect?: (passage: GatePassage) => void;
	}

	let { journey, selected = null, onselect }: Props = $props();

	const SIZE = 300;
	const C = SIZE / 2;
	const R_TRACK = 112;
	const R_TICK = 96;
	const R_DOT = 128;

	/** Fraction of the cycle, 0 at the top and increasing clockwise. */
	function frac(date: Date): number {
		return (date.getTime() - journey.start.at.getTime()) / (journey.synodicDays * 86_400_000);
	}

	function point(radius: number, fraction: number): { x: number; y: number } {
		const angle = fraction * 2 * Math.PI - Math.PI / 2;
		return { x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) };
	}

	/** Arc path between two fractions of the cycle. */
	function arc(from: number, to: number, radius = R_TRACK): string {
		const start = point(radius, from);
		const end = point(radius, to);
		const sweep = ((to - from) % 1 + 1) % 1;
		const large = sweep > 0.5 ? 1 : 0;
		return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${radius} ${radius} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
	}

	const now = $derived(frac(journey.date));
	const morningEnd = $derived(frac(journey.mid.at));

	const retro = $derived(
		journey.retrograde
			? { from: frac(journey.retrograde.retrogradeStation.at), to: frac(journey.retrograde.directStation.at) }
			: null
	);
	const invisible = $derived(
		journey.invisible ? { from: frac(journey.invisible.start), to: frac(journey.invisible.end) } : null
	);

	const nowPoint = $derived(point(R_TRACK, now));

	/** The seven gates of each half, for the legend beneath the dial. */
	const gateCount = $derived({
		morning: journey.morning.passages.filter((p) => p.open).length,
		evening: journey.evening.passages.filter((p) => p.open).length
	});

	const accessibleLabel = $derived(
		`Cadran du cycle : ${journey.star === 'morning' ? 'étoile du matin' : 'étoile du soir'}, ` +
			`jour ${Math.round(journey.dayOfCycle)} sur ${Math.round(journey.synodicDays)}`
	);
</script>

<figure class="ring">
	<svg viewBox="0 0 {SIZE} {SIZE}" role="img" aria-label={accessibleLabel}>
		<defs>
			<linearGradient id="morningArc" x1="0" y1="0" x2="1" y2="1">
				<stop offset="0%" stop-color="#7ce0b0" />
				<stop offset="100%" stop-color="#3f9ec9" />
			</linearGradient>
			<linearGradient id="eveningArc" x1="1" y1="0" x2="0" y2="1">
				<stop offset="0%" stop-color="#c08bff" />
				<stop offset="100%" stop-color="#8b5cf6" />
			</linearGradient>
			<filter id="soft" x="-40%" y="-40%" width="180%" height="180%">
				<feGaussianBlur stdDeviation="4" />
			</filter>
		</defs>

		<!-- the two halves -->
		<path d={arc(0, morningEnd)} fill="none" stroke="url(#morningArc)" stroke-width="7" stroke-linecap="round" opacity="0.85" />
		<path d={arc(morningEnd, 1)} fill="none" stroke="url(#eveningArc)" stroke-width="7" stroke-linecap="round" opacity="0.85" />

		<!-- the inframonde: the stretch where Venus is lost to the Sun -->
		{#if invisible}
			<path
				d={arc(invisible.from, invisible.to)}
				fill="none"
				stroke="#04040a"
				stroke-width="11"
				stroke-linecap="butt"
			/>
			<path
				d={arc(invisible.from, invisible.to)}
				fill="none"
				stroke="#8b5cf6"
				stroke-width="11"
				stroke-linecap="butt"
				opacity="0.28"
			/>
		{/if}

		<!-- the retrograde season -->
		{#if retro}
			<path d={arc(retro.from, retro.to, R_TRACK - 13)} fill="none" stroke="#ff6b78" stroke-width="3" opacity="0.75" />
			<path
				d={arc(retro.from, retro.to, R_TRACK - 13)}
				fill="none"
				stroke="#ff6b78"
				stroke-width="8"
				opacity="0.18"
				filter="url(#soft)"
			/>
		{/if}

		<!-- superior conjunction, the far side of the Sun -->
		{#if journey.mid}
			{@const mid = point(R_TRACK, morningEnd)}
			<circle cx={mid.x} cy={mid.y} r="5.5" fill="#0a0c15" stroke="#8fb6ff" stroke-width="2" />
		{/if}

		<!-- the Moon-Venus conjunctions -->
		{#each journey.conjunctions as passage (passage.at.getTime())}
			{@const p = point(R_TICK, frac(passage.at))}
			{@const isSel = selected?.at.getTime() === passage.at.getTime()}
			<line
				x1={point(R_TICK - 9, frac(passage.at)).x}
				y1={point(R_TICK - 9, frac(passage.at)).y}
				x2={p.x}
				y2={p.y}
				stroke={passage.open ? passage.gate.color : '#2b3046'}
				stroke-width={isSel ? 3 : 2}
				stroke-linecap="round"
				opacity={passage.open ? 1 : 0.75}
			/>
			<circle
				cx={point(R_DOT, frac(passage.at)).x}
				cy={point(R_DOT, frac(passage.at)).y}
				r={isSel ? 5 : passage.open ? 3.6 : 2.4}
				fill={passage.open ? passage.gate.color : '#0d0f1a'}
				stroke={passage.open ? '#06060c' : '#39405c'}
				stroke-width="1.4"
			/>
		{/each}

		<!-- the reader's moment -->
		<line
			x1={C}
			y1={C}
			x2={nowPoint.x}
			y2={nowPoint.y}
			stroke="#ffffff"
			stroke-width="1.5"
			opacity="0.5"
		/>
		<circle cx={nowPoint.x} cy={nowPoint.y} r="7" fill="#ffffff" opacity="0.16" />
		<circle cx={nowPoint.x} cy={nowPoint.y} r="3.4" fill="#ffffff" />
		<circle cx={C} cy={C} r="30" fill="#0a0c15" stroke="#212538" stroke-width="1" />
		<text x={C} y={C - 2} text-anchor="middle" fill="#eceef6" font-size="15" font-weight="600">
			{Math.round(journey.progress * 100)} %
		</text>
		<text x={C} y={C + 13} text-anchor="middle" fill="#6c7288" font-size="9.5" letter-spacing="0.08em">
			DU CYCLE
		</text>

		<!-- labels for the two halves -->
		<text x={SIZE - 12} y={C + 4} text-anchor="end" fill="#7ce0b0" font-size="10" font-weight="600">
			MATIN
		</text>
		<text x={12} y={C + 4} text-anchor="start" fill="#c08bff" font-size="10" font-weight="600">SOIR</text>
		<text x={C} y={SIZE - 6} text-anchor="middle" fill="#6c7288" font-size="9.5">
			conjonction supérieure · {formatShortDate(journey.mid.at)}
		</text>
		<text x={C} y={12} text-anchor="middle" fill="#6c7288" font-size="9.5">
			conjonction inférieure · {formatShortDate(journey.start.at)}
		</text>
	</svg>

	<figcaption>
		<span class="legend"><i style="background:#7ce0b0"></i> étoile du matin</span>
		<span class="legend"><i style="background:#c08bff"></i> étoile du soir</span>
		<span class="legend"><i style="background:#ff6b78"></i> rétrogradation {journey.retrograde ? `(${journey.retrograde.days.toFixed(0)} j)` : ''}</span>
		<span class="legend"><i style="background:#8b5cf6;opacity:0.6"></i> inframonde {journey.invisible ? `(${journey.invisible.days.toFixed(1)} j)` : ''}</span>
		<span class="legend legend-gates"
			>{gateCount.morning + gateCount.evening} portails ouverts sur {journey.conjunctions.length} conjonctions</span
		>
	</figcaption>
</figure>

{#if onselect}
	<ul class="passage-list">
		{#each journey.conjunctions as passage (passage.at.getTime())}
			<li>
				<button
					type="button"
					class="passage"
					class:open={passage.open}
					class:selected={selected?.at.getTime() === passage.at.getTime()}
					style="--gate:{passage.gate.color}"
					onclick={() => onselect(passage)}
				>
					<span class="passage-gate">Porte {passage.index} · {passage.gate.name}</span>
					<span class="passage-when num"
						>{formatShortDate(passage.at)} · {formatTime(passage.at)}</span
					>
					<span
						class="passage-sep num"
						title="À {formatZodiac(passage.longitude)} — distance réelle entre la Lune et Vénus à cet instant"
						>{passage.separation.toFixed(1).replace('.', ',')}°</span
					>
				</button>
			</li>
		{/each}
	</ul>
{/if}

<style>
	.ring {
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	svg {
		width: 100%;
		height: auto;
		max-width: 340px;
		margin: 0 auto;
		display: block;
	}

	figcaption {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1rem;
		font-size: 0.72rem;
		color: var(--ink-faint);
	}

	.legend {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
	}

	.legend i {
		width: 0.7rem;
		height: 0.2rem;
		border-radius: 999px;
	}

	.legend-gates {
		margin-left: auto;
	}

	.passage-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
		gap: 0.35rem;
	}

	.passage {
		width: 100%;
		display: grid;
		grid-template-columns: 1fr auto;
		grid-template-areas: 'gate sep' 'when sep';
		gap: 0 0.6rem;
		padding: 0.4rem 0.6rem;
		text-align: left;
		background: #ffffff05;
		border: 1px solid var(--line-soft);
		border-left: 3px solid var(--gate);
		border-radius: var(--radius-sm);
		opacity: 0.6;
	}

	.passage.open {
		opacity: 1;
	}

	.passage.selected {
		background: #ffffff10;
		border-color: var(--gate);
	}

	.passage-gate {
		grid-area: gate;
		font-size: 0.76rem;
		font-weight: 600;
	}

	.passage-when {
		grid-area: when;
		font-size: 0.7rem;
		color: var(--ink-faint);
	}

	.passage-sep {
		grid-area: sep;
		align-self: center;
		font-size: 0.8rem;
		color: var(--gate);
		font-weight: 600;
	}
</style>
