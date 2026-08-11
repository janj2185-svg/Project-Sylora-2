import {randomUUID} from 'node:crypto';

export const CONTENT_LABELS=Object.freeze(['ai_generated','synthetic_voice','synthetic_video','edited_media','sponsored','sensitive']);

export class TrustSafety{
  constructor({reports=[],labels=[],provenance=[],securitySessions=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.reports=reports;this.labels=labels;this.provenance=provenance;this.securitySessions=securitySessions;this.persist=persist;this.now=now}
  label(actorId,targetType,targetId,label,metadata={}){if(!CONTENT_LABELS.includes(label))throw new Error('INVALID_CONTENT_LABEL');const record={id:randomUUID(),actorId,targetType,targetId,label,metadata:structuredClone(metadata),createdAt:this.now()};this.labels.push(record);this.persist();return record}
  labelsFor({targetType,targetId}={}){return this.labels.filter(x=>(!targetType||x.targetType===targetType)&&(!targetId||x.targetId===targetId)).map(x=>structuredClone(x))}
  addProvenance(record={}){const value={id:randomUUID(),ownerId:record.ownerId,targetType:record.targetType,targetId:record.targetId,origin:record.origin||'unknown',creatorId:record.creatorId||null,model:record.model||null,contentHash:record.contentHash||null,chain:Array.isArray(record.chain)?record.chain:[],createdAt:this.now()};this.provenance.push(value);this.persist();return value}
  createSecuritySession(userId,input={}){const session={id:randomUUID(),userId,device:String(input.device||'unknown').slice(0,200),ipHash:input.ipHash||null,status:'active',lastSeenAt:this.now(),createdAt:this.now()};this.securitySessions.push(session);this.persist();return session}
  revokeSecuritySession(userId,id){const session=this.securitySessions.find(x=>x.userId===userId&&x.id===id);if(!session)return false;session.status='revoked';session.revokedAt=this.now();this.persist();return true}
}
