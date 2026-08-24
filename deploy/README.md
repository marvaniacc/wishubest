# Deployment & Server Isolation

This server (82.152.211.250) hosts **multiple independent apps**. Rules to avoid conflicts:

## What belongs to WishUBest (this repo)

| Resource | Value |
|---|---|
| Domains | `wishubest.com` (apex, canonical), `www.wishubest.com` (301 → apex) |
| Caddy blocks | ONLY the `wishubest.com` and `www.wishubest.com` blocks in `/etc/caddy/Caddyfile` |
| Services | `wishubest-api.service` (127.0.0.1:4000), `wishubest-web.service` (127.0.0.1:3000) |
| Code | `/opt/wishubest` |
| Databases | `wishubest_prod`, `wishubest_e2e` (role `wishubest`) |
| Private files | `/opt/wishubest/storage/private` |

**Never owned by us:** `dev.wishubest.com` (another team's app — do not modify its
Caddy block or `/srv/adinet`), port 8091, `adinet*` databases,
`wishubest-queue.service` (legacy Laravel worker from a previous attempt).

## Editing the shared Caddyfile

`/etc/caddy/Caddyfile` may be edited by other teams too. When changing WishUBest
routing:

1. Edit ONLY the `wishubest.com` / `www.wishubest.com` blocks.
2. Leave every other server block byte-identical.
3. Validate before reload: `caddy validate --config /etc/caddy/Caddyfile`
4. Reload (zero-downtime): `systemctl reload caddy`
5. Verify afterwards: both `https://wishubest.com/en` and `https://dev.wishubest.com/`
   must return their own apps (200s).

Backups of previous configs are kept as `/etc/caddy/Caddyfile.bak-*`.

## Redeploying WishUBest

```bash
cd /opt/wishubest
git pull
pnpm install --frozen-lockfile
pnpm --filter @wishubest/shared build
pnpm --filter @wishubest/api build
pnpm --filter @wishubest/web build
cd apps/api && DATABASE_URL=postgres://wishubest:wishubest@localhost:5432/wishubest_prod npx tsx src/db/migrate.ts
systemctl restart wishubest-api wishubest-web
```

Secrets live in `/opt/wishubest/deploy/env.api` and `env.web` (chmod 600, never committed).
Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` there to activate real payments;
set `SMTP_*` to send real emails. Without them the app boots fine (payments return 503,
emails land in the `email_outbox` table).

## Ephemeral e2e stack

`pnpm --filter @wishubest/web test:e2e` boots throwaway servers on ports
3100 (web) + 4100 (API) against database `wishubest_e2e`. Loopback only, torn down
automatically by Playwright.
