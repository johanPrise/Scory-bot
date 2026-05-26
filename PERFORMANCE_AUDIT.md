# Audit de performance applicative - Scory Bot

Date: 2026-05-25

## Nom du probleme

Le bon nom pour ce type de travail est un **audit de performance applicative**, avec:

- **profilage backend**: temps des routes, requetes MongoDB, aggregations, index;
- **audit de scalabilite**: ce qui devient plus lent quand le nombre de scores, groupes, equipes et activites augmente;
- **audit de degradation dans le temps**: fuites de timers/listeners, logs, caches, donnees embarquees, requetes repetitives;
- **observabilite**: savoir quelle route ralentit, quand, et avec quel volume de donnees.

Ce n'est pas seulement un audit de code. Le symptome "tout ralentit avec le temps" indique souvent un melange de requetes qui grossissent avec les donnees, absence de mesures runtime et sur-fetch cote front.

## Diagnostic court

Le projet n'a pas un seul bug evident qui expliquerait tout. Il avait surtout plusieurs facteurs cumulatifs:

- le dashboard et les classements faisaient des aggregations Mongo couteuses sur les scores;
- le front refaisait les memes GET courts lors des navigations et remontages React;
- `/api/groups` faisait un pattern N+1: 3 compteurs par groupe;
- les requetes HTTP lentes en statut 200 n'etaient pas visibles en production;
- certains endpoints chargent des documents enrichis/populates plus gros que necessaire.

Ces problemes peuvent donner exactement l'impression d'une application saine au debut, puis de plus en plus lente a mesure que les scores et groupes s'accumulent.

## Changements appliques

### 1. Cache et deduplication des GET cote front

Fichier: `web/src/api.js`

Ajout:

- cache GET court de 15 secondes;
- deduplication des requetes identiques deja en cours;
- timeout de 20 secondes pour eviter les requetes pendues;
- invalidation du cache apres mutation `POST/PUT/DELETE`.

Impact attendu:

- moins de pics reseau lors des navigations;
- moins de requetes doublonnees en React;
- ressenti front plus stable sur Telegram WebApp.

### 2. Suppression du N+1 sur `/api/groups`

Fichier: `src/api/routes/groups.js`

Avant:

- charger les groupes de l'utilisateur;
- pour chaque groupe: `Activity.countDocuments`, `Team.countDocuments`, `Score.countDocuments`.

Apres:

- charger les groupes;
- faire 3 aggregations groupees par `chatId` pour tous les groupes.

Impact attendu:

- le temps de `/api/groups` depend beaucoup moins du nombre de groupes;
- moins de pression Mongo au lancement du front.

### 3. Optimisation du ranking dashboard

Fichier: `src/api/routes/dashboard.js`

Avant:

- grouper tous les scores par utilisateur;
- trier;
- pousser toute la liste des utilisateurs dans un tableau Mongo (`$push`);
- chercher la position de l'utilisateur en JavaScript.

Apres:

- calculer le score groupe de l'utilisateur;
- compter les utilisateurs mieux classes;
- retourner position, total et score sans construire une grosse liste en memoire.

Impact attendu:

- moins de memoire cote Mongo;
- moins de latence quand un groupe a beaucoup de participants.

### 4. Index Mongo ajoutes

Fichiers:

- `src/api/models/Score.js`
- `src/api/models/activity.js`
- `src/api/models/Team.js`
- `src/api/models/ChatGroup.js`

Index ajoutes pour les chemins chauds:

- scores par `chatId + status + context + createdAt`;
- scores individuels/equipe par `chatId + status + context + user/team`;
- scores par activite;
- activites/equipes triees par groupe;
- groupes actifs par membre.

Important:

Ces index doivent etre effectivement crees sur la base de production. Selon la configuration Mongoose, cela peut arriver automatiquement au demarrage, mais en production il vaut mieux le verifier explicitement avec `syncIndexes()` controle ou via migration.

### 5. Stats personnelles corrigees par groupe

Fichier: `src/api/routes/scores.js`

La stat personnelle de `/api/scores/personal` agrege maintenant avec `metadata.chatId`. Avant, elle pouvait scanner et additionner les scores approuves de tous les groupes de l'utilisateur.

### 6. Slow-request logging

Fichier: `src/api/middleware/requestLogger.js`

Ajout d'un seuil `SLOW_REQUEST_MS`, par defaut `750`.

Les requetes HTTP lentes en 200 passent maintenant en `warn`, donc elles deviennent visibles en production sans activer tous les logs `debug`.

## Risques encore presents

### A. Pas encore de profilage Mongo reel

Les changements reduisent les couts evidents, mais il faut encore mesurer avec la vraie base:

- `explain("executionStats")` sur `/scores/rankings`;
- `explain("executionStats")` sur `/dashboard`;
- temps p50/p95/p99 par endpoint;
- taille des collections `scores`, `activities`, `teams`, `chatgroups`.

Sans ces chiffres, on reste dans un audit statique, pas un diagnostic ferme.

### B. Documents Activity potentiellement trop gros

Le modele `Activity` contient des sous-activites embarquees avec des maps `scores` et `teamScores`. Le code actuel semble surtout utiliser la collection `Score`, mais si des donnees anciennes ou futures remplissent ces maps, un simple chargement d'activite peut devenir lourd.

Action recommandee:

- verifier la taille moyenne et max des documents `activities`;
- eviter de renvoyer les maps de scores embarquees au front;
- garder les scores dans `Score`, pas dans `Activity.subActivities`.

### C. Endpoints detail equipe font plusieurs appels front

`TeamDetail` appelle en parallele:

- `GET /teams/:id`;
- `GET /teams/:id/members`;
- `GET /teams/:id/stats`.

Ce n'est pas forcement grave, mais sur mobile/Telegram cela ajoute de la latence reseau. Un endpoint detail unique ou une option `include=members,stats` serait plus stable.

### D. Le front charge souvent `limit: 100`

Pages concernees:

- activites;
- equipes;
- filtres de classement.

Pour les petits groupes c'est OK. Pour les gros groupes, il faudra passer a une vraie pagination/infinite loading ou des endpoints de recherche.

### E. Build JS front

Build actuel:

- JS gzip: environ 97 kB;
- CSS gzip: environ 8 kB.

Ce n'est pas enorme, mais le front n'a pas encore de code splitting par page. Si l'app grossit, `React.lazy` sur les pages peut reduire le premier chargement.

## Verification faite

Commandes passees:

- `npm test`
- `npm run build` dans `web/`
- `npm run lint` dans `web/`
- `node --check` sur les fichiers backend modifies

Resultat:

- tests backend OK;
- build Vite OK;
- lint front OK;
- syntaxe backend OK.

Note:

`npm ci` dans `web/` signale 7 vulnerabilites npm. Elles n'ont pas ete corrigees automatiquement pour eviter des changements de versions non controles.

## Suite recommandee

### Phase 1 - Mesure production

Ajouter ou exploiter:

- logs des routes lentes avec `SLOW_REQUEST_MS=750` ou `500`;
- dashboards p95/p99 par endpoint;
- taille des collections Mongo;
- requetes les plus lentes MongoDB.

### Phase 2 - Profilage cible

Tester en priorite:

- `/api/dashboard?chatId=...`;
- `/api/scores/rankings?chatId=...`;
- `/api/groups`;
- `/api/activities?limit=100&includeSubActivities=true`;
- `/api/teams?limit=100`.

### Phase 3 - Optimisations suivantes

Actions probables:

- endpoint dashboard unique cote API pour eviter 3 appels front sur Home;
- pagination front reelle sur activites/equipes;
- endpoint equipe detail unique;
- projection stricte des champs renvoyes par les grosses listes;
- migration pour sortir toute donnee de score embarquee dans `Activity`.

