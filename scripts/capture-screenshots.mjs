/**
 * Visual QA screenshot capture for Project-Sylora-2.
 * Uses system Chrome + puppeteer-core against the local server.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const puppeteer = require('puppeteer-core');

const BASE = process.env.SYLORA_BASE || 'http://127.0.0.1:8787';
const ROOT = path.resolve('artifacts/screenshots');
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const seedPath = path.resolve('artifacts/screenshots/seed.json');

const VIEWPORTS = {
  mobile: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  tablet: { width: 820, height: 1180, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false },
};

async function ensureDirs() {
  for (const d of ['mobile', 'tablet', 'desktop', 'states']) {
    await fs.mkdir(path.join(ROOT, d), { recursive: true });
  }
}

async function shot(page, folder, name, { fullPage = false } = {}) {
  const file = path.join(ROOT, folder, name);
  await new Promise((r) => setTimeout(r, 400));
  // Prefer viewport shots so fixed mobile-dock stays at the bottom (fullPage stitches break fixed UI).
  await page.screenshot({ path: file, fullPage, captureBeyondViewport: fullPage });
  console.log('✓', folder + '/' + name + (fullPage ? ' (full)' : ''));
  return file;
}

async function loginWithPassword(page, email, password) {
  const tok = await page.evaluate(async (identity, pass) => {
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
  await page.waitForFunction(() => !document.querySelector('#app .loading'), { timeout: 25000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
  return tok;
}

async function gotoApp(page) {
  // SSE /api/events keeps connections open — never wait for networkidle.
  await page.goto(BASE + '/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('#app', { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 800));
}

async function login(page, token) {
  await gotoApp(page);
  await page.evaluate((tok) => {
    localStorage.setItem('sylora_token', tok);
  }, token);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => !document.querySelector('#app .loading'), { timeout: 25000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 900));
}

async function navView(page, view) {
  await page.evaluate((v) => {
    if (typeof window.__syloraNav === 'function') {
      window.__syloraNav(v);
      return;
    }
    const btn =
      document.querySelector(`aside.left-rail [data-view="${v}"]`) ||
      document.querySelector(`.mobile-dock [data-view="${v}"]`) ||
      document.querySelector(`[data-rail-view="${v}"]`) ||
      document.querySelector(`[data-view="${v}"]`);
    if (btn) btn.click();
    else document.querySelector(`[data-go="${v}"]`)?.click();
  }, view);
  await new Promise((r) => setTimeout(r, 1000));
  await page.waitForFunction(
    (v) => document.body.dataset.view === v || !!document.querySelector('#app .card, #app section, #app .hero, #app .living-horizon'),
    { timeout: 20000 },
    view,
  ).catch(() => {});
}

async function clickText(page, selector, text) {
  await page.evaluate(
    (sel, t) => {
      const nodes = [...document.querySelectorAll(sel)];
      const el = nodes.find((n) => (n.textContent || '').trim().includes(t));
      if (el) el.click();
    },
    selector,
    text,
  );
  await new Promise((r) => setTimeout(r, 500));
}

async function captureMobile(page, seed) {
  await page.setViewport(VIEWPORTS.mobile);
  await gotoApp(page);
  seed.tokens.host = await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
  let n = 1;
  const save = async (slug) => shot(page, 'mobile', `${String(n++).padStart(2, '0')}-${slug}.png`);

  await navView(page, 'feed');
  await save('home');

  await navView(page, 'explore');
  await save('discover');

  await navView(page, 'live');
  await page.evaluate(() => {
    const b = document.querySelector('[data-live-tab="discover"]');
    if (b) b.click();
  });
  await new Promise((r) => setTimeout(r, 500));
  await save('live');

  // LIVE room (watch)
  if (seed.ids.liveAId) {
    await page.evaluate((id) => {
      const b = document.querySelector(`.watch-live[data-id="${id}"]`) || document.querySelector('.watch-live');
      if (b) b.click();
    }, seed.ids.liveAId);
    await new Promise((r) => setTimeout(r, 1200));
    await save('live-room');

    // Gifts panel
    await page.evaluate(() => document.querySelector('#openGiftTray')?.click());
    await new Promise((r) => setTimeout(r, 400));
    await save('gifts-panel-live');

    // Battle panel if present
    const hasBattle = await page.evaluate(() => !!document.querySelector('.resonance-panel'));
    if (hasBattle) await save('resonance-battle');
  }

  // Create LIVE tab
  await navView(page, 'live');
  await page.evaluate(() => document.querySelector('[data-live-tab="create"]')?.click());
  await new Promise((r) => setTimeout(r, 600));
  await save('create-live');

  // Battles tab
  await page.evaluate(() => document.querySelector('[data-live-tab="battles"]')?.click());
  await new Promise((r) => setTimeout(r, 600));
  await save('resonance-battles-tab');

  // Following tab
  await page.evaluate(() => document.querySelector('[data-live-tab="following"]')?.click());
  await new Promise((r) => setTimeout(r, 500));
  await save('live-following');

  await navView(page, 'gifts');
  await save('gifts');

  await navView(page, 'studio');
  await save('creator-studio');

  await navView(page, 'clips');
  await save('clips');

  await navView(page, 'videos');
  await save('videos');

  await navView(page, 'ai');
  await save('sylora-ai');

  // Voice conversation UI (realtime deck may need mic — still capture page + toolbar)
  await page.evaluate(() => {
    document.querySelector('#aiVoiceToggle')?.click();
  });
  await new Promise((r) => setTimeout(r, 400));
  await save('sylora-voice-settings-toggle');

  await navView(page, 'messages');
  await page.evaluate(() => document.querySelector('[data-inbox-tab="messages"]')?.click());
  await new Promise((r) => setTimeout(r, 800));
  await save('inbox');

  // Private chat (auto-opens first convo)
  await new Promise((r) => setTimeout(r, 500));
  await save('private-chat');

  // Notifications
  await page.evaluate(() => document.querySelector('[data-inbox-tab="notifications"]')?.click());
  await new Promise((r) => setTimeout(r, 500));
  await save('notifications');

  // Calls tab
  await page.evaluate(() => document.querySelector('[data-inbox-tab="calls"]')?.click());
  await new Promise((r) => setTimeout(r, 600));
  await save('inbox-calls');

  // Invites / Priority
  await page.evaluate(() => document.querySelector('[data-inbox-tab="invites"]')?.click());
  await new Promise((r) => setTimeout(r, 400));
  await save('inbox-invites');
  await page.evaluate(() => document.querySelector('[data-inbox-tab="priority"]')?.click());
  await new Promise((r) => setTimeout(r, 400));
  await save('inbox-priority');

  await navView(page, 'communities');
  await save('communities');

  // Community page if open button exists
  await page.evaluate(() => {
    const b = document.querySelector('.open-community, [data-open-community], button.open-community') ||
      [...document.querySelectorAll('button')].find((x) => /open|відкри|join|увійт/i.test(x.textContent || ''));
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 700));
  await save('community-page');

  await navView(page, 'business');
  await save('business');

  // Business workspace dashboard
  await page.evaluate(() => document.querySelector('.open-org-workspace')?.click());
  await new Promise((r) => setTimeout(r, 800));
  await save('business-dashboard');

  // Scroll / capture hub CTAs area
  await page.evaluate(() => window.scrollTo(0, 0));
  await save('business-hub');

  await navView(page, 'learning');
  await save('learning-science');

  // Open course
  await page.evaluate(() => document.querySelector('.open-course')?.click());
  await new Promise((r) => setTimeout(r, 900));
  await save('course');
  await save('lesson');

  // Quiz
  await page.evaluate(() => document.querySelector('.lesson-quiz')?.click());
  await new Promise((r) => setTimeout(r, 800));
  await save('quiz-test');

  await navView(page, 'learning');
  await save('science');
  await save('science-tools-hub');

  // Conference (science hub)
  await page.evaluate(() => {
    const b = document.querySelector('[data-conference-join], .join-conference, button.open-conference') ||
      [...document.querySelectorAll('button')].find((x) => /join|увійт|відкрит/i.test(x.textContent || '') && x.closest('.conference, [class*="conference"], .card'));
    b?.click();
  });
  await new Promise((r) => setTimeout(r, 900));
  await save('conference');

  await navView(page, 'explore');
  await page.type('input[name="q"]', 'sylora', { delay: 20 });
  await page.evaluate(() => document.querySelector('#search button')?.click());
  await new Promise((r) => setTimeout(r, 800));
  await save('universal-search-results');

  await navView(page, 'profile');
  await save('profile');
  await save('edit-profile');

  await navView(page, 'more');
  await save('settings');

  await navView(page, 'security');
  await save('privacy-ai-control');
  await save('memory-center');
  await save('security');

  await navView(page, 'identity');
  await save('identity');

  await navView(page, 'dashboard');
  await save('personal-dashboard');

  await navView(page, 'canvas');
  await save('sylora-canvas');

  await navView(page, 'agents');
  await save('agents');

  await navView(page, 'developer');
  await save('developer');

  // Language selector in header
  await page.evaluate(() => {
    const sel = document.querySelector('#localeSwitch');
    if (sel) {
      sel.focus();
      sel.size = Math.min(8, sel.options.length);
    }
  });
  await new Promise((r) => setTimeout(r, 300));
  await shot(page, 'mobile', `${String(n++).padStart(2, '0')}-language-settings.png`);
  await page.evaluate(() => {
    const sel = document.querySelector('#localeSwitch');
    if (sel) sel.size = 0;
  });

  await navView(page, 'gifts');
  await save('wallet-earnings');

  // Admin if role allows
  const isAdmin = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/me', { headers: { authorization: `Bearer ${localStorage.getItem('sylora_token')}` } });
      const j = await r.json();
      return j.user?.role === 'admin';
    } catch {
      return false;
    }
  });
  if (isAdmin) {
    await navView(page, 'admin');
    await save('admin');
  } else {
    await shot(page, 'mobile', `${String(n++).padStart(2, '0')}-admin-not-available.png`);
  }

  // Auth screen — soft client logout only (keep server token for later suites)
  await page.evaluate(() => {
    localStorage.removeItem('sylora_token');
  });
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));
  await page.evaluate(() => {
    if (typeof window.__syloraNav === 'function') window.__syloraNav('profile');
    else document.querySelector('[data-view="profile"].nav')?.click();
  });
  await new Promise((r) => setTimeout(r, 700));
  await save('auth');
}

async function captureViewportSuite(page, seed, folder, views) {
  await page.setViewport(VIEWPORTS[folder]);
  await gotoApp(page);
  await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
  let n = 1;
  for (const view of views) {
    await navView(page, view);
    await shot(page, folder, `${String(n++).padStart(2, '0')}-${view}.png`);
  }
}

async function captureStates(page, seed) {
  await page.setViewport(VIEWPORTS.mobile);
  await gotoApp(page);
  await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
  // refresh seed token from storage
  seed.tokens.host = await page.evaluate(() => localStorage.getItem('sylora_token'));
  let n = 1;
  const save = async (slug) => shot(page, 'states', `${String(n++).padStart(2, '0')}-${slug}.png`);

  // Universal Create menu
  await page.evaluate(() => {
    document.querySelector('[data-create-hub]')?.click() ||
      document.querySelector('[data-horizon-create]')?.click();
  });
  // also try openCreateHub via clicking Create in dock/header areas
  const hubOpen = await page.evaluate(() => !!document.querySelector('#syloraCreateHub'));
  if (!hubOpen) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll('button')].find((b) => /створити|create/i.test(b.textContent || ''));
      btn?.click();
    });
  }
  await new Promise((r) => setTimeout(r, 500));
  await save('universal-create-menu');
  await page.evaluate(() => document.querySelector('#syloraCreateHub')?.remove());

  // LIVE gift panel + battle
  await navView(page, 'live');
  await page.evaluate((id) => {
    const b = document.querySelector(`.watch-live[data-id="${id}"]`) || document.querySelector('.watch-live');
    b?.click();
  }, seed.ids.liveAId);
  await new Promise((r) => setTimeout(r, 1000));
  await page.evaluate(() => document.querySelector('#openGiftTray')?.click());
  await new Promise((r) => setTimeout(r, 400));
  await save('live-gift-panel');
  if (await page.evaluate(() => !!document.querySelector('.resonance-panel'))) {
    await save('battle');
  } else {
    // Start battle from LIVE list then re-open room
    await navView(page, 'live');
    await page.evaluate(() => document.querySelector('.resonance-start')?.click());
    await new Promise((r) => setTimeout(r, 600));
    await page.evaluate((id) => {
      const b = document.querySelector(`.watch-live[data-id="${id}"]`) || document.querySelector('.watch-live');
      b?.click();
    }, seed.ids.liveAId);
    await new Promise((r) => setTimeout(r, 1000));
    await save('battle');
  }

  // Incoming call banner: host rings peer, then peer session shows banner
  const call = await page.evaluate(async (peerUserId) => {
    const hostTok = localStorage.getItem('sylora_token');
    const r = await fetch('/api/calls', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${hostTok}` },
      body: JSON.stringify({ kind: 'voice', userId: peerUserId }),
    });
    return r.json();
  }, seed.ids.peerUserId);

  await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), seed.tokens.peer);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1800));
  const banner = await page.evaluate(() => !!document.querySelector('.incoming-call-banner, .incoming-call, #incomingCall, [data-incoming-call]'));
  if (!banner) {
    // Keep peer logged in with SSE; ring again and wait for real banner
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

  // Active voice call as host
  await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), seed.tokens.host);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));
  await navView(page, 'messages');
  await page.evaluate(() => document.querySelector('[data-inbox-tab="calls"]')?.click());
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate((peerId) => {
    const sel = document.querySelector('#callRecipient');
    if (sel) sel.value = peerId;
  }, seed.ids.peerUserId);
  await page.evaluate(() => document.querySelector('#startVoiceCall')?.click());
  await new Promise((r) => setTimeout(r, 2000));
  await save('active-voice-call');

  // Video call UI as host
  await page.evaluate((tok) => localStorage.setItem('sylora_token', tok), seed.tokens.host);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 900));
  await navView(page, 'messages');
  await page.evaluate(() => document.querySelector('[data-inbox-tab="calls"]')?.click());
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate((peerId) => {
    const sel = document.querySelector('#callRecipient');
    if (sel) sel.value = peerId;
  }, seed.ids.peerUserId);
  // Grant fake media permissions via CDP already set
  await page.evaluate(() => document.querySelector('#startVideoCall')?.click());
  await new Promise((r) => setTimeout(r, 2000));
  await save('active-video-call');

  // End call / back to AI for listening/speaking states
  await page.evaluate(() => document.querySelector('#callEnd')?.click());
  await new Promise((r) => setTimeout(r, 500));

  await navView(page, 'ai');
  // Simulate listening presence
  await page.evaluate(() => {
    document.querySelector('.sylora-ai-hero')?.setAttribute('data-presence', 'listening');
    const st = document.querySelector('#aiPresenceStatus');
    if (st) st.textContent = 'СЛУХАЮ';
    document.querySelector('#aiStatus') && (document.querySelector('#aiStatus').textContent = 'Sylora слухає…');
  });
  await save('sylora-listening');

  await page.evaluate(() => {
    document.querySelector('.sylora-ai-hero')?.setAttribute('data-presence', 'speaking');
    const st = document.querySelector('#aiPresenceStatus');
    if (st) st.textContent = 'ГОВОРЮ';
    document.querySelector('#aiStatus') && (document.querySelector('#aiStatus').textContent = 'Sylora говорить…');
    document.querySelector('.voice-wave')?.classList.add('active');
  });
  await save('sylora-speaking');

  // Language selector expanded
  await page.evaluate(() => {
    const sel = document.querySelector('#localeSwitch');
    if (sel) {
      sel.focus();
      sel.size = Math.min(10, sel.options.length);
    }
  });
  await save('language-selector');
  await page.evaluate(() => {
    const sel = document.querySelector('#localeSwitch');
    if (sel) sel.size = 0;
  });

  // Voice selector / toolbar
  await navView(page, 'ai');
  await page.evaluate(() => {
    document.querySelector('#aiVoiceToggle')?.scrollIntoView({ block: 'center' });
  });
  await save('voice-selector');

  // Notification center (profile activity + inbox notifications)
  await navView(page, 'messages');
  await page.evaluate(() => document.querySelector('[data-inbox-tab="notifications"]')?.click());
  await new Promise((r) => setTimeout(r, 500));
  await save('notification-center');

  // Invoice creation (business)
  await navView(page, 'business');
  await page.evaluate(() => document.querySelector('#bizInvoice')?.click());
  await new Promise((r) => setTimeout(r, 900));
  await save('invoice-creation');

  // Study / Focus timer
  await navView(page, 'learning');
  await page.evaluate(() => document.querySelector('#focusStudy')?.click());
  await new Promise((r) => setTimeout(r, 700));
  // Also open timers via API status toast — capture learning hub after focus start
  await save('study-focus-timer');

  // Command palette / universal search overlay
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyK');
  await page.keyboard.up('Control');
  await new Promise((r) => setTimeout(r, 500));
  await save('command-palette');
}

async function main() {
  await ensureDirs();
  const seed = JSON.parse(await fs.readFile(seedPath, 'utf8'));

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    protocolTimeout: 180000,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-dev-shm-usage',
      '--window-size=1440,900',
    ],
    defaultViewport: null,
  });

  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  await page.evaluateOnNewDocument(() => {
    window.prompt = (msg, def = 'Demo') => def || 'Demo';
    window.confirm = () => true;
    window.alert = () => {};
  });
  const client = await page.createCDPSession();
  await client.send('Browser.grantPermissions', {
    origin: BASE,
    permissions: ['microphone', 'camera', 'notifications'],
  }).catch(() => {});

  try {
    // Fresh tokens every run
    await gotoApp(page);
    seed.tokens.host = await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
    seed.tokens.peer = (
      await page.evaluate(async () => {
        const r = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ identity: 'peer@sylora.test', password: 'Password123!' }),
        });
        return (await r.json()).token;
      })
    );
    await fs.writeFile(seedPath, JSON.stringify(seed, null, 2));

    console.log('=== MOBILE ===');
    await captureMobile(page, seed);

    // Long-page full captures for key hubs (content audit)
    await page.setViewport(VIEWPORTS.mobile);
    await loginWithPassword(page, 'demo@sylora.test', 'Password123!');
    for (const [view, name] of [
      ['feed', '50-home-full'],
      ['business', '51-business-full'],
      ['learning', '52-learning-full'],
      ['more', '53-settings-full'],
    ]) {
      await navView(page, view);
      await shot(page, 'mobile', `${name}.png`, { fullPage: true });
    }

    // Avoid native prompt()/confirm() — they hang headless Chrome.
    await page.evaluate(() => {
      window.prompt = (msg, def = 'Demo') => def || 'Demo';
      window.confirm = () => true;
      window.alert = () => {};
    });

    // Business / Learning subsections that are hub panels (honest PARTIAL pages)
    await navView(page, 'business');
    await page.evaluate(async () => {
      const tok = localStorage.getItem('sylora_token');
      const h = { authorization: `Bearer ${tok}`, 'content-type': 'application/json' };
      await fetch('/api/business/crm', { method: 'POST', headers: h, body: JSON.stringify({ type: 'client', name: 'Acme Client' }) });
    });
    await page.evaluate(() => window.__syloraNav('business'));
    await new Promise((r) => setTimeout(r, 800));
    await shot(page, 'mobile', '54-clients-crm.png');
    await page.evaluate(() => document.querySelector('#bizQuote')?.click());
    await new Promise((r) => setTimeout(r, 900));
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

    console.log('=== TABLET ===');
    await captureViewportSuite(page, seed, 'tablet', ['feed', 'live', 'ai', 'messages', 'business', 'learning', 'profile']);
    await page.setViewport(VIEWPORTS.tablet);
    await navView(page, 'learning');
    await shot(page, 'tablet', '08-science.png');

    console.log('=== DESKTOP ===');
    await captureViewportSuite(page, seed, 'desktop', ['feed', 'explore', 'live', 'studio', 'ai', 'messages', 'business', 'learning', 'profile']);
    await page.setViewport(VIEWPORTS.desktop);
    await navView(page, 'learning');
    await shot(page, 'desktop', '10-science.png');

    console.log('=== STATES ===');
    await captureStates(page, seed);
  } finally {
    await browser.close();
  }
  console.log('DONE');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
