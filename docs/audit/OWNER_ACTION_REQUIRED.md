# Owner action required

Only items that **cannot** be finished without the owner’s external account, secret, or production access.  
Everything else on the real-working matrix is closed (MOCK=0, NOT_IMPLEMENTED=0, PARTIAL=0).

Ordered for maximum product unlock first:

| # | Provide / configure | Where to get it | Why needed |
|---|---|---|---|
| 1 | `OPENAI_API_KEY` (+ optional `OPENAI_MODEL` / realtime model overrides) | [OpenAI API keys](https://platform.openai.com/api-keys) → set in server `.env` / production secrets (never frontend/git) | Unlocks live Sylora AI chat, `/api/ai/chat/stream` token E2E, and realtime voice |
| 2 | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI` | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → OAuth 2.0 Client (Web) → authorized redirect = your public `/api/auth/google/callback` | Live “Continue with Google” login (token exchange already implemented) |
| 3 | Payment provider credentials (`SYLORA_PAYMENT_*` / PSP keys) | Your chosen PSP dashboard (Stripe/etc.) — wire names documented in `.env.example` when present | Real card/fiat capture; TEST LUMEN commerce already works without this |
| 4 | TURN credentials in `SYLORA_ICE_SERVERS_JSON` | Twilio/Xirsys/self-hosted coturn → JSON ICE servers for the API process | Cross-NAT WebRTC for LIVE/calls when peers are not on the same LAN |
| 5 | Mail provider for password-reset email (SMTP/API) | Resend/SendGrid/Postmark/etc. + from-address | Actual inbox delivery of reset links (token API already works; no fake “email sent”) |
| 6 | External streaming / RTMP CDN keys (optional) | OBS → your RTMP provider, or cloud OBS service | Cloud broadcast ingest beyond local OBS WebSocket + Companion (local path already WORKING) |
| 7 | Production SSH access to `/opt/sylora` (getsylora.com host) | Your VPS/Hetzner account + deploy key | Run `scripts/deploy-prod.sh` / compose on production; agent has no SSH |

Do **not** put secrets in chat, git, or frontend.
