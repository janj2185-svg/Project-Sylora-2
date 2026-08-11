/**
 * Moderation AI assistant — suggest / auto-hide / timeout policies.
 * Punitive actions only when configured AND platform allows.
 */

export function defaultModerationPolicy() {
  return {
    mode: 'suggest_only', // suggest_only | auto_hide | auto_timeout | manual_approval
    spam: true,
    toxicity: true,
    scam: true,
    harassment: true,
    repeated: true
  };
}

export function moderateMessage(text, policy = defaultModerationPolicy()) {
  const p = { ...defaultModerationPolicy(), ...policy };
  const t = String(text || '');
  const flags = [];
  if (p.spam && isSpam(t)) flags.push('spam');
  if (p.toxicity && isToxic(t)) flags.push('toxicity');
  if (p.scam && isScam(t)) flags.push('scam');
  if (p.harassment && isHarassment(t)) flags.push('harassment');

  if (!flags.length) {
    return { action: 'allow', flags: [], mode: p.mode };
  }

  let action = 'suggest';
  if (p.mode === 'auto_hide') action = 'hide';
  else if (p.mode === 'auto_timeout') action = 'timeout_suggested';
  else if (p.mode === 'manual_approval') action = 'hold';
  else action = 'suggest';

  return {
    action,
    flags,
    mode: p.mode,
    note: p.mode === 'suggest_only'
      ? 'Suggestion only — host decides. Platform timeout requires API capability.'
      : 'Configured action; external platform enforcement may still be BLOCKED_EXTERNAL.'
  };
}

function isSpam(t) {
  return /(.)\1{8,}/.test(t) || (/https?:\/\//i.test(t) && t.split('http').length > 2);
}

function isToxic(t) {
  return /\b(kill yourself|kys|nazi)\b/i.test(t);
}

function isScam(t) {
  return /free\s*followers|double your (lumen|crypto)|send.*private key|airdrop.*claim/i.test(t);
}

function isHarassment(t) {
  return /\b(dm me for|onlyfans)\b/i.test(t) && /http/i.test(t);
}
