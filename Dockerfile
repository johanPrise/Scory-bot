# Étape de construction
FROM node:18-alpine AS builder

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm ci --only=production

# Copier le reste du code source
COPY . .

# Étape d'exécution
FROM node:18-alpine

# Définir les variables d'environnement
ENV NODE_ENV=production
ENV PORT=3000

# Créer et définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de dépendances et le code construit
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/src ./src
COPY --from=builder /app/.env* ./

# Exposer le port de l'application
EXPOSE ${PORT}

# Commande de démarrage
CMD ["npm", "start"]
