import { CONNECTION_STATES } from '../core/types.mjs';
import { PLATFORM_CAPABILITIES } from './capabilities.mjs';

/**
 * Base platform adapter — all platforms extend this.
 * Never invent chat/gifts/viewers. Fail closed with honest status.
 */
export class BaseLiveAdapter {
  constructor(platformId, { bus = null, credentials = null } = {}) {
    this.platformId = platformId;
    this.bus = bus;
    this.credentials = credentials;
    this.state = 'DISCONNECTED';
    this.lastError = null;
    this.reconnectAttempt = 0;
    this.capabilities = PLATFORM_CAPABILITIES[platformId] || {
      id: platformId, status: 'UNAVAILABLE', notes: 'Unknown platform'
    };
  }

  getCapability(name) {
    return this.capabilities[name] ?? 'UNAVAILABLE';
  }

  connectionSnapshot() {
    return {
      platform: this.platformId,
      name: this.capabilities.name || this.platformId,
      state: this.state,
      lastError: this.lastError,
      reconnectAttempt: this.reconnectAttempt,
      capabilities: this.capabilities,
      canReadChat: this.getCapability('readChat') === 'WORKING',
      canSendChat: this.getCapability('sendChat') === 'WORKING'
    };
  }

  async connect() {
    if (!CONNECTION_STATES.includes('CONNECTING')) {/* noop */}
    this.state = 'CONNECTING';
    const status = this.capabilities.status;
    if (status === 'SETUP_REQUIRED' || status === 'UNAVAILABLE') {
      this.state = status === 'UNAVAILABLE' ? 'UNAVAILABLE' : 'AUTH_REQUIRED';
      this.lastError = status === 'UNAVAILABLE' ? 'PLATFORM_API_UNAVAILABLE' : 'OWNER_CREDENTIALS_REQUIRED';
      return this.connectionSnapshot();
    }
    if (status === 'WORKING' || status === 'WORKING_LOCAL' || status === 'PARTIAL') {
      return this.onConnect();
    }
    this.state = 'AUTH_REQUIRED';
    this.lastError = 'OWNER_CREDENTIALS_REQUIRED';
    return this.connectionSnapshot();
  }

  async onConnect() {
    this.state = 'CONNECTED';
    this.lastError = null;
    this.reconnectAttempt = 0;
    return this.connectionSnapshot();
  }

  async disconnect() {
    this.state = 'DISCONNECTED';
    return this.connectionSnapshot();
  }

  async reconnect() {
    this.state = 'RECONNECTING';
    this.reconnectAttempt += 1;
    const delay = Math.min(30_000, 500 * 2 ** Math.min(6, this.reconnectAttempt - 1));
    await new Promise(r => setTimeout(r, Math.min(delay, 5))); // tests: cap wait
    return this.connect();
  }

  /** Ingest a platform-native payload → bus. Override in subclasses. */
  ingest(_payload) {
    return { accepted: false, reason: 'NOT_SUPPORTED' };
  }

  async sendChat(_text, _opts = {}) {
    if (this.getCapability('sendChat') !== 'WORKING') {
      return { ok: false, error: 'SEND_CHAT_NOT_SUPPORTED', status: this.getCapability('sendChat') };
    }
    return { ok: false, error: 'NOT_IMPLEMENTED_IN_BASE' };
  }

  health() {
    return {
      platform: this.platformId,
      state: this.state,
      ok: this.state === 'CONNECTED',
      lastError: this.lastError
    };
  }
}
