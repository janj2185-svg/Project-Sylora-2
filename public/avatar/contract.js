/**
 * Sylora Avatar Contract — renderer-agnostic behavior + capability types.
 * Intelligence / Voice / Gesture engines speak this contract.
 * Renderers (2D PNG or future VRM/GLB) adapt TO this contract — never the reverse.
 */

export const LIVING_STATES = Object.freeze([
  'idle_neutral', 'idle_listening', 'idle_thinking',
  'speaking_calm', 'speaking_happy', 'speaking_excited',
  'speaking_sad', 'speaking_serious', 'speaking_caring', 'speaking_surprised'
]);

export const PRESENCE_MODES = Object.freeze([
  'ready', 'listening', 'thinking', 'speaking', 'muted'
]);

export const EMOTIONS = Object.freeze([
  'neutral', 'happy', 'grateful', 'concerned', 'sad', 'playful',
  'excited', 'surprised', 'caring', 'serious'
]);

/** Structured behavior emitted by Sylora AI / Living Sylora / Director. */
export function normalizeBehavior(input = {}) {
  const b = input && typeof input === 'object' ? input : {};
  const nested = b.behavior && typeof b.behavior === 'object' ? b.behavior : b;
  return {
    text: String(nested.text || b.text || '').slice(0, 4000),
    emotion: EMOTIONS.includes(nested.emotion) ? nested.emotion : 'neutral',
    intensity: clamp01(nested.intensity ?? 0.4),
    voiceStyle: nested.voiceStyle || 'warm',
    facialExpression: nested.facialExpression || nested.emotion || 'neutral',
    gestureIntent: nested.gestureIntent || 'neutral',
    gazeIntent: nested.gazeIntent || 'user',
    animationCue: nested.animationCue || 'none',
    presence: PRESENCE_MODES.includes(nested.presence) ? nested.presence : null,
    visemes: Array.isArray(nested.visemes) ? nested.visemes : null,
    speechTiming: nested.speechTiming || null
  };
}

export function livingStateFrom({ presence = 'ready', emotion = 'neutral' } = {}) {
  if (presence === 'listening') return 'idle_listening';
  if (presence === 'thinking') return 'idle_thinking';
  if (presence === 'speaking') {
    const map = {
      happy: 'speaking_happy', grateful: 'speaking_happy', playful: 'speaking_excited',
      excited: 'speaking_excited', concerned: 'speaking_sad', sad: 'speaking_sad',
      serious: 'speaking_serious', caring: 'speaking_caring', surprised: 'speaking_surprised'
    };
    return map[emotion] || 'speaking_calm';
  }
  return 'idle_neutral';
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0.4;
  return Math.max(0, Math.min(1, x));
}

/**
 * Capability matrix — honest statuses for Reality / Migration reports.
 * WORKING | PARTIAL | BROKEN | NOT_SUPPORTED | ASSET_REQUIRED
 */
export const CAPABILITY = Object.freeze({
  WORKING: 'WORKING',
  PARTIAL: 'PARTIAL',
  BROKEN: 'BROKEN',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  ASSET_REQUIRED: 'ASSET_REQUIRED'
});
