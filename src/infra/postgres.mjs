import pg from 'pg';

const { Pool } = pg;

export class PostgresService {
  constructor(url = '') {
    this.url = String(url || '');
    this.pool = this.url ? new Pool({ connectionString: this.url, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 2_000, application_name: 'sylora-core' }) : null;
    this.pool?.on('error', () => {});
  }

  get configured() { return !!this.pool; }

  async ping() {
    if (!this.pool) return { configured: false, ok: true };
    const started = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { configured: true, ok: true, latencyMs: Date.now() - started };
    } catch {
      return { configured: true, ok: false, latencyMs: Date.now() - started };
    }
  }

  async close() { if (this.pool) await this.pool.end(); }
}
