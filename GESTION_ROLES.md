# Gestion des rôles QuickJob (TP2)

L’authentification bcrypt/JWT existante est conservée. Le rôle est relu dans SQLite pour chaque accès privé ; les claims de rôle du navigateur ne sont jamais utilisés. Les chemins existants sont conservés : `/dashboard/travailleur`, `/dashboard/recruteur`, `/dashboard/administrateur`.

## Fichiers principaux

- `prisma/schema.prisma` et `prisma/migrations/20261018190000_quickjob_roles/migration.sql` : conversion des anciens rôles, suspension, registre des sessions, missions et candidatures.
- `src/lib/authorization.ts` : `requireRole()` pour les API et `requirePageRole()` pour les pages. Aucun privilège métier implicite pour ADMIN.
- `src/lib/session.ts`, `token.ts` : JWT signé existant, identifiant aléatoire de session et révocation persistante. Les anciens JWT valides sont enregistrés via leur empreinte SHA-256, sans stocker le cookie. Les enregistrements révoqués ne doivent pas être purgés avant l’expiration initiale des JWT concernés.
- `src/lib/api.ts`, `validation.ts`, `roles.ts` : validation Zod, réponses d’erreur et redirections.
- `src/app/api/auth/*` : inscription publique limitée aux deux rôles métier, connexion, profil de session et déconnexion.
- `src/app/api/missions/*`, `applications/*`, `profile/*` : autorisation et propriété des ressources.
- `src/app/api/admin/*` : utilisateurs, suspension/réactivation, modération explicite et statistiques.
- Pages Login/Register, composants AuthForm/AuthShell : seules les valeurs techniques des rôles et les redirections sont adaptées ; présentation conservée.
- `src/app/dashboard/*` : vérification serveur des rôles et liste des rubriques à développer, sans actions factices.
- `scripts/admin-role.mjs`, `test-roles.mjs`, `test-auth.mjs` : administration serveur et recettes HTTP.

## Contrat des API

Toutes les API privées renvoient 401 sans session valide (y compris compte suspendu/supprimé), 403 pour un rôle interdit, et 404 pour une ressource non détenue. Les pages redirigent vers l’espace autorisé ou la connexion. Les sorties utilisent des projections explicites lorsqu’elles contiennent un utilisateur.

| Route | Accès et comportement |
| --- | --- |
| `GET/PATCH /api/profile` | Travailleur/recruteur : son propre profil ; rôle, identifiant, email et mot de passe non modifiables ici |
| `GET /api/missions` | Travailleur : missions publiées ; recruteur : ses missions |
| `POST /api/missions` | Recruteur ; JSON `title`, `description` |
| `GET/PATCH /api/missions/:id` | Lecture autorisée selon visibilité ; modification uniquement par le propriétaire recruteur |
| `POST /api/missions/:id/applications` | Travailleur ; identité tirée de la session ; mission publiée uniquement |
| `GET /api/missions/:id/applications` | Recruteur propriétaire uniquement |
| `GET /api/applications` | Travailleur : ses candidatures ; recruteur : candidatures sur ses missions |
| `GET /api/applications/:id` | Travailleur concerné ou recruteur propriétaire |
| `PATCH /api/applications/:id` | Recruteur propriétaire ; `status: ACCEPTED` ou `REJECTED` |
| `GET /api/admin/users` | ADMIN ; liste sans mots de passe ni sessions |
| `PATCH /api/admin/users/:id` | ADMIN ; uniquement `suspended: boolean`, révocation des sessions à la suspension |
| `GET /api/admin/missions` | ADMIN |
| `PATCH /api/admin/missions/:id` | ADMIN ; uniquement `action: MODERATE` ; mission ensuite non modifiable par le recruteur |
| `GET /api/admin/statistics` | ADMIN ; compteurs réels en base |

Les listes sont limitées à 100 résultats. Les futures interfaces devront prévoir une pagination adaptée. Les états de mission acceptés par le propriétaire sont `PUBLISHED`, `CLOSED`, `CANCELLED`, `COMPLETED` ; le statut `MODERATED` est réservé à l’administration.

## Migration et conservation

La migration convertit `WORKER` en `TRAVAILLEUR` et `RECRUITER` en `RECRUTEUR`, conserve `ADMIN`, les identifiants, les profils, les dates et les hashes. SQLite exige une copie transactionnelle de la table pour remplacer son ancien CHECK. Il n’y a ni reset ni suppression de comptes. Une sauvegarde SQLite privée est conservée dans `prisma/backups/` (ignorée par Git).

La migration a été appliquée à une base vierge puis à la base du projet après sauvegarde. La comparaison a confirmé la conservation de l’utilisateur existant et de tous ses champs, hormis la conversion attendue du rôle. `PRAGMA foreign_key_check` est vide ; le CHECK refuse les rôles inconnus.

Pour un autre environnement : sauvegarder sa base puis exécuter `npm run db:generate` et `npm run db:migrate`. Ne pas utiliser `migrate reset` ou `db push --accept-data-loss`.

## Attribuer un administrateur

Depuis un terminal de confiance sur le serveur disposant de l’accès à sa base :

```sh
node scripts/admin-role.mjs USER_ID ADMIN --confirm
```

Remplacer USER_ID par l’identifiant d’un compte existant vérifié. Cette commande n’est accessible par aucune API publique. Elle invalide les sessions déjà enregistrées du compte ; une reconnexion est nécessaire. Protéger l’accès au serveur et aux variables de connexion DB. Aucune adresse email ne confère automatiquement le rôle ADMIN. Aucun compte administrateur n’est créé automatiquement.

## Recette

Démarrer le serveur puis choisir son URL :

```powershell
$env:TEST_BASE_URL = 'http://localhost:3000'
npm.cmd run test:roles
npm.cmd run test:auth
npx.cmd tsc --noEmit
npm.cmd run build
```

`test:roles` utilise des comptes temporaires identifiés par un préfixe unique et nettoie uniquement ses propres données. Il couvre les dix scénarios demandés, les modifications de propriétaire, les décisions sur candidatures, suspension/réactivation, modération, refus des claims de rôle JWT, compatibilité des anciens JWT et révocation après déconnexion. Toutes les réponses JSON de la recette sont parcourues pour interdire les champs de mot de passe, token, secret ou sessionId.

## Travail métier restant

Les interfaces de missions/candidatures/profil/admin restent à développer dans le thème existant. Calendrier, disponibilités, évaluations après mission, catégories et signalements ne disposaient ni de modèle ni de page fonctionnelle : ils restent explicitement à développer. Les statistiques et la modération sont disponibles côté API. Les pages de dashboard présentent la structure prévue sans simuler ces fonctions.
