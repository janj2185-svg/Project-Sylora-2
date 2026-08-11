# Deploy SYLORA to Hetzner / getsylora.com

**Status:** production is **online but STALE** (`?v=20260809-3`). Verified tip is on `cursor/sylora-live-ecosystem-34a2`.  
**Host:** `77.42.42.246` (`getsylora.com`)  
**Path:** `/opt/sylora`  
**Agent SSH:** not available in Cloud Agent (no `PROD_SSH_*` secrets).

**Do not invent** `PROD_SSH_USER`, `PROD_SSH_PRIVATE_KEY`, `PROD_SSH_PORT`, or `PROD_DEPLOY_PATH` values in chat.  
**Never:** destructive `git reset --hard`, volume wipe, or force-push without analysis.  
**Never:** paste `PROD_SSH_PRIVATE_KEY` into chat.

## ONE command path (owner on VPS)

```bash
ssh <YOUR_USER>@77.42.42.246
cd /opt/sylora
git fetch origin
git checkout cursor/sylora-live-ecosystem-34a2
git pull --ff-only origin cursor/sylora-live-ecosystem-34a2
./scripts/owner-deploy-getsylora.sh /opt/sylora
```

Then from laptop: `./scripts/prod-smoke.sh https://getsylora.com`

<details><summary>Expanded manual steps</summary>


</details>

## Prerequisites on VPS

- Docker + Compose
- `.env.local` with at least `POSTGRES_PASSWORD` (and existing DB volumes)
- Optional keys later: `OPENAI_API_KEY`, Google/TikTok/… — leave empty; UI/API stay fail-closed
- TLS at nginx (`infra/nginx/sylora.conf.example`)
- Optional: `SYLORA_ENABLE_HSTS=1` only after HTTPS verified

## Cursor secrets (optional, for agent remote deploy)

| Variable | Notes |
|---|---|
| `PROD_SSH_HOST` | default `77.42.42.246` |
| `PROD_SSH_USER` | required |
| `PROD_SSH_PRIVATE_KEY` | Runtime Secret |
| `PROD_SSH_PORT` | optional |
| `PROD_DEPLOY_PATH` | default `/opt/sylora` |

Then: `./scripts/deploy-prod.sh . remote`

## Scripts

| Script | Purpose |
|---|---|
| `scripts/deploy-prod.sh` | backup / dry-run / deploy / remote / smoke |
| `scripts/prod-smoke.sh` | public production smoke/E2E |

See `docs/audit/PRODUCTION_DEPLOY_STATUS.md` for the live audit snapshot.
