import { createHash, randomBytes } from 'node:crypto';
import { API_SCOPES } from './permissions.mjs';

export function ensureDeveloperPlatform(store) {
  store.data.devApps ??= [];
  store.data.devApiKeys ??= [];
  store.data.devWebhooks ??= [];
  store.data.devWebhookLogs ??= [];
  store.data.devUsage ??= [];
  store.data.oauthGrants ??= [];
  return store;
}

export function registerApp(store, { id, ownerId, name, description = '', scopes = [], redirectUris = [] }, now) {
  ensureDeveloperPlatform(store);
  const allowedScopes = scopes.filter(s => API_SCOPES.includes(s));
  const app = {
    id,
    ownerId,
    name: String(name || '').slice(0, 80),
    description: String(description || '').slice(0, 500),
    scopes: allowedScopes,
    redirectUris: redirectUris.slice(0, 10),
    status: 'active',
    environment: 'sandbox',
    createdAt: now(),
    updatedAt: now()
  };
  if (!app.name) throw new Error('APP_NAME_REQUIRED');
  store.data.devApps.push(app);
  store.save();
  return app;
}

export function createApiKey(store, { id, appId, ownerId, name = 'default' }, now) {
  ensureDeveloperPlatform(store);
  const app = store.data.devApps.find(a => a.id === appId && a.ownerId === ownerId);
  if (!app) throw new Error('APP_NOT_FOUND');
  const secret = `syl_sk_${randomBytes(24).toString('hex')}`;
  const key = {
    id,
    appId,
    ownerId,
    name: String(name).slice(0, 60),
    tokenHash: hashSecret(secret),
    prefix: secret.slice(0, 12),
    createdAt: now(),
    lastUsedAt: null,
    revokedAt: null
  };
  store.data.devApiKeys.push(key);
  store.save();
  return { key, secret }; // secret shown once
}

export function hashSecret(secret) {
  return createHash('sha256').update(String(secret)).digest('hex');
}

export function verifyApiKey(store, secret) {
  ensureDeveloperPlatform(store);
  const tokenHash = hashSecret(secret);
  const key = store.data.devApiKeys.find(k => k.tokenHash === tokenHash && !k.revokedAt);
  if (!key) return null;
  const app = store.data.devApps.find(a => a.id === key.appId && a.status === 'active');
  if (!app) return null;
  return { key, app };
}

export function registerWebhook(store, { id, appId, ownerId, url, events = [] }, now) {
  ensureDeveloperPlatform(store);
  const app = store.data.devApps.find(a => a.id === appId && a.ownerId === ownerId);
  if (!app) throw new Error('APP_NOT_FOUND');
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('WEBHOOK_URL_INVALID'); }
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('WEBHOOK_URL_INVALID');
  if (parsed.protocol === 'http:' && !['localhost', '127.0.0.1'].includes(parsed.hostname)) {
    throw new Error('WEBHOOK_HTTPS_REQUIRED');
  }
  const hook = {
    id,
    appId,
    ownerId,
    url: parsed.toString(),
    events: events.slice(0, 30),
    secret: randomBytes(16).toString('hex'),
    createdAt: now(),
    disabledAt: null
  };
  store.data.devWebhooks.push(hook);
  store.save();
  return hook;
}

export function recordUsage(store, { id, appId, route, status }, now) {
  ensureDeveloperPlatform(store);
  store.data.devUsage.push({ id, appId, route, status, at: now() });
  if (store.data.devUsage.length > 5000) store.data.devUsage.splice(0, store.data.devUsage.length - 5000);
  store.save();
}

export function createOauthGrant(store, { id, appId, userId, scopes = [] }, now) {
  ensureDeveloperPlatform(store);
  const grant = {
    id,
    appId,
    userId,
    scopes: scopes.filter(s => API_SCOPES.includes(s)),
    createdAt: now(),
    revokedAt: null
  };
  store.data.oauthGrants.push(grant);
  store.save();
  return grant;
}

export { API_SCOPES };
