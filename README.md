# Scory-bot

Un bot Telegram pour suivre des scores, classer les participants et gérer des équipes au sein d'un groupe, sans tableur partagé ni ardoise à refaire à la main.

## Ce que ça fait

- Créer des activités (et sous-activités) dans un groupe Telegram et y enregistrer des scores au fil de l'eau.
- Consulter un classement individuel ou par équipe, avec historique des scores passés.
- Constituer des équipes, y ajouter des membres, et suivre un classement d'équipe dédié.
- Lancer des timers pour chronométrer une activité en cours directement depuis le chat.
- Générer un rapport lisible du groupe (commande `/report`, avec compatibilité de l'ancienne commande `/export`) et ouvrir une web app associée pour une vue plus détaillée.

## Architecture

Le projet est en cours de migration d'une v1 (Express + MongoDB) vers une v2 construite avec NestJS, PostgreSQL (via Prisma) et Redis/BullMQ pour les files de tâches asynchrones (envoi de messages Telegram, jobs de timer, snapshots de statistiques). C'est le chantier le plus significatif du repo :

- Les scripts `migration:dry-run` et `migration:run` (`apps/api-v2/scripts/migrate-from-mongo.ts`) effectuent une migration à froid des données MongoDB vers PostgreSQL.
- Le script `compare:v1-v2` (`compare-v1-v2.ts`) compare les données des deux systèmes pour valider la parité avant bascule.
- Le script `projections:rebuild` (`rebuild-projections.ts`) reconstruit les projections utilisées par les classements et tableaux de bord, pour éviter des agrégations lourdes à chaque requête.
- La v1 a depuis été retirée du dépôt ; seule la v2 tourne en production (voir `DEPLOY_V2.md`), avec `MONGO_URL` conservé uniquement pour ces scripts ponctuels de migration.

## Stack

- API : NestJS (TypeScript)
- Persistance : PostgreSQL via Prisma
- Files de tâches / cache : Redis + BullMQ
- Bot : Telegram Bot API en mode webhook
- Frontend : application web dans `/web` (React + Vite)
- Validation : Zod et class-validator
- Sécurité HTTP : Helmet

## Fiabilité

- Endpoint `GET /health` (et `/api/health`) pour vérifier que le service répond.
- Jest et Supertest sont configurés comme socle de tests pour l'API (`pnpm test` dans `apps/api-v2`) ; la suite de tests reste à étoffer.
- Avant chaque déploiement, les scripts `smoke:mobile` et `smoke:telegram` (`apps/api-v2/scripts`) vérifient à chaud l'API mobile et le webhook Telegram sur l'environnement cible.

## Lancer en local

Prérequis : Node.js, pnpm (API) et npm (web), Docker pour PostgreSQL/Redis.

```bash
# Base de données et Redis locaux
docker compose -f docker-compose.v2.yml up -d

# API (depuis apps/api-v2)
cd apps/api-v2
cp .env.example .env
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev          # démarre l'API en watch mode (nest start --watch)
pnpm test         # lance les tests Jest
pnpm build        # build de production (nest build)

# Web app (depuis la racine)
npm --prefix web run dev
```

Variables d'environnement de l'API (`apps/api-v2/.env.example`) : `NODE_ENV`, `PORT`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `SLOW_REQUEST_MS`, et `MONGO_URL` (nécessaire uniquement pour les scripts de migration).

## Statut

Projet personnel, actuellement en migration v1 → v2, utilisé par l'auteur et un petit groupe de proches. Pas un produit commercial.
