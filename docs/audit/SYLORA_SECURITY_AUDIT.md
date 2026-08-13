# SYLORA — Security Audit (2026-08-13)

**No secret values are printed in this document.**  
Runtime stack audited: local Node server + Postgres + Redis; browser SPA.

## Summary

| Severity | Count |
|----------|------:|
| P0 | 2 |
| P1 | 3 |
| P2 | 8 |
| P3 | 4 |

## P0 — Blockers

### P0-1 Unauthenticated LIVE SSE receives WebRTC signaling
- **Where:** `src/server.mjs` `GET /api/live/:id/events` (no `requireUser`)
- **Risk:** Live room IDs are listable via `GET /api/live`. Any client can subscribe to SSE and observe `signal` events (SDP/ICE), enabling eavesdropping / session interference.
- **Also:** anonymous viewer-count inflation via same endpoint.

### P0-2 Admin role via email allowlist without verification
- **Where:** `src/server.mjs` register path + `SYLORA_ADMIN_EMAILS`
- **Risk:** Open registration. If an attacker registers an allowlisted email first, they receive `role=admin` and access `/api/admin/*` + ecosystem metrics. No email proof exists.

## P1 — Critical

### P1-1 Gift stream SSE unauthenticated
- **Where:** `GET /api/gifts/stream`
- **Risk:** Global gift events (amounts, giftId, public profiles, liveId) to any subscriber.

### P1-2 Uploaded media publicly fetchable by UUID
- **Where:** `GET /media/:id`, `GET /hls/...`
- **Risk:** Auth on upload, but no auth on read. Secrecy = UUID only.

### P1-3 Gift send broken on Postgres path (integrity / money path)
- **Where:** `POST /api/gifts/send` uses undefined `creatorShareBps` while constant is `creatorGiftShareBps`
- **Risk:** Core monetization path throws; JSON test path still works → false confidence. Not a classic vuln, but **economic integrity failure** in the intended production persistence mode.

## P2 — Major

| ID | Issue | Location |
|----|-------|----------|
| P2-1 | Session token in `localStorage` (`sylora_token`) | `public/app.js` |
| P2-2 | OBS browser-source token in query string | `/obs-overlay.html?token=` |
| P2-3 | Companion prints pairing token to stdout | `src/companion.mjs` |
| P2-4 | Main server listens on all interfaces by default | `server.listen(port)` |
| P2-5 | Admin role not re-evaluated on login | register-time only |
| P2-6 | Legacy JSON session compare fallback `tokenHash \|\| s.token` | `server.mjs` session lookup |
| P2-7 | Call initiation can ring arbitrary user IDs | `call-engine` / `/api/calls` |
| P2-8 | CSP allows `style-src 'unsafe-inline'`; HSTS opt-in only | security headers |

## P3 — Minor

- Password policy = length ≥ 8 only
- No committed `.env` secrets (good); `.env.example` has local-dev Postgres password placeholder
- `npm audit` → 0 vulnerabilities (lockfile)
- Register response includes `email` + `role` for the new user (self) — acceptable, but ensure list endpoints never do (public users checked: email stripped)

## What looks reasonably solid

- Passwords: scrypt + `timingSafeEqual` (`src/auth.mjs`)
- Sessions stored as SHA-256 hashes (Postgres + current JSON writes)
- Bearer auth (not cookies) → CSRF largely N/A
- Parameterized SQL in repositories
- Upload MIME/size/magic validation + ffprobe
- `publicUser` strips passwordHash/email/role for public lists
- Companion binds `127.0.0.1` + Bearer + Origin allowlist
- Ownership checks on media jobs, studio scenes, conference membership, live end
- Security headers + restrictive `script-src 'self'`
- Rate limits on auth / AI

## XSS notes

- `esc()` used widely in `app.js` for user text in `innerHTML`
- Residual risk: future attribute/URL injection; large string-template UI is fragile
- Console observed CSP blocks for unexpected gstatic probes (environment noise) — keep CSP strict

## Auth feature gaps (product security)

| Feature | Status |
|---------|--------|
| Register/login/logout | Works |
| Session refresh rotation | Not a modern refresh-token design |
| Password recovery | Missing |
| Email verification | Missing |
| Google / OIDC login | Missing / BLOCKED_EXTERNAL |
| Phone auth | Missing |
| 2FA / passkeys | Feature-flag false |
| Account deletion | Privacy request scaffolding only |

## Recommended security acceptance gates before public beta

1. Auth on live SSE **or** encrypt/minimize signaling payloads + short-lived viewer tokens  
2. Email verification before admin grant (or out-of-band admin provisioning)  
3. Auth or room-scoped tokens for gift SSE  
4. Signed/expiring media URLs  
5. Fix gift Postgres path + add integration test **with DATABASE_URL**  
6. HttpOnly cookie session or hardened token storage plan  
7. CI security headers + dependency audit job  
