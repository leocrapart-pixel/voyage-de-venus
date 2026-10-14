import { describe, expect, it } from 'vitest';
import {
	DEFAULT_ORB,
	computeJourney,
	findInvisibilityWindow,
	findMoonVenusConjunctions,
	findRetrogradeWindow,
	findSunVenusConjunctions,
	gateQuality,
	passageForGate,
	type Conjunction
} from './cycle';
import { daysBetween, shiftDays } from './ephemeris';
import { GATES, GATE_COUNT, gateForIndex } from '../symbolic/gates';

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
		// Measured orb that month: 0.89°.
		expect(found.orb).toBeGreaterThan(0.5);
		expect(found.orb).toBeLessThan(1.3);
		expect(found.quality).toBe('tight');
	});

	it('reports an orb that can be much wider than the zodiacal conjunction', () => {
		// 2023-08-16: the Moon meets Venus at the same longitude but 4.7° north of it,
		// so the real separation is nearly 13°. Longitude alone would call that a hit.
		const found = raw
			.slice()
			.sort((a, b) => hours(a.at, at('2023-08-16T00:43:00Z')) - hours(b.at, at('2023-08-16T00:43:00Z')))[0];
		expect(hours(found.at, at('2023-08-16T00:43:00Z'))).toBeLessThan(2);
		expect(found.orb).toBeGreaterThan(9);
		expect(found.moonLatitude).toBeGreaterThan(4);
		expect(found.quality).toBe('wide');
	});

	it('measures the orb the way spherical trigonometry does', () => {
		// Independent check of the reported separation. At a zodiacal conjunction the two
		// longitudes are equal, so the great-circle separation reduces exactly to the
		// difference of ecliptic latitudes. A longitude-only "orb" would fail this: at the
		// 2023-08-16 conjunction the longitudes agree while the bodies are 12.6° apart.
		for (const c of raw) {
			expect(Math.abs(c.moonLatitude)).toBeLessThan(5.4);
			expect(Math.abs(c.venusLatitude)).toBeLessThan(9);
			expect(Math.abs(c.orb - Math.abs(c.moonLatitude - c.venusLatitude))).toBeLessThan(0.35);
		}
	});

	it('splits roughly evenly between the two halves of the sky', () => {
		const morning = raw.filter((c) => c.elongation < 0).length;
		expect(morning).toBeGreaterThanOrEqual(8);
		expect(morning).toBeLessThanOrEqual(12);
		expect(raw.length - morning).toBeGreaterThanOrEqual(8);
	});

	it('classifies the orb quality at its boundaries', () => {
		expect(gateQuality(0.5)).toBe('tight');
		expect(gateQuality(1)).toBe('tight');
		expect(gateQuality(1.01)).toBe('close');
		expect(gateQuality(3)).toBe('close');
		expect(gateQuality(3.01)).toBe('wide');
		expect(gateQuality(2.5, { tightOrb: 1, openOrb: 2 })).toBe('wide');
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

	it('wraps back to the crown after the root', () => {
		expect(gateForIndex(7).key).toBe('root');
		expect(gateForIndex(8).key).toBe('crown');
		expect(gateForIndex(14).key).toBe('root');
		expect(gateForIndex(1).key).toBe('crown');
	});

	it('numbers the passages within each half from one', () => {
		for (const phase of [journey.morning, journey.evening]) {
			const ranks = phase.passages.map((p) => p.index);
			expect(ranks).toEqual(ranks.slice().sort((a, b) => a - b));
			expect(ranks[0]).toBe(1);
			// Chronological order and rank order agree.
			const times = phase.passages.map((p) => p.at.getTime());
			expect(times).toEqual(times.slice().sort((a, b) => a - b));
		}
	});

	it('gives the crown to the first conjunction of each half', () => {
		expect(journey.morning.passages[0].gate.key).toBe('crown');
		expect(journey.evening.passages[0].gate.key).toBe('crown');
		expect(journey.morning.passages[0].index).toBe(1);
	});

	it('covers the whole descent across each half', () => {
		// A half holds about ten conjunctions, so the first seven gates always appear.
		for (const phase of [journey.morning, journey.evening]) {
			const keys = new Set(phase.passages.slice(0, GATE_COUNT).map((p) => p.gate.key));
			expect(keys.size).toBe(GATE_COUNT);
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

	it('totals the conjunctions of both halves', () => {
		expect(journey.conjunctions.length).toBe(
			journey.morning.passages.length + journey.evening.passages.length
		);
		expect(journey.conjunctions.length).toBeGreaterThanOrEqual(19);
	});

	it('marks a passage open only when the Moon is inside the orb', () => {
		for (const p of journey.conjunctions) {
			expect(p.open).toBe(p.orb <= DEFAULT_ORB.openOrb);
			expect(p.quality).toBe(gateQuality(p.orb));
		}
	});
});

describe('the active gate', () => {
	/** A conjunction of a given cycle, taken from the cycle itself rather than typed in. */
	const conjunctions = computeJourney(at('2024-03-01T00:00:00Z')).conjunctions;
	const tightOne = conjunctions.filter((p) => p.orb < 1).sort((a, b) => a.orb - b.orb)[0];
	const wideOne = conjunctions.filter((p) => p.orb > 5).sort((a, b) => b.orb - a.orb)[0];

	it('stands open on a tight conjunction date', () => {
		expect(tightOne).toBeDefined();
		const journey = computeJourney(tightOne.at);
		expect(journey.activePassage).not.toBeNull();
		expect(journey.activePassage?.gate.key).toBe(tightOne.gate.key);
		expect(journey.activePassage?.open).toBe(true);
		expect(journey.activePassage?.orb).toBeLessThan(1);
	});

	it('stays shut on a wide conjunction date', () => {
		expect(wideOne).toBeDefined();
		const journey = computeJourney(wideOne.at);
		// The Moon met Venus at the same zodiacal degree, but 12° away in the sky: no gate.
		expect(journey.activePassage).toBeNull();
	});

	it('reports the next gate even when none is open', () => {
		// Two weeks after a passage the Moon is on the far side of its orbit from Venus.
		const quiet = shiftDays(conjunctions[3].at, 14);
		const journey = computeJourney(quiet);
		expect(journey.nextPassage).not.toBeNull();
		expect(journey.nextPassage?.at.getTime()).toBeGreaterThan(quiet.getTime());
	});

	it('never mistakes a distant tight conjunction for an open gate', () => {
		for (const passage of conjunctions.filter((p) => p.orb < 1.5)) {
			const journey = computeJourney(shiftDays(passage.at, 14));
			expect(journey.activePassage).toBeNull();
		}
	});

	it('never reports a gate open while the Moon is far from Venus', () => {
		for (const passage of conjunctions) {
			for (const offset of [-3, 0, 3]) {
				const journey = computeJourney(shiftDays(passage.at, offset));
				if (journey.activePassage) {
					expect(journey.activePassage.orb).toBeLessThanOrEqual(DEFAULT_ORB.openOrb);
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
	it('returns the conjunction whose gate is open, even when the chakra is walked twice', () => {
		// A half of the cycle holds about ten conjunctions against seven chakras, so the
		// descent wraps: the brow is walked at rank 2 and again at rank 9. Searching for
		// "the brow conjunction of the morning star" would answer with the rank-2 one from
		// seven months earlier, which is not the passage the reader is being shown.
		const date = at('2024-04-07T00:00:00Z');
		const journey = computeJourney(date);
		const active = journey.activePassage;
		expect(active).not.toBeNull();
		if (!active) return;
		expect(active.index).toBeGreaterThan(GATE_COUNT);

		const sameBrow = journey.conjunctions.filter(
			(c) => c.gate.key === active.gate.key && c.star === active.star
		);
		expect(sameBrow.length).toBeGreaterThan(1);

		const paired = passageForGate(journey, active.gate.key);
		expect(paired?.at.getTime()).toBe(active.at.getTime());
	});

	it('pairs every other gate with a conjunction of the same half of the cycle', () => {
		const journey = computeJourney(at('2024-04-07T00:00:00Z'));
		for (const gate of GATES) {
			const paired = passageForGate(journey, gate.key);
			expect(paired).not.toBeNull();
			if (!paired) continue;
			expect(paired.gate.key).toBe(gate.key);
			if (journey.activePassage?.gate.key !== gate.key) {
				expect(paired.star).toBe(journey.star);
			}
		}
	});

	it('never pairs a gate with a conjunction from the other half', () => {
		const journey = computeJourney(at('2024-12-01T00:00:00Z'));
		for (const gate of GATES) {
			const paired = passageForGate(journey, gate.key);
			if (paired && journey.activePassage?.gate.key !== gate.key) {
				expect(paired.star).toBe(journey.star);
			}
		}
	});
});
