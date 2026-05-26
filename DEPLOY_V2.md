# Scory v2 deployment

The legacy v1 Express/Mongo runtime has been removed from the repository. Production runs on:

- API: `apps/api-v2`
- Frontend: `web`
- Database: PostgreSQL
- Cache/queue: Redis + BullMQ

## API service

Render web service:

```txt
Root directory: apps/api-v2
Build command: pnpm install --frozen-lockfile && pnpm prisma:generate && pnpm build
Start command: pnpm start
```

Required environment variables:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<postgres-url>
REDIS_URL=<redis-url>
JWT_SECRET=<secret>
JWT_EXPIRES_IN=7d
TELEGRAM_BOT_TOKEN=<bot-token>
TELEGRAM_BOT_USERNAME=<bot-username-without-at>
TELEGRAM_WEBHOOK_SECRET=<secret>
WEB_APP_URL=https://scory-bot.vercel.app
ALLOWED_ORIGINS=https://scory-bot.vercel.app
SLOW_REQUEST_MS=500
```

`REDIS_URL` must be a Redis protocol URL, for example `rediss://...`. Do not use an Upstash REST URL for BullMQ workers.

`MONGO_URL` is needed only for one-off migration scripts:

```bash
pnpm migration:dry-run
pnpm migration:run
pnpm projections:rebuild
```

Remove `MONGO_URL` from production after migration is finished.

## Frontend

Vercel variables:

```env
VITE_API_V2_URL=https://scory-bot-v2.onrender.com
VITE_API_V2_ENABLED=true
VITE_API_URL=https://scory-bot-v2.onrender.com/api
```

Deploy the API first, then redeploy Vercel so the built frontend receives the current `VITE_*` values.

## Telegram webhook

Webhook URL:

```txt
https://scory-bot-v2.onrender.com/telegram/webhook
```

Check current webhook:

```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"
```

Set webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -d "url=https://scory-bot-v2.onrender.com/telegram/webhook" \
  -d "secret_token=$TELEGRAM_WEBHOOK_SECRET" \
  -d "drop_pending_updates=true"
```

## Verification

```bash
curl https://scory-bot-v2.onrender.com/health
pnpm --dir apps/api-v2 smoke:mobile
pnpm --dir apps/api-v2 smoke:telegram
```

The smoke commands require `DATABASE_URL`, `REDIS_URL`, `API_URL`, and `TELEGRAM_WEBHOOK_SECRET` in the local shell.
