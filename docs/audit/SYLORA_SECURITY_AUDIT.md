# SYLORA — Security Audit

**Scope:** static review + runtime headers + auth smoke on json-dev-runtime.  
**No secrets values are printed.**  
**Postgres/Redis/production TLS path: BLOCKED — NOT VERIFIED.**

## Summary

| Area | Rating | Notes |
|------|--------|-------|
| Transport security (this env) | N/A / weak | HTTP localhost only; HSTS opt-in via `SYLORA_ENABLE_HSTS` |
| Browser baseline headers | GOOD | `nosniff`, `DENY` frame, CSP present |
| Password storage | GOOD | scrypt in `src/auth.mjs` |
| Session tokens | ADEQUATE | Bearer random token; stored hashed; TTL days |
| Auth completeness | WEAK | No OAuth, recovery, email verify, MFA |
| Authorization | MIXED | `requireUser` / `requireAdmin` used; IDOR risk needs systematic review |
| Secrets in repo | OK (scan) | No live API keys found in source; `.env` gitignored |
| Dependency vulns | OK (npm audit at install: 0) | Re-check regularly |
| Uploads | PARTIAL | Media type/size checks exist; virus scanning not found |
| Realtime | PARTIAL | SSE auth on `/api/events`; browser-source tokens time-limited |
| Payment security | N/A | Payments not implemented |

## Findings

### P0 / P1

| ID | Sev | Finding | Location | Notes |
|----|-----|---------|----------|-------|
| S-01 | P1 | Gift client runtime fails to load (integrity of LIVE FX path / error noise) | `public/gift-runtime.js` vs `public/gift-v2/catalog.js` | Not classic vuln; breaks trusted client path |
| S-02 | P1 | Production may still boot JSON store if `DATABASE_URL` unset | `compose.yaml` sets DB, but `Dockerfile` CMD is `node src/server.mjs` without migrate-enforcement alone; server accepts JSON mode | Risk of accidental non-durable/auth-split deploys |
| S-03 | P1 | Admin role only assigned at register via env email list | `src/server.mjs` `SYLORA_ADMIN_EMAILS` | No rotation/promote; missing emails → no admin |

### P2

| ID | Sev | Finding | Location |
|----|-----|---------|----------|
| S-04 | P2 | CSP `style-src 'unsafe-inline'` required by inline styles in SPA templates | response headers from `/` |
| S-05 | P2 | OBS / companion connect-src allows localhost WS; misconfiguration risk if broadened | CSP connect-src |
| S-06 | P2 | Browser-source overlay token in query string (`/obs-overlay.html?token=`) | `server.mjs` studio browser-source | Leaks via referrer/logs if mis-shared |
| S-07 | P2 | No CSRF strategy beyond Bearer-in-header (OK for SPA) — ensure cookies never become session primary | auth design |
| S-08 | P2 | Memory sanitizer rejects secrets (good) but AI tool actions still need strict confirmations in all paths | `sylora-intelligence.mjs` |
| S-09 | P2 | Reports/moderation stored; limited abuse rate limits beyond AI | server AI rate limit exists; general API rate limit unclear |
| S-10 | P2 | File upload path — ensure authz on `/media/:id` access (review for IDOR) | media routes |

### P3

| ID | Sev | Finding |
|----|-----|---------|
| S-11 | P3 | Missing favicon causes 404 noise |
| S-12 | P3 | Verbose client error beacon `/__client_error` — ensure no PII in production logs |
| S-13 | P3 | Locale / i18n not a security issue but inconsistent validation may surprise users |

## Secrets handling

- `.env` / `.env.local` gitignored — good
- `.env.example` documents keys without values — good
- Runtime scan did **not** find committed live `sk-` / PEM private keys in project source
- Docs mention Hetzner deploy secrets as pending — do not commit

**If a secret is discovered later:** rotate immediately; report only path + type.

## Auth matrix (tested)

| Case | Result |
|------|--------|
| Register | 200 + token |
| Login valid | 200 + token |
| Login invalid | 401 `INVALID_CREDENTIALS` |
| `/api/me` with token | 200 |
| Logout | 200 |
| `/api/me` after logout | 401 |
| Google / phone / recovery / verify | MISSING |

## Headers observed (`curl -sSI /`)

- `x-content-type-options: nosniff`
- `x-frame-options: DENY`
- `content-security-policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; ...`

## Recommendations (do not implement in this audit)

1. Fail closed in production without Postgres (+ Redis if multi-instance)
2. Add password reset + email verification before public launch
3. Systematic IDOR test suite on `:id` routes
4. Fix gift runtime module export (integrity)
5. Move overlay auth to header/short-lived cookie; avoid token-in-query long term
6. Add CI `npm audit` + secret scanning
