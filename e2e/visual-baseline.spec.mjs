import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { test } from '@playwright/test';
import {
  FIXED_VISUAL_ACCOUNT,
  FIXED_VISUAL_TIME,
  VISUAL_FIXTURE_ID,
  VISUAL_LOCALE,
  VISUAL_RANDOM_SEED,
  VISUAL_SURFACES,
  VISUAL_VIEWPORTS,
  applyVisualTouchEmulation,
  captureRuntimeDiagnostics,
  createVisualContext,
  enforceVisualTouchEmulation,
  ensureFixedVisualAccount,
  gotoVisualSurface,
  verifyVisualTouchInput,
  visualRuntimeMetadata
} from './visual-helpers.mjs';

const require = createRequire(import.meta.url);
const { version: playwrightVersion } = require('@playwright/test/package.json');
const outputRoot = path.resolve(process.env.SYLORA_VISUAL_OUTPUT_DIR || 'tmp/visual-candidate');
const resultsRoot = path.resolve(process.env.SYLORA_VISUAL_RESULTS_DIR || 'tmp/playwright-visual-results');
const records = [];
let browserVersion = '';

fs.mkdirSync(outputRoot, { recursive: true });
fs.mkdirSync(resultsRoot, { recursive: true });

for (const viewport of VISUAL_VIEWPORTS) {
  test(`candidate baseline ${viewport.id}`, async ({ browser, baseURL }) => {
    browserVersion ||= browser.version();
    const context = await createVisualContext(browser, viewport, baseURL);
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });
    const page = await context.newPage();
    let traceStopped = false;
    let touchEmulationSession = null;

    try {
      await page.clock.setFixedTime(new Date(FIXED_VISUAL_TIME));
      await ensureFixedVisualAccount(page);
      touchEmulationSession = await enforceVisualTouchEmulation(context, page, viewport);
      await verifyVisualTouchInput(page, viewport);
      const diagnostics = captureRuntimeDiagnostics(page);

      for (const surface of VISUAL_SURFACES) {
        await test.step(surface.id, async () => {
          let nativeTouchInput = null;
          await gotoVisualSurface(page, surface, {
            afterNavigation: async () => {
              await applyVisualTouchEmulation(touchEmulationSession, viewport);
              nativeTouchInput = await verifyVisualTouchInput(page, viewport);
            }
          });
          diagnostics.assertClean(surface.id);

          const relativePath = path.join(surface.id, viewport.id, `${VISUAL_LOCALE}.png`);
          const absolutePath = path.join(outputRoot, relativePath);
          fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
          const png = await page.screenshot({
            path: absolutePath,
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
            scale: 'css'
          });
          const runtime = await visualRuntimeMetadata(page, nativeTouchInput);
          if (runtime.devicePixelRatio !== 1) throw new Error(`Unexpected DPR ${runtime.devicePixelRatio}`);
          if (runtime.fontStatus !== 'loaded') throw new Error(`Fonts are not loaded: ${runtime.fontStatus}`);
          if (runtime.locale !== VISUAL_LOCALE) throw new Error(`Unexpected locale ${runtime.locale}`);
          if (runtime.reducedMotion !== true) throw new Error('Reduced-motion capture contract is not active');
          if (runtime.viewport.width !== viewport.width || runtime.viewport.height !== viewport.height) {
            throw new Error(`Unexpected viewport ${runtime.viewport.width}x${runtime.viewport.height}`);
          }
          if (viewport.hasTouch ? runtime.touchPoints < 1 : runtime.touchPoints !== 0) {
            throw new Error(`Unexpected touch contract: ${runtime.touchPoints}`);
          }
          const expectedPointer = viewport.hasTouch ? 'coarse' : 'fine';
          const expectedHover = viewport.hasTouch ? 'none' : 'hover';
          if (runtime.primaryPointer !== expectedPointer || runtime.primaryHover !== expectedHover) {
            throw new Error(`Unexpected pointer contract: ${runtime.primaryPointer}/${runtime.primaryHover}`);
          }
          diagnostics.assertClean(`${surface.id}:post-capture`);

          records.push({
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
            runtime
          });
          diagnostics.reset();
        });
      }
    } catch (error) {
      const failureScreenshot = path.join(resultsRoot, `failure-${viewport.id}.png`);
      const failureTrace = path.join(resultsRoot, `trace-${viewport.id}.zip`);
      await page.screenshot({ path: failureScreenshot, fullPage: true, animations: 'disabled', caret: 'hide' }).catch(() => {});
      await context.tracing.stop({ path: failureTrace }).catch(traceError => {
        error.message += `\nTrace retention also failed: ${traceError.message}`;
      });
      traceStopped = true;
      throw error;
    } finally {
      try {
        if (!traceStopped) await context.tracing.stop();
      } finally {
        try {
          await touchEmulationSession?.detach().catch(() => {});
        } finally {
          await context.close();
        }
      }
    }
  });
}

test.afterAll(() => {
  records.sort((left, right) =>
    VISUAL_SURFACES.findIndex(surface => surface.id === left.surface) -
      VISUAL_SURFACES.findIndex(surface => surface.id === right.surface) ||
    VISUAL_VIEWPORTS.findIndex(viewport => viewport.id === left.viewport) -
      VISUAL_VIEWPORTS.findIndex(viewport => viewport.id === right.viewport)
  );

  const expectedFiles = VISUAL_SURFACES.length * VISUAL_VIEWPORTS.length;
  const metadata = {
    schemaVersion: 3,
    status: 'CANDIDATE_RESTORED_BASELINE',
    complete: records.length === expectedFiles,
    expectedFiles,
    actualFiles: records.length,
    generatedAt: new Date().toISOString(),
    renderedFromCommit: process.env.SYLORA_VISUAL_GIT_SHA || 'unknown',
    runMode: process.env.SYLORA_VISUAL_RUN_MODE || 'capture',
    fixture: {
      id: VISUAL_FIXTURE_ID,
      username: FIXED_VISUAL_ACCOUNT.username,
      displayName: FIXED_VISUAL_ACCOUNT.displayName,
      fixedTime: FIXED_VISUAL_TIME,
      randomSeed: VISUAL_RANDOM_SEED,
      locale: VISUAL_LOCALE,
      dailyBrief: false
    },
    browser: { name: 'chromium', version: browserVersion, playwrightVersion },
    runner: { platform: process.platform, arch: process.arch, release: os.release() },
    surfaces: VISUAL_SURFACES.map(surface => surface.id),
    viewports: VISUAL_VIEWPORTS,
    files: records
  };
  fs.writeFileSync(path.join(outputRoot, 'metadata.json'), `${JSON.stringify(metadata, null, 2)}\n`);

  if (!metadata.complete) {
    throw new Error(`Incomplete visual candidate: expected ${expectedFiles}, captured ${records.length}`);
  }

  if (process.env.GITHUB_ACTIONS === 'true') {
    const sourceRunId = Number(process.env.GITHUB_RUN_ID || 0);
    const sourceRunAttempt = Number(process.env.GITHUB_RUN_ATTEMPT || 0);
    const repository = String(process.env.GITHUB_REPOSITORY || '').trim();
    const renderedFromCommit = metadata.renderedFromCommit;
    const fontFamilies = [...new Set(records.map(record => record.runtime.bodyFontFamily))];
    const runnerImage = String(process.env.ImageOS || process.env.RUNNER_OS || '').trim();
    if (!/^[a-f0-9]{40}$/.test(renderedFromCommit)) throw new Error(`Invalid rendered commit metadata: ${renderedFromCommit}`);
    if (!sourceRunId || !sourceRunAttempt || !repository || !runnerImage) throw new Error('GitHub runner provenance is required for promotable visual evidence');
    if (fontFamilies.length !== 1 || records.some(record => record.runtime.fontStatus !== 'loaded')) {
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
      browser: { name: 'chromium', version: browserVersion },
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
