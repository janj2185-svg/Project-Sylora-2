import { normalizeAiHostControls, shouldAiSpeak } from './autonomy.mjs';
import { detectLanguageHint } from '../../language-detect.mjs';
import { AVATAR_STATES } from '../core/types.mjs';

/**
 * Sylora AI Live Host — decision + local extractive responses.
 * Model-backed speech requires OPENAI_API_KEY (fail-closed).
 */
export class SyloraLiveHost {
  constructor({ controls = {}, openai = null, memory = null } = {}) {
    this.controls = normalizeAiHostControls(controls);
    this.openai = openai;
    this.memory = memory;
    this.avatarState = 'idle';
    this.lastSpokeAt = 0;
    this.hostSpeaking = false;
    this.lastHostSpeechAt = 0;
    this.sessionNotes = [];
  }

  updateControls(patch) {
    this.controls = normalizeAiHostControls({ ...this.controls, ...patch });
    return this.controls;
  }

  setHostSpeaking(speaking) {
    this.hostSpeaking = !!speaking;
    if (speaking) this.lastHostSpeechAt = Date.now();
    this.avatarState = speaking ? 'listening' : this.avatarState === 'listening' ? 'idle' : this.avatarState;
  }

  /**
   * Score + decide on a chat/gift event. Returns action plan (may be speak:false).
   */
  considerEvent(event, { priorityScore = 0 } = {}) {
    const addressed = !!(event?.mentionsSylora || /\b(sylora|силора)\b/i.test(event?.message || event?.text || ''));
    const isGift = event?.eventType === 'gift' || event?.eventType === 'donation';
    const silenceMs = Date.now() - (this.lastHostSpeechAt || Date.now());
    const decision = shouldAiSpeak({
      controls: this.controls,
      addressedToSylora: addressed,
      hostSpeaking: this.hostSpeaking,
      silenceMs,
      priorityScore,
      isGift,
      isDonation: event?.eventType === 'donation'
    });

    if (!decision.speak) {
      return { ...decision, avatarState: this.avatarState, reply: null, mode: 'silent' };
    }

    this.avatarState = 'thinking';
    const reply = this.#localReply(event, { addressed, isGift });
    this.avatarState = 'speaking';
    this.lastSpokeAt = Date.now();
    this.sessionNotes.push({
      at: new Date().toISOString(),
      reason: decision.reason,
      eventType: event?.eventType,
      preview: String(eventText(event) || event?.gift?.name || '').slice(0, 80)
    });
    if (this.memory) {
      this.memory.rememberInteraction({
        platform: event?.platform,
        userId: event?.userId,
        username: event?.username,
        kind: isGift ? 'gift' : (event?.eventType || 'chat'),
        summary: reply.text.slice(0, 160)
      });
    }
    // Return to idle shortly (caller/UI drives timing)
    setTimeout(() => { if (this.avatarState === 'speaking') this.avatarState = 'idle'; }, 0);
    return {
      speak: true,
      reason: decision.reason,
      avatarState: 'speaking',
      reply,
      mode: this.openai ? 'model_optional' : 'local_cohost_tool',
      modelChat: false,
      providerConfigured: !!this.openai,
      aiState: this.openai ? 'MODEL_AVAILABLE' : 'AI_CONFIGURATION_REQUIRED'
    };
  }

  snapshot() {
    return {
      controls: this.controls,
      avatarState: AVATAR_STATES.includes(this.avatarState) ? this.avatarState : 'idle',
      hostSpeaking: this.hostSpeaking,
      lastSpokeAt: this.lastSpokeAt ? new Date(this.lastSpokeAt).toISOString() : null,
      providerConfigured: !!this.openai,
      aiState: this.openai ? 'MODEL_AVAILABLE' : 'AI_CONFIGURATION_REQUIRED',
      pipeline: [
        'live_events', 'normalize', 'event_bus', 'context',
        'ai_decision', 'response', 'chat_tts_avatar_action'
      ],
      recentNotes: this.sessionNotes.slice(-20)
    };
  }

  #localReply(event, { addressed, isGift }) {
    const sourceText = eventText(event);
    const lang = this.controls.language === 'auto'
      ? (detectLanguageHint(sourceText) || 'uk')
      : this.controls.language;
    const name = event?.displayName || event?.username || 'друже';
    let text;
    if (isGift) {
      const giftName = event?.gift?.name || event?.gift?.id || 'подарунок';
      text = pick(lang, {
        uk: `Дякую, ${name}! ${giftName} — це тепло для ефіру.`,
        pl: `Dziękuję, ${name}! ${giftName} — piękny gest.`,
        en: `Thank you, ${name}! ${giftName} means a lot to the stream.`,
        de: `Danke, ${name}! ${giftName} — das freut uns sehr.`
      });
      this.avatarState = 'excited';
    } else if (addressed) {
      text = pick(lang, {
        uk: `${name}, я тут. ${shortAck(sourceText)}`,
        pl: `${name}, jestem tu. ${shortAck(sourceText)}`,
        en: `${name}, I'm here. ${shortAck(sourceText)}`,
        de: `${name}, ich bin da. ${shortAck(sourceText)}`
      });
    } else if (event?.eventType === 'follow' || event?.eventType === 'subscription' || event?.eventType === 'membership') {
      text = pick(lang, {
        uk: `${name}, вітаємо у спільноті — раді тебе бачити!`,
        pl: `${name}, witamy w społeczności!`,
        en: `${name}, welcome to the community!`,
        de: `${name}, willkommen in der Community!`
      });
      this.avatarState = 'happy';
    } else if (event?.eventType === 'viewer_joined' || event?.eventType === 'guest_join') {
      text = pick(lang, {
        uk: `${name} щойно зайшов — привітаймо!`,
        pl: `${name} właśnie dołączył — powitajmy!`,
        en: `${name} just joined — say hi!`,
        de: `${name} ist gerade dabei — begrüßen wir!`
      });
    } else {
      text = pick(lang, {
        uk: `Цікаве питання від ${name} — ведучий, зверни увагу.`,
        pl: `Ciekawe pytanie od ${name} — warto odpowiedzieć.`,
        en: `Interesting note from ${name} — worth answering.`,
        de: `Interessanter Punkt von ${name} — lohnt eine Antwort.`
      });
    }
    return {
      text,
      language: lang,
      addressedTo: event?.userId || event?.username || null,
      platform: event?.platform || null,
      toolKind: 'local_live_cohost',
      hardcodeForbidden: false,
      aiState: this.openai ? 'MODEL_AVAILABLE' : 'AI_CONFIGURATION_REQUIRED',
      note: this.openai
        ? 'Local co-host draft; model path available when OPENAI_API_KEY set for richer speech.'
        : 'AI_CONFIGURATION_REQUIRED — local co-host tool only until OPENAI_API_KEY is set.'
    };
  }
}

function eventText(event) {
  return String(event?.message ?? event?.text ?? '');
}

function pick(lang, map) {
  return map[lang] || map.uk || map.en;
}

function shortAck(msg) {
  const t = String(msg || '').replace(/\b(sylora|силора)\b/ig, '').trim();
  if (!t) return '';
  return t.length > 80 ? `${t.slice(0, 77)}…` : t;
}
