# SYLORA production readiness — Phase 0

Phase 0 stabilizes the foundation. It does **not** add product features, redesign UI, rewrite Living Sylora, or change gift visuals.

Base commit for this work: `7afe05c73ddc0cffcb3f1083941f9e489fa9b7e4` (`main`).

## What runtime now checks

### Process liveness — `GET /api/health`

Always `200` when the Node process can answer. AI, Redis, and TURN are **not** required.

Returned fields include `alive`, `env`, persistence mode, public AI status, and raw dependency probes. Secrets are not included.

### Traffic readiness — `GET /api/ready`

Machine-readable JSON. `200` when `ready` is true, otherwise `503`.

Minimum checks:

| Check | Development | Production |
|---|---|---|
| Server process | `OK` | `OK` |
| Database | `DEGRADED` JSON fallback allowed | `NOT_READY` / boot blocked without `DATABASE_URL` |
| Redis | `DEGRADED` single-process fallback | Same; not required for `ready` |
| Outbox | follows persistence | follows Postgres |
| AI | status reported, not required | status reported, not required |
| Realtime / TURN | `DEGRADED` if TURN missing | Live `NOT_READY` if TURN missing |
| Payments | `NOT_CONFIGURED` | `NOT_CONFIGURED` until provider secrets exist |

`ready` means the core process can serve traffic (and, in production, that PostgreSQL is configured and reachable).  
`liveReady` is separate: production Live is not ready without TURN.

### Production boot guard

If `NODE_ENV=production` and `DATABASE_URL` is missing or invalid, `src/server.mjs` exits before listen:

- non-zero exit code
- message: `Production startup blocked: DATABASE_URL is required.`
- no secret values in the message

Development and test keep the JSON store.

### AI honesty

| State | Meaning |
|---|---|
| `AI_CONFIGURED` | OpenAI key accepted by config |
| `AI_UNAVAILABLE` | No key; chat/realtime fail closed with `AI_PROVIDER_NOT_CONFIGURED` |
| `AI_DEGRADED` | Key invalid or a live provider call failed |

Local extractive / Living Sylora reactions without a key are labeled `dev_fallback`. They are not returned as OpenAI responses.

### Redis policy

Redis is optional for a single process. Production multi-instance Live/SSE/rate-limit/peer-lease/viewer-count paths need Redis and are marked `DEGRADED` when it is absent. Redis is not a boot requirement.

### WebRTC / TURN

The app does not run a TURN server. It accepts:

- `SYLORA_ICE_SERVERS_JSON`
- `SYLORA_STUN_URLS` / `SYLORA_STUN_URL`
- `SYLORA_TURN_URL`, `SYLORA_TURN_USERNAME`, `SYLORA_TURN_CREDENTIAL`

ICE servers are given only to authenticated clients. TURN username/credential are a browser ICE exception; see `docs/operations/ENVIRONMENT.md`.

**Status:** code ready / external TURN infrastructure required. This is not `FIXED`.

### CI

`.github/workflows/ci.yml` runs on `push` and `pull_request`:

1. checkout
2. setup Node 22 with npm cache
3. `npm ci`
4. `npm run lint`
5. `npm run build`
6. `npm test`

No deployment. No secrets required.

### Security quick wins in Phase 0

- `.env` / `.env.*` gitignored (`!.env.example` kept)
- production debug endpoints `/__client_error` and `/__client_rejection` disabled
- top-level request errors sanitized in production
- `cross-origin-resource-policy: same-origin`
- existing CSP / HSTS / nosniff / frame deny kept
- companion CORS remains origin-allowlisted; the main app stays same-origin
- auth architecture not rewritten

## What is still blocked

| Item | Status | Why |
|---|---|---|
| Production VPS / Hetzner cutover | BLOCKED | No SSH credentials invented |
| Deployed TURN server | EXTERNAL INFRA REQUIRED | Config layer only |
| Real OpenAI in a given environment | EXTERNAL KEY REQUIRED | Key must be supplied out of band |
| Real payments / payouts | BLOCKED | Provider not configured; TEST LUMEN only |
| Multi-instance Live fanout | DEGRADED without Redis | Redis optional for one process |
| Communities / business / media on Postgres | PARTIAL | Hybrid JSON remains for those domains |
| Object-level ABAC / GDPR export | OPEN | Out of Phase 0 |
| SFU / RTMP production streaming | NOT IN SCOPE | P2P LIVE remains |

## Phase 1+ (explicitly not started)

Do not treat these as Phase 0 work:

- Auth redesign (Google / phone)
- UI / Figma / React / Next.js / Flutter migration
- Living Sylora rewrite or 3D avatar
- Gift visual redesign
- New social / Business / Education features
- Subscriptions and monetization
- Recommendation engine
- Full security rewrite / RBAC matrix

## Package scripts

Existing scripts are unchanged in meaning:

| Script | Purpose |
|---|---|
| `npm run dev` | watch-mode local server |
| `npm start` | production-style `node src/server.mjs` |
| `npm run lint` | syntax checks, including `src/config.mjs` |
| `npm run build` | syntax checks of server + public shell |
| `npm test` | `node --test` with empty `DATABASE_URL` / `REDIS_URL` |

## P0 matrix after Phase 0

| P0 | Before | After | Evidence |
|---|---|---|---|
| CI/CD | BLOCKER | FIXED | `.github/workflows/ci.yml` runs lint/build/test |
| Production persistence | BLOCKER | FIXED | Production boot exits without valid `DATABASE_URL`; tests 1–3 |
| AI provider/config | BLOCKER | CODE READY / EXTERNAL KEY REQUIRED | `AI_*` states, `/api/ai/status`, fail-closed chat; no fake OpenAI in production |
| WebRTC TURN | BLOCKER | CODE READY / EXTERNAL INFRA REQUIRED | STUN/TURN config + Live `NOT_READY` in production when TURN is missing |
