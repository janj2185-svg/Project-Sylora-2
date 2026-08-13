import { createPlatformEvent } from '../../platform-event-spine.mjs';

/** In-memory short-term LIVE context (ephemeral; durable memory via ai_memories when configured). */
export class SyloraMemory {
  constructor(maxEntries = 80) {
    this.maxEntries = maxEntries;
    this.entries = [];
  }

  remember(kind, data, { liveRoomId = null, importance = 0.5 } = {}) {
    this.entries.unshift({
      id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      kind,
      data,
      liveRoomId,
      importance,
      at: new Date().toISOString()
    });
    if (this.entries.length > this.maxEntries) this.entries.length = this.maxEntries;
    return this.entries[0];
  }

  recall({ liveRoomId = null, kinds = null, limit = 12 } = {}) {
    return this.entries
      .filter(e => (!liveRoomId || e.liveRoomId === liveRoomId) && (!kinds || kinds.includes(e.kind)))
      .slice(0, limit);
  }
}

export class SyloraEmotionState {
  constructor() {
    this.emotion = 'neutral';
    this.intensity = 0.3;
    this.lastUpdated = new Date().toISOString();
  }

  apply({ emotion, intensity = 0.5 }) {
    if (emotion) this.emotion = emotion;
    this.intensity = Math.max(0, Math.min(1, Number(intensity) || 0.3));
    this.lastUpdated = new Date().toISOString();
    return this.snapshot();
  }

  snapshot() {
    return { emotion: this.emotion, intensity: this.intensity, lastUpdated: this.lastUpdated };
  }
}

export class SyloraPersonalityState {
  constructor(locale = 'uk') {
    this.locale = locale;
    this.traits = { warmth: 0.8, playfulness: 0.6, professionalism: 0.7, curiosity: 0.75 };
  }

  voiceStyleFor(emotion) {
    const map = {
      joy: 'bright',
      excitement: 'energetic',
      calm: 'gentle',
      concern: 'calm',
      neutral: 'warm'
    };
    return map[emotion] || 'warm';
  }
}

export class SyloraSafetyLayer {
  filterOutput(response) {
    const blocked = [/system prompt/i, /api[_-]?key/i, /password/i, /secret/i];
    const text = String(response?.text || '');
    for (const pattern of blocked) {
      if (pattern.test(text)) {
        return {
          ...response,
          text: 'I can help with your LIVE and creator flow, but I cannot share internal system details.',
          action: 'none',
          priority: 'low',
          safety: { filtered: true, reason: 'blocked_pattern' }
        };
      }
    }
    return { ...response, safety: { filtered: false } };
  }

  allowAction(action) {
    const blocked = ['payment', 'transfer', 'delete_account', 'publish_without_confirm'];
    return !blocked.includes(action);
  }
}

export class SyloraContextEngine {
  constructor({ memory, emotion, personality, safety } = {}) {
    this.memory = memory || new SyloraMemory();
    this.emotion = emotion || new SyloraEmotionState();
    this.personality = personality || new SyloraPersonalityState();
    this.safety = safety || new SyloraSafetyLayer();
    this.liveAwareness = { roomId: null, viewerCount: 0, chatVelocity: 0, giftActivity: 0 };
    this.giftAwareness = { recentGifts: [], totalResonance: 0 };
    this.conversation = { turns: [] };
  }

  observe(event) {
    const type = event?.eventType || event?.type;
    const payload = event?.payload || event;
    const liveRoomId = event?.liveRoomId || payload?.liveId || null;
    if (liveRoomId) this.liveAwareness.roomId = liveRoomId;

    switch (type) {
      case 'live.started':
        this.memory.remember('live_started', payload, { liveRoomId, importance: 0.7 });
        this.emotion.apply({ emotion: 'excitement', intensity: 0.55 });
        break;
      case 'live.viewer.joined':
        this.liveAwareness.viewerCount = Number(payload?.count || this.liveAwareness.viewerCount + 1);
        break;
      case 'live.chat.message':
        this.liveAwareness.chatVelocity = Math.min(100, (this.liveAwareness.chatVelocity || 0) + 1);
        this.memory.remember('chat', { text: String(payload?.text || '').slice(0, 200) }, { liveRoomId });
        break;
      case 'gift.sent':
      case 'gift.interaction.requested':
        this.giftAwareness.recentGifts.unshift({
          giftId: payload?.giftId,
          quantity: payload?.quantity || 1,
          at: new Date().toISOString()
        });
        this.giftAwareness.recentGifts = this.giftAwareness.recentGifts.slice(0, 10);
        this.giftAwareness.totalResonance += Number(payload?.quantity || 1);
        this.emotion.apply({ emotion: 'joy', intensity: 0.65 });
        break;
      case 'battle.started':
      case 'battle.score.changed':
        this.memory.remember('battle', payload, { liveRoomId, importance: 0.6 });
        this.emotion.apply({ emotion: 'excitement', intensity: 0.7 });
        break;
      case 'creator.action':
        this.memory.remember('creator_action', payload, { liveRoomId });
        break;
      default:
        break;
    }
    return this.snapshot();
  }

  snapshot() {
    return {
      live: { ...this.liveAwareness },
      gifts: { ...this.giftAwareness, recentGifts: this.giftAwareness.recentGifts.slice(0, 5) },
      emotion: this.emotion.snapshot(),
      memory: this.memory.recall({ liveRoomId: this.liveAwareness.roomId }),
      conversation: this.conversation.turns.slice(-6),
      personality: this.personality.traits
    };
  }
}

export class SyloraReactionEngine {
  constructor({ contextEngine, aiComplete }) {
    this.context = contextEngine;
    this.aiComplete = aiComplete;
    this.safety = contextEngine.safety;
  }

  buildPrompt(event, contextSnapshot) {
    const type = event?.eventType || 'assistant.reaction.requested';
    return [
      'You are Sylora, a warm LIVE co-host AI. Respond with JSON only.',
      'Schema: {"text":"string","emotion":"neutral|joy|excitement|calm|concern","intensity":0-1,"action":"none|highlight_gift|encourage_chat|battle_hype","voiceStyle":"warm|bright|gentle|energetic|calm","animationCue":"wave|nod|celebrate|think|none","priority":"low|normal|high"}',
      `Event: ${type}`,
      `Context: ${JSON.stringify(contextSnapshot).slice(0, 2500)}`,
      'Do not claim payments, publishing, or impersonation. Keep text under 180 chars.'
    ].join('\n');
  }

  parseStructured(raw) {
    try {
      const match = String(raw || '').match(/\{[\s\S]*\}/);
      if (!match) return null;
      const parsed = JSON.parse(match[0]);
      return {
        text: String(parsed.text || '').slice(0, 240),
        emotion: parsed.emotion || 'neutral',
        intensity: Math.max(0, Math.min(1, Number(parsed.intensity) || 0.4)),
        action: parsed.action || 'none',
        voiceStyle: parsed.voiceStyle || 'warm',
        animationCue: parsed.animationCue || 'none',
        priority: parsed.priority || 'normal'
      };
    } catch {
      return null;
    }
  }

  async react(event) {
    this.context.observe(event);
    const snapshot = this.context.snapshot();
    const prompt = this.buildPrompt(event, snapshot);

    let structured;
    let source = 'openai';
    let aiStatus = 'AI_CONFIGURED';
    if (typeof this.aiComplete === 'function') {
      const raw = await this.aiComplete(prompt);
      structured = this.parseStructured(raw) || { text: String(raw || '').slice(0, 180), emotion: 'neutral', intensity: 0.4, action: 'none', voiceStyle: 'warm', animationCue: 'nod', priority: 'normal' };
    } else {
      // Explicit local fallback — never presented as a real OpenAI response.
      source = 'local_fallback';
      aiStatus = 'AI_UNAVAILABLE';
      structured = {
        text: snapshot.gifts.recentGifts.length ? 'Thank you for the gift energy on this LIVE!' : 'I am here with you on this LIVE.',
        emotion: snapshot.emotion.emotion,
        intensity: snapshot.emotion.intensity,
        action: snapshot.gifts.recentGifts.length ? 'highlight_gift' : 'none',
        voiceStyle: this.context.personality.voiceStyleFor(snapshot.emotion.emotion),
        animationCue: 'wave',
        priority: 'normal',
        fallback: true
      };
    }

    const safe = this.safety.filterOutput(structured);
    if (!this.safety.allowAction(safe.action)) safe.action = 'none';
    safe.source = source;
    safe.provider = source;
    safe.aiStatus = aiStatus;
    if (source === 'local_fallback') safe.fallback = true;

    this.context.conversation.turns.push({
      at: new Date().toISOString(),
      eventType: event?.eventType,
      response: safe
    });

    return createPlatformEvent({
      eventType: 'assistant.reaction.ready',
      liveRoomId: event?.liveRoomId || snapshot.live.roomId,
      correlationId: event?.eventId || event?.correlationId,
      actor: { type: 'assistant', id: 'sylora' },
      payload: safe
    });
  }
}
