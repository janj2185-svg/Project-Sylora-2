# SYLORA — Security Audit

**Audited:** 2026-08-13  
**Scope:** repository + running JSON-dev server.  
**Rule:** no secret values are printed. Locations only.

This document **supersedes** `docs/audit/SECURITY_AUDIT.md` as source of truth.

---

## What is in good shape (verified)

| Control | Evidence |
|---|---|
| CSP `default-src 'self'`; `object-src none`; `frame-ancestors none` | `src/server.mjs` `securityHeaders()`; response headers on `/api/gifts/stream` |
| `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` | same |
| Passwords via scrypt | `src/auth.mjs` / register path |
| Sessions stored as SHA-256 `tokenHash`, not raw token | `tests/api.test.mjs` asserts |
| Public user list strips `email` | probe `USERS_EMAIL False` |
| Auth rate limit 30/min, API 300/min | `allowRequest()` |
| AI rate 12/min | `allowAi()` |
| Body size cap 1MB | `body()` |
| Path traversal guard on static | `staticFile()` resolves under `publicDir` |
| `.env` / `.env.local` gitignored | `.gitignore` |
| `.env.example` has empty secrets | no live keys committed |
| `npm audit` via install: 0 vulns reported on 59 packages | this VM `npm ci` |
| HSTS only if production + flag | not silently on HTTP |
| Admin gated | `/api/admin/reports` → 403 `ADMIN_REQUIRED` for normal user |
| OpenAI fail-closed | 503 not a fake answer on `/api/ai/chat` |
| Memory sanitizer rejects `sk-` patterns | `tests/consolidation.test.mjs` |

**No committed private keys / AWS keys / live OpenAI keys found** in tracked source (search for PEM / AKIA / hardcoded sk-). Test fixtures use fake `sk-abcdefghijklmnopqrstuvwxyz`.

---

## Findings

### P1 — Unauthenticated gift SSE
- **Where:** `GET /api/gifts/stream` (`src/server.mjs`)
- **Verified:** HTTP 200 `text/event-stream` without Authorization
- **Risk:** any client can subscribe to gift events (metadata, usernames, amounts)
- **UI also opens EventSource unconditionally** in `bootstrap()` — this hung several screenshot navigations

### P1 — Account recovery missing
- `/api/auth/forgot-password` → **404**
- Stolen/lost password = permanent lockout
- No email verification → anyone can register any email

### P1 — Delete account is not deletion
- `POST /api/privacy/requests` `{type: delete_account}` → `status: queued`
- `src/ecosystem/trust.mjs`: “logged and processed through privacy workflow”
- **No job deletes user rows/JSON**
- Compliance gap (GDPR-style)

### P1 — JSON gift transfer is not idempotent
- Postgres path requires `Idempotency-Key` (≥8 chars)
- JSON path in `server.mjs` does **not**
- Double-click / retry can double-spend TEST LUMEN; worse if this path is ever used with real value

### P1 — OAuth endpoints advertised but absent
- `OAUTH_DOC` in `developer-platform.mjs` lists `/api/v1/oauth/token|authorize|jwks`
- All **404**
- Apps UI can imply a developer platform that is not there (phishing / confused clients)

### P2 — Register response leaks email
- `POST /api/auth/register` user object includes `email`
- Acceptable to the owner of the session; still inconsistent with `publicUser()` and increases log/XSS impact

### P2 — Logout without token returns 200
- `POST /api/auth/logout` `{}` → `{ok:true}`
- Hides client bugs; not a bypass by itself

### P2 — Admin is email allowlist
- `SYLORA_ADMIN_EMAILS`
- No invite/audit of role changes in Postgres users beyond `role` column
- First registered user is not admin unless email listed (probe user `role: user`)

### P2 — CSP vs inline
- Console: inline script blocked (`script-src 'self'`)
- `style-src 'self' 'unsafe-inline'` — large XSS assist if any HTML injection
- Post/comment bodies are `esc()` in `app.js` — good; `prompt()` flows are not a sink

### P2 — WebRTC / TURN
- Empty ICE servers in this env
- Without TURN, P2P leaks local candidates to peers (expected) and fails NAT
- Signaling is SSE + auth on live/call signal routes (good) but gift stream is not

### P2 — Env name mismatch for payments
- Code: `PAYMENT_PROVIDER_API_KEY`
- Example: `SYLORA_PAYMENT_SECRET_KEY`
- Risk: operator thinks payments are configured when they are not (or the reverse)

### P2 — Companion connect-src
- CSP `connect-src` includes localhost companion + OBS ports
- Fine for local; production must not keep open OBS origins

### P2 — IDOR surface (needs dedicated test pass)
- Large number of `/:id` routes in ecosystem (orgs, invoices, conferences, calls)
- Auth required on most; **object-level authorization was not exhaustively tested** this audit
- Mark: **NOT FULLY VERIFIED** — treat as open risk

### P3 — Feature flags enable unfinished AI copilot / realtime translation
- Flags true while providers blocked
- UI can offer actions that 503

### P3 — No CSRF token
- Bearer-in-header SPA is generally OK (not cookie session)
- If token is ever stored in a cookie, CSRF appears

---

## Auth matrix (tested)

| Flow | Result |
|---|---|
| Register | 201 |
| Duplicate register | 409 ACCOUNT_EXISTS |
| Login wrong password | 401 INVALID_CREDENTIALS |
| Login ok | 200 |
| Me with token | 200 wallet |
| Me after logout | 401 |
| Google | 404 |
| Forgot password | 404 |
| Admin reports as user | 403 |
| Unauth rtc-config | 401 |
| Unauth gift stream | **200** |

---

## Secrets handling

| Item | Status |
|---|---|
| `.env` committed | No |
| `.env.example` placeholders | Yes, empty keys |
| Compose default `POSTGRES_PASSWORD=sylora_dev_only` | Dev default — **must not** ship to prod unchanged |
| OpenAI key in process | Unset here |
| Hetzner SSH | Documented as pending; host redacted in `DEPLOY-HETZNER.md` |

---

## Dependency / supply chain

- 4 runtime deps: `openai`, `pg`, `redis`, `three`
- Dev: `pg-mem`
- Vendored Three.js in `public/vendor/three` (addons import bare `'three'` — **breaks under native ESM without import map reaching that graph**)
- `lint`/`typecheck`/`build` are `node --check` only — **not** security linters

---

## Recommended security tests that do not exist

- IDOR suite on every `:id` write
- Authz on conference invite accept
- Gift stream must 401
- Session fixation / concurrent logout
- Upload content-type confusion (`/api/media/upload`)
- XSS in LIVE chat / community posts (esc is client-side; API stores raw)
- Production CSP + HTTPS redirect
