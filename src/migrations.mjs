import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MIGRATION_ADVISORY_LOCK = 1_393_802_577;

export const MIGRATION_FILES = Object.freeze([
  ['001_initial_schema', 'infra/postgres/schema.sql'],
  ['002_auth_social_runtime', 'infra/postgres/migrations/002_auth_social_runtime.sql'],
  ['003_social_messaging_runtime', 'infra/postgres/migrations/003_social_messaging_runtime.sql'],
  ['004_wallet_gift_runtime', 'infra/postgres/migrations/004_wallet_gift_runtime.sql'],
  ['005_ai_runtime', 'infra/postgres/migrations/005_ai_runtime.sql'],
  ['006_live_runtime', 'infra/postgres/migrations/006_live_runtime.sql'],
  ['007_realtime_outbox', 'infra/postgres/migrations/007_realtime_outbox.sql'],
  ['008_resonance_live', 'infra/postgres/migrations/008_resonance_live.sql'],
  ['009_private_conferences', 'infra/postgres/migrations/009_private_conferences.sql'],
  ['010_ecosystem_core', 'infra/postgres/migrations/010_ecosystem_core.sql'],
  ['011_ecosystem_runtime', 'infra/postgres/migrations/011_ecosystem_runtime.sql'],
  ['012_live_runtime_state', 'infra/postgres/migrations/012_live_runtime_state.sql'],
  ['012_social_comment_reactions', 'infra/postgres/migrations/012_social_comment_reactions.sql'],
  ['013_dm_attachments_gift_refund', 'infra/postgres/migrations/013_dm_attachments_gift_refund.sql'],
  ['013_phase1_identity_auth', 'infra/postgres/migrations/013_phase1_identity_auth.sql'],
  ['014_session_status_invalidation', 'infra/postgres/migrations/014_session_status_invalidation.sql'],
  ['015_live_distribution', 'infra/postgres/migrations/015_live_distribution.sql']
]);

export function loadMigrations() {
  return MIGRATION_FILES.map(([name, relativeFile]) => {
    const file = path.resolve(root, relativeFile);
    const sql = fs.readFileSync(file, 'utf8');
    return {
      name,
      file,
      sql,
      checksum: createHash('sha256').update(sql).digest('hex')
    };
  });
}

export async function applyMigrations(client, { log = () => {} } = {}) {
  await client.query('SELECT pg_advisory_lock($1)', [MIGRATION_ADVISORY_LOCK]);
  let primaryError = null;
  try {
    await client.query('CREATE TABLE IF NOT EXISTS _sylora_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const migration of loadMigrations()) {
      const existing = await client.query('SELECT checksum FROM _sylora_migrations WHERE name=$1', [migration.name]);
      if (existing.rowCount) {
        if (existing.rows[0].checksum !== migration.checksum) throw new Error(`MIGRATION_CHECKSUM_MISMATCH:${migration.name}`);
        log(`${migration.name}: already applied`);
        continue;
      }
      await client.query('BEGIN');
      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO _sylora_migrations(name,checksum) VALUES($1,$2)', [migration.name, migration.checksum]);
        await client.query('COMMIT');
        log(`${migration.name}: applied`);
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [MIGRATION_ADVISORY_LOCK]);
    } catch (unlockError) {
      if (!primaryError) throw unlockError;
      log('migration advisory unlock failed; connection close will release the lock');
    }
  }
}
