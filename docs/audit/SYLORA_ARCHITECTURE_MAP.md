# SYLORA — Architecture Map (as implemented 2026-08-13)

> Source of truth for **what exists in code today**, not the planned platform.
> Evidence: repository inventory, runtime `/api/health`, `/api/ecosystem/status`, `/api/platform/capabilities`, migrations, process boot.

## 1. Actual shape

SYLORA is a **single Node.js HTTP monolith** (`src/server.mjs`) serving:

1. JSON/SSE APIs under `/api/*`
2. Static SPA from `public/` (`index.html` + `app.js`)
3. Uploaded media (`/media/:id`) and HLS (`/hls/:mediaId/*`)
4. Optional loopback **Companion** process (`src/companion.mjs`) for local OBS WebSocket

There is **no** separate frontend framework app, **no** microservice fleet, **no** native WebSocket upgrade on the main server, **no** RTMP ingest server, **no** SFU.

```
┌─────────────────────────────────────────────────────────────┐
│ Browser SPA (public/index.html + app.js + CSS layers)       │
│  + gift-runtime / gift-v2 / sylora-motion / obs-client      │
└───────────────┬─────────────────────────────┬───────────────┘
                │ HTTP + SSE                  │ local only
                ▼                             ▼
┌──────────────────────────────┐   ┌──────────────────────────┐
│ Node server :8787            │   │ Companion :43179         │
│ src/server.mjs               │   │ 127.0.0.1 only           │
│ + ecosystem/routes.mjs       │   │ OBS WebSocket client     │
│ + ecosystem/service.mjs      │   └──────────────────────────┘
└───────┬───────────┬──────────┘
        │           │
        ▼           ▼
┌─────────────┐ ┌─────────────┐ ┌────────────────────────────┐
│ PostgreSQL  │ │ Redis       │ │ JSON file store (fallback) │
│ 66 tables   │ │ outbox/bus  │ │ data/sylora.json           │
└─────────────┘ └─────────────┘ └────────────────────────────┘
        │
        ▼ (optional external)
┌──────────────────────────────┐
│ OpenAI Responses + Realtime  │  ← BLOCKED without OPENAI_API_KEY
│ TURN / payments / Google OAuth│ ← BLOCKED_EXTERNAL
└──────────────────────────────┘
```

## 2. Repository inventory (factual)

| Area | Path | Reality |
|------|------|---------|
| App entry | `src/server.mjs` (~590 LOC dense) | Main HTTP router |
| Ecosystem API | `src/ecosystem/routes.mjs` (~1215 LOC) | ~200 additional endpoints |
| Ecosystem logic | `src/ecosystem/service.mjs` (~3885 LOC) | Giant service bag |
| Domain modules | `src/ecosystem/*.mjs` (~40 files) | Mix of real helpers + hubs/stubs |
| Living Sylora | `src/ecosystem/living-sylora/` | Emotion/reaction engines, not a 3D renderer |
| Auth crypto | `src/auth.mjs` | scrypt + tokens |
| JSON store | `src/store.mjs` | Dev fallback + gift seed catalog |
| PG repos | `src/repositories/postgres-*.mjs` | Auth/social, wallet, AI, live, conference, ecosystem, outbox |
| Infra clients | `src/infra/postgres.mjs`, `redis.mjs` | Connection wrappers |
| Realtime | `src/live-fanout.mjs`, `conference-fanout.mjs`, `realtime-fanout.mjs`, `realtime-outbox.mjs` | SSE fanout + Redis outbox |
| Frontend | `public/app.js` (~204KB single file) | Entire product UI |
| Design CSS | 11 CSS files loaded in order | Layered overrides, not one design system package |
| Gift client | `public/gift-*.js`, `public/gift-v2/*` | Canvas + WebGL + Phoenix |
| Assets | `public/assets/*` (~45MB PNGs) | Avatar plates, gestures, phoenix frames, gift atlas |
| Vendor | `public/vendor/three/*` | Three.js for gifts/Phoenix, not Living Sylora |
| SDK stubs | `sdk/js`, `sdk/python`, `sdk/dart` | Thin clients / docs |
| Migrations | `infra/postgres/schema.sql` + `002`–`012` | Applied via `scripts/migrate.mjs` |
| Compose | `compose.yaml` | App + Postgres 17 + Redis 8 |
| Tests | `tests/*.test.mjs` (46 files, 134 PASS) | Mostly unit/module; E2E API uses JSON store |
| CI | **none** (no `.github/workflows`) | Missing |
| Docs | `docs/*` + older `docs/audit/*` | Not trusted without runtime proof |

**Not found as separate apps:** mobile app, admin SPA, worker queue service, media CDN service, payment service, translation service.

## 3. Runtime persistence model (hybrid)

Verified after `node scripts/migrate.mjs` + boot with `.env.local`:

```json
{
  "status": "ok",
  "persistence": "postgres-social-wallet-ai-hybrid",
  "ecosystemPersistence": "postgres+json-cache",
  "dependencies": { "postgres": "ok", "redis": "ok", "outbox": "ok" }
}
```

| Domain | Postgres when configured | Still JSON / in-memory |
|--------|--------------------------|-------------------------|
| Users, sessions, posts, comments, reactions, follows, blocks | Yes (`postgres-auth-social`) | Fallback JSON |
| Conversations / messages | Yes | Fallback JSON |
| Wallets / gifts / ledger | Yes (`postgres-wallet`) | Fallback JSON |
| AI messages / memories / actions | Yes (`postgres-ai`) | Fallback JSON |
| Live rooms / chat / engagement / battles / stages | Yes (`postgres-live`) | Fallback JSON |
| Conferences | Yes (`postgres-conference`) | Fallback JSON |
| Ecosystem identity/KG/orgs (partial) | Yes (`postgres-ecosystem`) | Large JSON bags remain |
| Studio scenes, media jobs, many business/science records | Often JSON store | Yes |
| Browser-source tokens, peer registries, rate limits | In-memory | Lost on restart |

## 4. API surface size

| Source | Approx endpoints |
|--------|------------------|
| `src/server.mjs` | ~100 |
| `src/ecosystem/routes.mjs` | ~200 |
| `src/companion.mjs` | 5 |
| **Total** | **~308** |

Realtime = **SSE only** (`/api/events`, `/api/live/:id/events`, `/api/gifts/stream`, conferences/calls/OBS). No main-server WebSocket.

WebRTC signaling = HTTP POST + SSE fanout for live / conferences / calls. OpenAI Realtime uses SDP exchange at `/api/ai/realtime`.

## 5. Frontend architecture

- SPA shell views: `feed, live, studio, clips, videos, explore, messages, ai, profile, gifts, more, identity, agents, developer, security, dashboard, canvas, communities, learning, business, admin` (`public/app.js` `SPA_SHELL_VIEWS`)
- Path sync: `history.replaceState` (`/` = feed)
- Navigation: left rail + mobile dock + account shortcuts + Create Hub + Command Palette
- State: module-level `state` object + `localStorage` token (`sylora_token`)
- No React/Vue/Svelte — imperative DOM `innerHTML`

## 6. Capability honesty (from code registry)

`src/platform-events.mjs` STATUS_BY_ID (runtime labels, not marketing):

| Capability | runtimeStatus |
|------------|---------------|
| living-world | NOT_IMPLEMENTED |
| ai-director | PARTIAL |
| gift-interactions | PARTIAL |
| collective-gifts | NOT_IMPLEMENTED |
| gift-evolution | NOT_IMPLEMENTED |
| living-ai | PARTIAL |
| live-translation | BLOCKED_EXTERNAL |
| ai-co-creator | PARTIAL |
| creator-digital-twin | NOT_IMPLEMENTED |
| live-worlds | NOT_IMPLEMENTED |
| story-live | NOT_IMPLEMENTED |
| creator-economy | MOCK |
| ai-business-partner | PARTIAL |
| sylora-moments | PARTIAL |

## 7. External dependencies readiness

From `/api/integrations/status` and `/api/ecosystem/status` (runtime, no keys configured):

| Integration | Status |
|-------------|--------|
| OpenAI chat/realtime | setup_required / blocked_provider |
| Google OAuth | BLOCKED_EXTERNAL |
| TURN | BLOCKED_EXTERNAL |
| Payments | BLOCKED_EXTERNAL |
| Translation | local-stub / degraded |
| Embeddings | blocked_provider |
| LUMEN wallet | test_demo |

## 8. Architectural risks already visible

1. **God files:** `service.mjs`, `routes.mjs`, `app.js` concentrate most product logic.
2. **Hybrid persistence drift:** API paths differ between JSON and Postgres (gift send bug only on Postgres path).
3. **SSE as signaling bus:** scales poorly; unauthenticated live SSE leaks signaling.
4. **Feature surface >> working core:** hundreds of endpoints for hubs that return catalogs/stubs.
5. **No CI / no typed frontend / `build` = syntax check only.**
6. **Vendor lock-in:** AI path is OpenAI-shaped; no provider adapter in production use beyond env gate.

## 9. What this is *not*

- Not a multi-tenant SaaS platform with hard isolation.
- Not a production streaming CDN/SFU product.
- Not a real-money creator economy.
- Not a 3D digital-human stack.
- Not a verified Google-auth social app.
