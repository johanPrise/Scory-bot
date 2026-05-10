# Bugfix Requirements Document

## Introduction

L'application Scory Bot est un système de scoring collaboratif pour groupes Telegram où chaque groupe devrait constituer un univers complètement isolé avec ses propres activités, scores, équipes et classements. Actuellement, l'isolation des données entre groupes n'est pas garantie, créant des risques de fuite de données et de confusion pour les utilisateurs.

Ce bug critique compromet l'intégrité fondamentale du système multi-tenant où chaque groupe Telegram (identifié par son `chatId`) doit être strictement isolé des autres groupes.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN une requête API est effectuée sans spécifier de `chatId` THEN le système permet l'opération et peut mélanger des données de différents groupes

1.2 WHEN un utilisateur sélectionne l'option "Tous les groupes" dans le sélecteur THEN le système affiche des données agrégées de tous les groupes, créant de la confusion sur l'appartenance des données

1.3 WHEN le backend reçoit une requête de création/modification sans `chatId` THEN le serveur n'empêche pas l'opération et peut créer des entités orphelines ou mal associées

1.4 WHEN un utilisateur consulte ses statistiques (ex: "Mes 200 points") THEN le système n'indique pas clairement à quel groupe ces points appartiennent

1.5 WHEN une requête API est construite côté frontend THEN le `chatId` est traité comme paramètre optionnel, permettant des requêtes sans contexte de groupe

1.6 WHEN un utilisateur accède à une page affichant des données (classements, activités, équipes) THEN le système peut potentiellement afficher des données d'autres groupes si le contexte n'est pas correctement validé

### Expected Behavior (Correct)

2.1 WHEN une requête API est effectuée THEN le système SHALL exiger un `chatId` valide et rejeter toute requête sans ce paramètre avec une erreur explicite

2.2 WHEN un utilisateur accède à l'interface web THEN le système SHALL forcer la sélection d'un groupe spécifique avant d'afficher quelque donnée que ce soit

2.3 WHEN le backend reçoit une requête de création/modification THEN le serveur SHALL valider la présence du `chatId` et vérifier que l'utilisateur a accès à ce groupe

2.4 WHEN un utilisateur consulte ses statistiques THEN le système SHALL toujours contextualiser les données par groupe (ex: "200 points dans [Nom du Groupe]")

2.5 WHEN une entité (activité, score, équipe) est créée THEN le système SHALL obligatoirement l'associer à un `chatId` unique et non-null

2.6 WHEN un utilisateur tente d'accéder aux données d'un groupe THEN le système SHALL vérifier que l'utilisateur est membre de ce groupe avant d'autoriser l'accès

### Unchanged Behavior (Regression Prevention)

3.1 WHEN un utilisateur consulte les données d'un groupe dont il est membre THEN le système SHALL CONTINUE TO afficher correctement toutes les activités, scores et classements de ce groupe

3.2 WHEN un utilisateur crée une nouvelle activité ou score dans un groupe spécifique THEN le système SHALL CONTINUE TO enregistrer correctement ces données avec le `chatId` approprié

3.3 WHEN un utilisateur navigue entre différents groupes dont il est membre THEN le système SHALL CONTINUE TO permettre le changement de contexte et afficher les données du groupe sélectionné

3.4 WHEN le système calcule des classements pour un groupe THEN le système SHALL CONTINUE TO inclure uniquement les scores et activités de ce groupe spécifique

3.5 WHEN un utilisateur consulte les détails d'une équipe THEN le système SHALL CONTINUE TO afficher les membres et statistiques de cette équipe dans le contexte de son groupe

3.6 WHEN l'API retourne des listes paginées (activités, scores, équipes) THEN le système SHALL CONTINUE TO respecter les paramètres de pagination tout en filtrant par `chatId`
