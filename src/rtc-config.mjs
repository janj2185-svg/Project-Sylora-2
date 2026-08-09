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

export function hasTurnServer(iceServers = []) {
  return iceServers.some(server => (Array.isArray(server.urls) ? server.urls : [server.urls]).some(url => /^turns?:/i.test(String(url || ''))));
}
