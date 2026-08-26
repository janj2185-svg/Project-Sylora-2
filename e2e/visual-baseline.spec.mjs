import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { test } from '@playwright/test';
import {
  VISUAL_PLAYWRIGHT_VERSION,
  assertNoVisualBrowserConnectionEnvironment,
  assertVisualScreenshotEnvironment,
  assertVisualProjectConfiguration,
  inspectVisualBrowserRuntime
} from '../scripts/visual-browser-contract.mjs';
import {
  aggregateVisualCaptureLedger,
  persistVisualCaptureLedgerEntry,
  writeJsonAtomicReplace
} from '../scripts/visual-capture-ledger.mjs';
import {
  FIXED_VISUAL_ACCOUNT,
  FIXED_VISUAL_TIME,
  VISUAL_FIXTURE_ID,
  VISUAL_LOCALE,
  VISUAL_RANDOM_SEED,
  VISUAL_SURFACES,
  VISUAL_VIEWPORTS,
  applyVisualTouchEmulation,
  captureStableVisualScreenshot,
  captureRuntimeDiagnostics,
  createVisualContext,
  enforceVisualTouchEmulation,
  ensureFixedVisualAccount,
  gotoVisualSurface,
  verifyVisualTouchInput,
  visualRuntimeMetadata
} from './visual-helpers.mjs';

assertNoVisualBrowserConnectionEnvironment(process.env);
assertVisualScreenshotEnvironment(process.env);

const playwrightVersion = VISUAL_PLAYWRIGHT_VERSION;
const outputRoot = path.resolve(process.env.SYLORA_VISUAL_OUTPUT_DIR || 'tmp/visual-candidate');
const resultsRoot = path.resolve(process.env.SYLORA_VISUAL_RESULTS_DIR || 'tmp/playwright-visual-results');
const renderedFromCommit = process.env.SYLORA_VISUAL_GIT_SHA || 'unknown';
const runMode = process.env.SYLORA_VISUAL_RUN_MODE || 'capture';
const runnerFingerprint = { platform: process.platform, arch: process.arch, release: os.release() };
let browserFingerprint = null;

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(resultsRoot, { recursive: true });

function writeStabilityMismatchEvidence({ viewport, surface, first, second, firstSha256, secondSha256, rasterDifference }) {
  const evidenceRoot = path.join(resultsRoot, 'stability-mismatch', viewport.id, surface.id);
  const relativeEvidenceRoot = path.relative(resultsRoot, evidenceRoot);
  if (!relativeEvidenceRoot || relativeEvidenceRoot.startsWith('..') || path.isAbsolute(relativeEvidenceRoot)) {
    throw new Error(`Refusing to write visual mismatch evidence outside results root: ${evidenceRoot}`);
  }
  fs.mkdirSync(evidenceRoot, { recursive: true });
  fs.writeFileSync(path.join(evidenceRoot, 'final-a.png'), first, { flag: 'wx' });
  fs.writeFileSync(path.join(evidenceRoot, 'final-b.png'), second, { flag: 'wx' });
  fs.writeFileSync(path.join(evidenceRoot, 'metadata.json'), `${JSON.stringify({
    schemaVersion: 2,
    renderedFromCommit,
    viewport: {
      id: viewport.id,
      width: viewport.width,
      height: viewport.height,
      isMobile: viewport.isMobile,
      hasTouch: viewport.hasTouch
    },
    surface: surface.id,
    rasterDifference,
    frames: {
      finalA: { file: 'final-a.png', sha256: firstSha256, bytes: first.length },
      finalB: { file: 'final-b.png', sha256: secondSha256, bytes: second.length }
    }
  }, null, 2)}\n`, { flag: 'wx' });
}

function writeAggregatedRawMetadata() {
  const aggregate = aggregateVisualCaptureLedger({
    resultsRoot,
    outputRoot,
    expectedCommit: renderedFromCommit,
    expectedRunMode: runMode,
    observedBrowser: browserFingerprint ? { ...browserFingerprint, playwrightVersion } : null,
    observedRunner: runnerFingerprint
  });
  const browserMetadata = aggregate.browser || {
    name: 'chromium',
    distribution: 'unverified',
    revision: 'unverified',
    executable: 'unverified',
    screenshotBackend: 'unverified',
    compositorScheduling: 'unverified',
    version: 'unverified',
    playwrightVersion
  };
  const metadata = {
    schemaVersion: 10,
    status: aggregate.complete ? 'CANDIDATE_RESTORED_BASELINE' : 'INCOMPLETE_VISUAL_CAPTURE',
    complete: aggregate.complete,
    expectedFiles: aggregate.expectedFiles,
    actualFiles: aggregate.actualFiles,
    generatedAt: new Date().toISOString(),
    renderedFromCommit,
    runMode,
    fixture: {
      id: VISUAL_FIXTURE_ID,
      username: FIXED_VISUAL_ACCOUNT.username,
      displayName: FIXED_VISUAL_ACCOUNT.displayName,
      fixedTime: FIXED_VISUAL_TIME,
      randomSeed: VISUAL_RANDOM_SEED,
      locale: VISUAL_LOCALE,
      dailyBrief: false
    },
    browser: browserMetadata,
    runner: aggregate.runner,
    surfaces: VISUAL_SURFACES.map(surface => surface.id),
    viewports: VISUAL_VIEWPORTS,
    files: aggregate.records
  };
  writeJsonAtomicReplace(path.join(outputRoot, 'metadata.json'), metadata);
  return metadata;
}

for (const viewport of VISUAL_VIEWPORTS) {
  test(`candidate baseline ${viewport.id}`, async ({ browser, baseURL, connectOptions }, testInfo) => {
    assertVisualProjectConfiguration(testInfo.project.use);
    if (connectOptions !== undefined && connectOptions !== null) {
      throw new Error('Visual browser contract: resolved connectOptions must be absent');
    }
    const observedBrowser = await inspectVisualBrowserRuntime(browser);
    if (browserFingerprint && !isDeepStrictEqual(browserFingerprint, observedBrowser)) {
      throw new Error(`Visual browser fingerprint drifted: ${JSON.stringify({ expected: browserFingerprint, observed: observedBrowser })}`);
    }
    browserFingerprint ||= observedBrowser;
    const context = await createVisualContext(browser, viewport, baseURL);
    const page = await context.newPage();
    let touchEmulationSession = null;
    let lastSurface = null;
    let lastSafeRuntime = null;

    try {
      touchEmulationSession = await enforceVisualTouchEmulation(context, page, viewport);
      await page.clock.setFixedTime(new Date(FIXED_VISUAL_TIME));
      await ensureFixedVisualAccount(page, {
        beforeNavigation: () => applyVisualTouchEmulation(touchEmulationSession, viewport)
      });
      await verifyVisualTouchInput(page, viewport, touchEmulationSession);
      const diagnostics = captureRuntimeDiagnostics(page);

      for (const surface of VISUAL_SURFACES) {
        await test.step(surface.id, async () => {
          lastSurface = surface.id;
          lastSafeRuntime = null;
          let cdpTouchInput = null;
          await gotoVisualSurface(page, surface, {
            beforeNavigation: () => applyVisualTouchEmulation(touchEmulationSession, viewport),
            afterNavigation: async () => {
              cdpTouchInput = await verifyVisualTouchInput(page, viewport, touchEmulationSession);
            }
          });
          diagnostics.assertClean(surface.id);

          const relativePath = path.join(surface.id, viewport.id, `${VISUAL_LOCALE}.png`);
          const absolutePath = path.join(outputRoot, relativePath);
          const runtime = await visualRuntimeMetadata(page, cdpTouchInput);
          lastSafeRuntime = runtime;
          if (runtime.devicePixelRatio !== 1) throw new Error(`Unexpected DPR ${runtime.devicePixelRatio}`);
          if (runtime.fontStatus !== 'loaded') throw new Error(`Fonts are not loaded: ${runtime.fontStatus}`);
          if (runtime.locale !== VISUAL_LOCALE) throw new Error(`Unexpected locale ${runtime.locale}`);
          if (runtime.reducedMotion !== true) throw new Error('Reduced-motion capture contract is not active');
          if (runtime.viewport.width !== viewport.width || runtime.viewport.height !== viewport.height) {
            throw new Error(`Unexpected viewport ${runtime.viewport.width}x${runtime.viewport.height}`);
          }
          const expectedTouchPoints = viewport.hasTouch ? 1 : 0;
          if (runtime.navigatorMaxTouchPoints !== expectedTouchPoints) {
            throw new Error(`Unexpected touch contract: ${runtime.navigatorMaxTouchPoints}`);
          }
          const expectedPointer = viewport.hasTouch ? 'coarse' : 'fine';
          const expectedHover = viewport.hasTouch ? 'none' : 'hover';
          if (runtime.primaryPointer !== expectedPointer || runtime.primaryHover !== expectedHover) {
            throw new Error(`Unexpected pointer contract: ${runtime.primaryPointer}/${runtime.primaryHover}`);
          }
          diagnostics.assertClean(`${surface.id}:pre-capture`);

          const { png, paintStability } = await captureStableVisualScreenshot(page, {
            assertClean: label => diagnostics.assertClean(`${surface.id}:${label}`),
            recordMismatch: evidence => writeStabilityMismatchEvidence({ ...evidence, viewport, surface })
          });
          diagnostics.assertClean(`${surface.id}:post-stability-capture`);

          // Candidate bytes become durable only after the runtime and screenshot
          // checks above have passed. Exclusive creation prevents a stale or
          // repeated run from silently overwriting evidence.
          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          fs.writeFileSync(absolutePath, png, { flag: 'wx' });

          const record = {
            surface: surface.id,
            viewport: viewport.id,
            width: viewport.width,
            height: viewport.height,
            locale: VISUAL_LOCALE,
            input: viewport.hasTouch ? 'touch' : 'mouse',
            isMobile: viewport.isMobile,
            hasTouch: viewport.hasTouch,
            file: relativePath.split(path.sep).join('/'),
            sha256: createHash('sha256').update(png).digest('hex'),
            bytes: png.length,
            paintStability,
            runtime
          };
          persistVisualCaptureLedgerEntry({
            resultsRoot,
            outputRoot,
            record,
            browser: { ...browserFingerprint, playwrightVersion },
            runner: runnerFingerprint,
            renderedFromCommit,
            runMode
          });
          writeAggregatedRawMetadata();
          diagnostics.reset();
        });
      }
    } catch (error) {
      const failureScreenshot = path.join(resultsRoot, `failure-${viewport.id}.png`);
      const evidenceFailures = [];
      await page.screenshot({ path: failureScreenshot, fullPage: true, animations: 'allow', caret: 'initial' })
        .catch(evidenceError => evidenceFailures.push(`screenshot: ${evidenceError.message}`));
      try {
        fs.writeFileSync(path.join(resultsRoot, `failure-runtime-${viewport.id}.json`), `${JSON.stringify({
          viewport: {
            id: viewport.id,
            width: viewport.width,
            height: viewport.height,
            isMobile: viewport.isMobile,
            hasTouch: viewport.hasTouch
          },
          surface: lastSurface,
          runtime: lastSafeRuntime
        }, null, 2)}\n`, { flag: 'wx' });
      } catch (evidenceError) {
        evidenceFailures.push(`runtime JSON: ${evidenceError.message}`);
      }
      if (evidenceFailures.length && error instanceof Error) {
        error.message += `\nFailure evidence issues: ${evidenceFailures.join('; ')}`;
      }
      throw error;
    } finally {
      try {
        await touchEmulationSession?.detach().catch(() => {});
      } finally {
        await context.close();
      }
    }
  });
}

test.afterAll(() => {
  const metadata = writeAggregatedRawMetadata();

  if (!metadata.complete) {
    throw new Error(`Incomplete visual candidate: expected ${metadata.expectedFiles}, captured ${metadata.actualFiles}`);
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    const sourceRunId = Number(process.env.GITHUB_RUN_ID || 0);
    const sourceRunAttempt = Number(process.env.GITHUB_RUN_ATTEMPT || 0);
    const repository = String(process.env.GITHUB_REPOSITORY || '').trim();
    const fontFamilies = [...new Set(metadata.files.map(record => record.runtime.bodyFontFamily))];
    const runnerImage = String(process.env.ImageOS || process.env.RUNNER_OS || '').trim();
    if (!/^[a-f0-9]{40}$/.test(renderedFromCommit)) throw new Error(`Invalid rendered commit metadata: ${renderedFromCommit}`);
    if (!sourceRunId || !sourceRunAttempt || !repository || !runnerImage) throw new Error('GitHub runner provenance is required for promotable visual evidence');
    if (fontFamilies.length !== 1 || metadata.files.some(record => record.runtime.fontStatus !== 'loaded')) {
      throw new Error(`Inconsistent font evidence: ${JSON.stringify(fontFamilies)}`);
    }

    const captureMetadata = {
      status: 'CANDIDATE_RESTORED_BASELINE',
      renderedFromCommit,
      capturedAt: new Date().toISOString(),
      sourceRun: {
        provider: 'github-actions',
        id: sourceRunId,
        attempt: sourceRunAttempt,
        url: `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${repository}/actions/runs/${sourceRunId}`,
        conclusion: 'pending-terminal-verification',
        headSha: renderedFromCommit
      },
      playwright: { version: playwrightVersion },
      browser: {
        name: metadata.browser.name,
        distribution: metadata.browser.distribution,
        revision: metadata.browser.revision,
        executable: metadata.browser.executable,
        screenshotBackend: metadata.browser.screenshotBackend,
        compositorScheduling: metadata.browser.compositorScheduling,
        version: metadata.browser.version
      },
      os: {
        name: String(process.env.RUNNER_OS || process.platform),
        version: String(process.env.ImageVersion || os.release()),
        runnerImage
      },
      locale: VISUAL_LOCALE,
      fixture: { id: VISUAL_FIXTURE_ID, fixedTime: FIXED_VISUAL_TIME },
      font: { ready: true, computedFamily: fontFamilies[0] },
      viewports: Object.fromEntries(VISUAL_VIEWPORTS.map(viewport => [viewport.id, {
        width: viewport.width,
        height: viewport.height,
        devicePixelRatio: 1,
        inputMode: viewport.hasTouch ? 'touch' : 'mouse'
      }]))
    };
    fs.writeFileSync(path.join(outputRoot, 'capture-metadata.json'), `${JSON.stringify(captureMetadata, null, 2)}\n`);
  }
});
