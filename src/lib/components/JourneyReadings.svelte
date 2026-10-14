<script lang="ts">
	import type { VenusJourney } from '../astro/cycle';
	import { formatMoment, formatSignedDegrees, formatZodiac } from '../format';

	/**
	 * The readings for the current moment, as a list of labelled values.
	 *
	 * Every figure here is measured for the instant the reader has chosen — nothing is a
	 * published average, and where the sky differs from the familiar number (a cycle of
	 * 581 days rather than 584) the real value is the one shown.
	 */
	interface Props {
		journey: VenusJourney;
	}

	let { journey }: Props = $props();

	const star = $derived(journey.star === 'morning' ? 'Étoile du matin' : 'Étoile du soir');
	const starNote = $derived(
		journey.star === 'morning'
			? 'Vénus se lève avant le Soleil, à l’ouest de lui'
			: 'Vénus se couche après le Soleil, à l’est de lui'
	);

	/** Whether Venus is retrograde right now, as opposed to having a window this cycle. */
	function isRetrogradeNow(j: VenusJourney): boolean {
		if (!j.retrograde) return false;
		return j.date >= j.retrograde.retrogradeStation.at && j.date <= j.retrograde.directStation.at;
	}

	function retrogradeNote(j: VenusJourney): string {
		if (!j.retrograde) return 'aucune rétrogradation dans ce cycle';
		if (isRetrogradeNow(j)) {
			const left = (j.retrograde.directStation.at.getTime() - j.date.getTime()) / 86_400_000;
			return `station directe dans ${Math.max(0, Math.round(left))} j`;
		}
		const to = j.retrograde.retrogradeStation.at.getTime() - j.date.getTime();
		if (to > 0) return `station rétrograde dans ${Math.round(to)} j`;
		return `terminée le ${formatMoment(j.retrograde.directStation.at)}`;
	}

	interface Reading {
		label: string;
		value: string;
		note: string;
		tone?: 'venus' | 'under' | 'danger' | 'warn' | 'plain';
	}

	const readings = $derived<Reading[]>([
		{
			label: 'Phase du cycle',
			value: star,
			note: starNote,
			tone: journey.star === 'morning' ? 'venus' : 'under'
		},
		{
			label: 'Élongation au Soleil',
			value: formatSignedDegrees(journey.elongation),
			note: journey.inInframonde
				? `dans l’inframonde — sous le seuil de ${journey.arcusVisionis}°`
				: `angle vrai ${journey.separationFromSun.toFixed(1).replace('.', ',')}° · visible`,
			tone: journey.inInframonde ? 'under' : 'plain'
		},
		{
			label: 'Longitude de Vénus',
			value: formatZodiac(journey.venus.longitude),
			note: `latitude écliptique ${formatSignedDegrees(journey.venus.latitude)}`
		},
		{
			label: 'Mouvement',
			value: journey.retrograde && isRetrogradeNow(journey) ? 'Rétrograde' : 'Direct',
			note: retrogradeNote(journey),
			tone: journey.retrograde && isRetrogradeNow(journey) ? 'danger' : 'plain'
		},
		{
			label: 'Lune aujourd’hui',
			value: formatZodiac(journey.moon.longitude),
			note: `à ${journey.moonSeparation.toFixed(1).replace('.', ',')}° de Vénus`
		},
		{
			label: 'Plus grande élongation à venir',
			value: formatSignedDegrees(journey.greatestElongation.star === 'morning' ? -journey.greatestElongation.elongation : journey.greatestElongation.elongation),
			note: `le ${formatMoment(journey.greatestElongation.at)}`
		}
	]);

</script>

<dl class="readings">
	{#each readings as r (r.label)}
		<div class="reading" data-tone={r.tone ?? 'plain'}>
			<dt>{r.label}</dt>
			<dd class="value num">{r.value}</dd>
			<dd class="note">{r.note}</dd>
		</div>
	{/each}
</dl>

<style>
	.readings {
		margin: 0;
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.7rem;
	}

	.reading {
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--line-soft);
		border-radius: var(--radius-sm);
		background: #ffffff04;
	}

	.reading[data-tone='venus'] {
		border-color: #2c7f5e55;
		background: linear-gradient(150deg, #7ce0b012, transparent);
	}

	.reading[data-tone='under'] {
		border-color: #8b5cf655;
		background: linear-gradient(150deg, #8b5cf614, transparent);
	}

	.reading[data-tone='danger'] {
		border-color: #ff6b7855;
		background: linear-gradient(150deg, #ff6b7812, transparent);
	}

	dt {
		font-size: 0.64rem;
		text-transform: uppercase;
		letter-spacing: 0.13em;
		color: var(--ink-ghost);
	}

	.value {
		margin: 0.3rem 0 0.15rem;
		font-size: 1.02rem;
		font-weight: 600;
		color: var(--ink);
	}

	.reading[data-tone='venus'] .value {
		color: var(--venus);
	}

	.reading[data-tone='under'] .value {
		color: #c4a6ff;
	}

	.reading[data-tone='danger'] .value {
		color: var(--danger);
	}

	.note {
		margin: 0;
		font-size: 0.72rem;
		color: var(--ink-faint);
	}
</style>
