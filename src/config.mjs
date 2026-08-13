/**
 * Central SYLORA runtime configuration.
 * Reads environment variables, validates critical values, and never logs secrets.
 */

import { resolveIceConfig, webrtcReadiness } from './rtc-config.mjs';

export const AI_STATUS = Object.freeze({
  CONFIGURED: 'AI_CONFIGURED',
  UNAVAILABLE: 'AI_UNAVAILABLE',
  DEGRADED: 'AI_DEGRADED'
});

export class ConfigError extends Error {
  constructor(message, { code = 'CONFIG_INVALID', exitCode = 1 } = {}) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

const SECRET_ENV_NAMES = Object.freeze([
  'OPENAI_API_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'SYLORA_TURN_CREDENTIAL',
  'SYLORA_PAYMENT_SECRET_KEY',
  'SYLORA_PAYMENT_WEBHOOK_SECRET',
  'PAYMENT_PROVIDER_API_KEY',
  'SYLORA_COMPANION_TOKEN',
  'SYLORA_OAUTH_PRIVATE_KEY_PEM',
  'SYLORA_TRANSLATE_API_KEY',
  'SYLORA_EMBEDDING_API_KEY',
  'GOOGLE_OAUTH_CLIENT_SECRET',
  'POSTGRES_PASSWORD'
]);

function trim(value) {
  return String(value ?? '').trim();
}

function parseNodeEnv(value) {
  const raw = trim(value || 'development').toLowerCase();
  if (raw === 'production' || raw === 'test' || raw === 'development') return raw;
  return 'development';
}

function parsePort(value, fallback = 8787) {
  if (value == null || value === '') return fallback;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    throw new ConfigError('Invalid PORT: must be an integer between 1 and 65535.', { code: 'INVALID_PORT' });
  }
  return n;
}

export function isValidDatabaseUrl(value) {
  const url = trim(value);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'postgres:' || parsed.protocol === 'postgresql:';
  } catch {
    return false;
  }
}

export function isValidRedisUrl(value) {
  const url = trim(value);
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'redis:' || parsed.protocol === 'rediss:';
  } catch {
    return false;
  }
}

export function resolveAiStatus(env = process.env) {
  const key = trim(env.OPENAI_API_KEY);
  const model = trim(env.OPENAI_MODEL) || 'gpt-5.6';
  const realtimeModel = trim(env.OPENAI_REALTIME_MODEL) || 'gpt-realtime-2.1';
  const realtimeVoice = trim(env.OPENAI_REALTIME_VOICE) || 'marin';
  const baseURL = trim(env.OPENAI_BASE_URL) || null;
  if (!key) {
    return {
      status: AI_STATUS.UNAVAILABLE,
      configured: false,
      reason: 'OPENAI_API_KEY is not set',
      model,
      realtimeModel,
      realtimeVoice,
      baseURL,
      fallback: parseNodeEnv(env.NODE_ENV) === 'production' ? null : 'local_non_openai_paths_only',
      provider: 'none'
    };
  }
  return {
    status: AI_STATUS.CONFIGURED,
    configured: true,
    reason: null,
    model,
    realtimeModel,
    realtimeVoice,
    baseURL,
    fallback: null,
    provider: 'openai'
  };
}

export function redisPolicy({ configured, nodeEnv }) {
  return {
    configured,
    requiredForBoot: false,
    requiredForSingleNode: false,
    requiredForHorizontalScale: true,
    status: configured ? 'ok' : 'DEGRADED',
    reason: configured ? null : 'REDIS_NOT_CONFIGURED',
    uses: [
      'distributed_rate_limit',
      'live_conference_realtime_fanout',
      'durable_gift_outbox_publish',
      'peer_leases',
      'viewer_presence'
    ],
    worksWithoutRedis: [
      'single_process_sse',
      'in_memory_rate_limit',
      'local_peer_registry',
      'local_viewer_counts'
    ],
    note: nodeEnv === 'production' && !configured
      ? 'Production can serve a single Node process without Redis. Multi-instance LIVE/realtime fanout, shared rate limits, peer leases and viewer counts will not be consistent across instances.'
      : 'Redis is optional for local development. In-memory fallbacks stay on this process only.'
  };
}

export function productionBootGuard(config) {
  if (config.nodeEnv !== 'production') return { ok: true, message: null, exitCode: 0, code: null };
  if (!config.database.configured) {
    return {
      ok: false,
      message: 'Production startup blocked: DATABASE_URL is required.',
      exitCode: 1,
      code: 'DATABASE_URL_REQUIRED'
    };
  }
  return { ok: true, message: null, exitCode: 0, code: null };
}

export function assertProductionBoot(config, { exit = true } = {}) {
  const guard = productionBootGuard(config);
  if (guard.ok) return guard;
  if (exit) {
    console.error(guard.message);
    process.exit(guard.exitCode);
  }
  throw new ConfigError(guard.message, { code: guard.code, exitCode: guard.exitCode });
}

function paymentConfig(env = {}) {
  const provider = trim(env.PAYMENT_PROVIDER || env.SYLORA_PAYMENT_PROVIDER);
  const secret = trim(env.PAYMENT_PROVIDER_API_KEY || env.SYLORA_PAYMENT_SECRET_KEY);
  const webhook = trim(env.SYLORA_PAYMENT_WEBHOOK_SECRET);
  const configured = Boolean(provider && secret);
  return {
    provider: provider || null,
    configured,
    webhookConfigured: Boolean(webhook),
    status: configured ? 'CONFIGURED' : 'BLOCKED_EXTERNAL',
    reason: configured ? null : 'PAYMENT_PROVIDER_NOT_CONFIGURED',
    note: 'TEST LUMEN remains sandbox until a real provider is configured. No credentials are invented.'
  };
}

export function loadConfig(env = process.env) {
  const nodeEnv = parseNodeEnv(env.NODE_ENV);
  const databaseUrl = trim(env.DATABASE_URL);
  const redisUrl = trim(env.REDIS_URL);
  const databaseConfigured = isValidDatabaseUrl(databaseUrl);
  const redisConfigured = isValidRedisUrl(redisUrl);
  const ice = resolveIceConfig(env);
  const webrtc = webrtcReadiness({ iceServers: ice.iceServers, nodeEnv });
  const ai = resolveAiStatus({ ...env, NODE_ENV: nodeEnv });
  const config = {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    isDevelopment: nodeEnv === 'development',
    port: parsePort(env.PORT),
    dataFile: trim(env.SYLORA_DATA_FILE) || null,
    sessionTtlDays: Number(env.SESSION_TTL_DAYS || 30),
    database: {
      configured: databaseConfigured,
      url: databaseConfigured ? databaseUrl : '',
      requiredInProduction: true,
      jsonFallbackAllowed: nodeEnv !== 'production'
    },
    redis: {
      configured: redisConfigured,
      url: redisConfigured ? redisUrl : '',
      policy: redisPolicy({ configured: redisConfigured, nodeEnv })
    },
    ai,
    webrtc: {
      ...webrtc,
      iceServers: ice.iceServers,
      sources: ice.sources,
      credentialDelivery: ice.credentialDelivery,
      credentialNote: ice.credentialNote
    },
    payments: paymentConfig(env),
    companion: {
      tokenConfigured: Boolean(trim(env.SYLORA_COMPANION_TOKEN)),
      origins: trim(env.SYLORA_COMPANION_ORIGINS)
    },
    hstsEnabled: nodeEnv === 'production' && env.SYLORA_ENABLE_HSTS === '1'
  };
  config.boot = productionBootGuard(config);
  return config;
}

export function publicAiStatus(ai) {
  return {
    status: ai.status,
    configured: ai.configured,
    reason: ai.reason,
    provider: ai.provider,
    model: ai.configured ? ai.model : null,
    fallback: ai.fallback,
    requiredForReady: false
  };
}

export function publicDiagnostics(config) {
  return {
    environment: config.nodeEnv,
    port: config.port,
    database: {
      configured: config.database.configured,
      requiredInProduction: config.database.requiredInProduction,
      jsonFallbackAllowed: config.database.jsonFallbackAllowed
    },
    redis: {
      configured: config.redis.configured,
      status: config.redis.policy.status,
      reason: config.redis.policy.reason,
      requiredForHorizontalScale: config.redis.policy.requiredForHorizontalScale
    },
    ai: publicAiStatus(config.ai),
    webrtc: {
      status: config.webrtc.status,
      turnConfigured: config.webrtc.turnConfigured,
      stunConfigured: config.webrtc.stunConfigured,
      reason: config.webrtc.reason,
      liveCapability: config.webrtc.liveCapability,
      credentialDelivery: config.webrtc.credentialDelivery
    },
    payments: {
      configured: config.payments.configured,
      status: config.payments.status,
      reason: config.payments.reason,
      provider: config.payments.configured ? config.payments.provider : null
    }
  };
}

export function safeErrorCode(error, allowed = new Set()) {
  const message = String(error?.message || '');
  if (allowed.has(message)) return message;
  return 'BAD_REQUEST';
}

export function containsSecretName(text) {
  const raw = String(text || '');
  return SECRET_ENV_NAMES.some(name => raw.includes(name) && /key|secret|token|password|credential|database_url|redis_url/i.test(raw));
}

export { SECRET_ENV_NAMES };
