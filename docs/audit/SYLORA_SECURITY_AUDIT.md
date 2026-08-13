# SYLORA — Security Audit

**Audited:** 2026-08-13  
**Rule:** report locations/types only — **never print secret values.**

## Controls observed (positive)

| Control | Location | Notes |
|---|---|---|
| Password hashing | `src/auth.mjs` | scrypt |
| Opaque session tokens | `src/auth.mjs` `makeToken` + hashed server-side sessions | Bearer in `Authorization` |
| Security headers | `src/server.mjs` `securityHeaders` | nosniff, DENY frame, referrer, Permissions-Policy, CSP |
| CSP | `script-src 'self'`; connect-src self + companion origins | Blocks random third-party scripts |
| HSTS | opt-in `SYLORA_ENABLE_HSTS=1` + production | Not forced blindly |
| Rate limiting | `allowRequest` + AI buckets; Redis if configured | Auth 30/min, API 300/min per IP |
| Admin gate | `SYLORA_ADMIN_EMAILS` + role checks | Reports/audit |
| Gift idempotency | Idempotency-Key on Postgres wallet path | Important for double-spend |
| Public user scrubbing | `Store.publicUser` strips passwordHash/email/role | Good baseline |
| npm audit | `npm audit` | **0 vulnerabilities** reported this run |

## Findings

### P0 / P1

| ID | Severity | Finding | Location / evidence |
|---|---|---|---|
| S1 | P1 | **Public gift SSE firehose** (`/api/gifts/stream`) — unauthenticated stream of gift events can leak social/economic activity metadata | `src/server.mjs` route; security scan note `giftSsePublic:true` |
| S2 | P1 | **No OAuth/OIDC login implementation** despite integration status flags — reduces risk of half-wired OAuth, but product may later add insecure shortcuts | probes 404; `integrations.mjs` Google status only |
| S3 | P1 | **Payment provider env present without checkout hardening** — currently blocked (good), but commerce checkout stubs may become unsafe if enabled without webhook verification | `.env.example` payment keys; `/api/payments/checkout` missing |
| S4 | P1 | **AI tool-calling confirm model depends on client honesty** for pending actions — generally confirm-gated (good); needs strict server-side authorization on every confirm path | `server.mjs` AI tools instructions |

### P2

| ID | Severity | Finding | Evidence |
|---|---|---|---|
| S5 | P2 | Bearer token in `localStorage` — XSS would steal sessions | `public/app.js` `sylora_token` |
| S6 | P2 | CSP allows `'unsafe-inline'` styles | `securityHeaders` |
| S7 | P2 | Hybrid JSON store on disk (`SYLORA_DATA_FILE`) — multi-instance race, backup/PII exposure if volume misconfigured | `compose.yaml` volume; `data/sylora.json` |
| S8 | P2 | LIVE signaling authorization matrix complex — host/viewer checks exist; needs adversarial test suite beyond unit tests | live signal routes |
| S9 | P2 | Admin via email allowlist env — misconfig can open moderation | `SYLORA_ADMIN_EMAILS` |
| S10 | P2 | Media upload path — type/size checks exist; malware scanning / AV not present | `/api/media/upload` |
| S11 | P2 | Companion token required in production note — empty in example; ensure not default-open | `.env.example` `SYLORA_COMPANION_TOKEN` |

### P3

| ID | Severity | Finding |
|---|---|---|
| S12 | P3 | No favicon → noisy 404 |
| S13 | P3 | Locale/i18n mismatch can confuse security UX copy |
| S14 | P3 | Large static assets increase attack surface for cache poisoning only if CDN weak |

## Secret scanning (this run)

Automated scan (`tmp/audit-security-scan.mjs`) flagged:

- **Local env file present:** `.env.local` created **for audit bootstrap only** (gitignored). Must not be committed.
- **assignment_secret-like patterns in tests** (fixture passwords) — expected in `tests/*.test.mjs`, not production secrets.
- **No committed `sk-` OpenAI keys or private key blocks** found in tracked source during this scan.

**Do not commit:** `.env`, `.env.local`, real `OPENAI_API_KEY`, payment keys, OAuth secrets, OIDC private keys.

## Auth security tests performed

| Case | Result |
|---|---|
| Invalid password | `401 INVALID_CREDENTIALS` |
| `/api/me` without token | `401 AUTH_REQUIRED` |
| Logout then `/api/me` | `401` |
| Google/forgot/reset/verify routes | `404` (missing, not bypass) |

## IDOR / authZ notes

- Live host-only signals checked (`HOST_ONLY_SIGNAL`).
- Conference membership checks present in routes.
- Ecosystem org/document paths need deeper IDOR fuzzing — **NOT fully adversarial-tested this audit** → mark residual risk.

## Dependency vulnerabilities

`npm audit`: **0** total (info/low/moderate/high/critical).

## Recommendations (no implementation now)

1. Authenticate or scope gift SSE; minimize PII in events.  
2. Move session to httpOnly secure cookie or add strict XSS CSP + sanitization audit.  
3. Keep payments fail-closed until webhook + idempotency + ledger reconciliation complete.  
4. Add security regression tests for IDOR on live/conference/orgs.  
5. Ensure production requires `SYLORA_COMPANION_TOKEN`, strong `POSTGRES_PASSWORD`, no default compose passwords on public hosts.
