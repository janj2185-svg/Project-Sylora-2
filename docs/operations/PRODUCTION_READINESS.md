# Production readiness

Phase 0 makes the SYLORA foundation honest: the process will not pretend production persistence, AI, or WebRTC NAT traversal exist when they do not.

This is **not** a claim that production infrastructure is deployed.

## What runtime already checks

### Boot (`node src/server.mjs` / `npm start`)

| Check | Development | Production |
|---|---|---|
| Process can start without PostgreSQL | yes (JSON fallback) | **no** — exits non-zero: `Production startup blocked: DATABASE_URL is required.` |
| Process can start without Redis | yes | yes (single-node, marked degraded) |
| Process can start without OpenAI | yes | yes (`AI_UNAVAILABLE`, no fake provider replies) |
| Process can start without TURN | yes | yes (Live readiness is `NOT_READY`) |
| Secrets in boot message | no | no |

`DATABASE_URL` must be a `postgres://` or `postgresql://` URL. Reachability is checked on `/api/ready`, not as a silent JSON fallback.

### `/api/health` — liveness

The process is alive. Always HTTP 200 if the server can answer.

Includes machine-readable `ai`, `realtime`, and `redis` status. Does **not** require AI. Does **not** expose secrets or ICE credentials.

### `/api/ready` — readiness for production traffic

| Check | Blocks production `ready` |
|---|---|
| Server process | yes |
| PostgreSQL configured + ping | yes in production |
| Production config guard | yes |
| TURN for Live/WebRTC | yes in production (`NOT_READY` if missing) |
| AI provider | **no** (reported as `AI_CONFIGURED` / `AI_UNAVAILABLE` / `AI_DEGRADED`) |
| Redis | **no** (reported `DEGRADED` without Redis; required only for multi-instance fanout) |

Development and test remain ready on JSON + in-process realtime so `npm test` and `npm run dev` work without Postgres, OpenAI, or TURN.

### AI honesty

- No API key → `AI_UNAVAILABLE`, chat/voice return `AI_PROVIDER_NOT_CONFIGURED` with `aiStatus` + `reason`
- Provider error → `AI_DEGRADED` on that request (`AI_PROVIDER_ERROR`); not presented as a successful OpenAI reply
- API key never returned to the client and never logged
- `/api/ai/capabilities` and `/api/ai/history` expose status, not credentials

### WebRTC / TURN

- STUN/TURN are configuration only. This app does not run a TURN server
- Authenticated `/api/live/rtc-config` and `/api/calls/rtc-config` send ICE servers to the browser
- TURN username/credential are client-visible because WebRTC ICE requires it — document ephemeral credentials
- Missing TURN: development `DEGRADED`; production Live `NOT_READY`

### Redis policy

Single Node process: SSE, rate limits, peer maps, and viewer counts work in memory.

Multiple Node processes: Redis is required for correct LIVE/conference/gift fanout, shared rate limits, peer leases, and viewer presence. Absence is `DEGRADED`, not a boot failure.

### CI

`.github/workflows/ci.yml` runs on `push` and `pull_request`: checkout, Node 22, `npm ci`, lint, build, test. No deploy. No secrets required for baseline CI.

## What is still blocked (external / later phases)

| Item | Status | Why |
|---|---|---|
| Production VPS / TLS / DNS | BLOCKED | External infra; not Phase 0 |
| PostgreSQL in production | CODE READY / EXTERNAL INFRA REQUIRED | Guard exists; database must be provisioned |
| Redis cluster / multi-instance | CODE READY / EXTERNAL INFRA REQUIRED | Optional for one process |
| OpenAI production key | CODE READY / EXTERNAL INFRA REQUIRED | Status is honest without a key |
| TURN server | CODE READY / EXTERNAL INFRA REQUIRED | Config layer only; no in-process TURN |
| Real payments / payouts | BLOCKED_EXTERNAL | No provider credentials invented |
| Google / phone auth | BLOCKED | Later phase |
| SFU / RTMP | BLOCKED | Still P2P + six-peer Studio cap |
| Object storage / CDN | BLOCKED | Local media pipeline |
| Full RBAC / GDPR export | PARTIAL | Not Phase 0 |

## Phase 1+ (explicitly not started)

- Auth redesign
- UI / Figma redesign
- Living Sylora / 3D avatar rewrite
- Gifts visual redesign
- New social / Business / Education features
- Subscriptions and monetization
- Recommendation engine
- New AI personalities
- Framework migrations (React / Next / Flutter)

Stop after Phase 0 until the foundation report is reviewed.
