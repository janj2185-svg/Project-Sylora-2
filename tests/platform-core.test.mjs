import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { detectIntent, planFromIntent, TOOL_CATALOG } from '../src/ecosystem/sylora-tools.mjs';
import { buildCommandPlan, MEMORY_CATEGORIES } from '../src/ecosystem/platform-core.mjs';
import { resolveFlags } from '../src/ecosystem/feature-flags.mjs';
import { providerSnapshot } from '../src/ecosystem/providers.mjs';
import { semanticSearchFallback } from '../src/ecosystem/search.mjs';
import { listSpacesForUser } from '../src/ecosystem/spaces.mjs';
import { validateToolInput } from '../src/ecosystem/action-engine.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-core-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?core=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, dir };
}

async function req(base, pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${pathname}`, { method, headers, body: body == null ? undefined : JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('tool catalog covers commanded actions', () => {
  const names = TOOL_CATALOG.map(t => t.name);
  for (const n of ['create_live', 'schedule_live', 'search_people', 'create_event', 'create_project', 'translate_content']) {
    assert.ok(names.includes(n), n);
  }
  assert.ok(MEMORY_CATEGORIES.includes('professional'));
});

test('intent detection plans confirmation for mutating tools', () => {
  const live = detectIntent('Створи LIVE завтра о 20:00');
  assert.equal(live.tool, 'schedule_live');
  const plan = planFromIntent(live);
  assert.equal(plan.requiresConfirmation, true);
  const cmd = buildCommandPlan('Покажи мої непрочитані повідомлення');
  assert.equal(cmd.tool, 'manage_notifications');
  assert.equal(cmd.requiresConfirmation, false);
});

test('tool validation and providers honesty', () => {
  assert.equal(validateToolInput('create_post', { text: 'hi' }).ok, true);
  assert.equal(validateToolInput('nope', {}).ok, false);
  const flags = resolveFlags();
  assert.equal(flags.universal_command, true);
  const providers = providerSnapshot();
  assert.equal(providers.ai.status, 'blocked_provider');
});

test('semantic search falls back lexically without embeddings', () => {
  const out = semanticSearchFallback('розмова про дизайн логотипу', {
    messages: [{ id: 'm1', conversationId: 'c1', text: 'Давай зробимо logo для бренду, дизайн простий' }],
    posts: []
  });
  assert.equal(out.mode, 'semantic_lexical');
  assert.ok(out.results.some(r => r.id === 'm1'));
  assert.equal(out.honesty.state, 'degraded');
});

test('spaces adapter unifies conferences and orgs', () => {
  const spaces = listSpacesForUser('u1', {
    conferenceRooms: [{ id: 'r1', ownerId: 'u1', kind: 'business', title: 'Standup' }],
    conferenceMembers: [{ roomId: 'r1', userId: 'u1', role: 'owner' }],
    organizations: [{ id: 'o1', ownerId: 'u1', name: 'Acme' }],
    orgMembers: [],
    orgTeams: [],
    orgDocuments: [],
    orgTasks: [],
    communities: [],
    communityMembers: [],
    platformEvents: []
  });
  assert.equal(spaces.length, 2);
  assert.ok(spaces.every(s => s.engine));
});

test('shell wires command palette, memory center, ask sylora, events', () => {
  const app = fs.readFileSync('public/app.js', 'utf8');
  const palette = fs.readFileSync('public/command-palette.js', 'utf8');
  assert.match(app, /t\('memoryCenter'\)/);
  assert.match(app, /\/api\/ai\/ask/);
  assert.match(app, /\/api\/platform-events/);
  assert.match(app, /Ask Sylora/);
  assert.match(app, /TEST/);
  assert.match(palette, /\/api\/ai\/command/);
  assert.match(palette, /looksLikeCommand/);
  assert.match(fs.readFileSync('public/create-hub.js', 'utf8'), /intent:'event'/);
});

test('universal command executes reads and confirms writes', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { email: 'cmd@example.com', username: 'cmd_user', password: 'password123' }
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;

    const status = await req(base, '/api/ecosystem/status');
    assert.equal(status.status, 200);
    assert.ok(status.data.platform?.infrastructure?.lumenWallet?.label);

    const caps = await req(base, '/api/ai/capabilities');
    assert.equal(caps.status, 200);
    assert.ok(caps.data.honesty?.lumenWallet);
    assert.ok(caps.data.flags?.universal_command);

    const unread = await req(base, '/api/ai/command', {
      method: 'POST',
      token,
      body: { text: 'Покажи мої непрочитані повідомлення' }
    });
    assert.equal(unread.status, 200);
    assert.equal(unread.data.status, 'executed');
    assert.equal(typeof unread.data.result.unread, 'number');

    const schedule = await req(base, '/api/ai/command', {
      method: 'POST',
      token,
      body: { text: 'Створи LIVE завтра о 20:00' }
    });
    assert.equal(schedule.status, 200);
    assert.equal(schedule.data.status, 'pending_confirmation');
    assert.ok(schedule.data.action?.id);

    const conf = await req(base, `/api/actions/${schedule.data.action.id}/confirm`, {
      method: 'POST',
      token,
      body: {}
    });
    assert.equal(conf.status, 200);
    assert.equal(conf.data.ok, true);
    assert.equal(conf.data.action.status, 'completed');
    assert.ok(conf.data.result?.live?.id);
    assert.equal(conf.data.result.live.status, 'scheduled');

    const event = await req(base, '/api/platform-events', {
      method: 'POST',
      token,
      body: { title: 'Demo Night', startsAt: 'tomorrow 20:00', mode: 'online' }
    });
    assert.equal(event.status, 201);
    assert.ok(event.data.event.id);

    const cal = await req(base, '/api/calendar', { token });
    assert.equal(cal.status, 200);
    assert.ok(cal.data.items.length >= 1);

    const project = await req(base, '/api/projects', {
      method: 'POST',
      token,
      body: { name: 'Launch Pack' }
    });
    assert.equal(project.status, 201);

    const spaces = await req(base, '/api/spaces', { token });
    assert.equal(spaces.status, 200);
    assert.ok(Array.isArray(spaces.data.spaces));

    await req(base, '/api/ai/memory', {
      method: 'POST',
      token,
      body: { label: 'Lang', value: 'Ukrainian', category: 'preferences' }
    });
    const mem = await req(base, '/api/ai/memory/center', { token });
    assert.equal(mem.status, 200);
    assert.ok(mem.data.byCategory.preferences.some(m => m.label === 'Lang'));

    const patch = await req(base, `/api/ai/memory/${mem.data.memories[0].id}`, {
      method: 'PATCH',
      token,
      body: { value: 'Ukrainian + Polish', category: 'professional' }
    });
    assert.equal(patch.status, 200);
    assert.equal(patch.data.memory.category, 'professional');

    const uni = await req(base, '/api/search/universal?q=Launch', { token });
    assert.equal(uni.status, 200);
    assert.ok(Array.isArray(uni.data.structured));

    const ask = await req(base, '/api/ai/ask', {
      method: 'POST',
      token,
      body: { contentType: 'post', question: 'поясни', view: 'feed' }
    });
    assert.equal(ask.status, 200);
    assert.ok(ask.data.answer);

    const flags = await req(base, '/api/feature-flags', { token });
    assert.equal(flags.status, 200);
    assert.equal(flags.data.flags.action_engine_execute, true);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
