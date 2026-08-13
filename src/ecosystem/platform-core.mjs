/**
 * SYLORA Platform Core — Universal Command, honesty, memory categories.
 * Builds on Action Engine + existing store (no fake readiness).
 */

import { detectIntent, planFromIntent, TOOL_CATALOG, getTool } from './sylora-tools.mjs';
import { resolveFlags } from './feature-flags.mjs';
import { providerSnapshot, resolveAiProvider } from './providers.mjs';
import { SPACE_KINDS } from './spaces.mjs';

export { detectIntent, planFromIntent, TOOL_CATALOG, getTool, resolveFlags, providerSnapshot };
export { SPACE_KINDS };

export const MEMORY_CATEGORIES = Object.freeze([
  'conversation',
  'preferences',
  'people',
  'projects',
  'professional',
  'learning'
]);

export const VERIFICATION_TYPES = Object.freeze([
  'identity',
  'creator',
  'business',
  'organization'
]);

export const PROVENANCE_LABELS = Object.freeze([
  'original_upload',
  'edited',
  'ai_assisted',
  'ai_generated',
  'unknown'
]);

export function honestyLabel({ configured, mock, testBalance } = {}) {
  if (testBalance) return { state: 'test_demo', label: 'TEST / DEMO' };
  if (mock) return { state: 'development', label: 'Development / mock' };
  if (!configured) return { state: 'setup_required', label: 'Setup required' };
  return { state: 'available', label: 'Available' };
}

export function buildCommandPlan(text, { locale = 'uk' } = {}) {
  const detected = detectIntent(text, locale);
  const plan = planFromIntent(detected);
  return {
    ...plan,
    pipeline: ['intent', 'planning', 'permissions', 'tool_selection', 'confirmation', 'execution', 'result'],
    honesty: {
      autoExecute: false,
      note: 'Mutating tools require explicit user confirmation before execution.'
    }
  };
}

export function modelRouteFor(task = 'simple') {
  const ai = resolveAiProvider();
  if (ai.status !== 'ready') return { provider: ai.id, model: null, status: ai.status };
  if (task === 'realtime' || task === 'voice') {
    return { provider: ai.id, model: ai.realtimeModel, status: 'ready', tier: 'low_latency' };
  }
  if (task === 'complex' || task === 'reasoning') {
    return { provider: ai.id, model: ai.chatModel, status: 'ready', tier: 'strong' };
  }
  return { provider: ai.id, model: ai.fastModel || ai.chatModel, status: 'ready', tier: 'fast' };
}

export function buildPlatformStatus({ env = process.env } = {}) {
  const providers = providerSnapshot();
  const flags = resolveFlags();
  const aiReady = providers.ai?.status === 'ready';
  return {
    providers,
    flags,
    infrastructure: {
      database: honestyLabel({ configured: Boolean(env.DATABASE_URL) }),
      redis: honestyLabel({ configured: Boolean(env.REDIS_URL) }),
      live: honestyLabel({ configured: true, mock: env.LIVE_MOCK === '1' }),
      lumenWallet: honestyLabel({ configured: true, testBalance: env.LUMEN_TEST_MODE !== '0' }),
      ai: {
        ...honestyLabel({ configured: aiReady }),
        aiStatus: providers.ai?.aiStatus || (aiReady ? 'AI_CONFIGURED' : 'AI_UNAVAILABLE'),
        reason: providers.ai?.reason || (aiReady ? 'OPENAI_CONFIGURED' : 'OPENAI_API_KEY_MISSING'),
        fallback: !aiReady
      }
    },
    toolCount: TOOL_CATALOG.length,
    memoryCategories: MEMORY_CATEGORIES,
    verificationTypes: VERIFICATION_TYPES,
    provenanceLabels: PROVENANCE_LABELS,
    spaceKinds: SPACE_KINDS
  };
}
