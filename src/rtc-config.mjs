const ALLOWED_ICE_SCHEMES = /^(stun|stuns|turn|turns):/i;

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 512 || !ALLOWED_ICE_SCHEMES.test(url)) return null;
  return url;
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
    const urls = sourceUrls.map(cleanUrl).filter(Boolean);
    if (!urls.length) continue;
    const server = { urls: Array.isArray(item.urls) ? urls : urls[0] };
    if (typeof item.username === 'string' && item.username.length <= 256) server.username = item.username;
    if (typeof item.credential === 'string' && item.credential.length <= 512) server.credential = item.credential;
    result.push(server);
  }
  return result;
}

function parseStunUrls(raw) {
  return String(raw || '')
    .split(/[,\s]+/)
    .map(cleanUrl)
    .filter(Boolean)
    .slice(0, 8);
}

function turnFromEnv(env = process.env) {
  const url = cleanUrl(env.SYLORA_TURN_URL);
  if (!url) return null;
  const server = { urls: url };
  const username = String(env.SYLORA_TURN_USERNAME || '').trim();
  const credential = String(env.SYLORA_TURN_CREDENTIAL || '').trim();
  if (username && username.length <= 256) server.username = username;
  if (credential && credential.length <= 512) server.credential = credential;
  return server;
}

/**
 * Build ICE server list from JSON blob and/or discrete STUN/TURN env vars.
 * TURN username/credential are client-side WebRTC credentials when exposed via rtc-config endpoint.
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
  return iceServers.some(server => (Array.isArray(server.urls) ? server.urls : [server.urls]).some(url => /^turns?:/i.test(String(url || ''))));
}
