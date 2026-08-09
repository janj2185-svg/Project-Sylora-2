import { createClient } from 'redis';

export class RedisService {
  constructor(url = '') {
    this.url = String(url || '');
    this.client = this.url ? createClient({ url: this.url, socket: { connectTimeout: 2_000, reconnectStrategy: retries => retries > 2 ? false : Math.min(250 * retries, 1_000) } }) : null;
    this.connecting = null;
    this.subscribers = new Set();
    this.client?.on('error', () => {});
  }

  get configured() { return !!this.client; }

  async connect() {
    if (!this.client || this.client.isReady) return;
    if (!this.connecting) this.connecting = this.client.connect().finally(() => { this.connecting = null; });
    await this.connecting;
  }

  async ping() {
    if (!this.client) return { configured: false, ok: true };
    const started = Date.now();
    try { await this.connect(); await this.client.ping(); return { configured: true, ok: true, latencyMs: Date.now() - started }; }
    catch { return { configured: true, ok: false, latencyMs: Date.now() - started }; }
  }

  async rateCount(key, windowMs) {
    await this.connect();
    const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return n";
    return Number(await this.client.eval(script, { keys: [key], arguments: [String(windowMs)] }));
  }

  async publish(channel, payload) {
    await this.connect();
    return this.client.publish(String(channel), String(payload));
  }

  async subscribe(channel, handler) {
    if (!this.client) return null;
    const subscriber = this.client.duplicate();
    subscriber.on('error', () => {});
    await subscriber.connect();
    await subscriber.subscribe(String(channel), message => handler(message));
    this.subscribers.add(subscriber);
    return async () => {
      if (!this.subscribers.delete(subscriber)) return;
      try { await subscriber.unsubscribe(String(channel)); } catch {}
      try { if (subscriber.isOpen) await subscriber.quit(); } catch {}
    };
  }

  async claimLease(key, owner, ttlSeconds = 7200) {
    await this.connect();
    const script="local v=redis.call('GET',KEYS[1]); if not v then redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); return ARGV[1]; end; if v==ARGV[1] then redis.call('EXPIRE',KEYS[1],ARGV[2]); end; return v";
    return this.client.eval(script,{keys:[String(key)],arguments:[String(owner),String(Math.max(1,Math.trunc(ttlSeconds)))]});
  }

  async leaseOwner(key) { await this.connect(); return this.client.get(String(key)); }

  async releaseLease(key, owner) {
    await this.connect();
    const script="if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]); end; return 0";
    return Number(await this.client.eval(script,{keys:[String(key)],arguments:[String(owner)]}))>0;
  }

  async touchViewer(liveId, viewerId, ttlMs = 45_000) {
    await this.connect();const now=Date.now(),expires=now+Math.max(10_000,Math.trunc(ttlMs)),key=`sylora:live:viewers:${liveId}`;
    const script="redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]); redis.call('ZADD',KEYS[1],ARGV[2],ARGV[3]); redis.call('PEXPIRE',KEYS[1],ARGV[4]); return redis.call('ZCARD',KEYS[1])";
    return Number(await this.client.eval(script,{keys:[key],arguments:[String(now),String(expires),String(viewerId),String(Math.max(ttlMs*2,90_000))]}));
  }

  async removeViewer(liveId, viewerId) {
    await this.connect();const now=Date.now(),key=`sylora:live:viewers:${liveId}`;
    const script="redis.call('ZREM',KEYS[1],ARGV[1]); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[2]); return redis.call('ZCARD',KEYS[1])";
    return Number(await this.client.eval(script,{keys:[key],arguments:[String(viewerId),String(now)]}));
  }

  async viewerCount(liveId) {
    await this.connect();const now=Date.now(),key=`sylora:live:viewers:${liveId}`;
    const script="redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]); return redis.call('ZCARD',KEYS[1])";
    return Number(await this.client.eval(script,{keys:[key],arguments:[String(now)]}));
  }

  async close() { for (const subscriber of [...this.subscribers]) { this.subscribers.delete(subscriber); try { if (subscriber.isOpen) await subscriber.quit(); } catch {} } if (this.client?.isOpen) await this.client.quit(); }
}
