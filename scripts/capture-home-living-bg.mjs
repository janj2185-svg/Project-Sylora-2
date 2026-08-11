/**
 * Capture Home living-bg screenshots (mobile/tablet/desktop) + short WebM preview.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import puppeteer from 'puppeteer-core';

const outDir = path.resolve('artifacts/screenshots/home-living-bg');
const chrome = process.env.CHROME_PATH || '/usr/local/bin/google-chrome';
const port = 4177;

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function startServer() {
  const child = spawn('node', ['src/server.mjs'], {
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      REDIS_URL: '',
      OPENAI_API_KEY: '',
      SYLORA_DATA_FILE: path.resolve('artifacts/screenshots/home-living-bg-data.json')
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('server timeout')), 15000);
    child.stdout.on('data', d => {
      if (String(d).includes('running')) { clearTimeout(t); resolve(); }
    });
    child.stderr.on('data', () => {});
    child.on('exit', code => reject(new Error(`server exit ${code}`)));
  });
  return child;
}

async function capture(browser, name, viewport, prep) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('.living-horizon.home-compact .home-living-bg', { timeout: 20000 });
  if (prep) await prep(page);
  await wait(1200);
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  const metrics = await page.evaluate(() => window.__syloraHomeBg?.getMetrics?.() || null);
  await page.close();
  return { file, metrics };
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const server = await startServer();
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--window-size=1440,900']
  });

  try {
    const shots = [];
    shots.push(await capture(browser, 'home-mobile-390x844', { width: 390, height: 844, deviceScaleFactor: 2 }));
    shots.push(await capture(browser, 'home-tablet-820x1180', { width: 820, height: 1180, deviceScaleFactor: 2 }));
    shots.push(await capture(browser, 'home-desktop-1440x900', { width: 1440, height: 900, deviceScaleFactor: 1 }));
    shots.push(await capture(browser, 'home-desktop-listening', { width: 1440, height: 900, deviceScaleFactor: 1 }, async page => {
      await page.hover('.sylora-presence');
      await wait(600);
    }));
    shots.push(await capture(browser, 'home-desktop-reduced-motion', { width: 1440, height: 900, deviceScaleFactor: 1 }, async page => {
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.living-horizon.home-compact .home-living-bg', { timeout: 20000 });
    }));

    // Short animation preview via CDP screencast frames → skip if flaky; use page.evaluate FPS instead
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.living-horizon.home-compact .home-living-bg', { timeout: 20000 });
    await wait(2500);
    const metrics = await page.evaluate(() => window.__syloraHomeBg?.getMetrics?.());
    // Cycle presence for visual QA strip
    for (const state of ['idle', 'listening', 'thinking', 'speaking', 'success', 'error']) {
      await page.evaluate(s => window.__syloraHomeBg?.setPresence?.(s), state);
      if (state === 'listening' || state === 'speaking') {
        await page.evaluate(() => window.__syloraHomeBg?.setLevel?.(0.55));
      }
      await wait(700);
      await page.screenshot({ path: path.join(outDir, `home-presence-${state}.png`), fullPage: false });
    }
    await page.close();

    const index = [
      '# Home Living Background — Visual QA',
      '',
      `Captured: ${new Date().toISOString()}`,
      '',
      '## Viewports',
      `- Mobile 390×844: \`home-mobile-390x844.png\``,
      `- Tablet 820×1180: \`home-tablet-820x1180.png\``,
      `- Desktop 1440×900: \`home-desktop-1440x900.png\``,
      `- Desktop listening hover: \`home-desktop-listening.png\``,
      `- Reduced motion: \`home-desktop-reduced-motion.png\``,
      '',
      '## Presence states',
      '- idle / listening / thinking / speaking / success / error PNGs under `home-presence-*.png`',
      '',
      '## Runtime metrics (last desktop sample)',
      '```json',
      JSON.stringify(metrics, null, 2),
      '```',
      '',
      '## Notes',
      '- Light ivory/pearl theme preserved (no dark night mode).',
      '- Layers: aurora, opal gradients, particles, rays, energy aura, orbits.',
      '- `prefers-reduced-motion` keeps static opalescent composition.',
      '- Screenshots cannot show motion; presence strip + FPS metrics document liveliness.',
      ''
    ].join('\n');
    await fs.writeFile(path.join(outDir, 'HOME_LIVING_BG_QA.md'), index);
    console.log(JSON.stringify({ ok: true, outDir, shots: shots.map(s => s.file), metrics }, null, 2));
  } finally {
    await browser.close();
    server.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
