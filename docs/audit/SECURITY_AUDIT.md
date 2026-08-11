# SYLORA — Security Audit

## Strengths (verified in codebase)
- Scrypt password hashing, opaque bearer sessions, SHA-256 session token storage in PG mode
- Security headers + CSP on static/API responses
- Per-IP API/auth rate limiting; per-user AI rate limiting
- AI write boundary: `propose_*` tools → pending actions → user confirm
- OBS/Companion localhost + pairing token + origin allowlist
- Privacy-safe `publicUser` serializer
- Object-level checks on conversations, conferences, LIVE host actions
- CSRF: JSON API + bearer tokens (no cookie session for API)

## Phase 1 additions
- AI permission PATCH requires auth; changes logged to `ai_action_log`
- Memory export/delete gated by permission guards
- Knowledge nodes scoped to authenticated owner

## Risks / gaps
| Risk | Severity | Mitigation path |
|------|----------|-----------------|
| Hybrid JSON store for some domains | Medium | Complete PG migration |
| No ABAC on knowledge edges | Medium | Edge consent + traverse checks |
| AI prompt injection → tool abuse | Medium | Expand action levels; tool allowlist |
| No WAF / bot management | Medium | Anti-bot layer Phase 6 |
| File upload 100MB local | Low | Object storage + scanning |
| Admin by email env only | Low | RBAC admin roles in PG |
| WebRTC P2P exposure | Low | TURN + SFU hardening |

## AI-specific
- Realtime transcripts idempotent by `source_event_id`
- No automatic financial/legal execution without confirmation
- **Recommendation**: wire `guardAction` into all future agent tools

## Secrets
- `OPENAI_API_KEY` via `.env.local` / env — not in repo ✓
- `SYLORA_ICE_SERVERS_JSON` for TURN — not hardcoded in client ✓

## Compliance readiness
- Memory export/delete: **PARTIAL** (user-initiated)
- Audit log: **PARTIAL** (AI actions + admin moderation)
- Data portability full account export: **NOT_STARTED**
