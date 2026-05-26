# Scory API v2

API v2 parallele pour reconstruire Scory avec NestJS, PostgreSQL, Redis, BullMQ et Prisma.

## Demarrage local

```bash
docker compose -f ../../docker-compose.v2.yml up -d
pnpm install
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev
```

## Principes

- PostgreSQL est la source de verite.
- Redis sert au cache court et aux jobs BullMQ.
- Les rankings et dashboards lisent des projections, pas des aggregations lourdes a chaque requete.
- Les commandes Telegram v1 doivent rester compatibles.
- La v2 est concue pour un rollout canary par groupe Telegram.
