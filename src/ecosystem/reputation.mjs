/** Portable Reputation Engine — transparent, explainable, disputable. */

export const REPUTATION_DIMENSIONS = Object.freeze([
  'creator',
  'professional',
  'marketplace',
  'community',
  'contribution',
  'verified_expertise',
  'trust'
]);

export function ensureReputation(store) {
  store.data.reputationScores ??= [];
  store.data.reputationEvents ??= [];
  store.data.reputationDisputes ??= [];
  return store;
}

export function ensureScore(store, userId, now) {
  ensureReputation(store);
  let row = store.data.reputationScores.find(x => x.userId === userId);
  if (!row) {
    row = {
      userId,
      scores: Object.fromEntries(REPUTATION_DIMENSIONS.map(d => [d, { value: 0, reasons: [] }])),
      updatedAt: now()
    };
    store.data.reputationScores.push(row);
    store.save();
  }
  return row;
}

export function applyReputationEvent(store, {
  id, userId, dimension, delta, reason, evidence = {}
}, now) {
  ensureReputation(store);
  if (!REPUTATION_DIMENSIONS.includes(dimension)) throw new Error('REPUTATION_DIMENSION_INVALID');
  const score = ensureScore(store, userId, now);
  const bucket = score.scores[dimension];
  bucket.value = Math.max(0, Math.min(100, bucket.value + Number(delta || 0)));
  bucket.reasons.unshift({ at: now(), delta, reason, evidence });
  bucket.reasons = bucket.reasons.slice(0, 25);
  score.updatedAt = now();
  store.data.reputationEvents.unshift({ id, userId, dimension, delta, reason, evidence, at: now() });
  store.save();
  return score;
}

export function explainReputation(store, userId) {
  ensureReputation(store);
  const score = store.data.reputationScores.find(x => x.userId === userId);
  if (!score) return { userId, scores: {}, transparent: true };
  return {
    userId,
    scores: score.scores,
    transparent: true,
    note: 'No hidden social score. Each dimension lists contributing reasons.',
    disputeAvailable: true
  };
}

export function openDispute(store, { id, userId, dimension, message }, now) {
  ensureReputation(store);
  if (!REPUTATION_DIMENSIONS.includes(dimension)) throw new Error('REPUTATION_DIMENSION_INVALID');
  const dispute = {
    id,
    userId,
    dimension,
    message: String(message || '').slice(0, 1000),
    status: 'open',
    createdAt: now(),
    resolvedAt: null
  };
  store.data.reputationDisputes.push(dispute);
  store.save();
  return dispute;
}
