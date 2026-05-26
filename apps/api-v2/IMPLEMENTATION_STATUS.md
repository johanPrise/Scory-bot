# Scory API v2 - Implementation status

## Implemented foundation

- Parallel NestJS app in `apps/api-v2`.
- PostgreSQL schema via Prisma for users, groups, memberships, activities, sub-activities, teams, scores, events, stats projections and ranking snapshots.
- Redis service for cache invalidation and short-lived read models.
- Mobile WebApp endpoints:
  - `GET /api/mobile/home`
  - `GET /api/mobile/rankings`
  - `GET /api/mobile/activities`
  - `GET /api/mobile/teams`
- Mobile WebApp endpoints now verify the authenticated user belongs to the requested group.
- Mobile responses are mapped to stable client-facing contracts instead of returning raw Prisma rows.
- Score mutation endpoints:
  - `POST /api/scores`
  - `PUT /api/scores/:id/approve`
  - `PUT /api/scores/:id/reject`
- Score mutations validate group access and reject cross-group activity, user and team targets.
- Synchronous projection updates for approved scores.
- Ranking snapshot generation from Postgres.
- Telegram webhook handlers for `/start`, `/help`, `/app`, `/activities`, `/createactivity`, `/addsubactivity`, `/score`, `/subscore`, `/ranking`, `/subranking`, `/history`, `/stats`, `/createteam`, `/addtoteam`, `/teamranking`, `/deleteactivity`, `/deleteteam` and `/deletescore`.
- Telegram advanced handlers for `/export`, `/feedback`, `/starttimer` and `/stoptimer`.
- Telegram webhook supports both `POST /telegram/webhook` and token-style `POST /webhook/:token` for compatibility with the v1 webhook shape.
- Persistent `Timer` and `Feedback` models via Prisma migration `20260525193245_telegram_hardening`.
- Score creation now rejects duplicate targets cleanly instead of leaking database conflicts.
- Score deletion is soft-delete based and rolls back projections for approved scores.
- Destructive Telegram commands require resource ownership, group admin/creator, or global admin/superadmin.
- Registry of v1 Telegram commands to preserve strict command compatibility.
- Mongo migration dry-run script and import path for users, groups, memberships, activities, sub-activities, teams, team members and scores.
- Migration comparison script with raw Mongo, importable Mongo, Postgres, delta and skipped-document reasons.
- Mobile API smoke test script for the home, rankings, activities and teams endpoints.
- Telegram webhook smoke test script that simulates Telegram updates over HTTP and cleans up its generated data.
- Current React frontend can route read-only mobile surfaces to API v2 behind flags:
  - `VITE_API_V2_ENABLED=true`
  - `VITE_API_V2_URL=http://localhost:3101/api`
  - `VITE_API_V2_CHAT_IDS=-100...` for canary groups, or empty to enable all selected groups.
  - `VITE_SCORY_DEV_USER_ID=...` for local testing without Telegram init data.
- Local Postgres/Redis compose file at repo root: `docker-compose.v2.yml`.

## Verified locally

- Prisma migration `20260525094319_init` applied to local Postgres.
- Mongo import completed.
- Projection rebuild completed.
- `pnpm --dir apps/api-v2 exec tsc --noEmit --pretty false` passes.
- `pnpm --dir apps/api-v2 build` passes.
- `pnpm --dir apps/api-v2 smoke:mobile` passes against local API.
- `pnpm --dir apps/api-v2 smoke:telegram` passes against local API without sending real Telegram messages when no bot token is configured.
- `pnpm --dir apps/api-v2 compare:v1-v2` reports zero deltas for all importable data.
- `npm --prefix web run build` passes.
- `npm --prefix web run lint` passes.
- Root `npm test` passes.

## Next implementation steps

1. Replace compatibility-shell Telegram controller with real command handlers.
2. Add broader automated tests around malformed Telegram updates and permission denial branches.
3. Rebuild the frontend on the selected stack while preserving the current Scory identity.
4. Prepare a production cutover plan that keeps v1 as fallback until v2 is observed under load.

## Local commands

```bash
docker compose -f docker-compose.v2.yml up -d
pnpm --dir apps/api-v2 install
npm run v2:prisma:generate
pnpm --dir apps/api-v2 prisma:migrate
npm run v2:dev
pnpm --dir apps/api-v2 compare:v1-v2
pnpm --dir apps/api-v2 smoke:mobile
pnpm --dir apps/api-v2 smoke:telegram
```
