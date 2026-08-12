/**
 * Browser E2E journeys (puppeteer-core + system Chrome).
 * Kept outside tests/*.test.mjs so unit suite stays deterministic.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const hasChrome = fs.existsSync(CHROME);
const hasPuppeteer = fs.existsSync('node_modules/puppeteer-core/package.json');

async function waitReady(port, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${port}/api/ready`);
      if (r.ok) return;
    } catch {}
    await sleep(100);
  }
  throw new Error('server not ready');
}

async function withServer(fn) {
  const port = 21000 + Math.floor(Math.random() * 2000);
  const child = spawn(process.execPath, ['src/server.mjs'], {
    env: { ...process.env, PORT: String(port), DATABASE_URL: '', REDIS_URL: '', NODE_ENV: 'development' },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const puppeteer = require('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage']
  });
  try {
    await waitReady(port);
    return await fn({ port, browser });
  } finally {
    await browser.close().catch(() => {});
    child.kill('SIGTERM');
  }
}

test('E2E: register → session → LIVE command center honesty → logout/login', async (t) => {
  if (!hasChrome || !hasPuppeteer) {
    t.skip('Chrome or puppeteer-core missing');
    return;
  }
  await withServer(async ({ port, browser }) => {
    const stamp = Date.now();
    const email = `e2e${stamp}@test.local`;
    const user = `e2e${String(stamp).slice(-6)}`;
    const pass = 'Password123!';

    const reg = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, username: user, password: pass, displayName: 'E2E' })
    });
    const regBody = await reg.json();
    assert.equal(reg.status, 201, regBody.error || 'register failed');
    assert.ok(regBody.token);

    const overviewApi = await fetch(`http://127.0.0.1:${port}/api/sylora-live/overview`, {
      headers: { authorization: `Bearer ${regBody.token}` }
    });
    const overviewBody = await overviewApi.json();
    assert.equal(overviewApi.status, 200, overviewBody.error || 'overview failed');
    const fakeApi = (overviewBody.connections || []).filter((c) => c.state === 'CONNECTED' && !['sylora', 'obs'].includes(c.platform));
    assert.equal(fakeApi.length, 0, 'fake Connected platforms in API');
    assert.ok(
      overviewBody.host?.aiState === 'AI_CONFIGURATION_REQUIRED' || overviewBody.host?.aiState === 'MODEL_AVAILABLE',
      `unexpected aiState ${overviewBody.host?.aiState}`
    );

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), regBody.token);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__syloraBooted === true && window.__syloraState?.me, { timeout: 25000 });

    await page.evaluate(() => window.__syloraNav('liveStudio'));
    await page.waitForFunction(() => document.body.dataset.view === 'liveStudio', { timeout: 15000 });
    // Allow async overview render; fail with diagnostics if shell never appears.
    let shell = false;
    for (let i = 0; i < 40; i++) {
      shell = await page.evaluate(() => !!document.querySelector('.sl-shell'));
      if (shell) break;
      const bounced = await page.evaluate(() => document.body.dataset.view);
      if (bounced && bounced !== 'liveStudio') break;
      await sleep(250);
    }
    const live = await page.evaluate(() => ({
      view: document.body.dataset.view,
      auth: !!document.querySelector('#authForm'),
      shell: !!document.querySelector('.sl-shell'),
      banner: document.querySelector('#slAiBanner')?.textContent || '',
      text: (document.querySelector('#app')?.innerText || '').slice(0, 240)
    }));
    assert.equal(live.auth, false, `auth bounce: ${live.text}`);
    assert.equal(live.view, 'liveStudio', `ended on ${live.view}: ${live.text}`);
    assert.equal(live.shell, true, `shell missing: ${live.text}`);
    assert.match(live.banner, /AI_CONFIGURATION_REQUIRED|MODEL_AVAILABLE/);

    // mobile overflow check
    await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    await page.evaluate(() => window.__syloraNav('feed'));
    await sleep(800);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2);
    assert.equal(overflow, false, 'mobile home horizontal overflow');

    await fetch(`http://127.0.0.1:${port}/api/auth/logout`, {
      method: 'POST',
      headers: { authorization: `Bearer ${regBody.token}` }
    });
    const login = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity: user, password: pass })
    });
    const loginBody = await login.json();
    assert.equal(login.status, 200, loginBody.error || 'login failed');
    assert.ok(loginBody.token);
  });
});

test('E2E desktop: critical nav views render without auth bounce', async (t) => {
  if (!hasChrome || !hasPuppeteer) {
    t.skip('Chrome or puppeteer-core missing');
    return;
  }
  await withServer(async ({ port, browser }) => {
    const stamp = Date.now();
    const reg = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: `nav${stamp}@test.local`,
        username: `nav${String(stamp).slice(-6)}`,
        password: 'Password123!'
      })
    });
    const body = await reg.json();
    assert.equal(reg.status, 201, body.error || 'register failed');

    const page = await browser.newPage();
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), body.token);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__syloraState?.me, { timeout: 25000 });

    for (const view of ['feed', 'live', 'studio', 'liveStudio', 'messages', 'wallet', 'ai', 'profile', 'more', 'gifts']) {
      await page.evaluate((v) => window.__syloraNav(v), view);
      await sleep(900);
      if (view === 'liveStudio') {
        await page.waitForFunction(() => !!document.querySelector('.sl-shell') || document.body.dataset.view !== 'liveStudio', { timeout: 15000 }).catch(() => {});
      }
      const state = await page.evaluate(() => ({
        view: document.body.dataset.view,
        auth: !!document.querySelector('#authForm'),
        hasApp: !!(document.querySelector('#app')?.innerText || '').trim(),
        shell: !!document.querySelector('.sl-shell')
      }));
      assert.equal(state.auth, false, `${view} showed auth form`);
      assert.equal(state.hasApp, true, `${view} empty`);
      if (view === 'liveStudio') assert.equal(state.shell, true, 'liveStudio shell missing');
    }
  });
});
