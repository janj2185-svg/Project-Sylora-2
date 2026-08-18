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
The shell still needs legacy feature mechanics, but the runtime cascade has been
reduced and its final ownership is now explicit:
- `styles.css`
- `modules.css`
- `clips.css`
- `studio.css`
- `video-hub.css`
- `design-living-horizon.css`
- `design-consolidation.css`
- `design-system-2026.css`
- `design-home-2026.css`
- `design-ai-2026.css`
- `design-live-2026.css`
- `design-studio-2026.css`
- `design-account-2026.css`
- `design-avatar-assembled.css` (last, by its renderer contract)

`design-approved-2026.css` was removed from runtime because its broad `#app`
rules with `!important` defeated route owners. Historical v2/reference/master/
scene sheets remain in the repository for archaeology but are not loaded.
`design-living-horizon.css` and `design-consolidation.css` remain temporary
dependencies; Home and LIVE ownership has been removed from consolidation.

### Design-system status
IMPLEMENTED / BROWSER PROOF PENDING. `design-system-2026.css` now owns the
Pearl/Frost/Crystal/Metal/Void tokens, shell, responsive rail breakpoints,
account controls, right-rail cards and shared readouts. Route composition is
separate. This is not marked approved until the rendered matrix passes.

## 2. Brand audit

### Before
- Legacy `public/assets/sylora-mark-v2.svg` was still the global mark.
- Header used `ONE WORLD · INFINITE CREATION`.
- No new master app icon was wired into the shell.

### P0 canonical lock
- The package master was copied byte-for-byte to `public/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png`.
- Verified SHA-256: `dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08`.
- Shell, favicon, Home presence and current shell-card references use that one public URL.
- Hand-redrawn SVG mark and app-icon assets are no longer valid UI sources.
- `tests/canonical-brand.test.mjs` rejects a changed master digest and unverified logo-like UI references.

Further derivative work still requires explicit overlay approval: PWA/mobile icon
matrix, platform splash screens, monochrome lockups and motion states. None may
replace or mutate the canonical master.

## 3. Home audit

Status: CANDIDATE / BROWSER PROOF PENDING

- Living Horizon is visually present.
- Home uses the locked logo inside a compact contextual AI control, not an AI portrait.
- Mobile hero collapse-after-engagement is implemented and persisted locally.
- Conflicting legacy mobile Home owners were removed from consolidation.
- Repeated fake-looking empty strips were replaced by one honest onboarding surface.

## 4. Studio audit

Status: CANDIDATE / BROWSER PROOF PENDING

- Program Preview is the dominant desktop surface.
- Mobile tools use stable panel identifiers and a body-level scrollable toolbar;
  controls open as reachable sheets above the dock.
- Local browser execution is unavailable in this workspace, so the GitHub E2E
  run remains the required proof for the repaired toolbar geometry.

## 5. LIVE audit

Status: CANDIDATE / BROWSER PROOF PENDING

- Functional LIVE/WebRTC work exists from prior phases.
- VOID/immersive viewer identity exists inside the otherwise light Living
  Horizon route. Tabs and readouts now use their canonical selectors; empty
  state and capability disclosure no longer look like debug output.
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

Remaining findings:
- `public/app.js` still renders many hardcoded Ukrainian and English strings.
- The shell selector now advertises exactly `UA | EN | PL | DE | RU`; Profile
  is normalized to the same five options during its synchronous render.
- `detectBrowserLocale()` exists but is not yet the authoritative first-run flow.
- Studio and LIVE contain mixed UI terminology.
- Toasts, prompts, confirmations, backend-derived messages, accessibility labels and date/number formatting are not fully centralized.
- UI localization and user-content translation are not yet cleanly separated in product UX.

Therefore the presence of the selector is NOT considered completion.

## 7. AI presence / offline status

Status: IMPLEMENTED / BROWSER PROOF PENDING

- The source capability element remains globally mounted for compatibility but
  is hidden outside AI. Its visible state is moved into the AI presence
  container and is never presented as a whole-platform outage.
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
