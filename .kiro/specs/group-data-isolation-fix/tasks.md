# Implementation Plan

- [ ] 1. Fix for group data isolation

  - [x] 1.1 Create chatId validation middleware
    - Create `src/api/middleware/chatIdValidator.js`
    - Implement `requireChatId` middleware to validate chatId presence
    - Implement `validateChatAccess` middleware to verify user access to group
    - Export both middlewares for use in routes
    - _Bug_Condition: isBugCondition(request) where request.params.chatId === undefined OR request.selectedGroup === 'all'_
    - _Expected_Behavior: expectedBehavior(request, response) - reject requests without chatId with 400 status_
    - _Preservation: preservedBehavior(request, response) - requests with valid chatId continue to work correctly_
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 1.2 Update model schemas to require chatId
    - Update Activity model: make chatId required and indexed
    - Update Team model: make chatId required and indexed
    - Update Score model: make metadata.chatId required and indexed
    - Add validation error messages for missing chatId
    - _Bug_Condition: isBugCondition(request) where request.body.chatId === undefined_
    - _Expected_Behavior: expectedBehavior(request, response) - entity creation requires chatId_
    - _Preservation: preservedBehavior(request, response) - entities with chatId are created correctly_
    - _Requirements: 2.5_

  - [x] 1.3 Apply validation middlewares to API routes
    - Update `src/api/routes/activities.js` to use requireChatId and validateChatAccess
    - Update `src/api/routes/scores.js` to use requireChatId and validateChatAccess
    - Update `src/api/routes/teams.js` to use requireChatId and validateChatAccess
    - Ensure all GET/POST/PUT/DELETE routes filter by chatId
    - _Bug_Condition: isBugCondition(request) where request.type === 'API' AND request.params.chatId === undefined_
    - _Expected_Behavior: expectedBehavior(request, response) - all API routes require and validate chatId_
    - _Preservation: preservedBehavior(request, response) - existing routes with chatId continue to work_
    - _Requirements: 2.1, 2.2, 2.3, 2.6_

  - [x] 1.4 Update frontend group selector
    - Locate or create `web/src/components/GroupSelector.vue` (or equivalent)
    - Remove "Tous les groupes" option from selector
    - Add validation to prevent API calls without selected group
    - Display message when no group is selected
    - Persist selected group in localStorage
    - Block data display until group is selected
    - _Bug_Condition: isBugCondition(request) where request.type === 'FRONTEND' AND request.selectedGroup === 'all'_
    - _Expected_Behavior: expectedBehavior(request, response) - force specific group selection_
    - _Preservation: preservedBehavior(request, response) - group switching continues to work_
    - _Requirements: 2.2, 2.4_

  - [x] 1.5 Contextualize statistics display
    - Update statistics components to show group name
    - Format: "200 points dans [Nom du Groupe]"
    - Add group badge to statistics display
    - Ensure all user stats show group context
    - _Bug_Condition: isBugCondition(request) where request.type === 'STATS' AND request.groupContext === undefined_
    - _Expected_Behavior: expectedBehavior(request, response) - statistics always show group context_
    - _Preservation: preservedBehavior(request, response) - statistics calculation remains correct_
    - _Requirements: 2.4_

  - [x] 1.6 Update Telegram commands for group tracking
    - Review all commands in `src/commands/` to ensure chatId extraction
    - Ensure `ChatGroup.upsertGroup()` is called in each command
    - Validate user belongs to group before operations
    - Ensure all database operations include chatId filter
    - _Bug_Condition: isBugCondition(request) where hasValidChatIdContext(request) === false_
    - _Expected_Behavior: expectedBehavior(request, response) - all commands track and validate group context_
    - _Preservation: preservedBehavior(request, response) - command functionality remains unchanged_
    - _Requirements: 2.1, 2.3, 2.5, 2.6_

- [ ] 2. Manual verification
  - Test manually with multiple groups to confirm isolation
  - Verify API endpoints reject requests without chatId
  - Verify error messages are correct
  - Verify data isolation is maintained
  - Verify group switching works correctly
  - Verify rankings and pagination work correctly
  - Ensure no regressions in existing functionality
