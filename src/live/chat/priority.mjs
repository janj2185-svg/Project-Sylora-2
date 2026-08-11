/**
 * Intelligent chat priority — rank what AI/host should see first.
 */

export function scoreChatMessage(msg, {
  vipIds = new Set(),
  modIds = new Set(),
  recentGiftUserIds = new Set(),
  repeatedQuestions = new Map()
} = {}) {
  let score = 10;
  const text = String(msg?.text || msg?.message || '');
  const userId = msg?.userId;

  if (msg?.mentionsSylora || /\b(sylora|силора)\b/i.test(text)) score += 40;
  if (/\?|？|чи |how |what |why |когда|як |що /i.test(text)) score += 25;
  if (userId && vipIds.has(userId)) score += 20;
  if (userId && modIds.has(userId)) score += 15;
  if (userId && recentGiftUserIds.has(userId)) score += 18;
  if (msg?.eventType === 'gift' || msg?.eventType === 'donation') score += 50;
  if (msg?.eventType === 'subscription' || msg?.eventType === 'membership') score += 35;

  const norm = text.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 120);
  if (norm.length > 8) {
    const count = (repeatedQuestions.get(norm) || 0) + 1;
    repeatedQuestions.set(norm, count);
    if (count >= 3) score += 22; // repeated question
  }

  if (isSpammy(text)) score -= 40;
  if (isToxicish(text)) score -= 30;

  return {
    id: msg?.id,
    score: Math.max(0, Math.min(100, score)),
    reasons: explain(score, { text, msg, userId, vipIds, modIds })
  };
}

export function rankMessages(messages, ctx = {}) {
  const repeatedQuestions = ctx.repeatedQuestions || new Map();
  return messages
    .map(m => ({ message: m, ...scoreChatMessage(m, { ...ctx, repeatedQuestions }) }))
    .sort((a, b) => b.score - a.score);
}

function isSpammy(text) {
  if (!text) return false;
  if (/(.)\1{7,}/.test(text)) return true;
  if (/https?:\/\/\S+/i.test(text) && text.length < 40) return true;
  if (/free followers|crypto airdrop|giveaway.*click/i.test(text)) return true;
  return false;
}

function isToxicish(text) {
  return /\b(kill yourself|nazi|idiot|fuck you)\b/i.test(text || '');
}

function explain(score, { text, msg, userId, vipIds, modIds }) {
  const r = [];
  if (/\b(sylora|силора)\b/i.test(text)) r.push('mention_sylora');
  if (/\?/.test(text)) r.push('question');
  if (userId && vipIds.has(userId)) r.push('vip');
  if (userId && modIds.has(userId)) r.push('mod');
  if (msg?.eventType === 'gift') r.push('gift');
  if (score < 20) r.push('low_signal');
  return r;
}
