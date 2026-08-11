# SYLORA — Technical Debt

## High
1. **Split persistence** — PG + JSON store dual paths increase bug risk
2. **Monolithic `app.js`** — hard to test UI flows; consider view modules
3. **Avatar visual QA** — rig alignment not automated in visual regression
4. **Server.mjs size** — route handler file needs domain routers

## Medium
5. Multiple overlapping Sylora CSS generations (v1 visemes rules still in file)
6. `startSyloraBodyLife` / `startSyloraHairPhysics` dead code in app.js
7. Gift V2 vs Legacy V1 dual runtime maintenance
8. Conference WebRTC mesh — not scalable beyond small groups
9. No structured logging / tracing (console only)

## Low
10. Minified one-line functions in app.js reduce maintainability
11. Test DB uses pg-mem patterns duplicated across test files
12. No OpenAPI spec for developer platform (future)

## Addressed in this branch
- Avatar double-layer gesture bug
- Missing npm install for pg-mem in clean CI
- Ecosystem kernel modules introduced without duplicating AI chat
