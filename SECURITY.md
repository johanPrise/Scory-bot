# 🔒 Guide de Sécurité - Scory-bot

## ⚠️ Variables d'Environnement Sensibles

**ATTENTION** : Les variables suivantes contiennent des informations sensibles et ne doivent JAMAIS être partagées ou versionnées :

### Variables Critiques
- `TELEGRAM_BOT_TOKEN` - Token d'accès au bot Telegram
- `MONGO_URL` - URL de connexion MongoDB (contient username/password)
- `JWT_SECRET` - Clé secrète pour les tokens JWT

### Variables Sensibles
- `MONGO_TEST_URL` - URL de la base de données de test
- `HTTP_PROXY` - Configuration du proxy (peut contenir des credentials)

## 🛡️ Bonnes Pratiques

### 1. Gestion des Fichiers .env
```bash
# ✅ Bon : Utiliser des variables d'environnement système
export TELEGRAM_BOT_TOKEN="your-token-here"
export JWT_SECRET="your-secret-here"

# ❌ Mauvais : Stocker dans .env versionné
TELEGRAM_BOT_TOKEN=7578616612:AAHVpDbp6AoyGtXsbxy0HHkglOqunJE6ckU
```

### 2. Configuration de Production
```bash
# Utiliser des services de gestion de secrets
# - Azure Key Vault
# - AWS Secrets Manager
# - HashiCorp Vault
# - Variables d'environnement du serveur
```

### 3. Vérification de Sécurité
```bash
# Vérifier que .env n'est pas versionné
git status --ignored

# Vérifier le .gitignore
cat .gitignore | grep -E "\.env$"
```

## 🚨 Actions Immédiates Requises

### Si des tokens ont été exposés :
1. **Révoquer immédiatement** le token Telegram via @BotFather
2. **Changer le JWT_SECRET** et invalider toutes les sessions
3. **Modifier les credentials MongoDB** si exposés
4. **Auditer les logs** pour détecter un usage malveillant

### Nettoyage du Dépôt Git
```bash
# Si des secrets ont été commités par erreur
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env' \
  --prune-empty --tag-name-filter cat -- --all

# Forcer la mise à jour du dépôt distant
git push origin --force --all
```

## 🔧 Configuration Sécurisée

### Fichier .env.local (non versionné)
```env
# Variables sensibles - NE PAS VERSIONNER
TELEGRAM_BOT_TOKEN=your-actual-token
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your-super-secret-key-min-32-chars
```

### Fichier .env.example (versionné)
```env
# Template pour les développeurs
TELEGRAM_BOT_TOKEN=your-telegram-bot-token
MONGO_URL=mongodb://localhost:27017/scory-bot
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

## 📋 Checklist de Sécurité

- [ ] `.env` est dans `.gitignore`
- [ ] Tokens de production différents du développement
- [ ] JWT_SECRET fait au moins 32 caractères
- [ ] MongoDB utilise l'authentification
- [ ] Variables sensibles ne sont pas dans le code source
- [ ] Logs ne contiennent pas de secrets
- [ ] Accès au serveur de production restreint
- [ ] Backups chiffrés
- [ ] Monitoring des accès activé

## 🆘 Contact d'Urgence

En cas de compromission de sécurité :
1. Contacter l'administrateur système
2. Documenter l'incident
3. Suivre la procédure de réponse aux incidents
4. Notifier les utilisateurs si nécessaire

---

**Rappel** : La sécurité est la responsabilité de tous. En cas de doute, demandez conseil avant d'agir.