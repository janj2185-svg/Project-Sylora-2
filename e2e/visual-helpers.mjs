import { expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers.mjs';
import {
  FIXED_VISUAL_ACCOUNT,
  FIXED_VISUAL_TIME,
  VISUAL_FIXTURE_ID,
  VISUAL_LOCALE,
  VISUAL_RANDOM_SEED
} from '../scripts/visual-fixture.mjs';

export { FIXED_VISUAL_ACCOUNT, FIXED_VISUAL_TIME, VISUAL_FIXTURE_ID, VISUAL_LOCALE, VISUAL_RANDOM_SEED };

export const VISUAL_VIEWPORTS = Object.freeze([
  Object.freeze({ id: '390x844', width: 390, height: 844, isMobile: true, hasTouch: true }),
  Object.freeze({ id: '768x1024', width: 768, height: 1024, isMobile: true, hasTouch: true }),
  Object.freeze({ id: '1366x900', width: 1366, height: 900, isMobile: false, hasTouch: false }),
  Object.freeze({ id: '1920x1080', width: 1920, height: 1080, isMobile: false, hasTouch: false })
]);

export const VISUAL_TOUCH_POINTS = 1;

export const VISUAL_SURFACES = Object.freeze([
  Object.freeze({ id: 'home', path: '/', view: 'feed', ready: '.living-horizon.home-compact' }),
  Object.freeze({ id: 'live', path: '/live', view: 'live', ready: '.live-tabs' }),
  Object.freeze({ id: 'studio', path: '/studio', view: 'studio', ready: '.studio-stage' }),
  Object.freeze({ id: 'sylora', path: '/ai', view: 'ai', ready: '.sylora-ai-hero.ai-presence-container' }),
  Object.freeze({ id: 'inbox', path: '/messages', view: 'messages', ready: '.messages-hero' }),
  Object.freeze({ id: 'profile', path: '/profile', view: 'profile', ready: '.profile-hero' }),
  Object.freeze({ id: 'settings', path: '/more', view: 'more', ready: '.settings-scene' }),
  Object.freeze({
    id: 'create-hub-open', path: '/', view: 'feed', ready: '#syloraCreateHub',
    open: async page => page.locator('[data-horizon-create]').click()
  }),
  Object.freeze({
    id: 'live-create', path: '/live', view: 'live', ready: '#liveTitle',
    open: async page => page.locator('[data-live-tab="create"]').click()
  }),
  Object.freeze({
    id: 'clips-create', path: '/clips', view: 'clips', ready: '#clipUpload',
    open: async page => page.locator('#openUpload').click()
  }),
  Object.freeze({
    id: 'video-create', path: '/videos', view: 'videos', ready: '#videoUpload',
    open: async page => page.locator('#videoUploadOpen').click()
  })
]);

export async function createVisualContext(browser, viewport, baseURL) {
  if (!baseURL) throw new Error('Visual context requires an explicit baseURL');
  const context = await browser.newContext({
    baseURL,
    viewport: { width: viewport.width, height: viewport.height },
    screen: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    isMobile: viewport.isMobile,
    hasTouch: viewport.hasTouch,
    locale: 'uk-UA',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce'
  });

  await context.addInitScript(({ seed }) => {
    let state = seed >>> 0;
    Math.random = () => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      return state / 0x100000000;
    };
    globalThis.__SYLORA_VISUAL_CAPTURE__ = true;
    try {
      localStorage.setItem('sylora_locale', 'uk');
      localStorage.setItem('sylora_voice', '0');
      localStorage.removeItem('sylora_home_engaged_v1');
    } catch {
      // The initial about:blank document has an opaque origin.
    }
  }, { seed: VISUAL_RANDOM_SEED });

  return context;
}

export async function applyVisualTouchEmulation(session, viewport) {
  if (!viewport.hasTouch) return;
  if (!session) throw new Error('Touch visual context requires an active CDP session');
  await session.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: VISUAL_TOUCH_POINTS
  });
}

export async function enforceVisualTouchEmulation(context, page, viewport) {
  if (!viewport.hasTouch) return null;

  // Playwright 1.62.1 enables Chromium touch emulation without sending the
  // protocol's maxTouchPoints field. Chrome for Testing 151 nevertheless
  // reported navigator.maxTouchPoints as 0 in CI. Keep Playwright's hasTouch
  // context contract, and make the Chromium protocol value explicit. Chromium
  // resets the renderer-owned override on navigation, so callers retain this
  // session and reapply it on every newly loaded visual document.
  const session = await context.newCDPSession(page);
  try {
    await applyVisualTouchEmulation(session, viewport);
    return session;
  } catch (error) {
    await session.detach().catch(() => {});
    throw error;
  }
}

export async function verifyVisualTouchInput(page, viewport) {
  if (!viewport.hasTouch) return null;

  await page.evaluate(() => {
    const probe = document.createElement('button');
    probe.type = 'button';
    probe.id = 'sylora-visual-touch-probe';
    probe.setAttribute('aria-label', 'Visual touch probe');
    Object.assign(probe.style, {
      position: 'fixed',
      inset: '0 auto auto 0',
      width: '24px',
      height: '24px',
      zIndex: '2147483647',
      opacity: '0.01',
      touchAction: 'none'
    });
    globalThis.__SYLORA_VISUAL_TOUCH_PROBE__ = { pointerType: '', touchStart: false };
    probe.addEventListener('pointerdown', event => {
      globalThis.__SYLORA_VISUAL_TOUCH_PROBE__.pointerType = event.pointerType;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
    probe.addEventListener('touchstart', event => {
      globalThis.__SYLORA_VISUAL_TOUCH_PROBE__.touchStart = true;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true, passive: false });
    probe.addEventListener('click', event => {
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
    document.body.append(probe);
  });

  let result;
  try {
    await page.touchscreen.tap(12, 12);
    result = await page.evaluate(() => globalThis.__SYLORA_VISUAL_TOUCH_PROBE__);
  } finally {
    await page.evaluate(() => {
      document.querySelector('#sylora-visual-touch-probe')?.remove();
      delete globalThis.__SYLORA_VISUAL_TOUCH_PROBE__;
    }).catch(() => {});
  }

  if (!result?.touchStart || result.pointerType !== 'touch') {
    throw new Error(`Playwright touch probe failed: ${JSON.stringify(result)}`);
  }
  return { touchStart: true, pointerType: 'touch' };
}

async function browserAuthRequest(page, path, payload, token = '') {
  return page.evaluate(async ({ path, payload, token }) => {
    const response = await fetch(path, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        ...(token ? { authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload)
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, body };
  }, { path, payload, token });
}

function nextCapabilitiesResponse(page) {
  return page.waitForResponse(response => {
    if (response.request().method() !== 'GET') return false;
    try { return new URL(response.url()).pathname === '/api/ai/capabilities'; }
    catch { return false; }
  });
}

async function waitForCapabilitiesState(page,responsePromise) {
  const response=await responsePromise;
  if (!response.ok()) throw new Error(`Capabilities readiness request failed: ${response.status()}`);
  const capabilities=await response.json();
  const degraded=!!(capabilities?.degraded?.ai || capabilities?.degraded?.voice);
  await page.waitForFunction(expectedDegraded => {
    const banner=document.querySelector('#syloraDegraded');
    return !!banner && (expectedDegraded
      ? banner.hidden === false && !!banner.textContent.trim()
      : banner.hidden === true);
  },degraded);
}

export async function ensureFixedVisualAccount(page) {
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('body')).toHaveAttribute('data-view', 'feed');

  const auth = await browserAuthRequest(page, '/api/auth/login', {
    identity: FIXED_VISUAL_ACCOUNT.email,
    password: FIXED_VISUAL_ACCOUNT.password
  });

  if (auth.status !== 200 || !auth.body?.token) {
    throw new Error(`Deterministic visual fixture login failed: ${auth.status} ${JSON.stringify(auth.body)}`);
  }

  const token = auth.body.token;
  await page.evaluate(({ token }) => {
    localStorage.setItem('sylora_token', token);
    localStorage.setItem('sylora_locale', 'uk');
    localStorage.setItem('sylora_voice', '0');
    localStorage.removeItem('sylora_home_engaged_v1');
  }, { token });

  const fixture = await page.evaluate(async token => {
    const headers = { authorization: `Bearer ${token}` };
    const [profileResponse, briefResponse] = await Promise.all([
      fetch('/api/me', { headers }),
      fetch('/api/daily-brief', { headers })
    ]);
    const profile = await profileResponse.json().catch(() => null);
    const brief = await briefResponse.json().catch(() => null);
    return {
      profileStatus: profileResponse.status,
      briefStatus: briefResponse.status,
      profile: profile?.user,
      dailyBriefEnabled: brief?.brief?.enabled
    };
  }, token);
  if (fixture.profileStatus !== 200 || fixture.briefStatus !== 200) {
    throw new Error(`Unable to verify deterministic visual fixture: ${JSON.stringify(fixture)}`);
  }
  if (
    fixture.profile?.id !== FIXED_VISUAL_ACCOUNT.id ||
    fixture.profile?.displayName !== FIXED_VISUAL_ACCOUNT.displayName ||
    fixture.profile?.bio !== FIXED_VISUAL_ACCOUNT.bio ||
    fixture.profile?.locale !== VISUAL_LOCALE ||
    fixture.dailyBriefEnabled !== false
  ) {
    throw new Error(`Visual fixture drifted from its locked seed: ${JSON.stringify(fixture)}`);
  }

  const capabilitiesResponse=nextCapabilitiesResponse(page);
  await page.reload({ waitUntil: 'load' });
  await waitForCapabilitiesState(page,capabilitiesResponse);
  await expect(page.locator('body')).toHaveAttribute('data-view', 'feed');
  await expect(page.locator('#localeSwitch')).toHaveValue(VISUAL_LOCALE);
  await expect(page.locator('#composer')).toBeVisible();
  await waitForStableVisualState(page,VISUAL_SURFACES[0]);
  await expectNoHorizontalOverflow(page);
}

export function captureRuntimeDiagnostics(page) {
  const entries = [];
  page.on('pageerror', error => entries.push({ type: 'pageerror', text: error.stack || error.message }));
  page.on('console', message => {
    if (message.type() !== 'error') return;
    entries.push({ type: 'console.error', text: message.text(), location: message.location() });
  });
  page.on('crash', () => entries.push({ type: 'page-crash', text: 'Page crashed' }));
  page.on('response', response => {
    if (response.status() < 400) return;
    entries.push({
      type: 'http-error',
      status: response.status(),
      method: response.request().method(),
      url: response.url()
    });
  });
  page.on('requestfailed', request => {
    const failure = request.failure()?.errorText || 'request failed';
    const pathname = (() => { try { return new URL(request.url()).pathname; } catch { return ''; } })();
    if (failure.includes('ERR_ABORTED') && ['/api/events', '/api/gifts/stream'].includes(pathname)) return;
    entries.push({ type: 'request-failed', method: request.method(), url: request.url(), failure });
  });

  return {
    assertClean(surface) {
      if (!entries.length) return;
      throw new Error(`Runtime errors while rendering ${surface}: ${JSON.stringify(entries, null, 2)}`);
    },
    reset() { entries.length = 0; }
  };
}

export async function gotoVisualSurface(page, surface, { afterNavigation } = {}) {
  if (surface.id === 'sylora') await clearVisualAiState(page);
  const capabilitiesResponsePromise=nextCapabilitiesResponse(page);
  await page.goto(surface.path, { waitUntil: 'load' });
  if (afterNavigation) await afterNavigation();
  await waitForCapabilitiesState(page,capabilitiesResponsePromise);
  await expect(page.locator('body')).toHaveAttribute('data-view', surface.view);
  await expect(page.locator('#localeSwitch')).toHaveValue(VISUAL_LOCALE);
  await expect(page.locator('html')).toHaveAttribute('lang', VISUAL_LOCALE);

  if (surface.open) await surface.open(page);
  await expect(page.locator(surface.ready)).toBeVisible();
  await waitForStableVisualState(page, surface);
  await expectNoHorizontalOverflow(page);
}

async function clearVisualAiState(page) {
  const statuses = await page.evaluate(async () => {
    const token = localStorage.getItem('sylora_token');
    const headers = { authorization: `Bearer ${token}` };
    const history = await fetch('/api/ai/history', { method: 'DELETE', headers });
    const memory = await fetch('/api/ai/memory', { method: 'DELETE', headers });
    return [history.status, memory.status];
  });
  if (statuses.some(status => status !== 200)) {
    throw new Error(`Unable to normalize visual AI state: ${statuses.join(', ')}`);
  }
}

export async function waitForStableVisualState(page, surface) {
  await page.waitForFunction(() => globalThis.__syloraBooted === true);
  await page.waitForFunction(() => globalThis.__syloraGiftEngineState === 'ready');
  await expect(page.locator('.shell-wallet')).toHaveCount(1);
  await expect(page.locator('.rail-orbit')).toHaveCount(1);
  await expect(page.locator('#logout')).toHaveCount(1);
  await expect(page.locator('.brand img')).toHaveAttribute(
    'src',
    '/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png'
  );
  await expect(page.locator('.brand img')).toHaveAttribute(
    'data-brand-sha256',
    'dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08'
  );

  if (surface.id === 'home') {
    await expect(page.locator('#composer')).toBeVisible();
    await expect(page.locator('.eco-empty-state')).toBeVisible();
    await expect(page.locator('#feed .post.muted')).toBeVisible();
  }
  if (surface.id === 'live') {
    await expect(page.locator('[data-live-tab="discover"]')).toHaveClass(/active/);
    await expect(page.locator('.live-empty-state')).toBeVisible();
    await expect(page.locator('.live-room-card')).toHaveCount(0);
  }
  if (surface.id === 'studio') {
    await expect(page.locator('.studio-controls')).toHaveAttribute('data-mobile-mounted', '1');
    await expect(page.locator('.studio-mobile-tools')).toHaveCount(1);
    await expect(page.locator('#studioProfile')).toHaveValue('vertical720');
    const opaqueCanvas = await page.locator('#studioCanvas').evaluate(canvas => {
      const context = canvas.getContext('2d');
      return context?.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3] > 0;
    });
    expect(opaqueCanvas).toBe(true);
  }
  if (surface.id === 'sylora') {
    await expect(page.locator('.sylora-ai-hero .sy-ai-context-status')).toBeVisible();
    await expect(page.locator('#aiProactive')).toHaveValue('IMPORTANT_ONLY');
    await expect(page.locator('.ai-send')).toBeDisabled();
  }
  if (surface.id === 'inbox') {
    await expect(page.locator('[data-inbox-tab="messages"]')).toHaveClass(/active/);
    await expect(page.locator('.conversation-empty')).toBeVisible();
    await expect(page.locator('.chat-placeholder')).toBeVisible();
  }
  if (surface.id === 'profile') {
    await expect(page.locator('#profile')).toBeVisible();
    await expect(page.locator('.profile-vitals')).toBeVisible();
  }
  if (surface.id === 'settings') await expect(page.locator('.settings-grid .module')).toHaveCount(14);
  if (surface.id === 'create-hub-open') await expect(page.locator('.create-hub-item')).toHaveCount(9);
  if (surface.id === 'live-create') {
    await expect(page.locator('[data-live-tab="create"]')).toHaveClass(/active/);
    await expect(page.locator('#goLive')).toBeVisible();
    await expect(page.locator('#createEventBtn')).toBeVisible();
  }
  if (surface.id === 'clips-create') await expect(page.locator('#clipUpload input[type="file"]')).toHaveAttribute('accept', 'video/mp4,video/webm');
  if (surface.id === 'video-create') await expect(page.locator('#videoUpload input[type="file"]')).toHaveAttribute('accept', 'video/mp4,video/webm');

  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
    const images = [...document.images].filter(image => image.currentSrc || image.src);
    await Promise.all(images.map(async image => {
      if (!image.complete) {
        await new Promise((resolve, reject) => {
          image.addEventListener('load', resolve, { once: true });
          image.addEventListener('error', reject, { once: true });
        });
      }
      if (typeof image.decode === 'function') await image.decode().catch(() => {});
      if (!image.naturalWidth) throw new Error(`Image failed to decode: ${image.currentSrc || image.src}`);
    }));
    const backgroundUrls = new Set();
    const collect = style => {
      for (const match of String(style?.backgroundImage || '').matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
        backgroundUrls.add(new URL(match[1], location.href).href);
      }
    };
    for (const element of document.querySelectorAll('body, body *')) {
      collect(getComputedStyle(element));
      collect(getComputedStyle(element, '::before'));
      collect(getComputedStyle(element, '::after'));
    }
    await Promise.all([...backgroundUrls].map(url => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = async () => {
        try { await image.decode?.(); resolve(); } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error(`Background image failed to load: ${url}`));
      image.src = url;
    })));
    scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

export async function visualRuntimeMetadata(page, playwrightTouchInput = null) {
  return page.evaluate(() => ({
    fontStatus: document.fonts?.status || 'unsupported',
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    imageCount: [...document.images].filter(image => image.currentSrc || image.src).length,
    viewport: { width: innerWidth, height: innerHeight },
    devicePixelRatio,
    locale: document.documentElement.lang,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    touchPoints: navigator.maxTouchPoints,
    primaryPointer: matchMedia('(pointer: coarse)').matches
      ? 'coarse'
      : matchMedia('(pointer: fine)').matches ? 'fine' : 'none',
    primaryHover: matchMedia('(hover: hover)').matches
      ? 'hover'
      : matchMedia('(hover: none)').matches ? 'none' : 'unknown'
  })).then(runtime => ({ ...runtime, playwrightTouchInput }));
}
