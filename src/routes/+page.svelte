<script lang="ts">
	import { DEFAULT_ARCUS_VISIONIS, computeJourney, type GatePassage } from '#lib/astro/cycle';
	import ChakraDiagram from '#lib/components/ChakraDiagram.svelte';
	import CycleRing from '#lib/components/CycleRing.svelte';
	import CycleTimeline from '#lib/components/CycleTimeline.svelte';
	import JourneyReadings from '#lib/components/JourneyReadings.svelte';
	import TimeControls from '#lib/components/TimeControls.svelte';
	import { formatDayAndTime, formatDays, formatMoment, formatZodiac } from '#lib/format';

	/**
	 * The Voyage de Vénus.
	 *
	 * Everything on screen is derived from one input — a Date — and one function,
	 * `computeJourney`. The route therefore holds very little state: the chosen moment,
	 * the two observational settings, and which gate the reader is examining.
	 *
	 * The journey is rebuilt by `$derived.by`, so the cycle follows the moment exactly and
	 * never needs invalidating by hand. That rebuild is not free (it searches several
	 * years of ephemeris for conjunctions, stations and the inferior-conjunction cycle),
	 * so the moment is debounced before it is committed: scrubbing the timeline or holding
	 * a step button costs one recomputation, not one per event.
	 */

	/** Real clock time, ticking once a minute, so "maintenant" stays honest. */
	let now = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(timer);
	});

	/** The moment the reader is looking at. Captured once, outside the runes, so the
	 *  two pieces of state do not depend on each other for their initial value. */
	const startedAt = Date.now();
	let moment = $state(new Date(startedAt));
	let committedMs = $state(startedAt);
	let debounce: ReturnType<typeof setTimeout> | undefined;
	let busy = $state(false);

	let arcusVisionis = $state(DEFAULT_ARCUS_VISIONIS);
	let selected = $state<GatePassage | null>(null);

	function commit(date: Date) {
		moment = date;
		busy = true;
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			committedMs = moment.getTime();
			busy = false;
		}, 140);
	}

	const journey = $derived.by(() => computeJourney(new Date(committedMs), { arcusVisionis }));

	/** Held so the template re-reads the cycle when the settings change, and so the
	 *  selected passage can be matched against the rebuilt cycle. */
	const passages = $derived(journey.conjunctions);

	function selectPassage(passage: GatePassage | null): void {
		if (!passage) {
			selected = null;
			return;
		}
		selected = passages.find((candidate: GatePassage) => candidate.at.getTime() === passage.at.getTime()) ?? null;
	}

	const hero = $derived(
		journey.activePassage
			? {
					title: `Portail ouvert · ${journey.activePassage.gate.name}`,
					line:
						`Conjonction exacte le ${formatDayAndTime(journey.activePassage.at)}, à ${formatZodiac(journey.activePassage.longitude)}. ` +
						('garment' in journey.activePassage.gate
							? `La porte ${journey.activePassage.index} est ouverte, Vénus abandonne ${journey.activePassage.gate.garment}.`
							: `Seuil ${journey.activePassage.index} franchi, ${journey.activePassage.gate.name.toLowerCase()} : ${journey.activePassage.gate.meaning}`),
					tone: 'open'
				}
			: journey.inInframonde
				? {
						title: 'Vénus dans l’inframonde',
						line: `À ${Math.abs(journey.elongation).toFixed(1).replace('.', ',')}° du Soleil, sous le seuil de visibilité : la descente est en cours, la planète a disparu du ciel.`,
						tone: 'under'
					}
				: journey.nextPassage
					? {
							title: `Prochain portail · ${journey.nextPassage.gate.name}`,
							line: `Conjonction exacte le ${formatDayAndTime(journey.nextPassage.at)}, à ${formatZodiac(journey.nextPassage.longitude)} — porte ${journey.nextPassage.index}.`,
							tone: 'next'
						}
					: { title: 'Cycle en cours', line: 'Aucun portail à venir.', tone: 'plain' }
	);

	const daysToGate = $derived(
		journey.nextPassage ? (journey.nextPassage.at.getTime() - journey.date.getTime()) / 86_400_000 : null
	);
</script>

<main>
	<header class="hero" data-tone={hero.tone}>
		<div class="hero-text">
			<span class="eyebrow">Le Voyage de Vénus · cycle synodique</span>
			<h1>{hero.title}</h1>
			<p class="hero-line">{hero.line}</p>
			<div class="hero-chips">
				<span class="chip" style="color:{journey.star === 'morning' ? 'var(--venus)' : '#c4a6ff'}">
					<i class="chip-dot"></i>{journey.star === 'morning' ? 'Étoile du matin' : 'Étoile du soir'}
				</span>
				<span class="chip">jour {Math.round(journey.dayOfCycle)} / {Math.round(journey.synodicDays)}</span>
				<span class="chip">encore {formatDays(journey.daysRemaining)}</span>
				{#if daysToGate !== null}
					<span class="chip">portail dans {formatDays(daysToGate)}</span>
				{/if}
				{#if busy}<span class="chip busy">calcul…</span>{/if}
			</div>
		</div>
		<div class="hero-moment">
			<span class="eyebrow">Moment observé</span>
			<strong class="num">{formatMoment(journey.date)}</strong>
			<span class="faint">Toutes les positions sont géocentriques, tropicales, apparentes.</span>
		</div>
	</header>

	<section class="panel controls-panel">
		<TimeControls
			value={moment}
			{now}
			{busy}
			{arcusVisionis}
			onchange={commit}
			onarcus={(deg) => (arcusVisionis = deg)}
		/>
	</section>

	<section class="panel">
		<CycleTimeline {journey} {selected} onselect={(p) => selectPassage(p)} ondate={commit} />
	</section>

	<section class="split">
		<div class="panel ring-panel">
			<span class="eyebrow">Le cycle en un tour</span>
			<CycleRing {journey} {selected} onselect={(p) => selectPassage(p)} />
		</div>
		<div class="panel readings-panel">
			<span class="eyebrow">Lecture du ciel</span>
			<JourneyReadings {journey} />
		</div>
	</section>

	<section class="panel">
		<div class="diagram-head">
			<div>
				<span class="eyebrow">La descente · sept portes, sept chakras</span>
				<h2>Les vêtements d’Inanna</h2>
			</div>
			<p class="faint diagram-note">
				À chaque conjonction Vénus-Lune, Vénus franchit une porte et abandonne un vêtement. L’ordre est
				celui de la descente : de la couronne à la racine. Cliquez un centre pour lire ce qui est lâché.
			</p>
		</div>
		<ChakraDiagram {journey} {selected} onselect={(p) => selectPassage(p)} />
	</section>

	<footer class="faint">
		<p>
			Positions géocentriques tropicales apparentes, calculées dans le navigateur. Figure des chakras :
			positions des centres mesurées dans l’image.
		</p>
	</footer>
</main>

<style>
	main {
		position: relative;
		z-index: 1;
		max-width: 1180px;
		margin: 0 auto;
		padding: 2.4rem 1.2rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	.hero {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
		align-items: flex-start;
		padding-bottom: 0.4rem;
	}

	.hero h1 {
		font-size: clamp(1.5rem, 3.4vw, 2.1rem);
		margin: 0.25rem 0 0.5rem;
	}

	.hero[data-tone='open'] h1 {
		color: var(--venus);
	}

	.hero[data-tone='under'] h1 {
		color: #c4a6ff;
	}

	.hero-line {
		max-width: 62ch;
		color: var(--ink-dim);
		font-size: 0.94rem;
	}

	.hero-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-top: 0.8rem;
	}

	.chip.busy {
		color: var(--warn);
	}

	.hero-moment {
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		text-align: right;
		min-width: 220px;
	}

	.hero-moment strong {
		font-size: 0.92rem;
		font-weight: 600;
	}

	.hero-moment .faint {
		font-size: 0.68rem;
		max-width: 30ch;
	}

	.panel {
		padding: 1.1rem 1.2rem 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.9rem;
	}

	.controls-panel {
		padding-bottom: 1rem;
	}

	.split {
		display: grid;
		grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
		gap: 1.1rem;
		align-items: start;
	}

	@media (max-width: 940px) {
		.split {
			grid-template-columns: 1fr;
		}
	}

	.ring-panel {
		align-items: center;
	}

	.readings-panel {
		gap: 0.8rem;
	}

	.diagram-head {
		display: flex;
		justify-content: space-between;
		gap: 1.5rem;
		flex-wrap: wrap;
		align-items: flex-end;
	}

	.diagram-head h2 {
		font-size: 1.25rem;
		margin-top: 0.2rem;
	}

	.diagram-note {
		max-width: 46ch;
		font-size: 0.76rem;
	}

	footer {
		margin-top: 0.6rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line-soft);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
		font-size: 0.76rem;
		color: var(--ink-faint);
		max-width: 82ch;
	}
</style>
