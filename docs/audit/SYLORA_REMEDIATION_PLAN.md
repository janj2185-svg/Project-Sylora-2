# SYLORA — Remediation Plan (do not implement until assigned)

Ordered for maximum readiness gain. No calendar estimates — technical dependencies only.

## Phase 0 — P0 blockers

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P0 | Gift send throws on Postgres (`creatorShareBps` undefined) | `src/server.mjs` `/api/gifts/send` | Use `creatorGiftShareBps` (or pass named field consistently) | None | `POST /api/gifts/send` with DATABASE_URL returns 201; balance debited; ledger balanced; idempotent replay |
| P0 | No integration test for Postgres gift path | `tests/*`, CI | Add test **with** real/pg-mem DATABASE_URL covering HTTP handler | Gift fix | CI fails if Postgres gift path regresses |
| P0 | Unauthenticated LIVE SSE leaks WebRTC signals | `src/server.mjs` live events | Require viewer/host token or strip signal payloads for anon | Live client updates | Anonymous client cannot read SDP/ICE |
| P0 | Admin via unverified email allowlist | `src/server.mjs` register/admin | Provision admins out-of-band or require verified email | Auth email system | Registering allowlisted email without verify ≠ admin |

## Phase 1 — Architecture & foundations

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Hybrid JSON/PG drift | `store.mjs`, repositories, `server.mjs` | Finish durable domains on PG; document remaining JSON explicitly | Migrations | Single persistence path for gifts/auth/live/messages |
| P1 | God files | `service.mjs`, `routes.mjs`, `app.js` | Split by domain boundaries (no big rewrite of product) | Phase 0 stable | New features land in domain modules with tests |
| P1 | No CI | `.github/workflows` (create later) | test + migrate + docker ready smoke | None | PR cannot merge on red |
| P1 | “build” is syntax check | `package.json` | Real asset pipeline / bundle budget | None | Production assets hashed; size budget reported |
| P1 | Dual gift catalogs | `store` gifts vs `gift-v2/catalog.js` | Map passport IDs → economy IDs | Gift fix | One catalog drives UI+ledger |

## Phase 2 — Core user flows

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No password recovery | auth API + UI | Add reset token email flow | Email provider | Forgot password E2E works |
| P1 | No email verification | auth | Verify before sensitive privileges | Email provider | Unverified ≠ admin; optional gate for posting |
| P2 | Locale schema vs UI (13 vs 3) | `schema.sql`, `PATCH /api/me`, `i18n.js` | Align supported locales | Migration | Selecting ES does not fail profile persist |
| P1 | Navigation sprawl | `index.html`, `app.js`, More | Adopt consolidated IA (see duplication report) — **design first** | Product decision | One name per feature; no orphan primary features |
| P2 | Following LIVE empty | live UI/API | Implement follow-hosts live list or remove tab | Follow graph | Tab shows real data or is removed |
| P2 | Onboarding thin | `/api/onboarding` + UI | Minimal first-run path Home→profile→one create | Auth | New user journey PASS |

## Phase 3 — Sylora AI / avatar

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | AI blocked / no streaming | `server.mjs` AI routes, providers | Keep fail-closed; add streaming when keyed; eval harness | OPENAI_API_KEY | Chat E2E with key; honest degraded without |
| P2 | Avatar sold as living 3D | `app.js`, CSS, assets | Label as 2D portrait system; remove dead rig assets later | Product honesty | No claim of unsupported blendshapes/3D |
| P2 | Voice only via Realtime | realtime route | Document STT/TTS matrix; browser fallbacks clearly labeled | Provider | Voice readiness criteria published |
| P2 | Live cohost advisory only | living-sylora, live cohost API | Define one cohost loop (chat cue → UI) before autonomy | AI + live | Cohost readiness >60% with proof |

## Phase 4 — Live / social / creator

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No TURN | `rtc-config`, integrations | Require TURN for non-localhost | Infra | Two-network watch PASS |
| P1 | P2P peer limit / no SFU | live peer registry | Decide SFU vendor or hard cap UX | TURN | Documented scale limit enforced in UI |
| P2 | Weak reconnect | studio/live JS | Re-offer on ICE fail | Signaling auth fix | Temporary disconnect recovers |
| P2 | No RTMP | — | Either integrate ingest or stop implying OBS RTMP inside SYLORA | Product | Honest OBS story |
| P2 | Guest stage missing | live stage APIs | Implement invite guest WebRTC or remove UI claims | Signaling | Guest join PASS or UI removed |

## Phase 5 — Monetization

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P0 | Gift E2E broken (Phase 0) | wallet | Complete after fix | Phase 0 | Viewer→gift→creator earnings visible |
| P1 | No real top-up | payments env | Integrate provider or permanently sandbox-label | Compliance | Checkout PASS in sandbox or purchase disabled |
| P1 | Creator payouts absent | economy modules | Do not enable real money until ledger+KYC | Legal | Payout path documented |
| P2 | Commerce type errors | `commerce.mjs` | Align UI types with API | Gift/wallet | Product create+checkout honesty |

## Phase 6 — Responsive / design consistency

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P2 | CSS layer soup | 11 CSS files | Tokenize; freeze new layers | IA decision | One visual system checklist |
| P2 | Card/hero clutter | view renderers | Apply one-job-per-section | Design | Home first viewport passes brand test |
| P2 | Mobile incomplete screenshots gaps | UI | Fix overflow on 360–412; enlarge targets | None | Mobile score ≥80 on audit viewports |
| P3 | i18n scaffolding locales | `i18n.js` | Complete or hide incomplete locales | Locale schema | No half-translated shells |

## Phase 7 — Security / performance / testing

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Gift SSE open | `/api/gifts/stream` | Scope/auth | Phase 0 | No global anonymous economic firehose |
| P1 | Media UUID public | media routes | Signed URLs | Storage plan | Unauthorized media 401/403 |
| P2 | localStorage token | `app.js` | HttpOnly cookie session plan | CSRF strategy | XSS cannot exfiltrate session easily |
| P2 | 45MB PNG assets | `public/assets` | Compress, lazy-load, CDN | Build pipeline | LCP budget met on Home/AI |
| P1 | False-green tests | `tests/`, `package.json` | Matrix: JSON + Postgres + Redis | Phase 0 | Both matrices in CI |
| P2 | No browser E2E | — | Playwright critical journeys | Stable selectors | Auth/post/gift/live smoke |

## Phase 8 — Production readiness

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No backups | infra | Automated Postgres backups + restore drill | Hosting | Restore tested |
| P1 | No observability | server | Structured logs + error monitoring | Vendor | Alert on 5xx/gift failures |
| P2 | Rate limit memory-only | server | Redis-backed limits | Redis | Multi-instance safe |
| P2 | DR / rollback | deploy script | Versioned releases + rollback runbook | CI | Documented rollback < one release |
| P2 | Privacy deletion | privacy APIs | Full account delete/export | PG | User can export+delete |
| P1 | Launch gate checklist | `SYLORA_PRODUCTION_READINESS.md` | Enforce checklist | All phases | Score ≥70 before public beta |

## Top 10 readiness-gain works (sequence)

1. Fix Postgres gift send + add PG HTTP test  
2. Secure LIVE signaling SSE  
3. CI matrix (JSON + Postgres/Redis)  
4. Password reset + email verification  
5. TURN + honest live limits  
6. IA consolidation (remove duplicate wallets/nav)  
7. AI keyed E2E + streaming + eval  
8. Signed media + gift SSE auth  
9. Payment sandbox or permanent TEST labeling  
10. Backups + error monitoring + deploy rollback  
