import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUEST_RATE_LIMITS, requestRatePolicy } from '../src/rate-limit-policy.mjs';

test('production request limits remain strict while browser QA has non-production headroom', () => {
  assert.deepEqual(REQUEST_RATE_LIMITS.production, { register: 5, login: 10, auth: 30, api: 300 });
  assert.deepEqual(REQUEST_RATE_LIMITS.nonProduction, { register: 30, login: 60, auth: 120, api: 1200 });
  for (const [pathname, key] of [
    ['/api/auth/register', 'register'],
    ['/api/auth/login', 'login'],
    ['/api/auth/logout', 'auth'],
    ['/api/feed', 'api']
  ]) {
    assert.deepEqual(requestRatePolicy(pathname, 'production'), {
      key,
      limit: REQUEST_RATE_LIMITS.production[key]
    });
    assert.deepEqual(requestRatePolicy(pathname, 'development'), {
      key,
      limit: REQUEST_RATE_LIMITS.nonProduction[key]
    });
  }
});
