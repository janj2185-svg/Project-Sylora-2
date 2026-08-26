import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflows = [
  '.github/workflows/ci.yml',
  '.github/workflows/production-relay-probe.yml'
];

test('GitHub workflows use Node 24 action runtimes with read-only repository access', () => {
  for (const path of workflows) {
    const workflow = fs.readFileSync(path, 'utf8');
    assert.match(workflow, /permissions:\s*\n\s+contents: read/, `${path} must keep the token read-only`);
    assert.match(workflow, /actions\/checkout@v7/, `${path} must use the current checkout runtime`);
    assert.match(workflow, /actions\/setup-node@v7/, `${path} must use the current setup-node runtime`);
    assert.doesNotMatch(
      workflow,
      /actions\/(?:checkout|setup-node|upload-artifact)@v[1-6]\b/,
      `${path} must not restore a deprecated JavaScript action runtime`
    );
  }

  const ci = fs.readFileSync('.github/workflows/ci.yml', 'utf8');
  assert.equal((ci.match(/actions\/upload-artifact@v7/g) || []).length, 3);
});
