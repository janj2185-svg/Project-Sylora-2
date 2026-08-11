import {randomUUID} from 'node:crypto';
import {validateAgentManifest,EXAMPLE_AGENT_MANIFESTS} from './manifest.mjs';

export class AgentMarketplace{
  constructor({catalog=[],installs=[],ratings=[],persist=()=>{}}={}){this.catalog=catalog;this.installs=installs;this.ratings=ratings;this.persist=persist;if(!catalog.length)catalog.push(...EXAMPLE_AGENT_MANIFESTS.map(x=>({...x})))}
  publish(manifest,{securityReviewStatus='pending'}={}){const valid={...validateAgentManifest(manifest),securityReviewStatus};const index=this.catalog.findIndex(x=>x.id===valid.id&&x.version===valid.version);if(index>=0)this.catalog[index]=valid;else this.catalog.push(valid);this.persist();return valid}
  list({installedBy,reviewStatus}={}){const installed=installedBy?new Set(this.installs.filter(x=>x.userId===installedBy&&x.status==='installed').map(x=>x.agentId)):new Set();return this.catalog.filter(x=>!reviewStatus||x.securityReviewStatus===reviewStatus).map(x=>({...structuredClone(x),installed:installed.has(x.id),rating:this.averageRating(x.id)}))}
  install(userId,agentId,{approvedPermissions=[]}={}){
    const manifest=this.catalog.find(x=>x.id===agentId);if(!manifest)throw new Error('AGENT_NOT_FOUND');
    const missing=manifest.permissions.filter(x=>!approvedPermissions.includes(x));if(missing.length)throw Object.assign(new Error('AGENT_PERMISSIONS_REQUIRED'),{permissions:missing});
    let install=this.installs.find(x=>x.userId===userId&&x.agentId===agentId);if(install){install.status='installed';install.permissions=[...approvedPermissions];install.version=manifest.version;install.updatedAt=new Date().toISOString()}else{install={id:randomUUID(),userId,agentId,version:manifest.version,permissions:[...approvedPermissions],status:'installed',installedAt:new Date().toISOString()};this.installs.push(install)}this.persist();return structuredClone(install);
  }
  uninstall(userId,agentId){const install=this.installs.find(x=>x.userId===userId&&x.agentId===agentId&&x.status==='installed');if(!install)return false;install.status='uninstalled';install.updatedAt=new Date().toISOString();this.persist();return true}
  rate(userId,agentId,score,review=''){if(!this.installs.some(x=>x.userId===userId&&x.agentId===agentId&&x.status==='installed'))throw new Error('AGENT_NOT_INSTALLED');const value=Math.max(1,Math.min(5,Math.round(Number(score)||0)));this.ratings.push({id:randomUUID(),userId,agentId,score:value,review:String(review).slice(0,1000),createdAt:new Date().toISOString()});this.persist();return value}
  versionCheck(userId,agentId){const install=this.installs.find(x=>x.userId===userId&&x.agentId===agentId&&x.status==='installed'),latest=this.catalog.filter(x=>x.id===agentId).sort((a,b)=>b.version.localeCompare(a.version,{numeric:true}))[0];return {installed:install?.version||null,latest:latest?.version||null,updateAvailable:!!install&&!!latest&&install.version!==latest.version}}
  averageRating(agentId){const rows=this.ratings.filter(x=>x.agentId===agentId);return rows.length?rows.reduce((sum,x)=>sum+x.score,0)/rows.length:null}
}
