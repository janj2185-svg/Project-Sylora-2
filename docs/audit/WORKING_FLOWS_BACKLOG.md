# Working Flows Backlog (from MASTER_AUDIT_P0 + SCREENSHOT_INDEX)

Baseline BEFORE (unique product areas, 2026-08-11):

| Status | Count (approx) |
|---|---|
| WORKING | 28 |
| PARTIAL | 42 |
| PLACEHOLDER | 8 |
| BROKEN | 0 (DM calls fixed in P0 foundation) |
| BLOCKED | 4 (VPS, payments, TURN NAT, OpenAI key E2E) |

AFTER (working-flows milestone, 2026-08-11):

| Status | Count (approx) |
|---|---|
| WORKING | 38 |
| PARTIAL | 32 |
| PLACEHOLDER | 3 |
| BROKEN | 0 |
| BLOCKED | 4 (VPS, payments, TURN NAT cross-network, OpenAI key E2E) |

AFTER real-working pass (same day) — see `REAL_WORKING_AUDIT.md`:

| Status | Count (approx) |
|---|---|
| WORKING | ~42 |
| PARTIAL | ~28 |
| MOCK | ~3 |
| BROKEN | 0 |
| BLOCKED | 5 (+ Google OAuth secrets; VPS still blocked) |

Added: LIVE `/api/live/following`, password reset (email delivery blocked), `/api/wallet`, `/api/ai/chat/stream`, Ask/Copilot honesty labels, wallet dual-write fix.

## Became WORKING this milestone
- Messaging: delivery, read receipts, typing, unread, pagination, clientId idempotency, optimistic UI
- Call Engine: cancel outgoing, ring timeout → missed, media mute action, signaling state-machine tests
- Auth/session: list/revoke/revoke-all, expired TTL, disabled account, `/api/auth/status` (JSON store)
- Business core: Client → Quote → Accept → Invoice draft → Issue → PDF text → payment status (+ calc tests)
- Learning: Teacher course/lesson/publish → Student enroll/complete/quiz; Tutor bound to lesson context
- Science: Library list → Paper Reader → notes → Ask Sylora context; Dataset preview + basic analysis
- AI architecture (provider-independent): stream envelope, tool registry, language routing, fallbacks (no hardcoded answers)

## Placeholders removed / reduced
- Business hub toast CTAs → real CRM/Quote/Invoice panels
- Science “Library item” toast → real library form + reader
- Tutor as orphan chat CTA → lesson-scoped tutor session

## Still PARTIAL
- Call Engine device selection / camera switch / ICE reconnect polish; group RTC UI
- LIVE controls honesty pass (gifts AAA, following depth)
- i18n full UA/PL/EN/DE migration (scanner added: `node scripts/i18n-hardcode-scan.mjs`)
- Expenses ledger UI, contracts depth, Postgres session list beyond current token

## BLOCKED (environment)
1. Production VPS / Hetzner deploy
2. Real payment provider
3. TURN NAT / two-browser cross-network media
4. OpenAI (or other) provider E2E chat/voice without secrets

## P0 — critical product core
1. Messaging: delivery/read/typing/unread/pagination/optimistic/retry ✅
2. Call Engine: timeout→missed, cancel outgoing, hangup cleanup, signaling tests ✅ (media NAT BLOCKED)
3. Auth/session: list/revoke sessions, expired token, protected API tests ✅
4. AI architecture: provider-independent streaming/fallback/tool registry ✅ (E2E with key BLOCKED)

## P1 — primary workflows
5. Business: CRM → Quote → Invoice (real routes/UI + calculation tests + PDF draft) ✅
6. Learning: Teacher course builder + Student progress path + Tutor bound to lesson ✅
7. Science: Library list → Paper Reader → notes (no invented citations) ✅
8. LIVE Following API honesty; battle core path — remaining

## P2 — expansion
9. Expenses ledger UI, contracts/legal pages, focus timer stage, studio OBS polish
10. i18n hardcode scanner + UA/PL/EN/DE pass (scanner ✅; migration ongoing)
11. Group RTC UI, canvas/agents depth

## P3 — future / blocked
12. Production VPS, real payments, full SFU, AAA gifts

## Quality gates (this milestone)
- `npm test` → 134 pass (was 122 baseline + new messaging/call/auth/business/learning tests)
- `npm run lint` / `typecheck` / `build` → pass
