import { test, expect } from '@playwright/test';
import {
  authFetch,
  installSyntheticMediaAndPeerCapture,
  peerDiagnostics,
  registerViaUi,
  uniqueAccount,
  waitForConnectedPeer
} from './helpers.mjs';

test.skip(process.env.SYLORA_E2E_WEBRTC !== '1', 'Set SYLORA_E2E_WEBRTC=1 to run the two-browser LIVE acceptance test.');

test('host Studio canvas reaches an authenticated viewer through real WebRTC signaling', async ({ browser, baseURL }) => {
  const forceRelay = process.env.SYLORA_E2E_REQUIRE_RELAY === '1';
  const hostContext = await browser.newContext({ baseURL, viewport: { width: 1366, height: 900 } });
  const viewerContext = await browser.newContext({ baseURL, viewport: { width: 390, height: 844 } });
  await installSyntheticMediaAndPeerCapture(hostContext, { forceRelay });
  await installSyntheticMediaAndPeerCapture(viewerContext, { forceRelay });

  const host = await hostContext.newPage();
  const viewer = await viewerContext.newPage();
  let liveId = null;

  try {
    await registerViaUi(host, uniqueAccount('host'));
    await registerViaUi(viewer, uniqueAccount('viewer'));

    const hostRtc = await authFetch(host, '/api/live/rtc-config');
    const viewerRtc = await authFetch(viewer, '/api/live/rtc-config');
    for (const rtc of [hostRtc, viewerRtc]) {
      expect(rtc.status).toBe(200);
      expect(rtc.body.turnConfigured).toBe(true);
      expect(rtc.body.turnAuthMode).toBe('shared_secret');
      expect(rtc.body.credentialExpiresAt).toBeTruthy();
      expect(rtc.body.iceServers.some(server =>
        (Array.isArray(server.urls) ? server.urls : [server.urls]).some(url => String(url).startsWith('turn:'))
      )).toBe(true);
    }

    const title = `SYLORA E2E ${Date.now()}`;
    await host.locator('button[data-view="live"]').first().click();
    await host.locator('[data-live-tab="create"]').click();
    await host.locator('#liveTitle').fill(title);
    const createResponsePromise = host.waitForResponse(response =>
      response.url().endsWith('/api/live') && response.request().method() === 'POST'
    );
    await host.locator('#goLive').click();
    const createResponse = await createResponsePromise;
    const createBody = await createResponse.json();
    expect(createResponse.status(), JSON.stringify(createBody)).toBe(201);
    liveId = createBody.live.id;

    await host.locator('button[data-view="studio"]').first().click();
    await expect(host.locator(`#studioLiveRoom option[value="${liveId}"]`)).toHaveCount(1);
    await host.locator('#studioLiveRoom').selectOption(liveId);
    await host.locator('#cameraBtn').click();
    await expect(host.locator('#recordStatus')).toContainText('Камера + мікрофон');
    await host.locator('#broadcastBtn').click();
    await expect(host.locator('#broadcastStatus')).toContainText('LIVE WEBRTC');

    await viewer.locator('.mobile-dock button[data-view="live"]').click();
    const watchButton = viewer.locator(`.watch-live[data-id="${liveId}"]`);
    await expect(watchButton).toBeVisible();
    await watchButton.click();

    await waitForConnectedPeer(host);
    await waitForConnectedPeer(viewer);
    await expect.poll(() => viewer.locator('#liveVideo').evaluate(video =>
      video.readyState >= 2
        && video.videoWidth > 0
        && (video.srcObject?.getVideoTracks?.().length || 0) === 1
    ), { timeout: 30_000 }).toBe(true);

    const hostPeers = (await peerDiagnostics(host)).filter(peer => peer.connectionState === 'connected');
    const viewerPeers = (await peerDiagnostics(viewer)).filter(peer => peer.connectionState === 'connected');
    expect(hostPeers).toHaveLength(1);
    expect(viewerPeers).toHaveLength(1);
    if (forceRelay) {
      expect(hostPeers[0].localCandidateType).toBe('relay');
      expect(viewerPeers[0].localCandidateType).toBe('relay');
    }
  } finally {
    if (liveId) await authFetch(host, `/api/live/${liveId}/end`, { method: 'POST', body: '{}' }).catch(() => {});
    await Promise.all([hostContext.close(), viewerContext.close()]);
  }
});
