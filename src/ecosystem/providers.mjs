/**
 * Provider abstraction — do not hard-wire the whole product to one vendor forever.
 * Concrete adapters resolve from env; missing provider → honest blocked status.
 * Provider-dependent E2E stays BLOCKED without secrets; architecture remains testable.
 */

export function resolveAiProvider() {
  if (process.env.OPENAI_API_KEY) {
    return {
      id: 'openai',
      status: 'ready',
      chatModel: process.env.OPENAI_MODEL || 'gpt-5.6',
      fastModel: process.env.OPENAI_MODEL_FAST || process.env.OPENAI_MODEL || 'gpt-5.6',
      realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime',
      streaming: true
    };
  }
  return {
    id: 'none',
    status: 'blocked_provider',
    chatModel: null,
    fastModel: null,
    realtimeModel: null,
    streaming: false
  };
}

export function resolveSpeechProvider() {
  if (process.env.OPENAI_API_KEY) {
    return {
      id: 'openai-realtime',
      status: 'ready',
      stt: true,
      tts: true,
      note: 'STT/TTS via realtime or speech endpoints when configured'
    };
  }
  return {
    id: 'none',
    status: 'blocked_provider',
    stt: false,
    tts: false,
    note: 'Voice I/O unavailable until speech provider credentials are set'
  };
}

export function resolveTranslationProvider() {
  if (process.env.SYLORA_TRANSLATE_PROVIDER) {
    return { id: process.env.SYLORA_TRANSLATE_PROVIDER, status: 'ready' };
  }
  return {
    id: 'local-stub',
    status: 'degraded',
    note: 'Passthrough/local detect until provider configured'
  };
}

export function resolveEmbeddingProvider() {
  if (process.env.SYLORA_EMBEDDING_PROVIDER) {
    return { id: process.env.SYLORA_EMBEDDING_PROVIDER, status: 'ready' };
  }
  return {
    id: 'none',
    status: 'blocked_provider',
    note: 'Semantic search falls back to structured + lexical'
  };
}

export function resolveImageProvider() {
  if (process.env.SYLORA_IMAGE_PROVIDER) {
    return { id: process.env.SYLORA_IMAGE_PROVIDER, status: 'ready' };
  }
  return { id: 'none', status: 'blocked_provider' };
}

/** Voice settings shape used by clients (provider-independent). */
export function defaultVoiceSettings(overrides = {}) {
  return {
    language: overrides.language || 'uk',
    inputMode: overrides.inputMode || 'text', // text | voice
    outputMode: overrides.outputMode || 'text', // text | voice | both
    sttProvider: resolveSpeechProvider().id,
    ttsProvider: resolveSpeechProvider().id,
    autoDetectLanguage: overrides.autoDetectLanguage !== false,
    ...overrides
  };
}

/** Route user language → reply language without hardcoding model replies. */
export function routeLanguage(preferred = 'uk', detected = null) {
  const supported = new Set(['uk', 'pl', 'en', 'de', 'es', 'fr', 'pt', 'it', 'cs', 'sk', 'ro', 'hu', 'tr', 'ar', 'hi', 'zh', 'ja', 'ko']);
  const pref = String(preferred || 'uk').slice(0, 8).toLowerCase();
  const det = detected ? String(detected).slice(0, 8).toLowerCase() : null;
  const lang = supported.has(det) ? det : (supported.has(pref) ? pref : 'en');
  return { replyLanguage: lang, preferred: pref, detected: det, supported: [...supported] };
}

/**
 * Permission-aware tool registry (declarative). Execution still goes through Action Engine.
 * No hardcoded AI answers — tools only describe capabilities + required permission.
 */
export function toolRegistry() {
  return Object.freeze([
    { id: 'memory.read', permission: 'memory_read', sideEffect: false },
    { id: 'memory.write', permission: 'memory_write', sideEffect: true, confirm: true },
    { id: 'publish_post', permission: 'content_write', sideEffect: true, confirm: true },
    { id: 'search.platform', permission: 'search', sideEffect: false },
    { id: 'business.invoice.draft', permission: 'business_write', sideEffect: true, confirm: true },
    { id: 'learning.tutor', permission: 'learning', sideEffect: false },
    { id: 'science.paper.ask', permission: 'science', sideEffect: false },
    { id: 'calls.signal', permission: 'calls', sideEffect: true }
  ]);
}

export function toolsForPermissions(permissions = {}) {
  return toolRegistry().filter(t => permissions[t.permission] !== false);
}

/**
 * Streaming response envelope — provider-independent chunk protocol.
 * Real tokens come from the configured provider; without one, status is setup_required.
 */
export function createStreamSession({ userId, conversationId = null, view = 'command_center' } = {}) {
  const ai = resolveAiProvider();
  return {
    id: `stream_${Date.now().toString(36)}`,
    userId,
    conversationId,
    view,
    provider: ai.id,
    status: ai.status === 'ready' ? 'ready' : 'setup_required',
    streaming: !!ai.streaming && ai.status === 'ready',
    chunks: [],
    error: ai.status === 'ready' ? null : 'AI_PROVIDER_NOT_CONFIGURED',
    fallback: ai.status === 'ready' ? null : {
      ui: 'setup_required',
      messageKey: 'ai.setupRequired',
      note: 'Configure OPENAI_API_KEY (or future provider) — do not invent model replies.'
    }
  };
}

export function appendStreamChunk(session, text, { done = false } = {}) {
  if (!session) return session;
  if (session.status === 'setup_required') {
    session.error = session.error || 'AI_PROVIDER_NOT_CONFIGURED';
    return session;
  }
  const chunk = { text: String(text || ''), at: new Date().toISOString(), done: !!done };
  session.chunks.push(chunk);
  if (done) session.status = 'completed';
  return session;
}

export function conversationPersistenceShape() {
  return {
    messages: true,
    memories: true,
    pendingActions: true,
    retention: 'user_controlled',
    note: 'Persisted via /api/ai/history and memory APIs — not ephemeral-only'
  };
}

export function memoryArchitecture() {
  return {
    categories: ['conversation', 'preferences', 'people', 'projects', 'professional', 'learning'],
    userCanExport: true,
    userCanDelete: true,
    confirmBeforeWriteFromAi: true,
    limitHint: 100
  };
}

export function providerSnapshot() {
  return {
    ai: resolveAiProvider(),
    speech: resolveSpeechProvider(),
    translation: resolveTranslationProvider(),
    embedding: resolveEmbeddingProvider(),
    image: resolveImageProvider(),
    voiceSettings: defaultVoiceSettings(),
    languageRouting: routeLanguage(),
    tools: toolRegistry(),
    streaming: { protocol: 'chunk_envelope', ready: resolveAiProvider().streaming },
    conversation: conversationPersistenceShape(),
    memory: memoryArchitecture()
  };
}

/** Aliases for platform-core / cost routing. */
export function modelRouteFor(task = 'simple') {
  const ai = resolveAiProvider();
  if (ai.status !== 'ready') return { provider: ai.id, model: null, status: ai.status };
  if (task === 'realtime' || task === 'voice') {
    return { provider: ai.id, model: ai.realtimeModel, status: 'ready', tier: 'low_latency' };
  }
  if (task === 'complex' || task === 'reasoning') {
    return { provider: ai.id, model: ai.chatModel, status: 'ready', tier: 'strong' };
  }
  return { provider: ai.id, model: ai.fastModel || ai.chatModel, status: 'ready', tier: 'fast' };
}

export function aiFallbackState(errorCode = 'AI_PROVIDER_NOT_CONFIGURED') {
  return {
    ok: false,
    error: errorCode,
    ui: errorCode === 'AI_RATE_LIMITED' ? 'rate_limited' : 'setup_required',
    retryable: errorCode === 'AI_PROVIDER_ERROR' || errorCode === 'AI_RATE_LIMITED',
    hardcodeForbidden: true
  };
}
