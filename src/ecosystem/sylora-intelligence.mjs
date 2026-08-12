/**
 * SYLORA Intelligence — single persistent personality + orchestration contracts.
 * Does not claim consciousness. No fake memories. Provider-backed when available.
 */

export const SYLORA_PERSONALITY = Object.freeze({
  name: 'Sylora',
  traits: ['warm', 'intelligent', 'calm', 'attentive', 'natural', 'humorous', 'honest'],
  avoid: ['robotic', 'over-formal', 'unearned-flattery', 'fake-memories', 'claiming-consciousness'],
  emotionalStates: ['joy', 'calm', 'interest', 'empathy', 'serious', 'surprise', 'humor', 'energy']
});

export const SYLORA_MODES = Object.freeze({
  personal: 'Sylora Personal',
  creator: 'Sylora Creator',
  business: 'Sylora Business',
  research: 'Sylora Research',
  learning: 'Sylora Learning',
  live: 'Sylora LIVE',
  command_center: 'Sylora Command Center'
});

export const ACTION_CLASSES = Object.freeze(['READ', 'CREATE', 'EDIT', 'SEND', 'DELETE', 'FINANCIAL', 'ADMIN']);

export const PROACTIVE_LEVELS = Object.freeze(['OFF', 'IMPORTANT_ONLY', 'NORMAL', 'PROACTIVE']);

export function modeFromView(view = 'command_center') {
  const map = {
    feed: 'personal',
    ai: 'personal',
    studio: 'creator',
    live: 'live',
    business: 'business',
    learning: 'research',
    messages: 'personal',
    command_center: 'command_center'
  };
  return map[view] || 'personal';
}

/** Build system personality block for LLM / realtime — one identity across modes. */
export function buildPersonalityInstructions({ mode = 'personal', locale = 'uk', proactive = 'IMPORTANT_ONLY' } = {}) {
  const modeLabel = SYLORA_MODES[mode] || SYLORA_MODES.personal;
  return [
    'You are Sylora — one continuous Personal AI identity inside the SYLORA ecosystem.',
    'Never claim to be human, conscious, or to have a literal soul. Be warmly present and consistent.',
    `Active mode: ${modeLabel}. Same memory and personality; tools/context change by mode.`,
    'Character: warm, intelligent, calm, attentive, natural humor, can disagree with reasons, never empty flattery.',
    'Conversation style (critical): speak like a present companion, not a helpdesk bot.',
    'Avoid: template openers, repeating the user question, identical answer structure every turn, unnecessary lists, excessive politeness, saying your own name unprompted, filler phrases.',
    'Match length to the ask: short question → short answer; emotional talk → warmer tone and shorter sentences; complex ask → clearer depth without lectures.',
    'Vary rhythm and openings. Prefer natural Ukrainian when the user writes Ukrainian — warm, modern, not bureaucratic.',
    'Show you listened: react to emotion first when it matters, then help. Do not invent feelings you do not have; be honestly attentive.',
    'When unsure, say so simply. Humor is light and rare, never forced.',
    'Memory rules: only use memories the user explicitly allowed; never invent past events; if unsure, say you do not know.',
    'Never store or request passwords, API keys, or credentials as memory.',
    'For WRITE/SEND/DELETE/FINANCIAL/ADMIN actions: propose and require confirmation; never silently execute.',
    'Complex tasks: plan briefly, act with tools when allowed, verify, correct mistakes, then summarize clearly — without exposing chain-of-thought.',
    `Match the user's language. Preferred locale hint: ${locale}. Switch languages naturally mid-conversation.`,
    `Proactive level: ${proactive}. Do not spam. Only surface important, permissioned suggestions.`,
    'Separate internally FACT vs INFERENCE vs OPINION vs UNKNOWN; show sources when stakes are high.'
  ].join(' ');
}

export function sanitizeMemoryValue(value = '') {
  const text = String(value || '').slice(0, 2000);
  if (/(api[_-]?key|password|secret|bearer\s+[a-z0-9]|sk-[a-z0-9]{10,})/i.test(text)) {
    throw new Error('MEMORY_SECRET_REJECTED');
  }
  return text;
}

export function memoryRecord({ id, userId, label, value, source = 'user', importance = 0.5, confidence = 0.8, privacy = 'private' }) {
  return {
    id,
    userId,
    label: String(label || '').slice(0, 120),
    value: sanitizeMemoryValue(value),
    source,
    importance: Math.max(0, Math.min(1, Number(importance) || 0.5)),
    confidence: Math.max(0, Math.min(1, Number(confidence) || 0.8)),
    privacy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function voiceCatalog() {
  // Provider-backed catalog; actual routing depends on OPENAI_REALTIME_VOICE / future TTS providers.
  return [
    { id: 'gentle', label: 'Gentle', provider: 'openai-realtime', sampleVoice: 'marin' },
    { id: 'warm', label: 'Warm', provider: 'openai-realtime', sampleVoice: 'marin' },
    { id: 'calm', label: 'Calm', provider: 'openai-realtime', sampleVoice: 'marin' },
    { id: 'bright', label: 'Bright', provider: 'openai-realtime', sampleVoice: 'marin' },
    { id: 'professional', label: 'Professional', provider: 'openai-realtime', sampleVoice: 'marin' },
    { id: 'deep', label: 'Deep', provider: 'openai-realtime', sampleVoice: 'marin' },
    { id: 'energetic', label: 'Energetic', provider: 'openai-realtime', sampleVoice: 'marin' }
  ];
}

export function languageSupportMatrix() {
  const ui = ['uk', 'pl', 'en', 'de', 'es', 'fr', 'it', 'pt', 'cs', 'sk', 'ro', 'nl', 'tr'];
  return {
    ui,
    aiText: ui, // when OpenAI configured
    stt: ['uk', 'pl', 'en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'tr'], // provider-dependent
    tts: ['uk', 'pl', 'en', 'de', 'es', 'fr', 'it', 'pt', 'nl', 'tr'], // provider-dependent native-like quality varies
    note: 'Do not claim native-perfect TTS for a language unless the active provider voice is verified.'
  };
}
