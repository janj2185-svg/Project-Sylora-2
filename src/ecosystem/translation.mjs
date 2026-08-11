/**
 * Universal translation layer.
 * Text path works offline. Provider adapters require env keys (BLOCKED until configured).
 */

const DETECT_HINTS = [
  [/^[а-яіїєґ’'\-\s.,!?0-9]+$/i, 'uk'],
  [/^[a-z'\-\s.,!?0-9]+$/i, 'en'],
  [/^[a-ząćęłńóśźż'\-\s.,!?0-9]+$/i, 'pl']
];

export function detectLanguage(text = '') {
  const sample = String(text || '').trim();
  if (!sample) return 'und';
  if (/[а-яіїєґ]/i.test(sample)) return 'uk';
  if (/[ąćęłńóśźż]/i.test(sample)) return 'pl';
  for (const [re, code] of DETECT_HINTS) if (re.test(sample)) return code;
  return 'und';
}

export function translationProviderStatus(env = process.env) {
  return {
    text: env.SYLORA_TRANSLATE_API_KEY || env.OPENAI_API_KEY ? 'configured' : 'blocked',
    speechToText: env.SYLORA_STT_API_KEY ? 'configured' : 'blocked',
    textToSpeech: env.SYLORA_TTS_API_KEY ? 'configured' : 'blocked',
    voicePreserve: env.SYLORA_VOICE_PRESERVE_API_KEY ? 'configured' : 'blocked',
    note: 'Synthetic/translated voice must always be labeled when generated.'
  };
}

/** Deterministic sandbox translation for tests/dev without external APIs. */
export function sandboxTranslate(text, { target = 'en', source } = {}) {
  const detected = source || detectLanguage(text);
  if (detected === target) {
    return {
      sourceLanguage: detected,
      targetLanguage: target,
      text: String(text),
      provider: 'passthrough',
      synthetic: false,
      labeled: false
    };
  }
  return {
    sourceLanguage: detected,
    targetLanguage: target,
    text: `[${target}] ${String(text)}`,
    provider: 'sandbox',
    synthetic: true,
    labeled: true,
    label: 'translated'
  };
}

export async function translateText(text, options = {}, env = process.env) {
  const target = options.target || 'en';
  if (!text) throw new Error('TEXT_REQUIRED');
  if (!env.SYLORA_TRANSLATE_API_KEY && !env.OPENAI_API_KEY) {
    return { ...sandboxTranslate(text, { target, source: options.source }), blockedProvider: true };
  }
  // Full provider wiring is prepared; without a dedicated translate endpoint we keep sandbox
  // unless a future adapter is injected. This avoids fake "production translation" claims.
  if (typeof options.provider === 'function') {
    const result = await options.provider(text, { ...options, target });
    return { ...result, labeled: !!result.synthetic, blockedProvider: false };
  }
  return { ...sandboxTranslate(text, { target, source: options.source }), blockedProvider: false, provider: 'adapter-pending' };
}

export function buildLiveTranslationTurn({ speakerId, sourceText, targetLanguages = ['en'] }) {
  const sourceLanguage = detectLanguage(sourceText);
  return {
    speakerId,
    sourceLanguage,
    sourceText,
    targets: targetLanguages.map(code => sandboxTranslate(sourceText, { target: code, source: sourceLanguage })),
    accessibility: { originalAvailable: true },
    latencyBudgetMs: 1500
  };
}
