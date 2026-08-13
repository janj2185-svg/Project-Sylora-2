/**
 * Provider abstraction — do not hard-wire the whole product to one vendor forever.
 * Concrete adapters resolve from env; missing provider → honest blocked status.
 */

import { AI_STATUS, loadRuntimeConfig } from '../config.mjs';

export function resolveAiProvider() {
  const config = loadRuntimeConfig(process.env);
  if (config.ai.configured) {
    return {
      id: 'openai',
      status: config.ai.status === AI_STATUS.DEGRADED ? 'degraded' : 'ready',
      aiStatus: config.ai.status,
      chatModel: process.env.OPENAI_MODEL || 'gpt-5.6',
      fastModel: process.env.OPENAI_MODEL_FAST || process.env.OPENAI_MODEL || 'gpt-5.6',
      realtimeModel: process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime'
    };
  }
  return {
    id: 'none',
    status: 'blocked_provider',
    aiStatus: config.ai.status,
    chatModel: null,
    fastModel: null,
    realtimeModel: null
  };
}

export function resolveSpeechProvider() {
  const config = loadRuntimeConfig(process.env);
  if (config.ai.configured) {
    return {
      id: 'openai-realtime',
      status: config.ai.status === AI_STATUS.DEGRADED ? 'degraded' : 'ready',
      aiStatus: config.ai.status
    };
  }
  return { id: 'none', status: 'blocked_provider', aiStatus: config.ai.status };
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
