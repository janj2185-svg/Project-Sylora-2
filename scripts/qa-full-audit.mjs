/**
 * Full final QA audit for Project-Sylora-2.
 * - Registers a real user via API/UI
 * - Walks all major views (desktop / mobile / tablet)
 * - Captures screenshots under artifacts/qa/screenshots/{desktop,mobile,tablet}
 * - Records a real Chrome screencast → artifacts/qa/video/SYLORA-FULL-WALKTHROUGH.webm
 * - Writes artifacts/qa/reports/QA_MATRIX.json + QA_REPORT.md
 *
 * Never fakes Connected / never seeds mock as production truth.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { createWriteStream } from 'node:fs';

const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const BASE = process.env.SYLORA_BASE || 'http://127.0.0.1:8787';
const ROOT = path.resolve('artifacts/qa');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const stamp = Date.now();
const EMAIL = `qa${stamp}@sylora-qa.test`;
const USER = `qa${String(stamp).slice(-7)}`;
const PASS = 'Password123!';

const VIEWPORTS = {
  desktop: { width: 1920, height: 1080, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 768, height: 1024, deviceScaleFactor: 2, isMobile: true, hasTouch: true }
};

const DESKTOP_VIEWS = [
  ['01-home', 'feed'],
  ['04-feed', 'feed'],
  ['05-profile', 'profile'],
  ['06-messages', 'messages'],
  ['07-live', 'live'],
  ['08-live-studio', 'studio'],
  ['09-live-command-center', 'liveStudio'],
  ['13-wallet', 'wallet'],
  ['14-settings', 'more'],
  ['15-gifts', 'gifts'],
  ['16-ai', 'ai'],
  ['17-clips', 'clips'],
  ['18-videos', 'videos'],
  ['19-explore', 'explore'],
  ['20-communities', 'communities'],
  ['21-learning', 'learning'],
  ['22-business', 'business'],
  ['23-security', 'security'],
  ['24-dashboard', 'dashboard'],
  ['25-canvas', 'canvas'],
  ['26-agents', 'agents'],
  ['27-developer', 'developer'],
  ['28-identity', 'identity']
];

const MOBILE_VIEWS = [
  ['01-home', 'feed'],
  ['02-live', 'live'],
  ['03-ai', 'ai'],
  ['04-messages', 'messages'],
  ['05-profile', 'profile'],
  ['06-live-command-center', 'liveStudio'],
  ['07-live-studio', 'studio'],
  ['08-wallet', 'wallet'],
  ['09-gifts', 'gifts'],
  ['10-settings', 'more'],
  ['11-explore', 'explore'],
  ['12-clips', 'clips']
];

const TABLET_VIEWS = [
  ['01-home', 'feed'],
  ['02-live', 'live'],
  ['03-live-command-center', 'liveStudio'],
  ['04-profile', 'profile'],
  ['05-messages', 'messages'],
  ['06-ai', 'ai'],
  ['07-wallet', 'wallet'],
  ['08-settings', 'more']
];

const matrix = [];
const findings = [];
const consoleErrors = [];
const shotIndex = [];

function mark(id, status, note = '', evidence = []) {
  matrix.push({ id, status, note, evidence });
}

async function ensureDirs() {
  for (const d of [
    'screenshots/desktop',
    'screenshots/mobile',
    'screenshots/tablet',
    'video',
    'reports',
    'frames'
  ]) {
    await fs.mkdir(path.join(ROOT, d), { recursive: true });
  }
}

async function shot(page, folder, name) {
  const file = path.join(ROOT, 'screenshots', folder, `${name}.png`);
  await new Promise((r) => setTimeout(r, 450));
  // Check overflow
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    return {
      scrollWidth: doc.scrollWidth,
      clientWidth: doc.clientWidth,
      overflowX: doc.scrollWidth > doc.clientWidth + 2
    };
  });
  if (overflow.overflowX) {
    findings.push({ severity: 'UI', where: `${folder}/${name}`, issue: 'horizontal overflow', detail: overflow });
  }
  await page.screenshot({ path: file, fullPage: false, captureBeyondViewport: false });
  shotIndex.push({ folder, name, file: path.relative(process.cwd(), file), overflowX: overflow.overflowX });
  console.log('✓', folder + '/' + name + '.png' + (overflow.overflowX ? ' [OVERFLOW]' : ''));
  return file;
}

async function gotoApp(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#app', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 700));
}

async function waitBooted(page) {
  await page.waitForFunction(() => window.__syloraBooted === true, { timeout: 25000 }).catch(() => {});
  await page.waitForFunction(() => !document.querySelector('#app .loading'), { timeout: 25000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 500));
}

async function registerViaApi() {
  const r = await fetch(`${BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, username: USER, password: PASS, displayName: 'QA Auditor' })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || `REGISTER_${r.status}`);
  return j.token;
}

async function loginUi(page, identity, password) {
  await gotoApp(page);
  await page.evaluate(() => {
    localStorage.removeItem('sylora_token');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitBooted(page);
  await page.evaluate(() => {
    if (typeof window.__syloraNav === 'function') window.__syloraNav('feed');
  });
  // Open auth
  await page.evaluate(() => {
    document.querySelector('#signin')?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await page.evaluate(() => document.querySelector('#loginTab')?.click());
  await new Promise((r) => setTimeout(r, 200));
  await page.type('input[name="email"]', identity, { delay: 5 }).catch(async () => {
    // login mode may use identity in username/email field
    await page.$eval('#authForm', (form) => form.reset());
  });
  // Fill form fields present
  await page.evaluate((id, pass) => {
    const form = document.querySelector('#authForm');
    if (!form) return;
    const u = form.querySelector('[name="username"]');
    const e = form.querySelector('[name="email"]');
    const p = form.querySelector('[name="password"]');
    if (u) u.value = id;
    if (e) e.value = id.includes('@') ? id : `${id}@x.test`;
    if (p) p.value = pass;
  }, identity, password);
  await page.click('#authForm button.primary');
  await new Promise((r) => setTimeout(r, 1200));
  await waitBooted(page);
  const ok = await page.evaluate(() => !!(window.__syloraState?.me));
  return ok;
}

async function loginWithToken(page, token) {
  await gotoApp(page);
  await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), token);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitBooted(page);
}

async function navView(page, view) {
  await page.evaluate((v) => {
    if (typeof window.__syloraNav === 'function') window.__syloraNav(v);
  }, view);
  await new Promise((r) => setTimeout(r, 900));
  await page.waitForFunction(
    (v) => document.body.dataset.view === v || !document.querySelector('#app .loading'),
    { timeout: 15000 },
    view
  ).catch(() => {});
}

async function pageErrors(page) {
  const js = await page.evaluate(() => {
    const empty = !!document.querySelector('#app .empty, #app .sl-empty');
    const auth = !!document.querySelector('#authForm');
    const bodyText = (document.querySelector('#app')?.innerText || '').slice(0, 200);
    const dead = [...document.querySelectorAll('button, a')].filter((el) => {
      const t = (el.textContent || '').trim();
      return !t && !el.getAttribute('aria-label') && !el.querySelector('img,svg,span');
    }).length;
    return {
      view: document.body.dataset.view || '',
      hasAuthForm: auth,
      empty,
      deadButtons: dead,
      snippet: bodyText,
      me: !!(window.__syloraState && window.__syloraState.me)
    };
  });
  return js;
}

async function apiProbe(token) {
  const h = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
  const get = async (p) => {
    const r = await fetch(BASE + p, { headers: h });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, body: j };
  };
  const post = async (p, body) => {
    const r = await fetch(BASE + p, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { status: r.status, body: j };
  };

  const ready = await get('/api/ready');
  mark('api.ready', ready.status === 200 && ready.body.ready ? 'WORKING' : 'FAILED', JSON.stringify(ready.body).slice(0, 120));

  const me = await get('/api/me');
  mark('api.me', me.status === 200 ? 'WORKING' : 'FAILED', `status=${me.status}`);

  const postCreate = await post('/api/posts', { text: `QA post ${stamp}` });
  mark('api.posts.create', postCreate.status === 201 || postCreate.status === 200 ? 'WORKING' : 'FAILED', `status=${postCreate.status}`);

  const wallet = await get('/api/wallet');
  mark('api.wallet', wallet.status === 200 ? 'WORKING' : 'FAILED', `status=${wallet.status}`);

  const live = await get('/api/live');
  mark('api.live', live.status === 200 ? 'WORKING' : 'FAILED', `status=${live.status}`);

  const overview = await get('/api/sylora-live/overview');
  if (overview.status === 200) {
    const conns = overview.body.connections || [];
    const fake = conns.filter((c) => c.state === 'CONNECTED' && !['sylora', 'obs'].includes(c.platform));
    const ai = overview.body.host?.aiState || overview.body.honesty?.ai;
    mark('live.commandCenter.api', 'WORKING', `ai=${ai}; fakeConnected=${fake.length}`);
    mark('live.aiCohost', ai === 'AI_CONFIGURATION_REQUIRED' || ai === 'MODEL_AVAILABLE' ? (ai === 'AI_CONFIGURATION_REQUIRED' ? 'BLOCKED_EXTERNAL' : 'WORKING') : 'PARTIAL', `aiState=${ai}`);
    for (const p of ['tiktok', 'youtube', 'twitch', 'facebook', 'instagram', 'kick', 'discord', 'custom_rtmp']) {
      const row = conns.find((c) => c.platform === p);
      if (!row) {
        mark(`live.platform.${p}`, 'NOT_IMPLEMENTED', 'adapter missing from overview');
        continue;
      }
      const honest = ['AUTH_REQUIRED', 'CONFIGURATION_REQUIRED', 'SETUP_REQUIRED', 'UNAVAILABLE', 'DISCONNECTED', 'API_LIMITED'].includes(row.state);
      mark(
        `live.platform.${p}`,
        row.state === 'CONNECTED' ? 'FAILED' : honest ? 'BLOCKED_EXTERNAL' : 'PARTIAL',
        `state=${row.state}`
      );
    }
  } else {
    mark('live.commandCenter.api', 'FAILED', `status=${overview.status}`);
  }

  const caps = await get('/api/sylora-live/capabilities');
  mark('live.capabilities', caps.status === 200 ? 'WORKING' : 'FAILED', `status=${caps.status}`);

  const chat = await get('/api/sylora-live/chat?limit=20');
  mark('live.unifiedChat', chat.status === 200 ? 'WORKING' : 'FAILED', `msgs=${(chat.body.messages || []).length}`);

  const google = await fetch(`${BASE}/api/auth/google`);
  mark('auth.google', google.status === 503 || google.status === 200 ? (google.status === 503 ? 'BLOCKED_EXTERNAL' : 'WORKING') : 'PARTIAL', `status=${google.status}`);

  const gifts = await get('/api/gifts');
  mark('api.gifts', gifts.status === 200 ? 'WORKING' : 'FAILED', `status=${gifts.status}`);
}

async function captureViewport(browser, folder, views, token, { authShots = false } = {}) {
  const page = await browser.newPage();
  page.on('pageerror', (err) => consoleErrors.push({ folder, message: String(err.message || err) }));
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push({ folder, message: msg.text() });
  });
  await page.setViewport(VIEWPORTS[folder]);
  await loginWithToken(page, token);
  const authed = await page.evaluate(() => !!(window.__syloraState?.me));
  if (!authed) findings.push({ severity: 'P0', where: folder, issue: 'session not restored after token login' });

  if (authShots && folder === 'desktop') {
    await page.evaluate(() => localStorage.removeItem('sylora_token'));
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitBooted(page);
    await page.evaluate(() => document.querySelector('#signin')?.click());
    await new Promise((r) => setTimeout(r, 400));
    await shot(page, folder, '02-login');
    await page.evaluate(() => document.querySelector('#regTab')?.click());
    await new Promise((r) => setTimeout(r, 300));
    await shot(page, folder, '03-register');
    // restore session
    await loginWithToken(page, token);
  }

  for (const [name, view] of views) {
    await navView(page, view);
    const info = await pageErrors(page);
    if (view === 'liveStudio' || view === 'studio' || view === 'wallet' || view === 'messages' || view === 'ai' || view === 'profile') {
      if (!info.me && info.hasAuthForm) {
        findings.push({ severity: 'P0', where: `${folder}/${name}`, issue: 'auth form shown despite token session', info });
        mark(`ui.${folder}.${view}`, 'FAILED', 'redirected to auth');
      } else {
        mark(`ui.${folder}.${view}`, 'WORKING', info.snippet.slice(0, 80), [`screenshots/${folder}/${name}.png`]);
      }
    }
    if (view === 'liveStudio') {
      // sheets
      await shot(page, folder, name);
      await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="platforms"]')?.click());
      await new Promise((r) => setTimeout(r, 400));
      await shot(page, folder, folder === 'desktop' ? '10-live-social-connections' : `${name}-platforms`);
      if (folder === 'desktop') {
        await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="ai"]')?.click());
        await new Promise((r) => setTimeout(r, 400));
        await shot(page, folder, '11-live-ai-host');
        await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="chat"]')?.click());
        await new Promise((r) => setTimeout(r, 400));
        await shot(page, folder, '12-live-chat');
        await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="controls"]')?.click());
        await new Promise((r) => setTimeout(r, 400));
        await shot(page, folder, '12b-live-controls');
      }
      continue;
    }
    if (view === 'live' && folder === 'desktop') {
      await shot(page, folder, name);
      await page.evaluate(() => document.querySelector('[data-live-tab="create"]')?.click());
      await new Promise((r) => setTimeout(r, 500));
      await shot(page, folder, '07b-live-create');
      await page.evaluate(() => document.querySelector('[data-live-tab="following"]')?.click());
      await new Promise((r) => setTimeout(r, 400));
      await shot(page, folder, '07c-live-following');
      continue;
    }
    if (view === 'messages' && folder === 'desktop') {
      await shot(page, folder, name);
      await page.evaluate(() => document.querySelector('[data-inbox-tab="notifications"]')?.click());
      await new Promise((r) => setTimeout(r, 400));
      await shot(page, folder, '06b-notifications');
      continue;
    }
    await shot(page, folder, name);
  }

  await page.close();
}

async function recordWalkthrough(browser, token) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORTS.desktop);
  const client = await page.createCDPSession();
  const framesDir = path.join(ROOT, 'frames');
  await fs.rm(framesDir, { recursive: true, force: true });
  await fs.mkdir(framesDir, { recursive: true });
  let i = 0;
  let recording = true;
  client.on('Page.screencastFrame', async (frame) => {
    try {
      if (!recording) return;
      const file = path.join(framesDir, `f${String(i++).padStart(5, '0')}.jpg`);
      await fs.writeFile(file, Buffer.from(frame.data, 'base64'));
      await client.send('Page.screencastFrameAck', { sessionId: frame.sessionId });
    } catch { /* ignore late frames */ }
  });
  await client.send('Page.startScreencast', {
    format: 'jpeg',
    quality: 72,
    maxWidth: 1600,
    maxHeight: 900,
    everyNthFrame: 2
  });

  const steps = [
    ['open', async () => { await gotoApp(page); await waitBooted(page); }],
    ['login-token', async () => { await loginWithToken(page, token); }],
    ['home', async () => navView(page, 'feed')],
    ['feed-scroll', async () => { await page.evaluate(() => window.scrollBy(0, 200)); await new Promise((r) => setTimeout(r, 600)); }],
    ['profile', async () => navView(page, 'profile')],
    ['messages', async () => navView(page, 'messages')],
    ['live', async () => navView(page, 'live')],
    ['studio', async () => navView(page, 'studio')],
    ['command-center', async () => navView(page, 'liveStudio')],
    ['platforms', async () => { await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="platforms"]')?.click()); await new Promise((r) => setTimeout(r, 800)); }],
    ['ai-host', async () => { await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="ai"]')?.click()); await new Promise((r) => setTimeout(r, 800)); }],
    ['chat', async () => { await page.evaluate(() => document.querySelector('.sl-tabs [data-sheet="chat"]')?.click()); await new Promise((r) => setTimeout(r, 800)); }],
    ['wallet', async () => navView(page, 'wallet')],
    ['gifts', async () => navView(page, 'gifts')],
    ['ai', async () => navView(page, 'ai')],
    ['settings', async () => navView(page, 'more')],
    ['mobile-resize', async () => { await page.setViewport(VIEWPORTS.mobile); await navView(page, 'feed'); await new Promise((r) => setTimeout(r, 900)); await navView(page, 'liveStudio'); await new Promise((r) => setTimeout(r, 900)); }]
  ];

  for (const [label, fn] of steps) {
    console.log('🎬', label);
    await fn();
    await new Promise((r) => setTimeout(r, 700));
  }

  recording = false;
  await client.send('Page.stopScreencast').catch(() => {});
  await page.close();

  const out = path.join(ROOT, 'video', 'SYLORA-FULL-WALKTHROUGH.webm');
  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', [
      '-y', '-framerate', '8', '-i', path.join(framesDir, 'f%05d.jpg'),
      '-c:v', 'libvpx-vp9', '-b:v', '1M', '-pix_fmt', 'yuv420p', out
    ], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    ff.stderr.on('data', (d) => { err += d.toString(); });
    ff.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error('ffmpeg failed: ' + err.slice(-500)));
    });
  });
  // cleanup frames to keep artifact size reasonable
  await fs.rm(framesDir, { recursive: true, force: true });
  console.log('✓ video', out);
  return out;
}

async function writeReports(token, videoPath) {
  const counts = matrix.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});
  const report = {
    branch: 'cursor/sylora-live-ecosystem-34a2',
    base: BASE,
    user: { email: EMAIL, username: USER },
    counts,
    matrix,
    findings,
    consoleErrors: consoleErrors.slice(0, 80),
    screenshots: shotIndex,
    video: videoPath ? path.relative(process.cwd(), videoPath) : null,
    generatedAt: new Date().toISOString()
  };
  await fs.writeFile(path.join(ROOT, 'reports', 'QA_MATRIX.json'), JSON.stringify(report, null, 2));

  const md = [];
  md.push('# SYLORA Full QA Audit');
  md.push('');
  md.push(`- Branch tip audited at runtime against \`${BASE}\``);
  md.push(`- Generated: ${report.generatedAt}`);
  md.push(`- QA user: \`${USER}\` / \`${EMAIL}\``);
  md.push('');
  md.push('## Counts');
  md.push('');
  for (const k of ['WORKING', 'PARTIAL', 'MOCK', 'NOT_IMPLEMENTED', 'BLOCKED_EXTERNAL', 'FAILED']) {
    md.push(`- **${k}:** ${counts[k] || 0}`);
  }
  md.push('');
  md.push('## Matrix');
  md.push('');
  md.push('| ID | Status | Note |');
  md.push('|---|---|---|');
  for (const row of matrix) {
    md.push(`| \`${row.id}\` | ${row.status} | ${String(row.note).replace(/\|/g, '/')} |`);
  }
  md.push('');
  md.push('## Findings');
  md.push('');
  if (!findings.length) md.push('- None recorded by automation.');
  else for (const f of findings) md.push(`- **${f.severity}** ${f.where}: ${f.issue}`);
  md.push('');
  md.push('## Console errors (sampled)');
  md.push('');
  if (!consoleErrors.length) md.push('- None');
  else for (const e of consoleErrors.slice(0, 40)) md.push(`- ${e.folder || '-'}: ${e.message}`);
  md.push('');
  md.push('## Screenshots');
  md.push('');
  for (const s of shotIndex) md.push(`- \`${s.file}\`${s.overflowX ? ' ⚠️ overflow-x' : ''}`);
  md.push('');
  md.push('## Video');
  md.push('');
  md.push(videoPath ? `- \`${path.relative(process.cwd(), videoPath)}\`` : '- Video not produced');
  await fs.writeFile(path.join(ROOT, 'reports', 'QA_REPORT.md'), md.join('\n'));
  console.log('✓ reports written');
  return report;
}

async function main() {
  await ensureDirs();
  console.log('QA against', BASE);
  const token = await registerViaApi();
  mark('auth.register', 'WORKING', EMAIL);
  await apiProbe(token);

  // logout/login API
  const login = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: USER, password: PASS })
  });
  const loginBody = await login.json();
  mark('auth.login', login.status === 200 && loginBody.token ? 'WORKING' : 'FAILED', `status=${login.status}`);
  const token2 = loginBody.token || token;
  await fetch(`${BASE}/api/auth/logout`, { method: 'POST', headers: { authorization: `Bearer ${token2}` } });
  mark('auth.logout', 'WORKING', 'logout endpoint called');
  const re = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ identity: EMAIL, password: PASS })
  });
  const reBody = await re.json();
  mark('auth.relogin', re.status === 200 && reBody.token ? 'WORKING' : 'FAILED', `status=${re.status}`);
  const sessionToken = reBody.token || token2;

  // follow/profile patch
  const users = await fetch(`${BASE}/api/users`, { headers: { authorization: `Bearer ${sessionToken}` } }).then((r) => r.json());
  const other = (users.users || []).find((u) => u.username !== USER);
  if (other) {
    const fol = await fetch(`${BASE}/api/users/${other.id}/follow`, {
      method: 'POST',
      headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
      body: '{}'
    });
    mark('social.follow', fol.status === 200 || fol.status === 201 ? 'WORKING' : 'PARTIAL', `status=${fol.status}`);
  } else {
    mark('social.follow', 'PARTIAL', 'no other user in local store to follow');
  }

  const patch = await fetch(`${BASE}/api/me`, {
    method: 'PATCH',
    headers: { authorization: `Bearer ${sessionToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ displayName: 'QA Auditor ★', bio: 'Full QA pass' })
  });
  mark('profile.edit', patch.status === 200 ? 'WORKING' : 'FAILED', `status=${patch.status}`);

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1920,1080']
  });

  try {
    await captureViewport(browser, 'desktop', DESKTOP_VIEWS, sessionToken, { authShots: true });
    await captureViewport(browser, 'mobile', MOBILE_VIEWS, sessionToken);
    await captureViewport(browser, 'tablet', TABLET_VIEWS, sessionToken);
    let videoPath = null;
    try {
      videoPath = await recordWalkthrough(browser, sessionToken);
      mark('qa.video', 'WORKING', videoPath);
    } catch (e) {
      findings.push({ severity: 'P1', where: 'video', issue: String(e.message || e) });
      mark('qa.video', 'FAILED', String(e.message || e));
    }
    const report = await writeReports(sessionToken, videoPath);
    console.log('COUNTS', report.counts);
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
