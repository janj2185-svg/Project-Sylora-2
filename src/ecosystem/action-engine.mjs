import {randomUUID} from 'node:crypto';
import {ACTION_LEVELS,can} from './permissions.mjs';

export const ACTION_TYPES=Object.freeze({
  search:{level:'READ'},analyze:{level:'PROPOSE'},schedule:{level:'REQUEST_CONFIRMATION',critical:true},send:{level:'REQUEST_CONFIRMATION',critical:true},prepare:{level:'PREPARE'},translate:{level:'PROPOSE'},moderate:{level:'REQUEST_CONFIRMATION',critical:true},generate:{level:'PROPOSE'},update:{level:'REQUEST_CONFIRMATION',critical:true},notify:{level:'REQUEST_CONFIRMATION'},control_live:{level:'REQUEST_CONFIRMATION',critical:true},publish_post:{level:'REQUEST_CONFIRMATION',critical:true},remember:{level:'REQUEST_CONFIRMATION',critical:true}
});

export class ActionEngine{
  constructor({records=[],auditLogger=null,persist=()=>{},registry=ACTION_TYPES,now=()=>new Date().toISOString()}={}){this.records=records;this.auditLogger=auditLogger;this.persist=persist;this.registry={...registry};this.now=now}
  register(type,definition){if(!type||!definition?.level)throw new Error('INVALID_ACTION_DEFINITION');this.registry[type]={...definition}}
  create({actor,agent=null,user,input={},type,permissions={},context={}}){
    const definition=this.registry[type];if(!definition)throw new Error('ACTION_TYPE_NOT_REGISTERED');
    const level=ACTION_LEVELS[definition.level],actorRecord=typeof actor==='object'?actor:{id:actor},resource={ownerId:user?.id||user||actorRecord?.id,scope:definition.scope||'tools',privacy:'private'};
    if(!can(actorRecord,level,resource,{...context,permissions,critical:false}))throw new Error('ACTION_PERMISSION_DENIED');
    const requiresConfirmation=definition.critical||level===ACTION_LEVELS.REQUEST_CONFIRMATION;
    const action={id:randomUUID(),type,actor:actor?.id||actor,agent:agent?.id||agent||null,user:user?.id||user||null,timestamp:this.now(),input:structuredClone(input),output:null,permission:{scope:resource.scope,level:definition.level},confirmation:{required:requiresConfirmation,confirmed:false,confirmedAt:null},status:requiresConfirmation?'pending_confirmation':'proposed',result:null,error:null,audit:[]};
    this.records.push(action);this.log(action,'created');this.persist();return action;
  }
  async execute(id,{actor,confirm=false,executor}={}){
    const action=this.records.find(x=>x.id===id);if(!action)throw new Error('ACTION_NOT_FOUND');
    if(['financial','legal'].includes(action.input?.domain))throw new Error('HUMAN_EXECUTION_REQUIRED');
    if(action.confirmation.required&&!confirm&&!action.confirmation.confirmed)throw new Error('CONFIRMATION_REQUIRED');
    if(confirm){action.confirmation.confirmed=true;action.confirmation.confirmedAt=this.now()}
    if(typeof executor!=='function'){action.status='prepared';this.log(action,'prepared');this.persist();return action}
    try{action.result=await executor(action);action.output=action.result;action.status='completed';this.log(action,'completed',actor)}
    catch(error){action.error=error.message;action.status='failed';this.log(action,'failed',actor);throw error}finally{this.persist()}
    return action;
  }
  log(action,event,actor){const entry={event,actor:actor?.id||actor||action.actor,at:this.now()};action.audit.push(entry);this.auditLogger?.append?.({userId:action.user,agentId:action.agent,action:`action.${event}`,targetId:action.id,metadata:{type:action.type}})}
}
