/** Minimal SYLORA JS/TS-ready client for Developer Platform sandbox keys. */
export class SyloraClient {
  constructor({ baseUrl = 'http://localhost:8787', apiKey } = {}) {
    this.baseUrl = String(baseUrl).replace(/\/$/, '');
    this.apiKey = apiKey;
  }

  async request(path, { method = 'GET', body } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (this.apiKey) headers.authorization = `Bearer ${this.apiKey}`;
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body == null ? undefined : JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error || 'SYLORA_API_ERROR'), { status: res.status, data });
    return data;
  }

  get identity() {
    return {
      me: () => this.request('/api/v1/identity/me')
    };
  }

  get agents() {
    return {
      list: () => this.request('/api/agents')
    };
  }

  get status() {
    return {
      ecosystem: () => this.request('/api/ecosystem/status')
    };
  }
}
