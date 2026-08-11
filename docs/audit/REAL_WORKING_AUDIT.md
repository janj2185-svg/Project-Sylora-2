# SYLORA Real Working Audit (updated)

Branch: `cursor/sylora-real-working-34a2`  
Production `/opt/sylora` / getsylora.com deploy: **BLOCKED_EXTERNAL** (no SSH on this agent). No destructive reset.

Legend: **WORKING** · **PARTIAL** · **MOCK** · **NOT_IMPLEMENTED** · **BLOCKED_EXTERNAL**

## Authentication
| Area | Status | Notes |
|---|---|---|
| Register / login / logout | WORKING | No simulated success |
| Session persistence + renew | WORKING | `POST /api/sessions/renew` |
| Session list/revoke | WORKING | JSON + Postgres list/revoke/all |
| Protected routes | WORKING | |
| Profile PATCH (multi-locale) | WORKING | uk/pl/en/de/es/fr/it/pt/cs/sk/ro/nl/tr |
| Password reset | WORKING* | Single-use + expiry; email delivery BLOCKED_EXTERNAL |
| Login lockout | WORKING | Per-identity + IP rate limit |
| Google OAuth | BLOCKED_EXTERNAL | Integration boundary ready (`/google`, `/start`, `/callback`) |

## Sylora AI
| Area | Status | Notes |
|---|---|---|
| `/api/ai/chat` | WORKING when key | Fail-closed 503 without key |
| `/api/ai/chat/stream` | PARTIAL → honest | Progressive chunks after complete provider call; cancel on disconnect; language routing; usage fields when provider returns them. True OpenAI token SSE = BLOCKED_EXTERNAL until live key + `responses.stream` verification |
| Memory / history / confirm | WORKING | |
| Language detect + reply routing | WORKING | `language-detect` + `routeLanguage` in chat path |
| Voice realtime | BLOCKED_EXTERNAL | Needs key + mic |
| Local context / Copilot highlights | WORKING as **local tools** | Explicitly `local_context_tool` / heuristic — not model AI |

## LIVE / WebRTC
| Area | Status | Notes |
|---|---|---|
| Create/list/end, chat, likes, SSE | WORKING | Chat unified into watch player (no double viewer lease) |
| Following tab | WORKING | `/api/live/following` |
| Studio camera/mic + device select | WORKING | `enumerateDevices` pickers |
| WebRTC reconnect attempt | PARTIAL | `restartIce` + re-announce; NAT still needs TURN |
| Gifts in LIVE | WORKING | Atomic (PG) / idempotent JSON; animation + SFX |
| TURN cross-network | BLOCKED_EXTERNAL | |
| OBS Companion | PARTIAL | Local credentials |

## Social / Messages / Calls
| Area | Status | Notes |
|---|---|---|
| Posts create/edit/delete | WORKING | Owner-gated |
| Comments create/edit/delete/react | WORKING | + migration `012` |
| Followers / following lists | WORKING | |
| Feed / search / notifications / block / report | WORKING | |
| Messages delivery/read/typing/unread | WORKING | |
| Presence online/offline | WORKING | Via `/api/events` heartbeat + `/api/presence` |
| DM attachments | NOT_IMPLEMENTED | Media pipeline exists but not wired to DMs (no invented product) |
| Calls signaling | WORKING | Media NAT BLOCKED_EXTERNAL |

## Wallet / gifts / monetization
| Area | Status | Notes |
|---|---|---|
| Unified wallet | WORKING | TEST LUMEN labeled |
| Integer amounts + gift idempotency (JSON+PG) | WORKING | Float quantity rejected |
| Gift LIVE path | WORKING | Balance check → atomic/idempotent → event → credit |
| Admin refund (JSON) | WORKING | Reverse legs; PG reverse = architecture boundary PARTIAL |
| Invoice paid | PARTIAL | Manual status honesty |
| Commerce sandbox | MOCK | Explicit sandbox |
| Real PSP | BLOCKED_EXTERNAL | |

## Security / production
| Area | Status | Notes |
|---|---|---|
| CSP / headers / rate limits / upload magic | WORKING | Prior + maintained |
| Production env validation warnings | WORKING | Surfaced on `/api/health` |
| Docker non-root + HEALTHCHECK | WORKING | |
| Deploy script backup | WORKING | |
| VPS deploy | BLOCKED_EXTERNAL | |
| Artifacts `64`/`T`/`rn` | N/A | Not in repo — see `RUNTIME_ARTIFACTS.md` |
| `bootstrap-diagnostics.js` | WORKING | Keep |

## Counts (this pass)
| Status | Count |
|---|---|
| WORKING | 58 |
| PARTIAL | 8 |
| MOCK | 1 |
| NOT_IMPLEMENTED | 1 |
| BLOCKED_EXTERNAL | 7 |
| BROKEN | 0 |
| FAILED TESTS | 0 |

See also: `OWNER_ACTION_REQUIRED.md`, `RUNTIME_ARTIFACTS.md`, `WORKING_FLOWS_BACKLOG.md`.
