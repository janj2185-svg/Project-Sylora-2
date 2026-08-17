import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('production relay probe is manual, read-only, and keeps bearer diagnostics off', () => {
  const workflow = fs.readFileSync('.github/workflows/production-relay-probe.yml', 'utf8');
  const config = fs.readFileSync('playwright.config.mjs', 'utf8');

  assert.match(workflow, /workflow_dispatch:/);
  assert.doesNotMatch(workflow, /\n\s+(push|pull_request):/);
  assert.match(workflow, /permissions:\s*\n\s+contents: read/);
  assert.match(workflow, /secrets\.SYLORA_E2E_AUTH_TOKEN/);
  assert.match(workflow, /SYLORA_E2E_SECURE_PROBE: '1'/);
  assert.doesNotMatch(workflow, /upload-artifact/);

  assert.match(config, /secureProbe = process\.env\.SYLORA_E2E_SECURE_PROBE === '1'/);
  assert.match(config, /reporter: secureProbe\s*\n\s*\? 'line'/);
  assert.match(config, /trace: secureProbe \? 'off'/);
  assert.match(config, /screenshot: secureProbe \? 'off'/);
  assert.match(config, /video: secureProbe \? 'off'/);
});
