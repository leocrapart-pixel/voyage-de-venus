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

/** The two thresholds that close a half: the death going down, the life coming up. */
export type ThresholdKey = 'mort-intentionnelle' | 'vie-intentionnelle';

/** Anything a portal can open. */
export type PortalKey = GateKey | ThresholdKey;

export interface Gate {
	/** 1..7, the order of the descent — crown first, root last. */
	index: number;
	key: GateKey;
	/** French name, as used by the interface. */
	name: string;
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
		name: 'Couronne',
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
		name: 'Front',
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
		name: 'Gorge',
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
		name: 'Cœur',
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
		name: 'Plexus solaire',
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
		name: 'Ventre',
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
		name: 'Racine',
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
 * A threshold is deliberately not shaped like a chakra: no Sanskrit name, no place on the
 * body, no garment. What happens there is that she dies and is given back.
 */
export interface Threshold {
	/** 8 — it always follows the seven chakras. */
	index: 8;
	key: ThresholdKey;
	name: string;
	/** What the threshold is, and what it is anchored to. */
	meaning: string;
	/** Which half of the cycle it closes. */
	star: 'morning' | 'evening';
	/** The astronomical event it marks. */
	anchor: string;
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
		anchor: 'coucher héliaque de Vénus, quelques jours avant la conjonction inférieure',
		color: '#7c8494',
		deep: '#2b2f3a'
	},
	'vie-intentionnelle': {
		index: 8,
		key: 'vie-intentionnelle',
		name: 'Vie intentionnelle',
		meaning:
			'La sortie de l’enfer : Vénus reparaît en étoile du soir. Inanna remonte, non plus couronnée mais intentionnelle.',
		star: 'evening',
		anchor: 'lever héliaque de Vénus, quelques jours après la conjonction inférieure',
		color: '#f2e7c9',
		deep: '#4a4433'
	}
} as const;

/** The gate for a 1-based rank of the descent, 1 to 7. */
export function gateForIndex(index: number): Gate {
	const i = ((index - 1) % GATE_COUNT + GATE_COUNT) % GATE_COUNT;
	return GATES[i];
}

/**
 * What a rank opens in a given half of the cycle.
 *
 * Ranks 1 to 7 are the chakras, in the order of the descent. Rank 8 exists only in a half
 * that holds eight observable conjunctions, and it is the threshold: the death on the way
 * down, the life on the way back up.
 */
export function portalForRank(rank: number, star: 'morning' | 'evening'): Gate | Threshold {
	if (rank >= 8) return star === 'morning' ? THRESHOLDS['mort-intentionnelle'] : THRESHOLDS['vie-intentionnelle'];
	return gateForIndex(rank);
}

export function gateByKey(key: GateKey): Gate {
	const found = GATES.find((g) => g.key === key);
	if (!found) throw new Error(`Unknown gate: ${key}`);
	return found;
}

export function isThresholdKey(key: string): key is ThresholdKey {
	return key === 'mort-intentionnelle' || key === 'vie-intentionnelle';
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
