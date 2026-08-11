export const SCOPES=Object.freeze(['profile','memory','projects','live','messages','business','calendar','agents','tools']);
export const PRIVACY_LEVELS=Object.freeze(['public','followers','connections','business','private','ai_only']);
export const ACTION_LEVELS=Object.freeze({READ:0,PROPOSE:1,PREPARE:2,REQUEST_CONFIRMATION:3,EXECUTE_ALLOWED:4});

const validLevel=value=>typeof value==='number'?Math.max(0,Math.min(4,value)):ACTION_LEVELS[value]??ACTION_LEVELS.READ;
const relationshipAllowed=(privacy,context={})=>privacy==='public'||context.isOwner||context.isAdmin||(privacy==='followers'&&context.isFollower)||(privacy==='connections'&&context.isConnection)||(privacy==='business'&&context.isBusinessMember)||(privacy==='ai_only'&&context.isPersonalAi);

export function defaultPersonalAiPermissions(){
  return {version:1,scopes:Object.fromEntries(SCOPES.map(scope=>[scope,{enabled:true,privacy:scope==='profile'?'private':'ai_only',actionLevel:['profile','memory','agents','tools'].includes(scope)?ACTION_LEVELS.REQUEST_CONFIRMATION:ACTION_LEVELS.PROPOSE}]))};
}

export function mergePermissions(base=defaultPersonalAiPermissions(),overrides={}){
  const out=structuredClone(base),incoming=overrides?.scopes||overrides;
  for(const scope of SCOPES){
    const patch=incoming?.[scope];if(!patch||typeof patch!=='object')continue;
    out.scopes[scope]={...out.scopes[scope],...patch};
    if(!PRIVACY_LEVELS.includes(out.scopes[scope].privacy))out.scopes[scope].privacy=base.scopes?.[scope]?.privacy||'private';
    out.scopes[scope].actionLevel=validLevel(out.scopes[scope].actionLevel);
    out.scopes[scope].enabled=out.scopes[scope].enabled!==false;
  }
  return out;
}

export function can(actor,action,resource={},context={}){
  if(actor?.role==='admin'||context.isAdmin)return true;
  const ownerId=resource.ownerId||resource.userId,actorId=actor?.id||actor?.userId;
  const isOwner=!!actorId&&actorId===ownerId,scope=resource.scope||context.scope||'profile';
  const permissions=mergePermissions(defaultPersonalAiPermissions(),context.permissions||actor?.permissions||{});
  const grant=permissions.scopes[scope];if(!grant?.enabled)return false;
  const required=validLevel(action),privacy=resource.privacy||grant.privacy;
  if(!relationshipAllowed(privacy,{...context,isOwner}))return false;
  if(required===ACTION_LEVELS.EXECUTE_ALLOWED&&context.critical===true&&!context.confirmed)return false;
  return required<=validLevel(grant.actionLevel);
}
