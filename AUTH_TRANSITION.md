# QuickJob — Transition Connexion / Inscription

Les routes publiques `/login` et `/register` partagent désormais une expérience persistante. La référence vidéo a été analysée : le principe retenu est le déplacement du panneau coloré à travers deux zones de formulaire stables. Les couleurs, textes et illustrations sont ceux de QuickJob.

## Fonctionnement

- Connexion : formulaire clair à gauche, présentation violette à droite.
- Inscription : présentation violette à gauche, formulaire clair à droite.
- Sur desktop, Login et les deux étapes de Register tiennent dans la hauteur disponible, sans défilement de page ni zone de défilement interne. Les champs de l’inscription occupent deux colonnes ; les espacements, la typographie et la hauteur des champs s’adaptent aux fenêtres moins hautes. Les champs entreprise, le consentement, les erreurs et les liens restent visibles.
- Le panneau violet se déplace horizontalement en **820 ms**, avec `cubic-bezier(0.65, 0, 0.25, 1)`. Le mouvement utilise `translate3d`, une accélération progressive et une arrivée amortie. Les textes et formulaires apparaissent avec un fondu décalé et un léger déplacement ; les illustrations changent progressivement sans être remontées.
- Les deux routes partagent le layout `(auth)` sous le layout racine existant. La navigation Next.js met à jour l’URL sans recharger le document et conserve les instances des deux formulaires.
- Chaque formulaire existe une seule fois. Les champs saisis, l’étape d’inscription, la ville et les informations d’entreprise restent en mémoire lors des changements de mode ou de rôle. Aucun mot de passe n’est stocké dans le stockage local ou de session du navigateur.
- L’illustration du travailleur est affichée à la connexion. À l’inscription, elle s’adapte au rôle sélectionné et passe progressivement à l’illustration du recruteur. Les deux assets existants sont chargés à l’avance.
- Le formulaire masqué est `inert`, masqué aux technologies d’assistance et désactivé. Les identifiants des champs de mot de passe sont distincts pour préserver l’association des labels.
- Le focus rejoint le titre après la fin effective du déplacement du panneau, y compris lors d’une inversion en cours de mouvement. Une temporisation de secours couvre les mouvements désactivés ou interrompus. Sur desktop, la prise de focus ne déclenche pas de défilement. Les soumissions restent désactivées pendant le mouvement ; les changements de mode sont bloqués pendant un appel d’authentification.
- Sur mobile, le formulaire conserve un défilement naturel et le panneau violet devient un bandeau. Le titre de l’étape est ramené à l’écran lors du passage entre le choix du rôle et les informations. Le mouvement est simplifié. Avec `prefers-reduced-motion: reduce`, la navigation fonctionne sans animation.
- Les champs utilisent un thème clair explicite, y compris lors du remplissage automatique du navigateur.

## Authentification conservée

Les contrôles serveur `requireRole`, les sessions, Prisma et les API `/api/auth/login` et `/api/auth/register` sont inchangés. Le layout et les pages redirigent les utilisateurs déjà connectés vers leur espace. Les formulaires réutilisent `dashboardPath` pour les trois rôles. L’inscription publique propose uniquement Travailleur et Recruteur.

L’inscription conserve ses deux étapes, les champs existants, les validations, le consentement et la création réelle du compte. La connexion conserve l’affichage/masquage du mot de passe, le lien de récupération, les erreurs et l’état d’envoi.

La Home hybride peut transmettre `intent=travailleur` ou `intent=recruteur`. L’inscription présélectionne alors le rôle public correspondant, les liens entre les deux modes conservent ce paramètre et la connexion rejoint la destination du parcours uniquement si le rôle réel correspond. Une intention inconnue ou une URL de retour externe ne peut pas modifier les droits du compte. Sans ce paramètre, le comportement existant est conservé. Voir [HYBRID_CITY.md](HYBRID_CITY.md).

La Home 3D, les dashboards, le logo original et les autres pages utilisant `AuthShell` ne sont pas modifiés. Aucun paquet supplémentaire ni migration de base de données n’est nécessaire.

## Fichiers

- `src/app/login/page.tsx` et `src/app/register/page.tsx` déplacés vers `src/app/(auth)/login/page.tsx` et `src/app/(auth)/register/page.tsx`, sans changement des URL.
- `src/app/(auth)/layout.tsx` : layout persistant et vérification de session côté serveur.
- `src/components/auth/AuthExperience.tsx` : panneaux, navigation, illustrations, focus et coordination des soumissions.
- `src/components/auth/auth-experience.css` : animation, présentation violette, styles responsive, saisie automatique et réduction des mouvements.
- `src/components/AuthForm.tsx` : formulaires réutilisés, identifiants uniques, conservation des champs de rôle et désactivation coordonnée.
- `scripts/test-auth-transition-browser.mjs` : recette de l’expérience avec Chrome et comptes temporaires.
- `package.json` : commande `test:auth:browser`.
- Ce document et les captures de vérification dans `.artifacts/` (ignorées par Git).

L’ajustement desktop et la fluidification concernent uniquement `AuthExperience.tsx`, `auth-experience.css`, `AuthForm.tsx`, le script de recette navigateur et ce document.

## Vérifications réalisées

- `npm run build` : compilation et génération des routes réussies, TypeScript sans erreur.
- `npx tsc --noEmit` : réussi.
- ESLint sur les composants modifiés et le script navigateur : réussi.
- `npm run test:auth:browser` : **286 contrôles Chrome réussis**.
- La recette API `npm run test:auth` avait également réussi lors de l’intégration initiale (validation, inscription, hash, connexion, cookies, rôles, sessions révoquées/expirées et compte supprimé).

La recette vérifie l’absence de défilement horizontal et vertical, l’absence de débordement interne, le positionnement de tout le contenu entre l’en-tête et le pied de page, et la visibilité de chaque contrôle sur **12 résolutions desktop** : 1920×1080, 1920×873, 1440×900, 1366×801, 1366×768, 1280×720, 1280×640, 1280×625, 1024×768, 900×720, 900×640 et 900×625. Chaque résolution couvre la connexion, la connexion en erreur, le choix du rôle, les informations Travailleur et les informations Entreprise avec erreur de confirmation du mot de passe. Les contrôles tablette et mobile couvrent également 900×1000 et 390×844.

La recette navigateur mesure une position intermédiaire du panneau pour confirmer un déplacement réel, contrôle ses positions finales et la stabilité de la hauteur desktop, l’inversion pendant une transition, les liens, Précédent/Suivant, les URL directes et le rafraîchissement. Elle vérifie la conservation des champs et de l’étape, la conservation de la ville et de l’entreprise entre les rôles, les labels, les formulaires masqués, le focus, le clavier, les erreurs et la réduction des mouvements.

Elle crée réellement un compte Travailleur et un compte Recruteur depuis les formulaires, puis vérifie les connexions Travailleur, Recruteur et Administrateur et leurs destinations. Le compte Administrateur est préparé uniquement dans la fixture de test via un changement de rôle en base ; l’inscription publique ne propose jamais ce rôle. Une requête seulement est envoyée par soumission. Un appel temporairement retenu permet de contrôler le blocage du changement de mode pendant l’envoi. Tous les comptes temporaires sont supprimés à la fin.

Le nettoyage a été confirmé en base : aucun compte temporaire `auth-transition-*` ne subsiste.

Captures : `.artifacts/auth-login-desktop.png`, `auth-register-desktop.png`, `auth-transition-midpoint.png`, `auth-register-tablet.png`, `auth-login-mobile.png`, `auth-register-mobile.png`. Les variantes `auth-*-1280x720.png` et `auth-*-1280x625.png` montrent également les formulaires complets sur des fenêtres de portable, dont l’entreprise avec son message d’erreur.

```sh
npm run build
# Serveur de recette, dans un autre terminal :
npm run start -- --port 3100
npm run test:auth
npm run test:auth:browser
```

`TEST_BASE_URL` permet de choisir un autre serveur local ; `CHROME_PATH` permet d’indiquer un autre exécutable Chrome/Chromium sous Windows.
