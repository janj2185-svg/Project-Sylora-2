import { randomUUID } from 'node:crypto';
import { expect } from '@playwright/test';

export function uniqueAccount(prefix = 'user') {
  const suffix = `${Date.now().toString(36)}${randomUUID().slice(0, 5)}`.toLowerCase();
  const username = `e2e_${prefix}_${suffix}`.slice(0, 30);
  return {
    username,
    email: `${username}@example.test`,
    password: `E2e!${randomUUID()}Aa9`
  };
}

export async function registerViaUi(page, account) {
  await page.goto('/');
  await page.locator('#signin').click();
  await page.locator('#authForm [name="username"]').fill(account.username);
  await page.locator('#authForm [name="email"]').fill(account.email);
  await page.locator('#authForm [name="password"]').fill(account.password);
  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/register') && response.request().method() === 'POST'
  );
  await page.locator('#authForm button.primary').click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(201);
  await expect(page.locator('#signin')).toBeHidden();
  await expect(page.locator('#composer')).toBeVisible();
  const token = await page.evaluate(() => localStorage.getItem('sylora_token'));
  expect(token).toBeTruthy();
  return token;
}

export async function loginViaUi(page, account) {
  await page.locator('#signin').click();
  await page.locator('#loginTab').click();
  await page.locator('#authForm [name="identity"]').fill(account.email);
  await page.locator('#authForm [name="password"]').fill(account.password);
  const responsePromise = page.waitForResponse(response =>
    response.url().endsWith('/api/auth/login') && response.request().method() === 'POST'
  );
  await page.locator('#authForm button.primary').click();
  const response = await responsePromise;
  expect(response.status(), await response.text()).toBe(200);
  await expect(page.locator('#signin')).toBeHidden();
  await expect(page.locator('#composer')).toBeVisible();
  return page.evaluate(() => localStorage.getItem('sylora_token'));
}

export async function authFetch(page, path, options = {}) {
  return page.evaluate(async ({ path, options }) => {
    const token = localStorage.getItem('sylora_token');
    const response = await fetch(path, {
      ...options,
      headers: {
        ...(options.headers || {}),
        authorization: `Bearer ${token}`,
        ...(options.body ? { 'content-type': 'application/json' } : {})
      }
    });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    return { status: response.status, body };
  }, { path, options });
}

export async function installSyntheticMediaAndPeerCapture(context, { forceRelay = false } = {}) {
  await context.addInitScript(({ forceRelay }) => {
    window.__syloraE2ePeers = [];
    window.__syloraE2eMedia = [];

    const NativePeerConnection = window.RTCPeerConnection;
    if (NativePeerConnection) {
      class CapturedPeerConnection extends NativePeerConnection {
        constructor(configuration = {}) {
          super({
            ...configuration,
            ...(forceRelay ? { iceTransportPolicy: 'relay' } : {})
          });
          window.__syloraE2ePeers.push(this);
        }
      }
      Object.defineProperty(window, 'RTCPeerConnection', {
        configurable: true,
        writable: true,
        value: CapturedPeerConnection
      });
    }

    const mediaDevices = navigator.mediaDevices;
    if (!mediaDevices) return;
    Object.defineProperty(mediaDevices, 'getUserMedia', {
      configurable: true,
      value: async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 360;
        const context = canvas.getContext('2d');
        let frame = 0;
        const draw = () => {
          const hue = frame++ % 360;
          context.fillStyle = `hsl(${hue} 70% 45%)`;
          context.fillRect(0, 0, canvas.width, canvas.height);
          context.fillStyle = '#fff';
          context.font = '700 32px system-ui';
          context.fillText('SYLORA E2E LIVE', 150, 190);
          requestAnimationFrame(draw);
        };
        draw();
        const stream = canvas.captureStream(15);
        window.__syloraE2eMedia.push({ canvas, stream });
        return stream;
      }
    });
  }, { forceRelay });
}

export async function peerDiagnostics(page) {
  return page.evaluate(async () => {
    const diagnostics = [];
    for (const peer of window.__syloraE2ePeers || []) {
      const stats = await peer.getStats();
      let pair = null;
      for (const report of stats.values()) {
        if (report.type === 'transport' && report.selectedCandidatePairId) {
          pair = stats.get(report.selectedCandidatePairId) || pair;
        }
        if (!pair && report.type === 'candidate-pair' && report.nominated && report.state === 'succeeded') {
          pair = report;
        }
      }
      const local = pair?.localCandidateId ? stats.get(pair.localCandidateId) : null;
      const remote = pair?.remoteCandidateId ? stats.get(pair.remoteCandidateId) : null;
      diagnostics.push({
        connectionState: peer.connectionState,
        iceConnectionState: peer.iceConnectionState,
        signalingState: peer.signalingState,
        localCandidateType: local?.candidateType || null,
        remoteCandidateType: remote?.candidateType || null,
        protocol: local?.protocol || null
      });
    }
    return diagnostics;
  });
}

export async function waitForConnectedPeer(page) {
  await expect.poll(async () => {
    const diagnostics = await peerDiagnostics(page);
    return diagnostics.some(peer => peer.connectionState === 'connected');
  }, { timeout: 30_000 }).toBe(true);
}

export async function expectNoHorizontalOverflow(page) {
  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const intentionallyScrollable = element => {
      for (let parent = element; parent && parent !== document.body; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (['auto', 'scroll'].includes(style.overflowX) && parent.scrollWidth > parent.clientWidth + 1) {
          return true;
        }
        if (['hidden', 'clip'].includes(style.overflowX)) return true;
      }
      return false;
    };
    const selectorFor = element => {
      if (element.id) return `#${element.id}`;
      const classes = [...element.classList].slice(0, 3).join('.');
      return `${element.tagName.toLowerCase()}${classes ? `.${classes}` : ''}`;
    };
    const offenders = [...document.body.querySelectorAll('*')].flatMap(element => {
      const style = getComputedStyle(element);
      if (style.display === 'none' || style.visibility === 'hidden') return [];
      if (element.matches('.aurora, .sky-grid, #gift-stage')) return [];
      if (style.position === 'fixed' && style.pointerEvents === 'none') return [];
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return [];
      if (rect.left >= -1 && rect.right <= viewport + 1) return [];
      if (intentionallyScrollable(element)) return [];
      return [{ selector: selectorFor(element), left: Math.round(rect.left), right: Math.round(rect.right) }];
    }).slice(0, 12);
    return {
      viewport,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      offenders
    };
  });
  expect(
    Math.max(overflow.documentScrollWidth, overflow.bodyScrollWidth) - overflow.viewport,
    JSON.stringify(overflow)
  ).toBeLessThanOrEqual(1);
  expect(overflow.offenders, JSON.stringify(overflow)).toEqual([]);
}
