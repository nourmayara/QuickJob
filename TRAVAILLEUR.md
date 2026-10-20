# Parcours Travailleur — QuickJob

Implémentation locale du backlog fourni, dans l’ordre US09, US10, US12, US13, US11. La Home 3D, les pages d’authentification, le logo, les sessions et les destinations de connexion existantes sont conservés.

## User Stories

| US | Fonctionnalité |
| --- | --- |
| US09 | Profil professionnel : ville, compétences, expériences, langues, présentation facultative. Enregistrement et validation Zod côté serveur. Les débutants peuvent laisser les expériences vides. |
| US10 | Catalogue et recherche des missions réellement publiées par des recruteurs actifs, cartes lisibles et pagination. |
| US12 | Détails : description, catégorie, recruteur, localisation, date, horaires, TND, compétences et expérience souhaitées, places encore disponibles. |
| US13 | Candidature avec message facultatif, statut initial `PENDING`, unicité par travailleur et mission, suivi des décisions du recruteur. |
| US11 | Filtres combinables par mot-clé (titre/description), catégorie, ville, date et rémunération minimale/maximale en TND. Validation des paramètres et pagination. |

Le profil professionnel reste modifiable après candidature. Le recruteur consulte sa version courante, ainsi que le message attaché à la candidature. Les expériences et langues sont du texte libre. Compléter le profil est recommandé ; les anciennes API permettent toujours de postuler sans imposer une nouvelle étape obligatoire.

## Routes

- `/dashboard/travailleur` : espace personnel, statistiques réelles et dernières missions.
- `/dashboard/travailleur/profil` : édition du profil professionnel.
- `/dashboard/travailleur/missions` : catalogue, recherche et filtres.
- `/dashboard/travailleur/missions/[id]` : détails et candidature, ou suivi si déjà candidat.
- `/dashboard/travailleur/candidatures` : liste paginée des candidatures personnelles.
- `/dashboard/travailleur/candidatures/[id]` : message envoyé, décision, statut de mission et bouton d’actualisation.
- `/api/travailleur/profil` : GET/PATCH du seul profil authentifié.

Les API existantes `/api/missions`, `/api/missions/[id]`, `/api/missions/[id]/applications` et `/api/applications` sont réutilisées. Le catalogue n’affiche que les missions `PUBLISHED`. Les anciens candidats peuvent revoir le contexte de leurs missions complètes, annulées ou terminées depuis le suivi, sans pouvoir postuler à nouveau. Les missions masquées ne sont plus consultables par leur page de détail.

## Sécurité et capacité

Chaque page et chaque API vérifie la session et le rôle côté serveur. L’identifiant du travailleur provient exclusivement de la session. Les corps JSON contenant `workerId`, `status`, `role` ou un autre champ non autorisé sont refusés. Les données d’un profil ne sont présentées au recruteur que via une candidature sur l’une de ses propres missions.

La candidature acquiert en transaction SQLite un verrou d’écriture sur la mission avant de vérifier son ouverture, ses places et le doublon. Les décisions du recruteur utilisent le même verrou. Une candidature `PENDING` n’occupe pas de place ; seule `ACCEPTED` en occupe une. La dernière acceptation passe automatiquement la mission à `FULL` et bloque les nouvelles candidatures. Les contraintes existantes d’unicité en base restent en place.

Codes principaux : 401 session absente ou révoquée, 403 mauvais rôle, 400 saisie invalide, 404 mission fermée/inaccessible ou candidature appartenant à un autre utilisateur, 409 doublon, capacité atteinte ou conflit concurrent. Avec le streaming Next.js, une page introuvable peut être envoyée avec HTTP 200 ; aucune donnée de l’élément refusé ne figure dans sa réponse.

Le bouton Actualiser les statuts recharge les données serveur. Les notifications et l’actualisation en temps réel ne font pas partie de cette étape.

## Migration additive

`20261018220000_worker_journey` ajoute seulement `User.experience`, `User.languages` et `Application.message`, tous facultatifs. Les modèles `User`, `Mission` et `Application` existants sont réutilisés ; aucune suppression ou reconstruction de table.

```sh
npm run db:generate
npm run db:migrate
```

## Fichiers créés et modifiés

Créés :

- `src/app/dashboard/travailleur/` : layout, dashboard, profil, catalogue, détails mission, liste/détail des candidatures, styles et pages erreur/introuvable.
- `src/components/worker/` : `WorkerShell`, `WorkerProfileForm`, `MissionCard`, `ApplyForm`, `RefreshStatus`.
- `src/lib/worker-validation.ts`, `worker-data.ts`, `worker-service.ts`.
- `src/app/api/travailleur/profil/route.ts`.
- `prisma/migrations/20261018220000_worker_journey/migration.sql`.
- `scripts/test-worker.mjs`, `test-worker-browser.mjs`, `worker-browser-session.mjs` et ce document.

Modifiés :

- `prisma/schema.prisma` : trois champs facultatifs.
- `src/lib/api.ts` : erreurs métier travailleur ; `src/lib/recruiter-data.ts` : sélection des expériences et langues.
- `src/app/api/missions/route.ts` : filtres du catalogue travailleur ; `src/app/api/missions/[id]/route.ts` : conservation du contexte pour un ancien candidat.
- `src/app/api/missions/[id]/applications/route.ts` : message facultatif et création transactionnelle protégée.
- `src/app/recruteur/candidatures/[id]/page.tsx` : expériences, langues et message visibles par le recruteur propriétaire.
- `package.json` : commandes de test.

## Recette

```sh
npm run build
# Dans un autre terminal :
npm run start -- --port 3100
npm run test:worker
npm run test:worker:browser
npm run test:recruiter
npm run test:roles
npm run test:auth
```

`TEST_BASE_URL` permet de changer le serveur local. `CHROME_PATH` permet de sélectionner un autre exécutable Chromium sous Windows. Le test navigateur utilise un profil temporaire isolé.

Le scénario principal crée un recruteur, trois travailleurs et une mission de deux places. Les scripts vérifient les profils, la consultation, les filtres, les trois candidatures, le message, la sélection, le statut Complète, les réponses consultables et les permissions. Le test HTTP fait concourir deux acceptations sur la dernière place. Le test Chrome vérifie les formulaires réels, la confirmation côté recruteur et l’actualisation du statut côté travailleur. Les captures sont enregistrées dans `.artifacts/worker-missions-{desktop,tablet,mobile}.png`.

Les données sont exclusivement des fixtures temporaires de test, supprimées en fin de scénario. Aucun compte de démonstration ni candidature fictive persistante n’est ajouté pour l’interface.

## Résultats vérifiés le 19 octobre 2026

- `npx tsc --noEmit` : réussi, aucune erreur TypeScript.
- `npm run build` : réussi, compilation et génération des routes terminées.
- `npm run test:worker` : **162 contrôles réussis** avec un recruteur, trois travailleurs et une mission de deux places. Profils, recherche, filtres combinés, accès aux détails, message facultatif, statut initial `PENDING`, doublons, missions fermées, permissions et déconnexion vérifiés.
- La concurrence pour la dernière place laisse exactement deux candidatures acceptées au total. La mission devient `FULL`, la troisième acceptation est refusée et une nouvelle candidature reste impossible, même sans doublon existant.
- `npm run test:worker:browser` : réussi dans Chrome. Profil enregistré depuis le formulaire, filtres soumis, consultation, candidature avec message, consultation du profil par le recruteur, confirmation d’acceptation, refus du troisième candidat et actualisation du statut côté travailleur.
- Affichage contrôlé en 1440 × 1000, 900 × 1000 et 390 × 844, sans débordement horizontal. Les captures attendent la fin de la transition de la navigation mobile.
- `npm run test:recruiter` : **76 contrôles réussis**.
- `npm run test:roles` : **58 contrôles réussis**, incluant les restrictions entre utilisateurs et l’absence de secrets dans les réponses JSON.
- `npm run test:auth` : recette existante réussie, dont sessions, cookies, redirections, expiration et révocation.
- Nettoyage confirmé : aucun compte temporaire des scénarios travailleur, navigateur, recruteur, rôles ou authentification n’est conservé.

Les US09, US10, US12, US13 et US11 sont terminées dans le périmètre demandé. Les notifications et le suivi en temps réel restent hors de ce périmètre ; le suivi dispose d’un bouton d’actualisation fonctionnel.
