export const TRANSLATION_MODES = Object.freeze([
  'text', 'chat', 'subtitle', 'speech_to_text', 'text_to_speech',
  'voice', 'live', 'video_call', 'conference', 'ai'
]);

export function createTranslationJob({
  id,
  userId,
  mode = 'text',
  sourceLang = 'auto',
  targetLang = 'en',
  text = '',
  preserveVoice = false,
  context = {}
}) {
  if (!TRANSLATION_MODES.includes(mode)) throw new Error('INVALID_TRANSLATION_MODE');
  return {
    id,
    userId,
    mode,
    sourceLang,
    targetLang,
    text: String(text || '').slice(0, 8000),
    preserveVoice: !!preserveVoice,
    syntheticVoiceLabeled: true,
    status: 'queued',
    result: null,
    provider: null,
    latencyMs: null,
    context,
    createdAt: new Date().toISOString()
  };
}

/** Deterministic offline fallback — never pretends to be a production MT engine. */
export function localDetectLanguage(text = '') {
  const sample = String(text).toLowerCase();
  if (/[ąęśćżźółń]/.test(sample) || /\b(i|nie|tak|jest|się)\b/.test(sample)) return 'pl';
  if (/[іїєґ]/.test(sample) || /\b(і|не|так|це|що)\b/.test(sample)) return 'uk';
  if (/[а-яё]/.test(sample)) return 'uk';
  return 'en';
}

export function localTranslateStub(text, targetLang) {
  return {
    text: String(text || ''),
    targetLang,
    provider: 'local-passthrough',
    note: 'Production MT/STT/TTS requires provider configuration. Original text returned with metadata.',
    synthetic: false,
    originalPreserved: true
  };
}

export const VOICE_POLICY = Object.freeze({
  labelSyntheticVoice: true,
  preserveVoiceWhenLegal: true,
  alwaysExposeOriginal: true,
  latencyBudgetsMs: { chat: 800, live_caption: 1500, voice: 2000 }
});
