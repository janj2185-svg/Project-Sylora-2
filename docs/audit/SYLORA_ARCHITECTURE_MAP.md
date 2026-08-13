# SYLORA — Architecture Map (AS BUILT)

**Audited:** 2026-08-13  
**Repo:** `janj2185-svg/Project-Sylora-2` @ branch audit run  
**Rule:** describe what exists in code today, not planned architecture.

## 1. Actual topology

```
Browser (vanilla SPA)
  public/index.html
  public/app.js (~208 KB, single shell)
  public/*.css (12 stylesheets stacked)
  public/gift-*.js + public/gift-v2/*
  public/vendor/three/*
        │  HTTP + SSE + WebRTC signaling
        ▼
Node modular monolith
  src/server.mjs          ← HTTP router (auth, social, live, AI, media, studio…)
  src/ecosystem/routes.mjs ← ~ecosystem API surface (business/learn/agents/…)
  src/ecosystem/service.mjs ← large in-process domain service (~3885 LOC)
  src/store.mjs           ← JSON file persistence (default/fallback)
  src/repositories/postgres-*.mjs ← optional Postgres adapters
  src/infra/postgres.mjs / redis.mjs
  src/companion.mjs       ← optional local OBS companion process
        │
        ├── data/sylora.json (+ media/)   when DATABASE_URL empty
        ├── PostgreSQL                    when DATABASE_URL set
        └── Redis                         when REDIS_URL set (fanout/rate)
```

**Not present as separate deployable apps:** no React/Next frontend package, no microservice fleet, no separate AI service, no RTMP ingest service, no payment service.

## 2. Repository inventory (facts)

| Path | Role | Evidence |
|---|---|---|
| `src/server.mjs` | Main HTTP server, static, media, core APIs | runtime `:8787` |
| `src/ecosystem/*` | Domain modules + routes + Living Sylora logic | 35+ `.mjs` files |
| `src/repositories/*` | Postgres repositories | 7 files |
| `src/infra/*` | Postgres/Redis wrappers | 2 files |
| `public/` | Entire UI + gift engines + Three vendor | SPA |
| `infra/postgres/` | `schema.sql` + migrations `002`–`012` (no `001`) | SQL |
| `tests/*.test.mjs` | 45 test files, `npm test` → **134 PASS** | `/tmp/npm-test.log` |
| `sdk/{js,python,dart}` | Thin developer-client stubs | README labels foundation |
| `scripts/` | migrate, deploy-prod, patch/mock-audit helpers | present |
| `compose.yaml` + `Dockerfile` | App + Postgres 17 + Redis 8 | Docker **not available** in this audit VM |
| `docs/` | Prior audits, design bibles, deploy notes | historical; not trusted without re-verify |
| `data/` | JSON runtime store | created at runtime |

## 3. Runtime modes verified

| Mode | How | Verified |
|---|---|---|
| JSON-dev runtime | `DATABASE_URL=` `REDIS_URL=` | **YES** — `/api/health` → `persistence: json-dev-runtime`, `dependencies.ready: true` |
| Postgres+Redis | compose / `DATABASE_URL` | **BLOCKED — NOT VERIFIED** (no Postgres/Redis/Docker in VM) |
| OpenAI-backed AI | `OPENAI_API_KEY` | **BLOCKED — NOT VERIFIED** (empty key → `AI_PROVIDER_NOT_CONFIGURED`) |
| Companion/OBS | `npm run companion` + local OBS WS | **BLOCKED — NOT VERIFIED** (no OBS in VM) |

## 4. Frontend architecture (real)

- **Shell:** one HTML document (`public/index.html`) with left rail, main `#app`, right rail, mobile dock.
- **Routing:** pathname first segment ∈ `SPA_SHELL_VIEWS` (`public/app.js` L11–13). Fallback to `feed`. Server SPA fallback serves `index.html` for shell paths.
- **State:** module-scoped `state` object + `localStorage.sylora_token`. No Redux/React.
- **i18n:** `public/i18n.js` (UA/PL/EN/… selector in header).
- **Create Hub / Command Palette:** separate modules (`create-hub.js`, `command-palette.js`).

### SPA views (pathname)

`feed`, `live`, `studio`, `clips`, `videos`, `explore`, `messages`, `ai`, `profile`, `gifts`, `more`, `identity`, `agents`, `developer`, `security`, `dashboard`, `canvas`, `communities`, `learning`, `business`, `admin`

## 5. Backend architecture (real)

- Hand-rolled `node:http` router (no Express/Fastify).
- Dual persistence: repositories if Postgres configured, else `Store` JSON.
- Ecosystem surface mounts via `handleEcosystemRoutes`.
- Realtime: SSE (`/api/events`, `/api/live/:id/events`, gifts stream) + WebRTC signaling over REST.
- AI: OpenAI SDK in-process when key present; otherwise fail-closed.

### Approximate API surface

- **~290** METHOD|PATH pairs extracted from `server.mjs` + `ecosystem/routes.mjs` (see `SYLORA_FULL_AUDIT.md` API table).
- Many ecosystem endpoints return empty collections / static hub metadata (verified samples below).

## 6. Data architecture

### JSON store keys (`src/store.mjs`)

Huge single-document model: users/sessions/posts/messages/live/gifts/wallet/AI/identity/KG/orgs/business/learning/calls/… (see `initial()`).

### Postgres

- Base: `infra/postgres/schema.sql`
- Migrations: `002_auth_social_runtime` … `012_live_runtime_state`
- Gaps: **no `001_*` migration file**; hybrid risk when some domains Postgres-backed and others JSON-only.

## 7. Visual map of the product surface

```
SYLORA (SPA shell)
├── Home /feed
│   ├── Living horizon hero + Sylora presence
│   ├── Daily Brief / Continue / Inbox strips
│   ├── Recommended LIVE · People · For You · Communities · Science · Business
│   └── Composer (authed)
├── LIVE /live
│   ├── Tabs: discover · following · create · battles · studio
│   ├── Watch (WebRTC viewer) · Chat (SSE) · Ask Sylora · Battle/Resonance
│   └── Studio deep-link
├── Clips /clips · Videos /videos
├── Studio /studio  (camera/mic/screen, scenes, OBS, broadcast)
├── Science /learning · Business /business  (hubs + private conferences)
├── Explore /explore · Communities /communities
├── Inbox /messages  (messages · notifications · invites · calls · priority)
├── Sylora AI /ai  (chat/voice UI; provider-gated)
├── Profile /profile · Gifts /gifts
├── More /more → Identity · Agents · Developer · Security · Dashboard · Canvas · Admin
├── Hidden/dev HTML: /obs-overlay.html · /phoenix-preview.html
└── Mobile dock: Home · LIVE · Sylora · Inbox · Profile
```

## 8. Integration boundary honesty

| Integration | Code status | Runtime this audit |
|---|---|---|
| OpenAI chat/realtime | Wired in `server.mjs` | BLOCKED (no key) |
| Google OAuth | Status flag only (`integrations.mjs`) | MISSING routes (404) |
| Payments | Env placeholders | MISSING checkout routes (404) |
| TURN/ICE | `SYLORA_ICE_SERVERS_JSON` | empty → `turnConfigured:false` |
| Translation/embeddings | provider stubs | degraded/blocked |
| OBS WebSocket | client in browser + companion | BLOCKED (no OBS) |

## 9. Architectural risks (6–12 months)

1. **God files:** `public/app.js` + `src/ecosystem/service.mjs` + `src/server.mjs` concentrate product logic.
2. **Split-brain persistence:** Postgres hybrid vs JSON domains → future schema drift (already: gifts seed `004` vs `008`).
3. **API surface sprawl:** ~290 endpoints, many thin/empty — product illusion of completeness.
4. **P2P LIVE scale:** hard peer limit 6; no SFU/RTMP path.
5. **Frontend business logic:** wallet/live/AI orchestration in browser string templates.
6. **CSS era collision:** 12 CSS layers (`styles.css` Inter/purple vs living-horizon premium light).
7. **Vendor lock-in:** OpenAI Responses + Realtime as only AI path.
8. **Gift catalog dual IDs:** transactional vs V2 passports mismatch + broken `GIFT_V2_CATALOG` export.
