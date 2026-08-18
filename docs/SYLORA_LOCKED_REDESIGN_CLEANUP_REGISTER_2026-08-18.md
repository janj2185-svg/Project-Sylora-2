# SYLORA locked redesign — cleanup register

Date: 2026-08-18  
Baseline before cleanup: `e059308a404dba8687d93ac114b40e99ff025cba`  
Rollback: revert the cleanup checkpoint; no database, API, migration, or persisted data is changed.

## Removed after usage proof

Repository-wide reference search confirmed that the following sheets were not loaded by any HTML entry point and had no JavaScript imports. They were historical design archaeology rather than runtime dependencies:

- `public/design-v2.css`
- `public/design-reference-v3.css`
- `public/design-master-v4.css`
- `public/design-scenes-v5.css`
- `public/design-scenes-v6.css`
- `public/design-approved-2026.css`

Together they contained 93,496 bytes. Tests now require both that their URLs are absent from `public/index.html` and that the files are not tracked.

The unused `renderProfileLegacy()` implementation was also removed from `public/app.js`; the canonical Profile renderer is the only remaining owner.

The CSS/text `S` used as branding in `public/phoenix-preview.html` was replaced with the immutable canonical PNG. The brand guard now covers this standalone public surface.

## Controlled runtime deferrals

Seven earlier sheets remain loaded because they still own feature mechanics outside the seven route-scoped 2026 layers. Removing them before selector-by-selector migration would break working surfaces and violate the backend/function preservation rule.

| Runtime sheet | Bytes | Current responsibility | Decision |
|---|---:|---|---|
| `styles.css` | 6,123 | base shell, forms, common utility/layout behavior used across the monolithic SPA | DEFER until route/component migration proves replacement |
| `modules.css` | 1,247 | shared module layouts used by non-redesigned product areas | DEFER |
| `clips.css` | 818 | Clips upload/list mechanics | DEFER until media-route phase |
| `studio.css` | 1,523 | Studio functional canvas/control mechanics beneath canonical composition | DEFER until Studio component extraction |
| `video-hub.css` | 458 | long-form video mechanics | DEFER until unified media migration |
| `design-living-horizon.css` | 53,930 | remaining Communities/Learning/Business/Gifts/creator feature selectors | DEFER; largest migration target |
| `design-consolidation.css` | 7,355 | Create Hub, command palette, calls/privacy and secondary feature mechanics | DEFER until canonical components own each responsibility |

Total controlled legacy/base runtime CSS: 71,454 bytes.

## Safety classification

- No obsolete sheet is loaded alongside the canonical route layers after this checkpoint.
- The seven retained sheets are **known temporary runtime dependencies**, not an accepted final architecture.
- Their removal belongs to a measured selector/component migration with route, deep-link, accessibility and visual regression proof.
- No working backend route or API is removed for visual cleanup.
- The product-evolution Phase 0 inventory must map every retained selector to an owning route/component before any further deletion.

