import {createHash,randomBytes,randomUUID} from 'node:crypto';

export const DEVELOPER_SCOPES=Object.freeze(['profile:read','memory:read','projects:read','live:read','messages:read','business:read','calendar:read','agents:manage','tools:invoke']);
const hash=value=>createHash('sha256').update(value).digest('hex');

export class DeveloperPlatform{
  constructor({apps=[],apiKeys=[],webhooks=[],deliveries=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.apps=apps;this.apiKeys=apiKeys;this.webhooks=webhooks;this.deliveries=deliveries;this.persist=persist;this.now=now}
  registerApp(developerId,input={}){
    const scopes=[...new Set(input.scopes||[])];if(scopes.some(x=>!DEVELOPER_SCOPES.includes(x)))throw new Error('INVALID_DEVELOPER_SCOPE');
    const app={id:randomUUID(),developerId,name:String(input.name||'').trim().slice(0,100),scopes,sandbox:input.sandbox!==false,redirectUris:Array.isArray(input.redirectUris)?input.redirectUris.slice(0,10):[],rateLimitPerMinute:Math.max(1,Math.min(1000,Number(input.rateLimitPerMinute)||60)),createdAt:this.now()};if(!app.name)throw new Error('APP_NAME_REQUIRED');this.apps.push(app);this.persist();return structuredClone(app);
  }
  listApps(developerId){return this.apps.filter(x=>x.developerId===developerId).map(x=>structuredClone(x))}
  createApiKey(developerId,appId,name='default'){
    const app=this.apps.find(x=>x.id===appId&&x.developerId===developerId);if(!app)throw new Error('DEVELOPER_APP_NOT_FOUND');
    const secret=`syl_${app.sandbox?'test':'live'}_${randomBytes(32).toString('base64url')}`,record={id:randomUUID(),appId,name:String(name).slice(0,80),keyHash:hash(secret),prefix:secret.slice(0,16),lastUsedAt:null,revokedAt:null,createdAt:this.now()};this.apiKeys.push(record);this.persist();return {key:{...record,keyHash:undefined},secret};
  }
  verifyApiKey(secret){const digest=hash(String(secret||''));return this.apiKeys.find(x=>x.keyHash===digest&&!x.revokedAt)||null}
  registerWebhook(developerId,appId,input={}){
    const app=this.apps.find(x=>x.id===appId&&x.developerId===developerId);if(!app)throw new Error('DEVELOPER_APP_NOT_FOUND');let endpoint;try{endpoint=new URL(input.url)}catch{throw new Error('INVALID_WEBHOOK_URL')}if(endpoint.protocol!=='https:'&&!app.sandbox)throw new Error('WEBHOOK_HTTPS_REQUIRED');
    const webhook={id:randomUUID(),appId,url:endpoint.toString(),events:[...new Set(input.events||[])].slice(0,50),status:'active',createdAt:this.now()};this.webhooks.push(webhook);this.persist();return structuredClone(webhook);
  }
  queueWebhook(event,payload){const queued=[];for(const hook of this.webhooks.filter(x=>x.status==='active'&&x.events.includes(event))){const delivery={id:randomUUID(),webhookId:hook.id,event,payload:structuredClone(payload),status:'queued',attempts:0,createdAt:this.now()};this.deliveries.push(delivery);queued.push(delivery)}if(queued.length)this.persist();return queued}
  rateLimit(appId,bucket,now=Date.now()){const app=this.apps.find(x=>x.id===appId);if(!app)return false;const window=Math.floor(now/60000),key=`${appId}:${window}`,count=(bucket.get(key)||0)+1;bucket.set(key,count);return count<=app.rateLimitPerMinute}
}
