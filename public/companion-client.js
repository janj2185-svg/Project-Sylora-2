export function normalizeCompanionUrl(value) {
  const url=new URL(String(value||'http://127.0.0.1:43179'));
  if(url.protocol!=='http:')throw new Error('COMPANION_URL_PROTOCOL');
  if(!new Set(['127.0.0.1','localhost','[::1]','::1']).has(url.hostname))throw new Error('COMPANION_LOCALHOST_ONLY');
  url.pathname='/';url.search='';url.hash='';
  return url.toString().replace(/\/$/,'');
}

export class SyloraCompanionClient {
  constructor({url='http://127.0.0.1:43179',token='',fetchImpl=globalThis.fetch}={}) {
    this.url=normalizeCompanionUrl(url);
    this.token=String(token||'');
    this.fetch=fetchImpl;
  }

  async request(path,{method='GET',body}={}) {
    if(!this.fetch)throw new Error('FETCH_UNAVAILABLE');
    const headers={accept:'application/json'};
    if(this.token)headers.authorization=`Bearer ${this.token}`;
    if(body!==undefined)headers['content-type']='application/json';
    const response=await this.fetch(`${this.url}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body)});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||`COMPANION_HTTP_${response.status}`);
    return data;
  }

  health(){return this.request('/v1/health')}
  connectObs({url,password}){return this.request('/v1/obs/connect',{method:'POST',body:{url,password}})}
  obsAction(action,sceneName){return this.request('/v1/obs/action',{method:'POST',body:{action,sceneName}})}
  disconnectObs(){return this.request('/v1/obs/disconnect',{method:'POST',body:{}})}
  connectTikTok(url='ws://127.0.0.1:21213'){return this.request('/v1/tiktok/connect',{method:'POST',body:{url}})}
  disconnectTikTok(){return this.request('/v1/tiktok/disconnect',{method:'POST',body:{}})}
  tiktokEvents(after=0,limit=100){return this.request(`/v1/tiktok/events?after=${encodeURIComponent(after)}&limit=${encodeURIComponent(limit)}`)}
  simulateTikTok(event){return this.request('/v1/tiktok/simulate',{method:'POST',body:event})}
}
