/**
 * Le vocabulaire du Voyage de Vénus tel que l'auteur du jeu de données l'a posé.
 *
 * Ces deux unions viennent du jeu d'origine et sont conservées telles quelles : ce sont
 * des catégories symboliques, pas des mesures. Le moteur astronomique ne les produit
 * jamais et ne les consomme jamais — il produit des faits (`etoile`, `visible`,
 * `elongation`, `joursDeLaConjonctionInferieure`), et l'interface décide comment les
 * raconter.
 *
 * Deux réserves, écrites ici pour qu'elles ne se perdent pas :
 *
 * - Les phases « Inframonde JOUR 01 / 02 / 03 » forment une numérotation narrative. Le
 *   ciel ne connaît qu'une chose mesurable : l'élongation de Vénus au Soleil, qui décide
 *   de la visibilité, et la conjonction inférieure, qui décide du sens de la traversée.
 *   Le jeu corrigé (`portails-venus.ts`) nomme donc les phases d'après ces faits et
 *   laisse les Jour 01/02/03 à la lecture symbolique.
 * - « Vie Intentionnelle » n'est pas un chakra traditionnel : c'est une huitième porte
 *   ajoutée par l'auteur, qui apparaît une fois dans les données (1970-10-06). Elle est
 *   gardée comme telle plutôt que fondue dans un chakra existant.
 */

export type PhaseType =
	| 'Ascension / Étoile du Soir'
	| 'Descente / Étoile du Matin'
	| 'Inframonde'
	| 'Conjonction inférieure'
	| 'Conjonction supérieure'
	| 'Inframonde JOUR 01'
	| 'Inframonde JOUR 02'
	| 'Inframonde JOUR 03'
	| 'Inframonde Métamorphique Visible'
	| 'Inframonde Métamorphique Invisible'
	| 'Espace Liminal';

export type ChakraType =
	| 'Couronne'
	| 'Troisième œil'
	| 'Gorge'
	| 'Cœur'
	| 'Plexus solaire'
	| 'Sacré'
	| 'Racine'
	| 'Vie Intentionnelle';

/**
 * Les sept centres de la descente, dans l'ordre où Inanna les franchit — du sommet vers
 * la racine. C'est l'ordre que le moteur applique aux conjonctions Vénus-Lune.
 */
export const CHAKRAS_DESCENDANTS: readonly ChakraType[] = [
	'Couronne',
	'Troisième œil',
	'Gorge',
	'Cœur',
	'Plexus solaire',
	'Sacré',
	'Racine'
] as const;

/** Libellés français des phases, pour l'affichage. */
export const PHASE_LABELS: Record<PhaseType, string> = {
	'Ascension / Étoile du Soir': 'Ascension · étoile du soir',
	'Descente / Étoile du Matin': 'Descente · étoile du matin',
	Inframonde: 'Inframonde',
	'Conjonction inférieure': 'Conjonction inférieure',
	'Conjonction supérieure': 'Conjonction supérieure',
	'Inframonde JOUR 01': 'Inframonde, jour 01',
	'Inframonde JOUR 02': 'Inframonde, jour 02',
	'Inframonde JOUR 03': 'Inframonde, jour 03',
	'Inframonde Métamorphique Visible': 'Inframonde métamorphique, visible',
	'Inframonde Métamorphique Invisible': 'Inframonde métamorphique, invisible',
	'Espace Liminal': 'Espace liminal'
};
