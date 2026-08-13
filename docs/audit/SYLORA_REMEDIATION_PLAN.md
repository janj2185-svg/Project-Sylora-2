# SYLORA — Remediation Plan (Post-Audit)

**Audited:** 2026-08-13  
**Status:** PLAN ONLY — do not implement until explicitly tasked.

Format: `PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA`

---

## Phase 0 — P0 blockers

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P0 | Gift runtime imports missing `GIFT_V2_CATALOG` | `public/gift-runtime.js`, `public/gift-v2/catalog.js` | Export catalog alias or fix import to `GIFT_V2_PASSPORTS` + map to commerce IDs | none | Gift page loads with zero module errors; send still debits LUMEN; one gift animates |
| P0 | Three.js resolution errors in gift path (console) | `public/gift-runtime.js`, nested gift-v2 imports, `index.html` importmap | Ensure all gift modules resolve `three` via importmap or relative vendor path consistently | P0 catalog fix | No `Failed to resolve module specifier "three"` on `/gifts` and LIVE watch |
| P0 | Production cannot rely on JSON-only core | `src/server.mjs`, repositories, compose | Enforce Postgres for auth/wallet/live/AI in production NODE_ENV | Docker/Postgres | `/api/health` shows postgres persistence; register/login/gift survive restart |
| P0 | No CI gate | `.github/workflows` (missing) | Add CI: `npm ci`, `npm test`, `npm run lint` | none | PR cannot merge on failing tests |

## Phase 1 — Architecture & foundations

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | God-file frontend/backend | `public/app.js`, `src/ecosystem/service.mjs`, `src/server.mjs` | Split by domain modules without behavior change | Phase 0 | File size limits + smoke tests green |
| P1 | Dual gift ID spaces | `store.mjs`, SQL `008`, `gift-v2/catalog.js` | Canonical mapping table commerce↔visual | P0 gifts | Single source; UI prices match API |
| P1 | CSS era collision | `public/*.css`, `index.html` | Consolidate to living-horizon + tokens; drop dead eras | visual QA | One token set; no Inter/violet base conflict |
| P1 | Hybrid schema drift | migrations, repositories, JSON domains | Migration plan for communities/business/audit to Postgres | Postgres enforce | No silent JSON-only for declared durable domains |
| P1 | API sprawl / thin hubs | `ecosystem/routes.mjs` | Mark endpoints experimental; hide unfinished UI entry points | product cut | Guest cannot open empty enterprise surfaces as if ready |

## Phase 2 — Core user flows

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | No password recovery / email verify | `src/server.mjs`, auth UI | Implement recovery+verify or explicitly remove claims | email provider | Documented flow E2E test |
| P1 | Session XSS risk | `app.js` auth storage | Prefer httpOnly cookie session | Phase 1 | Token not in localStorage |
| P1 | Inbox/profile notification duplication | `renderMessages`, `renderProfile` | Single notification inbox | none | One UX path |
| P2 | Onboarding only metadata | `/api/onboarding`, home | Minimal guided first actions using real data | none | New user reaches first LIVE/post/AI within 3 taps |
| P1 | Calls media incomplete | call-engine, rtc-config | TURN required + E2E call test | ICE servers | Two browsers complete AV call |

## Phase 3 — Sylora AI / avatar

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | AI blocked without honest product packaging | `/ai`, capabilities | Keep fail-closed; improve empty/setup UX; never claim superintelligence | OpenAI key for staging | Staging chat+history works; prod without key shows setup |
| P1 | Avatar is PNG simulation | `mountSyloraAvatarLayers`, assets | Declare supported features; remove unused rig assets; optional future 3D | design | Spec lists NOT_SUPPORTED items; no fake lipsync claims |
| P2 | Memory/personalization shallow | ai repositories, living-sylora | Confirm-gated memory tiers + tests | AI provider | Memory recall test with fixtures |
| P2 | Voice/realtime | `/api/ai/realtime` | Staging verification + cost caps | OpenAI realtime | Voice session metrics + kill switch |

## Phase 4 — Live / social / creator

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | P2P 6-peer ceiling | studio broadcast, live peers | Document limit; plan SFU; require TURN | ICE | 2+ viewers receive media with TURN |
| P1 | Following LIVE tab empty | `renderLive` | Implement following-hosts or remove tab | social graph | No fake empty promising tab |
| P2 | Battles/quizzes entertainment | live entertainment routes | Finish one battle mode E2E or hide | live core | One mode demoable |
| P2 | OBS/companion path | companion, obs-client | Secure token + integration test doc | local OBS | Overlay gifts+chat verified |

## Phase 5 — Monetization

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | No real payments | integrations, commerce routes | Either integrate provider properly or remove buy CTAs | legal/provider | No dead checkout; sandbox labeled |
| P1 | TEST LUMEN confusion | wallet UI | Keep TEST badge; add explicit sandbox FAQ | none | Users cannot confuse for real money |
| P2 | Gift VFX performance on mobile | gift-v2, gpu engine | Quality governor defaults + mobile QA | P0 gifts | Mid-tier Android 30fps basic gifts |

## Phase 6 — Responsive / design consistency

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P2 | Mobile IA clutter | index.html, CSS | Apply proposed IA; ensure dock vs rail consistency | Phase 1 CSS | Scores Mobile≥80 on audit viewports |
| P2 | Mixed UA/EN module names | i18n.js, More grid | Unify language per locale | none | No mixed labels on UA |
| P3 | Favicon missing | `public/` | Add favicon | none | No 404 |

## Phase 7 — Security / performance / testing

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | Public gift SSE privacy | `/api/gifts/stream` | Auth or room-scope events | none | Unauth cannot read global gift PII |
| P1 | IDOR fuzz gaps | live/conference/org routes | Add security tests | CI | Fail on authZ regressions |
| P2 | Asset weight ~45MB | `public/assets` | Compress, lazy-load, CDN | deploy | LCP budget on home/AI |
| P2 | Tests are unit-heavy, E2E-light | `tests/` | Add Playwright flows for auth/live/gift | CI | 5 critical E2E green |
| P2 | `npm run build/typecheck` are syntax-only | package.json | Real build pipeline or rename scripts | none | Honest scripts |

## Phase 8 — Production readiness

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | No monitoring/backups/DR | infra/docs | Logging+metrics+backup runbook | compose | Restore drill documented |
| P1 | Default compose passwords | compose.yaml, deploy docs | Require strong secrets in prod | none | Deploy refuses defaults |
| P2 | Narrow launch surface | product | Feature-flag Business/Science/Agents | feature-flags | Beta flag matrix |
| P2 | Privacy deletion/export | privacy endpoints | E2E compliance tests | Postgres | Delete+export verified |

---

## Suggested sequencing for max readiness gain

1. Fix gift runtime + CI + Postgres-enforced core  
2. Cut/hide unfinished surfaces  
3. TURN + LIVE viewer E2E  
4. Auth recovery  
5. AI staging verification (honest)  
6. Payments only if monetization is launch-critical  
7. Design/CSS consolidation  
8. Observability + backups
