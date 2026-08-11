/**
 * Fun social rooms, community events, safe discovery, achievements, seasonal LIVE (248–252).
 * Reuses LIVE + Event + Timer + Quiz primitives — no monetization requirement.
 */

import { randomUUID } from 'node:crypto';

export const FUN_ROOM_KINDS = Object.freeze([
  'coffee',
  'late_night_talk',
  'language_exchange',
  'quiz_night',
  'watch_discussion',
  'creator_meetup'
]);

export const COMMUNITY_EVENT_KINDS = Object.freeze([
  'tournament',
  'quiz',
  'talent_show',
  'debate',
  'workshop',
  'study_session',
  'creator_night'
]);

export const ACHIEVEMENT_DOMAINS = Object.freeze([
  'creator', 'learning', 'community', 'science', 'business'
]);

/** Domain-scoped achievements — never a single global human ranking. */
export const ACHIEVEMENT_CATALOG = Object.freeze([
  { id: 'first_course', domain: 'learning', title: 'Completed first course', antiToxic: true },
  { id: 'first_live', domain: 'creator', title: 'Hosted first LIVE', antiToxic: true },
  { id: 'first_research', domain: 'science', title: 'Published first research project', antiToxic: true },
  { id: 'community_contributor', domain: 'community', title: 'Community contributor', antiToxic: true },
  { id: 'first_invoice', domain: 'business', title: 'Issued first invoice draft', antiToxic: true },
  { id: 'study_streak_gentle', domain: 'learning', title: 'Steady study week', antiToxic: true }
]);

export function createFunSocialRoom({
  id,
  hostId,
  kind = 'coffee',
  title = '',
  liveId = null,
  conferenceId = null
} = {}) {
  if (!FUN_ROOM_KINDS.includes(kind)) throw new Error('INVALID_FUN_ROOM');
  return {
    id: id || `fun_${randomUUID()}`,
    hostId,
    kind,
    title: String(title || kind.replace(/_/g, ' ')).slice(0, 120),
    liveId,
    conferenceId,
    requiresGifts: false,
    monetizationRequired: false,
    engine: 'shared_live_realtime',
    createdAt: new Date().toISOString()
  };
}

export function createCommunityEvent({
  id,
  communityId,
  hostId,
  kind = 'workshop',
  title = '',
  startsAt = null,
  liveId = null,
  quizId = null,
  timerId = null
} = {}) {
  if (!COMMUNITY_EVENT_KINDS.includes(kind)) throw new Error('INVALID_COMMUNITY_EVENT');
  return {
    id: id || `cevt_${randomUUID()}`,
    communityId,
    hostId,
    kind,
    title: String(title || kind.replace(/_/g, ' ')).slice(0, 160),
    startsAt,
    liveId,
    quizId,
    timerId,
    eventRef: true,
    primitives: ['live', 'event', 'timer_engine_v1', 'quiz_engine_v1'],
    requiresGifts: false,
    createdAt: new Date().toISOString()
  };
}

/**
 * Safe interest-based discovery — NOT anonymous random video chat.
 */
export function createDiscoveryProfile({
  userId,
  languages = [],
  interests = [],
  communities = [],
  topics = [],
  optIn = false
} = {}) {
  return {
    userId,
    languages: (languages || []).slice(0, 12),
    interests: (interests || []).slice(0, 30),
    communities: (communities || []).slice(0, 30),
    topics: (topics || []).slice(0, 30),
    optIn: Boolean(optIn),
    safety: {
      anonymousRandomVideoChat: false,
      blockReportRequired: true,
      moderationRequired: true,
      userControlsParticipation: true
    },
    updatedAt: new Date().toISOString()
  };
}

export function matchDiscovery(profile, candidates = []) {
  if (!profile?.optIn) {
    return { matches: [], note: 'User has not opted in to discovery.' };
  }
  const score = (other) => {
    if (!other.optIn || other.userId === profile.userId) return 0;
    let s = 0;
    const overlap = (a = [], b = []) => a.filter(x => b.map(String).map(y => y.toLowerCase()).includes(String(x).toLowerCase())).length;
    s += overlap(profile.languages, other.languages) * 3;
    s += overlap(profile.interests, other.interests) * 2;
    s += overlap(profile.topics, other.topics) * 2;
    s += overlap(profile.communities, other.communities);
    return s;
  };
  const matches = candidates
    .map(c => ({ userId: c.userId, score: score(c), languages: c.languages, interests: c.interests }))
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);
  return {
    matches,
    mode: 'interest_based',
    forbidden: 'anonymous_random_video_chat',
    safety: profile.safety
  };
}

export function evaluateAchievements({
  domain = null,
  signals = {}
} = {}) {
  const unlocked = [];
  for (const a of ACHIEVEMENT_CATALOG) {
    if (domain && a.domain !== domain) continue;
    if (a.id === 'first_course' && signals.coursesCompleted >= 1) unlocked.push(a);
    if (a.id === 'first_live' && signals.livesHosted >= 1) unlocked.push(a);
    if (a.id === 'first_research' && signals.researchPublished >= 1) unlocked.push(a);
    if (a.id === 'community_contributor' && signals.communityActions >= 5) unlocked.push(a);
    if (a.id === 'first_invoice' && signals.invoicesDrafted >= 1) unlocked.push(a);
    if (a.id === 'study_streak_gentle' && signals.studyDays >= 5) unlocked.push(a);
  }
  return {
    unlocked,
    globalHumanRanking: false,
    note: 'Achievements are domain-scoped. Toxic engagement bait is not rewarded.',
    antiPatterns: ['rage_bait_rewards', 'spam_like_farming', 'pay_to_win_status']
  };
}

export function createSeasonalLiveEvent({
  id,
  title = '',
  theme = '',
  startsAt = null,
  endsAt = null,
  visualEnvironment = null,
  challengeIds = [],
  tournamentIds = []
} = {}) {
  return {
    id: id || `season_${randomUUID()}`,
    title: String(title || 'Seasonal LIVE').slice(0, 160),
    theme: String(theme || '').slice(0, 80),
    startsAt,
    endsAt,
    visualEnvironment,
    challengeIds: challengeIds || [],
    tournamentIds: tournamentIds || [],
    assets: {
      modular: true,
      loadStrategy: 'lazy_event_pack',
      note: 'Event assets load modularly — must not inflate the main app bundle.'
    },
    engine: 'live_entertainment + event_engine',
    createdAt: new Date().toISOString()
  };
}

export const SHARED_ENGINE_REGISTRY = Object.freeze({
  call: 'call_engine',
  live: 'live_entertainment + live_fanout',
  realtime: 'realtime_fanout',
  space: 'spaces_adapter',
  timer: 'timer_engine_v1',
  quiz: 'quiz_engine_v1',
  event: 'platform_events',
  document: 'org_documents + collaborative_documents',
  payment_finance: 'business_finance (not a bank)',
  notification: 'store.notify + user events SSE',
  search: 'search.mjs universal/semantic',
  sylora_intelligence: 'sylora-os + platform-core'
});

export const PRIORITY_ORDER = Object.freeze({
  P0: [
    'private_voice_video_calls',
    'call_engine',
    'live_stability',
    'sylora_intelligence',
    'navigation_consolidation',
    'mobile_bugs',
    'auth',
    'security'
  ],
  P1: [
    'live_entertainment',
    'resonance_battles',
    'timer_engine',
    'learning_core',
    'business_invoices_quotes_expenses',
    'science_library_research'
  ],
  P2: [
    'advanced_accounting',
    'legal_workspace',
    'teacher_tools',
    'scientific_tools',
    'conference_engine',
    'mini_games'
  ],
  P3: ['advanced_ecosystem_features'],
  rule: 'Finish shared engine dependencies before features that consume them. No decorative placeholder pages.'
});

export const QA_CHECKLIST = Object.freeze([
  'REAL_UI',
  'REAL_BACKEND',
  'REAL_DATABASE_OR_STORE',
  'PERMISSIONS',
  'MOBILE',
  'TABLET',
  'DESKTOP',
  'LOADING',
  'EMPTY',
  'ERROR',
  'TESTS',
  'VOICE_VIDEO_TWO_SESSIONS',
  'TIMER_SERVER_SYNC',
  'INVOICE_CALC_ROUNDING_PDF',
  'LEARNING_STUDENT_TEACHER',
  'SCIENCE_CITATIONS_INTEGRITY',
  'BUSINESS_OWNER_EMPLOYEE_ACCOUNTANT'
]);
