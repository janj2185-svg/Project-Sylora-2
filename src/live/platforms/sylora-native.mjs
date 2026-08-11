import { BaseLiveAdapter } from './base-adapter.mjs';
import { createLiveEvent } from '../core/types.mjs';

/** First-party SYLORA LIVE adapter — bridges existing rooms/chat/gifts into the event bus. */
export class SyloraNativeAdapter extends BaseLiveAdapter {
  constructor({ bus, store, userId } = {}) {
    super('sylora', { bus, credentials: null });
    this.store = store;
    this.userId = userId;
    this.activeStreamId = null;
  }

  async onConnect() {
    this.state = 'CONNECTED';
    this.lastError = null;
    this.reconnectAttempt = 0;
    if (this.bus) {
      this.bus.publish(createLiveEvent({
        platform: 'sylora',
        eventType: 'connection_status',
        message: 'SYLORA LIVE adapter connected',
        metadata: { state: 'CONNECTED' }
      }), { platform: 'sylora' });
    }
    return this.connectionSnapshot();
  }

  bindStream(streamId) {
    this.activeStreamId = streamId;
    return this;
  }

  ingestChat({ streamId, userId, username, displayName, text, messageId, language }) {
    if (!this.bus) return { accepted: false, reason: 'NO_BUS' };
    return this.bus.publish(createLiveEvent({
      id: messageId,
      platform: 'sylora',
      streamId: streamId || this.activeStreamId,
      eventId: messageId,
      userId,
      username,
      displayName,
      eventType: 'chat_message',
      message: text,
      language
    }), { platform: 'sylora' });
  }

  ingestGift({ streamId, userId, username, gift, amount, currency = 'LUMEN', transferId }) {
    if (!this.bus) return { accepted: false, reason: 'NO_BUS' };
    return this.bus.publish(createLiveEvent({
      id: transferId,
      platform: 'sylora',
      streamId: streamId || this.activeStreamId,
      eventId: transferId,
      userId,
      username,
      eventType: 'gift',
      gift,
      amount,
      currency
    }), { platform: 'sylora' });
  }

  async sendChat(text, { streamId } = {}) {
    if (!this.store || !this.userId) {
      return { ok: false, error: 'STORE_REQUIRED' };
    }
    const liveId = streamId || this.activeStreamId;
    const room = this.store.data.liveRooms.find(r => r.id === liveId && r.status === 'live');
    if (!room) return { ok: false, error: 'LIVE_NOT_FOUND' };
    const msg = {
      id: this.store.id(),
      liveId,
      userId: this.userId,
      text: String(text || '').slice(0, 500),
      createdAt: this.store.now(),
      platform: 'sylora'
    };
    this.store.data.liveMessages.push(msg);
    this.store.save();
    this.ingestChat({
      streamId: liveId,
      userId: this.userId,
      text: msg.text,
      messageId: msg.id
    });
    return { ok: true, message: msg };
  }
}
