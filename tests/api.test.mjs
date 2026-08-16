import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { hashPassword } from '../src/auth.mjs';

function seedAdmin(file, { email, username, password }) {
  const id = randomUUID(), now = new Date().toISOString();
  fs.writeFileSync(file, JSON.stringify({
    users: [{
      id, email, username, passwordHash: hashPassword(password), displayName: username,
      bio: '', locale: 'uk', avatar: '', role: 'admin', status: 'active', createdAt: now, updatedAt: now
    }],
    wallets: [{ userId: id, balance: 10000, earnings: 0, currency: 'LUMEN' }]
  }));
}

test('auth → post → gift → ledger works end to end', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-api-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  seedAdmin(process.env.SYLORA_DATA_FILE, {
    email: 'alice@test.dev', username: 'alice', password: 'password123'
  });
  process.env.SYLORA_ICE_SERVERS_JSON = JSON.stringify([{ urls: 'stun:stun.test.invalid:3478' }, { urls: 'turn:turn.test.invalid:3478', username: 'test-user', credential: 'test-credential' }]);
  const turnSharedSecret = 'test-only-shared-secret-0123456789abcdef';
  process.env.SYLORA_TURN_SHARED_SECRET = turnSharedSecret;
  process.env.SYLORA_TURN_TTL_SECONDS = '600';
  const { server } = await import(`../src/server.mjs?test=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const base = `http://127.0.0.1:${address.port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
    const json = await response.json();
    assert.equal(response.ok, true, JSON.stringify(json));
    return json;
  };
  try {
    const health = await call('/api/health');
    assert.equal(health.status, 'ok');
    assert.equal(health.persistence, 'json-test-runtime');
    assert.equal(health.dependencies.postgres.configured, false);
    assert.equal(health.dependencies.redis.configured, false);
    assert.equal((await call('/api/ready')).ready, true);
    const unauthRtc = await fetch(`${base}/api/live/rtc-config`);
    assert.equal(unauthRtc.status, 401);
    const alice = await call('/api/auth/login', { method: 'POST', body: JSON.stringify({ identity: 'alice@test.dev', password: 'password123' }) });
    const bob = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'bob@test.dev', username: 'bob', password: 'password123' }) });
    const auth = { authorization: `Bearer ${alice.token}` };
    const rtcConfig = await call('/api/live/rtc-config', { headers: auth });
    assert.equal(rtcConfig.iceServers.length, 2);
    assert.equal(rtcConfig.turnConfigured, true);
    assert.equal(rtcConfig.turnAuthMode, 'shared_secret');
    assert.equal(rtcConfig.credentialTtlSeconds, 600);
    const hasTurnUrl = server => [server.urls].flat().some(url => /^turns?:/i.test(String(url)));
    const issuedTurn = rtcConfig.iceServers.find(hasTurnUrl);
    assert.ok(issuedTurn, 'live RTC config should include a TURN server');
    assert.equal(issuedTurn.username.endsWith(`:${alice.user.id}`), true);
    assert.equal(
      issuedTurn.credential,
      createHmac('sha1', turnSharedSecret).update(issuedTurn.username).digest('base64')
    );
    assert.equal(Date.parse(rtcConfig.credentialExpiresAt) > Date.now(), true);
    assert.equal(JSON.stringify(rtcConfig).includes(turnSharedSecret), false);
    const callsRtcConfig = await call('/api/calls/rtc-config', { headers: auth });
    assert.equal(callsRtcConfig.turnAuthMode, 'shared_secret');
    const callsTurn = callsRtcConfig.iceServers.find(hasTurnUrl);
    assert.ok(callsTurn, 'calls RTC config should include a TURN server');
    assert.equal(callsTurn.username.endsWith(`:${alice.user.id}`), true);
    assert.equal(
      callsTurn.credential,
      createHmac('sha1', turnSharedSecret).update(callsTurn.username).digest('base64')
    );
    const persistedAuth = JSON.parse(fs.readFileSync(process.env.SYLORA_DATA_FILE, 'utf8'));
    assert.equal(persistedAuth.sessions.every(s => !('token' in s) && typeof s.tokenHash === 'string' && s.tokenHash.length === 64), true);
    assert.equal(alice.user.role, 'admin');
    const aiHistory = await call('/api/ai/history', { headers: auth });
    assert.equal(aiHistory.configured, false);
    const aiUnavailable = await fetch(`${base}/api/ai/chat`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ text: 'hello' }) });
    assert.equal(aiUnavailable.status, 503);
    assert.equal((await aiUnavailable.json()).error, 'AI_PROVIDER_NOT_CONFIGURED');
    const memory = await call('/api/ai/memory', { method: 'POST', headers: auth, body: JSON.stringify({ label: 'Language', value: 'Ukrainian' }) });
    const remembered = await call('/api/ai/history', { headers: auth });
    assert.equal(remembered.memories.some(m => m.id === memory.memory.id && m.value === 'Ukrainian'), true);
    await call(`/api/ai/memory/${memory.memory.id}`, { method: 'DELETE', headers: auth });
    assert.equal((await call('/api/ai/history', { headers: auth })).memories.length, 0);
    const publicUsers = await call('/api/users', { headers: auth });
    assert.equal('email' in publicUsers.users[0], false);
    const scene = await call('/api/studio/scenes', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Main Live', overlayTitle: 'SYLORA NOW', overlayStyle: 'cyan', profileId: 'vertical1080p60', micGain: 118, micMuted: true }) });
    assert.equal(scene.scene.overlayStyle, 'cyan');
    assert.equal(scene.scene.profileId, 'vertical1080p60');
    assert.equal(scene.scene.micGain, 118);
    assert.equal(scene.scene.micMuted, true);
    const updatedScene = await call(`/api/studio/scenes/${scene.scene.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ name: 'Main Live 2', overlayTitle: 'SYLORA PRIME', overlayStyle: 'clean', profileId: 'horizontal1080', micGain: 75, micMuted: false }) });
    assert.equal(updatedScene.scene.name, 'Main Live 2');
    assert.equal(updatedScene.scene.profileId, 'horizontal1080');
    assert.equal(updatedScene.scene.micGain, 75);
    const scenes = await call('/api/studio/scenes', { headers: auth });
    assert.equal(scenes.scenes[0].name, 'Main Live 2');
    const post = await call('/api/posts', { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Real vertical slice' }) });
    assert.equal(post.post.text, 'Real vertical slice');
    const community = await call('/api/communities', { method: 'POST', headers: auth, body: JSON.stringify({ name: 'SYLORA Founders', description: 'Build together' }) });
    const communityDetail = await call(`/api/communities/${community.community.id}`, { headers: auth });
    assert.equal(communityDetail.channels[0].name, 'general');
    const ideasChannel = await call(`/api/communities/${community.community.id}/channels`, { method: 'POST', headers: auth, body: JSON.stringify({ name: 'Ideas' }) });
    const bobAuth = { authorization: `Bearer ${bob.token}` };
    await call(`/api/communities/${community.community.id}/join`, { method: 'POST', headers: bobAuth, body: '{}' });
    await call(`/api/community-channels/${ideasChannel.channel.id}/posts`, { method: 'POST', headers: bobAuth, body: JSON.stringify({ text: 'Hello founders' }) });
    const channelPosts = await call(`/api/community-channels/${ideasChannel.channel.id}/posts`, { headers: bobAuth });
    assert.equal(channelPosts.posts[0].text, 'Hello founders');
    assert.equal(channelPosts.posts[0].author.username, 'bob');
    const course = await call('/api/courses', { method: 'POST', headers: auth, body: JSON.stringify({ title: 'SYLORA Academy', description: 'Creator foundations', price: 0 }) });
    const lessonOne = await call(`/api/courses/${course.course.id}/lessons`, { method: 'POST', headers: auth, body: JSON.stringify({ title: 'Start', content: 'First lesson content' }) });
    await call(`/api/courses/${course.course.id}/lessons`, { method: 'POST', headers: auth, body: JSON.stringify({ title: 'Grow', content: 'Second lesson content' }) });
    await call(`/api/courses/${course.course.id}/publish`, { method: 'POST', headers: auth, body: '{}' });
    await call(`/api/courses/${course.course.id}/enroll`, { method: 'POST', headers: bobAuth, body: '{}' });
    const enrolledCourse = await call(`/api/courses/${course.course.id}`, { headers: bobAuth });
    assert.equal(enrolledCourse.locked, false);
    assert.equal(enrolledCourse.lessons[0].content, 'First lesson content');
    const lessonProgress = await call(`/api/lessons/${lessonOne.lesson.id}/progress`, { method: 'POST', headers: bobAuth, body: '{}' });
    assert.equal(lessonProgress.courseProgress, 0.5);
    const progressedCourse = await call(`/api/courses/${course.course.id}`, { headers: bobAuth });
    assert.equal(progressedCourse.enrollment.progress, 0.5);
    assert.equal(progressedCourse.lessons[0].completed, true);
    const gift = await call('/api/gifts/send', { method: 'POST', headers: auth, body: JSON.stringify({ giftId: 'pulse', recipientId: bob.user.id }) });
    assert.equal(gift.balance, 9975);
    assert.equal(gift.event.creatorAmount, 17);
    assert.equal(gift.event.platformAmount, 8);
    const bobMe = await call('/api/me', { headers: { authorization: `Bearer ${bob.token}` } });
    assert.equal(bobMe.wallet.earnings, 17);
    const ledger = await call('/api/ledger', { headers: auth });
    assert.equal(ledger.entries[0].giftId, 'pulse');
    assert.equal(ledger.entries[0].amount, 25);
    const conversation = await call('/api/conversations', { method: 'POST', headers: auth, body: JSON.stringify({ userId: bob.user.id }) });
    const dmAbort = new AbortController();
    const dmEventsResponse = await fetch(`${base}/api/events`, { headers: { authorization: `Bearer ${bob.token}` }, signal: dmAbort.signal });
    assert.equal(dmEventsResponse.status, 200);
    const dmReader = dmEventsResponse.body.getReader(), dmDecoder = new TextDecoder(); let dmEvents = '';
    await call(`/api/conversations/${conversation.conversation.id}/messages`, { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Realtime DM' }) });
    for (let i = 0; i < 6 && !dmEvents.includes('event: message'); i++) {
      const chunk = await Promise.race([dmReader.read(), new Promise((_, reject) => setTimeout(() => reject(new Error('DM SSE timeout')), 1500))]);
      if (chunk.done) break; dmEvents += dmDecoder.decode(chunk.value);
    }
    dmAbort.abort();
    assert.match(dmEvents, /event: message/);
    assert.match(dmEvents, /Realtime DM/);
    const sample = path.join(dir, 'sample.mp4');
    execFileSync('ffmpeg', ['-loglevel','error','-f','lavfi','-i','color=c=blue:s=64x96:d=0.4','-pix_fmt','yuv420p','-y',sample]);
    const uploadResponse = await fetch(`${base}/api/media/upload`, { method: 'POST', headers: { ...auth, 'content-type': 'video/mp4' }, body: fs.readFileSync(sample) });
    assert.equal(uploadResponse.status, 201);
    const upload = await uploadResponse.json();
    assert.equal(upload.media.width, 64);
    assert.equal(upload.media.height, 96);
    const video = await call('/api/videos', { method: 'POST', headers: auth, body: JSON.stringify({ mediaId: upload.media.id, title: 'Blue Clip', format: 'clip' }) });
    assert.equal(video.video.format, 'clip');
    const range = await fetch(`${base}${upload.media.url}`, { headers: { range: 'bytes=0-31' } });
    assert.equal(range.status, 206);
    assert.equal((await range.arrayBuffer()).byteLength, 32);
    const transcode = await call(`/api/media/${upload.media.id}/transcode`, { method: 'POST', headers: auth, body: '{}' });
    let mediaJob = transcode.job;
    for (let i = 0; i < 40 && !['ready','failed'].includes(mediaJob.status); i++) {
      await new Promise(resolve => setTimeout(resolve, 50));
      mediaJob = (await call(`/api/media/jobs/${mediaJob.id}`, { headers: auth })).job;
    }
    assert.equal(mediaJob.status, 'ready', mediaJob.error || 'transcode did not finish');
    const playlistResponse = await fetch(`${base}${mediaJob.playlistUrl}`);
    assert.equal(playlistResponse.status, 200);
    assert.match(await playlistResponse.text(), /#EXTM3U/);
    const live = await call('/api/live', { method: 'POST', headers: auth, body: JSON.stringify({ title: 'Realtime test' }) });
    const browserSourceDenied = await fetch(`${base}/api/studio/browser-source`, { method: 'POST', headers: { ...bobAuth, 'content-type': 'application/json' }, body: JSON.stringify({ liveId: live.live.id }) });
    assert.equal(browserSourceDenied.status, 404);
    const browserSource = await call('/api/studio/browser-source', { method: 'POST', headers: auth, body: JSON.stringify({ liveId: live.live.id }) });
    assert.match(browserSource.path, /^\/obs-overlay\.html\?token=/);
    assert.equal(new Date(browserSource.expiresAt).getTime() > Date.now(), true);
    const invalidOverlay = await fetch(`${base}/api/studio/browser-source/events?token=invalid-token`);
    assert.equal(invalidOverlay.status, 401);
    const browserToken = new URL(browserSource.path, base).searchParams.get('token');
    const overlayAbort = new AbortController();
    const overlayEvents = await fetch(`${base}/api/studio/browser-source/events?token=${encodeURIComponent(browserToken)}`, { signal: overlayAbort.signal });
    assert.equal(overlayEvents.status, 200);
    assert.match(overlayEvents.headers.get('content-type'), /text\/event-stream/);
    overlayAbort.abort();
    const abort = new AbortController();
    const eventResponse = await fetch(`${base}/api/live/${live.live.id}/events`, { signal: abort.signal });
    assert.equal(eventResponse.status, 200);
    const reader = eventResponse.body.getReader(), decoder = new TextDecoder(); let events = '';
    const listedWithViewer = await call('/api/live');
    assert.equal(listedWithViewer.rooms.find(room => room.id === live.live.id).viewerCount, 1);
    const hostControlAbort = new AbortController();
    const hostControlEvents = await fetch(`${base}/api/live/${live.live.id}/events?control=host`, { signal: hostControlAbort.signal });
    assert.equal(hostControlEvents.status, 200);
    const listedWithHostControl = await call('/api/live');
    assert.equal(listedWithHostControl.rooms.find(room => room.id === live.live.id).viewerCount, 1);
    hostControlAbort.abort();
    await call(`/api/live/${live.live.id}/chat`, { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Realtime hello' }) });
    for (let i = 0; i < 5 && !events.includes('event: chat'); i++) {
      const chunk = await Promise.race([reader.read(), new Promise((_, reject) => setTimeout(() => reject(new Error('SSE timeout')), 1500))]);
      if (chunk.done) break; events += decoder.decode(chunk.value);
    }
    assert.match(events, /event: chat/);
    assert.match(events, /Realtime hello/);
    await call(`/api/live/${live.live.id}/signal`, { method: 'POST', headers: { authorization: `Bearer ${bob.token}` }, body: JSON.stringify({ kind: 'viewer-ready', fromPeerId: 'viewer-test-1', data: {} }) });
    let signalEvents = '';
    for (let i = 0; i < 5 && !signalEvents.includes('event: signal'); i++) {
      const chunk = await Promise.race([reader.read(), new Promise((_, reject) => setTimeout(() => reject(new Error('signal SSE timeout')), 1500))]);
      if (chunk.done) break; signalEvents += decoder.decode(chunk.value);
    }
    abort.abort();
    assert.match(signalEvents, /event: signal/);
    assert.match(signalEvents, /viewer-ready/);
    assert.match(signalEvents, /viewer-test-1/);
    const copilot = await call(`/api/live/${live.live.id}/copilot`, { headers: auth });
    assert.equal(copilot.ok, true);
    assert.equal(copilot.liveId, live.live.id);
    await call(`/api/live/${live.live.id}/signal`, { method: 'POST', headers: auth, body: JSON.stringify({ kind: 'host-ready', fromPeerId: 'host-test-1', data: { transport: 'p2p' } }) });
    const spoofedViewerPeer = await fetch(`${base}/api/live/${live.live.id}/signal`, { method: 'POST', headers: { ...auth, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'answer', fromPeerId: 'viewer-test-1', toPeerId: 'host-test-1', data: {} }) });
    assert.equal(spoofedViewerPeer.status, 403);
    await call(`/api/live/${live.live.id}/signal`, { method: 'POST', headers: { authorization: `Bearer ${bob.token}` }, body: JSON.stringify({ kind: 'viewer-left', fromPeerId: 'viewer-test-1', toPeerId: 'host-test-1' }) });
    const staleViewerPeer = await fetch(`${base}/api/live/${live.live.id}/signal`, { method: 'POST', headers: { authorization: `Bearer ${bob.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ kind: 'answer', fromPeerId: 'viewer-test-1', toPeerId: 'host-test-1', data: {} }) });
    assert.equal(staleViewerPeer.status, 403);
    const report = await call('/api/reports', { method: 'POST', headers: auth, body: JSON.stringify({ targetType: 'user', targetId: bob.user.id, reason: 'test report' }) });
    const moderation = await call('/api/admin/reports', { headers: auth });
    assert.equal(moderation.reports.some(r => r.id === report.report.id), true);
    await call(`/api/admin/reports/${report.report.id}`, { method: 'PATCH', headers: auth, body: JSON.stringify({ status: 'resolved', resolution: 'test complete' }) });
    const audit = await call('/api/admin/audit', { headers: auth });
    assert.equal(audit.entries[0].action, 'moderation.report.update');
    const bobPost = await call('/api/posts', { method: 'POST', headers: { authorization: `Bearer ${bob.token}` }, body: JSON.stringify({ text: 'Blocked post' }) });
    await call(`/api/users/${bob.user.id}/block`, { method: 'POST', headers: auth, body: '{}' });
    const filteredFeed = await call('/api/feed', { headers: auth });
    assert.equal(filteredFeed.posts.some(p => p.id === bobPost.post.id), false);
  } finally {
    delete process.env.SYLORA_TURN_SHARED_SECRET;
    delete process.env.SYLORA_TURN_TTL_SECONDS;
    await new Promise(resolve => server.close(resolve));
  }
});

test('SPA shell routes serve index.html for client views', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-spa-'));
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  const { server } = await import(`../src/server.mjs?spa=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const studio = await fetch(`${base}/studio`);
    assert.equal(studio.status, 200);
    assert.match(studio.headers.get('content-type'), /text\/html/);
    assert.match(await studio.text(), /<title>SYLORA<\/title>/);
    const missing = await fetch(`${base}/definitely-not-a-route`);
    assert.equal(missing.status, 404);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});

test('SYLORA AI keeps write tools behind explicit user confirmation', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-ai-'));
  let modelCalls = 0;
  const mockOpenAI = http.createServer(async (req, res) => {
    for await (const _ of req) { /* consume request */ }
    modelCalls += 1;
    res.writeHead(200, { 'content-type': 'application/json' });
    if (modelCalls === 1) {
      return res.end(JSON.stringify({ id: 'resp_tool', object: 'response', status: 'completed', model: 'gpt-5.6', output: [{ type: 'function_call', id: 'fc_post', call_id: 'call_post', name: 'propose_post', arguments: JSON.stringify({ text: 'AI approved draft' }) }] }));
    }
    return res.end(JSON.stringify({ id: 'resp_final', object: 'response', status: 'completed', model: 'gpt-5.6', output_text: 'Чернетка готова. Підтвердь публікацію в SYLORA.', output: [{ type: 'message', id: 'msg_final', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: 'Чернетка готова. Підтвердь публікацію в SYLORA.', annotations: [] }] }] }));
  });
  await new Promise(resolve => mockOpenAI.listen(0, '127.0.0.1', resolve));
  const mockAddress = mockOpenAI.address();
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'db.json');
  process.env.OPENAI_API_KEY = 'test-key-not-a-real-secret';
  process.env.OPENAI_BASE_URL = `http://127.0.0.1:${mockAddress.port}/v1`;
  const { server } = await import(`../src/server.mjs?ai-test=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(), base = `http://127.0.0.1:${address.port}`;
  const call = async (pathname, options = {}) => {
    const response = await fetch(`${base}${pathname}`, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
    const json = await response.json(); assert.equal(response.ok, true, JSON.stringify(json)); return json;
  };
  try {
    const user = await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email: 'agent@test.dev', username: 'agentuser', password: 'password123' }) });
    const auth = { authorization: `Bearer ${user.token}` };
    const answer = await call('/api/ai/chat', { method: 'POST', headers: auth, body: JSON.stringify({ text: 'Підготуй пост про запуск SYLORA' }) });
    assert.equal(answer.message, 'Чернетка готова. Підтвердь публікацію в SYLORA.');
    assert.equal(answer.pendingActions.length, 1);
    const before = await call('/api/feed', { headers: auth });
    assert.equal(before.posts.some(p => p.text === 'AI approved draft'), false);
    const confirmed = await call(`/api/ai/actions/${answer.pendingActions[0].id}/confirm`, { method: 'POST', headers: auth, body: '{}' });
    assert.equal(confirmed.action.status, 'completed');
    const after = await call('/api/feed', { headers: auth });
    assert.equal(after.posts.some(p => p.text === 'AI approved draft'), true);
    assert.equal(modelCalls, 2);
  } finally {
    delete process.env.OPENAI_API_KEY; delete process.env.OPENAI_BASE_URL;
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => mockOpenAI.close(resolve));
  }
});
