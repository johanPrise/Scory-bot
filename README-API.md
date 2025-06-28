# 🚀 Scory-bot API - Phase 1 Terminée

## 📋 Résumé des Changements

La **Phase 1** de la correction a été complétée avec succès ! L'application Scory-bot dispose maintenant d'une API REST complète utilisant directement les modèles MongoDB au lieu des données mockées.

## 🏗️ Architecture Mise à Jour

### Nouvelle Structure API
```
src/
├── api/
│   ├── index.js              # Configuration principale de l'API
│   ├── middleware/
│   │   ├── auth.js           # Authentification JWT
│   │   ├── errorHandler.js   # Gestion centralisée des erreurs
│   │   └── requestLogger.js  # Logging des requêtes
│   └── routes/
│       ├── auth.js           # Routes d'authentification
│       ├── users.js          # Gestion des utilisateurs
│       ├── teams.js          # Gestion des équipes
│       ├── activities.js     # Gestion des activités
│       ├── scores.js         # Gestion des scores
│       └── dashboard.js      # Statistiques et dashboard
├── services/
│   ├── scoreService.js   # Service scores (MongoDB direct)
│   ├── teamService.js    # Service équipes (MongoDB direct)
│   └── activityService.js # Service activités (MongoDB direct)
└── models/ (mis à jour avec pagination)
```

## 🔧 Installation et Configuration

### 1. Installer les Nouvelles Dépendances
```bash
npm install
```

Nouvelles dépendances ajoutées :
- `mongoose-paginate-v2` - Pagination pour MongoDB
- `jsonwebtoken` - Authentification JWT
- `bcryptjs` - Hachage des mots de passe
- `helmet` - Sécurité HTTP
- `express-rate-limit` - Limitation du taux de requêtes

### 2. Variables d'Environnement
Créer un fichier `.env` avec :
```env
# Base de données
MONGO_URL=mongodb://localhost:27017/scory-bot

# API
API_PORT=3001
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Sécurité
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001

# Telegram (existant)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
```

### 3. Migration des Services
```bash
# Migrer vers les nouveaux services MongoDB
npm run migrate:services

# En cas de problème, rollback possible
npm run rollback:services
```

## 🚀 Démarrage

### Option 1: Serveur API Seul
```bash
npm run start:api
# ou en développement
npm run dev:api
```

### Option 2: Bot Telegram Seul
```bash
npm run start:bot
# ou en développement
npm run dev:bot
```

### Option 3: Serveur Mock (ancien)
```bash
npm run start
# ou
npm run dev
```

## 📡 Endpoints API Disponibles

### Authentification
- `POST /api/auth/register` - Inscription
- `POST /api/auth/login` - Connexion
- `GET /api/auth/me` - Profil utilisateur
- `PUT /api/auth/profile` - Mise à jour profil
- `POST /api/auth/change-password` - Changer mot de passe
- `POST /api/auth/link-telegram` - Lier compte Telegram

### Utilisateurs
- `GET /api/users` - Liste des utilisateurs (admin)
- `GET /api/users/:id` - Détails utilisateur
- `POST /api/users` - Créer utilisateur (admin)
- `PUT /api/users/:id` - Modifier utilisateur
- `DELETE /api/users/:id` - Supprimer utilisateur (admin)

### Équipes
- `GET /api/teams` - Liste des équipes
- `GET /api/teams/:id` - Détails équipe
- `POST /api/teams` - Créer équipe
- `PUT /api/teams/:id` - Modifier équipe
- `DELETE /api/teams/:id` - Supprimer équipe
- `GET /api/teams/:id/members` - Membres de l'équipe
- `POST /api/teams/:id/members` - Ajouter membre
- `PUT /api/teams/:id/members/:userId` - Modifier rôle membre
- `DELETE /api/teams/:id/members/:userId` - Retirer membre

### Activités
- `GET /api/activities` - Liste des activités
- `GET /api/activities/:id` - Détails activité
- `POST /api/activities` - Créer activité
- `PUT /api/activities/:id` - Modifier activité
- `DELETE /api/activities/:id` - Supprimer activité
- `POST /api/activities/:id/subactivities` - Ajouter sous-activité

### Scores
- `GET /api/scores` - Liste des scores
- `GET /api/scores/:id` - Détails score
- `POST /api/scores` - Créer score
- `PUT /api/scores/:id` - Modifier score
- `DELETE /api/scores/:id` - Supprimer score
- `GET /api/scores/rankings` - Classements
- `GET /api/scores/history` - Historique des scores

### Dashboard
- `GET /api/dashboard/stats` - Statistiques générales
- `GET /api/dashboard/recent-activity` - Activité récente

## 🔐 Authentification

L'API utilise JWT pour l'authentification. Après connexion, inclure le token dans les headers :

```javascript
headers: {
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
}
```

## 📊 Pagination

Tous les endpoints de liste supportent la pagination :

```javascript
GET /api/users?page=1&limit=20&search=john&sortBy=createdAt&sortOrder=desc
```

Paramètres :
- `page` - Numéro de page (défaut: 1)
- `limit` - Éléments par page (défaut: 20)
- `search` - Terme de recherche
- `sortBy` - Champ de tri
- `sortOrder` - Ordre (asc/desc)

## 🛡️ Sécurité

- **Helmet** - Headers de sécurité HTTP
- **Rate Limiting** - 100 requêtes/15min en production
- **CORS** - Origines autorisées configurables
- **JWT** - Authentification sécurisée
- **Bcrypt** - Hachage des mots de passe

## 🔄 Intégration avec le Bot Telegram

Les services modifiés sont **rétrocompatibles** avec les commandes Telegram existantes. Le bot peut maintenant :

1. Utiliser directement les modèles MongoDB
2. Bénéficier de la validation des données
3. Partager les mêmes utilisateurs/équipes que l'interface web

## 🧪 Tests

### Test de l'API
```bash
# Vérifier que l'API fonctionne
curl http://localhost:3001/health

# Tester l'authentification
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"admin","password":"password"}'
```

### Test des Services
```bash
# Lancer les tests existants
npm test
```

## 📈 Prochaines Étapes (Phase 2)

1. **Harmonisation Frontend** - Adapter l'interface web pour utiliser la nouvelle API
2. **Tests d'Intégration** - Vérifier la compatibilité Bot ↔ API ↔ Frontend
3. **Optimisation** - Index MongoDB, cache, performances

## 🐛 Dépannage

### Problème de Migration
```bash
# Restaurer les anciens services
npm run rollback:services
```

### Erreur de Base de Données
```bash
# Vérifier la connexion MongoDB
mongosh mongodb://localhost:27017/scory-bot
```

### Erreur de Permissions
```bash
# Vérifier les variables d'environnement
node -e "console.log(process.env.MONGO_URL)"
```

## 📝 Logs

Les logs sont centralisés et incluent :
- Requêtes HTTP avec durée
- Erreurs avec stack trace (dev)
- Actions utilisateur importantes
- Performances des requêtes lentes

---

## ✅ Validation Phase 1

**Objectifs Atteints :**
- ✅ API REST complète avec MongoDB
- ✅ Services connectés directement aux modèles
- ✅ Architecture modulaire et sécurisée
- ✅ Rétrocompatibilité avec le bot Telegram
- ✅ Pagination et gestion d'erreurs
- ✅ Authentification JWT
- ✅ Documentation complète

**L'application est maintenant prête pour la Phase 2 !** 🎉