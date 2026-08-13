# SYLORA — UI Map (every surface)

**Audited:** 2026-08-13  
**Evidence:** `public/index.html`, `public/app.js` `render()`, `create-hub.js`, `command-palette.js`, screenshots under `audit/screenshots/`, live server `http://127.0.0.1:8787`.

Readiness % below is **end-to-end user capability**, not “JSX exists”. UI-only screens cannot score 100.

---

## Global chrome (always on)

| Element | Where | Behavior | Status |
|---|---|---|---|
| AI degraded banner | `body` insert from `degradedBannerHtml()` | “Sylora text AI temporarily unavailable…” when `aiText=false` | WORKING (honest) |
| Brand | header | click → `#` (not a route) | PARTIAL / weak |
| Search / ⌘K | `#globalSearch` | opens command palette | WORKING overlay |
| Locale | account area | uk/pl/en via `i18n.js` | WORKING client-side |
| Login button | guest header | `renderAuth()` | WORKING navigation |
| Wallet chip | authed header | `10,000 TEST` LUMEN | STATIC label + real JSON balance |
| Avatar letter | authed header | first letter | WORKING |
| Left rail | desktop `aside.left-rail` | `data-view` buttons | WORKING click; **active class often stuck on Home** after deep link (`nav()` sets it, `bootstrap()`/`render()` do not) |
| Create Hub | `data-create-hub` | overlay 9 actions | PARTIAL |
| Sylora mini | rail | `data-rail-view="ai"` | WORKING nav |
| “Core online” | rail footer | hardcoded HTML | FAKE/STATIC |
| Right rail LIVE | `#live-events` | intended gift/live pulse | often stuck on “Realtime…” |
| Right rail AI portrait | `.ai-rail` | PNG + “Поговорити” | nav to `/ai` |
| Mobile dock | `.mobile-dock` | 5 items | WORKING; **no Settings, no Create, no LIVE studio** |

**Overlays / modals (not routes):** Create Hub, Command Palette, incoming call banner, toast `#toast`, gift stage `#gift-stage`, clip/video upload forms, auth card, comment forms, `prompt()`/`confirm()` for report/block/Ask Sylora.

**Hidden HTML (not in nav):** `/phoenix-preview.html`, `/obs-overlay.html`.

---

## Information architecture as coded today

```
SYLORA SPA
├── Home            /                 sidebar + mobile
├── LIVE            /live             sidebar + mobile
│   ├── Discover
│   ├── Following          hardcoded []
│   ├── Create LIVE
│   ├── Battles
│   └── Studio shortcut    → /studio
├── Clips           /clips            sidebar only
├── Studio          /studio           sidebar; auth wall
├── Наука           /learning         sidebar
├── Бізнес          /business         sidebar
├── Відкриття       /explore          sidebar
├── Спільноти       /communities      sidebar
├── Inbox           /messages         sidebar + mobile
│   ├── Повідомлення
│   ├── Сповіщення
│   ├── Запрошення
│   ├── Дзвінки
│   └── Priority
├── Профіль         /profile          sidebar + mobile; guest → auth
├── Налаштування    /more             sidebar only
│   ├── Акаунт → /profile
│   ├── Identity → /identity
│   ├── Sylora AI → /ai
│   ├── Dashboard → /dashboard
│   ├── Canvas → /canvas
│   ├── Agents → /agents
│   ├── Developer → /developer
│   ├── Security → /security
│   ├── Communications → /messages
│   ├── Media → /videos
│   ├── Gift Gallery → /gifts
│   ├── Communities → /communities
│   ├── Science → /learning
│   ├── Business → /business
│   └── Admin → /admin (role=admin)
├── Sylora AI       /ai               mobile dock + rail
├── Gifts           /gifts            settings only
├── Videos          /videos           settings / home cards
└── (no onboarding wizard, no password recovery, no Google button)
```

---

## Per-view audit

Legend for status: WORKING / PARTIAL / MOCK / STATIC UI / PLACEHOLDER / BROKEN / MISSING / BLOCKED

### 1. Home / Feed
- **Route:** `/` (`view=feed`)
- **Nav:** sidebar Home, mobile Home
- **Purpose:** personal hub + social feed
- **User sees:** greeting, Sylora talk card, circular shortcuts (LIVE/Clips/Studio/Create/Inbox/Science/Business), Daily Brief, Inbox counts, recommended LIVE, People, For you, Communities/Science/Business empty “Відкриття” cards, join CTA (guest), composer (authed), posts
- **Components:** hero, hub sections, composer, post cards, react/comment/follow/report/block/Ask Sylora
- **APIs:** `GET /api/home/hub`, `GET /api/feed`, `POST /api/posts`, `POST /api/posts/:id/react`, comments, follow, `/api/reports`, `/api/daily-brief`, `/api/ai/ask`
- **Works:** feed list, register-gated composer, react/comment/follow (JSON-dev verified)
- **Mock/static:** duplicated empty Discovery cards; “Core online”; Daily Brief copy can repeat
- **UX:** clutter; four identical empty cards (screenshot `desktop/guest-feed.png`, `mobile/guest-feed.png`)
- **Responsive:** 360 usable but overflow below dock; **768 tablet: icon rail + empty main** (`tablet/guest-feed-768.png`)
- **Console:** gift-runtime `three` specifier; CSP inline-script on some navigations
- **Readiness:** **42%** (hub UI 70, social write 55, discovery empty 15)

### 2. Auth (Login / Register)
- **Route:** `/profile` when logged out (also triggered from gated views)
- **Nav:** Увійти; Profile when guest
- **Purpose:** create account / login
- **User sees:** tabs Реєстрація / Вхід; username+email+password OR identity+password
- **Missing UI:** Google, phone, forgot password, email verify, 2FA, passkeys (flags `passkeys_2fa: false`)
- **APIs:** `POST /api/auth/register`, `/login`, `/logout`, `GET /api/me`
- **Works:** register 201, login, invalid 401, logout then `/api/me` 401 (verified)
- **Broken/missing:** `/api/auth/google` 404, `/api/auth/forgot-password` 404
- **Security:** register response includes `email` (PII); public `/api/users` strips email
- **Readiness:** **38%**

### 3. LIVE
- **Route:** `/live`
- **Tabs:** Discover, Following, Почати LIVE, Battles, Studio
- **Purpose:** discovery + start + watch
- **User sees:** Entertainment Engine hero, room cards Watch/Chat/Ask/Battle/Copilot
- **APIs:** `GET/POST /api/live`, engagement, chat, like, resonance, battles, rtc-config, SSE `/api/live/:id/events|signal`
- **Works:** create room JSON 201, list rooms, guest can see cards
- **Fake:** Following tab `const list=tab==='following'?[]:rooms` — **always empty**
- **Blocked:** camera/mic/WebRTC media in this VM; TURN empty; Ask Sylora uses mock `/api/ai/ask` or 503 chat
- **Classification:** UI exists + control plane prototype; **not production-ready streaming**
- **Readiness:** **34%**

### 4. Studio
- **Route:** `/studio` (auth wall)
- **Nav:** sidebar Studio; LIVE tab Studio
- **Purpose:** creator mixer, camera, scenes, OBS companion
- **APIs:** `/api/studio/scenes`, live create, rtc-config, companion/OBS clients
- **Blocked here:** getUserMedia, OBS, companion token
- **Readiness:** **28%** UI/API scenes; media **BLOCKED — NOT VERIFIED**

### 5. Clips
- **Route:** `/clips`
- **APIs:** `/api/videos?format=clip`, `/api/media/upload`
- **Works in tests:** ffmpeg upload + video row (`tests/api.test.mjs`)
- **UI:** empty state if no videos; upload form when authed
- **Readiness:** **40%** local pipeline; no CDN

### 6. Videos
- **Route:** `/videos` (not in primary nav; settings Media + home card)
- **Same pipeline as clips, `format=video`**
- **Duplication:** clips vs videos almost the same screen
- **Readiness:** **38%**

### 7. Explore / Відкриття
- **Route:** `/explore`
- **Form:** search q≥2
- **APIs:** `/api/search`, `/api/search/universal` (authed)
- **PARTIAL:** lexical search exists; semantic embeddings blocked
- **Readiness:** **35%**

### 8. Inbox / Messages
- **Route:** `/messages` (auth)
- **Tabs:** messages, notifications, invites, calls, priority
- **APIs:** conversations, messages, notifications, `/api/inbox/intelligent`, `/api/calls*`
- **Works:** conversation create 201, DM SSE in unit test
- **UI:** empty placeholder “Inbox Повідомлення”; sidebar Home stays active (screenshot `authed-messages.png`)
- **Calls tab:** session objects exist; media **BLOCKED**
- **Readiness:** **40%** messages backend; **22%** calls

### 9. Sylora AI
- **Route:** `/ai` (auth)
- **User sees:** portrait, “gpt-5.6” label, Command Center, composer, memory form, LIVE assist, export
- **APIs:** `/api/ai/chat` **503 AI_PROVIDER_NOT_CONFIGURED**; `/api/ai/history`; `/api/ai/memory`; `/api/ai/ask` returns **Development / mock**; `/api/ai/realtime` 503; dashboard/permissions
- **Avatar:** PNG `sylora-avatar-v2-base.png` + CSS (`design-avatar-assembled.css`) — **not 3D**
- **Voice:** BLOCKED without OpenAI; browser SpeechRecognition untested here
- **Readiness:** UI **55%**, backend **12%**, voice **8%** (this env)

### 10. Profile
- **Route:** `/profile`
- **Authed:** displayName, bio, locale, LUMEN, XP orbit, stats, ledger snippet
- **APIs:** `/api/me` PATCH, `/api/stats`, `/api/ledger`, `/api/progress`
- **Works:** PATCH displayName verified
- **Legacy:** `renderProfileLegacy()` unused
- **Readiness:** **48%**

### 11. Gifts
- **Route:** `/gifts`
- **UI:** 10 cards (screenshot `authed-gifts.png`) matching JSON catalog
- **Send:** recipient select + combo + POST `/api/gifts/send`
- **Works:** spark send 201, ledger, 70% creator share
- **Broken:** cinematic playback `Failed to resolve module specifier "three"` (`audit/screenshots/console-log.json`)
- **Fake vs V2:** 20 V2 IDs not in wallet
- **Readiness:** **32%**

### 12. Settings / more
- **Route:** `/more`
- **14 module tiles** duplicating primary nav + dumping unfinished products
- **Readiness:** **50% as a directory**, **20% as a settings product** (no password, sessions, 2FA, notification prefs)

### 13. Identity
- **Route:** `/identity` (auth, settings)
- **APIs:** `/api/identity`, `/api/kg`
- **PARTIAL:** JSON identity object + privacy flags; not a real ID system
- **Readiness:** **22%**

### 14. Agents
- **Route:** `/agents`
- **API:** `GET /api/agents` returns sandbox catalog (LIVE Moderator, Creator Assistant, … `securityReview: pending`)
- **MOCK/STATIC catalog** + install endpoints in-memory
- **Readiness:** **15%**

### 15. Developer
- **Route:** `/developer`
- **API:** `/api/developer/apps` returns `oauth` doc pointing at **404 endpoints**
- **Readiness:** **12%**

### 16. Security center
- **Route:** `/security`
- **API:** `/api/security-center`, privacy requests
- **delete_account** → queued request, **not actual deletion** (`src/ecosystem/trust.mjs`)
- **Readiness:** **20%**

### 17. Personal Dashboard
- **Route:** `/dashboard`
- **API:** `/api/dashboard`, tasks, goals, brief, continuity
- **In-memory OS objects**
- **Readiness:** **18%**

### 18. Canvas
- **Route:** `/canvas`
- **API:** `/api/canvas`, `/api/ai/command` (needs AI)
- **Readiness:** **16%**

### 19. Communities
- **Route:** `/communities`
- **APIs:** CRUD communities/channels/posts — **JSON**, works in `tests/api.test.mjs`
- **UI:** create form + list
- **Readiness:** **40%** (JSON only; PG table unused)

### 20. Learning / Наука
- **Route:** `/learning`
- **APIs:** `/api/learning/hub`, courses, tutor, flashcards, science hubs, conferences
- **Courses JSON work in tests**; science calculators/tutor are in-memory honesty-labeled
- **Readiness:** **26%**

### 21. Business
- **Route:** `/business`
- **APIs:** hub, orgs, invoices (`adapterStatus: architecture_stub`), CRM, quotes
- **Invoice POST 201 with empty totals** — stub
- **Readiness:** **18%**

### 22. Admin
- **Route:** `/admin` (tile only if `role===admin`)
- **APIs:** `/api/admin/reports`, `/api/admin/audit`
- **Admin via `SYLORA_ADMIN_EMAILS`**
- **Normal user 403** (verified)
- **Readiness:** **18%**

### 23. Onboarding
- **API:** `GET /api/onboarding` (auth) returns `mode: minimal_first`
- **No dedicated UI wizard**
- **MISSING as a product flow**
- **Readiness:** **8%**

### 24. Phoenix preview / OBS overlay
- **Routes:** `/phoenix-preview.html`, `/obs-overlay.html`
- **Dev/creator helper pages**
- **Not in IA**
- Phoenix preview is a cinematic playground, not the wallet gift

---

## Buttons (interaction, not paint)

| Action | Status | Evidence |
|---|---|---|
| Register | WORKING (JSON-dev) | 201 + token |
| Login | WORKING | 200 / 401 |
| Logout | WORKING | `/api/me` 401 after |
| Google auth | MISSING | 404 |
| Password recovery | MISSING | 404 |
| Profile edit | WORKING | PATCH 200 |
| Follow / like / comment | WORKING JSON | probe 2026-08-13 |
| Share | MISSING | no share pipeline |
| Notifications | PARTIAL | list API; UI tab empty-ish |
| Messages | PARTIAL | API+test SSE; UI empty |
| Calls / video | PARTIAL API / BLOCKED media | call 201 ringing; no TURN/camera |
| Camera / mic | BLOCKED — NOT VERIFIED | headless VM |
| Start LIVE room | WORKING control plane | POST 201 |
| Join/watch WebRTC | BLOCKED — NOT VERIFIED | iceServers [] |
| Gifts send ledger | WORKING JSON | spark 201 |
| Gift cinematic | BROKEN | `three` specifier |
| Wallet purchase real money | MISSING / BLOCKED | TEST LUMEN |
| Subscriptions | MOCK/sandbox commerce | `PAYMENT_PROVIDER_REQUIRED` |
| Language selector | WORKING | i18n |
| Settings tiles | WORKING navigation | `/more` |
| AI send | BLOCKED 503 | no OPENAI_API_KEY |
| Ask Sylora | MOCK | `/api/ai/ask` honesty development/mock |

---

## Navigation defects

1. Deep link `/live` still highlights Home (`nav()` vs `bootstrap()`).
2. Mobile dock missing Settings/Create/Clips/Science/Business — those screens exist but are hard to reach.
3. Following LIVE is a dead tab.
4. Brand `href="#"` does not reset view.
5. Create Hub “room/project/event” just sets `intent` on business/live — easy to miss.
6. Duplicate names: Наука vs Science vs Learning; Inbox vs Communications; Gifts vs Gift Gallery vs wallet on profile.
7. `/videos` orphaned from primary nav.

**Proposed IA (DO NOT IMPLEMENT in this audit):** see remediation plan Phase 1.
