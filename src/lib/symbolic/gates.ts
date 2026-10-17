/**
 * Les sept portails du voyage, et le huitième.
 *
 * ## Ce qu'est un portail
 *
 * Une conjonction Lune-Vénus — l'instant exact où les deux astres tiennent le même degré du
 * zodiaque. La Lune en rencontre une vingtaine par cycle, mais toutes ne comptent pas :
 *
 * 1. **Vénus doit être visible.** Sous `VISIBILITE_MINIMUM` degrés d'élongation au Soleil, elle
 *    est noyée dans le crépuscule : la conjonction a lieu, mais dans l'inframonde, et elle
 *    n'appartient à aucune phase. Elle n'ouvre donc aucun portail ;
 * 2. **la conjonction doit être serrée.** Parmi les visibles, on garde les mieux serrées — c'est
 *    l'orbe Lune-Vénus qui départage, et non l'appartenance ;
 * 3. **jamais plus de huit.** Au-delà, la plus proche du Soleil est écartée : c'est la moins
 *    lisible.
 *
 * Mesuré sur les cycles 2018-2036, l'élongation seule donne **sept à neuf conjonctions visibles
 * par phase**, ce qui laisse sept ou huit portails après l'écartement. C'est l'élongation qui
 * fait le compte, et l'orbe qui choisit lesquelles.
 *
 * ## Les noms
 *
 * Chaque portail porte le nom de ce qu'il gouverne, et garde le chakra qu'il traverse : le nom
 * dit ce que la porte ouvre, le chakra dit où elle passe. Six des sept noms viennent du jeu de
 * données 1952-2001, dont l'appariement portail-chakra est sans ambiguïté sur 34 entrées ; le jeu
 * ne nomme pas le troisième œil, et « Portail de la Vision » est donc le seul nom proposé.
 *
 * ## Les deux sens
 *
 * La descente va du sommet vers la racine — couronne d'abord, racine ensuite. L'ascension suit le
 * chemin inverse : la même échelle parcourue à l'envers, de la racine vers la couronne.
 */

export type GateKey = 'crown' | 'brow' | 'throat' | 'heart' | 'solar' | 'sacral' | 'root';

/** Les deux seuils : la mort qui ferme la descente, la vie qui ouvre l'ascension. */
export type ThresholdKey = 'mort-intentionnelle' | 'vie-intentionnelle';

/** Les trois jours de l'inframonde, entre la descente et l'ascension. */
export type UnderworldDayKey = 'inframonde-jour-1' | 'inframonde-jour-2' | 'inframonde-jour-3';

/** Tout ce qu'un portail peut ouvrir. */
export type PortalKey = GateKey | ThresholdKey | UnderworldDayKey;

export interface Gate {
	/** 1..7, l'ordre de la descente — couronne d'abord, racine ensuite. */
	index: number;
	key: GateKey;
	/** Ce que la porte gouverne. */
	name: string;
	/** Le chakra qu'elle traverse. */
	chakra: string;
	/** D'où vient le nom : du jeu de données, ou de nous. */
	nameSource: 'dataset' | 'proposed';
	/** Nom sanskrit du chakra. */
	sanskrit: string;
	/** Place traditionnelle. */
	location: string;
	/** Le vêtement qu'Inanna abandonne à cette porte. */
	garment: string;
	/** Ce que l'abandon demande. */
	release: string;
	/** Couleur du centre, pour la lueur et la frise. */
	color: string;
	deep: string;
}

export const GATES: readonly Gate[] = [
	{
		index: 1,
		key: 'crown',
		name: "Portail de l'Autorité",
		chakra: 'Couronne',
		nameSource: 'dataset',
		sanskrit: 'Sahasrāra',
		location: 'sommet du crâne',
		garment: 'la couronne de la steppe',
		release: 'la souveraineté — renoncer à régner pour pouvoir descendre',
		color: '#b06fe0',
		deep: '#3b1c56'
	},
	{
		index: 2,
		key: 'brow',
		name: 'Portail de la Vision',
		chakra: 'Troisième œil',
		nameSource: 'proposed',
		sanskrit: 'Ājñā',
		location: 'entre les sourcils',
		garment: 'le bâton de mesure et la corde',
		release: "l'instrument de mesure — cesser de juger pour voir",
		color: '#5b3fd6',
		deep: '#1d1550'
	},
	{
		index: 3,
		key: 'throat',
		name: 'Portail de la Communication',
		chakra: 'Gorge',
		nameSource: 'dataset',
		sanskrit: 'Viśuddha',
		location: 'gorge',
		garment: 'le collier de lapis-lazuli',
		release: 'la parole ornée — parler sans parure ni protection',
		color: '#3f8ee0',
		deep: '#153a5e'
	},
	{
		index: 4,
		key: 'heart',
		name: 'Portail de la Compassion',
		chakra: 'Cœur',
		nameSource: 'dataset',
		sanskrit: 'Anāhata',
		location: 'centre de la poitrine',
		garment: 'la cuirasse',
		release: "l'armure — accepter d'être atteinte",
		color: '#4fc93c',
		deep: '#194a16'
	},
	{
		index: 5,
		key: 'solar',
		name: 'Portail du Pouvoir Personnel',
		chakra: 'Plexus solaire',
		nameSource: 'dataset',
		sanskrit: 'Maṇipūra',
		location: 'creux de l’estomac',
		garment: "l'anneau d'or",
		release: "l'anneau du pouvoir personnel — perdre la maîtrise",
		color: '#e0d431',
		deep: '#4d4a12'
	},
	{
		index: 6,
		key: 'sacral',
		name: 'Portail de la Créativité',
		chakra: 'Sacré',
		nameSource: 'dataset',
		sanskrit: 'Svādhiṣṭhāna',
		location: 'bas-ventre',
		garment: 'les pierres de son sein',
		release: 'le désir et la séduction — descendre dépouillée',
		color: '#e0a03c',
		deep: '#4d3413'
	},
	{
		index: 7,
		key: 'root',
		name: 'Portail de la Manifestation',
		chakra: 'Racine',
		nameSource: 'dataset',
		sanskrit: 'Mūlādhāra',
		location: 'périnée',
		garment: 'le vêtement royal',
		release: 'la dernière apparence — rester nue devant la mort',
		color: '#d3463f',
		deep: '#4d1714'
	}
] as const;

export const GATE_COUNT = GATES.length;

/**
 * Le huitième portail, aux deux bouts de la traversée.
 *
 * Il n'est pas un chakra : il n'a ni centre du corps ni nom sanskrit, et l'interface le dessine
 * hors de la figure. Ce qu'il marque est le franchissement lui-même — l'instant où Vénus entre
 * dans le Soleil ou en ressort.
 *
 * - **Mort intentionnelle** : elle ferme la descente, au coucher héliaque, la dernière
 *   conjonction venue après les sept portes ;
 * - **Vie intentionnelle** : elle ouvre l'ascension, au lever héliaque, avant que les sept
 *   portes ne se déroulent dans l'ordre croissant — manifestation d'abord, puis créativité, et
 *   jusqu'à l'autorité.
 */
export interface Threshold {
	/** 8 à la descente, 1 à l'ascension. */
	index: number;
	key: ThresholdKey;
	name: string;
	meaning: string;
	star: 'morning' | 'evening';
	color: string;
	deep: string;
}

export const THRESHOLDS: Readonly<Record<ThresholdKey, Threshold>> = {
	'mort-intentionnelle': {
		index: 8,
		key: 'mort-intentionnelle',
		name: 'Mort intentionnelle',
		meaning:
			'La descente s’achève : Vénus disparaît dans le Soleil. Inanna meurt, et ce qu’elle a lâché aux sept portes la précède.',
		star: 'morning',
		color: '#8b90a0',
		deep: '#2c303a'
	},
	'vie-intentionnelle': {
		index: 1,
		key: 'vie-intentionnelle',
		name: 'Vie intentionnelle',
		meaning:
			'La sortie de l’enfer : Vénus reparaît en étoile du soir. Inanna remonte, non plus couronnée mais intentionnelle.',
		star: 'evening',
		color: '#d9d2f0',
		deep: '#443c5e'
	}
} as const;

/** Ce portail est-il l'un des deux seuils ? */
export function isThresholdKey(key: string): key is ThresholdKey {
	return key === 'mort-intentionnelle' || key === 'vie-intentionnelle';
}

/**
 * Les trois jours de l'inframonde.
 *
 * Entre la mort qui ferme la descente et la vie qui ouvre l'ascension, Vénus est dans le Soleil :
 * elle a disparu. C'est la traversée, et elle dure trois jours symboliques — le coucher héliaque,
 * la conjonction inférieure, le lever héliaque. Ils n'ont pas de chakra : ils sont **sous la
 * terre**, et leur couleur est le gris foncé du temps où rien ne se voit.
 *
 * Trois entrées, pas des conjonctions Lune-Vénus : ce sont les instants du ciel qui marquent la
 * descente aux enfers et la remontée.
 */
export interface UnderworldDay {
	/** -1, -2, -3 : ils se lisent **après** la mort, en dessous de zéro. */
	position: number;
	key: UnderworldDayKey;
	name: string;
	meaning: string;
	/** Gris foncé, presque noir : le temps de l'invisible. */
	color: string;
	deep: string;
}

export const UNDERWORLD_DAYS: readonly UnderworldDay[] = [
	{
		position: -1,
		key: 'inframonde-jour-1',
		name: 'Inframonde jour 1',
		meaning:
			'Vénus entre dans le Soleil, au coucher héliaque. Inanna meurt : ce qu’elle a lâché aux sept portes la précède dans le Grand En-Bas.',
		color: '#2a2b33',
		deep: '#15161b'
	},
	{
		position: -2,
		key: 'inframonde-jour-2',
		name: 'Inframonde jour 2',
		meaning:
			'La conjonction inférieure : Vénus passe entre la Terre et le Soleil. La traversée se poursuit sans lumière — Inanna est jugée, mise à mort et suspendue.',
		color: '#1e1f26',
		deep: '#101116'
	},
	{
		position: -3,
		key: 'inframonde-jour-3',
		name: 'Inframonde jour 3',
		meaning:
			'Vénus ressort du Soleil, au lever héliaque : elle reparaît en étoile du soir. Inanna remonte, dépouillée, et la vie intentionnelle peut commencer.',
		color: '#3a3b45',
		deep: '#1b1c22'
	}
] as const;

/** Ce portail est-il un jour de l'inframonde ? */
export function isUnderworldKey(key: string): key is UnderworldDayKey {
	return key.startsWith('inframonde-jour-');
}

/** Élongation solaire minimale pour que Vénus soit tenue pour visible. */
export const VISIBILITE_MINIMUM = 10;

/** Le nombre visé de portails par phase, et son plafond. */
export const PORTAILS_MINIMUM = 7;
export const PORTAILS_MAXIMUM = 8;

/**
 * L'ordre des chakras dans une phase.
 *
 * La descente va du sommet vers la racine, l'ascension suit le chemin inverse.
 */
export const GATES_DESCENDING: readonly Gate[] = GATES;
export const GATES_ASCENDING: readonly Gate[] = [...GATES].reverse();

/** L'ordre des chakras pour une phase, en fonction du sens du voyage. */
export function gatesForStar(star: 'morning' | 'evening'): readonly Gate[] {
	return star === 'morning' ? GATES_DESCENDING : GATES_ASCENDING;
}

/**
 * Les portails d'une phase, dans l'ordre de lecture, avec leur numéro.
 *
 * Le numéro n'est pas le rang : il **décroît de sept à zéro** à la descente et **croît de zéro à
 * sept** à l'ascension. La couronne porte le 7 et la racine le 0 en descendant ; à la remontée
 * c'est l'inverse, la racine part de 0 et la couronne arrive à 7. Les deux seuils prennent le
 * numéro qui reste :
 *
 * - **8 portails** : la descente va de 7 à 0, la mort comprise ; l'ascension va de 0 à 7, la vie
 *   comprise ;
 * - **7 portails** — quand la rétrogradation en a écarté un — : la descente va de 7 à 1, et
 *   l'ascension de 1 à 7.
 *
 * Chaque portail garde sa couleur : c'est le numéro qui change, pas le centre.
 */
export interface PortalStep {
	gate: Gate | Threshold;
	/** Le rang dans l'ordre de lecture : 1 à 8. */
	rank: number;
	/** Le numéro affiché : 7 à 0 à la descente, 0 à 7 à l'ascension. */
	position: number;
}

export function portalSteps(star: 'morning' | 'evening', count: number): readonly PortalStep[] {
	const n = Math.max(0, Math.min(count, PORTAILS_MAXIMUM));
	if (n === 0) return [];

	if (star === 'morning') {
		// La descente : les sept chakras de la couronne à la racine, puis la mort. Sept portails
		// vont de 7 à 1, huit de 7 à 0.
		const gateCount = Math.min(n, GATE_COUNT);
		const withThreshold = n > GATE_COUNT;
		const span = n - 1;
		const out: PortalStep[] = GATES_DESCENDING.slice(0, gateCount).map((gate, i) => ({
			gate,
			rank: i + 1,
			position: i === 0 ? span : span - i
		}));
		if (withThreshold) {
			out.push({ gate: THRESHOLDS['mort-intentionnelle'], rank: n, position: 0 });
		}
		return out;
	}

	// L'ascension : la vie d'abord, puis les chakras de la racine à la couronne. Elle ouvre dans les
	// deux cas — huit portails de 0 à 7, sept portails de 1 à 7 —, parce que c'est par elle que
	// Vénus reparaît : sans elle il n'y a pas d'ascension.
	const out: PortalStep[] = [{ gate: THRESHOLDS['vie-intentionnelle'], rank: 1, position: n === PORTAILS_MAXIMUM ? 0 : 1 }];
	GATES_ASCENDING.slice(0, Math.max(0, n - 1)).forEach((gate, i) => {
		out.push({ gate, rank: i + 2, position: (n === PORTAILS_MAXIMUM ? 1 : 2) + i });
	});
	return out;
}

/** Le portail pour un rang de 1 à 8, dans une phase donnée. */
export function portalForRank(rank: number, star: 'morning' | 'evening'): Gate | Threshold {
	const steps = portalSteps(star, PORTAILS_MAXIMUM);
	return steps[Math.min(Math.max(rank, 1), steps.length) - 1]?.gate ?? GATES[0];
}

/** Le portail d'un chakra, par sa clé. */
export function gateByKey(key: GateKey): Gate {
	const found = GATES.find((g) => g.key === key);
	if (!found) throw new Error(`Unknown gate: ${key}`);
	return found;
}

/**
 * Positions et tailles des sept centres dans la figure.
 *
 * Elles sont **mesurées dans l'image**, pas estimées. Chaque chakra est peint dans sa propre
 * teinte, donc le PNG se segmente par couleur : les pixels fortement colorés de chaque bande sont
 * découpés en composantes connexes, et l'on garde celle qui chevauche l'axe vertical de la figure
 * — c'est le symbole du chakra, et non le contour du corps dessiné sur les mêmes lignes.
 *
 * Les sept centres tombent ainsi sur un même axe (x de 297,5 à 299,0 sur 600) et leurs rayons
 * varient du simple au double : 43 px pour le plexus solaire, 24 px pour le troisième œil. Un
 * anneau de taille unique masquerait les petits ou flotterait dans les grands, d'où un rayon par
 * centre.
 */
export interface ChakraSpot {
	key: GateKey;
	/** Fraction de la largeur de l'image, 0..1 depuis la gauche. */
	x: number;
	/** Fraction de la hauteur de l'image, 0..1 depuis le haut. */
	y: number;
	/** Rayon mesuré du symbole, en fraction de la largeur. */
	r: number;
}

export const CHAKRA_IMAGE = {
	width: 600,
	height: 823,
	source: 'https://jothishi.com/wp-content/uploads/2019/05/The-seven-chakras.png',
	attribution: 'jothishi.com'
} as const;

const MEASURED: ReadonlyArray<{ key: GateKey; x: number; y: number; r: number }> = [
	{ key: 'crown', x: 297.5, y: 54.5, r: 31 },
	{ key: 'brow', x: 298.0, y: 177.5, r: 24 },
	{ key: 'throat', x: 298.5, y: 295.5, r: 34 },
	{ key: 'heart', x: 297.5, y: 403.5, r: 32 },
	{ key: 'solar', x: 298.0, y: 513.0, r: 43 },
	{ key: 'sacral', x: 297.5, y: 609.0, r: 43 },
	{ key: 'root', x: 298.5, y: 709.0, r: 22 }
];

export const CHAKRA_SPOTS: readonly ChakraSpot[] = MEASURED.map((s) => ({
	key: s.key,
	x: s.x / CHAKRA_IMAGE.width,
	y: s.y / CHAKRA_IMAGE.height,
	r: s.r / CHAKRA_IMAGE.width
}));

export function spotFor(key: GateKey): ChakraSpot {
	const found = CHAKRA_SPOTS.find((s) => s.key === key);
	if (!found) throw new Error(`No measured position for gate: ${key}`);
	return found;
}
