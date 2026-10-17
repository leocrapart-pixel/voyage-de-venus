<script lang="ts">
	import { passageForGate, type GatePassage, type VenusJourney } from '../astro/cycle';
	import { formatDate, formatDayAndTime, formatZodiac } from '../format';
	import {
		CHAKRA_IMAGE,
		GATES,
		isThresholdKey,
		spotFor,
		type Gate,
		type Threshold
	} from '../symbolic/gates';

	/**
	 * Les sept centres du corps, et les portails qui n'en sont pas.
	 *
	 * L'image porte les sept chakras ; les anneaux sont posés aux positions **mesurées** dans
	 * l'image elle-même (voir `CHAKRA_SPOTS`). Le huitième portail — la conscience — n'a pas de
	 * place sur le corps : il est dessiné sous la figure, à part, et gris comme lui.
	 *
	 * Un portail est ouvert, prochain, franchi ou à venir, selon la date du moment observé.
	 */
	interface Props {
		journey: VenusJourney;
		selected?: GatePassage | null;
		onselect?: (passage: GatePassage | null) => void;
	}

	let { journey, selected: pickedPassage = null, onselect }: Props = $props();

	type State = 'ouvert' | 'prochain' | 'franchi' | 'voilé';

	/** Le portail que le lecteur a désigné, s'il y en a un. */
	const selected = $derived<GatePassage | null>(pickedPassage ?? null);

	const activePassage = $derived(journey.activePassage);
	const nextPassage = $derived(journey.nextPassage);

	/** Les portails de la phase en cours, dans l'ordre de lecture. */
	const portals = $derived((journey.star === 'morning' ? journey.morning.portals : journey.evening.portals).slice());

	const rows = $derived(
		portals
			.slice()
			.sort((a, b) => a.index - b.index)
			.map((passage) => {
				const gate = passage.gate as Partial<Gate>;
				const isChakra = !isThresholdKey(passage.gate.key);
				return {
					key: `${passage.index}-${passage.gate.key}`,
					gateKey: passage.gate.key,
					isChakra,
					name: passage.gate.name,
					sub: isChakra ? `${gate.chakra ?? ''} · ${gate.sanskrit ?? ''}` : 'hors du corps',
					index: passage.position,
					rank: passage.index,
					color: passage.gate.color,
					state: stateOf(passage),
					passage
				};
			})
	);

	function stateOf(passage: GatePassage): State {
		if (passage.gate.key === activePassage?.gate.key) return 'ouvert';
		if (passage.gate.key === nextPassage?.gate.key) return 'prochain';
		return passage.at.getTime() < journey.date.getTime() ? 'franchi' : 'voilé';
	}

	/** Les sept chakras, avec leur état. */
	const centres = $derived(
		GATES.map((gate) => {
			const spot = spotFor(gate.key);
			const passage = passageForGate(journey, gate.key);
			return {
				...gate,
				x: spot.x * CHAKRA_IMAGE.width,
				y: spot.y * CHAKRA_IMAGE.height,
				r: spot.r * CHAKRA_IMAGE.width,
				state: passage ? stateOf(passage) : ('voilé' as State)
			};
		})
	);

	/** Le seuil de la phase, s'il y en a un : la mort à la descente, la vie à l'ascension. */
	const seuil = $derived(portals.find((p) => isThresholdKey(p.gate.key)) ?? null);

	/** Le portail que le panneau décrit : celui qu'on a désigné, sinon celui qui est ouvert. */
	const focus = $derived.by((): GatePassage | null => {
		const chosen = pickedPassage;
		if (chosen) {
			const picked = rows.find((r) => r.passage.at.getTime() === chosen.at.getTime());
			if (picked) return picked.passage;
		}
		return (
			rows.find((r) => r.state === 'ouvert')?.passage ??
			rows.find((r) => r.state === 'prochain')?.passage ??
			null
		);
	});

	const focusGate = $derived(focus && !isThresholdKey(focus.gate.key) ? (focus.gate as Gate) : null);
	const focusSeuil = $derived(
		focus && isThresholdKey(focus.gate.key) ? (focus.gate as Threshold) : null
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

				<line x1="298" y1="61" x2="298" y2="706" stroke="#ffffff" stroke-width="1" opacity="0.12" />

				{#each centres as c (c.key)}
					{#if c.state === 'ouvert' || c.state === 'prochain'}
						<circle cx={c.x} cy={c.y} r={c.r * 1.9} fill="url(#halo-{c.key})" class="halo" class:live={c.state === 'ouvert'} />
					{/if}
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

				<!-- Le seuil n'est pas un centre du corps : il est posé sous la figure. -->
				{#if seuil}
					{@const t = seuil.gate as Threshold}
					<circle
						class="hors-corps"
						cx="298"
						cy="760"
						r="19"
						fill="none"
						stroke={t.color}
						stroke-width={seuil.gate.key === activePassage?.gate.key ? 2.6 : 1.4}
						stroke-dasharray={seuil.at.getTime() > journey.date.getTime() ? '3 4' : 'none'}
						opacity={seuil.at.getTime() > journey.date.getTime() ? 0.55 : 1}
					/>
					<text x="298" y="765" text-anchor="middle" font-size="13" fill={t.color} opacity="0.95">{seuil.index}</text>
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
			{#each rows as r (r.key)}
				<li>
					<button
						type="button"
						class="gate {r.state}"
						class:hors={!r.isChakra}
						class:selected={selected?.at.getTime() === r.passage.at.getTime()}
						style="--gate:{r.color}"
						onclick={() => onselect?.(selected?.at.getTime() === r.passage.at.getTime() ? null : r.passage)}
						aria-pressed={selected?.at.getTime() === r.passage.at.getTime()}
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

		{#if focusGate && focus}
			<article class="detail" style="--gate:{focusGate.color}">
				<header>
					<span class="eyebrow">Portail {focus.index} · {focusGate.chakra} · {focusGate.sanskrit}{focusGate.nameSource === 'proposed' ? ' · nom proposé' : ''}</span>
					<h3>{focusGate.name}</h3>
				</header>
				<dl>
					<div>
						<dt>Vêtement abandonné</dt>
						<dd>{focusGate.garment}</dd>
					</div>
					<div>
						<dt>Ce qui est lâché</dt>
						<dd>{focusGate.release}</dd>
					</div>
					<div>
						<dt>Conjonction exacte</dt>
						<dd class="num">{formatDayAndTime(focus.at)} · {formatZodiac(focus.longitude)}</dd>
					</div>
				</dl>
			</article>
		{:else if focusSeuil && focus}
			<article class="detail hors" style="--gate:{focusSeuil.color}">
				<header>
					<span class="eyebrow">Portail {focus.index} · seuil · hors du corps</span>
					<h3>{focusSeuil.name}</h3>
				</header>
				<dl>
					<div>
						<dt>Ce qu’il est</dt>
						<dd>{focusSeuil.meaning}</dd>
					</div>
					<div>
						<dt>Conjonction exacte</dt>
						<dd class="num">{formatDayAndTime(focus.at)} · {formatZodiac(focus.longitude)}</dd>
					</div>
				</dl>
			</article>
		{/if}

		<!-- Les trois jours de l'inframonde : entre la descente qui meurt et l'ascension qui
		     reparaît, Vénus est dans le Soleil. Gris foncé, presque noir : le temps de l'invisible. -->
		<section class="inframonde" aria-label="Les trois jours de l’inframonde">
			<span class="eyebrow">Inframonde · entre la descente et l’ascension</span>
			<ol>
				{#each journey.inframondeDays as d (d.day.key)}
					<li style="--day:{d.day.color}">
						<span class="marker">{d.day.position}</span>
						<span class="text">
							<span class="name">{d.day.name}<em>{formatDate(d.at)}</em></span>
							<span class="meaning">{d.day.meaning}</span>
						</span>
					</li>
				{/each}
			</ol>
		</section>

		<p class="axis">
			{#if activePassage}
				Portail ouvert : {activePassage.index} · {activePassage.gate.name} — {formatDate(activePassage.at)}.
			{:else if nextPassage}
				Prochain portail : {nextPassage.index} · {nextPassage.gate.name} — {formatDate(nextPassage.at)}.
			{:else}
				Aucun portail à venir dans cette phase.
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

	.gate.hors {
		background: #ffffff03;
		border-style: dashed;
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

	.inframonde {
		margin-top: 1rem;
		padding: 0.8rem 0.9rem;
		border: 1px solid #26262e;
		border-radius: var(--radius-sm);
		background: linear-gradient(160deg, #141419, #0b0b0f);
	}

	.inframonde ol {
		list-style: none;
		margin: 0.5rem 0 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.inframonde li {
		display: flex;
		gap: 0.65rem;
		align-items: flex-start;
	}

	.inframonde .marker {
		flex: none;
		width: 1.45rem;
		height: 1.45rem;
		display: grid;
		place-items: center;
		border-radius: 50%;
		border: 1px solid #4a4b57;
		background: #17171d;
		color: #9b9cab;
		font-size: 0.7rem;
		font-weight: 700;
	}

	.inframonde .name {
		font-size: 0.78rem;
		font-weight: 600;
		color: #b9bac6;
	}

	.inframonde .name em {
		margin-left: 0.5rem;
		font-style: normal;
		font-size: 0.68rem;
		color: #5c5d68;
	}

	.inframonde .meaning {
		display: block;
		font-size: 0.7rem;
		color: #7a7b87;
		line-height: 1.4;
		max-width: 60ch;
	}

	.axis {
		margin-top: 0.8rem;
		font-size: 0.72rem;
		color: var(--ink-faint);
	}
</style>
