# SYLORA — Duplication Report

Forensic scan 2026-08-13. Format: **A → duplicates B → keep → remove/merge**

---

## Pages & navigation

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `renderProfile()` | `renderProfileLegacy()` | `renderProfile()` | Delete `renderProfileLegacy()` (~dead code, app.js) |
| Profile stats on `/profile` | Wallet on header + `/gifts` + ledger section | Single wallet entry in profile; header as shortcut only | Reduce repeated LUMEN displays |
| `/more` settings grid | Left rail "Налаштування" | Both OK (hub vs primary nav) | Clarify IA labels only |
| `/videos` | `/clips` | Both (different format) | Shared uploader component (currently duplicated `renderClipUploader` / `renderVideoUploader`) |
| Business org workspace | Business hub cards | Workspace for depth | Hub as index only |
| Learning courses | Science hub tools | Distinct products | Shared "create course" flow already duplicated in Create Hub |

## Wallet / monetization UI

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| Header balance button | Profile vitals LUMEN | Header shortcut | — |
| `/gifts` balance hero | Profile wallet card | Profile as source of truth | Gifts page focus on catalog/send only |
| `/api/ledger` on profile | Gift send responses | Both APIs | — |

## Settings / profile

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `/profile` locale in form | Header `#localeSwitch` | Header (global) | Remove locale from profile form or sync one control |
| `/security` memory center | `/ai` memory tab | Security for privacy; AI for chat context | Document boundary; merge UI later |
| `/identity` | `/profile` bio/display | Identity = professional; profile = social | OK if documented; currently overlapping fields |

## Navigation components

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| Left rail `.nav` | Mobile dock `.nav` | Both | Extract shared NAV_ITEMS config (currently duplicated in index.html) |
| Create Hub actions | Feed horizon buttons | Create Hub | — |
| Command palette routes | More grid | Palette for power users | — |

## CSS / design system

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `design-consolidation.css` | `design-v2.css` … `design-scenes-v6.css` | **One** canonical token file + scene overrides | Merge 8 design-* files (all loaded in index.html) |
| `styles.css` | `modules.css` | Base + modules | Audit redundant rules |
| `design-avatar-assembled.css` | `design-living-horizon.css` | Consolidate avatar/horizon | |
| Hero background `sylora-horizon-v3.png` | Repeated in v4/v5/v6 CSS | Single `--hero-bg` variable | |

## Gift systems (major)

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `gift-v2/*` (canonical per gift-runtime.js) | `gift-engine.js` (2D canvas) | V2 + runtime router | Demote engine to fallback only |
| `gift-gpu-engine.js` (WebGL procedural) | gift-v2 WebGL renderer | GPU for v1 tier IDs; V2 for phoenix | Document matrix in one module |
| `gift-sfx.js` | gift-v2 physical-audio | V2 audio director | Merge SFX paths |
| PNG atlas `sylora-gift-atlas-v1.png` | WebGL meshes | Atlas for low-end fallback | OK dual path |
| Phoenix preview page | Live gift stage | Runtime controller | Preview dev-only |

## Backend / persistence

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| JSON `store.data.*` | Postgres repositories | Postgres in production | JSON dev-only; stop dual-write paths in server.mjs |
| `store.notify()` | `authSocial.createNotification()` | Postgres path when enabled | Single notify abstraction |
| Live engagement in JSON | `liveRepo.engagement()` | Postgres when configured | Already branched — simplify |
| Ecosystem in JSON blobs | `PostgresEcosystemRepository` | Postgres for durable personal AI | Migration incomplete for all entities |

## API logic

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `/api/search` | `/api/search/universal` | Universal when authed | Deprecate duplicate result shaping |
| `/api/ai/chat` | `/api/ai/command` | Chat for AI screen; command for palette | Shared `runSyloraAi()` already — OK |
| `/api/live/:id/resonance` | `/api/live/battles` | One battle API | Two creation paths |
| Conference AI POST | Sylora AI chat | Shared OpenAI client | OK backend |

## State & services

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `state.me` | Cached users in store | Session from API | — |
| `ecosystem/service.mjs` (3885 LOC) | Domain files unused by UI | Split by bounded context | Extract only used domains |

## Assets

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `sylora-expressions-v1.png` | `sylora-expressions-v2.png` | v2 if used | Remove unused v1 |
| `sylora-visemes-v1.png` | `sylora-visemes-v2.png` | v2 in CSS | Remove v1 if unreferenced |
| `sylora-assistant-v1.png` | `sylora-avatar-v2-base.png` | v2 for AI hero | v1 only in hero CSS ghosts |
| Multiple hand rig PNG sets v1–v4 | Avatar motion in app.js | v4 if referenced | Audit ~45MB asset folder |

## Tests / docs

| A | B | Keep | Remove/merge |
|---|----|------|--------------|
| `docs/audit/CURRENT_STATE.md` | This forensic audit | **SYLORA_FULL_AUDIT.md** | Archive old audit docs |
| `docs/FINAL_IMPLEMENTATION_REPORT.md` | Reality | Delete or mark historical | Misleading if read as current |

---

## Priority merge order (remediation reference only — not executed)

1. CSS design files → single design system
2. Gift runtime → one entry (`gift-runtime.js` already declared canonical)
3. JSON vs Postgres → production path only in prod
4. Dead `renderProfileLegacy`
5. Clip/video uploader duplication
