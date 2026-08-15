# SYLORA Phase 1 forensic audit (baseline)

Audit date: 2026-08-14

Baseline: `b4a994bb65bfce7b991cc80966102abdc49ae6d7`

Branch: `agent/sylora-phase1-data-auth`

This document records the system as it existed before Phase 1 implementation. It is evidence for the changes in this phase, not a claim about the final state.

## Baseline evidence

- GitHub Actions run for the baseline commit: `CI / lint-build-test` completed successfully.
- Dependency installation: `npm ci` completed after moving the npm cache to a writable temporary directory.
- The exact lint and build commands from `package.json` completed successfully.
- Tests: 143 passed, 0 failed, 0 skipped.

## Data source map before Phase 1

`POSTGRES` means the production request path reads and writes PostgreSQL. `JSON` means `Store` persists `data/sylora.json`. `MEMORY` means process-local state. `REDIS` is ephemeral/distributed coordination. `MIXED` means more than one path can act as a source or receive a production write.

| Entity | Current source | Intended production source | Problem found | Phase 1 action |
|---|---|---|---|---|
| users | MIXED (PostgreSQL + persisted JSON cache) | POSTGRES | `cacheUser()` puts full canonical users, including `passwordHash`, into `Store`; later `store.save()` persists the cache. | Stop production JSON loading/writes and keep PostgreSQL authoritative. |
| account profile (`displayName`, `bio`, `locale`, `avatar`) | MIXED | POSTGRES | `/api/me` uses PostgreSQL, but the returned user is cached and persisted to JSON. No `updated_at` exists on `users`. | Add deterministic migration, canonical timestamps, safe account serializer, and PostgreSQL-only production persistence. |
| public identity profile | MIXED (JSON first, asynchronous PostgreSQL mirror) | POSTGRES | `ensureIdentity()` and `updateIdentity()` read JSON first and fire-and-forget a PostgreSQL write. Public routes look only in `store.data.users`. Profiles can disappear after restart or become stale. | Add awaited PostgreSQL identity reads/writes and load public users from the user repository. |
| sessions | POSTGRES in production; JSON in development | POSTGRES | Opaque Bearer tokens are SHA-256 hashed and expiring, but the JSON fallback still accepts a legacy plaintext `session.token`. | Remove plaintext-token acceptance, prune expired sessions, document revocation and expiry. |
| posts | MIXED (PostgreSQL authoritative plus persisted JSON cache) | POSTGRES | Production reads PostgreSQL, but `cachePost()` can persist the same post to JSON. | Keep only an in-memory cache in production; never persist it to JSON. |
| direct messages | POSTGRES in production; JSON in development | POSTGRES | Main message routes correctly check conversation membership. JSON remains the development implementation. | Preserve the repository path and document ownership. |
| live rooms/messages | POSTGRES in production; JSON in development | POSTGRES | Main LIVE paths use PostgreSQL. Several out-of-scope ecosystem helpers still have JSON implementations. | Preserve canonical LIVE repository paths; document remaining noncritical JSON-only helpers. |
| gifts/catalog | POSTGRES in production; JSON catalog in development | POSTGRES | Production catalog and transfers use PostgreSQL. JSON defaults remain for development. | Preserve development support and prevent production JSON persistence. |
| wallet/ledger | MIXED | POSTGRES | Registration creates the PostgreSQL wallet and also inserts a separate 10,000-LUMEN JSON wallet. The IDs match, but balances can diverge. | Remove the production JSON wallet write. |
| subscriptions | NOT IMPLEMENTED (identity placeholder array only) | NOT IMPLEMENTED | There is no canonical subscription table or API. A placeholder array must not be presented as a production feature. | Document only; implementation is outside Phase 1. |
| notifications | MIXED (PostgreSQL + JSON double write) | POSTGRES | `notifyUser()` calls `store.notify()` before inserting the same notification in PostgreSQL. | Build the notification once and write only to PostgreSQL in production. |
| AI messages/actions | POSTGRES on canonical server routes; JSON in development | POSTGRES | Main chat/action routes use `PostgresAiRepository`. Some ecosystem views still read JSON caches. | Keep canonical repository routes and document remaining partial ecosystem views. |
| AI memory | MIXED | POSTGRES | Create/delete routes use PostgreSQL, while memory center/export/update/clear routes use JSON only. This is a duplicate implementation. | Route all memory CRUD/export/clear through the canonical AI repository in production. |
| rate limits | REDIS with MEMORY fallback | REDIS/MEMORY policy | Every auth route shares a broad 30 requests/minute bucket. Login and registration have no distinct policy. | Add route-specific policy and document the single-instance fallback. |
| browser-source tokens / SSE peers | MEMORY (Redis for selected LIVE coordination) | MEMORY/REDIS | Ephemeral by design and not account/session authentication. | Document; no redesign in Phase 1. |

## Persistence topology before Phase 1

At startup `server.mjs` always constructs `new Store(dataFile).load()`, even when `DATABASE_URL` is configured. `PostgresAuthSocialRepository`, `PostgresWalletRepository`, `PostgresAiRepository`, and `PostgresLiveRepository` are then selected per request when their pool exists. The cache helpers and broad `store.save()` calls mean PostgreSQL and JSON are not cleanly separated in production.

The ecosystem layer is more problematic: many methods mutate JSON first, then call a PostgreSQL repository asynchronously with `.catch(() => {})`. That makes JSON the effective first source for those methods and hides failed database writes. Phase 1 will correct the critical auth/profile/memory paths only; it will not rewrite every ecosystem module.

## Migration audit before Phase 1

The migration runner has a deterministic ordered manifest (`001` through `012`), records SHA-256 checksums in `_sylora_migrations`, wraps each migration in a transaction, and rejects changed migration files. Positive findings:

- UUID primary keys are used for account and domain entities.
- Sessions cascade on user deletion and have user/expiry indexes.
- Core social ownership uses foreign keys and appropriate cascades.
- Wallet transfers use constraints, idempotency, and transactions.

Problems:

- There is no automated fresh-PostgreSQL migration test.
- `users` has no `updated_at` or account status.
- `username` is unique case-sensitively, while application login and duplicate checks are case-insensitive. The existing `lower(username)` index is not unique, leaving a concurrency race for case variants.
- Email is normalized by the application, but the database has no case-insensitive unique constraint for legacy or concurrent noncanonical writes.
- No migration contract test verifies required constraints and indexes.

## Auth forensic map before Phase 1

| Concern | Baseline implementation | Finding |
|---|---|---|
| Register | `POST /api/auth/register` | One implementation. Basic email regex, 3-character username, 8-character password, scrypt hash, automatic session. |
| Login | `POST /api/auth/login` | One implementation. Email/username identity and constant error code for unknown user/wrong password. |
| Logout | `POST /api/auth/logout` | Deletes the hashed session token; idempotent even without a valid session. |
| Authenticated account | `GET /api/me` | Canonical account endpoint. No duplicate `/api/auth/me`. |
| Account update | `PATCH /api/me` | Self-only because target user comes from the session. |
| Public profile | `GET /api/identity/:userId`, `GET /api/public/u/:username` | Separate from account, but production lookup depends on JSON cache. |
| Token type | 256-bit random opaque Bearer token | Token is returned once and only SHA-256 hash is stored. |
| Expiration | `SESSION_TTL_DAYS`, default 30 days | Enforced in PostgreSQL and JSON session lookup. |
| Verification | `Authorization: Bearer <token>` | No cookies and no alternate auth middleware. |
| Revocation | Delete row/hash on logout | Revocable session architecture is already present; no refresh tokens. |
| Password hashing | Node `scrypt` with a random 16-byte salt | No plaintext password is intentionally persisted. Input length is not bounded. |
| Admin (baseline finding) | `role === 'admin'` | Before Phase 1, an email allowlist could elevate public registration. Phase 1 removed that forgeable path; admin routes still check only the persisted role. |
| Recovery | None | No fake password-recovery route was found. |
| Google/phone | Not implemented | Integration status exists only; no second user system exists. |

## Sensitive-field audit before Phase 1

`Store.publicUser()` removes `passwordHash`, `email`, and `role`; account responses deliberately add only email and role. No direct API response returning `passwordHash` was found. However, the full user object is persisted in the JSON cache in production, which unnecessarily duplicates password hashes on disk and must be removed.

The global error handler maps unknown errors to `BAD_REQUEST` and does not return stack traces, SQL, filesystem paths, or secrets. Critical auth errors are not yet consistent: most responses expose only `{ "error": "CODE" }` rather than a stable `code`/`message` contract.

## Authorization findings before Phase 1

| Critical area | Baseline result | Evidence / issue |
|---|---|---|
| profile update | OWNER enforced | `PATCH /api/me` derives the target from the authenticated session. No cross-user update route exists. |
| post delete | NOT IMPLEMENTED | No delete endpoint exists; therefore there is no current delete bypass to fix. |
| messages | AUTHENTICATED + MEMBER | Conversation read/write queries require current-user membership. |
| wallet/ledger | AUTHENTICATED + SELF | `/api/me`, `/api/ledger`, and gift debit use the authenticated user ID. |
| gifts | AUTHENTICATED sender | Recipient is resolved separately; sender wallet always comes from the session. |
| admin | ADMIN | Report and audit routes use `requireAdmin`; ecosystem metrics checks admin role. |
| LIVE management | OWNER/HOST | End, host signaling, resonance, room/stage management check host ownership. |
| AI memory | OWNER on canonical routes | PostgreSQL delete/find operations include `user_id`; duplicate JSON routes also filter by user ID but are not durable. |

P0/P1 issues selected for Phase 1:

1. Production JSON double writes for user/profile/wallet/notification caches.
2. Public profile and identity routes depending on the JSON cache.
3. Duplicate AI-memory persistence paths.
4. Missing database-enforced case-insensitive account uniqueness.
5. Missing canonical `updatedAt` and account status enforcement.
6. Missing automated logout invalidation, cross-user profile, malformed/expired-token, safe-response, migration, and restart-persistence coverage.

Out-of-scope findings (document only): media bytes can be fetched by opaque ID without a visibility check; many noncritical ecosystem features remain JSON/in-memory despite PostgreSQL tables; no post-delete endpoint exists; subscriptions and password recovery are not implemented.
