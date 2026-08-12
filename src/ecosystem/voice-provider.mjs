/**
 * Voice Provider abstraction — selectable voices, language-aware, expressive hooks.
 * Does not invent credentials. Uses OpenAI Realtime when available, else browser speechSynthesis.
 */

export const OPENAI_REALTIME_VOICES = Object.freeze([
  { id: 'marin', label: 'Marin · soft warm (default Sylora)', gender: 'female', style: 'warm', previewUk: 'Привіт. Я поруч — говори як тобі зручно.' },
  { id: 'shimmer', label: 'Shimmer · gentle', gender: 'female', style: 'gentle', previewUk: 'Я слухаю тебе м’яко і спокійно.' },
  { id: 'sage', label: 'Sage · calm', gender: 'female', style: 'calm', previewUk: 'Давай спокійно розберемось разом.' },
  { id: 'coral', label: 'Coral · bright', gender: 'female', style: 'bright', previewUk: 'О, це цікаво! Розкажи ще трохи.' },
  { id: 'ballad', label: 'Ballad · soft', gender: 'female', style: 'soft', previewUk: 'Я з тобою. Без поспіху.' },
  { id: 'alloy', label: 'Alloy · neutral', gender: 'neutral', style: 'neutral', previewUk: 'Можу відповісти чітко і коротко.' },
  { id: 'echo', label: 'Echo · clear', gender: 'neutral', style: 'clear', previewUk: 'Ось коротка відповідь без зайвого.' },
  { id: 'ash', label: 'Ash · steady', gender: 'neutral', style: 'serious', previewUk: 'Говоримо серйозно — я сфокусована.' }
]);

export const VOICE_PROVIDERS = Object.freeze({
  openai_realtime: {
    id: 'openai_realtime',
    status: () => (!!process.env.OPENAI_API_KEY ? 'READY' : 'BLOCKED_EXTERNAL'),
    voices: OPENAI_REALTIME_VOICES,
    defaultVoice: 'marin',
    note: 'Best available production LIVE path. Ukrainian accent quality depends on OpenAI Realtime — not guaranteed native-UA without accent. Prefer marin/shimmer/ballad for soft warm Sylora.'
  },
  browser_speech: {
    id: 'browser_speech',
    status: () => 'PARTIAL',
    voices: [],
    defaultVoice: 'auto',
    note: 'Chat TTS fallback via speechSynthesis. Quality and Ukrainian accent vary by OS/browser voices.'
  }
});

export function resolveVoiceProvider() {
  if (process.env.OPENAI_API_KEY) {
    return {
      active: 'openai_realtime',
      ...VOICE_PROVIDERS.openai_realtime,
      status: 'READY',
      chatFallback: 'browser_speech',
      honesty: VOICE_PROVIDERS.openai_realtime.note,
      recommendedSylora: 'marin'
    };
  }
  return {
    active: 'browser_speech',
    ...VOICE_PROVIDERS.browser_speech,
    status: 'PARTIAL',
    honesty: 'OPENAI_API_KEY missing — browser TTS only',
    recommendedSylora: 'auto'
  };
}

export function preferredRealtimeVoice(style = 'warm') {
  const map = {
    warm: 'marin', gentle: 'shimmer', calm: 'sage', bright: 'coral',
    soft: 'ballad', professional: 'alloy', energetic: 'coral', deep: 'ash'
  };
  return map[style] || process.env.OPENAI_REALTIME_VOICE || 'marin';
}

/** Resolve voice id from client preference, style, or env — never invent unknown ids. */
export function resolveRealtimeVoiceId({ voiceId = '', style = '' } = {}) {
  const allowed = new Set(OPENAI_REALTIME_VOICES.map(v => v.id));
  const fromClient = String(voiceId || '').trim().toLowerCase();
  if (fromClient && allowed.has(fromClient)) return fromClient;
  if (style) return preferredRealtimeVoice(style);
  const env = String(process.env.OPENAI_REALTIME_VOICE || '').trim().toLowerCase();
  if (env && allowed.has(env)) return env;
  return preferredRealtimeVoice(process.env.OPENAI_REALTIME_VOICE_STYLE || 'warm');
}

export function conversationalPersonalityAddon() {
  return [
    'Conversation style (critical): speak like a present companion, not a helpdesk bot.',
    'Avoid: template openers, repeating the user question, identical answer structure every turn, unnecessary lists, excessive politeness, saying your own name unprompted, filler phrases.',
    'Match length to the ask: short question → short answer; emotional talk → warmer tone and shorter sentences; complex ask → clearer depth without lectures.',
    'Vary rhythm and openings. Prefer natural Ukrainian when the user writes Ukrainian — warm, modern, not bureaucratic.',
    'Show you listened: react to emotion first when it matters, then help. Do not invent feelings you do not have; be honestly attentive.',
    'When unsure, say so simply. Humor is light and rare, never forced.'
  ].join(' ');
}

export function voiceCatalogPayload() {
  const provider = resolveVoiceProvider();
  return {
    provider,
    realtimeVoices: OPENAI_REALTIME_VOICES,
    realtimeDefault: resolveRealtimeVoiceId({}),
    chatFallback: 'browser_speech',
    previewSupported: {
      realtime: false, // preview requires live session; UI uses browser TTS for preview samples
      browser: true
    },
    honesty: provider.honesty || provider.note
  };
}
