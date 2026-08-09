// Canonical capability contracts for the long-term SYLORA product.
// Registration here means "architecturally reserved", not "implemented".

export const PLATFORM_CAPABILITIES = Object.freeze([
  {
    id: 'living-world',
    name: 'SYLORA Living World',
    dependsOn: ['live-runtime', 'gift-runtime-v2', 'ai-director'],
    events: ['world.state.changed', 'world.environment.cue'],
    firstProof: 'A LIVE environment visibly reacts to audience, gift and AI events without obscuring the host.'
  },
  {
    id: 'ai-director',
    name: 'AI Director',
    dependsOn: ['live-runtime', 'creator-studio'],
    events: ['director.cue.proposed', 'director.cue.applied'],
    firstProof: 'The director safely chooses camera, light, replay or transition cues from LIVE context.'
  },
  {
    id: 'gift-interactions',
    name: 'Interacting Gifts',
    dependsOn: ['gift-runtime-v2'],
    events: ['gift.interaction.requested', 'gift.interaction.resolved'],
    firstProof: 'Two compatible gifts produce a deterministic combined physical scene rather than overlapping animations.'
  },
  {
    id: 'collective-gifts',
    name: 'Collective Gifts',
    dependsOn: ['gift-runtime-v2', 'wallet-ledger', 'realtime-outbox'],
    events: ['gift.collective.progressed', 'gift.collective.completed'],
    firstProof: 'Many durable gift transactions build one shared LIVE event with replay-safe progress.'
  },
  {
    id: 'gift-evolution',
    name: 'AI Gift Evolution',
    dependsOn: ['gift-runtime-v2', 'wallet-ledger'],
    events: ['gift.evolution.progressed', 'gift.evolution.unlocked'],
    firstProof: 'A gift family changes story and behavior through earned stages, not color reskins.'
  },
  {
    id: 'living-ai',
    name: 'Living Sylora AI',
    dependsOn: ['ai-runtime', 'digital-human', 'live-runtime'],
    events: ['assistant.context.observed', 'assistant.reaction.requested'],
    firstProof: 'Sylora perceives a LIVE event and responds with context-appropriate speech, gaze, gesture and emotion.'
  },
  {
    id: 'live-translation',
    name: 'Universal Live Translation',
    dependsOn: ['live-runtime', 'ai-runtime'],
    events: ['translation.turn.requested', 'translation.turn.ready'],
    firstProof: 'Speech and chat cross languages with speaker attribution, latency budgets and an accessible original.'
  },
  {
    id: 'ai-co-creator',
    name: 'AI Co-Creator',
    dependsOn: ['ai-runtime', 'creator-studio'],
    events: ['creator.asset.proposed', 'creator.scene.proposed'],
    firstProof: 'A creator request produces an editable scene package instead of silently publishing AI output.'
  },
  {
    id: 'creator-digital-twin',
    name: 'Creator Digital Twin',
    dependsOn: ['ai-runtime', 'digital-human'],
    events: ['twin.action.proposed', 'twin.action.approved', 'twin.action.revoked'],
    firstProof: 'A creator can scope, inspect and revoke a twin; impersonating/publishing actions require explicit authority.'
  },
  {
    id: 'live-worlds',
    name: 'LIVE Worlds',
    dependsOn: ['living-world', 'creator-studio'],
    events: ['live.world.loaded', 'live.world.transitioned'],
    firstProof: 'A host changes to an interactive world while preserving stream continuity and performance budgets.'
  },
  {
    id: 'story-live',
    name: 'Story LIVE',
    dependsOn: ['live-worlds', 'realtime-outbox'],
    events: ['story.choice.opened', 'story.choice.committed'],
    firstProof: 'Audience choices deterministically change a running LIVE story with an auditable result.'
  },
  {
    id: 'creator-economy',
    name: 'Creator Economy 2.0',
    dependsOn: ['wallet-ledger'],
    events: ['economy.entitlement.granted', 'economy.payout.requested'],
    firstProof: 'Subscriptions, digital goods, services and paid LIVE share one auditable entitlement/ledger model.'
  },
  {
    id: 'ai-business-partner',
    name: 'AI Business Partner',
    dependsOn: ['ai-runtime', 'creator-economy'],
    events: ['business.insight.generated', 'business.action.proposed'],
    firstProof: 'Sylora explains an evidence-backed business recommendation while financial actions remain human-controlled.'
  },
  {
    id: 'sylora-moments',
    name: 'SYLORA Moments',
    dependsOn: ['live-runtime', 'ai-runtime', 'creator-studio'],
    events: ['moment.live.detected', 'moment.draft.ready', 'moment.publish.approved'],
    firstProof: 'A real LIVE moment becomes an editable vertical clip with captions, translation and cover metadata.'
  }
].map(capability => Object.freeze({
  ...capability,
  status: 'foundation-registered',
  dependsOn: Object.freeze(capability.dependsOn),
  events: Object.freeze(capability.events)
})));

export const PLATFORM_EVENT_TYPES = Object.freeze(
  PLATFORM_CAPABILITIES.flatMap(capability => capability.events)
);

export function validatePlatformVision() {
  const ids = new Set();
  const events = new Set();
  for (const capability of PLATFORM_CAPABILITIES) {
    if (!capability.id || ids.has(capability.id)) throw new Error(`Duplicate/invalid capability: ${capability.id}`);
    ids.add(capability.id);
    if (!capability.firstProof) throw new Error(`Missing proof contract: ${capability.id}`);
    for (const event of capability.events) {
      if (!/^[a-z][a-z0-9-]*(\.[a-z][a-z0-9-]*){2,}$/.test(event)) throw new Error(`Invalid event type: ${event}`);
      if (events.has(event)) throw new Error(`Duplicate event type: ${event}`);
      events.add(event);
    }
  }
  return {capabilities: ids.size, events: events.size};
}
