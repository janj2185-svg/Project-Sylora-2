import { AI_AUTONOMY } from '../core/types.mjs';

export function defaultAiHostControls() {
  return {
    autonomy: 'ASSIST',
    responseFrequency: 0.35, // 0..1
    minimumSilenceMs: 2500,
    giftReactions: true,
    chatReactions: true,
    moderationAssistance: true,
    humorLevel: 0.4,
    energyLevel: 0.55,
    interruptProtection: true,
    language: 'auto', // auto | uk | pl | en | ...
    voice: 'default',
    personaMood: 'warm_cohost',
    directorSuggestions: true
  };
}

export function normalizeAiHostControls(input = {}) {
  const base = defaultAiHostControls();
  const autonomy = AI_AUTONOMY.includes(input.autonomy) ? input.autonomy : base.autonomy;
  return {
    ...base,
    ...input,
    autonomy,
    responseFrequency: clamp01(input.responseFrequency ?? base.responseFrequency),
    minimumSilenceMs: Math.max(500, Math.min(30_000, Number(input.minimumSilenceMs ?? base.minimumSilenceMs) || 2500)),
    humorLevel: clamp01(input.humorLevel ?? base.humorLevel),
    energyLevel: clamp01(input.energyLevel ?? base.energyLevel),
    giftReactions: input.giftReactions !== false,
    chatReactions: input.chatReactions !== false,
    moderationAssistance: input.moderationAssistance !== false,
    interruptProtection: input.interruptProtection !== false,
    directorSuggestions: input.directorSuggestions !== false,
    language: String(input.language || base.language).slice(0, 16),
    voice: String(input.voice || base.voice).slice(0, 40),
    personaMood: String(input.personaMood || base.personaMood).slice(0, 40)
  };
}

function clamp01(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(1, x));
}

/**
 * Decide whether AI should speak given autonomy + context.
 * Pure policy — no fake speech generation here.
 */
export function shouldAiSpeak({
  controls,
  addressedToSylora = false,
  hostSpeaking = false,
  silenceMs = 0,
  priorityScore = 0,
  isGift = false,
  isDonation = false,
  random = Math.random
} = {}) {
  const c = normalizeAiHostControls(controls || {});
  if (c.autonomy === 'OFF') return { speak: false, reason: 'autonomy_off' };
  if (c.interruptProtection && hostSpeaking) {
    return { speak: false, reason: 'host_speaking' };
  }
  if (silenceMs < c.minimumSilenceMs && !addressedToSylora && !isGift && !isDonation) {
    return { speak: false, reason: 'silence_gate' };
  }

  if (c.autonomy === 'ASSIST') {
    if (addressedToSylora) return { speak: true, reason: 'addressed' };
    if ((isGift || isDonation) && c.giftReactions) return { speak: true, reason: 'gift' };
    if (priorityScore >= 85 && c.chatReactions) return { speak: true, reason: 'high_priority' };
    return { speak: false, reason: 'assist_idle' };
  }

  if (c.autonomy === 'CO_HOST') {
    if (addressedToSylora || ((isGift || isDonation) && c.giftReactions)) {
      return { speak: true, reason: 'cohost_trigger' };
    }
    if (priorityScore >= 60 && c.chatReactions && random() < c.responseFrequency) {
      return { speak: true, reason: 'cohost_priority' };
    }
    return { speak: false, reason: 'cohost_hold' };
  }

  // AUTONOMOUS
  if (addressedToSylora || isGift || isDonation) return { speak: true, reason: 'autonomous_must' };
  if (priorityScore >= 40 && random() < Math.max(0.15, c.responseFrequency)) {
    return { speak: true, reason: 'autonomous_engage' };
  }
  if (silenceMs > c.minimumSilenceMs * 2 && random() < c.responseFrequency * 0.5) {
    return { speak: true, reason: 'autonomous_fill' };
  }
  return { speak: false, reason: 'autonomous_hold' };
}
