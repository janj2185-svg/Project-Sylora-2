import { publicAiStatus, publicDiagnostics } from './config.mjs';

export function buildChecks({ config, dependencies = {} } = {}) {
  const pg = dependencies.postgres || { configured: false, ok: true };
  const cache = dependencies.redis || { configured: false, ok: true };
  const outbox = dependencies.outbox || { configured: false, ok: true };
  const databaseOk = pg.ok !== false && (config.nodeEnv !== 'production' || (pg.configured && pg.ok));
  const databaseStatus = config.nodeEnv === 'production'
    ? (pg.configured && pg.ok ? 'ok' : 'NOT_READY')
    : (pg.configured ? (pg.ok ? 'ok' : 'DEGRADED') : 'DEGRADED');
  const redisStatus = cache.configured ? (cache.ok ? 'ok' : 'DEGRADED') : config.redis.policy.status;
  const realtimeStatus = config.webrtc.status;
  return {
    server: { status: 'ok' },
    database: {
      status: databaseStatus,
      configured: !!pg.configured,
      ok: pg.ok !== false,
      reason: databaseOk ? null : (pg.configured ? 'DATABASE_UNREACHABLE' : 'DATABASE_URL_REQUIRED')
    },
    config: {
      status: config.boot.ok ? 'ok' : 'NOT_READY',
      reason: config.boot.code
    },
    ai: publicAiStatus(config.ai),
    realtime: {
      status: realtimeStatus,
      turnConfigured: config.webrtc.turnConfigured,
      stunConfigured: config.webrtc.stunConfigured,
      reason: config.webrtc.reason,
      liveCapability: config.webrtc.liveCapability
    },
    redis: {
      status: redisStatus,
      configured: !!cache.configured,
      ok: cache.ok !== false,
      reason: cache.configured && cache.ok === false ? 'REDIS_UNREACHABLE' : config.redis.policy.reason,
      requiredForHorizontalScale: true
    },
    outbox: {
      status: outbox.configured ? (outbox.ok ? 'ok' : 'DEGRADED') : (config.nodeEnv === 'production' ? 'NOT_READY' : 'DEGRADED'),
      configured: !!outbox.configured,
      ok: outbox.ok !== false
    }
  };
}

export function isProcessReady(config, checks) {
  if (checks.server.status !== 'ok') return false;
  if (config.nodeEnv === 'production') {
    return checks.database.status === 'ok'
      && checks.config.status === 'ok'
      && checks.realtime.status !== 'NOT_READY';
  }
  return checks.database.ok !== false;
}

export function buildHealthPayload({ config, dependencies = {} } = {}) {
  const checks = buildChecks({ config, dependencies });
  return {
    status: 'ok',
    alive: true,
    service: 'sylora-core',
    persistence: config.database.configured ? 'postgres-social-wallet-ai-hybrid' : 'json-dev-runtime',
    ecosystem: 'personal-ai-identity-kg-agents-developers',
    ecosystemPersistence: config.database.configured ? 'postgres+json-cache' : 'json',
    environment: config.nodeEnv,
    ai: checks.ai,
    realtime: checks.realtime,
    redis: {
      status: checks.redis.status,
      configured: checks.redis.configured,
      reason: checks.redis.reason
    },
    diagnostics: publicDiagnostics(config),
    dependencies
  };
}

export function buildReadyPayload({ config, dependencies = {} } = {}) {
  const checks = buildChecks({ config, dependencies });
  const ready = isProcessReady(config, checks);
  return {
    ready,
    environment: config.nodeEnv,
    checks,
    ai: checks.ai,
    realtime: checks.realtime,
    dependencies
  };
}
