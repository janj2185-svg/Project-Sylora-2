import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMigrations, loadMigrations, MIGRATION_FILES } from '../src/migrations.mjs';

const EXPECTED_CHECKSUMS = Object.freeze({
  '001_initial_schema': '19d20cc466ca7b7a76ceadf491f4c4d1312fd3b9cb6d059d8cf135ab5602e9a7',
  '002_auth_social_runtime': 'b5cf3897d24ef8cf58f260cffc8e4f04e4ea996219ef327613bc906863391b3d',
  '003_social_messaging_runtime': '57fab59c56ca54acc0d7f060f35d5e2e022157096aadca91c5099b94e10c21d2',
  '004_wallet_gift_runtime': 'a147b6ed27f6d3bbc62b6c66fb409c3afa741d88f7d5033ffaf609a9e4c4e418',
  '005_ai_runtime': 'dee6ee82a5208f24ac9629242351d360e5905324eab4efe06ba3a954b6668171',
  '006_live_runtime': '525b8fa0adcd6b0cfe5bfe43be68287ec5986985c6cb370ff12b28cb056bb721',
  '007_realtime_outbox': 'afbb119d9a8f46026cfa8da97aa0a2754efe1d2a4523f9eb0b5c9a8bff6e55e8',
  '008_resonance_live': '2885040cdce0651efff0bb1b7978dc68316addf2dc8d5dea71e39de9f5fd7cb8',
  '009_private_conferences': '4e9e48602fb53978b4912c33b07622c57f0c1276f065d2ce551af0b389662d82',
  '010_ecosystem_core': '402a28216e1d88b862d436e9526a464ed659a9807abe8a21abdff1082f486b98',
  '011_ecosystem_runtime': 'e4cc689490e878634b2d47b0a9fc2d58e1efc8c6454caffffeba9d7e36d2c88a',
  '012_live_runtime_state': 'f969939234e92ccb68ed1c59f13399c14ec35e4893503267c10c71953da96a69',
  '012_social_comment_reactions': 'e36fb2bd3543ab1cf5e7820c635f595d7fb43524fd9d2110bfbe18c4ecd6c1a4',
  '013_dm_attachments_gift_refund': 'eebbc74b83f9ff53489f868711a4cdeff1f627609cd97a97662589ece95be3c0',
  '013_phase1_identity_auth': 'e735b7e71e50d889a3b040f3ac18b4e7de44dffe64b2709a2b5840c2e4173960',
  '014_session_status_invalidation': '85b51cdf8872c12f0a90a41fb240d528d200703f2fd7ff4f67d7cfa7493a6740',
  '015_live_distribution': '3a9de8c0f26b3329099fc66b0c64cd6867f53b86f9cba5128eccbf8d68f91c22'
});

test('migration manifest is ordered, immutable, and complete through Phase 1', () => {
  const migrations = loadMigrations();
  assert.equal(migrations.length, 17);
  assert.deepEqual(migrations.map(item => item.name), MIGRATION_FILES.map(([name]) => name));
  assert.deepEqual(Object.fromEntries(migrations.map(item => [item.name, item.checksum])), EXPECTED_CHECKSUMS);
  assert.deepEqual(migrations.map(item => item.name), Object.keys(EXPECTED_CHECKSUMS));
});

test('fresh schema defines critical keys, ownership cascades, identity uniqueness, timestamps, and indexes', () => {
  const sql = loadMigrations().map(item => item.sql).join('\n');
  assert.match(sql, /CREATE TABLE users\s*\([\s\S]*?id uuid PRIMARY KEY/i);
  assert.match(sql, /CREATE TABLE sessions\s*\([\s\S]*?user_id uuid NOT NULL REFERENCES users\(id\) ON DELETE CASCADE/i);
  assert.match(sql, /users_email_lower_unique_idx ON users\(lower\(email\)\)/i);
  assert.match(sql, /users_username_lower_unique_idx ON users\(lower\(username\)\)/i);
  assert.match(sql, /users ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active'/i);
  assert.match(sql, /users ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now\(\)/i);
  assert.match(sql, /sessions_user_expires_idx ON sessions\(user_id,expires_at DESC\)/i);
  assert.match(sql, /LOCK TABLE users IN SHARE ROW EXCLUSIVE MODE;[\s\S]*DELETE FROM sessions\s+USING users/i);
  assert.match(sql, /DELETE FROM sessions\s+USING users[\s\S]*users\.status <> 'active'/i);
  assert.match(sql, /DELETE FROM sessions WHERE user_id = NEW\.id/i);
  assert.match(sql, /AFTER UPDATE OF status ON users/i);
  assert.match(sql, /ai_memories ADD COLUMN IF NOT EXISTS category text NOT NULL/i);
  assert.match(sql, /ai_memories_user_updated_idx ON ai_memories\(user_id,updated_at DESC\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS comment_reactions/i);
  assert.match(sql, /messages ADD COLUMN IF NOT EXISTS attachment jsonb/i);
  assert.match(sql, /gift_transfers ADD COLUMN IF NOT EXISTS refunded_at timestamptz/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS live_stream_destinations/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS live_distribution_sessions/i);
  assert.match(sql, /live_distribution_sessions_one_active_idx/i);
});

test('migration runner applies every migration transactionally and is idempotent', async () => {
  const applied = new Map();
  const commands = [];
  const client = {
    async query(sql, params = []) {
      commands.push(String(sql).trim().split(/\s+/).slice(0, 3).join(' '));
      if (/^SELECT checksum FROM _sylora_migrations/i.test(sql)) {
        const checksum = applied.get(params[0]);
        return { rowCount: checksum ? 1 : 0, rows: checksum ? [{ checksum }] : [] };
      }
      if (/^INSERT INTO _sylora_migrations/i.test(sql)) applied.set(params[0], params[1]);
      return { rowCount: 0, rows: [] };
    }
  };
  await applyMigrations(client);
  assert.equal(applied.size, 17);
  assert.equal(commands.filter(command => command === 'SELECT pg_advisory_lock($1)').length, 1);
  assert.equal(commands.filter(command => command === 'SELECT pg_advisory_unlock($1)').length, 1);
  assert.equal(commands.filter(command => command === 'BEGIN').length, 17);
  assert.equal(commands.filter(command => command === 'COMMIT').length, 17);
  const before = commands.length;
  await applyMigrations(client);
  assert.equal(commands.slice(before).some(command => command === 'BEGIN'), false);
  assert.equal(commands.filter(command => command === 'SELECT pg_advisory_lock($1)').length, 2);
  assert.equal(commands.filter(command => command === 'SELECT pg_advisory_unlock($1)').length, 2);
});

test('migration runner fails closed when an applied checksum differs', async () => {
  const first = loadMigrations()[0];
  let unlocked = false;
  const client = {
    async query(sql, params = []) {
      if (/^SELECT pg_advisory_unlock/i.test(sql)) unlocked = true;
      if (/^SELECT checksum FROM _sylora_migrations/i.test(sql) && params[0] === first.name) {
        return { rowCount: 1, rows: [{ checksum: '0'.repeat(64) }] };
      }
      return { rowCount: 0, rows: [] };
    }
  };
  await assert.rejects(() => applyMigrations(client), /MIGRATION_CHECKSUM_MISMATCH:001_initial_schema/);
  assert.equal(unlocked, true);
});
