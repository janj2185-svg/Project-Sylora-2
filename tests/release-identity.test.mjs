import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('release identity accepts only bounded public deployment metadata', async () => {
  const { buildReleaseInfo } = await import(`../src/release-info.mjs?builder=${Date.now()}`);
  const commit = 'A'.repeat(40);
  assert.deepEqual(buildReleaseInfo({
    SYLORA_RELEASE_SHA: commit,
    SYLORA_RELEASE_REF: 'main',
    SYLORA_RELEASED_AT: '2026-08-27T12:34:56Z'
  }, '1.2.3'), {
    service: 'sylora-core',
    version: '1.2.3',
    commit: commit.toLowerCase(),
    shortCommit: 'aaaaaaaaaaaa',
    ref: 'main',
    deployedAt: '2026-08-27T12:34:56.000Z'
  });
  assert.deepEqual(buildReleaseInfo({
    SYLORA_RELEASE_SHA: 'abcdef1',
    SYLORA_RELEASE_REF: '../unsafe ref',
    SYLORA_RELEASED_AT: 'not-a-date'
  }, '1.2.3'), {
    service: 'sylora-core',
    version: '1.2.3',
    commit: 'unknown',
    shortCommit: 'unknown',
    ref: 'unknown',
    deployedAt: null
  });
});

test('server exposes exact release identity and safe shell cache policy', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sylora-release-'));
  const commit = '1234567890abcdef1234567890abcdef12345678';
  process.env.NODE_ENV = 'test';
  process.env.SYLORA_DATA_FILE = path.join(dir, 'data.json');
  process.env.SYLORA_RELEASE_SHA = commit;
  process.env.SYLORA_RELEASE_REF = 'main';
  process.env.SYLORA_RELEASED_AT = '2026-08-27T12:34:56Z';
  const { server } = await import(`../src/server.mjs?release=${Date.now()}`);
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const versionResponse = await fetch(`${base}/api/version`);
    assert.equal(versionResponse.status, 200);
    assert.equal(versionResponse.headers.get('cache-control'), 'no-store');
    assert.equal(versionResponse.headers.get('x-sylora-release'), commit.slice(0, 12));
    assert.deepEqual(await versionResponse.json(), {
      service: 'sylora-core',
      version: '0.1.0',
      commit,
      shortCommit: commit.slice(0, 12),
      ref: 'main',
      deployedAt: '2026-08-27T12:34:56.000Z'
    });

    const shell = await fetch(`${base}/`);
    assert.equal(shell.status, 200);
    assert.equal(shell.headers.get('cache-control'), 'no-store, max-age=0');

    const versionedScript = await fetch(`${base}/app.js?v=release-test`);
    assert.equal(versionedScript.status, 200);
    assert.equal(versionedScript.headers.get('cache-control'), 'public, max-age=31536000, immutable');

    const unversionedScript = await fetch(`${base}/app.js`);
    assert.equal(unversionedScript.status, 200);
    assert.equal(unversionedScript.headers.get('cache-control'), 'no-cache');
  } finally {
    await new Promise(resolve => server.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('production deploy is pinned to a full SHA and verifies both local and public release', () => {
  const deploy = fs.readFileSync('scripts/deploy-prod.sh', 'utf8');
  const workflow = fs.readFileSync('.github/workflows/production-relay-probe.yml', 'utf8');
  const compose = fs.readFileSync('compose.yaml', 'utf8');
  assert.match(deploy, /EXPECTED_SHA/);
  assert.match(deploy, /Deploy requires the explicitly approved full 40-character main commit SHA/);
  assert.match(deploy, /git merge --ff-only origin\/main/);
  assert.match(
    deploy,
    /verify_release\(\) \{\s+docker compose exec -T sylora node scripts\/verify-release\.mjs "\$@"\s+\}/,
    'release verification must use the app container instead of requiring Node.js on the host'
  );
  assert.match(deploy, /verify_release http:\/\/127\.0\.0\.1:8787/);
  assert.match(deploy, /verify_release "\$PUBLIC_BASE_URL"/);
  assert.doesNotMatch(
    deploy,
    /^\s*node scripts\/verify-release\.mjs/gm,
    'deploy helper must not require Node.js on the production host'
  );
  assert.match(deploy, /attempting application rollback/);
  assert.match(deploy, /sylora-production-current/);
  assert.match(workflow, /expected_sha:/);
  assert.match(workflow, /Exact production release identity/);
  assert.ok(
    workflow.indexOf('Exact production release identity') < workflow.indexOf('Install Playwright Chromium'),
    'release drift should fail before expensive browser setup'
  );
  assert.match(compose, /SYLORA_RELEASE_SHA:/);
  assert.match(compose, /SYLORA_RELEASED_AT:/);
});
