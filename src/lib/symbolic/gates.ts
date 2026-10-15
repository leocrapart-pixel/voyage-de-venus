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

/** Le huitième portail, celui qui n'est pas un chakra. */
export type AwarenessKey = 'conscience';

/** Tout ce qu'un portail peut ouvrir. */
export type PortalKey = GateKey | AwarenessKey;

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
 * Le huitième portail : **Portail de la Conscience** — l'intention devenue consciente.
 *
 * Il n'a pas de chakra, parce qu'il n'est pas un centre du corps : c'est le franchissement qui
 * achève les sept. Il n'apparaît que dans les phases qui comptent huit conjonctions visibles, et
 * prend alors le huitième rang, après les sept chakras, dans les deux sens du voyage.
 */
export interface Awareness {
	/** 8 — toujours après les sept chakras. */
	index: number;
	key: AwarenessKey;
	name: string;
	meaning: string;
	color: string;
	deep: string;
}

export const AWARENESS: Awareness = {
	index: 8,
	key: 'conscience',
	name: 'Portail de la Conscience',
	meaning:
		'Le huitième portail : non plus un centre du corps, mais l’intention qui les traverse, devenue consciente. Inanna remonte en sachant ce qu’elle a lâché.',
	color: '#d9d2f0',
	deep: '#443c5e'
} as const;

/** Ce portail est-il le huitième ? */
export function isAwarenessKey(key: string): key is AwarenessKey {
	return key === 'conscience';
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
 * Les portails d'une phase, dans l'ordre de lecture.
 *
 * Les sept chakras d'abord, puis le huitième s'il y en a un : la conscience qui les traverse.
 */
export function portalSequence(
	star: 'morning' | 'evening',
	count: number
): readonly (Gate | Awareness)[] {
	const base = gatesForStar(star);
	const out: (Gate | Awareness)[] = base.slice(0, Math.min(count, GATE_COUNT));
	if (count > GATE_COUNT) out.push(AWARENESS);
	return out;
}

/** Le portail pour un rang de 1 à 8, dans une phase donnée. */
export function portalForRank(rank: number, star: 'morning' | 'evening'): Gate | Awareness {
	const sequence = portalSequence(star, Math.max(rank, GATE_COUNT));
	return sequence[Math.min(rank, sequence.length) - 1] ?? GATES[0];
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
