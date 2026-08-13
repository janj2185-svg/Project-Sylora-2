# SYLORA — Full Forensic Audit (Source of Truth)

**Date:** 2026-08-13  
**Repo:** `janj2185-svg/Project-Sylora-2`  
**Commit audited:** `7afe05c` (main at audit start)  
**Auditor mode:** evidence-first; README/prior agent reports not trusted without runtime proof  
**Product code changes:** **none**  
**Diagnostic-only environment actions:** documented in §0

---

## Executive summary

SYLORA today is a **single Node monolith + imperative SPA** with a surprisingly large API surface (~308 endpoints) and a polished **light futuristic** UI shell. Core **auth → social → DMs → live room create** works locally on Postgres+Redis.  

It is **not** a production social/live/AI platform yet:

- Gift send is **BROKEN** on the Postgres path (variable typo) while JSON tests stay green  
- Sylora AI / voice are **BLOCKED** without `OPENAI_API_KEY`  
- Avatar is **PNG/CSS simulation**, not a 3D digital human  
- Live is **local WebRTC P2P**, not SFU/RTMP production streaming  
- Wallet is **TEST LUMEN** (starter grant); payments/OAuth/recovery **missing/blocked**  
- No CI; “build/lint/typecheck” are syntax checks  
- Security: unauthenticated live SSE signaling; admin email allowlist without verification  

### Scores (weighted; E2E > file count)

| Metric | % |
|--------|--:|
| Overall SYLORA completion | **36** |
| UI completion | **70** |
| Functional completion | **38** |
| Backend completion | **52** |
| End-to-end completion | **34** |
| Production readiness | **24** |

| Counts | N |
|--------|--:|
| Verified 100% modules | **0** |
| Partial modules | **18** |
| Mock/static/placeholder modules | **10** |
| Broken modules | **2** (gift PG send; several console-time UI faults) |
| Missing modules | **8+** (recovery, Google auth, SFU, real payments, CI, …) |
| P0 blockers | **4** (gift PG, live SSE signal leak, admin allowlist, false-green money tests) |
| P1 issues | **12+** (see security + remediation) |

### Companion documents

| Doc | Path |
|-----|------|
| Architecture map | `docs/audit/SYLORA_ARCHITECTURE_MAP.md` |
| UI map | `docs/audit/SYLORA_UI_MAP.md` |
| Real vs mock | `docs/audit/SYLORA_REAL_VS_MOCK.md` |
| Duplication | `docs/audit/SYLORA_DUPLICATION_REPORT.md` |
| Security | `docs/audit/SYLORA_SECURITY_AUDIT.md` |
| Production readiness | `docs/audit/SYLORA_PRODUCTION_READINESS.md` |
| Remediation | `docs/audit/SYLORA_REMEDIATION_PLAN.md` |
| Screenshots | `audit/screenshots/{desktop,mobile,tablet}/` |

Older files under `docs/audit/` (e.g. `CURRENT_STATE.md`, `MASTER_AUDIT_P0.md`) are **historical** and superseded by this set where they conflict.

---

## 0. Diagnostic environment changes (not product work)

| Action | Why | Committed? |
|--------|-----|------------|
| `npm ci` | Install deps | no (`node_modules`) |
| Start PostgreSQL 16 + Redis | Runtime deps | no |
| Copy `.env.example` → `.env.local` | Local config | no (gitignored) |
| `node scripts/migrate.mjs` | Apply schema | DB only |
| Run `node src/server.mjs` | Runtime proof | no |
| Capture screenshots under `audit/screenshots/` | Visual proof | yes (artifacts) |
| Write `docs/audit/SYLORA_*.md` | SoT reports | yes |

No application source files were modified for this audit.

---

## 1. What actually exists

See `SYLORA_ARCHITECTURE_MAP.md`.

**One sentence:** Node 22 HTTP server (`src/server.mjs` + `ecosystem/*`) + static SPA (`public/app.js`) + Postgres/Redis hybrid + optional loopback OBS companion.

---

## 2. Runtime verification log

| Check | Result |
|-------|--------|
| `npm ci` | OK, 0 vulnerabilities |
| `npm run lint` | PASS (`node --check`) |
| `npm run build` | PASS (syntax only) |
| `npm run typecheck` | PASS (syntax only) |
| `npm test` | **134 PASS / 0 FAIL** (default clears DATABASE_URL/REDIS_URL) |
| Migrate 001–012 | Applied; **66 tables** |
| `/api/health` | `status:ok` after migrate |
| `/api/ready` | `ready:true` |
| `/api/integrations/status` | google/turn/payments/translation **BLOCKED_EXTERNAL** |
| Register/login/logout | PASS |
| Post/react/comment/follow | PASS |
| DM message | PASS |
| Create LIVE + battle | PASS (objects) |
| Create call | PASS (signaling object) |
| AI chat | **503 AI_PROVIDER_NOT_CONFIGURED** |
| Gift send (Postgres) | **FAIL** `creatorShareBps is not defined` |
| Google auth / recover | **404** |
| Wallet top-up | **404** |
| Browser screenshots | Captured desktop/mobile/tablet |

---

## 3. UI / navigation

Full per-page cards: `SYLORA_UI_MAP.md`.

**Structure:** Home, LIVE(+tabs), Clips, Studio, Science/Learning, Business, Explore, Communities, Inbox(+tabs), Profile, More→many modules, AI, Gifts, Videos, Identity, Agents, Developer, Security, Dashboard, Canvas, Admin; overlays Create Hub / Command Palette; standalone OBS + Phoenix preview.

**IA proposal (not implemented):** see duplication report consolidation target.

---

## 4. Button / journey results

### User journeys

| Journey | Result | Break point |
|---------|--------|-------------|
| NEW USER landing→register→home | **PARTIAL** | Works to home; onboarding minimal; no email verify |
| RETURNING login→nav→profile | **PASS** | — |
| AI open→message→history | **BLOCKED** | No OpenAI key → 503; UI shows unavailable |
| CREATOR studio→camera→live | **PARTIAL** | Room create works; WebRTC/TURN/camera env limited |
| VIEWER discover→join→like→gift | **FAIL** at gift | Gift send broken on PG; watch needs multi-peer setup |
| SOCIAL follow→message→call | **PARTIAL** | Follow+DM PASS; call media/TURN incomplete |
| MONETIZATION wallet→purchase→gift | **FAIL** | No top-up/payments; gift send broken |

### Important buttons

Documented in UI map matrix. Highlights: auth WORKING; Google MISSING; gifts BROKEN (PG); AI BLOCKED; payments BLOCKED.

---

## 5. Sylora AI

| Question | Answer |
|----------|--------|
| Provider | OpenAI (`openai` npm) when `OPENAI_API_KEY` set |
| Models (env defaults) | `OPENAI_MODEL=gpt-5.6`, realtime `gpt-realtime-2.1`, voice `marin` |
| Backend | `POST /api/ai/chat`, tools, memory, actions in `server.mjs` + ecosystem AI routes |
| Streaming tokens | **No** (full response JSON) |
| Tool calling | Chat: context/propose_post/propose_memory; universal command catalog separate |
| Memory | Hybrid PG/JSON; confirm-before-write |
| STT/TTS | OpenAI Realtime path; browser SpeechRecognition/speechSynthesis fallbacks |
| Multilingual | Personality/i18n scaffolding; MT stub passthrough |
| Live cohost | Advisory/partial APIs — not autonomous talent |

**Readiness:** AI UI 78% · AI backend 68% (with key) / ~20% verified here · Voice 22% (blocked) · Memory 70% CRUD · Live cohost 38%.

**Do not call it a “superintelligence.”** It is a gated LLM assistant shell with confirm-to-write tools.

---

## 6. Living Sylora / Avatar

| Claim | Reality |
|-------|---------|
| Real 3D digital human | **NO** |
| Format | PNG plates + gesture PNGs |
| Renderer | DOM `<img>` + CSS variables (`sylora-motion.js`) |
| Blendshapes / GLTF / skeleton mesh | **NOT SUPPORTED BY CURRENT MODEL** |
| Lipsync visemes | Legacy sprite CSS largely disabled by assembled mode |
| Three.js | Used for **gifts/Phoenix**, not avatar |

Classification: **CSS/PNG simulation** with intentional motion springs.

---

## 7. Live / gifts

| Capability | Class |
|------------|-------|
| Live UI | UI exists + functional room list/create |
| WebRTC P2P | Functional locally (limit ~6), not production |
| RTMP | Missing in SYLORA |
| OBS | Companion/browser-source prototype |
| Battles | Partial scoring objects |
| Gifts UI | Real catalog UI |
| Gift send PG | **BROKEN** |
| Gift FX | Partial (atlas/canvas/GPU/Phoenix) |
| Money | TEST LUMEN mock economy |

Ten economy gifts (store ids): spark, pulse, lumen-bloom, nova, dream-orbit, aurora, celestial-wing, time-gate, cosmos, infinite-sylora — atlas `/assets/sylora-gift-atlas-v1.png`. gift-v2 adds 20 design passports with different IDs (duplication).

---

## 8. Backend / API / DB

- Endpoint table: see architecture map + explore extraction (~308 routes)  
- Auth: Bearer session; admin role; API keys scaffolding  
- Validation: mixed hand-rolled `safeText`  
- Rate limits: in-memory  
- DB: 66 tables; checksum migrations; locale CHECK vs UI mismatch  
- Schema drift: many ecosystem features still JSON `store.data`  

Frontend expects many ecosystem hubs that return **catalogs/stubs** rather than full products.

---

## 9. Security / performance / a11y / tests

- Security details: `SYLORA_SECURITY_AUDIT.md`  
- Performance: `public/app.js` ~204KB uncompressed logic; **~45MB** PNG assets; no code-splitting framework; gift WebGL cost on mobile  
- A11y: partial aria; icon-only controls; no systematic reduced-motion policy  
- Tests: 134 PASS unit/module/API-JSON; **no Playwright**; Postgres gift HTTP path uncovered → false confidence  

Critical untested production flows: Postgres gift send, multi-peer live+TURN, AI keyed chat, payments, password reset, admin takeover.

---

## 10. VERIFIED 100% WORKING

**None.**  

Per audit rules, 100% requires UI+backend+DB+integration+errors+responsive+tests+E2E user proof. Closest candidates (auth social basics) still lack email verification, recovery, and hardened session storage — so **not 100%**.

---

## 11. Delete / archive candidates (do not delete in this audit)

1. `renderProfileLegacy` dead function  
2. `openConferenceRoom` legacy path  
3. Unused avatar rig/viseme/expression PNGs after dependency confirm  
4. Dual gift-v2 passport IDs unused by ledger  
5. `phoenix-preview.html` if not linked in product  
6. SDK packages if unmaintained  
7. Superseded CSS rules across v2–v6 once tokenized  
8. Marketing claims / hub sections with no backend (Following tab, some Business country adapters)  
9. Fake “production-ready” narrative in prior agent reports (`audit/AUDIT_REPORT.md` computer-use note — **not SoT**)  
10. JSON money path once Postgres path fixed & proven  

---

## 12. What SYLORA lacks as a product (beyond features)

- **Network effects:** discovery is lexical lists; no recommendation graph that compounds  
- **Creator retention:** studio exists, but monetization broken/sandbox; no payout trust  
- **AI moat:** OpenAI wrapper + PNG avatar ≠ differentiated living intelligence  
- **Trust & safety:** reports exist; no robust moderation queue/ML; live SSE leak undermines trust  
- **Monetization loop:** TEST LUMEN without purchase/payout is a demo chip economy  
- **Streaming architecture:** P2P cannot be the public live backbone  
- **Observability/compliance:** insufficient for serious buyers  
- **Coherent IA:** too many “OS” surfaces (Business/Science/Agents) dilute the core loop  

Strategic buyer view: promising **vertical slice prototype** of a creator+AI social OS, not a shippable platform.

---

## 13. Top 10 best-implemented things

1. Honest degraded AI banner / provider fail-closed pattern  
2. Password hashing (scrypt) + hashed sessions  
3. Checksummed SQL migrations runner  
4. Compose healthchecked Postgres/Redis boot path  
5. SPA deep-link shell for many views  
6. Social vertical slice (register→post→react→comment→follow)  
7. DM + user SSE message event  
8. Gift economy design (idempotent wallet repo) — *repo unit tests good*  
9. Light futuristic visual direction largely held  
10. Capability registry with NOT_IMPLEMENTED/MOCK labels in code  

## 14. Top 10 biggest problems

1. Postgres gift send ReferenceError (money path)  
2. Tests green while production persistence path broken  
3. Unauthenticated live signaling SSE  
4. Admin allowlist without email verification  
5. AI/voice blocked; product surface implies more  
6. Avatar/3D expectation mismatch  
7. No real payments / top-up / recovery / Google auth  
8. Live scale (no TURN/SFU)  
9. Navigation/product sprawl + duplication  
10. No CI/observability/backups → not operable  

## 15. What blocks production launch now

Gift integrity + SSE security + admin provisioning + missing auth recovery + external TURN/payments/AI keys + zero CI/DR + dishonest “ready” signals from test suite.

## 16. Realistic readiness today

**~36% overall.**  
UI looks ~70%. End-to-end user product ~34%. Production ~24%.  

Treat SYLORA as an **advanced prototype / internal alpha**, not a launch candidate.

---

## Module scorecard (0–100)

| Area | % | One-line justification |
|------|--:|------------------------|
| Frontend | 72 | Broad SPA, works |
| Design/UI | 68 | Light premium held; CSS debt |
| UX | 42 | Sprawl, duplication |
| Responsive | 58 | Dock OK; incomplete polish |
| Backend | 52 | Large API; hybrid drift; gift bug |
| Database | 62 | Migrations real |
| Authentication | 48 | Core yes; recovery/OAuth no |
| Sylora AI | 32 | Shell rich; provider blocked here |
| Avatar | 40 | PNG/CSS |
| Voice | 22 | Blocked |
| Live streaming | 44 | Local P2P |
| Social | 60 | Feed graph basics |
| Messaging | 55 | DMs |
| Calls | 38 | Signaling objects |
| Gifts | 35 | UI yes; PG send no |
| Wallet/payments | 25 | TEST only |
| Creator tools | 48 | Studio UI |
| Business | 28 | Hubs/stubs |
| Education | 35 | Partial courses |
| Notifications | 40 | Basic |
| Analytics | 20 | Orbit counters |
| Admin | 35 | Minimal + risky grant |
| Security | 40 | Mixed |
| Performance | 45 | Heavy assets |
| Testing | 35 | False confidence |
| DevOps | 20 | No CI |
| Production infrastructure | 22 | Thin |

---

*End of source-of-truth audit. Remediation must not start without an explicit next task.*
