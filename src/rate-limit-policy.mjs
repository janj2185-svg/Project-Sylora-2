export const REQUEST_RATE_LIMITS = Object.freeze({
  production: Object.freeze({ register: 5, login: 10, auth: 30, api: 300 }),
  nonProduction: Object.freeze({ register: 30, login: 60, auth: 120, api: 1200 })
});

export function requestRatePolicy(pathname, nodeEnv = 'development') {
  const limits = nodeEnv === 'production'
    ? REQUEST_RATE_LIMITS.production
    : REQUEST_RATE_LIMITS.nonProduction;
  if (pathname === '/api/auth/register') return { key: 'register', limit: limits.register };
  if (pathname === '/api/auth/login') return { key: 'login', limit: limits.login };
  if (pathname.startsWith('/api/auth/')) return { key: 'auth', limit: limits.auth };
  return { key: 'api', limit: limits.api };
}
