export function createMetricsRegistry() {
  const counters = new Map();
  const timings = [];
  return {
    incr(name, by = 1, labels = {}) {
      const key = `${name}:${JSON.stringify(labels)}`;
      counters.set(key, (counters.get(key) || 0) + by);
    },
    timing(name, ms, labels = {}) {
      timings.push({ name, ms, labels, at: Date.now() });
      if (timings.length > 1000) timings.splice(0, timings.length - 1000);
    },
    snapshot() {
      return {
        counters: Object.fromEntries(counters),
        timings: timings.slice(-100),
        health: { live: true }
      };
    }
  };
}

export function aiUsageEvent({ userId, orgId = null, model, tokensIn = 0, tokensOut = 0, costMicros = 0, action = 'chat' }) {
  return {
    userId,
    orgId,
    model,
    tokensIn,
    tokensOut,
    costMicros,
    action,
    at: new Date().toISOString()
  };
}
