# SYLORA LIVE — Architecture

Isolated streaming domain inside Project-Sylora-2. **Does not** fork or replace existing first-party LIVE rooms, WebRTC, gifts, or OBS Studio paths.

## Layout

```
src/live/
  core/           types, event shapes
  platforms/      adapter contract + registry + capability matrix
  events/         LiveEventBus (dedupe, rate limit, backpressure)
  chat/           unified multipplatform chat + priority
  ai-host/        autonomy levels + co-host decisions
  voice/          VAD / turn-taking policy
  avatar/         animation state hooks
  automation/     WHEN + IF + THEN engine
  broadcast/      device/quality prefs
  obs/            automation ↔ existing Studio/Companion
  overlays/       browser-source trigger plans
  moderation/     suggest / auto-hide policies
  analytics/      realtime + recap (no auto-publish)
  memory/         short-term + optional viewer memory
  gifts/          contextual gift reactions
  director/       non-intrusive recommendations
  battles/studio/devices/  bridges to existing modules
  service.mjs     per-user session orchestrator
  routes.mjs      /api/sylora-live/*
```

## Data flow

```
Platform adapter  →  LiveEventBus  →  UnifiedChat / Analytics / Automation / AI Host
Native SYLORA LIVE chat & gifts already bridge into the bus for the room host.
```

## UI

| View | Role |
|---|---|
| `live` | Existing hub (discover / following / create / battles) |
| `liveStudio` | **NEW** Command Center (platforms, unified chat, AI, director) |
| `studio` | Existing Creator Studio (camera, OBS, WebRTC broadcast) |

Mobile/tablet: Command Center uses sheet tabs (Preview / Chat / Platforms / AI / Controls).

## Resilience

- Per-platform adapter isolation — one AUTH_REQUIRED platform does not stop SYLORA/OBS.
- Event bus backpressure + dedupe.
- Automation actions are **planned** (status `planned`); OBS execution stays local.

## Non-goals / honesty

- No fake Connected / fake chat / fake gifts.
- Instagram LIVE marked **UNAVAILABLE** (no stable public API).
- External OAuth platforms: adapter shells until owner credentials.
