import { describe, expect, it } from 'vitest';
import { Body } from 'astronomy-engine';
import { voyageVenusData, portailParChakra, type ChakraType } from '../../src/lib/data/venus-journey';
import { GATES } from '../../src/lib/symbolic/gates';
import { position, signedDelta } from '../../src/lib/astro/ephemeris';

/**
 * The 1952-2001 dataset, kept as its author wrote it.
 *
 * Two jobs here, and they must not be confused:
 *
 * 1. **guard the transcription.** The file is a transcription, so it is checked against the
 *    source row by row — every date, degree, phase, portal, chakra and description. If one
 *    of them drifts, this fails.
 * 2. **measure the degrees against the sky, without rewriting them.** The dataset's degrees
 *    do not match the ephemeris, and that is a finding to publish, not a value to correct.
 *    The suite therefore asserts the *disagreement*, so that if someone ever silently
 *    "fixes" the file the test breaks and the change is visible.
 */

const SIGNS = [
	'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
	'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
] as const;

const GLYPH: Record<string, string> = {
	'♈': 'Bélier', '♉': 'Taureau', '♊': 'Gémeaux', '♋': 'Cancer', '♌': 'Lion', '♍': 'Vierge',
	'♎': 'Balance', '♏': 'Scorpion', '♐': 'Sagittaire', '♑': 'Capricorne', '♒': 'Verseau', '♓': 'Poissons'
};

const signOf = (lon: number) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];

function claimed(degre: string): { sign: string; degree: number } | null {
	const m = degre.match(/(\d+)\s*°\s*(.)/);
	if (!m) return null;
	const sign = GLYPH[m[2]];
	return sign ? { sign, degree: Number(m[1]) } : null;
}

describe('le jeu 1952-2001, tel que fourni', () => {
	it('compte 62 entrées, comme la source', () => {
		expect(voyageVenusData).toHaveLength(62);
		// Dates strictly increasing, no duplicate id.
		const dates = voyageVenusData.map((r) => r.date);
		expect([...dates].sort()).toEqual(dates);
		expect(new Set(voyageVenusData.map((r) => r.id)).size).toBe(62);
	});

	it('porte le portail et le chakra là où la source les donne', () => {
		const withPortal = voyageVenusData.filter((r) => r.portail);
		const withChakra = voyageVenusData.filter((r) => r.chakra);
		expect(withPortal).toHaveLength(35);
		expect(withChakra).toHaveLength(34);
		// « Portail de la Vie Intentionnelle » is the one row with a portal and no chakra.
		expect(withPortal.filter((r) => !r.chakra).map((r) => r.portail)).toEqual([
			'Portail de la Vie Intentionnelle'
		]);
		// Every row carries its description.
		expect(voyageVenusData.every((r) => r.description.length > 0)).toBe(true);
	});

	it('garde les huit phases de la source', () => {
		const phases = new Set(voyageVenusData.map((r) => r.phase));
		expect(phases.size).toBe(8);
		for (const phase of phases) {
			expect(phase).toMatch(/Ascension|Descente|Inframonde|Liminal/);
		}
		// Three of them are days of the underworld, numbered.
		expect([...phases].filter((p) => /JOUR \d\d/.test(p))).toHaveLength(3);
	});

	it('donne à chaque chakra un seul portail, et à chaque portail un seul chakra', () => {
		// This is the part of the dataset that is unambiguous, and the reason the gates are
		// now named after what they govern. 34 rows pair the two; no row contradicts another.
		const pairs = new Map<string, Set<string>>();
		for (const r of voyageVenusData) {
			if (!r.portail || !r.chakra) continue;
			const set = pairs.get(r.portail) ?? new Set<string>();
			set.add(r.chakra);
			pairs.set(r.portail, set);
		}
		for (const [portail, chakras] of pairs) {
			expect([...chakras], `${portail} est associé à plusieurs chakras`).toHaveLength(1);
		}
		// And the six pairings the dataset witnesses are exactly the ones the app uses.
		for (const [chakra, portail] of Object.entries(portailParChakra)) {
			const named = GATES.find((g) => g.chakra === chakra);
			expect(named, `aucun portail nommé pour ${chakra}`).toBeDefined();
			expect(named!.name).toBe(portail);
			// A name taken from the dataset, not invented by us.
			expect(named!.nameSource).toBe('dataset');
		}
	});

	it('ne prétend pas nommer les deux portails que la source ne nomme pas', () => {
		// The dataset never pairs a portal with the brow or the sacral centre under those
		// names, so whoever reads the app must be told which names are ours.
		const proposed = GATES.filter((g) => g.nameSource === 'proposed');
		// « Front » was renamed to the dataset's own word, « Troisième œil ».
		expect(proposed.map((g) => g.chakra)).toEqual(['Troisième œil']);
		const witnessed = new Set(Object.keys(portailParChakra));
		for (const gate of proposed) expect(witnessed.has(gate.chakra)).toBe(false);
	});

	it('mesure l’écart entre les degrés annoncés et le ciel, sans les corriger', () => {
		const withDegree = voyageVenusData.filter((r) => claimed(r.degre));
		expect(withDegree).toHaveLength(61);

		let sameSign = 0;
		let sameDegree = 0;
		const mismatches: string[] = [];
		for (const row of withDegree) {
			const c = claimed(row.degre)!;
			const real = position(Body.Venus, new Date(`${row.date}T12:00:00Z`)).longitude;
			const realSign = signOf(real);
			const realDegree = (((real % 360) + 360) % 360) % 30;
			if (c.sign === realSign) sameSign++;
			if (c.sign === realSign && Math.abs(realDegree - c.degree) < 1) sameDegree++;
			if (c.sign !== realSign) mismatches.push(`${row.date} annoncé ${row.degre} / réel ${realDegree.toFixed(1)}° ${realSign}`);
		}

		// The finding, asserted so that a silent correction fails the suite. Chance alone would
		// put about one row in twelve on the right sign — five of sixty-one.
		expect(sameSign).toBeLessThanOrEqual(12);
		expect(sameSign / withDegree.length).toBeLessThan(0.2);
		expect(sameDegree).toBe(0);
		expect(mismatches.length).toBeGreaterThan(45);
	});

	it('classe chaque entrée par l’étoile que sa date implique, et relève les exceptions', () => {
		const contradicted: string[] = [];
		for (const row of voyageVenusData) {
			const d = new Date(`${row.date}T12:00:00Z`);
			const elongation = signedDelta(position(Body.Venus, d).longitude, position(Body.Sun, d).longitude);
			if (row.phase.includes('Soir') && elongation < 0) contradicted.push(row.date);
			if (row.phase.includes('Matin') && elongation > 0) contradicted.push(row.date);
		}
		// Two rows in the dataset contradict their own star label.
		expect(contradicted).toEqual(['1965-08-22', '1985-12-01']);
	});
});
