# SYLORA — Actual Architecture Map

**Audited:** 2026-08-13  
**Commit:** `7afe05c` (`main`)  
**Rule:** this map describes what exists in the repository and what ran in this environment. It does not describe the planned platform.

**Supersedes** prior files `docs/audit/ARCHITECTURE_AUDIT.md`, `docs/audit/CURRENT_STATE.md`, `docs/audit/PLATFORM_MODULE_MAP.md` as source of truth. Those files contain claims that this audit re-checked and in several cases **rejected**.

---

## 1. What the repository actually is

SYLORA is a **single Node.js HTTP process**, not a monorepo, not a microservices mesh, not React/Next.

| Layer | Reality | Evidence |
|---|---|---|
| Applications | 1 web app + optional companion process | `package.json` scripts `start`, `companion` |
| Frontend | Vanilla SPA: `public/index.html` + giant `public/app.js` (~898 lines, many 2–8k char functions) | `public/index.html`, `public/app.js` |
| Backend | Hand-rolled `http.createServer` in `src/server.mjs` | `src/server.mjs` |
| Ecosystem API | Second giant router `src/ecosystem/routes.mjs` | ~200+ extra endpoints |
| Domain logic | `src/ecosystem/service.mjs` + many `src/ecosystem/*.mjs` modules | in-memory / JSON objects |
| Persistence | JSON file **or** Postgres repositories when `DATABASE_URL` is set | `src/store.mjs`, `src/infra/postgres.mjs` |
| Cache / fanout | Redis optional | `src/infra/redis.mjs` |
| SDKs | Thin HTTP clients | `sdk/js`, `sdk/python`, `sdk/dart` |
| Tests | `node:test` files in `tests/*.test.mjs` | 134 PASS in this run |
| CI | **None** | no `.github/` |
| Docker | `Dockerfile` + `compose.yaml` exist | **Docker binary not available in this VM** |

There is **no** separate frontend package, **no** shared UI library, **no** GraphQL, **no** Kafka, **no** SFU process, **no** native apps in this repo.

---

## 2. Runtime topology that actually exists

```
Browser (public/index.html)
  ├── 12 stacked CSS files
  ├── public/app.js  (SPA router + all screens)
  ├── public/i18n.js, create-hub.js, command-palette.js, sylora-motion.js
  ├── public/gift-runtime.js → gift-engine.js + gift-gpu-engine.js + gift-v2/*
  ├── EventSource /api/gifts/stream          (unauthenticated)
  └── fetch /api/*  +  fetch /api/events     (Bearer SSE)

Node src/server.mjs  (PORT 8787)
  ├── static files from public/
  ├── SPA fallback for SPA_SHELL_VIEWS
  ├── /api/* core (auth, social, live, wallet, media, AI chat)
  ├── src/ecosystem/routes.mjs  (business, science, agents, calls, …)
  ├── Store JSON  (SYLORA_DATA_FILE, default ./data/sylora.json)
  ├── optional Postgres pool  (DATABASE_URL)
  ├── optional Redis         (REDIS_URL)
  └── optional OpenAI SDK    (OPENAI_API_KEY)

Optional: src/companion.mjs  (OBS / loopback, SYLORA_COMPANION_PORT=43179)
```

**This audit ran:** `PORT=8787 NODE_ENV=development DATABASE_URL= REDIS_URL= OPENAI_API_KEY=`  
**Health response:** `persistence: json-dev-runtime`, postgres/redis `configured: false`, `ok: true` only because development mode treats missing deps as OK (`dependencyHealth()` in `src/server.mjs`).

**Production `NODE_ENV=production`:** `/api/ready` requires postgres **and** redis **and** outbox configured. That path was **not** executed here.

---

## 3. Process / package inventory (complete)

### Applications
- Main HTTP app: `src/server.mjs`
- Companion: `src/companion.mjs`

### Frontend
- Shell: `public/index.html`
- App: `public/app.js`
- i18n: `public/i18n.js` (uk / pl / en)
- Create Hub overlay: `public/create-hub.js`
- Command palette: `public/command-palette.js`
- Avatar motion: `public/sylora-motion.js`
- Diagnostics: `public/bootstrap-diagnostics.js`
- OBS overlay pages: `public/obs-overlay.html`, `public/phoenix-preview.html`
- Gift stack: `public/gift-engine.js`, `public/gift-gpu-engine.js`, `public/gift-runtime.js`, `public/gift-sfx.js`, `public/gift-v2/*` (20+ modules)
- Vendor: `public/vendor/three/` (Three.js + addons that `import from 'three'`)

### Backend modules (`src/`)
- `auth.mjs`, `store.mjs`, `server.mjs`, `integrations.mjs`, `rtc-config.mjs`
- `capability-graph.mjs`, `platform-events.mjs`, `platform-event-spine.mjs`, `platform-vision.mjs`
- `live-fanout.mjs`, `live-peer-registry.mjs`, `realtime-fanout.mjs`, `realtime-outbox.mjs`
- `conference-fanout.mjs`, `companion.mjs`
- `infra/postgres.mjs`, `infra/redis.mjs`
- Repositories: `postgres-auth-social.mjs`, `postgres-wallet.mjs`, `postgres-ai.mjs`, `postgres-live.mjs`, `postgres-conference.mjs`, `postgres-ecosystem.mjs`, `postgres-outbox.mjs`

### Ecosystem (`src/ecosystem/`)
Agents, AI director, business OS/finance, call engine, clip jobs, commerce, conference mode, cost control, developer platform, domain intelligence, economy, feature flags, identity, knowledge graph, learning-science, live-entertainment, living-sylora, observability, permissions, personal-ai, platform-core, providers, quiz-engine, reputation, routes, science-tools, search, service, social-ecosystem, spaces, sylora-intelligence, sylora-os, sylora-tools, timer-engine, translation, trust, action-engine, ai-to-ai.

**Many of these modules persist only into `store.data.*` arrays** even when Postgres exists. Postgres coverage is partial (auth/social/wallet/AI/live/conference/outbox/some ecosystem). Communities, courses, businesses, videos, reports, audit, most science/business tools remain JSON-primary in `src/server.mjs`.

### Database
- Base schema: `infra/postgres/schema.sql`
- Migrations `002`–`012` in `infra/postgres/migrations/`
- Runner: `scripts/migrate.mjs`
- **Not applied in this VM** (`pg_isready` no response)

### Docker / deploy
- `Dockerfile` (node:24-alpine + ffmpeg; test + runtime stages)
- `compose.yaml` (app + postgres:17 + redis:8)
- `infra/nginx/sylora.conf.example`
- `scripts/deploy-prod.sh`, `docs/DEPLOY-HETZNER.md` (SSH secrets pending)
- **BLOCKED — NOT VERIFIED:** Docker daemon/binary missing in this environment

### Tests
46 files under `tests/`. All are Node unit/integration against in-process server or `pg-mem`. **No Playwright/Cypress/browser E2E.**

### Dead / experimental / patch scripts
- `scripts/patch-consolidation.mjs`, `patch-intelligence-125.mjs`, `patch-platform-81.mjs`, `patch-platform-intel.mjs` — string-replace patchers against `public/app.js`
- `scripts/mock-audit.mjs` — regex scanner
- `public/phoenix-preview.html` — isolated gift/phoenix playground
- `renderProfileLegacy()` in `public/app.js` — unused by `render()`
- `openConferenceRoom` and `openConferenceRoomRtc` both exist in `public/app.js`

---

## 4. SPA views that actually exist

Defined twice (`src/server.mjs` `SPA_SHELL_VIEWS` and `public/app.js`):

`feed, live, studio, clips, videos, explore, messages, ai, profile, gifts, more, identity, agents, developer, security, dashboard, canvas, communities, learning, business, admin`

Deep links: `/` → feed; `/{view}` serves `index.html`.

**Not SPA views (separate HTML):** `/phoenix-preview.html`, `/obs-overlay.html`

---

## 5. Data architecture (actual)

```
JSON Store (always loaded)
  users, sessions, posts, comments, reactions, follows, blocks, reports,
  notifications, wallets, ledger, messages, conversations,
  aiMessages, aiMemories, … 80+ array keys in store.mjs initial()
  gifts: hardcoded 10 IDs (spark…infinite-sylora)

Postgres (when DATABASE_URL set)
  users, sessions, posts, reactions, comments, media, videos,
  conversations, messages, communities*, live_rooms, gifts, wallets,
  ledger, courses*, ai_*, businesses*, notifications, audit_log,
  plus migrations 002–012 (wallet transfers, outbox, resonance, conferences,
  ecosystem, live state)
```

\* Schema tables exist; **runtime still uses JSON** for several of those domains in `src/server.mjs` (communities/courses/business/videos/reports). That is **schema drift / split-brain**, not a unified DB.

Gift seed drift:
- migration `004`: 4 gifts with old names (`Sylora Pulse`, `Nova Bloom`, …)
- migration `008`: 10 gifts with current display names
- `public/gift-v2/catalog.js`: **20 different IDs** (`crystal-star` … `celestial-city`)
- Runtime `/api/gifts`: **10 IDs** (`spark` named Crystal Star, etc.)
- `POST /api/gifts/send` `{giftId: crystal-star}` → **400 INVALID_GIFT** (verified 2026-08-13)

---

## 6. Request path (actual)

1. `securityHeaders()` — CSP, nosniff, frame DENY, permissions-policy camera/mic self
2. Rate limit: 30 auth / 300 other API per IP per minute (memory or Redis)
3. If path starts `/api/` → `api()` in `server.mjs`; unmatched core routes fall through to `ecosystem/routes.mjs`
4. Else static file or SPA shell
5. Auth: `Authorization: Bearer <opaque token>`; session stored as SHA-256 hash (`tokenHash`)

There is **no Express, no Fastify, no OpenAPI spec**.

---

## 7. Dual-path pattern (tight coupling risk)

Almost every core mutation looks like:

```
if (authSocial.enabled) { postgresRepo... } else { store.data...; store.save() }
```

`authSocial.enabled` is true when Postgres is configured. Ecosystem features often **ignore** this and always hit JSON/`service.mjs` memory.

This will produce split-brain the first time production runs mixed traffic.

---

## 8. External dependencies (honesty from runtime)

From `GET /api/ai/capabilities` (no auth) on 2026-08-13:

| Provider | Status |
|---|---|
| OpenAI chat | `blocked_provider` (`aiText: false`) |
| OpenAI realtime voice | `blocked_provider` |
| TTS / STT | false |
| Translation | `local-stub` / degraded passthrough |
| Embeddings | blocked |
| TURN | `iceServers: []`, `turnConfigured: false` (authed `/api/live/rtc-config`) |
| Payments | `BLOCKED_EXTERNAL` (`src/integrations.mjs` checks `PAYMENT_PROVIDER_API_KEY`; `.env.example` documents `SYLORA_PAYMENT_*` — **name mismatch**) |
| Google OAuth | status object exists; **route `/api/auth/google` is 404** |
| Database | `setup_required` |
| Redis | `setup_required` |
| LUMEN wallet | `test_demo` |

---

## 9. Architecture that was planned but is not this codebase

Do **not** confuse with reality:

- Not a 3D digital human (no GLB/VRM/gltf in repo)
- Not a production SFU / RTMP ingest server
- Not a federated “Sylora Protocol” (`docs/SYLORA-PROTOCOL.md` says not implemented)
- Not an OAuth identity provider (`OAUTH_DOC` advertises `/api/v1/oauth/token` which **404s**)
- Not a multi-app frontend (Business / Education / Creator are tabs in the same SPA)

---

## 10. Visual map of the platform as organized today

```
SYLORA (one SPA + one Node process)
├── Shell
│   ├── Header: brand, command search, locale, account
│   ├── Left rail (desktop): Home, LIVE, Clips, Studio, Наука, Бізнес,
│   │                       Відкриття, Спільноти, Inbox, Профіль, Налаштування, Створити
│   ├── Right rail: LIVE pulse + Sylora AI card
│   └── Mobile dock: Home, LIVE, Sylora, Inbox, Profile
│
├── Public / guest
│   ├── / feed (home hub)
│   ├── /live discover
│   ├── /clips /videos /explore /communities /learning /business
│   └── /profile → auth form (register | login only)
│
├── Authed surfaces
│   ├── Social: feed composer, posts, react, comment, follow
│   ├── LIVE: discover | following(empty) | create | battles | studio
│   ├── Studio: camera/mic UI (media BLOCKED in this headless VM)
│   ├── Inbox: messages | notifications | invites | calls | priority
│   ├── Sylora AI: chat UI, memory form, command center (provider BLOCKED)
│   ├── Profile: edit + wallet stats + XP
│   ├── Gifts: 10-card catalog + send form
│   └── Settings grid (/more): Identity, Dashboard, Canvas, Agents,
│       Developer, Security, Media, Gifts, Communities, Science, Business, Admin
│
├── Hidden HTML
│   ├── /phoenix-preview.html
│   └── /obs-overlay.html
│
└── Backend-only
    ├── JSON or Postgres
    ├── SSE gifts + user events
    └── WebRTC signaling over SSE (P2P, 6 peers)
```
