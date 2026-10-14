<script lang="ts">
	import { passageForGate, type GatePassage, type VenusJourney } from '../astro/cycle';
	import { formatDayAndTime, formatLatitudeSide, formatTime, formatZodiac } from '../format';
	import { CHAKRA_IMAGE, GATES, GATE_COUNT, spotFor, type Gate, type Threshold } from '../symbolic/gates';

	/**
	 * The seven centres, drawn over the chakra figure.
	 *
	 * The hotspots are positioned from measurements taken off the image itself rather
	 * than guessed: each chakra is painted in its canonical hue, so the PNG was decoded
	 * pixel by pixel and the centre of each colour cluster recorded (see
	 * `CHAKRA_SPOTS` in `src/lib/symbolic/gates.ts`). That is why the rings sit exactly
	 * on the figure at any size.
	 *
	 * State is per gate, not per passage:
	 *
	 * - **ouvert** — the Moon is inside the orb of Venus and this gate is the one open;
	 * - **prochain** — the next conjunction Venus will hand over a garment at;
	 * - **franchi** — already passed in this half of the cycle;
	 * - **voilé** — still to come, garment still worn.
	 */
	interface Props {
		journey: VenusJourney;
		selected?: GatePassage | null;
		onselect?: (passage: GatePassage | null) => void;
	}

	let { journey, selected = null, onselect }: Props = $props();

	type State = 'ouvert' | 'prochain' | 'franchi' | 'voilé';

	interface Centre {
		key: string;
		name: string;
		index: number;
		color: string;
		x: number;
		y: number;
		/** Measured radius of the symbol in viewBox units. */
		r: number;
		state: State;
		passage: GatePassage | null;
		/** The chakra, or the threshold when this half holds eight portals. */
		portal: Gate | Threshold;
	}

	const activePassage = $derived(journey.activePassage);
	const nextPassage = $derived(journey.nextPassage);
	/** True once the reader has picked a centre themselves. */
	const picked = $derived(selected?.gate.key ?? null);

	/**
	 * The portals of the half of the cycle in progress, in order.
	 *
	 * Seven of them, or eight when this half happens to hold one observable conjunction
	 * more — in which case the eighth is the threshold rather than a chakra, and it is drawn
	 * apart from the body because it has no place on it.
	 */
	const portals = $derived(
		(journey.star === 'morning' ? journey.morning.portals : journey.evening.portals).slice()
	);

	/** The seven chakras, with the state the reader's half gives them. */
	const centres = $derived<Centre[]>(
		GATES.map((gate) => {
			const spot = spotFor(gate.key);
			const passage = passageForGate(journey, gate.key);
			const state: State =
				gate.key === activePassage?.gate.key
					? 'ouvert'
					: gate.key === nextPassage?.gate.key
						? 'prochain'
						: passage && passage.at.getTime() < journey.date.getTime()
							? 'franchi'
							: 'voilé';
			return {
				key: gate.key,
				name: gate.name,
				index: gate.index,
				color: gate.color,
				x: spot.x * CHAKRA_IMAGE.width,
				y: spot.y * CHAKRA_IMAGE.height,
				r: spot.r * CHAKRA_IMAGE.width,
				state,
				passage,
				portal: gate
			};
		})
	);

	/** The threshold of this half, when it has one. */
	const seuil = $derived(portals.length > GATE_COUNT ? portals[GATE_COUNT] : null);

	const seuilState = $derived<State>(
		!seuil
			? 'voilé'
			: seuil.gate.key === activePassage?.gate.key
				? 'ouvert'
				: seuil.gate.key === nextPassage?.gate.key
					? 'prochain'
					: seuil.at.getTime() < journey.date.getTime()
						? 'franchi'
						: 'voilé'
	);

	/**
	 * The step the detail panel describes: an explicitly picked centre, otherwise the one
	 * standing open, otherwise the next one. A step is a chakra or, once per half, the
	 * threshold that closes it.
	 */
	type Step = Centre | { seuil: NonNullable<typeof seuil>; state: State };

	const focus = $derived<Step | null>(
		(picked ? (centres.find((c) => c.key === picked) ?? (seuil && seuil.gate.key === picked ? { seuil, state: seuilState } : null)) : null) ??
			centres.find((c) => c.state === 'ouvert') ??
			(seuil && seuilState === 'ouvert' ? { seuil, state: seuilState } : null) ??
			centres.find((c) => c.state === 'prochain') ??
			(seuil && seuilState === 'prochain' ? { seuil, state: seuilState } : null) ??
			null
	);

	function click(centre: Centre) {
		onselect?.(selected?.gate.key === centre.key ? null : centre.passage);
	}
</script>

<div class="diagram">
	<div class="figure">
		<div class="canvas" style="--ratio:{CHAKRA_IMAGE.width} / {CHAKRA_IMAGE.height}">
			<img
				src="/seven-chakras-dark.png"
				alt="Les sept chakras disposés le long de la colonne vertébrale, du sommet du crâne à la racine."
				width={CHAKRA_IMAGE.width}
				height={CHAKRA_IMAGE.height}
				loading="lazy"
				decoding="async"
			/>
			<div class="veil"></div>
			<svg viewBox="0 0 {CHAKRA_IMAGE.width} {CHAKRA_IMAGE.height}" aria-hidden="true">
				<defs>
					{#each centres as c (c.key)}
						<radialGradient id="halo-{c.key}">
							<stop offset="0%" stop-color={c.color} stop-opacity="0.85" />
							<stop offset="45%" stop-color={c.color} stop-opacity="0.35" />
							<stop offset="100%" stop-color={c.color} stop-opacity="0" />
						</radialGradient>
					{/each}
				</defs>

				<!-- the axis of the descent -->
				<line x1="298" y1="61" x2="298" y2="706" stroke="#ffffff" stroke-width="1" opacity="0.12" />

				{#each centres as c (c.key)}
					{#if c.state === 'ouvert' || c.state === 'prochain'}
						<circle
							cx={c.x}
							cy={c.y}
							r={c.r * 1.9}
							fill="url(#halo-{c.key})"
							class="halo"
							class:live={c.state === 'ouvert'}
						/>
					{/if}
					<!-- Ring sized from the measured symbol, with a hit target that never
					     shrinks below 34 px so the small centres stay clickable. -->
					<circle
						class="gate-ring"
						cx={c.x}
						cy={c.y}
						r={c.r}
						fill="none"
						stroke={c.state === 'voilé' ? '#6c7288' : c.color}
						stroke-width={c.state === 'ouvert' ? 2.4 : c.state === 'prochain' ? 1.8 : 1.1}
						stroke-dasharray={c.state === 'voilé' ? '4 6' : c.state === 'franchi' ? '3 3' : 'none'}
						opacity={c.state === 'voilé' ? 0.4 : c.state === 'franchi' ? 0.6 : 1}
					/>
					<circle class="gate-hit" cx={c.x} cy={c.y} r={Math.max(c.r + 6, 34)} fill="transparent" />
				{/each}
				{#if seuil}
					<!-- The threshold is not on the body, so it is drawn as a band that closes
					     the axis rather than as a point on it. -->
					<circle
						class="seuil-mark"
						cx="298"
						cy="742"
						r="20"
						fill="none"
						stroke={seuil.gate.color}
						stroke-width={seuilState === 'ouvert' ? 2.6 : seuilState === 'prochain' ? 2 : 1.2}
						stroke-dasharray={seuilState === 'voilé' ? '3 4' : 'none'}
						opacity={seuilState === 'voilé' ? 0.45 : 1}
					/>
					<text x="298" y="747" text-anchor="middle" font-size="13" fill={seuil.gate.color} opacity="0.95">
						8
					</text>
				{/if}
			</svg>
		</div>
		<p class="credit">
			Figure : <a href={CHAKRA_IMAGE.source} rel="noreferrer noopener" target="_blank">{CHAKRA_IMAGE.attribution}</a> ·
			positions des centres mesurées dans l'image
		</p>
	</div>

	<div class="gates">
		<ul>
			{#each centres as c (c.key)}
				<li>
					<button
						type="button"
						class="gate {c.state}"
						class:selected={selected?.gate.key === c.key}
						style="--gate:{c.color}"
						onclick={() => click(c)}
						aria-pressed={selected?.gate.key === c.key}
					>
						<span class="marker">{c.index}</span>
						<span class="text">
							<span class="name">{c.name}<em>{(c.portal as Gate).sanskrit}</em></span>
							<span class="state">{
								c.state === 'ouvert'
									? 'portail ouvert'
									: c.state === 'prochain'
										? 'prochain portail'
										: c.state === 'franchi'
											? 'franchi'
											: 'voilé'
							}</span>
						</span>
					</button>
				</li>
			{/each}
			{#if seuil}
				<li>
					<button
						type="button"
						class="gate {seuilState} seuil"
						class:selected={selected?.gate.key === seuil.gate.key}
						style="--gate:{seuil.gate.color}"
						onclick={() => onselect?.(selected?.gate.key === seuil.gate.key ? null : seuil)}
						aria-pressed={selected?.gate.key === seuil.gate.key}
					>
						<span class="marker">8</span>
						<span class="text">
							<span class="name"
								>{seuil.gate.name}<em
									>seuil 8 · {journey.star === 'morning' ? 'la descente s’achève' : 'la sortie de l’enfer'}</em
								></span
							>
							<span class="state">{
								seuilState === 'ouvert'
									? 'seuil franchi'
									: seuilState === 'prochain'
										? 'prochain seuil'
										: seuilState === 'franchi'
											? 'franchi'
											: 'à venir'
							}</span>
						</span>
					</button>
				</li>
			{/if}
		</ul>

		{#if focus && 'seuil' in focus}
			{@const t = focus.seuil.gate}
			{@const p = focus.seuil}
			<article class="detail" style="--gate:{t.color}">
				<header>
					<span class="eyebrow"
						>Seuil 8 · {'meaning' in t && t.star === 'morning'
							? 'fin de la descente, la mort'
							: 'sortie de l’enfer, la vie'}</span
					>
					<h3>{t.name}</h3>
				</header>
				<dl>
					{#if 'meaning' in t}
						<div>
							<dt>Ce qu’est ce seuil</dt>
							<dd>{t.meaning}</dd>
						</div>
						<div>
							<dt>Ancrage astronomique</dt>
							<dd>{t.anchor}</dd>
						</div>
					{/if}
					<div>
						<dt>Conjonction exacte</dt>
						<dd class="num">{formatDayAndTime(p.at)} · {formatZodiac(p.longitude)}</dd>
					</div>
					<div>
						<dt>Écart réel à cet instant</dt>
						<dd class="num">
							{p.separation.toFixed(2).replace('.', ',')}° de Vénus
							<span class="aside">la Lune passe {formatLatitudeSide(p.moonLatitude)}</span>
						</dd>
					</div>
				</dl>
			</article>
		{:else if focus}
			{@const g = focus.portal as Gate}
			<article class="detail" style="--gate:{g.color}">
				<header>
					<span class="eyebrow">Porte {g.index} · {g.sanskrit}</span>
					<h3>{g.name}</h3>
				</header>
				<dl>
					<div>
						<dt>Vêtement abandonné</dt>
						<dd>{g.garment}</dd>
					</div>
					<div>
						<dt>Ce qui est lâché</dt>
						<dd>{g.release}</dd>
					</div>
					{#if focus.passage}
						<div>
							<dt>Conjonction exacte</dt>
							<dd class="num">
								{formatDayAndTime(focus.passage.at)} · {formatZodiac(focus.passage.longitude)}
							</dd>
						</div>
						<div>
							<dt>Écart réel à cet instant</dt>
							<dd class="num">
								{focus.passage.separation.toFixed(2).replace('.', ',')}° de Vénus
								<span class="aside"
									>la Lune passe {formatLatitudeSide(focus.passage.moonLatitude)}</span
								>
							</dd>
						</div>
						{#if Math.abs(focus.passage.closestAt.getTime() - focus.passage.at.getTime()) > 30 * 60_000}
							<div>
								<dt>Passage au plus près</dt>
								<dd class="num">
									{formatTime(focus.passage.closestAt)} · {focus.passage.closestSeparation
										.toFixed(2)
										.replace('.', ',')}°
								</dd>
							</div>
						{/if}
					{/if}
				</dl>
			</article>
		{/if}

		<p class="axis">
			<strong
				>{portals.length} portails dans cette moitié du cycle</strong
			>{portals.length > GATE_COUNT
				? ' — les sept chakras, puis le seuil.'
				: ' — les sept chakras.'}
			{#if activePassage}
				Portail ouvert : {activePassage.index} · {activePassage.gate.name}, conjonction exacte le
				{formatDayAndTime(activePassage.at)}.
			{:else if nextPassage}
				Prochain portail : {nextPassage.index} · {nextPassage.gate.name}, conjonction exacte le
				{formatDayAndTime(nextPassage.at)}.
			{:else}
				Aucun portail à venir dans cette moitié.
			{/if}
			Les {journey.conjunctions.length - (journey.morning.portals.length + journey.evening.portals.length)}
			conjonctions sous le seuil de {journey.portalVisibility}° d’élongation n’ouvrent pas de portail.
		</p>
	</div>
</div>

<style>
	.diagram {
		display: grid;
		grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
		gap: 1.6rem;
		align-items: start;
	}

	@media (max-width: 880px) {
		.diagram {
			grid-template-columns: 1fr;
		}
	}

	.figure {
		margin: 0;
	}

	.canvas {
		position: relative;
		aspect-ratio: var(--ratio);
		border-radius: var(--radius);
		overflow: hidden;
		background: #0a0c15;
		border: 1px solid var(--line);
	}

	.canvas img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		object-fit: contain;
		/* The file is the dark edition, built from the original by
		   `tools/make-dark-figure.py`: paper made transparent, line work inverted in
		   luminance only (so no hue moves), and each centre normalised to its canonical
		   chakra colour. Nothing is filtered at runtime. */
	}

	.veil {
		position: absolute;
		inset: 0;
		background: radial-gradient(circle at 50% 50%, transparent 45%, #06060caa 100%);
		pointer-events: none;
	}

	.canvas svg {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}

	.halo {
		opacity: 0.5;
	}

	.halo.live {
		opacity: 1;
		animation: breathe 4.5s ease-in-out infinite;
	}

	@keyframes breathe {
		0%,
		100% {
			opacity: 0.55;
		}
		50% {
			opacity: 1;
		}
	}

	.credit {
		margin-top: 0.5rem;
		font-size: 0.68rem;
		color: var(--ink-ghost);
	}

	.gates ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.gate {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.7rem;
		padding: 0.45rem 0.65rem;
		text-align: left;
		background: #ffffff04;
		border: 1px solid var(--line-soft);
		border-radius: var(--radius-sm);
		transition: background 0.15s, border-color 0.15s;
	}

	.gate:hover {
		background: #ffffff0a;
	}

	.gate.selected {
		border-color: var(--gate);
		background: #ffffff0d;
	}

	.gate.voilé {
		opacity: 0.45;
	}

	.marker {
		flex: none;
		width: 1.5rem;
		height: 1.5rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 1.5px solid var(--gate);
		color: var(--gate);
		font-size: 0.72rem;
		font-weight: 700;
	}

	.gate.ouvert .marker {
		background: var(--gate);
		color: #06060c;
		box-shadow: 0 0 16px -2px var(--gate);
	}

	.text {
		display: flex;
		flex-direction: column;
		line-height: 1.25;
	}

	.name {
		font-size: 0.82rem;
		font-weight: 600;
	}

	.name em {
		margin-left: 0.45rem;
		font-style: normal;
		font-size: 0.68rem;
		color: var(--ink-ghost);
		letter-spacing: 0.04em;
	}

	.state {
		font-size: 0.68rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--ink-faint);
	}

	.gate.ouvert .state {
		color: var(--gate);
		font-weight: 700;
	}

	.detail {
		margin-top: 1rem;
		padding: 0.9rem 1rem;
		border: 1px solid var(--line);
		border-left: 3px solid var(--gate);
		border-radius: var(--radius-sm);
		background: linear-gradient(150deg, #ffffff08, transparent);
	}

	.detail h3 {
		font-size: 1.05rem;
		margin-top: 0.15rem;
	}

	.detail dl {
		margin: 0.7rem 0 0;
		display: grid;
		gap: 0.55rem;
	}

	.detail dt {
		font-size: 0.66rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--ink-ghost);
	}

	.detail dd {
		margin: 0.1rem 0 0;
		font-size: 0.82rem;
		color: var(--ink-dim);
	}

	.aside {
		display: block;
		font-size: 0.7rem;
		color: var(--ink-ghost);
	}

	.axis {
		margin-top: 0.8rem;
		font-size: 0.72rem;
		color: var(--ink-faint);
	}
</style>
