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
  let reason = 'OPENAI_API_KEY_MISSING_DEV_DEGRADED';
  if (status === AI_STATUS.CONFIGURED) reason = 'OPENAI_API_KEY_SET';
  else if (status === AI_STATUS.UNAVAILABLE) reason = 'OPENAI_API_KEY_MISSING';
  else if (config.ai.configured) reason = 'OPENAI_BASE_URL_OVERRIDE';
  return {
    status,
    configured: config.ai.configured,
    reason,
    model: config.ai.configured ? config.ai.model : null,
    fallback: status === AI_STATUS.DEGRADED
      ? (config.ai.configured ? 'custom_base_url' : 'dev_local_unavailable')
      : null
  };
}

export function publicRealtimeDiagnostics(config) {
  const realtime = resolveRealtimeStatus(config);
  return {
    status: realtime.status,
    reason: realtime.reason,
    turnConfigured: config.turnConfigured,
    turnUrlConfigured: config.turnUrlConfigured,
    turnAuthMode: config.turnAuthMode,
    credentialTtlSeconds: config.turnAuthMode === 'shared_secret'
      ? config.turnCredentialTtlSeconds
      : null,
    iceServerCount: config.iceServers.length,
    note: config.turnAuthMode === 'shared_secret'
      ? 'Short-lived TURN credentials are delivered to authenticated browsers via /api/live/rtc-config.'
      : config.turnConfigured
        ? 'Static TURN credentials are delivered to authenticated browsers via /api/live/rtc-config.'
        : config.turnUrlConfigured
          ? 'TURN URL is present but usable client credentials are not configured.'
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
      // Missing Redis is OK for single-instance; only fail when URL is set but unreachable.
      ok: redis.configured ? !!redis.ok : true,
      configured: redis.configured ?? config.redis.configured,
      status: !config.redis.configured
        ? 'DEGRADED'
        : (redis.ok ? 'READY' : 'NOT_READY'),
      expectation: redisProductionExpectation(config)
    },
    outbox: {
      ok: outbox.ok ?? true,
      configured: outbox.configured ?? false,
      status: outbox.ok ? (outbox.configured ? 'READY' : 'DEGRADED') : 'NOT_READY'
    },
    config: {
      ok: validateProductionConfig(config).valid,
      status: validateProductionConfig(config).valid ? 'READY' : 'NOT_READY'
    },
    ai: {
      // AI status is reported; missing AI does not block core traffic readiness.
      ok: true,
      required: false,
      status: ai.status,
      reason: ai.reason,
      fallback: ai.fallback
    },
    realtime: {
      ok: realtime.status !== REALTIME_STATUS.NOT_READY,
      status: realtime.status,
      reason: realtime.reason,
      turnConfigured: realtime.turnConfigured
    }
  };

  const redisHardFail = !!(redis.configured && redis.ok === false);
  const ready = checks.server.ok
    && checks.database.ok
    && checks.config.ok
    && !redisHardFail
    && (production ? realtime.status !== REALTIME_STATUS.NOT_READY : true);

  return {
    ready,
    status: ready ? 'ready' : 'not_ready',
    mode: config.nodeEnv,
    persistence: persistenceLabel(config),
    checks,
    ai,
    realtime,
    config: publicConfigDiagnostics(config),
    dependencies: { postgres, redis, outbox }
  };
}

export function buildLivenessReport(config, dependencyPing = {}) {
  return {
    status: 'ok',
    alive: true,
    service: 'sylora-core',
    mode: config.nodeEnv,
    persistence: persistenceLabel(config),
    ai: publicAiDiagnostics(config),
    realtime: publicRealtimeDiagnostics(config),
    config: publicConfigDiagnostics(config),
    dependencies: dependencyPing
  };
}
