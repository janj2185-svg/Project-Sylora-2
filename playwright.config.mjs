import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = String(process.env.SYLORA_E2E_BASE_URL || '').trim();
const port = Number(process.env.SYLORA_E2E_PORT || 8791);
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`;
const secureProbe = process.env.SYLORA_E2E_SECURE_PROBE === '1';

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'visual-baseline.spec.mjs',
  outputDir: 'tmp/playwright-results',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: secureProbe
    ? 'line'
    : process.env.CI
    ? [['line'], ['html', { outputFolder: 'tmp/playwright-report', open: 'never' }]]
    : 'line',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    trace: secureProbe ? 'off' : 'retain-on-failure',
    screenshot: secureProbe ? 'off' : 'only-on-failure',
    video: secureProbe ? 'off' : 'retain-on-failure'
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'node src/server.mjs',
        url: `${baseURL}/api/health`,
        timeout: 60_000,
        reuseExistingServer: !process.env.CI,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
          ...process.env,
          PORT: String(port),
          NODE_ENV: 'development',
          DATABASE_URL: '',
          REDIS_URL: '',
          SYLORA_DATA_FILE: process.env.SYLORA_E2E_DATA_FILE || './tmp/playwright-sylora.json'
        }
      }
});
