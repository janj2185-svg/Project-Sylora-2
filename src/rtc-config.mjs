const ALLOWED_ICE_SCHEMES = /^(stun|stuns|turn|turns):/i;
const MAX_SERVERS = 8;

/** TURN username/credential must reach the browser ICE agent. Prefer ephemeral credentials. */
export const TURN_CREDENTIAL_POLICY = Object.freeze({
  clientExposure: 'webrtc_ice_required',
  note: 'TURN username and credential are sent only to authenticated clients through /api/live/rtc-config and /api/calls/rtc-config. They are used by the browser ICE agent and are not general server secrets, but they should still be short-lived. Do not reuse database, Redis, OpenAI, or payment credentials here.'
});

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 512 || !ALLOWED_ICE_SCHEMES.test(url)) return null;
  return url;
}

function iceUrls(server) {
  return (Array.isArray(server?.urls) ? server.urls : [server?.urls]).map(url => String(url || ''));
}

function parseCsv(raw) {
  return String(raw || '').split(',').map(item => item.trim()).filter(Boolean);
}

export function parseIceServers(raw) {
  if (!raw) return [];
  let input;
  try { input = JSON.parse(raw); } catch { return []; }
  if (!Array.isArray(input)) return [];
  const result = [];
  for (const item of input.slice(0, MAX_SERVERS)) {
    if (!item || typeof item !== 'object') continue;
    const sourceUrls = Array.isArray(item.urls) ? item.urls.slice(0, MAX_SERVERS) : [item.urls];
    const urls = sourceUrls.map(cleanUrl).filter(Boolean);
    if (!urls.length) continue;
    const server = { urls: Array.isArray(item.urls) ? urls : urls[0] };
    if (typeof item.username === 'string' && item.username.length <= 256) server.username = item.username;
    if (typeof item.credential === 'string' && item.credential.length <= 512) server.credential = item.credential;
    result.push(server);
  }
  return result;
}

export function hasTurnServer(iceServers = []) {
  return iceServers.some(server => iceUrls(server).some(url => /^turns?:/i.test(url)));
}

export function hasStunServer(iceServers = []) {
  return iceServers.some(server => iceUrls(server).some(url => /^stuns?:/i.test(url)));
}

export function mergeIceServers(...groups) {
  const result = [];
  const seen = new Set();
  for (const group of groups) {
    for (const server of group || []) {
      if (!server) continue;
      const key = JSON.stringify({
        urls: iceUrls(server),
        username: server.username || '',
        credential: server.credential || ''
      });
      if (seen.has(key)) continue;
      seen.add(key);
      result.push(server);
      if (result.length >= MAX_SERVERS) return result;
    }
  }
  return result;
}

export function iceServersFromEnv(env = process.env) {
  const fromJson = parseIceServers(env.SYLORA_ICE_SERVERS_JSON);
  const stunServers = parseCsv(env.SYLORA_STUN_URLS || env.SYLORA_STUN_URL)
    .map(cleanUrl)
    .filter(Boolean)
    .map(urls => ({ urls }));
  const turnUrl = cleanUrl(env.SYLORA_TURN_URL);
  const turnServers = [];
  if (turnUrl) {
    const server = { urls: turnUrl };
    const username = String(env.SYLORA_TURN_USERNAME || '').trim();
    const credential = String(env.SYLORA_TURN_CREDENTIAL || '').trim();
    if (username && username.length <= 256) server.username = username;
    if (credential && credential.length <= 512) server.credential = credential;
    turnServers.push(server);
  }
  return mergeIceServers(fromJson, stunServers, turnServers);
}
