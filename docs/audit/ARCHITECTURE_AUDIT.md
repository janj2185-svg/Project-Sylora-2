# ARCHITECTURE AUDIT

## Pattern

**Modular monolith** (correct for current stage). Do not split into microservices yet.

```
Browser shell (public/)
        │  REST + SSE
        ▼
src/server.mjs  ──► repositories (Postgres) ──► PostgreSQL
        │                 │
        │                 └── Redis (rate limit, LIVE/gift fanout, peer leases)
        └── Store JSON fallback (dev / remaining domains)
```

## Strengths

- Confirm-gated AI writes (`pending` → user confirm/cancel).
- Gift financial commit + transactional outbox + Redis fanout.
- Privacy-safe `publicUser` serializer.
- Health/ready with dependency checks.
- Capability contracts reserved without claiming completion.

## Conflicts

1. **Schema ahead of runtime** — `schema.sql` has communities/courses/businesses/media/audit; runtime for several still uses JSON.
2. **Dual write risk** — some paths still call `store.save()` alongside Postgres.
3. **No general permission engine** — auth is session + persisted account role + hard-coded AI tools. Public registration cannot assign elevated roles.
4. **No Knowledge Graph / Action levels beyond confirm** — only `publish_post` and `remember`.
5. **Digital Human composition** — three incomplete avatar systems stacked (legacy CSS, V2 arm rig, unused gesture sheet).
6. **Realtime API surface** — SSE only; no first-party WebSocket protocol for developers.
7. **platform-vision events** — registered, never emitted.

## Target integration shape (this rebuild)

Keep modular monolith. Add `src/ecosystem/*` modules with:

- explicit permission/policy layer (ABAC-lite)
- Personal AI agent record + memory tiers
- knowledge graph nodes/edges with visibility
- action engine with READ → EXECUTE_ALLOWED levels
- agent marketplace manifests
- developer apps / API keys / scopes
- translation jobs
- org/RBAC + enterprise AI control plane
- reputation / provenance / trust foundations
- observability + AI cost quotas

Postgres migration `010_ecosystem_core.sql` is the durable spine; JSON store holds ecosystem data only when `DATABASE_URL` is absent (dev/test).
