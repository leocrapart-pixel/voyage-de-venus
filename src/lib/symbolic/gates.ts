/**
 * The seven gates of the descent.
 *
 * In the Sumerian poem *Inanna's Descent to the Netherworld*, the queen of heaven
 * passes seven gates on her way down. At each one the gatekeeper strips a garment of
 * her royal dress, so she arrives before her sister Ereshkigal with nothing left —
 * authority dismantled, one piece at a time, from the crown downwards.
 *
 * The Voyage de Vénus maps that descent onto the seven chakras, in the same
 * top-down order. This file is the single source of the symbolism; the astronomy
 * layer hands each Moon-Venus conjunction a 1-based rank and asks for the gate here.
 */

export type GateKey = 'crown' | 'brow' | 'throat' | 'heart' | 'solar' | 'sacral' | 'root';

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

/** The gate for a 1-based rank, wrapping every seven: rank 8 opens the crown again. */
export function gateForIndex(index: number): Gate {
	const i = ((index - 1) % GATE_COUNT + GATE_COUNT) % GATE_COUNT;
	return GATES[i];
}

export function gateByKey(key: GateKey): Gate {
	const found = GATES.find((g) => g.key === key);
	if (!found) throw new Error(`Unknown gate: ${key}`);
	return found;
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
