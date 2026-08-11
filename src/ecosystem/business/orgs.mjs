import {randomUUID} from 'node:crypto';

export const ORG_ROLES=Object.freeze({owner:['*'],admin:['members:manage','settings:manage','agents:manage','audit:read'],manager:['members:read','agents:use','projects:manage'],member:['agents:use','projects:read'],viewer:['projects:read']});

export class OrganizationStore{
  constructor({organizations=[],members=[],teams=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.organizations=organizations;this.members=members;this.teams=teams;this.persist=persist;this.now=now}
  create(ownerId,input={}){const name=String(input.name||'').trim().slice(0,120);if(name.length<2)throw new Error('ORG_NAME_REQUIRED');const org={id:randomUUID(),ownerId,name,slug:String(input.slug||name).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,80),createdAt:this.now()};this.organizations.push(org);this.members.push({id:randomUUID(),orgId:org.id,userId:ownerId,role:'owner',joinedAt:this.now()});this.persist();return org}
  list(userId){const ids=new Set(this.members.filter(x=>x.userId===userId).map(x=>x.orgId));return this.organizations.filter(x=>ids.has(x.id)).map(org=>({...org,role:this.members.find(x=>x.orgId===org.id&&x.userId===userId)?.role}))}
  addMember(actorId,orgId,userId,role='member'){if(!ORG_ROLES[role])throw new Error('INVALID_ORG_ROLE');if(!this.can(actorId,orgId,'members:manage'))throw new Error('ORG_PERMISSION_DENIED');let member=this.members.find(x=>x.orgId===orgId&&x.userId===userId);if(member)member.role=role;else{member={id:randomUUID(),orgId,userId,role,joinedAt:this.now()};this.members.push(member)}this.persist();return member}
  createTeam(actorId,orgId,input={}){if(!this.can(actorId,orgId,'settings:manage'))throw new Error('ORG_PERMISSION_DENIED');const team={id:randomUUID(),orgId,name:String(input.name||'Team').slice(0,80),memberIds:Array.isArray(input.memberIds)?[...new Set(input.memberIds)]:[],createdAt:this.now()};this.teams.push(team);this.persist();return team}
  can(userId,orgId,permission){const role=this.members.find(x=>x.orgId===orgId&&x.userId===userId)?.role,grants=ORG_ROLES[role]||[];return grants.includes('*')||grants.includes(permission)}
}
