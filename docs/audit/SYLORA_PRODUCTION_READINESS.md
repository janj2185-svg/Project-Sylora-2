# SYLORA — Production Readiness

Assessment date: 2026-08-13 | Environment: Cloud audit VM

---

## Readiness score: **18 / 100**

---

## Checklist

| Capability | Status | Evidence |
|------------|--------|----------|
| Environment separation | PARTIAL | NODE_ENV checks; `.env.local` load |
| Docker | PARTIAL | Dockerfile + compose.yaml; **Docker not installed on audit VM** |
| CI/CD | **MISSING** | No `.github/workflows` |
| Secrets management | PARTIAL | Env vars; no Vault/KMS |
| DB migrations | PARTIAL | `scripts/migrate.mjs` + SQL migrations; not run live |
| Backups | **MISSING** | No backup scripts |
| Logging | PARTIAL | console.error; client error beacon |
| Metrics | **MISSING** | `/api/ecosystem/metrics` admin only |
| Tracing | **MISSING** | — |
| Health checks | **REAL** | `/api/health`, `/api/ready` verified |
| Error monitoring | **MISSING** | No Sentry/etc. |
| Rate limiting | PARTIAL | Implemented; Redis optional |
| CDN | **MISSING** | Static from Node |
| Object storage | **MISSING** | Local `data/media/` |
| Deployment script | PARTIAL | `scripts/deploy-prod.sh` for Hetzner |
| Rollback | **MISSING** | — |
| Disaster recovery | **MISSING** | — |
| Privacy (GDPR) | PARTIAL | `/api/privacy/requests` ecosystem route |
| Account deletion | **MISSING** | No route found |
| Data export | PARTIAL | `/api/ai/memory/export` only |
| HTTPS | PARTIAL | nginx example `infra/nginx/sylora.conf.example`; HSTS opt-in |
| Horizontal scale | PARTIAL | Redis fanout designed; JSON store blocks scale |
| ffmpeg dependency | **REAL** | Present on VM; required for HLS |
| Production AI | **BLOCKED** | OPENAI_API_KEY required |
| Payments | **BLOCKED** | PAYMENT_PROVIDER |
| TURN servers | **BLOCKED** | SYLORA_ICE_SERVERS_JSON |

---

## `/api/ready` behavior

When `NODE_ENV=production`, ready=false unless postgres+redis+outbox all configured (`dependencyHealth()` in server.mjs).

Dev mode (audit): ready=true with JSON fallback.

---

## Docker compose (static validation)

`docker compose config` — **not run** (docker missing). YAML structure reviewed: postgres healthcheck, redis AOF, migrate on start, healthcheck on sylora service.

---

## Deployment path (documented)

1. `scripts/deploy-prod.sh` → git pull + docker compose up
2. `docs/DEPLOY-HETZNER.md` — manual VPS guide

Not executed in audit.

---

## Blockers to production launch

1. Configure Postgres + Redis + run migrations
2. Set OPENAI_API_KEY (if AI is launch-critical)
3. Configure TURN for WebRTC
4. Replace TEST LUMEN with real payment provider or remove monetization claims
5. Add CI pipeline (test + lint + build)
6. Media storage strategy (S3-compatible)
7. Remove or secure dev JSON persistence in production images
8. Observability stack

---

## What would pass a minimal prod bar

- Health/ready endpoints
- Security headers + CSP
- Password hashing
- Docker packaging exists
- Migration scripts exist
- Rate limit + body size limits

## What fails a full prod bar

- No automated deploy verification in repo
- No backup/restore
- Monolithic ffmpeg transcode in API process
- 45MB static assets served by Node
- Single `app.js` / `service.mjs` god-files
- ~150 API endpoints without authz audit
