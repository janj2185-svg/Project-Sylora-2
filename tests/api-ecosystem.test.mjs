import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('ecosystem APIs persist foundations and fail closed providers',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sylora-ecosystem-api-'));
  process.env.NODE_ENV='test';process.env.SYLORA_DATA_FILE=path.join(dir,'db.json');process.env.SYLORA_ADMIN_EMAILS='admin@ecosystem.test';delete process.env.TRANSLATION_PROVIDER;delete process.env.VECTOR_SEARCH_PROVIDER;
  const {server}=await import(`../src/server.mjs?ecosystem=${Date.now()}`);
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const request=async(pathname,options={},expected=200)=>{const response=await fetch(`${base}${pathname}`,{...options,headers:{'content-type':'application/json',...(options.headers||{})}}),data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data};
  try{
    const registered=await request('/api/auth/register',{method:'POST',body:JSON.stringify({email:'admin@ecosystem.test',username:'ecosystemadmin',password:'password123'})},201),auth={authorization:`Bearer ${registered.token}`};
    const identity=(await request('/api/identity',{headers:auth})).identity;assert.equal(identity.username,'ecosystemadmin');assert.equal(identity.privacy.profile,'public');
    const updated=(await request('/api/identity',{method:'PATCH',headers:auth,body:JSON.stringify({skills:['moderation'],privacy:{education:'private'}})})).identity;assert.deepEqual(updated.skills,['moderation']);assert.equal(updated.privacy.education,'private');
    const permissionUpdate=await request('/api/ai/permissions',{method:'PATCH',headers:auth,body:JSON.stringify({messages:{enabled:false}})});assert.equal(permissionUpdate.permissions.scopes.messages.enabled,false);
    const consent=await request('/api/kg/consent',{method:'POST',headers:auth,body:JSON.stringify({scope:'messages',enabled:true,privacy:'ai_only'})});assert.equal(consent.permissions.scopes.messages.enabled,true);
    assert.deepEqual((await request('/api/kg/query',{method:'POST',headers:auth,body:'{}'})).graph.nodes,[]);
    await request('/api/ai/memory',{method:'POST',headers:auth,body:JSON.stringify({label:'Goal',value:'Build safely',tags:['work']})},201);
    assert.equal((await request('/api/ai/memory/export',{headers:auth})).export.memories.length,1);
    assert.equal((await request('/api/ai/dashboard',{headers:auth})).knows.memoryCount,1);
    assert.equal((await request('/api/ai/memory',{method:'DELETE',headers:auth})).deleted,1);
    const agents=(await request('/api/agents',{headers:auth})).agents,teacher=agents.find(x=>x.id==='sylora.teacher');assert.equal(teacher.securityReviewStatus,'catalog_example');
    await request(`/api/agents/${encodeURIComponent(teacher.id)}/install`,{method:'POST',headers:auth,body:JSON.stringify({permissions:teacher.permissions})},201);
    assert.equal((await request('/api/agents',{headers:auth})).agents.find(x=>x.id===teacher.id).installed,true);
    const app=(await request('/api/developer/apps',{method:'POST',headers:auth,body:JSON.stringify({name:'Sandbox app',scopes:['profile:read']})},201)).app;
    const apiKey=await request(`/api/developer/apps/${app.id}/keys`,{method:'POST',headers:auth,body:JSON.stringify({name:'CI'})},201);assert.match(apiKey.secret,/^syl_test_/);assert.equal('keyHash' in apiKey.key,false);
    assert.equal((await request('/api/command-center/context?context=creator',{headers:auth})).context.context,'creator');
    assert.equal((await request('/api/translate',{method:'POST',headers:auth,body:JSON.stringify({text:'hello',targetLanguage:'uk'})},503)).translation.status,'BLOCKED');
    const org=(await request('/api/orgs',{method:'POST',headers:auth,body:JSON.stringify({name:'Ecosystem Lab'})},201)).organization;assert.equal((await request(`/api/orgs/${org.id}`,{headers:auth})).organization.role,'owner');
    assert.equal((await request('/api/reputation/me',{headers:auth})).reputation.axes.trustScore,0);
    assert.deepEqual((await request('/api/trust/labels',{headers:auth})).labels,[]);
    const search=await request('/api/search/ai?q=ecosystem&semantic=true',{headers:auth});assert.equal(search.plan.semantic.status,'BLOCKED');
    assert.equal((await request('/api/admin/ecosystem',{headers:auth})).status.organizations,1);
    const pack=(await request('/api/studio/ai/propose',{method:'POST',headers:auth,body:JSON.stringify({topic:'Ecosystem LIVE'})},201)).package;
    assert.equal(pack.requiresCreatorApproval,true);
    assert.equal((await request(`/api/studio/ai/packages/${pack.id}/export-scenes`,{method:'POST',headers:auth,body:'{}'},201)).scenes.length,pack.scenes.length);
    const negotiation=(await request('/api/a2a',{method:'POST',headers:auth,body:JSON.stringify({fromAgentId:'personal',toAgentId:'business',intent:'Ask price',domain:'financial',level:'EXECUTE_ALLOWED'})},201)).negotiation;
    assert.equal(negotiation.status,'awaiting_user_confirmation');
    assert.equal((await request(`/api/a2a/${negotiation.id}/confirm`,{method:'POST',headers:auth,body:'{}'})).negotiation.status,'confirmed_prepare_only');
    assert.match((await request('/api/economy/revenue-share',{headers:auth})).note,/BLOCKED/);
  }finally{await new Promise(resolve=>server.close(resolve))}
});
