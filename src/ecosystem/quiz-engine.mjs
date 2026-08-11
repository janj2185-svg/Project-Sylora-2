/**
 * Shared Quiz Engine (253).
 * Learning Quiz · LIVE Quiz · Science Quiz — one engine, different context/permissions/UI.
 */

import { randomUUID } from 'node:crypto';

export const QUIZ_CONTEXTS = Object.freeze(['learning', 'live', 'science', 'community', 'conference']);

export const QUESTION_TYPES = Object.freeze([
  'multiple_choice', 'open', 'true_false', 'matching', 'numeric'
]);

export function createQuiz({
  id,
  context = 'learning',
  ownerId = null,
  spaceId = null, // liveId | courseId | conferenceId | communityId
  title = '',
  questions = [],
  timerSec = null,
  randomizeOrder = false,
  teamMode = false,
  permissions = null
} = {}) {
  if (!QUIZ_CONTEXTS.includes(context)) throw new Error('INVALID_QUIZ_CONTEXT');
  const quizId = id || `quiz_${randomUUID()}`;
  const qs = (questions || []).slice(0, 100).map((q, i) => normalizeQuestion(q, i));
  return {
    id: quizId,
    engine: 'quiz_engine_v1',
    context,
    ownerId,
    spaceId,
    title: String(title || 'Quiz').slice(0, 200),
    questions: qs,
    timerSec: timerSec == null ? null : Math.max(5, Number(timerSec) || 30),
    randomizeOrder: Boolean(randomizeOrder),
    teamMode: Boolean(teamMode),
    answers: [],
    status: 'ready',
    permissions: permissions || defaultPermissions(context),
    examIntegrity: {
      fakeAiCheatingDetector: false,
      transparentRulesOnly: true,
      note: 'No claim that AI can reliably detect authorship.'
    },
    createdAt: new Date().toISOString()
  };
}

function defaultPermissions(context) {
  return {
    canCreate: ['host', 'teacher', 'owner', 'moderator'],
    canAnswer: context === 'live' ? ['audience', 'speaker'] : ['student', 'participant', 'member'],
    canGrade: ['teacher', 'host', 'owner'],
    context
  };
}

function normalizeQuestion(q = {}, order = 0) {
  const type = QUESTION_TYPES.includes(q.type) ? q.type : 'multiple_choice';
  return {
    id: q.id || `q_${randomUUID()}`,
    type,
    prompt: String(q.prompt || '').slice(0, 2000),
    options: (q.options || []).map(o => String(o).slice(0, 200)).slice(0, 8),
    answer: q.answer ?? q.correctIndex ?? null,
    points: Number(q.points) || 10,
    order
  };
}

export function openQuiz(quiz, { durationSec = null } = {}) {
  const dur = durationSec ?? quiz.timerSec;
  quiz.status = 'open';
  quiz.startedAt = new Date().toISOString();
  quiz.endsAt = dur ? new Date(Date.now() + dur * 1000).toISOString() : null;
  quiz.timerRef = quiz.timerRef || null;
  return quiz;
}

export function submitAnswer(quiz, { userId, questionId, value, teamId = null } = {}) {
  if (quiz.status !== 'open') throw new Error('QUIZ_NOT_OPEN');
  const question = quiz.questions.find(q => q.id === questionId);
  if (!question) throw new Error('QUESTION_NOT_FOUND');
  const correct = gradeAnswer(question, value);
  const prevCorrect = quiz.answers.filter(a => a.userId === userId && a.correct).length;
  const entry = {
    userId,
    teamId,
    questionId,
    value,
    correct,
    points: correct ? question.points + Math.min(5, prevCorrect) : 0,
    streakBonus: correct ? prevCorrect : 0,
    at: new Date().toISOString()
  };
  quiz.answers.push(entry);
  return entry;
}

function gradeAnswer(question, value) {
  if (question.type === 'open') return null; // teacher grades
  if (question.type === 'numeric') {
    const expected = Number(question.answer);
    const got = Number(value);
    return Number.isFinite(expected) && Number.isFinite(got) && Math.abs(expected - got) < 1e-6;
  }
  if (question.type === 'true_false' || question.type === 'multiple_choice') {
    if (typeof question.answer === 'number') return Number(value) === question.answer;
    return String(value).toLowerCase() === String(question.answer).toLowerCase();
  }
  return String(value) === String(question.answer);
}

export function quizLeaderboard(quiz, { teamMode = false } = {}) {
  const map = new Map();
  for (const a of quiz.answers || []) {
    const key = teamMode && a.teamId ? `team:${a.teamId}` : `user:${a.userId}`;
    const row = map.get(key) || {
      key,
      userId: a.userId,
      teamId: a.teamId || null,
      points: 0,
      correct: 0,
      streak: 0
    };
    if (a.correct) {
      row.points += a.points || 0;
      row.correct += 1;
      row.streak += 1;
    } else if (a.correct === false) {
      row.streak = 0;
    }
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => b.points - a.points).slice(0, 50);
}

export function adaptLiveQuizToEngine(liveQuiz) {
  return createQuiz({
    id: liveQuiz.id,
    context: 'live',
    ownerId: liveQuiz.hostId,
    spaceId: liveQuiz.liveId,
    title: liveQuiz.question?.slice(0, 80) || 'LIVE Quiz',
    questions: [{
      id: `${liveQuiz.id}-q0`,
      type: 'multiple_choice',
      prompt: liveQuiz.question,
      options: liveQuiz.options,
      answer: liveQuiz.correctIndex,
      points: 10
    }],
    timerSec: liveQuiz.durationSec,
    teamMode: !!liveQuiz.teamMode
  });
}
