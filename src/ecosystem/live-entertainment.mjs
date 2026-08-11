/**
 * SYLORA LIVE Entertainment Engine — shared LIVE/realtime core extensions.
 * Does not fork a second WebSocket/SSE stack.
 * Timers come from Universal Timer Engine (246) — re-exported for compatibility.
 */

export {
  TIMER_KINDS,
  FOCUS_PRESETS,
  createServerTimer,
  timerSnapshot,
  createFocusSession
} from './timer-engine.mjs';

export const BATTLE_MODES = Object.freeze([
  '1v1', '2v2', '3v3', 'team_vs_team', 'creator_vs_community',
  'tournament', 'survival', 'king_of_resonance'
]);

export const BATTLE_ROUND_KINDS = Object.freeze([
  'likes', 'community_interaction', 'gifts', 'challenges', 'quiz', 'resonance_storm'
]);

export const LIVE_ROOM_KINDS = Object.freeze([
  'talk', 'music', 'debate', 'study', 'business', 'science', 'game', 'community', 'standard'
]);

export const STAGE_ROLES = Object.freeze(['host', 'speaker', 'audience']);

export const MINI_GAMES = Object.freeze([
  'trivia', 'guess_image', 'word_challenge', 'reaction_race',
  'memory_challenge', 'prediction_nofiat', 'team_puzzle', 'creator_challenge'
]);

export const CHALLENGE_KINDS = Object.freeze(['FREE', 'COMMUNITY', 'CREATOR', 'BATTLE']);

/** Multi-factor scoring — not gift-spend-only. */
export function scoreBattleSide({
  likes = 0, gifts = 0, comments = 0, challengePoints = 0, quizPoints = 0, teamParticipation = 0
} = {}) {
  return Math.round(
    likes * 1 +
    comments * 2 +
    challengePoints * 3 +
    quizPoints * 3 +
    teamParticipation * 2 +
    Math.sqrt(Math.max(0, gifts)) * 4 // gifts matter, but diminishing — not pure pay-to-win
  );
}

export function createBattlePlan({
  id, hostLiveId, opponentLiveId = null, mode = '1v1', teamA = [], teamB = [],
  rounds = null, durationSec = 180
} = {}) {
  if (!BATTLE_MODES.includes(mode)) throw new Error('INVALID_BATTLE_MODE');
  const defaultRounds = [
    { index: 1, kind: 'likes', label: 'ROUND 1 — Likes', weight: 1 },
    { index: 2, kind: 'community_interaction', label: 'ROUND 2 — Community interaction', weight: 1 },
    { index: 3, kind: 'gifts', label: 'ROUND 3 — Gifts', weight: 1 },
    { index: 4, kind: 'resonance_storm', label: 'FINAL — Resonance Storm', weight: 1.5 }
  ];
  const list = (rounds || defaultRounds).slice(0, 12).map((r, i) => ({
    index: r.index || i + 1,
    kind: BATTLE_ROUND_KINDS.includes(r.kind) ? r.kind : 'likes',
    label: String(r.label || `Round ${i + 1}`).slice(0, 80),
    weight: Number(r.weight) || 1,
    scoreA: 0,
    scoreB: 0,
    status: i === 0 ? 'active' : 'pending'
  }));
  const startedAt = new Date().toISOString();
  return {
    id,
    hostLiveId,
    opponentLiveId,
    mode,
    teamA: teamA.slice(0, 12),
    teamB: teamB.slice(0, 12),
    rounds: list,
    currentRound: 1,
    status: 'live',
    hostScore: 0,
    opponentScore: 0,
    factors: { likes: 0, gifts: 0, comments: 0, challengePoints: 0, quizPoints: 0, teamParticipation: 0 },
    opponentFactors: { likes: 0, gifts: 0, comments: 0, challengePoints: 0, quizPoints: 0, teamParticipation: 0 },
    comebackEvents: [],
    startedAt,
    endsAt: new Date(Date.now() + durationSec * 1000).toISOString(),
    endedAt: null,
    fairness: {
      note: 'Victory is multi-factor. Comeback events are presentation-only — no hidden score manipulation.'
    }
  };
}

export function applyBattleFactor(battle, side, factor, amount = 1) {
  const key = side === 'B' ? 'opponentFactors' : 'factors';
  const bag = battle[key];
  if (!(factor in bag)) return battle;
  bag[factor] = (bag[factor] || 0) + Math.max(0, Number(amount) || 0);
  const scoreA = scoreBattleSide(battle.factors);
  const scoreB = scoreBattleSide(battle.opponentFactors);
  const prevLead = battle.hostScore - battle.opponentScore;
  battle.hostScore = scoreA;
  battle.opponentScore = scoreB;
  const nextLead = scoreA - scoreB;
  // Comeback presentation: trailing side closes a large gap quickly
  if (prevLead <= -40 && nextLead > prevLead + 25 && side === 'A') {
    battle.comebackEvents.push({
      at: new Date().toISOString(),
      side: 'A',
      kind: 'COMEBACK_EVENT',
      visual: 'comeback_surge',
      scoreImpact: 0,
      note: 'Presentation/atmosphere only'
    });
  }
  if (prevLead >= 40 && nextLead < prevLead - 25 && side === 'B') {
    battle.comebackEvents.push({
      at: new Date().toISOString(),
      side: 'B',
      kind: 'COMEBACK_EVENT',
      visual: 'comeback_surge',
      scoreImpact: 0,
      note: 'Presentation/atmosphere only'
    });
  }
  // Update active round cosmetic scores
  const round = battle.rounds.find(r => r.status === 'active');
  if (round) {
    if (side === 'B') round.scoreB = scoreBattleSide({ [factor]: bag[factor] });
    else round.scoreA = scoreBattleSide({ [factor]: bag[factor] });
  }
  return battle;
}

export function advanceBattleRound(battle) {
  const current = battle.rounds.find(r => r.status === 'active');
  if (current) current.status = 'completed';
  const next = battle.rounds.find(r => r.status === 'pending');
  if (!next) {
    battle.status = 'ended';
    battle.endedAt = new Date().toISOString();
    return battle;
  }
  next.status = 'active';
  battle.currentRound = next.index;
  return battle;
}

/** Resonance World visual language from engagement — presentation layer. */
export function resonanceWorldState({
  likes = 0, comments = 0, followers = 0, gifts = 0, battleLead = 0, comeback = false, victory = false
} = {}) {
  const intensity = Math.min(1, (likes * 0.002 + comments * 0.01 + gifts * 0.001 + Math.abs(battleLead) * 0.005));
  return {
    particles: Math.min(500, Math.floor(likes * 0.4)),
    energyPulses: Math.min(40, comments),
    lightWaves: Math.min(20, followers),
    cinematicEvents: Math.min(10, Math.floor(Math.sqrt(gifts))),
    environment: battleLead > 30 ? 'lead_transformation' : battleLead < -30 ? 'pressure_zone' : 'neutral_orbit',
    special: victory ? 'full_screen_finale' : comeback ? 'comeback_visual' : null,
    intensity,
    language: 'sylora_resonance_world_v1',
    note: 'Visual atmosphere driven by realtime engagement — not a separate LIVE stack.'
  };
}

export function createLiveChallenge({
  id, liveId, hostId, title, kind = 'FREE', goalType = 'likes', goalValue = 1000, durationSec = 60
} = {}) {
  if (!CHALLENGE_KINDS.includes(kind)) throw new Error('INVALID_CHALLENGE_KIND');
  return {
    id,
    liveId,
    hostId,
    title: String(title || 'Challenge').slice(0, 120),
    kind,
    goalType, // likes | quiz | community_goal | reaction | team_mission
    goalValue: Math.max(1, Number(goalValue) || 1),
    progress: 0,
    status: 'active',
    requiresGifts: false,
    startedAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + durationSec * 1000).toISOString()
  };
}

export function createLiveQuiz({
  id, liveId, hostId, question, options = [], correctIndex = 0, durationSec = 30, teamMode = false, createdBy = 'host'
} = {}) {
  const opts = options.map(o => String(o).slice(0, 120)).slice(0, 6);
  if (opts.length < 2) throw new Error('QUIZ_OPTIONS_REQUIRED');
  return {
    id,
    liveId,
    hostId,
    question: String(question || '').slice(0, 400),
    options: opts,
    correctIndex: Math.max(0, Math.min(opts.length - 1, Number(correctIndex) || 0)),
    durationSec,
    teamMode: !!teamMode,
    createdBy, // host | sylora
    answers: [],
    status: 'open',
    startedAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + durationSec * 1000).toISOString()
  };
}

export function quizLeaderboard(quiz) {
  const byUser = new Map();
  for (const a of quiz.answers || []) {
    const row = byUser.get(a.userId) || { userId: a.userId, points: 0, streak: 0, correct: 0 };
    if (a.correct) {
      row.points += 10 + Math.min(5, a.streakBonus || 0);
      row.streak += 1;
      row.correct += 1;
    } else row.streak = 0;
    byUser.set(a.userId, row);
  }
  return [...byUser.values()].sort((a, b) => b.points - a.points).slice(0, 50);
}

export function createMiniGameSession({
  id, liveId, hostId, game = 'trivia', config = {}
} = {}) {
  if (!MINI_GAMES.includes(game)) throw new Error('INVALID_MINI_GAME');
  if (game === 'prediction_nofiat') {
    config = { ...config, realMoneyBetting: false, note: 'Prediction only — no gambling / real-money bets' };
  }
  return {
    id,
    liveId,
    hostId,
    game,
    engine: 'mini_game_engine',
    config,
    status: 'ready',
    gambling: false,
    createdAt: new Date().toISOString()
  };
}

export function createAudienceVsSylora({
  id, liveId, hostId, format = 'knowledge_quiz', questions = []
} = {}) {
  return {
    id,
    liveId,
    hostId,
    format, // knowledge_quiz | riddles | language | logic
    questions: questions.slice(0, 40),
    audienceScore: 0,
    syloraScore: 0,
    status: 'ready',
    policy: {
      factualAccuracy: true,
      note: 'Sylora must not intentionally give false facts.'
    },
    createdAt: new Date().toISOString()
  };
}

export function createCoHostControl({
  liveId, hostId, autonomy = 'assist'
} = {}) {
  const levels = ['off', 'assist', 'quiz_host', 'announce', 'full_assist'];
  return {
    liveId,
    hostId,
    autonomy: levels.includes(autonomy) ? autonomy : 'assist',
    can: {
      runQuiz: autonomy !== 'off',
      readQuestions: autonomy !== 'off',
      translate: autonomy !== 'off',
      announceRounds: ['quiz_host', 'announce', 'full_assist'].includes(autonomy),
      summarize: autonomy !== 'off',
      voiceReact: ['announce', 'full_assist'].includes(autonomy),
      createChallenges: autonomy === 'full_assist'
    },
    speakAsStreamer: false,
    note: 'Streamer controls Sylora autonomy. Sylora never impersonates the host.'
  };
}

export function createLiveRoomProfile({
  id, liveId, kind = 'standard', title = '', hostId
} = {}) {
  if (!LIVE_ROOM_KINDS.includes(kind)) throw new Error('INVALID_LIVE_ROOM_KIND');
  return {
    id,
    liveId,
    kind,
    title: String(title || kind).slice(0, 120),
    hostId,
    engine: 'shared_live_realtime',
    createdAt: new Date().toISOString()
  };
}

export function createStageState({ liveId, hostId } = {}) {
  return {
    liveId,
    hostId,
    speakers: [{ userId: hostId, role: 'host' }],
    raisedHands: [],
    audienceCount: 0,
    updatedAt: new Date().toISOString()
  };
}

export function stageRaiseHand(stage, userId) {
  if (!stage.raisedHands.includes(userId) && !stage.speakers.some(s => s.userId === userId)) {
    stage.raisedHands.push(userId);
  }
  stage.updatedAt = new Date().toISOString();
  return stage;
}

export function stageInvite(stage, userId) {
  stage.raisedHands = stage.raisedHands.filter(id => id !== userId);
  if (!stage.speakers.some(s => s.userId === userId)) {
    stage.speakers.push({ userId, role: 'speaker', muted: false });
  }
  stage.updatedAt = new Date().toISOString();
  return stage;
}

export function stageRemove(stage, userId, hostId) {
  if (userId === hostId) return stage;
  stage.speakers = stage.speakers.filter(s => s.userId !== userId);
  stage.updatedAt = new Date().toISOString();
  return stage;
}

/* Timer helpers live in timer-engine.mjs and are re-exported above. */
