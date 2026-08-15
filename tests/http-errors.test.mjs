import test from 'node:test';
import assert from 'node:assert/strict';
import { httpErrorResponse } from '../src/http-errors.mjs';

test('request parsing failures use a machine-readable safe error contract', () => {
  assert.deepEqual(httpErrorResponse(new Error('INVALID_JSON')), {
    status: 400,
    body: {
      error: 'INVALID_JSON',
      code: 'INVALID_JSON',
      message: 'Request body must contain valid JSON.'
    }
  });
  assert.equal(httpErrorResponse(new Error('BODY_TOO_LARGE')).status, 413);
});

test('unexpected failures are generic 500 responses without implementation details', () => {
  const failure = httpErrorResponse(new Error('password_hash query failed at /secret/path'));
  assert.equal(failure.status, 500);
  assert.deepEqual(failure.body, {
    error: 'INTERNAL_ERROR',
    code: 'INTERNAL_ERROR',
    message: 'An internal server error occurred.'
  });
  assert.doesNotMatch(JSON.stringify(failure), /password_hash|query|secret\/path/);
});
