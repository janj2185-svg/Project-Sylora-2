import { ACTION_LEVELS } from './permissions.mjs';

const CRITICAL_ACTIONS = new Set([
  'payment.execute',
  'wallet.transfer',
  'account.delete',
  'memory.export',
  'agent.install',
  'business.contract',
  'publish.live',
  'message.send_external'
]);

export function requiredActionLevel(actionType = '') {
  if (CRITICAL_ACTIONS.has(actionType)) return ACTION_LEVELS.REQUEST_CONFIRMATION;
  if (actionType.endsWith('.write') || actionType.endsWith('.publish')) return ACTION_LEVELS.REQUEST_CONFIRMATION;
  if (actionType.endsWith('.prepare')) return ACTION_LEVELS.PREPARE;
  if (actionType.endsWith('.propose')) return ACTION_LEVELS.PROPOSE;
  return ACTION_LEVELS.READ;
}

export function buildActionRecord({
  id,
  userId,
  agentId = 'personal',
  actionType,
  level,
  input = {},
  permission = null,
  confirmed = false,
  result = null,
  error = null,
  createdAt
}) {
  return {
    id,
    userId,
    actor: { type: 'agent', agentId },
    actionType,
    level: level || requiredActionLevel(actionType),
    input,
    permission,
    confirmed,
    result,
    error,
    createdAt
  };
}

export function canExecuteAction({ level, permissionGranted, userConfirmed }) {
  if (level === ACTION_LEVELS.READ) return true;
  if (level === ACTION_LEVELS.PROPOSE || level === ACTION_LEVELS.PREPARE) return permissionGranted;
  if (level === ACTION_LEVELS.REQUEST_CONFIRMATION) return permissionGranted && userConfirmed;
  if (level === ACTION_LEVELS.EXECUTE_ALLOWED) return permissionGranted;
  return false;
}
