# SYLORA — Real vs Mock Matrix

Classification per module. Evidence: code + runtime/API tests on 2026-08-13.

Legend: **REAL** = end-to-end verified | **PARTIAL** | **MOCK** | **STATIC UI** | **PLACEHOLDER** | **BROKEN** | **MISSING** | **BLOCKED**

---

## Platform core

| Module | Class | Evidence |
|--------|-------|----------|
| HTTP server + static SPA | REAL | Server running :8787; all routes 200 |
| JSON persistence mode | REAL | health → json-dev-runtime; register/post/gift API OK |
| Postgres persistence | PARTIAL | 11 migrations + repos; not runtime-tested (Docker unavailable) |
| Redis fanout | PARTIAL | Code + tests with mocks; not runtime-tested |
| Rate limiting | PARTIAL | In-memory works; Redis path untested live |
| Session auth (email/password) | REAL | Register/login/logout API verified |
| Google OAuth | MISSING | `integrations.mjs` → BLOCKED_EXTERNAL; no UI |
| Phone auth | MISSING | No routes |
| Email verification | MISSING | No routes |
| Password recovery | MISSING | No routes |
| Admin moderation | PARTIAL | API exists; needs admin role to E2E |

## Social

| Module | Class | Evidence |
|--------|-------|----------|
| Feed + posts | REAL | POST/GET verified |
| Reactions, comments | PARTIAL | API exists; UI not browser-tested |
| Follow / block | PARTIAL | API exists |
| Notifications | PARTIAL | API + SSE; not browser-tested |
| Universal search (lexical) | REAL | `/api/search` works |
| Universal search (AI) | BLOCKED | Needs OpenAI / authed semantic endpoint |
| Communities | PARTIAL | API tested in api.test.mjs |
| Public profiles | STATIC UI | Letter avatars only |

## Messaging & calls

| Module | Class | Evidence |
|--------|-------|----------|
| DM conversations | PARTIAL | API in server.mjs; not browser E2E |
| SSE user events | PARTIAL | Endpoint exists |
| Voice/video calls | PARTIAL | WebRTC signaling code; **BLOCKED** browser test |
| Sylora AI call | PLACEHOLDER | `/api/calls/sylora` — no frontend caller |

## LIVE & streaming

| Module | Class | Evidence |
|--------|-------|----------|
| Create live room | REAL | POST `/api/live` → 201 verified |
| Live list / chat API | REAL | GET endpoints verified |
| WebRTC viewer/host | PARTIAL | Signaling implemented; no E2E media test |
| TURN / NAT | BLOCKED | `SYLORA_ICE_SERVERS_JSON` empty → STUN-only |
| RTMP / OBS ingest | MISSING | Only browser-source overlay + companion bridge |
| Recording | PARTIAL | Studio canvas record client-side only |
| Battles / resonance | PARTIAL | API + store hooks |
| Live Following tab | PLACEHOLDER | Empty state — no backend |
| Creator insights | BLOCKED | Needs OpenAI for AI portions |

## Media

| Module | Class | Evidence |
|--------|-------|----------|
| Video upload | PARTIAL | Endpoint exists; ffmpeg required |
| HLS transcode | PARTIAL | spawn ffmpeg in-process |
| Clips / video hub UI | STATIC UI | Lists from store |

## Gifts & wallet

| Module | Class | Evidence |
|--------|-------|----------|
| Gift catalog | REAL | GET `/api/gifts` — 10 tier gifts |
| Send gift + ledger | REAL | POST send 201 in runtime test (JSON mode) |
| LUMEN currency | MOCK | Labeled TEST; 10000 on register; not real money |
| Postgres atomic wallet | PARTIAL | Tested in pg-mem only |
| Gift GPU WebGL | PARTIAL | Procedural Three.js meshes; tests pass |
| Gift V2 Phoenix | PARTIAL | phoenix-preview.html works standalone |
| Gift atlas PNG | STATIC UI | 2D sprite fallback in gift-engine |
| MediaPipe segmentation | PLACEHOLDER | Optional window global; not bundled |

## Sylora AI

| Module | Class | Evidence |
|--------|-------|----------|
| Text chat | BLOCKED | 503 without OPENAI_API_KEY |
| Tool calling | PARTIAL | Code complete; untested without provider |
| Memory CRUD | REAL | API verified without OpenAI |
| Pending actions | PARTIAL | confirm/cancel routes exist |
| Voice realtime | BLOCKED | Needs OpenAI + mic permission |
| Browser STT/TTS | PARTIAL | Speech API used in UI when available |
| Living Sylora engine | PARTIAL | In-memory emotion/memory classes |
| Live co-host AI | BLOCKED | Needs OpenAI hook in ecosystem |
| Translation | BLOCKED | Provider keys missing |
| 150+ ecosystem AI endpoints | MOCK/STATIC | Backend-only, no UI |

## Avatar (Living Sylora)

| Module | Class | Evidence |
|--------|-------|----------|
| 3D rigged model | MISSING | No GLB/GLTF in repo |
| PNG sprite avatar | REAL | assets/sylora-avatar-v2-base.png + gesture PNGs |
| CSS blink / saccade | REAL | scheduleSyloraLife() in app.js |
| Viseme lip sync | PARTIAL | CSS sprite sheet from audio bands — not true lipsync |
| Emotions | STATIC UI | Expression PNG atlases exist unused in main AI view |
| Hands/body rig | NOT SUPPORTED | PNG rig assets exist but not animated skeletal |

## Business / education / science

| Module | Class | Evidence |
|--------|-------|----------|
| Business directory | PARTIAL | CRUD in JSON store |
| Org workspace (CRM, invoices) | PARTIAL | Ecosystem service — JSON backed |
| Courses / lessons | PARTIAL | api.test.mjs enrollment flow |
| Paid courses | BLOCKED | PAYMENT_PROVIDER_REQUIRED |
| Science calculators/tools | PARTIAL | Many POST endpoints; sparse UI |
| Conferences WebRTC | PARTIAL | Same as calls |

## Developer / agents

| Module | Class | Evidence |
|--------|-------|----------|
| API keys | PARTIAL | POST keys works in ecosystem |
| OAuth/OIDC | PLACEHOLDER | OAUTH_DOC JSON only |
| Agent marketplace | PARTIAL | UI + list endpoints |

## Monetization

| Module | Class | Evidence |
|--------|-------|----------|
| Wallet display | MOCK | TEST LUMEN |
| Stripe/payments | MISSING | env BLOCKED_EXTERNAL |
| Subscriptions | MISSING | No implementation |
| Creator payouts | MOCK | earnings field in wallet; no fiat |

## Infrastructure

| Module | Class | Evidence |
|--------|-------|----------|
| Docker compose | PARTIAL | compose.yaml valid syntax; Docker not on audit VM |
| CI/CD | MISSING | No .github/workflows |
| Monitoring | MISSING | Console logs only |
| Backups | MISSING | No strategy in repo |

---

## Summary counts

| Class | ~Count |
|-------|--------|
| REAL | 12 |
| PARTIAL | 45 |
| MOCK | 4 |
| STATIC UI | 8 |
| PLACEHOLDER | 6 |
| BROKEN | 1 (favicon 404 — trivial) |
| MISSING | 15 |
| BLOCKED | 14 |
