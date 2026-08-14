/**
 * Central runtime configuration — reads env, validates critical production settings,
 * never logs secret values.
 */

import { buildIceServersFromEnv, hasTurnServer } from './rtc-config.mjs';

export const RuntimeMode = Object.freeze({
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production'
});

export const AI_STATUS = Object.freeze({
  CONFIGURED: 'AI_CONFIGURED',
  UNAVAILABLE: 'AI_UNAVAILABLE',
  DEGRADED: 'AI_DEGRADED'
});

export const REALTIME_STATUS = Object.freeze({
  READY: 'READY',
  DEGRADED: 'DEGRADED',
  NOT_READY: 'NOT_READY'
});

function normalizeNodeEnv(raw) {
  const value = String(raw || 'development').trim().toLowerCase();
  if (value === RuntimeMode.PRODUCTION || value === RuntimeMode.TEST) return value;
  return RuntimeMode.DEVELOPMENT;
}

function parsePort(raw) {
  const port = Number(raw ?? 8787);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error('Invalid PORT configuration.');
  }
  return port;
}

function isValidDatabaseUrl(url) {
  if (!url) return false;
  return /^postgres(ql)?:\/\//i.test(url);
}

/**
 * Load runtime config from env without enforcing production boot guard.
 * @param {Record<string, string|undefined>} [env]
 */
export function loadRuntimeConfig(env = process.env) {
  const get = (key) => String(env[key] || '').trim();
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const databaseUrl = get('DATABASE_URL');
  const paymentProvider = get('PAYMENT_PROVIDER') || get('SYLORA_PAYMENT_PROVIDER');
  const iceServers = buildIceServersFromEnv(env);

  // Secret values are intentionally NOT stored on the config object.
  // Callers that need them must read process.env / provided env directly.
  const config = {
    nodeEnv,
    port: parsePort(env.PORT),
    dataFile: get('SYLORA_DATA_FILE'),
    sessionTtlDays: Math.max(1, Number(env.SESSION_TTL_DAYS || 30)),
    creatorGiftShareBps: Math.max(0, Math.min(10000, Number(env.CREATOR_GIFT_SHARE_BPS || 7000))),
    adminEmails: new Set(
      String(env.SYLORA_ADMIN_EMAILS || '')
        .split(',')
        .map((x) => x.trim().toLowerCase())
        .filter(Boolean)
    ),
    database: {
      configured: isValidDatabaseUrl(databaseUrl)
    },
    redis: {
      configured: !!get('REDIS_URL')
    },
    ai: {
      model: get('OPENAI_MODEL') || 'gpt-5.6',
      realtimeModel: get('OPENAI_REALTIME_MODEL') || 'gpt-realtime-2.1',
      realtimeVoice: get('OPENAI_REALTIME_VOICE') || 'marin',
      baseUrlConfigured: !!get('OPENAI_BASE_URL'),
      configured: !!get('OPENAI_API_KEY')
    },
    payments: {
      provider: paymentProvider || null,
      configured: !!(paymentProvider && get('SYLORA_PAYMENT_SECRET_KEY'))
    },
    companion: {
      origins: String(env.SYLORA_COMPANION_ORIGINS || '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean),
      tokenConfigured: !!get('SYLORA_COMPANION_TOKEN'),
      enableHsts: env.SYLORA_ENABLE_HSTS === '1'
    },
    iceServers,
    turnConfigured: hasTurnServer(iceServers)
  };

  config.ai.status = resolveAiStatus(config, env);
  config.realtime = resolveRealtimeStatus(config);

  return config;
}

export function resolveAiStatus(config, env = process.env) {
  if (!config.ai.configured) {
    if (config.nodeEnv === RuntimeMode.PRODUCTION) return AI_STATUS.UNAVAILABLE;
    return AI_STATUS.DEGRADED;
  }
  const baseUrl = String(env.OPENAI_BASE_URL || '').trim();
  // Custom OpenAI-compatible endpoints are treated as degraded until fully validated.
  if (baseUrl && !/api\.openai\.com/i.test(baseUrl)) return AI_STATUS.DEGRADED;
  return AI_STATUS.CONFIGURED;
}

export function resolveRealtimeStatus(config) {
  if (config.turnConfigured) return { status: REALTIME_STATUS.READY, reason: 'TURN_CONFIGURED' };
  if (config.nodeEnv === RuntimeMode.PRODUCTION) {
    return { status: REALTIME_STATUS.NOT_READY, reason: 'TURN_NOT_CONFIGURED' };
  }
  return { status: REALTIME_STATUS.DEGRADED, reason: 'TURN_NOT_CONFIGURED' };
}

export function validateProductionConfig(config) {
  const errors = [];
  if (config.nodeEnv !== RuntimeMode.PRODUCTION) return { valid: true, errors: [] };
  if (!config.database.configured) {
    errors.push('Production startup blocked: DATABASE_URL is required.');
  }
  return { valid: errors.length === 0, errors };
}

export function enforceProductionBootGuard(config) {
  const result = validateProductionConfig(config);
  if (!result.valid) {
    for (const message of result.errors) console.error(message);
    process.exit(1);
  }
}

export function persistenceLabel(config) {
  if (config.database.configured) return 'postgres-primary-memory-cache';
  if (config.nodeEnv === RuntimeMode.TEST) return 'json-test-runtime';
  return 'json-dev-runtime';
}

/** Redis usage map for diagnostics — not a boot requirement for single-instance dev. */
export function redisCapabilityMap() {
  return {
    rateLimits: { requiresRedis: false, note: 'In-memory fallback when Redis is absent' },
    liveFanout: { requiresRedis: true, note: 'Cross-instance LIVE SSE fanout; local-only without Redis' },
    conferenceFanout: { requiresRedis: true, note: 'Cross-instance conference events; local-only without Redis' },
    realtimeOutbox: { requiresRedis: true, note: 'Durable cross-instance realtime delivery' },
    liveViewerCounts: { requiresRedis: false, note: 'In-memory lease map fallback' },
    livePeerRegistry: { requiresRedis: false, note: 'In-memory peer lease fallback' }
  };
}

export function redisProductionExpectation(config) {
  if (config.nodeEnv !== RuntimeMode.PRODUCTION) {
    return {
      requiredForBoot: false,
      requiredForMultiInstance: false,
      reason: 'OPTIONAL_IN_DEV',
      note: 'Single-instance development works with in-memory fallbacks.'
    };
  }
  return {
    requiredForBoot: false,
    requiredForMultiInstance: true,
    reason: 'PRODUCTION_LIVE_REALTIME_SCALING',
    note: 'Redis is not required to boot a single production instance, but multi-instance LIVE/SSE fanout and shared rate limits need Redis.'
  };
}
