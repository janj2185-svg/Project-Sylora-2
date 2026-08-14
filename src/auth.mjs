import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,30}$/;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, encoded) {
  const [kind, salt, expected] = String(encoded).split(':');
  if (kind !== 'scrypt' || !salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

export function makeToken() {
  return randomBytes(32).toString('base64url');
}

export function hashToken(value) {
  return createHash('sha256').update(String(value || '')).digest('hex');
}

export function isSessionToken(value) {
  return /^[A-Za-z0-9_-]{43}$/.test(String(value || ''));
}

export function normalizeEmail(value) {
  return String(value || '').trim().normalize('NFKC').toLowerCase();
}

export function normalizeUsername(value) {
  return String(value || '').trim().normalize('NFKC');
}

export function validateRegistration(input = {}) {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const password = String(input.password || '');
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return { ok: false, code: 'INVALID_EMAIL' };
  if (!USERNAME_PATTERN.test(username)) return { ok: false, code: 'INVALID_USERNAME' };
  if (password.length < 10 || password.length > 256 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return { ok: false, code: 'INVALID_PASSWORD' };
  }
  return { ok: true, email, username, password };
}

export function toAccountUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName,
    bio: user.bio || '',
    locale: user.locale || 'uk',
    avatar: user.avatar || '',
    role: user.role || 'user',
    status: user.status || 'active',
    createdAt: user.createdAt,
    updatedAt: user.updatedAt || user.createdAt
  };
}

export function toPublicUser(user) {
  const account = toAccountUser(user);
  if (!account) return null;
  return {
    id: account.id,
    username: account.username,
    displayName: account.displayName,
    bio: account.bio,
    locale: account.locale,
    avatar: account.avatar,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt
  };
}
