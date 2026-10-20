# Espace recruteur QuickJob

L’espace est disponible à `/recruteur/dashboard`. L’ancienne URL `/dashboard/recruteur` redirige vers cette adresse. Les destinations travailleur et administrateur sont conservées. Home, Login, Register et logo ne sont pas modifiés.

## Architecture et sécurité

Chaque page privée appelle `requirePageRole(["RECRUTEUR"])`, en complément du layout et du proxy. Les API utilisent `protectedRoute` et vérifient le rôle lu dans la base à partir de la session persistée. Les lectures et mutations sont limitées à l’identifiant du recruteur authentifié. Un identifiant appartenant à un autre recruteur renvoie 404 dans les API et affiche la page Élément introuvable dans l’interface. Next peut envoyer cette page dans une réponse HTTP 200 si le streaming a déjà commencé ; aucune donnée de l’élément n’est incluse.

`src/lib/recruiter-service.ts` centralise les transitions de mission et les décisions. Une transaction SQLite acquiert le verrou d’écriture sur la mission avant de compter les places et de sélectionner le candidat. Deux acceptations simultanées ne peuvent pas attribuer la dernière place deux fois ; le conflit renvoie 409. Une candidature traitée ne peut plus être décidée à nouveau. La dernière acceptation passe le statut à `FULL` et bloque les nouvelles candidatures. Augmenter la capacité d’une mission complète la remet en publication. Diminuer la capacité sous le nombre de candidats acceptés est interdit.

Les profils de candidats sont accessibles uniquement via une candidature concernant une mission du recruteur. Leur sélection Prisma exclut mot de passe, sessions et coordonnées privées.

## Base de données

La migration `20261018210000_recruiter_dashboard` ajoute uniquement des colonnes aux modèles existants `User` et `Mission`. Aucun modèle en double, aucune table supprimée ou reconstruite. Les anciennes missions conservent leurs données ; leur capacité vaut au minimum un, ou le nombre de travailleurs déjà acceptés si celui-ci est supérieur. Les informations historiques absentes sont affichées comme non renseignées.

Commandes pour une autre installation :

```sh
npm run db:generate
npm run db:migrate
```

## Fonctionnalités et backlog fourni

| US | État |
| --- | --- |
| US22 | Profil professionnel modifiable, email en lecture seule, avatar par initiales ou image existante ; import d’image à développer |
| US23 | Formulaire complet, publication et brouillon, validation Zod dans le navigateur et sur le serveur |
| US24 | Liste paginée, recherche par titre, filtres, détails, édition, clôture, démarrage, fin et annulation avec confirmation |
| US25 | Candidatures regroupées par mission, filtrées et paginées, profil du candidat |
| US26 | Acceptation/refus avec confirmation, validation du propriétaire et décisions définitives |
| US27 | Capacité contrôlée en transaction, statut Complète et arrêt des nouvelles candidatures |
| US28 | Page Messages et état explicite ; envoi/réception à développer (P2) |
| US29 | Évaluation après mission à développer (P2), indiquée dans Travailleurs sélectionnés |
| US30 | Statistiques réelles, missions récentes, candidatures récentes, agenda et raccourcis |

L’API historique accepte toujours les créations minimales titre + description pour conserver ses clients existants. Le formulaire recruteur demande toutes les informations. Les missions sont limitées à une journée ; la date et les horaires utilisent la Tunisie. La rémunération est un montant total par travailleur, en TND. Le nombre de travailleurs sélectionnés compte les sélections par mission : un même travailleur sélectionné sur deux missions représente deux sélections.

Les confirmations de présence par le travailleur, l’import d’images, la modification vérifiée de l’email, le changement de mot de passe et les notifications restent à développer. Aucune confirmation de présence, statistique ou conversation fictive n’est présentée.

## Vérification

```sh
npm run build
# Dans un autre terminal, serveur local de test :
npm run start -- --port 3100
npm run test:recruiter
npm run test:roles
npm run test:auth
npm run test:recruiter:browser
```

`TEST_BASE_URL` permet d’utiliser un autre serveur local. Le test navigateur utilise Chrome sous Windows (ou `CHROME_PATH`), sans dépendance supplémentaire. Il contrôle desktop, tablette et mobile, les débordements, la navigation, la publication réelle d’une mission et sa confirmation d’annulation. Les captures se trouvent dans `.artifacts/recruiter-{desktop,tablet,mobile}.png`. Les comptes et missions créés par les tests sont supprimés à la fin.

## Fichiers ajoutés et modifiés

Créations :

- `src/app/recruteur/` : layout, styles, pages dashboard, missions (liste, création, détail, modification), candidatures (liste, détail), travailleurs sélectionnés, profil, messages, paramètres et états de chargement, erreur et introuvable.
- `src/components/recruiter/` : `RecruiterShell`, `Icon`, `ui`, `MissionTable`, `MissionActions`, `MissionForm`, `ProfileForm`, `ConfirmAction`.
- `src/lib/recruiter-data.ts`, `recruiter-validation.ts`, `recruiter-service.ts`.
- `src/app/api/recruteur/profil/route.ts`.
- `prisma/migrations/20261018210000_recruiter_dashboard/migration.sql`.
- `scripts/test-recruiter.mjs`, `scripts/test-recruiter-browser.mjs` et ce document.

Modifications :

- `prisma/schema.prisma` : enrichissement des modèles existants.
- `src/lib/roles.ts`, `src/proxy.ts`, `src/app/dashboard/[role]/page.tsx` : destination recruteur et compatibilité des anciennes URL.
- `src/lib/api.ts`, `src/app/api/missions/route.ts`, `src/app/api/missions/[id]/route.ts`, `src/app/api/applications/[id]/route.ts` : validation et mutations protégées partagées.
- `package.json` : commandes de test ; `scripts/test-auth.mjs` : adaptation de la destination recruteur attendue.
- `.gitignore` : exclusion des captures de test.

Les API d’authentification, la logique `requireRole`, les composants Home, Login, Register et le logo sont conservés.

## Résultats de la recette

- `npx tsc --noEmit` : réussi.
- `npm run build` : réussi, compilation et génération des routes sans erreur.
- `npm run test:recruiter` : 76 contrôles réussis, dont rôles, isolation entre recruteurs, accès aux détails, validation, sélection simultanée de la dernière place et déconnexion.
- `npm run test:roles` : 58 contrôles réussis, incluant l’absence de secrets dans les réponses JSON.
- `npm run test:auth` : recette existante réussie.
- `npm run test:recruiter:browser` : réussi dans Chrome, formats 1440 × 1080, 900 × 1000 et 390 × 844, absence de débordement horizontal, navigation mobile, publication, confirmation, annulation et persistance du profil.
- Les comptes et missions temporaires ont été nettoyés. Aucun compte de démonstration ni donnée fictive n’est conservé dans l’application.
