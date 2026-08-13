# SYLORA Environment Variables

This document describes runtime environment variables for SYLORA core. Do not commit real secrets.

## Core

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `NODE_ENV` | Optional | `development` | `test` | `production` | Controls boot guards and degraded-capability labeling |
| `PORT` | Optional | `8787` | `8787` | Set by platform | HTTP listen port (1–65535) |

## Data / sessions

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `SYLORA_DATA_FILE` | Optional | `./data/sylora.json` | temp path in tests | — | JSON dev store path when PostgreSQL is absent |
| `SESSION_TTL_DAYS` | Optional | `30` | `30` | `30` | Session lifetime |
| `CREATOR_GIFT_SHARE_BPS` | Optional | `7000` | `7000` | configure | Creator share of gift gross (basis points) |
| `SYLORA_ADMIN_EMAILS` | Optional | empty | test values | admin list | Comma-separated admin emails |

## Database

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `DATABASE_URL` | **Production: required** | Optional (JSON fallback) | Usually empty | **Required** | `postgresql://…` connection string. Production boot fails without a valid URL |

## Redis

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `REDIS_URL` | Optional in dev | Optional | Usually empty | **Required for multi-instance LIVE/realtime** | Used for rate limits (with in-memory fallback), cross-instance fanout, viewer counts, peer leases, durable outbox |

Without Redis in development, LIVE works on a single instance with in-memory fallbacks. Production readiness reports `NOT_READY` for scaling-sensitive paths when Redis is absent.

## AI (OpenAI)

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `OPENAI_API_KEY` | Optional | Optional | empty | Recommended | Missing key → `AI_DEGRADED` (dev) or `AI_UNAVAILABLE` (prod). Never logged or sent to clients |
| `OPENAI_MODEL` | Optional | `gpt-5.6` | default | configure | Chat model |
| `OPENAI_MODEL_FAST` | Optional | — | — | optional | Fast routing tier |
| `OPENAI_REALTIME_MODEL` | Optional | `gpt-realtime-2.1` | default | configure | Realtime voice |
| `OPENAI_REALTIME_VOICE` | Optional | `marin` | default | configure | Realtime voice id |
| `OPENAI_BASE_URL` | Optional | — | — | optional | Custom API base URL |

## WebRTC / ICE (STUN / TURN)

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `SYLORA_ICE_SERVERS_JSON` | Optional | empty | test JSON | **Required for production LIVE WebRTC** | JSON array of ICE server objects |
| `SYLORA_STUN_URLS` | Optional | empty | — | optional | Comma-separated STUN URLs (used when JSON empty) |
| `SYLORA_TURN_URL` | Optional | empty | — | **Required for production LIVE** | TURN URL (`turn:` or `turns:`) |
| `SYLORA_TURN_USERNAME` | With TURN | — | — | with TURN | Client WebRTC credential (exposed to browser via `/api/live/rtc-config`) |
| `SYLORA_TURN_CREDENTIAL` | With TURN | — | — | with TURN | Client WebRTC credential (browser-side; not a server secret in the WebRTC sense) |

TURN is external infrastructure. Configuration support does not deploy a TURN server.

## Payments

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `PAYMENT_PROVIDER` or `SYLORA_PAYMENT_PROVIDER` | Optional | empty | empty | for real checkout | Provider id |
| `SYLORA_PAYMENT_SECRET_KEY` | With provider | — | — | with provider | Provider secret |
| `SYLORA_PAYMENT_WEBHOOK_SECRET` | Optional | — | — | for webhooks | Webhook verification |

## Companion / security headers

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `SYLORA_COMPANION_PORT` | Optional | `43179` | — | configure | Companion process |
| `SYLORA_COMPANION_ORIGINS` | Optional | localhost | — | production origins | CSP `connect-src` allowlist |
| `SYLORA_COMPANION_TOKEN` | Prod companion | — | — | **Required for companion** | Shared bearer between companion and core |
| `SYLORA_ENABLE_HSTS` | Optional | `0` | — | `1` when TLS at edge | Enables HSTS header in production |

## Translation / embeddings (future)

| Variable | Required | Notes |
|----------|----------|-------|
| `SYLORA_TRANSLATE_API_KEY` | Optional | Translation provider |
| `SYLORA_TRANSLATE_PROVIDER` | Optional | Provider id |
| `SYLORA_EMBEDDING_PROVIDER` | Optional | Semantic search |
| `SYLORA_EMBEDDING_API_KEY` | Optional | Embedding API key |

## OAuth / developer platform (future)

See `.env.example` for `SYLORA_OAUTH_*` scaffolding variables.

## Runtime policy summary

- **Development:** JSON persistence allowed; missing AI/TURN/Redis degrades capabilities honestly.
- **Test:** In-memory / JSON test runtime; boot guards relaxed.
- **Production:** Valid `DATABASE_URL` required at boot. Readiness checks PostgreSQL, Redis (scaling), TURN (LIVE WebRTC), and production config. AI missing is `AI_UNAVAILABLE`, not a crash.

Configuration is loaded from `src/config.mjs`. Secrets are never included in health/readiness JSON responses.
