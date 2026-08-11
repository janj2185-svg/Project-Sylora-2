import {randomUUID} from 'node:crypto';

export class MemoryStore{
  constructor({records=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.records=records;this.persist=persist;this.now=now}
  list(userId,{kind,limit=100}={}){return this.records.filter(x=>x.userId===userId&&(!kind||x.kind===kind)).slice(-limit)}
  add(userId,input={}){
    const record={id:input.id||randomUUID(),userId,label:String(input.label||'').trim(),value:String(input.value||'').trim(),kind:input.kind==='short'?'short':'long',tags:Array.isArray(input.tags)?input.tags.slice(0,20):[],contextSources:Array.isArray(input.contextSources)?input.contextSources.slice(0,20):[],confidence:Math.max(0,Math.min(1,Number(input.confidence??1))),source:input.source||'user',sessionId:input.sessionId||null,createdAt:input.createdAt||this.now()};
    if(!record.label||!record.value)throw new Error('MEMORY_REQUIRED');this.records.push(record);this.persist();return record;
  }
  export(userId){return {version:1,exportedAt:this.now(),memories:this.list(userId,{limit:Number.MAX_SAFE_INTEGER}).map(x=>structuredClone(x))}}
  delete(userId,id){const index=this.records.findIndex(x=>x.userId===userId&&x.id===id);if(index<0)return false;this.records.splice(index,1);this.persist();return true}
  deleteAll(userId,{kind}={}){const before=this.records.length;for(let i=this.records.length-1;i>=0;i--)if(this.records[i].userId===userId&&(!kind||this.records[i].kind===kind))this.records.splice(i,1);const deleted=before-this.records.length;if(deleted)this.persist();return deleted}
  clearSession(userId,sessionId){return this.deleteMatching(userId,x=>x.kind==='short'&&x.sessionId===sessionId)}
  deleteMatching(userId,predicate){let deleted=0;for(let i=this.records.length-1;i>=0;i--)if(this.records[i].userId===userId&&predicate(this.records[i])){this.records.splice(i,1);deleted++}if(deleted)this.persist();return deleted}
}
