# SYLORA — Full UI Map (2026-08-13)

Evidence: `public/index.html`, `public/app.js`, `create-hub.js`, `command-palette.js`, runtime screenshots under `audit/screenshots/`.

## Visual tree (actual)

```
SYLORA
├── Home (/)                          [left nav + mobile dock]
├── LIVE (/live)
│   ├── Discover
│   ├── Following (empty filter)
│   ├── Create LIVE
│   ├── Battles
│   └── → Studio (nav away)
├── Clips (/clips)
├── Studio (/studio)                  [auth]
├── Science/Learning (/learning)
├── Business (/business)
├── Explore (/explore)
├── Communities (/communities)
├── Inbox/Messages (/messages)        [auth]
│   ├── Messages
│   ├── Notifications
│   ├── Invites
│   ├── Calls
│   └── Priority
├── Profile (/profile)                [auth]
├── Settings/More (/more)
│   ├── Profile / Identity / AI / Dashboard / Canvas
│   ├── Agents / Developer / Security
│   ├── Messages / Videos / Gifts
│   ├── Communities / Learning / Business
│   └── Admin (role=admin)
├── Sylora AI (/ai)                   [auth; dock + rail]
├── Gifts (/gifts)                    [account / more]
├── Videos (/videos)                  [more]
├── Identity (/identity)              [auth]
├── Agents (/agents)                  [auth]
├── Developer (/developer)            [auth]
├── Security (/security)              [auth]
├── Dashboard (/dashboard)            [auth]
├── Canvas (/canvas)                  [auth]
├── Admin (/admin)                    [admin]
├── Overlays (not SPA views)
│   ├── Create Hub sheet
│   ├── Command Palette (⌘K)
│   ├── Auth screen (replaces #app)
│   ├── Incoming call banner
│   ├── Gift stage (#gift-stage)
│   └── Toast
└── Standalone HTML
    ├── /obs-overlay.html?token=…
    └── /phoenix-preview.html
```

## Navigation chrome

| Chrome | Location | Items |
|--------|----------|-------|
| Top header | `index.html` | Brand→Home, Command search, locale, account |
| Left rail primary | `index.html` | feed, live, clips, studio, learning, business, explore, communities |
| Left rail secondary | `index.html` | messages, profile, more, Create Hub |
| Left extras | `index.html` + JS | Orbit progress, Sylora mini→ai, Core online |
| Right rail | JS refresh | People, Popular LIVE, wallet/AI cards |
| Mobile dock | `index.html` | feed, live, ai, messages, profile |
| Create Hub | `create-hub.js` | post, clip, live, room, project, community, course, event, studio |
| Command Palette | `command-palette.js` | slash cmds + AI command |

### Navigation defects

- **Duplicated labels:** Science↔Learning, Settings↔More, Inbox↔Messages
- **Views without primary nav:** videos, gifts, identity, agents, developer, security, dashboard, canvas, admin
- **Live Following:** UI tab, no working host-follow feed
- **Locale mismatch:** UI supports 13 locales; API/DB locale CHECK only `uk|pl|en`
- **Mobile:** left rail hidden; many modules only via More — easy to miss
- **Dead code:** `renderProfileLegacy`, `openConferenceRoom`

---

## Per-view audit cards

### Home — `/` — `feed`
- **Nav:** left + dock  
- **Purpose:** personal hub + social feed  
- **Sees:** greeting hero, Sylora card, module shortcuts, Daily Brief, LIVE strip, composer (auth), posts  
- **Actions:** publish post, react, comment, follow, report, block, open modules, join/auth  
- **API:** `/api/home/hub`, `/api/feed`, `/api/posts*`, `/api/daily-brief`, `/api/live`, `/api/users`  
- **Works:** feed render, post CRUD basics, auth gate for composer  
- **Mock/static:** marketing eco strips; empty people when cold  
- **UX:** dense first viewport vs “hero budget”; AI banner when provider missing  
- **Responsive:** mobile docks OK; hero crowding  
- **Readiness:** **65%**

### Auth overlay — (no route; replaces `#app`)
- **Purpose:** register / login  
- **Works:** register, login, invalid credentials 401  
- **Missing:** Google, phone, recovery, email verify  
- **Readiness:** **45%**

### LIVE — `/live`
- **Tabs:** discover, following, create, battles, studio  
- **Sees:** room cards (title/host/Watch/Chat/Ask Sylora), create forms, battle filter  
- **API:** `/api/live`, chat/like/signal/events, battles, entertainment, rtc-config, gifts/send  
- **Works:** create/list rooms (Postgres)  
- **Partial:** WebRTC watch/broadcast local P2P  
- **Broken/blocked:** gifts send on PG; TURN; following tab  
- **Screenshots:** `audit/screenshots/desktop/live.png`, `mobile/live-*.png`  
- **Readiness:** **44%**

### Studio — `/studio` (auth)
- **Panels:** sources, audio, scenes, broadcast, OBS WS, browser source, record, AI plan, creator intel  
- **API:** studio scenes, browser-source, live create/signal, AI plan  
- **Works UI:** camera button, scene forms  
- **Partial:** getUserMedia / MediaRecorder / OBS companion local  
- **Console risks:** Three import issues on gift path; CSP noise  
- **Readiness:** **48%**

### Clips — `/clips`
- **Purpose:** vertical video library + upload  
- **API:** `/api/videos?format=clip`, `/api/media/upload`  
- **Works:** empty state + uploader UI; upload pipeline exists (ffmpeg)  
- **Readiness:** **50%**

### Videos — `/videos`
- Same media pipeline, long-form; reach via More  
- **Readiness:** **48%**

### Explore — `/explore`
- Search form; people/posts/videos/live/communities…  
- **API:** `/api/search`, `/api/search/universal`  
- **Partial:** lexical only without embeddings  
- **Readiness:** **55%**

### Messages — `/messages` (auth)
- **Tabs:** messages, notifications, invites, calls, priority  
- **API:** conversations, inbox/intelligent, notifications, calls*  
- **Works:** DM create/send (API proven)  
- **Partial:** calls WebRTC; intelligent inbox empty buckets  
- **Readiness:** **52%**

### Sylora AI — `/ai` (auth)
- Living portrait, chat, dictate, memory, permissions, contexts  
- **API:** `/api/ai/chat|history|memory|realtime|permissions|…`  
- **Blocked:** chat/voice without `OPENAI_API_KEY` (banner + 503)  
- **Avatar:** PNG assembled + CSS springs — **not 3D**  
- **Screenshot:** `desktop/ai-sylora.png`  
- **Readiness:** **32%** functional / **78%** UI shell

### Profile — `/profile` (auth)
- Orbit, LUMEN vitals, edit form, notifications, ledger  
- **API:** `/api/me`, `/api/stats`, `/api/progress`, `/api/notifications`, `/api/ledger`  
- **Works:** edit displayName/bio; logout  
- **Duplication:** wallet stats overlap gifts  
- **Readiness:** **60%**

### Gifts — `/gifts`
- Constellation grid + recipient send form  
- **API:** `/api/gifts`, `/api/gifts/send`, `/api/users`, `/api/me`  
- **UI:** REAL  
- **Send (Postgres):** **BROKEN** (`creatorShareBps`)  
- **Economy:** TEST LUMEN  
- **Readiness:** **35%** E2E

### More/Settings — `/more`
- Module grid deep links  
- **Readiness:** **70%** as launcher / **40%** as settings product

### Communities — `/communities`
- List/create/join + fun-room shortcuts  
- **API:** communities*, social fun rooms  
- **Partial**  
- **Readiness:** **45%**

### Learning/Science — `/learning`
- Learning hub actions + science tools + courses + conferences  
- **API:** learning/*, science/*, courses*  
- **Much PLACEHOLDER/hub catalog**  
- **Readiness:** **35%**

### Business — `/business`
- Business hub + OS orgs + companies + conferences  
- **API:** business/*, orgs*, businesses  
- **Country adapters:** architecture_stub  
- **Readiness:** **28%**

### Identity / Agents / Developer / Security / Dashboard / Canvas
- Auth-gated ecosystem screens  
- Mostly **PARTIAL scaffolding** with real JSON/PG writes for some entities  
- OAuth/developer production keys **BLOCKED**  
- **Readiness:** **25–40%** each

### Admin — `/admin`
- Reports + audit log if `role===admin`  
- Security risk: unverified admin email allowlist  
- **Readiness:** **30%**

---

## Button interaction matrix (important controls)

| Control | Status | Evidence |
|---------|--------|----------|
| Register | WORKING | curl + browser |
| Login | WORKING | curl + browser |
| Logout | WORKING | token revoked |
| Google auth | MISSING | 404 / BLOCKED_EXTERNAL |
| Profile edit | WORKING | PATCH /api/me |
| Follow | WORKING | API |
| Like/react post | WORKING | API |
| Comments | WORKING | API |
| Share | NO ACTION / weak | no native share product |
| Notifications | PARTIAL | list works; smart mostly empty |
| Messages send | WORKING | API + SSE |
| Calls start | PARTIAL | session created; media/TURN limited |
| Video calls | PARTIAL | same |
| Camera/mic (Studio) | PARTIAL | getUserMedia local |
| Start stream (LIVE create) | WORKING (room) | Postgres room |
| WebRTC broadcast | PARTIAL | local P2P |
| Join/watch stream | PARTIAL | signaling path |
| Gifts send | **BROKEN** (PG) | curl 400 ReferenceError |
| Wallet top-up | MISSING | 404 |
| Payments/subscriptions | BLOCKED | integrations |
| Language selector | PARTIAL | UI localStorage; API locale uk/pl/en only |
| Settings nav | WORKING | routes |
| AI send | BLOCKED | 503 without key |
| AI voice | BLOCKED | Realtime key |

---

## Responsive scores (observed)

Viewports captured: 360×800, 390×844, 412×915, tablet portrait/landscape, 1366, 1440, 1920 (+ manual computer-use set).

| Surface | Score | Notes |
|---------|------:|-------|
| Mobile UI | **62/100** | Dock works; EN/UA mix; rail content lost; forms cramped |
| Tablet UI | **70/100** | Intermediate layout OK; still card-heavy |
| Desktop UI | **78/100** | Cohesive light aesthetic; crowded home; right-rail duplication |

Issues: overflow risk on long gift grids; studio controls dense on narrow; messages two-column collapses; touch targets uneven; safe-area partially via `viewport-fit=cover`.

## Design system audit (short)

- **Intent:** light futuristic / warm glass — **preserved** (not dark dashboard)
- **Reality:** 11 CSS layers = accidental multi-product look on Science/Business/Studio density
- **Typography:** custom-ish via CSS, but mixed Ukrainian hardcoding vs EN locale
- **Cards:** overused (violates “cards only for interaction” product rule in many heroes)
- **Motion:** `sylora-motion.js` + gift engines (intentional)
- **A11y:** some aria on palette/create hub; many icon buttons weak labels; contrast mostly OK on light UI; reduced-motion not systematically enforced

Screenshots SoT: `audit/screenshots/desktop|mobile|tablet/`.
