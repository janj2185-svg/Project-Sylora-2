/**
 * Production environment honesty checks.
 * Never logs secret values — only stable warning codes.
 */

const INSECURE_DEV_PASSWORD = 'sylora_dev_only';

/**
 * True when DATABASE_URL (preferred) or POSTGRES_PASSWORD still uses the known
 * compose-default development password.
 */
export function usesInsecureDefaultPostgresPassword({
  databaseUrl = process.env.DATABASE_URL,
  postgresPassword = process.env.POSTGRES_PASSWORD
} = {}) {
  const url = String(databaseUrl || '');
  // Match :password@ in URL without printing it
  if (url) {
    const m = url.match(/:([^:@/]+)@/);
    if (m && m[1] === INSECURE_DEV_PASSWORD) return true;
    return false;
  }
  return String(postgresPassword || '') === INSECURE_DEV_PASSWORD;
}

export function validateProductionEnv(env = process.env) {
  if (String(env.NODE_ENV || '') !== 'production') {
    return { ok: true, warnings: [] };
  }
  const warnings = [];
  if (!env.DATABASE_URL) warnings.push('DATABASE_URL_MISSING');
  if (!env.REDIS_URL) warnings.push('REDIS_URL_MISSING');
  if (
    usesInsecureDefaultPostgresPassword({
      databaseUrl: env.DATABASE_URL,
      postgresPassword: env.POSTGRES_PASSWORD
    })
  ) {
    warnings.push('DEFAULT_POSTGRES_PASSWORD');
  }
  return { ok: warnings.length === 0, warnings };
}
