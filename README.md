# WishUBest — Medical Tourism Marketplace (MVP)

Monorepo: `apps/web` (Next.js), `apps/api` (Fastify), `packages/shared`, `packages/config`.

## Quick start (dev)
```bash
docker compose up -d          # Postgres :5433 + MinIO :9000
pnpm install
cp .env.example .env          # fill values
pnpm db:migrate && pnpm db:seed
pnpm dev                      # API :4000, Web :3000
```

Tests: `pnpm test` (unit + financial pipeline integration; needs TEST_DATABASE_URL).
