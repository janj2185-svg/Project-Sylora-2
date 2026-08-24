import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {
  EXPECTED_PNG_COUNT,
  expectedRelativePngPaths,
  validatePendingCaptureSource,
  validateRawCaptureMetadata,
  verifyRawCaptureBytes
} from './build-visual-manifest.mjs';
import {assertNoVisualBrowserConnectionEnvironment} from './visual-browser-contract.mjs';
import {createVisualFixtureData} from './visual-fixture.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmpRoot = path.join(repoRoot, 'tmp');
const mode = String(process.argv[2] || 'capture').toLowerCase();

if (!['capture', 'repeat'].includes(mode)) {
  console.error('Usage: node scripts/run-visual-qa.mjs [capture|repeat]');
  process.exit(2);
}

assertNoVisualBrowserConnectionEnvironment(process.env);

const candidateDir = path.join(tmpRoot, 'visual-candidate');
const repeatDir = path.join(tmpRoot, 'visual-repeat');
const outputDir = mode === 'capture' ? candidateDir : repeatDir;
const dataFile = path.join(tmpRoot, `visual-fixture-${mode}.json`);
const resultsDir = path.join(tmpRoot, `playwright-visual-results-${mode}`);
const candidateMetadata = path.join(candidateDir, 'metadata.json');

function assertSafeTmpTarget(target) {
  const relative = path.relative(tmpRoot, path.resolve(target));
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Refusing to clean non-task tmp path: ${target}`);
  }
}

function clean(target) {
  assertSafeTmpTarget(target);
  fs.rmSync(target, { recursive: true, force: true });
}

if (mode === 'repeat' && !fs.existsSync(candidateMetadata)) {
  console.error('Missing tmp/visual-candidate/metadata.json. Run capture mode first.');
  process.exit(2);
}

const git = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
if (git.status !== 0) throw new Error(`Unable to resolve visual source commit: ${git.stderr || git.error || 'git failed'}`);
const actualGitSha = git.stdout.trim();
const suppliedGitSha = String(process.env.SYLORA_VISUAL_GIT_SHA || '').trim();
if (!/^[a-f0-9]{40}$/.test(actualGitSha)) throw new Error(`Invalid repository HEAD for visual capture: ${actualGitSha}`);
if (suppliedGitSha && suppliedGitSha !== actualGitSha) {
  throw new Error(`Visual source SHA mismatch: checked out ${actualGitSha}, supplied ${suppliedGitSha}`);
}
const worktree = spawnSync('git', ['status', '--porcelain'], { cwd: repoRoot, encoding: 'utf8' });
if (worktree.status !== 0) throw new Error(`Unable to verify clean visual worktree: ${worktree.stderr || worktree.error || 'git failed'}`);
if (worktree.stdout.trim()) throw new Error(`Visual capture requires a clean worktree:\n${worktree.stdout.trim()}`);
if (fs.existsSync(path.join(repoRoot, '.env.local'))) {
  throw new Error('Visual capture refuses to load ambient .env.local configuration');
}
const gitSha = actualGitSha;

fs.mkdirSync(tmpRoot, { recursive: true });
if (mode === 'capture') {
  // A new capture invalidates every repeat artifact from an earlier attempt.
  // Clear them before rendering so an aborted capture cannot upload stale
  // determinism evidence from another commit or run.
  clean(repeatDir);
  clean(path.join(tmpRoot, 'playwright-visual-results-repeat'));
  clean(path.join(tmpRoot, 'visual-fixture-repeat.json'));
}
clean(outputDir);
clean(resultsDir);
clean(dataFile);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(dataFile, `${JSON.stringify(createVisualFixtureData(), null, 2)}\n`, { flag: 'wx' });

const cli = path.join(repoRoot, 'node_modules', '@playwright', 'test', 'cli.js');
const run = spawnSync(process.execPath, [cli, 'test', '--config=playwright.visual.config.mjs'], {
  cwd: repoRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    SYLORA_VISUAL_RUN_MODE: mode,
    SYLORA_VISUAL_GIT_SHA: gitSha,
    SYLORA_VISUAL_OUTPUT_DIR: outputDir,
    SYLORA_VISUAL_DATA_FILE: dataFile,
    SYLORA_VISUAL_RESULTS_DIR: resultsDir,
    SYLORA_VISUAL_PORT: '8793',
    TZ: 'UTC',
    LANG: 'C.UTF-8'
  }
});

if (run.error) {
  console.error(run.error);
  process.exit(1);
}
if (run.status !== 0) process.exit(run.status || 1);

const outputMetadata = path.join(outputDir, 'metadata.json');
if (!fs.existsSync(outputMetadata)) {
  console.error(`Visual run did not create metadata: ${outputMetadata}`);
  process.exit(1);
}

const outputReport = validateRawCaptureMetadata(JSON.parse(fs.readFileSync(outputMetadata, 'utf8')), {
  expectedCommit: gitSha,
  expectedRunMode: mode
});
await verifyRawCaptureBytes(outputDir, outputReport);
if (process.env.GITHUB_ACTIONS === 'true') {
  const captureMetadata = path.join(outputDir, 'capture-metadata.json');
  if (!fs.existsSync(captureMetadata)) throw new Error(`Missing GitHub capture provenance: ${captureMetadata}`);
  validatePendingCaptureSource(
    outputReport,
    JSON.parse(fs.readFileSync(captureMetadata, 'utf8')),
    { expectedCommit: gitSha, expectedRunMode: mode }
  );
}

if (mode === 'repeat') {
  const candidate = validateRawCaptureMetadata(JSON.parse(fs.readFileSync(candidateMetadata, 'utf8')), {
    expectedCommit: gitSha,
    expectedRunMode: 'capture'
  });
  await verifyRawCaptureBytes(candidateDir, candidate);
  const repeat = outputReport;
  const canonicalPaths = expectedRelativePngPaths();
  const digestMap = report => new Map(report.files.map(file => [file.file, file.sha256]));
  const expected = digestMap(candidate);
  const actual = digestMap(repeat);
  const names = [...new Set([...canonicalPaths, ...expected.keys(), ...actual.keys()])].sort();
  const mismatches = names.flatMap(name => {
    const before = expected.get(name) || null;
    const after = actual.get(name) || null;
    return before === after ? [] : [{ file: name, candidate: before, repeat: after }];
  });

  const exactPathSets = expected.size === EXPECTED_PNG_COUNT && actual.size === EXPECTED_PNG_COUNT &&
    canonicalPaths.every(name => expected.has(name) && actual.has(name));
  const contextParity = isDeepStrictEqual(candidate.fixture,repeat.fixture) &&
    isDeepStrictEqual(candidate.browser,repeat.browser) &&
    isDeepStrictEqual(candidate.runner,repeat.runner) &&
    isDeepStrictEqual(candidate.surfaces,repeat.surfaces) &&
    isDeepStrictEqual(candidate.viewports,repeat.viewports);
  if (
    candidate.complete !== true || repeat.complete !== true ||
    candidate.expectedFiles !== EXPECTED_PNG_COUNT || candidate.actualFiles !== EXPECTED_PNG_COUNT ||
    repeat.expectedFiles !== EXPECTED_PNG_COUNT || repeat.actualFiles !== EXPECTED_PNG_COUNT ||
    !exactPathSets || !contextParity || mismatches.length
  ) {
    console.error(JSON.stringify({
      candidateComplete: candidate.complete,
      repeatComplete: repeat.complete,
      expectedContractFiles: EXPECTED_PNG_COUNT,
      expectedFiles: expected.size,
      repeatFiles: actual.size,
      exactPathSets,
      contextParity,
      mismatches
    }, null, 2));
    process.exit(1);
  }
  console.log(`Determinism PASS: ${actual.size} candidate PNG digests match exactly.`);
} else {
  console.log(`Candidate capture complete: ${outputReport.actualFiles}/${outputReport.expectedFiles} PNGs in ${outputDir}`);
  console.log('Run `node scripts/run-visual-qa.mjs repeat` to verify exact digest determinism.');
}
