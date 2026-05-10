# 🔍 Audit Web — Scory-bot (`web/src/`)

Fichiers analysés : `api.js`, `App.jsx`, composantes, routes et pages.

> *Contrairement au backend Telegram, le frontend React (`web/src`) est globalement bien plus robuste. Il n'invente pas de fausses données dures à l'insu de l'utilisateur et encapsule proprement sa logique par `chatId`.*

### 🐛 Défauts identifiés

#### 1. `api.js` — Code mort (Endpoints définis mais jamais appelés)
> **Sévérité : Faible** — La fonction `getActivityHistory` est pleinement exportée et censée attaquer `/activities/:id/history`, mais elle n'est **jamais appelée** nulle part dans l'application React. Par conséquent, il manque côté interface la possibilité de voir l'historique complet d'une activité spécifique, alors que l'infrastructure API a été prévue pour.

#### 2. `App.jsx` — Utilisation de variable avant définition (Temporal Dead Zone)
> **Sévérité : Mineure** — La fonction fléchée `const initAuth = async () => {...}` est définie *après* le hook `useEffect` (`Ligne 48`) qui l'invoque. Bien que cela fonctionne "par magie" grâce à l'exécution asynchrone du callback de `useEffect` (qui s'exécute après le first render donc l'instance est chargée), appeler une fonction `const` avant sa ligne de déclaration est une mauvaise pratique standardisée qui pourrait déclencher des erreurs `ReferenceError` dans des environnements de bundling stricts ou si refactorée de façon non vigilante.

#### 3. `ActivityDetail.jsx` — Risques de collisions d'index dans le rendu React (Anti-pattern `key={index}`)
> **Sévérité : Faible** — Lors du rendu des sous-activités, le JSX génère un attribut de clé de réconciliation fallback via : `key={sub._id || sub.name || i}`. Utiliser l'index `i` du tableau `.map` comme clé de repli est un anti-pattern React bien connu. Cela peut provoquer des pertes de focus sur les champs de saisie ou des bugs graphiques subtils de permutation si la liste de sous-activités venait à changer d'ordre.

---

### ✅ Les points forts de ce module web (Ce qui fonctionne)

Le module Web est une réussite architecturale sur plusieurs points : 
- **L'isolation contextuelle par Groupe (`GroupContext.jsx`)** : Ce constructeur stocke habilement le `chatId` en paramètre d'URL (`start_param`), puis initialise son Context API pour que tous les appels Axios filtrent spécifiquement les données du chat Telegram actuellement visualisé.
- **Ressenti Haptique Natif** : L'implémentation de la Telegram Web App Object utilise magnifiquement les retours haptiques natifs du téléphone de l'utilisateur lors de la manipulation des boutons et la confirmation des boîtes de dialogues (`globalThis.Telegram?.WebApp?.HapticFeedback`).
- **Adaptation Thématique automatique** : Le composant racine `App.jsx` lie proprement les variables CSS `--tg-theme-bg-color` depuis le SDK Telegram, ce qui offre au web app un Dark/Light mode adaptatif automatique suivant le système natif de l'utilisateur.

---

### 🛠 Corrections Appliquées

#### 1. `api.js` — `getActivityHistory` rendu utilisable
> **Correctif** : Ajout du filtre `chatId` obligatoire (via `getChatId()`) pour éviter les fuites inter-groupes et rendre la fonction cohérente avec le reste du client API.

#### 2. `App.jsx` — Temporal Dead Zone corrigée
> **Correctif** : Déplacement de la déclaration `const initAuth = async () => {...}` **avant** le `useEffect` qui l'appelle. La fonction est désormais définie lexicalement avant son utilisation, ce qui empêche tout `ReferenceError` potentiel.

#### 3. `ActivityDetail.jsx` — Anti-pattern `key={index}` supprimé
> **Correctif** : Remplacement des clés baées sur l'index du tableau par des clés déterministes stables (`sub._id || sub-${sub.name}` pour les sous-activités, `score._id || score-${score.createdAt}-${i}` pour les scores). Suppression de la variable `i` inutilisée dans le `.map()` des sous-activités.
