Depuis la racine du projet, avec les migrations déjà appliquées :

```sh
npm run db:seed
```

Sur PowerShell si `npm.ps1` est bloqué : `npm.cmd run db:seed`.
Le script exige `DATABASE_URL="file:./dev.db"` et `NODE_ENV` absent ou égal à
`development`. Il refuse les autres bases, les liens symboliques, la CI et Vercel.
Il ne lance ni migration ni suppression.

Comptes fictifs (mot de passe commun : `QuickJob-Test2026!`, stocké avec bcrypt) :

- `qj.seed.recruteur01@example.com` à `qj.seed.recruteur05@example.com` : approuvés.
- `qj.seed.recruteur06@example.com` à `qj.seed.recruteur08@example.com` : en attente.
- `qj.seed.travailleur01@example.com` à `qj.seed.travailleur15@example.com` : profils complets.

Le jeu contient 30 missions, dont 6 terminées, 40 candidatures, des échanges entre
participants acceptés, des notifications lues/non lues, 8 avis, 15 favoris et
30 créneaux de disponibilité/indisponibilité. Seuls les recruteurs approuvés
possèdent des missions. Aucun compte administrateur ni session n'est créé.

Toutes les insertions et le marqueur final sont atomiques. Une relance ne fait
rien si le marqueur existe, afin de conserver les modifications faites pendant
les tests, notamment les mots de passe, statuts, dates et messages.
Si un email réservé existe sans marqueur, le script refuse de continuer plutôt
que de modifier ce compte. Les dates sont relatives au premier lancement ; une
relance ne les décale pas. Ne supprimez pas la notification de marqueur
`[QuickJob seed v1] Jeu de démonstration installé.` si vous souhaitez conserver
la détection du jeu existant.
