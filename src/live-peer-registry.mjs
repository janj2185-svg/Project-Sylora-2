const PEER_TTL_MS=2*60*60*1000;

export class LivePeerRegistry {
  constructor(redis=null,namespace='live',ttlMs=PEER_TTL_MS,now=()=>Date.now(),leaseKind='peer'){this.redis=redis;this.namespace=String(namespace||'live').replace(/[^a-z0-9_-]/gi,'');this.ttlMs=Math.max(10_000,Number(ttlMs)||PEER_TTL_MS);this.now=now;this.leaseKind=String(leaseKind||'peer');this.local=new Map()}
  key(liveId,peerId){return`sylora:${this.namespace}:peer:${liveId}:${peerId}`}
  localKey(liveId,peerId){return`${liveId}:${peerId}`}
  prune(){const now=this.now();for(const [key,value] of this.local)if(value.expiresAt<=now)this.local.delete(key)}

  async claim(liveId,peerId,userId){
    if(this.redis?.configured)return await this.redis.claimLease(this.key(liveId,peerId),userId,Math.ceil(this.ttlMs/1000))===userId;
    this.prune();const key=this.localKey(liveId,peerId),existing=this.local.get(key);if(existing&&(existing.userId!==userId||existing.kind!==this.leaseKind))return false;this.local.set(key,{userId,kind:this.leaseKind,expiresAt:this.now()+this.ttlMs});return true;
  }

  async owner(liveId,peerId){
    if(this.redis?.configured)return this.redis.leaseOwner(this.key(liveId,peerId));
    this.prune();return this.local.get(this.localKey(liveId,peerId))?.userId||null;
  }

  async release(liveId,peerId,userId){
    if(this.redis?.configured)return this.redis.releaseLease(this.key(liveId,peerId),userId);
    const key=this.localKey(liveId,peerId),existing=this.local.get(key);if(existing?.userId!==userId||existing.kind!==this.leaseKind)return false;this.local.delete(key);return true;
  }

  clearLocalRoom(liveId){for(const key of this.local.keys())if(key.startsWith(`${liveId}:`))this.local.delete(key)}
}

export class LiveHostSessionRegistry {
  constructor(redis=null,ttlMs=90_000,closedMs=5_000,now=()=>Date.now(),sharedPeerRegistry=null){this.redis=redis;this.ttlMs=Math.max(10_000,Number(ttlMs)||90_000);this.closedMs=Math.max(1_000,Number(closedMs)||5_000);this.now=now;this.localPeers=sharedPeerRegistry?.local||new Map();this.localActive=new Map();this.localStreams=new Map();this.localClosed=new Map()}
  peerKey(liveId,peerId){return`sylora:live:peer:${liveId}:${peerId}`}
  activeKey(liveId){return`sylora:live-host:peer:${liveId}:active`}
  streamKey(liveId,peerId){return`sylora:live-host:stream:${liveId}:${peerId}`}
  closedKey(liveId,peerId){return`sylora:live-host:closed:${liveId}:${peerId}`}
  prune(){const now=this.now();for(const map of [this.localPeers,this.localActive,this.localStreams,this.localClosed])for(const [key,value] of map)if(value.expiresAt<=now)map.delete(key)}

  async acquireStream(liveId,peerId,userId,streamId){
    if(this.redis?.configured)return this.redis.acquireHostStream({peerKey:this.peerKey(liveId,peerId),activeKey:this.activeKey(liveId),streamKey:this.streamKey(liveId,peerId),closedKey:this.closedKey(liveId,peerId),userId,peerId,streamId,ttlSeconds:Math.ceil(this.ttlMs/1000)});
    this.prune();const peerKey=`${liveId}:${peerId}`,peer=this.localPeers.get(peerKey),active=this.localActive.get(liveId),stream=this.localStreams.get(peerKey);if(this.localClosed.has(peerKey)||peer&&(peer.userId!==userId||peer.kind!=='host')||active&&active.peerId!==peerId||stream&&stream.streamId!==streamId)return false;const expiresAt=this.now()+this.ttlMs;this.localPeers.set(peerKey,{userId,kind:'host',expiresAt});this.localActive.set(liveId,{peerId,expiresAt});this.localStreams.set(peerKey,{streamId,userId,expiresAt});return true
  }

  async renewStream(liveId,peerId,userId,streamId){
    if(this.redis?.configured)return this.redis.renewHostStream({peerKey:this.peerKey(liveId,peerId),activeKey:this.activeKey(liveId),streamKey:this.streamKey(liveId,peerId),closedKey:this.closedKey(liveId,peerId),userId,peerId,streamId,ttlSeconds:Math.ceil(this.ttlMs/1000)});
    this.prune();const peerKey=`${liveId}:${peerId}`,peer=this.localPeers.get(peerKey),active=this.localActive.get(liveId),stream=this.localStreams.get(peerKey);if(this.localClosed.has(peerKey)||peer?.userId!==userId||peer.kind!=='host'||active?.peerId!==peerId||stream?.streamId!==streamId||stream.userId!==userId)return false;const expiresAt=this.now()+this.ttlMs;peer.expiresAt=expiresAt;active.expiresAt=expiresAt;stream.expiresAt=expiresAt;return true
  }

  async releaseStream(liveId,peerId,userId,streamId){
    if(this.redis?.configured)return this.redis.releaseHostStream({peerKey:this.peerKey(liveId,peerId),activeKey:this.activeKey(liveId),streamKey:this.streamKey(liveId,peerId),userId,peerId,streamId});
    this.prune();const peerKey=`${liveId}:${peerId}`,peer=this.localPeers.get(peerKey),active=this.localActive.get(liveId),stream=this.localStreams.get(peerKey);if(peer?.userId!==userId||peer.kind!=='host'||active?.peerId!==peerId||stream?.streamId!==streamId||stream.userId!==userId)return false;this.localStreams.delete(peerKey);this.localPeers.delete(peerKey);this.localActive.delete(liveId);return true
  }

  async claim(liveId,peerId,userId){
    if(this.redis?.configured)return this.redis.claimHostSession({peerKey:this.peerKey(liveId,peerId),activeKey:this.activeKey(liveId),closedKey:this.closedKey(liveId,peerId),userId,peerId,ttlSeconds:Math.ceil(this.ttlMs/1000)});
    this.prune();const peerKey=`${liveId}:${peerId}`,peer=this.localPeers.get(peerKey),active=this.localActive.get(liveId);if(this.localClosed.has(peerKey)||peer&&(peer.userId!==userId||peer.kind!=='host')||active&&active.peerId!==peerId)return false;const expiresAt=this.now()+this.ttlMs;this.localPeers.set(peerKey,{userId,kind:'host',expiresAt});this.localActive.set(liveId,{peerId,expiresAt});return true
  }

  async owner(liveId){if(this.redis?.configured)return this.redis.leaseOwner(this.activeKey(liveId));this.prune();return this.localActive.get(liveId)?.peerId||null}

  async release(liveId,peerId,userId){
    if(this.redis?.configured)return this.redis.releaseHostSession({peerKey:this.peerKey(liveId,peerId),activeKey:this.activeKey(liveId),streamKey:this.streamKey(liveId,peerId),closedKey:this.closedKey(liveId,peerId),userId,peerId,closedSeconds:Math.ceil(this.closedMs/1000)});
    this.prune();const peerKey=`${liveId}:${peerId}`,peer=this.localPeers.get(peerKey),active=this.localActive.get(liveId);if(peer?.userId!==userId||peer.kind!=='host'||active?.peerId!==peerId)return false;this.localClosed.set(peerKey,{expiresAt:this.now()+this.closedMs});this.localStreams.delete(peerKey);this.localPeers.delete(peerKey);this.localActive.delete(liveId);return true
  }

  clearLocalRoom(liveId){for(const map of [this.localPeers,this.localStreams,this.localClosed])for(const key of map.keys())if(key.startsWith(`${liveId}:`))map.delete(key);this.localActive.delete(liveId)}
}
