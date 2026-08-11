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
| Google OAuth | BLOCKED_EXTERNAL | Full token exchange + session redirect implemented; needs live `GOOGLE_*` credentials |

## Sylora AI
| Area | Status | Notes |
|---|---|---|
| `/api/ai/chat` | WORKING when key | Fail-closed 503 without key |
| `/api/ai/chat/stream` | WORKING | Native `responses.stream` adapter + progressive fallback; cancel on disconnect; language routing; usage fields. Live key E2E remains BLOCKED_EXTERNAL |
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
| WebRTC reconnect | WORKING | Full `RTCPeerConnection` recreate + re-announce; ICE restart on calls |
| Gifts in LIVE | WORKING | Atomic (PG) / idempotent JSON; animation + SFX |
| TURN cross-network | BLOCKED_EXTERNAL | STUN/P2P works; TURN via `SYLORA_ICE_SERVERS_JSON` |
| OBS Companion | WORKING | Local Companion + OBS WebSocket; `/api/studio/companion-boundary` honesty |

## Social / Messages / Calls
| Area | Status | Notes |
|---|---|---|
| Posts create/edit/delete | WORKING | Owner-gated |
| Comments create/edit/delete/react | WORKING | + migration `012` |
| Followers / following lists | WORKING | |
| Feed / search / notifications / block / report | WORKING | |
| Messages delivery/read/typing/unread | WORKING | |
| Presence online/offline | WORKING | Via `/api/events` heartbeat + `/api/presence` |
| DM attachments | WORKING | Image/video upload → `mediaId` on message; JSON + PG (`013`) |
| Calls signaling | WORKING | Media NAT BLOCKED_EXTERNAL |

## Wallet / gifts / monetization
| Area | Status | Notes |
|---|---|---|
| Unified wallet | WORKING | TEST LUMEN labeled |
| Integer amounts + gift idempotency (JSON+PG) | WORKING | Float quantity rejected |
| Gift LIVE path | WORKING | Balance check → atomic/idempotent → event → credit |
| Admin refund (JSON + PG) | WORKING | Reverse ledger legs; `refunded_at` + idempotent |
| Invoice paid | WORKING | Manual bookkeeping status (`settlement: manual_bookkeeping`) — not PSP |
| Commerce TEST LUMEN checkout | WORKING | Real wallet debit/credit + ledger (`paid_test_lumen`) |
| Real PSP | BLOCKED_EXTERNAL | Production `paymentMode` fails closed |

## Security / production
| Area | Status | Notes |
|---|---|---|
| CSP / headers / rate limits / upload magic | WORKING | Images + video magic |
| Production env validation warnings | WORKING | Surfaced on `/api/health` |
| Docker non-root + HEALTHCHECK | WORKING | |
| Deploy script backup | WORKING | |
| VPS deploy | BLOCKED_EXTERNAL | Needs SSH to `/opt/sylora` |
| External streaming CDN / cloud OBS | BLOCKED_EXTERNAL | Local OBS path WORKING |
| Mail provider (password-reset email) | BLOCKED_EXTERNAL | Token API WORKING |
| Artifacts `64`/`T`/`rn` | N/A | Not in repo — see `RUNTIME_ARTIFACTS.md` |
| `bootstrap-diagnostics.js` | WORKING | Keep |

## Closure of prior gaps (this pass)

| Prior item | Was | Now | Evidence |
|---|---|---|---|
| `/api/ai/chat/stream` | PARTIAL | WORKING | `src/ai-stream.mjs` native stream + fallback |
| WebRTC reconnect | PARTIAL | WORKING | `recreateLiveViewerPeer` full peer recreate |
| OBS Companion | PARTIAL | WORKING | Local path + companion-boundary API |
| PG gift refund | PARTIAL | WORKING | `PostgresWalletRepository.refundGiftTransfer` |
| Invoice paid | PARTIAL | WORKING | `settlement: manual_bookkeeping` |
| Commerce sandbox | MOCK | WORKING | `lumenTestCheckout` real TEST LUMEN ledger |
| DM attachments | NOT_IMPLEMENTED | WORKING | Media upload + message `mediaId` + UI |

## Counts (this pass)
| Status | Count |
|---|---|
| WORKING | 68 |
| PARTIAL | 0 |
| MOCK | 0 |
| NOT_IMPLEMENTED | 0 |
| BLOCKED_EXTERNAL | 7 |
| BROKEN | 0 |
| FAILED TESTS | 0 |
| TESTS | 144 PASS |

### BLOCKED_EXTERNAL (owner-only) — 7
1. `OPENAI_API_KEY` — live model chat / stream / realtime voice E2E  
2. `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` — live Google login  
3. Payment PSP (`SYLORA_PAYMENT_*`) — real card capture  
4. TURN in `SYLORA_ICE_SERVERS_JSON` — cross-NAT WebRTC  
5. External streaming / RTMP CDN keys — cloud broadcast ingest  
6. Mail provider — password-reset inbox delivery  
7. Production SSH to `/opt/sylora` — getsylora.com deploy  

See also: `OWNER_ACTION_REQUIRED.md`, `RUNTIME_ARTIFACTS.md`, `WORKING_FLOWS_BACKLOG.md`.
