# SYLORA — Security Audit

**Audit date:** 2026-08-13  
**Scope:** repository + running JSON-mode server.  
**Rule:** Never print secret values — only locations/types.

---

## 1. Secrets & configuration

| Finding | Severity | Location / evidence |
|---------|----------|---------------------|
| No `.env` / `.env.local` committed in workspace | OK | `ls` absent |
| `.env.example` documents keys without values | OK | `.env.example` |
| Default compose DB password `sylora_dev_only` | P2 | `compose.yaml`, `.env.example` — dev default risk if reused in prod |
| Companion token can auto-generate if unset | P2 | `src/companion.mjs` — must be set in production |
| Test file uses placeholder `OPENAI_API_KEY='test-key-not-a-real-secret'` | OK | `tests/api.test.mjs` |
| Docs mention deploy SSH secret names | OK (names only) | `docs/DEPLOY-HETZNER.md` |
| **No live API keys found in repo scan** | OK | rg for private key / sk- patterns |

---

## 2. Authentication & session

| Control | Status | Notes |
|---------|--------|-------|
| Password hashing | GOOD | scrypt via `src/auth.mjs` |
| Session storage | GOOD | SHA-256 token hash; raw token not persisted |
| Bearer auth | GOOD | `Authorization` header |
| Cookie sessions | N/A | Not used |
| Logout | GOOD | Deletes session |
| Login identity field | OK / UX risk | API expects `identity`; sending `email` → 401 (not a bypass) |
| Password recovery | MISSING | P1 product/security ops gap |
| Email verification | MISSING | P1 for abuse |
| Google OAuth | MISSING | Status only in integrations |
| 2FA / passkeys | MISSING | Flag off |
| Admin bootstrap | PARTIAL | `SYLORA_ADMIN_EMAILS` at register |
| Rate limit auth | PARTIAL | 30/min/IP (Redis or memory) |
| Brute force beyond IP RL | WEAK | No account lockout / CAPTCHA |

---

## 3. Authorization

| Area | Status | Notes |
|------|--------|-------|
| `requireUser` / `requireAdmin` | Present | Core pattern in `server.mjs` / routes |
| Live chat/events public read | By design | `/api/live/:id/events` unauthenticated |
| Gift stream SSE public | By design | `/api/gifts/stream` — no auth |
| Studio browser-source token | PARTIAL | Query token, 2h — treat as secret URL |
| IDOR testing | PARTIAL | Not exhaustively fuzzed; dual-store paths increase risk |
| Ecosystem org/business ownership checks | PARTIAL | Present in many handlers — needs systematic review |

---

## 4. Web / browser security

| Control | Status | Evidence |
|---------|--------|----------|
| CSP | PRESENT | `script-src 'self'` — browser console shows inline script violation (extension or beacon?) |
| X-Content-Type-Options / frame deny | PRESENT | security-headers tests |
| HSTS | OPT-IN | `SYLORA_ENABLE_HSTS` |
| XSS | RISK | Large `innerHTML` templating in `app.js` with `esc()` — generally escaped; any miss is high impact |
| CSRF | LOW for Bearer | Not cookie auth; still mind overlay token URLs |
| CORS companion | RESTRICTED | Origin allowlist + pairing token |

---

## 5. Injection & uploads

| Area | Status |
|------|--------|
| SQL | Parameterized via `pg` in repositories (good pattern) |
| JSON store | No SQL — file write atomic rename |
| Media upload | Exists (`/api/media/upload`) — needs size/type enforcement review (not fully penetration-tested) |
| HLS/transcode | Job path — ffmpeg availability environment-dependent |

---

## 6. Realtime / WebRTC

| Issue | Severity | Notes |
|-------|----------|-------|
| Signaling over HTTP+SSE | OK prototype | Auth on signal posts for live/calls/conferences |
| No TURN configured | P1 for product | NAT failure; also credential handling when added |
| Public live SSE | P2 | Presence/chat visibility |
| P2P mesh | P2 | Trust model = browser peers |

---

## 7. AI safety

| Control | Status |
|---------|--------|
| Provider fail-closed | GOOD | 503 without key |
| Memory secret sanitizer | GOOD | tests in `ai-eval` / intelligence |
| Write tools confirm-gated | GOOD | propose_post / propose_memory |
| Rate limit AI | PARTIAL | 12/min/user |
| Cost budgets on chat path | WEAK | `cost-control` not enforced on `/api/ai/chat` |
| Safety identifier header on realtime | PRESENT | hashed user id |

---

## 8. Economy / payments

| Issue | Severity |
|-------|----------|
| TEST LUMEN auto-grant 10000 | Expected sandbox — **must not** ship as production balances without payments |
| No payment provider | BLOCKED |
| Gift idempotency | GOOD on Postgres path; JSON path weaker |

---

## 9. Dependency vulnerabilities

`npm ci` → **0 vulnerabilities** reported (npm audit summary).  
Not a substitute for continuous SCA in CI (CI missing).

---

## 10. PII & privacy

| Topic | Status |
|-------|--------|
| Public user objects omit email | GOOD (`/api/users`) |
| `/api/me` returns email | Expected for owner |
| Privacy center / export / requests APIs | PARTIAL UI+API |
| Account deletion completeness | NOT fully E2E verified — treat as P1 gap until proven |
| Logging | Avoids dumping secrets in samples; production log PII policy unclear |

---

## 11. Admin exposure

Admin routes behind `requireAdmin`. Non-admin UI redirected (`/admin` screenshot).  
Ensure `SYLORA_ADMIN_EMAILS` not mis-set in prod.

---

## Priority findings

### P0
- None that allow unauthenticated RCE/auth bypass found in this pass.  
- **Operational P0 for launch:** shipping with TEST wallet + missing payments/auth recovery would be a trust failure (product), not classic vuln.

### P1
1. No password recovery / email verification  
2. Gift runtime broken (integrity of client modules) + Three bare imports from vendor addons if import map fails in nested contexts  
3. Cost controls not on primary AI chat path  
4. TURN/credentials lifecycle when enabling WebRTC at scale  
5. Account deletion / data export not proven E2E  

### P2
1. Default compose password  
2. Public gift/live SSE privacy model  
3. XSS residual risk from string HTML SPA  
4. Dual JSON/Postgres authz drift  
5. No CI security scanning  

### P3
1. CSP inline noise / extension false positives  
2. Locale mismatch (13 UI vs 3 server)  

---

## What was NOT done

- Full penetration test / IDOR matrix across all ~298 endpoints  
- Postgres RLS review (no RLS apparent — app-layer authz)  
- Production host inspection  
- Mobile WebView specifics  
