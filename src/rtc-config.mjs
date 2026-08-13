const ALLOWED_ICE_SCHEMES = /^(stun|stuns|turn|turns):/i;

export const TURN_CREDENTIAL_NOTE = 'WebRTC TURN username and credential are delivered to authenticated browsers so the ICE agent can allocate a relay. This is required by the WebRTC API and is not a server-only secret. Production should use short-lived TURN credentials, not a long-lived shared secret.';

function cleanUrl(value) {
  const url = String(value || '').trim();
  if (!url || url.length > 512 || !ALLOWED_ICE_SCHEMES.test(url)) return null;
  return url;
}

function urlsOf(server) {
  if (!server) return [];
  return Array.isArray(server.urls) ? server.urls : [server.urls];
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

export function hasTurnServer(iceServers = []) {
  return iceServers.some(server => urlsOf(server).some(url => /^turns?:/i.test(String(url || ''))));
}

export function hasStunServer(iceServers = []) {
  return iceServers.some(server => urlsOf(server).some(url => /^stuns?:/i.test(String(url || ''))));
}

function parseStunUrls(raw) {
  return String(raw || '')
    .split(',')
    .map(cleanUrl)
    .filter(Boolean)
    .slice(0, 8);
}

function discreteTurnServer(env = {}) {
  const url = cleanUrl(env.SYLORA_TURN_URL);
  if (!url) return null;
  const server = { urls: url };
  const username = String(env.SYLORA_TURN_USERNAME || '').trim();
  const credential = String(env.SYLORA_TURN_CREDENTIAL || '').trim();
  if (username && username.length <= 256) server.username = username;
  if (credential && credential.length <= 512) server.credential = credential;
  return server;
}

export function resolveIceConfig(env = process.env) {
  const iceServers = [...parseIceServers(env.SYLORA_ICE_SERVERS_JSON)];
  const stunUrls = parseStunUrls(env.SYLORA_STUN_URLS);
  if (stunUrls.length) iceServers.push({ urls: stunUrls.length === 1 ? stunUrls[0] : stunUrls });
  const turn = discreteTurnServer(env);
  if (turn) iceServers.push(turn);
  const turnConfigured = hasTurnServer(iceServers);
  const stunConfigured = hasStunServer(iceServers);
  return {
    iceServers,
    turnConfigured,
    stunConfigured,
    sources: {
      iceServersJson: Boolean(String(env.SYLORA_ICE_SERVERS_JSON || '').trim()),
      stunUrls: stunUrls.length > 0,
      turnUrl: Boolean(turn)
    },
    credentialDelivery: 'authenticated_browser_webrtc',
    credentialNote: TURN_CREDENTIAL_NOTE
  };
}

export function webrtcReadiness({ iceServers = [], nodeEnv = 'development' } = {}) {
  const turnConfigured = hasTurnServer(iceServers);
  const stunConfigured = hasStunServer(iceServers);
  if (turnConfigured) {
    return {
      status: 'ok',
      turnConfigured,
      stunConfigured,
      reason: null,
      liveCapability: 'ready_for_nat_traversal'
    };
  }
  if (nodeEnv === 'production') {
    return {
      status: 'NOT_READY',
      turnConfigured: false,
      stunConfigured,
      reason: 'TURN_NOT_CONFIGURED',
      liveCapability: 'host_candidates_only'
    };
  }
  return {
    status: 'DEGRADED',
    turnConfigured: false,
    stunConfigured,
    reason: 'TURN_NOT_CONFIGURED',
    liveCapability: 'host_candidates_only'
  };
}

export function publicRtcClientConfig(iceConfig, { nodeEnv = 'development' } = {}) {
  const readiness = webrtcReadiness({ iceServers: iceConfig.iceServers, nodeEnv });
  return {
    iceServers: iceConfig.iceServers,
    turnConfigured: iceConfig.turnConfigured,
    stunConfigured: iceConfig.stunConfigured,
    status: readiness.status,
    reason: readiness.reason,
    credentialDelivery: iceConfig.credentialDelivery,
    note: iceConfig.turnConfigured ? iceConfig.credentialNote : 'TURN is not configured. WebRTC may fail across NAT/mobile networks.'
  };
}
