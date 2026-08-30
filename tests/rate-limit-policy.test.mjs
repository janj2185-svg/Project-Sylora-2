import test from 'node:test';
import assert from 'node:assert/strict';
import { REQUEST_RATE_LIMITS, requestClientIp, requestRatePolicy } from '../src/rate-limit-policy.mjs';

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

test('client IP trusts only the configured number of right-most proxy hops',()=>{
  assert.equal(requestClientIp({remoteAddress:'::ffff:127.0.0.1',forwardedFor:'198.51.100.9'},0),'127.0.0.1');
  assert.equal(requestClientIp({remoteAddress:'172.19.0.1',forwardedFor:'203.0.113.77'},1),'203.0.113.77');
  assert.equal(requestClientIp({remoteAddress:'172.19.0.1',forwardedFor:'spoofed, 203.0.113.77'},1),'203.0.113.77');
  assert.equal(requestClientIp({remoteAddress:'10.0.0.8',forwardedFor:'198.51.100.4, 10.0.0.7'},2),'198.51.100.4');
  assert.equal(requestClientIp({remoteAddress:'10.0.0.8',forwardedFor:'invalid'},1),'10.0.0.8');
});
