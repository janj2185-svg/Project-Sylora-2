# SYLORA Master Audit → P0 Foundation

Date: 2026-08-11 · Commit baseline: `0658bff` · Scope: repository-wide (not frontend-only).

## Status legend

| Status | Meaning |
|---|---|
| WORKING | UI + backend + persistence path work for the claimed job |
| PARTIAL | Real code path exists but incomplete, dual-mode, or provider-gated |
| BROKEN | Present but fails the user job |
| MISSING | Spec exists / env reserved / no implementation |
| DUPLICATE | Multiple overlapping entry points or stacks |
| PLACEHOLDER | Looks complete; session/API only or honesty-gated |
| DEAD | Schema/code unused by runtime |

## Inventory summary

| Area | Status | Notes |
|---|---|---|
| Auth register/login/session/logout | WORKING | File store or Postgres via `DATABASE_URL` |
| Profiles `/api/me` | WORKING | |
| Permissions / AI gates | PARTIAL | Personal AI permissions; object RBAC uneven |
| DB migrations | PARTIAL | `infra/postgres` present; many product blobs still JSON |
| Navigation / shell | PARTIAL | Duplicated Inbox icons; Create→LIVE intent bug |
| Mobile / tablet / desktop | PARTIAL | Dock/safe-area exist; compose can overlap dock |
| Inbox text messaging | WORKING | SSE message events |
| DM voice/video calls | BROKEN→fixING | Was session+toast only; WebRTC signaling wired in this milestone |
| Group calls | PARTIAL | Kind exists; media path follows 1:1 engine |
| Realtime SSE | WORKING | User/LIVE/conference; no app WebSocket |
| LIVE core (P2P) | WORKING | Camera/mic via Studio; TURN optional |
| LIVE entertainment | PARTIAL | APIs + store; not full production SFU |
| Sylora Intelligence | PARTIAL | One personality; needs `OPENAI_API_KEY` |
| Memory | PARTIAL | Permission-aware; local extractive without key |
| Voice STT/TTS | PARTIAL | OpenAI Realtime + browser Speech APIs |
| i18n | PARTIAL | Shell keys; many hardcoded UA strings |
| Universal Search | PARTIAL | Lexical; semantic needs embeddings |
| Notifications | PARTIAL | Store+SSE; call rings previously skipped SSE |
| Wallet/gifts | PARTIAL | TEST LUMEN; no real payments |
| Business/Learning/Science hubs | PARTIAL | Foundations; not DONE per Definition of Done |
| Docker/compose | PARTIAL | Dev stack; production VPS deferred |
| Security | PARTIAL | Headers/rate limits exist; full RBAC matrix pending |

## Shared engines (present)

Call · LIVE · Realtime fanout · Space · Timer · Quiz · Event · Document (org) · Finance (not bank) · Notification · Search · Sylora OS/Intelligence · Gift GPU path · Translation stubs.

## Duplicates / chaos (do not delete useful code)

- Inbox: two header icons → same view (**fix**: keep one)
- WebRTC: LIVE + conference media WORKING; DM calls were a third incomplete stack → **merge into Call Engine signaling**
- Conferences science/business: shared conference fanout (good)
- Quizzes: converging on `quiz_engine_v1`

## P0 priorities (execution order)

1. DM/group Call Engine WebRTC signaling + client media UI  
2. Call ring via `notifyUser` / SSE  
3. Create Hub → LIVE create tab intent  
4. Mobile compose vs dock overlap  
5. Inbox icon dedupe + LIVE Following honesty  
6. Keep auth/messaging/LIVE regression green  
7. Document honesty: TEST LUMEN, no fake production-ready claims  

## Blocked (external)

| Item | Reason |
|---|---|
| Production VPS / Hetzner | Deferred; no SSH credentials invention |
| Real payments / payouts | Provider secrets not configured |
| TURN across all NATs | `SYLORA_ICE_SERVERS_JSON` optional; empty = host-only risk |
| Full OpenAI voice quality | Needs API key in env |

## This milestone implements

See commit on `cursor/sylora-p0-foundation-34a2`.
