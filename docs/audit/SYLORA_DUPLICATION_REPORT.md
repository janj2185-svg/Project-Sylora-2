# SYLORA — Duplication Report (2026-08-13)

Rule: `A → duplicates B → keep → remove/merge (do not execute in this audit)`.

## Pages / surfaces

| A | Duplicates B | Keep | Remove / merge |
|---|--------------|------|----------------|
| `/gifts` full page | Header LUMEN button + right-rail “MY LUMEN” | One Wallet surface (`/wallet` or profile money tab) | Drop duplicate balance widgets as separate “products” |
| `/profile` vitals (LUMEN/creator/audience) | `/gifts` balance + ledger on profile | Profile for identity; Wallet for money | Stop re-showing full gift constellation in profile |
| `renderProfileLegacy` | `renderProfile` | `renderProfile` | Delete dead `renderProfileLegacy` |
| `/more` settings grid | Left secondary nav + account menu | One Settings IA | Collapse redundant deep links |
| Live tab “Studio” | `/studio` nav item | `/studio` | Make Live tab a deep-link only |
| Science nav label → `/learning` | Learning hub + Science hub APIs | Decide Learning vs Science product name | Unify label + route |
| Business conferences UI | Science conferences UI (`openConferenceRoomRtc`) | Shared conference component | Deduplicate two nearly identical hubs |
| `/ai` transparency panels | `/security` Trust Center memory/privacy | Security for controls; AI for conversation | Stop cloning memory toggles |
| Home eco strips (Science/Business/LIVE) | Dedicated nav destinations | Home as launcher only | Reduce duplicated module marketing cards |
| Command Palette destinations | Create Hub actions | Keep both, shared action registry | Single action catalog module |

## Wallet / economy

| A | Duplicates B | Keep | Merge |
|---|--------------|------|-------|
| Header `◈ N TEST` | Gifts page balance | Wallet module | One balance component |
| Right rail MY LUMEN | Profile LUMEN card | Wallet module | Same |
| Store gift catalog (10 ids: `spark`…) | gift-v2 passports (20 design ids: `crystal-star`…) | Store/API ids as economy source of truth | Map v2 passports → store ids; don’t dual-catalog |
| JSON gift path in `server.mjs` | Postgres `walletRepo.sendGift` | Postgres path | Fix + delete divergent JSON money logic eventually |

## Avatar / assets

| A | Duplicates B | Keep | Remove |
|---|--------------|------|--------|
| Assembled portrait (`sylora-avatar-v2-base.png` + gestures) | Legacy CSS sprite rig (`sylora-rig-*`, visemes, expressions) | Assembled path (`design-avatar-assembled.css`) | Archive unused rig/viseme PNGs after confirming no CSS dependency |
| `sylora-assistant-v1.png` rail portrait | AI hero base | One brand portrait family | Reuse variants, don’t ship parallel “products” |
| Phoenix flight frames | Phoenix v3 frames | One Phoenix renderer path | Consolidate preview assets |

## Navigation labels (same feature, different names)

| Label A | Label B | Same destination |
|---------|---------|------------------|
| Наука / Science | Learning | `/learning` |
| Settings / Налаштування | More | `/more` |
| Inbox | Messages | `/messages` |
| Discovery / Відкриття | Explore | `/explore` |
| SYLORA / AI / Sylora | Talk with Sylora | `/ai` |

## CSS / design systems

| A | Duplicates B | Keep | Action |
|---|--------------|------|--------|
| `styles.css` | `design-v2.css` … `design-scenes-v6.css` | One tokenized system | Freeze cascade; extract tokens; delete superseded rules |
| `design-living-horizon.css` avatar layers | `design-avatar-assembled.css` overrides | Assembled | Remove dead layer rules |
| Multiple hero atmospheres per view | Shared hero primitive | Shared layout primitive | Stop per-view “new product” skins |

## Backend / state

| A | Duplicates B | Keep | Action |
|---|--------------|------|--------|
| `store.data.*` JSON bags | Postgres tables for same domain | Postgres for durable domains | Finish migration; stop dual-write ambiguity |
| `emitGift` / local Maps | Redis outbox fanout | Outbox path | Single realtime spine |
| Ecosystem “hub” catalog endpoints | Actual resource APIs | Resource APIs | Hubs should only aggregate real data |
| `openConferenceRoom` | `openConferenceRoomRtc` | RTC version | Delete legacy |
| SDK js/python/dart | Server API | Server API as SoT | Mark SDKs experimental or sync |

## Recommended consolidation target (not implemented)

```
SYLORA
├── Home
├── Discover (search + people + live pulse)
├── Live (discover / watch / create)
├── Create (studio + clips + posts)   ← Create Hub becomes this
├── Messages (chats + calls + notifications)
├── Sylora AI
├── Library (clips/videos/courses)    ← merge media learning entry
├── Workspaces (Business / Science as modes, not fake OS clones)
├── Wallet
├── Profile
└── Settings (identity, security, developer, admin)
```
