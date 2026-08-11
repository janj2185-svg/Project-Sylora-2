import test from 'node:test';
import assert from 'node:assert/strict';
import {ACTION_LEVELS,can,defaultPersonalAiPermissions,mergePermissions} from '../src/ecosystem/permissions.mjs';
import {createDefaultIdentity,serializePublicIdentity} from '../src/ecosystem/identity.mjs';
import {KnowledgeGraph} from '../src/ecosystem/knowledge-graph.mjs';
import {ActionEngine} from '../src/ecosystem/action-engine.mjs';
import {AgentMarketplace} from '../src/ecosystem/agents/marketplace.mjs';
import {validateAgentManifest} from '../src/ecosystem/agents/manifest.mjs';

test('ABAC permissions enforce scope, relationship and action level',()=>{
  const permissions=defaultPersonalAiPermissions(),owner={id:'u1'},resource={ownerId:'u1',scope:'memory',privacy:'private'};
  assert.equal(can(owner,ACTION_LEVELS.REQUEST_CONFIRMATION,resource,{permissions}),true);
  assert.equal(can({id:'u2'},ACTION_LEVELS.READ,resource,{permissions}),false);
  const denied=mergePermissions(permissions,{memory:{enabled:false}});
  assert.equal(can(owner,ACTION_LEVELS.READ,resource,{permissions:denied}),false);
});

test('knowledge graph filters private nodes by owner permission',()=>{
  const graph=new KnowledgeGraph();
  graph.addNode({id:'mine',type:'knowledge',ownerId:'u1',privacy:'private',scope:'memory',data:{text:'private'}},{id:'u1'});
  graph.addNode({id:'public',type:'knowledge',ownerId:'u2',privacy:'public',scope:'profile',data:{text:'public'}},{id:'u2'});
  const result=graph.query('u1',{},defaultPersonalAiPermissions());
  assert.deepEqual(result.nodes.map(x=>x.id).sort(),['mine','public']);
  assert.deepEqual(graph.query('u3',{},defaultPersonalAiPermissions()).nodes.map(x=>x.id),['public']);
});

test('critical actions require explicit confirmation',async()=>{
  const engine=new ActionEngine(),action=engine.create({actor:{id:'u1'},user:'u1',type:'send',input:{text:'draft'},permissions:defaultPersonalAiPermissions()});
  assert.equal(action.status,'pending_confirmation');
  await assert.rejects(engine.execute(action.id,{executor:()=>true}),/CONFIRMATION_REQUIRED/);
  assert.equal((await engine.execute(action.id,{confirm:true,executor:()=>({sent:true})})).status,'completed');
});

test('agent install requires every declared permission',()=>{
  const marketplace=new AgentMarketplace(),agent=marketplace.catalog[0];
  assert.throws(()=>marketplace.install('u1',agent.id,{approvedPermissions:[]}),/AGENT_PERMISSIONS_REQUIRED/);
  assert.equal(marketplace.install('u1',agent.id,{approvedPermissions:[...agent.permissions]}).status,'installed');
});

test('identity serializer hides private owner fields from public viewers',()=>{
  const identity=createDefaultIdentity({id:'u1',username:'alice',displayName:'Alice'});identity.subscriptions=['private-plan'];identity.digitalAssets=['asset'];
  const publicIdentity=serializePublicIdentity(identity,{});
  assert.equal('subscriptions' in publicIdentity,false);assert.equal('digitalAssets' in publicIdentity,false);
  assert.deepEqual(serializePublicIdentity(identity,{isOwner:true}).subscriptions,['private-plan']);
});

test('marketplace rejects unsafe or incomplete manifests',()=>{
  assert.throws(()=>validateAgentManifest({id:'x'}),/REQUIRED/);
  assert.throws(()=>validateAgentManifest({id:'x',name:'X',version:'1.0.0',developerId:'d',permissions:[],capabilities:[],tools:[],free:true,sandbox:false}),/SANDBOX_REQUIRED/);
});
