# Project-Sylora-2 — Screenshot Index

Captured from a **locally running** build (`http://127.0.0.1:8787`, JSON-dev persistence, seeded demo users).  
Not mocks, not Figma, not generated concept art.

**Capture date:** 2026-08-11  
**Server:** `node src/server.mjs` · `PORT=8787` · `DATABASE_URL=` · `REDIS_URL=`  
**Demo users:** `demo@sylora.test` (admin) / `peer@sylora.test`  
**Viewports:** mobile `390×844` · tablet `820×1180` · desktop `1440×900`

### Status legend
| Status | Meaning |
|---|---|
| **WORKING** | Real UI + real API path; usable for the intended job in this build |
| **PARTIAL** | UI/hub exists; depth incomplete, API toast-only, or setup_required |
| **PLACEHOLDER** | Entry/CTA only; no dedicated polished workspace page |
| **BROKEN** | Captured path failed or UI unusable |

### Visual QA fixes applied during capture
- Soft client logout for auth shot (server logout was invalidating tokens for later suites)
- Honest AI banner: `setup_required (set OPENAI_API_KEY)` instead of “temporarily unavailable”
- Deduped Home feed/carousel cards and AI memory labels
- Tablet shell: forced `main` CSS grid (`72px + 1fr`) — was `display:block` ≤820px (rail-only)
- Incoming-call banner flex so title/`@user` no longer collapses
- Import map for `three/addons/`
- Screenshot harness: `window.__syloraNav` / `__syloraShowIncoming`

---

## Mobile (`artifacts/screenshots/mobile/`)

| FILE | SCREEN | ROUTE / VIEW | VIEWPORT | STATUS | NOTES |
|---|---|---|---|---|---|
| 01-home.png | Home | `feed` | 390×844 | WORKING | Living Horizon + Daily Brief; AI banner setup_required |
| 02-discover.png | Discover / Universal Search | `explore` | 390×844 | WORKING | Search form; universal domains listed |
| 03-live.png | LIVE Discover | `live` tab=discover | 390×844 | WORKING | 2 seeded rooms; Entertainment Engine readout |
| 04-live-room.png | LIVE Room | `live` → Watch | 390×844 | PARTIAL | WebRTC viewer WAITING FOR HOST; battle meter if active |
| 05-gifts-panel-live.png | Gifts panel (LIVE) | LIVE gift tray | 390×844 | WORKING | Gift tray open in room |
| 06-resonance-battle.png | Resonance Battle | LIVE room battle UI | 390×844 | PARTIAL | Score panel present; needs two hosts for full fight |
| 07-create-live.png | Create LIVE | `live` tab=create | 390×844 | WORKING | Title + go-live + event fields |
| 08-resonance-battles-tab.png | Resonance Battles | `live` tab=battles | 390×844 | PARTIAL | Lists battle-capable rooms |
| 09-live-following.png | LIVE Following | `live` tab=following | 390×844 | PARTIAL | Honest empty — no follow-hosts API |
| 10-gifts.png | Gifts panel / constellation | `gifts` | 390×844 | WORKING | Catalog + LUMEN TEST balance |
| 11-creator-studio.png | Creator Studio | `studio` | 390×844 | PARTIAL | Full studio controls; OBS/companion local-only |
| 12-clips.png | Clips / Video (clips) | `clips` | 390×844 | PARTIAL | Upload path; empty library OK |
| 13-videos.png | Clips / Video (long) | `videos` | 390×844 | PARTIAL | Long-form hub; empty OK |
| 14-sylora-ai.png | Sylora AI | `ai` | 390×844 | PARTIAL | UI WORKING; chat disabled without OPENAI_API_KEY |
| 15-sylora-voice-settings-toggle.png | Sylora Voice controls | `ai` voice toolbar | 390×844 | PARTIAL | TTS toggle / realtime CTA; voice needs key+mic |
| 16-inbox.png | Inbox | `messages` tab=messages | 390×844 | WORKING | Conversations list |
| 17-private-chat.png | Private Chat | conversation open | 390×844 | WORKING | DM + Voice/Video buttons |
| 18-notifications.png | Notifications | inbox tab | 390×844 | WORKING | Notification list |
| 19-inbox-calls.png | Voice/Video call entry | inbox Calls | 390×844 | WORKING | Start voice/video/Sylora call |
| 20-inbox-invites.png | Invites | inbox Invites | 390×844 | PARTIAL | Empty/honest; links to Business/Science |
| 21-inbox-priority.png | Priority inbox | inbox Priority | 390×844 | PARTIAL | Intelligent inbox buckets when available |
| 22-communities.png | Communities | `communities` | 390×844 | WORKING | List + fun rooms CTAs |
| 23-community-page.png | Community page | community open | 390×844 | WORKING | Channels + post form |
| 24-business.png | Business | `business` | 390×844 | PARTIAL | Hub + orgs + finance CTAs |
| 25-business-dashboard.png | Business Dashboard | org workspace | 390×844 | PARTIAL | Teams/docs/tasks panels |
| 26-business-hub.png | Business hub | `business` top | 390×844 | PARTIAL | Country adapter + invoice/CRM CTAs |
| 27-learning-science.png | Learning / Science hub | `learning` | 390×844 | PARTIAL | Tutor/tools CTAs + courses |
| 28-course.png | Course | course open | 390×844 | WORKING | Enrollment/progress |
| 29-lesson.png | Lesson | course lesson | 390×844 | WORKING | Lesson body + complete |
| 30-quiz-test.png | Quiz / Test | lesson quiz | 390×844 | WORKING | Shared quiz engine attempt UI |
| 31-science.png | Science | `learning` | 390×844 | PARTIAL | Same hub (Science nav label) |
| 32-science-tools-hub.png | Science tools | learning tools row | 390×844 | PARTIAL | Experiment/calc/stats/circle CTAs |
| 33-conference.png | Conference | conference hub | 390×844 | PARTIAL | Private rooms list/create |
| 34-universal-search-results.png | Universal Search results | `explore` + query | 390×844 | WORKING | Multi-domain results |
| 35-profile.png | Profile | `profile` | 390×844 | WORKING | Orbit + vitals |
| 36-edit-profile.png | Edit Profile | profile form | 390×844 | WORKING | Name/bio/locale |
| 37-settings.png | Settings | `more` | 390×844 | WORKING | Module grid |
| 38-privacy-ai-control.png | Privacy & AI Control | `security` | 390×844 | WORKING | Privacy toggles |
| 39-memory-center.png | Memory Center | security section | 390×844 | WORKING | Categories + edit/delete |
| 40-security.png | Security | `security` | 390×844 | WORKING | Trust center / export |
| 41-identity.png | Identity | `identity` | 390×844 | WORKING | Privacy fields + KG |
| 42-personal-dashboard.png | Personal Dashboard | `dashboard` | 390×844 | PARTIAL | Today/tasks brief |
| 43-sylora-canvas.png | Sylora Canvas | `canvas` | 390×844 | PARTIAL | AI workspace shell |
| 44-agents.png | Agent Marketplace | `agents` | 390×844 | PARTIAL | Install/permissions |
| 45-developer.png | Developer Platform | `developer` | 390×844 | PARTIAL | Apps/keys sandbox |
| 46-language-settings.png | Language Settings | `#localeSwitch` | 390×844 | PARTIAL | Header select (hidden CSS on narrow; expanded for shot) |
| 47-wallet-earnings.png | Wallet / Earnings | `gifts` / profile vitals | 390×844 | WORKING | LUMEN TEST / DEMO |
| 48-admin.png | Admin | `admin` | 390×844 | WORKING | Moderation console (admin email) |
| 49-auth.png | Auth | profile logged-out | 390×844 | WORKING | Register/login |
| 50-home-full.png | Home (full page) | `feed` | 390×844 full | WORKING | Long-scroll audit |
| 51-business-full.png | Business (full) | `business` | full | PARTIAL | Full hub content |
| 52-learning-full.png | Learning (full) | `learning` | full | PARTIAL | Full hub content |
| 53-settings-full.png | Settings (full) | `more` | full | WORKING | Full module grid |
| 54-clients-crm.png | Clients / CRM | business hub after CRM API | 390×844 | PARTIAL | No dedicated CRM page — hub CTA/API |
| 55-quotes-estimates.png | Quotes / Estimates | `#bizQuote` | 390×844 | PARTIAL | Draft via API/toast; hub UI |
| 56-projects-tasks.png | Projects / Tasks | org workspace | 390×844 | PARTIAL | Teams/docs/tasks panels |
| 57-accounting-finance.png | Accounting / Finance | finance ask CTA | 390×844 | PARTIAL | Assistant confirm-before-send; not a bank |
| 58-sylora-tutor.png | Sylora Tutor | `#startTutor` | 390×844 | PARTIAL | Session created; no separate tutor stage page |
| 59-dataset-workspace.png | Dataset Workspace | science dataset CTA | 390×844 | PLACEHOLDER | API workspace; no full editor page |
| 60-formula-statistics.png | Formula / Statistics | formula CTA | 390×844 | PLACEHOLDER | API toast + hub |
| 61-research-library.png | Research Library | library CTA | 390×844 | PLACEHOLDER | Item create; no paper reader route |
| 62-science-circles.png | Science Circles | circle CTA | 390×844 | PARTIAL | Circle create + conference primitives |
| 63-conference-room.png | Conference room | conference open | 390×844 | WORKING | Stage + camera/mic/Sylora controls |
| 64-group-chat-community-channel.png | Group Chat | community `#general` | 390×844 | WORKING | Channel thread (community, not DM group-RTC) |
| 65-business-contracts-legal-hub.png | Contracts / Legal | business hub | 390×844 | PLACEHOLDER | Docs CTA; legal disclaimers in API layer |
| 66-teacher-student-workspace-hub.png | Teacher / Student Workspace | learning hub | 390×844 | PLACEHOLDER | No separate teacher/student shells |
| 67-paper-reader-research-hub.png | Paper Reader | library hub | 390×844 | PLACEHOLDER | No dedicated reader page yet |

**Not found as dedicated UI routes (honest):** Business Calendar, Expenses ledger page, full Accounting suite, Study Room stage, Research Project page, separate Teacher/Student apps. Exposed as hub CTAs / APIs → marked PLACEHOLDER/PARTIAL above.

---

## Tablet (`artifacts/screenshots/tablet/`)

| FILE | SCREEN | ROUTE | VIEWPORT | STATUS | NOTES |
|---|---|---|---|---|---|
| 01-feed.png | Home | `feed` | 820×1180 | WORKING | After tablet grid fix (rail 72px + content) |
| 02-live.png | LIVE | `live` | 820×1180 | WORKING | |
| 03-ai.png | Sylora | `ai` | 820×1180 | PARTIAL | AI key required for chat |
| 04-messages.png | Inbox | `messages` | 820×1180 | WORKING | |
| 05-business.png | Business | `business` | 820×1180 | PARTIAL | |
| 06-learning.png | Learning | `learning` | 820×1180 | PARTIAL | |
| 07-profile.png | Profile | `profile` | 820×1180 | WORKING | |
| 08-science.png | Science | `learning` | 820×1180 | PARTIAL | Same view as Learning hub |

---

## Desktop (`artifacts/screenshots/desktop/`)

| FILE | SCREEN | ROUTE | VIEWPORT | STATUS | NOTES |
|---|---|---|---|---|---|
| 01-feed.png | Home | `feed` | 1440×900 | WORKING | Left rail + right rail — not stretched mobile |
| 02-explore.png | Discover | `explore` | 1440×900 | WORKING | |
| 03-live.png | LIVE | `live` | 1440×900 | WORKING | |
| 04-studio.png | Creator Studio | `studio` | 1440×900 | PARTIAL | Multi-column studio |
| 05-ai.png | Sylora | `ai` | 1440×900 | PARTIAL | setup_required for model calls |
| 06-messages.png | Inbox | `messages` | 1440×900 | WORKING | Split conversation layout |
| 07-business.png | Business | `business` | 1440×900 | PARTIAL | |
| 08-learning.png | Learning | `learning` | 1440×900 | PARTIAL | |
| 09-profile.png | Profile | `profile` | 1440×900 | WORKING | |
| 10-science.png | Science | `learning` | 1440×900 | PARTIAL | |

---

## Interaction states (`artifacts/screenshots/states/`)

| FILE | SCREEN | ROUTE / STATE | VIEWPORT | STATUS | NOTES |
|---|---|---|---|---|---|
| 01-universal-create-menu.png | Universal Create | Create Hub overlay | 390×844 | WORKING | 9 real actions |
| 01b-universal-create-menu-viewport.png | Universal Create (viewport) | Create Hub | 390×844 | WORKING | Full frame with dock |
| 02-live-gift-panel.png | LIVE gift panel | room gift tray | 390×844 | WORKING | |
| 03-battle.png | Battle | resonance panel | 390×844 | PARTIAL | Panel/scores; multi-host fight incomplete |
| 04-incoming-call.png | Incoming call | Call Engine banner | 390×844 | WORKING | Accept/Decline + @demohost |
| 05-active-voice-call.png | Active voice call | `openCallSession` | 390×844 | PARTIAL | WebRTC signaling; TURN not configured |
| 06-active-video-call.png | Active video call | video session | 390×844 | PARTIAL | Fake media devices in headless |
| 07-sylora-listening.png | Sylora listening | `ai` presence | 390×844 | PARTIAL | Presence state UI (no live STT without key) |
| 08-sylora-speaking.png | Sylora speaking | `ai` presence | 390×844 | PARTIAL | Presence state UI |
| 09-language-selector.png | Language selector | profile locale | 390×844 | WORKING | |
| 10-voice-selector.png | Voice selector | AI voice toolbar | 390×844 | PARTIAL | Toggle + realtime CTA |
| 11-notification-center.png | Notification center | inbox notifications | 390×844 | WORKING | |
| 12-invoice-creation.png | Invoice creation | `#bizInvoice` | 390×844 | PARTIAL | Draft invoice via API; hub refresh |
| 13-study-focus-timer.png | Study / Focus Timer | `#focusStudy` | 390×844 | PARTIAL | Server Focus 25/5; no full timer stage page |
| 14-command-palette.png | Universal Search / ⌘K | command palette | 390×844 | WORKING | |

---

## Route audit extras (implemented views beyond the 59-item list)

Captured via Settings modules / nav: **Identity**, **Personal Dashboard**, **Canvas**, **Agents**, **Developer**, **Auth**, **Admin**, **Videos**, **Gifts**, **Priority Inbox**, **LIVE Following**, **Create LIVE**, **Conference room**, **Command palette**.

---

## How to re-run

```bash
DATABASE_URL= REDIS_URL= PORT=8787 SYLORA_DATA_FILE=./data/sylora-screenshots.json \
  SYLORA_ADMIN_EMAILS=demo@sylora.test node src/server.mjs
node scripts/seed-screenshot-demo.mjs
node scripts/capture-screenshots.mjs
# if interrupted:
node scripts/capture-screenshots-resume.mjs
```
