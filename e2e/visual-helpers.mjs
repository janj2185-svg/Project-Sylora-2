import { createHash } from 'node:crypto';
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

const CANONICAL_BRAND_URL = '/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
const CANONICAL_BRAND_IMAGE_SELECTOR = [
  `.brand img[src="${CANONICAL_BRAND_URL}"]`,
  `.shell-wallet img[src="${CANONICAL_BRAND_URL}"]`
].join(', ');
const CANONICAL_BRAND_BACKGROUND_SELECTOR = '.sylora-presence-image';
// The foreground lockups retain strong glyph contrast even through the locked
// modal backdrop. The CSS presence mark is sampled by that blur, so its lower
// bound is intentionally smaller while still excluding the observed blank
// raster state.
const CANONICAL_IMAGE_MIN_CONTRAST = 0.02;
const CANONICAL_BACKGROUND_MIN_CONTRAST = 0.003;
const VISUAL_SCREENSHOT_OPTIONS = Object.freeze({
  type: 'png',
  animations: 'disabled',
  caret: 'hide',
  scale: 'css'
});

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
    // Keep Playwright's primary Chromium session out of the touch-emulation
    // contract. A single explicit CDP session owns touch below, including the
    // maxTouchPoints value and the trusted input probe.
    hasTouch: false,
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
  // Chromium applies emulation per DevTools session. Reset both touch paths so
  // this secondary session is the sole, explicit owner even if a prior
  // document retained stale state. The mobile configuration is Chromium's
  // protocol-level pointer/hover profile; no Navigator or matchMedia shim is
  // installed in page JavaScript.
  await session.send('Emulation.setEmitTouchEventsForMouse', { enabled: false });
  await session.send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await session.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: VISUAL_TOUCH_POINTS
  });
  await session.send('Emulation.setEmitTouchEventsForMouse', {
    enabled: true,
    configuration: 'mobile'
  });
}

export async function enforceVisualTouchEmulation(context, page, viewport) {
  if (!viewport.hasTouch) return null;

  // Playwright 1.62.1's primary Chromium session omits maxTouchPoints and
  // Chrome for Testing 151 reported a desktop capability profile in CI. The
  // context deliberately disables Playwright-owned touch, so this retained
  // session is the single touch-emulation owner. Callers reapply it immediately
  // before every production navigation.
  const session = await context.newCDPSession(page);
  try {
    await applyVisualTouchEmulation(session, viewport);
    return session;
  } catch (error) {
    await session.detach().catch(() => {});
    throw error;
  }
}

export async function verifyVisualTouchInput(page, viewport, session) {
  if (!viewport.hasTouch) return null;
  if (!session) throw new Error('Touch visual probe requires an active CDP session');

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
    globalThis.__SYLORA_VISUAL_TOUCH_PROBE__ = {
      pointerType: '',
      pointerTrusted: false,
      touchStart: false,
      touchTrusted: false
    };
    probe.addEventListener('pointerdown', event => {
      globalThis.__SYLORA_VISUAL_TOUCH_PROBE__.pointerType = event.pointerType;
      globalThis.__SYLORA_VISUAL_TOUCH_PROBE__.pointerTrusted = event.isTrusted;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, { capture: true });
    probe.addEventListener('touchstart', event => {
      globalThis.__SYLORA_VISUAL_TOUCH_PROBE__.touchStart = true;
      globalThis.__SYLORA_VISUAL_TOUCH_PROBE__.touchTrusted = event.isTrusted;
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
  let touchActive = false;
  try {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ id: 1, x: 12, y: 12, radiusX: 1, radiusY: 1, force: 1 }]
    });
    touchActive = true;
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    touchActive = false;
    result = await page.evaluate(() => globalThis.__SYLORA_VISUAL_TOUCH_PROBE__);
  } finally {
    if (touchActive) {
      await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }).catch(() => {});
    }
    await page.evaluate(() => {
      document.querySelector('#sylora-visual-touch-probe')?.remove();
      delete globalThis.__SYLORA_VISUAL_TOUCH_PROBE__;
      if (document.querySelector('#sylora-visual-touch-probe')) {
        throw new Error('Visual touch probe cleanup failed');
      }
    });
  }

  if (
    !result?.touchStart ||
    !result.touchTrusted ||
    result.pointerType !== 'touch' ||
    !result.pointerTrusted
  ) {
    throw new Error(`Chromium CDP touch probe failed: ${JSON.stringify(result)}`);
  }
  return {
    touchStart: true,
    touchTrusted: true,
    pointerType: 'touch',
    pointerTrusted: true
  };
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

export async function ensureFixedVisualAccount(page, { beforeNavigation } = {}) {
  if (beforeNavigation) await beforeNavigation();
  await page.goto('/', { waitUntil: 'load' });
  await expect(page.locator('body')).toHaveAttribute('data-view', 'feed');

  const auth = await browserAuthRequest(page, '/api/auth/login', {
    identity: FIXED_VISUAL_ACCOUNT.email,
    password: FIXED_VISUAL_ACCOUNT.password
  });

  if (auth.status !== 200 || !auth.body?.token) {
    throw new Error(`Deterministic visual fixture login failed: status=${auth.status} tokenPresent=${Boolean(auth.body?.token)}`);
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
  if (beforeNavigation) await beforeNavigation();
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

export async function gotoVisualSurface(page, surface, { beforeNavigation, afterNavigation } = {}) {
  if (surface.id === 'sylora') await clearVisualAiState(page);
  const capabilitiesResponsePromise=nextCapabilitiesResponse(page);
  if (beforeNavigation) await beforeNavigation();
  await page.goto(surface.path, { waitUntil: 'load' });
  if (afterNavigation) await afterNavigation();
  await waitForCapabilitiesState(page,capabilitiesResponsePromise);
  await expect(page.locator('body')).toHaveAttribute('data-view', surface.view);
  await expect(page.locator('#localeSwitch')).toHaveValue(VISUAL_LOCALE);
  await expect(page.locator('html')).toHaveAttribute('lang', VISUAL_LOCALE);

  if (surface.open) {
    await page.waitForFunction(() => globalThis.__syloraBooted === true);
    await expect(page.locator('.shell-wallet')).toHaveCount(1);
    await waitForStableVisualAssets(page);
    requireScreenshotBuffer(await page.screenshot(VISUAL_SCREENSHOT_OPTIONS), 'pre-open paint fence');
    await waitForCompositorFrames(page);
    await surface.open(page);
  }
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

async function waitForStableVisualAssets(page) {
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
      if (typeof image.decode === 'function') await image.decode();
      if (!image.naturalWidth) throw new Error(`Image failed to decode: ${image.currentSrc || image.src}`);
      if (
        new URL(image.currentSrc || image.src, location.href).pathname === '/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png' &&
        (image.naturalWidth !== 1100 || image.naturalHeight !== 650)
      ) throw new Error(`Canonical brand dimensions drifted: ${image.naturalWidth}x${image.naturalHeight}`);
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
        try {
          await image.decode?.();
          if (
            new URL(url).pathname === '/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png' &&
            (image.naturalWidth !== 1100 || image.naturalHeight !== 650)
          ) throw new Error(`Canonical background dimensions drifted: ${image.naturalWidth}x${image.naturalHeight}`);
          resolve();
        } catch (error) { reject(error); }
      };
      image.onerror = () => reject(new Error(`Background image failed to load: ${url}`));
      image.src = url;
    })));
    scrollTo(0, 0);
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
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

  await waitForStableVisualAssets(page);
}

function screenshotDigest(png) {
  return createHash('sha256').update(png).digest('hex');
}

function requireScreenshotBuffer(png, label) {
  if (!Buffer.isBuffer(png) || png.length === 0) {
    throw new Error(`${label} did not return a non-empty PNG buffer`);
  }
  return png;
}

async function waitForCompositorFrames(page) {
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
}

async function assertVisualScrollOrigin(page) {
  const position = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
  if (position.x !== 0 || position.y !== 0) {
    throw new Error(`Visual paint coordinates require scroll origin 0,0; observed ${position.x},${position.y}`);
  }
}

async function takeCheckedScreenshot(page, options, label, assertClean) {
  const png = requireScreenshotBuffer(await page.screenshot(options), label);
  await assertClean(label);
  return png;
}

async function canonicalElementClip(page, target) {
  const box = await target.boundingBox();
  const viewport = page.viewportSize();
  if (!box || !viewport) return null;
  const x = Math.max(0, Math.floor(box.x));
  const y = Math.max(0, Math.floor(box.y));
  const right = Math.min(viewport.width, Math.ceil(box.x + box.width));
  const bottom = Math.min(viewport.height, Math.ceil(box.y + box.height));
  if (right <= x || bottom <= y) return null;
  return { x, y, width: right - x, height: bottom - y };
}

async function restoreInlineStyle(target, originalStyle) {
  await target.evaluate((element, style) => {
    if (style === null) element.removeAttribute('style');
    else element.setAttribute('style', style);
  }, originalStyle);
  const restored = await target.getAttribute('style');
  if (restored !== originalStyle) {
    throw new Error('Canonical paint sentinel failed to restore the exact inline style');
  }
}

async function rawScreenshotCropDigests(page, png, clips) {
  const encoded = png.toString('base64');
  return page.evaluate(async ({ encodedPng, cropList }) => {
    const binary = atob(encodedPng);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    try {
      return await Promise.all(cropList.map(async clip => {
        if (
          !Number.isInteger(clip.x) || !Number.isInteger(clip.y) ||
          !Number.isInteger(clip.width) || !Number.isInteger(clip.height) ||
          clip.x < 0 || clip.y < 0 || clip.width <= 0 || clip.height <= 0 ||
          clip.x + clip.width > bitmap.width || clip.y + clip.height > bitmap.height
        ) throw new Error('Visual paint crop is outside the screenshot raster');
        const canvas = document.createElement('canvas');
        canvas.width = clip.width;
        canvas.height = clip.height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Visual paint crop could not create a 2D context');
        context.drawImage(
          bitmap,
          clip.x, clip.y, clip.width, clip.height,
          0, 0, clip.width, clip.height
        );
        const pixels = context.getImageData(0, 0, clip.width, clip.height).data;
        let luminanceSum = 0;
        let luminanceSquareSum = 0;
        const pixelCount = pixels.length / 4;
        for (let offset = 0; offset < pixels.length; offset += 4) {
          const luminance = (0.2126 * pixels[offset] + 0.7152 * pixels[offset + 1] + 0.0722 * pixels[offset + 2]) / 255;
          luminanceSum += luminance;
          luminanceSquareSum += luminance * luminance;
        }
        const mean = luminanceSum / pixelCount;
        const contrast = Math.sqrt(Math.max(0, luminanceSquareSum / pixelCount - mean * mean));
        const digest = await crypto.subtle.digest('SHA-256', pixels);
        return {
          sha256: [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join(''),
          contrast
        };
      }));
    } finally {
      bitmap.close?.();
    }
  }, { encodedPng: encoded, cropList: clips });
}

async function rawClipScreenshotEvidence(page, png, clip) {
  return (await rawScreenshotCropDigests(page, png, [{ x: 0, y: 0, width: clip.width, height: clip.height }]))[0];
}

async function collectCanonicalPaintTargets(page) {
  const targets = [];
  const images = page.locator(CANONICAL_BRAND_IMAGE_SELECTOR);
  const imageCount = await images.count();
  let canonicalImagesChecked = 0;
  for (let index = 0; index < imageCount; index += 1) {
    const target = images.nth(index);
    if (!await target.isVisible()) continue;
    const clip = await canonicalElementClip(page, target);
    if (!clip) continue;
    const role = await target.evaluate(element => element.closest('.brand') ? 'header' : 'wallet');
    targets.push({ target, clip, role, hideProperty: 'visibility', minimumContrast: CANONICAL_IMAGE_MIN_CONTRAST });
    canonicalImagesChecked += 1;
  }
  if (canonicalImagesChecked === 0) {
    throw new Error('Canonical paint sentinel found no visible production brand image');
  }

  const backgrounds = page.locator(CANONICAL_BRAND_BACKGROUND_SELECTOR);
  const backgroundCount = await backgrounds.count();
  let canonicalBackgroundsChecked = 0;
  for (let index = 0; index < backgroundCount; index += 1) {
    const target = backgrounds.nth(index);
    if (!await target.isVisible()) continue;
    const usesCanonicalBrand = await target.evaluate((element, canonicalUrl) =>
      getComputedStyle(element).backgroundImage.includes(canonicalUrl), CANONICAL_BRAND_URL
    );
    if (!usesCanonicalBrand) {
      throw new Error('Canonical presence background selector no longer resolves to the locked brand asset');
    }
    const clip = await canonicalElementClip(page, target);
    if (!clip) continue;
    targets.push({
      target,
      clip,
      role: 'presence-background',
      hideProperty: 'background-image',
      minimumContrast: CANONICAL_BACKGROUND_MIN_CONTRAST
    });
    canonicalBackgroundsChecked += 1;
  }
  return { targets, canonicalImagesChecked, canonicalBackgroundsChecked };
}

export async function captureStableVisualScreenshot(page, { assertClean } = {}) {
  if (typeof assertClean !== 'function') {
    throw new Error('Stable visual capture requires a diagnostics assertion callback');
  }

  const { targets, canonicalImagesChecked, canonicalBackgroundsChecked } = await collectCanonicalPaintTargets(page);
  await assertVisualScrollOrigin(page);
  await waitForCompositorFrames(page);
  const first = await takeCheckedScreenshot(
    page,
    { ...VISUAL_SCREENSHOT_OPTIONS, fullPage: true },
    'full-page-stability-first',
    assertClean
  );
  await assertVisualScrollOrigin(page);
  const fullPageCropDigests = await rawScreenshotCropDigests(page, first, targets.map(({ clip }) => clip));
  await assertClean('full-page-stability-first-raster');

  for (let index = 0; index < targets.length; index += 1) {
    await assertVisualScrollOrigin(page);
    const { target, clip, role, hideProperty, minimumContrast } = targets[index];
    const originalStyle = await target.getAttribute('style');
    const fullPageCropEvidence = fullPageCropDigests[index];
    if (!Number.isFinite(fullPageCropEvidence.contrast) || fullPageCropEvidence.contrast < minimumContrast) {
      throw new Error(
        `Canonical ${role} content contrast is below the locked paint threshold: observed=${fullPageCropEvidence.contrast} minimum=${minimumContrast}`
      );
    }
    const visibleBefore = await takeCheckedScreenshot(
      page,
      { ...VISUAL_SCREENSHOT_OPTIONS, clip },
      `canonical-${role}-visible-before`,
      assertClean
    );
    const visibleBeforeEvidence = await rawClipScreenshotEvidence(page, visibleBefore, clip);
    if (visibleBeforeEvidence.sha256 !== fullPageCropEvidence.sha256) {
      throw new Error(
        `Canonical ${role} full-page crop did not match its visible raster: full=${fullPageCropEvidence.sha256} clip=${visibleBeforeEvidence.sha256}`
      );
    }

    let hiddenFirst;
    let hiddenSecond;
    try {
      await target.evaluate((element, property) => {
        element.style.setProperty(property, property === 'visibility' ? 'hidden' : 'none', 'important');
      }, hideProperty);
      await waitForCompositorFrames(page);
      hiddenFirst = await takeCheckedScreenshot(
        page,
        { ...VISUAL_SCREENSHOT_OPTIONS, clip },
        `canonical-${role}-hidden-first`,
        assertClean
      );
      await waitForCompositorFrames(page);
      hiddenSecond = await takeCheckedScreenshot(
        page,
        { ...VISUAL_SCREENSHOT_OPTIONS, clip },
        `canonical-${role}-hidden-second`,
        assertClean
      );
    } finally {
      await restoreInlineStyle(target, originalStyle);
      await waitForCompositorFrames(page);
    }

    const hiddenFirstEvidence = await rawClipScreenshotEvidence(page, hiddenFirst, clip);
    const hiddenSecondEvidence = await rawClipScreenshotEvidence(page, hiddenSecond, clip);
    const visibleAfter = await takeCheckedScreenshot(
      page,
      { ...VISUAL_SCREENSHOT_OPTIONS, clip },
      `canonical-${role}-visible-after`,
      assertClean
    );
    const visibleAfterEvidence = await rawClipScreenshotEvidence(page, visibleAfter, clip);
    if (hiddenFirstEvidence.sha256 !== hiddenSecondEvidence.sha256) {
      throw new Error(
        `Canonical ${role} hidden raster is not deterministic: first=${hiddenFirstEvidence.sha256} second=${hiddenSecondEvidence.sha256}`
      );
    }
    if (visibleBeforeEvidence.sha256 === hiddenSecondEvidence.sha256) {
      throw new Error(
        `Canonical ${role} paint sentinel saw no pixel contribution: sha256=${visibleBeforeEvidence.sha256}`
      );
    }
    if (visibleBeforeEvidence.sha256 !== visibleAfterEvidence.sha256) {
      throw new Error(
        `Canonical ${role} paint did not restore deterministically: before=${visibleBeforeEvidence.sha256} after=${visibleAfterEvidence.sha256}`
      );
    }
  }

  await waitForCompositorFrames(page);
  await assertVisualScrollOrigin(page);
  const second = await takeCheckedScreenshot(
    page,
    { ...VISUAL_SCREENSHOT_OPTIONS, fullPage: true },
    'full-page-stability-second',
    assertClean
  );
  if (!first.equals(second)) {
    throw new Error(
      `Full-page paint is not byte-stable: first=${screenshotDigest(first)} second=${screenshotDigest(second)}`
    );
  }

  return {
    png: second,
    paintStability: {
      canonicalImagesChecked,
      canonicalBackgroundsChecked,
      canonicalPixelContribution: true,
      canonicalContentContrast: true,
      canonicalRestoreMatch: true,
      hiddenScreenshotsCompared: 2,
      fullPageScreenshotsCompared: 2
    }
  };
}

export async function visualRuntimeMetadata(page, cdpTouchInput = null) {
  return page.evaluate(() => ({
    fontStatus: document.fonts?.status || 'unsupported',
    bodyFontFamily: getComputedStyle(document.body).fontFamily,
    imageCount: [...document.images].filter(image => image.currentSrc || image.src).length,
    viewport: { width: innerWidth, height: innerHeight },
    devicePixelRatio,
    locale: document.documentElement.lang,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    navigatorMaxTouchPoints: navigator.maxTouchPoints,
    primaryPointer: matchMedia('(pointer: coarse)').matches
      ? 'coarse'
      : matchMedia('(pointer: fine)').matches ? 'fine' : 'none',
    primaryHover: matchMedia('(hover: hover)').matches
      ? 'hover'
      : matchMedia('(hover: none)').matches ? 'none' : 'unknown'
  })).then(runtime => ({ ...runtime, cdpTouchInput }));
}
