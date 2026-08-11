export class SyloraClient {
  constructor({ baseUrl = '', token = '', apiKey = '' } = {}) {
    this.baseUrl = String(baseUrl || '').replace(/\/$/, '');
    this.token = token;
    this.apiKey = apiKey;
  }

  async request(path, { method = 'GET', body } = {}) {
    const headers = { accept: 'application/json' };
    if (this.token) headers.authorization = `Bearer ${this.token}`;
    if (this.apiKey) headers['x-sylora-key'] = this.apiKey;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP_${res.status}`);
    return data;
  }

  ecosystemStatus() { return this.request('/api/ecosystem/status'); }
  identity() { return this.request('/api/ecosystem/identity/me'); }
  personalAi() { return this.request('/api/ecosystem/personal-ai'); }
  agents(q = '') { return this.request(`/api/ecosystem/agents?q=${encodeURIComponent(q)}`); }
  search(q) { return this.request(`/api/ecosystem/search?q=${encodeURIComponent(q)}`); }
  aiSearch(query) { return this.request('/api/ecosystem/search/ai', { method: 'POST', body: { query } }); }
  translate(text, target = 'en') { return this.request('/api/ecosystem/translate', { method: 'POST', body: { text, target } }); }
}
