/** Per-identity login lockout (memory). Complements IP rate limits. */
const fails = new Map();

export function clearLoginFailures(identity) {
  fails.delete(String(identity || '').toLowerCase());
}

export function recordLoginFailure(identity, {
  maxFails = 8,
  windowMs = 15 * 60_000,
  lockMs = 15 * 60_000
} = {}) {
  const key = String(identity || '').toLowerCase();
  const now = Date.now();
  let row = fails.get(key);
  if (!row || row.windowResetAt <= now) row = { count: 0, windowResetAt: now + windowMs, lockedUntil: 0 };
  if (row.lockedUntil > now) return { locked: true, retryAfterMs: row.lockedUntil - now, count: row.count };
  row.count += 1;
  if (row.count >= maxFails) {
    row.lockedUntil = now + lockMs;
    fails.set(key, row);
    return { locked: true, retryAfterMs: lockMs, count: row.count };
  }
  fails.set(key, row);
  return { locked: false, retryAfterMs: 0, count: row.count };
}

export function isLoginLocked(identity) {
  const key = String(identity || '').toLowerCase();
  const row = fails.get(key);
  if (!row) return { locked: false, retryAfterMs: 0 };
  const now = Date.now();
  if (row.lockedUntil > now) return { locked: true, retryAfterMs: row.lockedUntil - now };
  return { locked: false, retryAfterMs: 0 };
}
