# CURRENT STATE — SYLORA Working Core v0.1

**Audited:** 2026-08-11  
**Stack:** Node.js 22 modular monolith · vanilla public shell · PostgreSQL + Redis hybrid · OpenAI SDK

## Product posture

SYLORA currently ships a **real vertical slice**, not a mock platform. README’s “intentionally not faked” rule matches the code: missing providers fail closed (`AI_PROVIDER_NOT_CONFIGURED`, `PAYMENT_PROVIDER_REQUIRED`).

## What works for real

| Domain | Status | Notes |
|---|---|---|
| Auth / sessions | DONE | scrypt passwords, opaque bearer tokens, SHA-256 session hashes |
| Profile / locale | DONE | displayName, bio, UK/PL/EN |
| Social feed | DONE | posts, reactions, comments, follows, blocks |
| Messages | DONE | DMs with persistence |
| Wallet / gifts | DONE | LUMEN test currency, ledger, combos, creator share BPS |
| LIVE control plane | DONE | rooms, chat, engagement, resonance, SSE fanout |
| WebRTC LIVE | PARTIAL | P2P Studio broadcast, 6-peer cap, optional ICE/TURN |
| Creator Studio | DONE (non-AI) | camera/mic, screen, mixer, OBS companion, scenes |
| Clips / media | DONE | upload, Range, FFmpeg HLS jobs (local) |
| SYLORA AI chat/voice | PARTIAL | OpenAI Responses + Realtime; confirm-gated writes |
| AI memory | PARTIAL | flat memories, confirm-to-save; no short/long tiers |
| Communities / courses / business | PARTIAL | JSON-store runtime; schema tables exist unused |
| Admin moderation | PARTIAL | reports + audit in JSON store |
| Digital Human avatar | BROKEN | armless torso + mismatched pink sleeve pieces |

## Runtime topology

- `src/server.mjs` — HTTP API + static + media
- `src/repositories/postgres-*.mjs` — auth/social, wallet, AI, live, conference, outbox
- `src/store.mjs` — JSON fallback + remaining domains
- `public/app.js` — SPA shell
- `public/gift-v2/` — cinematic gift runtime foundation
- `src/platform-vision.mjs` — 14 capability contracts (`foundation-registered`)

## Five tech moats vs current code

1. **Personal AI** — chat/voice exist; not yet a persistent permissioned partner.
2. **Permissioned Knowledge Graph** — missing.
3. **Realtime multilingual** — UI i18n only; no speech/chat translation plane.
4. **Agent + Developer Platform** — missing.
5. **Creator + Business Economy** — gifts/ledger real; subs/commerce/orgs not.

## Immediate defects blocking “Sylora feels whole”

1. Digital Human visually fragmented (armless torso + wrong arm assets + gesture layers never mounted).
2. Avatar motion mostly hidden until LIVE voice.
3. Ecosystem capabilities exist as docs/contracts, not product surface.
4. Hybrid store split-brain risk (Postgres AI/auth/wallet vs JSON communities/business/audit).
