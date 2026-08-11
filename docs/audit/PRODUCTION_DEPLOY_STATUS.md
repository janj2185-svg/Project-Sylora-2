# Production deploy status — getsylora.com

**Updated:** 2026-08-11 (agent audit)  
**Agent SSH to `/opt/sylora`:** **NO** (publickey denied; no `PROD_SSH_*` secrets in this environment)  
**Therefore:** agent did **not** apply a production deploy. Claiming DEPLOYED=YES would be false.

## Public probe (live site now)

| Check | Result |
|---|---|
| `https://getsylora.com/` | HTTP 200, TLS OK |
| `/api/ready` | PASS — postgres+redis configured & ok |
| `/api/health` | PASS |
| Frontend cache | **STALE** `?v=20260809-3` (repo tip uses `20260811-*`) |
| `/live-studio.js` | **404** — LIVE Command Center not on prod |
| `/api/sylora-live/*` | **404** — ecosystem not on prod |
| `/api/wallet` | **404** on current prod build |
| Register / login / re-login / post | PASS on current prod |
| Host | `77.42.42.246` (`getsylora.com`) |

**Conclusion:** production is **alive but outdated**. Verified Project-Sylora-2 tip (`cursor/sylora-live-ecosystem-34a2`) is **not** deployed yet.

## What agent prepared in repo

- `scripts/deploy-prod.sh` — backup → checkout **verified REF** → `docker compose up -d --build` → smoke  
  - modes: `backup` \| `dry-run` \| `deploy` \| `remote` \| `smoke`  
  - default `SYLORA_DEPLOY_REF=cursor/sylora-live-ecosystem-34a2` (not stale `main`)
- `scripts/prod-smoke.sh` — public E2E/smoke against getsylora.com  
- `docs/DEPLOY-HETZNER.md` — operator checklist  
- `infra/nginx/sylora.conf.example` — reverse proxy sample  

## ONE owner action required to deploy

On the VPS (you have SSH; this agent does not):

```bash
ssh <YOUR_USER>@77.42.42.246
cd /opt/sylora
git fetch origin
SYLORA_DEPLOY_REF=cursor/sylora-live-ecosystem-34a2 ./scripts/deploy-prod.sh /opt/sylora deploy
# then from laptop:
./scripts/prod-smoke.sh https://getsylora.com
```

Alternative: add Cursor secrets `PROD_SSH_USER` + `PROD_SSH_PRIVATE_KEY` (+ optional `PROD_SSH_HOST=77.42.42.246`, `PROD_DEPLOY_PATH=/opt/sylora`) and ask the agent to run `./scripts/deploy-prod.sh . remote`.

Do **not** paste private keys into chat.
