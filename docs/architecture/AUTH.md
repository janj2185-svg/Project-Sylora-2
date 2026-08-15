# Phase 1 authentication architecture

Sylora uses one account system and one revocable-session mechanism. Phase 1 completes the existing architecture; it does not add refresh tokens, cookies, social login, phone login, or password recovery.

## Canonical endpoints

| Method | Path | Authentication | Purpose |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public, rate-limited | Validate and create one account, one session, and one wallet. |
| `POST` | `/api/auth/login` | Public, rate-limited | Verify email or username plus password and create a session. |
| `POST` | `/api/auth/logout` | Optional Bearer token | Revoke the presented session if it exists; idempotent response. |
| `GET` | `/api/me` | Active session | Return the canonical safe account view and the caller's wallet. |
| `PATCH` | `/api/me` | Active session, self only | Update the caller's existing display/profile fields. |

There is no duplicate `/api/auth/me` route and no second register/login implementation.

## Registration

`AuthService.register()` is shared by PostgreSQL production and JSON development modes.

Validation and persistence contract:

- Email is trimmed, NFKC-normalized, lowercased, limited to 254 characters, and checked for a basic mailbox/domain shape.
- Username is trimmed/NFKC-normalized and must be 3–30 ASCII letters, digits, or underscores.
- Password is 10–256 characters and must contain at least one ASCII letter and one digit.
- Duplicate email or username is checked case-insensitively in the service and enforced by PostgreSQL unique indexes to close concurrency races.
- Passwords are encoded with Node scrypt, a random 16-byte salt, and a 64-byte derived value. Plaintext is not attached to the persisted user object.
- Public registration always assigns `role=user`; an unverified email claim can never create an admin.
- PostgreSQL inserts the user, initial session, wallet, and starter-ledger records in one transaction. A provisioning error rolls the entire registration back.
- Success is `201`; invalid inputs are `400`; duplicate identity is `409`.
- The response uses `toAccountUser()` and cannot contain `passwordHash`.

## Login and enumeration resistance

Login accepts `identity` as email or username and performs a case-insensitive lookup. Identity and password input lengths are bounded before database/hash work. A dummy scrypt verification is performed when no account is found so the unknown-account path does not skip the expensive password operation.

Wrong password, unknown account, and disabled/blocked account all return the same `401 INVALID_CREDENTIALS` body. This avoids revealing whether a login identity exists. Only accounts with `status=active` can authenticate or use a session. PostgreSQL rechecks and share-locks the account status in the same transaction that inserts a login session, so a concurrent disable either rejects issuance or revokes the newly committed session.

## Session contract

| Property | Implementation |
|---|---|
| Type | Opaque 256-bit random Bearer token, base64url encoded (43 characters). |
| Client transport | `Authorization: Bearer <token>`. No auth cookie is set or accepted. |
| At-rest representation | SHA-256 token hash only. The raw token is returned once. |
| Production storage | PostgreSQL `sessions`, keyed by `token_hash`, cascading on user deletion. |
| Development storage | JSON `sessions` with the same hash/expiry shape. Legacy plaintext tokens are hashed and the sanitized file is atomically rewritten during local-store load; plaintext is never accepted as a separate lookup mechanism. |
| Expiration | `SESSION_TTL_DAYS`, default 30 whole days and boot-validated to `1..365`. Checked during every lookup. |
| Verification | Strict token shape, hash lookup, unexpired session, and active joined user. |
| Revocation | Logout deletes the presented session hash. The old token then fails `/api/me`. |
| Replay/stale behavior | A revoked, expired, malformed, or inactive-account token is rejected with `401 AUTH_REQUIRED`. |
| Account status transition | Login issuance is serialized with status updates. Migration 014 purges legacy sessions for already non-active accounts under a table lock, and later active→disabled/blocked changes delete every session. Restoring an account cannot resurrect old tokens. |

No refresh-token architecture exists. It is not required by the current opaque, server-stored, revocable session model and was intentionally not introduced in Phase 1. A future decision can add refresh/rotation without creating a second user table.

The current browser client stores the opaque token in `localStorage`. That matches the pre-existing frontend and was not redesigned in this phase; it makes CSP/XSS prevention important. Moving to an HttpOnly cookie would be a separate transport and CSRF design decision.

## Account and profile responses

`toAccountUser()` returns only:

`id`, `email`, `username`, `displayName`, `bio`, `locale`, `avatar`, `role`, `status`, `createdAt`, `updatedAt`.

`toPublicUser()` returns only:

`id`, `username`, `displayName`, `bio`, `locale`, `avatar`, `createdAt`, `updatedAt`.

Neither response can include `passwordHash`, database column names, raw sessions, or secrets. Public identity fields are separately privacy-filtered from `identity_profiles`.
Canonical identity reads also reconstruct nested profile objects from explicit field lists, so unknown sensitive keys left by legacy JSON/JSONB records are not reflected into API responses.

## Critical error contract

Critical auth/user failures use a stable JSON object:

```json
{
  "error": "AUTH_REQUIRED",
  "code": "AUTH_REQUIRED",
  "message": "Authentication is required."
}
```

The machine code is stable; the message is safe for display. Auth handlers do not return stack traces, SQL, filesystem paths, secrets, plaintext passwords, or password hashes. Malformed JSON/body-limit failures use the same shape; unexpected repository failures return generic `500 INTERNAL_ERROR` rather than being mislabeled as a client error.

## Scoped developer API keys

Developer API keys are not a second user-login system. An authenticated owner creates a key for an existing developer app; the raw `syl_…` secret is returned once and only its SHA-256 hash is stored. PostgreSQL is authoritative in production, so keys work across instances and restart. Listing omits the hash, resolution requires an enabled app plus the declared scope, owner account status is rechecked, and owner-scoped deletion sets `revoked_at` so replay fails.

## Authorization checks

- `requireUser` resolves the caller exclusively from the presented session.
- `requireAdmin` additionally checks the persisted `role === 'admin'`.
- Existing admin rows remain supported, but Phase 1 deliberately has no public or email-allowlist admin assignment path. New assignments require a controlled external operator procedure until an audited lifecycle is implemented.
- `/api/me` updates are self-only because there is no target ID parameter and the patch whitelist excludes account identity, role, and status.
- Public identity updates are self-only; identity system fields and verification/reputation claims are excluded from the patch function.
- Conversation messages require membership; wallet/ledger use the session user; AI-memory mutations include `user_id`; LIVE management checks the host; admin APIs require the admin role.
- AI runtime memory reads require both `privacyControls.memory` and `permissions.memory_read`; new AI-memory proposals require the persisted memory-proposal permission.

The route-by-route matrix is in `docs/security/AUTHORIZATION_MATRIX.md`.

## Rate limiting

Auth limits use one-minute fixed windows keyed by route class and client IP:

| Route | Production | Development/test |
|---|---:|---:|
| `/api/auth/register` | 5/minute | 30/minute |
| `/api/auth/login` | 10/minute | 60/minute |
| Other `/api/auth/*` | 30/minute | 120/minute |
| Other API requests | 300/minute | 300/minute |

Redis provides shared counters when configured. The in-memory fallback is suitable for local development and a single production process, but it is not a distributed limit; multi-instance production must configure Redis for consistent enforcement.

## Provider and recovery extension points

- Google Login: not implemented.
- Phone Login: not implemented.
- Password recovery: no route or mock provider exists.

A future external provider must resolve or attach a provider identity to the existing canonical `users.id`, then ask the same session service to issue a session. It must not introduce a second user/session system. Provider identity tables, verified-email linking rules, and account-linking threat analysis should be designed when a real provider is selected.

## Automated evidence

- `tests/phase1-auth.test.mjs`: validation, normalization, duplicate identity, safe hashing/serialization, enumeration resistance, disabled account, malformed/expired/revoked sessions, self-only account updates, and repository recreation.
- `tests/phase1-auth-http.test.mjs`: register → login → session → `/me` → identity read/update → logout → old session rejected, including JSON development persistence assertions.
- `tests/phase1-authorization.test.mjs`: message membership, wallet isolation, AI-memory ownership, LIVE host ownership, and admin role enforcement.
- `tests/phase1-postgres.integration.mjs`: the critical path against migrated PostgreSQL 16, including concurrent migrations/wallet provisioning/account/profile controls, legacy disabled-session cleanup, account-status revocation, two application instances, restart-safe API keys/home projections, provider-captured AI-memory opt-out, and proof of no production JSON file.
