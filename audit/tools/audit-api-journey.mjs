const BASE = process.env.BASE || 'http://127.0.0.1:8787';

async function req(method, path, { token, body, headers = {} } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 200) }; }
  return { status: res.status, json };
}

function log(label, data) {
  console.log(label, typeof data === 'string' ? data : JSON.stringify(data));
}

const results = {};

const reg1 = await req('POST', '/api/auth/register', {
  body: { username: 'audit_a', email: 'audit_a@example.com', password: 'password123' }
});
results.register = { status: reg1.status, user: reg1.json.user?.username, balance: reg1.json.wallet?.balance, err: reg1.json.error };
const token1 = reg1.json.token;
const uid1 = reg1.json.user?.id;

const reg2 = await req('POST', '/api/auth/register', {
  body: { username: 'audit_b', email: 'audit_b@example.com', password: 'password123' }
});
results.register2 = { status: reg2.status, user: reg2.json.user?.username, err: reg2.json.error };
const token2 = reg2.json.token;
const uid2 = reg2.json.user?.id;

const me = await req('GET', '/api/me', { token: token1 });
results.me = { status: me.status, user: me.json.user?.username, balance: me.json.wallet?.balance };

const login = await req('POST', '/api/auth/login', {
  body: { identity: 'audit_a', password: 'password123' }
});
results.login = { status: login.status, ok: !!login.json.token, err: login.json.error };
const tokenLogin = login.json.token || token1;

const bad = await req('POST', '/api/auth/login', {
  body: { identity: 'audit_a', password: 'wrongpassword' }
});
results.badLogin = { status: bad.status, err: bad.json.error };

const post = await req('POST', '/api/posts', { token: tokenLogin, body: { text: 'Forensic audit post' } });
results.post = { status: post.status, id: post.json.post?.id, err: post.json.error };
const pid = post.json.post?.id;

const react = await req('POST', `/api/posts/${pid}/react`, { token: token2 });
results.react = { status: react.status, count: react.json.post?.reactionCount };

const comment = await req('POST', `/api/posts/${pid}/comments`, { token: token2, body: { text: 'audit comment' } });
results.comment = { status: comment.status, id: comment.json.comment?.id, err: comment.json.error };

const follow = await req('POST', `/api/users/${uid2}/follow`, { token: tokenLogin });
results.follow = { status: follow.status, following: follow.json.following };

const gifts = await req('GET', '/api/gifts', { token: tokenLogin });
results.gifts = { status: gifts.status, ids: (gifts.json.gifts || []).map((g) => `${g.id}:${g.price}`) };

const send = await req('POST', '/api/gifts/send', {
  token: tokenLogin,
  headers: { 'Idempotency-Key': 'audit-gift-journey-1' },
  body: { giftId: 'spark', recipientId: uid2, quantity: 1 }
});
results.giftSend = { status: send.status, balance: send.json.wallet?.balance, err: send.json.error, transfer: !!send.json.transfer };

const live = await req('POST', '/api/live', { token: tokenLogin, body: { title: 'Audit LIVE' } });
results.liveCreate = { status: live.status, id: live.json.room?.id, err: live.json.error };
const lid = live.json.room?.id;

const liveList = await req('GET', '/api/live');
results.liveList = { status: liveList.status, rooms: (liveList.json.rooms || []).length };

const chat = await req('POST', `/api/live/${lid}/chat`, { token: token2, body: { text: 'viewer hello' } });
results.liveChat = { status: chat.status, text: chat.json.message?.text, err: chat.json.error };

const conv = await req('POST', '/api/conversations', { token: tokenLogin, body: { userId: uid2 } });
results.conversation = { status: conv.status, id: conv.json.conversation?.id, err: conv.json.error };
const cid = conv.json.conversation?.id;

const msg = await req('POST', `/api/conversations/${cid}/messages`, { token: tokenLogin, body: { text: 'DM audit' } });
results.message = { status: msg.status, id: msg.json.message?.id, err: msg.json.error };

const ai = await req('POST', '/api/ai/chat', { token: tokenLogin, body: { text: 'Hello' } });
results.aiChat = { status: ai.status, err: ai.json.error };

const cap = await req('GET', '/api/ai/capabilities', { token: tokenLogin });
results.aiCapabilities = { status: cap.status, body: cap.json };

const call = await req('POST', '/api/calls', { token: tokenLogin, body: { calleeId: uid2, kind: 'video' } });
results.call = { status: call.status, keys: Object.keys(call.json), err: call.json.error, callId: call.json.callId || call.json.call?.id };

const patch = await req('PATCH', '/api/me', { token: tokenLogin, body: { displayName: 'Audit User A', bio: 'forensic' } });
results.profilePatch = { status: patch.status, name: patch.json.user?.displayName, err: patch.json.error };

const hub = await req('GET', '/api/home/hub', { token: tokenLogin });
results.homeHub = { status: hub.status, keys: Object.keys(hub.json.hub || hub.json || {}) };

const biz = await req('GET', '/api/business/hub', { token: tokenLogin });
results.businessHub = { status: biz.status, keys: Object.keys(biz.json) };

const learn = await req('GET', '/api/learning/hub', { token: tokenLogin });
results.learningHub = { status: learn.status, keys: Object.keys(learn.json) };

const integ = await req('GET', '/api/integrations/status');
results.integrations = integ.json;

const probes = {};
for (const p of ['/api/auth/google', '/api/auth/oauth', '/api/auth/forgot', '/api/auth/reset', '/api/auth/verify', '/api/payments/checkout', '/api/wallet/topup']) {
  const r = await req('GET', p);
  probes[p] = r.status;
}
results.missingAuthPaymentProbes = probes;

const logout = await req('POST', '/api/auth/logout', { token: tokenLogin });
results.logout = { status: logout.status, ok: logout.json.ok };
const after = await req('GET', '/api/me', { token: tokenLogin });
results.afterLogout = { status: after.status, err: after.json.error };

// Keep second user for browser
results.browserHints = { token2, uid2, lid, cid };

import fs from 'node:fs';
fs.writeFileSync('/tmp/audit-api-journey.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
