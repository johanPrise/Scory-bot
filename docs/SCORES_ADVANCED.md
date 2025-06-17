# Fonctionnalités de Scores Avancés

Ce document décrit les nouvelles fonctionnalités de scores avancés implémentées dans le bot Scory.

## Commandes Disponibles

### 1. Classement Avancé

Affiche un classement personnalisable avec filtres.

**Commande**: `/aranking [période] [activité]`

- `période`: (optionnel) `week`, `month` (défaut), `year`, `all`
- `activité`: (optionnel) ID de l'activité pour filtrer

**Exemples**:
- `/aranking` - Affiche le classement du mois
- `/aranking week` - Affiche le classement de la semaine
- `/aranking month act123` - Affiche le classement du mois pour l'activité spécifiée

### 2. Historique des Scores

Affiche l'historique des scores avec des options de filtrage.

**Commande**: `/shistory [période] [activité]`

- `période`: (optionnel) `week`, `month` (défaut), `3months`, `all`
- `activité`: (optionnel) ID de l'activité pour filtrer

**Exemples**:
- `/shistory` - Affiche l'historique du mois
- `/shistory week` - Affiche l'historique de la semaine
- `/shistory all act123` - Affiche tout l'historique pour l'activité spécifiée

### 3. Tableau de Bord

Affiche un tableau de bord personnalisé avec des statistiques et des graphiques.

**Commande**: `/dashboard [type]`

- `type`: (optionnel) `overview` (défaut), `performance`, `goals`, `comparison`

**Exemples**:
- `/dashboard` - Affiche la vue d'ensemble
- `/dashboard performance` - Affiche les performances détaillées
- `/dashboard goals` - Affiche le suivi des objectifs

## Fonctionnalités Techniques

### Services Implémentés

1. **scoreService.js**
   - `getRankingData()`: Récupère les données de classement avec filtres
   - `getScoreHistory()`: Récupère l'historique des scores
   - `getDashboardData()`: Récupère les données du tableau de bord
   - `addScore()`: Ajoute un nouveau score
   - `updateScore()`: Met à jour un score existant
   - `deleteScore()`: Supprime un score
   - `getScoreStats()`: Récupère des statistiques sur les scores

### Points d'Intégration

1. **Fichiers Principaux**
   - `src/commands/index.js`: Configuration des commandes
   - `src/commands/scores/index.js`: Configuration des commandes de scores
   - `src/services/scoreService.js`: Service de gestion des scores

2. **Points d'Extension**
   - Les commandes sont conçues pour être facilement étendues
   - Le système de widgets du tableau de bord permet d'ajouter de nouveaux types d'affichage
   - Les filtres et paramètres peuvent être facilement ajoutés

## Améliorations Futures

1. **Export des Données**
   - Exporter les classements et historiques en CSV/PDF
   - Générer des rapports périodiques

2. **Personnalisation Avancée**
   - Permettre aux utilisateurs de créer des tableaux de bord personnalisés
   - Ajouter des widgets personnalisables

3. **Intégrations**
   - Exporter les données vers Google Sheets/Excel
   - Intégration avec des services de fitness (Strava, Garmin, etc.)

## Notes de Développement

### Tests

Les tests unitaires et d'intégration sont recommandés pour :
- La logique de filtrage des scores
- Le calcul des classements
- La génération des tableaux de bord

### Performance

Pour les grands volumes de données :
- Implémenter la pagination
- Ajouter des index en base de données
- Mettre en cache les résultats fréquemment demandés

### Sécurité

- Vérifier les autorisations pour chaque opération
- Valider soigneusement les entrées utilisateur
- Limiter les taux de requêtes pour prévenir les abus
