# Production data target

`schema.sql` is migration `001_initial_schema`; subsequent immutable migrations live under `migrations/` (currently through `009_private_conferences`). Apply all pending migrations with `npm run db:migrate`. The runner records every migration plus its SHA-256 checksum in `_sylora_migrations`, so re-running is safe and editing an already-applied migration fails loudly instead of silently rewriting production history.

The runnable core is being migrated incrementally: auth/users/sessions, social/messaging, notifications, the LUMEN wallet/gift ledger, AI persistence and LIVE room/chat lifecycle use PostgreSQL when `DATABASE_URL` is configured. Gift transfers lock both wallets in deterministic order, enforce an idempotency key and write sender, creator and platform ledger legs in one transaction. Remaining feature domains still use the JSON development store until their repositories are switched over.

The wallet runtime performs the monetary state change, balanced gift ledger, donor/support progress and durable recipient notification inside one PostgreSQL transaction. Gift realtime is emitted through the transactional outbox after commit. `008_resonance_live` adds ten SYLORA gifts, durable LIVE likes/Resonance counters and a three-minute creator-vs-creator Resonance battle state model.

Do not point real payments or creator payouts at the alpha JSON store.
