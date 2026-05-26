# Scory v2 deployment guide

This guide keeps v1 live while preparing API v2 with managed PostgreSQL and Redis.

## Important security note

Rotate the production secrets that were shared in chat before any deployment:

- `JWT_SECRET`
- `MONGO_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`

Do not commit real secrets to the repository. Store them only in the hosting provider environment variables.

## What gets deployed

You do not push PostgreSQL or Redis as code.

Create managed services, then give their connection URLs to API v2:

- PostgreSQL -> `DATABASE_URL`
- Redis / Render Key Value -> `REDIS_URL`
- API v2 web service -> runs `apps/api-v2`

The local `docker-compose.v2.yml` is only for local development.

## Render setup

Create these resources in Render:

1. PostgreSQL database
   - Suggested name: `scory-postgres-v2`
   - Database name: `scory_v2`
   - Copy its internal connection string into API v2 as `DATABASE_URL`.

2. Key Value / Redis instance
   - Suggested name: `scory-redis-v2`
   - Copy its internal Redis URL into API v2 as `REDIS_URL`.

3. New Web Service for API v2
   - Suggested name: `scory-api-v2`
   - Runtime: Node
   - Root directory: `apps/api-v2`
   - Build command:

```bash
pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build
```

   - Start command:

```bash
pnpm start
```

Do not replace the existing v1 service yet.

## API v2 environment variables

Set these on the `scory-api-v2` service:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<render-postgres-internal-url>
REDIS_URL=<render-keyvalue-internal-url>
JWT_SECRET=<new-secret>
TELEGRAM_BOT_TOKEN=<rotated-token>
TELEGRAM_BOT_USERNAME=<bot-username>
TELEGRAM_WEBHOOK_SECRET=<new-secret>
WEB_APP_URL=https://scory-bot.vercel.app/
ALLOWED_ORIGINS=https://scory-bot.vercel.app
MONGO_URL=<mongo-url-with-/test-database>
SLOW_REQUEST_MS=500
```

Keep v1 variables on the v1 service.

## Frontend variables

On Vercel, keep v2 disabled by default:

```env
VITE_API_V2_ENABLED=false
VITE_API_V2_URL=https://<scory-api-v2>.onrender.com/api
VITE_API_V2_CHAT_IDS=
```

When canary starts, enable only a test group:

```env
VITE_API_V2_ENABLED=true
VITE_API_V2_CHAT_IDS=-100xxxxxxxxxx
```

## First deployment order

1. Deploy `scory-api-v2` without changing Telegram webhook.
2. Run migrations:

```bash
pnpm exec prisma migrate deploy
```

3. Run Mongo import:

```bash
pnpm migration:dry-run
pnpm migration:run
pnpm projections:rebuild
pnpm compare:v1-v2
```

4. Run smoke tests:

```bash
pnpm smoke:mobile
pnpm smoke:telegram
```

5. Keep v1 webhook active until those checks pass.

## Telegram webhook cutover

Only after API v2 checks pass, point Telegram to:

```txt
https://<scory-api-v2>.onrender.com/webhook/<TELEGRAM_BOT_TOKEN>
```

Use the Telegram secret token header value:

```txt
X-Telegram-Bot-Api-Secret-Token: TELEGRAM_WEBHOOK_SECRET
```

Rollback is simply setting the webhook back to the current v1 URL.

## Go / no-go checklist

Go only if all are true:

- API v2 health logs show no startup errors.
- `prisma migrate deploy` passes.
- Mongo import completes.
- `compare:v1-v2` reports zero deltas for importable data.
- `smoke:mobile` passes.
- `smoke:telegram` passes.
- Front canary is limited to one test `chatId`.
- v1 service remains deployed and ready for rollback.

No-go if any migration, projection, webhook, or smoke command fails.
