<script lang="ts">
	import { passageForGate, type GatePassage, type VenusJourney } from '../astro/cycle';
	import { formatDate, formatDayAndTime, formatZodiac } from '../format';
	import {
		CHAKRA_IMAGE,
		GATES,
		spotFor,
		type Gate,
		type Threshold,
		type UnderworldDay
	} from '../symbolic/gates';

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

	let { journey, selected: pickedPassage = null, onselect }: Props = $props();

	/** Le portail que le lecteur a désigné, s'il y en a un. */
	const selected = $derived<GatePassage | null>(pickedPassage ?? null);

	type State = 'ouvert' | 'prochain' | 'franchi' | 'voilé';

	interface Centre {
		key: string;
		name: string;
		chakra: string;
		sanskrit: string;
		index: number;
		color: string;
		x: number;
		y: number;
		/** Measured radius of the symbol in viewBox units. */
		r: number;
		state: State;
		passage: GatePassage | null;
		/** Le chakra, le jour de l'inframonde ou le seuil ouvert à ce rang. */
		portal: Gate | UnderworldDay | Threshold;
	}

	const activePassage = $derived(journey.activePassage);
	const nextPassage = $derived(journey.nextPassage);
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
				chakra: gate.chakra,
				sanskrit: gate.sanskrit,
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
	/** Une entrée de la liste : un chakra, un jour de l'inframonde, ou le seuil. */
	interface Row {
		key: string;
		/** La clé du portail, sans le rang : un chakra peut revenir au huitième rang. */
		gateKey: string;
		name: string;
		sub: string;
		index: number;
		color: string;
		state: State;
		seuil: GatePassage;
	}

	/** L'état d'un portail, quel qu'il soit. */
	function stateOf(passage: GatePassage): State {
		if (passage.gate.key === activePassage?.gate.key) return 'ouvert';
		if (passage.gate.key === nextPassage?.gate.key) return 'prochain';
		return passage.at.getTime() < journey.date.getTime() ? 'franchi' : 'voilé';
	}

	/** Les clés des sept chakras, pour distinguer une entrée de chakra d'un jour ou d'un seuil. */
	const ROW_CHAKRAS = new Set<string>(GATES.map((g) => g.key));

	/** Les portails de la moitié qui n'ont pas de place sur le corps : les jours et le seuil. */
	const horsCorps = $derived(
		portals
			.filter((p) => !GATES.some((g) => g.key === p.gate.key))
			.slice()
			.sort((a, b) => a.index - b.index)
	);

	/** Les onze portails de la moitié, dans l'ordre de lecture du mythe. */
	const rows = $derived<Row[]>(
		portals
			.slice()
			.sort((a, b) => a.index - b.index)
			.map((p) => {
				const gate = p.gate as Partial<Gate> & { key: string; name: string; color: string };
				// Les sept chakras portent un centre du corps ; les jours et le seuil n'en ont aucun.
				const isChakra = GATES.some((g) => g.key === p.gate.key);
				return {
					// Un chakra peut revenir au huitième rang — la couronne à la descente, la racine à
					// l'ascension —, donc la clé porte aussi le rang.
					key: `${p.index}-${p.gate.key}`,
					gateKey: p.gate.key,
					name: p.gate.name,
					sub: isChakra ? `${gate.chakra ?? ''} · ${gate.sanskrit ?? ''}` : 'sans chakra',
					index: p.index,
					color: p.gate.color,
					state: stateOf(p),
					seuil: p
				};
			})
	);

	/** Le portail que le panneau décrit : celui qu'on a cliqué, sinon celui qui est ouvert. */
	const focus = $derived.by((): GatePassage | null => {
		const chosen = pickedPassage;
		if (chosen) {
			const picked = rows.find((r) => r.seuil.at.getTime() === chosen.at.getTime());
			if (picked) return picked.seuil;
		}
		return (
			rows.find((r) => r.state === 'ouvert')?.seuil ??
			rows.find((r) => r.state === 'prochain')?.seuil ??
			null
		);
	});

	/** Ce que le panneau de détail doit montrer : un seuil, un jour, ou un chakra. */
	const seuilFocus = $derived(
		focus && 'anchor' in focus.gate
			? { passage: focus, seuil: focus.gate as Threshold }
			: null
	);
	const jourFocus = $derived(
		focus && 'meaning' in focus.gate && !('anchor' in focus.gate)
			? { passage: focus, jour: focus.gate as UnderworldDay }
			: null
	);
	const chakraFocus = $derived(
		focus && GATES.some((g) => g.key === focus.gate.key) ? { passage: focus, portal: focus.gate as Gate } : null
	);


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
				<!-- Les portails qui ne sont pas des chakras — les trois jours de l'inframonde et le
				     seuil — n'ont pas de place sur le corps : ils sont posés sous la figure, en gris. -->
				{#each horsCorps as p, i (p.gate.key)}
					<circle
						class="hors-corps"
						cx={298 + (i - (horsCorps.length - 1) / 2) * 46}
						cy="760"
						r="17"
						fill="none"
						stroke={p.gate.color}
						stroke-width={p.gate.key === activePassage?.gate.key ? 2.6 : 1.4}
						stroke-dasharray={p.at.getTime() > journey.date.getTime() ? '3 4' : 'none'}
						opacity={p.at.getTime() > journey.date.getTime() ? 0.5 : 1}
					/>
					<text
						x={298 + (i - (horsCorps.length - 1) / 2) * 46}
						y="765"
						text-anchor="middle"
						font-size="12"
						fill={p.gate.color}
						opacity="0.95">{p.index}</text
					>
				{/each}
			</svg>
		</div>
		<p class="credit">
			Figure : <a href={CHAKRA_IMAGE.source} rel="noreferrer noopener" target="_blank">{CHAKRA_IMAGE.attribution}</a> ·
			positions des centres mesurées dans l'image
		</p>
	</div>

	<div class="gates">
		<ul>
			{#each rows as r (r.key)}
				<li>
					<button
						type="button"
						class="gate {r.state} {ROW_CHAKRAS.has(r.gateKey) ? 'chakra' : 'seuil'}"
						class:selected={selected?.at.getTime() === r.seuil.at.getTime()}
						style="--gate:{r.color}"
						onclick={() => onselect?.(selected?.at.getTime() === r.seuil.at.getTime() ? null : r.seuil)}
						aria-pressed={selected?.at.getTime() === r.seuil.at.getTime()}
					>
						<span class="marker">{r.index}</span>
						<span class="text">
							<span class="name">{r.name}<em>{r.sub}</em></span>
							<span class="state">{
								r.state === 'ouvert'
									? 'portail ouvert'
									: r.state === 'prochain'
										? 'prochain portail'
										: r.state === 'franchi'
											? 'franchi'
											: 'à venir'
							}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>

		{#if seuilFocus}
			{@const t = seuilFocus.seuil}
			{@const p = seuilFocus.passage}
			<article class="detail seuil" style="--gate:{t.color}">
				<header>
					<span class="eyebrow">Portail {p.index} · seuil · sans chakra</span>
					<h3>{t.name}</h3>
				</header>
				<dl>
					<div>
						<dt>Ce qu’est ce seuil</dt>
						<dd>{t.meaning}</dd>
					</div>
					<div>
						<dt>Ancrage astronomique</dt>
						<dd>{t.anchor}</dd>
					</div>
					<div>
						<dt>Conjonction exacte</dt>
						<dd class="num">{formatDayAndTime(p.at)} · {formatZodiac(p.longitude)}</dd>
					</div>
				</dl>
			</article>
		{:else if jourFocus}
			{@const d = jourFocus.jour}
			{@const p = jourFocus.passage}
			<article class="detail jour" style="--gate:{d.color}">
				<header>
					<span class="eyebrow">Portail {p.index} · inframonde · sans chakra</span>
					<h3>{d.name}</h3>
				</header>
				<dl>
					<div>
						<dt>Ce qui se passe</dt>
						<dd>{d.meaning}</dd>
					</div>
					<div>
						<dt>Conjonction exacte</dt>
						<dd class="num">{formatDayAndTime(p.at)} · {formatZodiac(p.longitude)}</dd>
					</div>
				</dl>
			</article>
		{:else if chakraFocus}
			{@const g = chakraFocus.portal as Gate}
			<article class="detail" style="--gate:{g.color}">
				<header>
					<span class="eyebrow">Portail {g.index} · {g.chakra} · {g.sanskrit}</span>
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
					{#if chakraFocus.passage}
						<div>
							<dt>Conjonction exacte</dt>
							<dd class="num">
								{formatDayAndTime(chakraFocus.passage.at)} · {formatZodiac(chakraFocus.passage.longitude)}
							</dd>
						</div>
					{/if}
				</dl>
			</article>
		{/if}

		<p class="axis">
			{#if activePassage}
				Portail ouvert : {activePassage.index} · {activePassage.gate.name} — {formatDate(activePassage.at)}.
			{:else if nextPassage}
				Prochain portail : {nextPassage.index} · {nextPassage.gate.name} — {formatDate(nextPassage.at)}.
			{:else}
				Aucun portail à venir dans cette moitié du cycle.
			{/if}
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

	/* Les jours de l'inframonde et le seuil sont gris : c'est le temps de l'invisible, et ils
	   n'ouvrent aucun centre du corps. */
	.gate.seuil {
		background: #ffffff03;
	}

	.gate.seuil .marker {
		border-color: var(--gate);
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
