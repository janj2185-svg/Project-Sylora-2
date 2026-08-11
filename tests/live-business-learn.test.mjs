import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  scoreBattleSide,
  createBattlePlan,
  applyBattleFactor,
  resonanceWorldState,
  createMiniGameSession,
  createServerTimer,
  timerSnapshot,
  createFocusSession
} from '../src/ecosystem/live-entertainment.mjs';
import {
  createCallSession,
  acceptCall,
  enableCallTranslation,
  createSyloraCall
} from '../src/ecosystem/call-engine.mjs';
import {
  createInvoiceDraft,
  createExpenseExtraction,
  confirmExpenseExtraction,
  financeAssistantGuard,
  resolveCountryAdapter,
  createBusinessCountryProfile
} from '../src/ecosystem/business-finance.mjs';
import {
  createTutorSession,
  tutorResponsePolicy,
  createCitation,
  createQuizBuilder,
  createFlashcardDeck,
  scheduleFlashcardReview
} from '../src/ecosystem/learning-science.mjs';

async function startServer() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-lbl-'));
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.DATABASE_URL = '';
  process.env.REDIS_URL = '';
  process.env.OPENAI_API_KEY = '';
  process.env.NODE_ENV = 'test';
  const { server } = await import(`../src/server.mjs?lbl=${Date.now()}`);
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

test('battle scoring is multi-factor and comeback does not boost score', () => {
  const giftsOnly = scoreBattleSide({ gifts: 10000, likes: 0 });
  const active = scoreBattleSide({ likes: 200, comments: 40, challengePoints: 20, gifts: 100 });
  assert.ok(active > giftsOnly * 0.1 || active > 100);
  // Pure gifts should not dominate forever due to sqrt
  assert.ok(scoreBattleSide({ gifts: 10000 }) < 10000);

  const battle = createBattlePlan({ id: 'b1', hostLiveId: 'l1', mode: '2v2' });
  assert.equal(battle.rounds.length, 4);
  assert.match(battle.fairness.note, /presentation-only/i);

  // Build a large deficit then comeback without scoreImpact
  battle.factors = { likes: 0, gifts: 0, comments: 0, challengePoints: 0, quizPoints: 0, teamParticipation: 0 };
  battle.opponentFactors = { likes: 80, gifts: 0, comments: 0, challengePoints: 0, quizPoints: 0, teamParticipation: 0 };
  battle.hostScore = scoreBattleSide(battle.factors);
  battle.opponentScore = scoreBattleSide(battle.opponentFactors);
  const beforeA = battle.hostScore;
  applyBattleFactor(battle, 'A', 'likes', 100);
  applyBattleFactor(battle, 'A', 'comments', 30);
  const cb = battle.comebackEvents.at(-1);
  if (cb) {
    assert.equal(cb.scoreImpact, 0);
    assert.match(cb.note, /Presentation/i);
  }
  assert.equal(battle.hostScore, scoreBattleSide(battle.factors));
  assert.ok(battle.hostScore >= beforeA);

  const world = resonanceWorldState({ likes: 50, comments: 5, comeback: true });
  assert.equal(world.language, 'sylora_resonance_world_v1');
  assert.equal(world.special, 'comeback_visual');

  const game = createMiniGameSession({ id: 'g1', liveId: 'l1', hostId: 'u', game: 'prediction_nofiat' });
  assert.equal(game.gambling, false);
  assert.equal(game.config.realMoneyBetting, false);
});

test('server timers sync from server time; focus has no aggressive gamification', () => {
  const timer = createServerTimer({ id: 't1', scopeType: 'quiz', scopeId: 'q1', kind: 'countdown', durationSec: 30 });
  assert.equal(timer.sync, 'server_time');
  const snap = timerSnapshot(timer, timer.startedAtMs + 10_000);
  assert.equal(snap.remainingSec, 20);
  const focus = createFocusSession({ id: 'f1', userId: 'u', preset: '25_5' });
  assert.equal(focus.aggressiveGamification, false);
  assert.equal(focus.focusMin, 25);
});

test('call engine requires bilateral consent for translation; Sylora call is presence mode', () => {
  const call = createCallSession({ id: 'c1', kind: 'voice', initiatorId: 'a', participantIds: ['b'] });
  const denied = enableCallTranslation(call, { userId: 'a', targetLang: 'pl', peerConsent: false });
  assert.equal(denied.ok, false);
  const ok = enableCallTranslation(call, { userId: 'a', targetLang: 'pl', peerConsent: true, mode: 'speech' });
  assert.equal(ok.ok, true);
  assert.equal(call.translation.aiLabeled, true);
  assert.match(call.translation.syntheticAudioDisclosure, /SYNTHETIC/i);
  acceptCall(call, 'b');
  assert.equal(call.status, 'active');
  const sylora = createSyloraCall({ id: 's1', userId: 'a' });
  assert.equal(sylora.cameraPermission, false);
  assert.equal(sylora.fullscreen, true);
});

test('country-aware invoice draft and expense confirmation gate', () => {
  const pl = resolveCountryAdapter('PL');
  assert.equal(pl.currency, 'PLN');
  assert.match(pl.eInvoicingNote, /KSeF|official/i);
  const profile = createBusinessCountryProfile({ countryCode: 'PL' });
  assert.equal(profile.notInferredFromIp, true);
  const inv = createInvoiceDraft({
    countryCode: 'PL',
    items: [{ description: 'Work', quantity: 2, unitNetPrice: 100, taxRate: 23 }],
    seller: { name: 'Seller' },
    buyer: { name: 'Buyer' }
  });
  assert.equal(inv.status, 'draft');
  assert.equal(inv.gross, 246);
  assert.equal(inv.notABank, true);
  const ex = createExpenseExtraction({ extracted: { amount: 50, seller: 'Shop' } });
  assert.equal(ex.confirmed, false);
  const conf = confirmExpenseExtraction(ex, { category: 'materials' });
  assert.equal(conf.confirmed, true);
  assert.equal(financeAssistantGuard().canSendWithoutConfirmation, false);
});

test('tutor and citation honesty; no fake cheating detector', () => {
  const tutor = createTutorSession({ userId: 'u', mode: 'practice' });
  assert.equal(tutor.principles.noReadyAnswerByDefault, true);
  const policy = tutorResponsePolicy({ gradedAssignment: true });
  assert.equal(policy.canCompleteGradedWorkSilently, false);
  const bad = createCitation({ title: 'X', doi: '10.1234/fake', sourceVerified: false });
  assert.equal(bad.error, 'doi_not_verified');
  const quiz = createQuizBuilder({ title: 'T', questions: [{ type: 'true_false', prompt: 'Q' }] });
  assert.equal(quiz.examIntegrity.fakeAiCheatingDetector, false);
  const deck = createFlashcardDeck({ title: 'D', cards: [{ front: 'a', back: 'b' }] });
  const reviewed = scheduleFlashcardReview(deck.cards[0], { quality: 4 });
  assert.ok(reviewed.intervalDays >= 1);
});

test('HTTP APIs for entertainment, calls, business, learning', async () => {
  const { server, base, dir } = await startServer();
  try {
    const a = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'hostlive', email: 'h@ex.com', password: 'password12' }
    });
    const b = await req(base, '/api/auth/register', {
      method: 'POST',
      body: { username: 'peerlive', email: 'p@ex.com', password: 'password12' }
    });
    assert.equal(a.status, 201);
    const token = a.data.token;
    const peer = b.data.user.id;

    const catalog = await req(base, '/api/live/entertainment');
    assert.ok(catalog.data.battleModes.includes('king_of_resonance'));

    const live = await req(base, '/api/live', { method: 'POST', token, body: { title: 'Show' } });
    assert.equal(live.status, 201);
    const liveId = live.data.live.id;

    const battle = await req(base, '/api/live/battles', {
      method: 'POST',
      token,
      body: { hostLiveId: liveId, mode: 'creator_vs_community' }
    });
    assert.equal(battle.status, 201);
    assert.ok(battle.data.battle.rounds.length >= 3);

    const factor = await req(base, `/api/live/battles/${battle.data.battle.id}/factor`, {
      method: 'POST',
      token,
      body: { side: 'A', factor: 'likes', amount: 10 }
    });
    assert.equal(factor.status, 200);
    assert.ok(factor.data.world.particles >= 0);

    const challenge = await req(base, '/api/live/challenges', {
      method: 'POST',
      token,
      body: { liveId, title: '1000 likes', kind: 'FREE', goalValue: 1000, durationSec: 60 }
    });
    assert.equal(challenge.status, 201);
    assert.equal(challenge.data.challenge.requiresGifts, false);

    const timer = await req(base, '/api/timers', {
      method: 'POST',
      token,
      body: { scopeType: 'live', scopeId: liveId, kind: 'countdown', durationSec: 45 }
    });
    assert.equal(timer.status, 201);
    assert.equal(timer.data.timer.sync, 'server_time');

    const call = await req(base, '/api/calls', {
      method: 'POST',
      token,
      body: { kind: 'voice', userId: peer }
    });
    assert.equal(call.status, 201);
    const accept = await req(base, `/api/calls/${call.data.call.id}/accept`, {
      method: 'POST',
      token: b.data.token,
      body: {}
    });
    assert.equal(accept.status, 200);
    assert.equal(accept.data.call.status, 'active');

    const translate = await req(base, `/api/calls/${call.data.call.id}/translate`, {
      method: 'POST',
      token,
      body: { targetLang: 'pl', peerConsent: false }
    });
    assert.equal(translate.status, 400);

    const syloraCall = await req(base, '/api/calls/sylora', { method: 'POST', token, body: { mode: 'voice' } });
    assert.equal(syloraCall.status, 201);

    const country = await req(base, '/api/business/country', {
      method: 'POST',
      token,
      body: { countryCode: 'PL' }
    });
    assert.equal(country.data.profile.countryCode, 'PL');

    const invoice = await req(base, '/api/business/invoices', {
      method: 'POST',
      token,
      body: {
        items: [{ description: 'Consulting', quantity: 1, unitNetPrice: 200, taxRate: 23 }],
        seller: { name: 'Host' },
        buyer: { name: 'Client' }
      }
    });
    assert.equal(invoice.status, 201);
    assert.equal(invoice.data.invoice.status, 'draft');

    const finance = await req(base, '/api/business/finance/ask', {
      method: 'POST',
      token,
      body: { query: 'неоплачені фактури' }
    });
    assert.equal(finance.data.canSendWithoutConfirmation, false);

    const tutor = await req(base, '/api/learning/tutor', {
      method: 'POST',
      token,
      body: { subject: 'Math', mode: 'quiz_me', gradedAssignment: true }
    });
    assert.equal(tutor.status, 201);
    assert.equal(tutor.data.policy.canCompleteGradedWorkSilently, false);

    const cite = await req(base, '/api/science/citations', {
      method: 'POST',
      token,
      body: { title: 'Paper', doi: '10.9999/invented', sourceVerified: false }
    });
    assert.equal(cite.data.citation.error, 'doi_not_verified');

    const app = fs.readFileSync('public/app.js', 'utf8');
    assert.match(app, /\/api\/calls/);
    assert.match(app, /Battles 2\.0|Entertainment Engine/i);
    assert.match(app, /\/api\/business\/invoices/);
    assert.match(app, /\/api\/learning\/tutor/);
  } finally {
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
