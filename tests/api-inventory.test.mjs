import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

test('API inventory is generated from current route definitions and reports honest counts', () => {
  assert.doesNotThrow(() => execFileSync(process.execPath, ['scripts/generate-api-inventory.mjs', '--check'], { stdio: 'pipe' }));
  const inventory = fs.readFileSync('docs/architecture/API_INVENTORY.md', 'utf8');
  const metric = label => Number(new RegExp(`\\| ${label} \\| (\\d+) \\|`).exec(inventory)?.[1]);
  const total = metric('Total unique endpoints');
  const rows = inventory.split('\n').filter(line => /^\| (?:GET|POST|PATCH|PUT|DELETE) \|/.test(line));
  assert.equal(rows.length, total);
  assert.ok(total > 200, 'inventory must not undercount the existing broad API surface');
  assert.equal(metric('Active') + metric('Legacy') + metric('Dead') + metric('Duplicate') + metric('Unverified'), total);
  assert.equal(metric('Frontend-used') + metric('Backend-only'), total);
  assert.equal(rows.every(row => row.split('|').length === 8), true, 'every endpoint must have all six required fields');
  assert.match(inventory, /\| GET \| `\/api\/me` \| OWNER \|/);
  assert.match(inventory, /\| POST \| `\/api\/auth\/logout` \| SESSION_TOKEN \|/);
  assert.match(inventory, /\| GET \| `\/api\/conversations\/:id\/messages` \| MEMBER \|/);
});
