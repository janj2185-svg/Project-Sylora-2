import {
  AI_STATUS,
  REALTIME_STATUS,
  RuntimeMode,
  loadRuntimeConfig,
  persistenceLabel,
  redisCapabilityMap,
  redisProductionExpectation,
  resolveAiStatus,
  resolveRealtimeStatus,
  validateProductionConfig
} from './config.mjs';

export function publicAiDiagnostics(config) {
  const status = resolveAiStatus(config);
  const reason = status === AI_STATUS.CONFIGURED
    ? 'OPENAI_API_KEY_SET'
    : status === AI_STATUS.UNAVAILABLE
      ? 'OPENAI_API_KEY_MISSING'
      : 'OPENAI_API_KEY_MISSING_DEV_DEGRADED';
  return {
    status,
    configured: config.ai.configured,
    reason,
    model: config.ai.configured ? config.ai.model : null,
    fallback: status === AI_STATUS.DEGRADED
  };
}

export function publicRealtimeDiagnostics(config) {
  const realtime = resolveRealtimeStatus(config);
  return {
    status: realtime.status,
    reason: realtime.reason,
    turnConfigured: config.turnConfigured,
    iceServerCount: config.iceServers.length,
    note: config.turnConfigured
      ? 'TURN credentials may be delivered to browsers via /api/live/rtc-config for WebRTC.'
      : 'NAT traversal degraded without TURN; STUN-only may fail on restrictive networks.'
  };
}

export function publicConfigDiagnostics(config) {
  const productionValidation = validateProductionConfig(config);
  return {
    mode: config.nodeEnv,
    productionConfigValid: productionValidation.valid,
    productionConfigErrors: productionValidation.errors,
    database: {
      configured: config.database.configured,
      requiredInProduction: config.nodeEnv === RuntimeMode.PRODUCTION
    },
    redis: {
      configured: config.redis.configured,
      expectation: redisProductionExpectation(config),
      capabilities: redisCapabilityMap()
    },
    payments: {
      configured: config.payments.configured,
      provider: config.payments.provider || null
    }
  };
}

/**
 * Build readiness payload. `dependencyPing` supplies live postgres/redis/outbox ping results.
 */
export function buildReadinessReport(config, dependencyPing = {}) {
  const { postgres = {}, redis = {}, outbox = {} } = dependencyPing;
  const ai = publicAiDiagnostics(config);
  const realtime = publicRealtimeDiagnostics(config);
  const production = config.nodeEnv === RuntimeMode.PRODUCTION;

  const checks = {
    server: { ok: true, status: 'READY' },
    database: {
      ok: production ? postgres.ok && postgres.configured : postgres.ok,
      configured: postgres.configured ?? config.database.configured,
      status: production && !config.database.configured ? 'NOT_READY' : postgres.ok ? 'READY' : 'NOT_READY'
    },
    redis: {
      ok: production ? redis.ok && redis.configured : redis.ok,
      configured: redis.configured ?? config.redis.configured,
      status: production && !config.redis.configured ? 'NOT_READY' : redis.ok ? 'READY' : 'DEGRADED',
      expectation: redisProductionExpectation(config)
    },
    outbox: {
      ok: outbox.ok ?? true,
      configured: outbox.configured ?? false,
      status: outbox.ok ? 'READY' : 'DEGRADED'
    },
    config: {
      ok: validateProductionConfig(config).valid,
      status: validateProductionConfig(config).valid ? 'READY' : 'NOT_READY'
    },
    ai: {
      ok: ai.status !== AI_STATUS.UNAVAILABLE,
      status: ai.status,
      reason: ai.reason
    },
    realtime: {
      ok: realtime.status !== REALTIME_STATUS.NOT_READY,
      status: realtime.status,
      reason: realtime.reason,
      turnConfigured: realtime.turnConfigured
    }
  };

  const ready = checks.server.ok
    && checks.database.ok
    && checks.config.ok
    && (production ? checks.redis.ok : true)
    && (production ? realtime.status !== REALTIME_STATUS.NOT_READY : true);

  return {
    ready,
    mode: config.nodeEnv,
    persistence: persistenceLabel(config),
    checks,
    ai,
    realtime,
    dependencies: { postgres, redis, outbox }
  };
}

export function buildLivenessReport(config, dependencyPing = {}) {
  return {
    status: 'ok',
    service: 'sylora-core',
    mode: config.nodeEnv,
    persistence: persistenceLabel(config),
    ai: publicAiDiagnostics(config),
    realtime: publicRealtimeDiagnostics(config),
    dependencies: dependencyPing
  };
}
