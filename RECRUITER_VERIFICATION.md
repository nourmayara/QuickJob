# Validation des comptes Recruteurs

## Parcours livré

L’inscription publique crée atomiquement le compte `RECRUTEUR` et sa demande `EN_ATTENTE`, puis ouvre une session. L’inscription et la connexion conduisent vers `/recruteur/en-attente`, `/recruteur/dashboard` ou `/recruteur/refuse`, selon le statut réel renvoyé par le serveur. Le rôle Travailleur, le rôle Admin, les restrictions de suspension et le design Login/Register restent conservés. Aucune vérification email n’existait dans le projet.

La page d’attente propose les trois étapes, une actualisation manuelle du statut réel, le retour à l’accueil et la déconnexion. Après approbation, l’actualisation ouvre le dashboard dans la session déjà ouverte. Après refus, elle ouvre une page affichant le motif. Aucun délai de traitement n’est annoncé et aucun service email n’est ajouté.

Dans l’espace Admin, la sidebar contient « Vérification des recruteurs ». La liste filtre les demandes en attente, approuvées ou refusées, avec pagination de 25 lignes. La fiche affiche les informations déclarées, l’inscription, la demande, le statut général du compte et la décision éventuelle. Approuver et refuser nécessitent une confirmation ; le refus exige un motif non vide de 1 000 caractères maximum. Les erreurs réseau restent visibles et n’affichent jamais une réussite fictive.

## Transition et Prisma

Migration appliquée : `prisma/migrations/20261026180000_recruiter_verification/migration.sql`.

- Aucun `DROP`, aucune réécriture des tables `User`, `Session`, `Mission` ou `Application`.
- Ajout de `RecruiterVerification`, lié au compte : statut, date de demande, date de décision, Admin responsable, motif du refus et marqueur `legacy`.
- Les recruteurs déjà présents reçoivent une vérification `APPROUVE`, `legacy = true`, avec dates et Admin nuls. Cela conserve explicitement leurs accès sans inventer une décision administrative. Les comptes suspendus restent suspendus.
- Les nouvelles inscriptions créent une vraie demande `EN_ATTENTE` avec date de demande. L’absence d’un dossier de vérification bloque également les accès métier.
- Ajout de `Notification` : aucune infrastructure de notifications n’existait. Une décision crée une notification persistante dans la même transaction. Une notification unique par demande empêche les doublons. Elle est consultable uniquement par son destinataire et apparaît dans son espace ; aucun email n’est envoyé.
- L’outil serveur `scripts/admin-role.mjs` conserve l’attribution des rôles et la révocation des sessions. Attribuer `RECRUTEUR` crée une demande en attente si elle manque et préserve toute décision existante.

Une sauvegarde SQLite cohérente a été créée avant les tests du workflow : `.artifacts/before-verification-tests-*.sqlite`. Les empreintes des quatre tables existantes figurent dans `.artifacts/recruiter-data-before-tests.json`. Ces fichiers restent locaux et ignorés par Git. Le test de migration rejoue aussi les anciennes migrations sur une base isolée, y insère des données et vérifie qu’elles restent strictement identiques après la nouvelle migration.

Sur un autre environnement : `npm run db:migrate`, puis `npm run db:generate`, avant de démarrer la nouvelle version. Ne pas remplacer les données ni utiliser `prisma migrate reset`.

## Routes

| Route | Accès |
| --- | --- |
| `/recruteur/en-attente` | Recruteur actif, session valide ; redirection selon sa décision |
| `/recruteur/refuse` | Recruteur refusé ; motif lu côté serveur |
| `/admin/recruteurs` | Admin actif, liste et filtres |
| `/admin/recruteurs/[id]` | Admin actif, consultation et confirmations |
| `GET /api/recruteur/verification` | Statut et destination du recruteur connecté |
| `GET /api/admin/recruteurs` | Liste paginée, filtres validés |
| `GET/PATCH /api/admin/recruteurs/[id]` | Consultation ou décision Admin |
| `GET /api/notifications` | Notifications du compte connecté uniquement |

Les pages métier Recruteur ont été déplacées dans le groupe de routes `src/app/recruteur/(espace)` sans changer leurs URL publiques. Ce groupe possède le layout du dashboard et exige l’approbation. Les pages d’attente/refus restent à l’extérieur de ce groupe, sous un contrôle de session et de rôle : aucune boucle de redirection ni sidebar métier accessible avant approbation.

## Protections

`requireApprovedRecruiter()` vérifie la session persistante, le rôle en base, la suspension et la vérification `APPROUVE`. Le wrapper `protectedRoute()` l’applique à toute requête métier provenant d’un recruteur, y compris les API partagées avec les travailleurs. `requirePageRole()` applique le même contrôle aux pages privées. Les seules exceptions explicites sont les pages de statut, le statut API, les notifications personnelles et les endpoints d’authentification.

Les décisions vérifient à nouveau l’Admin actif à l’intérieur d’une transaction, ciblent exclusivement un compte Recruteur actif et ne passent que de `EN_ATTENTE` à un état final. L’écriture conditionnelle, l’audit et la notification sont atomiques. Deux décisions simultanées ne produisent qu’un succès ; l’autre reçoit `409`. Une approbation ne réactive jamais un compte suspendu. Les protections existantes de propriété des missions/candidatures sont conservées.

## Fichiers

- Prisma : schéma, nouvelle migration additive.
- Gardes/redirections : `src/lib/authorization.ts`, `api.ts`, `recruiter-approval.ts`, `recruiter-verification-service.ts`, `src/proxy.ts`.
- Auth : routes inscription/connexion et redirection dans `src/components/AuthForm.tsx`, sans changement de présentation.
- Recruteur : layout extérieur, groupe `(espace)`, deux pages de statut ; `VerificationPage.tsx`, `VerificationRefresh.tsx`, `verification.css`.
- Admin : nouveau layout, liste, fiche et styles ; `AdminShell.tsx`, `RecruiterDecision.tsx` ; lien/sidebar dans le dashboard Admin existant.
- API : vérification Recruteur, vérifications Admin, notifications personnelles.
- Outils/tests : `scripts/admin-role.mjs`, deux nouvelles recettes de test et commandes `package.json`.
- Aucune modification de la Home 3D, du logo, des fonctionnalités Travailleur ou des règles de propriété métier.

## Validation

Compilation de production, `tsc --noEmit` et ESLint ciblé : réussis.

- **97 contrôles serveur/migration** : inscription réelle, données initiales, statut fourni par le navigateur ignoré, accès privés et API interdits avant approbation, connexion/déconnexion, Admin/Travailleur inchangés, approbation, publication réelle, refus motivé, notifications isolées, concurrence, suspension, accès historique conservé et outil d’attribution des rôles.
- **39 contrôles Chrome** : inscription par le formulaire existant, attente, actualisation du statut, sidebar Admin, confirmation sans décision prématurée, approbation et refus via l’interface, motif obligatoire, notification visible, erreurs réseau, connexion avec intention incompatible, déconnexion et accès privé bloqué.
- Responsive contrôlé à 1920×1080, 1366×768, 768×1024, 390×844 et 320×568 pour l’attente ; liste Admin également testée à 1440, 768, 390 et 320 px. Contrôles tactiles et absence de débordement horizontal vérifiés.
- Tous les comptes temporaires sont supprimés. Les empreintes des données et sessions préexistantes sont identiques avant/après les recettes.

```sh
npm run build
npm run start -- --port 3100
# Dans un autre terminal :
npm run test:recruiter:verification
npm run test:recruiter:verification:browser
```

`TEST_BASE_URL` permet de choisir un autre serveur local. La recette de migration utilise `node:sqlite` intégré à Node 22 ; aucune dépendance n’a été installée. Les anciennes recettes qui supposent un accès Recruteur immédiat doivent utiliser des fixtures approuvées ; elles n’ont pas été revendiquées comme relancées pour ce changement de comportement.

Captures et résultats : `.artifacts/verification-waiting-1366.png`, `verification-waiting-390.png`, `verification-refused-mobile.png`, `recruiter-verification-api.json` et `recruiter-verification-browser.json`.

Validation dans Chrome headless ; pas de test sur téléphone physique ni Safari/Firefox. L’actualisation est manuelle, le polling étant facultatif. Aucun compte Admin permanent n’a été créé ni aucun compte existant promu automatiquement. Pour désigner un Admin, l’outil serveur existant accepte `npm run admin:role -- USER_ID ADMIN --confirm` ; cela invalide les anciennes sessions de ce compte.
