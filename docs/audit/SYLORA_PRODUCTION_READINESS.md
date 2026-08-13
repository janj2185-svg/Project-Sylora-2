# SYLORA — Production Readiness

## Verdict

**Not production-ready as a public multi-tenant platform.**  
Local/demo JSON runtime works for core social loops. Public launch is blocked by persistence/ops, media scale, payments, auth completeness, and several incomplete product pillars.

**Production readiness score: 22%**

## Checklist

| Capability | Status | Evidence |
|------------|--------|----------|
| Environment separation | PARTIAL | `.env.example` knobs; weak enforcement of prod persistence |
| Docker Compose stack | PRESENT / UNVERIFIED HERE | `compose.yaml` (app+postgres+redis); **Docker binary missing in audit VM** |
| Dockerfile | PRESENT | multi-stage test/runtime; ffmpeg in image |
| CI/CD | MISSING | no `.github/workflows` |
| Secrets management | PARTIAL | gitignore; deploy docs reference external secrets |
| DB migrations | PRESENT | `npm run db:migrate` + checksum table; **not executed against live PG here** |
| Backups | MISSING | no backup automation in repo |
| Logging | PARTIAL | console errors; no structured log shipper |
| Metrics / tracing | STUB | ecosystem observability module minimal |
| Health checks | PARTIAL | `/api/health`, `/api/ready`; compose healthcheck defined |
| Error monitoring | MISSING | no Sentry/etc |
| Rate limiting | PARTIAL | AI path limited; global API limits unclear |
| CDN / asset pipeline | MISSING | 45MB+ raw PNGs served from origin |
| Object storage | MISSING | local media paths |
| Deployment runbook | PARTIAL | `docs/DEPLOY-HETZNER.md` (untrusted without execution) |
| Rollback | MISSING | no release channel automation |
| Disaster recovery | MISSING | |
| Privacy / account deletion / export | PARTIAL | privacy request APIs exist; completeness unverified |
| Real payments | MISSING | blocked until provider |
| TURN for WebRTC | MISSING config | `BLOCKED_EXTERNAL` |
| Multi-instance realtime | UNVERIFIED | needs Redis outbox |

## What “works” for a private demo

- Single-node JSON or Compose stack (when Docker available)
- Email/password auth
- Social feed, DMs, sandbox gifts, LIVE chat rooms
- Studio UI + local OBS helper

## What blocks launch

1. No verified durable multi-user production persistence in this audit
2. LIVE video is P2P mesh (cap ~6) — not a streaming product
3. Payments / payouts absent
4. AI/voice depend on external key + cost controls immature
5. No CI, backups, observability, DR
6. Auth missing verification/recovery/OAuth expected by consumers
7. Broken gift FX module on client boot path
8. Legal/compliance surfaces (trust&safety at scale) incomplete

## Suggested gate for “beta production”

Must all be green:
- [ ] Postgres+Redis required in `NODE_ENV=production`
- [ ] Migrations applied with checksum verification in deploy
- [ ] TURN configured and tested on mobile networks
- [ ] SFU or equivalent for LIVE >N viewers **or** honest product scope = tiny rooms only
- [ ] Gift runtime green in browsers
- [ ] Password reset + email verify
- [ ] Payment provider OR explicit “no real money” product positioning
- [ ] CI: test+lint+image build
- [ ] Backups + restore drill
- [ ] Basic error monitoring + structured logs
