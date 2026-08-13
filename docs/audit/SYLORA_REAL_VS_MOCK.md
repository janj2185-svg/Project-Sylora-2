# SYLORA — REAL vs MOCK / PARTIAL / BROKEN / MISSING / BLOCKED

**Audit date:** 2026-08-13  
**Evidence sources:** source code, `npm test` (134/134), live server on `:8787` (JSON mode), curl E2E, browser screenshots under `audit/screenshots/`.

### Legend

| Tag | Meaning |
|-----|---------|
| **REAL** | End-to-end verified in this audit (UI + API + persistence path used) |
| **PARTIAL** | Implementation exists but incomplete / limited / degraded |
| **MOCK** | Explicit mock/sandbox/test economy |
| **STATIC UI** | Interface/copy without full backend product behavior |
| **PLACEHOLDER** | Empty/honest stub / “coming soon” / architecture_stub |
| **BROKEN** | Code present but fails at runtime |
| **MISSING** | No meaningful implementation |
| **BLOCKED** | Cannot verify without external dependency |

---

## Module matrix

| Module | Status | Evidence | Notes |
|--------|--------|----------|-------|
| Install / `npm ci` | REAL | lockfile, 60 packages, 0 vulns reported | Node ≥22 |
| Syntax lint/build/typecheck | REAL | `npm run lint/build/typecheck` exit 0 | **Only** `node --check` — not ESLint/TS |
| Unit/integration tests | REAL | 134 pass | Many static/string assertions; gift-runtime import not executed |
| HTTP server JSON mode | REAL | `/api/health` ok, SPA 200 | Postgres/Redis unset |
| Postgres runtime | BLOCKED | `pg_isready` no response; Docker missing | Migrations unread against live DB |
| Redis runtime | PARTIAL | started redis in audit VM; app not re-verified multi-instance | Default audit path was without Redis |
| Auth register | REAL | curl + UI | Requires `username`+`email`+`password` |
| Auth login | REAL | UI uses `identity`; API field is `identity` not `email` | Easy to misuse with `email` body → 401 |
| Auth logout / session | REAL | logout → `/api/me` 401 | Bearer token hash sessions |
| Password recovery | MISSING | `/api/auth/recover` 404 | |
| Email verification | MISSING | no routes | |
| Google OAuth | MISSING / BLOCKED | integrations BLOCKED_EXTERNAL; no login route | |
| 2FA / passkeys | MISSING | `passkeys_2fa: false` | |
| Profile edit | REAL | `PATCH /api/me` | locale API only uk/pl/en vs 13 UI langs |
| Feed / posts / react / comment | REAL | api.test + curl | |
| Follow / block / report | REAL | curl follow; admin reports API exists | |
| DMs | REAL | conversation + message curl | |
| Notifications list | PARTIAL | API + UI tabs | Push/email not present |
| Calls API + SSE + signal | PARTIAL | `POST /api/calls` created ringing call | Media E2E not fully browser-verified; TURN blocked |
| LIVE create/list/chat/like | REAL | curl E2E | |
| LIVE WebRTC | PARTIAL | code path real P2P; TURN BLOCKED | Scale limit peer=6 |
| LIVE Following tab | PLACEHOLDER | intentional empty — no following-hosts API | `app.js` comment |
| Battles / resonance | PARTIAL | APIs + UI modes | Product depth limited |
| Guest stage | PARTIAL | stage APIs | Not first-class guest broadcast UI |
| Studio UI | PARTIAL | renders; camera needs permission | `ownRooms` ReferenceError observed in console after studio flows |
| OBS / Companion | PARTIAL | code + tests with fakes | Needs local OBS + token |
| Clips / Videos upload | PARTIAL | UI + APIs | Empty for new user; HLS/ffmpeg path limited |
| Gifts catalog (10) | REAL | `/api/gifts` | |
| Gift send + ledger | REAL | curl pulse/spark; starter 10000 LUMEN | |
| Gift purchase / fiat | MOCK / MISSING | TEST LUMEN `starter_grant`; payments BLOCKED | UI shows **TEST** |
| Gift FX runtime | BROKEN | `import { GIFT_V2_CATALOG }` missing export; browser: bare `three` resolve fail | `initGiftEngine` catch-swallows |
| Gift V2 20 passports | STATIC UI / PLACEHOLDER | design IDs ≠ wallet IDs | |
| Wallet | MOCK | test_demo honesty | |
| Sylora AI chat (OpenAI) | BLOCKED | 503 without key; UI banner + disabled honesty | |
| Local AI orchestrate/ask | PARTIAL | heuristic pipeline works without key | Not “superintelligence” |
| AI memory CRUD | REAL | api.test + APIs | |
| AI realtime voice | BLOCKED | needs OPENAI_API_KEY | |
| Browser STT/TTS | PARTIAL | webkitSpeechRecognition / speechSynthesis | |
| Avatar / Living Sylora | STATIC UI / PARTIAL | PNG + CSS motion; no GLB | Lipsync layers hidden in assembled mode |
| AI Director | PARTIAL | self-labeled advisory | |
| Explore / search | PARTIAL | lexical; embeddings blocked | |
| Communities | PARTIAL | APIs work in tests | Thin social product |
| Learning / courses | PARTIAL | free enroll works; paid → PAYMENT_PROVIDER_REQUIRED | |
| Science tools | PARTIAL | calculators/experiments local | |
| Business hub | PARTIAL / PLACEHOLDER | many sections; country adapters `architecture_stub` | “not a bank” |
| Commerce checkout | MOCK | sandbox mode | |
| Agents marketplace | PARTIAL | install/uninstall JSON | |
| Developer apps/keys | PARTIAL | creates keys; OAuth future | |
| Security / privacy center | PARTIAL | UI + APIs | Account deletion/export completeness unverified E2E |
| Admin moderation | PARTIAL | role-gated; non-admin redirected | |
| Analytics product | MISSING / PARTIAL | creator insights helpers only | |
| Translation MT | BLOCKED | stub passthrough | |
| Docker production stack | BLOCKED | Docker not installed in audit VM | compose.yaml exists |
| CI/CD | MISSING | no `.github/workflows` | |
| Observability (prod) | PARTIAL | health/ready, client beacons | No APM/tracing product |

---

## User journeys (verified)

| Journey | Result | Break point |
|---------|--------|-------------|
| NEW USER landing → register → home | **PASS** | UI register works; 10k TEST LUMEN |
| RETURNING login → home → nav → profile | **PASS** | Login requires `identity` field |
| AI message → response → history | **BLOCKED / FAIL** | No `OPENAI_API_KEY`; 503; banner |
| CREATOR studio → camera → start stream | **PARTIAL** | UI exists; WebRTC local possible; TURN/OBS/gift FX issues; console errors |
| VIEWER discover → join → like → comment → gift | **PARTIAL** | chat/like/gift API REAL; gift animation BROKEN; WebRTC NAT BLOCKED |
| SOCIAL follow → message → call | **PARTIAL** | follow+DM REAL; call ringing created; media not fully verified |
| MONETIZATION wallet → purchase → gift → history | **FAIL / MOCK** | No purchase; TEST grant only; gift send REAL within sandbox |

---

## Strict “Verified 100% Working”

Under the audit’s strict definition (UI + backend + DB if needed + errors + responsive + tests + E2E):

**None of the major product modules qualify as 100%.**

Closest near-complete slices (still not 100%):

1. Password hash verify (unit)  
2. Auth register + bearer session + logout (JSON store)  
3. Gift ledger transfer in TEST economy (API)  
4. Health/ready in development JSON mode  

All are missing production DB verification and/or responsive/product completeness.
