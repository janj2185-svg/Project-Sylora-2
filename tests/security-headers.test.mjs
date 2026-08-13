import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';

async function waitListening(port, attempts = 50) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.status > 0) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('server not listening');
}

test('security headers include production HSTS/CSP upgrades when enabled', async () => {
  const port = 8791;
  const child = spawn(process.execPath, ['src/server.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'production',
      SYLORA_ENABLE_HSTS: '1',
      DATABASE_URL: 'postgresql://sylora:sylora@127.0.0.1:5432/sylora',
      REDIS_URL: '',
      SYLORA_COMPANION_ORIGINS: 'https://companion.example'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  try {
    await waitListening(port);
    const res = await fetch(`http://127.0.0.1:${port}/`);
    assert.equal(res.status, 200);
    const csp = res.headers.get('content-security-policy') || '';
    assert.match(csp, /upgrade-insecure-requests/);
    assert.match(csp, /https:\/\/companion\.example/);
    assert.equal(res.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
    assert.equal(res.headers.get('x-frame-options'), 'DENY');
  } finally {
    child.kill('SIGTERM');
  }
});

test('.env.example documents companion token and HSTS flag', () => {
  const env = fs.readFileSync('.env.example', 'utf8');
  assert.match(env, /SYLORA_COMPANION_TOKEN=/);
  assert.match(env, /SYLORA_ENABLE_HSTS=/);
  assert.match(env, /SYLORA_TURN_URL=/);
  assert.match(env, /DATABASE_URL=/);
});
