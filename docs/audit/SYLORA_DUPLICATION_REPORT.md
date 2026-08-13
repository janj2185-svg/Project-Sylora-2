# SYLORA — Duplication Report

Format: **A → duplicates B → keep → remove/merge**

## Navigation / IA

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| Left rail “Sylora / Я поруч” | Mobile dock “Sylora” | AI entry in dock + one desktop entry | Duplicate hero/rail AI CTAs should collapse to one pattern |
| Header gifts/balance chips → `/gifts` | Profile wallet vitals + More→Gift Gallery | One Wallet surface + Gift picker | Stop treating gifts page as wallet home |
| Home ecosystem strips (LIVE/People/Inbox/Science/Business) | Left rail primary nav | Rail as IA source of truth | Home strips as shortcuts only (reduce duplicate cards) |
| More modules (Identity/AI/Dashboard/…) | Direct deep links `/identity` etc. | More as settings hub | OK, but hide non-settings (Science/Business) from More or label “Jump to” |
| Explore search | Command palette ⌘K | Command palette for navigation+search | Deduplicate copy (“Universal Search” claims semantic when degraded) |
| Right rail “Popular LIVE” | Home “Recommended LIVE” | One recommendation component | Shared data module |

## Profile / wallet / settings

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| `renderProfile()` | `renderProfileLegacy()` (dead sibling in `app.js`) | `renderProfile` | Delete legacy function |
| Profile LUMEN + ledger | `/gifts` balance + send | Profile = identity/stats; Gifts = catalog/send; future Wallet route | Split clearly |
| Header locale (13 langs) | Profile locale select (uk/pl/en only) | Server-supported set | Align UI to API (`PATCH /api/me` only accepts uk/pl/en) |
| Identity privacy controls | Security center privacy | Security center for requests/export; Identity for field privacy | Cross-link, don’t re-implement |

## Gifts

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| `store.data.gifts` IDs (`spark`, `cosmos`,…) | `gift-v2` passport IDs (`crystal-star`, `phoenix-rebirth`,…) | **Wallet catalog IDs** as canonical | Alias map or rename passports; export `GIFT_V2_CATALOG` |
| `gift-engine.js` / `gift-gpu-engine.js` / `gift-runtime.js` / `gift-v2/runtime.js` | overlapping playback | One public runtime façade | Quarantine unused engines |
| Atlas PNG tiles | Procedural Three meshes | Decide per-tier renderer | Document which gifts use which path |

## Avatar / assets

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| Assembled single portrait (`sylora-avatar-v2-base.png`) | Legacy rig layers (`sylora-rig-*`, visemes, hands) | Assembled path **or** real 3D — not both half-alive | Archive unused PNGs (~tens of MB) until a real rig ships |
| `sylora-gestures-v2.png` sheet | `/assets/gestures/*.png` discrete | Discrete gesture set used by `app.js` | Remove unused sheet if unused |
| CSS motion in living-horizon vs assembled | competing transforms | `design-avatar-assembled.css` wins today | Delete dead blink/viseme CSS paths or revive deliberately |

## Design system / CSS

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| `styles.css` + `modules.css` | `design-v2`…`design-scenes-v6` + consolidation | One tokenized layer + scene skins | Freeze new `design-vN`; merge survivors |
| Multiple hero treatments per view | Living horizon home hero | Shared hero primitive | Stop per-file `!important` overrides |

## Backend / API

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| `/api/search` | `/api/search/universal` + `/api/search/ai` | One search façade with modes | Collapse clients to one |
| `/api/ai/chat` tools | `/api/ai/command` + `/api/ai/ask` + `/api/ai/orchestrate` | Chat + Action Engine separation is OK | Document; reduce overlapping UX entry points |
| JSON store entities | Postgres repositories | Postgres as SoT for prod | Finish migration; refuse JSON in `NODE_ENV=production` |
| LIVE signal peer registry local Map | Redis registry | Redis for multi-instance | Feature-flag clearly |
| Ecosystem “engines” metrics | Platform capabilities registry | Capabilities registry | Avoid double status systems |

## Tests / scripts

| A | B | Keep | Remove/merge |
|---|---|------|--------------|
| `scripts/patch-*.mjs` historical | current source | git history | Mark obsolete; don’t re-run |
| Prior `docs/audit/*` reports | this forensic set | `SYLORA_FULL_AUDIT.md` + siblings | Treat older audits as historical |

## Highest-impact consolidation targets

1. Gift ID + runtime façade (fixes BROKEN FX)
2. CSS design layers → single system
3. Wallet vs Gifts vs Profile money UX
4. Kill `renderProfileLegacy` and unused avatar assets
5. Search API façade
6. Production persistence: Postgres-only gate
