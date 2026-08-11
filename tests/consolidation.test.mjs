import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { buildPersonalityInstructions, sanitizeMemoryValue, languageSupportMatrix, PROACTIVE_LEVELS } from '../src/ecosystem/sylora-intelligence.mjs';
import { createHubActions } from '../public/create-hub.js';

test('i18n covers priority UI locales and humanError hides provider codes', async () => {
  const mod = await import('../public/i18n.js');
  for (const loc of ['uk', 'pl', 'en', 'de']) {
    mod.setLocale(loc);
    assert.equal(mod.t('inbox'), 'Inbox');
    assert.ok(mod.t('home').length > 1);
    assert.ok(mod.t('syloraUnavailable').length > 8);
    assert.doesNotMatch(mod.t('syloraUnavailable'), /AI provider/i);
  }
  assert.equal(mod.humanError('AI_PROVIDER_NOT_CONFIGURED'), mod.t('syloraUnavailable'));
  assert.equal(mod.humanError('AI_RATE_LIMITED'), mod.t('syloraBusy'));
  assert.ok(mod.SUPPORTED_UI_LOCALES.includes('tr'));
  assert.ok(mod.PRIORITY_VOICE_LOCALES.includes('uk'));
});

test('create hub is permission-aware; events are wired when authenticated', () => {
  const guest = createHubActions({ authed: false });
  assert.ok(guest.every(a => !a.enabled || !a.needsAuth));
  const user = createHubActions({ authed: true });
  assert.ok(user.find(a => a.id === 'post')?.enabled);
  assert.equal(user.find(a => a.id === 'event')?.enabled, true);
  assert.equal(user.find(a => a.id === 'event')?.intent, 'event');
});

test('shell IA: Inbox+Profile dock, gifts off primary, create hub CSS linked', () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  assert.match(html, /design-consolidation\.css/);
  assert.doesNotMatch(html.split('side-nav')[1].split('secondary-nav')[0], /data-view="gifts"/);
  assert.match(html, /data-create-hub/);
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /openCreateHub/);
  assert.match(app, /openCommandPalette/);
  assert.match(app, /humanError/);
  assert.doesNotMatch(app, /AI provider ще не налаштований/);
  assert.match(app, /ecosystem-feed/);
  assert.match(app, /inbox-tabs/);
  assert.match(app, /live-hub-tabs/);
  assert.match(app, /orgWorkspacePanel/);
});

test('sylora intelligence personality is one identity and rejects secret memories', () => {
  const text = buildPersonalityInstructions({ mode: 'business', locale: 'pl', proactive: 'NORMAL' });
  assert.match(text, /one continuous Personal AI identity/i);
  assert.match(text, /Sylora Business/);
  assert.match(text, /Never claim to be human, conscious, or to have a literal soul/i);
  assert.throws(() => sanitizeMemoryValue('my api_key is sk-abcdefghijklmnopqrstuvwxyz'), /MEMORY_SECRET_REJECTED/);
  const langs = languageSupportMatrix();
  assert.ok(langs.ui.includes('uk') && langs.ui.includes('de'));
  assert.ok(PROACTIVE_LEVELS.includes('IMPORTANT_ONLY'));
});

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-consol-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?consol=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  return { server, base: `http://127.0.0.1:${port}`, dir };
}

test('intelligence + proactive APIs work without exposing provider setup to clients', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await fetch(`${base}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'consol@example.com', username: 'consol_user', password: 'password123' })
    });
    assert.equal(reg.status, 201);
    const { token } = await reg.json();
    const intel = await fetch(`${base}/api/ai/intelligence`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(intel.status, 200);
    const body = await intel.json();
    assert.equal(body.personality, true);
    assert.ok(body.voices.length >= 3);
    assert.ok(body.languages.ui.includes('uk'));
    const patch = await fetch(`${base}/api/ai/proactive`, {
      method: 'PATCH',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ level: 'OFF' })
    });
    assert.equal(patch.status, 200);
    const patched = await patch.json();
    assert.equal(patched.proactive, 'OFF');
    const chat = await fetch(`${base}/api/ai/chat`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ text: 'hello' })
    });
    const chatBody = await chat.json();
    assert.equal(chat.status, 503);
    assert.equal(chatBody.error, 'AI_PROVIDER_NOT_CONFIGURED');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
