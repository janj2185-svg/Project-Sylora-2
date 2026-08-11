/**
 * LIVE memory — short-term, session summaries, optional long-term viewer notes.
 * Privacy: user-controlled; no raw full chat dump into prompts.
 */

export class LiveMemory {
  constructor({ userId, store = null, maxShort = 40, maxViewers = 200 } = {}) {
    this.userId = userId;
    this.store = store;
    this.maxShort = maxShort;
    this.maxViewers = maxViewers;
    this.shortTerm = [];
    this.sessionSummary = [];
    this.enabled = true;
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
    return { enabled: this.enabled };
  }

  rememberInteraction({ platform, userId, username, kind, summary }) {
    if (!this.enabled) return null;
    const item = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      platform,
      userId,
      username,
      kind,
      summary: String(summary || '').slice(0, 240),
      at: new Date().toISOString()
    };
    this.shortTerm.push(item);
    if (this.shortTerm.length > this.maxShort) this.shortTerm.shift();
    if (userId && this.store) this.#upsertViewer(item);
    return item;
  }

  addSessionNote(note) {
    if (!this.enabled) return null;
    const row = { at: new Date().toISOString(), note: String(note || '').slice(0, 400) };
    this.sessionSummary.push(row);
    if (this.sessionSummary.length > 80) this.sessionSummary.shift();
    return row;
  }

  contextPack({ query = '', limit = 8 } = {}) {
    if (!this.enabled) return { enabled: false, items: [], note: 'Live memory disabled by user.' };
    const q = String(query || '').toLowerCase();
    let items = this.shortTerm.slice();
    if (q) items = items.filter(i => i.summary.toLowerCase().includes(q) || String(i.username || '').toLowerCase().includes(q));
    return {
      enabled: true,
      items: items.slice(-limit).map(i => ({
        username: i.username,
        platform: i.platform,
        kind: i.kind,
        summary: i.summary,
        at: i.at
      })),
      sessionNotes: this.sessionSummary.slice(-5),
      note: 'Summaries only — not a raw chat dump.'
    };
  }

  clearSession() {
    this.shortTerm = [];
    this.sessionSummary = [];
    return { cleared: 'session' };
  }

  clearViewer(viewerUserId) {
    if (!this.store || !this.userId) return { cleared: 0 };
    const list = this.store.data.liveViewerMemory || [];
    const before = list.length;
    this.store.data.liveViewerMemory = list.filter(v => !(v.hostId === this.userId && v.viewerId === viewerUserId));
    this.store.save();
    return { cleared: before - this.store.data.liveViewerMemory.length };
  }

  clearAllLongTerm() {
    if (!this.store || !this.userId) return { cleared: 0 };
    const list = this.store.data.liveViewerMemory || [];
    const next = list.filter(v => v.hostId !== this.userId);
    const cleared = list.length - next.length;
    this.store.data.liveViewerMemory = next;
    this.store.save();
    return { cleared };
  }

  listVip() {
    if (!this.store) return [];
    return (this.store.data.liveViewerMemory || [])
      .filter(v => v.hostId === this.userId && (v.vip || v.giftCount > 0 || v.interactions > 5))
      .slice(0, 50);
  }

  #upsertViewer(item) {
    const list = this.store.data.liveViewerMemory || (this.store.data.liveViewerMemory = []);
    let row = list.find(v => v.hostId === this.userId && v.viewerId === item.userId && v.platform === item.platform);
    if (!row) {
      if (list.filter(v => v.hostId === this.userId).length >= this.maxViewers) return;
      row = {
        hostId: this.userId,
        viewerId: item.userId,
        platform: item.platform,
        username: item.username,
        interactions: 0,
        giftCount: 0,
        vip: false,
        lastSummary: '',
        updatedAt: item.at
      };
      list.push(row);
    }
    row.interactions += 1;
    if (item.kind === 'gift') row.giftCount += 1;
    row.username = item.username || row.username;
    row.lastSummary = item.summary;
    row.updatedAt = item.at;
    this.store.save();
  }
}
