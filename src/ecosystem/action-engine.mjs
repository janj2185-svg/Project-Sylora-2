import { ACTION_LEVELS, assertActionLevel, criticalActionRequiresConfirmation } from './permissions.mjs';

/**
 * Universal AI Action Engine.
 * Every action records actor, agent, permission, confirmation, result, audit.
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
  const needsConfirmation = level !== ACTION_LEVELS.EXECUTE_ALLOWED || criticalActionRequiresConfirmation(type);
  return {
    id,
    userId,
    agentId,
    actorType,
    type,
    level,
    input,
    output: null,
    permission,
    context,
    status: needsConfirmation ? 'pending' : 'ready',
    confirmationRequired: needsConfirmation,
    confirmedAt: null,
    result: null,
    error: null,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString()
  };
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
  return { ...action, status: 'confirmed', confirmedAt: at };
}

export function markCompleted(action, result = {}, at = new Date().toISOString()) {
  return { ...action, status: 'completed', result, output: result, completedAt: at, error: null };
}

export function markFailed(action, error) {
  return { ...action, status: 'failed', error: String(error || 'ACTION_FAILED') };
}

export const BUILTIN_ACTIONS = Object.freeze([
  'create', 'search', 'analyze', 'schedule', 'send', 'publish', 'prepare',
  'translate', 'moderate', 'generate', 'update', 'notify', 'control_live',
  'remember', 'export_memory', 'install_agent'
]);
