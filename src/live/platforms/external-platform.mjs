import { BaseLiveAdapter } from './base-adapter.mjs';
import { PLATFORM_CAPABILITIES } from './capabilities.mjs';

/**
 * External social LIVE platforms — adapter shell until owner OAuth/API approval.
 * connect() never fakes CONNECTED.
 */
export class ExternalPlatformAdapter extends BaseLiveAdapter {
  constructor(platformId, { bus } = {}) {
    super(platformId, { bus });
    this.capabilities = PLATFORM_CAPABILITIES[platformId] || {
      id: platformId,
      name: platformId,
      status: 'UNAVAILABLE',
      notes: 'Unknown platform'
    };
  }

  async onConnect() {
    // Should not be reached for SETUP_REQUIRED — base handles it.
    // If Instagram UNAVAILABLE:
    if (this.capabilities.status === 'UNAVAILABLE') {
      this.state = 'UNAVAILABLE';
      this.lastError = 'PLATFORM_API_UNAVAILABLE';
      return this.connectionSnapshot();
    }
    this.state = 'AUTH_REQUIRED';
    this.lastError = 'OWNER_CREDENTIALS_REQUIRED';
    return {
      ...this.connectionSnapshot(),
      integrationBoundary: {
        required: oauthEnvFor(this.platformId),
        note: 'Token exchange + EventSub/chat bridges activate only after credentials are provisioned server-side.'
      }
    };
  }

  ingest() {
    return { accepted: false, reason: 'AUTH_REQUIRED', status: this.state };
  }
}

function oauthEnvFor(id) {
  const map = {
    tiktok: ['TIKTOK_CLIENT_KEY', 'TIKTOK_CLIENT_SECRET', 'TIKTOK_REDIRECT_URI'],
    youtube: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'YOUTUBE_REDIRECT_URI'],
    twitch: ['TWITCH_CLIENT_ID', 'TWITCH_CLIENT_SECRET', 'TWITCH_REDIRECT_URI'],
    facebook: ['META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI'],
    instagram: ['META_APP_ID', 'META_APP_SECRET'],
    kick: ['KICK_CLIENT_ID', 'KICK_CLIENT_SECRET', 'KICK_REDIRECT_URI'],
    discord: ['DISCORD_BOT_TOKEN', 'DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET']
  };
  return map[id] || [];
}
