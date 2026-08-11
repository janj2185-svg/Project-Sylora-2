# TECH_DEBT

1. `src/server.mjs` remains a large route file — extract route modules gradually without rewrite.
2. Hybrid JSON/Postgres persistence increases cognitive load; finish domain migrations before claiming multi-instance production readiness for every feature.
3. Multiple CSS generations (`design-v2`…`v6` + living-horizon) layer overrides; Digital Human now depends on living-horizon assembled rules — keep cache-bust disciplined.
4. Unused/mismatched avatar limb assets remain on disk for potential future matched rig; disabled in UI to avoid fragmentation.
5. Gift Runtime V2 and Living Sylora event bridge still need the Phoenix vertical-slice proof for Horizon A.
6. No dedicated lint/type system beyond `node --check`; introduce ESLint/TS only if team adopts it without blocking delivery.
7. Test suite imports server via cache-busting query strings — fine for isolation, but watch memory in long CI runs.
8. Developer Platform lacks formal OpenAPI document generation yet.
