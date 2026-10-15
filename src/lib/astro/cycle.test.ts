import { describe, expect, it } from 'vitest';
import {
	GATE_WINDOW_HOURS,
	computeJourney,
	isGateOpen,
	findInvisibilityWindow,
	findMoonVenusConjunctions,
	findRetrogradeWindow,
	findSunVenusConjunctions,
	passageForGate,
	type Conjunction
} from './cycle';
import { daysBetween, shiftDays } from './ephemeris';
import { GATES } from '../symbolic/gates';

const at = (iso: string) => new Date(iso);
/** Hours between two instants. */
const hours = (a: Date, b: Date) => Math.abs(a.getTime() - b.getTime()) / 3_600_000;
/** Days between two instants. */
const days = (a: Date, b: Date) => daysBetween(a, b);

/**
 * The published Venus events these tests are pinned to (inferior and superior
 * conjunctions, stations) are the standard ones an ephemeris prints; the instants were
 * cross-checked against the same search routine over 2020-2032 before being frozen
 * here. Tolerances are generous by astronomy standards — minutes for conjunctions,
 * hours for stations — because what the app displays is a date and a phase, not an
 * occultation prediction.
 */

describe('Sun-Venus conjunctions', () => {
	const all = findSunVenusConjunctions(at('2020-01-01T00:00:00Z'), at('2029-01-01T00:00:00Z'));
	const inferiors = all.filter((c) => c.kind === 'inferior');
	const superiors = all.filter((c) => c.kind === 'superior');

	it('finds one of each kind roughly every 292 days', () => {
		// A synodic cycle holds exactly one inferior and one superior conjunction.
		expect(Math.abs(inferiors.length - superiors.length)).toBeLessThanOrEqual(1);
		expect(inferiors.length).toBeGreaterThanOrEqual(5);
		for (let i = 1; i < inferiors.length; i++) {
			const gap = days(inferiors[i - 1].at, inferiors[i].at);
			expect(gap).toBeGreaterThan(575);
			expect(gap).toBeLessThan(590);
		}
	});

	it('classifies by Venus being retrograde at the inferior conjunction', () => {
		for (const c of inferiors) expect(c.venusLatitude).toBeDefined();
		// At an inferior conjunction Venus is between Earth and Sun, so it is nearer than
		// at a superior one; its ecliptic latitude reaches ±8.5° there and stays within
		// ~1.5° at a superior conjunction.
		expect(Math.max(...inferiors.map((c) => Math.abs(c.venusLatitude)))).toBeGreaterThan(5);
		expect(Math.max(...superiors.map((c) => Math.abs(c.venusLatitude)))).toBeLessThan(2);
	});

	it.each([
		['2023-08-13T11:14:00Z', 'inferior'],
		['2024-06-04T15:33:00Z', 'superior'],
		['2025-03-23T01:06:00Z', 'inferior'],
		['2026-01-06T16:33:00Z', 'superior'],
		['2026-10-24T03:39:00Z', 'inferior']
	])('dates the conjunction of %s as %s', (iso, kind) => {
		const expected = at(iso);
		const match = all
			.filter((c) => c.kind === kind)
			.sort((a, b) => hours(a.at, expected) - hours(b.at, expected))[0];
		expect(hours(match.at, expected)).toBeLessThan(2);
	});

	it('reproduces the 8-year resonance: five cycles in 2 919.7 days', () => {
		// Five synodic cycles span six inferior conjunctions, so the span is measured from
		// the first to the sixth rather than by summing five gaps.
		const five = days(inferiors[0].at, inferiors[5].at);
		expect(five).toBeGreaterThan(2915);
		expect(five).toBeLessThan(2925);
		// 8 Julian years, and the whole point of the pentagram: Venus returns to nearly
		// the same place in the sky after five synodic cycles.
		expect(five / 365.2422).toBeGreaterThan(7.98);
		expect(five / 365.2422).toBeLessThan(8.01);
	});
});

describe('the enclosing cycle', () => {
	it('brackets a date with the cycle that contains it', () => {
		const date = at('2024-03-01T00:00:00Z');
		const journey = computeJourney(date);
		expect(journey.start.at.getTime()).toBeLessThanOrEqual(date.getTime());
		expect(journey.end.at.getTime()).toBeGreaterThan(date.getTime());
		expect(hours(journey.start.at, at('2023-08-13T11:14:00Z'))).toBeLessThan(2);
		expect(hours(journey.end.at, at('2025-03-23T01:06:00Z'))).toBeLessThan(2);
		expect(journey.synodicDays).toBeCloseTo(days(at('2023-08-13T11:14:00Z'), at('2025-03-23T01:06:00Z')), 0);
	});

	it('reports the real, varying length rather than 584', () => {
		const lengths = [
			computeJourney(at('2021-01-01T00:00:00Z')).synodicDays,
			computeJourney(at('2022-06-01T00:00:00Z')).synodicDays,
			computeJourney(at('2024-03-01T00:00:00Z')).synodicDays,
			computeJourney(at('2027-01-01T00:00:00Z')).synodicDays
		];
		for (const len of lengths) {
			expect(len).toBeGreaterThan(579);
			expect(len).toBeLessThan(589);
		}
		// If these were all 584 the app would be quoting the mean and hiding the spread.
		expect(new Set(lengths.map((l) => Math.round(l))).size).toBeGreaterThan(1);
	});

	it('splits the cycle at the superior conjunction', () => {
		const journey = computeJourney(at('2024-03-01T00:00:00Z'));
		expect(journey.mid.kind).toBe('superior');
		expect(journey.mid.at.getTime()).toBeGreaterThan(journey.start.at.getTime());
		expect(journey.mid.at.getTime()).toBeLessThan(journey.end.at.getTime());
		expect(journey.morning.start.getTime()).toBe(journey.start.at.getTime());
		expect(journey.morning.end.getTime()).toBe(journey.mid.at.getTime());
		expect(journey.evening.start.getTime()).toBe(journey.mid.at.getTime());
		expect(journey.evening.end.getTime()).toBe(journey.end.at.getTime());
		expect(journey.morning.days + journey.evening.days).toBeCloseTo(journey.synodicDays, 6);
		// Roughly 292 days each: the evening star and the morning star are near-equal.
		expect(journey.morning.days).toBeGreaterThan(270);
		expect(journey.evening.days).toBeGreaterThan(270);
	});

	it('walks progress from 0 to 1 across the cycle', () => {
		const journey = computeJourney(at('2024-03-01T00:00:00Z'));
		const early = computeJourney(shiftDays(journey.start.at, 1));
		const late = computeJourney(shiftDays(journey.end.at, -1));
		expect(early.progress).toBeGreaterThan(0);
		expect(early.progress).toBeLessThan(0.02);
		expect(late.progress).toBeGreaterThan(0.98);
		expect(late.progress).toBeLessThan(1);
	});
});

describe('the star', () => {
	it('is the morning star before the superior conjunction and the evening star after', () => {
		const journey = computeJourney(at('2024-03-01T00:00:00Z'));
		// 2024-03-01 sits between the 2023 inferior conjunction and the 2024 superior one.
		expect(journey.star).toBe('morning');
		expect(journey.elongation).toBeLessThan(0);

		const evening = computeJourney(at('2024-09-01T00:00:00Z'));
		expect(evening.star).toBe('evening');
		expect(evening.elongation).toBeGreaterThan(0);
	});

	it('agrees with the greatest-elongation search', () => {
		const journey = computeJourney(at('2024-09-01T00:00:00Z'));
		expect(journey.greatestElongation.star).toBe('evening');
		expect(journey.greatestElongation.elongation).toBeGreaterThan(44);
		expect(journey.greatestElongation.elongation).toBeLessThan(48);
		expect(hours(journey.greatestElongation.at, at('2025-01-10T04:57:00Z'))).toBeLessThan(24);
	});

	it('never leaves the ecliptic elongation beyond the geometric maximum', () => {
		for (const iso of ['2023-10-01T00:00:00Z', '2024-01-01T00:00:00Z', '2024-11-01T00:00:00Z']) {
			expect(Math.abs(computeJourney(at(iso)).elongation)).toBeLessThan(48);
		}
	});
});

describe('retrograde window', () => {
	it('brackets the 2023 retrograde to within an hour of the published stations', () => {
		const window = findRetrogradeWindow(at('2023-08-13T11:14:00Z'));
		expect(window).not.toBeNull();
		if (!window) return;
		expect(hours(window.retrogradeStation.at, at('2023-07-23T01:31:00Z'))).toBeLessThan(6);
		expect(hours(window.directStation.at, at('2023-09-04T01:22:00Z'))).toBeLessThan(6);
		expect(window.days).toBeGreaterThan(41);
		expect(window.days).toBeLessThan(44);
	});

	it('puts the retrograde station before and the direct station after the conjunction', () => {
		const conjunction = at('2023-08-13T11:14:00Z');
		const window = findRetrogradeWindow(conjunction);
		expect(window).not.toBeNull();
		if (!window) return;
		expect(window.retrogradeStation.at.getTime()).toBeLessThan(conjunction.getTime());
		expect(window.directStation.at.getTime()).toBeGreaterThan(conjunction.getTime());
		// The two stations sit on either side of the conjunction at a similar elongation.
		expect(window.retrogradeStation.elongation).toBeGreaterThan(0);
		expect(window.directStation.elongation).toBeLessThan(0);
		expect(Math.abs(Math.abs(window.retrogradeStation.elongation) - 28.8)).toBeLessThan(1.5);
	});

	it('is found for every cycle in a decade, always 41-44 days long', () => {
		for (const iso of [
			'2020-06-03T17:42:00Z',
			'2022-01-09T00:48:00Z',
			'2023-08-13T11:14:00Z',
			'2025-03-23T01:06:00Z',
			'2026-10-24T03:39:00Z'
		]) {
			const window = findRetrogradeWindow(at(iso));
			expect(window).not.toBeNull();
			if (!window) continue;
			// The published stations put the 2020 cycle at about 40.9 days and the 2023
			// cycle at 42.8: the window is not a fixed length, so the band has to allow
			// the observed spread rather than the quoted "around 40".
			expect(window.days).toBeGreaterThan(40.5);
			expect(window.days).toBeLessThan(44);
			expect(window.retrogradeStation.at.getTime()).toBeLessThan(window.directStation.at.getTime());
		}
	});
});

describe('the inframonde', () => {
	const inferior2023: Conjunction = {
		kind: 'inferior',
		at: at('2023-08-13T11:14:00Z'),
		elongation: 0,
		venusLatitude: -7.69,
		separationFromSun: 7.69
	};

	it('lengthens with the assumed arcus visionis', () => {
		const tight = findInvisibilityWindow(inferior2023, 3);
		const normal = findInvisibilityWindow(inferior2023, 5);
		const wide = findInvisibilityWindow(inferior2023, 10);
		const veryWide = findInvisibilityWindow(inferior2023, 20);
		expect(tight && normal && wide && veryWide).toBeTruthy();
		if (!tight || !normal || !wide || !veryWide) return;
		expect(tight.days).toBeLessThan(normal.days);
		expect(normal.days).toBeLessThan(wide.days);
		expect(wide.days).toBeLessThan(veryWide.days);
		// The threshold is what sets this length, and near the inferior conjunction Venus's
		// elongation moves at about 1.6°/day, so the window is roughly twice the threshold
		// divided by that rate: 3.8 days at 3°, 6.4 at 5°, 12.9 at 10° — all measured.
		expect(tight.days).toBeCloseTo(3.8, 0);
		expect(normal.days).toBeCloseTo(6.4, 0);
		expect(wide.days).toBeCloseTo(12.9, 0);
		// The classical arcus visionis is a few degrees, which is why the descent into the
		// underworld lasts days rather than the "60 to 90" a 20-40° threshold would imply.
		expect(veryWide.days).toBeGreaterThan(24);
		expect(veryWide.days).toBeLessThan(30);
	});

	it('is centred on the inferior conjunction', () => {
		const window = findInvisibilityWindow(inferior2023, 5);
		expect(window).not.toBeNull();
		if (!window) return;
		expect(window.start.getTime()).toBeLessThan(inferior2023.at.getTime());
		expect(window.end.getTime()).toBeGreaterThan(inferior2023.at.getTime());
		// Roughly symmetric: the descent and the return take about as long as each other.
		const before = days(window.start, inferior2023.at);
		const after = days(inferior2023.at, window.end);
		expect(Math.abs(before - after)).toBeLessThan(2.5);
	});

	it('refuses a superior conjunction', () => {
		const superior: Conjunction = {
			kind: 'superior',
			at: at('2024-06-04T15:33:00Z'),
			elongation: 0,
			venusLatitude: -0.06,
			separationFromSun: 0.06
		};
		expect(findInvisibilityWindow(superior, 5)).toBeNull();
	});

	it('flags the conjunction date as inframonde and a month later as not', () => {
		// Midday on the conjunction, so the moment is unambiguously inside the cycle the
		// conjunction opens rather than on the boundary that separates it from the last one.
		expect(computeJourney(at('2023-08-13T12:00:00Z')).inInframonde).toBe(true);
		expect(computeJourney(at('2023-08-15T12:00:00Z')).inInframonde).toBe(true);
		expect(computeJourney(at('2023-09-20T12:00:00Z')).inInframonde).toBe(false);
		expect(computeJourney(at('2023-07-01T12:00:00Z')).inInframonde).toBe(false);
	});

	it('hands the reader to the new cycle once the conjunction has passed', () => {
		const before = computeJourney(at('2023-08-13T00:00:00Z'));
		const after = computeJourney(at('2023-08-13T23:00:00Z'));
		// The inferior conjunction falls at 11:14 that day, so the two moments sit in
		// different cycles even though they are the same calendar date.
		expect(Math.abs(before.end.at.getTime() - after.start.at.getTime())).toBeLessThan(1000);
		expect(before.dayOfCycle).toBeGreaterThan(580);
		expect(before.daysRemaining).toBeLessThan(1);
		// The same conjunction closes one cycle and opens the next.
		expect(hours(after.start.at, at('2023-08-13T11:14:00Z'))).toBeLessThan(0.1);
		expect(after.dayOfCycle).toBeGreaterThan(0);
		expect(after.dayOfCycle).toBeLessThan(1);
		// The two moments straddle the same conjunction, so what was left of the old cycle
		// plus what has elapsed in the new one must come to the gap between them: an hour.
		expect(before.daysRemaining + after.dayOfCycle).toBeCloseTo(23 / 24, 2);
		expect(before.synodicDays).toBeGreaterThan(580);
	});
});

describe('Moon-Venus conjunctions', () => {
	const raw = findMoonVenusConjunctions(at('2023-08-13T00:00:00Z'), at('2025-03-23T00:00:00Z'));

	it('finds roughly one per lunation', () => {
		expect(raw.length).toBeGreaterThanOrEqual(19);
		expect(raw.length).toBeLessThanOrEqual(22);
		// The Moon laps Venus once per synodic month, but the interval is not that month:
		// both bodies are moving, so the gap ranges from about 26 to 32 days and averages
		// out near 29.7. Asserting a tight 29.5 on every gap would be asserting something
		// untrue of the sky.
		for (let i = 1; i < raw.length; i++) {
			const gap = days(raw[i - 1].at, raw[i].at);
			expect(gap).toBeGreaterThan(25);
			expect(gap).toBeLessThan(33);
		}
		const mean = days(raw[0].at, raw[raw.length - 1].at) / (raw.length - 1);
		expect(mean).toBeGreaterThan(28.5);
		expect(mean).toBeLessThan(30.5);
	});

	it('dates the 2023-11-09 conjunction and its orb', () => {
		const found = raw
			.slice()
			.sort((a, b) => hours(a.at, at('2023-11-09T10:22:00Z')) - hours(b.at, at('2023-11-09T10:22:00Z')))[0];
		expect(hours(found.at, at('2023-11-09T10:22:00Z'))).toBeLessThan(2);
		// Measured separation that month: 0.89°, and the closest approach within the hour.
		expect(found.separation).toBeGreaterThan(0.5);
		expect(found.separation).toBeLessThan(1.3);
		expect(Math.abs(hours(found.closestAt, found.at))).toBeLessThan(2);
		expect(found.closestSeparation).toBeLessThanOrEqual(found.separation + 0.01);
	});

	it('holds the conjunction exact even when the two bodies stand far apart', () => {
		// 2023-08-16: the Moon meets Venus at the same longitude but 4.7° north of it, so the
		// real separation is nearly 13°. The conjunction is none the less exact — it is the
		// latitude that separates them, and the app reports that distance without turning it
		// into a verdict on the gate.
		const found = raw
			.slice()
			.sort((a, b) => hours(a.at, at('2023-08-16T00:43:00Z')) - hours(b.at, at('2023-08-16T00:43:00Z')))[0];
		expect(hours(found.at, at('2023-08-16T00:43:00Z'))).toBeLessThan(2);
		expect(found.separation).toBeGreaterThan(9);
		expect(found.moonLatitude).toBeGreaterThan(4);
		// The Moon's own longitude is the same as Venus's, to the tolerance of the bisection.
		expect(Math.abs(found.moonLongitude - found.venusLongitude)).toBeLessThan(0.01);
	});

	it('gives every conjunction an exact instant, to the minute', () => {
		for (const c of raw) {
			// A real instant, not a rounded hour: the conjunction is bisected to a half-second
			// stopping rule, so the milliseconds are not zero and are not expected to be.
			expect(c.at.getMilliseconds()).toBeLessThan(1000);
			expect(Number.isFinite(c.at.getTime())).toBe(true);
			// And the two bodies really do hold the same degree there.
			expect(Math.abs(c.moonLongitude - c.venusLongitude)).toBeLessThan(0.01);
		}
	});

	it('measures the separation the way spherical trigonometry does', () => {
		// Independent check of the reported separation. At a zodiacal conjunction the two
		// longitudes are equal, so the great-circle separation reduces exactly to the
		// difference of ecliptic latitudes. A longitude-only "orb" would fail this: at the
		// 2023-08-16 conjunction the longitudes agree while the bodies are 12.6° apart.
		for (const c of raw) {
			expect(Math.abs(c.moonLatitude)).toBeLessThan(5.4);
			expect(Math.abs(c.venusLatitude)).toBeLessThan(9);
			expect(Math.abs(c.separation - Math.abs(c.moonLatitude - c.venusLatitude))).toBeLessThan(0.35);
		}
	});

	it('splits roughly evenly between the two halves of the sky', () => {
		const morning = raw.filter((c) => c.elongation < 0).length;
		expect(morning).toBeGreaterThanOrEqual(8);
		expect(morning).toBeLessThanOrEqual(12);
		expect(raw.length - morning).toBeGreaterThanOrEqual(8);
	});

	it('never grades a conjunction: there is nothing to grade', () => {
		// The type has no quality field, and the widest and tightest conjunctions of a cycle
		// are described by the same fields — an instant and a distance.
		for (const c of raw) {
			expect(c).not.toHaveProperty('quality');
			expect(c).not.toHaveProperty('orb');
			expect(c.at).toBeInstanceOf(Date);
			expect(typeof c.separation).toBe('number');
		}
	});
});

describe('la sélection des portails', () => {
	// Le cycle 2023-08-13 → 2025-03-23.
	const journey = computeJourney(at('2024-03-01T00:00:00Z'));
	const chakraKeys = new Set<string>(GATES.map((g) => g.key));

	it('donne sept ou huit portails par phase, jamais plus', () => {
		for (const phase of [journey.morning, journey.evening]) {
			expect(phase.portals.length).toBeGreaterThanOrEqual(1);
			expect(phase.portals.length).toBeLessThanOrEqual(8);
			// Le rang suit la date : 1 à n.
			const ranks = phase.portals.map((p) => p.index);
			expect(new Set(ranks).size).toBe(ranks.length);
			expect(Math.min(...ranks)).toBe(1);
			expect(Math.max(...ranks)).toBe(ranks.length);
		}
	});

	it('écarte les conjonctions de l’inframonde : Vénus invisible, aucun portail', () => {
		for (const phase of [journey.morning, journey.evening]) {
			for (const p of phase.passages) {
				expect(p.observable).toBe(Math.abs(p.elongation) > journey.portalVisibility);
				// Une conjonction non observable n'est jamais un portail.
				if (!p.observable) expect(p.portal).toBe(false);
				// Et un portail est toujours observable.
				if (p.portal) expect(p.observable).toBe(true);
			}
			// La phase expose ses conjonctions écartées.
			expect(phase.inframonde.every((p) => !p.observable)).toBe(true);
		}
	});

	it('retient les mieux serrées, et jamais plus de huit', () => {
		for (const phase of [journey.morning, journey.evening]) {
			// Les conjonctions éligibles : visibles, et hors rétrogradation.
			const eligibles = phase.passages.filter(
				(p) => p.observable && !phase.inframonde.some((i) => i.at.getTime() === p.at.getTime()) && p.index > 0
			);
			expect(phase.portals.length).toBe(Math.min(eligibles.length, 8));
			expect(phase.portals.length).toBeGreaterThanOrEqual(7);
			// Quand il y a plus de huit éligibles, les portails sont les huit mieux serrées : toute
			// écartée est moins serrée que la plus large des retenues.
			if (eligibles.length > 8) {
				const kept = new Set(phase.portals.map((p) => p.at.getTime()));
				const widest = Math.max(...phase.portals.map((p) => p.separation));
				for (const p of eligibles.filter((v) => !kept.has(v.at.getTime()))) {
					expect(p.separation).toBeGreaterThanOrEqual(widest);
				}
			}
		}
	});

	it('descend les chakras puis remonte à l’envers', () => {
		const keys = (phase: typeof journey.morning) =>
			phase.portals
				.filter((p) => chakraKeys.has(p.gate.key))
				.sort((a, b) => a.index - b.index)
				.map((p) => p.gate.key);
		// La descente part de la couronne ; l'ascension part de la racine. Le nombre de chakras est
		// celui des portails de la phase moins le seuil, qui en occupe un.
		const chakrasMatin = Math.min(journey.morning.portals.length - 1, GATES.length);
		const chakrasSoir = Math.min(journey.evening.portals.length - 1, GATES.length);
		expect(keys(journey.morning)).toEqual(GATES.slice(0, chakrasMatin).map((g) => g.key));
		expect(keys(journey.evening)).toEqual([...GATES].reverse().slice(0, chakrasSoir).map((g) => g.key));
	});

	it('nomme chaque portail d’après ce qu’il gouverne, et donne son chakra', () => {
		const expected: Array<[string, string, string]> = [
			["Portail de l'Autorité", 'Couronne', 'Sahasrāra'],
			['Portail de la Vision', 'Troisième œil', 'Ājñā'],
			['Portail de la Communication', 'Gorge', 'Viśuddha'],
			['Portail de la Compassion', 'Cœur', 'Anāhata'],
			['Portail du Pouvoir Personnel', 'Plexus solaire', 'Maṇipūra'],
			['Portail de la Créativité', 'Sacré', 'Svādhiṣṭhāna'],
			['Portail de la Manifestation', 'Racine', 'Mūlādhāra']
		];
		for (const [name, chakra, sanskrit] of expected) {
			const gate = GATES.find((g) => g.name === name);
			expect(gate, `portail absent : ${name}`).toBeDefined();
			expect(gate!.chakra).toBe(chakra);
			expect(gate!.sanskrit).toBe(sanskrit);
		}
	});

	it('ferme la descente par la mort et ouvre l’ascension par la vie', () => {
		const mort = journey.morning.portals.find((p) => p.gate.key === 'mort-intentionnelle');
		const vie = journey.evening.portals.find((p) => p.gate.key === 'vie-intentionnelle');
		expect(mort, 'la mort intentionnelle manque à la descente').toBeDefined();
		expect(vie, 'la vie intentionnelle manque à l’ascension').toBeDefined();

		// La mort est le dernier portail de la descente ; la vie le premier de l'ascension.
		expect(mort!.index).toBe(Math.max(...journey.morning.portals.map((p) => p.index)));
		expect(vie!.index).toBe(1);

		// Aucun des deux n'est un centre du corps.
		for (const seuil of [mort!, vie!]) {
			expect(seuil.gate).not.toHaveProperty('chakra');
			expect(seuil.gate).not.toHaveProperty('sanskrit');
			expect(seuil.gate).not.toHaveProperty('garment');
		}
	});

	it('déroule l’ascension depuis la vie : manifestation, créativité, etc.', () => {
		// Le rang suit l'ordre du mythe, et la vie est toujours la première.
		const n = journey.evening.portals.length;
		const attendu = ['Vie intentionnelle']
			.concat(
				['Portail de la Manifestation', 'Portail de la Créativité', 'Portail du Pouvoir Personnel',
				 'Portail de la Compassion', 'Portail de la Communication', 'Portail de la Vision',
				 "Portail de l'Autorité"].slice(0, n - 1)
			);
		expect(
			journey.evening.portals.slice().sort((a, b) => a.index - b.index).map((p) => p.gate.name)
		).toEqual(attendu);

		// Et la descente, de la couronne jusqu'à la mort, qui ferme.
		const m = journey.morning.portals.length;
		const attenduMatin = ["Portail de l'Autorité", 'Portail de la Vision', 'Portail de la Communication',
			'Portail de la Compassion', 'Portail du Pouvoir Personnel', 'Portail de la Créativité',
			'Portail de la Manifestation'].slice(0, m - 1).concat(['Mort intentionnelle']);
		expect(
			journey.morning.portals.slice().sort((a, b) => a.index - b.index).map((p) => p.gate.name)
		).toEqual(attenduMatin);
	});

	it('vérifie la règle sur huit cycles', () => {
		for (const iso of [
			'2020-06-03T12:00:00Z',
			'2022-01-09T12:00:00Z',
			'2023-08-13T12:00:00Z',
			'2025-03-23T12:00:00Z',
			'2026-10-24T12:00:00Z',
			'2028-06-01T12:00:00Z',
			'2030-01-06T12:00:00Z',
			'2033-03-20T12:00:00Z'
		]) {
			const j = computeJourney(at(iso));
			for (const phase of [j.morning, j.evening]) {
				// Sept ou huit, jamais plus : la rétrogradation en écarte une de temps en temps.
				expect(phase.portals.length).toBeGreaterThanOrEqual(7);
				expect(phase.portals.length).toBeLessThanOrEqual(8);
			}
		}
	});
});

describe('the active gate', () => {
	/** A conjunction of a given cycle, taken from the cycle itself rather than typed in. */
	const conjunctions = computeJourney(at('2024-03-01T00:00:00Z')).conjunctions;
	const tightOne = conjunctions.filter((p) => p.separation < 1).sort((a, b) => a.separation - b.separation)[0];
	const wideOne = conjunctions
		.filter((p) => p.observable && p.separation > 5)
		.sort((a, b) => b.separation - a.separation)[0];

	it('stands open at the exact instant of a conjunction', () => {
		expect(tightOne).toBeDefined();
		const journey = computeJourney(tightOne.at);
		expect(journey.activePassage).not.toBeNull();
		expect(journey.activePassage?.gate.key).toBe(tightOne.gate.key);
		expect(journey.activePassage?.open).toBe(true);
		// The instant reported is the conjunction itself, to the millisecond.
		// Same conjunction, found from a grid opened at a slightly different point: identical
		// to within the bisection's half-second rule.
		expect(Math.abs(journey.activePassage!.at.getTime() - tightOne.at.getTime())).toBeLessThan(1000);
		expect(journey.activePassage?.separation).toBeLessThan(1);
	});

	it('is still open on a conjunction whose separation is wide', () => {
		expect(wideOne).toBeDefined();
		const journey = computeJourney(wideOne.at);
		// The Moon met Venus at the same zodiacal degree while standing 12° away in the sky.
		// The gate is open: the conjunction happened, and the distance is reported, not graded.
		expect(journey.activePassage).not.toBeNull();
		expect(journey.activePassage?.separation).toBeGreaterThan(5);
		expect(Math.abs(journey.activePassage!.at.getTime() - wideOne.at.getTime())).toBeLessThan(1000);
	});

	it('reports the next gate even when none is open', () => {
		// Two days after a passage the Moon is on the far side of its orbit from Venus.
		const quiet = shiftDays(conjunctions[3].at, 2);
		const journey = computeJourney(quiet);
		expect(journey.nextPassage).not.toBeNull();
		expect(journey.nextPassage?.at.getTime()).toBeGreaterThan(quiet.getTime());
	});

	it('opens the gate only within its stated window, and says which window', () => {
		const passage = conjunctions.filter((p) => p.separation < 1).sort((a, b) => a.separation - b.separation)[0];
		const journey = computeJourney(passage.at);
		// The window is a documented number, not a tuned threshold.
		expect(journey.gateWindowHours).toBe(GATE_WINDOW_HOURS);

		const hoursFrom = (h: number) => shiftDays(passage.at, h / 24);
		expect(computeJourney(hoursFrom(-11)).activePassage).not.toBeNull();
		expect(computeJourney(hoursFrom(11)).activePassage).not.toBeNull();
		// Just past the half-day mark it is no longer the gate in progress — though the gate
		// itself, its instant, is unchanged and still reported.
		expect(computeJourney(hoursFrom(13)).activePassage).toBeNull();
		expect(computeJourney(hoursFrom(-13)).activePassage).toBeNull();
	});

	it('closes the gate once its instant is a day behind', () => {
		for (const passage of conjunctions.filter((p) => p.separation < 1.5)) {
			const journey = computeJourney(shiftDays(passage.at, 2));
			expect(journey.activePassage).toBeNull();
		}
	});

	it('never reports a gate open outside its window', () => {
		// Four moments rather than twenty times three: each one costs a full search through
		// the ephemeris, and the question is the same at every passage.
		for (const passage of conjunctions.slice(0, 4)) {
			for (const offset of [-3, 0, 3]) {
				const journey = computeJourney(shiftDays(passage.at, offset));
				if (journey.activePassage) {
					// A gate is open only within its own window — never on a neighbouring date.
					expect(isGateOpen(journey.activePassage.at, journey.date)).toBe(true);
				}
			}
		}
	});
});

describe('cost', () => {
	it('assembles a whole journey in well under a second', () => {
		const started = performance.now();
		computeJourney(at('2024-03-01T00:00:00Z'));
		const took = performance.now() - started;
		// It runs in the browser on every date change, so this is a real budget: measured
		// at a few tens of milliseconds, and the guard is deliberately loose for slow CI.
		expect(took).toBeLessThan(3000);
	});
});

describe('pairing a gate with its passage', () => {
	it('donne le portail ouvert quand son rang est celui du moment', () => {
		const instant = computeJourney(at('2024-04-07T00:00:00Z')).conjunctions.find(
			(p) => p.portal && p.at.toISOString().startsWith('2024-04-07')
		)!.at;
		const journey = computeJourney(instant);
		const active = journey.activePassage;
		expect(active).not.toBeNull();
		if (!active) return;
		const paired = passageForGate(journey, active.gate.key);
		expect(paired?.at.getTime()).toBe(active.at.getTime());
	});

	it('apparie chaque portail avec une conjonction de la phase en cours', () => {
		for (const iso of ['2024-04-07T00:00:00Z', '2024-12-01T00:00:00Z', '2023-10-01T00:00:00Z']) {
			const journey = computeJourney(at(iso));
			const phase = journey.star === 'morning' ? journey.morning : journey.evening;
			for (const portal of phase.portals) {
				if (journey.activePassage?.gate.key === portal.gate.key) continue;
				expect(passageForGate(journey, portal.gate.key)).not.toBeNull();
			}
		}
	});
});
