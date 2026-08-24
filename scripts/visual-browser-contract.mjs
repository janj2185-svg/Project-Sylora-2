import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const playwrightTestManifest = require('@playwright/test/package.json');
const playwrightCoreManifest = require('playwright-core/package.json');
const playwrightCoreRoot = path.dirname(require.resolve('playwright-core/package.json'));
const browsersManifest = JSON.parse(readFileSync(path.join(playwrightCoreRoot, 'browsers.json'), 'utf8'));
const browserEntries = Array.isArray(browsersManifest?.browsers) ? browsersManifest.browsers : [];
const headlessShellEntries = browserEntries.filter(browser => browser.name === 'chromium-headless-shell');

if (
  typeof playwrightTestManifest.version !== 'string' ||
  !playwrightTestManifest.version.trim() ||
  playwrightTestManifest.version !== playwrightCoreManifest.version
) {
  throw new Error('Visual browser contract: @playwright/test and playwright-core must have the same pinned version');
}

if (
  headlessShellEntries.length !== 1 ||
  headlessShellEntries[0].installByDefault !== true ||
  typeof headlessShellEntries[0].revision !== 'string' ||
  !/^\d+$/.test(headlessShellEntries[0].revision) ||
  typeof headlessShellEntries[0].browserVersion !== 'string' ||
  !headlessShellEntries[0].browserVersion.trim() ||
  headlessShellEntries[0].browserVersion !== headlessShellEntries[0].browserVersion.trim()
) {
  throw new Error('Visual browser contract: playwright-core has no unique default Chromium headless-shell pin');
}

export const VISUAL_BROWSER_DISTRIBUTION = 'chromium-headless-shell';
export const VISUAL_BROWSER_REVISION = headlessShellEntries[0].revision;
export const VISUAL_BROWSER_EXECUTABLE = 'chrome-headless-shell';
export const VISUAL_BROWSER_VERSION = headlessShellEntries[0].browserVersion;
export const VISUAL_PLAYWRIGHT_VERSION = playwrightTestManifest.version;

export const FORBIDDEN_VISUAL_CONNECT_ENV = Object.freeze([
  'PW_TEST_CONNECT_WS_ENDPOINT',
  'PW_TEST_CONNECT_HEADERS',
  'PW_TEST_CONNECT_EXPOSE_NETWORK'
]);

const EXECUTABLE_TAILS = Object.freeze({
  'linux:x64': 'chrome-headless-shell-linux64/chrome-headless-shell',
  'linux:arm64': 'chrome-linux/headless_shell',
  'darwin:x64': 'chrome-headless-shell-mac-x64/chrome-headless-shell',
  'darwin:arm64': 'chrome-headless-shell-mac-arm64/chrome-headless-shell',
  'win32:x64': 'chrome-headless-shell-win64/chrome-headless-shell.exe'
});

function fail(message) {
  throw new Error(`Visual browser contract: ${message}`);
}

export function assertNoVisualBrowserConnectionEnvironment(environment) {
  if (!environment || typeof environment !== 'object' || Array.isArray(environment)) {
    fail('an environment object is required');
  }
  const active = FORBIDDEN_VISUAL_CONNECT_ENV.filter(name => {
    const value = environment[name];
    return value !== undefined && value !== null && String(value).length > 0;
  });
  if (active.length) fail(`remote browser environment overrides are forbidden: ${active.join(', ')}`);
}

export function assertVisualProjectConfiguration(use) {
  if (!use || typeof use !== 'object' || Array.isArray(use)) fail('resolved project use configuration is required');
  if (use.browserName !== 'chromium') fail('browserName must be chromium');
  if (use.headless !== true) fail('headless must be true');
  if (use.channel !== undefined && use.channel !== null) fail('channel must be omitted');
  if (use.connectOptions !== undefined && use.connectOptions !== null) fail('connectOptions must be omitted');
  if (!use.launchOptions || typeof use.launchOptions !== 'object' || Array.isArray(use.launchOptions)) {
    fail('launchOptions must contain the browser-command-line evidence flag');
  }
  const launchOptionKeys = Object.keys(use.launchOptions).sort();
  if (launchOptionKeys.length !== 1 || launchOptionKeys[0] !== 'args') fail('launchOptions may contain only args');
  if (
    !Array.isArray(use.launchOptions.args) ||
    use.launchOptions.args.length !== 1 ||
    use.launchOptions.args[0] !== '--enable-automation'
  ) {
    fail('launchOptions.args must be exactly [--enable-automation]');
  }
}

export function normalizeVisualBrowserCommandLine(
  commandLine,
  { platform = process.platform, arch = process.arch } = {}
) {
  if (!Array.isArray(commandLine) || !commandLine.length || commandLine.some(argument => typeof argument !== 'string')) {
    fail('Browser.getBrowserCommandLine must return a non-empty string array');
  }

  const executablePath = commandLine[0].replaceAll('\\', '/');
  const executableName = executablePath.slice(executablePath.lastIndexOf('/') + 1).toLowerCase();
  const executableTail = EXECUTABLE_TAILS[`${platform}:${arch}`];
  if (!executableTail) fail(`unsupported runtime platform ${platform}/${arch}`);
  const expectedTail = `/chromium_headless_shell-${VISUAL_BROWSER_REVISION}/${executableTail}`;
  const comparablePath = platform === 'win32' ? executablePath.toLowerCase() : executablePath;
  const comparableTail = platform === 'win32' ? expectedTail.toLowerCase() : expectedTail;
  if (!comparablePath.endsWith(comparableTail)) {
    fail(`executable is not the pinned Playwright Chromium headless shell (basename=${executableName || 'unknown'})`);
  }
  if (!commandLine.includes('--headless')) fail('the browser process is missing --headless');
  if (commandLine.some(argument => argument.startsWith('--headless=') && argument !== '--headless')) {
    fail('alternate --headless modes are forbidden');
  }
  if (!commandLine.includes('--enable-automation')) fail('the browser process is missing --enable-automation');
  if (!commandLine.includes('--remote-debugging-pipe')) fail('the browser process is missing --remote-debugging-pipe');

  return {
    distribution: VISUAL_BROWSER_DISTRIBUTION,
    revision: VISUAL_BROWSER_REVISION,
    executable: VISUAL_BROWSER_EXECUTABLE
  };
}

export async function inspectVisualBrowserRuntime(browser) {
  if (
    !browser ||
    typeof browser.newBrowserCDPSession !== 'function' ||
    typeof browser.browserType !== 'function' ||
    typeof browser.version !== 'function'
  ) fail('a Chromium Browser fixture is required');
  if (browser.browserType().name() !== 'chromium') fail('runtime browser type must be chromium');

  const session = await browser.newBrowserCDPSession();
  try {
    const result = await session.send('Browser.getBrowserCommandLine');
    const fingerprint = normalizeVisualBrowserCommandLine(result?.arguments);
    const version = browser.version();
    if (version !== VISUAL_BROWSER_VERSION) fail(`browser version must be ${VISUAL_BROWSER_VERSION}, received ${version}`);
    return { name: 'chromium', ...fingerprint, version };
  } finally {
    await session.detach().catch(() => {});
  }
}
