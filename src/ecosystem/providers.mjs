/**
 * Provider abstraction — do not hard-wire the whole product to one vendor forever.
 * Concrete adapters resolve from env; missing provider → honest blocked status.
 */

import { resolveAiStatus } from '../config.mjs';

export function resolveAiProvider(env = process.env) {
  const ai = resolveAiStatus(env);
  if (ai.configured) {
    return {
      id: 'openai',
      status: 'ready',
      aiStatus: ai.status,
      reason: ai.reason,
      fallback: ai.fallback,
      chatModel: env.OPENAI_MODEL || ai.model,
      fastModel: env.OPENAI_MODEL_FAST || env.OPENAI_MODEL || ai.model,
      realtimeModel: env.OPENAI_REALTIME_MODEL || ai.realtimeModel
    };
  }
  return {
    id: 'none',
    status: 'blocked_provider',
    aiStatus: ai.status,
    reason: ai.reason,
    fallback: ai.fallback,
    chatModel: null,
    fastModel: null,
    realtimeModel: null
  };
}

export function resolveSpeechProvider() {
  if (process.env.OPENAI_API_KEY) return { id: 'openai-realtime', status: 'ready' };
  return { id: 'none', status: 'blocked_provider' };
}

export function resolveTranslationProvider() {
  if (process.env.SYLORA_TRANSLATE_PROVIDER) return { id: process.env.SYLORA_TRANSLATE_PROVIDER, status: 'ready' };
  return { id: 'local-stub', status: 'degraded', note: 'Passthrough/local detect until provider configured' };
}

export function resolveEmbeddingProvider() {
  if (process.env.SYLORA_EMBEDDING_PROVIDER) return { id: process.env.SYLORA_EMBEDDING_PROVIDER, status: 'ready' };
  return { id: 'none', status: 'blocked_provider', note: 'Semantic search falls back to structured + lexical' };
}

export function resolveImageProvider() {
  if (process.env.SYLORA_IMAGE_PROVIDER) return { id: process.env.SYLORA_IMAGE_PROVIDER, status: 'ready' };
  return { id: 'none', status: 'blocked_provider' };
}

export function providerSnapshot() {
  return {
    ai: resolveAiProvider(),
    speech: resolveSpeechProvider(),
    translation: resolveTranslationProvider(),
    embedding: resolveEmbeddingProvider(),
    image: resolveImageProvider()
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
