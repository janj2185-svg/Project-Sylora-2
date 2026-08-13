/**
 * Centralized runtime configuration.
 * Reads environment variables, validates critical values, and never logs secrets.
 */

import {
  TURN_CREDENTIAL_POLICY,
  hasStunServer,
  hasTurnServer,
  iceServersFromEnv
} from './rtc-config.mjs';

export const ENV = Object.freeze({
  DEVELOPMENT: 'development',
  TEST: 'test',
  PRODUCTION: 'production'
});

export const AI_STATUS = Object.freeze({
  CONFIGURED: 'AI_CONFIGURED',
  UNAVAILABLE: 'AI_UNAVAILABLE',
  DEGRADED: 'AI_DEGRADED'
});

export const READY_STATUS = Object.freeze({
  OK: 'OK',
  DEGRADED: 'DEGRADED',
  NOT_READY: 'NOT_READY',
  NOT_CONFIGURED: 'NOT_CONFIGURED'
});

export const REDIS_POLICY = Object.freeze({
  requiredForBoot: false,
  requiredForReadiness: false,
  singleProcessFallback: true,
  worksWithoutRedis: [
    'auth-and-sessions',
    'json-or-postgres-persistence',
    'single-process-sse',
    'in-memory-rate-limits',
    'in-memory-webrtc-peer-leases',
    'in-memory-live-viewer-presence'
  ],
  productionCapabilitiesRequiringRedis: [
    'multi-instance-sse-fanout',
    'distributed-rate-limits',
    'distributed-webrtc-peer-leases',
    'distributed-live-viewer-presence'
  ],
  note: 'Redis is optional for a single process. Production Live/realtime scale-out needs Redis; missing Redis is diagnosed as DEGRADED, not a boot failure.'
});

export class ConfigError extends Error {
  constructor(message, { code = 'CONFIG_INVALID', exitCode = 1 } = {}) {
    super(message);
    this.name = 'ConfigError';
    this.code = code;
    this.exitCode = exitCode;
  }
}

function trim(value) {
  return String(value ?? '').trim();
}

export function normalizeNodeEnv(raw) {
  const value = trim(raw).toLowerCase();
  if (value === 'production' || value === 'prod') return ENV.PRODUCTION;
  if (value === 'test') return ENV.TEST;
  return ENV.DEVELOPMENT;
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

function parsePort(raw, fallback = 8787) {
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > 65535) return fallback;
  return n;
}

function safeHost(url) {
  try {
    return new URL(url).hostname || null;
  } catch {
    return null;
  }
}

export function resolveAiStatus(env = process.env) {
  const apiKey = trim(env.OPENAI_API_KEY);
  if (!apiKey) {
    return {
      status: AI_STATUS.UNAVAILABLE,
      reason: 'OPENAI_API_KEY_MISSING',
      configured: false,
      fallback: true
    };
  }
  if (apiKey.length < 16) {
    return {
      status: AI_STATUS.DEGRADED,
      reason: 'OPENAI_API_KEY_INVALID',
      configured: false,
      fallback: true
    };
  }
  return {
    status: AI_STATUS.CONFIGURED,
    reason: 'OPENAI_CONFIGURED',
    configured: true,
    fallback: false
  };
}

function paymentConfigured(env) {
  return Boolean(
    trim(env.SYLORA_PAYMENT_SECRET_KEY)
    || trim(env.SYLORA_PAYMENT_WEBHOOK_SECRET)
    || trim(env.PAYMENT_PROVIDER_API_KEY)
  );
}

export function loadConfig(env = process.env) {
  const nodeEnv = normalizeNodeEnv(env.NODE_ENV);
  const databaseUrl = trim(env.DATABASE_URL);
  const redisUrl = trim(env.REDIS_URL);
  const ai = resolveAiStatus(env);
  const iceServers = iceServersFromEnv(env);
  const turnConfigured = hasTurnServer(iceServers);
  const stunConfigured = hasStunServer(iceServers);
  const paymentProvider = trim(env.SYLORA_PAYMENT_PROVIDER || env.PAYMENT_PROVIDER);

  return {
    env: nodeEnv,
    isProduction: nodeEnv === ENV.PRODUCTION,
    isDevelopment: nodeEnv === ENV.DEVELOPMENT,
    isTest: nodeEnv === ENV.TEST,
    port: parsePort(env.PORT, 8787),
    database: {
      url: isValidDatabaseUrl(databaseUrl) ? databaseUrl : '',
      configured: isValidDatabaseUrl(databaseUrl),
      required: nodeEnv === ENV.PRODUCTION,
      host: isValidDatabaseUrl(databaseUrl) ? safeHost(databaseUrl) : null
    },
    redis: {
      url: isValidRedisUrl(redisUrl) ? redisUrl : '',
      configured: isValidRedisUrl(redisUrl),
      required: false,
      host: isValidRedisUrl(redisUrl) ? safeHost(redisUrl) : null,
      policy: REDIS_POLICY
    },
    ai: {
      ...ai,
      provider: ai.configured ? 'openai' : 'none',
      model: trim(env.OPENAI_MODEL) || 'gpt-5.6',
      fastModel: trim(env.OPENAI_MODEL_FAST) || trim(env.OPENAI_MODEL) || 'gpt-5.6',
      realtimeModel: trim(env.OPENAI_REALTIME_MODEL) || 'gpt-realtime-2.1',
      realtimeVoice: trim(env.OPENAI_REALTIME_VOICE) || 'marin',
      baseUrl: trim(env.OPENAI_BASE_URL) || '',
      apiKey: ai.configured ? trim(env.OPENAI_API_KEY) : ''
    },
    webrtc: {
      iceServers,
      turnConfigured,
      stunConfigured,
      credentialPolicy: TURN_CREDENTIAL_POLICY
    },
    payments: {
      provider: paymentProvider || '',
      configured: Boolean(paymentProvider) && paymentConfigured(env),
      reason: paymentProvider && paymentConfigured(env) ? 'PAYMENT_CONFIGURED' : 'PAYMENT_PROVIDER_REQUIRED'
    },
    companion: {
      port: parsePort(env.SYLORA_COMPANION_PORT, 43179),
      origins: trim(env.SYLORA_COMPANION_ORIGINS)
    }
  };
}

export function publicConfigSnapshot(config) {
  return {
    env: config.env,
    port: config.port,
    database: {
      configured: config.database.configured,
      required: config.database.required,
      host: config.database.host
    },
    redis: {
      configured: config.redis.configured,
      required: config.redis.required,
      host: config.redis.host,
      policy: {
        requiredForBoot: REDIS_POLICY.requiredForBoot,
        requiredForReadiness: REDIS_POLICY.requiredForReadiness,
        singleProcessFallback: REDIS_POLICY.singleProcessFallback,
        note: REDIS_POLICY.note
      }
    },
    ai: {
      status: config.ai.status,
      reason: config.ai.reason,
      configured: config.ai.configured,
      fallback: config.ai.fallback,
      provider: config.ai.provider,
      model: config.ai.model
    },
    webrtc: {
      turnConfigured: config.webrtc.turnConfigured,
      stunConfigured: config.webrtc.stunConfigured,
      iceServerCount: config.webrtc.iceServers.length,
      credentialPolicy: config.webrtc.credentialPolicy
    },
    payments: {
      provider: config.payments.provider || null,
      configured: config.payments.configured,
      reason: config.payments.reason
    }
  };
}

export function assertProductionBoot(config = loadConfig()) {
  if (!config.isProduction) return config;
  if (!config.database.configured) {
    throw new ConfigError('Production startup blocked: DATABASE_URL is required.', {
      code: 'PRODUCTION_DATABASE_REQUIRED'
    });
  }
  return config;
}

export function evaluateHealth(config = loadConfig()) {
  return {
    status: 'ok',
    alive: true,
    service: 'sylora-core',
    env: config.env
  };
}

function probeStatus(probe, { missing, down, ok }) {
  if (!probe?.configured) return missing;
  if (probe.ok === false) return down;
  return ok;
}

export function evaluateReadiness(config, probes = {}) {
  const postgres = probes.postgres || { configured: config.database.configured, ok: true };
  const redis = probes.redis || { configured: config.redis.configured, ok: true };
  const outbox = probes.outbox || { configured: postgres.configured, ok: true };

  const database = probeStatus(postgres, {
    missing: {
      status: config.isProduction ? READY_STATUS.NOT_READY : READY_STATUS.DEGRADED,
      reason: config.isProduction ? 'DATABASE_URL_REQUIRED' : 'JSON_DEV_FALLBACK'
    },
    down: { status: READY_STATUS.NOT_READY, reason: 'DATABASE_UNREACHABLE' },
    ok: { status: READY_STATUS.OK, reason: 'DATABASE_CONNECTED' }
  });

  const redisCheck = probeStatus(redis, {
    missing: {
      status: READY_STATUS.DEGRADED,
      reason: 'REDIS_SINGLE_PROCESS_FALLBACK'
    },
    down: { status: READY_STATUS.DEGRADED, reason: 'REDIS_UNREACHABLE_SINGLE_PROCESS_FALLBACK' },
    ok: { status: READY_STATUS.OK, reason: 'REDIS_CONNECTED' }
  });

  const outboxCheck = probeStatus(outbox, {
    missing: {
      status: postgres.configured ? READY_STATUS.DEGRADED : (config.isProduction ? READY_STATUS.NOT_READY : READY_STATUS.DEGRADED),
      reason: postgres.configured ? 'OUTBOX_UNAVAILABLE' : (config.isProduction ? 'DATABASE_URL_REQUIRED' : 'JSON_DEV_FALLBACK')
    },
    down: { status: READY_STATUS.DEGRADED, reason: 'OUTBOX_UNAVAILABLE' },
    ok: { status: READY_STATUS.OK, reason: postgres.configured ? 'OUTBOX_READY' : 'JSON_DEV_FALLBACK' }
  });

  const realtime = config.webrtc.turnConfigured
    ? { status: READY_STATUS.OK, reason: 'TURN_CONFIGURED' }
    : {
      status: config.isProduction ? READY_STATUS.NOT_READY : READY_STATUS.DEGRADED,
      reason: 'TURN_NOT_CONFIGURED'
    };

  const coreReady = database.status !== READY_STATUS.NOT_READY
    && (!config.isProduction || config.database.configured);

  return {
    ready: coreReady,
    liveReady: coreReady && realtime.status === READY_STATUS.OK,
    env: config.env,
    persistence: postgres.configured ? 'postgres-social-wallet-ai-hybrid' : 'json-dev-runtime',
    checks: {
      server: { status: READY_STATUS.OK, reason: 'PROCESS_ALIVE' },
      database: { ...database, configured: !!postgres.configured, host: config.database.host },
      redis: {
        ...redisCheck,
        configured: !!redis.configured,
        host: config.redis.host,
        requiredForBoot: false,
        requiredForReadiness: false,
        scaleOut: redis.configured && redis.ok !== false ? READY_STATUS.OK : READY_STATUS.DEGRADED,
        policy: REDIS_POLICY.note
      },
      outbox: { ...outboxCheck, configured: !!outbox.configured },
      ai: {
        status: config.ai.status,
        reason: config.ai.reason,
        configured: config.ai.configured,
        fallback: config.ai.fallback,
        requiredForReady: false
      },
      realtime: {
        ...realtime,
        turnConfigured: config.webrtc.turnConfigured,
        stunConfigured: config.webrtc.stunConfigured,
        credentialPolicy: TURN_CREDENTIAL_POLICY.clientExposure
      },
      payments: {
        status: config.payments.configured ? READY_STATUS.OK : READY_STATUS.NOT_CONFIGURED,
        reason: config.payments.reason,
        requiredForReady: false
      }
    },
    dependencies: { postgres, redis, outbox }
  };
}

export function redactSecrets(value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    return value
      .replace(/[A-Za-z0-9+/=_-]{16,}/g, '[redacted]')
      .replace(/(postgres(?:ql)?|redis|rediss):\/\/[^@\s]+@/gi, '$1://[redacted]@');
  }
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (typeof value === 'object') {
    const out = {};
    for (const [key, item] of Object.entries(value)) {
      out[key] = /key|secret|password|token|credential|authorization|database_url|redis_url/i.test(key)
        ? (item ? '[redacted]' : item)
        : redactSecrets(item);
    }
    return out;
  }
  return value;
}
