/** Realtime LIVE analytics — derived from real events only. */

export class LiveAnalytics {
  constructor() {
    this.reset();
  }

  reset() {
    this.startedAt = null;
    this.endedAt = null;
    this.viewers = 0;
    this.peakViewers = 0;
    this.chatCount = 0;
    this.likes = 0;
    this.gifts = 0;
    this.donations = 0;
    this.followersGained = 0;
    this.subscriptions = 0;
    this.aiInteractions = 0;
    this.byPlatform = {};
    this.chatTimestamps = [];
    this.topics = [];
  }

  markStarted(at = new Date().toISOString()) {
    this.startedAt = at;
    this.endedAt = null;
  }

  markEnded(at = new Date().toISOString()) {
    this.endedAt = at;
  }

  setViewers(n) {
    this.viewers = Math.max(0, Number(n) || 0);
    this.peakViewers = Math.max(this.peakViewers, this.viewers);
  }

  ingest(event) {
    if (!event) return;
    const p = event.platform || 'unknown';
    this.byPlatform[p] = this.byPlatform[p] || { chat: 0, gifts: 0, likes: 0 };
    switch (event.eventType) {
      case 'chat_message':
        this.chatCount += 1;
        this.byPlatform[p].chat += 1;
        this.chatTimestamps.push(Date.parse(event.timestamp) || Date.now());
        this.#trimChatWindow();
        break;
      case 'like':
      case 'reaction':
        this.likes += 1;
        this.byPlatform[p].likes += 1;
        break;
      case 'gift':
        this.gifts += 1;
        this.byPlatform[p].gifts += 1;
        break;
      case 'donation':
        this.donations += 1;
        break;
      case 'follow':
        this.followersGained += 1;
        break;
      case 'subscription':
      case 'membership':
        this.subscriptions += 1;
        break;
      case 'ai_spoke':
        this.aiInteractions += 1;
        break;
      case 'viewer_joined':
        this.setViewers(this.viewers + 1);
        break;
      case 'viewer_left':
        this.setViewers(this.viewers - 1);
        break;
      default:
        break;
    }
  }

  snapshot() {
    return {
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      viewers: this.viewers,
      peakViewers: this.peakViewers,
      chatTotal: this.chatCount,
      chatPerMin: this.#chatPerMin(),
      likes: this.likes,
      gifts: this.gifts,
      donations: this.donations,
      followersGained: this.followersGained,
      subscriptions: this.subscriptions,
      aiInteractions: this.aiInteractions,
      platformBreakdown: this.byPlatform,
      engagement: this.#engagement()
    };
  }

  #chatPerMin() {
    this.#trimChatWindow();
    return this.chatTimestamps.length;
  }

  #trimChatWindow() {
    const cutoff = Date.now() - 60_000;
    this.chatTimestamps = this.chatTimestamps.filter(t => t >= cutoff);
  }

  #engagement() {
    return this.chatCount * 1 + this.likes * 0.2 + this.gifts * 5 + this.subscriptions * 8;
  }
}
