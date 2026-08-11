/**
 * Honest platform capability matrix.
 * UNAVAILABLE / AUTH_REQUIRED / API_LIMITED — never claim WORKING without real API access.
 */

export const PLATFORM_CAPABILITIES = Object.freeze({
  sylora: {
    id: 'sylora',
    name: 'SYLORA LIVE',
    readChat: 'WORKING',
    sendChat: 'WORKING',
    giftsDonations: 'WORKING',
    moderation: 'WORKING',
    streamControl: 'WORKING',
    oauth: 'N/A',
    viewerEvents: 'WORKING',
    status: 'WORKING',
    notes: 'First-party WebRTC + SSE stack already in production path.'
  },
  obs: {
    id: 'obs',
    name: 'OBS Studio',
    readChat: 'N/A',
    sendChat: 'N/A',
    giftsDonations: 'N/A',
    moderation: 'N/A',
    streamControl: 'WORKING_LOCAL',
    oauth: 'N/A',
    viewerEvents: 'N/A',
    status: 'WORKING',
    notes: 'Local OBS WebSocket 5.x + Companion. Stream keys stay in OBS.'
  },
  custom_rtmp: {
    id: 'custom_rtmp',
    name: 'Custom RTMP',
    readChat: 'UNAVAILABLE',
    sendChat: 'UNAVAILABLE',
    giftsDonations: 'UNAVAILABLE',
    moderation: 'UNAVAILABLE',
    streamControl: 'PARTIAL',
    oauth: 'N/A',
    viewerEvents: 'UNAVAILABLE',
    status: 'PARTIAL',
    notes: 'Destination URL/key vault + status only. Ingest/egress needs owner RTMP endpoint; no fake chat.'
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok LIVE',
    readChat: 'BLOCKED_EXTERNAL',
    sendChat: 'BLOCKED_EXTERNAL',
    giftsDonations: 'BLOCKED_EXTERNAL',
    moderation: 'BLOCKED_EXTERNAL',
    streamControl: 'BLOCKED_EXTERNAL',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'BLOCKED_EXTERNAL',
    status: 'SETUP_REQUIRED',
    notes: 'Requires TikTok developer approval + LIVE API access. Adapter contract ready; no fake events.'
  },
  youtube: {
    id: 'youtube',
    name: 'YouTube Live',
    readChat: 'BLOCKED_EXTERNAL',
    sendChat: 'BLOCKED_EXTERNAL',
    giftsDonations: 'BLOCKED_EXTERNAL',
    moderation: 'BLOCKED_EXTERNAL',
    streamControl: 'BLOCKED_EXTERNAL',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'BLOCKED_EXTERNAL',
    status: 'SETUP_REQUIRED',
    notes: 'YouTube Data API + Live Streaming API OAuth. Adapter ready.'
  },
  twitch: {
    id: 'twitch',
    name: 'Twitch',
    readChat: 'BLOCKED_EXTERNAL',
    sendChat: 'BLOCKED_EXTERNAL',
    giftsDonations: 'BLOCKED_EXTERNAL',
    moderation: 'BLOCKED_EXTERNAL',
    streamControl: 'BLOCKED_EXTERNAL',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'BLOCKED_EXTERNAL',
    status: 'SETUP_REQUIRED',
    notes: 'Twitch Helix + EventSub + IRC/chat. Adapter ready.'
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Live',
    readChat: 'BLOCKED_EXTERNAL',
    sendChat: 'BLOCKED_EXTERNAL',
    giftsDonations: 'BLOCKED_EXTERNAL',
    moderation: 'BLOCKED_EXTERNAL',
    streamControl: 'BLOCKED_EXTERNAL',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'BLOCKED_EXTERNAL',
    status: 'SETUP_REQUIRED',
    notes: 'Meta Graph API Live Video — app review required.'
  },
  instagram: {
    id: 'instagram',
    name: 'Instagram Live',
    readChat: 'UNAVAILABLE',
    sendChat: 'UNAVAILABLE',
    giftsDonations: 'UNAVAILABLE',
    moderation: 'UNAVAILABLE',
    streamControl: 'UNAVAILABLE',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'UNAVAILABLE',
    status: 'UNAVAILABLE',
    notes: 'No stable public LIVE chat/control API for third-party co-host. Honest UNAVAILABLE.'
  },
  kick: {
    id: 'kick',
    name: 'Kick',
    readChat: 'BLOCKED_EXTERNAL',
    sendChat: 'BLOCKED_EXTERNAL',
    giftsDonations: 'BLOCKED_EXTERNAL',
    moderation: 'BLOCKED_EXTERNAL',
    streamControl: 'BLOCKED_EXTERNAL',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'BLOCKED_EXTERNAL',
    status: 'SETUP_REQUIRED',
    notes: 'Kick API/OAuth when credentials + approved app available.'
  },
  discord: {
    id: 'discord',
    name: 'Discord',
    readChat: 'BLOCKED_EXTERNAL',
    sendChat: 'BLOCKED_EXTERNAL',
    giftsDonations: 'N/A',
    moderation: 'BLOCKED_EXTERNAL',
    streamControl: 'UNAVAILABLE',
    oauth: 'BLOCKED_EXTERNAL',
    viewerEvents: 'PARTIAL',
    status: 'SETUP_REQUIRED',
    notes: 'Bot token + guild channel bridge. Voice Stage ≠ LIVE ingest.'
  }
});

export function capabilityMatrixRows() {
  return Object.values(PLATFORM_CAPABILITIES).map(p => ({
    platform: p.id,
    name: p.name,
    readChat: p.readChat,
    sendChat: p.sendChat,
    giftsDonations: p.giftsDonations,
    moderation: p.moderation,
    streamControl: p.streamControl,
    oauth: p.oauth,
    status: p.status,
    notes: p.notes
  }));
}
