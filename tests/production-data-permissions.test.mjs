import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Store } from '../src/store.mjs';
import {
  validateProductionEnv,
  usesInsecureDefaultPostgresPassword
} from '../src/production-env.mjs';

test('production env: real DATABASE_URL password is OK even if leftover POSTGRES_PASSWORD is default', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:real_prod_secret@postgres:5432/sylora',
    REDIS_URL: 'redis://redis:6379',
    POSTGRES_PASSWORD: 'sylora_dev_only'
  };
  const out = validateProductionEnv(env);
  assert.equal(out.ok, true);
  assert.deepEqual(out.warnings, []);
  assert.equal(
    usesInsecureDefaultPostgresPassword({
      databaseUrl: env.DATABASE_URL,
      postgresPassword: env.POSTGRES_PASSWORD
    }),
    false
  );
});

test('production env: default password inside DATABASE_URL is flagged without leaking secrets', () => {
  const env = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:sylora_dev_only@postgres:5432/sylora',
    REDIS_URL: 'redis://redis:6379',
    POSTGRES_PASSWORD: 'anything'
  };
  const out = validateProductionEnv(env);
  assert.equal(out.ok, false);
  assert.ok(out.warnings.includes('DEFAULT_POSTGRES_PASSWORD'));
  // Ensure validator return value does not embed the connection URL / secret material
  const serialized = JSON.stringify(out);
  assert.equal(serialized.includes('postgres:5432'), false);
  assert.equal(serialized.includes('real_prod'), false);
});

test('production env: missing DATABASE_URL / REDIS_URL codes', () => {
  const out = validateProductionEnv({ NODE_ENV: 'production' });
  assert.equal(out.ok, false);
  assert.ok(out.warnings.includes('DATABASE_URL_MISSING'));
  assert.ok(out.warnings.includes('REDIS_URL_MISSING'));
});

test('Store.save uses atomic tmp + rename and surfaces DATA_DIR_NOT_WRITABLE', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-store-'));
  const file = path.join(dir, 'sylora.json');
  const store = new Store(file);
  store.data.users = [{ id: 'u1' }];
  store.save();
  assert.ok(fs.existsSync(file));
  assert.equal(fs.existsSync(`${file}.tmp`), false);
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert.equal(parsed.users[0].id, 'u1');

  // Simulate unwritable directory
  const locked = path.join(dir, 'locked');
  fs.mkdirSync(locked, { mode: 0o555 });
  const bad = new Store(path.join(locked, 'sylora.json'));
  bad.data.users = [];
  let err;
  try {
    // On some CI images root can still write 0555 dirs — skip assert then
    fs.accessSync(locked, fs.constants.W_OK);
  } catch {
    try { bad.save(); } catch (e) { err = e; }
    assert.ok(err);
    assert.equal(err.code, 'DATA_DIR_NOT_WRITABLE');
  }
});

test('docker entrypoint and Dockerfile drop privileges without world-writable mode', () => {
  const stripComments = (src) =>
    String(src || '')
      .split('\n')
      .filter((line) => !/^\s*#/.test(line))
      .join('\n');
  const entry = fs.readFileSync('scripts/docker-entrypoint.sh', 'utf8');
  const docker = fs.readFileSync('Dockerfile', 'utf8');
  const deploy = fs.readFileSync('scripts/deploy-prod.sh', 'utf8');
  assert.match(entry, /chown -R sylora:sylora/);
  assert.match(entry, /su-exec sylora/);
  assert.doesNotMatch(stripComments(entry), /\bchmod\s+(-R\s+)?0?777\b/);
  assert.match(docker, /ENTRYPOINT\s+\["\/usr\/local\/bin\/docker-entrypoint\.sh"\]/);
  assert.match(docker, /su-exec/);
  assert.match(deploy, /ensure_persistent_data_permissions/);
  assert.doesNotMatch(stripComments(deploy), /\bchmod\s+(-R\s+)?0?777\b/);
  assert.match(deploy, /chown -R sylora:sylora/);
  assert.match(deploy, /--env-file \.env\.local/);
});
