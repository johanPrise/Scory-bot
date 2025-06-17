# 🚀 Guide de Démarrage Rapide - Scory-bot

## ✅ Vérification Préalable

Avant de démarrer, vérifiez que toutes les configurations sont cohérentes :

```bash
npm run validate:config
```

Si tout est ✅, vous pouvez continuer !

## 🏃‍♂️ Démarrage Rapide

### 1. **Prérequis**
- Node.js (v16+)
- MongoDB (local ou distant)
- npm ou yarn

### 2. **Installation**
```bash
# Installer les dépendances du backend
npm install

# Installer les dépendances du frontend
cd web && npm install && cd ..
```

### 3. **Configuration**
```bash
# Copier le fichier d'environnement
cp .env.example .env

# Modifier les variables si nécessaire
# Par défaut, tout est configuré pour le développement local
```

### 4. **Démarrage des Services**

#### Option A : Démarrage Complet (Recommandé)
```bash
# Terminal 1 : API Server (port 3001)
npm run dev:api

# Terminal 2 : Frontend React (port 3000)
cd web && npm start

# Terminal 3 : Bot Telegram (optionnel)
npm run dev:bot
```

#### Option B : Démarrage avec Mock Server
```bash
# Terminal 1 : Mock Server (port 3002) - pour tests frontend uniquement
npm run dev:mock

# Terminal 2 : Frontend React (port 3000)
cd web && npm start
```

## 🌐 **URLs d'Accès**

| Service | URL | Description |
|---------|-----|-------------|
| **Frontend** | http://localhost:3000 | Interface utilisateur |
| **API** | http://localhost:3001/api | API REST principale |
| **Health Check** | http://localhost:3001/health | Statut de l'API |
| **Mock API** | http://localhost:3002/api | API de test (si utilisée) |

## 🔧 **Scripts Disponibles**

### Production
```bash
npm start              # Démarre l'API principale
npm run start:bot      # Démarre le bot Telegram
```

### Développement
```bash
npm run dev:api        # API avec rechargement automatique
npm run dev:bot        # Bot avec rechargement automatique
npm run dev:mock       # Serveur mock avec rechargement automatique
```

### Utilitaires
```bash
npm run validate:config    # Valide la cohérence des configurations
npm run migrate:services   # Migration des services (si nécessaire)
```

## 🐛 **Résolution de Problèmes**

### Port déjà utilisé
```bash
# Vérifier les ports utilisés
netstat -ano | findstr :3001
netstat -ano | findstr :3000

# Ou modifier les ports dans .env
API_PORT=3005
WEB_PORT=3006
```

### Erreur de connexion MongoDB
```bash
# Vérifier que MongoDB est démarré
mongod --version

# Ou modifier l'URL dans .env
MONGO_URL=mongodb://localhost:27017/scory-bot
```

### Erreurs CORS
```bash
# Vérifier les origines autorisées dans .env
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

## 📊 **Vérification du Fonctionnement**

### 1. API Health Check
```bash
curl http://localhost:3001/health
```

### 2. Test de l'API
```bash
curl http://localhost:3001/api/auth/me
```

### 3. Frontend
Ouvrir http://localhost:3000 dans le navigateur

## 📚 **Documentation Complète**

- [`PORTS_CONFIG.md`](./PORTS_CONFIG.md) - Configuration détaillée des ports
- [`CHANGELOG_PORTS.md`](./CHANGELOG_PORTS.md) - Historique des corrections
- [`.env.example`](./.env.example) - Variables d'environnement disponibles

## 🎯 **Architecture Simplifiée**

```
Frontend (3000) ──→ API Server (3001) ──→ MongoDB
                         ↓
                   Bot Telegram
```

## ✨ **Fonctionnalités Principales**

- 🤖 **Bot Telegram** : Gestion des scores et équipes
- 🌐 **Interface Web** : Dashboard et administration
- 📊 **API REST** : Backend complet avec authentification
- 🏆 **Système de Scores** : Classements individuels et par équipe
- 👥 **Gestion d'Équipes** : Création et administration d'équipes
- 📈 **Statistiques** : Tableaux de bord et analyses

---

**🚀 Prêt à démarrer ? Lancez `npm run validate:config` puis suivez les étapes ci-dessus !**