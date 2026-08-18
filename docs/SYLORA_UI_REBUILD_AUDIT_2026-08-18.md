# SYLORA — UI REBUILD / I18N AUDIT BASELINE

Date: 2026-08-18
Branch: `agent/sylora-master-uiux-refinement-20260818`
Status: ACTIVE WORK — NOT PRODUCTION READY

## Decision

Keep product functionality and the Living Horizon design thesis, but rebuild/consolidate the presentation layer where the current implementation is structurally weak. Do not keep obsolete CSS simply to avoid change. Remove legacy layers only after dependency checks.

The previous "keep current logo" rule is superseded by the latest product decision: the new graphite/metal SYLORA mark with champagne core and the line `YOUR AI. YOUR WORLD. YOUR LEGACY.` is the master brand identity.

## 1. Current architecture findings

### Shell
- Single SPA shell in `public/index.html`.
- Large monolithic client controller in `public/app.js` (~200 KB) renders many routes with template strings.
- Route behavior and visual markup are tightly coupled in `app.js`.

### CSS layering
The shell currently loads a long cascade of historical design layers, including:
- `styles.css`
- `modules.css`
- `clips.css`
- `studio.css`
- `video-hub.css`
- `design-v2.css`
- `design-living-horizon.css`
- `design-reference-v3.css`
- `design-master-v4.css`
- `design-scenes-v5.css`
- `design-scenes-v6.css`
- `design-consolidation.css`
- `design-avatar-assembled.css`
- `design-approved-2026.css`
- `design-home-2026.css`
- `design-ai-2026.css`
- `design-live-2026.css`

This is the main visual-maintainability risk. Later files override earlier files, so ownership is unclear and route regressions are easy to introduce.

### Design-system status
PARTIAL. Living Horizon direction exists, but material/tokens/component ownership is fragmented. Pearl/Frost/Crystal/Metal/Void are not yet the single authoritative material system.

## 2. Brand audit

### Before
- Legacy `public/assets/sylora-mark-v2.svg` was still the global mark.
- Header used `ONE WORLD · INFINITE CREATION`.
- No new master app icon was wired into the shell.

### Stage 1 change
- `sylora-mark-v2.svg` replaced in place with the new master mark so existing references migrate safely.
- New `sylora-app-icon.svg` added.
- Shell tagline changed to `YOUR AI. YOUR WORLD. YOUR LEGACY.`
- New app icon wired as favicon.

Further work still required: final wordmark asset, dark/light lockups, PWA/mobile icon matrix, removal of any stale logo copies outside the canonical asset path.

## 3. Home audit

Status: PARTIAL / REBUILD REQUIRED

- Living Horizon is visually present.
- Home still contains a large `sylora-presence-image` block; this conflicts with the updated product rule that Home sells the whole ecosystem, not one AI face.
- Home still uses many card-like surfaces.
- Mobile hero behavior is not yet compact-after-engagement.
- AI entry point should become a compact contextual control.

## 4. Studio audit

Status: STRUCTURALLY WEAK

- Existing Studio is functional but renders many peer-level `.card fields` panels.
- Program Preview is not sufficiently dominant.
- Mobile Studio is still conceptually a stacked desktop workspace rather than a one-hand, preview-first controller.
- Scenes, Sources, Chat, Guests, OBS and advanced settings need drawer/sheet ownership on mobile.

## 5. LIVE audit

Status: PARTIAL

- Functional LIVE/WebRTC work exists from prior phases.
- VOID/immersive identity exists as styling, but final route hierarchy, portrait/landscape behavior and creator/viewer controls still require visual QA.
- LIVE technical truth states must remain real: Disconnected / Connecting / Connected / Degraded / Error.

## 6. I18N audit

Status: PARTIAL — NOT DONE

Current centralized system: `public/i18n.js`.

Production target locales:
- `uk`
- `en`
- `pl`
- `de`
- `ru`

Positive findings:
- Central dictionary function exists.
- UI locale can be persisted in local storage.
- User locale can be persisted through `/api/me` after manual selection.
- Russian has been added as a first-class dictionary.

Critical findings:
- `public/app.js` still renders many hardcoded Ukrainian and English strings.
- The current language selector in `app.js` still advertises 13 locales instead of only `UA | EN | PL | DE | RU`.
- `detectBrowserLocale()` exists but is not yet the authoritative first-run flow.
- Studio and LIVE contain mixed UI terminology.
- Toasts, prompts, confirmations, backend-derived messages, accessibility labels and date/number formatting are not fully centralized.
- UI localization and user-content translation are not yet cleanly separated in product UX.

Therefore the presence of the selector is NOT considered completion.

## 7. AI presence / offline status

Status: NOT COMPLIANT

- `bootstrap()` still inserts a global degraded AI banner into `body`.
- This must be replaced by contextual component status / compact indicator / action-time toast.
- AI provider/TTS/STT capability claims must remain honest and separately classified as WORKING / PARTIAL / MOCK / NOT IMPLEMENTED.

## 8. Responsive audit baseline

Required proof widths:
- 320
- 390
- 430
- 768
- 1024
- 1366
- 1920

Required interaction contexts:
- portrait
- landscape
- touch
- mouse
- keyboard
- reduced motion

No route is marked DONE until actual rendered QA exists.

## 9. Rebuild sequence

1. Brand migration and audit baseline.
2. Design-system consolidation and CSS ownership map.
3. I18N architecture and complete string extraction.
4. Home rebuild/refinement.
5. Studio desktop hierarchy + mobile-first Studio.
6. LIVE refinement.
7. Remaining routes and common states.
8. Responsive/accessibility passes.
9. Automated localization/design regression checks.
10. Real manual browser QA and final status matrix.

## Production gate

Do not merge/deploy until the draft PR passes automated checks and manual rendered QA. `DONE` is reserved for verified behavior, not implemented markup alone.
