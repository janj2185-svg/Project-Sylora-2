import { detectLanguageHint } from '../../language-detect.mjs';

/** Unified multipatform chat with priority, filters, pins, slow-mode. */
export class UnifiedLiveChat {
  constructor({ maxMessages = 500 } = {}) {
    this.maxMessages = maxMessages;
    this.messages = [];
    this.pins = [];
    this.muted = new Set();
    this.blocked = new Set();
    this.slowModeSec = 0;
    this.lastSpeak = new Map(); // userKey → ts
    this.filters = []; // { type:'contains'|'regex', value, action:'hide'|'flag' }
  }

  ingestNormalizedEvent(event) {
    if (!event || event.eventType !== 'chat_message') return null;
    const userKey = `${event.platform}:${event.userId || event.username || 'anon'}`;
    if (this.muted.has(userKey) || this.blocked.has(userKey)) {
      return { accepted: false, reason: 'muted_or_blocked' };
    }
    if (this.slowModeSec > 0) {
      const last = this.lastSpeak.get(userKey) || 0;
      const now = Date.parse(event.timestamp) || Date.now();
      if (now - last < this.slowModeSec * 1000) {
        return { accepted: false, reason: 'slow_mode' };
      }
      this.lastSpeak.set(userKey, now);
    }
    const language = event.language || detectLanguageHint(event.message || '') || null;
    const filterHit = this.#matchFilter(event.message || '');
    const meta = event.metadata || {};
    const msg = {
      id: event.id,
      platform: event.platform,
      streamId: event.streamId,
      externalUserId: event.userId,
      userId: event.userId,
      username: event.username,
      displayName: event.displayName || event.username,
      avatar: event.avatar,
      text: event.message || '',
      message: event.message || '',
      timestamp: event.timestamp,
      language,
      badge: platformBadge(event.platform),
      badges: event.badges || meta.badges || [],
      isSubscriber: event.isSubscriber ?? meta.isSubscriber ?? null,
      isFollower: event.isFollower ?? meta.isFollower ?? null,
      gift: event.gift || meta.gift || null,
      donation: event.amount != null ? { amount: event.amount, currency: event.currency || null } : (meta.donation || null),
      moderation: event.moderation || meta.moderation || null,
      eventType: event.eventType || 'chat_message',
      priority: 0,
      highlighted: false,
      hidden: filterHit?.action === 'hide',
      flagged: filterHit?.action === 'flag',
      replyTo: meta.replyTo || null,
      mentionsSylora: /\b(sylora|силора)\b/i.test(event.message || '')
    };
    if (!msg.hidden) {
      this.messages.push(msg);
      if (this.messages.length > this.maxMessages) this.messages.shift();
    }
    return { accepted: !msg.hidden, message: msg };
  }

  setSlowMode(seconds) {
    this.slowModeSec = Math.max(0, Math.min(120, Number(seconds) || 0));
    return { slowModeSec: this.slowModeSec };
  }

  mute(platform, userId) {
    this.muted.add(`${platform}:${userId}`);
    return { muted: true };
  }

  block(platform, userId) {
    this.blocked.add(`${platform}:${userId}`);
    return { blocked: true };
  }

  pin(messageId) {
    const msg = this.messages.find(m => m.id === messageId);
    if (!msg) return { ok: false, error: 'MESSAGE_NOT_FOUND' };
    this.pins = [msg, ...this.pins.filter(p => p.id !== messageId)].slice(0, 5);
    return { ok: true, pins: this.pins };
  }

  addFilter(filter) {
    this.filters.push({
      type: filter.type === 'regex' ? 'regex' : 'contains',
      value: String(filter.value || '').slice(0, 200),
      action: filter.action === 'flag' ? 'flag' : 'hide'
    });
    return { filters: this.filters.length };
  }

  search(q, limit = 30) {
    const query = String(q || '').toLowerCase();
    if (query.length < 1) return [];
    return this.messages.filter(m =>
      m.text.toLowerCase().includes(query) ||
      String(m.username || '').toLowerCase().includes(query)
    ).slice(-limit);
  }

  list({ limit = 100, platform = null, includeHidden = false } = {}) {
    let list = this.messages;
    if (platform) list = list.filter(m => m.platform === platform);
    if (!includeHidden) list = list.filter(m => !m.hidden);
    return list.slice(-Math.max(1, Math.min(300, limit)));
  }

  applyPriorities(scored) {
    // scored: [{ id, score }]
    const map = new Map(scored.map(s => [s.id, s.score]));
    for (const m of this.messages) {
      if (map.has(m.id)) {
        m.priority = map.get(m.id);
        m.highlighted = m.priority >= 70;
      }
    }
  }

  #matchFilter(text) {
    const t = String(text);
    for (const f of this.filters) {
      if (f.type === 'contains' && t.toLowerCase().includes(f.value.toLowerCase())) return f;
      if (f.type === 'regex') {
        try { if (new RegExp(f.value, 'i').test(t)) return f; } catch { /* ignore bad regex */ }
      }
    }
    return null;
  }
}

export function platformBadge(platform) {
  const map = {
    sylora: { label: 'SYLORA', color: '#c9a227' },
    tiktok: { label: 'TikTok', color: '#111' },
    youtube: { label: 'YouTube', color: '#c4302b' },
    twitch: { label: 'Twitch', color: '#9146ff' },
    facebook: { label: 'Facebook', color: '#1877f2' },
    instagram: { label: 'Instagram', color: '#e1306c' },
    kick: { label: 'Kick', color: '#53fc18' },
    discord: { label: 'Discord', color: '#5865f2' },
    obs: { label: 'OBS', color: '#302e3f' },
    custom_rtmp: { label: 'RTMP', color: '#666' }
  };
  return map[platform] || { label: String(platform || '?').toUpperCase(), color: '#888' };
}
