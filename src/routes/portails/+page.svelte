<script lang="ts">
import { repartitionParPhase, voyageVenusData } from '#lib/data/portails-venus';
import type { PortailVenus } from '#lib/data/portails-venus';
import { PHASE_LABELS } from '#lib/data/portails-types';
import { formatSignedDegrees } from '#lib/format';

/**
 * Le jeu de données 1952-2001, tel qu'il est après audit.
 *
 * Deux colonnes de degrés, côte à côte, font tout l'intérêt de la page : celle du ciel et
 * celle qui était annoncée. L'écart reste lisible au lieu d'être corrigé en silence, et
 * chaque phase indique si Vénus était visible ou non à cette date.
 *
 * Les cycles sont reconstruits depuis les données elles-mêmes — chaque entrée connaît la
 * conjonction inférieure qui l'a ouverte — plutôt que saisis à la main, ce qui évite
 * qu'une liste de dates se désynchronise du contenu.
 */

const STARS = ['matin', 'soir', 'toutes'] as const;
type StarFilter = (typeof STARS)[number];

let filter = $state<StarFilter>('toutes');
let showAnnounced = $state(true);

const rows = $derived(
	[...voyageVenusData]
		.sort((a, b) => b.date.localeCompare(a.date))
		.filter((r) => filter === 'toutes' || r.etoile === filter)
);

interface CycleGroup {
	start: string;
	rows: PortailVenus[];
	first: PortailVenus;
	last: PortailVenus;
}

const cycles = $derived.by((): CycleGroup[] => {
	const byStart = new Map<string, PortailVenus[]>();
	for (const row of rows) {
		const list = byStart.get(row.debutDeCycle) ?? [];
		list.push(row);
		byStart.set(row.debutDeCycle, list);
	}
	return [...byStart]
		.map(([start, list]) => {
			const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
			return { start, rows: sorted, first: sorted[0], last: sorted[sorted.length - 1] };
		})
		.sort((a, b) => b.start.localeCompare(a.start));
});

const totals = $derived({
	rows: voyageVenusData.length,
	portals: voyageVenusData.filter((r) => r.portail).length,
	visible: voyageVenusData.filter((r) => r.visible).length,
	cycles: new Set(voyageVenusData.map((r) => r.debutDeCycle)).size,
	// How many announced degrees even land on the right sign of the zodiac.
	signOk: voyageVenusData.filter((r) => r.degreAnnonce && r.degre.slice(3) === r.degreAnnonce.slice(3)).length
});

function phaseLabel(row: PortailVenus): string {
	return PHASE_LABELS[row.phase];
}
</script>

<svelte:head>
	<title>Portails 1952-2001 · Le Voyage de Vénus</title>
	<meta
		name="description"
		content="Les 62 événements du Voyage de Vénus de 1952 à 2001, avec leur degré mesuré dans l'éphéméride face au degré annoncé."
	/>
</svelte:head>

<main>
	<header>
		<span class="eyebrow">Jeu de données audité</span>
		<h1>Les portails, 1952 – 2001</h1>
		<p>
			Soixante-deux événements datés, chacun avec son portail et son chakra. La couche symbolique est
			celle de l'auteur du jeu, mot pour mot. La couche astronomique a été recalculée : degré,
			élongation, visibilité et cycle d'appartenance sont mesurés dans l'éphéméride, et le degré
			annoncé reste affiché à côté du degré réel pour que l'écart se voie.
		</p>
	</header>

	<section class="panel summary">
		<dl>
			<div><dt>Entrées</dt><dd class="num">{totals.rows}</dd></div>
			<div><dt>Portails nommés</dt><dd class="num">{totals.portals}</dd></div>
			<div><dt>Cycles traversés</dt><dd class="num">{totals.cycles}</dd></div>
			<div><dt>Vénus visible</dt><dd class="num">{totals.visible} / {totals.rows}</dd></div>
			<div class="alert">
				<dt>Degrés annoncés au bon signe</dt>
				<dd class="num">{totals.signOk} / {totals.rows - 1}</dd>
				<p>Le hasard en donnerait environ 5. Les degrés annoncés ne suivent pas le ciel.</p>
			</div>
		</dl>
		<p class="repartition">
			{#each Object.entries(repartitionParPhase) as [phase, n] (phase)}
				<span class="chip">{PHASE_LABELS[phase as keyof typeof PHASE_LABELS] ?? phase} · {n}</span>
			{/each}
		</p>
	</section>

	<section class="panel controls">
		<div class="group" role="group" aria-label="Filtrer par étoile">
			<span class="eyebrow">Étoile</span>
			{#each STARS as star (star)}
				<button type="button" class:active={filter === star} onclick={() => (filter = star)}>
					{star === 'matin' ? 'Matin' : star === 'soir' ? 'Soir' : 'Toutes'}
				</button>
			{/each}
		</div>
		<label class="toggle">
			<input type="checkbox" bind:checked={showAnnounced} />
			<span>Afficher le degré annoncé à côté du degré réel</span>
		</label>
		<span class="faint">{rows.length} entrées affichées</span>
	</section>

	{#each cycles as cycle (cycle.start)}
		<section class="panel cycle">
			<header>
				<div>
					<span class="eyebrow">Cycle ouvert par la conjonction inférieure du {cycle.start}</span>
					<h2>{cycle.rows.length} événements · du {cycle.first.date} au {cycle.last.date}</h2>
				</div>
			</header>
			<div class="scroll">
				<table>
					<thead>
						<tr>
							<th scope="col">Date</th>
							<th scope="col">Degré réel</th>
							{#if showAnnounced}<th scope="col">Annoncé</th>{/if}
							<th scope="col">Phase mesurée</th>
							<th scope="col">Élongation</th>
							<th scope="col">Visible</th>
							<th scope="col">Portail</th>
							<th scope="col">Chakra</th>
						</tr>
					</thead>
					<tbody>
						{#each cycle.rows as row (row.id)}
							<tr class:invisible={!row.visible} class:retro={row.retrograde}>
								<td class="num">{row.date}</td>
								<td class="num strong">{row.degre}</td>
								{#if showAnnounced}
									<td class="num announced">
										{row.degreAnnonce ?? '—'}
										{#if row.degreAnnonce && row.degre.slice(3) !== row.degreAnnonce.slice(3)}
											<span class="flag" title="Le signe annoncé n’est pas celui du ciel">≠</span>
										{/if}
									</td>
								{/if}
								<td>
									{phaseLabel(row)}
									{#if row.phaseAnnoncee !== row.phase}
										<span class="was">annoncé : {PHASE_LABELS[row.phaseAnnoncee]}</span>
									{/if}
								</td>
								<td class="num">{formatSignedDegrees(row.elongation)}</td>
								<td class="visible">{row.visible ? 'oui' : 'non'}{row.retrograde ? ' · Rx' : ''}</td>
								<td class="portal">{row.portail ?? '—'}</td>
								<td class="chakra" style="--gate:{row.chakra ? '#8b5cf6' : 'transparent'}">{row.chakra ?? '—'}</td>
							</tr>
							{#if row.description}
								<tr class="note">
									<td colspan={showAnnounced ? 8 : 7}>{row.description}</td>
								</tr>
							{/if}
						{/each}
					</tbody>
				</table>
			</div>
		</section>
	{/each}

	<footer>
		<p>
			Le détail de l'audit, ligne par ligne, est dans <code>tools/portails/rapport-audit.md</code>. Le
			fichier de données est généré par <code>tools/portails/audit.ts</code> et revérifié par
			<code>src/lib/data/portails.test.ts</code> : il ne peut pas dériver sans que les tests échouent.
		</p>
		<p class="faint">
			Seuil de visibilité retenu : 5° d'élongation. Les phases « Jour 01 / 02 / 03 »
			et « Espace liminal » du jeu d'origine sont conservées dans la colonne des valeurs annoncées.
		</p>
	</footer>
</main>

<style>
	main {
		position: relative;
		z-index: 1;
		max-width: 1240px;
		margin: 0 auto;
		padding: 2.4rem 1.2rem 4rem;
		display: flex;
		flex-direction: column;
		gap: 1.1rem;
	}

	header h1 {
		font-size: clamp(1.5rem, 3.2vw, 2rem);
		margin: 0.25rem 0 0.5rem;
	}

	header p {
		max-width: 78ch;
		color: var(--ink-dim);
		font-size: 0.92rem;
	}

	.panel {
		padding: 1.1rem 1.2rem;
		display: flex;
		flex-direction: column;
		gap: 0.8rem;
	}

	.summary dl {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
		gap: 0.7rem;
	}

	.summary dl > div {
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--line-soft);
		border-radius: var(--radius-sm);
		background: #ffffff04;
	}

	.summary dt {
		font-size: 0.64rem;
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
		font-size: 0.7rem;
		color: var(--ink-faint);
	}

	.repartition {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.controls .group {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.controls button {
		background: #ffffff07;
		border: 1px solid var(--line);
		border-radius: 8px;
		padding: 0.35rem 0.7rem;
		font-size: 0.78rem;
		color: var(--ink-dim);
	}

	.controls button.active {
		background: #7ce0b022;
		border-color: var(--venus);
		color: var(--venus);
		font-weight: 600;
	}

	.controls {
		flex-direction: row;
		align-items: center;
		flex-wrap: wrap;
		gap: 1.2rem;
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-size: 0.78rem;
		color: var(--ink-dim);
	}

	.toggle input {
		accent-color: var(--venus);
	}

	.cycle header h2 {
		font-size: 0.98rem;
		margin-top: 0.15rem;
	}

	.scroll {
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.78rem;
	}

	th {
		text-align: left;
		font-size: 0.62rem;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: var(--ink-ghost);
		font-weight: 600;
		padding: 0 0.6rem 0.4rem 0;
		white-space: nowrap;
	}

	td {
		padding: 0.35rem 0.6rem 0.35rem 0;
		border-top: 1px solid var(--line-soft);
		color: var(--ink-dim);
		vertical-align: top;
	}

	tr.invisible td {
		background: #8b5cf610;
	}

	.strong {
		color: var(--ink);
		font-weight: 600;
	}

	.announced {
		color: var(--ink-ghost);
		text-decoration: line-through;
		text-decoration-color: #ff6b7866;
	}

	.flag {
		margin-left: 0.35rem;
		color: var(--danger);
		text-decoration: none;
		display: inline-block;
		font-weight: 700;
	}

	.was {
		display: block;
		font-size: 0.68rem;
		color: var(--ink-ghost);
	}

	.visible {
		white-space: nowrap;
	}

	.portal {
		color: var(--ink);
	}

	.chakra {
		border-left: 3px solid var(--gate);
		padding-left: 0.5rem;
	}

	tr.note td {
		border-top: 0;
		padding-top: 0;
		padding-bottom: 0.55rem;
		font-size: 0.72rem;
		color: var(--ink-faint);
		font-style: italic;
		max-width: 70ch;
	}

	footer {
		margin-top: 0.4rem;
		padding-top: 1rem;
		border-top: 1px solid var(--line-soft);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		font-size: 0.74rem;
		color: var(--ink-faint);
		max-width: 88ch;
	}

	code {
		background: #ffffff0d;
		border-radius: 4px;
		padding: 0.05rem 0.3rem;
		font-size: 0.72rem;
	}
</style>
