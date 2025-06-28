# 🎯 Scory-bot Phase 2 - Harmonisation Frontend

## 📋 Résumé de la Phase 2

La **Phase 2** adapte complètement l'interface web pour utiliser la nouvelle API MongoDB créée en Phase 1. Le frontend est maintenant cohérent avec le backend et partage les mêmes données que le bot Telegram.

## 🔄 Changements Majeurs

### 1. **API Frontend Complètement Refactorisée**
- **Ancien** : `api.js` avec endpoints mockés
- **Nouveau** : `api.js` avec API MongoDB complète
- **Structure modulaire** : auth, users, teams, activities, scores, dashboard
- **Gestion d'erreurs** améliorée avec retry automatique

### 2. **Authentification Modernisée**
- **JWT complet** : Login, register, refresh token
- **Contexte React** robuste avec gestion d'état
- **Protection des routes** avec permissions granulaires
- **Intégration Telegram** préparée

### 3. **Composants Mis à Jour**
- **Login/Register** : Interface moderne avec validation
- **Dashboard** : Statistiques en temps réel depuis MongoDB
- **Teams** : CRUD complet avec gestion des membres
- **Protection des routes** : Système de permissions avancé

### 4. **Expérience Utilisateur Améliorée**
- **Loading states** : Indicateurs de chargement partout
- **Gestion d'erreurs** : Messages d'erreur contextuels
- **Responsive design** : Interface adaptée mobile/desktop
- **Thème cohérent** : Design system unifié

## 🏗️ Nouvelle Architecture Frontend

```
web/src/
├── api.js                 # API modulaire pour MongoDB
├── context/
│   └── AuthContext.js     # Contexte d'auth avec JWT
├── components/
│   └── ProtectedRoute.js      # Protection des routes
├── pages/
│   ├── Login.js          # Login/Register moderne
│   ├── Dashboard.js      # Dashboard avec vraies données
│   └── Teams.js          # Gestion complète des équipes
└── App.js                # Routing avec permissions
```

## 🚀 Installation et Migration

### 1. Prérequis
```bash
# S'assurer que l'API MongoDB fonctionne (Phase 1)
npm run start:api
# API doit être accessible sur http://localhost:3001
```

### 2. Migration du Frontend
```bash
cd web

# Migrer vers les nouveaux composants
node migrate-frontend.js migrate

# En cas de problème, rollback possible
node migrate-frontend.js rollback
```

### 3. Variables d'Environnement
Créer `web/.env` :
```env
# URL de l'API MongoDB (Phase 1)
REACT_APP_API_URL=http://localhost:3001/api

# Configuration optionnelle
REACT_APP_APP_NAME=Scory Bot
REACT_APP_VERSION=2.0.0
```

### 4. Démarrage
```bash
cd web
npm install
npm start
# Interface web sur http://localhost:3000
```

## 🔐 Système d'Authentification

### Flux d'Authentification
1. **Login/Register** → JWT token stocké
2. **Vérification automatique** du token au chargement
3. **Refresh automatique** si token expiré
4. **Redirection intelligente** selon le rôle

### Rôles et Permissions
```javascript
// Utilisateur normal
role: 'user' → Dashboard, Teams, Activities, Rankings

// Admin de groupe  
role: 'groupAdmin' → Gestion d'un groupe spécifique

// Super admin
role: 'admin' → Gestion globale des utilisateurs et groupes
```

### Protection des Routes
```javascript
// Route protégée simple
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>

// Route avec permission spécifique
<ProtectedRoute requiredPermission="manage_users">
  <AdminPanel />
</ProtectedRoute>

// Route publique (redirection si connecté)
<PublicRoute>
  <Login />
</PublicRoute>
```

## 📊 Nouvelles Fonctionnalités

### Dashboard Intelligent
- **Statistiques personnelles** : Scores, équipes, classement
- **Statistiques globales** : Pour les admins
- **Activité récente** : Timeline des actions
- **Top performers** : Classements individuels/équipes
- **Filtres temporels** : Jour, semaine, mois, année

### Gestion d'Équipes Complète
- **CRUD équipes** : Créer, modifier, supprimer
- **Gestion des membres** : Ajouter, retirer, changer rôles
- **Permissions granulaires** : Propriétaire, admin, membre
- **Statistiques d'équipe** : Scores, activités, performances

### Interface Moderne
- **Material-UI v5** : Composants modernes
- **Responsive design** : Mobile-first
- **Dark/Light theme** : Préparé pour basculement
- **Animations fluides** : Transitions et loading states

## 🔄 Intégration avec l'API

### Appels API Typiques
```javascript
// Authentification
const user = await auth.login('username', 'password');
const profile = await auth.getCurrentUser();

// Équipes
const teams = await teams.getAll({ page: 1, limit: 20 });
const team = await teams.getById(teamId, { includeMembers: true });

// Scores et classements
const rankings = await scores.getRankings({ 
  scope: 'individual', 
  period: 'month' 
});

// Dashboard
const stats = await dashboard.getStats('month');
```

### Gestion d'Erreurs
```javascript
try {
  const data = await api.call();
} catch (error) {
  // Erreur automatiquement affichée via le contexte
  // Redirection automatique si token expiré
  console.error('Erreur:', error.message);
}
```

## 🧪 Tests et Validation

### Test de l'Interface
```bash
# Démarrer l'API (Terminal 1)
npm run start:api

# Démarrer le frontend (Terminal 2)
cd web && npm start

# Tester les fonctionnalités
# 1. Inscription/Connexion
# 2. Navigation entre pages
# 3. Création d'équipe
# 4. Ajout de membres
# 5. Consultation des statistiques
```

### Comptes de Test
```javascript
// Admin
username: 'admin'
password: 'admin123'

// Utilisateur normal (à créer via inscription)
username: 'user1'
email: 'user1@example.com'
password: 'password123'
```

## 🔧 Personnalisation

### Thème et Couleurs
```javascript
// web/src/App.js
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },    // Bleu principal
    secondary: { main: '#dc004e' },   // Rouge secondaire
    success: { main: '#2e7d32' },     // Vert succès
    warning: { main: '#ed6c02' },     // Orange warning
  }
});
```

### Configuration API
```javascript
// web/src/api.js
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
```

## 🐛 Dépannage

### Problèmes Courants

**1. Erreur de connexion API**
```bash
# Vérifier que l'API fonctionne
curl http://localhost:3001/health
```

**2. Token expiré**
```javascript
// Le système gère automatiquement l'expiration
// Redirection automatique vers /login
```

**3. Permissions insuffisantes**
```javascript
// Vérifier le rôle utilisateur
console.log(currentUser.role);
// Vérifier les permissions
console.log(hasPermission('manage_teams'));
```

**4. Rollback si problème**
```bash
cd web
node migrate-frontend.js rollback
```

## 📈 Prochaines Étapes (Phase 3)

1. **Tests d'Intégration** : Bot ↔ API ↔ Frontend
2. **Optimisations** : Cache, performances, SEO
3. **Fonctionnalités Avancées** : 
   - Notifications en temps réel
   - Export de données
   - Graphiques avancés
   - Mode hors ligne

## ✅ Validation Phase 2

**Objectifs Atteints :**
- ✅ Frontend adapté à l'API MongoDB
- ✅ Authentification JWT complète
- ✅ Interface moderne et responsive
- ✅ Gestion d'équipes fonctionnelle
- ✅ Dashboard avec vraies données
- ✅ Protection des routes avec permissions
- ✅ Gestion d'erreurs robuste
- ✅ Migration automatisée

**L'interface web est maintenant cohérente avec le backend !** 🎉

---

## 🔄 Comparaison Avant/Après

| Aspect | Phase 1 (Avant) | Phase 2 (Après) |
|--------|------------------|------------------|
| **API** | Données mockées | MongoDB réel |
| **Auth** | localStorage simple | JWT + contexte React |
| **Routes** | Protection basique | Permissions granulaires |
| **UI** | Statique | Dynamique avec loading |
| **Données** | Fictives | Temps réel depuis DB |
| **Erreurs** | Basique | Gestion centralisée |
| **Mobile** | Limité | Responsive complet |

**La Phase 2 transforme complètement l'expérience utilisateur !** 🚀