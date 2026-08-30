import { createClient } from 'redis';

const DEFAULT_COMMAND_TIMEOUT_MS = 2_500;

export class RedisService {
  constructor(url = '', { commandTimeoutMs = DEFAULT_COMMAND_TIMEOUT_MS } = {}) {
    this.url = String(url || '');
    const parsedCommandTimeout = Number(commandTimeoutMs);
    this.commandTimeoutMs = Number.isFinite(parsedCommandTimeout)
      ? Math.max(25, Math.min(30_000, Math.trunc(parsedCommandTimeout)))
      : DEFAULT_COMMAND_TIMEOUT_MS;
    this.client = this.url ? createClient({ url: this.url, socket: { connectTimeout: 2_000, reconnectStrategy: retries => retries > 2 ? false : Math.min(250 * retries, 1_000) } }) : null;
    this.connecting = null;
    this.subscribers = new Set();
    this.client?.on('error', () => {});
  }

  get configured() { return !!this.client; }

  async connect() {
    if (!this.client || this.client.isReady) return;
    if (!this.connecting) this.connecting = this.client.connect().finally(() => { this.connecting = null; });
    let timer;try{await Promise.race([this.connecting,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('REDIS_CONNECT_TIMEOUT')),2_500)})])}finally{if(timer)clearTimeout(timer)}
  }

  async command(operation, run) {
    const controller = new AbortController();
    const commandClient = typeof this.client?.withCommandOptions === 'function'
      ? this.client.withCommandOptions({ abortSignal: controller.signal })
      : this.client;
    const pending = Promise.resolve().then(() => run(commandClient));
    let timer;
    try {
      return await Promise.race([
        pending,
        new Promise((_, reject) => {
          timer = setTimeout(() => {
            const error = new Error(`REDIS_COMMAND_TIMEOUT:${operation}`);
            error.code = 'REDIS_COMMAND_TIMEOUT';
            error.operation = operation;
            reject(error);
            controller.abort(error);
          }, this.commandTimeoutMs);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async ping() {
    if (!this.client) return { configured: false, ok: true };
    const started = Date.now();
    try { await this.connect(); await this.command('ping', client => client.ping()); return { configured: true, ok: true, latencyMs: Date.now() - started }; }
    catch { return { configured: true, ok: false, latencyMs: Date.now() - started }; }
  }

  async rateCount(key, windowMs) {
    await this.connect();
    const script = "local n=redis.call('INCR',KEYS[1]); if n==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]); end; return n";
    return Number(await this.command('rateCount', client => client.eval(script, { keys: [key], arguments: [String(windowMs)] })));
  }

  async publish(channel, payload) {
    await this.connect();
    return this.command('publish', client => client.publish(String(channel), String(payload)));
  }

  async subscribe(channel, handler, onStatus = null) {
    if (!this.client) return null;
    const subscriber = this.client.duplicate({socket:{connectTimeout:2_000,reconnectStrategy:retries=>Math.min(250*Math.max(1,retries),5_000)}});
    const status = ready => { try { onStatus?.(!!ready); } catch {} };
    subscriber.on('error', () => status(false));
    subscriber.on('reconnecting', () => status(false));
    subscriber.on('end', () => status(false));
    subscriber.on('ready', () => status(true));
    let timer;const opening=(async()=>{await subscriber.connect();await subscriber.subscribe(String(channel),message=>handler(message))})();
    try{await Promise.race([opening,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('REDIS_SUBSCRIBE_TIMEOUT')),2_500)})])}catch(error){opening.catch(()=>{});try{subscriber.destroy()}catch{}throw error}finally{if(timer)clearTimeout(timer)}
    this.subscribers.add(subscriber);
    status(subscriber.isReady);
    const stop = async () => {
      if (!this.subscribers.delete(subscriber)) return;
      if(!subscriber.isReady){try{subscriber.destroy()}catch{}return}
      let timer;const closing=(async()=>{try{await subscriber.unsubscribe(String(channel))}catch{}try{if(subscriber.isOpen)await subscriber.quit()}catch{}})();try{await Promise.race([closing,new Promise(resolve=>{timer=setTimeout(resolve,2_500)})])}finally{if(timer)clearTimeout(timer);if(subscriber.isOpen)try{subscriber.destroy()}catch{}}
    };
    stop.isReady = () => !!subscriber.isReady;
    return stop;
  }

  async claimLease(key, owner, ttlSeconds = 7200) {
    await this.connect();
    const script="local v=redis.call('GET',KEYS[1]); if not v then redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[2]); return ARGV[1]; end; if v==ARGV[1] then redis.call('EXPIRE',KEYS[1],ARGV[2]); end; return v";
    return this.command('claimLease', client => client.eval(script,{keys:[String(key)],arguments:[String(owner),String(Math.max(1,Math.trunc(ttlSeconds)))]}));
  }

  async leaseOwner(key) { await this.connect(); return this.command('leaseOwner', client => client.get(String(key))); }

  async releaseLease(key, owner) {
    await this.connect();
    const script="if redis.call('GET',KEYS[1])==ARGV[1] then return redis.call('DEL',KEYS[1]); end; return 0";
    return Number(await this.command('releaseLease', client => client.eval(script,{keys:[String(key)],arguments:[String(owner)]})))>0;
  }

  async claimHostSession({ peerKey, activeKey, closedKey, userId, peerId, ttlSeconds = 90 }) {
    await this.connect();
    const script="if redis.call('EXISTS',KEYS[3])==1 then return 0 end; local peer=redis.call('GET',KEYS[1]); local active=redis.call('GET',KEYS[2]); if peer and peer~=ARGV[1] then return 0 end; if active and active~=ARGV[2] then return 0 end; redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[3]); redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[3]); return 1";
    return Number(await this.command('claimHostSession', client => client.eval(script,{keys:[String(peerKey),String(activeKey),String(closedKey)],arguments:[String(userId),String(peerId),String(Math.max(1,Math.trunc(ttlSeconds)))]})))===1;
  }

  async acquireHostStream({ peerKey, activeKey, streamKey, closedKey, userId, peerId, streamId, ttlSeconds = 90 }) {
    await this.connect();
    const script="if redis.call('EXISTS',KEYS[4])==1 then return 0 end; local peer=redis.call('GET',KEYS[1]); local active=redis.call('GET',KEYS[2]); local stream=redis.call('GET',KEYS[3]); if peer and peer~=ARGV[1] then return 0 end; if active and active~=ARGV[2] then return 0 end; if stream and stream~=ARGV[3] then return 0 end; redis.call('SET',KEYS[1],ARGV[1],'EX',ARGV[4]); redis.call('SET',KEYS[2],ARGV[2],'EX',ARGV[4]); redis.call('SET',KEYS[3],ARGV[3],'EX',ARGV[4]); return 1";
    return Number(await this.command('acquireHostStream', client => client.eval(script,{keys:[String(peerKey),String(activeKey),String(streamKey),String(closedKey)],arguments:[String(userId),String(peerId),String(streamId),String(Math.max(1,Math.trunc(ttlSeconds)))]})))===1;
  }

  async renewHostStream({ peerKey, activeKey, streamKey, closedKey, userId, peerId, streamId, ttlSeconds = 90 }) {
    await this.connect();
    const script="if redis.call('EXISTS',KEYS[4])==1 then return 0 end; if redis.call('GET',KEYS[1])~=ARGV[1] or redis.call('GET',KEYS[2])~=ARGV[2] or redis.call('GET',KEYS[3])~=ARGV[3] then return 0 end; redis.call('EXPIRE',KEYS[1],ARGV[4]); redis.call('EXPIRE',KEYS[2],ARGV[4]); redis.call('EXPIRE',KEYS[3],ARGV[4]); return 1";
    return Number(await this.command('renewHostStream', client => client.eval(script,{keys:[String(peerKey),String(activeKey),String(streamKey),String(closedKey)],arguments:[String(userId),String(peerId),String(streamId),String(Math.max(1,Math.trunc(ttlSeconds)))]})))===1;
  }

  async releaseHostStream({ peerKey, activeKey, streamKey, userId, peerId, streamId }) {
    await this.connect();
    const script="if redis.call('GET',KEYS[1])~=ARGV[1] or redis.call('GET',KEYS[2])~=ARGV[2] or redis.call('GET',KEYS[3])~=ARGV[3] then return 0 end; redis.call('DEL',KEYS[3]); redis.call('DEL',KEYS[1]); redis.call('DEL',KEYS[2]); return 1";
    return Number(await this.command('releaseHostStream', client => client.eval(script,{keys:[String(peerKey),String(activeKey),String(streamKey)],arguments:[String(userId),String(peerId),String(streamId)]})))===1;
  }

  async releaseHostSession({ peerKey, activeKey, streamKey, closedKey, userId, peerId, closedSeconds = 5 }) {
    await this.connect();
    const script="local peer=redis.call('GET',KEYS[1]); local active=redis.call('GET',KEYS[2]); if peer~=ARGV[1] or active~=ARGV[2] then return 0 end; redis.call('SET',KEYS[4],'1','EX',ARGV[3]); redis.call('DEL',KEYS[3]); redis.call('DEL',KEYS[1]); redis.call('DEL',KEYS[2]); return 1";
    return Number(await this.command('releaseHostSession', client => client.eval(script,{keys:[String(peerKey),String(activeKey),String(streamKey),String(closedKey)],arguments:[String(userId),String(peerId),String(Math.max(1,Math.trunc(closedSeconds)))]})))===1;
  }

  async touchViewer(liveId, viewerId, ttlMs = 45_000) {
    await this.connect();const now=Date.now(),expires=now+Math.max(10_000,Math.trunc(ttlMs)),key=`sylora:live:viewers:${liveId}`;
    const script="redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]); redis.call('ZADD',KEYS[1],ARGV[2],ARGV[3]); redis.call('PEXPIRE',KEYS[1],ARGV[4]); return redis.call('ZCARD',KEYS[1])";
    return Number(await this.command('touchViewer', client => client.eval(script,{keys:[key],arguments:[String(now),String(expires),String(viewerId),String(Math.max(ttlMs*2,90_000))]})));
  }

  async removeViewer(liveId, viewerId) {
    await this.connect();const now=Date.now(),key=`sylora:live:viewers:${liveId}`;
    const script="redis.call('ZREM',KEYS[1],ARGV[1]); redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[2]); return redis.call('ZCARD',KEYS[1])";
    return Number(await this.command('removeViewer', client => client.eval(script,{keys:[key],arguments:[String(viewerId),String(now)]})));
  }

  async viewerCount(liveId) {
    await this.connect();const now=Date.now(),key=`sylora:live:viewers:${liveId}`;
    const script="redis.call('ZREMRANGEBYSCORE',KEYS[1],'-inf',ARGV[1]); return redis.call('ZCARD',KEYS[1])";
    return Number(await this.command('viewerCount', client => client.eval(script,{keys:[key],arguments:[String(now)]})));
  }

  async close() { for (const subscriber of [...this.subscribers]) { this.subscribers.delete(subscriber); try { if (subscriber.isOpen) await subscriber.quit(); } catch {} } if (this.client?.isOpen) await this.client.quit(); }
}
