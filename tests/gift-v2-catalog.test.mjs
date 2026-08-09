import test from 'node:test';
import assert from 'node:assert/strict';
import {GIFT_V2_PASSPORTS} from '../public/gift-v2/catalog.js';

test('V2 world standard catalog contains twenty distinct cinematic identities',()=>{assert.equal(GIFT_V2_PASSPORTS.length,20);for(const key of ['id','name','motion','camera','climax','ending'])assert.equal(new Set(GIFT_V2_PASSPORTS.map(x=>x[key])).size,20,`${key} must be unique across all 20 gifts`)});

test('new ten gifts are events with non-repeated climax and endings',()=>{const newer=GIFT_V2_PASSPORTS.slice(10);assert.equal(newer.length,10);assert.equal(new Set(newer.map(x=>x.climax)).size,10);assert.equal(new Set(newer.map(x=>x.ending)).size,10)});
