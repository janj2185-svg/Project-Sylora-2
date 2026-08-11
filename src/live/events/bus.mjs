/**
 * Unified Live Event Bus — normalize, dedupe, rate-limit, order, backpressure.
 * Platform adapters publish here; chat/AI/automation subscribe.
 */

import { createLiveEvent, LIVE_EVENT_TYPES } from '../core/types.mjs';

export class LiveEventBus {
  constructor({
    maxQueue = 2000,
    dedupeTtlMs = 120_000,
    ratePerSec = 80,
    now = () => Date.now()
  } = {}) {
    this.maxQueue = maxQueue;
    this.dedupeTtlMs = dedupeTtlMs;
    this.ratePerSec = ratePerSec;
    this.now = now;
    this.queue = [];
    this.seen = new Map(); // event key → expiresAt
    this.subscribers = new Set();
    this.window = [];
    this.dropped = 0;
    this.processed = 0;
    this.seq = 0;
  }

  subscribe(fn) {
    this.subscribers.add(fn);
    return () => this.subscribers.delete(fn);
  }

  /** Publish raw or already-normalized event. Returns { accepted, reason?, event? } */
  publish(raw, { platform = 'sylora' } = {}) {
    this.#gc();
    const event = this.#normalize(raw, platform);
    const key = this.#dedupeKey(event);
    if (this.seen.has(key)) {
      return { accepted: false, reason: 'duplicate', event };
    }
    if (!this.#allowRate()) {
      this.dropped += 1;
      return { accepted: false, reason: 'rate_limited', event };
    }
    if (this.queue.length >= this.maxQueue) {
      // backpressure: drop oldest non-critical first
      const idx = this.queue.findIndex(e => !this.#critical(e.eventType));
      if (idx >= 0) this.queue.splice(idx, 1);
      else this.queue.shift();
      this.dropped += 1;
    }
    this.seen.set(key, this.now() + this.dedupeTtlMs);
    this.seq += 1;
    const ordered = { ...event, seq: this.seq };
    this.queue.push(ordered);
    this.processed += 1;
    for (const fn of this.subscribers) {
      try { fn(ordered); } catch { /* isolate subscriber failures */ }
    }
    return { accepted: true, event: ordered };
  }

  drain(limit = 100) {
    const n = Math.max(0, Math.min(500, Number(limit) || 100));
    return this.queue.splice(0, n);
  }

  peek(limit = 50) {
    return this.queue.slice(-Math.max(1, Math.min(200, Number(limit) || 50)));
  }

  stats() {
    return {
      queued: this.queue.length,
      processed: this.processed,
      dropped: this.dropped,
      subscribers: this.subscribers.size,
      dedupeEntries: this.seen.size,
      seq: this.seq
    };
  }

  #normalize(raw, platform) {
    if (raw && LIVE_EVENT_TYPES.includes(raw.eventType) && raw.id) {
      return { ...raw, platform: raw.platform || platform };
    }
    return createLiveEvent({
      id: raw?.id,
      platform: raw?.platform || platform,
      streamId: raw?.streamId ?? raw?.stream_id ?? null,
      eventId: raw?.eventId ?? raw?.event_id ?? null,
      userId: raw?.userId ?? raw?.user_id ?? null,
      username: raw?.username ?? null,
      displayName: raw?.displayName ?? raw?.display_name ?? null,
      avatar: raw?.avatar ?? null,
      timestamp: raw?.timestamp || new Date(this.now()).toISOString(),
      eventType: raw?.eventType || raw?.type || 'chat_message',
      message: raw?.message ?? raw?.text ?? null,
      amount: raw?.amount ?? null,
      currency: raw?.currency ?? null,
      gift: raw?.gift ?? null,
      metadata: raw?.metadata || {},
      language: raw?.language ?? null
    });
  }

  #dedupeKey(event) {
    return `${event.platform}|${event.eventType}|${event.eventId || event.id}|${event.userId || ''}|${event.message || ''}|${event.timestamp}`;
  }

  #allowRate() {
    const t = this.now();
    this.window = this.window.filter(x => t - x < 1000);
    if (this.window.length >= this.ratePerSec) return false;
    this.window.push(t);
    return true;
  }

  #critical(type) {
    return ['gift', 'donation', 'stream_started', 'stream_ended', 'subscription', 'moderation_event'].includes(type);
  }

  #gc() {
    const t = this.now();
    for (const [k, exp] of this.seen) {
      if (exp <= t) this.seen.delete(k);
    }
  }
}
