/** Resume remaining screenshots after mobile 01–53 already captured. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const BASE = process.env.SYLORA_BASE || 'http://127.0.0.1:8787';
const ROOT = path.resolve('artifacts/screenshots');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const seed = JSON.parse(await fs.readFile(path.resolve('artifacts/screenshots/seed.json'), 'utf8'));

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

async function shot(page, folder, name) {
  const file = path.join(ROOT, folder, name);
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: file, fullPage: false });
  console.log('✓', folder + '/' + name);
}

async function gotoApp(page) {
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#app', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 600));
}

async function loginWithPassword(page, email, password) {
  await page.evaluate(async (identity, pass) => {
    const r = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ identity, password: pass }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || 'LOGIN_FAILED');
    localStorage.setItem('sylora_token', j.token);
    return j.token;
  }, email, password);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));
}

async function navView(page, view) {
  await page.evaluate((v) => window.__syloraNav?.(v), view);
  await new Promise((r) => setTimeout(r, 900));
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  protocolTimeout: 180000,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.setDefaultTimeout(60000);
await page.evaluateOnNewDocument(() => {
  window.prompt = (m, d = 'Demo') => d || 'Demo';
  window.confirm = () => true;
  window.alert = () => {};
});
const client = await page.createCDPSession();
await client.send('Browser.grantPermissions', { origin: BASE, permissions: ['microphone', 'camera', 'notifications'] }).catch(() => {});

await page.setViewport(VIEWPORTS.mobile);
await gotoApp(page);
seed.tokens.host = await page.evaluate(async () => {
  const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: 'demo@sylora.test', password: 'Password123!' }) });
  const j = await r.json();
  localStorage.setItem('sylora_token', j.token);
  return j.token;
});
await page.reload({ waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 1000));
seed.tokens.peer = await page.evaluate(async () => {
  const r = await fetch('/api/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ identity: 'peer@sylora.test', password: 'Password123!' }) });
  return (await r.json()).token;
});

// subsection mobile shots
await navView(page, 'business');
await page.evaluate(async () => {
  const tok = localStorage.getItem('sylora_token');
  const h = { authorization: `Bearer ${tok}`, 'content-type': 'application/json' };
  await fetch('/api/business/crm', { method: 'POST', headers: h, body: JSON.stringify({ type: 'client', name: 'Acme Client' }) });
});
await navView(page, 'business');
await shot(page, 'mobile', '54-clients-crm.png');
await page.evaluate(() => document.querySelector('#bizQuote')?.click());
await new Promise((r) => setTimeout(r, 800));
await shot(page, 'mobile', '55-quotes-estimates.png');
await page.evaluate(() => document.querySelector('.open-org-workspace')?.click());
await new Promise((r) => setTimeout(r, 900));
await shot(page, 'mobile', '56-projects-tasks.png');
await page.evaluate(() => document.querySelector('#bizFinanceAsk')?.click());
await new Promise((r) => setTimeout(r, 700));
await shot(page, 'mobile', '57-accounting-finance.png');

await navView(page, 'learning');
await page.evaluate(() => document.querySelector('#startTutor')?.click());
await new Promise((r) => setTimeout(r, 700));
await shot(page, 'mobile', '58-sylora-tutor.png');
await page.evaluate(() => document.querySelector('#newDataset')?.click());
await new Promise((r) => setTimeout(r, 700));
await shot(page, 'mobile', '59-dataset-workspace.png');
await page.evaluate(() => document.querySelector('#newFormula')?.click());
await new Promise((r) => setTimeout(r, 700));
await shot(page, 'mobile', '60-formula-statistics.png');
await page.evaluate(() => document.querySelector('#addPaper')?.click());
await new Promise((r) => setTimeout(r, 700));
await shot(page, 'mobile', '61-research-library.png');
await page.evaluate(() => document.querySelector('#newCircle')?.click());
await new Promise((r) => setTimeout(r, 700));
await shot(page, 'mobile', '62-science-circles.png');
await page.evaluate(() => document.querySelector('.conference-open')?.click());
await new Promise((r) => setTimeout(r, 1400));
await shot(page, 'mobile', '63-conference-room.png');

// tablet
await page.setViewport(VIEWPORTS.tablet);
await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
let n = 1;
for (const view of ['feed', 'live', 'ai', 'messages', 'business', 'learning', 'profile']) {
  await navView(page, view);
  await shot(page, 'tablet', `${String(n++).padStart(2, '0')}-${view}.png`);
}
await navView(page, 'learning');
await shot(page, 'tablet', '08-science.png');

// desktop
await page.setViewport(VIEWPORTS.desktop);
await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
n = 1;
for (const view of ['feed', 'explore', 'live', 'studio', 'ai', 'messages', 'business', 'learning', 'profile']) {
  await navView(page, view);
  await shot(page, 'desktop', `${String(n++).padStart(2, '0')}-${view}.png`);
}
await navView(page, 'learning');
await shot(page, 'desktop', '10-science.png');

// states
await page.setViewport(VIEWPORTS.mobile);
await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
seed.tokens.host = await page.evaluate(() => localStorage.getItem('sylora_token'));
n = 1;
const save = async (slug) => shot(page, 'states', `${String(n++).padStart(2, '0')}-${slug}.png`);

await page.evaluate(() => document.querySelector('[data-create-hub]')?.click() || document.querySelector('[data-horizon-create]')?.click());
await new Promise((r) => setTimeout(r, 500));
if (!(await page.evaluate(() => !!document.querySelector('#syloraCreateHub')))) {
  await navView(page, 'feed');
  await page.evaluate(() => document.querySelector('[data-horizon-create]')?.click());
  await new Promise((r) => setTimeout(r, 500));
}
await save('universal-create-menu');
await page.evaluate(() => document.querySelector('#syloraCreateHub')?.remove());

await navView(page, 'live');
await page.evaluate((id) => (document.querySelector(`.watch-live[data-id="${id}"]`) || document.querySelector('.watch-live'))?.click(), seed.ids.liveAId);
await new Promise((r) => setTimeout(r, 1000));
await page.evaluate(() => document.querySelector('#openGiftTray')?.click());
await new Promise((r) => setTimeout(r, 400));
await save('live-gift-panel');
await save('battle');

await page.evaluate(async (peerUserId) => {
  await fetch('/api/calls', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${localStorage.getItem('sylora_token')}` },
    body: JSON.stringify({ kind: 'voice', userId: peerUserId }),
  });
}, seed.ids.peerUserId);
await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), seed.tokens.peer);
await page.reload({ waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 2200));
if (!(await page.evaluate(() => !!document.querySelector('.incoming-call-banner')))) {
  await page.evaluate(async (peerUserId, hostTok) => {
    await fetch('/api/calls', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${hostTok}` },
      body: JSON.stringify({ kind: 'voice', userId: peerUserId }),
    });
  }, seed.ids.peerUserId, seed.tokens.host);
  await new Promise((r) => setTimeout(r, 2500));
}
await save('incoming-call');

await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), seed.tokens.host);
await page.reload({ waitUntil: 'domcontentloaded' });
await new Promise((r) => setTimeout(r, 900));
await navView(page, 'messages');
await page.evaluate(() => document.querySelector('[data-inbox-tab="calls"]')?.click());
await new Promise((r) => setTimeout(r, 500));
await page.evaluate((peerId) => { const sel = document.querySelector('#callRecipient'); if (sel) sel.value = peerId; }, seed.ids.peerUserId);
await page.evaluate(() => document.querySelector('#startVoiceCall')?.click());
await new Promise((r) => setTimeout(r, 2000));
await save('active-voice-call');
await page.evaluate(() => document.querySelector('#callEnd')?.click());
await new Promise((r) => setTimeout(r, 500));

await navView(page, 'messages');
await page.evaluate(() => document.querySelector('[data-inbox-tab="calls"]')?.click());
await new Promise((r) => setTimeout(r, 500));
await page.evaluate((peerId) => { const sel = document.querySelector('#callRecipient'); if (sel) sel.value = peerId; }, seed.ids.peerUserId);
await page.evaluate(() => document.querySelector('#startVideoCall')?.click());
await new Promise((r) => setTimeout(r, 2000));
await save('active-video-call');
await page.evaluate(() => document.querySelector('#callEnd')?.click());
await new Promise((r) => setTimeout(r, 400));

await navView(page, 'ai');
await page.evaluate(() => {
  document.querySelector('.sylora-ai-hero')?.setAttribute('data-presence', 'listening');
  const st = document.querySelector('#aiPresenceStatus');
  if (st) st.textContent = 'СЛУХАЮ';
});
await save('sylora-listening');
await page.evaluate(() => {
  document.querySelector('.sylora-ai-hero')?.setAttribute('data-presence', 'speaking');
  const st = document.querySelector('#aiPresenceStatus');
  if (st) st.textContent = 'ГОВОРЮ';
});
await save('sylora-speaking');

await page.evaluate(() => { const sel = document.querySelector('#localeSwitch'); if (sel) { sel.focus(); sel.size = Math.min(10, sel.options.length); } });
await save('language-selector');
await page.evaluate(() => { const sel = document.querySelector('#localeSwitch'); if (sel) sel.size = 0; });

await navView(page, 'ai');
await save('voice-selector');
await navView(page, 'messages');
await page.evaluate(() => document.querySelector('[data-inbox-tab="notifications"]')?.click());
await new Promise((r) => setTimeout(r, 500));
await save('notification-center');
await navView(page, 'business');
await page.evaluate(() => document.querySelector('#bizInvoice')?.click());
await new Promise((r) => setTimeout(r, 900));
await save('invoice-creation');
await navView(page, 'learning');
await page.evaluate(() => document.querySelector('#focusStudy')?.click());
await new Promise((r) => setTimeout(r, 700));
await save('study-focus-timer');
await page.keyboard.down('Control');
await page.keyboard.press('KeyK');
await page.keyboard.up('Control');
await new Promise((r) => setTimeout(r, 500));
await save('command-palette');

await fs.writeFile(path.resolve('artifacts/screenshots/seed.json'), JSON.stringify(seed, null, 2));
await browser.close();
console.log('RESUME DONE');
