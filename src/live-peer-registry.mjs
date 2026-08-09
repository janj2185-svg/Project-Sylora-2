const PEER_TTL_MS=2*60*60*1000;

export class LivePeerRegistry {
  constructor(redis=null,namespace='live'){this.redis=redis;this.namespace=String(namespace||'live').replace(/[^a-z0-9_-]/gi,'');this.local=new Map()}
  key(liveId,peerId){return`sylora:${this.namespace}:peer:${liveId}:${peerId}`}
  localKey(liveId,peerId){return`${liveId}:${peerId}`}
  prune(){const now=Date.now();for(const [key,value] of this.local)if(value.expiresAt<=now)this.local.delete(key)}

  async claim(liveId,peerId,userId){
    if(this.redis?.configured){try{return await this.redis.claimLease(this.key(liveId,peerId),userId,PEER_TTL_MS/1000)===userId}catch{}}
    this.prune();const key=this.localKey(liveId,peerId),existing=this.local.get(key);if(existing&&existing.userId!==userId)return false;this.local.set(key,{userId,expiresAt:Date.now()+PEER_TTL_MS});return true;
  }

  async owner(liveId,peerId){
    if(this.redis?.configured){try{return await this.redis.leaseOwner(this.key(liveId,peerId))}catch{}}
    this.prune();return this.local.get(this.localKey(liveId,peerId))?.userId||null;
  }

  async release(liveId,peerId,userId){
    if(this.redis?.configured){try{return await this.redis.releaseLease(this.key(liveId,peerId),userId)}catch{}}
    const key=this.localKey(liveId,peerId),existing=this.local.get(key);if(existing?.userId!==userId)return false;this.local.delete(key);return true;
  }

  clearLocalRoom(liveId){for(const key of this.local.keys())if(key.startsWith(`${liveId}:`))this.local.delete(key)}
}
