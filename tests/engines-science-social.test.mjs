import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  createServerTimer,
  timerSnapshot,
  parseTimeAssistantIntent,
  pauseTimer,
  resumeTimer
} from '../src/ecosystem/timer-engine.mjs';
import { createQuiz, openQuiz, submitAnswer, quizLeaderboard } from '../src/ecosystem/quiz-engine.mjs';
import {
  createExperimentLog,
  appendExperimentVersion,
  mutateExperimentVersion,
  runCalculator,
  analyzeStatistics,
  visualizationManifest
} from '../src/ecosystem/science-tools.mjs';
import { createConferenceProgram, CONFERENCE_KINDS } from '../src/ecosystem/conference-mode.mjs';
import {
  createDiscoveryProfile,
  matchDiscovery,
  evaluateAchievements,
  createSeasonalLiveEvent,
  SHARED_ENGINE_REGISTRY,
  PRIORITY_ORDER,
  QA_CHECKLIST
} from '../src/ecosystem/social-ecosystem.mjs';
import { createServerTimer as liveTimerReexport } from '../src/ecosystem/live-entertainment.mjs';
import { routeOperatingIntent } from '../src/ecosystem/sylora-os.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-ess-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?ess=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, base: `http://127.0.0.1:${server.address().port}`, dir };
}

async function req(base, pathname, { method = 'GET', token, body } = {}) {
  const headers = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${base}${pathname}`, {
    method,
    headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test('universal timer engine syncs server time and supports assistant intents', () => {
  const t = createServerTimer({ id: 't1', kind: 'countdown', durationSec: 60, warnBeforeSec: 10, ownerId: 'u' });
  assert.equal(t.engine, 'timer_engine_v1');
  assert.equal(t.sync, 'server_time');
  const mid = timerSnapshot(t, t.startedAtMs + 50_000);
  assert.equal(mid.remainingSec, 10);
  assert.equal(mid.warnDue, true);
  const paused = pauseTimer(t, t.startedAtMs + 20_000);
  assert.equal(paused.status, 'paused');
  const resumed = resumeTimer(paused, Date.now());
  assert.equal(resumed.status, 'running');

  const study = parseTimeAssistantIntent('Sylora, постав 25 хвилин на навчання');
  assert.equal(study.action, 'start_countdown');
  assert.equal(study.durationSec, 25 * 60);
  const sw = parseTimeAssistantIntent('Засічи, скільки я працюю над цим проєктом');
  assert.equal(sw.action, 'start_stopwatch');
  const warn = parseTimeAssistantIntent('Попередь мене за 5 хвилин до завершення презентації');
  assert.equal(warn.warnBeforeSec, 5 * 60);
  assert.equal(warn.scopeType, 'presentation');

  // LIVE entertainment re-exports same engine
  const re = liveTimerReexport({ id: 'x', durationSec: 5 });
  assert.equal(re.engine, 'timer_engine_v1');

  assert.equal(routeOperatingIntent('постав 25 хвилин на навчання').tool, 'timer_assistant');
});

test('one quiz engine serves learning/live/science contexts', () => {
  const quiz = createQuiz({
    context: 'science',
    title: 'Methods',
    questions: [{ type: 'multiple_choice', prompt: 'n?', options: ['1', '2'], answer: 1 }],
    timerSec: 30
  });
  assert.equal(quiz.engine, 'quiz_engine_v1');
  openQuiz(quiz);
  const a = submitAnswer(quiz, { userId: 'u1', questionId: quiz.questions[0].id, value: 1 });
  assert.equal(a.correct, true);
  assert.ok(quizLeaderboard(quiz)[0].points >= 10);
  assert.equal(quiz.examIntegrity.fakeAiCheatingDetector, false);
});

test('experiment log is append-only; calculators modular; stats explain', () => {
  const log = createExperimentLog({
    researcherId: 'r1',
    title: 'Catalysis',
    procedure: 'Mix A+B',
    parameters: { T: 25 },
    results: 'ok'
  });
  appendExperimentVersion(log, { observations: 'Bubbles', results: 'yield 12%' }, 'r1');
  assert.equal(log.versions.length, 2);
  assert.equal(log.currentVersion, 2);
  const refused = mutateExperimentVersion(log, 1, { results: 'hacked' });
  assert.equal(refused.ok, false);
  assert.equal(refused.error, 'IMMUTABLE_VERSION');
  assert.equal(log.versions[0].results, 'ok');

  const ke = runCalculator('physics', 'kinetic_energy', { mass: 2, velocity: 3 });
  assert.equal(ke.value, 9);
  assert.equal(ke.unit, 'J');
  assert.ok(ke.assumptions.length);

  const stats = analyzeStatistics({ data: [1, 2, 3, 4, 5] });
  assert.equal(stats.descriptive.mean, 3);
  assert.match(stats.explanation, /Mean/i);
  assert.equal(visualizationManifest().lazyLoad, true);
});

test('conference mode is shared; discovery is safe; achievements domain-scoped', () => {
  assert.ok(CONFERENCE_KINDS.includes('education'));
  const prog = createConferenceProgram({ conferenceId: 'c1', kind: 'education', agenda: [{ title: 'Keynote' }] });
  assert.equal(prog.engine, 'conference_engine_shared');
  assert.equal(prog.primitives.quiz, 'quiz_engine_v1');

  const a = createDiscoveryProfile({ userId: 'a', optIn: true, interests: ['music', 'ukrainian'], languages: ['uk'] });
  const b = createDiscoveryProfile({ userId: 'b', optIn: true, interests: ['music'], languages: ['uk'] });
  const off = createDiscoveryProfile({ userId: 'c', optIn: false, interests: ['music'] });
  const matches = matchDiscovery(a, [a, b, off]);
  assert.ok(matches.matches.some(m => m.userId === 'b'));
  assert.equal(matches.forbidden, 'anonymous_random_video_chat');
  assert.equal(a.safety.anonymousRandomVideoChat, false);

  const ach = evaluateAchievements({ signals: { coursesCompleted: 1, livesHosted: 1 } });
  assert.equal(ach.globalHumanRanking, false);
  assert.ok(ach.unlocked.some(x => x.id === 'first_course'));

  const season = createSeasonalLiveEvent({ title: 'Winter Resonance', theme: 'winter' });
  assert.equal(season.assets.modular, true);
  assert.equal(SHARED_ENGINE_REGISTRY.timer, 'timer_engine_v1');
  assert.ok(PRIORITY_ORDER.P0.includes('call_engine'));
  assert.ok(QA_CHECKLIST.includes('TIMER_SERVER_SYNC'));
});

test('HTTP: timer assistant, experiment immutability, shared quiz, discovery', async () => {
  const { server, base, dir } = await startServer();
  try {
    const reg = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'enguser', email: 'e@ex.com', password: 'password12' }
    });
    const token = reg.data.token;

    const engines = await req(base, '/api/engines');
    assert.equal(engines.data.registry.quiz, 'quiz_engine_v1');
    assert.match(engines.data.rule, /reuse shared engines/i);

    const assist = await req(base, '/api/timers/assistant', {
      method: 'POST',
      token,
      body: { text: 'постав 25 хвилин на навчання' }
    });
    assert.equal(assist.status, 200);
    assert.equal(assist.data.ok, true);
    assert.equal(assist.data.engine, 'timer_engine_v1');

    const cmd = await req(base, '/api/ai/command', {
      method: 'POST',
      token,
      body: { text: 'Sylora, постав 25 хвилин на навчання' }
    });
    assert.equal(cmd.data.plan?.tool, 'timer_assistant');
    assert.equal(cmd.data.status, 'executed');

    const exp = await req(base, '/api/science/experiments', {
      method: 'POST',
      token,
      body: { title: 'Run A', procedure: 'Heat', results: 'v1' }
    });
    assert.equal(exp.status, 201);
    const upd = await req(base, `/api/science/experiments/${exp.data.experiment.id}`, {
      method: 'POST',
      token,
      body: { results: 'v2', observations: 'clear' }
    });
    assert.equal(upd.data.experiment.versions.length, 2);
    const rewrite = await req(base, `/api/science/experiments/${exp.data.experiment.id}/versions/1`, {
      method: 'PUT',
      token,
      body: { results: 'tamper' }
    });
    assert.equal(rewrite.status, 409);
    assert.equal(rewrite.data.error, 'IMMUTABLE_VERSION');

    const quiz = await req(base, '/api/quizzes', {
      method: 'POST',
      token,
      body: {
        context: 'live',
        title: 'LIVE Q',
        open: true,
        timerSec: 45,
        questions: [{ type: 'true_false', prompt: 'Sky?', options: ['yes', 'no'], answer: 'yes' }]
      }
    });
    assert.equal(quiz.status, 201);
    assert.equal(quiz.data.quiz.engine, 'quiz_engine_v1');
    assert.ok(quiz.data.quiz.timerRef);

    const calc = await req(base, '/api/science/calculators/run', {
      method: 'POST',
      token,
      body: { moduleId: 'mathematics', op: 'add', inputs: { a: 2, b: 3 } }
    });
    assert.equal(calc.data.result.value, 5);

    await req(base, '/api/social/discovery', {
      method: 'POST',
      token,
      body: { optIn: true, interests: ['science'], languages: ['uk'] }
    });
    const disc = await req(base, '/api/social/discovery/matches', { token });
    assert.ok(disc.data.forbidden === 'anonymous_random_video_chat' || disc.data.note);

    const fun = await req(base, '/api/social/fun-rooms', {
      method: 'POST',
      token,
      body: { kind: 'coffee' }
    });
    assert.equal(fun.data.room.requiresGifts, false);

    const app = fs.readFileSync('public/app.js', 'utf8');
    assert.match(app, /\/api\/science\/experiments/);
    assert.match(app, /\/api\/timers\/assistant|\/api\/focus|Focus 25/);
    assert.match(app, /\/api\/social\/fun-rooms/);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
