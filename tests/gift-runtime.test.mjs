import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('canonical gift-runtime module exists and documents catalog', async () => {
  const file = path.join(root, 'public/gift-runtime.js');
  assert.ok(fs.existsSync(file));
  const src = fs.readFileSync(file, 'utf8');
  assert.match(src, /SyloraGiftRuntime/);
  assert.match(src, /resolveLiveSegmentationProvider/);
  assert.match(src, /gift-catalog|GIFT_V2_CATALOG/);
});
