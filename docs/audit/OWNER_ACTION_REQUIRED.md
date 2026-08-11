# Owner action required

Only items that **cannot** be finished without the owner’s external account, secret, or production access.

| Item | Why blocked | What is already ready in repo |
|---|---|---|
| `OPENAI_API_KEY` (and optional model overrides) | Model chat / realtime voice / token usage E2E | `/api/ai/chat`, `/api/ai/chat/stream` (progressive delivery + cancel), memory, rate limits, fail-closed without key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | Live Google login | Fail-closed + `/api/auth/google`, `/start`, `/callback` integration boundary |
| Payment PSP (`SYLORA_PAYMENT_*`) | Real card capture | Sandbox commerce labeled; invoice paid = manual status only |
| TURN credentials in `SYLORA_ICE_SERVERS_JSON` | Cross-NAT WebRTC | STUN/P2P path works; TURN optional config documented |
| External streaming (OBS service keys / RTMP CDN) | Cloud broadcast ingest | Local OBS WebSocket + Companion + WebRTC P2P LIVE |
| Production SSH to `/opt/sylora` | Deploy to getsylora.com | `scripts/deploy-prod.sh` backup + compose; `docs/DEPLOY-HETZNER.md` |
| Mail provider for password-reset email | Actual inbox delivery | Token reset API works; email delivery explicitly not claimed |

Do **not** put secrets in chat, git, or frontend.
