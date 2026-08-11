/** Transparent multi-dimensional reputation — never a secret social score. */

export const REPUTATION_DIMENSIONS = Object.freeze([
  'creator', 'professional', 'marketplace', 'community', 'contribution', 'expertise', 'trust'
]);

export function emptyReputation(userId) {
  const dimensions = {};
  for (const key of REPUTATION_DIMENSIONS) {
    dimensions[key] = { score: 0, reasons: [], updatedAt: new Date().toISOString() };
  }
  return { userId, dimensions, disputes: [], updatedAt: new Date().toISOString() };
}

export function applyEvidence(rep, dimension, delta, reason) {
  if (!REPUTATION_DIMENSIONS.includes(dimension)) throw new Error('INVALID_REPUTATION_DIMENSION');
  const current = rep.dimensions[dimension] || { score: 0, reasons: [] };
  const score = Math.max(0, Math.min(100, Number(current.score || 0) + Number(delta || 0)));
  const reasons = [...(current.reasons || []), {
    delta: Number(delta || 0),
    reason: String(reason || '').slice(0, 240),
    at: new Date().toISOString()
  }].slice(-50);
  return {
    ...rep,
    dimensions: {
      ...rep.dimensions,
      [dimension]: { score, reasons, updatedAt: new Date().toISOString() }
    },
    updatedAt: new Date().toISOString()
  };
}

export function openDispute(rep, { id, dimension, reason }) {
  return {
    ...rep,
    disputes: [...(rep.disputes || []), {
      id,
      dimension,
      reason: String(reason || '').slice(0, 500),
      status: 'open',
      createdAt: new Date().toISOString()
    }],
    updatedAt: new Date().toISOString()
  };
}
