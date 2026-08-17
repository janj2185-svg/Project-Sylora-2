import { defineConfig, devices } from '@playwright/test';

const externalBaseUrl = String(process.env.SYLORA_E2E_BASE_URL || '').trim();
const port = Number(process.env.SYLORA_E2E_PORT || 8791);
const baseURL = externalBaseUrl || `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './e2e',
  outputDir: 'tmp/playwright-results',
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['line'], ['html', { outputFolder: 'tmp/playwright-report', open: 'never' }]]
    : 'line',
  use: {
    baseURL,
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
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
