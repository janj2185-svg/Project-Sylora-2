# SYLORA — Production Readiness

**Audited:** 2026-08-13  
**Verdict: not production-ready.** Production readiness score: **12%**.

---

## Environment separation

| Env | How | Verified |
|---|---|---|
| development | `NODE_ENV=development`, JSON OK without PG/Redis | YES — this run |
| test | `npm test` sets `DATABASE_URL=` `REDIS_URL=`; pg-mem for repo tests | YES 134 pass |
| production | `compose.yaml` `NODE_ENV=production` + migrate + PG + Redis | **BLOCKED — Docker missing; PG/Redis not running** |

`dependencyHealth()`: in production, `ready` requires postgres+redis+outbox **configured and ok**. `/api/ready` in this VM returned ready=true only because NODE_ENV=development.

---

## Checklist

| Capability | Status | Evidence |
|---|---|---|
| Docker image | EXISTS, unverified | `Dockerfile` node:24-alpine + ffmpeg |
| Compose | EXISTS, unverified | app + postgres:17 + redis:8 + volumes + healthcheck `/api/ready` |
| CI | **MISSING** | no `.github/workflows` |
| CD | Script only | `scripts/deploy-prod.sh`; Hetzner SSH **pending** |
| Secrets | `.env.local` gitignored | no vault, no rotation |
| Migrations | `scripts/migrate.mjs` + 002–012 | **not applied here** |
| Migration strategy | linear SQL files | no down migrations, no expand/contract documented |
| Backups | **MISSING** | no pg_dump cron, no JSON backup job |
| Logging | `console.error` + `/__client_error` | no structured logger, no PII policy |
| Metrics | **MISSING** | no Prometheus/OTel |
| Tracing | **MISSING** | |
| Health | `/api/health`, `/api/ready` | ready is env-dependent |
| Error monitoring | client beacon only | no Sentry |
| Rate limiting | in-process Map or Redis | lost on restart without Redis |
| CDN | **MISSING** | 45MB assets served from Node |
| Object storage | local media | no S3 |
| Rollback | git + compose recreate | undocumented |
| Disaster recovery | **MISSING** | |
| Privacy / deletion | queued request | **not executed** |
| Data export | `/api/ai/memory/export` + privacy types | incomplete user export |
| TLS | nginx example | not running |
| HSTS | opt-in flag | |
| Multi-instance | Redis fanout + outbox coded | **NOT VERIFIED** |
| SFU / TURN | TURN env JSON | empty here |
| Payments | blocked | |
| Email provider | **MISSING** | no verify/reset possible |

---

## What `npm run build` actually does

```
node --check src/server.mjs && node --check public/app.js && …
```

This is **syntax check**, not a production bundle. There is no minification, hashing (except manual `?v=20260811-consol1`), or tree-shaking. `typecheck` is the same. `lint` is the same.

**Do not treat green build as shippable frontend.**

---

## Runtime that would be required for a public beta

1. Postgres migrated through 012, backups on
2. Redis on
3. `NODE_ENV=production` ready=true
4. OPENAI_API_KEY **or** AI surfaces hidden (today UI still says gpt-5.6)
5. TURN for any real LIVE
6. Password reset + email
7. Gift SSE authenticated
8. Idempotent gifts
9. CI on PR
10. Hide Business/Agents/Developer/OAuth until real
11. CDN or at least gzip + don’t ship 45MB of unused PNGs
12. Account deletion job

Until those exist, SYLORA is a **local demo**, not a launch.

---

## Observability honesty

`src/ecosystem/observability.mjs` exists as a module. There is no deployed Grafana/OTel pipeline in this repo. Treat as **code stub**, not operations.
