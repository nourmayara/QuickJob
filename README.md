# QuickJob — TP1 : authentification Full Stack

Projet Next.js indépendant réalisé à partir du TP d'authentification : TypeScript, App Router, Prisma 6, SQLite, bcryptjs, jose et Zod. Next.js 16 utilise `src/proxy.ts` au lieu du `middleware.ts` de Next.js 15.

## Démarrer le projet

### Pages d’authentification et profils QuickJob

Les pages `/login` et `/register` partagent une interface responsive et l’illustration SVG de QuickJob City, sans scène Three.js. L’inscription comporte le choix Travailleur/Recruteur puis les informations personnelles, la confirmation du mot de passe et l’acceptation des conditions.

La migration `20261012193000_user_profiles` ajoute les informations de profil et le rôle ; les comptes existants deviennent `WORKER` par défaut et conservent leur mot de passe et leurs sessions. Après mise à jour, arrêter le serveur avant `npm.cmd run db:generate` sous Windows, appliquer `npm.cmd run db:migrate`, puis relancer `npm.cmd run dev`.

L’API d’inscription attend désormais `name`, `firstName`, `phone`, `email`, `password`, `confirmPassword`, `acceptTerms: true` et un rôle public `WORKER` ou `RECRUITER`. Pour un recruteur, fournir `recruiterType: INDIVIDUAL | COMPANY` et `companyName` si entreprise. `city` est facultatif pour les travailleurs. Le rôle `ADMIN` est refusé à l’inscription publique. Il ne peut être attribué que par une opération interne de confiance.

La connexion retourne le rôle stocké en base. Les espaces `/dashboard/travailleur`, `/dashboard/recruteur` et `/dashboard/administrateur` revérifient la session et le rôle en base ; `/dashboard` redirige vers l’espace du compte. Ces espaces reprennent les informations du dashboard existant, sans ajouter de fonctions de gestion de missions.

La récupération de mot de passe par email n’est pas implémentée : la page liée l’indique sans simuler d’envoi. Les pages de conditions et de confidentialité décrivent la version de développement ; les informations de l’éditeur et les modalités complètes restent à finaliser avant ouverture publique.

Depuis le dossier QuickJob :

```powershell
npm.cmd install
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run dev
```

Ouvrir http://localhost:3000. Si l'autre projet utilise déjà ce port : `npm.cmd run dev -- --port 3001`, puis ouvrir http://localhost:3001.

Le `.env` local contient déjà un secret indépendant et l'adresse de la base. Pour une nouvelle installation, copier `.env.example` vers `.env` et renseigner `JWT_SECRET` avec un secret généré par :

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Ne jamais publier `.env` ni `prisma/dev.db` ; ils sont exclus par `.gitignore`.

## Étape 1 — Prisma et SQLite

- `prisma/schema.prisma` : modèle User avec id auto-incrémenté, name obligatoire, email unique, password et createdAt.
- Le champ password contient exclusivement un hash bcrypt.
- `prisma/migrations` : migration SQL initiale reproductible.
- `src/lib/prisma.ts` : instance unique du client Prisma réutilisée en développement.

```powershell
npm.cmd run db:generate
npm.cmd run db:migrate
npm.cmd run db:studio
```

Studio permet de vérifier les cinq colonnes de User. Pour modifier le modèle ensuite : `npx.cmd prisma migrate dev --name nom_du_changement`.

## Étape 2 — Validation et session

- `src/lib/validation.ts` : nom nettoyé, au moins 2 caractères ; email nettoyé et en minuscules ; mot de passe de 8 caractères minimum à l'inscription, non vide à la connexion.
- Les mots de passe d'inscription dépassant 72 octets sont refusés pour éviter leur troncature par bcrypt.
- `src/lib/token.ts` : JWT HS256, userId, expiration après 7 jours, vérification de la signature et du payload.
- `src/lib/session.ts` : createSession, getSession et destroySession ; cookies() est attendu avec await.
- Cookie session : HttpOnly, SameSite=Lax, Path=/, durée 7 jours et Secure en production.

## Étape 3 — API d'authentification

| Méthode | Route | Résultat |
| --- | --- | --- |
| POST | /api/auth/register | Valider, hacher, créer et connecter ; 201, 400, 409 |
| POST | /api/auth/login | Vérifier les identifiants et connecter ; 200, 400, 401 |
| POST | /api/auth/logout | Supprimer le cookie ; 200 |
| GET | /api/auth/me | Lire le compte sans mot de passe ; 200, 401, 404 |

Un email inconnu et un mauvais mot de passe donnent le même message : « Identifiants invalides ». Les doublons simultanés sont gérés via l'erreur Prisma P2002. Les réponses n'exposent jamais le hash.

## Étape 4 — Protection des routes

`src/proxy.ts` vérifie le JWT sans Prisma :

- /dashboard et ses sous-pages sans session → /login.
- /login et /register avec session → /dashboard.
- Les autres routes ne sont pas filtrées par le proxy.

Le dashboard et /api/auth/me revérifient la session et l'existence du compte côté serveur. Un compte supprimé provoque la suppression du cookie via /api/auth/session-expired, puis le retour vers /login, sans boucle de redirection.

## Étape 5 — Interface

- `/` : accueil QuickJob avec liens connexion et inscription.
- `/login` et `/register` : composant AuthForm partagé, champs étiquetés, erreurs et chargement.
- `/dashboard` : nom, email, date d'inscription et bouton de déconnexion.
- Après connexion ou inscription : navigation vers /dashboard puis rafraîchissement du routeur.
- Les erreurs réseau sont affichées ; les boutons sont désactivés pendant les requêtes.

## Étape 6 — Tests et rendu

```powershell
npm.cmd run lint
npm.cmd run build
# Terminal 1 : serveur de test
npm.cmd run start -- --port 3100
# Terminal 2 : recette HTTP
npm.cmd run test:auth
```

Le script `scripts/test-auth.mjs` crée un compte temporaire, teste le parcours puis le supprime. Il vérifie la validation, les JSON malformés, le hash bcrypt, la normalisation, les cookies, les codes HTTP, les doublons, les redirections, la déconnexion, les JWT invalides/expirés et un compte supprimé. Pour un autre port : définir TEST_BASE_URL avant le test.

Recette manuelle dans le navigateur :

1. Ouvrir /dashboard sans connexion : redirection /login.
2. Essayer une inscription avec un mot de passe trop court : erreur.
3. S'inscrire avec des données valides : dashboard et nom affiché.
4. Ouvrir /login connecté : retour au dashboard.
5. Se déconnecter : /login et cookie supprimé.
6. Essayer un mauvais mot de passe : « Identifiants invalides ».
7. Inspecter le hash dans Prisma Studio et le drapeau HttpOnly du cookie dans les outils du navigateur.

Les réponses pédagogiques sont dans `REPONSES_TP.md`. Le socle obligatoire du TP est réalisé ; les exercices bonus sont facultatifs et ne sont pas inclus.
