import { defineConfig } from '@playwright/test';
import { VISUAL_DETERMINISM_FLAGS } from './scripts/visual-browser-contract.mjs';

const port = Number(process.env.SYLORA_VISUAL_PORT || 8793);
const baseURL = `http://127.0.0.1:${port}`;
const dataFile = process.env.SYLORA_VISUAL_DATA_FILE || './tmp/visual-candidate.json';
const resultsDir = process.env.SYLORA_VISUAL_RESULTS_DIR || './tmp/playwright-visual-results';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'visual-baseline.spec.mjs',
  outputDir: resultsDir,
  timeout: 180_000,
  globalTimeout: 900_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: 'line',
  use: {
    baseURL,
    browserName: 'chromium',
    // Intentionally omit `channel`: Playwright then uses its version-pinned
    // Chromium headless shell instead of the opt-in new-headless executable.
    headless: true,
    // Browser.getBrowserCommandLine is intentionally enabled so the capture
    // can prove the actual Playwright executable without persisting its path.
    launchOptions: { args: ['--enable-automation', ...VISUAL_DETERMINISM_FLAGS] },
    colorScheme: 'light',
    locale: 'uk-UA',
    timezoneId: 'UTC',
    reducedMotion: 'reduce',
    deviceScaleFactor: 1,
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  },
  projects: [{ name: 'visual-chromium-headless-shell', use: { browserName: 'chromium', headless: true } }],
  webServer: {
    command: 'node src/server.mjs',
    url: `${baseURL}/api/health`,
    timeout: 60_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      ...process.env,
      PORT: String(port),
      NODE_ENV: 'development',
      DATABASE_URL: '',
      REDIS_URL: '',
      OPENAI_API_KEY: '',
      OPENAI_BASE_URL: '',
      OPENAI_MODEL: 'gpt-5.6',
      OPENAI_MODEL_FAST: '',
      OPENAI_REALTIME_MODEL: 'gpt-realtime-2.1',
      OPENAI_REALTIME_VOICE: 'marin',
      ELEVENLABS_API_KEY: '',
      ELEVENLABS_VOICE_ID: '',
      SYLORA_TURN_SHARED_SECRET: '',
      SYLORA_STUN_URLS: '',
      SYLORA_TURN_URL: '',
      SYLORA_TURN_USERNAME: '',
      SYLORA_TURN_CREDENTIAL: '',
      SYLORA_TURN_TTL_SECONDS: '3600',
      SYLORA_ICE_SERVERS_JSON: '',
      TURN_URLS: '',
      TURN_USERNAME: '',
      TURN_CREDENTIAL: '',
      PAYMENT_PROVIDER: '',
      PAYMENT_PROVIDER_API_KEY: '',
      SYLORA_PAYMENT_PROVIDER: '',
      SYLORA_PAYMENT_SECRET_KEY: '',
      SYLORA_COMPANION_ORIGINS: '',
      SYLORA_COMPANION_TOKEN: '',
      SYLORA_ENABLE_HSTS: '0',
      SYLORA_EMBEDDING_PROVIDER: '',
      SYLORA_IMAGE_PROVIDER: '',
      SYLORA_MEDIA_ROOT: '',
      SYLORA_TRANSLATE_PROVIDER: '',
      SYLORA_TRANSLATE_API_KEY: '',
      SYLORA_FF_MARKETPLACE: '',
      SYLORA_FF_FAMILY: '',
      SYLORA_FF_2FA: '',
      GOOGLE_OAUTH_CLIENT_ID: '',
      GOOGLE_OAUTH_CLIENT_SECRET: '',
      SESSION_TTL_DAYS: '30',
      CREATOR_GIFT_SHARE_BPS: '7000',
      SYLORA_DATA_FILE: dataFile
    }
  }
});
