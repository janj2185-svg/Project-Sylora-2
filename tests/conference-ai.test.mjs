import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFERENCE_PARTICIPANT_LIMIT, conferenceAiInstructions } from '../src/ecosystem/conference-ai.mjs';

test('science and business conferences share a strict twenty-person limit',()=>{
  assert.equal(CONFERENCE_PARTICIPANT_LIMIT,20);
});

test('Sylora joins conferences on demand with distinct multilingual professional roles',()=>{
  const science=conferenceAiInstructions({kind:'science',locale:'uk',room:{title:'Physics'}}),business=conferenceAiInstructions({kind:'business',locale:'pl',room:{title:'Sales'}});
  assert.match(science,/teacher and research copilot/i);assert.match(science,/silent until/i);assert.match(science,/language of the question/i);
  assert.match(business,/business analyst/i);assert.match(business,/legal, tax or financial advice/i);assert.match(business,/language of the question/i);
  assert.match(science,/Do not use an avatar/i);assert.match(business,/Do not use an avatar/i);
});
