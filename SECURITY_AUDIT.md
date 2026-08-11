# SECURITY_AUDIT

## Strengths already present

- scrypt password hashing, opaque bearer sessions, SHA-256 token storage
- public user serializer strips email/role/password
- security headers + CSP + basic rate limits (Redis-backed when configured)
- AI write boundary: pending actions require confirmation
- OBS Companion loopback + pairing token + origin allowlist
- ICE/TURN credentials not hardcoded in client bundle
- Admin gated by `SYLORA_ADMIN_EMAILS`

## Issues / hardening still required

1. Ecosystem API keys: sandbox secret returned once; production must store only hash + rotate/revoke flows (hash persistence incomplete in JSON path).
2. Knowledge Graph visibility not yet enforced on every public read path.
3. Developer OAuth/OIDC not implemented — do not treat scope strings as a completed authz server.
4. Prompt-injection defenses for tool-using agents need continuous evaluation as tools expand.
5. File upload / HLS paths remain local-server based — object ACL/CDN isolation still required for production.
6. Webhook signature verification for payments is blocked until a PSP is connected.
7. Cross-tenant isolation for organizations needs object-level authorization tests beyond owner/admin policy endpoints.

## Defaults kept

- No production secrets in repo
- `.env.example` documents keys without values
- Translation/payments clearly labeled sandbox when providers absent
- Dangerous/financial AI actions resolve to `REQUEST_CONFIRMATION`
