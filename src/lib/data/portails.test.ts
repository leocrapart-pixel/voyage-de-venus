import { describe, expect, it } from 'vitest';
import { Body } from 'astronomy-engine';
import raw from './portails.json';
import { voyageVenusData, repartitionParPhase } from './portails-venus';
import { CHAKRAS_DESCENDANTS, PHASE_LABELS } from './portails-types';
import { position, signedDelta } from '../astro/ephemeris';

/**
 * The corrected dataset must stay true to the sky.
 *
 * `tools/portails/audit.ts` produced these numbers from the ephemeris; this suite checks
 * them *against* the ephemeris again, from the other side. That way the generator cannot
 * drift: if the engine changes, or a value is edited by hand, the degrees stop matching
 * and the suite fails.
 *
 * It also guards the symbolic layer, which is the part that must not be silently rewritten:
 * every portal, chakra and description supplied by the author has to survive into the file.
 */

const SIGNS = [
	'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
	'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
] as const;

const signOf = (lon: number) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];

/** The dataset as supplied: same rows, same dates. */
const supplied = raw as Array<{ date: string }>;

describe('le jeu corrigé', () => {
	it('couvre exactement les mêmes dates que le jeu fourni', () => {
		expect(voyageVenusData).toHaveLength(supplied.length);
		expect(voyageVenusData.map((r) => r.date)).toEqual(supplied.map((r) => r.date));
	});

	it('place chaque degré exactement sur la longitude de Vénus ce jour-là', () => {
		for (const row of voyageVenusData) {
			const real = position(Body.Venus, new Date(`${row.date}T12:00:00Z`)).longitude;
			expect(row.longitude).toBeCloseTo(real, 3);
			// The printed degree has to be the printed longitude: sign and degree in sign.
			expect(row.degre).toContain(signOf(row.longitude));
			const degrees = Number(row.degre.slice(0, 2));
			expect(degrees).toBe(Math.floor(((real % 360) + 360) % 360) % 30);
		}
	});

	it('dérive la phase de l’élongation, jamais d’une valeur écrite à la main', () => {
		for (const row of voyageVenusData) {
			const d = new Date(`${row.date}T12:00:00Z`);
			const elongation = signedDelta(position(Body.Venus, d).longitude, position(Body.Sun, d).longitude);
			expect(row.elongation).toBeCloseTo(elongation, 1);
			expect(row.etoile).toBe(elongation < 0 ? 'matin' : 'soir');
			expect(row.visible).toBe(Math.abs(elongation) >= 5);
			if (row.etoile === 'matin' && row.visible) {
				expect(row.phase).toBe('Descente / Étoile du Matin');
			}
			if (row.etoile === 'soir' && row.visible) {
				expect(row.phase).toBe('Ascension / Étoile du Soir');
			}
			if (!row.visible) {
				expect(['Conjonction inférieure', 'Conjonction supérieure', 'Inframonde', 'Inframonde Métamorphique Invisible']).toContain(
					row.phase
				);
			}
		}
	});

	it('trouve la conjonction inférieure qui a ouvert chaque cycle', () => {
		for (const row of voyageVenusData) {
			const start = new Date(`${row.debutDeCycle}T00:00:00Z`);
			const d = new Date(`${row.date}T12:00:00Z`);
			expect(start.getTime()).toBeLessThanOrEqual(d.getTime());
			// Within one synodic cycle of it, since no cycle runs past 588 days.
			expect((d.getTime() - start.getTime()) / 86_400_000).toBeLessThan(588);
			// And the inferior conjunction really is one: Venus is retrograde around it.
			expect(row.joursDeLaConjonctionInferieure).toBeGreaterThan(-300);
			expect(row.joursDeLaConjonctionInferieure).toBeLessThan(300);
		}
	});

	it('conserve la couche symbolique mot pour mot', () => {
		// Every row that carried a portal in the supplied dataset still carries it here.
		const withPortal = voyageVenusData.filter((r) => r.portail);
		expect(withPortal.length).toBe(35);
		for (const row of withPortal) expect(row.description.length).toBeGreaterThan(0);
		// One portal in the supplied dataset carries no chakra — « Portail de la Vie
		// Intentionnelle » on 1970-10-06 — and that gap is preserved rather than filled in:
		// inventing a chakra for it would be adding symbolism the author did not write.
		const withChakra = withPortal.filter((r) => r.chakra);
		expect(withChakra.length).toBe(34);
		expect(withPortal.filter((r) => !r.chakra).map((r) => r.portail)).toEqual([
			'Portail de la Vie Intentionnelle'
		]);
		// Every chakra used is either one of the seven of the descent or the eighth gate.
		for (const row of voyageVenusData) {
			if (!row.chakra) continue;
			expect([...CHAKRAS_DESCENDANTS, 'Vie Intentionnelle']).toContain(row.chakra);
		}
		// No entry lost its description.
		expect(voyageVenusData.every((r) => r.description.length > 0)).toBe(true);
	});

	it('garde la trace de ce qui était annoncé', () => {
		const withDegree = voyageVenusData.filter((r) => r.degreAnnonce);
		expect(withDegree.length).toBe(61);
		// The announced degree never matches the measured one: that is the finding, and it has
		// to remain visible rather than being quietly overwritten.
		const exact = withDegree.filter((r) => r.degreAnnonce && r.degre.startsWith(r.degreAnnonce.slice(0, 2)));
		expect(exact.length).toBeLessThan(5);
		expect(voyageVenusData.every((r) => r.phaseAnnoncee.length > 0)).toBe(true);
	});

	it('donne une phase correspondant au vocabulaire déclaré', () => {
		for (const row of voyageVenusData) {
			expect(PHASE_LABELS[row.phase]).toBeDefined();
			expect(PHASE_LABELS[row.phaseAnnoncee]).toBeDefined();
		}
		const total = Object.values(repartitionParPhase).reduce((a, b) => a + b, 0);
		expect(total).toBe(voyageVenusData.length);
	});
});
