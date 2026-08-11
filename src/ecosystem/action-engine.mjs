import { ACTION_LEVELS, assertActionLevel, criticalActionRequiresConfirmation } from './permissions.mjs';
import { getTool, TOOL_CATALOG } from './sylora-tools.mjs';

/**
 * Universal AI Action Engine.
 * Every action records actor, agent, permission, confirmation, result, audit.
 * Tools never receive raw DB handles — callers execute via typed service methods.
 */
export function createActionRecord({
  id,
  userId,
  agentId = null,
  actorType = 'personal_ai',
  type,
  level = ACTION_LEVELS.PROPOSE,
  input = {},
  permission = null,
  context = 'command_center'
}) {
  const tool = getTool(type);
  const effectiveLevel = tool?.level || level;
  const needsConfirmation = effectiveLevel !== ACTION_LEVELS.EXECUTE_ALLOWED || criticalActionRequiresConfirmation(type);
  return {
    id,
    userId,
    agentId,
    actorType,
    type,
    level: effectiveLevel,
    toolClass: tool?.class || 'CUSTOM',
    schema: tool?.schema || null,
    input,
    output: null,
    permission,
    context,
    status: needsConfirmation ? 'pending' : 'ready',
    confirmationRequired: needsConfirmation,
    confirmedAt: null,
    result: null,
    error: null,
    auditTrail: [{ at: new Date().toISOString(), event: 'proposed' }],
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString()
  };
}

export function validateToolInput(type, input = {}) {
  const tool = getTool(type);
  if (!tool) return { ok: false, error: 'UNKNOWN_TOOL' };
  const errors = [];
  for (const [key, kind] of Object.entries(tool.schema || {})) {
    const val = input[key];
    if (val == null || val === '') continue;
    if (kind === 'string' && typeof val !== 'string') errors.push(`${key}:string`);
  }
  if (errors.length) return { ok: false, error: 'VALIDATION_FAILED', errors };
  return { ok: true, tool };
}

export function canExecute(action, grantedLevel) {
  if (!action) return { ok: false, error: 'ACTION_NOT_FOUND' };
  if (action.status === 'cancelled' || action.status === 'expired') return { ok: false, error: 'ACTION_NOT_ACTIVE' };
  if (action.confirmationRequired && action.status !== 'confirmed' && action.status !== 'completed') {
    return { ok: false, error: 'CONFIRMATION_REQUIRED', level: ACTION_LEVELS.REQUEST_CONFIRMATION };
  }
  if (!assertActionLevel(grantedLevel || ACTION_LEVELS.PROPOSE, action.level)) {
    return { ok: false, error: 'PERMISSION_LEVEL_DENIED', required: action.level };
  }
  return { ok: true };
}

export function markConfirmed(action, at = new Date().toISOString()) {
  const trail = [...(action.auditTrail || []), { at, event: 'confirmed' }];
  return { ...action, status: 'confirmed', confirmedAt: at, auditTrail: trail };
}

export function markCompleted(action, result = {}, at = new Date().toISOString()) {
  const trail = [...(action.auditTrail || []), { at, event: 'completed' }];
  return { ...action, status: 'completed', result, output: result, completedAt: at, error: null, auditTrail: trail };
}

export function markFailed(action, error) {
  const at = new Date().toISOString();
  const trail = [...(action.auditTrail || []), { at, event: 'failed', error: String(error || 'ACTION_FAILED') }];
  return { ...action, status: 'failed', error: String(error || 'ACTION_FAILED'), auditTrail: trail };
}

export const BUILTIN_ACTIONS = Object.freeze([
  ...TOOL_CATALOG.map(t => t.name),
  'create', 'search', 'analyze', 'schedule', 'send', 'publish', 'prepare',
  'translate', 'moderate', 'generate', 'update', 'notify', 'control_live',
  'remember', 'export_memory', 'install_agent', 'prepare_content_pack'
]);

export { TOOL_CATALOG };
