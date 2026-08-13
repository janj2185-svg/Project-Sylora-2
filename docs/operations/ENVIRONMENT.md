# SYLORA environment variables

This is the Phase 0 inventory of runtime configuration. Values shown here are placeholders only. Never commit real secrets. Prefer `.env.local` for local overrides; it is gitignored.

Source of truth: `src/config.mjs` plus `.env.example`.

## How environments behave

| Mode | `NODE_ENV` | Persistence | Missing OpenAI | Missing TURN | Missing Redis |
|---|---|---|---|---|---|
| Development | `development` (default) | JSON fallback allowed | `AI_UNAVAILABLE`, process stays up | Live `DEGRADED` | Single-process fallback, `DEGRADED` |
| Test | `test` | JSON / pg-mem / in-memory as used by tests | `AI_UNAVAILABLE` | Reported, does not fail the suite | Not required |
| Production | `production` | PostgreSQL required | `AI_UNAVAILABLE`, process stays up | Live readiness `NOT_READY` | Not required to boot; scale-out `DEGRADED` |

Production boot fails with a non-zero exit if `DATABASE_URL` is missing or not a `postgres://` / `postgresql://` URL:

```
Production startup blocked: DATABASE_URL is required.
```

The message does not include the URL, passwords, or other secrets.

## Core

| Variable | Required | Dev | Test | Prod | Notes |
|---|---|---|---|---|---|
| `NODE_ENV` | yes (defaults to development) | optional | set by tests | required | `production` / `prod` enable production guards |
| `PORT` | no | optional | optional | optional | Default `8787` |
| `SYLORA_DATA_FILE` | no | optional | tests override | unused for auth/wallet/LIVE when Postgres is up | JSON store path for remaining domains and local fallback |
| `SESSION_TTL_DAYS` | no | optional | optional | optional | Default `30` |
| `CREATOR_GIFT_SHARE_BPS` | no | optional | optional | optional | Default `7000` |
| `SYLORA_ADMIN_EMAILS` | no | optional | optional | optional | Comma-separated admin emails |

## Database

| Variable | Required | Dev | Test | Prod | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | production only | optional | usually empty | **required** | Must be `postgres://` or `postgresql://` |
| `POSTGRES_PASSWORD` | compose only | optional | unused | compose/VPS | Used by Docker Compose, not read by Node config |

Valid example shape (not a real secret):

```env
DATABASE_URL=postgresql://sylora:local-only@127.0.0.1:5432/sylora
```

## Redis

| Variable | Required | Dev | Test | Prod | Notes |
|---|---|---|---|---|---|
| `REDIS_URL` | no | optional | usually empty | optional | `redis://` or `rediss://` |

Redis is **not** required to boot or to mark `/api/ready` true.

Works without Redis (single process):

- auth and sessions
- JSON or Postgres persistence
- in-process SSE
- in-memory rate limits
- in-memory WebRTC peer leases
- in-memory LIVE viewer presence

Needs Redis for production scale-out:

- multi-instance SSE fanout
- distributed rate limits
- distributed WebRTC peer leases
- distributed LIVE viewer presence

Missing Redis is diagnosed as `DEGRADED`, not a startup failure.

## AI

| Variable | Required | Dev | Test | Prod | Notes |
|---|---|---|---|---|---|
| `OPENAI_API_KEY` | no | optional | usually empty | optional for boot | Absence → `AI_UNAVAILABLE` |
| `OPENAI_MODEL` | no | optional | optional | optional | Default `gpt-5.6` |
| `OPENAI_MODEL_FAST` | no | optional | optional | optional | Falls back to `OPENAI_MODEL` |
| `OPENAI_REALTIME_MODEL` | no | optional | optional | optional | Default `gpt-realtime-2.1` |
| `OPENAI_REALTIME_VOICE` | no | optional | optional | optional | Default `marin` |
| `OPENAI_BASE_URL` | no | optional | optional | optional | Optional compatible API base |

Machine-readable AI states:

- `AI_CONFIGURED` — key present and accepted by config
- `AI_UNAVAILABLE` — key missing
- `AI_DEGRADED` — key present but invalid, or a live provider call failed

The API key is never included in `/api/health`, `/api/ready`, `/api/ai/status`, or logs.

## Realtime / STUN / TURN

| Variable | Required | Dev | Test | Prod Live | Notes |
|---|---|---|---|---|---|
| `SYLORA_ICE_SERVERS_JSON` | no | optional | optional | needed for Live NAT | Existing JSON array of ICE servers |
| `SYLORA_STUN_URLS` | no | optional | optional | recommended | Comma-separated STUN URLs |
| `SYLORA_STUN_URL` | no | optional | optional | recommended | Single-STUN alias |
| `SYLORA_TURN_URL` | no | optional | optional | needed for Live NAT | `turn:` or `turns:` URL |
| `SYLORA_TURN_USERNAME` | no | optional | optional | with TURN URL | Browser ICE username |
| `SYLORA_TURN_CREDENTIAL` | no | optional | optional | with TURN URL | Browser ICE credential |

JSON and discrete variables are merged. TURN is **not** hosted inside the Node app.

Development without TURN: Live/realtime status `DEGRADED`.  
Production without TURN: Live readiness `NOT_READY`. Core `/api/ready` can still be true if the database is healthy.

### TURN credential exposure

TURN username/credential must be given to the browser ICE agent. SYLORA sends them only to authenticated users through:

- `GET /api/live/rtc-config`
- `GET /api/calls/rtc-config`

This is a WebRTC exception, not a general license to expose server secrets. Do not reuse database, Redis, OpenAI, or payment credentials. Prefer short-lived TURN credentials from an external issuer. Configuration support is not the same as a deployed TURN server.

## Payments

| Variable | Required | Dev | Test | Prod checkout | Notes |
|---|---|---|---|---|---|
| `SYLORA_PAYMENT_PROVIDER` | no | unused | unused | required later | Also accepts `PAYMENT_PROVIDER` |
| `SYLORA_PAYMENT_SECRET_KEY` | no | unused | unused | required later | Provider secret |
| `SYLORA_PAYMENT_WEBHOOK_SECRET` | no | unused | unused | required later | Webhook verification |
| `PAYMENT_PROVIDER_API_KEY` | no | unused | unused | legacy alias | Still recognized |

Payments remain `PAYMENT_PROVIDER_REQUIRED` / `BLOCKED_EXTERNAL` until a real provider is configured. TEST LUMEN is sandbox currency.

## Companion / security flags

| Variable | Required | Notes |
|---|---|---|
| `SYLORA_COMPANION_PORT` | no | Default `43179` |
| `SYLORA_COMPANION_ORIGINS` | no | Extra CSP connect-src origins |
| `SYLORA_COMPANION_TOKEN` | production companion | Shared bearer for the local OBS companion |
| `SYLORA_ENABLE_HSTS` | no | Set `1` only after HTTPS termination |

## Reserved / future (not invented, not wired as live)

These exist in `.env.example` or code as honesty gates. Do not put real credentials in git.

- `SYLORA_TRANSLATE_API_KEY`, `SYLORA_TRANSLATE_PROVIDER`
- `SYLORA_EMBEDDING_PROVIDER`, `SYLORA_EMBEDDING_API_KEY`
- `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`
- `SYLORA_OAUTH_ISSUER`, `SYLORA_OAUTH_PRIVATE_KEY_PEM`, `SYLORA_OAUTH_PUBLIC_JWKS_JSON`

## Public diagnostic endpoints

These are safe to call without secrets in the response:

- `GET /api/health` — process is alive
- `GET /api/ready` — production-traffic readiness plus dependency checks
- `GET /api/ai/status` — `AI_CONFIGURED` / `AI_UNAVAILABLE` / `AI_DEGRADED`
- `GET /api/integrations/status` — external integration honesty

## Local commands

Development still works without PostgreSQL, OpenAI, Redis, or TURN:

```bash
npm install
npm test
npm run dev
```

Production-shaped local stack remains Docker Compose, which supplies `DATABASE_URL` and `REDIS_URL`.
