# SYLORA — Remediation Plan

**Do not start implementation until product owner assigns the next task.**  
This is the recommended order after the forensic baseline.

Columns: PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA

## Phase 0 — P0 blockers

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P0 | Gift FX module fails to import | `public/gift-runtime.js`, `public/gift-v2/catalog.js` | Export canonical catalog or fix import; align IDs with wallet gifts | none | Browser loads runtime without console TypeError; sending `spark` plays effect |
| P0 | Production can run non-durable JSON unintentionally | `src/server.mjs`, `Dockerfile`, `compose.yaml` | Fail closed when `NODE_ENV=production` && !DATABASE_URL | none | Prod boot without DB exits non-zero |
| P0 | No CI safety net | `.github/workflows` (missing) | Add test+lint workflow on PR | GitHub | PR runs `npm test` + `npm run lint` |
| P0 | LIVE scale false promise | `public/app.js` peer limit, missing SFU | Either integrate SFU **or** hard-limit product copy to tiny P2P rooms | product decision | UI + docs state real viewer cap; load test matches claim |

## Phase 1 — architecture & foundations

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Hybrid JSON/Postgres drift | `src/store.mjs`, `src/repositories/*`, migrations | Finish critical domain migration; single SoT matrix | Phase0 prod gate | Matrix doc + tests for auth/social/wallet/live/ai on Postgres |
| P1 | God-file maintainability | `service.mjs`, `routes.mjs`, `app.js` | Split by domain modules without behavior change | none | Files < soft cap; smoke tests still pass |
| P1 | CSS layer explosion | `public/design-*.css` | Freeze new layers; extract tokens; delete dead rules | design owner | One token file + ≤2 scene sheets |
| P1 | Redis optional semantics unclear | fanout/peer registry | Document single-node vs multi-node requirements | compose | Multi-node test or explicit single-node support statement |

## Phase 2 — core user flows

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Register ignores displayName | `src/server.mjs` register | Persist `safeText(input.displayName)` | none | Register with displayName reflected in `/api/me` |
| P1 | No password recovery / email verify | auth routes (missing) | Add verify+reset flows | email provider | E2E: verify required before privileged actions (policy) |
| P1 | Locale mismatch 13 vs 3 | `app.js` profile, `server.mjs` PATCH | Align allow-list | i18n | Header locales ⊆ server accept set |
| P2 | Videos orphaned from nav | `index.html`, IA | Add under Media or Create | IA decision | Reachable consistently |
| P2 | Home dashboard clutter | `renderFeed` | Simplify first viewport | design rules | Brand+one CTA hierarchy |

## Phase 3 — Sylora AI / avatar

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | AI unusable without key; overclaimed UI | `/ai`, capabilities | Keep honest degraded mode; optional provider | OPENAI_API_KEY | With key: chat+history E2E; without: clear disabled send |
| P1 | No streaming text | `server.mjs` `/api/ai/chat` | Add SSE/stream if product requires | provider | First token latency measured |
| P2 | Avatar is PNG simulation | `sylora-motion.js`, assets | Choose: ship honest 2.5D **or** real 3D pipeline | art/tech | Remove unused rig assets OR enable real lipsync |
| P2 | TTS/STT overclaim | capabilities vs `speechSynthesis` | Split browser vs provider capabilities | none | capabilities JSON accurate |
| P3 | Living co-host | `living-sylora`, live UI | Wire reactions into LIVE room visibly | AI+LIVE | Viewer sees reaction event |

## Phase 4 — Live / social / creator

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | TURN missing | `SYLORA_ICE_SERVERS_JSON` | Provide TURN for mobile NAT | infra | 2-network join success rate target |
| P1 | Studio/LIVE media quality | studio broadcast | Stabilize host→viewer path; reconnect | Phase0 cap decision | 5min soak without silent failure |
| P2 | Battles/entertainment scaffolding | `live-entertainment.mjs` | Finish one battle mode E2E or hide | product | One mode REAL or removed from UI |
| P2 | Following tab empty | `renderLive` | Implement following-hosts or remove tab | social graph | No fake empty claiming |

## Phase 5 — monetization

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Only TEST LUMEN | wallet, commerce | Integrate PSP **or** permanently label sandbox | compliance | Checkout REAL or UI forbids “purchase” |
| P1 | Creator payouts blocked | economy modules | Design payout + KYC path | PSP | Documented; no silent earnings claims |
| P2 | Gift ID dual system | catalogs | Canonicalize | Phase0 gift fix | One ID space end-to-end |

## Phase 6 — responsive / design consistency

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P2 | Mobile dock overlap / overflow | CSS, home | Fix stacking + safe areas | screenshots | 360/390/412 no horizontal overflow on core views |
| P2 | Inconsistent components | cards everywhere | Shared primitives; reduce card-in-card | design system | Settings/AI/Business feel same product |
| P3 | Tablet coverage | audit incomplete tablet set | Visual QA 768/1024 | none | Screenshot pack complete |

## Phase 7 — security / performance / testing

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | IDOR/authz audit incomplete | all `:id` routes | Automated authz tests | CI | Negative tests for cross-user access |
| P1 | Asset weight ~45MB | `public/assets` | Compress; lazy; archive unused rigs | avatar decision | LCP budget on home |
| P2 | Tests ≠ E2E product | `tests/*` | Add Playwright critical journeys | CI | Auth, post, DM, gift, live chat E2E green |
| P2 | Rate limits uneven | server | Global/IP user limits | redis optional | Abuse test |

## Phase 8 — production readiness

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No backups/observability | infra | Backups + logs + error monitor | hosting | Restore drill documented |
| P1 | Deploy path unverified | compose, Hetzner docs | Rehearse migrate→health→rollback | secrets | Staging URL passes ready |
| P2 | Privacy export/delete completeness | privacy APIs | Prove GDPR-like flows | Postgres | Export+delete verified |
| P2 | Companion token prod requirements | companion | Enforce token in prod | none | Without token companion disabled securely |

---

## Top 10 readiness lifts (sequence)

1. Fix gift runtime export/IDs  
2. Production fail-closed on DB  
3. CI pipeline  
4. Auth displayName + recovery/verify  
5. TURN + honest LIVE scope (or SFU)  
6. Postgres SoT for core domains  
7. AI provider path E2E + accurate capabilities  
8. Compress/archive assets  
9. Playwright critical journeys  
10. Payments decision (integrate or permanently sandbox UX)
