<script lang="ts">
	import { Body } from 'astronomy-engine';
	import { voyageVenusData, type ChakraType } from '#lib/data/venus-journey';
	import { GATES } from '#lib/symbolic/gates';
	import { position, signedDelta } from '#lib/astro/ephemeris';
	import { formatZodiac } from '#lib/format';

	/**
	 * Le jeu 1952-2001, tel que son auteur l'a écrit.
	 *
	 * Deux colonnes de degrés, côte à côte : celle du jeu et celle du ciel. L'application ne
	 * corrige rien — elle publie l'écart. Un interrupteur les fait basculer, et la colonne du
	 * ciel se calcule ici, dans le navigateur, parce que le moteur est déjà là.
	 *
	 * Les entrées qui ne portent pas de portail sont des étapes du cycle : inframonde, jours
	 * 01/02/03, espace liminal.
	 */

	const SIGNS = [
		'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
		'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
	] as const;

	const GLYPH: Record<string, string> = {
		'♈': 'Bélier', '♉': 'Taureau', '♊': 'Gémeaux', '♋': 'Cancer', '♌': 'Lion', '♍': 'Vierge',
		'♎': 'Balance', '♏': 'Scorpion', '♐': 'Sagittaire', '♑': 'Capricorne', '♒': 'Verseau', '♓': 'Poissons'
	};

	type Row = (typeof voyageVenusData)[number];

	/** Ce que le jeu annonce, quand il annonce un degré du zodiaque. */
	function claimed(row: Row): { sign: string; degree: number } | null {
		const m = row.degre.match(/(\d+)\s*°\s*(.)/);
		if (!m) return null;
		const sign = GLYPH[m[2]];
		return sign ? { sign, degree: Number(m[1]) } : null;
	}

	interface Measured {
		zodiac: string;
		elongation: number;
		signMatches: boolean;
	}

	/** Ce que le ciel dit ce jour-là, calculé au chargement. */
	const measured = new Map<string, Measured>(
		voyageVenusData.map((row) => {
			const date = new Date(`${row.date}T12:00:00Z`);
			const venus = position(Body.Venus, date);
			const sun = position(Body.Sun, date);
			const c = claimed(row);
			const sign = SIGNS[Math.floor(venus.longitude / 30)];
			return [
				row.id,
				{
					zodiac: formatZodiac(venus.longitude),
					elongation: signedDelta(venus.longitude, sun.longitude),
					signMatches: c ? c.sign === sign : false
				}
			];
		})
	);

	let showMeasured = $state(false);

	const audit = $derived.by(() => {
		const withDegree = voyageVenusData.filter((row) => claimed(row));
		const sameSign = withDegree.filter((row) => measured.get(row.id)!.signMatches).length;
		const contradicted = voyageVenusData
			.filter((row) => {
				const e = measured.get(row.id)!.elongation;
				if (row.phase.includes('Soir')) return e < 0;
				if (row.phase.includes('Matin')) return e > 0;
				return false;
			})
			.map((row) => row.date);
		return {
			total: voyageVenusData.length,
			portails: voyageVenusData.filter((r) => r.portail).length,
			withDegree: withDegree.length,
			sameSign,
			contradicted
		};
	});

	/** Les années couvertes, dans l'ordre. */
	const years = $derived([...new Set(voyageVenusData.map((row) => row.date.slice(0, 4)))].sort());

	function rowsOf(year: string): Row[] {
		return voyageVenusData.filter((row) => row.date.startsWith(year));
	}

	/** Les six appariements portail-chakra que le jeu établit, plus celui que nous nommons. */
	const pairings = $derived(
		GATES.map((gate) => ({
			chakra: gate.chakra,
			gate: gate.name,
			fromDataset: gate.nameSource === 'dataset',
			occurrences: voyageVenusData.filter((row) => row.chakra === (gate.chakra as ChakraType)).length
		}))
	);
</script>

<svelte:head>
	<title>Portails 1952-2001 · Le Voyage de Vénus</title>
	<meta
		name="description"
		content="Les 62 entrées du Voyage de Vénus de 1952 à 2001, avec les portails nommés par leur auteur et le degré réel de Vénus à chaque date."
	/>
</svelte:head>

<main>
	<header>
		<span class="eyebrow">Le jeu de données</span>
		<h1>Portails, 1952 – 2001</h1>
		<p>
			Soixante-deux entrées, telles que tu les as écrites : dates, degrés, phases, portails, chakras
			et descriptions. Rien n'est recalculé. L'interrupteur ci-dessous ajoute en regard le degré que
			Vénus occupait réellement, pour que l'écart reste visible.
		</p>
	</header>

	<section class="panel summary">
		<dl>
			<div><dt>Entrées</dt><dd class="num">{audit.total}</dd></div>
			<div><dt>Avec un portail</dt><dd class="num">{audit.portails}</dd></div>
			<div><dt>Années couvertes</dt><dd class="num">{years.length}</dd></div>
			<div class="alert">
				<dt>Degrés au bon signe</dt>
				<dd class="num">{audit.sameSign} / {audit.withDegree}</dd>
				<p>
					Le hasard en donnerait environ cinq. Les degrés du jeu ne suivent pas le ciel — ils sont
					conservés tels quels, et le degré réel s'affiche à côté.
				</p>
			</div>
		</dl>
		<p class="faint">
			Deux lignes dont la phase contredit sa propre étoile : {audit.contradicted.join(' et ')} — Vénus y
			est du côté opposé au Soleil de ce que la phase annonce.
		</p>
	</section>

	<section class="panel pairings">
		<span class="eyebrow">Les portails du jeu, et le centre qu'ils ouvrent</span>
		<ul>
			{#each pairings as p (p.chakra)}
				<li class:proposed={!p.fromDataset}>
					<span class="centre">{p.chakra}</span>
					<span class="arrow" aria-hidden="true">→</span>
					<span class="gate">{p.gate}</span>
					<span class="count num">{p.occurrences}×</span>
					{#if !p.fromDataset}
						<span class="tag" title="Le jeu ne nomme pas ce portail ; ce nom est une proposition">
							nom proposé
						</span>
					{/if}
				</li>
			{/each}
		</ul>
		<p class="faint">
			Les six premiers appariements viennent du jeu et sont sans ambiguïté : sur les 34 entrées qui
			portent à la fois un portail et un chakra, aucun ne contredit un autre. C'est de là que les sept
			portes de l'application tiennent leurs noms.
		</p>
	</section>

	<section class="panel controls">
		<label class="toggle">
			<input type="checkbox" bind:checked={showMeasured} />
			<span>Afficher le degré réel de Vénus à côté du degré annoncé</span>
		</label>
	</section>

	{#each years as year (year)}
		{@const rows = rowsOf(year)}
		<section class="panel year">
			<header>
				<span class="eyebrow">{year}</span>
				<h2>{rows.length} entrée{rows.length > 1 ? 's' : ''}{rows.some((r) => r.portail) ? ' · portail' : ''}</h2>
			</header>
			<ul class="entries">
				{#each rows as row (row.id)}
					{@const m = measured.get(row.id)!}
					{@const c = claimed(row)}
					<li class:invisible={Math.abs(m.elongation) < 5}>
						<div class="line">
							<span class="date num">{row.date}</span>
							<span class="degres num">
								{#if showMeasured}
									<span class="real">{m.zodiac}</span>
									<span class="vs" title="degré annoncé par le jeu">← {row.degre}</span>
									{#if c && !m.signMatches}
										<span class="flag" title="Le signe annoncé n'est pas celui du ciel">≠</span>
									{/if}
								{:else}
									{row.degre}
								{/if}
							</span>
							{#if row.portail}
								<span class="portail">{row.portail}</span>
								{#if row.chakra}<span class="centre">{row.chakra}</span>{/if}
							{:else}
								<span class="phase">{row.phase}</span>
							{/if}
						</div>
						{#if row.description}
							<p class="desc">{row.description}</p>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}

	<footer class="faint">
		<p>
			Degré réel calculé dans le navigateur, géocentrique tropical apparent. Le jeu lui-même n'est
			jamais modifié : <code>src/lib/data/venus-journey.ts</code> est une transcription, et
			<code>tools/portails/audit.test.ts</code> échoue si une ligne s'en écarte.
		</p>
	</footer>
</main>

<style>
	main {
		position: relative;
		z-index: 1;
		max-width: 1080px;
		margin: 0 auto;
		padding: 2rem 1.2rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	header h1 {
		font-size: clamp(1.5rem, 3.2vw, 2rem);
		margin: 0.25rem 0 0.5rem;
	}

	header p {
		max-width: 76ch;
		color: var(--ink-dim);
		font-size: 0.9rem;
	}

	.panel {
		padding: 1rem 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.summary dl {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
		gap: 0.7rem;
	}

	.summary dl > div {
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--line-soft);
		border-radius: var(--radius-sm);
		background: #ffffff04;
	}

	.summary dt {
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--ink-ghost);
	}

	.summary dd {
		margin: 0.2rem 0 0;
		font-size: 1.05rem;
		font-weight: 600;
	}

	.summary .alert {
		border-color: #ff6b7855;
		background: linear-gradient(150deg, #ff6b7812, transparent);
	}

	.summary .alert dd {
		color: var(--danger);
	}

	.summary .alert p {
		margin: 0.3rem 0 0;
		font-size: 0.68rem;
		color: var(--ink-faint);
	}

	.pairings ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 0.4rem;
	}

	.pairings li {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--line-soft);
		border-radius: var(--radius-sm);
		background: #ffffff04;
		font-size: 0.8rem;
		flex-wrap: wrap;
	}

	.pairings li.proposed {
		border-style: dashed;
		opacity: 0.85;
	}

	.pairings .centre {
		color: var(--ink-faint);
	}

	.pairings .arrow {
		color: var(--ink-ghost);
	}

	.pairings .gate {
		color: var(--venus);
		font-weight: 600;
	}

	.pairings .count {
		margin-left: auto;
		color: var(--ink-ghost);
		font-size: 0.72rem;
	}

	.pairings .tag {
		font-size: 0.6rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: var(--warn);
	}

	.controls {
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.8rem;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.8rem;
		color: var(--ink-dim);
	}

	.toggle input {
		accent-color: var(--venus);
	}

	.year header h2 {
		font-size: 0.88rem;
		font-weight: 500;
		color: var(--ink-faint);
		margin-top: 0.15rem;
	}

	.entries {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.entries li {
		padding: 0.5rem 0;
		border-top: 1px solid var(--line-soft);
	}

	.entries li.invisible {
		border-left: 3px solid #8b5cf6;
		padding-left: 0.7rem;
	}

	.line {
		display: flex;
		align-items: baseline;
		gap: 0.7rem;
		flex-wrap: wrap;
		font-size: 0.82rem;
	}

	.date {
		color: var(--ink);
		font-weight: 600;
	}

	.degres {
		color: var(--ink-dim);
	}

	.real {
		color: var(--venus);
	}

	.vs {
		color: var(--ink-ghost);
		font-size: 0.74rem;
	}

	.flag {
		color: var(--danger);
		font-weight: 700;
	}

	.portail {
		color: #c4a6ff;
	}

	.centre {
		color: var(--ink-faint);
		font-size: 0.76rem;
	}

	.phase {
		color: var(--ink-faint);
		font-size: 0.76rem;
	}

	.desc {
		margin-top: 0.2rem;
		font-size: 0.74rem;
		color: var(--ink-faint);
		max-width: 84ch;
	}

	footer {
		margin-top: 0.3rem;
		padding-top: 0.9rem;
		border-top: 1px solid var(--line-soft);
		font-size: 0.72rem;
		max-width: 88ch;
	}

	code {
		background: #ffffff0d;
		border-radius: 4px;
		padding: 0.05rem 0.3rem;
		font-size: 0.7rem;
	}
</style>
