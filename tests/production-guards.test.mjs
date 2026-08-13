import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { AI_STATUS, loadConfig, productionBootGuard, publicDiagnostics } from '../src/config.mjs';
import { buildHealthPayload, buildReadyPayload } from '../src/readiness.mjs';

function spawnServer(env) {
  return spawn(process.execPath, ['src/server.mjs'], {
    env: {
      ...process.env,
      NODE_ENV: 'development',
      DATABASE_URL: '',
      REDIS_URL: '',
      OPENAI_API_KEY: '',
      SYLORA_ICE_SERVERS_JSON: '',
      SYLORA_TURN_URL: '',
      SYLORA_TURN_USERNAME: '',
      SYLORA_TURN_CREDENTIAL: '',
      ...env
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

function collect(child) {
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', chunk => { stdout += chunk; });
  child.stderr.on('data', chunk => { stderr += chunk; });
  return () => ({ stdout, stderr });
}

async function waitListening(port, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/api/health`);
      if (res.status > 0) return await res.json();
    } catch {}
    await sleep(100);
  }
  throw new Error('server not listening');
}

test('TEST 1: development can start without DATABASE_URL', async () => {
  const port = 8795;
  const child = spawnServer({ NODE_ENV: 'development', PORT: String(port), DATABASE_URL: '' });
  const output = collect(child);
  try {
    const health = await waitListening(port);
    assert.equal(health.alive, true);
    assert.equal(health.status, 'ok');
    assert.equal(health.persistence, 'json-dev-runtime');
    assert.equal(health.environment, 'development');
    const ready = await fetch(`http://127.0.0.1:${port}/api/ready`);
    const body = await ready.json();
    assert.equal(ready.status, 200);
    assert.equal(body.ready, true);
    assert.equal(body.realtime.status, 'DEGRADED');
    const dumped = `${output().stdout}\n${output().stderr}`;
    assert.doesNotMatch(dumped, /sk-|BEGIN OPENSSH|password=/i);
  } finally {
    child.kill('SIGTERM');
    await sleep(150);
  }
});

test('TEST 2: production startup fails without DATABASE_URL', async () => {
  const child = spawnServer({ NODE_ENV: 'production', PORT: '8796', DATABASE_URL: '', REDIS_URL: '' });
  const output = collect(child);
  const code = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error('production process did not exit'));
    }, 4000);
    child.on('exit', value => {
      clearTimeout(timer);
      resolve(value);
    });
  });
  const { stdout, stderr } = output();
  assert.notEqual(code, 0);
  assert.match(`${stderr}\n${stdout}`, /Production startup blocked: DATABASE_URL is required/);
  assert.doesNotMatch(`${stderr}\n${stdout}`, /postgresql:\/\//);
  assert.doesNotMatch(`${stderr}\n${stdout}`, /sk-/);
});

test('TEST 3: production config validation passes when database URL exists', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    PORT: '8787',
    DATABASE_URL: 'postgresql://sylora:example@127.0.0.1:5432/sylora',
    REDIS_URL: '',
    OPENAI_API_KEY: '',
    SYLORA_TURN_URL: 'turn:turn.example:3478',
    SYLORA_TURN_USERNAME: 'user',
    SYLORA_TURN_CREDENTIAL: 'credential'
  });
  const guard = productionBootGuard(config);
  assert.equal(guard.ok, true);
  assert.equal(config.database.configured, true);
  assert.equal(config.database.jsonFallbackAllowed, false);
  assert.equal(config.webrtc.status, 'ok');
});

test('TEST 4: missing OPENAI_API_KEY is unavailable, not a crash', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: '',
    OPENAI_API_KEY: ''
  });
  assert.equal(config.ai.status, AI_STATUS.UNAVAILABLE);
  assert.equal(config.ai.configured, false);
  assert.equal(config.ai.reason, 'OPENAI_API_KEY is not set');
  const health = buildHealthPayload({
    config,
    dependencies: { postgres: { configured: false, ok: true }, redis: { configured: false, ok: true }, outbox: { configured: false, ok: true } }
  });
  assert.equal(health.alive, true);
  assert.equal(health.ai.status, AI_STATUS.UNAVAILABLE);
  const dumped = JSON.stringify(health);
  assert.doesNotMatch(dumped, /OPENAI_API_KEY=sk/);
});

test('TEST 5: missing TURN reports degraded in development and NOT_READY in production', () => {
  const dev = loadConfig({ NODE_ENV: 'development', DATABASE_URL: '', SYLORA_ICE_SERVERS_JSON: '' });
  assert.equal(dev.webrtc.status, 'DEGRADED');
  assert.equal(dev.webrtc.reason, 'TURN_NOT_CONFIGURED');
  const readyDev = buildReadyPayload({
    config: dev,
    dependencies: { postgres: { configured: false, ok: true }, redis: { configured: false, ok: true }, outbox: { configured: false, ok: true } }
  });
  assert.equal(readyDev.ready, true);
  assert.equal(readyDev.realtime.status, 'DEGRADED');

  const prod = loadConfig({
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://sylora:example@127.0.0.1:5432/sylora',
    SYLORA_ICE_SERVERS_JSON: ''
  });
  assert.equal(prod.boot.ok, true);
  assert.equal(prod.webrtc.status, 'NOT_READY');
  const readyProd = buildReadyPayload({
    config: prod,
    dependencies: { postgres: { configured: true, ok: true }, redis: { configured: false, ok: true }, outbox: { configured: true, ok: true } }
  });
  assert.equal(readyProd.ready, false);
  assert.equal(readyProd.realtime.status, 'NOT_READY');
  assert.equal(readyProd.checks.redis.status, 'DEGRADED');
});

test('public diagnostics never include secret values', () => {
  const config = loadConfig({
    NODE_ENV: 'development',
    DATABASE_URL: 'postgresql://user:super-secret-db@127.0.0.1:5432/sylora',
    REDIS_URL: 'redis://:super-secret-redis@127.0.0.1:6379',
    OPENAI_API_KEY: 'sk-secret-must-not-leak',
    SYLORA_TURN_URL: 'turn:turn.example:3478',
    SYLORA_TURN_USERNAME: 'turn-user',
    SYLORA_TURN_CREDENTIAL: 'turn-secret-must-not-leak',
    SYLORA_PAYMENT_SECRET_KEY: 'pay-secret-must-not-leak'
  });
  const dumped = JSON.stringify(publicDiagnostics(config));
  assert.doesNotMatch(dumped, /super-secret/);
  assert.doesNotMatch(dumped, /sk-secret/);
  assert.doesNotMatch(dumped, /turn-secret/);
  assert.doesNotMatch(dumped, /pay-secret/);
  assert.equal(config.ai.status, AI_STATUS.CONFIGURED);
  assert.equal(config.webrtc.turnConfigured, true);
});
