# TECH_DEBT

1. **Hybrid persistence migration incomplete** — finish communities/courses/media/moderation/studio on Postgres; remove dual-write.  
2. **`server.mjs` monolith size** — continue extracting routers (ecosystem already starts this).  
3. **Gift V1 + V2 dual stacks** — keep V1 fallback until V2 LIVE composite gate is fully proven, then deprecate entry.  
4. **Design CSS layering** — many generations loaded; eventual consolidation behind living-horizon + scenes.  
5. **Avatar asset generations** — armless torso + sleeve/hand v2–v4 created fragmentation; cohesive whole-body path supersedes limb assembly.  
6. **Browser-source token Map** — move to Redis/Postgres.  
7. **JSON legacy plaintext session tokens** — migrate/expire.  
8. **Local ffmpeg job queue** — not durable; needs worker/queue for scale.  
9. **P2P LIVE cap** — SFU required for production fanout.  
10. **Notifications dual-write** — single authoritative store.

Debt policy: do not rewrite working LIVE/gift/auth paths while adding ecosystem foundations. Prefer additive modules + migrations.
