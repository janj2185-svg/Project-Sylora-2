/** Seed a rich demo dataset for visual QA screenshots. */
const BASE = process.env.SYLORA_BASE || 'http://127.0.0.1:8787';

async function req(path, { method = 'GET', token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body == null ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${data.error || JSON.stringify(data)}`);
  return data;
}

async function register(username, email, password) {
  try {
    return await req('/api/auth/register', { method: 'POST', body: { username, email, password } });
  } catch {
    return req('/api/auth/login', { method: 'POST', body: { identity: email, password } });
  }
}

async function main() {
  const a = await register('demohost', 'demo@sylora.test', 'Password123!');
  const b = await register('demopeer', 'peer@sylora.test', 'Password123!');
  const tA = a.token;
  const tB = b.token;
  const meA = (await req('/api/me', { token: tA })).user;
  const meB = (await req('/api/me', { token: tB })).user;
  console.log('users', meA.username, meA.role, meB.username);

  await req('/api/me', { method: 'PATCH', token: tA, body: { displayName: 'Demo Host', bio: 'SYLORA visual QA host', locale: 'uk' } });
  await req('/api/me', { method: 'PATCH', token: tB, body: { displayName: 'Demo Peer', bio: 'Co-host & chat peer', locale: 'en' } });

  await req('/api/posts', { method: 'POST', token: tA, body: { text: 'Welcome to SYLORA — Home pulse for visual QA.' } }).catch(() => {});
  await req('/api/posts', { method: 'POST', token: tB, body: { text: 'Peer post · Discover & Inbox test content.' } }).catch(() => {});

  // End any leftover LIVE rooms so Discover is not duplicated across reseed runs.
  const existing = await req('/api/live');
  for (const room of existing.rooms || []) {
    const tok = room.host?.id === meA.id ? tA : room.host?.id === meB.id ? tB : null;
    if (!tok) continue;
    await req(`/api/live/${room.id}/end`, { method: 'POST', token: tok, body: {} }).catch(() => {});
  }

  const liveA = await req('/api/live', { method: 'POST', token: tA, body: { title: 'Resonance Night · Demo LIVE' } });
  const liveB = await req('/api/live', { method: 'POST', token: tB, body: { title: 'Peer Stage · Challenge Arena' } });
  console.log('lives', liveA.live?.id || liveA.room?.id, liveB.live?.id || liveB.room?.id);
  const liveAId = liveA.live?.id || liveA.room?.id;
  const liveBId = liveB.live?.id || liveB.room?.id;

  try {
    await req('/api/live/battles', {
      method: 'POST',
      token: tA,
      body: { hostLiveId: liveAId, opponentLiveId: liveBId, mode: '1v1' },
    });
  } catch (e) {
    console.warn('battle', e.message);
    try {
      await req(`/api/live/${liveAId}/resonance`, {
        method: 'POST',
        token: tA,
        body: { opponentLiveId: liveBId },
      });
    } catch (e2) {
      console.warn('resonance', e2.message);
    }
  }

  const convo = await req('/api/conversations', { method: 'POST', token: tA, body: { userId: meB.id } });
  const convoId = convo.conversation.id;
  await req(`/api/conversations/${convoId}/messages`, {
    method: 'POST',
    token: tA,
    body: { text: 'Привіт! Це приватний чат для screenshot QA.' },
  });
  await req(`/api/conversations/${convoId}/messages`, {
    method: 'POST',
    token: tB,
    body: { text: 'Hey — ready for voice/video call UI checks.' },
  });

  // Ring peer so incoming call banner can be shown later from second session
  const voiceCall = await req('/api/calls', {
    method: 'POST',
    token: tA,
    body: { kind: 'voice', userId: meB.id, conversationId: convoId },
  }).catch((e) => (console.warn('voice call', e.message), null));

  const community = await req('/api/communities', {
    method: 'POST',
    token: tA,
    body: { name: 'Sylora Creators', description: 'Community page for screenshots', visibility: 'public' },
  });
  const communityId = community.community?.id || community.id;

  const course = await req('/api/courses', {
    method: 'POST',
    token: tA,
    body: { title: 'Sylora Fundamentals', description: 'Learning path for visual QA', price: 0 },
  });
  const courseId = course.course.id;
  await req(`/api/courses/${courseId}/lessons`, {
    method: 'POST',
    token: tA,
    body: { title: 'Lesson 1 · Presence', content: 'How Sylora listens, speaks, and stays one personality across domains.' },
  });
  await req(`/api/courses/${courseId}/lessons`, {
    method: 'POST',
    token: tA,
    body: { title: 'Lesson 2 · Study Room', content: 'Focus timer, tutor modes, and quiz integrity notes.' },
  });
  await req(`/api/courses/${courseId}/publish`, { method: 'POST', token: tA });
  await req(`/api/courses/${courseId}/enroll`, { method: 'POST', token: tB, body: {} }).catch(() => {});

  const org = await req('/api/orgs', { method: 'POST', token: tA, body: { name: 'Sylora Studio LLC' } });
  const orgId = org.organization?.id || org.org?.id || org.id;
  await req(`/api/orgs/${orgId}/teams`, { method: 'POST', token: tA, body: { name: 'Product' } }).catch(() => {});
  await req(`/api/orgs/${orgId}/documents`, { method: 'POST', token: tA, body: { title: 'Master Service Agreement draft' } }).catch(() => {});
  await req(`/api/orgs/${orgId}/tasks`, { method: 'POST', token: tA, body: { title: 'Prepare invoice pack' } }).catch(() => {});

  await req('/api/businesses', {
    method: 'POST',
    token: tA,
    body: { name: 'Lumen Labs', description: 'Demo company profile', website: 'https://example.com' },
  }).catch(() => {});

  await req('/api/business/country', { method: 'POST', token: tA, body: { countryCode: 'PL' } }).catch(() => {});
  await req('/api/business/crm', { method: 'POST', token: tA, body: { type: 'client', name: 'Acme Client', email: 'client@acme.test' } }).catch(() => {});
  await req('/api/business/quotes', {
    method: 'POST',
    token: tA,
    body: { items: [{ description: 'Discovery workshop', quantity: 1, unitNetPrice: 800, taxRate: 23 }] },
  }).catch(() => {});
  await req('/api/business/invoices', {
    method: 'POST',
    token: tA,
    body: {
      items: [{ description: 'Monthly retainer', quantity: 1, unitNetPrice: 1200, taxRate: 23 }],
      seller: { name: 'Sylora Studio LLC' },
      buyer: { name: 'Acme Client' },
    },
  }).catch(() => {});

  await req('/api/learning/tutor', { method: 'POST', token: tA, body: { subject: 'Physics', mode: 'teach_me' } }).catch(() => {});
  await req('/api/learning/flashcards', {
    method: 'POST',
    token: tA,
    body: { title: 'Orbit deck', cards: [{ front: 'LUMEN', back: 'TEST currency' }], aiAssisted: false },
  }).catch(() => {});
  await req('/api/focus', { method: 'POST', token: tA, body: { preset: '25_5' } }).catch(() => {});
  await req('/api/science/library', { method: 'POST', token: tA, body: { type: 'paper', title: 'Resonance metrics preprint' } }).catch(() => {});
  await req('/api/science/datasets', {
    method: 'POST',
    token: tA,
    body: { name: 'Demo dataset', columns: [{ name: 'x', type: 'number' }], previewRows: [[1], [2], [3]] },
  }).catch(() => {});
  await req('/api/science/formulas', {
    method: 'POST',
    token: tA,
    body: { title: 'Kinetic energy', latex: 'E=\\frac{1}{2}mv^2', units: ['J'] },
  }).catch(() => {});
  await req('/api/science/circles', { method: 'POST', token: tA, body: { title: 'Paper Club' } }).catch(() => {});
  await req('/api/science/experiments', {
    method: 'POST',
    token: tA,
    body: { title: 'Demo trial', procedure: 'Measure', parameters: { n: 3 }, observations: 'ok', results: 'baseline' },
  }).catch(() => {});

  await req('/api/conferences', {
    method: 'POST',
    token: tA,
    body: { kind: 'science', title: 'Science Conference Room', syloraEnabled: true },
  }).catch(() => {});
  await req('/api/conferences', {
    method: 'POST',
    token: tA,
    body: { kind: 'business', title: 'Business Standup Room', syloraEnabled: true },
  }).catch(() => {});

  await req('/api/ai/memory', {
    method: 'POST',
    token: tA,
    body: { label: 'Preferred language', value: 'Ukrainian first, English OK' },
  }).catch(() => {});

  await req('/api/platform-events', {
    method: 'POST',
    token: tA,
    body: { title: 'Seasonal LIVE Kickoff', startsAt: 'tomorrow 20:00', mode: 'online' },
  }).catch(() => {});

  console.log(JSON.stringify({
    ok: true,
    tokens: { host: tA, peer: tB },
    ids: {
      hostUserId: meA.id,
      peerUserId: meB.id,
      liveAId,
      liveBId,
      conversationId: convoId,
      communityId,
      courseId,
      orgId,
      voiceCallId: voiceCall?.call?.id || null,
    },
  }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
