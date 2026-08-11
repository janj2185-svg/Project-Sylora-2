import {randomUUID} from 'node:crypto';
import {ACTION_LEVELS} from '../permissions.mjs';

/** AI-to-AI economy foundation. Dangerous domains never auto-execute. */
export const A2A_ACTION_LEVELS=Object.freeze(['READ','PROPOSE','PREPARE','REQUEST_CONFIRMATION','EXECUTE_ALLOWED']);
const CRITICAL=new Set(['financial','legal','booking','contract','payment']);

export class AiToAiBroker{
  constructor({negotiations=[],auditLogger=null,persist=()=>{},now=()=>new Date().toISOString()}={}){
    this.negotiations=negotiations;this.auditLogger=auditLogger;this.persist=persist;this.now=now;
  }

  start({fromAgentId,toAgentId,userId,intent,domain='general',level='PROPOSE',payload={}}={}){
    if(!fromAgentId||!toAgentId||!userId||!intent)throw new Error('A2A_REQUIRED_FIELDS');
    const safeLevel=A2A_ACTION_LEVELS.includes(level)?level:'PROPOSE';
    const negotiation={
      id:randomUUID(),fromAgentId,toAgentId,userId,intent:String(intent).slice(0,240),domain,level:safeLevel,
      payload:structuredClone(payload),status:CRITICAL.has(domain)||safeLevel!=='EXECUTE_ALLOWED'?'awaiting_user_confirmation':'open',
      messages:[],createdAt:this.now(),updatedAt:this.now()
    };
    this.negotiations.push(negotiation);this.persist();
    this.auditLogger?.append?.({userId,agentId:fromAgentId,action:'a2a.start',targetId:negotiation.id,metadata:{toAgentId,domain,level:safeLevel}});
    return structuredClone(negotiation);
  }

  message(id,userId,{fromAgentId,text,level='PROPOSE'}={}){
    const n=this.negotiations.find(x=>x.id===id&&x.userId===userId);if(!n)throw new Error('A2A_NOT_FOUND');
    n.messages.push({id:randomUUID(),fromAgentId,text:String(text||'').slice(0,2000),level,at:this.now()});
    n.updatedAt=this.now();if(CRITICAL.has(n.domain))n.status='awaiting_user_confirmation';
    this.persist();return structuredClone(n);
  }

  confirm(id,userId){
    const n=this.negotiations.find(x=>x.id===id&&x.userId===userId);if(!n)throw new Error('A2A_NOT_FOUND');
    if(CRITICAL.has(n.domain)&&n.level==='EXECUTE_ALLOWED'){
      // Still refuse autonomous execution of critical domains.
      n.status='confirmed_prepare_only';n.level='PREPARE';
    }else if(n.level===ACTION_LEVELS.EXECUTE_ALLOWED||n.level==='EXECUTE_ALLOWED'){
      n.status='user_confirmed';
    }else n.status='user_confirmed_non_executing';
    n.updatedAt=this.now();this.persist();
    this.auditLogger?.append?.({userId,agentId:n.fromAgentId,action:'a2a.confirm',targetId:n.id,metadata:{status:n.status}});
    return structuredClone(n);
  }

  list(userId){return this.negotiations.filter(x=>x.userId===userId).map(x=>structuredClone(x))}
}
