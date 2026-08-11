# Architecture audit

## Runtime boundaries

- `src/server.mjs` owns HTTP routing, authentication, orchestration, SSE/WebRTC signaling and static delivery. It is functional but too broad.
- `src/repositories/` provides PostgreSQL adapters for selected established domains. All other domains use the JSON store today.
- `src/ecosystem/` introduces domain modules with injected arrays and persistence callbacks. This preserves JSON operation and leaves repository boundaries available for PostgreSQL adapters.
- `public/app.js` is a single-file SPA. Existing route/view conventions should be retained until a deliberate frontend modularization.

## Strengths

- Few runtime dependencies and explicit control flow.
- Fail-closed provider behavior already exists for AI and paid enrollment.
- Durable PostgreSQL wallet/outbox paths address the highest-risk transaction flow.
- User confirmation is enforced for existing AI writes.
- JSON fallback makes local tests deterministic.

## Risks

1. `server.mjs` mixes transport, policy and domain logic; route-level regressions become more likely as it grows.
2. Persistence is hybrid. Ecosystem records currently use JSON fallback even when core PostgreSQL repositories are enabled; migration 010 defines the durable target but dedicated repositories are still required.
3. In-process maps back realtime and browser-source state; horizontal behavior depends on Redis coverage and is incomplete for some ephemeral features.
4. The SPA lacks component isolation and compile-time checks.
5. Authorization conventions are domain-specific rather than one shared policy decision point.

## Target modular monolith

HTTP handlers should authenticate and validate transport data, then call domain services. Domain services should depend on permission, audit and repository interfaces—not on HTTP objects. JSON and PostgreSQL adapters should implement the same contracts. Realtime delivery should consume domain events from the durable outbox where ordering or money matters.

No service split is justified yet. First complete repository parity, contract tests and observability inside the monolith.
