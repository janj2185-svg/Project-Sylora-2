# SYLORA — Duplication Report

**Audit date:** 2026-08-13  
**Rule:** A → duplicates B → keep → remove/merge (recommendation only; **nothing deleted** during audit).

---

## 1. Pages / IA duplication

| A | Duplicates B | Keep | Remove / merge |
|---|--------------|------|----------------|
| `/profile` wallet + LUMEN | Header TEST balance + right-rail “Мій LUMEN” + `/gifts` economy | One **Wallet** surface (profile subsection or dedicated) | Stop repeating balance in 3 chrome locations as separate “features” |
| `/more` “Акаунт і профіль” | `/profile` | `/profile` as account home | `/more` stays launcher only |
| `/identity` professional fields | `/profile` displayName/bio | Split clearly: Profile = social; Identity = KG/privacy | Merge overlapping name/bio editors |
| LIVE hub “Studio” tab | `/studio` route | Single Studio entry | Tab should deep-link only, not fork UX |
| Home quick actions | Left rail + Create Hub | Rail + Create Hub | Reduce home icon row or make it contextual |
| `/dashboard` Daily Brief | Home Daily Brief | Home for casual; Dashboard for OS power users **or** unify | Duplicate brief widgets confuse IA |
| Learning hub vs Courses lists | Home learning strip | Learning route owns courses | Home = teaser only |
| Business hub section list vs Orgs workspace | Same `/business` page stacks both | One progressive disclosure flow | Flatten “hub sections” string list vs real screens |
| Messages “Inbox” naming | Side label Inbox vs route `messages` | Pick **Inbox** or **Messages** globally | Rename consistently |

---

## 2. Gift system duplication

| A | Duplicates B | Keep | Remove / merge |
|---|--------------|------|----------------|
| Wallet gift IDs (`spark`, `pulse`, …) | Gift V2 passport IDs (`crystal-star`, …) | **Wallet IDs** as commerce source of truth | Alias map or delete unused 10 passport-only IDs from product claims |
| `gift-engine.js` (canvas) | `gift-gpu-engine.js` | Keep layered fallback intentionally | Document single entry `gift-runtime.js` — currently **BROKEN** |
| `gift-sfx.js` | `gift-v2/physical-audio.js` | One audio choreography model | Merge or clearly version |
| Atlas PNG gifts | Phoenix PNG sequences | Keep per-tier strategy | Don’t claim 20 interactive gifts |
| `/gifts` gallery send | LIVE gift tray send | Shared send component | Deduplicate UI logic in `app.js` |

---

## 3. Avatar / motion duplication

| A | Duplicates B | Keep | Remove / merge |
|---|--------------|------|----------------|
| Assembled whole-body PNGs (`gestures/*`) | Legacy layered rig CSS (arms, visemes, hands v4) | Assembled path (`design-avatar-assembled.css`) | Dead assets: rig arms, hand plates, expression sheets if unused |
| `SyloraMotionRig` CSS vars | Hidden `.sylora-rig-arm` layers | Motion on assembled transforms | Stop updating unused arm vars |
| Orphan JS: `scheduleSyloraLife`, `startSyloraHairPhysics`, `startSyloraBodyLife`, `renderProfileLegacy` | Active mount path | Active mount only | Delete orphans after confirm |

---

## 4. CSS / design duplication

| A | Duplicates B | Keep | Remove / merge |
|---|--------------|------|----------------|
| `design-v2` → `v3` → `master-v4` → `scenes-v5` → `v6` → consolidation → avatar | Same visual concerns overridden repeatedly | **One** token file + scene overrides | Freeze legacy sheets; stop loading unused generations |
| `styles.css` + `modules.css` + feature CSS | Overlapping layout rules | modules for features | Audit unused selectors |
| Scene heroes per view | Repeated card/hero patterns | Shared hero primitive | Per-view copy only |

---

## 5. Backend / API duplication

| A | Duplicates B | Keep | Remove / merge |
|---|--------------|------|----------------|
| JSON `store.data.*` paths | Postgres repositories | Postgres for prod; JSON for tests/dev | Explicit mode matrix; reduce dual-write branches in `server.mjs` |
| `/api/ai/chat` tools | `/api/ai/orchestrate` + `/api/ai/command` + `/api/ai/ask` | One user-facing “talk to Sylora” + internal tools | Clarify which is LLM vs local |
| `/api/search` | `/api/search/universal` + `/api/search/ai` | Universal facade | Deprecate redundant clients |
| Live resonance in `server.mjs` | `live-entertainment` battles routes | One battle engine | |
| Conference AI | Personal AI chat | Shared provider adapter | |
| `service.mjs` god-object | Domain modules already split | Push logic into domain modules | Stop growing `service.mjs` |

---

## 6. Navigation duplication / inconsistency

| Issue | Detail |
|-------|--------|
| Наука label → `learning` view | Science + Learning combined; Science hub API separate |
| Gifts off primary nav but header icon | Intentional consolidation — OK if documented |
| Videos orphaned from primary nav | Reachable via More/home only |
| Communities in primary + social tools inside Learning/Business conferences | Overlapping “rooms” metaphors |
| Mobile dock ≠ desktop rail | Expected, but Learning/Business unreachable from dock without More |

---

## 7. State duplication

| A | B | Risk |
|---|---|------|
| `state.me` in SPA | `/api/me` | OK if single refresh path |
| Wallet in header + profile + rail | Multiple fetches | Stale balance after gifts |
| LIVE rooms in hub vs studio `ownRooms` | Re-fetch / scope bugs (`ownRooms` console error) | |

---

## 8. Asset duplication (~45 MB public/assets)

Candidates (unused or superseded by assembled avatar — verify before delete):

- `sylora-rig-*.png`, `sylora-hand-*-v4.png`, `sylora-expressions-v*.png`, `sylora-visemes-v*.png` (visemes partially unused when assembled)
- Duplicate phoenix folders: `phoenix-flight/` vs `phoenix-v3/`
- `sylora-assistant-v1.png` vs `sylora-avatar-v2-base.png`

---

## 9. Docs duplication

Prior `docs/audit/*` and `docs/FINAL_IMPLEMENTATION_REPORT.md` overlap and **overclaim**.  
**Source of truth going forward:** this forensic set (`SYLORA_FULL_AUDIT.md` et al.). Treat older reports as historical only.
