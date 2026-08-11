/** Production observability foundation — metrics, AI cost, health details. */

export function createMetrics() {
  const state = {
    startedAt: Date.now(),
    requests: 0,
    errors: 0,
    aiRequests: 0,
    aiTokensIn: 0,
    aiTokensOut: 0,
    aiCostMicros: 0,
    agentActions: 0,
    translationRequests: 0,
    translationLatencyMs: [],
    apiLatencyMs: [],
    liveEvents: 0
  };

  return {
    state,
    markRequest(ok, latencyMs = 0) {
      state.requests += 1;
      if (!ok) state.errors += 1;
      state.apiLatencyMs.push(latencyMs);
      if (state.apiLatencyMs.length > 500) state.apiLatencyMs.shift();
    },
    markAi({ tokensIn = 0, tokensOut = 0, costMicros = 0 } = {}) {
      state.aiRequests += 1;
      state.aiTokensIn += tokensIn;
      state.aiTokensOut += tokensOut;
      state.aiCostMicros += costMicros;
    },
    markAgentAction() { state.agentActions += 1; },
    markTranslation(latencyMs = 0) {
      state.translationRequests += 1;
      state.translationLatencyMs.push(latencyMs);
      if (state.translationLatencyMs.length > 500) state.translationLatencyMs.shift();
    },
    markLiveEvent() { state.liveEvents += 1; },
    snapshot() {
      const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
      return {
        uptimeSec: Math.round((Date.now() - state.startedAt) / 1000),
        requests: state.requests,
        errors: state.errors,
        errorRate: state.requests ? Number((state.errors / state.requests).toFixed(4)) : 0,
        ai: {
          requests: state.aiRequests,
          tokensIn: state.aiTokensIn,
          tokensOut: state.aiTokensOut,
          costMicros: state.aiCostMicros
        },
        agentActions: state.agentActions,
        translation: {
          requests: state.translationRequests,
          avgLatencyMs: avg(state.translationLatencyMs)
        },
        apiAvgLatencyMs: avg(state.apiLatencyMs),
        liveEvents: state.liveEvents
      };
    }
  };
}

export function aiQuotaGate({ usedTokens = 0, limitTokens = 500000, orgKillSwitch = false } = {}) {
  if (orgKillSwitch) return { allowed: false, reason: 'AI_KILL_SWITCH' };
  if (usedTokens >= limitTokens) return { allowed: false, reason: 'AI_QUOTA_EXCEEDED' };
  return { allowed: true };
}
