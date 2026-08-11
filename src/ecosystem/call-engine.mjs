/**
 * Shared Call Engine — DM voice/video, group calls, Sylora call.
 * Reuses WebRTC/realtime infrastructure; no decorative Call buttons.
 */

export const CALL_KINDS = Object.freeze(['voice', 'video', 'group_voice', 'group_video', 'sylora']);

export function createCallSession({
  id, kind = 'voice', initiatorId, participantIds = [], conversationId = null, groupId = null
} = {}) {
  if (!CALL_KINDS.includes(kind)) throw new Error('INVALID_CALL_KIND');
  const participants = [...new Set([initiatorId, ...participantIds])].slice(0, 16).map(userId => ({
    userId,
    status: userId === initiatorId ? 'joined' : 'ringing',
    muted: false,
    cameraOn: kind.includes('video') || kind === 'sylora' ? false : null,
    joinedAt: userId === initiatorId ? new Date().toISOString() : null
  }));
  return {
    id,
    kind,
    conversationId,
    groupId,
    initiatorId,
    participants,
    status: 'ringing',
    startedAt: new Date().toISOString(),
    answeredAt: null,
    endedAt: null,
    durationSec: 0,
    networkQuality: 'unknown',
    reconnectCount: 0,
    translation: null,
    signaling: 'webrtc_shared',
    historyRecorded: true
  };
}

export function acceptCall(call, userId) {
  const p = call.participants.find(x => x.userId === userId);
  if (!p) return { ok: false, error: 'NOT_PARTICIPANT' };
  if (call.status === 'ended') return { ok: false, error: 'CALL_ENDED' };
  p.status = 'joined';
  p.joinedAt = new Date().toISOString();
  if (call.status === 'ringing') {
    call.status = 'active';
    call.answeredAt = p.joinedAt;
  }
  return { ok: true, call };
}

export function declineCall(call, userId) {
  const p = call.participants.find(x => x.userId === userId);
  if (!p) return { ok: false, error: 'NOT_PARTICIPANT' };
  p.status = 'declined';
  if (call.participants.every(x => x.status !== 'ringing' && x.userId !== call.initiatorId)) {
    call.status = 'missed';
    call.endedAt = new Date().toISOString();
  }
  return { ok: true, call };
}

export function endCall(call, userId) {
  const p = call.participants.find(x => x.userId === userId);
  if (!p && call.kind !== 'sylora') return { ok: false, error: 'NOT_PARTICIPANT' };
  call.status = call.status === 'ringing' ? 'missed' : 'ended';
  call.endedAt = new Date().toISOString();
  if (call.answeredAt) {
    call.durationSec = Math.max(0, Math.round((Date.parse(call.endedAt) - Date.parse(call.answeredAt)) / 1000));
  }
  return { ok: true, call };
}

export function setCallMedia(call, userId, { muted, cameraOn } = {}) {
  const p = call.participants.find(x => x.userId === userId);
  if (!p) return { ok: false, error: 'NOT_PARTICIPANT' };
  if (typeof muted === 'boolean') p.muted = muted;
  if (typeof cameraOn === 'boolean' && p.cameraOn !== null) p.cameraOn = cameraOn;
  return { ok: true, call };
}

/** Explicit bilateral consent required for translation. */
export function enableCallTranslation(call, { userId, targetLang, peerConsent = false, mode = 'subtitles' } = {}) {
  if (!peerConsent) {
    return { ok: false, error: 'PEER_CONSENT_REQUIRED', note: 'Both parties must explicitly allow translation.' };
  }
  call.translation = {
    enabled: true,
    requestedBy: userId,
    targetLang: String(targetLang || 'en').slice(0, 8),
    mode: mode === 'speech' ? 'speech' : 'subtitles',
    aiLabeled: true,
    syntheticAudioDisclosure: mode === 'speech'
      ? 'SYNTHETIC TRANSLATED AUDIO — not the speaker’s real voice'
      : null,
    status: process.env.OPENAI_API_KEY || process.env.SYLORA_TRANSLATE_API_KEY ? 'ready' : 'setup_required'
  };
  return { ok: true, call };
}

export function createSyloraCall({ id, userId, mode = 'voice' } = {}) {
  return {
    id,
    kind: 'sylora',
    userId,
    mode: mode === 'video' ? 'video' : 'voice',
    status: 'active',
    fullscreen: true,
    avatarReactive: true,
    cameraPermission: false,
    screenSharePermission: false,
    startedAt: new Date().toISOString(),
    endedAt: null,
    note: 'Conversation presence mode — not a thin voice chatbot shell.',
    signaling: 'openai_realtime_or_webrtc'
  };
}

export function callHistoryEntry(call) {
  return {
    id: call.id,
    kind: call.kind,
    status: call.status,
    initiatorId: call.initiatorId || call.userId,
    participantIds: (call.participants || []).map(p => p.userId),
    conversationId: call.conversationId || null,
    startedAt: call.startedAt,
    answeredAt: call.answeredAt || null,
    endedAt: call.endedAt || null,
    durationSec: call.durationSec || 0,
    missed: call.status === 'missed'
  };
}

/** Caller cancels while still ringing. */
export function cancelOutgoingCall(call, userId) {
  if (!call) return { ok: false, error: 'CALL_NOT_FOUND' };
  if (call.initiatorId !== userId) return { ok: false, error: 'ONLY_INITIATOR' };
  if (call.status !== 'ringing') return { ok: false, error: 'NOT_RINGING' };
  call.status = 'cancelled';
  call.endedAt = new Date().toISOString();
  for (const p of call.participants || []) {
    if (p.status === 'ringing') p.status = 'cancelled';
  }
  return { ok: true, call };
}

/** Ring timeout → missed (no answer). */
export function applyRingTimeout(call, { now = Date.now(), timeoutMs = 45_000 } = {}) {
  if (!call || call.status !== 'ringing') return { ok: false, timedOut: false, call };
  const started = Date.parse(call.startedAt || 0);
  if (!Number.isFinite(started) || now - started < timeoutMs) {
    return { ok: true, timedOut: false, call };
  }
  call.status = 'missed';
  call.endedAt = new Date(now).toISOString();
  call.timeoutReason = 'ring_timeout';
  for (const p of call.participants || []) {
    if (p.status === 'ringing') p.status = 'missed';
  }
  return { ok: true, timedOut: true, call };
}

/** Valid signaling kinds for the shared Call Engine WebRTC path. */
export const CALL_SIGNAL_KINDS = Object.freeze(['peer-join', 'offer', 'answer', 'ice', 'peer-left']);

export function validateCallSignal(payload = {}) {
  const kind = String(payload.kind || '');
  if (!CALL_SIGNAL_KINDS.includes(kind)) return { ok: false, error: 'INVALID_SIGNAL_KIND' };
  if (!payload.fromPeerId) return { ok: false, error: 'FROM_PEER_REQUIRED' };
  if ((kind === 'offer' || kind === 'answer' || kind === 'ice') && !payload.toPeerId) {
    return { ok: false, error: 'TO_PEER_REQUIRED' };
  }
  return { ok: true, kind };
}

/** Minimal state machine helper for tests / route guards. */
export function nextCallStatus(current, action) {
  const table = {
    ringing: { accept: 'active', decline: 'missed', end: 'missed', cancel: 'cancelled', timeout: 'missed' },
    active: { end: 'ended', media: 'active' },
    missed: {},
    ended: {},
    cancelled: {}
  };
  const next = table[current]?.[action];
  return next || current;
}
