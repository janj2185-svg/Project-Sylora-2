# Audit run notes (2026-08-13)

## Non-product changes made only to enable diagnostics

1. Created gitignored `.env.local` from `.env.example` with empty `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY` so the server boots in JSON-dev mode.
2. Started `node src/server.mjs` on port 8787 for API/UI verification.
3. Runtime wrote `data/sylora.json` (gitignored pattern `data/*.json`).
4. Added forensic documents under `docs/audit/SYLORA_*.md` and screenshot artifacts under `audit/screenshots/`.
5. Temporary helper scripts under `tmp/audit-*.mjs` (local diagnostics; not required for app).

No application feature code was refactored or deleted for product reasons.

## External dependencies not available in VM

- Docker / compose runtime
- PostgreSQL listening on 5432
- Redis on 6379
- OpenAI API key
- OBS / physical camera lab

Anything depending on these is marked **BLOCKED — NOT VERIFIED** in the SoT docs.
