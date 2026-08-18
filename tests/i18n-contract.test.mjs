import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UI_LOCALE,
  SUPPORTED_UI_LOCALES,
  FUTURE_UI_LOCALES,
  getDictionary,
  setLocale,
  getLocale,
  detectBrowserLocale,
  localeLabel
} from '../public/i18n.js';

test('production UI exposes exactly five supported locales',()=>{
  assert.deepEqual(SUPPORTED_UI_LOCALES,['uk','en','pl','de','ru']);
  assert.equal(DEFAULT_UI_LOCALE,'uk');
  assert.ok(FUTURE_UI_LOCALES.includes('es'));
});

test('all production dictionaries have identical non-empty key coverage',()=>{
  const reference=Object.keys(getDictionary('en')).sort();
  assert.ok(reference.length>40);
  for(const locale of SUPPORTED_UI_LOCALES){
    const dict=getDictionary(locale);
    assert.deepEqual(Object.keys(dict).sort(),reference,`${locale} key set differs`);
    for(const key of reference){
      assert.equal(typeof dict[key],'string',`${locale}.${key} must be a string`);
      assert.ok(dict[key].trim().length>0,`${locale}.${key} is empty`);
    }
  }
});

test('unsupported locale falls back to Ukrainian, never to a fake advertised locale',()=>{
  setLocale('fr',{persist:false});
  assert.equal(getLocale(),'uk');
  setLocale('uk',{persist:false});
});

test('locale labels match product selector contract',()=>{
  assert.deepEqual(SUPPORTED_UI_LOCALES.map(localeLabel),['UA','EN','PL','DE','RU']);
});

test('browser locale detector returns only production locales',()=>{
  assert.ok(SUPPORTED_UI_LOCALES.includes(detectBrowserLocale()));
});
