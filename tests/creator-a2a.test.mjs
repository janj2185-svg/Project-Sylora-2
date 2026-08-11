import test from 'node:test';
import assert from 'node:assert/strict';
import {buildLivePackage,CreatorStudioAi} from '../src/ecosystem/creator/studio-ai.mjs';
import {AiToAiBroker} from '../src/ecosystem/agents/a2a.mjs';
import {computeShare} from '../src/ecosystem/commerce/revenue-share.mjs';

test('AI Creator Studio builds an editable LIVE package without publishing', () => {
  const pack = buildLivePackage({topic:'Flutter в Польщі',durationMinutes:40});
  assert.equal(pack.status,'draft_proposal');
  assert.equal(pack.requiresCreatorApproval,true);
  assert.ok(pack.scenes.length>=3);
  assert.ok(pack.clipPlan.length>=1);
  assert.equal(pack.translation.status,'BLOCKED_UNTIL_PROVIDER');
});

test('approved Creator Studio package can export Studio scenes', () => {
  const studio = new CreatorStudioAi({packages:[]});
  const pack = studio.propose('user-1',{topic:'Design systems'});
  const scenes = studio.approveSceneExport('user-1',pack.id);
  assert.equal(scenes.length,pack.scenes.length);
  assert.ok(scenes.every(s=>s.fromAiPackageId===pack.id));
});

test('AI-to-AI financial negotiations require user confirmation and never auto-execute', () => {
  const broker = new AiToAiBroker({negotiations:[]});
  const n = broker.start({
    fromAgentId:'personal',
    toAgentId:'business',
    userId:'user-1',
    intent:'Ask availability and price',
    domain:'financial',
    level:'EXECUTE_ALLOWED',
    payload:{service:'consultation'}
  });
  assert.equal(n.status,'awaiting_user_confirmation');
  const confirmed = broker.confirm(n.id,'user-1');
  assert.equal(confirmed.status,'confirmed_prepare_only');
  assert.equal(confirmed.level,'PREPARE');
});

test('revenue share keeps platform remainder and blocks payout claim', () => {
  const share = computeShare({gross:1000,creatorBps:7000,developerBps:1000});
  assert.equal(share.legs.creator.amount,700);
  assert.equal(share.legs.developer.amount,100);
  assert.equal(share.legs.platform.amount,200);
  assert.equal(share.payoutStatus,'BLOCKED_UNTIL_PAYMENT_PROVIDER');
});
