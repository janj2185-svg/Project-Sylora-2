import { PLATFORM_CAPABILITIES } from './platform-vision.mjs';
import { capabilityStatus } from './platform-events.mjs';

export const CAPABILITY_PHASE = Object.freeze({
  FOUNDATION: 'FOUNDATION',
  DEPENDENCY: 'DEPENDENCY',
  IMPLEMENTATION: 'IMPLEMENTATION',
  E2E_VERIFIED: 'E2E_VERIFIED'
});

const GRAPH = Object.freeze({
  'live-runtime': { phase: CAPABILITY_PHASE.E2E_VERIFIED, dependsOn: [] },
  'gift-runtime-v2': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['live-runtime'] },
  'ai-runtime': { phase: CAPABILITY_PHASE.E2E_VERIFIED, dependsOn: [] },
  'wallet-ledger': { phase: CAPABILITY_PHASE.E2E_VERIFIED, dependsOn: [] },
  'realtime-outbox': { phase: CAPABILITY_PHASE.E2E_VERIFIED, dependsOn: ['live-runtime'] },
  'creator-studio': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['live-runtime'] },
  'digital-human': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['ai-runtime'] },
  'platform-event-spine': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['live-runtime', 'gift-runtime-v2'] },
  'living-ai': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['ai-runtime', 'live-runtime', 'platform-event-spine'] },
  'ai-director': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['live-runtime', 'living-ai', 'platform-event-spine'] },
  'gift-interactions': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['gift-runtime-v2', 'platform-event-spine'] },
  'sylora-moments': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['live-runtime', 'creator-studio', 'clip-jobs'] },
  'clip-jobs': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['live-runtime'] },
  'living-world': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['live-runtime', 'gift-runtime-v2', 'ai-director'] },
  'collective-gifts': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['gift-runtime-v2', 'wallet-ledger', 'realtime-outbox'] },
  'gift-evolution': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['gift-runtime-v2', 'wallet-ledger'] },
  'live-translation': { phase: CAPABILITY_PHASE.FOUNDATION, dependsOn: ['live-runtime', 'ai-runtime'], blocked: 'BLOCKED_EXTERNAL' },
  'ai-co-creator': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['ai-runtime', 'creator-studio'] },
  'creator-digital-twin': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['ai-runtime', 'digital-human'] },
  'live-worlds': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['living-world', 'creator-studio'] },
  'story-live': { phase: CAPABILITY_PHASE.DEPENDENCY, dependsOn: ['live-worlds', 'realtime-outbox'] },
  'creator-economy': { phase: CAPABILITY_PHASE.FOUNDATION, dependsOn: ['wallet-ledger'] },
  'ai-business-partner': { phase: CAPABILITY_PHASE.IMPLEMENTATION, dependsOn: ['ai-runtime', 'creator-economy'] }
});

export function capabilityDependencyGraph() {
  return PLATFORM_CAPABILITIES.map(cap => {
    const node = GRAPH[cap.id] || { phase: CAPABILITY_PHASE.FOUNDATION, dependsOn: cap.dependsOn || [] };
    return {
      id: cap.id,
      name: cap.name,
      phase: node.phase,
      dependsOn: node.dependsOn?.length ? node.dependsOn : [...cap.dependsOn],
      runtimeStatus: node.blocked || capabilityStatus(cap.id),
      events: cap.events,
      firstProof: cap.firstProof
    };
  });
}

export function nextImplementableCapability() {
  const graph = capabilityDependencyGraph();
  const done = new Set(graph.filter(c =>
    c.phase === CAPABILITY_PHASE.E2E_VERIFIED || c.runtimeStatus === 'WORKING'
  ).map(c => c.id));
  return graph.find(c =>
    c.phase === CAPABILITY_PHASE.IMPLEMENTATION &&
    c.runtimeStatus !== 'WORKING' &&
    (c.dependsOn || []).every(d => done.has(d) || GRAPH[d]?.phase === CAPABILITY_PHASE.E2E_VERIFIED)
  ) || null;
}
