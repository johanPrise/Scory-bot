# Design Document - Group Data Isolation Fix

## Introduction

Ce document définit la conception technique pour corriger le bug critique d'isolation des données entre groupes Telegram dans l'application Scory Bot. Le système doit garantir que chaque groupe Telegram constitue un univers complètement isolé avec ses propres activités, scores, équipes et classements.

## Bug Condition Methodology

### Fault Condition

La condition de bug identifie les entrées qui déclenchent le comportement défectueux.

**isBugCondition(request):**
```
RETURN (
  // Requêtes API sans chatId
  (request.type === 'API' AND request.params.chatId === undefined) OR
  
  // Requêtes frontend avec "Tous les groupes" sélectionné
  (request.type === 'FRONTEND' AND request.selectedGroup === 'all') OR
  
  // Création d'entités sans chatId
  (request.type === 'CREATE' AND request.body.chatId === undefined) OR
  
  // Requêtes de lecture sans validation du chatId
  (request.type === 'READ' AND NOT hasValidChatIdContext(request)) OR
  
  // Affichage de statistiques sans contexte de groupe
  (request.type === 'STATS' AND request.groupContext === undefined)
)
```

**Concrete Failing Cases:**
1. `GET /api/activities` sans paramètre `chatId`
2. `GET /api/scores` sans paramètre `chatId`
3. `GET /api/teams` sans paramètre `chatId`
4. `POST /api/activities` avec `body.chatId = undefined`
5. `POST /api/scores` avec `metadata.chatId = undefined`
6. Frontend: sélecteur de groupe avec option "Tous les groupes"
7. Affichage de statistiques utilisateur sans indication du groupe

### Expected Behavior Properties

Les propriétés définissent le comportement correct pour les entrées satisfaisant la condition de bug.

**expectedBehavior(request, response):**
```
FOR ALL request WHERE isBugCondition(request):

  // Propriété 1: Rejet des requêtes sans chatId
  IF request.params.chatId === undefined THEN
    response.status === 400 AND
    response.error === "chatId is required" AND
    response.data === null
  
  // Propriété 2: Validation du chatId
  IF request.params.chatId !== undefined THEN
    validateChatId(request.params.chatId) === true AND
    userHasAccessToChat(request.user, request.params.chatId) === true
  
  // Propriété 3: Isolation des données
  FOR ALL entity IN response.data:
    entity.chatId === request.params.chatId
  
  // Propriété 4: Contextualisation des statistiques
  IF request.type === 'STATS' THEN
    response.data.groupName !== undefined AND
    response.data.groupContext !== undefined
  
  // Propriété 5: Sélection de groupe obligatoire
  IF request.type === 'FRONTEND' THEN
    request.selectedGroup !== 'all' AND
    request.selectedGroup !== undefined
```

### Preservation Requirements

Les exigences de préservation définissent le comportement qui doit rester inchangé pour les entrées non-buggy.

**¬isBugCondition(request):**
```
RETURN (
  // Requêtes avec chatId valide
  (request.params.chatId !== undefined AND validateChatId(request.params.chatId)) AND
  
  // Utilisateur a accès au groupe
  userHasAccessToChat(request.user, request.params.chatId) AND
  
  // Contexte de groupe correctement défini
  (request.type !== 'FRONTEND' OR request.selectedGroup !== 'all')
)
```

**preservedBehavior(request, response):**
```
FOR ALL request WHERE ¬isBugCondition(request):

  // Préservation 1: Affichage correct des données du groupe
  response.status === 200 AND
  FOR ALL entity IN response.data:
    entity.chatId === request.params.chatId
  
  // Préservation 2: Création d'entités avec chatId
  IF request.type === 'CREATE' THEN
    createdEntity.chatId === request.params.chatId AND
    createdEntity.chatId !== null
  
  // Préservation 3: Navigation entre groupes
  IF request.type === 'GROUP_SWITCH' THEN
    response.data.chatId === request.newChatId AND
    previousGroupData NOT IN response.data
  
  // Préservation 4: Calcul des classements
  IF request.type === 'RANKING' THEN
    FOR ALL score IN response.ranking:
      score.metadata.chatId === request.params.chatId
  
  // Préservation 5: Détails d'équipe
  IF request.type === 'TEAM_DETAILS' THEN
    response.team.chatId === request.params.chatId AND
    FOR ALL member IN response.team.members:
      memberBelongsToGroup(member, request.params.chatId)
  
  // Préservation 6: Pagination
  IF request.pagination !== undefined THEN
    response.pagination.total === countEntitiesInGroup(request.params.chatId) AND
    response.pagination.page === request.pagination.page
```

## Technical Design

### 1. Backend Validation Layer

**Location:** `src/api/middleware/chatIdValidator.js`

**Purpose:** Middleware pour valider la présence et la validité du chatId dans toutes les requêtes API.

**Implementation:**
```javascript
export const requireChatId = (req, res, next) => {
  const chatId = req.query.chatId || req.body.chatId || req.body.metadata?.chatId;
  
  if (!chatId) {
    return res.status(400).json({
      error: 'chatId is required',
      message: 'All operations must be scoped to a specific Telegram group'
    });
  }
  
  req.chatId = chatId;
  next();
};

export const validateChatAccess = async (req, res, next) => {
  const { chatId } = req;
  const userId = req.user._id;
  
  const hasAccess = await ChatGroup.userHasAccess(userId, chatId);
  
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have access to this group'
    });
  }
  
  next();
};
```

### 2. Model Schema Updates

**Location:** `src/api/models/*.js`

**Purpose:** Rendre le champ `chatId` obligatoire dans tous les modèles.

**Changes:**
- Activity model: `chatId: { type: String, required: true, index: true }`
- Team model: `chatId: { type: String, required: true, index: true }`
- Score model: `metadata.chatId: { type: String, required: true, index: true }`

### 3. Frontend Group Selector

**Location:** `web/src/components/GroupSelector.vue`

**Purpose:** Forcer la sélection d'un groupe spécifique avant d'afficher des données.

**Implementation:**
- Supprimer l'option "Tous les groupes"
- Afficher un message si aucun groupe n'est sélectionné
- Bloquer les requêtes API tant qu'un groupe n'est pas sélectionné
- Persister le groupe sélectionné dans le localStorage

### 4. API Routes Updates

**Location:** `src/api/routes/*.js`

**Purpose:** Appliquer les middlewares de validation sur toutes les routes.

**Changes:**
```javascript
// Appliquer sur toutes les routes
router.use(requireChatId);
router.use(validateChatAccess);

// Filtrer par chatId dans toutes les requêtes
router.get('/activities', async (req, res) => {
  const { chatId } = req;
  const activities = await Activity.find({ chatId });
  res.json(activities);
});
```

### 5. Statistics Contextualization

**Location:** `web/src/components/UserStats.vue`

**Purpose:** Afficher le contexte du groupe dans toutes les statistiques.

**Implementation:**
- Ajouter le nom du groupe dans l'affichage des statistiques
- Format: "200 points dans [Nom du Groupe]"
- Afficher un badge avec le nom du groupe

### 6. Command Updates

**Location:** `src/commands/**/*.js`

**Purpose:** S'assurer que toutes les commandes Telegram enregistrent le chatId.

**Changes:**
- Vérifier que `chatId` est toujours extrait de `msg.chat.id`
- Enregistrer le groupe via `ChatGroup.upsertGroup()` à chaque commande
- Valider que l'utilisateur appartient au groupe avant toute opération

## Testing Strategy

### Exploration Tests (Property 1: Fault Condition)

**Test:** Vérifier que les requêtes sans chatId sont rejetées

**Scoped PBT Approach:**
```javascript
// Générer des requêtes API sans chatId
property('API requests without chatId are rejected', 
  fc.record({
    endpoint: fc.constantFrom('/api/activities', '/api/scores', '/api/teams'),
    method: fc.constantFrom('GET', 'POST'),
    body: fc.object(),
    // chatId intentionnellement absent
  }),
  async (request) => {
    const response = await makeRequest(request);
    
    // Expected behavior: rejection
    assert.equal(response.status, 400);
    assert.equal(response.error, 'chatId is required');
    assert.isNull(response.data);
  }
);
```

### Preservation Tests (Property 2: Preservation)

**Test:** Vérifier que les requêtes avec chatId valide fonctionnent correctement

**PBT Approach:**
```javascript
// Générer des requêtes avec chatId valide
property('Valid chatId requests work correctly',
  fc.record({
    chatId: fc.string({ minLength: 1 }),
    endpoint: fc.constantFrom('/api/activities', '/api/scores', '/api/teams'),
    userId: fc.string()
  }),
  async ({ chatId, endpoint, userId }) => {
    // Setup: créer un groupe et donner accès à l'utilisateur
    await setupGroupAccess(userId, chatId);
    
    const response = await makeRequest({
      endpoint,
      params: { chatId },
      user: { _id: userId }
    });
    
    // Preserved behavior
    assert.equal(response.status, 200);
    assert.isArray(response.data);
    
    // Toutes les entités appartiennent au groupe
    response.data.forEach(entity => {
      assert.equal(entity.chatId, chatId);
    });
  }
);
```

## Implementation Checklist

- [ ] Créer le middleware `chatIdValidator.js`
- [ ] Mettre à jour les schémas des modèles (Activity, Team, Score)
- [ ] Appliquer les middlewares sur toutes les routes API
- [ ] Mettre à jour le sélecteur de groupe frontend
- [ ] Contextualiser l'affichage des statistiques
- [ ] Mettre à jour les commandes Telegram
- [ ] Écrire les tests d'exploration (Fault Condition)
- [ ] Écrire les tests de préservation (Preservation)
- [ ] Valider que tous les tests passent

## References

- Bugfix Requirements: `.kiro/specs/group-data-isolation-fix/bugfix.md`
- Bug Condition Methodology: Workflow documentation
- Models: `src/api/models/`
- Routes: `src/api/routes/`
- Frontend: `web/src/`
