# ARCHITECTURE_AUDIT

## Shape

Current SYLORA is a **modular monolith**: one Node HTTP server, domain helpers, repository classes, and a browser shell. This is the correct near-term shape — do not split into microservices until domain boundaries and ops maturity justify it.

## Existing pillars

| Pillar | Status | Location |
|---|---|---|
| Auth / sessions | DONE | `auth.mjs`, postgres-auth-social |
| Social graph | DONE (hybrid) | posts/follows JSON+PG |
| Wallet / gifts | DONE (test LUMEN) | postgres-wallet + outbox |
| LIVE control plane | DONE | live repos + fanout |
| Creator Studio | DONE (P2P media) | `app.js` studio + companion |
| Personal AI chat | PARTIAL→expanded | AI repos + ecosystem permissions |
| Digital Human | FIXED assembly | `sylora-motion.js` + CSS/app |
| Gift Runtime V2 | Foundation | `public/gift-v2/` |
| Capability contracts | Registered | `platform-vision.mjs` |

## Conflicts / risks

1. **Dual persistence** — some domains JSON-only (communities/learning/business/media/moderation), others Postgres. Ecosystem tables exist in migration 010 but service writes JSON first.
2. **AI context tools** are still narrow (`get_my_context`, propose post/memory). Action Engine levels are defined; not all tools mapped yet.
3. **Search** is keyword/structured; semantic/vector search is architecture-ready, not production-wired.
4. **Payments** intentionally absent; commerce must stay sandbox-labeled.
5. **Translation** returns sandbox without provider keys — correct, not fake-complete.

## Target core (non-negotiable)

`Human + Personal AI + Digital Identity + Knowledge + Creator/Business Economy + Developer Ecosystem`

All modules must attach to this core rather than becoming isolated social clones.
