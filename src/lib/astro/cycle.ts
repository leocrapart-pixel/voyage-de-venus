import { AngleFromSun, Body, Elongation, MakeTime, SearchMaxElongation } from 'astronomy-engine';
import {
	DAY_MS,
	angularSeparation,
	bisectRoot,
	daysBetween,
	position,
	shiftDays,
	signedDelta,
	toDate,
	type EclipticPosition
} from './ephemeris';
import {
	GATES,
	THRESHOLDS,
	UNDERWORLD_DAYS,
	chakraSequence,
	cycleShape,
	isUnderworldKey,
	type Gate,
	type PortalKey,
	type Threshold,
	type UnderworldDay
} from '../symbolic/gates';

/**
 * L'instant où Vénus cesse d'être visible, ou le redevient.
 *
 * C'est le franchissement du seuil de visibilité par l'élongation : en s'éloignant de la
 * conjonction dans le sens donné, le premier instant où |élongation| atteint `arcusVisionis`.
 * Ce n'est pas une conjonction Vénus-Lune : c'est Vénus seule qui entre dans le Soleil ou en
 * sort, et c'est là que se posent les deux seuils du cycle.
 */
function heliacalCrossing(from: Date, direction: 1 | -1, arcusVisionis: number): Date {
	for (let days = 0.01; days < 70; days += 0.01) {
		const probe = shiftDays(from, direction * days);
		if (Math.abs(venusElongation(probe)) >= arcusVisionis) return probe;
	}
	return from;
}

/**
 * The Venus synodic cycle, measured rather than assumed.
 *
 * A "Voyage de Vénus" runs from one inferior conjunction to the next — the moment
 * Venus passes between the Earth and the Sun, retrograde and invisible, and the hinge
 * where it stops being the evening star and becomes the morning star. That span is
 * usually quoted as 584 days; it is in fact anywhere from 580 to 588 days, because the
 * orbit is eccentric and inclined, and five of those cycles only average the classical
 * 583.92 (they come to 2 919.68 days, an 8-year resonance accurate to about two days).
 *
 * Nothing here hard-codes 584. Every date is searched in the ephemeris, so the app
 * stays honest for whichever cycle it is asked about.
 *
 * Vocabulary used throughout:
 *
 * - **conjonction inférieure** — Venus between the Earth and the Sun, retrograde,
 *   invisible. It opens the cycle.
 * - **conjonction supérieure** — Venus behind the Sun, direct, invisible. It splits
 *   the cycle into its two halves.
 * - **étoile du matin / du soir** — Venus west of the Sun (rising before it) or east of
 *   it (setting after it), decided by the sign of the ecliptic elongation.
 * - **inframonde** — the days around the inferior conjunction during which Venus is too
 *   close to the Sun to be seen. Its length comes from `arcusVisionis`, the minimum
 *   elongation at which the planet becomes visible again. That threshold is an
 *   observational parameter, not a constant of nature, so it is configurable and its
 *   default is stated rather than smuggled in.
 * - **portail** — a Moon-Venus conjunction that can actually be *seen*: the instant the
 *   Moon and Venus share an ecliptic longitude, provided the pair stands at least
 *   `PORTAL_VISIBILITY` from the Sun. The Moon meets Venus about once a month, so a half
 *   of the cycle holds roughly ten conjunctions — but only seven or eight of them clear
 *   that threshold, and that is what makes a half a descent rather than a list. The
 *   instant itself is never approximate and is never qualified as close or missed. Two
 *   figures describe it and they are not the same thing:
 *
 *   - the **instant** itself, to the minute — that is the gate;
 *   - the **closest approach**, the minimum great-circle separation over the hours around
 *     it, which is what the eye would see. It differs from the instant's separation by a
 *     few hundredths of a degree, since the Moon's ecliptic latitude is what separates the
 *     two bodies, and that latitude barely moves in an hour. Measured over a full cycle
 *     the peak of the closest approach lands within 1.1 h of the conjunction, so the app
 *     reports both times whenever they differ by more than half an hour.
 */

export type ConjunctionKind = 'inferior' | 'superior';
export type Star = 'morning' | 'evening';

/**
 * Minimum solar elongation at which Venus is taken to be visible.
 *
 * The classical *arcus visionis*: the sky must be dark enough at the horizon for the
 * planet to emerge from the twilight, which for Venus happens around 5° of elongation.
 * It is an observational parameter — it depends on atmospheric clarity, altitude and
 * the observer's eyesight — which is why the interface lets it be changed and reports
 * the resulting length of the inframonde.
 */
export const DEFAULT_ARCUS_VISIONIS = 5;

/**
 * Solar elongation, in degrees, at which a Moon-Venus conjunction becomes a candidate portal.
 *
 * Below this the pair is lost in the twilight and the meeting happens out of sight, so it
 * is recorded but opens nothing. The value is not tuned: it is the classical limit of
 * naked-eye visibility for a Venus-Moon pair.
 *
 * On its own this threshold leaves the two halves of a cycle disagreeing — 125 cycles
 * between 1900 and 2100 give 7-7 only 5 times, 8-8 25 times, and 7-8 or 8-7 the other 95.
 * The two halves are therefore reconciled explicitly; see `PORTALS_PER_HALF`.
 */
export const PORTAL_VISIBILITY = 15;

/**
 * How many portals a cycle holds in each half: seven, or eight when both halves can carry
 * eight.
 *
 * A descent and its mirror should have the same number of gates, and the sky does not
 * oblige: the two halves of a cycle hold a different number of observable conjunctions in
 * 76 % of cycles, because the Moon's latitude and Venus's eccentricity do not repeat
 * between one half and the next. So the count is settled between them, at the smaller of
 * the two: **7-7 or 8-8, never 7-8**. What the fuller half cannot place falls outside the
 * descent, in the inframonde.
 *
 * The conjunctions that survive are the **first** of each half, counted from the conjunction
 * that opens it; when a half has one too many, the one dropped is its last. Two reasons:
 *
 * - the crown must be the first gate of a half. Keeping by any other measure dropped the
 *   crown on the evening side and started the ascent at the brow, which is not a descent;
 * - the last conjunction of a half is the one nearest the next conjunction — the one whose
 *   meeting already happens in the twilight of the passage into the underworld. It is the
 *   natural marginal case.
 */
export function portalsPerHalf(morningCount: number, eveningCount: number): number {
	return Math.min(morningCount, eveningCount);
}

/**
 * Half-width, in hours, of the window around an exact conjunction during which the
 * interface calls that gate "in progress".
 *
 * The gate itself is an instant and is always reported to the minute; this window decides
 * nothing about when the conjunction happens, only how long it stays on screen as the
 * current one. Half a day either side: wider than the hours the Moon spends near Venus,
 * far narrower than the 29.5-day lunation, so a gate is never announced on a day that is
 * not its own.
 */
export const GATE_WINDOW_HOURS = 12;

/**
 * Whether a gate counts as in progress at a given moment.
 *
 * The comparison needs a tolerance, and it is not cosmetic: conjunctions are located by
 * bisection with a half-second stopping rule, so the same conjunction found from two
 * slightly different search grids can land up to half a second apart. Without the slack, a
 * gate would flicker shut for a reader who reloads a page on its exact instant.
 */
export function isGateOpen(passageAt: Date, moment: Date, windowHours = GATE_WINDOW_HOURS): boolean {
	const toleranceHours = 1 / 3600;
	return Math.abs(daysBetween(passageAt, moment)) <= windowHours / 24 + toleranceHours;
}

export interface Conjunction {
	kind: ConjunctionKind;
	at: Date;
	/** Signed elongation at conjunction: negative = morning star, positive = evening. */
	elongation: number;
	/** Venus's ecliptic latitude — how far off the ecliptic it passes the Sun. */
	venusLatitude: number;
	/** True angular separation from the Sun's centre, degrees. */
	separationFromSun: number;
}

export interface Station {
	at: Date;
	/** `retrograde` is where Venus turns backwards, `direct` where it recovers. */
	direction: 'retrograde' | 'direct';
	elongation: number;
	longitude: number;
}

export interface RetrogradeWindow {
	retrogradeStation: Station;
	directStation: Station;
	days: number;
	/** Longitude of Venus at the midpoint — the degree it returns to. */
	longitude: number;
}

export interface InvisibilityWindow {
	start: Date;
	end: Date;
	days: number;
	arcusVisionis: number;
	conjunction: Conjunction;
}

/**
 * One passage: the exact instant the Moon and Venus share an ecliptic longitude.
 *
 * There is no quality field, because there is nothing to qualify. A conjunction is the
 * instant two bodies hold the same zodiacal degree — it happens or it does not, and its
 * time is fixed to the second. What varies from month to month is only how far apart the
 * two bodies are *in the sky* at that instant, which is a measurement to report rather
 * than a verdict to pass: the Moon can meet Venus at the same degree while passing 5°
 * above or below it, and that distance is the Moon's own ecliptic latitude showing.
 */
export interface MoonVenusConjunction {
	/** The instant of the conjunction, in ecliptic longitude. This is the gate. */
	at: Date;
	/** The longitude both bodies hold at that instant — the gate's degree. */
	longitude: number;
	/** Venus's longitude, identical to `longitude` by construction. */
	venusLongitude: number;
	/**
	 * The Moon's own longitude. Equal to `longitude` only up to the tolerance of the
	 * bisection (half a second of time, so under 0.002° of the Moon's motion), which is
	 * why it is measured rather than assumed.
	 */
	moonLongitude: number;
	/** True angular separation at the instant of conjunction, degrees. */
	separation: number;
	/** Smallest separation over the hours either side, degrees. */
	closestSeparation: number;
	/** When that closest approach occurs. Usually within an hour of `at`. */
	closestAt: Date;
	/** Moon's ecliptic latitude at the conjunction, degrees — what the separation is made of. */
	moonLatitude: number;
	/** Venus's ecliptic latitude at the same instant. */
	venusLatitude: number;
	/** Elongation from the Sun at the conjunction. */
	elongation: number;
	star: Star;
	/** True for a waxing Moon (evening-star sky), false for a waning one. */
	waxing: boolean;
	/**
	 * La moitié du cycle à laquelle ce portail appartient : la descente avant la conjonction
	 * supérieure, l'ascension après.
	 *
	 * À ne pas confondre avec `star`, qui est le signe de l'élongation — une **mesure**. Les
	 * jours de l'inframonde qui terminent la descente tombent après la conjonction inférieure,
	 * donc du côté de l'étoile du soir, mais ils appartiennent bien à la descente qu'ils
	 * achèvent.
	 */
	half: Star;
	/**
	 * Ce que ce portail ouvre : un chakra, un jour de l'inframonde, ou le seuil de la
	 * traversée.
	 */
	gate: Gate | UnderworldDay | Threshold;
	/**
	 * Rang dans sa moitié du cycle : 1 à 7 les chakras, 8 à 10 les trois jours de
	 * l'inframonde, 11 le seuil.
	 */
	index: number;
	/**
	 * Position dans la lecture de la moitié, qui n'est pas celle des dates.
	 *
	 * Le seuil est daté à la charnière du cycle : la mort tombe après la conjonction
	 * inférieure, donc après les jours de la descente qu'elle achève, et la vie tombe avant
	 * eux. Mais le mythe les place ailleurs dans le récit — la mort ferme la descente, la vie
	 * ouvre l'ascension —, et c'est cet ordre-là que l'interface affiche.
	 */
	readOrder: number;
	/**
	 * True when this conjunction clears `PORTAL_VISIBILITY`. A candidate, not yet a portal:
	 * the two halves are then reconciled at the smaller count, so an observable conjunction
	 * can still fall outside the descent.
	 */
	observable: boolean;
	/** True when this conjunction is one of the portals of the cycle. */
	portal: boolean;
	/** Days since the phase began (the inferior or superior conjunction). */
	dayOfPhase: number;
}

export interface GatePassage extends MoonVenusConjunction {
	/** True within half a day of the exact instant — see `GATE_WINDOW_HOURS`. */
	open: boolean;
}

export interface Phase {
	star: Star;
	start: Date;
	end: Date;
	days: number;
	/** Conjunctions of this half, chronological — observable ones and not. */
	passages: GatePassage[];
	/**
	 * The portals of this half, in order: seven of them, or eight when both halves of the
	 * cycle can carry eight — in which case the eighth is the threshold.
	 */
	portals: GatePassage[];
}

export interface GreatestElongation {
	at: Date;
	elongation: number;
	star: Star;
}

export interface VenusJourney {
	date: Date;
	arcusVisionis: number;
	/** Half-width, in hours, of the window during which a gate counts as in progress. */
	gateWindowHours: number;
	/** Solar elongation, in degrees, at which a conjunction becomes a portal candidate. */
	portalVisibility: number;
	/** How many portals each half of this cycle holds: seven, or eight. */
	portalsPerHalf: number;
	/** Inferior conjunction that opened the cycle containing `date`. */
	start: Conjunction;
	/** Inferior conjunction that closes it. */
	end: Conjunction;
	/** Superior conjunction that splits the cycle in two. */
	mid: Conjunction;
	/** Actual length of this cycle, days. The published mean is 583.92. */
	synodicDays: number;
	dayOfCycle: number;
	daysRemaining: number;
	/** Fraction of the cycle completed, 0..1 — drives the progress ring. */
	progress: number;
	star: Star;
	/** Signed ecliptic elongation right now: negative morning, positive evening. */
	elongation: number;
	/** True angular separation from the Sun right now, degrees. */
	separationFromSun: number;
	venus: EclipticPosition;
	moon: EclipticPosition;
	/** Moon-Venus separation right now, degrees. */
	moonSeparation: number;
	greatestElongation: GreatestElongation;
	retrograde: RetrogradeWindow | null;
	invisible: InvisibilityWindow | null;
	/** True while Venus is inside the inframonde. */
	inInframonde: boolean;
	morning: Phase;
	evening: Phase;
	/** Every Moon-Venus conjunction of this cycle, chronological. */
	conjunctions: GatePassage[];
	/** The passage whose exact instant is closest to the reader's moment, if one is open. */
	activePassage: GatePassage | null;
	/** The next passage to come, whether or not its gate has opened. */
	nextPassage: GatePassage | null;
}

/**
 * The passage that hands over a given gate on screen.
 *
 * A half of the cycle holds about ten conjunctions against seven chakras, so the descent
 * wraps and the same chakra opens more than once per half. Which one to show is therefore
 * a real choice, and the answer is the *next* one:
 *
 * 1. the gate standing open right now, if the key matches — the reader is being shown that
 *    passage, so nothing may be substituted for it;
 * 2. otherwise the next conjunction at that gate, in the reader's own half of the cycle —
 *    a gate is something to watch for, and pointing at the first occurrence in the cycle
 *    answers with a date months in the past;
 * 3. failing that, the last one that happened.
 */
export function passageForGate(journey: VenusJourney, key: PortalKey): GatePassage | null {
	if (journey.activePassage?.gate.key === key) return journey.activePassage;

	const star = journey.star;
	const atGate = journey.conjunctions.filter((p) => p.gate.key === key);
	const own = atGate.filter((p) => p.star === star);
	const pool = own.length > 0 ? own : atGate;
	const upcoming = pool
		.filter((p) => p.at.getTime() > journey.date.getTime())
		.sort((a, b) => a.at.getTime() - b.at.getTime());
	if (upcoming.length > 0) return upcoming[0];
	const past = pool.sort((a, b) => b.at.getTime() - a.at.getTime());
	return past[0] ?? null;
}

export interface JourneyOptions {
	/** Minimum solar elongation, in degrees, at which Venus counts as visible. */
	arcusVisionis?: number;
	/** Half-width, in hours, of the window around an exact conjunction. */
	gateWindowHours?: number;
}

function starOf(elongation: number): Star {
	return elongation < 0 ? 'morning' : 'evening';
}

/** Signed ecliptic elongation of Venus: negative when west of the Sun (morning star). */
export function venusElongation(date: Date): number {
	return signedDelta(position(Body.Venus, date).longitude, position(Body.Sun, date).longitude);
}

/**
 * The closest approach of the Moon and Venus around a conjunction.
 *
 * The conjunction is exact in longitude; the separation in the sky reaches its minimum
 * somewhere in the hours around it, because the Moon's ecliptic latitude is not zero and
 * Venus's is not either. Sampling the separation coarsely and then trisecting the bracket
 * finds that minimum to well under a minute.
 */
function closestApproach(around: Date, hours = 20): { at: Date; separation: number } {
	const separationAt = (t: number) =>
		angularSeparation(position(Body.Moon, new Date(t)), position(Body.Venus, new Date(t)));
	const half = hours * 3_600_000;
	const step = 20 * 60_000;
	let best = around.getTime() - half;
	let bestValue = separationAt(best);
	for (let t = best; t <= around.getTime() + half; t += step) {
		const value = separationAt(t);
		if (value < bestValue) {
			bestValue = value;
			best = t;
		}
	}
	let lo = best - step;
	let hi = best + step;
	for (let i = 0; i < 60 && hi - lo > 1000; i++) {
		const a = lo + (hi - lo) / 3;
		const b = hi - (hi - lo) / 3;
		if (separationAt(a) < separationAt(b)) hi = b;
		else lo = a;
	}
	const at = new Date((lo + hi) / 2);
	return { at, separation: separationAt(at.getTime()) };
}

/** Sample a scalar function of time on a fixed grid. */
function sampleGrid(f: (t: number) => number, from: Date, to: Date, stepDays: number) {
	const times: number[] = [];
	const values: number[] = [];
	for (let t = from.getTime(); t <= to.getTime(); t += stepDays * DAY_MS) {
		times.push(t);
		values.push(f(t));
	}
	return { times, values };
}

/**
 * Roots of a signed angular difference sampled on a grid, i.e. the instants where two
 * bodies share an ecliptic longitude.
 *
 * The signal is wrapped into (-180, 180], so it has two kinds of sign change: the real
 * crossings, and the 360° jump near ±180° where the wrap itself flips the sign. Taking
 * every sign change at face value yields twice as many "conjunctions" as there are;
 * unwrapping the whole grid instead is no better, because a signal that oscillates
 * inside a bounded range (the Sun-Venus elongation, which never leaves ±47°) accumulates
 * no laps at all and then hides every real crossing behind a multiple of 360.
 *
 * So each bracket is filtered on its own merits: a real crossing moves smoothly through
 * zero, while a wrap jumps by most of a circle. Anything wider than 180° between two
 * samples is the wrap, not a conjunction.
 */
function rootsFromGrid(
	f: (t: number) => number,
	times: readonly number[],
	values: readonly number[]
): Date[] {
	const out: Date[] = [];
	for (let i = 1; i < values.length; i++) {
		if (values[i - 1] === 0 || Math.sign(values[i - 1]) === Math.sign(values[i])) continue;
		if (Math.abs(values[i] - values[i - 1]) > 180) continue;
		out.push(new Date(bisectRoot(f, times[i - 1], times[i], 500)));
	}
	return out;
}

/**
 * Every Sun-Venus conjunction in a window, classified by Venus's direction of travel.
 *
 * Inferior conjunctions are the ones where Venus is retrograde as it crosses the Sun's
 * longitude; superior conjunctions are the direct ones. No latitude threshold is
 * needed, which matters because Venus can pass up to 8.5° off the ecliptic at an
 * inferior conjunction and still be at the same zodiacal degree.
 */
export function findSunVenusConjunctions(from: Date, to: Date): Conjunction[] {
	const stepDays = 0.5;
	const grid = sampleGrid((t) => venusElongation(new Date(t)), from, to, stepDays);
	const roots = rootsFromGrid((t) => venusElongation(new Date(t)), grid.times, grid.values);
	return roots.map((at) => {
		const v = position(Body.Venus, at);
		const s = position(Body.Sun, at);
		const speed = signedDelta(
			position(Body.Venus, shiftDays(at, 1)).longitude,
			position(Body.Venus, shiftDays(at, -1)).longitude
		);
		return {
			kind: speed < 0 ? ('inferior' as const) : ('superior' as const),
			at,
			elongation: signedDelta(v.longitude, s.longitude),
			venusLatitude: v.latitude,
			separationFromSun: angularSeparation(v, s)
		};
	});
}

function pick(conjunctions: readonly Conjunction[], kind: ConjunctionKind, after: Date | null, before: Date | null) {
	return conjunctions.find(
		(c) =>
			c.kind === kind &&
			(after === null || c.at.getTime() > after.getTime()) &&
			(before === null || c.at.getTime() < before.getTime())
	);
}

/**
 * The enclosing cycle of a moment, plus the conjunctions that bracket it.
 *
 * The window is opened from the *date* rather than from the cycle boundary, because a
 * reader may sit anywhere inside a cycle. It is then widened until it holds at least two
 * inferior conjunctions, which is what guarantees the closing boundary is present: a
 * fixed window cannot promise that, since a cycle is up to 588 days long and the reader
 * may be standing on either end of it. Two passes are always enough — the first window
 * already contains one inferior conjunction, and the next is at most 588 days away.
 */
export function findEnclosingCycle(date: Date): { start: Conjunction; mid: Conjunction; end: Conjunction } {
	let spanDays = 420;
	let all: Conjunction[] = [];
	let inferiors: Conjunction[] = [];
	for (let attempt = 0; attempt < 4; attempt++) {
		all = findSunVenusConjunctions(shiftDays(date, -spanDays), shiftDays(date, spanDays));
		inferiors = all.filter((c) => c.kind === 'inferior');
		if (inferiors.length >= 2) break;
		spanDays *= 2;
	}
	if (inferiors.length < 2) {
		throw new Error('Le cycle de Vénus est introuvable : pas assez de conjonctions dans la fenêtre de recherche.');
	}
	const opened = inferiors.filter((c) => c.at.getTime() <= date.getTime()).pop() ?? inferiors[0];
	const closed = inferiors.find((c) => c.at.getTime() > opened.at.getTime());
	if (!closed) throw new Error('La conjonction inférieure suivante est introuvable.');
	const mid = pick(all, 'superior', opened.at, closed.at);
	if (!mid) throw new Error('La conjonction supérieure du cycle est introuvable.');
	return { start: opened, mid, end: closed };
}

/**
 * The retrograde window around the inferior conjunction that opens a cycle.
 *
 * Venus turns retrograde about three weeks before the inferior conjunction and
 * recovers about three weeks after — 41 to 43 days in all — so a ±60-day scan
 * comfortably brackets both stations.
 */
export function findRetrogradeWindow(conjunction: Date): RetrogradeWindow | null {
	const speed = (t: number) =>
		signedDelta(
			position(Body.Venus, shiftDays(new Date(t), 0.5)).longitude,
			position(Body.Venus, shiftDays(new Date(t), -0.5)).longitude
		);
	const grid = sampleGrid(speed, shiftDays(conjunction, -60), shiftDays(conjunction, 60), 0.5);
	let retroStart: number | null = null;
	let retroEnd: number | null = null;
	for (let i = 1; i < grid.values.length; i++) {
		if (grid.values[i - 1] > 0 && grid.values[i] <= 0)
			retroStart = bisectRoot(speed, grid.times[i - 1], grid.times[i], 250);
		if (grid.values[i - 1] < 0 && grid.values[i] >= 0) {
			retroEnd = bisectRoot(speed, grid.times[i - 1], grid.times[i], 250);
			if (retroStart !== null && retroEnd > retroStart) break;
		}
	}
	if (retroStart === null || retroEnd === null) return null;
	const station = (at: Date, direction: 'retrograde' | 'direct'): Station => ({
		at,
		direction,
		elongation: venusElongation(at),
		longitude: position(Body.Venus, at).longitude
	});
	const retroAt = new Date(retroStart);
	const directAt = new Date(retroEnd);
	return {
		retrogradeStation: station(retroAt, 'retrograde'),
		directStation: station(directAt, 'direct'),
		days: daysBetween(retroAt, directAt),
		longitude: position(Body.Venus, new Date((retroStart + retroEnd) / 2)).longitude
	};
}

/**
 * The inframonde around an inferior conjunction: the days during which Venus is inside
 * `arcusVisionis` degrees of the Sun and therefore lost to sight. The boundaries are
 * the two crossings of the threshold, found by bisection.
 */
export function findInvisibilityWindow(
	conjunction: Conjunction,
	arcusVisionis: number
): InvisibilityWindow | null {
	if (conjunction.kind !== 'inferior') return null;
	// |elongation| - threshold is not an angle and never wraps, so unlike the searches
	// above there is no discontinuity to filter out.
	const f = (t: number) => Math.abs(venusElongation(new Date(t))) - arcusVisionis;
	const before = sampleGrid(f, shiftDays(conjunction.at, -60), conjunction.at, 0.25);
	const after = sampleGrid(f, conjunction.at, shiftDays(conjunction.at, 60), 0.25);
	const [start] = rootsFromGrid(f, before.times, before.values);
	const [end] = rootsFromGrid(f, after.times, after.values);
	if (!start || !end) return null;
	return {
		start,
		end,
		days: daysBetween(start, end),
		arcusVisionis,
		conjunction
	};
}

/**
 * Every Moon-Venus conjunction in a window: the exact instants, and how far apart the two
 * bodies stand at them.
 *
 * The conjunction is a zodiacal one — Moon and Venus holding the same ecliptic longitude —
 * found by bisecting the longitude difference. That instant is exact and is the gate. The
 * separation recorded beside it is a different quantity: the great-circle distance between
 * the two, which is dominated by the Moon's ecliptic latitude (up to 5.3°) because at a
 * conjunction the longitude term is zero. So a month can put the Moon exactly on Venus's
 * degree and still leave it degrees away in the sky — an observation to report, never a
 * reason to call the gate missed. Over 242 conjunctions from 2018 to 2038 the median
 * separation is 3.4°, and the smallest of a cycle can be as tight as 0.27°.
 */
export function findMoonVenusConjunctions(from: Date, to: Date): MoonVenusConjunction[] {
	const stepDays = 0.25;
	const f = (t: number) =>
		signedDelta(position(Body.Moon, new Date(t)).longitude, position(Body.Venus, new Date(t)).longitude);
	const grid = sampleGrid(f, from, to, stepDays);
	const roots = rootsFromGrid(f, grid.times, grid.values);
	return roots.map((at) => {
		const moon = position(Body.Moon, at);
		const venus = position(Body.Venus, at);
		const elongation = venusElongation(at);
		const closest = closestApproach(at);
		return {
			at,
			longitude: venus.longitude,
			venusLongitude: venus.longitude,
			moonLongitude: moon.longitude,
			separation: angularSeparation(moon, venus),
			closestSeparation: closest.separation,
			closestAt: closest.at,
			moonLatitude: moon.latitude,
			venusLatitude: venus.latitude,
			elongation,
			star: starOf(elongation),
			half: starOf(elongation),
			readOrder: 0,
			waxing: elongation > 0,
			observable: Math.abs(elongation) >= PORTAL_VISIBILITY,
			portal: false,
			gate: GATES[0],
			index: 0,
			dayOfPhase: 0
		};
	});
}

/**
 * Attach the rank, gate and phase-day to each conjunction of a cycle.
 *
 * The two halves are ranked independently, because each is a full descent through the
 * seven gates: the first conjunction after the inferior conjunction is the crown, the
 * next the brow, and so on, and the evening half starts again at the crown after the
 * superior conjunction.
 */
/**
 * Attribuer à chaque conjonction d'un cycle son portail.
 *
 * Une moitié porte **onze portails**, dans un ordre qui suit le mythe et non le calendrier.
 * À la descente :
 *
 * 1-7. les sept chakras, de la couronne à la racine ;
 * 8-10. les trois jours de l'inframonde ;
 * 11. la mort intentionnelle.
 *
 * À l'ascension, le même parcours à l'envers : les trois jours d'abord — c'est par eux que
 * Vénus reparaît — puis les sept chakras de la racine à la couronne, puis la vie
 * intentionnelle.
 *
 * Les rôles se lisent dans les faits, pas dans les dates : les trois conjonctions **sous le
 * seuil de visibilité** sont les jours, les autres sont les chakras, et le seuil prend la
 * conjonction du bout de la moitié — la dernière avant la conjonction inférieure à la
 * descente, la première après elle à l'ascension. C'est pourquoi aucun portail n'est daté
 * deux fois : chaque conjonction de la moitié reçoit un rôle, et un seul.
 */
function organise(
	raw: readonly MoonVenusConjunction[],
	start: Conjunction,
	mid: Conjunction,
	end: Conjunction,
	now: Date,
	windowHours: number,
	arcusVisionis: number
): GatePassage[] {
	const inCycle = raw
		.filter((c) => c.at.getTime() >= start.at.getTime() && c.at.getTime() <= end.at.getTime())
		.sort((a, b) => a.at.getTime() - b.at.getTime())
		// La moitié se lit dans la **date** — avant ou après la conjonction supérieure —, pas dans
		// le signe de l'élongation : les jours de l'inframonde qui terminent la descente tombent
		// après la conjonction inférieure, donc du côté de l'étoile du soir, et appartiennent
		// pourtant à la descente qu'ils achèvent.
		.map((c) => ({ ...c, half: (c.at.getTime() < mid.at.getTime() ? 'morning' : 'evening') as Star }));

	const at = (c: MoonVenusConjunction) => c.at.getTime();
	const rank = new Map<number, number>();
	const portal = new Map<number, Gate | UnderworldDay | Threshold>();

	// La forme du cycle se décide sur son total de conjonctions : sept chakras par moitié et pas
	// de seuil jusqu'à dix-sept, huit chakras et le seuil au-delà.
	const shape = cycleShape(inCycle.length);

	for (const star of ['morning', 'evening'] as const) {
		const half = inCycle.filter((c) => c.half === star);
		if (half.length === 0) continue;

		// 1. Les chakras : les conjonctions du début de la moitié, dans l'ordre du calendrier —
		//    l'ordre du mythe s'applique à l'affichage, pas ici. Le nombre est celui de la forme
		//    du cycle : sept, ou huit.
		const ordered = half.slice().sort((a, b) => a.at.getTime() - b.at.getTime());
		const chakras = ordered.slice(0, Math.min(shape.chakrasParMoitie, ordered.length));

		// 2. Les jours de l'inframonde : tout ce qui reste dans la moitié. Ils sont donc deux
		//    quand la moitié en compte dix et que les chakras en prennent huit, ce qui est le cas
		//    ordinaire.
		const days = ordered.slice(chakras.length);

		const sequence = star === 'morning' ? [...chakras, ...days] : [...days, ...chakras];
		const chakraNames = chakraSequence(star, chakras.length);
		sequence.forEach((c, i) => {
			const isChakra = chakras.some((k) => at(k) === at(c));
			rank.set(at(c), i + 1);
			portal.set(
				at(c),
				isChakra
					? chakraNames[chakras.findIndex((k) => at(k) === at(c))]
					: UNDERWORLD_DAYS[i < chakras.length ? i : i - chakras.length] ?? UNDERWORLD_DAYS[0]
			);
		});
	}

	// 3. Le seuil, s'il existe dans ce cycle : la mort au coucher héliaque, la vie au lever, tous
	//    deux autour de la conjonction inférieure qui ferme le cycle. Ce ne sont pas des
	//    conjonctions Vénus-Lune, d'où un portail ajouté en plus.
	const thresholds: Array<{ at: Date; gate: Threshold }> = shape.avecSeuil
		? [
				{ at: heliacalCrossing(end.at, -1, arcusVisionis), gate: THRESHOLDS['mort-intentionnelle'] },
				{ at: heliacalCrossing(end.at, 1, arcusVisionis), gate: THRESHOLDS['vie-intentionnelle'] }
			]
		: [];

	const passages: GatePassage[] = inCycle.map((c) => {
		const assigned = rank.get(at(c));
		return {
			...c,
			observable: Math.abs(c.elongation) >= PORTAL_VISIBILITY,
			portal: assigned !== undefined,
			index: assigned ?? 0,
			readOrder: assigned ?? 0,
			gate: portal.get(at(c)) ?? GATES[0],
			dayOfPhase: Math.abs(daysBetween(c.half === 'morning' ? start.at : mid.at, c.at)),
			open: assigned !== undefined && isGateOpen(c.at, now, windowHours)
		};
	});

	for (const t of thresholds) {
		const seenAt = t.at;
		const star: Star = t.gate.key === 'mort-intentionnelle' ? 'morning' : 'evening';
		const venus = position(Body.Venus, seenAt);
		const sun = position(Body.Sun, seenAt);
		passages.push({
			at: seenAt,
			longitude: venus.longitude,
			venusLongitude: venus.longitude,
			moonLongitude: venus.longitude,
			separation: 0,
			closestSeparation: 0,
			closestAt: seenAt,
			moonLatitude: 0,
			venusLatitude: venus.latitude,
			elongation: signedDelta(venus.longitude, sun.longitude),
			star,
			half: star,
			waxing: star === 'evening',
			observable: false,
			portal: true,
			index: 0,
			readOrder: 0,
			gate: t.gate,
			dayOfPhase: Math.abs(daysBetween(star === 'morning' ? start.at : mid.at, seenAt)),
			open: isGateOpen(seenAt, now, windowHours)
		});
	}

	// Le rang **est** l'ordre de lecture, et c'est celui du mythe, pas celui des dates : les sept
	// chakras, puis les trois jours, puis le seuil. À l'ascension le seuil ouvre, donc il précède
	// tout le reste — le mythe remonte à l'envers du calendrier.
	for (const star of ['morning', 'evening'] as const) {
		const half = passages.filter((p) => p.portal && p.half === star);
		const kind = (p: GatePassage) => {
			if (p.gate.key === 'mort-intentionnelle' || p.gate.key === 'vie-intentionnelle') return 3;
			return isUnderworldKey(p.gate.key) ? 2 : 1;
		};
		const order = (n: number) => (star === 'morning' ? n : 4 - n);
		half.sort(
			(a, b) => order(kind(a)) - order(kind(b)) || a.at.getTime() - b.at.getTime()
		);
		half.forEach((p, i) => {
			p.index = i + 1;
			p.readOrder = i + 1;
		});
	}

	return passages.sort((a, b) => a.at.getTime() - b.at.getTime());
}

/**
 * Assemble the complete journey for a moment: the enclosing cycle, its two halves, the
 * retrograde, the inframonde, and every gate passage with its chakra.
 */
export function computeJourney(date: Date, options: JourneyOptions = {}): VenusJourney {
	const arcusVisionis = options.arcusVisionis ?? DEFAULT_ARCUS_VISIONIS;
	const gateWindowHours = options.gateWindowHours ?? GATE_WINDOW_HOURS;

	const { start, mid, end } = findEnclosingCycle(date);
	const synodicDays = daysBetween(start.at, end.at);

	const venus = position(Body.Venus, date);
	const moon = position(Body.Moon, date);
	const sun = position(Body.Sun, date);
	const elongation = signedDelta(venus.longitude, sun.longitude);

	const passages = organise(
		findMoonVenusConjunctions(shiftDays(start.at, -2), shiftDays(end.at, 2)),
		start,
		mid,
		end,
		date,
		gateWindowHours,
		arcusVisionis
	);

	/** The number of portals each half holds — the same for both, by construction. */
	const perHalf = passages.filter((p) => p.portal && p.star === 'morning').length;

	const phaseOf = (star: Star): Phase => {
		// La moitié se lit dans la **date** et non dans l'étoile de la conjonction : les jours de
		// l'inframonde d'avant la conjonction inférieure appartiennent à la descente qu'ils
		// terminent, même si le signe de l'élongation a déjà basculé.
		const half = passages.filter((p) => p.half === star);
		const from = star === 'morning' ? start.at : mid.at;
		const to = star === 'morning' ? mid.at : end.at;
		return {
			star,
			start: from,
			end: to,
			days: daysBetween(from, to),
			passages: half,
			portals: half.filter((p) => p.portal)
		};
	};

	const moonSeparation = angularSeparation(moon, venus);
	// The gate is the instant; this is only which one the interface calls "in progress".
	// Half a day either side, so a gate is never announced on a day that is not its own.
	// Uses each passage's own `open` flag rather than re-testing the window here: two places
	// computing the same window is how a passage ends up open in one view and shut in another.
	const activePassage =
		passages
			.filter((p) => p.open && p.portal)
			.sort((a, b) => Math.abs(daysBetween(date, a.at)) - Math.abs(daysBetween(date, b.at)))[0] ?? null;
	// The gate that is next, counting the one standing open right now as still ahead of
	// the reader until it closes.
	const nextPassage =
		activePassage ??
		passages
			.filter((p) => p.portal && p.at.getTime() > date.getTime())
			.sort((a, b) => a.at.getTime() - b.at.getTime())[0] ??
		null;

	const invisible = findInvisibilityWindow(start, arcusVisionis);
	const inInframonde = invisible
		? date.getTime() >= invisible.start.getTime() && date.getTime() <= invisible.end.getTime()
		: Math.abs(elongation) < arcusVisionis;

	const maxElongation = SearchMaxElongation(Body.Venus, date);
	const maxAt = toDate(maxElongation.time);
	const maxVisibility = Elongation(Body.Venus, MakeTime(maxAt)).visibility;

	const dayOfCycle = daysBetween(start.at, date);

	return {
		date,
		arcusVisionis,
		gateWindowHours,
		portalVisibility: PORTAL_VISIBILITY,
		portalsPerHalf: perHalf,
		start,
		mid,
		end,
		synodicDays,
		dayOfCycle,
		daysRemaining: daysBetween(date, end.at),
		progress: Math.max(0, Math.min(1, dayOfCycle / synodicDays)),
		star: starOf(elongation),
		elongation,
		separationFromSun: angularSeparation(venus, sun),
		venus,
		moon,
		moonSeparation,
		greatestElongation: {
			at: maxAt,
			elongation: AngleFromSun(Body.Venus, MakeTime(maxAt)),
			star: maxVisibility === 'morning' ? 'morning' : 'evening'
		},
		retrograde: findRetrogradeWindow(start.at),
		invisible,
		inInframonde,
		morning: phaseOf('morning'),
		evening: phaseOf('evening'),
		conjunctions: passages,
		activePassage,
		nextPassage
	};
}
