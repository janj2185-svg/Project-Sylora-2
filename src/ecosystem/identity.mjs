import {defaultPersonalAiPermissions} from './permissions.mjs';

const PUBLIC_FIELDS=new Set(['id','userId','username','displayName','verifiedPerson','creatorPersona','professionalIdentity','skills','interests','portfolio','education','achievements','reputations','communities','aiAgentId']);

export function createDefaultIdentity(user){
  return {id:user.id,userId:user.id,username:user.username,displayName:user.displayName||user.username,verifiedPerson:false,creatorPersona:{},professionalIdentity:{},skills:[],interests:[],portfolio:[],education:[],achievements:[],reputations:{},subscriptions:[],communities:[],aiAgentId:null,permissions:defaultPersonalAiPermissions(),digitalAssets:[],privacy:{profile:'public',portfolio:'public',education:'connections',subscriptions:'private',digitalAssets:'private'},createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
}

export function privacyFilter(value,privacy='private',viewerContext={}){
  const allowed=privacy==='public'||viewerContext.isOwner||viewerContext.isAdmin||(privacy==='followers'&&viewerContext.isFollower)||(privacy==='connections'&&viewerContext.isConnection)||(privacy==='business'&&viewerContext.isBusinessMember)||(privacy==='ai_only'&&viewerContext.isPersonalAi);
  return allowed?structuredClone(value):undefined;
}

export function serializePublicIdentity(identity,viewerContext={}){
  const out={};
  for(const [key,value] of Object.entries(identity||{})){
    if(!PUBLIC_FIELDS.has(key))continue;
    const level=identity.privacy?.[key]||identity.privacy?.profile||'public',filtered=privacyFilter(value,level,viewerContext);
    if(filtered!==undefined)out[key]=filtered;
  }
  if(viewerContext.isOwner||viewerContext.isAdmin){
    for(const key of ['subscriptions','permissions','digitalAssets','privacy'])out[key]=structuredClone(identity[key]);
  }
  return out;
}
