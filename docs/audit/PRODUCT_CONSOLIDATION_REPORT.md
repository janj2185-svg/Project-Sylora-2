# SYLORA Product + UX Consolidation Report

**Branch work:** product consolidation pass (no VPS deploy)  
**Date:** 2026-08-11

## 1. What was duplicated

- LIVE entry points: Home chips, left rail, right rail, More-adjacent paths
- Sylora AI: dock, Home presence, left mini, right rail CTA, More module (kept as *one* AI, multiple presentations)
- Chat vs notifications vs invites split across Messages + Profile
- Gifts in primary left rail (as if a top-level product)
- Create as Home chip that only focused the composer
- Business ≈ Science conference landing shells
- Technical AI provider strings shown in the user AI UI

## 2. What was merged

- **Inbox** = DMs + notifications + invites + calls tabs (`messages` view)
- **One Sylora AI** with shared personality instructions + mode context (`sylora-intelligence.mjs`)
- **Home ecosystem feed** reuses LIVE / users / communities / courses / businesses APIs (no fake counters)
- **Global Create Hub** for post/clip/LIVE/room/project/community/course/studio
- **Command Palette** (`⌘/Ctrl+K`) over `/api/search` + `/api/search/ai` + slash commands
- Business org **workspace panel** (teams/docs/tasks) instead of toast-only
- Science layout separated (researchers + resources + circles + courses)

## 3. What was removed / demoted

- Mobile dock **Ще/More** and **Чат** labels → **Inbox** + **Profile**
- Gifts removed from primary left rail (gallery via Settings / LIVE / Studio paths)
- User-facing *"AI provider ще не налаштований на сервері"* → `humanError` / `syloraUnavailable`
- Home “Створити” composer-only shortcut → Create Hub

## 4. What was added

- `public/i18n.js` multi-locale foundation (13 UI locales scaffold; full copy for UK/PL/EN/DE)
- `public/create-hub.js`, `public/command-palette.js`, `public/design-consolidation.css`
- `src/ecosystem/sylora-intelligence.mjs` + `intelligenceProfile` / `setProactiveLevel`
- APIs: `GET /api/ai/intelligence`, `PATCH /api/ai/proactive`
- Home living feed strips; LIVE hub tabs; Inbox tabs; Business workspace UI; Science research grid
- Tests: `tests/consolidation.test.mjs` (+ nav expectations updated)

## 5. Bugs fixed

- Mobile dock IA mismatch (Chat/More vs Inbox/Profile)
- Content clearance / compact dock / carousel padding (consolidation CSS)
- Create Hub orphan module not wired
- AI technical error leakage to end users
- Business workspace open = toast only

## 6. What really works now

- Auth, feed/posts, follow/block, clips/videos upload, LIVE rooms/chat/gifts/resonance, Studio, conferences WebRTC, orgs/teams/docs/tasks, communities, courses (free path), search, Inbox tabs, Create Hub navigation, Command Palette search, AI memory CRUD + proactive setting, personality injection when provider configured
- Without `OPENAI_API_KEY`: AI chat/realtime fail closed with **user-safe** copy; API still returns machine codes for clients/admin

## 7. tests / lint / typecheck / build

See CI command results in the agent run (expected: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`).

## 8. Objectively not ready (do not call production-ready)

- Native-quality multilingual TTS/STT routing across all listed languages (provider-dependent)
- Full realtime translated calls pipeline
- LIVE AI co-host autonomy levels end-to-end
- Vision / screen awareness / full agentic tool surface beyond propose_post/propose_memory
- Complete UI string migration off hardcoded Ukrainian in every scene
- Paid courses (honest `PAYMENT_PROVIDER_REQUIRED`)
- Create Event — wired via `/api/platform-events` + Action Engine (not full ticketing/CDN yet)
- **VPS/Hetzner production deploy** (explicitly deferred; needs SSH secrets in Cursor Dashboard)

## Language matrix (honest)

| Layer | Working now |
|---|---|
| UI i18n | UK/PL/EN/DE solid; ES/FR/IT/PT/CS/SK/RO/NL/TR scaffold+fallback |
| AI text | When OpenAI configured — model multilingual; personality asks to match user language |
| STT/TTS | OpenAI Realtime when configured; do **not** claim native-perfect for every locale |
| Voices | Catalog personalities map to realtime voice routing; provider voices required |
| Memory | User-visible list + add/delete + export/clear + secret rejection + proactive level |
| Still needs API keys | `OPENAI_API_KEY`, optional TURN, payment provider, production SSH deploy secrets |

## Platform intelligence (39–49)

Added without separate bots: Creator LIVE insights + content packs; Business meeting brief/summary/tasks (confirm-gated); Learning quizzes + adaptive difficulty; Privacy & AI Control Center + Activity Log; degraded capabilities banner; Home hub API; AI eval suite. Analytics are store-backed only (`honestEmpty` when no signal).
