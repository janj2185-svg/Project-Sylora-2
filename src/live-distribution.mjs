import { createCipheriv, createDecipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { isIP } from 'node:net';
import { lookup } from 'node:dns/promises';

const ACTIVE_SESSION_STATES = new Set(['preparing', 'waiting_for_source', 'live', 'degraded']);
const TERMINAL_SESSION_STATES = new Set(['stopped', 'failed']);
const MAX_DESTINATIONS = 8;

export const LIVE_DISTRIBUTION_PROVIDERS = Object.freeze({
  youtube: {
    id: 'youtube', label: 'YouTube Live', category: 'social',
    hostSuffixes: ['youtube.com', 'googlevideo.com'],
    features: ['schedule', 'chat', 'analytics', 'replay']
  },
  twitch: {
    id: 'twitch', label: 'Twitch', category: 'social',
    hostSuffixes: ['twitch.tv', 'live-video.net'],
    features: ['chat', 'moderation', 'subscriptions', 'clips']
  },
  facebook: {
    id: 'facebook', label: 'Facebook Live', category: 'social',
    hostSuffixes: ['facebook.com', 'facebook.net'],
    features: ['schedule', 'groups', 'notifications', 'replay']
  },
  instagram: {
    id: 'instagram', label: 'Instagram Live', category: 'social',
    hostSuffixes: ['facebook.com', 'facebook.net', 'instagram.com'],
    features: ['guests', 'subscriber_live', 'questions']
  },
  tiktok: {
    id: 'tiktok', label: 'TikTok LIVE', category: 'social',
    hostSuffixes: ['tiktok.com', 'tiktokcdn.com'],
    features: ['gifts', 'guests', 'qa', 'discovery'],
    note: 'RTMP access depends on TikTok account eligibility; this does not provide an unofficial chat API.'
  },
  linkedin: {
    id: 'linkedin', label: 'LinkedIn Live', category: 'social',
    hostSuffixes: ['linkedin.com', 'licdn.com'],
    features: ['schedule', 'registration', 'lead_events']
  },
  x: {
    id: 'x', label: 'X Live', category: 'social',
    hostSuffixes: ['x.com', 'twitter.com', 'pscp.tv'],
    features: ['public_events', 'sharing', 'replay']
  },
  kick: {
    id: 'kick', label: 'Kick', category: 'social',
    hostSuffixes: ['kick.com', 'live-video.net'],
    features: ['chat', 'subscriptions', 'clips']
  },
  vimeo: {
    id: 'vimeo', label: 'Vimeo', category: 'professional',
    hostSuffixes: ['vimeo.com', 'vimeocdn.com'],
    features: ['privacy', 'white_label', 'captions', 'analytics']
  },
  restream: {
    id: 'restream', label: 'Restream', category: 'distribution',
    hostSuffixes: ['restream.io'],
    features: ['multistream', 'unified_chat', 'guests', 'analytics']
  },
  enterprise: {
    id: 'enterprise', label: 'Enterprise RTMP', category: 'professional',
    hostSuffixes: [],
    features: ['private_events', 'paywall', 'domain_controls', 'analytics'],
    note: 'Custom hosts require an explicit production allowlist.'
  },
  custom: {
    id: 'custom', label: 'Custom RTMP', category: 'custom',
    hostSuffixes: [],
    features: ['rtmp'],
    note: 'Custom hosts require an explicit production allowlist.'
  }
});

export class LiveDistributionError extends Error {
  constructor(code, status = 400, details = null) {
    super(code);
    this.name = 'LiveDistributionError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function cleanText(value, max) {
  return String(value || '').trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
}

function decodeMasterKey(raw) {
  const value = String(raw || '').trim();
  if (!value) return null;
  let key;
  if (/^[a-f0-9]{64}$/i.test(value)) key = Buffer.from(value, 'hex');
  else if (/^[A-Za-z0-9_-]{43}$/.test(value)) {
    try { key = Buffer.from(value, 'base64url'); } catch { return null; }
  } else return null;
  return key.length === 32 ? key : null;
}

export class StreamSecretVault {
  constructor(rawKey = '') {
    const masterKey = decodeMasterKey(rawKey);
    this.encryptionKey = masterKey
      ? createHmac('sha256', masterKey).update('sylora:stream-encryption:v1').digest()
      : null;
    this.fingerprintKey = masterKey
      ? createHmac('sha256', masterKey).update('sylora:stream-fingerprint:v1').digest()
      : null;
    this.invalid = !!String(rawKey || '').trim() && !masterKey;
  }

  get configured() { return !!this.encryptionKey && !!this.fingerprintKey; }

  encrypt(value, context) {
    if (!this.encryptionKey) throw new LiveDistributionError('STREAM_SECRET_STORAGE_NOT_CONFIGURED', 503);
    const secret = String(value || '');
    if (!secret) throw new LiveDistributionError('STREAM_SECRET_REQUIRED', 400);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    cipher.setAAD(Buffer.from(String(context || ''), 'utf8'));
    const ciphertext = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
    return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
  }

  decrypt(value, context) {
    if (!this.encryptionKey) throw new LiveDistributionError('STREAM_SECRET_STORAGE_NOT_CONFIGURED', 503);
    const [version, ivRaw, tagRaw, ciphertextRaw, ...extra] = String(value || '').split('.');
    if (version !== 'v1' || !ivRaw || !tagRaw || !ciphertextRaw || extra.length) {
      throw new LiveDistributionError('STREAM_SECRET_INVALID', 500);
    }
    try {
      const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivRaw, 'base64url'));
      decipher.setAAD(Buffer.from(String(context || ''), 'utf8'));
      decipher.setAuthTag(Buffer.from(tagRaw, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(ciphertextRaw, 'base64url')),
        decipher.final()
      ]).toString('utf8');
    } catch {
      throw new LiveDistributionError('STREAM_SECRET_DECRYPT_FAILED', 500);
    }
  }

  fingerprint(value) {
    if (!this.fingerprintKey) throw new LiveDistributionError('STREAM_SECRET_STORAGE_NOT_CONFIGURED', 503);
    return createHmac('sha256', this.fingerprintKey).update(String(value || '')).digest('hex').slice(0, 12);
  }
}

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10
    || parts[0] === 127
    || (parts[0] === 169 && parts[1] === 254)
    || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
    || (parts[0] === 192 && parts[1] === 168)
    || (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127)
    || (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19))
    || (parts[0] === 192 && parts[1] === 0 && parts[2] === 0)
    || (parts[0] === 192 && parts[1] === 0 && parts[2] === 2)
    || (parts[0] === 198 && parts[1] === 51 && parts[2] === 100)
    || (parts[0] === 203 && parts[1] === 0 && parts[2] === 113)
    || parts[0] === 0
    || parts[0] >= 224;
}

function isPrivateIpv6(hostname) {
  const value = hostname.toLowerCase().replace(/^\[|\]$/g, '').split('%')[0];
  if (value.startsWith('::ffff:')) {
    const mapped = value.slice(7);
    if (isIP(mapped) === 4) return isPrivateIpv4(mapped);
    const hexadecimal = /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(mapped);
    if (hexadecimal) {
      const high = Number.parseInt(hexadecimal[1], 16);
      const low = Number.parseInt(hexadecimal[2], 16);
      return isPrivateIpv4(`${high >> 8}.${high & 255}.${low >> 8}.${low & 255}`);
    }
  }
  return value === '::'
    || value === '::1'
    || value.startsWith('fc')
    || value.startsWith('fd')
    || value.startsWith('fe8')
    || value.startsWith('fe9')
    || value.startsWith('fea')
    || value.startsWith('feb')
    || value.startsWith('ff')
    || value.startsWith('2001:db8:')
    || value === '2001:db8::';
}

function isPrivateAddress(hostname) {
  const value = String(hostname || '').replace(/^\[|\]$/g, '');
  const kind = isIP(value);
  return kind === 4 ? isPrivateIpv4(value) : kind === 6 ? isPrivateIpv6(value) : false;
}

function hostMatches(hostname, suffix) {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  const expected = String(suffix || '').toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
  return !!expected && (host === expected || host.endsWith(`.${expected}`));
}

export function parseAllowedDestinationHosts(raw) {
  return String(raw || '').split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
}

export function normalizeRtmpServerUrl(raw, { allowInsecure = false } = {}) {
  const value = cleanText(raw, 600);
  let parsed;
  try { parsed = new URL(value); } catch { throw new LiveDistributionError('RTMP_SERVER_URL_INVALID'); }
  if (!['rtmp:', 'rtmps:'].includes(parsed.protocol)) throw new LiveDistributionError('RTMP_PROTOCOL_REQUIRED');
  if (!allowInsecure && parsed.protocol !== 'rtmps:') throw new LiveDistributionError('RTMPS_REQUIRED_IN_PRODUCTION');
  if (!parsed.hostname || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new LiveDistributionError('RTMP_SERVER_URL_INVALID');
  }
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local') || isPrivateAddress(hostname)) {
    throw new LiveDistributionError('PRIVATE_STREAM_DESTINATION_FORBIDDEN');
  }
  parsed.hostname = hostname;
  parsed.pathname = parsed.pathname.replace(/\/{2,}/g, '/').replace(/\/$/, '') || '/';
  return parsed.toString().replace(/\/$/, '');
}

function normalizeStreamKey(raw) {
  const key = String(raw || '').trim();
  if (key.length < 4 || key.length > 512 || !/^[\x21-\x7e]+$/.test(key) || key.includes('#')) {
    throw new LiveDistributionError('STREAM_KEY_INVALID');
  }
  return key;
}

async function assertPublicDestinationHost({ hostname, provider, allowedHosts, resolveHost }) {
  const providerConfig = LIVE_DISTRIBUTION_PROVIDERS[provider];
  const trustedProviderHost = providerConfig.hostSuffixes.some(suffix => hostMatches(hostname, suffix));
  const explicitlyAllowed = allowedHosts.some(suffix => hostMatches(hostname, suffix));
  if (!trustedProviderHost && !explicitlyAllowed) {
    throw new LiveDistributionError('STREAM_DESTINATION_HOST_NOT_ALLOWED', 400, { hostname });
  }
  if (trustedProviderHost) return;
  let addresses;
  try { addresses = await resolveHost(hostname); } catch { throw new LiveDistributionError('STREAM_DESTINATION_DNS_FAILED'); }
  const values = Array.isArray(addresses) ? addresses : [addresses];
  if (!values.length || values.some(item => isPrivateAddress(String(item.address || item)))) {
    throw new LiveDistributionError('PRIVATE_STREAM_DESTINATION_FORBIDDEN');
  }
}

function normalizeControlUrl(raw) {
  const value = String(raw || '').trim();
  if (!value) return '';
  let parsed;
  try { parsed = new URL(value); } catch { return ''; }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) return '';
  return parsed.toString().replace(/\/$/, '');
}

export class MediaMtxControlClient {
  constructor({ baseUrl = '', username = '', password = '', fetchImpl = globalThis.fetch, timeoutMs = 5000 } = {}) {
    this.baseUrl = normalizeControlUrl(baseUrl);
    this.username = String(username || '');
    this.password = String(password || '');
    this.fetchImpl = fetchImpl;
    this.timeoutMs = timeoutMs;
  }

  get credentialsConfigured() {
    return /^[a-zA-Z0-9._~-]{1,64}$/.test(this.username)
      && this.password.length >= 32
      && this.password.length <= 512;
  }

  get configured() { return !!this.baseUrl && this.credentialsConfigured; }

  async request(pathname, { method = 'GET', body, allowNotFound = false } = {}) {
    if (!this.configured) throw new LiveDistributionError('MEDIA_ROUTER_NOT_CONFIGURED', 503);
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = 'application/json';
    if (this.username || this.password) headers.authorization = `Basic ${Buffer.from(`${this.username}:${this.password}`).toString('base64')}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetchImpl(`${this.baseUrl}${pathname}`, {
        method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: controller.signal
      });
      if (allowNotFound && response.status === 404) return null;
      if (!response.ok) throw new LiveDistributionError('MEDIA_ROUTER_REQUEST_FAILED', 503, { status: response.status });
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch (error) {
      if (error instanceof LiveDistributionError) throw error;
      throw new LiveDistributionError('MEDIA_ROUTER_UNAVAILABLE', 503);
    } finally { clearTimeout(timer); }
  }

  async ping() {
    const info = await this.request('/v3/info');
    return { ok: true, version: info?.version || null };
  }

  async configurePath(name, forwardTargets, { record = true } = {}) {
    if (!/^[a-zA-Z0-9_-]{24,160}$/.test(name)) throw new LiveDistributionError('MEDIA_ROUTER_PATH_INVALID', 500);
    await this.request(`/v3/config/paths/add/${encodeURIComponent(name)}`, {
      method: 'POST',
      body: {
        source: 'publisher',
        overridePublisher: false,
        maxReaders: 0,
        record: !!record,
        recordDeleteAfter: '7d',
        forward: forwardTargets.map(dest => ({ dest }))
      }
    });
  }

  async deletePath(name) {
    await this.request(`/v3/config/paths/delete/${encodeURIComponent(name)}`, { method: 'DELETE', allowNotFound: true });
  }

  async pathStatus(name) {
    const state = await this.request(`/v3/paths/get/${encodeURIComponent(name)}`, { allowNotFound: true });
    if (!state) return { exists: false, online: false, inboundBytes: 0, outboundBytes: 0, source: null, onlineTime: null };
    return {
      exists: true,
      online: !!(state.online ?? state.ready),
      inboundBytes: Number(state.inboundBytes ?? state.bytesReceived ?? 0),
      outboundBytes: Number(state.outboundBytes ?? state.bytesSent ?? 0),
      source: state.source?.type || null,
      onlineTime: state.onlineTime || state.readyTime || null
    };
  }

  async forwardStatus(name) {
    const query = new URLSearchParams({ path: name, itemsPerPage: '100' });
    const payload = await this.request(`/v3/paths/forward/list?${query}`, { allowNotFound: true });
    return (payload?.items || []).map((item, index) => ({
      position: Number.isInteger(item.pos) ? item.pos : index,
      status: ['idle', 'forwarding', 'error'].includes(item.state) ? item.state : 'unknown',
      protocol: cleanText(item.protocol, 12) || null,
      outboundBytes: Number(item.outboundBytes || 0),
      hasError: !!item.lastError
    }));
  }
}

function buildForwardTarget(serverUrl, streamKey) {
  return `${serverUrl}#${streamKey}`;
}

function destinationFromRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    provider: row.provider,
    label: row.label,
    serverUrl: row.serverUrl,
    encryptedStreamKey: row.encryptedStreamKey,
    keyFingerprint: row.keyFingerprint,
    enabled: row.enabled !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

export function publicStreamDestination(row) {
  const item = destinationFromRow(row);
  if (!item) return null;
  let host = '';
  try { host = new URL(item.serverUrl).hostname; } catch {}
  return {
    id: item.id,
    provider: item.provider,
    providerLabel: LIVE_DISTRIBUTION_PROVIDERS[item.provider]?.label || item.provider,
    label: item.label,
    ingestHost: host,
    protocol: item.serverUrl.startsWith('rtmps:') ? 'rtmps' : 'rtmp',
    enabled: item.enabled,
    hasStreamKey: !!item.encryptedStreamKey,
    keyFingerprint: item.keyFingerprint,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  };
}

function publicSession(row, extra = {}) {
  if (!row) return null;
  return {
    id: row.id,
    liveId: row.liveId,
    status: row.status,
    destinationIds: [...(row.destinationIds || [])],
    destinations: [...(row.destinationStates || [])],
    ingestKeyFingerprint: row.ingestKeyFingerprint,
    record: row.record !== false,
    createdAt: row.createdAt,
    startedAt: row.startedAt || null,
    stoppedAt: row.stoppedAt || null,
    lastObservedAt: row.lastObservedAt || null,
    ...extra
  };
}

function resolveAll(hostname) {
  return lookup(hostname, { all: true, verbatim: true });
}

export class LiveDistributionService {
  constructor({
    store,
    repository = null,
    router,
    vault,
    publicRtmpUrl = '',
    allowedHosts = [],
    allowInsecureRtmp = false,
    nodeEnv = 'development',
    resolveHost = resolveAll,
    now = () => new Date().toISOString(),
    id = () => randomUUID()
  }) {
    this.store = store;
    this.repository = repository;
    this.router = router;
    this.vault = vault;
    this.publicRtmpUrl = String(publicRtmpUrl || '').trim().replace(/\/$/, '');
    this.allowedHosts = [...allowedHosts];
    this.allowInsecureRtmp = allowInsecureRtmp || nodeEnv !== 'production';
    this.nodeEnv = nodeEnv;
    this.resolveHost = resolveHost;
    this.now = now;
    this.id = id;
  }

  get repositoryEnabled() { return !!this.repository?.enabled; }

  configuration() {
    let publicProtocol = null;
    try { publicProtocol = new URL(this.publicRtmpUrl).protocol.replace(':', ''); } catch {}
    const secureIngest = publicProtocol === 'rtmps';
    const routerUrlConfigured = !!this.router?.baseUrl;
    const controlCredentialsConfigured = !!this.router?.credentialsConfigured;
    const configured = this.router?.configured && this.vault?.configured && !!this.publicRtmpUrl && (this.nodeEnv !== 'production' || secureIngest);
    return {
      configured,
      routerConfigured: !!this.router?.configured,
      routerUrlConfigured,
      controlCredentialsConfigured,
      secretStorageConfigured: !!this.vault?.configured,
      secretStorageInvalid: !!this.vault?.invalid,
      publicIngestConfigured: !!this.publicRtmpUrl,
      secureIngest,
      publicProtocol,
      maxDestinations: MAX_DESTINATIONS,
      status: configured ? 'READY' : 'NOT_CONFIGURED'
    };
  }

  async localSave() { this.store.save(); }

  async listDestinations(userId) {
    const rows = this.repositoryEnabled
      ? await this.repository.listDestinations(userId)
      : (this.store.data.liveStreamDestinations || []).filter(x => x.userId === userId).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
    return rows.map(publicStreamDestination);
  }

  async getDestination(userId, id) {
    if (this.repositoryEnabled) return this.repository.getDestination(userId, id);
    return (this.store.data.liveStreamDestinations || []).find(x => x.id === id && x.userId === userId) || null;
  }

  async getDestinations(userId, ids) {
    if (this.repositoryEnabled) return this.repository.getDestinations(userId, ids);
    const wanted = new Set(ids);
    return (this.store.data.liveStreamDestinations || []).filter(x => x.userId === userId && wanted.has(x.id));
  }

  async createDestination(userId, input) {
    const provider = cleanText(input.provider, 30).toLowerCase();
    if (!LIVE_DISTRIBUTION_PROVIDERS[provider]) throw new LiveDistributionError('STREAM_PROVIDER_UNSUPPORTED');
    const label = cleanText(input.label, 60);
    if (label.length < 2) throw new LiveDistributionError('STREAM_DESTINATION_LABEL_REQUIRED');
    const serverUrl = normalizeRtmpServerUrl(input.serverUrl, { allowInsecure: this.allowInsecureRtmp });
    const parsed = new URL(serverUrl);
    await assertPublicDestinationHost({
      hostname: parsed.hostname, provider, allowedHosts: this.allowedHosts, resolveHost: this.resolveHost
    });
    const streamKey = normalizeStreamKey(input.streamKey);
    const id = this.id(), timestamp = this.now();
    const destination = {
      id, userId, provider, label, serverUrl,
      encryptedStreamKey: this.vault.encrypt(streamKey, `destination:${id}`),
      keyFingerprint: this.vault.fingerprint(streamKey),
      enabled: input.enabled !== false,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const saved = this.repositoryEnabled
      ? await this.repository.createDestination(destination)
      : (() => { this.store.data.liveStreamDestinations.push(destination); this.store.save(); return destination; })();
    return publicStreamDestination(saved);
  }

  async updateDestination(userId, destinationId, input) {
    const current = await this.getDestination(userId, destinationId);
    if (!current) throw new LiveDistributionError('STREAM_DESTINATION_NOT_FOUND', 404);
    if (await this.destinationInActiveSession(userId, destinationId)) {
      throw new LiveDistributionError('STREAM_DESTINATION_IN_ACTIVE_SESSION', 409);
    }
    const provider = input.provider === undefined ? current.provider : cleanText(input.provider, 30).toLowerCase();
    if (!LIVE_DISTRIBUTION_PROVIDERS[provider]) throw new LiveDistributionError('STREAM_PROVIDER_UNSUPPORTED');
    const label = input.label === undefined ? current.label : cleanText(input.label, 60);
    if (label.length < 2) throw new LiveDistributionError('STREAM_DESTINATION_LABEL_REQUIRED');
    const serverUrl = input.serverUrl === undefined
      ? current.serverUrl
      : normalizeRtmpServerUrl(input.serverUrl, { allowInsecure: this.allowInsecureRtmp });
    const parsed = new URL(serverUrl);
    await assertPublicDestinationHost({
      hostname: parsed.hostname, provider, allowedHosts: this.allowedHosts, resolveHost: this.resolveHost
    });
    let encryptedStreamKey = current.encryptedStreamKey, keyFingerprint = current.keyFingerprint;
    if (input.streamKey !== undefined && String(input.streamKey).trim()) {
      const streamKey = normalizeStreamKey(input.streamKey);
      encryptedStreamKey = this.vault.encrypt(streamKey, `destination:${destinationId}`);
      keyFingerprint = this.vault.fingerprint(streamKey);
    }
    const destination = {
      ...current, provider, label, serverUrl, encryptedStreamKey, keyFingerprint,
      enabled: input.enabled === undefined ? current.enabled !== false : input.enabled === true,
      updatedAt: this.now()
    };
    const saved = this.repositoryEnabled
      ? await this.repository.updateDestination(destination)
      : (() => { Object.assign(current, destination); this.store.save(); return current; })();
    return publicStreamDestination(saved);
  }

  async deleteDestination(userId, destinationId) {
    const current = await this.getDestination(userId, destinationId);
    if (!current) throw new LiveDistributionError('STREAM_DESTINATION_NOT_FOUND', 404);
    const inUse = await this.destinationInActiveSession(userId, destinationId);
    if (inUse) throw new LiveDistributionError('STREAM_DESTINATION_IN_ACTIVE_SESSION', 409);
    if (this.repositoryEnabled) await this.repository.deleteDestination(userId, destinationId);
    else {
      const index = this.store.data.liveStreamDestinations.findIndex(x => x.id === destinationId && x.userId === userId);
      this.store.data.liveStreamDestinations.splice(index, 1);
      this.store.save();
    }
    return { deleted: true };
  }

  async destinationInActiveSession(userId, destinationId) {
    return this.repositoryEnabled
      ? this.repository.destinationInActiveSession(userId, destinationId)
      : (this.store.data.liveDistributionSessions || []).some(x => x.userId === userId && ACTIVE_SESSION_STATES.has(x.status) && (x.destinationIds || []).includes(destinationId));
  }

  async activeSession(userId, liveId) {
    if (this.repositoryEnabled) return this.repository.getActiveSession(userId, liveId);
    return [...(this.store.data.liveDistributionSessions || [])]
      .reverse().find(x => x.userId === userId && x.liveId === liveId && ACTIVE_SESSION_STATES.has(x.status)) || null;
  }

  async latestSession(userId, liveId) {
    if (this.repositoryEnabled) return this.repository.getLatestSession(userId, liveId);
    return [...(this.store.data.liveDistributionSessions || [])]
      .filter(x => x.userId === userId && x.liveId === liveId)
      .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0] || null;
  }

  async saveSession(session) {
    if (this.repositoryEnabled) return this.repository.createSession(session);
    if ((this.store.data.liveDistributionSessions || []).some(item => (
      item.liveId === session.liveId && ACTIVE_SESSION_STATES.has(item.status)
    ))) throw new LiveDistributionError('DISTRIBUTION_ALREADY_ACTIVE', 409);
    this.store.data.liveDistributionSessions.push(session);
    this.store.save();
    return session;
  }

  async updateSession(session) {
    if (this.repositoryEnabled) return this.repository.updateSession(session);
    const current = this.store.data.liveDistributionSessions.find(x => x.id === session.id);
    if (!current) throw new LiveDistributionError('DISTRIBUTION_SESSION_NOT_FOUND', 404);
    Object.assign(current, session);
    this.store.save();
    return current;
  }

  async preflight(userId, liveId, destinationIds) {
    const config = this.configuration();
    const ids = [...new Set((destinationIds || []).map(String).filter(Boolean))];
    const reasons = [];
    if (!config.routerUrlConfigured) reasons.push('MEDIA_ROUTER_NOT_CONFIGURED');
    else if (!config.controlCredentialsConfigured) reasons.push('MEDIA_ROUTER_CONTROL_CREDENTIALS_INVALID');
    if (!config.secretStorageConfigured) reasons.push(config.secretStorageInvalid ? 'STREAM_SECRET_KEY_INVALID' : 'STREAM_SECRET_STORAGE_NOT_CONFIGURED');
    if (!config.publicIngestConfigured) reasons.push('PUBLIC_RTMP_INGEST_NOT_CONFIGURED');
    if (this.nodeEnv === 'production' && !config.secureIngest) reasons.push('RTMPS_INGEST_REQUIRED_IN_PRODUCTION');
    if (!ids.length) reasons.push('STREAM_DESTINATION_REQUIRED');
    if (ids.length > MAX_DESTINATIONS) reasons.push('STREAM_DESTINATION_LIMIT');
    const destinations = ids.length ? await this.getDestinations(userId, ids) : [];
    if (destinations.length !== ids.length) reasons.push('STREAM_DESTINATION_NOT_FOUND');
    if (destinations.some(x => x.enabled === false || !x.encryptedStreamKey)) reasons.push('STREAM_DESTINATION_NOT_READY');
    if (config.secretStorageConfigured) {
      for (const destination of destinations) {
        if (!destination.encryptedStreamKey) continue;
        try { this.vault.decrypt(destination.encryptedStreamKey, `destination:${destination.id}`); }
        catch { reasons.push('STREAM_DESTINATION_SECRET_UNREADABLE'); break; }
      }
    }
    let routerReachable = false;
    if (config.routerConfigured) {
      try { await this.router.ping(); routerReachable = true; } catch { reasons.push('MEDIA_ROUTER_UNAVAILABLE'); }
    }
    return {
      ready: reasons.length === 0,
      liveId,
      reasons: [...new Set(reasons)],
      routerReachable,
      configuration: config,
      destinations: destinations.map(publicStreamDestination)
    };
  }

  async start(userId, liveId, destinationIds, { record = true } = {}) {
    if (await this.activeSession(userId, liveId)) throw new LiveDistributionError('DISTRIBUTION_ALREADY_ACTIVE', 409);
    const preflight = await this.preflight(userId, liveId, destinationIds);
    if (!preflight.ready) throw new LiveDistributionError('DISTRIBUTION_PREFLIGHT_FAILED', 409, { reasons: preflight.reasons });
    const ids = [...new Set(destinationIds.map(String))];
    const destinations = await this.getDestinations(userId, ids);
    const sessionId = this.id();
    const pathName = `sylora_${sessionId.replace(/-/g, '')}_${randomBytes(12).toString('base64url')}`;
    const forwardTargets = destinations.map(destination => buildForwardTarget(
      destination.serverUrl,
      this.vault.decrypt(destination.encryptedStreamKey, `destination:${destination.id}`)
    ));
    const timestamp = this.now();
    const session = {
      id: sessionId,
      liveId,
      userId,
      status: 'preparing',
      encryptedIngestPath: this.vault.encrypt(pathName, `session:${sessionId}`),
      ingestKeyFingerprint: this.vault.fingerprint(pathName),
      destinationIds: ids,
      destinationStates: destinations.map(item => ({
        id: item.id,
        provider: item.provider,
        label: item.label,
        status: 'configured'
      })),
      record: record !== false,
      createdAt: timestamp,
      startedAt: null,
      stoppedAt: null,
      lastObservedAt: null
    };
    let saved = null;
    try {
      saved = await this.saveSession(session);
      await this.router.configurePath(pathName, forwardTargets, { record: session.record });
      saved = await this.updateSession({ ...saved, status: 'waiting_for_source' });
      return {
        session: publicSession(saved, { routerReachable: true, sourceOnline: false }),
        ingest: {
          serverUrl: this.publicRtmpUrl,
          streamKey: pathName,
          shownOnce: true,
          note: 'The stream key is returned once. Rotate the distribution session if it is lost or exposed.'
        }
      };
    } catch (error) {
      try { await this.router.deletePath(pathName); } catch {}
      if (saved) {
        try {
          await this.updateSession({
            ...saved,
            status: 'failed',
            destinationStates: (saved.destinationStates || []).map(destination => ({
              ...destination,
              status: 'error',
              hasError: true
            })),
            lastObservedAt: this.now()
          });
        } catch {}
      }
      if (String(error?.code || '') === '23505') {
        throw new LiveDistributionError('DISTRIBUTION_ALREADY_ACTIVE', 409);
      }
      throw error;
    }
  }

  async status(userId, liveId) {
    const session = await this.activeSession(userId, liveId) || await this.latestSession(userId, liveId);
    if (!session) return { session: null, configuration: this.configuration() };
    if (TERMINAL_SESSION_STATES.has(session.status)) {
      return { session: publicSession(session, { routerReachable: null, sourceOnline: false }), configuration: this.configuration() };
    }
    const pathName = this.vault.decrypt(session.encryptedIngestPath, `session:${session.id}`);
    try {
      const [observed, forwards] = await Promise.all([
        this.router.pathStatus(pathName),
        this.router.forwardStatus(pathName)
      ]);
      if (observed.exists === false) {
        const timestamp = this.now();
        const destinationStates = (session.destinationStates || []).map(destination => ({
          ...destination,
          status: 'error',
          outboundBytes: 0,
          protocol: null,
          hasError: true
        }));
        const updated = await this.updateSession({
          ...session,
          status: 'failed',
          destinationStates,
          lastObservedAt: timestamp
        });
        return {
          session: publicSession(updated, {
            routerReachable: true,
            sourceOnline: false,
            reason: 'MEDIA_ROUTER_PATH_LOST'
          }),
          configuration: this.configuration()
        };
      }
      const destinationStates = (session.destinationStates || []).map((destination, index) => {
        const forward = forwards.find(item => item.position === index) || forwards[index];
        if (!observed.online) return { ...destination, status: 'waiting_for_source', outboundBytes: 0, protocol: forward?.protocol || null, hasError: false };
        if (!forward) return { ...destination, status: 'unknown', outboundBytes: 0, protocol: null, hasError: false };
        return {
          ...destination,
          status: forward.status,
          outboundBytes: forward.outboundBytes,
          protocol: forward.protocol,
          hasError: forward.hasError
        };
      });
      const nextStatus = observed.online
        ? (destinationStates.some(item => item.status !== 'forwarding' || item.hasError) ? 'degraded' : 'live')
        : 'waiting_for_source';
      const timestamp = this.now();
      const updated = await this.updateSession({
        ...session,
        status: nextStatus,
        destinationStates,
        startedAt: observed.online ? (session.startedAt || observed.onlineTime || timestamp) : session.startedAt,
        lastObservedAt: timestamp
      });
      return {
        session: publicSession(updated, {
          routerReachable: true,
          sourceOnline: observed.online,
          inboundBytes: observed.inboundBytes,
          outboundBytes: observed.outboundBytes,
          source: observed.source
        }),
        configuration: this.configuration()
      };
    } catch {
      return {
        session: publicSession(session, { routerReachable: false, sourceOnline: null }),
        configuration: this.configuration()
      };
    }
  }

  async stop(userId, liveId) {
    const session = await this.activeSession(userId, liveId);
    if (!session) throw new LiveDistributionError('DISTRIBUTION_SESSION_NOT_ACTIVE', 404);
    const pathName = this.vault.decrypt(session.encryptedIngestPath, `session:${session.id}`);
    await this.router.deletePath(pathName);
    const stopped = await this.updateSession({ ...session, status: 'stopped', stoppedAt: this.now(), lastObservedAt: this.now() });
    return { session: publicSession(stopped, { routerReachable: true, sourceOnline: false }) };
  }
}

export function distributionErrorBody(error) {
  if (!(error instanceof LiveDistributionError)) return null;
  return {
    status: error.status,
    body: {
      error: error.code,
      ...(error.details ? { details: error.details } : {})
    }
  };
}
