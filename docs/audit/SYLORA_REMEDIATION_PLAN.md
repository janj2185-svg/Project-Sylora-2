# SYLORA — Remediation Plan (Do Not Implement Yet)

**Audit date:** 2026-08-13  
**Instruction:** Plan only. No mass refactor until explicitly tasked.

Columns: **PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA**

---

## Phase 0 — P0 blockers

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P0 | `gift-runtime` imports missing `GIFT_V2_CATALOG` | `public/gift-runtime.js`, `public/gift-v2/catalog.js` | Export alias or fix import to `GIFT_V2_PASSPORTS` + map to wallet IDs | None | `import('./gift-runtime.js')` succeeds in Node/browser; gift stage plays ≥1 gift |
| P0 | Bare `three` resolve fails in gift/Three addons path | `public/gift-gpu-engine.js`, `gift-v2/*`, `vendor/three/addons/*`, `index.html` importmap | Ensure all entry imports resolve under import map or relative paths; add runtime test that instantiates engine in browser | Catalog fix | No `Failed to resolve module specifier "three"` in console; spark/cosmos play |
| P0 | Tests green while gift-runtime broken | `tests/gift-runtime.test.mjs` | Assert actual export/import, not string match | Runtime fix | Failing test before fix; pass after |
| P0 | Production stack unverified | `compose.yaml`, migrations | Bring up PG+Redis+app; run migrate; hit `/api/ready` | Docker or managed PG/Redis | ready=true with postgres+redis configured |
| P0 | AI brand path blocked without honest product mode | `server.mjs`, AI UI | Either configure key in deploy secrets **or** ship “AI setup required” as first-class onboarding (already partial) | Secrets | Documented operator runbook; no silent pretend-AI |

---

## Phase 1 — Architecture & foundations

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Dual-write JSON/Postgres drift | `server.mjs`, repositories, `store.mjs` | Define single persistence mode per env; reduce branch sprawl | PG up | Matrix doc + tests for both modes still, prod uses PG only |
| P1 | Giant `service.mjs` / `app.js` | ecosystem, public | Boundary plan (no big-bang rewrite): extract LIVE/AI/Studio clients | Phase 0 | Module map with owners; no new features in god-files |
| P1 | No CI | `.github/workflows` (create later) | Add CI: npm ci, test, syntax, gift import smoke | None | PR checks required |
| P1 | CSS layer pile-up | `public/design-*.css` | Freeze legacy; load only active sheets | Design lead | Measured CSS payload ↓; visual parity screenshots |
| P1 | Capability registry vs reality | `platform-events.mjs` | Keep honesty labels; wire status to runtime probes | None | UI/admin shows same status as `/api/platform/capabilities` |

---

## Phase 2 — Core user flows

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No password recovery / email verify | auth routes (new) | Design+implement recovery with provider | Email provider | E2E recover works; unverified limits optional |
| P1 | Locale 13 vs server 3 | `server.mjs` PATCH /me, `i18n.js` | Align allowed locales | None | All UI locales persist |
| P1 | `history.replaceState` UX | `app.js` | Use `pushState` + popstate | None | Back button walks views |
| P1 | Studio `ownRooms` console error | `app.js` ~217–228 | Fix scope/error handling | None | No ReferenceError on Studio |
| P2 | Following LIVE empty | live APIs | following-hosts query | Follow graph | Tab lists followed hosts’ lives |
| P1 | Auth/social E2E on Postgres | repositories | Repeat api.test against PG | Phase 0 PG | Same journeys green on PG |

---

## Phase 3 — Sylora AI / avatar

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Chat/realtime only with OpenAI | `server.mjs`, providers | Enforce cost-control on chat; streaming optional | API key | Budget exceeded → 429; chat works |
| P2 | Local orchestrate vs LLM confusion | AI UI copy | Label “local routing” vs “Sylora model” | None | Users never think heuristic = full AI |
| P2 | Avatar oversold as digital human | avatar CSS/assets | Product copy: 2D presence; roadmap 3D separate | None | No blendshape claims in UI |
| P3 | Dead avatar assets/JS | `public/assets`, `app.js` orphans | Delete after inventory confirm | Duplication report | Bundle/assets shrink |
| P2 | Living Sylora co-host | `living-sylora`, live UI | Opt-in react on gift/chat with rate limits | AI key optional | One verified LIVE reaction path |

---

## Phase 4 — Live / social / creator

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | TURN missing | `rtc-config`, integrations | Configure `SYLORA_ICE_SERVERS_JSON` | TURN vendor | Two-network join succeeds |
| P1 | P2P scale limit | Studio/LIVE | Document limit; plan SFU later | TURN | UI shows max viewers honesty |
| P2 | Battles depth | live-entertainment | Ship one complete 1v1 UX | LIVE stable | Score+end+replay event |
| P2 | Guest conference vs LIVE stage | conference + stage APIs | Pick one guest model | WebRTC | Guest publishes A/V |
| P2 | OBS companion hardening | companion.mjs | Require token in prod; docs | None | Unauthorized companion rejected |

---

## Phase 5 — Monetization

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | TEST LUMEN only | wallet, commerce | Integrate payment provider; separate test/prod balances | PSP secrets | Buy pack → ledger credit; webhook idempotent |
| P1 | Gift V2 catalog mismatch | catalog vs store gifts | Unify IDs | Gift runtime | 10 purchasable = 10 playable |
| P2 | Paid courses blocked | courses enroll | Wire to payments | PSP | Paid enroll works |
| P2 | Creator payouts | ledger | Define withdrawal policy (even if manual) | Legal | Documented path |

---

## Phase 6 — Responsive / design consistency

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Tablet empty/icon rail issue | CSS breakpoints | Fix mid-width layout | Screenshots | tablet 768 content visible |
| P2 | Mobile density / touch targets | design-consolidation | 44px targets; dock overlap | None | QA matrix 360/390/412 pass |
| P2 | Multi-product feel (Business/Science) | scenes CSS | Shared primitives, distinct accents | Design | Brand test passes |
| P3 | Card overload on hubs | home/business | Reduce card chrome | UX | First viewport cleaner |

---

## Phase 7 — Security / performance / testing

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No CI security/lint | workflows | npm audit + test + browser smoke | CI | Required checks |
| P1 | AI cost/rate on chat | cost-control, server | Enforce daily token budget | Redis/PG | Proven with tests |
| P2 | Asset weight 45MB+ | assets | Compress; lazy gift atlases | None | LCP improvement measured |
| P2 | Monolithic app.js | public | Code-split by view (later) | None | Initial JS ↓ |
| P1 | Browser E2E missing | new e2e | Playwright: auth, gift play, live join | Runtime fixes | CI e2e green |
| P2 | IDOR pass on top 50 routes | tests | Authz matrix | PG | Documented pass |

---

## Phase 8 — Production readiness

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Backups/DR | infra | Automated PG backups + restore drill | Hosting | Restore tested |
| P1 | Observability | server | Structured logs + error tracker | Vendor | Alerts on 5xx/AI spend |
| P1 | CDN/media storage | media | S3-compatible + CDN | Cloud | Uploads not on app disk only |
| P2 | Rollback | deploy script | Versioned releases | CI | One-command rollback |
| P1 | Privacy ops E2E | security center | Delete/export verified | Auth | Legal checklist signed |
| P2 | Multi-instance soak | fanout/outbox | Load test 2+ nodes | Redis+PG | No double-gift / lost SSE |

---

## Suggested sequencing for max readiness gain

1. Fix gift-runtime + three imports + test that would have caught it  
2. Verify Compose PG+Redis ready  
3. Wire TURN + prove LIVE join across NAT  
4. Enforce AI cost controls + optional key  
5. Payments or permanently scope TEST economy  
6. Auth recovery  
7. CI + Playwright smoke  
8. Tablet/mobile layout fixes  
9. Then deepen AI/LIVE/creator — not more hubs
