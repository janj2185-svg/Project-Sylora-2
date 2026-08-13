# SYLORA — REAL vs MOCK vs STATIC vs BROKEN

**Audited:** 2026-08-13 against running `json-dev-runtime` (`DATABASE_URL` empty, `OPENAI_API_KEY` empty, no Redis, no Docker).

Classification rules:

| Label | Meaning |
|---|---|
| **REAL** | UI + backend + persistence + error path verified end-to-end for a real user in this environment |
| **PARTIAL** | Implementation exists but incomplete, dual-path, or unverified in a required layer |
| **MOCK** | Returns success-shaped data that is local/stub/honesty-labeled development |
| **STATIC UI** | Interface only |
| **PLACEHOLDER** | Empty / coming-soon / hardcoded empty list |
| **BROKEN** | Code path exists and fails at runtime |
| **MISSING** | No route/UI/backend |
| **BLOCKED** | Cannot verify without external dependency |

**Nothing below is 100% REAL for production** (Postgres/Redis/OpenAI/TURN/payments were not live). Some rows are REAL **only in JSON-dev**.

---

## Platform modules

| Module | Class | Evidence | Notes |
|---|---|---|---|
| Health / ready (dev) | REAL (dev) | `GET /api/health` 200 `json-dev-runtime` | Production ready requires PG+Redis — **BLOCKED here** |
| Register / login / logout | REAL (JSON-dev) | 201/200/401/401-after-logout | No email verify, no Google, no reset |
| Session Bearer | REAL (JSON-dev) | hashed `tokenHash` in store; tests | |
| Profile PATCH | REAL (JSON-dev) | 200 displayName/bio/locale | |
| Feed GET + post | REAL (JSON-dev) | 201 post, feed count | |
| React / comment / follow | REAL (JSON-dev) | probe 200/201 | |
| Block / report | PARTIAL | UI+API in `app.js`/`server.mjs`; not re-probed this run | JSON reports |
| Search lexical | PARTIAL | `/api/search` exists; embeddings blocked | |
| Home hub UI | PARTIAL | `/api/home/hub` + many empty cards | screenshots |
| Daily brief | MOCK/PARTIAL | flag on; copy duplication on mobile | |
| LIVE room create/list | REAL (JSON-dev control plane) | POST 201, GET rooms | Not a stream |
| LIVE Following tab | PLACEHOLDER | hardcoded `[]` in `renderLive()` | |
| LIVE Watch WebRTC | BLOCKED | `iceServers: []`, no camera in VM | P2P code exists |
| LIVE chat/like/engagement | PARTIAL | routes exist; tests cover PG live repo | JSON path in this run |
| LIVE battles 2.0 | PARTIAL | APIs in `routes.mjs`; UI tab | In-memory entertainment |
| Studio UI | STATIC UI + PARTIAL API | scenes CRUD in api test | Camera **BLOCKED** |
| OBS companion | PARTIAL / BLOCKED | `companion.mjs`, local-only | Not running |
| Clips/videos upload | PARTIAL | api.test ffmpeg path | Local disk, no CDN |
| Communities | PARTIAL | JSON CRUD + api.test | PG table unused |
| Courses | PARTIAL | JSON + api.test enroll | Paid enroll → `PAYMENT_PROVIDER_REQUIRED` |
| DMs | PARTIAL | create 201; SSE in api.test | UI empty |
| Notifications | PARTIAL | GET 200, 2 items after gift | UI thin |
| Calls signaling objects | PARTIAL | POST `/api/calls` 201 ringing | Callee set incomplete; media BLOCKED |
| Gifts catalog 10 | REAL (JSON-dev) | `/api/gifts` | |
| Gift send ledger | REAL (JSON-dev) | spark 201, balance 9990 | **No idempotency** on JSON path |
| Gift V2 20 IDs | MOCK catalog | `gift-v2/catalog.js`; send crystal-star **400** | |
| Gift cinematic / GPU | BROKEN | `Failed to resolve module specifier "three"` | console-log.json |
| Wallet TEST LUMEN | MOCK economy | honesty `test_demo`; start 10000 | |
| Real payments / subs | MISSING / BLOCKED | commerce sandbox; env name mismatch | |
| Sylora AI chat | BLOCKED | 503 `AI_PROVIDER_NOT_CONFIGURED` | |
| `/api/ai/ask` | MOCK | 200 `honesty.state=development` echo | |
| AI memory manual | PARTIAL | POST `/api/ai/memory` 201 | No model |
| AI realtime / TTS / STT | BLOCKED | capabilities false | |
| Living Sylora | PARTIAL in-memory | `living-sylora/index.mjs` | Not a 3D brain |
| Avatar | STATIC UI / CSS 2.5D | PNG + assembled CSS | NOT 3D |
| Translation | MOCK stub | passthrough, `BLOCKED_EXTERNAL` | |
| Identity / KG | PARTIAL | JSON objects | |
| Agents marketplace | MOCK | sandbox catalog, pending review | |
| Developer OAuth | MOCK / BROKEN | docs advertise 404 routes | |
| Security center | PARTIAL | privacy request queued | delete is not delete |
| Dashboard / canvas / tasks | PARTIAL in-memory | APIs 200/201 | Not a product OS |
| Business invoices | MOCK stub | `adapterStatus: architecture_stub` | |
| Orgs | PARTIAL JSON | POST 201 | |
| Science calculators | PARTIAL in-memory | honesty labels in tests | |
| Admin | PARTIAL | 403 unless admin email | JSON audit |
| Google auth | MISSING | 404 | |
| Password reset | MISSING | 404 | |
| Phone auth | MISSING | | |
| Email verification | MISSING | | |
| 2FA / passkeys | MISSING | flag false | |
| Onboarding wizard | MISSING | API only | |
| Analytics product | MISSING | local stats only | |
| CI/CD | MISSING | no `.github` | |
| Postgres runtime | BLOCKED — NOT VERIFIED | no pg | Unit tests use pg-mem |
| Redis runtime | BLOCKED — NOT VERIFIED | | |
| Docker compose | BLOCKED — NOT VERIFIED | no docker | Files exist |

---

## User journeys (this environment)

| Journey | Result | Breaks at |
|---|---|---|
| NEW USER landing → register → home | **PARTIAL** | Register works; no onboarding; home is empty-card hub; no email verify |
| RETURNING login → home → profile | **PARTIAL** | Login works; nav active-state bug; profile edit works |
| AI open → message → response → history | **FAIL / BLOCKED** | `/api/ai/chat` 503; history `configured:false` |
| CREATOR camera → live setup → start stream | **FAIL / BLOCKED** | Room can be created; camera/WebRTC/TURN not verified; Following empty |
| VIEWER discover → join → like → comment → gift | **PARTIAL** | Discover lists rooms; Watch media BLOCKED; gift ledger works if IDs match; playback BROKEN |
| SOCIAL profile → follow → message → call | **PARTIAL** | Follow+conversation REAL JSON; call object PARTIAL; media BLOCKED |
| MONETIZATION wallet → purchase → gift → history | **PARTIAL / FAIL** | TEST LUMEN gift REAL; real purchase MISSING; V2 IDs FAIL |

---

## Counts (modules above, unique rows)

Used for the executive scorecard (deduped major modules, not every API):

- Verified 100% production E2E modules: **0**
- REAL in JSON-dev only (narrow): register/login/logout, feed post, react/comment/follow, gift ledger 10-ID, live room CRUD, health-dev — **still not 100% product modules**
- Partial: **~22**
- Mock/static: **~12**
- Broken: **3** (gift Three.js, LIVE following, tablet 768 empty canvas)
- Missing: **~10** (Google, reset, verify, payments, CI, 3D avatar, SFU, analytics, onboarding UI, 2FA)
- Blocked unverified: Postgres, Redis, Docker, OpenAI, TURN, camera, OBS
