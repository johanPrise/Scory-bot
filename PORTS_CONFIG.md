# Configuration des Ports - Scory-bot

## Architecture des Services

L'application Scory-bot utilise une architecture multi-services avec des ports dédiés pour éviter les conflits :

### 🚀 Services Principaux

| Service | Port | URL | Description |
|---------|------|-----|-------------|
| **Frontend React** | `3000` | http://localhost:3000 | Interface utilisateur web |
| **API Server** | `3001` | http://localhost:3001/api | API REST principale avec MongoDB |
| **Mock Server** | `3002` | http://localhost:3002/api | Serveur de développement avec données mock |

### 📝 Variables d'Environnement

#### Fichier `.env` (racine du projet)
```env
API_PORT=3001
WEB_PORT=3000
MOCK_SERVER_PORT=3002
API_BASE_URL=http://localhost:3001/api
```

#### Fichier `web/.env` (frontend React)
```env
REACT_APP_API_URL=http://localhost:3001/api
PORT=3000
```

### 🛠️ Scripts de Démarrage

#### Développement
```bash
# Démarrer l'API principale (recommandé)
npm run dev:api

# Démarrer le bot Telegram
npm run dev:bot

# Démarrer le serveur mock (pour tests frontend uniquement)
npm run dev:mock

# Démarrer le frontend React
cd web && npm start
```

#### Production
```bash
# Démarrer l'API principale
npm start

# Démarrer le bot Telegram
npm run start:bot
```

### 🔧 Configuration CORS

L'API accepte les requêtes depuis :
- `http://localhost:3000` (Frontend React)
- `http://localhost:3001` (Auto-référence API)

### 📊 Flux de Données

```
Frontend (3000) → API Server (3001) → MongoDB
                     ↓
Bot Telegram ← API Server (3001)
```

### ⚠️ Notes Importantes

1. **Port 3001** : API principale avec MongoDB (utiliser en production)
2. **Port 3002** : Serveur mock avec données en mémoire (développement uniquement)
3. **Port 3000** : Frontend React (interface utilisateur)

### 🐛 Résolution de Problèmes

#### Port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -ano | findstr :3001
netstat -ano | findstr :3000
netstat -ano | findstr :3002

# Tuer un processus si nécessaire
taskkill /PID <PID> /F
```

#### Erreurs CORS
- Vérifier que `ALLOWED_ORIGINS` inclut l'URL du frontend
- S'assurer que les URLs dans les fichiers `.env` sont cohérentes

#### API non accessible
- Vérifier que MongoDB est démarré
- Contrôler les variables d'environnement `MONGO_URL` et `API_PORT`
- Consulter les logs du serveur API