# SYLORA — Full UI Map

**Audited:** 2026-08-13  
**Shell:** `public/index.html` + `public/app.js`  
**Screenshots:** `audit/screenshots/desktop/`, `audit/screenshots/mobile/`  
**Note:** Some mobile captures were taken while logged out (auth gates); treat labels cautiously and cross-check routes.

## Navigation chrome

### Left rail (`index.html`)
Home(`feed`), LIVE, Clips, Studio, Наука(`learning`), Бізнес(`business`), Відкриття(`explore`), Спільноти(`communities`), Inbox(`messages`), Профіль(`profile`), Налаштування(`more`), Створити(Create Hub), Sylora mini→`ai`

### Mobile dock
Home, LIVE, Sylora(`ai`), Inbox, Профіль — CSS show `@media(max-width:720px)` in `design-consolidation.css`

### Header
Brand→feed, Command search (⌘K), locale select, LUMEN balance→`gifts` (TEST), gifts icon, inbox, avatar→profile, logout / Sign in

### Right rail
People suggestions, Popular LIVE, LUMEN card, AI rail CTA (overwritten by `refreshRightRail`)

---

## Page inventory

### 1. Home — `/` (`feed`)
- **Nav:** left/mobile Home  
- **Purpose:** personal ecosystem hub + composer/feed strips  
- **Sees:** living-horizon hero, Sylora presence, quick actions, Daily Brief/Continue/Inbox, LIVE/people/for-you/communities/science/business carousels  
- **Components:** `.living-horizon`, `.eco-strip`, composer, posts (legacy bind)  
- **Actions:** navigate modules, publish post, open AI/Create Hub  
- **API:** `/api/home/hub`, `/api/feed`, `/api/live`, `/api/users`, `/api/progress`, `/api/daily-brief`  
- **Works:** hub render, guest+authed screens (`desktop/01`, `03`)  
- **Mock/static:** recommendations often thin; empty states honest  
- **Readiness:** UI ~75% · Functional ~45%

### 2. Auth — inline (no dedicated route)
- **Trigger:** Sign in / gated views  
- **Sees:** SYLORA ID register/login tabs  
- **API:** `/api/auth/register|login`  
- **Works:** REAL local auth (`desktop/02-auth.png`)  
- **Missing:** Google, phone, recovery, email verify  
- **Readiness:** 70%

### 3. LIVE — `/live`
- **Tabs:** discover · following · create · battles · studio  
- **Purpose:** discovery + go-live + watch/chat  
- **API:** `/api/live`, `/api/live/:id/*`, `/api/live/entertainment`, `/api/live/battles`, gifts  
- **Works:** list/create/chat APIs; UI tabs (`desktop/04`, `05`)  
- **Partial:** WebRTC media, TURN, battles  
- **Fake-risk:** Following tab empty by design (no following-hosts API)  
- **Readiness:** UI 70 · Func 35

### 4. Studio — `/studio` (auth)
- **Sees:** Creator view canvas, sources, mixer, scenes, OBS, broadcast  
- **API:** `/api/live`, `/api/studio/scenes`, browser-source, AI plan endpoints  
- **Works:** UI shell (`desktop/07-studio.png`)  
- **Blocked:** camera/OBS not verified here  
- **Readiness:** UI 65 · Func 30

### 5. Clips — `/clips` · Videos — `/videos`
- **Purpose:** short/long video hubs + uploaders  
- **API:** `/api/media/upload`, `/api/videos`, transcode jobs  
- **Works:** UI empty states (`desktop/06`, `24`)  
- **Partial:** upload pipeline needs manual media test  
- **Readiness:** UI 55 · Func 35

### 6. Explore — `/explore`
- Universal search form  
- **API:** `/api/search`, `/api/search/universal`  
- **Partial:** lexical OK; embeddings blocked  
- **Screenshot:** `desktop/10-explore.png`

### 7. Communities — `/communities`
- Create/join/channels UI  
- **API:** `/api/communities*`  
- **Partial** JSON runtime  
- **Screenshot:** `desktop/17-communities.png`

### 8. Learning / Science — `/learning`
- Hub + courses + researchers + private science conferences  
- **API:** `/api/learning/hub`, `/api/courses*`, `/api/conferences?kind=science`, tutor/flashcards…  
- **Static/Partial:** hub metadata; tutor session stub without model  
- **Screenshot:** `desktop/08-learning.png`

### 9. Business — `/business`
- Workspace hub + private business conferences + finance UI  
- **API:** `/api/business/hub`, invoices/CRM/quotes…  
- **Placeholder:** empty lists; country adapters `architecture_stub`  
- **Screenshot:** `desktop/09-business.png`

### 10. Inbox — `/messages` (auth)
- **Tabs:** messages · notifications · invites · calls · priority  
- **API:** conversations, notifications, conference-invites, calls  
- **Works:** DM API; UI shell (`desktop/11-messages.png`)  
- **Partial:** calls media, intelligent inbox  
- **Readiness:** UI 70 · Func 55

### 11. Sylora AI — `/ai` (auth)
- Portrait/avatar layers, chat, command center, dictate, realtime, memory controls  
- **API:** `/api/ai/*`, capabilities  
- **Blocked:** provider (`desktop/12-ai.png`, `13-ai-test.png`)  
- **Avatar:** CSS/PNG assembled — not 3D human  
- **Readiness:** UI 55 · Backend 15

### 12. Profile — `/profile` (auth)
- Orbit level, vitals, edit form, ledger/notifications  
- **API:** `/api/me`, `/api/stats`, `/api/ledger`, `/api/notifications`, `/api/progress`  
- **Works:** edit + stats UI (`desktop/14-profile.png`)  
- **Duplicate:** `renderProfileLegacy` dead code

### 13. Gifts — `/gifts`
- Constellation catalog, recipient select, send  
- **API:** `/api/gifts`, `/api/gifts/send`, stream SSE  
- **Works:** transactional send in TEST LUMEN  
- **Broken/Partial:** V2 catalog export; cinematic runtime errors  
- **Screenshots:** `desktop/15`, `25–27`; `mobile/08-gifts.png`  
- **Readiness:** tx 70 · VFX 35

### 14. More / Settings — `/more`
- Module grid to secondary screens  
- **Screenshot:** `desktop/16-more.png`  
- **Note:** several mobile files appear to capture this hub while mislabeled

### 15. Identity — `/identity` (auth)
- Digital identity / privacy levels UI  
- **API:** `/api/identity`  
- **Screenshot:** `desktop/18-identity.png`  
- **Partial**

### 16. Agents — `/agents` (auth)
- Marketplace install UI  
- **API:** `/api/agents*`  
- **Screenshot:** `desktop/20-agents.png`  
- **Partial**

### 17. Developer — `/developer` (auth)
- Apps/API keys sandbox UI  
- **API:** `/api/developer/apps*`  
- **Screenshot:** `desktop/21-developer.png`  
- **Placeholder** OAuth advertised

### 18. Security Center — `/security` (auth)
- Privacy requests, reputation, export controls UI  
- **API:** `/api/security-center`, privacy endpoints  
- **Screenshot:** `desktop/22-security.png`  
- **Partial**

### 19. Personal Dashboard — `/dashboard` (auth)
- Today/tasks/goals/brief  
- **API:** `/api/dashboard`, tasks/goals/daily-brief  
- **Screenshot:** `desktop/19-dashboard.png`  
- **Partial**

### 20. Canvas — `/canvas` (auth)
- AI workspace UI  
- **API:** `/api/canvas`  
- **Screenshot:** `desktop/23-canvas.png`  
- **Partial/Static**

### 21. Admin — `/admin`
- Reports/audit if `role==='admin'` / allowlist emails  
- Else redirect `more`  
- **Partial**

### 22. Secondary HTML
- `/obs-overlay.html` — OBS browser source  
- `/phoenix-preview.html` — gift preview lab  

---

## Button / interaction audit (critical)

| Action | Status | Evidence |
|---|---|---|
| Register | WORKING | API+UI |
| Login | WORKING | API+UI |
| Logout | WORKING | API afterLogout 401 |
| Google auth | MISSING | 404 |
| Profile edit | WORKING | PATCH /api/me |
| Follow / Like post / Comment | WORKING | journey |
| Share | NO ACTION / unclear | no dedicated share API found |
| Notifications | PARTIAL | list API |
| Messages send | WORKING | journey |
| Calls / video calls | PARTIAL | call created; media BLOCKED |
| Camera / mic (Studio) | BLOCKED | needs device perms |
| Start/join LIVE | PARTIAL | room+signaling; media TURN blocked |
| Gifts send | WORKING (TEST) | balance debit |
| Gift VFX | BROKEN/PARTIAL | runtime import issues |
| Wallet top-up / payments | MISSING | 404 |
| Language selector | PARTIAL | UI many langs; server locale subset |
| Settings modules | WORKING nav | routes open |
| AI chat | BLOCKED | 503 |
| AI voice | BLOCKED | no key |

---

## Responsive notes

| Viewport | Evidence | Issues |
|---|---|---|
| Desktop ~1280–1440 | many `desktop/*.png` | 3-column shell OK; right rail dense |
| Mobile 390 / 360 | `mobile/01–11` | dock present; left rail hidden via CSS; some captures show logged-out auth; gift price inconsistency visual vs store for Infinity/Portal in one capture description |
| Tablet 768 | `mobile/tablet-*.png` | intermediate layout; settings-heavy captures |

**Scores (audit judgment):** Mobile UI **62/100** · Tablet UI **58/100** · Desktop UI **74/100**

## Design system audit (short)

- **Intended:** light futuristic / premium living-horizon (warm light, glass, portrait).  
- **Conflict:** base `styles.css` still Inter + violet/cyan dashboard tokens; 12 CSS files stacked → era collision.  
- **Cards:** heavily used (contrary to “no cards” product taste, but established system).  
- **Avatar:** PNG plates + CSS motion, not unified 3D.  
- **Accessibility:** partial labels/ARIA; many icon-only controls; contrast generally OK on light UI; reduced-motion considered in gift runtime detect.

## Navigation IA problems

1. Too many top-level items (Science/Business/Communities/Explore compete with Home).  
2. Gifts demoted from left rail but wallet CTA still prominent.  
3. AI entry duplicated (dock, mini, right rail, More, calls).  
4. Inbox mixes DMs/notifications/calls/invites — good consolidation, but Profile also shows notifications.  
5. `/more` is a second sitemap (Identity/Agents/Developer/Security/Dashboard/Canvas).  
6. Dead legacy: `renderProfileLegacy`.  
7. Studio reachable from LIVE tab + left rail + Create Hub.

### Proposed IA (DO NOT IMPLEMENT YET)

1. **Home**  
2. **Create** (Studio/Live/Clips)  
3. **LIVE**  
4. **Inbox** (messages/calls/notifications)  
5. **Sylora** (AI)  
6. **You** (profile/wallet/gifts/settings)  
7. Secondary hubs under You or Home strips: Learn, Business, Communities, Explore, Developer
