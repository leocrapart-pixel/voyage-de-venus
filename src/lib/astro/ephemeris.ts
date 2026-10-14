import {
	GeoVector,
	MakeTime,
	RotateVector,
	Rotation_EQJ_ECT,
	type Body,
	type FlexibleDateTime
} from 'astronomy-engine';

/**
 * Ephemeris primitives, expressed the way astrology uses positions:
 * geocentric, apparent, tropical — referred to the true equinox and ecliptic of date.
 *
 * Everything the Voyage de Vénus needs is built from these four functions, so the
 * frame conventions live in exactly one place (see `ephemeris.test.ts`, which pins
 * them to published equinox instants and to the 2020 great conjunction).
 */

export const DEG_PER_RAD = 180 / Math.PI;
export const RAD_PER_DEG = Math.PI / 180;
export const DAY_MS = 86_400_000;

/** Wrap an angle into [0, 360). */
export function normalizeDegrees(deg: number): number {
	const wrapped = deg % 360;
	return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Signed shortest angular difference `a - b`, in (-180, 180]. */
export function signedDelta(a: number, b: number): number {
	let d = normalizeDegrees(a - b);
	if (d > 180) d -= 360;
	return d;
}

/** Smaller of the two angles between two directions, in [0, 180]. */
export function absoluteDelta(a: number, b: number): number {
	return Math.abs(signedDelta(a, b));
}

export function shiftDays(date: Date, days: number): Date {
	return new Date(date.getTime() + days * DAY_MS);
}

export function daysBetween(a: Date, b: Date): number {
	return (b.getTime() - a.getTime()) / DAY_MS;
}

export function toDate(t: FlexibleDateTime): Date {
	return t instanceof Date ? t : (t as { date: Date }).date;
}

export interface EclipticPosition {
	/** Apparent geocentric tropical ecliptic longitude, degrees in [0, 360). */
	longitude: number;
	/** Apparent geocentric ecliptic latitude, degrees in (-90, 90). */
	latitude: number;
	/** Distance from the Earth, in astronomical units. */
	distance: number;
}

/**
 * Apparent geocentric tropical position of a body.
 *
 * `GeoVector(..., true)` gives the apparent geocentric place (light-time corrected,
 * annual aberration included); rotating J2000 equator -> ecliptic of date (ECT) yields
 * the tropical longitude ordinary astrology software reports.
 */
export function position(body: Body, date: Date): EclipticPosition {
	const time = MakeTime(date);
	const apparent = GeoVector(body, time, true);
	const ofDate = RotateVector(Rotation_EQJ_ECT(time), apparent);
	const xy = Math.hypot(ofDate.x, ofDate.y);
	return {
		longitude: normalizeDegrees(Math.atan2(ofDate.y, ofDate.x) * DEG_PER_RAD),
		latitude: Math.atan2(ofDate.z, xy) * DEG_PER_RAD,
		distance: Math.hypot(xy, ofDate.z)
	};
}

/** Apparent geocentric tropical ecliptic longitude, in degrees. */
export function longitude(body: Body, date: Date): number {
	return position(body, date).longitude;
}

/** Rate of change of tropical longitude, degrees per day. Negative means retrograde. */
export function longitudeSpeed(body: Body, date: Date, windowDays = 1): number {
	const half = windowDays / 2;
	const before = longitude(body, shiftDays(date, -half));
	const after = longitude(body, shiftDays(date, half));
	return signedDelta(after, before) / windowDays;
}

/**
 * Angular separation between two ecliptic positions, in degrees.
 *
 * The true great-circle distance between the two directions — it accounts for
 * ecliptic latitude, so a Moon 5° north of the ecliptic at the same longitude is
 * reported as 5° away, not as a perfect conjunction. This is the "orb" the
 * Voyage de Vénus quotes; the zodiacal conjunction itself is a longitude equality.
 */
export function angularSeparation(a: EclipticPosition, b: EclipticPosition): number {
	const ax = Math.cos(a.latitude * RAD_PER_DEG) * Math.cos(a.longitude * RAD_PER_DEG);
	const ay = Math.cos(a.latitude * RAD_PER_DEG) * Math.sin(a.longitude * RAD_PER_DEG);
	const az = Math.sin(a.latitude * RAD_PER_DEG);
	const bx = Math.cos(b.latitude * RAD_PER_DEG) * Math.cos(b.longitude * RAD_PER_DEG);
	const by = Math.cos(b.latitude * RAD_PER_DEG) * Math.sin(b.longitude * RAD_PER_DEG);
	const bz = Math.sin(b.latitude * RAD_PER_DEG);
	const dot = Math.max(-1, Math.min(1, ax * bx + ay * by + az * bz));
	return Math.acos(dot) * DEG_PER_RAD;
}

/**
 * Unwrap a sequence of signed deltas into a continuous function, so that the
 * ~29.5-day Venus-Moon synodic cycle can be crossed monotonically instead of
 * wrapping from +180° to -180° in the middle of a search.
 */
export function unwrap(values: readonly number[]): number[] {
	const out: number[] = [];
	let offset = 0;
	for (let i = 0; i < values.length; i++) {
		if (i > 0) offset -= 360 * Math.round((values[i] - values[i - 1]) / 360);
		out.push(values[i] + offset);
	}
	return out;
}

/**
 * Bisect a monotonically increasing function to its root.
 * `lo` and `hi` must bracket exactly one sign change of `f`.
 */
export function bisectRoot(
	f: (t: number) => number,
	lo: number,
	hi: number,
	toleranceMs = 500
): number {
	let fLo = f(lo);
	let a = lo;
	let b = hi;
	while (b - a > toleranceMs) {
		const mid = (a + b) / 2;
		const fMid = f(mid);
		if (fMid === 0) return mid;
		if (Math.sign(fMid) === Math.sign(fLo)) {
			a = mid;
			fLo = fMid;
		} else {
			b = mid;
		}
	}
	return (a + b) / 2;
}
