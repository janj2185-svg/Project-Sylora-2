# SYLORA — REAL vs MOCK / PARTIAL / BROKEN / MISSING

**Audited:** 2026-08-13  
**Runtime verified:** JSON-dev server on `:8787` (no Postgres/Redis/OpenAI/Docker in this VM)  
**Principle:** UI alone ≠ feature complete.

Legend:

| Tag | Meaning |
|---|---|
| REAL | End-to-end verified in this audit (UI + API + persistence used) |
| PARTIAL | Real code path exists but incomplete / limited / fail-closed |
| MOCK | Explicit mock/demo/test economy or honesty-gated fake readiness |
| STATIC UI | Screen/hub mostly presents structure/metadata |
| PLACEHOLDER | Empty/stub responses or “coming later” architecture |
| BROKEN | Implementation present but fails at runtime |
| MISSING | No working path found |
| BLOCKED | Cannot verify without external dependency |

---

## Platform modules

| Module | Tag | Evidence |
|---|---|---|
| Auth register/login/logout/session | **REAL** | API journey 201/200/401; UI auth screenshot `desktop/02-auth.png`; logout clears session |
| Password recovery / email verify / Google / phone | **MISSING** | Probes `/api/auth/{forgot,reset,verify,google,oauth}` → **404** |
| Profile edit (displayName/bio) | **REAL** | `PATCH /api/me` 200 in journey; profile UI `desktop/14-profile.png` |
| Social feed posts/react/comment/follow/block/report | **REAL** (JSON) | journey created post/react/comment/follow; feed UI |
| Direct messages | **REAL** (JSON) | `POST /api/conversations` + messages 201 |
| Notifications list | **PARTIAL** | endpoint 200; UI tab exists; not deeply exercised for push |
| Wallet LUMEN balance + ledger | **MOCK/REAL hybrid** | Starter 10000; header shows **TEST**; spend via gifts works; **no top-up** |
| Gift send (transaction) | **REAL** (test LUMEN) | balance 10000→9990; event returned; creator share 70% |
| Gift visual runtime (GPU/V2) | **BROKEN / PARTIAL** | `gift-runtime.js` imports missing `GIFT_V2_CATALOG`; console TypeError reported for `three` specifier in nested path; GPU engine uses relative vendor import |
| LIVE room create + list | **REAL** | `POST /api/live` → `{live}`; `GET /api/live` rooms include audit rooms |
| LIVE chat | **REAL** | chat 201 with correct live id |
| LIVE likes/engagement | **PARTIAL** | endpoints exist; engagement returned `{likes:0}` |
| LIVE WebRTC media | **PARTIAL** | signaling + Studio P2P code present; **TURN empty**; camera needs browser permission; **not E2E media-verified** in headless sense |
| LIVE battles/resonance/quizzes/minigames | **PARTIAL / STATIC** | UI tabs + POST routes; following tab honestly empty; entertainment hub metadata |
| Creator Studio UI | **PARTIAL** | UI `desktop/07-studio.png`; camera/OBS **BLOCKED** without devices/OBS |
| Clips/Videos upload | **PARTIAL** | upload/transcode code + FFmpeg present; not fully E2E exercised this run |
| Sylora AI text chat | **BLOCKED** | `POST /api/ai/chat` → `503 AI_PROVIDER_NOT_CONFIGURED`; UI banner + `desktop/12-ai.png` |
| Sylora AI realtime voice | **BLOCKED** | requires OpenAI key; capabilities `aiRealtimeVoice:false` |
| AI memory center | **PARTIAL** | endpoint returns empty categories structure without provider writes |
| Living Sylora / avatar | **PARTIAL (CSS/PNG)** | PNG assembled avatar + gesture plates; **not GLTF/3D human**; Living Sylora server = in-memory emotion/memory helpers |
| Calls (1:1) | **PARTIAL** | `POST /api/calls` 201; WebRTC signaling present; media/TURN **BLOCKED** |
| Communities | **PARTIAL** | create/join APIs + UI; JSON store |
| Learning / Science hub | **STATIC UI + PARTIAL API** | hub 200 with sections; tutor creates **session stub** without model answer (201 without OpenAI) |
| Business hub / invoices / CRM | **STATIC UI + PLACEHOLDER** | hubs/lists empty; finance adapters `architecture_stub` |
| Commerce / payments | **MISSING / MOCK** | products sandbox empty; `/api/payments/checkout` 404; env payment keys unused |
| Developer Platform / OAuth | **PLACEHOLDER** | apps list empty; OAuth endpoints advertised in payload; full OIDC **not verified** |
| Agents marketplace | **PARTIAL** | catalog returns platform agents; install path exists in UI/API |
| Admin moderation | **PARTIAL** | reports/audit APIs; admin UI gated by role/email allowlist |
| Search | **PARTIAL** | lexical search works; embeddings `blocked_provider` |
| i18n language switch | **PARTIAL** | selector renders many locales; profile locale API limited `uk/pl/en` in server patch |
| Postgres persistence | **BLOCKED** | code+migrations+tests with `pg-mem`; live Postgres not running here |
| Redis fanout/rate | **BLOCKED** | optional; in-memory fallback used |
| Production Docker deploy | **BLOCKED** | compose present; Docker unavailable in audit VM |

---

## User journeys (this audit)

| Journey | Result | Breakpoint |
|---|---|---|
| NEW USER landing→register→home | **PASS** (UI+API) | Onboarding beyond account is metadata (`/api/onboarding`) |
| RETURNING USER login→nav→profile | **PASS** | — |
| AI open→message→response→history | **FAIL / BLOCKED** | Provider not configured (503) |
| CREATOR studio→camera→start stream | **PARTIAL / BLOCKED** | Room create REAL; camera/OBS/TURN not verified |
| VIEWER discover→join→like→comment→gift | **PARTIAL** | discover/chat/gift API REAL; WebRTC media PARTIAL; gift VFX BROKEN/PARTIAL |
| SOCIAL profile→follow→message→call | **PARTIAL** | follow+message REAL; call session created; media BLOCKED |
| MONETIZATION wallet→purchase→history | **FAIL / MISSING** | No real purchase/top-up; only TEST LUMEN gift spend |

---

## Capability readiness (honest %)

| Area | % | Note |
|---|---|---|
| AI UI readiness | 55 | Polished screen, degraded banner, controls present |
| AI backend readiness | 15 | Code path exists; **0% verified** without key |
| Voice readiness | 10 | Realtime proxy code; blocked; no STT/TTS without provider |
| Memory readiness | 25 | Structures + confirm actions; empty without AI use |
| Live co-host readiness | 15 | Living react/director endpoints exist; not productized E2E |
| Avatar readiness | 30 | CSS/PNG assembled portrait + motion rig; **NOT_SUPPORTED** true 3D face/lipsync/skeleton |
| Live streaming readiness | 35 | Control plane real; media P2P prototype; not production SFU |
| Gifts transactional | 70 | Send/ledger works in test economy |
| Gifts cinematic system | 35 | Assets + engines exist; runtime import/catalog defects |
| Wallet/payments | 20 | Test balance only |
| Business/Education products | 20 | UI hubs + empty/stub APIs |
| Messaging | 65 | DMs work in JSON mode |
| Auth core | 75 | Local password auth solid; recovery/OAuth missing |
| Production infrastructure | 20 | Compose/Dockerfile/health exist; secrets/ops incomplete |

---

## VERIFIED 100% WORKING

**None** of the major product modules meet the strict 100% bar (UI + backend + DB-as-needed + integration + error states + responsive + tests + full user journey) in this environment.

Closest “mostly real” slices under JSON-dev:

1. Local password auth session lifecycle  
2. Feed post/react/comment/follow  
3. DM create/send  
4. LIVE room create + chat  
5. TEST LUMEN gift transfer  

Even these lack Postgres durability verification here and lack complete responsive/E2E/automation coverage for every edge case.
