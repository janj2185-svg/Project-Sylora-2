# SYLORA — REAL vs MOCK (2026-08-13)

Evidence classes: **API curl**, **browser UI**, **tests**, **code path**, **env gate**.

Legend:
- **REAL** — end-to-end works for a real user with current local stack
- **PARTIAL** — implementation exists but incomplete / limited
- **MOCK** — mock/demo data or sandbox economics
- **STATIC UI** — UI shell only
- **PLACEHOLDER** — stub/catalog/hub listing
- **BROKEN** — implemented but fails at runtime
- **MISSING** — no real capability
- **BLOCKED** — cannot verify without external dependency

## Platform modules

| Module | Status | Evidence |
|--------|--------|----------|
| Install / `npm ci` | REAL | 0 vulns, Node 22 |
| Lint / “build” / typecheck | REAL (syntax only) | `npm run lint|build|typecheck` = `node --check` |
| Postgres migrate | REAL | 001–012 applied; 66 tables |
| Redis + outbox ready | REAL | `/api/ready` ready:true |
| Health endpoints | REAL | `/api/health`, `/api/ready` |
| SPA shell + deep links | REAL | `/`, `/live`, `/studio`, … serve `index.html` |
| Register / login / logout | REAL | curl + browser; session revoke → 401 |
| Password recovery | MISSING | `/api/auth/recover` → 404 |
| Email verification | MISSING | no endpoint / flow |
| Google auth | BLOCKED / MISSING | integrations BLOCKED_EXTERNAL; `/api/auth/google` 404 |
| Profile edit | REAL | `PATCH /api/me` (locale limited to uk/pl/en in API) |
| Feed posts | REAL | create/list/react/comment |
| Follow / block / report | REAL (API) | curl follow/block; reports store |
| Notifications list | PARTIAL | API works; smart inbox mostly empty buckets |
| Search | PARTIAL | lexical `/api/search`; universal/AI search degraded without embeddings |
| DMs | REAL (local) | create conversation + message + user SSE |
| Calls signaling | PARTIAL | `POST /api/calls` creates ringing session; media/TURN blocked for NAT |
| Live room create/list | REAL | rooms persisted in Postgres |
| Live chat / like | PARTIAL | APIs exist; full multi-viewer WebRTC needs camera + network |
| Live WebRTC P2P | PARTIAL | Studio broadcast path; peer limit 6; no TURN → not production |
| Live Following tab | STATIC UI | no follow-hosts filter API wired |
| Battles | PARTIAL | `POST /api/live/battles` returns plan; scoring local |
| Guest multi-host stage | MISSING | no guest invite WebRTC |
| OBS companion | PARTIAL | loopback companion code; needs local OBS |
| RTMP ingest | MISSING | none in SYLORA |
| Recording | PARTIAL | browser MediaRecorder → local download |
| Gift catalog UI | REAL | `/gifts` renders 10 gifts |
| Gift send (Postgres mode) | **BROKEN** | `POST /api/gifts/send` → `creatorShareBps is not defined` |
| Gift send (JSON test mode) | REAL | `tests/api.test.mjs` PASS with empty DATABASE_URL |
| Gift effects client | PARTIAL | atlas/canvas/GPU/Phoenix code present |
| Wallet / LUMEN | MOCK | starter_grant 10000 TEST; no top-up; no payments |
| Payments / checkout | BLOCKED | payments BLOCKED_EXTERNAL; commerce type validation fails |
| Clips / video upload | PARTIAL | upload+ffmpeg path exists; empty libraries in UI |
| Communities | PARTIAL | create/join/channel posts work in API tests |
| Courses / learning | PARTIAL | free course enroll works in JSON test; paid → PAYMENT_PROVIDER_REQUIRED |
| Business hub | PLACEHOLDER / PARTIAL | hub catalogs + some invoice/CRM JSON ops; country adapters `architecture_stub` |
| Science hub | PLACEHOLDER / PARTIAL | calculators/tools mixed; visualization setup_required |
| Sylora AI chat | BLOCKED | 503 `AI_PROVIDER_NOT_CONFIGURED` without key; UI shows unavailable banner |
| Sylora AI memory CRUD | PARTIAL | works without LLM; confirm-action design real |
| Sylora voice realtime | BLOCKED | needs OpenAI Realtime key |
| Living avatar | PARTIAL | PNG assembled portrait + CSS motion; **not 3D** |
| Translation | MOCK / PARTIAL | local stub returns original text (`completed_local`) |
| Agents / developer platform | PARTIAL | marketplace/apps/keys scaffolding; OAuth blocked |
| Admin moderation | PARTIAL | endpoints exist; privilege via unverified email allowlist |
| Analytics | PLACEHOLDER | stats/progress/orbit XP; no product analytics stack |
| CI/CD | MISSING | no GitHub Actions |
| Production observability | MISSING | no metrics/tracing/error SaaS wired |
| Account deletion / export | PARTIAL | privacy request API scaffolding; not full GDPR productization |

## Critical REAL path proven this audit

1. Boot with Postgres+Redis → ready
2. Register → wallet 10000 LUMEN
3. Login / bad login 401 / logout
4. Post → feed → react → comment → follow
5. DM conversation + message
6. Create LIVE room + list
7. Create battle object
8. Create call session object
9. AI history `configured:false`; chat 503
10. Gift send **fails** on Postgres path

## Tests vs reality trap

- `npm test` → **134 PASS / 0 FAIL**
- Default test env clears `DATABASE_URL` / `REDIS_URL` → JSON path
- Therefore **gift Postgres bug is invisible to the green suite**
- Almost no browser E2E; UI console errors (`three` import, CSP) not covered

## Weighted module readiness (0–100)

| Module | % | Note |
|--------|--:|------|
| Frontend shell | 72 | Many views render |
| Design/UI polish | 68 | Light aesthetic present; CSS layering chaos |
| UX coherence | 42 | Nav sprawl, duplicated surfaces |
| Responsive | 58 | Dock works; incomplete multi-viewport polish |
| Backend core | 55 | Solid social/live/auth; gift PG broken |
| Database | 62 | Migrations real; hybrid drift |
| Authentication | 48 | Core yes; recovery/OAuth/verify no |
| Sylora AI | 32 | UI rich; provider blocked |
| Avatar | 40 | PNG/CSS simulation |
| Voice | 22 | Blocked external |
| Live streaming | 44 | Local P2P prototype |
| Social | 60 | Feed/follow/comment real |
| Messaging | 55 | DMs real |
| Calls | 38 | Signaling partial |
| Gifts | 35 | UI yes; PG send broken; TEST economy |
| Wallet/payments | 25 | Sandbox only |
| Creator tools | 48 | Studio UI + local media |
| Business | 28 | Hub + stubs |
| Education | 35 | Courses partial; hubs catalogs |
| Notifications | 40 | Basic list |
| Analytics | 20 | Orbit counters |
| Admin | 35 | Minimal moderation |
| Security | 40 | Some solid primitives; live SSE leak |
| Performance | 45 | Huge PNGs; monolith JS |
| Testing | 35 | Green but false confidence |
| DevOps/CI | 20 | Compose+script; no CI |
| Production infra | 22 | Deploy script exists; no DR/observability |

### Roll-ups

| Metric | % | Method |
|--------|--:|--------|
| UI completion | **70** | Views/nav/screenshots exist |
| Functional completion | **38** | E2E user capabilities |
| Backend completion | **52** | Endpoints + persistence, minus broken/stub mass |
| End-to-end completion | **34** | Auth→social yes; gifts/AI/payments/live-prod no |
| Production readiness | **24** | Secrets/CI/TURN/payments/security gaps |
| **Overall SYLORA completion** | **36** | Weighted toward E2E + production, not file count |
