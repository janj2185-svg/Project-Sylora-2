export const AGENT_MANIFEST_FIELDS=Object.freeze(['id','name','version','developerId','permissions','capabilities','tools','pricing','free','sandbox']);

export function validateAgentManifest(manifest){
  if(!manifest||typeof manifest!=='object')throw new Error('INVALID_AGENT_MANIFEST');
  for(const field of ['id','name','version','developerId'])if(!String(manifest[field]||'').trim())throw new Error(`AGENT_MANIFEST_${field.toUpperCase()}_REQUIRED`);
  if(!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(manifest.version))throw new Error('INVALID_AGENT_VERSION');
  for(const field of ['permissions','capabilities','tools'])if(!Array.isArray(manifest[field]))throw new Error(`AGENT_MANIFEST_${field.toUpperCase()}_INVALID`);
  if(manifest.free!==true&&manifest.free!==false)throw new Error('AGENT_MANIFEST_FREE_INVALID');
  if(manifest.sandbox!==true)throw new Error('AGENT_SANDBOX_REQUIRED');
  return Object.freeze({...manifest,permissions:Object.freeze([...new Set(manifest.permissions)]),capabilities:Object.freeze([...new Set(manifest.capabilities)]),tools:Object.freeze([...new Set(manifest.tools)]),pricing:manifest.pricing||{mode:manifest.free?'free':'external'}});
}

const seed=(id,name,permissions,capabilities,tools)=>validateAgentManifest({id,name,version:'0.1.0',developerId:'sylora',permissions,capabilities,tools,pricing:{mode:'free',amount:0},free:true,sandbox:true,securityReviewStatus:'catalog_example'});
export const EXAMPLE_AGENT_MANIFESTS=Object.freeze([
  seed('sylora.teacher','Teacher',['profile:read','memory:propose'],['learning_support'],['search','analyze']),
  seed('sylora.live-moderator','LIVE Moderator',['live:read','live:propose'],['live_moderation'],['moderate','notify']),
  seed('sylora.translator','Translator',['messages:read'],['text_translation'],['translate']),
  seed('sylora.creator-assistant','Creator Assistant',['profile:read','projects:propose'],['creator_planning'],['prepare','generate']),
  seed('sylora.research','Research',['profile:read'],['research_support'],['search','analyze'])
]);
