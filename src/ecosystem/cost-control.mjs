export function defaultUserBudget(userId) {
  return {
    userId,
    aiRequestsPerMinute: 12,
    aiTokensPerDay: 100000,
    translationCharsPerDay: 50000,
    videoJobsPerDay: 20,
    used: { aiRequests: 0, aiTokens: 0, translationChars: 0, videoJobs: 0 },
    modelRouting: {
      simple: process.env.OPENAI_MODEL_FAST || process.env.OPENAI_MODEL || 'gpt-5.6',
      complex: process.env.OPENAI_MODEL || 'gpt-5.6'
    }
  };
}

export function routeModel(budget, complexity = 'simple') {
  return budget.modelRouting?.[complexity] || budget.modelRouting?.simple;
}

export function consume(budget, kind, amount = 1) {
  const next = { ...budget, used: { ...budget.used } };
  if (kind === 'aiRequests') {
    next.used.aiRequests += amount;
    if (next.used.aiRequests > next.aiRequestsPerMinute) return { ok: false, error: 'AI_RATE_LIMITED', budget: next };
  }
  if (kind === 'aiTokens') {
    next.used.aiTokens += amount;
    if (next.used.aiTokens > next.aiTokensPerDay) return { ok: false, error: 'AI_TOKEN_BUDGET', budget: next };
  }
  if (kind === 'translationChars') {
    next.used.translationChars += amount;
    if (next.used.translationChars > next.translationCharsPerDay) return { ok: false, error: 'TRANSLATION_BUDGET', budget: next };
  }
  return { ok: true, budget: next };
}
