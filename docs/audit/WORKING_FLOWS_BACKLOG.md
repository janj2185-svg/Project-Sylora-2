# Working Flows Backlog (from MASTER_AUDIT_P0 + SCREENSHOT_INDEX)

Baseline BEFORE (unique product areas, 2026-08-11):

| Status | Count (approx) |
|---|---|
| WORKING | 28 |
| PARTIAL | 42 |
| PLACEHOLDER | 8 |
| BROKEN | 0 (DM calls fixed in P0 foundation) |
| BLOCKED | 4 (VPS, payments, TURN NAT, OpenAI key E2E) |

## P0 — critical product core
1. Messaging: delivery/read/typing/unread/pagination/optimistic/retry
2. Call Engine: timeout→missed, cancel outgoing, hangup cleanup, signaling tests, device/mute/camera completeness
3. Auth/session: list/revoke sessions, expired token, multi-tab logout, protected API tests
4. AI architecture: provider-independent streaming/fallback/tool registry (E2E with key stays BLOCKED)

## P1 — primary workflows
5. Business: CRM → Quote → Invoice (real routes/UI + calculation tests + PDF draft)
6. Learning: Teacher course builder + Student progress path + Tutor bound to lesson
7. Science: Library list → Paper Reader → notes (no invented citations)
8. LIVE Following API honesty; battle core path

## P2 — expansion
9. Expenses ledger UI, contracts/legal pages, focus timer stage, studio OBS polish
10. i18n hardcode scanner + UA/PL/EN/DE pass
11. Group RTC UI, canvas/agents depth

## P3 — future / blocked
12. Production VPS, real payments, full SFU, AAA gifts
