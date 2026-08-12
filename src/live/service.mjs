import { LiveEventBus } from './events/bus.mjs';
import { PlatformRegistry } from './platforms/registry.mjs';
import { UnifiedLiveChat } from './chat/unified-chat.mjs';
import { rankMessages } from './chat/priority.mjs';
import { SyloraLiveHost } from './ai-host/host.mjs';
import { normalizeAiHostControls } from './ai-host/autonomy.mjs';
import { LiveMemory } from './memory/live-memory.mjs';
import { AutomationEngine, AUTOMATION_TEMPLATES, createAutomationRule } from './automation/engine.mjs';
import { LiveAnalytics } from './analytics/realtime.mjs';
import { buildStreamRecap } from './analytics/recap.mjs';
import { directorTick } from './director/director.mjs';
import { moderateMessage, defaultModerationPolicy } from './moderation/assistant.mjs';
import { normalizeBroadcastPrefs, broadcastCapabilities, guestSessionStub, defaultBroadcastPrefs } from './broadcast/center.mjs';
import { voicePipelineStatus, createTurnTakingState, applyVadFrame, applyTranscript, canTakeTurn } from './voice/turn-taking.mjs';
import { createAvatarController } from './avatar/states.mjs';
import { planGiftReaction } from './gifts/intelligence.mjs';
import { capabilityMatrixRows } from './platforms/capabilities.mjs';

/**
 * Per-user SYLORA LIVE session orchestrator.
 * Isolates platforms; reuses existing Sylora rooms via native adapter.
 */
export class SyloraLiveService {
  constructor({ store, openai = null } = {}) {
    this.store = store;
    this.openai = openai;
    this.sessions = new Map(); // userId → session
  }

  ensureStoreCollections() {
    const d = this.store.data;
    if (!d.liveRtmpDestinations) d.liveRtmpDestinations = [];
    if (!d.liveViewerMemory) d.liveViewerMemory = [];
    if (!d.liveAutomationRules) d.liveAutomationRules = [];
    if (!d.liveHostControls) d.liveHostControls = [];
    if (!d.liveBroadcastPrefs) d.liveBroadcastPrefs = [];
    if (!d.liveModerationPolicies) d.liveModerationPolicies = [];
    if (!d.liveSessionArchives) d.liveSessionArchives = [];
  }

  sessionFor(user) {
    this.ensureStoreCollections();
    let s = this.sessions.get(user.id);
    if (s) return s;
    const bus = new LiveEventBus();
    const registry = new PlatformRegistry({ bus, store: this.store, userId: user.id }).ensureDefaults();
    const chat = new UnifiedLiveChat();
    const memory = new LiveMemory({ userId: user.id, store: this.store });
    const savedControls = this.store.data.liveHostControls.find(c => c.userId === user.id)?.controls;
    const host = new SyloraLiveHost({ controls: savedControls, openai: this.openai, memory });
    const automation = new AutomationEngine({
      rules: this.store.data.liveAutomationRules.filter(r => r.userId === user.id)
    });
    const analytics = new LiveAnalytics();
    const avatar = createAvatarController('idle');
    const turn = createTurnTakingState();
    const modPolicy = this.store.data.liveModerationPolicies.find(p => p.userId === user.id)?.policy
      || defaultModerationPolicy();

    s = {
      userId: user.id,
      bus,
      registry,
      chat,
      host,
      memory,
      automation,
      analytics,
      avatar,
      turn,
      modPolicy,
      boundLiveId: null,
      giftHistory: [],
      unsub: null
    };

    s.unsub = bus.subscribe((event) => this.#onBusEvent(s, event));
    this.sessions.set(user.id, s);
    return s;
  }

  overview(user) {
    const s = this.sessionFor(user);
    return {
      product: 'SYLORA LIVE',
      connections: s.registry.listConnections(),
      health: s.registry.healthAll(),
      capabilities: capabilityMatrixRows(),
      host: s.host.snapshot(),
      broadcast: {
        prefs: this.getBroadcastPrefs(user),
        capabilities: broadcastCapabilities(),
        guests: guestSessionStub()
      },
      voice: voicePipelineStatus({ openaiConfigured: !!this.openai }),
      analytics: s.analytics.snapshot(),
      automationTemplates: AUTOMATION_TEMPLATES,
      boundLiveId: s.boundLiveId,
      honesty: {
        note: 'External platforms stay AUTH_REQUIRED/UNAVAILABLE until owner credentials. No fake connected states.',
        ai: s.host.snapshot().aiState,
        aiNote: s.host.snapshot().providerConfigured
          ? 'Model key present — generative path optional.'
          : 'AI_CONFIGURATION_REQUIRED — local co-host only until OPENAI_API_KEY is set.'
      }
    };
  }

  async connectPlatform(user, platformId) {
    const s = this.sessionFor(user);
    return s.registry.connect(platformId);
  }

  async disconnectPlatform(user, platformId) {
    const s = this.sessionFor(user);
    return s.registry.disconnect(platformId);
  }

  bindNativeLive(user, liveId) {
    const s = this.sessionFor(user);
    const room = this.store.data.liveRooms.find(r => r.id === liveId && r.hostId === user.id);
    if (!room) {
      const err = new Error('HOST_LIVE_NOT_FOUND');
      err.code = 'HOST_LIVE_NOT_FOUND';
      throw err;
    }
    s.boundLiveId = liveId;
    s.registry.get('sylora').bindStream(liveId);
    s.analytics.markStarted(room.createdAt || new Date().toISOString());
    s.bus.publish({
      platform: 'sylora',
      streamId: liveId,
      eventType: 'stream_started',
      message: room.title
    });
    return { boundLiveId: liveId, title: room.title };
  }

  ingestNativeChat(user, { liveId, message }) {
    const s = this.sessionFor(user);
    const adapter = s.registry.get('sylora');
    return adapter.ingestChat({
      streamId: liveId || s.boundLiveId,
      userId: message.userId,
      username: message.username,
      displayName: message.displayName,
      text: message.text,
      messageId: message.id,
      language: message.language
    });
  }

  ingestNativeGift(user, giftEvent) {
    const s = this.sessionFor(user);
    return s.registry.get('sylora').ingestGift(giftEvent);
  }

  publishTestFixture(user, event) {
    // Only when NODE_ENV=test|development and explicit flag — never production fake.
    if (!['test', 'development'].includes(process.env.NODE_ENV)) {
      const err = new Error('FIXTURES_DISABLED');
      err.code = 'FIXTURES_DISABLED';
      throw err;
    }
    const s = this.sessionFor(user);
    return s.bus.publish({ ...event, metadata: { ...(event.metadata || {}), fixture: true } });
  }

  getUnifiedChat(user, opts) {
    const s = this.sessionFor(user);
    const messages = s.chat.list(opts);
    const ranked = rankMessages(messages, {
      recentGiftUserIds: new Set(s.giftHistory.map(g => g.userId).filter(Boolean))
    });
    s.chat.applyPriorities(ranked.map(r => ({ id: r.id, score: r.score })));
    return {
      messages: s.chat.list(opts),
      pins: s.chat.pins,
      slowModeSec: s.chat.slowModeSec,
      priority: ranked.slice(0, 15).map(r => ({ id: r.id, score: r.score, reasons: r.reasons }))
    };
  }

  updateHostControls(user, patch) {
    const s = this.sessionFor(user);
    const controls = s.host.updateControls(patch);
    const list = this.store.data.liveHostControls;
    let row = list.find(c => c.userId === user.id);
    if (!row) {
      row = { userId: user.id, controls, updatedAt: this.store.now() };
      list.push(row);
    } else {
      row.controls = controls;
      row.updatedAt = this.store.now();
    }
    this.store.save();
    return controls;
  }

  considerAi(user, event, priorityScore = 0) {
    const s = this.sessionFor(user);
    return s.host.considerEvent(event, { priorityScore });
  }

  listAutomation(user) {
    return this.store.data.liveAutomationRules.filter(r => r.userId === user.id);
  }

  saveAutomation(user, input) {
    const rule = createAutomationRule({
      id: this.store.id(),
      userId: user.id,
      name: input.name,
      enabled: input.enabled !== false,
      when: input.when,
      if: input.if || [],
      then: input.then || [],
      createdAt: this.store.now()
    });
    this.store.data.liveAutomationRules.push(rule);
    this.store.save();
    this.sessionFor(user).automation.setRules(this.listAutomation(user));
    return rule;
  }

  deleteAutomation(user, id) {
    const before = this.store.data.liveAutomationRules.length;
    this.store.data.liveAutomationRules = this.store.data.liveAutomationRules.filter(r => !(r.userId === user.id && r.id === id));
    this.store.save();
    this.sessionFor(user).automation.setRules(this.listAutomation(user));
    return { deleted: before !== this.store.data.liveAutomationRules.length };
  }

  getBroadcastPrefs(user) {
    const row = this.store.data.liveBroadcastPrefs.find(p => p.userId === user.id);
    return row?.prefs || defaultBroadcastPrefs();
  }

  setBroadcastPrefs(user, prefs) {
    const normalized = normalizeBroadcastPrefs(prefs);
    const list = this.store.data.liveBroadcastPrefs;
    let row = list.find(p => p.userId === user.id);
    if (!row) list.push({ userId: user.id, prefs: normalized, updatedAt: this.store.now() });
    else { row.prefs = normalized; row.updatedAt = this.store.now(); }
    this.store.save();
    return normalized;
  }

  setModerationPolicy(user, policy) {
    const next = { ...defaultModerationPolicy(), ...policy };
    const list = this.store.data.liveModerationPolicies;
    let row = list.find(p => p.userId === user.id);
    if (!row) list.push({ userId: user.id, policy: next, updatedAt: this.store.now() });
    else { row.policy = next; row.updatedAt = this.store.now(); }
    this.store.save();
    this.sessionFor(user).modPolicy = next;
    return next;
  }

  director(user) {
    const s = this.sessionFor(user);
    const ranked = rankMessages(s.chat.list({ limit: 80 }));
    const repeated = ranked.filter(r => (r.reasons || []).includes('question') && r.score >= 50).length;
    return directorTick({
      analytics: s.analytics,
      chatVelocity: s.analytics.snapshot().chatPerMin,
      silenceMs: s.turn.pauseMs,
      repeatedQuestionCount: repeated
    });
  }

  recap(user) {
    const s = this.sessionFor(user);
    s.analytics.markEnded();
    const recap = buildStreamRecap({
      analytics: s.analytics,
      chatSample: s.chat.list({ limit: 200 }),
      aiNotes: s.host.sessionNotes,
      gifts: s.giftHistory
    });
    this.store.data.liveSessionArchives.unshift({
      id: this.store.id(),
      userId: user.id,
      liveId: s.boundLiveId,
      recap,
      createdAt: this.store.now()
    });
    this.store.save();
    return recap;
  }

  voiceStatus() {
    return voicePipelineStatus({ openaiConfigured: !!this.openai });
  }

  applyVad(user, frame) {
    const s = this.sessionFor(user);
    s.turn = applyVadFrame(s.turn, frame);
    s.host.setHostSpeaking(s.turn.hostSpeaking);
    return { turn: s.turn, canSpeak: canTakeTurn(s.turn, s.host.controls) };
  }

  applyHostTranscript(user, transcript) {
    const s = this.sessionFor(user);
    s.turn = applyTranscript(s.turn, transcript);
    return { turn: s.turn, canSpeak: canTakeTurn(s.turn, s.host.controls) };
  }

  saveRtmp(user, input) {
    return this.sessionFor(user).registry.get('custom_rtmp').saveDestination(input);
  }

  setRtmpKey(user, key) {
    return this.sessionFor(user).registry.get('custom_rtmp').setStreamKey(key);
  }

  memoryPack(user, query) {
    return this.sessionFor(user).memory.contextPack({ query });
  }

  clearMemory(user, scope = 'session') {
    const m = this.sessionFor(user).memory;
    if (scope === 'all') return m.clearAllLongTerm();
    return m.clearSession();
  }

  #onBusEvent(s, event) {
    s.analytics.ingest(event);

    if (event.eventType === 'chat_message') {
      const mod = moderateMessage(event.message, s.modPolicy);
      if (mod.action === 'hide' || mod.action === 'hold') {
        event = { ...event, metadata: { ...event.metadata, moderation: mod } };
      }
      const ingested = s.chat.ingestNormalizedEvent({
        ...event,
        mentionsSylora: /\b(sylora|силора)\b/i.test(event.message || '')
      });
      if (ingested?.message && mod.action === 'suggest') {
        ingested.message.moderation = mod;
      }
      if (ingested?.message && s.host.controls.chatReactions) {
        const [top] = rankMessages([ingested.message], {
          recentGiftUserIds: new Set(s.giftHistory.map(g => g.userId).filter(Boolean))
        });
        // Pass chat fields + bus eventType so co-host reads message/text consistently.
        const decision = s.host.considerEvent({
          ...ingested.message,
          message: ingested.message.text || ingested.message.message || '',
          eventType: 'chat_message'
        }, { priorityScore: top?.score || 0 });
        if (decision.speak) {
          s.avatar.setState('speaking');
          s.bus.publish({
            platform: 'sylora',
            streamId: event.streamId,
            eventType: 'ai_spoke',
            message: decision.reply?.text,
            metadata: {
              reason: decision.reason,
              mode: decision.mode,
              aiState: decision.aiState || s.host.snapshot().aiState,
              addressedTo: decision.reply?.addressedTo || null
            }
          });
        }
      }
    }

    if (['follow', 'subscription', 'membership', 'viewer_joined', 'guest_join', 'like', 'reaction'].includes(event.eventType)) {
      if (s.host.controls.chatReactions || s.host.controls.giftReactions) {
        const decision = s.host.considerEvent(event, { priorityScore: event.eventType === 'subscription' ? 80 : 55 });
        if (decision.speak) {
          s.avatar.setState(decision.avatarState || 'speaking');
          s.bus.publish({
            platform: 'sylora',
            streamId: event.streamId,
            eventType: 'ai_spoke',
            message: decision.reply?.text,
            metadata: { reason: decision.reason, trigger: event.eventType, aiState: decision.aiState }
          });
        }
      }
    }

    if (event.eventType === 'gift' || event.eventType === 'donation') {
      s.giftHistory.push(event);
      const reaction = planGiftReaction(event, {
        language: s.host.controls.language === 'auto' ? 'uk' : s.host.controls.language,
        historyCount: s.giftHistory.length
      });
      if (s.host.controls.giftReactions) {
        s.avatar.setEmotion(reaction.avatarEmotion);
        const decision = s.host.considerEvent(event, { priorityScore: 90 });
        if (decision.speak) {
          s.bus.publish({
            platform: 'sylora',
            eventType: 'ai_spoke',
            message: decision.reply?.text || reaction.text,
            metadata: { giftReaction: reaction, effects: reaction.effects }
          });
        }
      }
    }

    const plans = s.automation.evaluate(event);
    for (const plan of plans) {
      s.bus.publish({
        platform: 'sylora',
        eventType: 'automation_fired',
        message: plan.name,
        metadata: { plan }
      });
    }
  }
}

export function createSyloraLiveService(opts) {
  return new SyloraLiveService(opts);
}
