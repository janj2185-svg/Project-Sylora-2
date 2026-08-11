/**
 * Universal Timer Engine (246–247).
 * One engine for LIVE battles, quizzes, study, pomodoro, exams,
 * meetings, presentations, business time tracking, events.
 * Server-authoritative sync — do not trust client clocks alone.
 */

import { randomUUID } from 'node:crypto';

export const TIMER_KINDS = Object.freeze([
  'countdown',
  'stopwatch',
  'round',
  'break',
  'focus',
  'presentation',
  'scheduled'
]);

export const TIMER_SCOPES = Object.freeze([
  'live', 'battle', 'quiz', 'challenge', 'study', 'exam',
  'meeting', 'presentation', 'business_time', 'event', 'call', 'personal'
]);

export const TIMER_VISIBILITY = Object.freeze(['personal', 'shared']);

export const FOCUS_PRESETS = Object.freeze([
  { id: '25_5', focusMin: 25, breakMin: 5 },
  { id: '50_10', focusMin: 50, breakMin: 10 },
  { id: 'custom', focusMin: null, breakMin: null }
]);

export function createServerTimer({
  id,
  scopeType = 'personal',
  scopeId = null,
  kind = 'countdown',
  durationSec = 60,
  label = '',
  visibility = 'personal',
  ownerId = null,
  warnBeforeSec = null,
  scheduledStartAtMs = null,
  backgroundAllowed = true
} = {}) {
  if (!TIMER_KINDS.includes(kind)) throw new Error('INVALID_TIMER_KIND');
  if (!TIMER_SCOPES.includes(scopeType)) throw new Error('INVALID_TIMER_SCOPE');
  const vis = TIMER_VISIBILITY.includes(visibility) ? visibility : 'personal';
  const serverNow = Date.now();
  const duration = Math.max(1, Number(durationSec) || 60);
  const startMs = kind === 'scheduled' && scheduledStartAtMs
    ? Number(scheduledStartAtMs)
    : serverNow;
  const running = kind !== 'scheduled' || startMs <= serverNow;
  return {
    id: id || `timer_${randomUUID()}`,
    engine: 'timer_engine_v1',
    scopeType,
    scopeId,
    kind,
    label: String(label || kind).slice(0, 80),
    visibility: vis,
    ownerId,
    durationSec: duration,
    startedAtMs: running ? startMs : null,
    endsAtMs: kind === 'stopwatch'
      ? null
      : (running ? startMs + duration * 1000 : (scheduledStartAtMs ? Number(scheduledStartAtMs) + duration * 1000 : null)),
    scheduledStartAtMs: kind === 'scheduled' ? Number(scheduledStartAtMs) || null : null,
    warnBeforeSec: warnBeforeSec == null ? null : Math.max(0, Number(warnBeforeSec) || 0),
    warnFired: false,
    status: running ? 'running' : 'scheduled',
    serverNowMs: serverNow,
    sync: 'server_time',
    backgroundAllowed: Boolean(backgroundAllowed),
    note: 'Clients sync to serverNowMs. Background operation depends on platform/device capabilities.'
  };
}

export function timerSnapshot(timer, nowMs = Date.now()) {
  let status = timer.status;
  let startedAtMs = timer.startedAtMs;
  let endsAtMs = timer.endsAtMs;

  if (status === 'scheduled' && timer.scheduledStartAtMs && nowMs >= timer.scheduledStartAtMs) {
    status = 'running';
    startedAtMs = timer.scheduledStartAtMs;
    if (timer.kind !== 'stopwatch') {
      endsAtMs = startedAtMs + (timer.durationSec || 0) * 1000;
    }
  }

  const remainingMs = endsAtMs == null || status !== 'running' && status !== 'completed'
    ? (endsAtMs == null ? null : Math.max(0, endsAtMs - nowMs))
    : Math.max(0, endsAtMs - nowMs);
  const elapsedMs = startedAtMs == null ? 0 : Math.max(0, nowMs - startedAtMs);

  if (endsAtMs != null && remainingMs === 0 && (status === 'running' || status === 'scheduled' && nowMs >= endsAtMs)) {
    status = 'completed';
  }

  const warnDue = status === 'running'
    && timer.warnBeforeSec != null
    && !timer.warnFired
    && remainingMs != null
    && remainingMs <= timer.warnBeforeSec * 1000
    && remainingMs > 0;

  return {
    ...timer,
    startedAtMs,
    endsAtMs,
    status,
    serverNowMs: nowMs,
    remainingMs: endsAtMs == null ? null : Math.max(0, endsAtMs - nowMs),
    elapsedMs,
    remainingSec: endsAtMs == null ? null : Math.ceil(Math.max(0, endsAtMs - nowMs) / 1000),
    warnDue,
    warnMessage: warnDue
      ? `Warning: ${Math.ceil(remainingMs / 1000)}s remaining on "${timer.label || timer.kind}"`
      : null
  };
}

export function pauseTimer(timer, nowMs = Date.now()) {
  if (timer.status !== 'running') return timer;
  const snap = timerSnapshot(timer, nowMs);
  return {
    ...timer,
    status: 'paused',
    pausedAtMs: nowMs,
    remainingOnPauseMs: snap.remainingMs,
    endsAtMs: snap.endsAtMs
  };
}

export function resumeTimer(timer, nowMs = Date.now()) {
  if (timer.status !== 'paused') return timer;
  const remaining = timer.remainingOnPauseMs;
  return {
    ...timer,
    status: 'running',
    startedAtMs: timer.kind === 'stopwatch' ? timer.startedAtMs : nowMs - (timer.elapsedMs || 0),
    endsAtMs: timer.kind === 'stopwatch' || remaining == null ? null : nowMs + remaining,
    pausedAtMs: null,
    remainingOnPauseMs: null
  };
}

export function createFocusSession({
  id, userId, roomId = null, preset = '25_5', focusMin = 25, breakMin = 5
} = {}) {
  const p = FOCUS_PRESETS.find(x => x.id === preset) || FOCUS_PRESETS[0];
  const f = preset === 'custom' ? Math.max(1, Number(focusMin) || 25) : p.focusMin;
  const b = preset === 'custom' ? Math.max(1, Number(breakMin) || 5) : p.breakMin;
  const sessionId = id || `focus_${randomUUID()}`;
  return {
    id: sessionId,
    userId,
    roomId,
    preset,
    phase: 'focus',
    focusMin: f,
    breakMin: b,
    notificationsMinimized: true,
    aggressiveGamification: false,
    timer: createServerTimer({
      id: `${sessionId}-timer`,
      scopeType: 'study',
      scopeId: roomId || sessionId,
      kind: 'focus',
      durationSec: f * 60,
      label: 'Focus',
      visibility: roomId ? 'shared' : 'personal',
      ownerId: userId
    }),
    startedAtMs: Date.now(),
    status: 'running',
    engine: 'timer_engine_v1'
  };
}

/** Parse natural language for Sylora Time Assistant (247). */
export function parseTimeAssistantIntent(text = '') {
  const q = String(text || '').trim();
  const lower = q.toLowerCase();
  if (!q) return null;

  const minutesMatch = lower.match(/(\d+)\s*(хвилин|хвилини|хв|minut|minutes?|мин)/i);
  const hoursMatch = lower.match(/(\d+)\s*(годин|години|год|hours?|hrs?)/i);
  let durationSec = null;
  if (minutesMatch) durationSec = Number(minutesMatch[1]) * 60;
  if (hoursMatch) durationSec = (durationSec || 0) + Number(hoursMatch[1]) * 3600;

  const warnMatch = lower.match(/(?:за|before|за\s+)(\d+)\s*(хвилин|хв|min)/i);
  const warnBeforeSec = warnMatch ? Number(warnMatch[1]) * 60 : null;

  if (/постав|поставте|set|став|таймер|timer|pomodoro|навчан|study|focus|25/i.test(lower)
    && (durationSec || /25/.test(lower))) {
    const sec = durationSec || 25 * 60;
    return {
      action: 'start_countdown',
      durationSec: sec,
      label: /навчан|study|focus|навчання/i.test(lower) ? 'Study' : 'Timer',
      scopeType: /навчан|study|focus/i.test(lower) ? 'study' : 'personal',
      warnBeforeSec,
      preset: sec === 25 * 60 ? '25_5' : null
    };
  }

  if (/засіч|stopwatch|скільки\s*я\s*прац|track\s*time|time\s*track|хронометр/i.test(lower)) {
    return {
      action: 'start_stopwatch',
      label: /проєкт|project/i.test(lower) ? 'Project work' : 'Work',
      scopeType: /проєкт|project|бізнес|business/i.test(lower) ? 'business_time' : 'personal',
      projectHint: true
    };
  }

  if (/поперед|warn|нагад|remind/i.test(lower) && (warnBeforeSec || durationSec)) {
    return {
      action: 'start_countdown',
      durationSec: durationSec || 30 * 60,
      label: /презентац|presentation/i.test(lower) ? 'Presentation' : 'Timed session',
      scopeType: /презентац|presentation/i.test(lower) ? 'presentation' : 'personal',
      warnBeforeSec: warnBeforeSec || 5 * 60
    };
  }

  return null;
}

export function sharedEnginesCatalog() {
  return {
    timer: 'timer_engine_v1',
    note: 'Reuse this engine — do not fork per-module timers.',
    scopes: TIMER_SCOPES,
    kinds: TIMER_KINDS
  };
}
