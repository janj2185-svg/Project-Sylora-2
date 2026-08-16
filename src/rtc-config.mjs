import { createHmac } from 'node:crypto';

const ALLOWED_ICE_SCHEMES = /^(stun|stuns|turn|turns):/i;
const STUN_SCHEMES = /^stuns?:/i;
const TURN_SCHEMES = /^turns?:/i;
const MIN_TURN_TTL_SECONDS = 300;
const MAX_TURN_TTL_SECONDS = 86_400;
const MIN_TURN_SHARED_SECRET_LENGTH = 32;

export const DEFAULT_TURN_TTL_SECONDS = 3_600;

function cleanUrl(value, schemes = ALLOWED_ICE_SCHEMES) {
  const url = String(value || '').trim();
  if (!url || url.length > 512 || !schemes.test(url)) return null;
  return url;
}

function cleanClientCredential(value, maxLength) {
  const credential = String(value || '').trim();
  if (!credential || credential.length > maxLength) return null;
  return credential;
}

function cleanTurnSharedSecret(value) {
  const secret = String(value || '').trim();
  if (secret.length < MIN_TURN_SHARED_SECRET_LENGTH || secret.length > 512) return null;
  return secret;
}

function urlsFor(server) {
  return Array.isArray(server?.urls) ? server.urls : [server?.urls];
}

function serverHasTurn(server) {
  return urlsFor(server).some(url => TURN_SCHEMES.test(String(url || '')));
}

export function parseTurnTtlSeconds(raw) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return DEFAULT_TURN_TTL_SECONDS;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < MIN_TURN_TTL_SECONDS || value > MAX_TURN_TTL_SECONDS) {
    throw new Error(`Invalid SYLORA_TURN_TTL_SECONDS configuration; expected an integer from ${MIN_TURN_TTL_SECONDS} to ${MAX_TURN_TTL_SECONDS}.`);
  }
  return value;
}

export function parseIceServers(raw) {
  if (!raw) return [];
  let input;
  try { input = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(input)) return [];
  const result = [];
  for (const item of input.slice(0, 8)) {
    if (!item || typeof item !== 'object') continue;
    const sourceUrls = Array.isArray(item.urls) ? item.urls.slice(0, 8) : [item.urls];
    const urls = sourceUrls.map(value => cleanUrl(value)).filter(Boolean);
    if (!urls.length) continue;
    const server = { urls: Array.isArray(item.urls) ? urls : urls[0] };
    const username = cleanClientCredential(item.username, 256);
    const credential = cleanClientCredential(item.credential, 512);
    if (username) server.username = username;
    if (credential) server.credential = credential;
    result.push(server);
  }
  return result;
}

function parseStunUrls(raw) {
  return String(raw || '')
    .split(/[,\s]+/)
    .map(value => cleanUrl(value, STUN_SCHEMES))
    .filter(Boolean)
    .slice(0, 8);
}

function turnFromEnv(env = process.env) {
  const url = cleanUrl(env.SYLORA_TURN_URL, TURN_SCHEMES);
  if (!url) return null;
  const server = { urls: url };
  const username = cleanClientCredential(env.SYLORA_TURN_USERNAME, 256);
  const credential = cleanClientCredential(env.SYLORA_TURN_CREDENTIAL, 512);
  if (username) server.username = username;
  if (credential) server.credential = credential;
  return server;
}

/**
 * Build ICE server list from JSON blob and/or discrete STUN/TURN env vars.
 * Static TURN username/credential values are client-side WebRTC credentials.
 */
export function buildIceServersFromEnv(env = process.env) {
  const fromJson = parseIceServers(env.SYLORA_ICE_SERVERS_JSON);
  if (fromJson.length) return fromJson.slice(0, 8);

  const stunUrls = parseStunUrls(env.SYLORA_STUN_URLS);
  const servers = [];
  if (stunUrls.length) servers.push({ urls: stunUrls });
  const turn = turnFromEnv(env);
  if (turn) servers.push(turn);
  return servers.slice(0, 8);
}

export function hasTurnServer(iceServers = []) {
  return iceServers.some(serverHasTurn);
}

export function hasStaticTurnCredentials(iceServers = []) {
  return iceServers.some(server => serverHasTurn(server)
    && cleanClientCredential(server.username, 256)
    && cleanClientCredential(server.credential, 512));
}

/**
 * Resolve TURN readiness without retaining the shared secret in runtime config.
 */
export function resolveTurnConfiguration(iceServers = [], env = process.env) {
  const urlConfigured = hasTurnServer(iceServers);
  const sharedSecretConfigured = !!cleanTurnSharedSecret(env.SYLORA_TURN_SHARED_SECRET);
  const staticCredentialsConfigured = hasStaticTurnCredentials(iceServers);
  const authMode = !urlConfigured
    ? null
    : sharedSecretConfigured
      ? 'shared_secret'
      : staticCredentialsConfigured
        ? 'static'
        : null;
  return {
    urlConfigured,
    configured: urlConfigured && !!authMode,
    authMode,
    credentialTtlSeconds: parseTurnTtlSeconds(env.SYLORA_TURN_TTL_SECONDS)
  };
}

function credentialSubject(userId) {
  const subject = String(userId || '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 128);
  if (!subject) throw new Error('TURN credentials require an authenticated user id.');
  return subject;
}

function epochSeconds(value) {
  const milliseconds = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(milliseconds)) throw new Error('Invalid TURN credential issue time.');
  return Math.floor(milliseconds / 1_000);
}

/**
 * Issue coturn TURN REST API credentials for one authenticated user.
 * The shared secret is used only for HMAC generation and is never returned.
 */
export function issueIceServersForUser(iceServers = [], {
  env = process.env,
  userId,
  now = Date.now()
} = {}) {
  const turn = resolveTurnConfiguration(iceServers, env);
  const clonedServers = iceServers.map(server => ({
    ...server,
    urls: Array.isArray(server.urls) ? [...server.urls] : server.urls
  }));

  if (turn.authMode !== 'shared_secret') {
    return {
      iceServers: clonedServers,
      authMode: turn.authMode,
      credentialTtlSeconds: null,
      credentialExpiresAt: null,
      credentialExpiresAtEpochSeconds: null
    };
  }

  const secret = cleanTurnSharedSecret(env.SYLORA_TURN_SHARED_SECRET);
  const expiresAtEpochSeconds = epochSeconds(now) + turn.credentialTtlSeconds;
  const username = `${expiresAtEpochSeconds}:${credentialSubject(userId)}`;
  const credential = createHmac('sha1', secret).update(username).digest('base64');
  const issuedServers = clonedServers.map(server => serverHasTurn(server)
    ? { ...server, username, credential }
    : server);

  return {
    iceServers: issuedServers,
    authMode: turn.authMode,
    credentialTtlSeconds: turn.credentialTtlSeconds,
    credentialExpiresAt: new Date(expiresAtEpochSeconds * 1_000).toISOString(),
    credentialExpiresAtEpochSeconds: expiresAtEpochSeconds
  };
}
