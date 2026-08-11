/**
 * Voice turn-taking policy (VAD → STT → decision hooks).
 * Actual mic/STT/TTS need browser permissions + OPENAI realtime (BLOCKED without key).
 */

export function createTurnTakingState() {
  return {
    hostSpeaking: false,
    syloraSpeaking: false,
    lastVadAt: 0,
    lastTranscript: '',
    addressedToSylora: false,
    guestSpeaking: false,
    pauseMs: 0
  };
}

export function applyVadFrame(state, { speaking = false, rms = 0, now = Date.now() } = {}) {
  const next = { ...state };
  if (speaking || rms > 0.02) {
    next.hostSpeaking = true;
    next.lastVadAt = now;
    next.pauseMs = 0;
  } else {
    next.pauseMs = next.lastVadAt ? now - next.lastVadAt : next.pauseMs;
    if (next.pauseMs > 400) next.hostSpeaking = false;
  }
  return next;
}

export function applyTranscript(state, transcript = '') {
  const text = String(transcript || '').trim();
  return {
    ...state,
    lastTranscript: text.slice(0, 500),
    addressedToSylora: /\b(sylora|силора|hey sylora|гей силора)\b/i.test(text)
  };
}

/**
 * Whether Sylora may start TTS given turn-taking rules.
 */
export function canTakeTurn(state, controls = {}) {
  if (controls.autonomy === 'OFF') return { ok: false, reason: 'autonomy_off' };
  if (state.syloraSpeaking) return { ok: false, reason: 'already_speaking' };
  if (controls.interruptProtection !== false && state.hostSpeaking) {
    return { ok: false, reason: 'do_not_interrupt_host' };
  }
  if (state.guestSpeaking && controls.autonomy !== 'AUTONOMOUS') {
    return { ok: false, reason: 'guest_floor' };
  }
  const minSilence = Number(controls.minimumSilenceMs) || 2500;
  if (!state.addressedToSylora && state.pauseMs < minSilence) {
    return { ok: false, reason: 'wait_for_pause' };
  }
  return { ok: true, reason: state.addressedToSylora ? 'addressed' : 'pause_ok' };
}

export function voicePipelineStatus({ openaiConfigured = false } = {}) {
  return {
    stages: ['microphone', 'vad', 'stt', 'context', 'decision', 'tts', 'output'],
    vad: 'WORKING_BROWSER',
    stt: openaiConfigured ? 'READY_WHEN_KEY' : 'BLOCKED_EXTERNAL',
    tts: openaiConfigured ? 'READY_WHEN_KEY' : 'BLOCKED_EXTERNAL',
    turnTaking: 'WORKING',
    note: 'Browser VAD/turn-taking is real. Cloud STT/TTS need OPENAI_API_KEY + mic permission.'
  };
}
