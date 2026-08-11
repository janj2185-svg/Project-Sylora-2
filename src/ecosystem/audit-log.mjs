import {randomUUID} from 'node:crypto';

export class AuditLog{
  constructor({records=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.records=records;this.persist=persist;this.now=now}
  append(event={}){
    const record=Object.freeze({id:event.id||randomUUID(),userId:event.userId||null,orgId:event.orgId||null,agentId:event.agentId||null,actorId:event.actorId||null,action:String(event.action||'unknown'),targetId:event.targetId||null,outcome:event.outcome||'success',metadata:structuredClone(event.metadata||{}),createdAt:event.createdAt||this.now()});
    this.records.push(record);this.persist();return record;
  }
  filter({userId,orgId,agentId,action,limit=200}={}){return this.records.filter(x=>(!userId||x.userId===userId)&&(!orgId||x.orgId===orgId)&&(!agentId||x.agentId===agentId)&&(!action||x.action===action)).slice(-limit).map(x=>structuredClone(x))}
  export(filter={}){return {version:1,exportedAt:this.now(),events:this.filter({...filter,limit:Number.MAX_SAFE_INTEGER})}}
}
