# Deploy SYLORA to Hetzner (final step)

**Status:** prepared offline. Live deploy waits for secure SSH access.  
**Host (confirmed):** `77.42.42.246` (`getsylora.com`)  
**Do not invent** `PROD_SSH_USER`, `PROD_SSH_PRIVATE_KEY`, `PROD_SSH_PORT`, or `PROD_DEPLOY_PATH`.

## Prerequisites

- Docker + Compose on the VPS
- `.env.local` with production secrets (never commit)
- TLS terminated at nginx (sample: `infra/nginx/sylora.conf.example`)
- Optional: set `SYLORA_ENABLE_HSTS=1` only after HTTPS works
- Optional companion: set `SYLORA_COMPANION_TOKEN` + `SYLORA_COMPANION_ORIGINS`

## Deploy checklist (on VPS)

```bash
cd /path/to/Project-Sylora-2   # PROD_DEPLOY_PATH when known
git fetch origin
git checkout main
git pull --ff-only origin main
# ensure .env.local has DATABASE_URL, REDIS_URL, POSTGRES_PASSWORD, OPENAI_* as needed
docker compose up -d --build
curl -fsS http://127.0.0.1:8787/api/ready
```

Or: `./scripts/deploy-prod.sh /path/to/Project-Sylora-2`

## After deploy

1. Confirm HTML cache bust is not the old `?v=20260809-3` (expect `avatar3` or newer).
2. Hard refresh on phone.
3. Open Sylora AI — avatar must be one coherent white-suit portrait (no sliced arms/face).
4. Mobile dock includes **Ще** (Settings) for Identity / Agents / Developer / Security.

## Cursor secrets (when ready)

Add in Cursor Dashboard → Cloud Agents → Secrets (not in chat):

| Variable | Notes |
|---|---|
| `PROD_SSH_HOST` | Confirmed: `77.42.42.246` |
| `PROD_SSH_USER` | pending |
| `PROD_SSH_PRIVATE_KEY` | pending (Runtime Secret) |
| `PROD_SSH_PORT` | optional |
| `PROD_DEPLOY_PATH` | optional |

## Local dry-run (no VPS)

```bash
docker compose up -d --build
curl -fsS http://127.0.0.1:8787/api/ready
npm test
```
