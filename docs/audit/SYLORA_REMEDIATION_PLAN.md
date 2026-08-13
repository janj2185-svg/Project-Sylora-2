# SYLORA — Remediation Roadmap (Baseline → Production)

**Do not execute until approved.** Ordered by dependency and readiness impact.

---

## Phase 0 — P0 blockers

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P0 | Dev JSON persistence in prod | server.mjs, compose.yaml | Fail boot if production without DATABASE_URL | Postgres | `/api/ready` 503 without DB in production |
| P0 | Docker/CI absent | .github/workflows | Add CI: lint, test, compose config | — | PR checks green |
| P0 | AI core blocked | .env, server.mjs | Document required OPENAI_API_KEY; degrade UI honestly | OpenAI account | Chat returns 200 with key |
| P0 | WebRTC NAT | rtc-config.mjs | Configure TURN in SYLORA_ICE_SERVERS_JSON | TURN provider | Two-browser live test connects |

---

## Phase 1 — Architecture & foundations

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | Dual persistence confusion | store.mjs, repositories/* | Single write path per entity | Phase 0 | No duplicate live/chat in JSON when PG on |
| P1 | 3885 LOC service.mjs | ecosystem/service.mjs | Extract domains with tests | — | ≤500 LOC per module |
| P1 | 11 CSS files | public/design-*.css | Merge to design-tokens + scenes | Design review | 2 CSS files loaded |
| P1 | Unauthenticated media | server.mjs serveMedia | Signed URLs or auth check | — | 401 without token |

---

## Phase 2 — Core user flows

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | No browser E2E tests | tests/ | Playwright: register→post→logout | CI | 1 green E2E pipeline |
| P1 | Google auth missing | server.mjs, app.js | OAuth PKCE or remove from marketing | Google console | Login with Google works |
| P2 | Password recovery | server.mjs | Email reset flow | SMTP | Reset link works |
| P2 | Live Following empty | live repo | Implement follow graph for live | Social graph | Tab shows rooms |
| P2 | Clip/video uploader dup | app.js | Shared upload component | — | One uploader module |

---

## Phase 3 — Sylora AI / avatar

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | AI chat blocked | server.mjs, OpenAI | Configure provider + eval tests | OPENAI_API_KEY | ai.test passes live |
| P2 | Avatar is PNG not 3D | app.js, assets | Decide: honest 2D OR import GLB | Art pipeline | Product truth in UI copy |
| P2 | Viseme fake lipsync | app.js setSyloraViseme | Integrate viseme v2 sheet or drop claim | — | Sync within 100ms of audio |
| P2 | 150 orphan AI endpoints | ecosystem/routes.mjs | Hide or wire UI | Product spec | Each endpoint has UI or `@internal` |

---

## Phase 4 — Live / social / creator

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | WebRTC E2E unverified | app.js live/calls | Manual + automated WebRTC test | TURN | Host+viewer video |
| P2 | RTMP absent | — | Scope decision: browser-only or ingest | Infra | Document limitation |
| P2 | Companion not bundled | companion.mjs | Document start script in compose | OBS | Studio connects |
| P3 | Battle dual API | server.mjs, routes.mjs | Unify battle creation | — | One endpoint |

---

## Phase 5 — Monetization

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | TEST LUMEN misleading | app.js, wallet | Rename to DEMO or integrate Stripe | Payment provider | Real checkout OR honest label |
| P1 | Paid courses blocked | server.mjs enroll | Payment webhook | Stripe | Paid enroll works |
| P2 | Creator payouts | wallet repo | Payout ledger + admin | Legal | Export CSV |

---

## Phase 6 — Responsive / design consistency

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P2 | Tablet not tested | modules.css | Test 768–1024 breakpoints | — | Screenshot suite |
| P2 | Mixed EN/UK in nav | i18n.js, index.html | Full i18n for nav labels | — | PL/EN complete |
| P3 | favicon 404 | public/ | Add favicon.ico | — | 200 on /favicon.ico |

---

## Phase 7 — Security / performance / testing

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P1 | localStorage token | app.js | httpOnly cookie migration | — | XSS token theft mitigated |
| P2 | 45MB assets | public/assets | Compress, lazy-load, CDN | CDN | LCP < 2.5s |
| P2 | Gift runtime paths | gift-runtime.js | Consolidate fallback chain | Phase 1 CSS | One play() API |
| P3 | Dependency audit in CI | package.json | npm audit --production | CI | Fail on high |

---

## Phase 8 — Production readiness

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA |
|----------|---------|---------------|--------|--------------|---------------------|
| P0 | No backups | infra/ | pg_dump cron + media sync | Postgres | Restore drill |
| P1 | No metrics | server.mjs | Prometheus /health metrics | — | Dashboard |
| P1 | ffmpeg in API process | server.mjs | Queue workers for transcode | Redis queue | API stays responsive |
| P2 | Account deletion | routes.mjs | GDPR delete user | Legal | Data removed in 30d |

---

## Top 10 tasks by readiness ROI

1. Postgres+Redis production boot + migrations
2. OPENAI_API_KEY + Sylora chat E2E
3. TURN for Live/Calls
4. CI (test/lint/build)
5. Playwright smoke E2E
6. Payment provider OR remove TEST LUMEN branding
7. CSS/design consolidation
8. Media auth/signed URLs
9. Browser WebRTC verification suite
10. favicon + honest AI/avatar product copy
