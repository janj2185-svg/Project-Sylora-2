# Environment configuration

SYLORA reads process environment (and `.env.local` in non-test runs). There is one runtime module: `src/config.mjs`.

Never put real secrets in git. `.env`, `.env.local`, and other `.env.*` files are gitignored. `.env.example` is the template.

Secrets are not written to logs, `/api/health`, `/api/ready`, or other JSON diagnostics.

## Environments

| `NODE_ENV` | Persistence | AI without key | TURN missing | Redis missing |
|---|---|---|---|---|
| `development` (default) | JSON fallback allowed | `AI_UNAVAILABLE` (process still starts) | `DEGRADED` | `DEGRADED` (single-process fallback) |
| `test` | JSON / pg-mem / in-memory as used by tests | `AI_UNAVAILABLE` | `DEGRADED` | `DEGRADED` |
| `production` | PostgreSQL **required** at boot | `AI_UNAVAILABLE` (no fake OpenAI replies) | Live readiness `NOT_READY` | `DEGRADED` (single node only; not a boot failure) |

## Core

| Variable | Required | Dev | Test | Production | Notes |
|---|---|---|---|---|---|
| `NODE_ENV` | no (defaults to `development`) | optional | `test` | `production` | Unknown values are treated as development |
| `PORT` | no (default `8787`) | optional | optional | optional | Integer 1–65535 |

## Database

| Variable | Required | Dev | Test | Production | Notes |
|---|---|---|---|---|---|
| `DATABASE_URL` | production only | optional | optional | **required** | `postgres://` or `postgresql://`. Production exits with code 1 if missing/invalid. Message: `Production startup blocked: DATABASE_URL is required.` |
| `SYLORA_DATA_FILE` | no | JSON path | temp files in tests | remaining hybrid domains | JSON is not a production primary store |
| `POSTGRES_PASSWORD` | compose/dev only | optional | unused | unused by Node app | Used by local Docker Postgres, not by the Node process |

## Redis

Redis is **not** required to boot.

Used when `REDIS_URL` is set: distributed rate limits, LIVE/conference/gift fanout across Node processes, WebRTC peer leases, viewer presence.

Without Redis, a **single process** still serves SSE, in-memory rate limits, local peer maps, and local viewer counts.

| Variable | Required | Dev | Test | Production | Notes |
|---|---|---|---|---|---|
| `REDIS_URL` | no | optional | usually empty | optional for one instance; required for horizontal scale | `redis://` or `rediss://` |

## AI

| Variable | Required | Dev | Test | Production | Notes |
|---|---|---|---|---|---|
| `OPENAI_API_KEY` | for real chat/voice | optional | optional / mock | optional (status `AI_UNAVAILABLE` if empty) | Never sent to the client. Missing key is not a fake OpenAI success |
| `OPENAI_MODEL` | no | default `gpt-5.6` | default | default | Do not change personality here |
| `OPENAI_MODEL_FAST` | no | optional | optional | optional | Routing hint |
| `OPENAI_REALTIME_MODEL` | no | default `gpt-realtime-2.1` | default | default | Voice |
| `OPENAI_REALTIME_VOICE` | no | default `marin` | default | default | Voice |
| `OPENAI_BASE_URL` | no | optional | mock server in tests | optional | OpenAI-compatible base URL |

AI machine-readable states: `AI_CONFIGURED`, `AI_UNAVAILABLE`, `AI_DEGRADED`.

Local Living Sylora reactions without a key are **not** OpenAI responses. They are a local fallback path, not a production provider.

## Realtime / WebRTC

TURN is not hosted inside the Node app. Configure an external STUN/TURN provider.

| Variable | Required | Dev | Test | Production Live | Notes |
|---|---|---|---|---|---|
| `SYLORA_ICE_SERVERS_JSON` | no | optional | used in API tests | optional if discrete TURN is set | JSON array of ICE servers |
| `SYLORA_STUN_URLS` | no | optional | optional | recommended | Comma-separated `stun:` / `stuns:` URLs |
| `SYLORA_TURN_URL` | for production Live | optional | optional | **required for Live ready** | `turn:` / `turns:` |
| `SYLORA_TURN_USERNAME` | with TURN | optional | optional | required by most TURN providers | Delivered to authenticated browsers |
| `SYLORA_TURN_CREDENTIAL` | with TURN | optional | optional | required by most TURN providers | **Client-visible by WebRTC design** — use ephemeral credentials in production |

### TURN credential exposure

WebRTC requires the browser ICE agent to present TURN username/credential. SYLORA therefore sends them only through authenticated endpoints (`/api/live/rtc-config`, `/api/calls/rtc-config`). This is not a server-only secret once issued. Prefer short-lived TURN REST credentials. Do not put long-lived TURN passwords in the public client bundle.

Without TURN:

- development / test: realtime status `DEGRADED`
- production Live readiness: `NOT_READY` (`TURN_NOT_CONFIGURED`)

Configuration support is **not** a deployed TURN server.

## Payments

No credentials are invented. TEST LUMEN stays sandbox until a real provider is configured.

| Variable | Required | Notes |
|---|---|---|
| `PAYMENT_PROVIDER` or `SYLORA_PAYMENT_PROVIDER` | for real checkout | Provider id only |
| `PAYMENT_PROVIDER_API_KEY` or `SYLORA_PAYMENT_SECRET_KEY` | with provider | Server-side secret; never logged |
| `SYLORA_PAYMENT_WEBHOOK_SECRET` | with webhooks | Server-side secret |

## Companion / security

| Variable | Required | Notes |
|---|---|---|
| `SYLORA_COMPANION_PORT` | no (default `43179`) | Loopback-only companion |
| `SYLORA_COMPANION_ORIGINS` | no | Origin allowlist |
| `SYLORA_COMPANION_TOKEN` | companion pairing | Not printed in production logs |
| `SYLORA_ENABLE_HSTS` | no | `1` enables HSTS in production |
| `SYLORA_ADMIN_EMAILS` | no | Comma-separated admin emails |
| `SESSION_TTL_DAYS` | no (default `30`) | Session lifetime |
| `CREATOR_GIFT_SHARE_BPS` | no (default `7000`) | Creator share of gifts |

## Other reserved (not Phase 0 product work)

| Variable | Notes |
|---|---|
| `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` | Status only (`BLOCKED_EXTERNAL` until set). Google auth is not implemented in Phase 0 |
| `SYLORA_TRANSLATE_API_KEY` / `SYLORA_TRANSLATE_PROVIDER` | Translation provider |
| `SYLORA_EMBEDDING_API_KEY` / `SYLORA_EMBEDDING_PROVIDER` | Semantic search |
| `SYLORA_OAUTH_ISSUER` / `SYLORA_OAUTH_PRIVATE_KEY_PEM` / `SYLORA_OAUTH_PUBLIC_JWKS_JSON` | Developer platform (future) |
