import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLiveSoulInstructions, createLiveSoulState, evolveLiveSoul } from '../src/ecosystem/sylora-soul.mjs';

test('LIVE soul evolves from observed events without inventing viewer history',()=>{
  const state=createLiveSoulState();
  const first=evolveLiveSoul(state,{type:'chat',user:{username:'navi'},text:'Sylora, ти красуня'});
  assert.equal(first.viewer.relationship,'new');assert.equal(first.state.mood,'proud');assert.ok(first.state.warmth>66);
  const beforeGiftEnergy=first.state.energy,gift=evolveLiveSoul(first.state,{type:'gift',user:{username:'navi'},gift:{name:'Rose',count:5}});
  assert.equal(gift.viewer.relationship,'supporter');assert.equal(gift.state.mood,'delighted');assert.ok(gift.state.energy>beforeGiftEnergy);
});

test('LIVE soul can be sharp and playful without pretending to be human or enabling abuse',()=>{
  let state=createLiveSoulState(),evolved;
  for(let i=0;i<4;i++)evolved=evolveLiveSoul(state,{type:'chat',user:{username:'troll'},text:'ти дурна'}),state=evolved.state;
  assert.equal(evolved.viewer.relationship,'provocateur');assert.ok(state.irritation>50);
  const prompt=buildLiveSoulInstructions({state,viewer:evolved.viewer,event:{type:'chat'}});
  assert.match(prompt,/vivid, consistent persona/i);assert.match(prompt,/witty boundary/i);assert.match(prompt,/Never claim literal consciousness/i);
  assert.match(prompt,/Never sexualize minors/i);assert.doesNotMatch(prompt,/You are not an AI/i);
});
