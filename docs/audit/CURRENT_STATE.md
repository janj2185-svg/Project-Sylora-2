# SYLORA current state

Audit baseline: repository state on 2026-08-11.

SYLORA is a modularizing Node.js ESM monolith. `src/server.mjs` is a handwritten HTTP router and static server; `public/app.js` is a plain JavaScript SPA. The default development persistence is an atomic JSON file through `src/store.mjs`. PostgreSQL repositories cover auth/social, wallet, AI, LIVE, conferences and the realtime outbox when `DATABASE_URL` is configured. Redis is optional for rate limits, presence and fanout.

Working vertical slices include accounts and bearer sessions, feed/social actions, direct messages, notifications, moderation reports, test LUMEN gifts and ledger entries, media upload/HLS jobs, WebRTC P2P LIVE and private conferences, Creator Studio scenes/OBS integration, communities, courses and free enrollment. OpenAI powers text chat, optional tool proposals, private-conference assistance and realtime voice when configured.

Capability status:

| Area | Status | Repository evidence / limitation |
| --- | --- | --- |
| Personal AI | Partial | Chat, voice, memory and two confirmed write actions; no complete agent lifecycle |
| Identity | Partial | Account/profile plus ecosystem identity foundation; no external identity federation |
| Knowledge graph | Foundation | Permission-aware local graph added; no graph database or extraction pipeline |
| Agent marketplace | Foundation | Validated catalog/install model and example manifests; examples are not running production agents |
| Developer platform | Partial | App/key/webhook registration architecture; no OAuth authorization server or delivery worker |
| Translation | Blocked without provider | Provider interface is real; returns `BLOCKED` rather than mock translations |
| Creator Studio | Partial | Scenes, media, OBS/companion and AI LIVE package proposals that export into existing Studio without auto-publish |
| Business OS | Partial | Business pages, conferences and organization/RBAC foundation |
| Enterprise control | Foundation | Policies, budget gate, agent lists and kill switch; no enterprise SSO/admin suite |
| AI-to-AI | Foundation | Broker with action levels; financial/legal never auto-execute |
| Commerce | Partial | Test LUMEN ledger, revenue-share architecture and entitlement model; no production payment provider |
| Reputation / Trust / Provenance | Foundation/Partial | Transparent data models and current reports; automated verification is absent |
| Protocol | Architecture only | Interoperability document only; no federation |
| Action Engine | Partial | Existing publish/remember confirmations plus extensible action contracts |
| Command Center | Foundation | One identity/context contract; not an autonomous cross-product operator |
| Search | Partial | Permission-aware structured substring planning; semantic search blocked without vector DB |
| Observability | Partial | Health endpoints, structured helper and AI counters; no external telemetry backend |
| Admin | Partial | Report/audit console plus ecosystem status endpoint; no full control plane |

The Sylora Digital Human V7 chain is assembled: truncated right upper-arm asset normalized, shoulder/elbow/wrist sockets recalibrated, gesture layers mounted, joint ranges softened. Device visual-regression QA remains recommended.
