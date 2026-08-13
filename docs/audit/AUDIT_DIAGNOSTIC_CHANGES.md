# Diagnostic-only changes during forensic audit

No product/source fixes were applied.

| Change | Purpose |
|--------|---------|
| `npm ci` | Install dependencies |
| Started local PostgreSQL + Redis | Runtime verification |
| Created gitignored `.env.local` from `.env.example` | Local server env |
| Ran `node scripts/migrate.mjs` | Apply DB schema |
| Started `node src/server.mjs` | API/UI testing |
| Wrote screenshots under `audit/screenshots/` | Visual evidence |
| Wrote `docs/audit/SYLORA_*.md` | Source-of-truth reports |

Redis may have created local `dump.rdb` (should not be committed).
