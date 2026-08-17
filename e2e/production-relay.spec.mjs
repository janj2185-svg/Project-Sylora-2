import { test, expect } from '@playwright/test';

const token = String(process.env.SYLORA_E2E_AUTH_TOKEN || '').trim();
test.skip(!token, 'SYLORA_E2E_AUTH_TOKEN is required for the read-only production relay probe.');

test('authenticated browser media flows through TURN with relay-only ICE', async ({ page, request }) => {
  const response = await request.get('/api/live/rtc-config', {
    headers: { authorization: `Bearer ${token}` }
  });
  const rtc = await response.json();
  expect(response.status(), JSON.stringify(rtc)).toBe(200);
  expect(rtc.turnConfigured).toBe(true);
  expect(rtc.turnAuthMode).toBe('shared_secret');
  expect(rtc.credentialExpiresAt).toBeTruthy();

  await page.goto('/');
  const result = await page.evaluate(async iceServers => {
    const left = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
    const right = new RTCPeerConnection({ iceServers, iceTransportPolicy: 'relay' });
    const pendingForLeft = [];
    const pendingForRight = [];
    let receivedStream = null;

    left.onicecandidate = event => {
      if (!event.candidate) return;
      if (right.remoteDescription) right.addIceCandidate(event.candidate).catch(() => {});
      else pendingForRight.push(event.candidate);
    };
    right.onicecandidate = event => {
      if (!event.candidate) return;
      if (left.remoteDescription) left.addIceCandidate(event.candidate).catch(() => {});
      else pendingForLeft.push(event.candidate);
    };
    right.ontrack = event => { receivedStream = event.streams[0]; };

    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d');
    let frame = 0;
    const draw = () => {
      context.fillStyle = `hsl(${frame++ % 360} 70% 45%)`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#fff';
      context.font = '700 32px system-ui';
      context.fillText('SYLORA TURN RELAY', 135, 190);
      requestAnimationFrame(draw);
    };
    draw();
    const stream = canvas.captureStream(15);
    left.addTrack(stream.getVideoTracks()[0], stream);

    const offer = await left.createOffer();
    await left.setLocalDescription(offer);
    await right.setRemoteDescription(offer);
    for (const candidate of pendingForRight.splice(0)) await right.addIceCandidate(candidate);
    const answer = await right.createAnswer();
    await right.setLocalDescription(answer);
    await left.setRemoteDescription(answer);
    for (const candidate of pendingForLeft.splice(0)) await left.addIceCandidate(candidate);

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      if (left.connectionState === 'connected'
          && right.connectionState === 'connected'
          && receivedStream?.getVideoTracks().length) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const selectedCandidate = async peer => {
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
      return {
        local: local?.candidateType || null,
        remote: remote?.candidateType || null,
        protocol: local?.protocol || null
      };
    };

    const result = {
      leftState: left.connectionState,
      rightState: right.connectionState,
      receivedVideoTracks: receivedStream?.getVideoTracks().length || 0,
      leftCandidate: await selectedCandidate(left),
      rightCandidate: await selectedCandidate(right)
    };
    left.close();
    right.close();
    stream.getTracks().forEach(track => track.stop());
    return result;
  }, rtc.iceServers);

  expect(result.leftState).toBe('connected');
  expect(result.rightState).toBe('connected');
  expect(result.receivedVideoTracks).toBe(1);
  expect(result.leftCandidate.local).toBe('relay');
  expect(result.rightCandidate.local).toBe('relay');
});
