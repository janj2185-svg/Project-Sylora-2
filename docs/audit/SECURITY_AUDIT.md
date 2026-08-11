# Security audit

## Existing controls

- Passwords use salted `scrypt`; session bearer tokens are random and stored as SHA-256 hashes.
- API body limits, basic IP rate limits, AI-specific limits, security headers and CSP are present.
- Ownership/membership checks protect messages, communities, conferences, LIVE signaling and media operations.
- AI write tools prepare actions and require explicit confirmation.
- Wallet PostgreSQL operations use idempotency and transactional ledger logic.
- Paid course enrollment fails closed without a payment provider.

## Material risks

1. JSON persistence has no encryption at rest and contains sensitive profile, message and memory data.
2. Bearer sessions have no refresh rotation, device management, MFA or OAuth.
3. CSP permits inline styles, and realtime development origins are embedded in policy.
4. Several rate limits are in memory when Redis is absent and therefore per-process.
5. Uploaded media validation is narrow and there is no malware scanning.
6. Audit data in JSON can be edited by a filesystem operator; it is append-only by convention, not tamper-evident.
7. Ecosystem PostgreSQL tables exist as a migration target, but server adapters are not yet implemented.
8. Webhook delivery and API authentication architecture must add signature rotation, SSRF protection and replay controls before production delivery.

## Required production gates

- Keep financial and legal actions human-controlled; never grant agent auto-execution.
- Keep translation, vectors and payments blocked unless a configured provider succeeds.
- Add CSRF analysis if cookie auth is introduced; current bearer auth is not cookie based.
- Add secret management, database encryption/backups, retention controls and account-wide export/deletion jobs.
- Add webhook egress allowlists, signed payloads, retry bounds and dead-letter review.
- Add security review before any third-party agent leaves sandbox.
