/**
 * LIVE AI Director — non-intrusive recommendations from real metrics.
 */

export function directorTick({ analytics, chatVelocity, silenceMs = 0, newViewerBurst = 0, repeatedQuestionCount = 0 } = {}) {
  const snap = analytics?.snapshot?.() || analytics || {};
  const suggestions = [];

  if (chatVelocity != null ? chatVelocity < 2 : (snap.chatPerMin || 0) < 2) {
    if ((snap.viewers || 0) > 0) {
      suggestions.push({
        level: 'info',
        code: 'ENGAGEMENT_DIP',
        text: 'Chat velocity is low — maybe invite a question or change the topic.',
        priority: 40
      });
    }
  }

  if (silenceMs > 15_000) {
    suggestions.push({
      level: 'info',
      code: 'LONG_SILENCE',
      text: 'Long pause detected — Sylora can fill only if autonomy allows.',
      priority: 35
    });
  }

  if (newViewerBurst >= 5) {
    suggestions.push({
      level: 'tip',
      code: 'NEW_VIEWERS',
      text: 'Many new viewers just joined — a quick welcome helps.',
      priority: 55
    });
  }

  if (repeatedQuestionCount >= 5) {
    suggestions.push({
      level: 'tip',
      code: 'REPEATED_QUESTION',
      text: `A question was repeated ~${repeatedQuestionCount} times — pin or answer it.`,
      priority: 70
    });
  }

  if ((snap.gifts || 0) > 0 && (snap.chatPerMin || 0) > 20) {
    suggestions.push({
      level: 'tip',
      code: 'HIGH_ENERGY',
      text: 'High energy right now — good moment for a goal push or battle.',
      priority: 50
    });
  }

  const top = suggestions.sort((a, b) => b.priority - a.priority).slice(0, 3);
  return {
    at: new Date().toISOString(),
    suggestions: top,
    intrusive: false,
    note: 'Director never auto-speaks or hijacks the stream.'
  };
}
