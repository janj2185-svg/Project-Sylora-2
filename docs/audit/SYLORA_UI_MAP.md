# SYLORA — UI Map (Forensic, 2026-08-13)

Evidence: `public/index.html`, `public/app.js`, screenshots in `audit/screenshots/`.

## Navigation shell (persistent)

| Element | Location | Routes / actions |
|---------|----------|-------------------|
| Brand | Header | → `/` feed |
| Command palette ⌘K | Header `#globalSearch` | Search, slash commands → explore/ai/messages/etc. |
| Locale `<select>` | Header `#localeSwitch` | 14 options; **WORKING** — `setLocale()` + `PATCH /api/me` (`app.js` account()) |
| LUMEN balance ♢ | Header (authed) | → `/gifts` |
| Inbox ◌ | Header (authed) | → `/messages` |
| Avatar | Header (authed) | → `/profile` |
| Logout ↪ | Header (authed) | POST `/api/auth/logout` |
| Sign in | Header (guest) | → renderAuth() inline |
| Left rail primary | `index.html` | feed, live, clips, studio, learning, business, explore, communities |
| Left rail secondary | | messages, profile, more, create hub |
| Sylora mini | Left rail | → `/ai` |
| Right rail | | Live pulse, Sylora CTA |
| Mobile dock | Bottom | feed, live, ai, messages, profile |

Screenshots: `audit/screenshots/desktop/01_home_feed.webp`, `audit/screenshots/mobile/*.webp`

---

## SPA views (21)

### 1. Home — `/` → `feed`

| Field | Value |
|-------|-------|
| Render | `renderFeed()` |
| Purpose | Personalized home, composer, carousels |
| APIs | `/api/feed`, `/api/live`, `/api/users`, `/api/communities`, `/api/courses`, `/api/businesses`, `/api/home/hub`, `/api/daily-brief`, POST `/api/posts` |
| Auth | Browse public; composer requires login |
| Status | **PARTIAL** — feed/composer work (API verified); hub/brief need auth |
| Mock | LUMEN labeled TEST |
| Screenshot | desktop `01_home_feed.webp`, mobile `01_home_mobile.webp` |

### 2. LIVE — `/live`

| Tabs | discover, following, create, battles, studio link |
| APIs | `/api/live`, `/api/live/entertainment`, WebRTC `/api/live/rtc-config`, SSE `/api/live/:id/events` |
| Status | **PARTIAL** — room list/create verified API; WebRTC watch **BLOCKED** (no browser media test); following tab empty by design |
| Screenshot | `02_live.webp`, `02_live_mobile.webp` |

### 3. Studio — `/studio`

| Purpose | Camera, canvas, scenes, OBS/companion, go live |
| APIs | `/api/studio/scenes`, POST `/api/live`, browser-source token |
| Auth | Required |
| Status | **PARTIAL** — scenes API verified; camera/WebRTC **BLOCKED** in headless audit |
| Screenshot | `04_studio.webp` |

### 4. Clips — `/clips`

| APIs | GET `/api/videos?format=clip`, upload `/api/media/upload`, POST `/api/videos` |
| Status | **PARTIAL** — list works; upload needs file + ffmpeg |
| Screenshot | `03_clips.webp` |

### 5. Videos — `/videos`

| Nav | Feed carousel, More → Media (not in left rail) |
| Status | Same pipeline as clips — **PARTIAL** |

### 6. Explore — `/explore`

| APIs | `/api/search`, `/api/search/universal` (authed) |
| Status | **PARTIAL** — lexical search works; semantic may degrade without AI |
| Screenshot | `07_explore.webp` |

### 7. Messages — `/messages`

| Sub-tabs | messages, notifications, invites, calls, priority |
| APIs | conversations, notifications, calls, SSE `/api/events` |
| Auth | Required |
| Status | **PARTIAL** — API layer exists; WebRTC calls **BLOCKED** in audit |
| Screenshot | `09_messages.webp`, mobile `04_messages_mobile.webp` |

### 8. Sylora AI — `/ai`

| APIs | `/api/ai/history`, chat, realtime, memory, actions |
| Auth | Required |
| Avatar UI | PNG sprite + CSS visemes (`sylora-avatar-v2-base.png`, gestures) — **NOT 3D** |
| Status | **PARTIAL** — UI renders; chat **BLOCKED** (no OPENAI_API_KEY); voice **BLOCKED** |
| Screenshot | `10_ai.webp`, mobile `03_ai_mobile.webp` |

### 9. Profile — `/profile`

| APIs | `/api/me`, stats, progress, ledger, notifications; PATCH profile |
| Status | **PARTIAL** — profile CRUD verified via API |
| Screenshot | `11_profile.webp`, mobile `05_profile_mobile.webp` |

### 10. Gifts — `/gifts`

| APIs | GET `/api/gifts`, POST `/api/gifts/send` |
| Status | **PARTIAL** — send works in TEST LUMEN (API verified); WebGL gift playback depends on GPU |
| Screenshot | `12_gifts.webp` |

### 11. More (Settings hub) — `/more`

| Purpose | Grid launcher to identity, agents, developer, security, dashboard, canvas, admin, videos, gifts |
| Status | **REAL** navigation shell |
| Screenshot | `13_more.webp`, mobile `06_more_mobile.webp` |

### 12. Identity — `/identity`

| APIs | `/api/identity`, `/api/kg` |
| Auth | Required |
| Screenshot | `14_identity.webp` |

### 13. Agents — `/agents`

| APIs | `/api/agents`, install, negotiations |
| Screenshot | `15_agents.webp` |

### 14. Developer — `/developer`

| APIs | `/api/developer/apps`, keys; OAuth doc is static JSON |
| Screenshot | `16_developer.webp` |

### 15. Security — `/security`

| APIs | security-center, memory, privacy, reputation |
| Not screenshotted | Auth required; same shell as other gated views |

### 16. Dashboard — `/dashboard`

| APIs | `/api/dashboard`, `/api/ai/command` |
| Not screenshotted | |

### 17. Canvas — `/canvas`

| APIs | `/api/canvas` |
| Not screenshotted | |

### 18. Communities — `/communities`

| Sub-views | `openCommunity()`, channel posts (no URL change) |
| APIs | `/api/communities`, channels, social extensions |
| Screenshot | `08_communities.webp` |

### 19. Learning — `/learning`

| Sub-views | courses, science hub, conference WebRTC |
| APIs | courses, `/api/learning/*`, `/api/science/*`, conferences |
| Screenshot | `05_learning.webp` |

### 20. Business — `/business`

| APIs | businesses, orgs, CRM, invoices, conferences |
| Screenshot | `06_business.webp` |

### 21. Admin — `/admin`

| Access | `role === 'admin'` only |
| APIs | `/api/admin/reports`, audit |
| Not screenshotted | Requires admin account |

---

## Standalone pages (not SPA views)

| Page | URL | Purpose | Status |
|------|-----|---------|--------|
| Phoenix preview | `/phoenix-preview.html` | Gift V2 cinematic demo | **REAL** client-only WebGL |
| OBS overlay | `/obs-overlay.html?token=` | Stream overlay SSE | **PARTIAL** — needs valid token |

---

## Auth gate (inline, no route)

| Render | `renderAuth()` |
| Forms | Register (username, email, password) / Login (identity, password) |
| APIs | POST `/api/auth/register`, `/api/auth/login` |
| Google | **MISSING** — no UI button |
| Recovery | **MISSING** |
| Status | **REAL** — register/login verified API + runtime |

---

## Visual tree (actual product IA)

```
SYLORA
├── Home (/)
├── LIVE (/live)
│   ├── Discover
│   ├── Following [empty state]
│   ├── Create stream
│   ├── Battles
│   └── → Studio (/studio)
├── Clips (/clips)
├── Studio (/studio)
├── Science & Learning (/learning)
│   ├── Courses [inline]
│   └── Science conference [inline WebRTC]
├── Business (/business)
│   ├── Company directory
│   ├── Org workspace [inline]
│   └── Business conference [inline]
├── Discover (/explore)
├── Communities (/communities)
│   └── Channel view [inline]
├── Inbox (/messages)
│   ├── Messages / Notifications / Invites / Calls / Priority
│   └── Call session [inline WebRTC]
├── Sylora AI (/ai)
├── Profile (/profile)
├── Gifts (/gifts) [header shortcut]
├── Videos (/videos) [hidden nav]
├── Settings hub (/more)
│   ├── Identity (/identity)
│   ├── Agents (/agents)
│   ├── Developer (/developer)
│   ├── Security (/security)
│   ├── Dashboard (/dashboard)
│   ├── Canvas (/canvas)
│   └── Admin (/admin) [role gate]
├── Create Hub [modal overlay]
└── Command palette [modal overlay]
```

---

## Responsive notes (screenshot audit)

| Viewport | Score | Notes |
|----------|-------|-------|
| Desktop 1440×900 | 72/100 | Sidebar + content OK; 11 CSS files load |
| Mobile 390×844 | 68/100 | Bottom dock works; hero sections tall |
| Tablet | Not captured | Same CSS breakpoints in `modules.css` — **NOT VERIFIED** |

## Console / network (verified vs false positives)

| Issue | Verified? |
|-------|-----------|
| favicon.ico 404 | **YES** — no favicon in public/ |
| AI degraded banner | **YES** — without OPENAI_API_KEY |
| `owmWeather` / `getThree` ReferenceError | **NOT IN CODEBASE** — false positive in interim agent report; not reproduced via static analysis |
| Three.js bare `from 'three'` in vendor addons | Mitigated by importmap in index.html; gift-gpu uses relative paths |
