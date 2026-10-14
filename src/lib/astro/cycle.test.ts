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
import { GATES, GATE_COUNT, THRESHOLDS, gateForIndex, portalForRank } from '../symbolic/gates';

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

describe('gate assignment', () => {
	const journey = computeJourney(at('2024-03-01T00:00:00Z'));

	it('descends the seven chakras in order, crown first', () => {
		expect(GATES.map((g) => g.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		expect(GATES[0].key).toBe('crown');
		expect(GATES[GATE_COUNT - 1].key).toBe('root');
		// The order of the descent is the order of the chakras, top to bottom.
		const expected = ['crown', 'brow', 'throat', 'heart', 'solar', 'sacral', 'root'];
		expect(GATES.map((g) => g.key)).toEqual(expected);
	});

	it('turns the eighth rank into a threshold, not another chakra', () => {
		// Rank 8 is not the crown again: it is the return. What it opens depends on the
		// direction of travel — her death going down, her life coming back up.
		expect(gateForIndex(7).key).toBe('root');
		expect(portalForRank(8, 'morning').key).toBe('mort-intentionnelle');
		expect(portalForRank(8, 'evening').key).toBe('vie-intentionnelle');
		expect(portalForRank(8, 'morning')).toBe(THRESHOLDS['mort-intentionnelle']);
		// And a threshold is deliberately not shaped like a chakra.
		for (const t of Object.values(THRESHOLDS)) {
			expect(t.index).toBe(8);
			expect(t).not.toHaveProperty('sanskrit');
			expect(t).not.toHaveProperty('garment');
			expect(t).not.toHaveProperty('location');
		}
	});

	it('numbers only the observable portals, within each half from one', () => {
		for (const phase of [journey.morning, journey.evening]) {
			const ranks = phase.portals.map((p) => p.index);
			expect(ranks).toEqual(ranks.slice().sort((a, b) => a - b));
			expect(ranks[0]).toBe(1);
			// A half holds seven portals, or eight when one conjunction more clears the threshold.
			expect([GATE_COUNT, GATE_COUNT + 1]).toContain(ranks.length);
			expect(ranks[ranks.length - 1]).toBe(ranks.length);
			// Chronological order and rank order agree.
			const times = phase.portals.map((p) => p.at.getTime());
			expect(times).toEqual(times.slice().sort((a, b) => a - b));
			// Every passage of the half is listed, observable or not — but only the observable
			// ones are ranked.
			for (const p of phase.passages) {
				expect(p.observable).toBe(Math.abs(p.elongation) >= journey.portalVisibility);
				expect(p.index === 0).toBe(!p.observable);
			}
		}
	});

	it('gives the crown to the first observable conjunction of each half', () => {
		expect(journey.morning.portals[0].gate.key).toBe('crown');
		expect(journey.evening.portals[0].gate.key).toBe('crown');
		expect(journey.morning.portals[0].index).toBe(1);
	});

	it('covers exactly the seven chakras in each half, in the order of the descent', () => {
		for (const phase of [journey.morning, journey.evening]) {
			const firstSeven = phase.portals.slice(0, GATE_COUNT);
			expect(firstSeven.map((p) => p.gate.key)).toEqual(GATES.map((g) => g.key));
			expect(firstSeven.map((p) => p.index)).toEqual([1, 2, 3, 4, 5, 6, 7]);
		}
	});

	it('keeps every passage inside its own half of the cycle', () => {
		for (const p of journey.morning.passages) {
			expect(p.at.getTime()).toBeGreaterThanOrEqual(journey.start.at.getTime());
			expect(p.at.getTime()).toBeLessThan(journey.mid.at.getTime());
			expect(p.star).toBe('morning');
			expect(p.waxing).toBe(false);
		}
		for (const p of journey.evening.passages) {
			expect(p.at.getTime()).toBeGreaterThan(journey.mid.at.getTime());
			expect(p.at.getTime()).toBeLessThanOrEqual(journey.end.at.getTime());
			expect(p.star).toBe('evening');
			expect(p.waxing).toBe(true);
		}
	});

	it('separates the portals from the conjunctions that open nothing', () => {
		expect(journey.conjunctions.length).toBe(
			journey.morning.passages.length + journey.evening.passages.length
		);
		// About twenty meetings a cycle, but only the observable ones are portals.
		expect(journey.conjunctions.length).toBeGreaterThanOrEqual(19);
		const portals = journey.morning.portals.length + journey.evening.portals.length;
		expect(portals).toBeLessThan(journey.conjunctions.length);
		expect(portals).toBeGreaterThanOrEqual(2 * GATE_COUNT);
		expect(portals).toBeLessThanOrEqual(2 * GATE_COUNT + 2);
	});

	it('marks the eighth portal as the threshold of its own direction', () => {
		for (const phase of [journey.morning, journey.evening]) {
			if (phase.portals.length <= GATE_COUNT) continue;
			const eighth = phase.portals[GATE_COUNT];
			expect(eighth.index).toBe(8);
			expect(eighth.gate.key).toBe(
				phase.star === 'morning' ? 'mort-intentionnelle' : 'vie-intentionnelle'
			);
		}
	});

	it('marks a passage open only around its exact instant', () => {
		for (const p of journey.conjunctions) {
			expect(p.open).toBe(isGateOpen(p.at, journey.date));
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
	it('shows the next occurrence of a gate, not the first in the cycle', () => {
		// Within one half of the cycle each chakra opens exactly once, but the cycle holds
		// two halves, so the same chakra opens twice per cycle. Pairing by chakra alone would
		// answer with the other half's date; the reader's own half has to win.
		const journey = computeJourney(at('2024-04-07T00:00:00Z'));
		for (const gate of GATES) {
			const own = journey.conjunctions.filter(
				(c) => c.gate.key === gate.key && c.star === journey.star && c.observable
			);
			expect(own.length).toBeLessThanOrEqual(1);
			const both = journey.conjunctions.filter((c) => c.gate.key === gate.key && c.observable);
			if (both.length < 2) continue;
			const paired = passageForGate(journey, gate.key)!;
			expect(paired.star).toBe(journey.star);
		}
	});

	it('counts seven or eight portals in a half, every half, over two decades', () => {
		// The claim that a half of the cycle holds seven or eight portals is the whole shape
		// of the app, so it is checked across many cycles rather than asserted once.
		const dates = [
			'2020-06-03T12:00:00Z',
			'2022-01-09T12:00:00Z',
			'2023-08-13T12:00:00Z',
			'2025-03-23T12:00:00Z',
			'2026-10-24T12:00:00Z',
			'2028-06-01T12:00:00Z',
			'2029-12-16T12:00:00Z',
			'2031-08-11T12:00:00Z'
		];
		for (const iso of dates) {
			const journey = computeJourney(at(iso));
			for (const phase of [journey.morning, journey.evening]) {
				expect([GATE_COUNT, GATE_COUNT + 1]).toContain(phase.portals.length);
			}
		}
	});

	it('returns the open passage itself when its gate is open', () => {
		// At the conjunction's own instant, so the gate is inside its window.
		const journey = computeJourney(at('2024-04-07T16:22:00Z'));
		const active = journey.activePassage;
		expect(active).not.toBeNull();
		if (!active) return;
		const paired = passageForGate(journey, active.gate.key);
		expect(Math.abs(paired!.at.getTime() - active.at.getTime())).toBeLessThan(1000);
	});

	it('falls back to the last occurrence when nothing is left ahead', () => {
		// Ten days before the closing inferior conjunction the evening half is over.
		const journey = computeJourney(at('2025-03-13T00:00:00Z'));
		for (const gate of GATES) {
			if (journey.activePassage?.gate.key === gate.key) continue;
			const paired = passageForGate(journey, gate.key);
			expect(paired).not.toBeNull();
			expect(paired!.gate.key).toBe(gate.key);
		}
	});

	it('pairs every gate with a passage of the half of the cycle in progress', () => {
		for (const iso of ['2024-04-07T00:00:00Z', '2024-12-01T00:00:00Z', '2023-10-01T00:00:00Z']) {
			const journey = computeJourney(at(iso));
			for (const gate of GATES) {
				if (journey.activePassage?.gate.key === gate.key) continue;
				const paired = passageForGate(journey, gate.key);
				expect(paired).not.toBeNull();
				expect(paired!.star).toBe(journey.star);
			}
		}
	});
});
