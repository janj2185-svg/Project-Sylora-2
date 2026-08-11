# SYLORA LIVE — Owner action required

Secrets must go into server env / secret manager — **never chat, git, or frontend**.

| # | WHAT | WHY | WHERE TO GET IT | WHERE TO PUT IT | HOW TO VERIFY |
|---|---|---|---|---|---|
| 1 | `OPENAI_API_KEY` (+ optional realtime/model overrides) | Generative co-host speech, STT/TTS, richer LIVE host replies | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) | Server `.env` / production secrets | `/api/ai/history` shows `configured:true`; Command Center host note changes |
| 2 | TikTok LIVE developer app (`TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, redirect) | Read/send LIVE chat, gifts, moderation if API allows | TikTok for Developers — LIVE/Open API approval | Server env only | Connect TikTok card leaves `AUTH_REQUIRED` → real OAuth (when wired to live credentials) |
| 3 | YouTube (`GOOGLE_CLIENT_ID`/`SECRET` + YouTube scopes / redirect) | YouTube Live chat + stream metadata | Google Cloud Console + YouTube Data API enable | Server env | YouTube connection no longer returns AUTH_REQUIRED-only shell |
| 4 | Twitch (`TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, redirect) | EventSub + chat | [dev.twitch.tv](https://dev.twitch.tv) | Server env | Twitch adapter can complete OAuth |
| 5 | Meta (`META_APP_ID`, `META_APP_SECRET`, redirect) + Live permissions | Facebook Live (Instagram remains UNAVAILABLE) | Meta Developer app review | Server env | Facebook connect path advances past AUTH_REQUIRED |
| 6 | Kick (`KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`, redirect) | Kick chat/events when API available | Kick developer portal | Server env | Kick card status updates after OAuth |
| 7 | Discord (`DISCORD_BOT_TOKEN`, client id/secret) | Channel chat bridge | Discord Developer Portal | Server env | Bot joins guild; bridge health OK |
| 8 | `SYLORA_ICE_SERVERS_JSON` with TURN | Cross-NAT WebRTC for SYLORA LIVE viewers/guests | Twilio/Xirsys/coturn | Server env | `/api/live/rtc-config` reports TURN configured |
| 9 | Custom RTMP URL + stream key | Push to external media server / CDN | Your CDN/RTMP provider | `POST /api/sylora-live/rtmp/destination` + `/rtmp/key` (server vault) | Destination shows `streamKeySet:true` without echoing key |
| 10 | Production SSH `/opt/sylora` | Deploy LIVE ecosystem to getsylora.com | VPS/Hetzner | Host deploy only | Health endpoints on production |

Existing Companion/OBS path needs only local OBS + `SYLORA_COMPANION_TOKEN` on the creator machine (already documented).
