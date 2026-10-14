import { normalizeDegrees } from './astro/ephemeris';

/**
 * French formatting for the moments the app reports.
 *
 * Every date the Voyage de Vénus shows is an instant, and instants are printed in the
 * reader's own timezone: a conjunction at 11:14 UT is a fact, but "13:14" is what the
 * reader saw on their clock, so the zone is named next to it wherever the exact hour
 * matters.
 */

const dateTime = new Intl.DateTimeFormat('fr-FR', {
	weekday: 'long',
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit',
	timeZoneName: 'short'
});

const dateOnly = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric'
});

/** Compact: "13 avr. 2025". For notes that only need to place an event in time. */
const compactDate = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

const shortDate = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' });

const timeOnly = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });

const dayAndTime = new Intl.DateTimeFormat('fr-FR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	hour: '2-digit',
	minute: '2-digit'
});

/** "mercredi 13 août 2023 à 13:14 UTC+2" — long form, timezone included. */
export function formatMoment(date: Date): string {
	return dateTime.format(date);
}

/** "13 août 2023" */
export function formatDate(date: Date): string {
	return dateOnly.format(date);
}

/**
 * "13:14" — the hour a gate opens, in the reader's own timezone.
 *
 * A conjunction is a single instant and the app reports it as such; which clock that
 * instant reads as depends on where the reader is, so the hour is always shown next to the
 * date rather than inferred from it.
 */
export function formatTime(date: Date): string {
	return timeOnly.format(date);
}

/** "13 août 2023 à 13:14" — a gate's moment, without repeating the timezone every row. */
export function formatDayAndTime(date: Date): string {
	return dayAndTime.format(date).replace(' à ', ' à ');
}

/** "13 avr. 2025" — a date without the weekday or the timezone. */
export function formatCompactDate(date: Date): string {
	return compactDate.format(date).replace('.', '');
}

/** "13 août" — for dense timelines. */
export function formatShortDate(date: Date): string {
	return shortDate.format(date).replace('.', '');
}

/** Whole days, singular or plural, always rounded towards the nearest day. */
export function formatDays(days: number): string {
	const rounded = Math.round(days);
	return `${rounded} ${Math.abs(rounded) === 1 ? 'jour' : 'jours'}`;
}

/** One decimal, used for degrees and orbs. French uses a comma for decimals. */
export function formatDegrees(value: number, digits = 1): string {
	return `${value.toFixed(digits).replace('.', ',')}°`;
}

/** Signed degrees, for elongations: "+12,4°" east of the Sun, "−12,4°" west. */
export function formatSignedDegrees(value: number, digits = 1): string {
	const sign = value < 0 ? '−' : '+';
	return `${sign}${Math.abs(value).toFixed(digits).replace('.', ',')}°`;
}

/** Degrees to the zodiacal sign and degree: 74.2° -> "14° Gémeaux". */
const SIGNS = [
	'Bélier',
	'Taureau',
	'Gémeaux',
	'Cancer',
	'Lion',
	'Vierge',
	'Balance',
	'Scorpion',
	'Sagittaire',
	'Capricorne',
	'Verseau',
	'Poissons'
] as const;

export function formatZodiac(longitude: number): string {
	const lon = normalizeDegrees(longitude);
	const index = Math.floor(lon / 30);
	const within = lon - index * 30;
	const degrees = Math.floor(within);
	const minutes = Math.round((within - degrees) * 60);
	if (minutes === 60) return `${degrees + 1}°00′ ${SIGNS[index]}`;
	return `${degrees}°${String(minutes).padStart(2, '0')}′ ${SIGNS[index]}`;
}

/** "1,2° au nord de l'écliptique" — how far off the ecliptic the Moon passes, and which way. */
export function formatLatitudeSide(latitude: number, digits = 1): string {
	const side = latitude >= 0 ? 'au nord' : 'au sud';
	return `${Math.abs(latitude).toFixed(digits).replace('.', ',')}° ${side} de l’écliptique`;
}
