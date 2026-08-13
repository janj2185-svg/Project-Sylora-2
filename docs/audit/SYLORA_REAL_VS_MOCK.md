# SYLORA — REAL vs MOCK / STATIC / BROKEN / MISSING

Legend:
- **REAL** — verified end-to-end in this audit (UI + API + persistence path used)
- **PARTIAL** — implementation exists but incomplete / limited / degraded
- **MOCK** — intentionally sandbox / fake economics or status-only wiring
- **STATIC UI** — screens/components render; little durable behavior
- **PLACEHOLDER** — empty/coming-soon / capability registered only
- **BROKEN** — code present but fails at runtime
- **MISSING** — no meaningful implementation
- **BLOCKED** — cannot verify without external dependency

Audit runtime: Node 22, server on `:8787`, **json-dev-runtime**, no Postgres/Redis/Docker/OpenAI key.

---

## Platform modules

| Module | Status | Evidence |
|--------|--------|----------|
| App boot / static shell | REAL | `GET /` → 200; `__syloraBooted`; screenshots |
| Health / ready | REAL | `/api/health`, `/api/ready` ready with unconfigured PG/Redis treated ok in JSON mode |
| Auth register/login/logout/session | PARTIAL | API smoke pass; scrypt+bearer; **no** Google/phone/recovery/email verify; register ignores `displayName` |
| Feed posts / react / comments | REAL (JSON) | API + UI create/list; screenshots show posts |
| Follow / block / report | PARTIAL | API works; report stored in JSON; admin UI needs admin role |
| Explore search | PARTIAL | `/api/search` works; semantic search degraded without embeddings; courses unpublished not found |
| Messages / DM | REAL (JSON) | conversation+message API + UI |
| Notifications list | PARTIAL | endpoint works; empty in smoke; SSE path exists |
| Profile edit + locale | PARTIAL | PATCH `/api/me` works; locale UI mismatch (3 vs 13) |
| Wallet balance | MOCK | Starter **10000 TEST LUMEN**; labeled TEST/DEMO |
| Gift send (ledger) | REAL (sandbox) | debit/credit + creator share; idempotency header accepted |
| Gift FX runtime | BROKEN | `gift-runtime.js` imports missing `GIFT_V2_CATALOG` |
| Gift V2 directors/physics | PARTIAL | code under `public/gift-v2/*`; mismatched IDs vs wallet catalog |
| LIVE room create/list/chat | REAL (JSON) | API+UI; SSE chat |
| LIVE like | PARTIAL | works for non-host; host self-like → `INVALID_LIKE` |
| LIVE WebRTC watch/broadcast | PARTIAL | signaling+client code; **no SFU**; peer limit 6; camera **BLOCKED** in this VM |
| LIVE battles / entertainment APIs | PARTIAL | endpoints + UI buttons; not production entertainment platform |
| Studio scenes CRUD | PARTIAL | API+UI; canvas compose; OBS local-only |
| OBS browser source overlay | PARTIAL | tokenized overlay path exists |
| Clips / videos upload UI | PARTIAL | upload endpoints exist; empty library in audit; HLS depends on ffmpeg |
| Sylora AI text chat | BLOCKED | `503 AI_PROVIDER_NOT_CONFIGURED` without key; UI shows degraded banner |
| Sylora AI realtime voice | BLOCKED | same key gate; WebRTC→OpenAI path untested |
| AI memory CRUD UI/API | PARTIAL | endpoints exist; no LLM confirmation loop without key |
| Living Sylora / AI Director | PARTIAL | rule/LLM hybrid; APIs exist; not a “digital human” |
| Avatar / Living presence | STATIC UI | PNG+CSS springs/gestures; **not** 3D/blendshapes (assembled mode hides rig layers) |
| Calls (voice/video) | PARTIAL | `POST /api/calls` creates ringing call; media/TURN **BLOCKED** |
| Conferences (science/business) | PARTIAL | rooms/invites/UI; WebRTC same limits; Sylora-in-room needs AI key |
| Communities | PARTIAL | create/join/channels/posts work in JSON |
| Courses / learning hub | PARTIAL | create course works; paid enroll blocked; science tools mixed honesty |
| Business / orgs / finance tools | PARTIAL | large API surface; mostly local scaffolding; payouts blocked |
| Commerce / checkout | MOCK/MISSING | production checkout blocked until payment provider |
| Translation | BLOCKED | local passthrough preserves original |
| Google OAuth | MISSING | status plaque only |
| Password recovery / email verify | MISSING | no routes |
| Admin moderation | PARTIAL | reports/audit APIs; needs `SYLORA_ADMIN_EMAILS` |
| Developer platform / OAuth issuer | PLACEHOLDER | apps/keys scaffolding; OAuth keys future |
| Agents marketplace | PARTIAL | install/uninstall local catalog; AI↔AI negotiation confirmation theater |
| Personal dashboard / canvas / continuity | PARTIAL | UI+API; shallow persistence |
| Postgres durability | BLOCKED | not run in this environment (compose/docker missing) |
| Redis multi-instance fanout | BLOCKED | not run |
| CI/CD | MISSING | no `.github/workflows` |
| Real payments / KYC / payouts | MISSING | |

---

## Capability registry honesty (code-declared)

From `src/platform-events.mjs` `STATUS_BY_ID`:

| Capability | Declared |
|------------|----------|
| living-world | NOT_IMPLEMENTED |
| ai-director | PARTIAL |
| gift-interactions | PARTIAL |
| collective-gifts | NOT_IMPLEMENTED |
| gift-evolution | NOT_IMPLEMENTED |
| living-ai | PARTIAL |
| live-translation | BLOCKED_EXTERNAL |
| ai-co-creator | PARTIAL |
| creator-digital-twin | NOT_IMPLEMENTED |
| live-worlds | NOT_IMPLEMENTED |
| story-live | NOT_IMPLEMENTED |
| creator-economy | MOCK |
| ai-business-partner | PARTIAL |
| sylora-moments | PARTIAL |

---

## User journeys (this audit)

| Journey | Result | Breakpoint |
|---------|--------|------------|
| NEW USER landing→register→home | **PARTIAL** | Register works but `displayName` ignored; no onboarding product; no email verify |
| RETURNING login→nav→profile | **PASS** (JSON) | Login/logout/session OK |
| AI message→response→history | **FAIL / BLOCKED** | No `OPENAI_API_KEY` → 503; history empty/`configured:false` |
| CREATOR camera→live→broadcast | **PARTIAL / BLOCKED** | Room create OK; camera/WebRTC media not verifiable here; no SFU |
| VIEWER discover→join→like→comment→gift | **PARTIAL** | Chat OK; like as non-host OK; gift FX broken; A/V join limited |
| SOCIAL follow→message→call | **PARTIAL** | Follow+DM OK; call object created; media/TURN blocked |
| MONETIZATION wallet→purchase→history | **FAIL / MOCK** | Only TEST LUMEN gift spend; no real purchase |

---

## Strict “Verified 100% WORKING”

Per audit rule (UI+backend+DB if needed+errors+responsive+tests+E2E): **0 modules**.

Narrow slices that are *reliably working in JSON-dev* but still fail the 100% bar:
- Health endpoints
- Password auth session cycle
- Text posts + reactions + comments
- DM send/list
- Gift ledger transfer (sandbox)
- LIVE room metadata + chat

None of these are production-complete (no Postgres verification, no multi-instance, incomplete security/product flows).
