<script lang="ts">
	import type { GatePassage, VenusJourney } from '../astro/cycle';
	import { formatDate, formatShortDate, formatZodiac } from '../format';

	/**
	 * The whole cycle on one line of time.
	 *
	 * The bar spans the reader's cycle from the inferior conjunction that opened it to
	 * the one that closes it. Inside it: the retrograde span in red, the inframonde in
	 * violet, the superior conjunction as a mark, and a tick per Moon-Venus conjunction
	 * coloured by the chakra it hands over — solid when the passage really opens a gate,
	 * faint when the Moon misses Venus beyond the orb. The reader's moment is the cursor.
	 *
	 * The seven gates of each half are always in the same order, so the ticks read as a
	 * descent: from the crown near the conjunction down to the root, then again.
	 */
	interface Props {
		journey: VenusJourney;
		selected?: GatePassage | null;
		onselect?: (passage: GatePassage) => void;
		ondate?: (date: Date) => void;
	}

	let { journey, selected = null, onselect, ondate }: Props = $props();

	const total = $derived(journey.synodicDays);
	const pct = $derived((date: Date) => ((date.getTime() - journey.start.at.getTime()) / (total * 86_400_000)) * 100);

	const nowPct = $derived(pct(journey.date));
	const midPct = $derived(pct(journey.mid.at));
	const retroPct = $derived(
		journey.retrograde
			? { left: pct(journey.retrograde.retrogradeStation.at), width: pct(journey.retrograde.directStation.at) - pct(journey.retrograde.retrogradeStation.at) }
			: null
	);
	const invisiblePct = $derived(
		journey.invisible
			? { left: pct(journey.invisible.start), width: pct(journey.invisible.end) - pct(journey.invisible.start) }
			: null
	);

	function scrub(event: MouseEvent) {
		if (!ondate) return;
		const track = event.currentTarget as HTMLElement;
		const rect = track.getBoundingClientRect();
		const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
		ondate(new Date(journey.start.at.getTime() + ratio * total * 86_400_000));
	}
</script>

<div class="timeline">
	<div class="head">
		<span class="eyebrow">Cycle en cours</span>
		<span class="span num">{formatDate(journey.start.at)} → {formatDate(journey.end.at)}</span>
		<span class="chip"><i class="chip-dot" style="color:var(--venus)"></i>{journey.synodicDays.toFixed(1).replace('.', ',')} jours</span>
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="track" onclick={scrub} role="presentation">
		{#if retroPct}
			<div class="band retro" style="left:{retroPct.left}%;width:{retroPct.width}%"></div>
		{/if}
		{#if invisiblePct}
			<div class="band under" style="left:{invisiblePct.left}%;width:{invisiblePct.width}%"></div>
		{/if}

		<div class="mid" style="left:{midPct}%"></div>

		{#each journey.conjunctions as passage (passage.at.getTime())}
			<button
				type="button"
				class="tick"
				class:open={passage.open}
				class:selected={selected?.at.getTime() === passage.at.getTime()}
				style="left:{pct(passage.at)}%;--gate:{passage.gate.color}"
				title="{passage.index} · {passage.gate.name} — {formatShortDate(passage.at)}, à {formatZodiac(passage.longitude)}"
				aria-label="{passage.index}, {passage.gate.name}, {formatShortDate(passage.at)}, à {formatZodiac(passage.longitude)}"
				onclick={(event) => {
					event.stopPropagation();
					onselect?.(passage);
				}}
			></button>
		{/each}

		<div class="cursor" style="left:{nowPct}%"></div>
	</div>

	<div class="scale">
		<span>conjonction inférieure<br /><b>{formatShortDate(journey.start.at)}</b></span>
		<span class="center">conjonction supérieure<br /><b>{formatShortDate(journey.mid.at)}</b></span>
		<span class="right">conjonction inférieure<br /><b>{formatShortDate(journey.end.at)}</b></span>
	</div>

	<div class="legend">
		<span><i style="background:#ff6b78"></i> rétrogradation</span>
		<span><i style="background:#8b5cf6;opacity:0.55"></i> inframonde</span>
		<span><i style="background:#8fb6ff"></i> conjonction supérieure</span>
		<span>chaque graduation est un portail</span>
	</div>
</div>

<style>
	.timeline {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.7rem;
		flex-wrap: wrap;
	}

	.span {
		font-size: 0.78rem;
		color: var(--ink-dim);
	}

	.track {
		position: relative;
		height: 54px;
		border-radius: var(--radius-sm);
		background: linear-gradient(90deg, #ffffff08, #ffffff04);
		border: 1px solid var(--line-soft);
		cursor: crosshair;
	}

	.band {
		position: absolute;
		top: 0;
		bottom: 0;
	}

	.band.retro {
		background: #ff6b7822;
		border-left: 1px solid #ff6b7855;
		border-right: 1px solid #ff6b7855;
	}

	.band.under {
		background: #8b5cf63d;
		border-left: 1px solid #8b5cf688;
		border-right: 1px solid #8b5cf688;
	}

	.mid {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 1px;
		background: #8fb6ff88;
	}

	.tick {
		position: absolute;
		top: 50%;
		width: 3px;
		height: 22px;
		margin-left: -1.5px;
		margin-top: -11px;
		padding: 0;
		border: 0;
		border-radius: 2px;
		background: #2b3046;
		opacity: 0.75;
		transform: scaleY(0.6);
		transform-origin: center;
		transition: transform 0.15s, opacity 0.15s;
	}

	.tick.open {
		background: var(--gate);
		opacity: 1;
		transform: scaleY(1);
		box-shadow: 0 0 10px -2px var(--gate);
	}

	.tick:hover,
	.tick.selected {
		transform: scaleY(1.35);
		opacity: 1;
		outline: 1px solid var(--gate);
		outline-offset: 1px;
	}

	.cursor {
		position: absolute;
		top: -4px;
		bottom: -4px;
		width: 2px;
		margin-left: -1px;
		background: #ffffff;
		box-shadow: 0 0 10px #ffffffaa;
	}

	.cursor::before {
		content: '';
		position: absolute;
		top: -3px;
		left: 50%;
		transform: translateX(-50%);
		border-left: 4px solid transparent;
		border-right: 4px solid transparent;
		border-top: 5px solid #ffffff;
	}

	.scale {
		display: flex;
		justify-content: space-between;
		font-size: 0.68rem;
		color: var(--ink-faint);
		line-height: 1.35;
	}

	.scale .center {
		text-align: center;
	}

	.scale .right {
		text-align: right;
	}

	.scale b {
		color: var(--ink-dim);
		font-weight: 600;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		font-size: 0.68rem;
		color: var(--ink-ghost);
	}

	.legend i {
		display: inline-block;
		width: 0.7rem;
		height: 0.3rem;
		border-radius: 999px;
		margin-right: 0.35rem;
		vertical-align: middle;
	}
</style>
