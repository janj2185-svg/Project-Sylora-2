import { DEFAULT_AI_PERMISSIONS, mergeAiPermissions } from './permissions.mjs';

export function createPersonalAgent({ id, userId, name = 'Sylora', locale = 'uk' }) {
  return {
    id,
    userId,
    name,
    kind: 'personal',
    locale,
    permissions: { ...DEFAULT_AI_PERMISSIONS },
    contexts: {
      command_center: 'personal',
      live: 'creator_assistant',
      business: 'business_assistant',
      learning: 'tutor',
      messages: 'communication_assistant',
      studio: 'creator_assistant'
    },
    memory: { shortTermCap: 40, longTermCap: 200 },
    proactiveLevel: 'IMPORTANT_ONLY',
    voicePersonality: 'warm',
    privacyControls: {
      memory: true,
      microphone: true,
      camera: false,
      location: false,
      contacts: false,
      files: false,
      notifications: true,
      personalization: true,
      aiActions: true,
      voice: true,
      translation: true
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function classifyMemoryTier(input = {}) {
  const tier = input.tier === 'short' ? 'short' : 'long';
  return tier;
}

export function createMemoryRecord({ id, userId, agentId, label, value, tier = 'long', source = 'user', contextSources = [] }) {
  return {
    id,
    userId,
    agentId,
    label: String(label || '').slice(0, 80),
    value: String(value || '').slice(0, 2000),
    tier: classifyMemoryTier({ tier }),
    source,
    contextSources,
    createdAt: new Date().toISOString()
  };
}

export function createActivityEntry({ id, userId, agentId, kind, summary, dataUsed = [], reason = '', context = 'command_center' }) {
  return {
    id,
    userId,
    agentId,
    kind,
    summary: String(summary || '').slice(0, 500),
    dataUsed,
    reason: String(reason || '').slice(0, 500),
    context,
    createdAt: new Date().toISOString()
  };
}

export function permissionDashboard(agent, memories = [], activity = [], pendingActions = []) {
  const permissions = mergeAiPermissions(agent?.permissions);
  return {
    agent: {
      id: agent?.id,
      name: agent?.name || 'Sylora',
      kind: agent?.kind || 'personal',
      contexts: agent?.contexts || {}
    },
    knows: memories.map(m => ({ id: m.id, label: m.label, tier: m.tier || 'long', source: m.source })),
    access: permissions,
    did: activity.slice(-30),
    pendingActions,
    transparency: {
      principle: 'User can always see what AI knows, what it can access, what it did, why, and which data was used.'
    }
  };
}

export function contextRole(agent, view = 'command_center') {
  return agent?.contexts?.[view] || agent?.contexts?.command_center || 'personal';
}
