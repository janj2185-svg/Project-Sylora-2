# Production deploy status — getsylora.com

**Updated:** 2026-08-12 (prod-ready hardening on tip)  
**Verified tip (repo):** `cursor/sylora-live-ecosystem-34a2`  
**Agent SSH to `/opt/sylora`:** **NO**  
**Therefore:** **PRODUCTION DEPLOYED: NO**

## Tip readiness (local, verified)

| Gate | Result |
|---|---|
| lint / build | PASS |
| unit+integration tests | PASS (see CI/`npm test`) |
| three bare specifier | FIXED (addons → relative + CSP importmap hash) |
| favicon | FIXED (`/assets/sylora-mark-v2.svg`) |
| session restore race | FIXED (`requireSession` / pending nav) |
| LIVE Command Center | READY locally (`/live-studio.js`, `/api/sylora-live/*`) |
| AI without OpenAI key | Honest `AI_CONFIGURATION_REQUIRED` |
| deploy script | backup → migrate → health → smoke → rollback |

## Live site (public probe — still stale until owner deploy)

Production remains on older cache (`20260809-3`) until VPS deploy of this tip (`20260812-ready1`).

## ONE owner action

```bash
ssh <YOUR_USER>@77.42.42.246 'cd /opt/sylora && git fetch origin && git checkout cursor/sylora-live-ecosystem-34a2 && git pull --ff-only origin cursor/sylora-live-ecosystem-34a2 && ./scripts/owner-deploy-getsylora.sh /opt/sylora'
```
