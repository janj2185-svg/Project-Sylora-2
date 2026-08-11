import { defaultAiPermissions, hasAiPermission, normalizeAiPermissions } from './permissions.mjs';

export const TOOL_REGISTRY = Object.freeze([
  { id: 'get_my_context', permission: 'profile_context', level: 'READ', description: 'Read allowed profile/platform context' },
  { id: 'propose_post', permission: 'content_create', level: 'REQUEST_CONFIRMATION', description: 'Propose a social post' },
  { id: 'propose_memory', permission: 'memory_propose', level: 'REQUEST_CONFIRMATION', description: 'Propose durable memory' },
  { id: 'search_knowledge', permission: 'knowledge_graph', level: 'READ', description: 'Query permission-aware knowledge graph' },
  { id: 'translate_text', permission: 'translate', level: 'READ', description: 'Translate text' },
  { id: 'prepare_live_rundown', permission: 'live_assist', level: 'PREPARE', description: 'Prepare LIVE structure/scenes' },
  { id: 'moderate_live_suggestion', permission: 'live_moderate', level: 'PROPOSE', description: 'Suggest LIVE moderation action' },
  { id: 'analyze_audience', permission: 'audience_analyze', level: 'READ', description: 'Analyze audience signals' },
  { id: 'agent_negotiate', permission: 'agent_interact', level: 'REQUEST_CONFIRMATION', description: 'Interact with another agent' }
]);

export function ensurePersonalAiState(store, userId, now) {
  store.data.personalAi ??= [];
  let record = store.data.personalAi.find(x => x.userId === userId);
  if (!record) {
    record = {
      userId,
      agentId: `sylora-personal-${userId}`,
      displayName: 'Sylora',
      permissions: defaultAiPermissions(),
      shortMemory: [],
      longMemoryIds: [],
      activity: [],
      contextSources: ['profile', 'memories', 'pending_actions'],
      createdAt: now(),
      updatedAt: now()
    };
    store.data.personalAi.push(record);
    store.save();
  } else {
    record.permissions = normalizeAiPermissions(record.permissions);
  }
  return record;
}

export function pushShortMemory(record, entry, limit = 40) {
  record.shortMemory.push(entry);
  if (record.shortMemory.length > limit) record.shortMemory.splice(0, record.shortMemory.length - limit);
}

export function logAiActivity(record, event, limit = 200) {
  record.activity.unshift(event);
  if (record.activity.length > limit) record.activity.length = limit;
}

export function personalAiDashboard(record, memories = [], pendingActions = [], knowledgeSummary = null) {
  const permissions = normalizeAiPermissions(record.permissions);
  return {
    agentId: record.agentId,
    displayName: record.displayName,
    permissions,
    permissionCatalog: AI_PERMISSIONS_VIEW(),
    tools: TOOL_REGISTRY.map(tool => ({
      ...tool,
      enabled: hasAiPermission(permissions, tool.permission)
    })),
    whatAiKnows: {
      shortMemory: record.shortMemory.slice(-12),
      longMemories: memories,
      contextSources: record.contextSources,
      knowledge: knowledgeSummary
    },
    access: Object.entries(permissions).filter(([, on]) => on).map(([key]) => key),
    activity: record.activity.slice(0, 50),
    pendingActions,
    privacy: {
      canExportMemory: true,
      canDeleteMemory: true,
      canRevokeTools: true
    }
  };
}

function AI_PERMISSIONS_VIEW() {
  // local import avoided to keep view serializable without circular import noise
  return {
    profile_context: 'Profile context',
    memory_read: 'Read memories',
    memory_propose: 'Propose memories',
    projects: 'User projects',
    business_help: 'Business assistance',
    content_create: 'Content drafting',
    live_assist: 'LIVE assistance',
    live_moderate: 'LIVE moderation',
    comment_reply: 'Reply to comments',
    audience_analyze: 'Audience analysis',
    calendar: 'Calendar',
    translate: 'Translation',
    learn: 'Learning help',
    tool_use: 'Tool use',
    agent_interact: 'Talk to other agents',
    knowledge_graph: 'Knowledge graph',
    execute_allowed: 'Execute allowed actions'
  };
}

export function exportMemoryBundle({ record, memories }) {
  return {
    exportedAt: new Date().toISOString(),
    agentId: record.agentId,
    shortMemory: record.shortMemory,
    longMemories: memories,
    activity: record.activity
  };
}
