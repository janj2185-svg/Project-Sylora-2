# SYLORA Real Working Audit (2026-08-11)

Honest status after code audit of `Project-Sylora-2` on branch tip including home living-bg + working-flows. Production path `/opt/sylora` is **not mounted on this Cloud Agent VM** — VPS deploy remains **BLOCKED** until SSH secrets exist. No destructive reset planned.

Legend: **WORKING** = persists + auth + real behavior under test · **PARTIAL** = real path with gaps · **MOCK** = looks finished but local/fake · **NOT IMPLEMENTED** · **BROKEN** · **BLOCKED** (env/secrets)

## Authentication
| Area | Status | Notes |
|---|---|---|
| Register / login / logout | WORKING | JSON store + Postgres path; no simulated success |
| Session persistence | WORKING | Bearer token + hashed sessions; TTL; `/api/auth/status` |
| Protected routes | WORKING | `requireUser` on private APIs |
| Profile PATCH | WORKING | displayName/bio/locale |
| Session list/revoke | PARTIAL | Full on JSON store; Postgres limited to current |
| Password reset | WORKING* | Token request/confirm; email delivery BLOCKED without mail provider (`ALLOW_DEV_RESET_TOKEN` exposes token in test/dev only) |
| Google login | NOT IMPLEMENTED / BLOCKED | Scaffold returns `GOOGLE_OAUTH_NOT_CONFIGURED` until client id/secret |

## Sylora AI
| Area | Status | Notes |
|---|---|---|
| `/api/ai/chat` | WORKING when `OPENAI_API_KEY` | 503 `AI_PROVIDER_NOT_CONFIGURED` without key — no fake answers |
| `/api/ai/chat/stream` | WORKING when key | SSE token stream; setup_required without provider |
| Memory / history / confirm actions | WORKING | Persisted |
| Voice realtime | PARTIAL / BLOCKED | Needs key + browser mic; architecture ready |
| `/api/ai/ask` & LIVE Copilot | PARTIAL | Extractive/local heuristics — labeled `extractive_local`, not model chat |
| Streaming UI | PARTIAL → improved | Client uses stream endpoint when available |

## LIVE / WebRTC
| Area | Status | Notes |
|---|---|---|
| Create/list/end LIVE, chat, likes, SSE | WORKING | |
| WebRTC host/viewer signaling | WORKING (same-LAN) | TURN NAT cross-network BLOCKED without TURN creds |
| Following tab | WORKING* | `GET /api/live/following` filters by follow graph |
| Studio camera/mic/OBS companion | PARTIAL | Real media; Companion credentials local |
| Gifts in LIVE | WORKING (TEST LUMEN) | Animation + ledger + SSE |

## Social / Messages / Calls
| Area | Status | Notes |
|---|---|---|
| Posts, comments, likes, follows, feed, search | WORKING | Persist in JSON/Postgres |
| Notifications | WORKING | |
| Messages delivery/read/typing/unread | WORKING | |
| Calls signaling / mute / miss / cancel | WORKING | Media NAT BLOCKED |
| Media upload | WORKING | Size/type validation |

## Wallet / monetization
| Area | Status | Notes |
|---|---|---|
| Unified Wallet UI | WORKING* | Balance + earnings + ledger; TEST LUMEN labeled |
| Gift send + creator earnings | WORKING | Idempotency on Postgres path |
| Dual-write register wallet | FIXED | JSON wallet only when Postgres wallet off |
| Invoice “paid” | PARTIAL | Manual status — not PSP success |
| Commerce checkout | MOCK / sandbox | `sandbox_paid` only |
| Real payments | BLOCKED | Integration env vars reserved |

## Production
| Area | Status | Notes |
|---|---|---|
| Docker/compose, health/ready | WORKING (local) | |
| Deploy to `/opt/sylora` / getsylora.com | BLOCKED | No SSH from this agent; do not force-reset server backup |
| Secrets in git | WORKING policy | `.env.example` placeholders only |

## Counts (approx, after this milestone)
| Status | Count |
|---|---|
| WORKING | ~42 |
| PARTIAL | ~28 |
| MOCK | ~3 |
| NOT IMPLEMENTED | ~2 |
| BROKEN | 0 |
| BLOCKED | 5 (VPS, payments, TURN NAT, OpenAI E2E without key, Google OAuth secrets) |
