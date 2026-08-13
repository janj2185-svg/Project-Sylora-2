# SYLORA — Architecture Map (AS-IS)

**Audit date:** 2026-08-13  
**Branch audited:** `main` @ `7afe05c` (+ audit branch docs only)  
**Rule:** Describes architecture that exists in code today — not the roadmap.

---

## 1. Repository shape (inventory)

| Area | Path | Reality |
|------|------|---------|
| Monolith app | `/` | Single Node.js package `sylora@0.1.0` |
| HTTP server | `src/server.mjs` (~590 LOC) | Core API + static SPA |
| Ecosystem layer | `src/ecosystem/*.mjs` (~10.6k LOC) | ~298 API handlers via `routes.mjs` + `service.mjs` (3885 LOC) |
| Repositories | `src/repositories/*.mjs` | Postgres dual-write for auth/social/wallet/AI/live/conference/outbox/ecosystem |
| Infra adapters | `src/infra/postgres.mjs`, `redis.mjs` | Optional; JSON fallback |
| Fanout | `live-fanout`, `conference-fanout`, `realtime-fanout`, `realtime-outbox` | SSE + Redis optional |
| Companion | `src/companion.mjs` | Separate process, OBS bridge on loopback `:43179` |
| Frontend SPA | `public/app.js` (~208 KB, single module) | Pathname router, 21 views |
| Design CSS | `public/design-*.css` + feature CSS | Layered; 9+ stylesheets loaded |
| Gift FX | `public/gift-*.js`, `public/gift-v2/*` | Canvas / GPU / Phoenix V2 |
| Avatar assets | `public/assets/*.png`, `gestures/` | 2D PNG plates (~45 MB) |
| Vendor | `public/vendor/three/` | Vendored Three.js for gifts |
| DB migrations | `infra/postgres/migrations/002–012` + `schema.sql` | Present |
| Docker | `compose.yaml`, `Dockerfile` | Defined; **Docker binary absent in audit VM** |
| CI | `.github/` | **MISSING** |
| SDKs | `sdk/{js,python,dart}` | Thin client stubs |
| Tests | `tests/*.test.mjs` (46 files, 134 tests) | Node test runner |
| Scripts | `scripts/*.mjs`, `deploy-prod.sh` | migrate, patch generators, mock-audit |
| Docs | `docs/*`, prior `docs/audit/*` | Prior reports **not trusted** without re-verification |

**Not present:** separate frontend framework (React/Vue), microservices, SFU, mobile native apps, GraphQL, WebSocket upgrade on core server, 3D avatar models (`.glb`/`.gltf`/`.vrm` = 0 files).

---

## 2. Runtime processes

```
Browser (SPA public/*)
    │  HTTP + SSE + WebRTC media (browser↔browser)
    ▼
node src/server.mjs          ← MAIN (PORT 8787)
    ├─ static / SPA shell
    ├─ /api/* (inline + ecosystem routes)
    ├─ SSE: events, gifts, live, conferences, calls, studio overlay
    ├─ Store JSON file (always)
    ├─ Postgres repos (if DATABASE_URL)
    └─ Redis (if REDIS_URL) for rate-limit / fanout / viewers

node src/companion.mjs       ← OPTIONAL (43179 loopback)
    └─ HTTP /v1/obs/* → OBS WebSocket (local)
```

Evidence: `src/server.mjs` listen path; `npm start` / `npm run companion`; runtime probe `GET /api/health` → `persistence: json-dev-runtime` when DB unset.

---

## 3. Request pipeline (actual)

1. Security headers (CSP, nosniff, frame deny, optional HSTS)  
2. Client error beacons `/__client_error`, `/__client_rejection`  
3. `/media/:id`, `/hls/:mediaId/:file`  
4. `/api/*` → IP rate limit → `api()`  
5. Else static file from `public/`; SPA shell for known view paths  

Auth: `Authorization: Bearer <token>` (hashed sessions). Not cookies.

---

## 4. Persistence architecture (actual)

| Mode | When | Evidence |
|------|------|----------|
| JSON file Store | Always; sole store if no `DATABASE_URL` | `src/store.mjs`, audit run with `SYLORA_DATA_FILE=./data/sylora-audit.json` |
| Postgres hybrid | `DATABASE_URL` set | repositories `enabled = !!pool` |
| Redis | `REDIS_URL` set | fanout/rate-limit/viewers |

Production readiness gate: `/api/ready` is strict in `NODE_ENV=production` when PG/Redis/outbox missing → 503.

**Schema:** base `infra/postgres/schema.sql` + incremental migrations 002–012 covering auth/social, messaging, wallet/gifts, AI, live, outbox, resonance, conferences, ecosystem, live state.

---

## 5. Frontend architecture (actual)

- **Shell:** `public/index.html`  
- **Router:** pathname → `state.view` via `viewFromPathname` / `syncPathForView` (`history.replaceState` only — no Back stack)  
- **Views:** `feed, live, studio, clips, videos, explore, messages, ai, profile, gifts, more, identity, agents, developer, security, dashboard, canvas, communities, learning, business, admin`  
- **Overlays:** Create Hub (`create-hub.js`), Command Palette (`command-palette.js`), gift stage, incoming call banner  
- **Standalone pages:** `obs-overlay.html`, `phoenix-preview.html`  
- **i18n:** 13 locales in `i18n.js` (uk/pl/en/de fuller; others scaffold)  

---

## 6. Capability registry honesty (server-reported)

`GET /api/platform/capabilities` (runtime 2026-08-13) reports among others:

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
| creator-economy | MOCK (registry) |

---

## 7. External dependencies (integrations status)

`GET /api/integrations/status` without secrets:

| Integration | Status |
|-------------|--------|
| Google OAuth | BLOCKED_EXTERNAL |
| TURN | BLOCKED_EXTERNAL |
| Payments | BLOCKED_EXTERNAL |
| Translation | BLOCKED_EXTERNAL |

AI: `OPENAI_API_KEY` unset → `/api/ai/chat` returns **503 AI_PROVIDER_NOT_CONFIGURED**.

---

## 8. Architecture smells (6–12 month risk)

1. **Giant monolith files:** `service.mjs` (3885), `routes.mjs` (1215), `app.js` (208 KB) — change risk extreme.  
2. **Dual-write JSON + Postgres** — schema drift / divergent behavior paths.  
3. **Frontend business logic** in `app.js` (Studio WebRTC, LIVE watch, AI realtime SDP).  
4. **P2P mesh LIVE** (`STUDIO_P2P_PEER_LIMIT=6`) — cannot scale.  
5. **Ecosystem breadth before depth** — Business/Science/Agents APIs largely local heuristics.  
6. **No CI** — regressions only caught by local `npm test`.  
7. **Import-map fragile gifts** — Three.js bare specifier + broken `GIFT_V2_CATALOG` export.  

---

## 9. Visual platform tree (as shipped)

```
SYLORA (single Node + SPA)
├── Shell / Home (feed) — personal hub
├── LIVE — discover / following(empty) / create / battles / studio link
│   ├── Stream room (WebRTC P2P + SSE)
│   ├── Studio (camera/mic/OBS/companion)
│   └── OBS overlay (standalone)
├── Media — Clips, Videos
├── Sylora AI — chat UI, memory, realtime (provider-gated)
├── Inbox — messages, notifications, calls, priority
├── Social — Explore, Communities, Profile, Identity
├── Gifts + TEST LUMEN wallet
├── Learning / Science hub + courses/conferences APIs
├── Business hub + orgs/finance drafts
├── Personal OS — Dashboard, Canvas, Security, Agents, Developer
├── Admin (role-gated)
└── Companion process (optional OBS)
```
