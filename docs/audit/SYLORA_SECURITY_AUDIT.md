# SYLORA — Security Audit

Date: 2026-08-13 | Mode: static + runtime (JSON dev server)

**No secret values are printed below.**

---

## Executive summary

SYLORA implements meaningful baseline security (scrypt passwords, hashed session tokens, CSP, rate limits, AI memory secret rejection). It is **not production-safe** as-is due to: dual persistence complexity, missing OAuth/payment hardening, admin/report data in JSON file, no CSRF tokens for cookie-less API (Bearer-only mitigates), and large attack surface from 296 endpoints.

---

## Findings by severity

### P1 — Critical

| ID | Issue | Location | Evidence |
|----|-------|----------|----------|
| S-P1-1 | Production requires Postgres+Redis but dev JSON mode allows full data in plaintext file | `data/sylora.json`, `SYLORA_DATA_FILE` | File contains password hashes, sessions; committed path in repo `.gitignore` only |
| S-P1-2 | No Google OAuth despite user-facing product expectation — phishing gap if added without PKCE | `integrations.mjs` | BLOCKED_EXTERNAL only |
| S-P1-3 | Admin reports stored in same JSON store as user content — no RBAC separation in dev mode | `server.mjs` `/api/admin/*` | Works but file-level access = full compromise |
| S-P1-4 | Media served from local disk without auth on GET `/media/:id` | `serveMedia()` | Any guessable UUID leaks uploaded video |

### P2 — Major

| ID | Issue | Location |
|----|-------|----------|
| S-P2-1 | Bearer token in localStorage (`sylora_token`) — XSS steals session | `public/app.js` bootstrap |
| S-P2-2 | CORS not explicitly configured (same-origin SPA — OK today; risky if split) | server.mjs |
| S-P2-3 | Rate limit falls back to in-memory per-process — bypassed under horizontal scale without Redis | `allowRequest()` |
| S-P2-4 | AI tool actions expire 24h but no user notification channel audit | `aiCreateAction()` |
| S-P2-5 | Browser-source overlay token in query string — leak via logs/referrer | `/obs-overlay.html?token=` |
| S-P2-6 | Idempotency key required for Postgres gifts but not JSON gift path | `POST /api/gifts/send` |
| S-P2-7 | Session locale PATCH accepts only uk/pl/en server-side but UI offers 14 languages | `PATCH /api/me` vs i18n |

### P3 — Minor

| ID | Issue | Location |
|----|-------|----------|
| S-P3-1 | favicon 404 | public/ |
| S-P3-2 | CSP allows `'unsafe-inline'` styles | securityHeaders() |
| S-P3-3 | Logout succeeds without token (200) | runtime test |
| S-P3-4 | `.env.example` contains dev postgres password placeholder | not a leak but weak default |

---

## Category checklist

| Area | Status | Notes |
|------|--------|-------|
| Exposed secrets in repo | PASS | `.env.example` placeholders only; test keys in tests only |
| Auth bypass | PARTIAL | requireUser on protected routes; optional session on reads |
| IDOR | PARTIAL | Media GET unauthenticated; live SSE public |
| XSS | PARTIAL | `esc()` used in templates; innerHTML with escaped data |
| CSRF | N/A | Bearer header API — no cookies |
| SQL injection | PASS | Parameterized pg queries in repositories |
| Injection (JSON body) | PARTIAL | safeText truncation |
| WebSocket security | N/A | SSE instead |
| Upload safety | PARTIAL | Magic bytes + size limit; no AV scan |
| PII in logs | PARTIAL | Client errors posted to `/__client_error` truncated |
| Dependency vulns | PASS | npm audit 0 at audit time |
| AI prompt injection | PARTIAL | Safety filter in living-sylora; tool allowlist |
| Memory secrets | PASS | sanitizeMemoryValue rejects api keys (test) |

---

## Exposed credentials scan

| Pattern | Found in repo? |
|---------|----------------|
| Live API keys | No |
| Private keys PEM | No (placeholder env only) |
| Hardcoded passwords | Test fixtures only |
| Session tokens in data file | Hashed (tokenHash) in test data from runtime registrations |

---

## Recommendations (document only — not implemented)

1. Authenticate media downloads or use signed URLs
2. Move session to httpOnly cookie + CSRF if same-site
3. Enforce Redis rate limits in production health gate (already in `/api/ready`)
4. Complete OAuth with PKCE before any UI
5. Strip query tokens from OBS overlay (POST token exchange)
6. Align locale UI with server allowed set
