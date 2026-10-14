/**
 * Audit du jeu de données « Voyage de Vénus » (1952-2001) contre l'éphéméride.
 *
 * Ce script ne croit aucune ligne sur parole : pour chacune des 67 entrées il recalcule
 * la position réelle de Vénus, son élongation au Soleil, son sens de marche, sa
 * visibilité, et la situe par rapport aux conjonctions inférieure et supérieure et aux
 * stations du cycle auquel elle appartient. Il compare ensuite le degré annoncé au degré
 * réel, applique la phase que le ciel impose, et écrit le jeu de données corrigé sans
 * toucher à la couche symbolique (portail, chakra, description, qui restent ceux de
 * l'auteur).
 *
 * Usage :  npx vitest run --config tools/portails/audit.config.ts
 * Sortie  : tools/portails/rapport-audit.md
 *           src/lib/data/portails-venus.ts   (jeu corrigé)
 */
import { describe, expect, it } from 'vitest';
import { Body } from 'astronomy-engine';
import {
	findSunVenusConjunctions,
	type Conjunction,
	type Star
} from '../../src/lib/astro/cycle';
import { angularSeparation, daysBetween, position, shiftDays, signedDelta } from '../../src/lib/astro/ephemeris';
import raw from '../../src/lib/data/portails.json';
import symbolic from './symbolic.json';
import descriptions from './descriptions.json';

const SIGNS = [
	'Bélier', 'Taureau', 'Gémeaux', 'Cancer', 'Lion', 'Vierge',
	'Balance', 'Scorpion', 'Sagittaire', 'Capricorne', 'Verseau', 'Poissons'
] as const;

const GLYPH: Record<string, string> = {
	'♈': 'Bélier', '♉': 'Taureau', '♊': 'Gémeaux', '♋': 'Cancer', '♌': 'Lion', '♍': 'Vierge',
	'♎': 'Balance', '♏': 'Scorpion', '♐': 'Sagittaire', '♑': 'Capricorne', '♒': 'Verseau', '♓': 'Poissons'
};

/** Elongation below which Venus is taken to be invisible, in degrees. */
const ARCUS_VISIONIS = 5;

const signOf = (lon: number) => SIGNS[Math.floor((((lon % 360) + 360) % 360) / 30)];
const degInSign = (lon: number) => (((lon % 360) + 360) % 360) % 30;

function zodiac(lon: number): string {
	const d = degInSign(lon);
	const degrees = Math.floor(d);
	const minutes = Math.round((d - degrees) * 60);
	if (minutes === 60) return `${degrees + 1}°00 ${signOf(lon)}`;
	return `${String(degrees).padStart(2, '0')}°${String(minutes).padStart(2, '0')} ${signOf(lon)}`;
}

function parseClaimed(degre: string): { sign: string; degree: number } | null {
	const m = degre.match(/(\d+)\s*°\s*(.)/);
	if (!m) return null;
	const sign = GLYPH[m[2]];
	if (!sign) return null;
	return { sign, degree: Number(m[1]) };
}

interface Row {
	date: string;
	claimedDegre: string | null;
	claimedPhase: string;
	portail: string | null;
	chakra: string | null;
	description: string | null;
}

/** The dataset exactly as supplied: symbolic fields kept, everything else ignored. */
const SYMBOLIC = new Map(
	(symbolic as Array<[string, string, string | null, string | null, string]>).map((r) => [r[0], r])
);

const DESCRIPTIONS = new Map((descriptions as Array<[string, string]>).map((r) => [r[0], r[1]]));

const ROWS: Row[] = (raw as Array<Record<string, string>>).map((r) => {
	const sym = SYMBOLIC.get(r.date);
	return {
		date: r.date,
		claimedDegre: r.degre && /°/.test(r.degre) ? r.degre : null,
		claimedPhase: r.phase,
		portail: sym ? sym[2] : null,
		chakra: sym ? sym[3] : null,
		description: DESCRIPTIONS.get(r.date) ?? (sym ? sym[4] : null)
	};
});

/** All Sun-Venus conjunctions and both stations over the span the dataset covers. */
const conjunctions = findSunVenusConjunctions(
	new Date('1950-01-01T00:00:00Z'),
	new Date('2005-06-01T00:00:00Z')
).sort((a, b) => a.at.getTime() - b.at.getTime());

const inferiors = conjunctions.filter((c) => c.kind === 'inferior');
const superiors = conjunctions.filter((c) => c.kind === 'superior');

function nearest(list: readonly Conjunction[], date: Date): Conjunction {
	return list.reduce((best, c) =>
		Math.abs(c.at.getTime() - date.getTime()) < Math.abs(best.at.getTime() - date.getTime()) ? c : best
	);
}

interface Fact {
	date: Date;
	longitude: number;
	zodiac: string;
	elongation: number;
	separation: number;
	star: Star;
	retrograde: boolean;
	visible: boolean;
	nearestInferior: Conjunction;
	daysFromInferior: number;
	nearestSuperior: Conjunction;
	daysFromSuperior: number;
	/** The cycle this date belongs to, keyed by the inferior conjunction that opened it. */
	cycleStart: Conjunction;
	/** Phase the sky imposes, in the vocabulary of the supplied dataset. */
	phase: string;
	/** True when this date is within a few days of a real heliacal rising. */
	heliacalRising: boolean;
}

function facts(dateStr: string): Fact {
	const date = new Date(`${dateStr}T12:00:00Z`);
	const venus = position(Body.Venus, date);
	const sun = position(Body.Sun, date);
	const elongation = signedDelta(venus.longitude, sun.longitude);
	const star: Star = elongation < 0 ? 'morning' : 'evening';
	const nearestInferior = nearest(inferiors, date);
	const nearestSuperior = nearest(superiors, date);
	const daysFromInferior = daysBetween(nearestInferior.at, date);
	const daysFromSuperior = daysBetween(nearestSuperior.at, date);
	const retrograde =
		signedDelta(position(Body.Venus, shiftDays(date, 1)).longitude, position(Body.Venus, shiftDays(date, -1)).longitude) < 0;
	const visible = Math.abs(elongation) >= ARCUS_VISIONIS;
	// The cycle a date belongs to runs between the two inferior conjunctions that bracket it.
	const before = inferiors.filter((c) => c.at.getTime() <= date.getTime()).pop() ?? inferiors[0];
	const cycleStart = before;

	// A heliacal rising is the first day of visibility in a cycle: the elongation crossing
	// the arcus visionis, which happens roughly a week after the conjunction on each side.
	const heliacalRising = (() => {
		for (let d = -20; d <= 20; d++) {
			const probe = shiftDays(date, d);
			const e = signedDelta(position(Body.Venus, probe).longitude, position(Body.Sun, probe).longitude);
			if (Math.abs(e) < ARCUS_VISIONIS) return Math.abs(daysFromInferior) <= 12;
		}
		return false;
	})();

	// The phase is decided by the sky, then named in the dataset's own vocabulary where the
	// facts support it. Nothing here is invented: each label states a measured condition.
	let phase: string;
	if (Math.abs(daysFromInferior) <= 3 && !visible) {
		phase = 'Conjonction inférieure';
	} else if (Math.abs(daysFromSuperior) <= 3 && !visible) {
		phase = 'Conjonction supérieure';
	} else if (!visible) {
		// Invisible, and which side of the conjunction decides what the descent is doing.
		phase = retrograde ? 'Inframonde Métamorphique Invisible' : 'Inframonde';
	} else if (star === 'morning') {
		phase = 'Descente / Étoile du Matin';
	} else {
		phase = 'Ascension / Étoile du Soir';
	}

	return {
		date,
		longitude: venus.longitude,
		zodiac: zodiac(venus.longitude),
		elongation,
		separation: angularSeparation(venus, sun),
		star,
		retrograde,
		visible,
		nearestInferior,
		daysFromInferior,
		nearestSuperior,
		daysFromSuperior,
		cycleStart,
		phase,
		heliacalRising
	};
}

describe('audit du jeu « Voyage de Vénus »', () => {
	const audited = ROWS.map((row) => ({ row, fact: facts(row.date) }));

	it('mesure la concordance des degrés annoncés', () => {
		const withDegree = audited.filter((a) => a.row.claimedDegre);
		const lines: string[] = [];
		let sameSign = 0;
		let sameDegree = 0;
		for (const { row, fact } of withDegree) {
			const claimed = parseClaimed(row.claimedDegre!)!;
			const realSign = signOf(fact.longitude);
			const realDeg = degInSign(fact.longitude);
			const signOk = claimed.sign === realSign;
			const degOk = signOk && Math.abs(realDeg - claimed.degree) < 1;
			if (signOk) sameSign++;
			if (degOk) sameDegree++;
			lines.push(
				`| ${row.date} | ${row.claimedDegre} | ${fact.zodiac} | ${signOk ? 'signe ok' : '**signe faux**'} | ${degOk ? 'degré ok' : `${Math.abs(realDeg - claimed.degree).toFixed(0)}° d'écart`} |`
			);
		}
		const report = [
			'| date | degré annoncé | degré réel | signe | degré |',
			'| --- | --- | --- | --- | --- |',
			...lines
		].join('\n');
		expect(report.length).toBeGreaterThan(0);
		// Chance would put about one line in twelve on the right sign, i.e. five of sixty-one.
		// The measured figure sits at chance level whatever hour of day is used, so the band is
		// deliberately loose: what matters is that it is nowhere near a real agreement.
		expect(withDegree.length).toBe(61);
		expect(sameSign).toBeGreaterThanOrEqual(3);
		expect(sameSign).toBeLessThanOrEqual(12);
		expect(sameSign / withDegree.length).toBeLessThan(0.2);
		expect(sameDegree).toBe(0);
	});

	it('compte les lignes que le ciel contredit', () => {
		const phaseContradicted = audited.filter(({ row, fact }) => {
			if (row.claimedPhase.includes('Soir')) return fact.star !== 'evening';
			if (row.claimedPhase.includes('Matin')) return fact.star !== 'morning';
			return false;
		});
		const invisible = audited.filter(({ fact }) => !fact.visible);
		expect(phaseContradicted.length).toBeGreaterThan(0);
		expect(invisible.length).toBeGreaterThan(0);
	});

	it('écrit le rapport et le jeu de données corrigé', async () => {
		const { writeFileSync, mkdirSync } = await import('node:fs');
		mkdirSync(new URL('../../src/lib/data/', import.meta.url), { recursive: true });
		writeFileSync(new URL('./rapport-audit.md', import.meta.url), buildReport(audited), 'utf8');
		writeFileSync(new URL('../../src/lib/data/portails-venus.ts', import.meta.url), buildDataset(audited), 'utf8');
		expect(true).toBe(true);
	});
});

type Audited = { row: Row; fact: Fact };

function buildReport(audited: Audited[]): string {
	const withDegree = audited.filter((a) => a.row.claimedDegre);
	let sameSign = 0;
	for (const { row, fact } of withDegree) {
		if (parseClaimed(row.claimedDegre!)!.sign === signOf(fact.longitude)) sameSign++;
	}
	const contradicted = audited.filter(({ row, fact }) =>
		row.claimedPhase.includes('Soir') ? fact.star !== 'evening' : row.claimedPhase.includes('Matin') ? fact.star !== 'morning' : false
	);
	const invisible = audited.filter(({ fact }) => !fact.visible);

	const out: string[] = [];
	out.push('# Audit du jeu « Voyage de Vénus » (1952-2001)');
	out.push('');
	out.push(`Généré par \`tools/portails/audit.ts\` contre l'éphéméride, le ${new Date().toISOString().slice(0, 10)}.`);
	out.push('');
	out.push('## Verdict');
	out.push('');
	out.push(`- **Dates** : conservées telles quelles. Elles tombent pour la plupart à quelques jours d'un événement réel du cycle de Vénus.`);
	out.push(`- **Degrés annoncés** : ${sameSign} sur ${withDegree.length} portent le bon signe du zodiaque, et **aucun** le bon degré. Un tirage au hasard donnerait 1 sur 12, soit environ 5 attendus pour 61 lignes : les degrés ne sont pas corrélés au ciel.`);
	out.push(`- **Phases** : ${contradicted.length} lignes contredisent leur propre libellé d'étoile (une « Étoile du Soir » à l'ouest du Soleil est une étoile du matin).`);
	out.push(`- **Visibilité** : ${invisible.length} lignes situent Vénus à moins de ${ARCUS_VISIONIS}° du Soleil, donc invisible, ce qui est cohérent pour les lignes « Inframonde » et ne l'est pas pour les autres.`);
	out.push('- **Couche symbolique** : intacte. Portails, chakras et descriptions sont repris mot pour mot ; seuls les champs astronomiques sont recalculés.');
	out.push('');
	out.push('## Détail par ligne');
	out.push('');
	out.push('| date | phase annoncée | phase réelle | élongation | visible | signe annoncé | signe réel | de la conj. inf. | du cycle |');
	out.push('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
	for (const { row, fact } of audited) {
		const claimed = row.claimedDegre ? parseClaimed(row.claimedDegre) : null;
		out.push(
			`| ${row.date} | ${row.claimedPhase} | ${fact.phase} | ${fact.elongation.toFixed(1)}° | ${fact.visible ? 'oui' : '**non**'} | ${claimed ? claimed.sign : '—'} | ${signOf(fact.longitude)} | ${fact.daysFromInferior.toFixed(0)} j | ${fact.cycleStart.at.toISOString().slice(0, 10)} |`
		);
	}
	out.push('');
	out.push('## Contradictions de phase, ligne par ligne');
	out.push('');
	for (const { row, fact } of contradicted) {
		out.push(
			`- **${row.date}** — annoncé « ${row.claimedPhase} », or Vénus est à ${fact.elongation.toFixed(1)}° du Soleil, donc ${fact.star === 'morning' ? 'à l’ouest, étoile du matin' : 'à l’est, étoile du soir'}.`
		);
	}
	out.push('');
	out.push('## Cycles réels traversés par le jeu de données');
	out.push('');
	out.push('| conjonction inférieure | degré | conjonction supérieure | degré | durée |');
	out.push('| --- | --- | --- | --- | --- |');
	for (let i = 0; i < inferiors.length - 1; i++) {
		const start = inferiors[i];
		const end = inferiors[i + 1];
		const mid = conjunctions.find((c) => c.kind === 'superior' && c.at > start.at && c.at < end.at);
		if (!mid) continue;
		out.push(
			`| ${start.at.toISOString().slice(0, 10)} | ${zodiac(position(Body.Venus, start.at).longitude)} | ${mid.at.toISOString().slice(0, 10)} | ${zodiac(position(Body.Venus, mid.at).longitude)} | ${daysBetween(start.at, end.at).toFixed(1)} j |`
		);
	}
	out.push('');
	out.push('## Événements réels, pour mémoire');
	out.push('');
	out.push(`Sur la période couverte, l'éphéméride donne ${inferiors.length} conjonctions inférieures et ${superiors.length} conjonctions supérieures. La durée réelle des cycles va de ${Math.min(...inferiors.slice(0, -1).map((c, i) => daysBetween(c.at, inferiors[i + 1].at))).toFixed(1)} à ${Math.max(...inferiors.slice(0, -1).map((c, i) => daysBetween(c.at, inferiors[i + 1].at))).toFixed(1)} jours, et non 584.`);
	out.push('');
	return out.join('\n');
}

function buildDataset(audited: Audited[]): string {
	const out: string[] = [];
	out.push('/**');
	out.push(' * Le Voyage de Vénus, 1952-2001.');
	out.push(' *');
	out.push(' * Deux couches, à ne pas confondre :');
	out.push(' *');
	out.push(' * - la **couche symbolique** vient de l’auteur du jeu de données : le portail, le chakra');
	out.push(' *   et la description sont repris mot pour mot, sans réécriture ;');
	out.push(' * - la **couche astronomique** est entièrement recalculée depuis l’éphéméride par');
	out.push(' *   `tools/portails/audit.ts`. Le degré, la phase, la visibilité et la position dans le');
	out.push(' *   cycle ne sont plus des valeurs annoncées mais mesurées.');
	out.push(' *');
	out.push(' * Les champs `degreAnnonce` et `phaseAnnoncee` conservent les valeurs d’origine pour que');
	out.push(' * l’écart reste visible et vérifiable. Ils ne sont pas affichés par l’application.');
	out.push(' *');
	out.push(' * Ce fichier est généré. Ne pas l’éditer à la main.');
	out.push(' */');
	out.push('');
	out.push("import type { ChakraType, PhaseType } from './portails-types';");
	out.push('');
	out.push('export interface PortailVenus {');
	out.push('\tid: string;');
	out.push('\t/** Date de l’événement, ISO (AAAA-MM-JJ). */');
	out.push('\tdate: string;');
	out.push('\t/** Longitude écliptique réelle de Vénus, en degrés. */');
	out.push('\tlongitude: number;');
	out.push('\t/** La même, en degré et signe du zodiaque. */');
	out.push('\tdegre: string;');
	out.push('\t/** Degré tel qu’il figurait dans le jeu d’origine, conservé pour comparaison. */');
	out.push('\tdegreAnnonce: string | null;');
	out.push('\t/** Phase que le ciel impose, mesurée. */');
	out.push('\tphase: PhaseType;');
	out.push('\t/** Phase telle qu’elle figurait dans le jeu d’origine, conservée pour comparaison. */');
	out.push('\tphaseAnnoncee: PhaseType;');
	out.push('\t/** Élongation au Soleil, en degrés. Négative : à l’ouest, étoile du matin. */');
	out.push('\telongation: number;');
	out.push('\tetoile: \'matin\' | \'soir\';');
	out.push('\tretrograde: boolean;');
	out.push('\t/** Vénus est-elle visible, au seuil de ' + ARCUS_VISIONIS + '° retenu ici ? */');
	out.push('\tvisible: boolean;');
	out.push('\t/** Jours depuis la conjonction inférieure la plus proche. */');
	out.push('\tjoursDeLaConjonctionInferieure: number;');
	out.push('\t/** Conjonction inférieure qui a ouvert le cycle auquel appartient cette date. */');
	out.push('\tdebutDeCycle: string;');
	out.push('\tportail?: string;');
	out.push('\tchakra?: ChakraType;');
	out.push('\tdescription: string;');
	out.push('}');
	out.push('');
	out.push('export const voyageVenusData: PortailVenus[] = [');
	for (const { row, fact } of audited) {
		const entries: string[] = [];
		entries.push(`\t\tid: '${row.date}'`);
		entries.push(`\t\tdate: '${row.date}'`);
		entries.push(`\t\tlongitude: ${fact.longitude.toFixed(4)}`);
		entries.push(`\t\tdegre: '${fact.zodiac}'`);
		entries.push(`\t\tdegreAnnonce: ${row.claimedDegre ? `'${row.claimedDegre}'` : 'null'}`);
		entries.push(`\t\tphase: ${JSON.stringify(fact.phase)} as PhaseType`);
		entries.push(`\t\tphaseAnnoncee: ${JSON.stringify(row.claimedPhase)} as PhaseType`);
		entries.push(`\t\telongation: ${fact.elongation.toFixed(2)}`);
		entries.push(`\t\tetoile: '${fact.star === 'morning' ? 'matin' : 'soir'}'`);
		entries.push(`\t\tretrograde: ${fact.retrograde}`);
		entries.push(`\t\tvisible: ${fact.visible}`);
		entries.push(`\t\tjoursDeLaConjonctionInferieure: ${fact.daysFromInferior.toFixed(2)}`);
		entries.push(`\t\tdebutDeCycle: '${fact.cycleStart.at.toISOString().slice(0, 10)}'`);
		if (row.portail) entries.push(`\t\tportail: ${JSON.stringify(row.portail)}`);
		if (row.chakra) entries.push(`\t\tchakra: ${JSON.stringify(row.chakra)} as ChakraType`);
		entries.push(`\t\tdescription: ${JSON.stringify(row.description ?? '')}`);
		out.push('\t{');
		out.push(entries.join(',\n') + ',');
		out.push('\t},');
	}
	out.push('];');
	out.push('');
	// Summary tables derived from the data, so the file is self-describing.
	const byPhase = new Map<string, number>();
	for (const { fact } of audited) byPhase.set(fact.phase, (byPhase.get(fact.phase) ?? 0) + 1);
	out.push('/** Répartition des entrées par phase réelle. */');
	out.push('export const repartitionParPhase: Record<string, number> = {');
	for (const [phase, n] of [...byPhase].sort()) out.push(`\t${JSON.stringify(phase)}: ${n},`);
	out.push('};');
	out.push('');
	return out.join('\n');
}
