import { randomUUID } from 'node:crypto';
import {
  hashPassword,
  hashToken,
  isSessionToken,
  makeToken,
  normalizeEmail,
  normalizeUsername,
  toAccountUser,
  verifyPassword,
  validateRegistration
} from '../auth.mjs';

const DUMMY_PASSWORD_HASH = hashPassword('sylora-dummy-password-2026');

const ERROR_STATUS = Object.freeze({
  INVALID_EMAIL: 400,
  INVALID_USERNAME: 400,
  INVALID_PASSWORD: 400,
  ACCOUNT_ALREADY_EXISTS: 409,
  INVALID_CREDENTIALS: 401,
  ACCOUNT_UNAVAILABLE: 403,
  AUTH_REQUIRED: 401,
  PROFILE_NOT_FOUND: 404
});

export class AuthServiceError extends Error {
  constructor(code, status = ERROR_STATUS[code] || 400) {
    super(code);
    this.name = 'AuthServiceError';
    this.code = code;
    this.status = status;
  }
}

function isUniqueViolation(error) {
  return error?.code === '23505' || /duplicate key|unique constraint/i.test(String(error?.message || ''));
}

function sessionExpiry(now, ttlDays) {
  return new Date(new Date(now).getTime() + ttlDays * 86_400_000).toISOString();
}

export class AuthService {
  constructor({ repository = null, store = null, ttlDays = 30, adminEmails = new Set(), now = () => new Date().toISOString(), id = randomUUID } = {}) {
    if (!repository?.enabled && !store) throw new Error('AUTH_STORE_REQUIRED');
    this.repository = repository?.enabled ? repository : null;
    this.store = store;
    this.ttlDays = Math.max(1, Number(ttlDays) || 30);
    this.adminEmails = adminEmails;
    this.now = now;
    this.id = id;
  }

  async register(input) {
    const validated = validateRegistration(input);
    if (!validated.ok) throw new AuthServiceError(validated.code);
    const { email, username, password } = validated;
    if (await this.accountExists(email, username)) throw new AuthServiceError('ACCOUNT_ALREADY_EXISTS');

    const createdAt = this.now();
    const user = {
      id: this.id(),
      email,
      username,
      passwordHash: hashPassword(password),
      displayName: username,
      bio: '',
      locale: 'uk',
      avatar: '',
      role: this.adminEmails.has(email) ? 'admin' : 'user',
      status: 'active',
      createdAt,
      updatedAt: createdAt
    };
    const token = makeToken();
    const session = {
      tokenHash: hashToken(token),
      userId: user.id,
      createdAt,
      expiresAt: sessionExpiry(createdAt, this.ttlDays)
    };

    try {
      if (this.repository) await this.repository.register(user, session);
      else {
        this.store.data.users.push(user);
        this.store.data.sessions.push(session);
        this.store.save();
      }
    } catch (error) {
      if (isUniqueViolation(error)) throw new AuthServiceError('ACCOUNT_ALREADY_EXISTS');
      throw error;
    }
    return { token, user: toAccountUser(user), expiresAt: session.expiresAt };
  }

  async login(input = {}) {
    const identity = String(input.identity || input.email || input.username || '').trim().normalize('NFKC').toLowerCase();
    const password = String(input.password || '');
    const user = identity ? await this.findUserByIdentity(identity) : null;
    const validPassword = verifyPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH);
    if (!user || !validPassword) throw new AuthServiceError('INVALID_CREDENTIALS');
    if ((user.status || 'active') !== 'active') throw new AuthServiceError('INVALID_CREDENTIALS');

    const createdAt = this.now();
    const token = makeToken();
    const session = {
      tokenHash: hashToken(token),
      userId: user.id,
      createdAt,
      expiresAt: sessionExpiry(createdAt, this.ttlDays)
    };
    if (this.repository) await this.repository.createSession(session);
    else {
      this.store.data.sessions.push(session);
      this.store.save();
    }
    return { token, user: toAccountUser(user), expiresAt: session.expiresAt };
  }

  async authenticate(rawToken) {
    if (!isSessionToken(rawToken)) return null;
    const tokenHash = hashToken(rawToken);
    if (this.repository) return this.repository.userForSession(tokenHash);
    const now = Date.now();
    const before = this.store.data.sessions.length;
    this.store.data.sessions = this.store.data.sessions.filter(session => new Date(session.expiresAt).getTime() > now);
    if (before !== this.store.data.sessions.length) this.store.save();
    const session = this.store.data.sessions.find(item => item.tokenHash === tokenHash);
    const user = session ? this.store.data.users.find(item => item.id === session.userId) : null;
    return user && (user.status || 'active') === 'active' ? user : null;
  }

  async logout(rawToken) {
    if (!isSessionToken(rawToken)) return false;
    const tokenHash = hashToken(rawToken);
    if (this.repository) return this.repository.deleteSession(tokenHash);
    const before = this.store.data.sessions.length;
    this.store.data.sessions = this.store.data.sessions.filter(session => session.tokenHash !== tokenHash);
    if (before !== this.store.data.sessions.length) this.store.save();
    return before !== this.store.data.sessions.length;
  }

  async updateAccount(user, patch = {}) {
    if (!user) throw new AuthServiceError('AUTH_REQUIRED');
    const updated = {
      ...user,
      displayName: patch.displayName == null ? user.displayName : String(patch.displayName).trim().slice(0, 80) || user.displayName,
      bio: patch.bio == null ? user.bio : String(patch.bio).trim().slice(0, 500),
      locale: ['uk', 'pl', 'en'].includes(patch.locale) ? patch.locale : user.locale,
      avatar: patch.avatar == null ? user.avatar : String(patch.avatar).trim().slice(0, 2048),
      updatedAt: this.now()
    };
    let saved;
    if (this.repository) {
      saved = await this.repository.updateUser(updated);
      if (!saved) throw new AuthServiceError('PROFILE_NOT_FOUND');
    } else {
      const index = this.store.data.users.findIndex(item => item.id === user.id);
      if (index < 0) throw new AuthServiceError('PROFILE_NOT_FOUND');
      this.store.data.users[index] = updated;
      this.store.save();
      saved = updated;
    }
    return toAccountUser(saved);
  }

  async accountExists(email, username) {
    if (this.repository) return this.repository.accountExists(email, username);
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username).toLowerCase();
    return this.store.data.users.some(user => normalizeEmail(user.email) === normalizedEmail || normalizeUsername(user.username).toLowerCase() === normalizedUsername);
  }

  async findUserByIdentity(identity) {
    if (this.repository) return this.repository.findUserByIdentity(identity);
    const normalized = String(identity || '').trim().normalize('NFKC').toLowerCase();
    return this.store.data.users.find(user => normalizeEmail(user.email) === normalized || normalizeUsername(user.username).toLowerCase() === normalized) || null;
  }

  async findUserById(id) {
    if (this.repository) return this.repository.findUserById(id);
    return this.store.data.users.find(user => user.id === id) || null;
  }

  async findUserByUsername(username) {
    if (this.repository) return this.repository.findUserByUsername(username);
    const normalized = normalizeUsername(username).toLowerCase();
    return this.store.data.users.find(user => normalizeUsername(user.username).toLowerCase() === normalized) || null;
  }
}

export function authErrorBody(code) {
  const messages = {
    INVALID_EMAIL: 'Enter a valid email address.',
    INVALID_USERNAME: 'Username must be 3–30 letters, numbers, or underscores.',
    INVALID_PASSWORD: 'Password must be 10–256 characters and include a letter and a number.',
    ACCOUNT_ALREADY_EXISTS: 'An account with that email or username already exists.',
    INVALID_CREDENTIALS: 'Invalid credentials.',
    ACCOUNT_UNAVAILABLE: 'This account is unavailable.',
    AUTH_REQUIRED: 'Authentication is required.',
    PROFILE_NOT_FOUND: 'Profile not found.'
  };
  return { error: code, code, message: messages[code] || 'Request failed.' };
}
