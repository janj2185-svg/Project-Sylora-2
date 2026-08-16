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
| `SESSION_TTL_DAYS` | Optional | `30` | `30` | `30` | Session lifetime; whole days in the inclusive range `1..365` |
| `CREATOR_GIFT_SHARE_BPS` | Optional | `7000` | `7000` | configure | Creator share of gift gross (basis points) |

Public registration always creates `role=user`. The retired `SYLORA_ADMIN_EMAILS` registration shortcut is intentionally ignored because Phase 1 has no email-ownership verification. Existing persisted admin roles continue to work; new admin assignment requires a controlled operator procedure until an audited lifecycle exists.

## Database

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `DATABASE_URL` | **Production: required** | Optional (JSON fallback) | Usually empty | **Required** | `postgresql://…` connection string. Production boot fails without a valid URL |

## Redis

| Variable | Required | Dev | Test | Production | Notes |
|----------|----------|-----|------|------------|-------|
| `REDIS_URL` | Optional in dev | Optional | Usually empty | **Required for multi-instance LIVE/realtime** | Used for rate limits (with in-memory fallback), cross-instance fanout, viewer counts, peer leases, durable outbox |

Without Redis, LIVE works on a single instance with in-memory fallbacks. Missing Redis is reported as `DEGRADED` (multi-instance scaling note); it does not hard-fail single-instance production readiness.

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
| `SYLORA_ICE_SERVERS_JSON` | Optional | empty | test JSON | optional | JSON array of ICE server objects; when non-empty it takes precedence over the discrete URL variables |
| `SYLORA_STUN_URLS` | Optional | empty | — | optional | Comma-separated STUN URLs (used when JSON empty) |
| `SYLORA_TURN_URL` | Optional | empty | — | **Required for production LIVE unless JSON contains TURN** | TURN URL (`turn:` or `turns:`) |
| `SYLORA_TURN_SHARED_SECRET` | Preferred with TURN | — | test secret | **Preferred** | Server-only coturn REST API secret, 32–512 characters using letters, digits, `._~+/=-` (hex recommended). Shared by the app and coturn; never returned to browsers |
| `SYLORA_TURN_TTL_SECONDS` | Optional | `3600` | test value | `3600` | Short-lived credential TTL; whole seconds in the inclusive range `300..86400` |
| `SYLORA_TURN_EXTERNAL_IP` | 1:1 NAT only | — | — | public IPv4 | Public address advertised by coturn; set together with `SYLORA_TURN_RELAY_IP` only when the host is behind 1:1 NAT |
| `SYLORA_TURN_RELAY_IP` | 1:1 NAT only | — | — | private IPv4 | Address owned by the TURN host behind NAT; set together with `SYLORA_TURN_EXTERNAL_IP` |
| `SYLORA_TURN_USERNAME` | Static TURN fallback | — | — | fallback only | Static client credential exposed to authenticated browsers |
| `SYLORA_TURN_CREDENTIAL` | Static TURN fallback | — | — | fallback only | Static client credential exposed to authenticated browsers |

Production readiness requires both a TURN URL and usable authentication. A bare `turn:` URL now reports `TURN_CREDENTIALS_NOT_CONFIGURED`; it does not create false readiness. Shared-secret mode takes precedence over static credentials and derives per-user coturn REST credentials as `<expiry>:<userId>` plus Base64 HMAC-SHA1. Only the derived username/password and expiry are returned by the authenticated `/api/live/rtc-config` and `/api/calls/rtc-config` endpoints.

The repository includes an opt-in, pinned `turn` Compose profile using `coturn/coturn:4.17.2-r0`. Its baseline listener is plain TURN over UDP/TCP `3478`, with TCP/UDP relay ports `49160..49259`; TLS/`turns:` requires a separate certificate deployment. Start it only after adding the shared secret to `.env.local` and opening exactly those listener/relay ports:

```bash
docker compose --env-file .env.local --profile turn up -d
```

When the host interface directly owns its public IPv4 address, leave `SYLORA_TURN_EXTERNAL_IP` and `SYLORA_TURN_RELAY_IP` empty. Behind 1:1 NAT, set both to the public and host-private IPv4 addresses respectively, and forward `3478/tcp`, `3478/udp`, plus every TCP/UDP relay port in `49160..49259` without port translation. The container rejects a partial or malformed pair. Compose cannot infer whether an upstream NAT exists, so the operator must verify this topology before rollout.

The TURN service receives only the shared secret and the two optional TURN address values; the rest of the application's `.env.local` is not exposed to the coturn container.

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

## Developer platform

Scoped developer API keys use PostgreSQL in production and require no signing secret because only a SHA-256 hash is stored. OAuth/OIDC remains future scaffolding; see `.env.example` for the reserved `SYLORA_OAUTH_*` variables.

## Runtime policy summary

- **Development:** JSON persistence allowed; missing AI/TURN/Redis degrades capabilities honestly.
- **Test:** In-memory / JSON test runtime; boot guards relaxed.
- **Production:** Valid `DATABASE_URL` required at boot. Readiness checks PostgreSQL, Redis (scaling), TURN (LIVE WebRTC), and production config. AI missing is `AI_UNAVAILABLE`, not a crash.

Configuration is loaded from `src/config.mjs`. Secrets are never included in health/readiness JSON responses.
