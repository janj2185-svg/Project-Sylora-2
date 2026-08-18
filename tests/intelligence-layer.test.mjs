import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  selectContextSlices,
  routeOperatingIntent,
  orchestrateTask,
  buildDailyBrief,
  buildIntelligentInbox,
  extractTopics,
  scienceClaim,
  emptyPlatformSeed,
  PLATFORM_SKILLS,
  goalProgress,
  createGoal
} from '../src/ecosystem/sylora-os.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-os-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?os=${Date.now()}`);
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

test('context engine selects slices without dumping everything', () => {
  const ctx = selectContextSlices({
    view: 'business',
    query: 'підготуй до зустрічі',
    user: { id: 'u1', displayName: 'Ada' },
    memories: [
      { id: '1', label: 'Lang', value: 'uk', category: 'preferences', importance: 0.9 },
      { id: '2', label: 'Secret hobby', value: 'x', category: 'conversation', importance: 0.1 }
    ],
    calendar: [{ id: 'c1', title: 'Standup', startsAt: 'tomorrow', kind: 'meeting' }],
    projects: [{ id: 'p1', name: 'Launch' }],
    orgs: [{ id: 'o1', name: 'Acme' }],
    decisions: [{ id: 'd1', decision: 'Beta 15 Sep', owner: 'Ada', date: '2026-08-01' }],
    tasks: [{ id: 't1', title: 'Prep deck', status: 'open', deadline: 'tomorrow' }],
    lives: [{ id: 'l1', title: 'Unrelated LIVE', status: 'live' }],
    maxTokensApprox: 800
  });
  assert.ok(ctx.slices.some(s => s.kind === 'calendar' || s.kind === 'projects'));
  assert.ok(!JSON.stringify(ctx).includes('Unrelated LIVE') || ctx.slices.every(s => s.kind !== 'live'));
  assert.match(ctx.principle, /Selective context/);
});

test('operating layer routes daily brief and unfinished work', () => {
  assert.equal(routeOperatingIntent('Sylora, що сьогодні важливого?').tool, 'daily_brief');
  assert.equal(routeOperatingIntent('знайди всі незакінчені справи').tool, 'list_open_work');
  const orch = orchestrateTask({ text: 'підготуй мене до зустрічі' });
  assert.equal(orch.oneSylora, true);
  assert.equal(orch.specialist, 'business');
  assert.deepEqual(orch.pipeline[0], 'task');
});

test('daily brief respects disable and inbox does not hide', () => {
  const off = buildDailyBrief({ enabled: false });
  assert.equal(off.enabled, false);
  const inbox = buildIntelligentInbox({
    conversations: [{ id: 'c1', lastMessage: { text: 'Можеш підтвердити?' }, members: [] }],
    notifications: [{ id: 'n1', type: 'invite', read: false }]
  });
  assert.ok(inbox.totals.requiresAction >= 1);
  assert.match(inbox.note, /nothing is hidden/i);
});

test('science claims and empty platform stay honest', () => {
  const claim = scienceClaim({ text: 'Water boils at 100C', kind: 'source_backed', sources: ['NIST'] });
  assert.equal(claim.kind, 'source_backed');
  const seed = emptyPlatformSeed({ communities: [], courses: [], lives: [], people: [] });
  assert.equal(seed.honesty.noFakeCounters, true);
  assert.ok(PLATFORM_SKILLS.length >= 4);
  const g = createGoal({ id: 'g1', userId: 'u', title: 'Learn Polish', milestones: [{ title: 'A1' }] });
  assert.equal(goalProgress(g, []), 0);
  assert.ok(extractTopics('роботів та будівництво майбутнього').length >= 1);
});

test('shell exposes dashboard canvas daily brief priority inbox', () => {
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /t\('dailyBrief'\)/);
  assert.match(app, /data-inbox-tab="priority"/);
  assert.match(app, /renderPersonalDashboard/);
  assert.match(app, /renderCanvas/);
  assert.match(app, /\/api\/dashboard/);
});

test('intelligence APIs: brief, inbox, tasks, goals, decisions, context, canvas', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { email: 'os@example.com', username: 'os_user', password: 'password123' }
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;

    const brief = await req(base, '/api/daily-brief', { token });
    assert.equal(brief.status, 200);
    assert.equal(brief.data.brief.enabled, true);

    const off = await req(base, '/api/daily-brief', { method: 'PATCH', token, body: { enabled: false } });
    assert.equal(off.status, 200);
    const brief2 = await req(base, '/api/daily-brief', { token });
    assert.equal(brief2.data.brief.enabled, false);
    await req(base, '/api/daily-brief', { method: 'PATCH', token, body: { enabled: true } });

    const cmd = await req(base, '/api/ai/command', {
      method: 'POST',
      token,
      body: { text: 'Sylora, що сьогодні важливого?' }
    });
    assert.equal(cmd.status, 200);
    assert.equal(cmd.data.status, 'executed');
    assert.ok(cmd.data.plan?.orchestration?.oneSylora);

    const inbox = await req(base, '/api/inbox/intelligent', { token });
    assert.equal(inbox.status, 200);
    assert.ok(inbox.data.inbox.buckets);

    const task = await req(base, '/api/tasks', {
      method: 'POST',
      token,
      body: { title: 'Finish pitch', priority: 'high', source: 'sylora' }
    });
    assert.equal(task.status, 201);

    const goal = await req(base, '/api/goals', {
      method: 'POST',
      token,
      body: { title: 'Launch channel', decompose: true, milestones: [{ title: 'First LIVE' }, { title: 'First clip' }] }
    });
    assert.equal(goal.status, 201);
    assert.ok(goal.data.goal.taskIds.length >= 2);

    const decision = await req(base, '/api/decisions', {
      method: 'POST',
      token,
      body: { decision: 'Команда вирішила запускати beta 15 вересня', reason: 'Market window', owner: 'os_user' }
    });
    assert.equal(decision.status, 201);
    const found = await req(base, '/api/decisions?q=beta', { token });
    assert.ok(found.data.decisions.some(d => /beta/i.test(d.decision)));

    const ctx = await req(base, '/api/ai/context', {
      method: 'POST',
      token,
      body: { view: 'business', query: 'зустріч' }
    });
    assert.equal(ctx.status, 200);
    assert.ok(Array.isArray(ctx.data.contextEngine.slices));

    const indexed = await req(base, '/api/content/understand', {
      method: 'POST',
      token,
      body: { contentType: 'video', title: 'Роботи майбутнього', text: 'відео про роботів і автоматизацію', visibility: 'private' }
    });
    assert.equal(indexed.status, 201);
    const hist = await req(base, '/api/content/history?q=робот', { token });
    assert.equal(hist.status, 200);
    assert.ok(hist.data.results?.length >= 1);

    const shared = await req(base, '/api/shared-memory', {
      method: 'POST',
      token,
      body: { scope: 'project', label: 'Launch date', value: '15 Sep', projectId: 'p1' }
    });
    assert.equal(shared.status, 201);

    const dash = await req(base, '/api/dashboard', { token });
    assert.equal(dash.status, 200);
    assert.ok(dash.data.dashboard.today);

    const canvas = await req(base, '/api/canvas', {
      method: 'POST',
      token,
      body: { title: 'Research notes', kind: 'research', artifact: { body: 'Draft' } }
    });
    assert.equal(canvas.status, 201);

    const skills = await req(base, '/api/skills');
    assert.equal(skills.status, 200);
    assert.ok(skills.data.skills.length >= 1);

    const meeting = await req(base, '/api/meetings/result', {
      method: 'POST',
      token,
      body: { title: 'Kickoff', notes: 'Ми вирішили запуск у вересні.\nAction: підготувати лендінг' }
    });
    assert.equal(meeting.status, 201);
    assert.ok(meeting.data.result.decisions.length >= 1);

    const science = await req(base, '/api/science/verify', {
      method: 'POST',
      token,
      body: { text: 'Hypothesis about X', kind: 'hypothesis' }
    });
    assert.equal(science.status, 200);
    assert.equal(science.data.claim.kind, 'hypothesis');

    const guest = await req(base, '/api/guest/view?visibility=public');
    assert.equal(guest.status, 200);
    assert.equal(guest.data.aggressiveLoginWall, false);

    const onboarding = await req(base, '/api/onboarding', { token });
    assert.equal(onboarding.status, 200);
    assert.equal(onboarding.data.onboarding.mode, 'minimal_first');

    const pipeline = await req(base, '/api/studio/ai/pipeline', {
      method: 'POST',
      token,
      body: { title: 'Yesterday LIVE', liveId: null }
    });
    assert.equal(pipeline.status, 200);
    assert.equal(pipeline.data.plan.policy.publishRequiresConfirmation, true);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
