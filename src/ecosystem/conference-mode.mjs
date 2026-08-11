/**
 * Shared Conference Mode (245) for Science · Business · Education.
 * Extends existing conference rooms — does not fork three conference stacks.
 */

import { randomUUID } from 'node:crypto';

export const CONFERENCE_KINDS = Object.freeze(['science', 'business', 'education']);

export function createConferenceProgram({
  conferenceId,
  kind = 'science',
  agenda = [],
  speakers = [],
  sessions = [],
  documents = [],
  translationEnabled = false
} = {}) {
  if (!CONFERENCE_KINDS.includes(kind)) throw new Error('INVALID_CONFERENCE_KIND');
  return {
    id: `confprog_${randomUUID()}`,
    conferenceId,
    kind,
    engine: 'conference_engine_shared',
    agenda: (agenda || []).slice(0, 100).map((a, i) => ({
      id: a.id || `ag_${i + 1}`,
      title: String(a.title || `Item ${i + 1}`).slice(0, 200),
      startsAt: a.startsAt || null,
      durationMin: a.durationMin || null
    })),
    speakers: (speakers || []).slice(0, 50).map(s => ({
      userId: s.userId || null,
      name: String(s.name || '').slice(0, 120),
      role: s.role || 'speaker'
    })),
    sessions: (sessions || []).slice(0, 50).map(s => ({
      id: s.id || `sess_${randomUUID()}`,
      title: String(s.title || 'Session').slice(0, 200),
      liveId: s.liveId || null,
      startsAt: s.startsAt || null,
      qaEnabled: s.qaEnabled !== false,
      networkingEnabled: !!s.networkingEnabled
    })),
    documents: (documents || []).slice(0, 100),
    recordings: [],
    qa: [],
    networking: { enabled: false, notes: 'Opt-in networking — no forced matching' },
    translation: {
      enabled: !!translationEnabled,
      aiLabeled: true,
      note: 'Translation is optional and labeled AI when used.'
    },
    primitives: {
      live: true,
      timer: 'timer_engine_v1',
      quiz: 'quiz_engine_v1',
      call: 'call_engine',
      documents: 'document_engine',
      realtime: 'shared_conference_fanout'
    },
    createdAt: new Date().toISOString()
  };
}

export function addConferenceQa(program, { userId, text, sessionId = null } = {}) {
  const item = {
    id: `qa_${randomUUID()}`,
    userId,
    sessionId,
    text: String(text || '').slice(0, 2000),
    createdAt: new Date().toISOString(),
    answered: false
  };
  program.qa.push(item);
  return item;
}

export function attachRecording(program, { url = '', title = '', sessionId = null } = {}) {
  const rec = {
    id: `rec_${randomUUID()}`,
    url: String(url || '').slice(0, 2000),
    title: String(title || 'Recording').slice(0, 200),
    sessionId,
    createdAt: new Date().toISOString()
  };
  program.recordings.push(rec);
  return rec;
}
