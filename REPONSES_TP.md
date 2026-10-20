# TP1 — Réponses aux questions

## Partie 1 : Prisma et SQLite

1. **Pourquoi email doit-il être unique ?** La contrainte garantit un seul compte par email, même si deux inscriptions arrivent simultanément. Le conflit est traité avec HTTP 409.
2. **Pourquoi versionner les migrations ?** Elles conservent l'historique SQL du schéma et permettent de le reproduire pour chaque développeur et lors du déploiement.
3. **Quelle limite de SQLite en production ?** La base est un fichier local et les écritures sont sérialisées. Une architecture multi-serveurs nécessite un stockage adapté, par exemple PostgreSQL.

## Partie 2 : validation et session

1. **HttpOnly, Secure, SameSite ?** HttpOnly empêche JavaScript de lire le cookie. Secure limite son transport à HTTPS. SameSite=Lax limite son envoi depuis d'autres sites et atténue le CSRF.
2. **Pourquoi aucun mot de passe dans le JWT ?** Le payload est encodé, pas chiffré : il est lisible. La signature garantit son intégrité, pas sa confidentialité. Le hash ne doit pas non plus être exposé.
3. **Que se passe-t-il si le secret change ?** Les anciens jetons ne passent plus la vérification de signature ; tous les utilisateurs doivent se reconnecter.

## Partie 3 : API

1. **Pourquoi un message identique pour email inconnu et mauvais mot de passe ?** Pour éviter de révéler directement quels comptes existent.
2. **Que représente le coût bcrypt 10 ?** Un facteur de travail exponentiel proportionnel à 2^10. Augmenter le coût de 1 double approximativement le travail et le temps de calcul.
3. **Quels codes HTTP ?** 201 : compte créé ; 400 : données invalides ; 401 : authentification absente ou incorrecte ; 404 : compte introuvable ; 409 : email déjà utilisé.

## Partie 4 : protection

1. **Pourquoi éviter Prisma dans le middleware du TP ?** Le middleware Edge de Next.js 15 ne fournit pas toutes les API Node nécessaires au moteur Prisma classique. QuickJob utilise Next.js 16 avec proxy.ts et conserve la séparation : JWT dans le proxy, accès à la base dans les pages et les API.
2. **Qu'est-ce que la défense en profondeur ?** Plusieurs contrôles indépendants. Le proxy facilite la navigation, mais chaque ressource sensible revérifie la session et l'utilisateur avant d'exposer les données.

## Sessions sans état

Le JWT expire après 7 jours. Déconnecter le navigateur supprime son cookie ; un jeton déjà copié reste valide jusqu'à expiration ou changement du secret. La révocation individuelle demande le bonus de sessions persistantes, non inclus ici.