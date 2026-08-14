# Phase 1 data model

This document describes the persistence paths implemented by the Phase 1 code. It is not a target-state design. The production boot guard requires PostgreSQL, but the application still contains a broad set of ecosystem modules whose state is process-local. Those remaining gaps are called out explicitly below.

## Runtime topology

- Production (`NODE_ENV=production`) requires a valid `DATABASE_URL`.
- When PostgreSQL is configured, `Store` is constructed with `persistent: false`. It can be used as a process-local cache or fallback collection, but it does not load or create `data/sylora.json`, and `store.save()` is a no-op.
- Development and ordinary unit tests can use the JSON `Store`. This keeps local setup simple and is not a production persistence path.
- Redis is used for shared rate counters and selected realtime/LIVE coordination. It is not an authoritative account or domain data store.
- Uploaded media bytes and derived HLS files remain filesystem-backed. Media persistence was not redesigned in Phase 1.
- `pg-mem` is used only by repository unit tests. The CI critical-path test uses a real PostgreSQL 16 service.

## Entity source map after Phase 1

`MIXED` below means that PostgreSQL is authoritative for the canonical route, while a secondary ecosystem view still depends on a process-local cache or an adjacent module remains memory-only. A memory cache is never written to JSON in PostgreSQL mode.

| Entity | Current source | Production source | Problem / remaining limitation | Phase 1 action |
|---|---|---|---|---|
| users | POSTGRES in production; JSON in development | POSTGRES | Some composite ecosystem views use a process-local safe user cache. | Canonical repository, case-insensitive identity lookup, account status/timestamps, and no production JSON writes. |
| account profile | POSTGRES in production; JSON in development | POSTGRES (`users`) | None on the canonical `/api/me` path. | Owner-scoped update and explicit account serializer. |
| public identity profile | POSTGRES in production; JSON in development | POSTGRES (`identity_profiles`) | Relationship-aware privacy is currently evaluated as public or self; follower/connection resolution is not wired to this route. | Awaited reads/writes and public lookup from the user repository. |
| sessions | POSTGRES in production; JSON in development | POSTGRES (`sessions`) | No refresh-token architecture; this is intentional. | Hashed, expiring, revocable opaque sessions with real logout invalidation. |
| posts/comments/reactions/follows/blocks | MIXED | POSTGRES for canonical social routes | Some broad dashboard/search helpers still consume process-local cached projections. | Main reads/writes and confirmed AI post actions use `PostgresAuthSocialRepository`; production JSON persistence is disabled. |
| direct messages | MIXED | POSTGRES for canonical conversation routes | Some aggregate ecosystem views can show only the local projection. | Membership-scoped PostgreSQL conversation/message access; confirmed action messages use the same repository. |
| live rooms/messages/battles/stages | MIXED | POSTGRES for canonical LIVE routes | A few ecosystem scheduling and aggregate helpers remain process-local. | Main LIVE management and confirmed action creation use `PostgresLiveRepository`. |
| gifts/catalog | POSTGRES in production; JSON in development | POSTGRES | Gift visuals and monetization providers are outside Phase 1. | Preserved transactional PostgreSQL gift path; no visual changes. |
| wallet/ledger | POSTGRES in production; JSON in development | POSTGRES | Development keeps its existing synthetic balance behavior. | Removed the production JSON wallet write; registration creates/ensures one PostgreSQL wallet. |
| subscriptions | NOT IMPLEMENTED | NOT IMPLEMENTED | `defaultIdentity().subscriptions` is an empty placeholder, not a subscription system. | Documented only; no monetization implementation. |
| notifications | MIXED | POSTGRES on canonical notification and action hooks | Some aggregate ecosystem views read only their process-local projection. | Canonical notifier writes once to PostgreSQL in production instead of PostgreSQL plus JSON. |
| AI messages/actions | MIXED | POSTGRES on canonical chat/action routes | The broad ecosystem action engine itself still contains process-local records. | Canonical AI repositories retained; confirmed post/LIVE/message/invite side effects route through canonical repositories. |
| AI memory | POSTGRES in production; JSON in development | POSTGRES (`ai_memories`, `ai_activity`) | Context builders may use a hydrated local projection during the request. | Memory list/create/update/delete/export/clear routes use PostgreSQL and scope every mutation to `user_id`. |
| personal AI settings | MIXED | POSTGRES for awaited identity/memory settings paths | Several pre-existing synchronous AI settings methods still mirror asynchronously. | Added persisted privacy/proactive/voice columns and awaited critical memory/identity paths; remaining sync helpers are documented debt. |
| communities/courses/business helpers | MEMORY in PostgreSQL mode; JSON in development | NOT YET CANONICAL | Tables exist for several domains, but many HTTP handlers do not use their PostgreSQL repositories. State is lost on restart. | Not rewritten in Phase 1; listed as a production-readiness gap. |
| calendar/projects/tasks/studio scenes | MEMORY in PostgreSQL mode; JSON in development | NOT YET CANONICAL | Production writes are process-local and are lost on restart. | Documented; outside the Phase 1 critical auth path. |
| media metadata/files | MEMORY + FILESYSTEM | FILESYSTEM path remains | Metadata can be lost on restart and opaque-ID reads need a visibility policy. | Documented only; media redesign is outside scope. |
| rate limiting | REDIS with MEMORY fallback | REDIS for multi-instance; MEMORY for single instance | In-memory counters are not shared across instances. | Route-specific auth limits and an explicit production policy. |

## Canonical account representation

The `users` row is the account source. Repository code maps snake-case SQL columns to this application representation:

| Application field | PostgreSQL column | Contract |
|---|---|---|
| `id` | `id` | UUID primary key. |
| `email` | `email` | Required, normalized to lowercase by registration, unique case-insensitively. |
| `username` | `username` | Required, 3–30 ASCII letters/numbers/underscore, unique case-insensitively. |
| `displayName` | `display_name` | Account display name, owner-editable. |
| `passwordHash` | `password_hash` | Required scrypt encoding; persistence-only and never serialized to an API response. |
| `createdAt` | `created_at` | Required timezone-aware timestamp. |
| `updatedAt` | `updated_at` | Required timezone-aware timestamp; updated with account edits. |
| `status` | `status` | `active`, `disabled`, or `blocked`; only active users can create/use sessions. |
| `role` | `role` | Existing single account role: `user` or `admin`. There is no roles array and no implemented moderator role. |
| `bio`, `locale`, `avatar` | corresponding columns | Existing account fields preserved. |

`toAccountUser()` is the explicit account-response whitelist. `toPublicUser()` removes email, role, status, and all password material. Neither serializer spreads the database row.

## Account and public-profile separation

- Auth account: `users`; canonical endpoints are `GET /api/me` and `PATCH /api/me`.
- Public/professional identity: `identity_profiles`; canonical self endpoints are `GET /api/identity` and `PATCH /api/identity`.
- Public lookup: `GET /api/identity/:userId` and `GET /api/public/u/:username`; privacy-filtered identity data is returned for active users only.
- Account ownership comes only from the authenticated session. Client-supplied `id`, `userId`, `email`, `username`, `role`, `status`, `verifiedPerson`, and reputation fields cannot retarget or elevate an identity update.

## Migration contract

`src/migrations.mjs` is the only migration manifest. It applies `001_initial_schema` through `013_phase1_identity_auth` in a fixed order.

Each migration:

- has a SHA-256 checksum recorded in `_sylora_migrations`;
- is applied in its own transaction;
- is skipped only when the recorded checksum matches;
- fails on a changed historical migration instead of silently applying drift.

Migration 013 is additive and non-destructive. It adds account lifecycle/timestamps, case-insensitive unique indexes, session lookup indexing, persisted personal-agent settings, and AI-memory metadata. The case-insensitive unique indexes intentionally fail if a legacy database contains conflicting accounts; an operator must resolve those records explicitly rather than allowing a silent merge.

The schema includes UUID primary keys, ownership foreign keys, targeted unique constraints, indexes on session expiry and common owner/time queries, timezone-aware timestamps, and cascades for account-owned sessions/social/AI data. Domain-specific exceptions in historical tables were not destructively rewritten.

## Verification evidence

- `tests/migrations.test.mjs`: ordered manifest, fixed checksums, required schema/constraints, transactional application, idempotency, and drift rejection.
- `tests/phase1-postgres.integration.mjs`: fresh PostgreSQL schema, all 13 migrations, registration/login/session/profile flow, server restart, profile persistence, session persistence, logout revocation, and proof that the configured JSON path is never created.
- `tests/postgres-*.test.mjs`: repository-level behavior under `pg-mem`; these complement but do not replace the PostgreSQL 16 integration test.

## Open persistence gaps

Phase 1 does not claim that all 299 registered endpoints are durable. Production PostgreSQL is authoritative for the critical account/auth/session/profile and canonical social, wallet, LIVE, and AI-memory paths. Several ecosystem modules still mutate only the nonpersistent `Store`, so their data is lost after a production restart. This is why the overall production source-of-truth result is `PARTIAL`, while the Phase 1 critical-path persistence test is expected to pass.
