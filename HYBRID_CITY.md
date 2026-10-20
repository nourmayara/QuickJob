# QuickJob City — Votre parcours, votre choix

La Home combine le fil QuickJob et une exploration libre de la ville existante. Le parcours, l’étape et le secteur sélectionnés alimentent la même présentation : texte, cadrage, point lumineux, état des boutons et destination de l’action principale.

## Expérience

- Deux intentions visibles dès l’arrivée : « Je cherche une mission » et « Je veux recruter ».
- Travailleur : Découvrir → Postuler → Suivre.
- Recruteur : Publier → Examiner → Sélectionner.
- Chaque étape est accessible directement. Le dernier emplacement dans chaque parcours est conservé pendant la visite.
- Les cinq points d’intérêt présentent des secteurs : restauration, commerce, événementiel, logistique et bureaux. Cliquer un lieu sélectionne son contexte dans le même parcours. Aucun nombre de missions, candidat ou disponibilité fictive n’est présenté.
- « Explorer la ville » affiche tous les secteurs. Sur mobile, l’action rejoint la ville et place le focus sur ses contrôles ; sur desktop, elle évite un déplacement de page si la ville est déjà visible.
- Le scroll est natif. La longue séquence imposée et ses changements automatiques de texte sont remplacés par des choix explicites. Aucun scroll n’est bloqué pour attendre une animation.
- La scène reste dans une zone séparée des textes. La caméra orthographique conserve une vue isométrique, sans grossissement des bâtiments au premier plan. Son échelle s’adapte au viewport et reste constante pendant les déplacements.
- Les transitions GSAP durent 950 ms, reprennent la position actuelle lorsqu’elles sont interrompues et s’arrêtent à l’arrivée. Le chemin et son repère accompagnent le parcours ou le lieu choisi.

## Identité visuelle de la ville

La direction artistique reprend la référence QuickJob City : architecture isométrique moderne, façades blanches et lavande, vitrages indigo, corniches fines et toitures en retrait. Les cinq secteurs conservent leurs emplacements et leurs interactions ; trois bâtiments secondaires donnent de la profondeur au quartier.

Le fin tube lumineux et les anciennes routes grises sont remplacés par une rue violette large et courbe, bordée de clair. Le repère du parcours se déplace sur cette rue. L’éclairage reste fixe : ambiance lavande, lumière principale douce et ombres filtrées. Aucun mouvement décoratif permanent n’est ajouté.

`cityArt.ts` partage la palette et le tracé de la rue entre la géométrie Three.js et le SVG utilisé sur mobile, avec réduction des mouvements ou sans WebGL. Les fenêtres sont regroupées par bâtiment avec `InstancedMesh` afin de limiter les appels de rendu. Les dimensions des arrondis restent inférieures à la demi-épaisseur des socles pour éviter de masquer la chaussée.

Fichiers de cette évolution : `CityWorld.tsx`, `CityFallback.tsx`, `cityArt.ts`, `CityCanvas.tsx`, `CameraRig.tsx`, `hybrid.ts`, `city.css` et la documentation. Aucune dépendance, image générée, modification de formulaire, API, session ou schéma Prisma.

## Actions réelles et intention

La Home lit le rôle via `requireRole()` côté serveur. L’intention de découverte reste indépendante du rôle du compte.

| Situation | Destination |
| --- | --- |
| Travailleur connecté, parcours Travailleur | `/dashboard/travailleur/missions` |
| Recruteur connecté, parcours Recruteur | `/recruteur/missions/nouvelle` |
| Visiteur | `/register?intent=travailleur` ou `/register?intent=recruteur` |
| Compte connecté explorant un autre parcours | Son espace existant, avec un libellé explicite |

Le formulaire existant présélectionne le rôle public correspondant. Les liens Login/Register conservent l’intention. Après une authentification réussie, la destination ciblée n’est utilisée que si le rôle réel retourné par le serveur correspond ; sinon l’utilisateur rejoint son espace habituel. Un changement manuel de rôle à l’inscription reste possible et est respecté.

Seules deux intentions sont reconnues. Aucune URL de retour arbitraire n’est acceptée. `ADMIN` ne peut pas être présélectionné. Les endpoints, les sessions, la gestion des rôles et leurs vérifications serveur sont inchangés. Aucun modèle ou schéma Prisma n’a été modifié.

## Responsive et accessibilité

- Desktop dès 1024 px : WebGL chargé à la demande après détection de capacité ; dessin uniquement pendant les déplacements et mises à jour.
- Tablette et mobile : illustration SVG par défaut, avec les mêmes contrôles HTML et une activation volontaire de la 3D. La version légère limite le DPR et désactive les ombres.
- Sur mobile, le contenu et l’action précèdent le fil, puis la ville. Un changement d’étape ramène la lecture au contenu et y place le focus.
- `prefers-reduced-motion` : illustration sans WebGL, sans animation de texte et sans contenu dupliqué.
- Absence ou perte de WebGL : retour à l’illustration, sans perdre le parcours ni les actions.
- Contrôles tactiles d’au moins 44 px, menu sombre lisible sur toutes les tailles, fermeture du menu avec Échap et retour du focus.
- Lien d’évitement vers l’action réelle, contrôles natifs au clavier, étapes actives et changements de parcours annoncés.
- Aucun défilement interne dans la Home.

## Fichiers concernés

- `src/app/page.tsx` : rôle lu côté serveur et passage au composant Home.
- `src/components/city/CityExperience.tsx` : état partagé, capacités, exploration, rendu et responsive.
- `CityNavigation.tsx`, `TourContent.tsx` : navigation et contenu réutilisés.
- `JourneyRail.tsx`, `hybrid.ts` : fil des trois étapes, secteurs et cadrages.
- `CityCanvas.tsx`, `CameraRig.tsx` : rendu, transitions, projection des points et placement sans chevauchement.
- `CityWorld.tsx`, `cityArt.ts` : architecture modernisée, palette et rue partagées, fenêtres instanciées et éclairage stable.
- `CityFallback.tsx`, `city.css` : illustration, composition, thèmes et états accessibles.
- `src/lib/journey.ts` : intentions autorisées et destinations contrôlées.
- `src/components/AuthForm.tsx`, `src/components/auth/AuthExperience.tsx` : présélection et transmission de l’intention ; présentation et validations conservées.
- `scripts/test-home-browser.mjs`, `package.json` : recette Chrome de la Home.
- `src/components/city/README.md`, `AUTH_TRANSITION.md` et ce document.

## Vérification

Résultat final : **242 contrôles Chrome pour la Home hybride** et **286 contrôles de non-régression Login/Register**, soit **528 contrôles réussis**. Compilation de production, TypeScript et ESLint sur les fichiers concernés réussis. Les comptes temporaires des recettes ont été supprimés.

Après la reprise de l’identité visuelle, les **242 contrôles Home ont été réexécutés avec succès**, ainsi que la compilation de production, `tsc --noEmit` et ESLint sur les composants modifiés. La recette Login/Register de 286 contrôles correspond à la validation antérieure ; elle n’a pas été relancée pour cette évolution graphique. Nouvelles captures : `quickjob-city-desktop.png`, `quickjob-city-exploration.png` et `quickjob-city-mobile.png` dans `.artifacts/`.

La recette Home utilise Chrome avec les tailles 1920×1080, 1440×900, 1366×768, 1024×768, 800×900, 768×1024, 390×844, 360×640 et 320×568. Elle couvre les deux parcours et leurs trois étapes, les secteurs, les cibles tactiles, les débordements, le menu, le clavier et le lien d’évitement.

Elle contrôle aussi le repos du rendu WebGL après les transitions, l’activation volontaire sur mobile, le retour vers l’illustration, la perte du contexte, la réduction des mouvements et l’absence de WebGL.

Deux comptes temporaires sont inscrits réellement puis supprimés, avec leurs sessions : vérification de la présélection, des destinations après inscription/connexion, des CTA connectés, d’une connexion avec une intention incompatible, des intentions invalides et des refus d’accès serveur. Aucune mission n’est créée par cette recette.

La recette d’authentification existante reste disponible et vérifie notamment les 12 tailles desktop sans scroll, les champs conservés et les connexions des trois rôles. Les captures sont dans `.artifacts/` et ignorées par Git.

Captures finales : `hybrid-final-desktop.png`, `hybrid-final-recruiter.png`, `hybrid-final-mobile.png` et `hybrid-final-mobile-full.png`. Les captures de recette documentent également les neuf résolutions, le mode réduit, l’absence de WebGL et l’exploration.

```sh
npm run build
# Dans un autre terminal :
npm run start -- --port 3100
npm run test:home:browser
npm run test:auth:browser
```

`TEST_BASE_URL` permet de cibler un autre serveur local.

## Limites

Les contrôles automatisés sont exécutés dans Chrome headless. Ils ne remplacent pas une validation sur téléphones physiques, Safari/Firefox et un test de compréhension avec de nouveaux visiteurs. Aucun score Lighthouse ou débit d’images sur appareil réel n’est revendiqué. La ville décrit les secteurs ; les annonces réelles restent dans les espaces protégés existants.
