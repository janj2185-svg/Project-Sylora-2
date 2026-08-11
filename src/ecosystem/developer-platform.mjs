import { createHash, randomBytes } from 'node:crypto';
import { validateScopes, DEVELOPER_SCOPES } from './permissions.mjs';

export function hashApiKey(raw) {
  return createHash('sha256').update(String(raw)).digest('hex');
}

export function generateApiKey() {
  const raw = `syl_${randomBytes(24).toString('hex')}`;
  return { raw, hash: hashApiKey(raw), prefix: raw.slice(0, 12) };
}

export function createDeveloperApp({
  id,
  ownerId,
  name,
  description = '',
  scopes = ['identity.read'],
  redirectUris = [],
  webhookUrl = ''
}) {
  const { scopes: valid, invalid } = validateScopes(scopes);
  if (invalid.length) throw new Error(`INVALID_SCOPES:${invalid.join(',')}`);
  return {
    id,
    ownerId,
    name: String(name || '').slice(0, 80),
    description: String(description || '').slice(0, 500),
    scopes: valid.length ? valid : ['identity.read'],
    redirectUris: (redirectUris || []).map(x => String(x).slice(0, 500)).slice(0, 10),
    webhookUrl: String(webhookUrl || '').slice(0, 500),
    status: 'sandbox',
    rateLimitPerMinute: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function createApiKeyRecord({ id, appId, ownerId, prefix, hash, label = 'default' }) {
  return {
    id,
    appId,
    ownerId,
    prefix,
    hash,
    label: String(label || 'default').slice(0, 40),
    lastUsedAt: null,
    revokedAt: null,
    createdAt: new Date().toISOString()
  };
}

export function scopeAllows(appScopes = [], required) {
  return appScopes.includes(required);
}

export const OAUTH_DOC = Object.freeze({
  status: 'not_implemented',
  flows: ['authorization_code', 'refresh_token'],
  oidc: true,
  tokenEndpoint: '/api/v1/oauth/token',
  authorizeEndpoint: '/api/v1/oauth/authorize',
  jwks: '/api/v1/oauth/jwks',
  note: 'OAuth/OIDC endpoints are documented but NOT live. Do not treat as working auth. Production IdP keys BLOCKED until configured.'
});

export { DEVELOPER_SCOPES };
