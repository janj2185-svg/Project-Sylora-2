# Phase 1 authorization matrix

This matrix describes authorization enforced by the Phase 1 code. It is intentionally narrower than the full product surface. Routes not proven by frontend use or tests remain `UNVERIFIED` in `docs/architecture/API_INVENTORY.md`.

## Levels

| Level | Meaning in current code |
|---|---|
| `PUBLIC` | No account session is required. Object privacy checks may still apply. |
| `AUTHENTICATED` | A valid, unexpired, non-revoked session for an active user is required. |
| `OWNER` | The target owner ID is derived from the session or included in the repository predicate. |
| `MEMBER` | The authenticated user must be a member of the target conversation/community/conference. |
| `MODERATOR` | No canonical moderator account role exists in Phase 1. Community owner/member roles are domain-specific and are not a platform moderator role. |
| `ADMIN` | An active session whose persisted account role is `admin`. |

## Critical API matrix

| Area | Endpoint / operation | Required level | Enforcement | Phase 1 evidence |
|---|---|---|---|---|
| registration | `POST /api/auth/register` | PUBLIC + rate limit | Input validation, DB uniqueness, forced `role=user`, route/IP limit | Auth service and HTTP tests |
| login | `POST /api/auth/login` | PUBLIC + rate limit | Generic credential failure, status-locked transactional session issuance, route/IP limit | Auth service, HTTP, and real-PostgreSQL race tests |
| logout | `POST /api/auth/logout` | SESSION TOKEN (optional/idempotent) | Presented token hash is deleted | HTTP and PostgreSQL restart tests |
| account read | `GET /api/me` | OWNER | User is loaded from session; no target parameter | Unauthenticated, malformed, expired, and revoked-token tests |
| account update | `PATCH /api/me` | OWNER | Session user ID plus field whitelist | Cross-user/elevation payload test |
| own identity | `GET/PATCH /api/identity` | OWNER | Session user is passed to awaited repository operations | Cross-user identity payload tests |
| public identity | `GET /api/identity/:userId` | PUBLIC | Active-user lookup and privacy-filtered view | HTTP and PostgreSQL tests |
| public username profile | `GET /api/public/u/:username` | PUBLIC | Case-insensitive active-user lookup and privacy-filtered view | Route inventory; backend path verified |
| post create/react/comment write | `/api/posts`, `/api/posts/:id/react`, `/api/posts/:id/comments` | AUTHENTICATED | `requireUser`; actor ID comes from session | Existing social tests |
| post delete | NOT IMPLEMENTED | NOT IMPLEMENTED | No delete route exists | Forensic audit |
| direct conversations | `/api/conversations*` | MEMBER | Repository query joins/checks current user membership | Cross-conversation outsider test |
| wallet/account balance | wallet returned by `/api/me` | OWNER | Wallet key is session user ID | Authorization test |
| ledger | `GET /api/ledger` | OWNER | Query/filter includes session user ID | Cross-user ledger test |
| gifts | `POST /api/gifts/send` | AUTHENTICATED SENDER | Sender wallet comes from session; recipient is a separate validated target | Authorization and wallet tests |
| notifications | `GET /api/notifications` | OWNER | Query filters by session user ID | Repository path and route inventory |
| AI memory | `/api/ai/memory*`, `/api/ai/history` | OWNER + AI CONTROL | Every mutation receives session `user.id`; runtime read/propose additionally checks persisted privacy and AI permission controls | Cross-user, restart, two-instance, and provider-capture tests |
| AI activity/dashboard | `/api/ai/activity`, `/api/ai/dashboard` | OWNER | Repository reads filter by session user ID | Route and repository tests |
| LIVE create/chat | `POST /api/live`, `POST /api/live/:id/messages` | AUTHENTICATED | `requireUser`; actor/host comes from session | Authorization test for creation |
| LIVE management | end, resonance, host signaling, creator insights, stage/room management | OWNER/HOST | Repository or handler checks `host_id === session user` | Non-host end rejection test and existing LIVE tests |
| admin reports/audit | `/api/admin/reports*`, `/api/admin/audit` | ADMIN | `requireAdmin` checks persisted account role | Member rejected/admin accepted test |
| community channel management | channel creation | OWNER or ADMIN | Community owner/domain membership role or platform admin | Existing route enforcement; not a moderator system |
| media upload/transcode/job | `/api/media/upload`, transcode/job routes | OWNER | Created by session user; metadata lookup includes `userId` | Existing media tests |
| raw media read | `GET /media/:id` | PUBLIC BY OPAQUE ID | No visibility/ownership policy at byte-serving route | OPEN P1/P2 decision; not fixed in Phase 1 |
| developer identity API | `GET /api/v1/identity/me` | API KEY SCOPE or OWNER | Hashed, PostgreSQL-backed API key requires enabled app + `identity.read`; owner account must be active; session fallback uses `requireUser` | Repository and real-PostgreSQL restart/revoke tests |
| developer key lifecycle | `/api/developer/apps/:id/keys*` | OWNER | App/key queries bind `owner_id` to the session; list omits hash; revoke sets `revoked_at` | JSON and real-PostgreSQL create/list/restart/revoke tests |
| AI/provider routes | realtime/chat/ask | AUTHENTICATED | Session plus provider/rate checks | Existing API tests |

## P0/P1 changes in this phase

- Account/profile update targets now come only from the authenticated user. Client-supplied IDs, role, status, username, verification, and reputation fields cannot retarget or elevate the write.
- Public profiles load the active account and identity from PostgreSQL rather than depending on a JSON cache.
- AI-memory update/delete/clear/export paths use one owner-scoped repository path in production.
- Confirmed AI actions for posts, LIVE rooms, direct messages, and invitations call the canonical repositories/hooks instead of creating parallel production JSON records.
- Logout deletes the session hash and automated tests prove that replaying the old token fails.
- Critical auth/admin errors have machine-readable codes and safe messages.
- The unverified email allowlist shortcut was removed: public registration cannot create an admin account.
- Disabling or blocking an account revokes all existing PostgreSQL sessions, preventing re-enable token resurrection.
- AI memory opt-out and `memory_read`/`memory_propose` revocation are hydrated from PostgreSQL and enforced before provider context or new durable memory.
- Canonical account fields use atomic column patches; identity and AI-control JSON fields use locked merge patches, while stale create-if-missing requests preserve the already persisted security/profile state.
- Migration 014 removes pre-existing sessions for non-active accounts under an account-table lock before installing the status trigger, closing both upgrade and live-deploy resurrection windows.

## Security invariants tested

| Invariant | Result after Phase 1 |
|---|---|
| Unauthenticated caller cannot access `/api/me` | Enforced |
| Malformed session token is rejected | Enforced |
| Expired session is rejected | Enforced |
| Logged-out session cannot be replayed | Enforced |
| User A cannot update User B account/profile | Enforced on canonical account and identity routes |
| Conversation outsider cannot read messages | Enforced |
| User cannot read another user's ledger | Enforced |
| User cannot mutate another user's AI memory | Enforced |
| Non-host cannot end another user's LIVE room | Enforced |
| Non-admin cannot read admin audit | Enforced |
| Password hash is excluded from auth/account/public responses | Enforced by whitelist serializers and tests |
| Public registration cannot self-assign `admin` | Enforced by a fixed registration role and regression tests |

## Remaining authorization work

- `PARTIAL`: 54 registered endpoints have no detected frontend or automated-test caller and remain `UNVERIFIED`; they were not mass-deleted or relabeled as dead.
- `PARTIAL`: several broad ecosystem domains are process-local and have uneven repository/ownership coverage. They require domain-by-domain review before being considered production-ready.
- `NOT IMPLEMENTED`: a platform moderator role and moderator policy do not exist. Admin and domain-owner checks remain the only current elevated roles.
- `NOT IMPLEMENTED`: post deletion does not exist, so there is no owner/moderator delete policy yet.
- `PARTIAL`: public identity privacy currently distinguishes public/self in the canonical routes; follower/connection relationship resolution is not wired there.
- `OPEN`: raw media bytes are accessible by opaque ID without checking the media/video visibility field.
- `EXTERNAL DEPENDENCY`: existing persisted admin roles are enforced, but there is no audited in-app role-assignment lifecycle. New admin provisioning must remain a controlled operator action; public registration cannot perform it.
