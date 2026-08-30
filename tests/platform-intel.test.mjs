import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-intel-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?intel=${Date.now()}`);
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

test('shell keeps one Sylora and privacy center entry', () => {
  const app = fs.readFileSync('public/app.js', 'utf8');
  assert.match(app, /t\('privacyAiControl'\)/);
  assert.match(app, /\/api\/home\/hub/);
  assert.match(app, /CREATOR INTELLIGENCE/);
  assert.match(app, /lesson-quiz/);
  assert.doesNotMatch(app, /Business Bot|Learning Bot/);
  assert.match(fs.readFileSync('public/index.html', 'utf8'), /design-consolidation\.css/);
});

test('home hub, privacy controls, meeting summary, quiz APIs are real', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { email: 'intel@example.com', username: 'intel_user', password: 'password123' }
    });
    assert.equal(reg.status, 201);
    const token = reg.data.token;

    const caps = await req(base, '/api/ai/capabilities');
    assert.equal(caps.status, 200);
    assert.equal(caps.data.oneSylora, true);
    assert.equal(caps.data.degraded.ai, true);

    const hub = await req(base, '/api/home/hub', { token });
    assert.equal(hub.status, 200);
    assert.ok(hub.data.hub);

    const privacy = await req(base, '/api/ai/privacy-controls', {
      method: 'PATCH',
      token,
      body: { camera: false, personalization: true, proactiveLevel: 'OFF' }
    });
    assert.equal(privacy.status, 200);
    assert.equal(privacy.data.agent.proactiveLevel, 'OFF');

    const security = await req(base, '/api/security-center', { token });
    assert.equal(security.status, 200);
    assert.equal(security.data.aiControl.oneSylora, true);
    assert.ok(Array.isArray(security.data.aiControl.activity));

    const org = await req(base, '/api/orgs', { method: 'POST', token, body: { name: 'Intel Org' } });
    assert.equal(org.status, 201);
    const brief = await req(base, `/api/orgs/${org.data.organization.id}/meeting-brief`, {
      method: 'POST',
      token,
      body: { title: 'Kickoff', agenda: 'Scope and owners' }
    });
    assert.equal(brief.status, 201);
    assert.equal(brief.data.brief.status, 'brief');

    const summary = await req(base, `/api/orgs/${org.data.organization.id}/meeting-summary`, {
      method: 'POST',
      token,
      body: { title: 'Kickoff notes', notes: 'Decision: hire designer.\nRisk: timeline.\nTodo: send brief.' }
    });
    assert.equal(summary.status, 201);
    assert.ok(summary.data.proposedTasks.length >= 1);
    const confirmed = await req(base, `/api/orgs/${org.data.organization.id}/proposed-tasks/confirm`, {
      method: 'POST',
      token,
      body: { tasks: summary.data.proposedTasks.map(t => ({ ...t, confirmed: true })) }
    });
    assert.equal(confirmed.status, 200);
    assert.ok(confirmed.data.created.length >= 1);

    const course = await req(base, '/api/courses', {
      method: 'POST',
      token,
      body: { title: 'Adaptive Learning', description: 'Learn with Sylora', price: 0 }
    });
    assert.equal(course.status, 201);
    const lesson = await req(base, `/api/courses/${course.data.course.id}/lessons`, {
      method: 'POST',
      token,
      body: { title: 'Basics', content: 'Learning adapts to mistakes. Explanations should be clear. Practice improves retention.' }
    });
    await req(base, `/api/courses/${course.data.course.id}/publish`, { method: 'POST', token, body: {} });
    await req(base, `/api/courses/${course.data.course.id}/enroll`, { method: 'POST', token, body: {} });
    const quiz = await req(base, `/api/lessons/${lesson.data.lesson.id}/quiz`, { token });
    assert.equal(quiz.status, 200);
    const q = quiz.data.quiz.questions[0];
    const attempt = await req(base, `/api/quizzes/${quiz.data.quiz.id}/attempt`, {
      method: 'POST',
      token,
      body: { answers: { [q.id]: q.options[0].id } }
    });
    assert.equal(attempt.status, 200);
    assert.equal(typeof attempt.data.correct, 'boolean');

    const pack = await req(base, '/api/studio/ai/content-pack', {
      method: 'POST',
      token,
      body: { topic: 'Creator night' }
    });
    assert.equal(pack.status, 200);
    assert.equal(pack.data.pack.requiresConfirmation, true);

    const live = await req(base, '/api/live', { method: 'POST', token, body: { title: 'Intel LIVE' } });
    assert.equal(live.status, 201);
    const insights = await req(base, `/api/live/${live.data.live.id}/creator-insights`, { token });
    assert.equal(insights.status, 200);
    assert.equal(insights.data.analysis.metrics.source, 'platform_store');

    const clear = await req(base, '/api/ai/history', { method: 'DELETE', token });
    assert.equal(clear.status, 200);
    assert.equal(clear.data.cleared, true);
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
