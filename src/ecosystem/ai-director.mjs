import { createPlatformEvent } from '../platform-event-spine.mjs';

const SAFE_ACTION_TYPES = new Set([
  'suggest_scene',
  'suggest_overlay',
  'suggest_highlight',
  'suggest_quiz',
  'suggest_moderation',
  'suggest_break',
  'suggest_battle_round'
]);

const BLOCKED_AUTO = new Set([
  'payment',
  'publish',
  'delete',
  'ban_without_review',
  'send_gift',
  'transfer_funds'
]);

/**
 * Event-driven AI Director — advisory mode only.
 * Analyzes LIVE activity and proposes safe cues; never executes financial/destructive actions.
 */
export class AIDirectorEngine {
  constructor() {
    this.signals = {
      chatVelocity: 0,
      giftActivity: 0,
      battleLead: 0,
      engagementScore: 0,
      creatorIdleSec: 0,
      syloraEmotion: 'neutral'
    };
    this.lastSuggestions = [];
  }

  ingest(event) {
    const type = event?.eventType || event?.type;
    const payload = event?.payload || event || {};
    switch (type) {
      case 'live.chat.message':
        this.signals.chatVelocity = Math.min(100, this.signals.chatVelocity + 1);
        break;
      case 'gift.sent':
      case 'gift.interaction.requested':
        this.signals.giftActivity += Number(payload.quantity || 1);
        break;
      case 'battle.score.changed':
        this.signals.battleLead = Number(payload.lead || 0);
        break;
      case 'assistant.reaction.ready':
        this.signals.syloraEmotion = payload.emotion || 'neutral';
        break;
      case 'live.viewer.joined':
        this.signals.engagementScore += 0.5;
        break;
      case 'creator.action':
        this.signals.creatorIdleSec = 0;
        break;
      default:
        break;
    }
    this.signals.engagementScore = Math.min(100,
      this.signals.chatVelocity * 0.4 + this.signals.giftActivity * 2 + Math.abs(this.signals.battleLead) * 0.3
    );
  }

  analyze(context = {}) {
    const suggestions = [];
    const push = (suggestion, priority, reason, target, actionType) => {
      if (!SAFE_ACTION_TYPES.has(actionType)) return;
      suggestions.push({ suggestion, priority, reason, target, actionType, mode: 'advisory' });
    };

    if (this.signals.giftActivity >= 3) {
      push('Highlight recent gift momentum with a short replay cue', 'high', 'gift_activity_spike', 'overlay', 'suggest_highlight');
    }
    if (this.signals.chatVelocity >= 8) {
      push('Open a quick audience poll while chat is active', 'normal', 'chat_velocity_high', 'live', 'suggest_quiz');
    }
    if (Math.abs(this.signals.battleLead) >= 20) {
      push('Cue battle tension overlay for trailing side comeback atmosphere', 'normal', 'battle_lead_wide', 'battle', 'suggest_battle_round');
    }
    if (this.signals.engagementScore < 5 && (context.viewerCount || 0) > 3) {
      push('Invite chat participation with a simple prompt', 'low', 'low_engagement', 'host', 'suggest_scene');
    }
    if (context.moderationFlags?.length) {
      push('Review flagged chat before escalating', 'high', 'moderation_queue', 'moderation', 'suggest_moderation');
    }

    this.lastSuggestions = suggestions.slice(0, 5);
    return this.lastSuggestions;
  }

  propose(context = {}) {
    const suggestions = this.analyze(context);
    const top = suggestions[0];
    if (!top) {
      return createPlatformEvent({
        eventType: 'director.cue.proposed',
        liveRoomId: context.liveRoomId || null,
        actor: { type: 'director', id: 'ai-director' },
        payload: {
          suggestion: null,
          priority: 'low',
          reason: 'no_action_needed',
          target: null,
          actionType: null,
          mode: 'advisory',
          autoExecute: false
        }
      });
    }
    return createPlatformEvent({
      eventType: 'director.cue.proposed',
      liveRoomId: context.liveRoomId || null,
      actor: { type: 'director', id: 'ai-director' },
      payload: {
        ...top,
        autoExecute: false,
        blockedAutoActions: [...BLOCKED_AUTO]
      }
    });
  }
}

export function directorStatus() {
  return {
    runtime: 'PARTIAL',
    mode: 'advisory',
    autoExecute: false,
    safeActionTypes: [...SAFE_ACTION_TYPES],
    blockedAutoActions: [...BLOCKED_AUTO]
  };
}
