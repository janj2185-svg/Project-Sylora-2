import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import pg from 'pg';

const databaseUrl = String(process.env.DATABASE_URL || '');
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrations = [
  { name: '001_initial_schema', file: path.resolve(__dirname, '../infra/postgres/schema.sql') },
  { name: '002_auth_social_runtime', file: path.resolve(__dirname, '../infra/postgres/migrations/002_auth_social_runtime.sql') },
  { name: '003_social_messaging_runtime', file: path.resolve(__dirname, '../infra/postgres/migrations/003_social_messaging_runtime.sql') },
  { name: '004_wallet_gift_runtime', file: path.resolve(__dirname, '../infra/postgres/migrations/004_wallet_gift_runtime.sql') },
  { name: '005_ai_runtime', file: path.resolve(__dirname, '../infra/postgres/migrations/005_ai_runtime.sql') },
  { name: '006_live_runtime', file: path.resolve(__dirname, '../infra/postgres/migrations/006_live_runtime.sql') },
  { name: '007_realtime_outbox', file: path.resolve(__dirname, '../infra/postgres/migrations/007_realtime_outbox.sql') },
  { name: '008_resonance_live', file: path.resolve(__dirname, '../infra/postgres/migrations/008_resonance_live.sql') },
  { name: '009_private_conferences', file: path.resolve(__dirname, '../infra/postgres/migrations/009_private_conferences.sql') },
  { name: '010_ecosystem_core', file: path.resolve(__dirname, '../infra/postgres/migrations/010_ecosystem_core.sql') },
  { name: '011_ecosystem_runtime', file: path.resolve(__dirname, '../infra/postgres/migrations/011_ecosystem_runtime.sql') },
  { name: '012_social_comment_reactions', file: path.resolve(__dirname, '../infra/postgres/migrations/012_social_comment_reactions.sql') }
].map(m => ({ ...m, sql: fs.readFileSync(m.file, 'utf8') })).map(m => ({ ...m, checksum: createHash('sha256').update(m.sql).digest('hex') }));
const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl, max: 2, application_name: 'sylora-migrate' });
const client = await pool.connect();

try {
  await client.query('CREATE TABLE IF NOT EXISTS _sylora_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const migration of migrations) {
    const existing = await client.query('SELECT checksum FROM _sylora_migrations WHERE name=$1', [migration.name]);
    if (existing.rowCount) {
      if (existing.rows[0].checksum !== migration.checksum) throw new Error(`MIGRATION_CHECKSUM_MISMATCH:${migration.name}`);
      console.log(`${migration.name}: already applied`);
      continue;
    }
    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query('INSERT INTO _sylora_migrations(name,checksum) VALUES($1,$2)', [migration.name, migration.checksum]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    console.log(`${migration.name}: applied`);
  }
} catch (error) {
  throw error;
} finally {
  client.release();
  await pool.end();
}
