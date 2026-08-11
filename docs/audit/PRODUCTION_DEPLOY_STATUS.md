# Production deploy status — getsylora.com

**Updated:** 2026-08-11T23:45Z (agent re-audit)  
**Verified tip (repo):** `cursor/sylora-live-ecosystem-34a2` @ `20433a4` (+ follow-up commits if any)  
**Agent SSH to `/opt/sylora`:** **NO** (`Permission denied (publickey)`; no `PROD_SSH_*` secrets)  
**Therefore:** agent did **not** apply a production deploy. **PRODUCTION DEPLOYED: NO**

## Public probe (live site now)

| Check | Result |
|---|---|
| `https://getsylora.com/` | HTTP 200, TLS OK, nginx/1.28.3 |
| `/api/ready` | PASS — postgres+redis configured & ok |
| `/api/health` | PASS — `sylora-core`, postgres-social-wallet-ai-hybrid |
| Frontend cache | **STALE** `?v=20260809-3` (repo tip uses `20260811-*`) |
| `/live-studio.js` / `.css` | **404** — LIVE Command Center not on prod |
| `/api/sylora-live/*` | **404** — ecosystem not on prod |
| `/api/wallet` | **404** on current prod build |
| `/api/studio/companion-boundary` | **404** |
| `/api/live/following` | **404** |
| `/api/auth/google` | **404** (stale) — after deploy expect **503** until keys |
| Register / session / post / re-login | PASS on **current stale** prod (API + browser UI) |
| Desktop + mobile layout | PASS on current stale prod (browser smoke) |
| Host | `77.42.42.246` (`getsylora.com`) |
| `./scripts/prod-smoke.sh https://getsylora.com` | **FAIL** (markers for verified tip missing) |

**Conclusion:** production is **alive but outdated**. Verified Project-Sylora-2 tip is **not** deployed.

## Local verification of tip (agent VM)

| Gate | Result |
|---|---|
| `npm run lint` | PASS |
| `npm run build` | PASS |
| `npm test` | **151 pass / 0 fail** |
| Docker compose dry-run | N/A (no Docker in agent VM) |

## What agent prepared in repo

- `scripts/deploy-prod.sh` — backup → checkout **verified REF** → `docker compose up -d --build` → smoke  
  - modes: `backup` \| `dry-run` \| `deploy` \| `remote` \| `smoke`  
  - default `SYLORA_DEPLOY_REF=cursor/sylora-live-ecosystem-34a2` (**not** stale `main`)
- `scripts/owner-deploy-getsylora.sh` — single entrypoint for the VPS owner
- `scripts/prod-smoke.sh` — public E2E/smoke against getsylora.com  
- `docs/DEPLOY-HETZNER.md` — operator checklist  
- `infra/nginx/sylora.conf.example` — reverse proxy sample  

## ONE owner action required to deploy

SSH to the VPS and run:

```bash
cd /opt/sylora && git fetch origin && git checkout cursor/sylora-live-ecosystem-34a2 && git pull --ff-only origin cursor/sylora-live-ecosystem-34a2 && ./scripts/owner-deploy-getsylora.sh /opt/sylora
```

Alternative: add Cursor secrets `PROD_SSH_USER` + `PROD_SSH_PRIVATE_KEY` (optional `PROD_SSH_HOST=77.42.42.246`) and ask the agent to run `./scripts/deploy-prod.sh . remote`.

Do **not** paste private keys into chat. Do **not** deploy `main` (it is behind this tip).
