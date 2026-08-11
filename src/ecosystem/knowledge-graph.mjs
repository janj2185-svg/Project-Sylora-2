import {randomUUID} from 'node:crypto';
import {can,ACTION_LEVELS} from './permissions.mjs';

export const KG_NODE_TYPES=Object.freeze(['user','person','company','project','post','video','live','message','document','course','skill','product','service','community','event','ai_agent','knowledge','action']);

export class KnowledgeGraph{
  constructor({nodes=[],edges=[],audit=[],persist=()=>{},now=()=>new Date().toISOString()}={}){this.nodes=nodes;this.edges=edges;this.audit=audit;this.persist=persist;this.now=now}
  addNode(input,actor={}){
    if(!KG_NODE_TYPES.includes(input.type))throw new Error('INVALID_KG_NODE_TYPE');
    const node={id:input.id||randomUUID(),type:input.type,ownerId:input.ownerId||actor.id||actor.userId,privacy:input.privacy||'private',scope:input.scope||'profile',data:structuredClone(input.data||{}),createdAt:input.createdAt||this.now(),updatedAt:this.now()};
    const existing=this.nodes.findIndex(x=>x.id===node.id);if(existing>=0)this.nodes[existing]={...this.nodes[existing],...node,createdAt:this.nodes[existing].createdAt};else this.nodes.push(node);
    this.record(actor.id||actor.userId,'kg.node.upsert',node.id);this.persist();return node;
  }
  addEdge(input,actor={}){
    const from=this.nodes.find(x=>x.id===input.from),to=this.nodes.find(x=>x.id===input.to);if(!from||!to)throw new Error('KG_NODE_NOT_FOUND');
    if(actor.role!=='admin'&&actor.id!==from.ownerId&&actor.userId!==from.ownerId)throw new Error('KG_WRITE_FORBIDDEN');
    const edge={id:input.id||randomUUID(),from:from.id,to:to.id,relation:String(input.relation||'related_to').slice(0,80),ownerId:from.ownerId,privacy:input.privacy||from.privacy,metadata:structuredClone(input.metadata||{}),createdAt:this.now()};this.edges.push(edge);this.record(actor.id||actor.userId,'kg.edge.add',edge.id);this.persist();return edge;
  }
  query(userId,filter={},permissions={}){
    const actor=typeof userId==='object'?userId:{id:userId},context=filter.context||{},match=node=>(!filter.type||node.type===filter.type)&&(!filter.ownerId||node.ownerId===filter.ownerId)&&(!filter.ids||filter.ids.includes(node.id))&&(!filter.text||JSON.stringify(node.data).toLowerCase().includes(String(filter.text).toLowerCase()));
    const nodes=this.nodes.filter(match).filter(node=>can(actor,ACTION_LEVELS.READ,node,{...context,permissions})).slice(0,Math.min(200,Number(filter.limit)||50));
    const ids=new Set(nodes.map(x=>x.id)),edges=this.edges.filter(x=>ids.has(x.from)&&ids.has(x.to));this.record(actor.id,'kg.query',null,{count:nodes.length});return {nodes:structuredClone(nodes),edges:structuredClone(edges)};
  }
  deleteUserData(userId){const ids=new Set(this.nodes.filter(x=>x.ownerId===userId).map(x=>x.id));this.nodes.splice(0,this.nodes.length,...this.nodes.filter(x=>x.ownerId!==userId));this.edges.splice(0,this.edges.length,...this.edges.filter(x=>x.ownerId!==userId&&!ids.has(x.from)&&!ids.has(x.to)));this.record(userId,'kg.user.delete',userId);this.persist();return {deletedNodes:ids.size}}
  exportUserData(userId){const nodes=this.nodes.filter(x=>x.ownerId===userId),ids=new Set(nodes.map(x=>x.id));return {version:1,exportedAt:this.now(),nodes:structuredClone(nodes),edges:structuredClone(this.edges.filter(x=>x.ownerId===userId||ids.has(x.from)||ids.has(x.to)))}}
  auditLog(filter={}){return this.audit.filter(x=>(!filter.userId||x.userId===filter.userId)&&(!filter.action||x.action===filter.action)).map(x=>structuredClone(x))}
  record(userId,action,targetId,metadata={}){this.audit.push({id:randomUUID(),userId,action,targetId,metadata,createdAt:this.now()})}
}
