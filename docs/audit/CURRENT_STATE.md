# SYLORA — Current State (August 2026)

## Product slice
SYLORA v0.1 is a **working vertical slice**: auth, social feed, messaging, communities, learning, business profiles, LIVE control plane, Creator Studio, gifts, clips/video pipeline, OpenAI chat + realtime voice, and PostgreSQL/Redis hybrid persistence.

## Core concept alignment
| Pillar | Current state |
|--------|----------------|
| Personal AI | OpenAI Responses + Realtime; controlled memory; pending actions; **new**: permissions, activity log, command center |
| Identity | Basic profile; **new**: identity API with section visibility |
| Knowledge Graph | **new**: node API + schema foundation |
| Agent + Developer platform | Platform vision registry only; no marketplace/API yet |
| Creator + Business economy | LUMEN test wallet, gifts, courses (free); no real payments |

## Sylora Digital Human
- V2 rig: torso + kinematic arms + viseme head layers
- Motion rig with spring joints (`sylora-motion.js`)
- **Fixed**: gesture sprite overlay disabled when rig active (was causing “split” avatar)

## Persistence map
| Domain | PostgreSQL | JSON fallback |
|--------|------------|---------------|
| Auth, social graph, wallet/gifts, AI, LIVE | Yes | Dev fallback |
| Communities, learning, business, media, moderation | JSON store | Yes |

## Runnable surfaces
- Web shell: `public/index.html` + `app.js`
- API: `src/server.mjs`
- Tests: `npm test` (73 tests)

## Known gaps (not regressions)
- No production SFU/RTMP, payments, TURN credential service, creator payouts
- Agent marketplace, developer API, translation layer, Business OS — architecture started, not productized
- Digital Human needs browser visual QA on target devices
