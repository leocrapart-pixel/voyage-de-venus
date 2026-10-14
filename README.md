# Le Voyage de Vénus

**En ligne : <https://voyage-de-venus.pages.dev>** · code : <https://github.com/leocrapart-pixel/voyage-de-venus>

Une application web qui calcule le **cycle synodique de Vénus** dans le navigateur et le
raconte comme une descente : celle d'Inanna, qui franchit sept portes et abandonne à
chacune un vêtement de sa royauté.

L'application est une SPA Svelte 5 (runes), sans serveur : tout — éphéméride, cycle,
portails — est calculé côté client à partir d'[Astronomy Engine](https://github.com/cosinekitty/astronomy).

```bash
npm install
npm run dev        # http://localhost:5180
```

```bash
npm run build      # SPA statique dans build/
npm run preview    # http://localhost:4180
npm test           # 89 tests : éphéméride, cycle, jeu de données, pages
npm run check      # svelte-check / TypeScript
```

## Déploiement

Le site est servi par **Cloudflare Pages**, projet `voyage-de-venus`, sur le sous-domaine
**<https://voyage-de-venus.pages.dev>** (branche de production : `main`).

```bash
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npm run deploy
```

Les jetons se passent **par variables d'environnement**, jamais dans un fichier du dépôt :
`.env*` est ignoré par Git, et rien de tel n'a été committé. Le déploiement automatique sur
push n'est pas câblé — le brancher demanderait de stocker un jeton dans les secrets GitHub,
ce qui n'a pas été fait sans ton accord.

`npm run deploy` construit puis téléverse `build/` avec `wrangler pages deploy`. Le dépôt
GitHub <https://github.com/leocrapart-pixel/voyage-de-venus> contient les mêmes sources.

Deux notes pour un déploiement manuel :

- Le projet étant en `adapter-static` avec un `index.html` de repli, les routes profondes
  fonctionnent sans configuration serveur : `build/` est un dossier de fichiers, un point.
- Juste après un déploiement, la première requête sur un actif peut renvoyer une erreur 522
  pendant que l'edge se propage ; une seconde requête quelques secondes plus tard sert le
  fichier normalement. Ce n'est pas un défaut de configuration.

## Ce que calcule l'application

| Élément | Comment il est obtenu |
| --- | --- |
| Cycle synodique | Deux conjonctions inférieures successives, cherchées dans l'éphéméride |
| Étoile du matin / du soir | Signe de l'élongation écliptique : à l'ouest du Soleil, ou à l'est |
| Conjonctions inférieure / supérieure | Vénus rétrograde (elle passe entre la Terre et le Soleil) ou directe |
| Rétrogradation | Deux passages par zéro de la vitesse en longitude, par bisection |
| Inframonde | Les deux franchissements du seuil d'élongation autour de la conjonction inférieure |
| Portails | Conjonctions Vénus-Lune, cherchées par bisection de l'écart de longitude |
| Chakras | Attribués dans l'ordre de la descente, de la couronne à la racine |

## Le cycle est mesuré, jamais supposé

Le chiffre familier est **584 jours**. C'est une moyenne : les cycles réels vont de **580 à
588 jours**, parce que l'orbite de Vénus est excentrique et inclinée. L'application ne code
donc nulle part 584 — elle cherche les dates, et affiche la durée réelle du cycle en cours.
Sur 2020-2038, mesuré avec cette même base de code :

- cinq cycles synodiques font **2 919,68 jours = 7,9938 ans** : la résonance de huit ans,
  celle du pentagramme que Vénus trace dans le ciel ;
- les conjonctions inférieures se suivent à **581,4 / 584,3 / 586,3 / 587,6 jours** selon le
  cycle ;
- chaque moitié — étoile du matin, étoile du soir — dure environ **292 jours**, et non 260 ;
- la rétrogradation dure **41 à 43 jours**.

### L'inframonde dépend d'un seuil, donc il est réglable

La durée pendant laquelle Vénus est invisible n'est pas une constante : elle dépend de
l'*arcus visionis*, l'élongation minimale à laquelle la planète redevient visible dans le
crépuscule. Près de la conjonction inférieure, l'élongation de Vénus varie d'environ
1,6°/jour, ce qui donne, pour le cycle de 2023-2025 :

| Seuil | Inframonde |
| --- | --- |
| 3° | 3,8 jours |
| 5° (défaut) | 6,4 jours |
| 10° | 12,9 jours |
| 20° | 27 jours |

Un seuil de 20 à 40° produirait bien les « 60 à 90 jours » que l'on lit parfois, mais ce
n'est plus de l'invisibilité : c'est une large zone de crépuscule. L'interface expose donc
le seuil, affiche la durée qui en découle, et ne prétend pas qu'il s'agit d'une constante.

### Les sept portails sont attribués, pas détectés

Un cycle contient **19 à 23 conjonctions Vénus-Lune**, à peu près également réparties entre
les deux moitiés. Le nombre ne peut donc pas être « sept ». Ce qui est fixe, c'est l'ordre
de la descente : la première conjonction d'une moitié ouvre la couronne, la suivante le
front, et ainsi de suite jusqu'à la racine — puis la couronne à nouveau, puisqu'une moitié
compte une dizaine de conjonctions pour sept chakras.

Puisqu'une moitié du cycle contient une dizaine de conjonctions pour sept chakras, le même
chakra est franchi deux fois : la couronne est ouverte au premier rang, puis de nouveau au
huitième. L'application affiche donc, pour chaque centre, **sa prochaine occurrence** — et
non la première du cycle, qui serait une date de plusieurs mois dans le passé.

L'orbe ne décide donc pas *si* une porte existe, mais *si elle compte*. La conjonction est
zodiacale — même longitude écliptique — tandis que l'orbe est la séparation réelle dans le
ciel, qui grandit avec la latitude écliptique de la Lune (jusqu'à 5,3°). Sur 242
conjonctions de 2018 à 2038, la séparation médiane est de **3,4°** et **42 % seulement**
tombent dans un orbe de 3°. Le 16 août 2023, la Lune et Vénus sont à la même longitude mais
à **12,6°** l'une de l'autre : la porte est franchie au sens zodiacal, manquée dans le ciel.

## Lire l'interface

- **Le bandeau** annonce ce qui se passe : portail ouvert, descente dans l'inframonde, ou
  prochaine conjonction, avec le nombre de jours.
- **La frise** montre le cycle entier : rétrogradation en rouge, inframonde en violet,
  conjonction supérieure au milieu, et une graduation par conjonction Vénus-Lune — pleine
  quand la porte compte, pâle quand l'orbe est manqué. Cliquez la frise pour voyager dans le
  temps ; le curseur blanc est le moment observé.
- **Le cadran** met le même cycle en un tour : matin à droite, soir à gauche, rétrogradation
  et inframonde au sommet autour de la conjonction inférieure.
- **Les sept centres** s'allument sur la figure : ouvert, prochain, franchi, ou voilé.
  Cliquez un centre pour lire le vêtement abandonné et la conjonction qui le porte.
- **Les réglages** — seuil d'invisibilité, orbe d'ouverture, portail serré — changent la
  lecture sans changer le ciel.
- **La page `/portails`** présente le jeu de données 1952-2001 audité (voir plus bas) :
  degré mesuré face au degré annoncé, phase réelle, visibilité, et les 62 descriptions
  d'origine.

Clavier : `←` / `→` pour un jour, `maj` + flèches pour une semaine, `n` pour maintenant.

## La figure des chakras

L'image d'origine vient de [jothishi.com](https://jothishi.com/wp-content/uploads/2019/05/The-seven-chakras.png).
Elle n'est pas utilisée telle quelle : `tools/make-dark-figure.py` en produit l'édition
sombre, et il fait trois choses précises.

1. **Le papier devient transparent.** L'original est un dessin au trait sur fond blanc.
2. **La luminance est inversée, pas l'image.** Un `invert()` CSS ferait tourner toutes les
   teintes — la racine rouge deviendrait cyan — or ces couleurs portent du sens.
3. **Chaque centre est ramené à sa teinte canonique.** Dans l'original, la couronne et le
   front sont tous deux violets ; l'édition sombre les sépare (288° et 265°). Le script
   vérifie lui-même le résultat et affiche la teinte mesurée de chacun des sept centres.

Les **positions et les rayons** des sept centres ne sont pas estimés à l'œil : ils sont
mesurés dans l'image. Chaque chakra étant peint dans sa propre teinte, le PNG est segmenté
par couleur, les pixels obtenus sont découpés en composantes connexes, et l'on garde la
composante qui chevauche l'axe vertical de la figure — c'est le symbole du chakra, et non le
contour du corps dessiné sur les mêmes lignes. Les sept centres tombent ainsi sur un même
axe (x de 297,5 à 299,0 sur 600) et leurs rayons varient du simple au double (43 px pour le
plexus solaire, 24 px pour le front), ce qui justifie un anneau par centre plutôt qu'une
taille unique. Ces valeurs sont dans `src/lib/symbolic/gates.ts` et vérifiées par les tests.

## Les nombres sont vérifiés, pas racontés

`src/lib/astro/ephemeris.test.ts` ancre le repère tropical sur des instants publiés plutôt
que sur sa propre sortie :

- le Soleil est exactement à 0/90/180/270° de longitude tropicale à dix équinoxes et
  solstices de 2000 à 2030, à moins de deux minutes d'arc ;
- la grande conjonction Jupiter-Saturne du 21 décembre 2020 tombe à 0°29′ du Verseau ;
- la Lune ne quitte jamais l'écliptique de plus de 5,4°, le Soleil de plus de quelques
  secondes d'arc.

`src/lib/astro/cycle.test.ts` épingle le cycle à des événements publiés : conjonctions
inférieure et supérieure de 2023 à 2026 à moins de deux heures, stations rétrogrades de
2023 à moins de six heures, durées de rétrogradation, longueurs d'inframonde aux quatre
seuils, orbes de conjonctions Vénus-Lune, et la résonance de huit ans.

`src/lib/components/page.test.ts` monte la vraie page dans un DOM et vérifie ce que seul un
navigateur peut casser : la porte ouverte annoncée est bien celle de la conjonction en
cours, le détail affiche la conjonction de la bonne moitié du cycle, les sept anneaux
tombent aux positions et rayons mesurés, et régler le seuil d'invisibilité allonge bien la
bande de l'inframonde.

## Le jeu de données 1952-2001

`src/lib/data/portails-venus.ts` contient 62 événements datés de 1952 à 2001, avec le
portail et le chakra que l'auteur du jeu leur associe. Il a été **audité contre
l'éphéméride** avant d'entrer dans le dépôt, et le résultat est sans ambiguïté.

| Ce qui était annoncé | Ce que dit le ciel |
| --- | --- |
| Un degré du zodiaque par ligne | **6 lignes sur 61** portent le bon signe, **aucune** le bon degré. Le hasard en donnerait 5 : les degrés ne sont pas corrélés au ciel. |
| Des phases cohérentes | 2 lignes se contredisent (1965-08-22 annoncée « Étoile du Matin » alors que Vénus est à +34° à l'est du Soleil ; 1985-12-01 l'inverse). |
| Des dates d'événements | **Celles-ci tiennent.** Elles tombent pour la plupart à quelques jours d'une conjonction inférieure, supérieure ou d'une station réelle. |

Le rapport complet, ligne par ligne, est dans `tools/portails/rapport-audit.md` ; il est
régénérable par `npx vitest run --config tools/portails/audit.config.ts`.

Le jeu committé sépare donc deux couches :

- **la couche symbolique est intacte** — portail, chakra et description sont repris mot pour
  mot, y compris les lacunes (`Portail de la Vie Intentionnelle` n'a pas de chakra dans le
  jeu d'origine, et on ne lui en invente pas un) ;
- **la couche astronomique est recalculée** — degré, longitude, élongation, visibilité,
  sens de marche et cycle d'appartenance sont mesurés.

Les valeurs d'origine restent lisibles dans `degreAnnonce` et `phaseAnnoncee`, pour que
l'écart demeure vérifiable plutôt que d'être effacé. `src/lib/data/portails.test.ts` rejoue
la vérification de l'autre côté : il confronte les valeurs committées à l'éphéméride, si
bien que le générateur ne peut pas dériver sans que la suite échoue.

## Organisation

```
src/lib/astro/ephemeris.ts    longitudes, séparations, bisection, repère tropical
src/lib/astro/cycle.ts        cycle synodique, phases, rétrogradation, portails, chakras
src/lib/symbolic/gates.ts     les sept portes, et la géométrie mesurée de la figure
src/lib/data/portails-venus.ts   le jeu 1952-2001, couche astronomique recalculée
src/lib/data/portails-types.ts   le vocabulaire des phases et des chakras
src/lib/format.ts             dates, degrés et longitudes en français
src/lib/components/           CycleRing, CycleTimeline, ChakraDiagram, JourneyReadings, TimeControls
src/routes/+page.svelte       la page : état, débounce, mise en page
tools/make-dark-figure.py     construit l'édition sombre de la figure
tools/portails/audit.ts       audite le jeu 1952-2001 et régénère le rapport + le jeu corrigé
```

Le calcul complet d'un voyage coûte **environ 100 ms** (recherche des conjonctions sur
plusieurs années d'éphéméride), et il est refait à chaque changement de date. La page
débounce donc le moment choisi de 140 ms : une rafale de clics ou un glissement sur la frise
coûte un recalcul, pas un par événement.

`+layout.ts` pose `ssr = false` : l'application est une SPA, sans rendu serveur. Le build
produit un `index.html` et des actifs, servables par n'importe quel hébergeur statique
(GitHub Pages, Cloudflare Pages, Netlify) — pas de runtime Node, pas de fonction.

## Notes

- SvelteKit 3 exige sa configuration dans le plugin Vite (`vite.config.ts`) ; il n'y a plus
  de `svelte.config.js`. Il émet un avertissement demandant d'étendre `$app/tsconfig`, une
  entrée qui n'existe pas dans `@sveltejs/kit` 3.0.1 — le projet déclare donc ses propres
  options de compilation dans `tsconfig.json`, et `svelte-check` passe sans erreur.
- `$types` est ré-exporté par `src/routes/$types.d.ts`, car les types de routes générés
  vivent dans `.svelte-kit/types/src/routes/` et l'import relatif `./$types` ne résout pas
  depuis les routes.
- **Astronomy Engine (MIT) est la seule dépendance d'exécution.** Le projet avait été
  envisagé avec `@swisseph/browser` (éphéméride Swiss Ephemeris compilée en WebAssembly) :
  ce paquet existe et fonctionne, mais il est sous AGPL-3.0, pèse ~250 Ko de WASM de plus,
  expose une API asynchrone, et sa précision — sous la seconde d'arc — dépasse largement le
  besoin, qui est à l'heure près. Un seul moteur, donc, et une seule source de vérité pour
  ces calculs.
