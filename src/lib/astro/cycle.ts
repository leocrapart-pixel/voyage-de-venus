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
	PORTAILS_MAXIMUM,
	VISIBILITE_MINIMUM,
	portalSteps,
	type Gate,
	type Threshold,
	type PortalKey
} from '../symbolic/gates';

/** Élongation solaire à partir de laquelle une conjonction devient un portail. */
export const PORTAL_VISIBILITY = VISIBILITE_MINIMUM;

/** La phase que donne une élongation : négative à l'ouest du Soleil, donc étoile du matin. */
function starOf(elongation: number): Star {
	return elongation < 0 ? 'morning' : 'evening';
}

/**
 * Le portail qui ouvre une clé donnée, dans la phase en cours.
 *
 * Les deux phases portent les mêmes sept chakras — la descente du sommet vers la racine,
 * l'ascension de la racine vers le sommet —, donc la clé seule ne suffit pas : c'est la phase du
 * moment qui décide lequel des deux on regarde.
 */
export function passageForGate(journey: VenusJourney, key: PortalKey): GatePassage | null {
	if (journey.activePassage?.gate.key === key) return journey.activePassage;
	const phase = journey.star === 'morning' ? journey.morning : journey.evening;
	return phase.portals.find((p) => p.gate.key === key) ?? null;
}

/**
 * Élongation solaire au-dessous de laquelle Vénus est tenue pour invisible.
 *
 * Un seul seuil partout : il décide quelles conjonctions sont des portails, et il borne
 * l'inframonde affiché. Il n'est plus réglable dans l'interface — une observation n'est pas un
 * curseur.
 */
export const ARCUS_VISIONIS = 10;

/** La phase de Vénus : étoile du matin, ou étoile du soir. */
export type Star = 'morning' | 'evening';
export type ConjunctionKind = 'inferior' | 'superior';

/**
 * Demi-largeur, en heures, de la fenêtre pendant laquelle un portail est « en cours ».
 *
 * Le portail lui-même est un instant, donné à la minute ; cette fenêtre ne décide que du portail
 * que l'interface annonce comme celui du moment. Une demi-journée de part et d'autre.
 */
export const GATE_WINDOW_HOURS = 12;

/**
 * Une conjonction Vénus-Soleil — le repère qui borne et coupe le cycle.
 */
export interface Conjunction {
	kind: ConjunctionKind;
	at: Date;
	/** Élongation signée : négative à l'ouest du Soleil, positive à l'est. */
	elongation: number;
	/** Latitude écliptique de Vénus : de combien elle passe à côté. */
	venusLatitude: number;
	/** Séparation angulaire vraie au Soleil, en degrés. */
	separationFromSun: number;
}

export interface Station {
	at: Date;
	direction: 'retrograde' | 'direct';
	elongation: number;
	longitude: number;
}

export interface RetrogradeWindow {
	retrogradeStation: Station;
	directStation: Station;
	days: number;
	/** Longitude de Vénus au milieu de la rétrogradation. */
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
 * Une conjonction Lune-Vénus : l'instant exact où les deux astres tiennent le même degré du
 * zodiaque.
 *
 * Aucun champ de qualité : une conjonction a lieu ou n'a pas lieu, et son heure est fixée. Ce qui
 * varie d'un mois à l'autre est la distance réelle entre les deux astres à cet instant — une
 * mesure à publier, pas un verdict.
 */
export interface MoonVenusConjunction {
	at: Date;
	longitude: number;
	venusLongitude: number;
	moonLongitude: number;
	/** Séparation angulaire vraie à l'instant de la conjonction, en degrés. C'est l'orbe. */
	separation: number;
	closestSeparation: number;
	closestAt: Date;
	moonLatitude: number;
	venusLatitude: number;
	elongation: number;
	star: Star;
	/**
	 * La phase à laquelle la conjonction appartient, qui est aussi `star` : c'est le signe de
	 * l'élongation qui décide.
	 */
	half: Star;
	waxing: boolean;
	/** Ce que ce portail ouvre : un chakra, ou l'un des deux seuils. */
	gate: Gate | Threshold;
	/** Rang dans l'ordre de lecture de sa phase : 1 à 7 les chakras, 8 la mort à la descente. */
	index: number;
	readOrder: number;
	/** Vénus est-elle visible à cet instant — élongation au-delà de `VISIBILITE_MINIMUM` ? */
	observable: boolean;
	/** Cette conjonction est-elle retenue comme portail de sa phase ? */
	portal: boolean;
	dayOfPhase: number;
}

export interface GatePassage extends MoonVenusConjunction {
	/** Vrai dans la demi-journée qui entoure l'instant exact. */
	open: boolean;
	/**
	 * Le numéro affiché : sept à zéro à la descente, zéro à sept à l'ascension. La couronne porte
	 * le 7 et la racine le 0 en descendant ; l'inverse en remontant. Les deux seuils prennent le
	 * numéro qui reste — 0 à la descente, 0 à l'ascension quand il y a huit portails.
	 *
	 * Ce n'est pas le rang : le rang sert à ordonner, le numéro à lire.
	 */
	position: number;
}

export interface Phase {
	star: Star;
	start: Date;
	end: Date;
	days: number;
	/** Les conjonctions de la phase, chronologiques. */
	passages: GatePassage[];
	/** Les portails retenus, dans l'ordre de lecture : les sept chakras, puis la conscience. */
	portals: GatePassage[];
	/** Les conjonctions écartées parce que Vénus était invisible. */
	inframonde: GatePassage[];
}

export interface GreatestElongation {
	at: Date;
	elongation: number;
	star: Star;
}

export interface JourneyOptions {
	/** Élongation solaire minimale, en degrés, à laquelle Vénus compte comme visible. */
	/** Demi-largeur, en heures, de la fenêtre autour d'un portail. */
	gateWindowHours?: number;
}

/** Élongation écliptique signée de Vénus : négative à l'ouest du Soleil. */
export function venusElongation(date: Date): number {
	return signedDelta(position(Body.Venus, date).longitude, position(Body.Sun, date).longitude);
}

/**
 * Le portail est-il ouvert à cet instant ?
 *
 * La comparaison a une tolérance, et ce n'est pas cosmétique : les conjonctions sont trouvées par
 * bissection avec une règle d'arrêt d'une demi-seconde, donc la même conjonction cherchée depuis
 * deux grilles différentes peut tomber à une demi-seconde près. Sans cette marge, un portail
 * clignoterait fermé pour un lecteur qui recharge la page sur son instant exact.
 */
export function isGateOpen(passageAt: Date, moment: Date, windowHours = GATE_WINDOW_HOURS): boolean {
	const toleranceHours = 1 / 3600;
	return Math.abs(daysBetween(passageAt, moment)) <= windowHours / 24 + toleranceHours;
}

/**
 * Le passage au plus près de la Lune et de Vénus autour d'une conjonction.
 *
 * La conjonction est exacte en longitude ; la séparation dans le ciel atteint son minimum dans
 * les heures qui l'entourent, parce que la latitude écliptique de la Lune n'est pas nulle et
 * celle de Vénus non plus. Un échantillonnage grossier puis une trisection trouvent ce minimum à
 * la minute près.
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
	retrograde: RetrogradeWindow | null
): GatePassage[] {
	const inCycle = raw
		.filter((c) => c.at.getTime() >= start.at.getTime() && c.at.getTime() <= end.at.getTime())
		.sort((a, b) => a.at.getTime() - b.at.getTime())
		// La phase se lit dans le signe de l'élongation : Vénus à l'ouest du Soleil se lève avant
		// lui, c'est l'étoile du matin — la descente. À l'est, c'est l'étoile du soir.
		.map((c) => ({
			...c,
			star: (c.elongation < 0 ? 'morning' : 'evening') as Star,
			half: (c.elongation < 0 ? 'morning' : 'evening') as Star
		}));

	const rank = new Map<number, number>();
	const portal = new Map<number, Gate | Threshold>();
	const numero = new Map<number, number>();

	// La rétrogradation qui encadre la conjonction inférieure de fermeture : Vénus tourne autour
	// d'elle comme autour de celle qui ouvre le cycle. On la cherche pour écarter les conjonctions
	// qui y tombent.
	const closing = findRetrogradeWindow(end.at);
	const closingRetrogradeStart = closing ? closing.retrogradeStation.at.getTime() : Number.POSITIVE_INFINITY;
	const closingRetrogradeEnd = closing ? closing.directStation.at.getTime() : Number.NEGATIVE_INFINITY;

	for (const star of ['morning', 'evening'] as const) {
		const phase = inCycle.filter((c) => c.star === star);

		/**
		 * Une conjonction tombe-t-elle pendant que Vénus rétrograde ?
		 *
		 * La rétrogradation couvre les six semaines qui entourent la conjonction inférieure : celle
		 * qui ouvre le cycle, et celle qui le ferme. Une conjonction qui y tombe n'ouvre pas de
		 * portail — la planète revient sur ses pas, elle ne franchit rien de neuf.
		 */
		const dansRetrograde = (c: MoonVenusConjunction) =>
			!!retrograde &&
			((c.at.getTime() >= retrograde.retrogradeStation.at.getTime() &&
				c.at.getTime() <= retrograde.directStation.at.getTime()) ||
				// La rétrogradation qui ferme le cycle, autour de la conjonction inférieure suivante.
				(c.at.getTime() >= closingRetrogradeStart && c.at.getTime() <= closingRetrogradeEnd));

		// 1. Écartées d'emblée : celles de l'inframonde, où Vénus est invisible, et celles de la
		//    rétrogradation. Ni les unes ni les autres n'appartiennent à une phase : elles n'ouvrent
		//    aucun portail.
		const visibles = phase.filter(
			(c) => Math.abs(c.elongation) > VISIBILITE_MINIMUM && !dansRetrograde(c)
		);

		// 2. On garde les plus serrées — c'est l'orbe qui départage — et jamais plus de huit.
		//    Au-delà de huit, la plus proche du Soleil est écartée.
		const retenues = visibles
			.slice()
			.sort((a, b) => a.separation - b.separation)
			.slice(0, PORTAILS_MAXIMUM);

		// 3. Numérotation par date croissante, puis un chakra par rang dans l'ordre traditionnel.
		const ordered = retenues.sort((a, b) => a.at.getTime() - b.at.getTime());
		const steps = portalSteps(star, ordered.length);
		ordered.forEach((c, i) => {
			rank.set(c.at.getTime(), steps[i].rank);
			numero.set(c.at.getTime(), steps[i].position);
			portal.set(c.at.getTime(), steps[i].gate);
		});
	}

	return inCycle.map((c) => {
		const assigned = rank.get(c.at.getTime());
		return {
			...c,
			observable: Math.abs(c.elongation) > VISIBILITE_MINIMUM,
			portal: assigned !== undefined,
			index: assigned ?? 0,
			readOrder: assigned ?? 0,
			position: numero.get(c.at.getTime()) ?? -1,
			gate: portal.get(c.at.getTime()) ?? GATES[0],
			dayOfPhase: Math.abs(daysBetween(c.star === 'morning' ? start.at : mid.at, c.at)),
			open: assigned !== undefined && isGateOpen(c.at, now, windowHours)
		};
	});
}

/**
 * Assemble the complete journey for a moment: the enclosing cycle, its two halves, the
 * retrograde, the inframonde, and every gate passage with its chakra.
 */
export interface VenusJourney {
	date: Date;
	arcusVisionis: number;
	gateWindowHours: number;
	/** Élongation solaire à partir de laquelle une conjonction est un portail. */
	portalVisibility: number;
	start: Conjunction;
	end: Conjunction;
	mid: Conjunction;
	synodicDays: number;
	dayOfCycle: number;
	daysRemaining: number;
	progress: number;
	star: Star;
	elongation: number;
	separationFromSun: number;
	venus: EclipticPosition;
	moon: EclipticPosition;
	moonSeparation: number;
	greatestElongation: GreatestElongation;
	retrograde: RetrogradeWindow | null;
	invisible: InvisibilityWindow | null;
	inInframonde: boolean;
	morning: Phase;
	evening: Phase;
	conjunctions: GatePassage[];
	/** Nombre de portails par phase : sept, ou huit. */
	portalsParPhase: number;
	activePassage: GatePassage | null;
	nextPassage: GatePassage | null;
}

export function computeJourney(date: Date, options: JourneyOptions = {}): VenusJourney {
	const arcusVisionis = ARCUS_VISIONIS;
	const gateWindowHours = options.gateWindowHours ?? GATE_WINDOW_HOURS;

	const { start, mid, end } = findEnclosingCycle(date);
	const synodicDays = daysBetween(start.at, end.at);

	const venus = position(Body.Venus, date);
	const moon = position(Body.Moon, date);
	const sun = position(Body.Sun, date);
	const elongation = signedDelta(venus.longitude, sun.longitude);

	const retrograde = findRetrogradeWindow(start.at);
	const passages = organise(
		findMoonVenusConjunctions(shiftDays(start.at, -2), shiftDays(end.at, 2)),
		start,
		mid,
		end,
		date,
		gateWindowHours,
		retrograde
	);

	/** The number of portals each half holds — the same for both, by construction. */
	const perHalf = passages.filter((p: GatePassage) => p.portal && p.star === 'morning').length;

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
			portals: half.filter((p) => p.portal),
			inframonde: half.filter((p) => !p.observable)
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
		portalVisibility: VISIBILITE_MINIMUM,
		portalsParPhase: perHalf,
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
		retrograde,
		invisible,
		inInframonde,
		morning: phaseOf('morning'),
		evening: phaseOf('evening'),
		conjunctions: passages,
		activePassage,
		nextPassage
	};
}
