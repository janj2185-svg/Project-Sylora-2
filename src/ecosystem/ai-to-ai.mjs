import { ACTION_LEVELS } from './permissions.mjs';

/**
 * AI-to-AI negotiation foundation.
 * Personal AI may ask a Business/Marketplace agent about availability, price, terms —
 * but never execute financial/legal actions without confirmation.
 */
export const NEGOTIATION_TOPICS = Object.freeze([
  'availability', 'price', 'terms', 'dates', 'services', 'booking', 'proposal'
]);

export function createNegotiation({
  id,
  userId,
  fromAgentId,
  toAgentId,
  topic = 'proposal',
  message = '',
  payload = {}
}) {
  if (!NEGOTIATION_TOPICS.includes(topic)) throw new Error('INVALID_NEGOTIATION_TOPIC');
  return {
    id,
    userId,
    fromAgentId,
    toAgentId,
    topic,
    message: String(message || '').slice(0, 2000),
    payload,
    status: 'proposed',
    actionLevel: ACTION_LEVELS.REQUEST_CONFIRMATION,
    reply: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmedAt: null,
    executedAt: null
  };
}

export function draftBusinessReply(negotiation, businessAgent = {}) {
  const topic = negotiation.topic;
  const templates = {
    availability: 'Available for a scoped consultation in the next 5 business days, subject to human confirmation.',
    price: `Indicative sandbox price from ${businessAgent.name || 'Business Agent'}: review required before any charge.`,
    terms: 'Standard non-binding terms draft prepared. Legal execution requires human approval.',
    dates: 'Proposed windows attached. Booking is not confirmed until the user approves.',
    services: 'Service outline prepared from the agent manifest capabilities.',
    booking: 'Booking request prepared at REQUEST_CONFIRMATION level — no reservation placed.',
    proposal: 'Counter-proposal prepared. No contract or payment is executed automatically.'
  };
  return {
    text: templates[topic] || templates.proposal,
    binding: false,
    requiresUserConfirmation: true,
    actionLevel: ACTION_LEVELS.REQUEST_CONFIRMATION
  };
}

export function confirmNegotiation(negotiation, at = new Date().toISOString()) {
  if (negotiation.status === 'cancelled' || negotiation.status === 'expired') {
    return { ok: false, error: 'NEGOTIATION_NOT_ACTIVE' };
  }
  return {
    ok: true,
    negotiation: {
      ...negotiation,
      status: 'confirmed',
      confirmedAt: at,
      updatedAt: at
    }
  };
}
