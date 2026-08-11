import { BaseLiveAdapter } from './base-adapter.mjs';
import { PLATFORM_CAPABILITIES, capabilityMatrixRows } from './capabilities.mjs';
import { SyloraNativeAdapter } from './sylora-native.mjs';
import { ObsLiveAdapter } from './obs-adapter.mjs';
import { CustomRtmpAdapter } from './custom-rtmp.mjs';
import { ExternalPlatformAdapter } from './external-platform.mjs';

const EXTERNAL_IDS = ['tiktok', 'youtube', 'twitch', 'facebook', 'instagram', 'kick', 'discord'];

export class PlatformRegistry {
  constructor({ bus, store, userId } = {}) {
    this.bus = bus;
    this.store = store;
    this.userId = userId;
    this.adapters = new Map();
  }

  ensureDefaults() {
    if (!this.adapters.has('sylora')) {
      this.adapters.set('sylora', new SyloraNativeAdapter({ bus: this.bus, store: this.store, userId: this.userId }));
    }
    if (!this.adapters.has('obs')) {
      this.adapters.set('obs', new ObsLiveAdapter({ bus: this.bus }));
    }
    if (!this.adapters.has('custom_rtmp')) {
      this.adapters.set('custom_rtmp', new CustomRtmpAdapter({ bus: this.bus, store: this.store, userId: this.userId }));
    }
    for (const id of EXTERNAL_IDS) {
      if (!this.adapters.has(id)) {
        this.adapters.set(id, new ExternalPlatformAdapter(id, { bus: this.bus }));
      }
    }
    return this;
  }

  get(id) {
    this.ensureDefaults();
    return this.adapters.get(id) || null;
  }

  listConnections() {
    this.ensureDefaults();
    return [...this.adapters.values()].map(a => a.connectionSnapshot());
  }

  capabilityMatrix() {
    return capabilityMatrixRows();
  }

  async connect(platformId) {
    const adapter = this.get(platformId);
    if (!adapter) throw Object.assign(new Error('UNKNOWN_PLATFORM'), { code: 'UNKNOWN_PLATFORM' });
    return adapter.connect();
  }

  async disconnect(platformId) {
    const adapter = this.get(platformId);
    if (!adapter) throw Object.assign(new Error('UNKNOWN_PLATFORM'), { code: 'UNKNOWN_PLATFORM' });
    return adapter.disconnect();
  }

  /** Isolate failures: one platform down must not stop others. */
  healthAll() {
    this.ensureDefaults();
    const items = [...this.adapters.values()].map(a => a.health());
    return {
      ok: items.some(i => i.platform === 'sylora' && i.ok),
      platforms: items,
      degraded: items.filter(i => !i.ok && i.platform !== 'sylora').map(i => i.platform)
    };
  }
}

export { BaseLiveAdapter, PLATFORM_CAPABILITIES };
