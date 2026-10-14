import { describe, expect, it } from 'vitest';
import { Body } from 'astronomy-engine';
import {
	angularSeparation,
	absoluteDelta,
	longitude,
	longitudeSpeed,
	normalizeDegrees,
	position,
	signedDelta,
	unwrap
} from './ephemeris';

const at = (iso: string) => new Date(iso);

/**
 * These tests pin the frame conventions to published values rather than to this
 * module's own output. If the tropical zero point drifts, or a rotation is applied in
 * the wrong order, one of the anchors below moves and the suite fails.
 */

describe('angle helpers', () => {
	it('wraps into [0, 360)', () => {
		expect(normalizeDegrees(0)).toBe(0);
		expect(normalizeDegrees(360)).toBe(0);
		expect(normalizeDegrees(-1)).toBeCloseTo(359, 10);
		expect(normalizeDegrees(725)).toBeCloseTo(5, 10);
	});

	it('takes the short way round in signedDelta', () => {
		expect(signedDelta(10, 350)).toBeCloseTo(20, 10);
		expect(signedDelta(350, 10)).toBeCloseTo(-20, 10);
		expect(signedDelta(0, 180)).toBe(180);
		expect(signedDelta(180, 0)).toBe(180);
	});

	it('unwraps a wrapping sequence into a continuous one', () => {
		const raw = [170, 175, 180, -175, -170];
		const out = unwrap(raw);
		expect(out[2]).toBeCloseTo(180, 10);
		expect(out[3]).toBeCloseTo(185, 10);
		expect(out[4]).toBeCloseTo(190, 10);
		for (let i = 1; i < out.length; i++) {
			expect(Math.abs(out[i] - out[i - 1])).toBeLessThan(180);
		}
	});
});

describe('tropical frame anchors', () => {
	// Published instants of the equinoxes and solstices (UTC). The Sun's apparent
	// tropical longitude must be exactly 0 / 90 / 180 / 270 there.
	const cardinals: Array<[string, number]> = [
		['2000-03-20T07:35:00Z', 0],
		['2000-06-21T01:48:00Z', 90],
		['2000-09-22T17:28:00Z', 180],
		['2000-12-21T13:37:00Z', 270],
		['2010-03-20T17:32:00Z', 0],
		['2015-06-21T16:38:00Z', 90],
		['2020-09-22T13:31:00Z', 180],
		['2023-03-20T21:24:00Z', 0],
		['2025-06-21T02:42:00Z', 90],
		['2030-12-21T20:09:00Z', 270]
	];

	it.each(cardinals)('Sun is at %s° of tropical longitude at %s', (iso, expected) => {
		const lon = longitude(Body.Sun, at(iso));
		// Within two arcminutes: the published instants are rounded to the minute, and
		// the Sun moves ~1°/day, so a minute of time is under an arcsecond of longitude.
		expect(absoluteDelta(lon, expected)).toBeLessThan(2 / 60);
	});

	it('places the 2020 great conjunction in early Aquarius', () => {
		// Jupiter and Saturn, 2020-12-21 18:20 UTC, at 0°29' Aquarius = 300.4833°.
		const t = at('2020-12-21T18:20:00Z');
		const jupiter = longitude(Body.Jupiter, t);
		const saturn = longitude(Body.Saturn, t);
		expect(absoluteDelta(jupiter, 300 + 29 / 60)).toBeLessThan(0.05);
		expect(absoluteDelta(saturn, 300 + 30 / 60)).toBeLessThan(0.05);
		expect(absoluteDelta(jupiter, saturn)).toBeLessThan(0.05);
	});
});

describe('geocentric position', () => {
	it('keeps the Sun and Moon inside the expected ranges', () => {
		const sun = position(Body.Sun, at('2024-01-01T00:00:00Z'));
		// The Sun never leaves the ecliptic by more than a couple of arcseconds, and is
		// one astronomical unit away in early January (perihelion).
		expect(Math.abs(sun.latitude)).toBeLessThan(0.01);
		expect(sun.distance).toBeGreaterThan(0.98);
		expect(sun.distance).toBeLessThan(1.02);

		const moon = position(Body.Moon, at('2024-01-01T00:00:00Z'));
		expect(Math.abs(moon.latitude)).toBeLessThan(5.4);
		expect(moon.distance).toBeGreaterThan(0.0023);
		expect(moon.distance).toBeLessThan(0.0028);
	});

	it('measures a real angular separation from latitude, not longitude alone', () => {
		const t = at('2024-01-01T00:00:00Z');
		const moon = position(Body.Moon, t);
		const venus = position(Body.Venus, t);
		const separation = angularSeparation(moon, venus);
		expect(separation).toBeGreaterThan(0);
		expect(separation).toBeLessThanOrEqual(180);

		// Latitude is what distinguishes this from a longitude-only distance. With both
		// latitudes forced to zero the two must agree exactly; restoring the Moon's own
		// latitude must pull the separation away from the flat-longitude value. (The
		// longitude difference is *not* a general lower bound: past 90° of separation,
		// giving both bodies latitude can bring them closer together.)
		const flat = angularSeparation(
			{ ...moon, latitude: 0 },
			{ ...venus, latitude: 0 }
		);
		expect(flat).toBeCloseTo(Math.abs(signedDelta(moon.longitude, venus.longitude)), 9);
		expect(separation).not.toBeCloseTo(flat, 6);
	});
});

describe('longitudeSpeed', () => {
	it('is strongly negative for Venus in the middle of a retrograde', () => {
		// Venus was retrograde through August 2023, inferior conjunction on the 13th.
		const speed = longitudeSpeed(Body.Venus, at('2023-08-13T00:00:00Z'));
		expect(speed).toBeLessThan(-0.5);
		expect(speed).toBeGreaterThan(-0.75);
	});

	it('is close to the mean motion when Venus is far from a station', () => {
		const speed = longitudeSpeed(Body.Venus, at('2024-02-01T00:00:00Z'));
		expect(speed).toBeGreaterThan(1.0);
		expect(speed).toBeLessThan(1.3);
	});

	it('is never faster than the planet ceiling for Mercury', () => {
		for (const iso of ['2024-01-15T00:00:00Z', '2024-05-15T00:00:00Z', '2024-09-15T00:00:00Z']) {
			expect(Math.abs(longitudeSpeed(Body.Mercury, at(iso)))).toBeLessThan(2.21);
		}
	});
});
