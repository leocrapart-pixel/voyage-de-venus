/**
 * The seven gates of the descent, and the eighth threshold.
 *
 * In the Sumerian poem *Inanna's Descent to the Netherworld*, the queen of heaven passes
 * seven gates on her way down. At each one the gatekeeper strips a garment of her royal
 * dress, so she arrives before her sister Ereshkigal with nothing left — authority
 * dismantled, one piece at a time, from the crown downwards.
 *
 * The Voyage de Vénus maps that descent onto the seven chakras, in the same top-down
 * order. This file is the single source of the symbolism; the astronomy layer decides how
 * many portals a half of the cycle holds and hands each one a 1-based rank.
 *
 * ## Why a half holds seven or eight, and no more
 *
 * A portal is a Moon-Venus conjunction — and the Moon meets Venus about once a month, so a
 * half-cycle of 290 days holds roughly ten of them. But a conjunction only counts as a
 * portal when it can be **seen**: below about 15° of solar elongation Venus is lost in the
 * twilight and the Moon is a daytime crescent, so the meeting happens out of sight.
 *
 * Applying that one criterion to 250 half-cycles between 1900 and 2100 yields **7 portals
 * 105 times and 8 portals 145 times — and nothing else**. The shape of the myth is not
 * imposed on the sky; it falls out of it, from a threshold that is observational rather
 * than symbolic.
 *
 * ## The eighth is a threshold, not a chakra
 *
 * When a half holds eight, the eighth is the **return**. Inanna comes back changed, and
 * what opens again is not rank but intention: **vie intentionnelle** at the exit from the
 * underworld, on the evening side. Its mirror is her death, **mort intentionnelle**, at
 * the heliacal setting where Venus vanishes — the end of the morning star, before the
 * inferior conjunction. Neither has a Sanskrit name, a place on the body or a garment,
 * because nothing is taken from her there: she dies, and she is given back.
 */

export type GateKey = 'crown' | 'brow' | 'throat' | 'heart' | 'solar' | 'sacral' | 'root';

/** Les trois jours que Vénus passe sous le Soleil, après la racine. */
export type UnderworldKey = 'inframonde-jour-1' | 'inframonde-jour-2' | 'inframonde-jour-3';

/** Les deux seuils qui encadrent la traversée. */
export type ThresholdKey = 'mort-intentionnelle' | 'vie-intentionnelle';

/** Tout ce qu'un portail peut ouvrir. */
export type PortalKey = GateKey | ThresholdKey | UnderworldKey;

/**
 * A gate is named after what it governs, not after the centre of the body it passes
 * through.
 *
 * Six of the seven names are **not invented**: they are the ones the 1952-2001 dataset uses,
 * and its pairing of portal to chakra is unambiguous — « Portail de l'Autorité » always goes
 * with the crown, « Portail de la Compassion » with the heart, and so on across 34 entries.
 * The dataset never names a portal for the third eye or the throat under those names, so
 * those two names are ours and are flagged as such by `nameSource`.
 *
 * The chakra stays on the object because it is what the figure draws and what the descent
 * actually strips: the name says what the gate is about, the chakra says where it is. The
 * chakra names are the dataset's own — « Troisième œil », « Sacré », « Racine » — so that
 * the app and the data speak the same language.
 */
export interface Gate {
	/** 1..7, the order of the descent — crown first, root last. */
	index: number;
	key: GateKey;
	/** The portal's name: what it governs. */
	name: string;
	/** The chakra it passes through, as the descent names it. */
	chakra: string;
	/**
	 * Whether the name comes from the supplied dataset or is a proposal of ours, because the
	 * seven gates are not all witnessed there — the brow and the sacral have no portal name
	 * in the 62 entries, only the chakra that carries them.
	 */
	nameSource: 'dataset' | 'proposed';
	/** Sanskrit name of the chakra. */
	sanskrit: string;
	/** Traditional placement. */
	location: string;
	/** The garment Inanna surrenders at this gate. */
	garment: string;
	/** What the surrender asks for, in the app's own words. */
	release: string;
	/** Colour of the centre, used for glow and timeline. */
	color: string;
	/** A dimmer companion colour for gradients. */
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
 * Les trois jours de l'inframonde.
 *
 * Après la racine, Vénus est au plus près du Soleil : c'est la traversée. Trois conjonctions
 * Vénus-Lune s'y succèdent, une par lunaison, et rien ne les distingue l'une de l'autre —
 * d'où un seul nom pour les trois et une seule couleur, grise : celle d'un temps où Vénus
 * n'est plus visible.
 *
 * Un jour de l'inframonde n'a pas la forme d'un chakra : ni nom sanskrit, ni place sur le
 * corps, ni vêtement — rien ne lui est retiré.
 */
export interface UnderworldDay {
	/** 8, 9 puis 10 — les trois rangs qui suivent les sept chakras. */
	index: number;
	key: UnderworldKey;
	/** « Inframonde jour 1 », « jour 2 », « jour 3 ». */
	name: string;
	/** Ce qui se passe pendant cette lunaison. */
	meaning: string;
	/** Gris : le temps de l'invisible. */
	color: string;
	deep: string;
}

export const UNDERWORLD: Readonly<Record<UnderworldKey, UnderworldDay>> = {
	'inframonde-jour-1': {
		index: 8,
		key: 'inframonde-jour-1',
		name: 'Inframonde jour 1',
		meaning:
			'La racine franchie, Vénus entre dans le Soleil. Inanna meurt : ce qu’elle a lâché aux sept portes la précède dans le Grand En-Bas.',
		color: '#6f7480',
		deep: '#2b2f38'
	},
	'inframonde-jour-2': {
		index: 9,
		key: 'inframonde-jour-2',
		name: 'Inframonde jour 2',
		meaning:
			'La traversée continue sans lumière. Inanna est jugée, mise à mort et suspendue : rien n’en paraît au-dehors.',
		color: '#7b808c',
		deep: '#31353f'
	},
	'inframonde-jour-3': {
		index: 10,
		key: 'inframonde-jour-3',
		name: 'Inframonde jour 3',
		meaning:
			'La dernière lunaison de l’invisible. Vénus est au plus près du Soleil avant de reparaître : Inanna remonte, dépouillée.',
		color: '#878c99',
		deep: '#373b46'
	}
} as const;

/** Les trois jours, dans l'ordre. */
export const UNDERWORLD_DAYS: readonly UnderworldDay[] = [
	UNDERWORLD['inframonde-jour-1'],
	UNDERWORLD['inframonde-jour-2'],
	UNDERWORLD['inframonde-jour-3']
];

/**
 * Un seuil : la mort en entrant dans l'inframonde, la vie en en sortant.
 *
 * Il est gardé tel quel, et il n'est pas un quatrième jour : c'est le franchissement lui-même,
 * à l'instant où Vénus disparaît dans le Soleil ou en reparaît. Il n'a donc ni chakra ni
 * couleur de chakra.
 */
export interface Threshold {
	/** 11 — après les sept chakras et les trois jours. */
	index: number;
	key: ThresholdKey;
	name: string;
	meaning: string;
	/** Lequel des deux seuils. */
	star: 'morning' | 'evening';
	/** L'événement du ciel auquel il s'ancre. */
	anchor: string;
	color: string;
	deep: string;
}

export const THRESHOLDS: Readonly<Record<ThresholdKey, Threshold>> = {
	'mort-intentionnelle': {
		index: 11,
		key: 'mort-intentionnelle',
		name: 'Mort intentionnelle',
		meaning:
			'La descente s’achève : Vénus disparaît dans le Soleil. Inanna meurt, et ce qu’elle a lâché aux sept portes la précède.',
		star: 'morning',
		anchor: 'coucher héliaque de Vénus, quelques jours avant la conjonction inférieure',
		color: '#5b6270',
		deep: '#252932'
	},
	'vie-intentionnelle': {
		index: 11,
		key: 'vie-intentionnelle',
		name: 'Vie intentionnelle',
		meaning:
			'La sortie de l’enfer : Vénus reparaît en étoile du soir. Inanna remonte, non plus couronnée mais intentionnelle.',
		star: 'evening',
		anchor: 'lever héliaque de Vénus, quelques jours après la conjonction inférieure',
		color: '#aab0bd',
		deep: '#3a3f4a'
	}
} as const;

/**
 * Le sommet d'une moitié : sept chakras, trois jours d'inframonde, un seuil.
 *
 * Onze portails, dans cet ordre à la descente. À l'ascension les sept chakras se lisent à
 * l'envers — de la racine vers la couronne — et la traversée ouvre la moitié plutôt que de
 * la fermer, puisque c'est par elle que Vénus reparaît.
 */
export const PORTALS_PER_HALF = GATE_COUNT + UNDERWORLD_DAYS.length + 1;

/**
 * Le seuil de vie et de mort n'existe que dans les cycles assez fournis.
 *
 * Le cycle entier compte ses conjonctions Vénus-Lune, et ce total décide de la forme :
 *
 * - **17 conjonctions ou moins** : sept chakras par moitié, trois jours d'inframonde, et *pas*
 *   de portail de vie ni de mort — 7 + 3 + 7 ;
 * - **plus de 17** (le cas le plus fréquent) : huit chakras par moitié, puis les jours qui
 *   restent, et le seuil s'ajoute — 8 + 2 + 8 avec la mort et la vie.
 *
 * Le seuil n'est pas une conjonction Vénus-Lune : Vénus seule entre dans le Soleil ou en
 * ressort, au coucher puis au lever héliaques. Il s'ajoute donc aux conjonctions au lieu d'en
 * consommer une, et c'est ce qui fait tomber le compte.
 */
export const CYCLE_TOTAL_THRESHOLD = 17;

export interface CycleShape {
	/** Le total de conjonctions Vénus-Lune du cycle, tel que mesuré. */
	total: number;
	/** Nombre de chakras par moitié : sept, ou huit. */
	chakrasParMoitie: number;
	/** Le cycle porte-t-il le portail de vie et de mort ? */
	avecSeuil: boolean;
}

export function cycleShape(total: number): CycleShape {
	const avecSeuil = total > CYCLE_TOTAL_THRESHOLD;
	return {
		total,
		chakrasParMoitie: avecSeuil ? GATE_COUNT + 1 : GATE_COUNT,
		avecSeuil
	};
}

/** Le rang du seuil : le onzième, après les sept chakras et les trois jours. */
export const THRESHOLD_RANK = PORTALS_PER_HALF;

/**
 * La descente va du sommet vers la racine, l'ascension suit le chemin inverse.
 *
 * C'est la même échelle parcourue dans les deux sens : Inanna se dépouille en descendant
 * (couronne d'abord, racine ensuite) et remonte en reprenant les mêmes centres, de la racine
 * vers la couronne. La seconde moitié du cycle — l'étoile du soir — se lit donc dans l'ordre
 * croissant des chakras.
 */
export const GATES_DESCENDING: readonly Gate[] = GATES;
export const GATES_ASCENDING: readonly Gate[] = [...GATES].reverse();

/**
 * L'ordre des chakras pour une moitié du cycle, sur `count` portails.
 *
 * Sept dans un cycle court : la descente va de la couronne à la racine, l'ascension de la racine
 * à la couronne. Huit dans un cycle fourni : le huitième reprend le premier centre du parcours —
 * la couronne à la descente, la racine à l'ascension —, parce que le cycle repasse par son point
 * de départ avant la traversée.
 */
export function chakraSequence(star: 'morning' | 'evening', count: number): readonly Gate[] {
	const base = star === 'morning' ? GATES_DESCENDING : GATES_ASCENDING;
	const out: Gate[] = [];
	for (let i = 0; i < count; i++) out.push(base[i % base.length]);
	return out;
}

/** The gate for a 1-based rank of the descent, 1 to 7. */
export function gateForIndex(index: number): Gate {
	const i = ((index - 1) % GATE_COUNT + GATE_COUNT) % GATE_COUNT;
	return GATES[i];
}

/** Ce portail est-il un jour de l'inframonde ? */
export function isUnderworldKey(key: string): key is UnderworldKey {
	return key.startsWith('inframonde-jour-');
}

/** Le jour de l'inframonde pour un rang, ou `undefined` au-delà des trois jours. */
export function underworldDayForIndex(index: number): UnderworldDay | undefined {
	return UNDERWORLD_DAYS[index - 1];
}

/**
 * Positions and sizes of the seven centres inside the chakra figure.
 *
 * These are *measured from the image*, not eyeballed. Each chakra is painted in its own
 * hue, so the PNG can be segmented by colour: the script took the strongly coloured
 * pixels of each band, split them into connected components, and kept the component that
 * straddles the figure's vertical axis — which is the chakra symbol itself, rather than
 * the outline of the body drawn over the same rows.
 *
 * The result is that all seven centres sit on one axis (x from 297.5 to 299.0 of 600)
 * and that their radii differ a lot: the solar-plexus and sacral symbols are 85 px
 * across, the brow only 46 px. A single ring size would either swallow the small ones or
 * float inside the large ones, so each centre carries its own measured radius.
 *
 * Stored as fractions of the image box so the overlay scales with it.
 */
export interface ChakraSpot {
	key: GateKey;
	/** Fraction of image width, 0..1 from the left. */
	x: number;
	/** Fraction of image height, 0..1 from the top. */
	y: number;
	/** Measured radius of the symbol, as a fraction of image width. */
	r: number;
}

export const CHAKRA_IMAGE = {
	/** Intrinsic size, used for the aspect ratio box. */
	width: 600,
	height: 823,
	/** The image is not ours; credit it wherever it appears. */
	source: 'https://jothishi.com/wp-content/uploads/2019/05/The-seven-chakras.png',
	attribution: 'jothishi.com'
} as const;

/**
 * x, y and r in source pixels, straight from the segmentation.
 *
 * The root symbol is small and drawn in several pieces, so its entry is the extent of all
 * its red components together rather than the largest single one.
 */
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
