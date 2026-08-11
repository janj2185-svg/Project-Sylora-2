import { assertActionLevel, requiresConfirmation } from './permissions.mjs';

/**
 * Universal AI Action Engine.
 * Every action records actor, agent, permission, confirmation, result, audit.
 */
export function createActionEngine({ id, now, persistAudit }) {
  return {
    async plan({
      userId,
      agentId = 'personal-ai',
      type,
      level = 'PROPOSE',
      input = {},
      permission = null,
      allowed = false
    }) {
      const actionLevel = assertActionLevel(level);
      if (!allowed && actionLevel === 'EXECUTE_ALLOWED') {
        return {
          status: 'denied',
          reason: 'PERMISSION_DENIED',
          action: null
        };
      }
      const action = {
        id: id(),
        userId,
        agentId,
        type,
        level: actionLevel,
        input,
        permission,
        status: requiresConfirmation(actionLevel) ? 'pending_confirmation' : actionLevel === 'READ' || actionLevel === 'PROPOSE' || actionLevel === 'PREPARE' ? 'ready' : 'pending_confirmation',
        output: null,
        error: null,
        createdAt: now(),
        confirmedAt: null,
        completedAt: null
      };
      await persistAudit?.({
        type: 'ai.action.planned',
        userId,
        actorId: agentId,
        payload: { actionId: action.id, actionType: type, level: actionLevel, status: action.status }
      });
      return { status: action.status, action };
    },

    async confirm(action, { executor }) {
      if (!action || action.status !== 'pending_confirmation') {
        return { status: 'error', error: 'AI_ACTION_NOT_FOUND', action };
      }
      try {
        const output = await executor(action);
        action.status = 'completed';
        action.output = output;
        action.confirmedAt = now();
        action.completedAt = now();
        await persistAudit?.({
          type: 'ai.action.completed',
          userId: action.userId,
          actorId: action.agentId,
          payload: { actionId: action.id, actionType: action.type }
        });
        return { status: 'completed', action };
      } catch (error) {
        action.status = 'failed';
        action.error = error?.message || 'ACTION_FAILED';
        action.completedAt = now();
        await persistAudit?.({
          type: 'ai.action.failed',
          userId: action.userId,
          actorId: action.agentId,
          payload: { actionId: action.id, error: action.error }
        });
        return { status: 'failed', action, error: action.error };
      }
    }
  };
}
