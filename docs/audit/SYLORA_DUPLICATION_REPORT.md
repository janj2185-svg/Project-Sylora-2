# SYLORA — Duplication Report

**Audited:** 2026-08-13  
**Rule:** recommend keep/merge/delete candidates only — **do not delete during audit.**

| A | Duplicates B | Keep | Remove / merge |
|---|---|---|---|
| `renderProfileLegacy` (`public/app.js`) | `renderProfile` | `renderProfile` | Delete legacy function after confirming no callers |
| Header LUMEN → `/gifts` | Right-rail LUMEN → `/profile` + Profile vitals + Gifts hero balance | One wallet surface under Profile/Wallet | Dedupe CTAs; single “Wallet” destination |
| Inbox notifications tab | Profile activity/notifications list | Inbox as sole notification inbox | Profile shows summary link only |
| AI entries: mobile dock + left mini + right CTA + More module + Call Sylora | Same `/ai` | Keep dock + one desktop entry | Reduce redundant CTAs |
| LIVE entry: left rail + dock + home strip + right popular + Create Hub + LIVE studio tab | Same LIVE | Left/dock + Create | Remove studio tab duplication or make alias only |
| Gift transactional IDs (`spark`…`infinite-sylora` in `store.mjs` / SQL `008`) | Gift V2 passports (`crystal-star`… in `gift-v2/catalog.js`) | One canonical catalog mapping display↔commerce ids | Add adapter layer or unify IDs; fix missing `GIFT_V2_CATALOG` export |
| Gift engines: `gift-engine.js` + `gift-gpu-engine.js` + `gift-v2/*` + `gift-runtime.js` | Overlapping playback paths | Single runtime facade (`gift-runtime`) once fixed | Collapse legacy after parity tests |
| CSS: `styles.css` + `design-v2` + `living-horizon` + `reference-v3` + `master-v4` + `scenes-v5/v6` + consolidation + avatar-assembled | Multiple visual eras | Living-horizon + consolidation + avatar-assembled | Quarantine/remove unused era CSS after visual QA |
| Avatar assembled PNG path | Living-horizon viseme/rig CSS + `/assets/sylora-rig-*` + hand PNGs + expression/viseme atlases | Assembled v2 path currently mounted | Orphan unused rig assets after confirm |
| Phoenix assets `phoenix-v3/*` + `phoenix-flight/*` + atlas | Multiple gift visual pipelines for `cosmos` | One phoenix renderer | Drop unused frame sets |
| Business conference WebRTC UI | Science conference WebRTC UI (`conferenceHubHtml`) | Shared conference module (already partly shared) | Avoid divergent copies in learning/business renderers |
| `/api/search` + `/api/search/universal` + `/api/search/ai` | Overlapping discovery | Universal as facade | Keep specialized only if differentiated |
| Ecosystem “hub” endpoints returning section metadata | Frontend hard-coded section cards | Backend hub as source of truth OR frontend constants — not both | Pick one |
| JSON `Store` domains vs Postgres repositories | Dual persistence for auth/wallet/AI/live vs communities/business/audit | Postgres for durable domains | Plan migration off JSON for production domains |
| SDK js/python/dart thin clients | Overlapping tiny wrappers | Keep js as canonical example | Mark others experimental or generate |
| Prior docs in `docs/audit/*` (CURRENT_STATE, MASTER_AUDIT_P0, …) | This forensic set (`SYLORA_*`) | **This 2026-08-13 set as SoT** | Mark older audits historical |
| Patch scripts `scripts/patch-*.mjs` | Product source already patched | Keep only if still used for regen | Archive obsolete patchers |
| `styles.css` Inter/violet tokens | Living-horizon premium light tokens | Living-horizon brand | Stop loading conflicting base theme or rewrite tokens |

## Navigation naming inconsistencies

- Наука (nav) vs Science (cards/English modules)
- Відкриття vs Explore
- Налаштування (`more`) vs Personal System / Settings Flow Hub copy
- Inbox vs Messages vs Communications module card

## Recommended consolidation order (later)

1. CSS eras → one design system stylesheet set  
2. Gift catalogs → one ID space  
3. Wallet/profile/gifts money UX → one path  
4. Persistence → end JSON dual-write for core domains  
5. Remove dead renderers/assets after screenshot-confirmed unused
