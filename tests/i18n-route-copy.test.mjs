import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {UI_RUNTIME_COPY} from '../public/locales/ui-runtime.js';

const locales=['uk','en','pl','de','ru'];

test('route UI namespace has identical non-empty coverage for five production locales',()=>{
  const keys=Object.keys(UI_RUNTIME_COPY.en).sort();
  assert.ok(keys.length>=90,`expected broad route copy coverage, got ${keys.length}`);
  for(const locale of locales){
    const dict=UI_RUNTIME_COPY[locale];
    assert.ok(dict,`missing ${locale}`);
    assert.deepEqual(Object.keys(dict).sort(),keys,`${locale} route-copy key mismatch`);
    for(const key of keys){
      assert.equal(typeof dict[key],'string',`${locale}.${key} must be string`);
      assert.ok(dict[key].trim(),`${locale}.${key} is empty`);
    }
  }
});

test('localization bridge protects user-generated content from automatic UI translation',()=>{
  const source=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const selector of ['.post-text','.message-bubble p','#liveMessages p','.ai-conversation p','.conference-sylora-messages']){
    assert.ok(source.includes(selector),`UGC protection missing ${selector}`);
  }
});

test('critical Studio and LIVE labels are covered by centralized aliases',()=>{
  const source=fs.readFileSync(new URL('../public/ui-localization-runtime.js',import.meta.url),'utf8');
  for(const literal of ['SOURCES','SCENES','AUDIO MIXER','BROADCAST','RECORD','WAITING FOR HOST','CONNECTION LOST']){
    assert.ok(source.includes(`'${literal}'`),`missing UI alias ${literal}`);
  }
});

test('technical protocol names remain literal product vocabulary',()=>{
  const all=JSON.stringify(UI_RUNTIME_COPY);
  for(const token of ['OBS','WebRTC','LIVE'])assert.ok(all.includes(token),`technical token ${token} unexpectedly absent`);
});
