# SYLORA — Architecture Map (AS-BUILT)

> Source of truth for **what exists in code today** (commit baseline around `7afe05c` / branch audit).  
> Not a target architecture. Evidence: repository tree, `src/server.mjs`, `src/ecosystem/*`, runtime `/api/health`.

## 1. System shape (actual)

SYLORA is a **single Node.js monolith** serving:
1. Static SPA shell from `public/` (`index.html` + giant `app.js` client router)
2. HTTP JSON API (~200 route handlers) in `src/server.mjs` + `src/ecosystem/routes.mjs`
3. SSE realtime channels (`/api/events`, `/api/live/:id/events`, `/api/gifts/stream`, overlay/call events)
4. Optional companion process `src/companion.mjs` (OBS pairing on local machine)
5. Optional Postgres + Redis when env URLs are set; otherwise **JSON file store** (`src/store.mjs`)

There is **no** separate frontend framework app (no React/Next/Vue). There is **no** microservice mesh. SDKs under `sdk/{js,python,dart}` are thin client stubs.

```
Browser SPA (public/app.js)
    │  REST + SSE + WebRTC (browser P2P)
    ▼
Node HTTP server (src/server.mjs)
    ├── Auth / social / feed / gifts / live / media  (inline handlers)
    ├── Ecosystem router (src/ecosystem/routes.mjs → service.mjs)
    ├── Repositories (src/repositories/postgres-*.mjs)  [if DATABASE_URL]
    ├── Redis helpers (live fanout, peer registry, outbox) [if REDIS_URL]
    └── JSON store fallback (src/store.mjs → data/*.json)
```

## 2. Repository inventory (factual)

| Path | Role |
|------|------|
| `src/server.mjs` (~590 LOC dense) | Main HTTP entry, core API, AI chat/realtime gate, media upload |
| `src/store.mjs` | In-memory/JSON persistence + gift seed catalog |
| `src/auth.mjs` | scrypt password helpers |
| `src/ecosystem/*.mjs` | Large domain layer (AI OS, business, science, live entertainment, calls…) |
| `src/ecosystem/service.mjs` (~3885 LOC) | Ecosystem façade / orchestration |
| `src/ecosystem/routes.mjs` (~1215 LOC) | Ecosystem HTTP routes |
| `src/repositories/` | Postgres repositories for auth/social, wallet, AI, live, conference, ecosystem, outbox |
| `src/infra/postgres.mjs`, `redis.mjs` | Connection wrappers |
| `public/index.html` | Shell: left rail, right rail, mobile dock |
| `public/app.js` (~897 LOC dense) | Entire SPA UI: views, studio WebRTC, AI UI, conferences |
| `public/gift-*.js`, `public/gift-v2/*` | Gift FX runtime (V2 incomplete wiring) |
| `public/sylora-motion.js` | CSS/PNG avatar motion rig |
| `public/assets/*` | PNG atlas/gesture/phoenix (~45MB) |
| `infra/postgres/schema.sql` + `migrations/002–012` | DB schema evolution |
| `compose.yaml`, `Dockerfile` | Deploy packaging (Postgres 17, Redis 8, app) |
| `tests/*.test.mjs` | 40+ Node test files |
| `sdk/` | Language client stubs |
| `docs/` | Prior design/audit docs (**not trusted without re-verification**) |
| `scripts/` | migrate + historical patch scripts |

**Not found:** `.github/workflows` CI, React/TS app, SFU/media server, real PSP SDK, GLTF avatar models, phone/Google auth routes.

## 3. Runtime modes observed

| Mode | When | Status in this audit |
|------|------|----------------------|
| `json-dev-runtime` | `DATABASE_URL` empty | **VERIFIED** — server started; `/api/health` `persistence: json-dev-runtime` |
| Postgres hybrid | `DATABASE_URL` set | **BLOCKED — NOT VERIFIED** (Postgres not running; Docker unavailable) |
| Redis fanout/peers | `REDIS_URL` set | **BLOCKED — NOT VERIFIED** |
| OpenAI AI/voice | `OPENAI_API_KEY` set | **BLOCKED — NOT VERIFIED** (key absent → 503) |

## 4. Frontend architecture (actual)

- **Router:** pathname → `SPA_SHELL_VIEWS` set in `public/app.js` (`/`, `/live`, `/ai`, …) via `history.replaceState`
- **State:** module-level `state` object + `localStorage` token (`sylora_token`)
- **Rendering:** imperative `innerHTML` string templates per `render*()` function
- **Design:** stacked CSS overrides — `styles.css`, `modules.css`, `design-v2.css` … `design-avatar-assembled.css` (10+ layers)
- **i18n:** `public/i18n.js` (partial locale coverage)

Views implemented in `render()`:  
`feed, live, clips, videos, studio, explore, messages, ai, profile, gifts, more, identity, agents, developer, security, dashboard, canvas, communities, learning, business, admin` (+ auth overlay).

## 5. Backend architecture (actual)

- Hand-rolled HTTP router (no Express/Fastify)
- Auth: Bearer session token (hashed), scrypt passwords
- Dual persistence adapters: JSON store OR Postgres repos
- Ecosystem modules often persist to JSON/cache even when Postgres is “enabled” for other domains (hybrid honesty documented in `infra/postgres/README.md`)
- Capability registry admits many `NOT_IMPLEMENTED` / `MOCK` items (`src/platform-events.mjs`)

## 6. Data architecture

**Postgres tables (schema + migrations):** users, sessions, follows, posts, reactions, comments, media, videos, conversations/messages, communities/*, live_rooms/messages, gifts, wallets, ledger/gift_transfers, courses/lessons/enrollments, ai_messages/memories/actions, businesses, notifications, audit_log, realtime_outbox, live_engagement/battles, conferences, ecosystem (identity, KG, agents, orgs, commerce…), live_stages/clip_jobs, search vectors.

**JSON store still owns** many feature domains until migrated (reports/audit in JSON path, media jobs, studio scenes, assorted ecosystem objects depending on flags).

## 7. Realtime / media architecture

| Channel | Mechanism | Production readiness |
|---------|-----------|----------------------|
| User notifications/messages | SSE `/api/events` | Partial (works locally) |
| LIVE chat/viewers/gifts | SSE `/api/live/:id/events` | Partial |
| Gift broadcast | SSE `/api/gifts/stream` | Partial |
| LIVE A/V | Browser WebRTC mesh + `/api/live/:id/signal` | Prototype (peer limit 6, no SFU) |
| Calls / conferences | Same peer-registry pattern | Prototype |
| OBS | Local WebSocket client + browser-source overlay | Local-only helper |
| HLS | ffmpeg-based jobs when media uploaded | Partial / env-dependent |

## 8. Integration boundaries (honest)

From `/api/integrations/status` (runtime):
- Google OAuth → `BLOCKED_EXTERNAL`
- TURN → `BLOCKED_EXTERNAL`
- Payments → `BLOCKED_EXTERNAL` (TEST LUMEN sandbox)
- Translation → `BLOCKED_EXTERNAL`

## 9. Architecture risks (6–12 months)

1. **God files:** `service.mjs`, `routes.mjs`, `app.js`, `server.mjs` — change collision & review impossibility
2. **Dual catalogs** for gifts (store IDs vs gift-v2 passports) already cause runtime import failure
3. **Hybrid JSON/Postgres** without clear domain ownership → silent data loss on mode switch
4. **P2P LIVE** cannot scale; no SFU path
5. **Frontend business logic** in string templates — no component boundaries, weak a11y/testability
6. **CSS archaeology** (v2→v6 + consolidation) — specificity wars
7. **Capability surface >> implementation** — product trust risk
8. **Vendor lock-in to OpenAI** shapes for chat+realtime with thin provider abstraction

## 10. Diagram — actual product surface

```
SYLORA (monolith)
├── Shell
│   ├── Header (search/command palette, locale, wallet chip, account)
│   ├── Left rail (primary + secondary nav + Create + Sylora mini)
│   ├── Right rail (people / popular live / lumen)
│   └── Mobile dock (Home, LIVE, Sylora, Inbox, Profile)
├── Core social: Feed · Explore · Profile · Communities
├── Media: Clips · Videos · Studio · LIVE (+ battles UI)
├── Comms: Messages · Calls (API) · Conferences (science/business)
├── Economy: Gifts · Ledger · TEST LUMEN (no PSP)
├── AI surface: /ai · Living Sylora APIs · Director · Agents · Canvas · Dashboard
├── Verticals: Learning/Science · Business/Orgs
├── Platform: Identity · KG · Developer apps · Security center · Admin
└── Infra: health/ready · migrate · compose · companion
```
