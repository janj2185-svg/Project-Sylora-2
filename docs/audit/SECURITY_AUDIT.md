# SECURITY AUDIT

## Present controls

- Scrypt password hashing; opaque bearer sessions; SHA-256 token storage
- `publicUser` strips email/password/role from public payloads
- Security headers: nosniff, DENY frame, referrer, permissions-policy, CSP
- Per-IP API/auth rate limits; AI rate limit 12/min/user (Redis when configured)
- Companion OBS bridge: loopback-only, pairing token, origin allowlist, action allowlist
- AI write boundary: tools may only propose; user must confirm
- Media upload: size/type/signature validation
- Admin gated by `SYLORA_ADMIN_EMAILS`

## Gaps / risks

| Risk | Severity | Notes |
|---|---|---|
| No general object-level ABAC | High | Needed for Identity privacy + KG + agents |
| AI prompt-injection / tool abuse evals missing | High | Expand tools only with policy + tests |
| Public unauthenticated gift SSE firehose | Medium | Consider auth or reduced payload |
| Audit log still in JSON under Postgres mode | Medium | Move with ecosystem migration |
| No GDPR export/delete-account pipeline | Medium | Portability required |
| No webhook signature / OAuth yet | Medium | Developer platform must ship signed webhooks |
| TURN credentials may be long-lived if misconfigured | Medium | Document ephemeral TURN requirement |
| CSRF less relevant for bearer tokens; cookie auth not used | Low | Keep bearer-only |
| Digital Human not a security issue | — | UX defect |

## AI-specific rules (non-negotiable)

1. No EXECUTE of financial/legal/publishing actions without permission level + confirmation when required.
2. Agents never see private KG nodes without visibility grant.
3. Tool registry is allowlist-based; unknown tools fail closed.
4. Secrets never enter model context or client bundles.
5. Synthetic / translated voice must be labeled when voice translation exists.
