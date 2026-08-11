# TECH DEBT

1. **Monolithic `server.mjs` (~91KB)** — route extraction needed; ecosystem routes go into `src/ecosystem/routes.mjs`.
2. **Monolithic `app.js` (~300 lines of dense UI)** — keep design language; add views carefully without tab sprawl.
3. **CSS era collision** — V1/V2/V3/V4/V5/V6 design layers + Digital Human V1/V2 overrides. Avatar fix adds Assembled V3 override rather than rewriting the whole design system.
4. **Hybrid store** — migrate communities/learning/business/audit/media to Postgres incrementally.
5. **Local media/HLS** — not CDN/object-storage ready.
6. **P2P LIVE** — not SFU; six-peer safety cap.
7. **Gift Runtime V2** — foundation present; Phoenix vertical slice still the visual gate.
8. **No TypeScript / formal lint/typecheck scripts** — package has `test` only. Ecosystem modules stay plain ESM with node:test until a typed layer is justified.
9. **platform-vision events unused** — wire emitters when features become real.
10. **Dead client helpers** — `startSyloraHairPhysics` / `startSyloraBodyLife` superseded by `SyloraMotionRig`.
