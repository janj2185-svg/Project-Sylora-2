const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);

function clean(value, max = 180) {
  return String(value ?? '').trim().slice(0, max);
}

export function normalizeRelayBaseUrl(value) {
  const url = new URL(clean(value, 500));
  const loopback = LOOPBACK_HOSTS.has(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) throw new Error('LIVE_RELAY_HTTPS_REQUIRED');
  if (url.username || url.password || url.search || url.hash) throw new Error('LIVE_RELAY_URL_INVALID');
  url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString().replace(/\/$/, '');
}

export class TikTokRelayUplink {
  constructor({ eventsAfter, fetchImpl = globalThis.fetch, pollMs = 750, retryMaxMs = 15_000 } = {}) {
    if (typeof eventsAfter !== 'function') throw new Error('LIVE_RELAY_EVENT_SOURCE_REQUIRED');
    this.eventsAfter = eventsAfter;
    this.fetch = fetchImpl;
    this.pollMs = Math.max(250, Math.min(5_000, Number(pollMs) || 750));
    this.retryMaxMs = Math.max(this.pollMs, Math.min(60_000, Number(retryMaxMs) || 15_000));
    this.timer = null;
    this.generation = 0;
    this.config = null;
    this.cursor = 0;
    this.failures = 0;
    this.status = { state: 'disconnected', connected: false, baseUrl: null, liveId: null, cursor: 0, lastRelayAt: null, lastError: null };
  }

  snapshot() {
    return { ...this.status };
  }

  async #request(path, { method = 'POST', body } = {}) {
    if (!this.fetch) throw new Error('FETCH_UNAVAILABLE');
    const response = await this.fetch(`${this.config.baseUrl}${path}`, {
      method,
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${this.config.token}`,
        ...(body === undefined ? {} : { 'content-type': 'application/json' })
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(8_000)
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(clean(data.error || `LIVE_RELAY_HTTP_${response.status}`, 120));
    return data;
  }

  async connect({ baseUrl, liveId, token }) {
    const next = {
      baseUrl: normalizeRelayBaseUrl(baseUrl),
      liveId: clean(liveId, 180),
      token: clean(token, 160)
    };
    if (!next.liveId) throw new Error('LIVE_ID_REQUIRED');
    if (!next.token.startsWith('slr_live_') || next.token.length < 48) throw new Error('LIVE_RELAY_TOKEN_INVALID');
    this.disconnect();
    this.config = next;
    const generation = ++this.generation;
    this.status = { state: 'connecting', connected: false, baseUrl: next.baseUrl, liveId: next.liveId, cursor: 0, lastRelayAt: null, lastError: null };
    await this.#request(`/api/live/${encodeURIComponent(next.liveId)}/connectors/tikfinity/check`, { body: {} });
    if (generation !== this.generation || !this.config) throw new Error('LIVE_RELAY_CANCELLED');
    this.status = { ...this.status, state: 'connected', connected: true };
    this.#schedule(0, generation);
    return this.snapshot();
  }

  #schedule(delay, generation = this.generation) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      this.#tick(generation).catch(() => {});
    }, delay);
  }

  async #tick(generation) {
    if (!this.config || generation !== this.generation) return;
    try {
      const page = this.eventsAfter(this.cursor, 100);
      for (const event of page.events || []) {
        if (!this.config || generation !== this.generation) return;
        await this.#request(`/api/live/${encodeURIComponent(this.config.liveId)}/connectors/tikfinity/events`, { body: { event } });
        this.cursor = Math.max(this.cursor, Number(event.cursor) || this.cursor);
        this.status = { ...this.status, cursor: this.cursor, lastRelayAt: new Date().toISOString(), lastError: null };
      }
      this.failures = 0;
      this.status = { ...this.status, state: 'connected', connected: true, cursor: this.cursor, lastError: null };
      this.#schedule(this.pollMs, generation);
    } catch (error) {
      this.failures += 1;
      const message = clean(error?.message || 'LIVE_RELAY_FAILED', 120);
      const authFailure = ['LIVE_RELAY_TOKEN_INVALID', 'LIVE_RELAY_TOKEN_EXPIRED', 'LIVE_RELAY_SCOPE_MISMATCH', 'LIVE_NOT_FOUND'].includes(message);
      this.status = { ...this.status, state: authFailure ? 'blocked' : 'reconnecting', connected: false, lastError: message };
      if (!authFailure) this.#schedule(Math.min(this.retryMaxMs, this.pollMs * (2 ** Math.min(6, this.failures))), generation);
    }
  }

  disconnect() {
    clearTimeout(this.timer);
    this.timer = null;
    this.generation += 1;
    this.config = null;
    this.cursor = 0;
    this.failures = 0;
    this.status = { state: 'disconnected', connected: false, baseUrl: null, liveId: null, cursor: 0, lastRelayAt: this.status.lastRelayAt, lastError: null };
    return this.snapshot();
  }
}
