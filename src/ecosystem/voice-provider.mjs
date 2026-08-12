/**
 * Voice Provider abstraction — selectable voices, language-aware, expressive hooks.
 * Does not invent credentials. Uses OpenAI Realtime when available, else browser speechSynthesis.
 */

export const VOICE_PROVIDERS = Object.freeze({
  openai_realtime: {
    id: 'openai_realtime',
    status: () => (!!process.env.OPENAI_API_KEY ? 'READY' : 'BLOCKED_EXTERNAL'),
    voices: [
      { id: 'marin', label: 'Marin · soft warm', gender: 'female', style: 'warm' },
      { id: 'coral', label: 'Coral · bright', gender: 'female', style: 'bright' },
      { id: 'sage', label: 'Sage · calm', gender: 'female', style: 'calm' },
      { id: 'shimmer', label: 'Shimmer · gentle', gender: 'female', style: 'gentle' },
      { id: 'ballad', label: 'Ballad · soft', gender: 'female', style: 'soft' },
      { id: 'alloy', label: 'Alloy · neutral', gender: 'neutral', style: 'neutral' },
      { id: 'echo', label: 'Echo · clear', gender: 'neutral', style: 'clear' },
      { id: 'ash', label: 'Ash · steady', gender: 'neutral', style: 'serious' }
    ],
    defaultVoice: 'marin',
    note: 'Best available production path for LIVE voice. Ukrainian accent quality depends on OpenAI Realtime voice — not guaranteed native-UA.'
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
      honesty: VOICE_PROVIDERS.openai_realtime.note
    };
  }
  return {
    active: 'browser_speech',
    ...VOICE_PROVIDERS.browser_speech,
    status: 'PARTIAL',
    honesty: 'OPENAI_API_KEY missing — browser TTS only'
  };
}

export function preferredRealtimeVoice(style = 'warm') {
  const map = {
    warm: 'marin', gentle: 'shimmer', calm: 'sage', bright: 'coral',
    soft: 'ballad', professional: 'alloy', energetic: 'coral', deep: 'ash'
  };
  return map[style] || process.env.OPENAI_REALTIME_VOICE || 'marin';
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
