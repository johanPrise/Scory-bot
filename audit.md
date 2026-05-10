# 🔍 Audit complet — Scory-bot

Audit module par module. Chaque section identifie les défauts où **le code dit mais ne fait pas ce qu'il dit**, ou les incohérences logiques.

---

## Module 1 : Config (`src/config/`)

Fichiers analysés : `bot.js`, `telegram.js`, `database.js`, `messages.js`

### 🐛 Défauts identifiés

#### 1. `bot.js` — `getCommandUsage()` génère des doublons de `/` dans l'usage
> **Sévérité : Faible** — Pour les commandes sans paramètres (`start`, `activities`), `getCommandUsage` retourne `''`, ce qui produit un espace trailing dans le JSON sauvegardé. Pas bloquant mais désordonné.

#### 2. `bot.js` — `saveCommandsToFile()` fait un appel API Telegram inutile
> **Sévérité : Faible** — Appel réseau `bot.getMe()` supplémentaire à chaque démarrage. La valeur `botInfo` est déjà disponible dans `setupBot()` mais n'est pas réutilisée.

#### 3. `telegram.js` — Rate limit utilise l'API Telegraf, pas `node-telegram-bot-api`
> **Sévérité : Élevée** — Ce code **ne sera jamais exécuté** tel quel car le rate limiter de `telegram.js` n'est **jamais branché** sur le bot. C'est du code mort qui utilise une API incompatible (Telegraf). Si quelqu'un essaie de l'intégrer, ça crashera.

#### 4. `telegram.js` — Configurations déclarées mais jamais utilisées
> **Sévérité : Moyenne** — Les sections `RATE_LIMIT`, `LOGGING`, `CACHE`, `SECURITY`, `LOCALIZATION`, `MAINTENANCE_MODE` sont définies mais **jamais lues** par aucun code. Cela donne l'illusion que ces fonctionnalités existent (ex. si on met `MAINTENANCE_MODE=true` dans le `.env`, le bot ne refusera pas les commandes pour autant).

#### 5. `database.js` — Event listeners réenregistrés à chaque tentative
> **Sévérité : Faible** — Après un échec de connexion suivi d'une réussite, les listeners Mongoose (`error`, `disconnected`) s'accumuleront.

#### 6. `messages.js` — Messages définis mais ignorés
> **Sévérité : Moyenne** — Les commandes utilisent leurs propres strings en dur (`'❌ Une erreur est survenue...'`) au lieu de référencer ce fichier, le rendant inutile.

---

## Module 2 : Commandes Auth (`src/commands/auth/`)

Fichier analysé : `start.js`

### 🐛 Défauts identifiés

#### 1. `start.js` — Utilisation de la propriété inexistante `user.wasNew`

```javascript
// Ligne 68 : Utilisation d'une propriété wasNew qui n'a jamais été définie
user.wasNew !== false ? '✅ Votre profil a été créé automatiquement.' : '',
```

> **Sévérité : Moyenne** — Le modèle Mongoose `User` n'a pas de champ `wasNew`. Le code n'initialise jamais cette propriété (par exemple en faisant `user.wasNew = true` lors de la création). Conséquence : `user.wasNew` est toujours `undefined`. L'évaluation `undefined !== false` est toujours **vraie**. Le message "✅ Votre profil a été créé automatiquement." s'affichera à **chaque fois** qu'un utilisateur (même ancien) tapera `/start`.

---

## Module 3 : Commandes Activities (`src/commands/activities/`)

Fichiers analysés : `createActivity.js`, `createActivityWithButtons.js`, `addSubActivity.js`, `listActivities.js`, `deleteActivity.js`, `history.js`

### 🐛 Défauts identifiés

#### 1. `createActivityWithButtons.js` — Workflow interactif incomplet (Impasse)

```javascript
// Lignes 72-74 : Stocker temporairement le type d'activité...
// Note: Vous devrez implémenter un système de gestion d'état utilisateur
// userSessions.set(userId, { step: 'waiting_activity_name', activityType });
```

> **Sévérité : Élevée** — Le flow interactif via boutons s'arrête brutalement ! L'utilisateur clique sur un type d'activité, le bot lui demande le nom, mais le bot **n'écoute pas la réponse**. Le code gérant les "sessions utilisateurs" (`userSessions`) est commenté et inexistant. Les utilisateurs sont coincés dans une impasse.

#### 2. `addSubActivity.js` — Absence de vérifications de permissions
> **Sévérité : Élevée** — N'importe qui peut utiliser `/addsubactivity` pour ajouter une sous-activité dans le projet appartenant à quelqu'un d'autre ! Il n'y a pas de vérification que l'utilisateur (`userId`) est bien le créateur (`createdBy`) ou un administrateur de l'équipe propriétaire de l'activité.

#### 3. `deleteActivity.js` et `activityService.deleteActivity` — Oubli de suppression des scores liés

```javascript
// src/api/services/activityService.js :
export const deleteActivity = async (id, chatId) => {
    // Retirer de l'équipe...
    await Activity.findByIdAndDelete(id);
}
```

> **Sévérité : Critique (Intégrité des données)** — Le modèle `Score` référence les activités (`activity: { type: ObjectId, ref: 'Activity' }`). Lorsqu'une activité est supprimée avec `/deleteactivity`, elle est bien retirée de la collection Activity et de la Team (via l'appel `activityService.deleteActivity`), mais **les scores associés ne sont jamais supprimés**. Cela crée des **scores orphelins (fantômes)** dans la base de données ciblant une activité inexistante. Au bout d'un certain nombre d'activités créées et supprimées, cela finira irrémédiablement par faire planter les commandes comme `/dashboard`, `/stats` ou `/rankings` qui s'attendraient à pouvoir "peupler" ces références.

---

## Module 4 : Commandes Scores (`src/commands/scores/`)

Fichiers analysés : `addScore.js`, `addSubScore.js`, `getRanking.js`, `getSubRanking.js`, `advancedRanking.js`, `deleteScore.js`, `dashboard.js`, `scoreHistory.js`

### 🐛 Défauts identifiés

#### 1. `dashboard.js` — Génération de FAUSSES statistiques !

```javascript
// Lignes 75-81 : Généner de fausses données dures pour le dashboard
// Générer des données bidons pour l'exemple
const totalScore = Math.floor(Math.random() * 5000) + 1000;
const completedActivities = Math.floor(Math.random() * 50) + 10;
const recentScores = Math.floor(Math.random() * 20) + 1;
// ...
```

> **Sévérité : Élevée (Mensonge à l'utilisateur)** — La commande `/dashboard` ne lit **absolument aucune donnée** en base. Elle affiche un dashboard rempli de valeurs `Math.random()` générées aléatoirement à chaque fois que la commande est lancée. L'utilisateur pense voir ses statistiques réelles, mais ce n'est qu'un mirage. De plus, `scoreService.getDashboardData` n'est jamais appelé par cette commande.

#### 2. `scoreHistory.js` — Tableaux de FAUX historiques !

```javascript
// Lignes 128-154 : Générer de faux historiques de scores !
const generateDummyHistory = (count) => {
  const dummyActivityNames = [...];
  // ...
  history.push({
    activity: { name: dummyActivityNames[...] },
    value: Math.floor(Math.random() * 90) + 10,
    createdAt: new Date(Date.now() - Math.floor(Math.random() * 30 * ...
  });
};
```

> **Sévérité : Élevée (Mensonge)** — Tout comme `/dashboard`, `/shistory` (l'historique et l'exportation CSV des scores) repose sur la génération de fausses données ("Dummy History") ou sur l'envoi d'URLs de téléchargements factices (`https://scory-api.example.com/exports/...`). Le `scoreService.getScoreHistory` défini dans l'API API N'EST JAMAIS utilisé !

#### 3. Callbacks Telegraf incompatibles 

Les fichiers `dashboard.js`, `scoreHistory.js`, et `advancedRanking.js` incluent les fonctions "handlers" de callbacks inline :
- `handleDashboardActions(ctx)`
- `handleHistoryActions(ctx)`
- `handleRankingActions(ctx)`

```javascript
// Ligne 222 (dashboard.js) : 
export const handleHistoryActions = async (ctx) => {
  const action = ctx.update.callback_query.data;
  // ...
  await ctx.editMessageText(...)
}
```

> **Sévérité : Élevée** — Ces 3 fichiers exportent des fonctions qui attendent un paramètre `ctx` provenant du validateur `Telegraf`. Or l'application utilise `node-telegram-bot-api`, qui n'utilise pas le concept de Callback Context (`ctx`). Lorsqu'on clique sur les boutons de filtre ("Jour", "Mois", "Vue Générale", "Exporter"), ces boutons ne feront rien ou feront crasher l'application. Cerise sur le gâteau : dans `src/commands/utils/callbackHandler.js`, on voit bien que ces exports de `actions` ne sont mêmes pas branchés.

#### 4. `getSubRanking.js` — Variable non définie

```javascript
// Ligne 110 : formatting avec activityId introuvable
return formatSubRanking(rankings, subActivityName, activityId);

// Ligne 92 : 'activityId' n'existe pas dans ce contexte (c'était targetActivity.id qu'il fallait utiliser)
```

> **Sévérité : Moyenne** — Erreur de logique de base, un test n'a pas été exécuté avec une sous-activité, car la variable `activityId` de la ligne 110 a été renommée ou est inaccessible, provoquant un crash `ReferenceError`.

---

## Module 5 : Commandes Teams (`src/commands/teams/`)

Fichiers analysés : `createTeam.js`, `addToTeam.js`, `getTeamRanking.js`, `deleteTeam.js`

### 🐛 Défauts identifiés

#### 1. `getTeamRanking.js` — Paramètre `activity` superbement ignoré
> **Sévérité : Élevée** — La commande `/teamranking [activité]` promet de donner le classement des équipes pour une activité spécifique. Or, la fonction parente `teamService.getTeamRanking({ chatId, activityName })` qui est appelée ... ignore complètement le paramètre `activityName` dans son filtre MongoDB (`const filter = { chatId };`). Le résultat affiché est systématiquement le classement global des équipes combinant toutes les activités confondues.

#### 2. `deleteTeam.js` — Références orphelines (Fuite de données)
> **Sévérité : Élevée (Intégrité des données)** — Lorsqu'une équipe est supprimée, la commande la retire bien des profils utilisateurs (`user.removeFromTeam(teamId)`). En revanche, **elle ne supprime pas l'équipe des activités associées** (`Activity.teamId`), et **ne supprime pas les scores associés à cette équipe**. Cela corrompt la base avec des activités pointant sur une équipe fantôme et des scores d'équipes devenus impossibles à résoudre.

---

## Module 6 : Commandes Utils (`src/commands/utils/`)

Fichiers analysés : `helpers.js`, `callbackHandler.js`, `botCommandUtils.js`, `help.js`, `getStats.js`, `index.js`, `webAppCommands.js`

### 🐛 Défauts identifiés

#### 1. `callbackHandler.js` — Centralisation des impasses interactives (Stubs)

```javascript
else if (action.startsWith('ranking_')) {
  // Callbacks de classement avancé
  await bot.answerCallbackQuery(query.id, { text: "Callback de classement détecté" });
}
```

> **Sévérité : Élevée** — Toutes les commandes interactives qui génèrent des boutons cliquables (Dashboard, Historique, Classements avancés) dépendent de ce fichier pour réagir aux clics. Toutefois, `callbackHandler.js` ne contient que des "bouchons" (stubs): il affiche furtivement un texte du type "Callback (...) détecté" pour toutes les actions `ranking_`, `history_` et `dashboard_`. Les interfaces interactives construites dans le Module 4 sont donc toutes des impasses absolues : les boutons sont jolis, mais purement décoratifs.

#### 2. `getStats.js` — Statistiques globales divulguées à tous
> **Sévérité : Moyenne (Confidentialité)** — La commande `/stats` exécute un `.countDocuments()` global sur toute la base de données MongoDB, sans filtrer par l'identifiant du chat (`chatId`). Dans n'importe quel groupe ou messagerie privée, n'importe quel utilisateur verra le nombre *total* d'équipes, de scores, d'activités et d'utilisateurs de tous les autres groupes du bot réunis, violant le cloisonnement des données attendu d'un bot multi-groupe.

---

## Module 7 & 8 : API Models & Services (`src/api/models/` et `src/api/services/`)

Fichiers analysés : `User.js`, `activity.js`, `Score.js`, `Team.js`, `scoreService.js`, `teamService.js`, `activityService.js`

### 🐛 Défauts identifiés

#### 1. `scoreService.js` — Le `getDashboardData()` divulgue les scores du monde entier (Fuite de confidentialité)
> **Sévérité : Critique** — La méthode accepte un paramètre `chatId`, mais l'**ignore ostensiblement** dans sa requête MongoDB : `const recentScores = await Score.find({ status: 'approved' })...`. Elle renvoie donc les 10 derniers scores validés sur le serveur et les meilleurs joueurs (Top Performers) confondues avec n'importe quel groupe ! Si deux groupes telegram distincts utilisent le bot, les données de l'un s'afficheront sur le dashboard de l'autre !

#### 2. Déconnexion Commandes-Services (Code mort de qualité)
> **Sévérité : Décevante** — Le comble de l'ironie est que les services `scoreService.js` contiennent une logique métier *complète, bien écrite et validée* pour extraire l'historique et les données pertinentes des utilisateurs (avec d'excellents pipelines d'agrégation Mongoose). Sauf que... le code des commandes (voir Module 4) ignore sciemment ces services et appelle des générateurs factices locaux (`generateDummyHistory`). Il y a des centaines de lignes mortes qui ne servent qu'à combler un déficit de communication entre celui qui a écrit l'API et celui qui a rédigé le script bot.

---

## Module 9 : Point d'entrée (`src/api/index.js`)

Fichier analysé : `index.js`

### 🐛 Défauts identifiés

#### 1. `index.js` — Routage HTTP Webhook Telegram non sécurisé
> **Sévérité : Moyenne** — La route webhook Telegram `/webhook/${process.env.TELEGRAM_BOT_TOKEN}` utilise l'URL obfusquée par le jeton bot. C'est bien, néanmoins, Telegram supporte l'utilisation de l'en-tête secret (`X-Telegram-Bot-Api-Secret-Token`) pour garantir que seules leurs IP poussent des requêtes sur l'ExpressJS. Ce contrôle est formellement absent de la requête recevant les updates (`app.post(webhookPath, (req, res)...)`), un script connaissant le jeton pourrait artificiellement simuler des clics sur les boutons en pushant du JSON vers ce endpoint.

--- 

🏁 **Fin de l'Audit Global**. Les points vitaux à réparer en priorité absolue relèvent Backend : la **fausse donnée générée à la vue de l'utilisateur** (Module 4) et les **lacunes d'intégrité de la suppression** (Scores et Equipes orphelins dans le Module 3 / 5).
