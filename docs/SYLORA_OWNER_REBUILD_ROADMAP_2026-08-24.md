# SYLORA owner rebuild roadmap — 2026-08-24

## Owner decision

The product must feel like one premium system, not stacked redesign patches. Home is ecosystem-first and contains no Sylora assistant presence. Sylora appears only in an explicit AI or LIVE co-host context and her visual presence can be hidden without disabling the product.

## Gaps found before implementation

1. Home duplicated Sylora in the hero, left rail, right rail, recommendations and mobile dock.
2. Navigation cleanup was bypassed by browser history and auth transitions, allowing LIVE/voice resources to outlive their route.
3. TikTok LIVE had no honest owner-test path for chat, gifts or host/guest events.
4. Settings were an undifferentiated wall of equal cards.
5. Buttons and tabs did not communicate route identity while remaining part of one design system.
6. Obsolete patch scripts could reintroduce replaced Home markup.
7. Browser and visual acceptance evidence was incomplete.

## Implemented without parallel duplicates

- Removed Home/global Sylora entry points and replaced the mobile center item with Create.
- Kept one contextual AI workspace and added a persistent Hide/Show Sylora visual control.
- Added one loopback Companion TikFinity bridge with pairing-token auth, origin allowlist, event normalization, deduplication, bounded queue and reconnect.
- Added the authenticated `/api/ai/live-copilot/respond` boundary. External event content is untrusted, tools are disabled, output is short, and responses are never reported as sent to TikTok.
- Added a LIVE-only owner panel with manual-first response mode, mentions/gifts/co-host modes, a seven-second cooldown, local voice and a development simulator.
- Refactored Settings into three product groups and added route-specific premium accents, button light and restrained header motion.
- Routed history/login/logout transitions through the same cleanup path.
- Removed `scripts/patch-consolidation.mjs` and `scripts/patch-platform-intel.mjs` after their output had been superseded.

## Integration truth

- TikTok's public developer product surface does not provide this project a general LIVE chat/gift ingestion API.
- The pilot therefore uses the local TikFinity Desktop DAPI WebSocket, normally `ws://127.0.0.1:21213`, through SYLORA Companion.
- Local browser speech is not a TikTok chat post. TikTok LIVE Studio or OBS must capture system/browser audio for viewers to hear Sylora.
- The simulator proves the SYLORA pipeline only; it is not evidence of a real TikTok LIVE connection.

References: <https://developers.tiktok.com/doc/overview>, <https://tikfinity.zerody.one/tiktok/dapi>

## Non-negotiable release gates

1. Full Node test suite, syntax/lint/build and API inventory are green.
2. Browser E2E runs with the pinned Playwright Chromium artifact.
3. All 44 required visual candidates are captured and reviewed at the locked viewports.
4. Owner runs a real TikTok LIVE with TikFinity Desktop and verifies chat, gift and host/guest events.
5. Manual mode stays the default until the owner approves an automation policy.
6. No merge or production deployment without a separate explicit owner approval.

## Owner acceptance checklist

- Home has no Sylora portrait, AI card, AI dock item or assistant recommendation.
- AI visual Hide/Show survives reload and does not disable text/voice functions.
- Pairing token is never written to localStorage and is cleared after connection.
- The LIVE journal displays external text safely and shows its Local Bridge truth label.
- Manual chat, gift and host/guest events are visible before AI automation is enabled.
- Every response says `sentToTikTok: false`; delivery remains local voice or owner-approved action.
- Leaving LIVE disconnects the pilot and stops polling.

## Current acceptance state

Code completion is not production acceptance. Until browser/visual evidence and a real owner LIVE pass, the correct verdict is **release blocked**.
