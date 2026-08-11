import { BaseLiveAdapter } from './base-adapter.mjs';

/**
 * Custom RTMP destination vault — stores destination metadata only.
 * Never claims chat/viewers. Actual push is via OBS or future media server (owner RTMP).
 */
export class CustomRtmpAdapter extends BaseLiveAdapter {
  constructor({ bus, store, userId } = {}) {
    super('custom_rtmp', { bus });
    this.store = store;
    this.userId = userId;
  }

  async onConnect() {
    const dest = this.#destination();
    if (!dest?.url) {
      this.state = 'SETUP_REQUIRED';
      this.lastError = 'RTMP_DESTINATION_REQUIRED';
      return this.connectionSnapshot();
    }
    this.state = 'CONNECTED';
    this.lastError = null;
    return {
      ...this.connectionSnapshot(),
      destination: { urlHost: safeHost(dest.url), hasStreamKey: !!dest.streamKeySet },
      honesty: { note: 'RTMP key never returned to clients after save. Push via OBS or media server.' }
    };
  }

  saveDestination({ url, label = 'Custom RTMP' } = {}) {
    if (!this.store || !this.userId) throw new Error('STORE_REQUIRED');
    const parsed = String(url || '').trim();
    if (!/^rtmps?:\/\//i.test(parsed)) {
      const err = new Error('INVALID_RTMP_URL');
      err.code = 'INVALID_RTMP_URL';
      throw err;
    }
    const list = this.store.data.liveRtmpDestinations || (this.store.data.liveRtmpDestinations = []);
    let row = list.find(d => d.userId === this.userId);
    if (!row) {
      row = { id: this.store.id(), userId: this.userId, createdAt: this.store.now() };
      list.push(row);
    }
    row.url = parsed;
    row.label = String(label).slice(0, 80);
    row.streamKeySet = false; // key must be set via separate secure endpoint
    row.updatedAt = this.store.now();
    this.store.save();
    return { id: row.id, urlHost: safeHost(row.url), label: row.label, streamKeySet: row.streamKeySet };
  }

  /** Store key server-side only — never echo back. */
  setStreamKey(streamKey) {
    if (!this.store || !this.userId) throw new Error('STORE_REQUIRED');
    const key = String(streamKey || '').trim();
    if (key.length < 8) {
      const err = new Error('STREAM_KEY_TOO_SHORT');
      err.code = 'STREAM_KEY_TOO_SHORT';
      throw err;
    }
    const list = this.store.data.liveRtmpDestinations || (this.store.data.liveRtmpDestinations = []);
    const row = list.find(d => d.userId === this.userId);
    if (!row) throw Object.assign(new Error('DESTINATION_REQUIRED'), { code: 'DESTINATION_REQUIRED' });
    row.streamKeyEnc = `vault:${Buffer.from(key).toString('base64url')}`; // local vault marker; prod should use KMS
    row.streamKeySet = true;
    row.updatedAt = this.store.now();
    this.store.save();
    return { ok: true, streamKeySet: true };
  }

  #destination() {
    return (this.store?.data?.liveRtmpDestinations || []).find(d => d.userId === this.userId) || null;
  }
}

function safeHost(url) {
  try { return new URL(url).host; } catch { return 'invalid'; }
}
