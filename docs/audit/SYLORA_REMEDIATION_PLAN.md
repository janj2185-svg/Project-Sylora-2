# SYLORA — Remediation Plan

**Status:** plan only. **Do not implement from this document until the next task.**  
**Audited:** 2026-08-13.

Columns: PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE CRITERIA

---

## Phase 0 — P0 blockers (cannot honestly launch)

| PRIORITY | PROBLEM | FILES/MODULES | ACTION | DEPENDENCIES | ACCEPTANCE |
|---|---|---|---|---|---|
| P0 | Production ready lies in development and is untested in production mode | `src/server.mjs` `dependencyHealth` | Run compose with PG+Redis; prove `/api/ready` in `NODE_ENV=production` | Docker host | ready=true only with live PG+Redis; fail closed documented |
| P0 | Persistence split-brain JSON vs Postgres | `store.mjs`, `server.mjs`, `repositories/*` | Choose Postgres as prod SoT; JSON local-only | migrations 002–012 applied | one store per domain; integration test with real PG |
| P0 | No CI | (missing `.github`) | Add test+syntax+docker-build workflow | GitHub | PR cannot merge on red `npm test` |
| P0 | Gift JSON path not idempotent | `src/server.mjs` send gift | Require idempotency key on all paths | wallet | double POST same key = one debit |
| P0 | Unauthenticated gift SSE | `src/server.mjs`, `public/app.js` | Auth the stream or drop PII from events | session | unauth 401; screenshots no longer hang forever |
| P0 | No account recovery | (missing routes) | Implement reset **or** refuse public signup | email provider | user can recover password E2E |
| P0 | Delete account does not delete | `trust.mjs`, privacy routes | Implement deletion job | SoT store | user gone from auth+content+wallet |

---

## Phase 1 — Architecture & foundations

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | Dual path `authSocial.enabled ? pg : json` copied everywhere | `server.mjs` | Repository interface, one implementation per env | Phase 0 SoT | no `store.data.x` in HTTP handlers for shipped domains |
| P1 | Ecosystem in-memory vs schema tables unused | `schema.sql`, communities/courses | Either migrate runtime to PG or hide UI | SoT | no orphan tables |
| P1 | 12 CSS layers | `public/*.css` | One token file + one app CSS | design freeze | visual parity on Home/LIVE/AI/Inbox |
| P1 | Giant `app.js` | `public/app.js` | Split by view (no feature work) | tests | each view module < reasonable size; no behavior change |
| P1 | Env name mismatch payments | `integrations.mjs`, `.env.example` | One name | — | documented |
| P1 | OAuth 404 advertised | `developer-platform.mjs` | Remove endpoints from API payload until real | — | `/developer` does not list 404 URLs |
| P1 | Nav active state | `app.js` `bootstrap`/`nav` | Sync `.active` from `viewFromPathname` | — | deep link `/live` highlights LIVE |
| P1 | Proposed IA | `index.html`, i18n | Redesign nav (later implementation) | product | see below |

**Proposed information architecture (do not build yet):**

```
Home
LIVE (Discover / Following real / Create)
Create → Studio
Sylora
Inbox (Messages / Notifications / Calls)
Search
Profile (includes wallet summary)
More → Account, Privacy & Security, Language, Admin
```

Park behind “Labs” or remove from nav: Agents, Developer, Canvas, Dashboard, Business OS, Science tools, Identity KG, Gift V2 playground.

---

## Phase 2 — Core user flows

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | No onboarding UI | `app.js`, `/api/onboarding` | 1–2 step after register | auth | new user sees home with one clear next action |
| P1 | Following LIVE empty | `renderLive()` | Filter rooms by follows | follow graph | tab not hardcoded [] |
| P1 | Inbox empty UX | `renderMessages` | Show real conversations after create | DM API | send+receive in UI |
| P1 | Home duplicated Discovery cards | home hub render | One empty state | — | screenshot no 4 identical cards |
| P2 | Share | missing | skip or implement later | — | no dead share button |
| P1 | Guest vs authed walls consistent | gated views | already mostly auth walls | — | studio/ai/messages stay gated |

---

## Phase 3 — Sylora AI / avatar

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | UI claims gpt-5.6 while provider none | `renderAI` | Bind label to `/api/ai/capabilities` | — | no model name if blocked |
| P1 | `/api/ai/ask` mock looks like AI | `routes.mjs` | Fail closed or label loudly in UI | — | no silent echo as “answer” |
| P1 | Chat 503 | OpenAI key **or** hide composer | Honest | key | either real stream or disabled send |
| P2 | Memory is flat notes | `postgres-ai`, living-sylora | Keep confirm-gated; don’t claim personality OS | — | |
| P2 | Avatar is PNG | `design-avatar-assembled.css` | Keep 2.5D; document NOT 3D | — | no “digital human 3D” copy |
| P2 | Voice | realtime SDP | Only enable with key+TURN/mic | OpenAI realtime | BLOCKED until then |
| P3 | Live co-host | `/api/live/:id/copilot` | After chat works | AI+LIVE | |

**Targets after phase (not current):** AI UI 70%, backend 50%, voice 30%, memory 40%, co-host 20%.

---

## Phase 4 — Live / social / creator

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | No TURN | `rtc-config.mjs` | Configure `SYLORA_ICE_SERVERS_JSON` | TURN service | `turnConfigured: true` + 2-browser watch |
| P1 | P2P 6-peer cap | `STUDIO_P2P_PEER_LIMIT` | Honest UI cap; SFU later | — | viewer 7 sees waitlist not black video |
| P1 | Camera path untested | `renderStudio` | Manual test matrix | hardware | start preview, mute, go live, viewer sees |
| P2 | OBS | companion | Keep local-only | — | |
| P2 | Battles | entertainment module | After watch works | LIVE media | |
| P2 | Conferences dual functions | `openConferenceRoom*` | Keep RTC only | — | |

---

## Phase 5 — Monetization

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | Two gift catalogs | `store.mjs`, `gift-v2/catalog.js` | One ID list | — | send any UI id succeeds |
| P1 | Gift playback broken | `gift-gpu-engine.js` addons `from 'three'` | Fix import map **or** canvas-only | — | send spark plays without console TypeError |
| P1 | TEST LUMEN only | wallet | Keep sandbox label until PSP | — | no “buy” that pretends |
| P2 | Commerce sandbox | `commerce.mjs` | Hide production checkout | — | |
| P2 | Paid courses | enroll 409 | Honest paywall | PSP | |

---

## Phase 6 — Responsive / design consistency

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | Tablet 768 empty main + icon rail | CSS breakpoints 720/760/980 | Content must remain visible | — | screenshot 768×1024 shows feed |
| P1 | Mobile overflow under dock | `styles` / hub | padding-bottom safe area | — | composer not under dock |
| P2 | Touch targets | dock/settings | ≥44px | — | |
| P2 | Light futuristic vs dark video | live video `#080b18` | contain dark to player only | — | rest stays light |

Scores to beat: Mobile 42→70, Tablet 28→70, Desktop 68→80.

---

## Phase 7 — Security / performance / testing

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P1 | IDOR unknown | ecosystem routes | authz tests per resource | — | cannot read others’ invoices/orgs |
| P1 | 45MB PNGs | `public/assets` | delete unused after inventory | duplication report | LCP < 3s home |
| P1 | No E2E | missing | Playwright: register, post, gift, live create | CI | 5 journeys |
| P2 | `node --check` as lint | package.json | real eslint or drop the name | — | |
| P2 | XSS stored | chat/posts | server-side sanitize or keep esc + CSP | — | |
| P2 | Rate limit memory | server | Redis required in prod (already) | Phase 0 | |

---

## Phase 8 — Production readiness

| PRIORITY | PROBLEM | FILES | ACTION | DEPS | ACCEPTANCE |
|---|---|---|---|---|---|
| P0 | No backups | infra | pg dump + media | PG | restore drill |
| P1 | No metrics/tracing | observability.mjs | one exporter | — | health + error rate |
| P1 | Hetzner SSH pending | DEPLOY-HETZNER | secrets in vault | human | one successful deploy+rollback |
| P1 | CDN / TLS | nginx example | terminate TLS, cache assets | DNS | HTTPS + HSTS after |
| P2 | DR runbook | missing | write + test | backups | |

---

## Order of maximum readiness gain (top 10)

1. Postgres+Redis+production ready proven  
2. Password reset or closed signup  
3. Gift catalog + playback one path  
4. Hide unfinished IA (Business OS, Agents, OAuth, Canvas)  
5. Nav + Following + Inbox actually usable  
6. TURN + two-browser LIVE  
7. AI: hide or key + stop mock ask  
8. CI + Playwright 5 flows  
9. Tablet/mobile layout  
10. Account deletion + backups  

Do **not** add new products (more science tools, more agents, more gifts) until these land.
