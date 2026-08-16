# SYLORA Production Readiness (Phase 0)

Phase 0 establishes foundation guards and diagnostics. It does **not** deploy external infrastructure (PostgreSQL clusters, Redis, TURN servers, OpenAI accounts).

## What runtime validates today

### Boot (process start)

| Check | Development | Production |
|-------|-------------|------------|
| `DATABASE_URL` present and `postgresql://` | Optional | **Required — process exits if missing** |
| Invalid `PORT` | Throws at config load | Throws at config load |

Message on blocked production boot:

```text
Production startup blocked: DATABASE_URL is required.
```

No secrets are printed in boot error messages.

### Container recovery

The Compose definition sets `restart: unless-stopped` on the application, PostgreSQL, Redis, and opt-in TURN services. After a host reboot, Docker restores containers that were previously created without a manual `docker compose up` **only when the Docker service is enabled to start at boot and the containers were not intentionally stopped or removed**. Dependency health gates still control application startup, and `/api/ready` remains the authoritative traffic-readiness signal.

### Liveness — `GET /api/health`

Process is alive. Always returns HTTP 200 when the server responds.

Includes:

- `status: "ok"`
- `mode` (`development` | `test` | `production`)
- `persistence` label
- `ai` diagnostics (status, reason — no API key)
- `realtime` diagnostics (TURN/STUN state)
- Dependency ping results (postgres/redis/outbox latency, not credentials)

AI is **not** required for liveness.

### Readiness — `GET /api/ready`

Whether the instance should accept production traffic.

Checks (machine-readable `checks` object):

| Component | Production expectation |
|-----------|------------------------|
| `server` | Always ready if responding |
| `database` | PostgreSQL configured and ping OK |
| `redis` | Optional for single-instance; `DEGRADED` when absent; hard-fail only if URL set but unreachable |
| `outbox` | OK when PostgreSQL outbox available |
| `config` | Production config validation passed |
| `ai` | Reported (`AI_*`); missing key does **not** block overall readiness |
| `realtime` | TURN required — `NOT_READY` without TURN in production |

HTTP 503 when `ready: false`.

### AI status values

| Status | Meaning |
|--------|---------|
| `AI_CONFIGURED` | `OPENAI_API_KEY` set; real provider calls allowed |
| `AI_UNAVAILABLE` | No key in production; APIs return 503, not fake OpenAI text |
| `AI_DEGRADED` | No key in development; local features work, AI chat blocked honestly |

API keys are never sent to clients or logged.

### Realtime / WebRTC status

| Status | When |
|--------|------|
| `READY` | TURN URL plus either short-lived shared-secret auth or complete static client credentials |
| `DEGRADED` | Development without TURN (STUN-only or local) |
| `NOT_READY` | Production without TURN, or with a bare TURN URL that has no usable credentials |

ICE servers are exposed only via authenticated `GET /api/live/rtc-config` and `GET /api/calls/rtc-config`. Preferred shared-secret mode derives a different time-limited username/credential for each authenticated user and returns its expiry. The browser refreshes cached RTC config at most every five minutes, at least one minute before credential expiry, and immediately after the authenticated session changes. The server-only `SYLORA_TURN_SHARED_SECRET` is never returned or retained in the public runtime configuration object. Static browser credentials remain supported as a fallback.

### Bundled coturn baseline

The opt-in `turn` Compose profile pins `coturn/coturn:4.17.2-r0`, uses host networking on Linux, and appends the shared secret to a permission-restricted container-local config at startup. The committed base config:

- listens on UDP/TCP `3478`;
- bounds relay ports to `49160..49259`;
- enables coturn REST API authentication, fingerprints, quotas, and unauthorized challenge rate limiting;
- denies private/link-local/multicast IPv4 peers so the public relay cannot reach internal services;
- hides the software attribute and writes logs to stdout;
- intentionally disables TLS. A future `turns:` listener needs dedicated DNS and certificate lifecycle.

Before first start, place the same 32–512 character `SYLORA_TURN_SHARED_SECRET` in `.env.local` (hex recommended), configure a public `turn:` URL, and open only `3478/tcp`, `3478/udp`, `49160:49259/tcp`, and `49160:49259/udp`. Then create the optional service. Compose passes only that secret—not the rest of the application environment—to coturn:

```bash
docker compose --env-file .env.local --profile turn up -d
```

Do not mark the rollout complete merely because the container process is running: verify a real authenticated TURN allocation and confirm `GET /api/ready` returns HTTP 200.

### Redis policy

Redis is **not** required to boot in development.

| Capability | Without Redis |
|------------|----------------|
| Rate limits | In-memory fallback |
| LIVE SSE (single instance) | Local dispatch |
| Viewer counts / peer leases | In-memory fallback |
| Cross-instance fanout | Local only |
| Durable realtime outbox publish | Fails for distributed path |

Redis is **not** a production boot requirement for a single instance. Missing Redis is reported as `DEGRADED` with `requiredForMultiInstance: true` so operators know multi-node Live/SSE will not scale.

Diagnostics: `checks.redis.expectation` and `redis.capabilities` in config module.

## What is still blocked (external infra)

| Capability | Phase 0 status | Notes |
|------------|----------------|-------|
| CI/CD | **CODE READY** | GitHub Actions workflow in repo |
| PostgreSQL persistence | **CODE READY / EXTERNAL INFRA REQUIRED** | Boot guard enforces URL; cluster must be provisioned |
| Redis scaling | **CODE READY / EXTERNAL INFRA REQUIRED** | Readiness reports when absent |
| OpenAI AI | **CODE READY / EXTERNAL INFRA REQUIRED** | Honest unavailable state without key |
| TURN / WebRTC NAT | **CODE + COMPOSE READY / HOST NETWORK CHANGE REQUIRED** | Pinned opt-in coturn profile; production still needs a shared secret, firewall rules, deployment, and an authenticated allocation check |
| Payments | **BLOCKED_EXTERNAL** | Sandbox LUMEN; real provider keys needed |
| Google OAuth | **BLOCKED_EXTERNAL** | See `/api/integrations/status` |

## Security quick wins (Phase 0)

- `.env` / `.env.local` in `.gitignore`
- Security headers (CSP, X-Frame-Options, nosniff, optional HSTS)
- Production boot does not leak `DATABASE_URL` in errors
- OpenAI errors log status/name, not API key
- Auth sessions stored as hashes in JSON persistence tests

Not in Phase 0: full auth redesign, CORS overhaul (main app is same-origin SPA), payment hardening.

## Phase 1+ (out of scope for Phase 0)

- Auth redesign (Google, phone)
- UI / Figma implementation
- Living Sylora / avatar rewrite
- Monetization and subscriptions
- Recommendation engine
- 3D Sylora
- New social / business / education product features

## Verification commands

```bash
npm ci
npm run lint
npm run build
npm test
```

Production guard tests: `tests/phase0-config-guards.test.mjs`
