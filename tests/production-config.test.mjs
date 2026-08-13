import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = '';
process.env.REDIS_URL = '';
process.env.OPENAI_API_KEY = '';
import {
  AI_STATUS,
  READY_STATUS,
  assertProductionBoot,
  evaluateReadiness,
  loadConfig,
  publicConfigSnapshot,
  redactSecrets
} from '../src/config.mjs';

const DEV_PORT = 8793;

function spawnServer(env) {
  return spawn(process.execPath, ['src/server.mjs'], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function collect(stream) {
  let out = '';
  stream.setEncoding('utf8');
  stream.on('data', chunk => { out += chunk; });
  return () => out;
}

async function waitExit(child, ms = 4000) {
  const stdout = collect(child.stdout);
  const stderr = collect(child.stderr);
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('process did not exit'));
    }, ms);
    child.on('exit', value => {
      clearTimeout(timer);
      resolve(value);
    });
  });
  return { code, stdout: stdout(), stderr: stderr() };
}

async function waitListening(port, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.status > 0) return res;
    } catch {}
    await sleep(100);
  }
  throw new Error('server not listening');
}

test('TEST 1: development can start without DATABASE_URL', async () => {
  const child = spawnServer({
    PORT: String(DEV_PORT),
    NODE_ENV: 'development',
    DATABASE_URL: '',
    REDIS_URL: '',
    OPENAI_API_KEY: '',
    SYLORA_ICE_SERVERS_JSON: '',
    SYLORA_TURN_URL: ''
  });
  try {
    const healthRes = await waitListening(DEV_PORT);
    const health = await healthRes.json();
    assert.equal(healthRes.status, 200);
    assert.equal(health.alive, true);
    assert.equal(health.status, 'ok');
    assert.equal(health.persistence, 'json-dev-runtime');
    const readyRes = await fetch(`http://127.0.0.1:${DEV_PORT}/api/ready`);
    const ready = await readyRes.json();
    assert.equal(readyRes.status, 200);
    assert.equal(ready.ready, true);
    assert.equal(ready.checks.database.status, READY_STATUS.DEGRADED);
    assert.equal(ready.checks.ai.status, AI_STATUS.UNAVAILABLE);
    assert.equal(ready.checks.realtime.status, READY_STATUS.DEGRADED);
  } finally {
    child.kill('SIGTERM');
    await sleep(150);
  }
});

test('TEST 2: production without DATABASE_URL fails startup', async () => {
  const child = spawnServer({
    PORT: '8794',
    NODE_ENV: 'production',
    DATABASE_URL: '',
    REDIS_URL: '',
    OPENAI_API_KEY: 'sk-should-never-appear-in-logs',
    SYLORA_TURN_CREDENTIAL: 'turn-secret-should-not-leak'
  });
  const { code, stdout, stderr } = await waitExit(child);
  assert.notEqual(code, 0);
  assert.match(`${stdout}\n${stderr}`, /Production startup blocked: DATABASE_URL is required\./);
  assert.doesNotMatch(`${stdout}\n${stderr}`, /sk-should-never-appear-in-logs/);
  assert.doesNotMatch(`${stdout}\n${stderr}`, /turn-secret-should-not-leak/);
  assert.doesNotMatch(`${stdout}\n${stderr}`, /postgresql:\/\//);
});

test('TEST 3: production config validation passes with required database URL', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:unused@127.0.0.1:5432/sylora',
    REDIS_URL: '',
    OPENAI_API_KEY: ''
  });
  assert.equal(config.isProduction, true);
  assert.equal(config.database.configured, true);
  assert.equal(config.database.host, '127.0.0.1');
  assert.doesNotThrow(() => assertProductionBoot(config));
  const snapshot = publicConfigSnapshot(config);
  assert.equal(snapshot.database.configured, true);
  assert.equal('url' in snapshot.database, false);
  assert.equal('apiKey' in snapshot.ai, false);
});

test('TEST 4: missing OpenAI key reports AI_UNAVAILABLE and does not crash', async () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: '',
    OPENAI_API_KEY: ''
  });
  assert.equal(config.ai.status, AI_STATUS.UNAVAILABLE);
  assert.equal(config.ai.configured, false);
  assert.equal(config.ai.fallback, true);
  assert.equal(config.ai.apiKey, '');

  const { server } = await import(`../src/server.mjs?prod-guard=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const base = `http://127.0.0.1:${server.address().port}`;
    const health = await (await fetch(`${base}/api/health`)).json();
    assert.equal(health.alive, true);
    assert.equal(health.ai.status, AI_STATUS.UNAVAILABLE);
    const ai = await (await fetch(`${base}/api/ai/status`)).json();
    assert.equal(ai.status, AI_STATUS.UNAVAILABLE);
    assert.equal(ai.reason, 'OPENAI_API_KEY_MISSING');
    assert.equal(ai.configured, false);
    assert.equal('apiKey' in ai, false);
    const chat = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' })
    });
    assert.ok([401, 503].includes(chat.status));
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('TEST 5: missing TURN reports degraded in development and NOT_READY in production Live', () => {
  const dev = evaluateReadiness(loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: '',
    SYLORA_ICE_SERVERS_JSON: '',
    SYLORA_TURN_URL: ''
  }), {
    postgres: { configured: false, ok: true },
    redis: { configured: false, ok: true },
    outbox: { configured: false, ok: true }
  });
  assert.equal(dev.ready, true);
  assert.equal(dev.liveReady, false);
  assert.equal(dev.checks.realtime.status, READY_STATUS.DEGRADED);
  assert.equal(dev.checks.realtime.reason, 'TURN_NOT_CONFIGURED');

  const prod = evaluateReadiness(loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:unused@127.0.0.1:5432/sylora',
    SYLORA_ICE_SERVERS_JSON: '',
    SYLORA_TURN_URL: ''
  }), {
    postgres: { configured: true, ok: true },
    redis: { configured: false, ok: true },
    outbox: { configured: true, ok: true }
  });
  assert.equal(prod.ready, true);
  assert.equal(prod.liveReady, false);
  assert.equal(prod.checks.realtime.status, READY_STATUS.NOT_READY);
  assert.equal(prod.checks.redis.status, READY_STATUS.DEGRADED);
  assert.equal(prod.checks.ai.status, AI_STATUS.UNAVAILABLE);
});

test('public snapshots and redaction never expose secrets', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:super-secret-db@db.internal:5432/sylora',
    REDIS_URL: 'redis://:super-secret-redis@cache.internal:6379/0',
    OPENAI_API_KEY: 'sk-live-super-secret-openai-key',
    SYLORA_TURN_URL: 'turns:turn.example:5349',
    SYLORA_TURN_USERNAME: 'ice-user',
    SYLORA_TURN_CREDENTIAL: 'ice-secret'
  });
  const snapshot = JSON.stringify(publicConfigSnapshot(config));
  assert.doesNotMatch(snapshot, /super-secret/);
  assert.doesNotMatch(snapshot, /sk-live/);
  assert.doesNotMatch(snapshot, /ice-secret/);
  assert.doesNotMatch(snapshot, /postgresql:\/\//);
  const redacted = JSON.stringify(redactSecrets({
    OPENAI_API_KEY: 'sk-live-super-secret-openai-key',
    DATABASE_URL: 'postgresql://sylora:super-secret-db@db.internal:5432/sylora'
  }));
  assert.doesNotMatch(redacted, /super-secret/);
  assert.doesNotMatch(redacted, /sk-live/);
});
