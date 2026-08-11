# ARCHITECTURE_AUDIT

## Shape

SYLORA is correctly a **modular monolith** today. Domains share one process, one HTTP entrypoint, and hybrid repositories. Microservices would be premature.

## Strengths

1. Fail-closed AI provider boundary.
2. Gift money path is transactional with durable outbox when Postgres is on.
3. Redis fanout with echo dedupe for multi-instance LIVE/gift events.
4. Companion OBS trust boundary is tight (loopback, pairing token, origin allowlist).
5. Capability contracts reserved in `src/platform-vision.mjs` without fake “complete” claims.
6. Privacy-safe `publicUser()` serialization.

## Conflicts / hazards

| Conflict | Risk |
|---|---|
| Postgres + JSON dual-write (users/wallets/notifications) | Split brain across restarts/instances |
| Communities/courses/media/moderation still JSON while social/wallet are PG | Incomplete migration |
| Legacy plaintext session token acceptance in JSON path | Session hardening debt |
| Browser-source tokens in-process Map | Lost on restart; not multi-instance |
| Gift V1 + Gift V2 stacks coexist | Playback path complexity |
| Design CSS stack (styles + modules + v2…v6 + horizon) | Override fragility |
| Digital Human limb sprites vs complete portraits | Visual fragmentation (addressed in this cycle) |
| `server.mjs` concentration (~90KB) | Harder to extend safely without module extraction |

## Target integration pattern

New ecosystem modules live under `src/ecosystem/*` and expose:

- pure domain logic + permission checks
- store adapters (JSON now, Postgres migrations alongside)
- `handleEcosystemApi(ctx)` router invoked from `server.mjs` without duplicating auth helpers

UI stays one shell. Personal AI remains one identity; contexts (LIVE / Business / Learning / Messages) change tools and system prompts, not separate agents.

## Five technology moats (design filter)

1. Personal AI  
2. Permission-aware Knowledge Graph  
3. Realtime multilingual communication  
4. Agent + Developer Platform  
5. Creator + Business Economy  

Any feature that strengthens none of these is low priority.
