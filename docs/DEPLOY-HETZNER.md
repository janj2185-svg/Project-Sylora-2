# Deploy SYLORA to Hetzner (final step)

**Status:** prepared offline. A Draft PR does not update `getsylora.com`; the release must first be merged to `main`, then deployed from the VPS with an explicitly approved full commit SHA.
**Host (confirmed):** `77.42.42.246` (`getsylora.com`)  
**Do not invent** `PROD_SSH_USER`, `PROD_SSH_PRIVATE_KEY`, `PROD_SSH_PORT`, or `PROD_DEPLOY_PATH`.

## Prerequisites

- Docker + Compose on the VPS
- `.env.local` with production secrets (never commit)
- TLS terminated at nginx (sample: `infra/nginx/sylora.conf.example`)
- Optional: set `SYLORA_ENABLE_HSTS=1` only after HTTPS works
- Optional companion: set `SYLORA_COMPANION_TOKEN` + `SYLORA_COMPANION_ORIGINS`
- Optional multistream: complete the DNS/TLS/credential preflight in [`LIVE_DISTRIBUTION.md`](architecture/LIVE_DISTRIBUTION.md); the normal deploy does not expose or enable the `streaming` profile automatically

## Verified deploy (on VPS)

Choose the exact 40-character SHA that passed CI on `main`. Do not deploy a branch name, a short SHA, or an unreviewed working tree.

```bash
cd /path/to/Project-Sylora-2   # PROD_DEPLOY_PATH when known
test -f .git/sylora-production-current || git rev-parse HEAD > .git/sylora-production-current
git fetch origin main
git switch main
git merge --ff-only origin/main  # loads the reviewed deploy helper itself
# ensure .env.local has DATABASE_URL, REDIS_URL, POSTGRES_PASSWORD, OPENAI_* as needed
./scripts/deploy-prod.sh . deploy <FULL_APPROVED_MAIN_SHA>
```

The deploy helper:

1. refuses tracked local changes and any `origin/main` SHA different from the approved SHA;
2. injects the exact release identity into the container;
3. waits for readiness;
4. verifies `/api/version` locally and through `https://getsylora.com` with cache bypass;
5. attempts an application-code rollback if build, readiness, or public identity verification fails.

Database migrations are intentionally not reversed automatically. The script records the current and previous application SHAs under the repository's private `.git` directory for incident recovery.

## After deploy

1. Confirm the public release identity exactly matches the approved commit:

   ```bash
   curl -fsS https://getsylora.com/api/version
   ```

2. Confirm the HTML response uses `Cache-Control: no-store`; versioned CSS/JS use immutable caching.
3. Open a private browser window and verify Home, LIVE, Studio, Clips, Inbox, Profile and Settings on phone and desktop.
4. Run the manual **Production relay probe** workflow with the same full SHA and a revocable owner test token.
5. If multistream was approved for this release, start `docker compose --env-file .env.local --profile streaming up -d mediamtx`, run Studio preflight, publish a short OBS test, and verify every real destination reports `forwarding` before announcing availability.

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
./scripts/deploy-prod.sh . dry-run
```

The dry-run verifies both readiness and the exact local `/api/version` commit.
