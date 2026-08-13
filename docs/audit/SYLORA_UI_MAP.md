# SYLORA — Full UI Map

Client router: pathname segment ∈ `SPA_SHELL_VIEWS` (`public/app.js`).  
Shell: `public/index.html` (left rail, right rail, mobile dock, header).  
Screenshots: `audit/screenshots/desktop/*`, `audit/screenshots/mobile/*`.

## Visual IA (as built)

```
SYLORA
├── Home (`/` · view=feed)
├── LIVE (`/live`)
│   ├── Discover / Following / Battles / Create tabs (in-view)
│   ├── Watch room (WebRTC + waiting UI)
│   └── Live chat drawer
├── Clips (`/clips`)
├── Studio (`/studio`) [auth]
├── Science / Learning (`/learning`)
│   ├── Courses
│   ├── Science tools sections
│   └── Private science conferences
├── Business (`/business`)
│   ├── Company profiles
│   ├── Orgs / workspace tools
│   └── Private business conferences
├── Explore (`/explore`)
├── Communities (`/communities`)
│   └── Community detail + channels (in-view)
├── Inbox (`/messages`) [auth]
│   ├── Messages tab
│   ├── Calls-related UI hooks
│   └── Voice/Video call buttons in DM
├── Profile (`/profile`) [auth]
├── Settings hub (`/more`)
│   ├── → Profile
│   ├── → Identity (`/identity`)
│   ├── → Sylora AI (`/ai`)
│   ├── → Personal Dashboard (`/dashboard`)
│   ├── → Canvas (`/canvas`)
│   ├── → Agents (`/agents`)
│   ├── → Developer (`/developer`)
│   ├── → Security (`/security`)
│   ├── → Messages / Videos / Gifts / Communities / Learning / Business
│   └── → Admin (`/admin`) if role=admin
├── Sylora AI (`/ai`) [auth]
├── Gifts (`/gifts`)
├── Videos (`/videos`) — **not in primary nav** (via More / home strip)
├── Auth overlay (replaces `#app` when gated views requested logged-out)
├── Overlays / global
│   ├── Create Hub modal (`create-hub.js`)
│   ├── Command palette (`command-palette.js`)
│   ├── Gift stage (`#gift-stage`)
│   ├── Incoming call banner
│   └── Toast
└── Standalone pages
    ├── `/obs-overlay.html`
    └── `/phoenix-preview.html`
```

## Navigation surfaces

| Surface | Items | Notes |
|---------|-------|-------|
| Left primary | Home, LIVE, Clips, Studio, Science, Business, Explore, Communities | Desktop |
| Left secondary | Inbox, Profile, Settings, Create | Desktop |
| Left extras | Orbit progress, Sylora mini, Core online | Sylora → `/ai` |
| Mobile dock | Home, LIVE, Sylora, Inbox, Profile | Missing Studio/Science/Business/… (via home/settings) |
| Header | Brand→Home, ⌘K search, locale, balance→gifts, gifts, inbox, avatar→profile, logout | |
| Right rail | People, Popular LIVE, LUMEN | Hidden/collapsed on small screens |
| Home horizon | LIVE Clips Studio Create Inbox Science Business | Shortcut strip |

### Navigation issues found

- Videos reachable but not in primary nav
- Gifts reachable via header/More, not primary nav
- AI has 4+ entry points (dock, rail, home presence, More)
- Wallet not a first-class route (balance opens gifts)
- Following LIVE tab honestly empty (comment in `app.js`)
- Deep links work for SPA views via pathname; hard refresh OK if server serves `index.html` for those paths (static server behavior — verify deploy nginx)

---

## Per-view cards

### Home / Feed — `/` — nav: Home
- **Purpose:** Personal hub + social feed
- **Sees:** Greeting hero, Sylora presence, shortcut orbit, Daily Brief, Continue, Inbox preview, LIVE/People/For You/Communities/Science/Business strips, composer, posts
- **Actions:** publish, react, comment, follow, report, block, Ask Sylora, navigate strips, Create Hub
- **APIs:** `/api/feed`, `/api/live`, `/api/users`, `/api/communities`, `/api/courses`, `/api/businesses`, `/api/home/hub`, `/api/daily-brief`, `/api/posts*`
- **Works:** feed CRUD basics (JSON); navigation
- **Mock/static:** Daily Brief / recommendations shallow without rich data; AI asks blocked without key
- **UX:** dense “dashboard” home vs brand-hero guidance; many cards
- **Responsive:** mobile single column; dock may overlap long scroll (observed)
- **Readiness:** UI 70% · Functional 55%

### LIVE — `/live`
- **Tabs:** discover / following / battles / create (+ jump to studio)
- **APIs:** `/api/live`, chat, events SSE, like, resonance, platform-events, copilot, battles…
- **Works:** list/create room, chat
- **Partial:** watch WebRTC, battles, copilot
- **Blocked:** camera/TURN/SFU
- **Readiness:** UI 65% · Functional 35%

### Clips — `/clips`
- Upload form + list; media pipeline
- Empty state verified
- Readiness: UI 60% · Functional 35%

### Videos — `/videos`
- Long-form twin of clips; not in main nav
- Readiness: UI 55% · Functional 30%

### Studio — `/studio` (auth)
- Camera/screen, scenes, WebRTC broadcast, OBS/companion, record, AI plan
- Camera **BLOCKED** in audit VM
- Readiness: UI 70% · Functional 40%

### Science/Learning — `/learning`
- Courses CRUD UI, hubs, private conferences
- Paid enroll blocked without payments
- Readiness: UI 60% · Functional 35%

### Business — `/business`
- Companies, orgs, finance widgets, conferences
- Much scaffolding
- Readiness: UI 60% · Functional 30%

### Explore — `/explore`
- Search form; universal search when authed
- Semantic degraded without embeddings
- Readiness: UI 65% · Functional 45%

### Communities — `/communities`
- List/create/join/channels/posts
- Readiness: UI 60% · Functional 50%

### Inbox — `/messages` (auth)
- Conversations, composer, Voice/Video buttons
- DM **REAL** in JSON; calls PARTIAL
- Readiness: UI 70% · Functional 55%

### Profile — `/profile` (auth)
- Orbit XP, LUMEN vitals, edit form, notifications snippet, ledger snippet
- Readiness: UI 70% · Functional 55%

### More/Settings — `/more`
- Module grid launcher
- Readiness: UI 75% · Functional 40% (depends on targets)

### Identity — `/identity`
- Professional fields, privacy selects, KG nodes
- Readiness: UI 65% · Functional 45%

### Sylora AI — `/ai`
- Chat UI, memory, permissions, realtime controls, avatar presence
- **BLOCKED** without OpenAI; banner verified in screenshots
- Avatar = PNG/CSS
- Readiness: UI 70% · Backend AI 20% · Voice 15%

### Agents / Developer / Security / Dashboard / Canvas
- Surfaces exist with API wiring of varying depth
- Mostly PARTIAL scaffolding
- Readiness: UI 55–65% · Functional 25–40%

### Gifts — `/gifts`
- Catalog grid, recipient select, send
- Ledger send works; **FX runtime BROKEN**
- Readiness: UI 75% · Functional 45%

### Admin — `/admin`
- Reports + audit; admin only
- Not exercised (no admin email configured)
- Readiness: UI 50% · Functional 40% **BLOCKED** without admin user

### Auth
- Register/Login tabs in `#app`
- Working for password auth
- Missing Google/recovery/verify

---

## Proposed IA (NOT implemented)

```
Home
Live
  Discover · Room · Studio (create)
Create (hub)
Sylora (AI)
Inbox (Messages · Calls)
You
  Profile · Wallet · Gifts sent/received · Settings
Spaces (optional later)
  Communities · Learning · Business
```

Principle: one name per job; wallet ≠ gifts gallery; AI one primary entry; verticals secondary.
