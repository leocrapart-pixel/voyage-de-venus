/**
 * Le Voyage de Vénus, 1952-2001.
 *
 * Les 62 entrées du jeu fourni, transcrites telles quelles : dates, degrés, phases,
 * portails, chakras et descriptions. **Rien n'est recalculé ni corrigé ici.** Les degrés
 * sont ceux de l'auteur, conservés parce qu'ils portent sa lecture du cycle ;
 * `tools/portails/audit.test.ts` les confronte à l'éphéméride et publie l'écart, sans
 * jamais réécrire le fichier.
 *
 * Ce que le jeu apporte de solide, en revanche, c'est le **nom des portails** : sa
 * correspondance portail-chakra est sans ambiguïté sur les 34 entrées qui portent les
 * deux, et c'est elle qui a donné aux sept portes leurs noms (voir `symbolic/gates.ts`).
 */

export type PhaseType =
	| 'Ascension / Étoile du Soir'
	| 'Descente / Étoile du Matin'
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

export interface PortailVenus {
	id: string;
	/** Date ISO (AAAA-MM-JJ). */
	date: string;
	/** Degré du zodiaque tel que le jeu le donne. */
	degre: string;
	phase: PhaseType;
	portail?: string;
	chakra?: ChakraType;
	description: string;
}

export const voyageVenusData: PortailVenus[] = [
	{
		id: "1952-12-25",
		date: "1952-12-25",
		degre: "10° ♍",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Communication",
		chakra: "Gorge" as ChakraType,
		description: "Inanna remonte vers la lumière, prête à exprimer sa vérité.",
	},
	{
		id: "1954-12-24",
		date: "1954-12-24",
		degre: "22° ♍",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Connexion à sa souveraineté intérieure.",
	},
	{
		id: "1955-04-22",
		date: "1955-04-22",
		degre: "22° ♍",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Lâcher-prise sur le besoin de contrôle.",
	},
	{
		id: "1960-06-15",
		date: "1960-06-15",
		degre: "08° ♍",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 16/06.",
	},
	{
		id: "1960-08-12",
		date: "1960-08-12",
		degre: "08° ♍",
		phase: "Inframonde JOUR 03" as PhaseType,
		description: "Lever de Venus en Étoile du Soir ~ Inanna, revitalisée, émerge de l'Inframonde (visible à 15° ♍).",
	},
	{
		id: "1961-03-15",
		date: "1961-03-15",
		degre: "08° ♍",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Affirmation de sa puissance après la traversée.",
	},
	{
		id: "1961-04-22",
		date: "1961-04-22",
		degre: "20° ♈",
		phase: "Inframonde Métamorphique Visible" as PhaseType,
		description: "Venus Rx ~ post conjonction inférieure. Inanna 'se montre' métamorphosée (visible le 17/04 à 17° ♈).",
	},
	{
		id: "1962-06-04",
		date: "1962-06-04",
		degre: "20° ♈",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Pile le jour du portail ! Activation de la volonté.",
	},
	{
		id: "1963-04-01",
		date: "1963-04-01",
		degre: "19° ♉",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Compassion",
		chakra: "Cœur" as ChakraType,
		description: "Ouverture du cœur et guérison émotionnelle.",
	},
	{
		id: "1963-04-22",
		date: "1963-04-22",
		degre: "19° ♉",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Renforcement de la confiance en soi.",
	},
	{
		id: "1963-06-25",
		date: "1963-06-25",
		degre: "19° ♉",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Manifestation",
		chakra: "Racine" as ChakraType,
		description: "Ancrage et matérialisation des intentions.",
	},
	{
		id: "1964-10-04",
		date: "1964-10-04",
		degre: "28° ♊",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Communication",
		chakra: "Gorge" as ChakraType,
		description: "Expression authentique de soi.",
	},
	{
		id: "1965-08-22",
		date: "1965-08-22",
		degre: "28° ♊",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Alignement avec sa force intérieure.",
	},
	{
		id: "1966-02-04",
		date: "1966-02-04",
		degre: "05° ♋",
		phase: "Inframonde Métamorphique Visible" as PhaseType,
		description: "Venus Rx ~ post conjonction inférieure. Inanna 'se montre' métamorphosée (visible le 01/02 à 02° ♋).",
	},
	{
		id: "1966-05-04",
		date: "1966-05-04",
		degre: "05° ♋",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Communication",
		chakra: "Gorge" as ChakraType,
		description: "Partage de la sagesse acquise.",
	},
	{
		id: "1966-06-29",
		date: "1966-06-29",
		degre: "05° ♋",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Affirmation de sa vérité.",
	},
	{
		id: "1966-08-06",
		date: "1966-08-06",
		degre: "05° ♋",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Créativité",
		chakra: "Sacré" as ChakraType,
		description: "Réveil de la force créatrice.",
	},
	{
		id: "1966-09-12",
		date: "1966-09-12",
		degre: "05° ♋",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Manifestation",
		chakra: "Racine" as ChakraType,
		description: "Enracinement des projets.",
	},
	{
		id: "1968-08-09",
		date: "1968-08-09",
		degre: "05° ♌",
		phase: "Inframonde JOUR 03" as PhaseType,
		description: "Lever de Venus en Étoile du Soir ~ Inanna, revitalisée, émerge de l'Inframonde (visible à 13° ♌).",
	},
	{
		id: "1968-09-03",
		date: "1968-09-03",
		degre: "05° ♌",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Manifestation",
		chakra: "Racine" as ChakraType,
		description: "Construction de nouvelles fondations.",
	},
	{
		id: "1970-05-25",
		date: "1970-05-25",
		degre: "18° ♍",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Rayonnement de sa puissance.",
	},
	{
		id: "1970-09-05",
		date: "1970-09-05",
		degre: "18° ♍",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Connexion au divin.",
	},
	{
		id: "1970-10-06",
		date: "1970-10-06",
		degre: "18° ♍",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Vie Intentionnelle",
		description: "Alignement avec sa mission d'âme.",
	},
	{
		id: "1971-10-09",
		date: "1971-10-09",
		degre: "17° ♎",
		phase: "Inframonde JOUR 03" as PhaseType,
		description: "Lever de Venus en Étoile du Soir ~ Inanna, revitalisée, émerge de l'Inframonde (visible à 20° ♎).",
	},
	{
		id: "1971-10-26",
		date: "1971-10-26",
		degre: "17° ♎",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Manifestation",
		chakra: "Racine" as ChakraType,
		description: "Incarnation de ses désirs.",
	},
	{
		id: "1972-06-19",
		date: "1972-06-19",
		degre: "26° ♏",
		phase: "Inframonde Métamorphique Invisible" as PhaseType,
		description: "Venus Rx ~ post conjonction inférieure. Inanna 'change de forme' : elle enfile la tenue royale qu'elle a dérobée.",
	},
	{
		id: "1972-07-25",
		date: "1972-07-25",
		degre: "26° ♏",
		phase: "Descente / Étoile du Matin" as PhaseType,
		description: "Venus stationnaire -> Inanna 'métamorphosée' se lance dans la Descente au Grand En-Bas, plus déterminée que jamais.",
	},
	{
		id: "1972-10-22",
		date: "1972-10-22",
		degre: "26° ♏",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Communication",
		chakra: "Gorge" as ChakraType,
		description: "Expression de sa transformation.",
	},
	{
		id: "1973-03-17",
		date: "1973-03-17",
		degre: "26° ♏",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 28/02 à 00° ♓.",
	},
	{
		id: "1973-12-08",
		date: "1973-12-08",
		degre: "26° ♏",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Souveraineté retrouvée.",
	},
	{
		id: "1974-01-28",
		date: "1974-01-28",
		degre: "03° ♐",
		phase: "Inframonde Métamorphique Invisible" as PhaseType,
		description: "Venus Rx ~ post conjonction inférieure. Inanna 'change de forme' : elle enfile la tenue royale qu'elle a dérobée.",
	},
	{
		id: "1974-06-14",
		date: "1974-06-14",
		degre: "03° ♐",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Compassion",
		chakra: "Cœur" as ChakraType,
		description: "Guérison des blessures du passé.",
	},
	{
		id: "1974-10-14",
		date: "1974-10-14",
		degre: "03° ♐",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 28/09 à 25° ♎.",
	},
	{
		id: "1974-11-23",
		date: "1974-11-23",
		degre: "03° ♐",
		phase: "Inframonde JOUR 02" as PhaseType,
		description: "L'initiation solaire d'Inanna ~ VSP à 13° ♎ le 13/11.",
	},
	{
		id: "1975-06-22",
		date: "1975-06-22",
		degre: "03° ♐",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Sagesse et autorité.",
	},
	{
		id: "1975-09-22",
		date: "1975-09-22",
		degre: "03° ♑",
		phase: "Descente / Étoile du Matin" as PhaseType,
		description: "Venus stationnaire -> Inanna 'métamorphosée' se lance dans la Descente au Grand En-Bas, plus déterminée que jamais.",
	},
	{
		id: "1977-03-20",
		date: "1977-03-20",
		degre: "03° ♑",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		description: "Venus stationnaire -> Fin de l'ascension. Temps de synthèse et de préparation du nouveau cycle (début de la remise en question d'Inanna).",
	},
	{
		id: "1977-06-24",
		date: "1977-06-24",
		degre: "16° ♒",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Reconnexion à sa force.",
	},
	{
		id: "1978-09-15",
		date: "1978-09-15",
		degre: "16° ♒",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Couronnement de son être.",
	},
	{
		id: "1980-07-16",
		date: "1980-07-16",
		degre: "24° ♓",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Manifestation",
		chakra: "Racine" as ChakraType,
		description: "Enracinement dans la matière.",
	},
	{
		id: "1981-03-04",
		date: "1981-03-04",
		degre: "24° ♓",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 26/02 à 27° ♒.",
	},
	{
		id: "1981-03-24",
		date: "1981-03-24",
		degre: "24° ♓",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 26/02 à 27° ♒.",
	},
	{
		id: "1981-05-27",
		date: "1981-05-27",
		degre: "24° ♓",
		phase: "Inframonde JOUR 03" as PhaseType,
		description: "Lever de Venus en Étoile du Soir ~ Inanna, revitalisée, émerge de l'Inframonde (visible à 04° ♈).",
	},
	{
		id: "1982-01-06",
		date: "1982-01-06",
		degre: "24° ♓",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		description: "Venus stationnaire -> Fin de l'ascension. Temps de synthèse et de préparation du nouveau cycle.",
	},
	{
		id: "1982-01-22",
		date: "1982-01-22",
		degre: "01° ♈",
		phase: "Inframonde Métamorphique Invisible" as PhaseType,
		description: "Venus Rx ~ post conjonction inférieure. Inanna 'change de forme' : elle enfile la tenue royale qu'elle a dérobée.",
	},
	{
		id: "1983-03-22",
		date: "1983-03-22",
		degre: "01° ♈",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Nouvelle souveraineté.",
	},
	{
		id: "1984-01-26",
		date: "1984-01-26",
		degre: "01° ♈",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Compassion",
		chakra: "Cœur" as ChakraType,
		description: "Douceur et pardon.",
	},
	{
		id: "1984-09-16",
		date: "1984-09-16",
		degre: "01° ♈",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Compassion",
		chakra: "Cœur" as ChakraType,
		description: "Rayonnement du cœur.",
	},
	{
		id: "1985-12-01",
		date: "1985-12-01",
		degre: "01° ♈",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Créativité",
		chakra: "Sacré" as ChakraType,
		description: "Création inspirée.",
	},
	{
		id: "1986-01-13",
		date: "1986-01-13",
		degre: "14° ♉",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 08/12/1985 à 06° ♉.",
	},
	{
		id: "1986-12-12",
		date: "1986-12-12",
		degre: "12° ♊",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail de la Communication",
		chakra: "Gorge" as ChakraType,
		description: "Parole libérée.",
	},
	{
		id: "1988-02-05",
		date: "1988-02-05",
		degre: "12° ♊",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Manifestation",
		chakra: "Racine" as ChakraType,
		description: "Matérialisation des rêves.",
	},
	{
		id: "1989-01-07",
		date: "1989-01-07",
		degre: "22° ♋",
		phase: "Descente / Étoile du Matin" as PhaseType,
		portail: "Portail du Pouvoir Personnel",
		chakra: "Plexus solaire" as ChakraType,
		description: "Confiance en soi.",
	},
	{
		id: "1989-05-10",
		date: "1989-05-10",
		degre: "22° ♋",
		phase: "Inframonde JOUR 02" as PhaseType,
		description: "L'initiation solaire d'Inanna ~ VSP à 15° ♋ le 04/04.",
	},
	{
		id: "1989-10-09",
		date: "1989-10-09",
		degre: "22° ♋",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de l'Autorité",
		chakra: "Couronne" as ChakraType,
		description: "Sagesse intérieure.",
	},
	{
		id: "1990-10-03",
		date: "1990-10-03",
		degre: "28° ♌",
		phase: "Inframonde JOUR 01" as PhaseType,
		description: "La mort d'Inanna ~ Venus invisible le 23/09 à 20° ♍.",
	},
	{
		id: "1990-12-09",
		date: "1990-12-09",
		degre: "28° ♌",
		phase: "Inframonde JOUR 02" as PhaseType,
		description: "L'initiation solaire d'Inanna ~ VSP à 01/11.",
	},
	{
		id: "1990-12-13",
		date: "1990-12-13",
		degre: "28° ♌",
		phase: "Inframonde JOUR 03" as PhaseType,
		description: "Lever de Venus en Étoile du Soir ~ Inanna, revitalisée, émerge de l'Inframonde (visible à 29° ♍).",
	},
	{
		id: "1993-03-30",
		date: "1993-03-30",
		degre: "Espace Liminal",
		phase: "Espace Liminal" as PhaseType,
		description: "Le cycle n'a pas encore commencé. Nous sommes vraiment ici dans un espace liminal entre le cycle antérieur (29° ♍) et le cycle sur le point de démarrer (11° ♍). Inframonde Métamorphique Invisible (Venus Rx) ~ pré-conjonction inférieure -> Inanna en 'crise / remise en question' ~ Venus invisible le 25/03 à 15° ♍.",
	},
	{
		id: "1994-05-03",
		date: "1994-05-03",
		degre: "11° ♍",
		phase: "Ascension / Étoile du Soir" as PhaseType,
		portail: "Portail de la Communication",
		chakra: "Gorge" as ChakraType,
		description: "Nouveau cycle, nouvelle expression.",
	},
	{
		id: "1995-10-10",
		date: "1995-10-10",
		degre: "10° ♎",
		phase: "Inframonde JOUR 03" as PhaseType,
		description: "Lever de Venus en Étoile du Soir ~ Inanna, revitalisée, émerge de l'Inframonde (visible à 13° ♎).",
	},
	{
		id: "2001-03-31",
		date: "2001-03-31",
		degre: "09° ♎",
		phase: "Inframonde Métamorphique Invisible" as PhaseType,
		description: "Venus Rx ~ post-conjonction inférieure -> ...",
	},
];

/** Le nom du portail pour chaque chakra, tel que le jeu le donne. */
export const portailParChakra: Record<string, string> = {
	"Couronne": "Portail de l'Autorité",
	"Gorge": "Portail de la Communication",
	"Cœur": "Portail de la Compassion",
	"Plexus solaire": "Portail du Pouvoir Personnel",
	"Sacré": "Portail de la Créativité",
	"Racine": "Portail de la Manifestation",
};
