import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow } from './helpers.mjs';

test('@production health, readiness, and shell are available without writes', async ({ page, request }) => {
  const healthResponse = await request.get('/api/health');
  expect(healthResponse.status()).toBe(200);
  const health = await healthResponse.json();
  expect(health.status).toBe('ok');

  const readyResponse = await request.get('/api/ready');
  expect(readyResponse.status()).toBe(200);
  const ready = await readyResponse.json();
  expect(ready.ready).toBe(true);
  expect(ready.status).toBe('ready');

  const runtimeErrors = [];
  page.on('pageerror', error => runtimeErrors.push(`pageerror: ${error.message}`));
  page.on('console', message => {
    const text = message.text();
    if (/ownRooms is not defined|Failed to resolve module specifier ["']three["']|violates the following Content Security Policy directive/.test(text)) {
      runtimeErrors.push(`console: ${text}`);
    }
  });
  await page.goto('/');
  await expect(page.locator('.brand')).toBeVisible();
  await expect(page.locator('#globalSearch')).toBeVisible();
  await expect(page.locator('#signin')).toBeVisible();
  await expect(page.locator('#app')).not.toContainText('Запускаємо SYLORA');
  await expect.poll(
    () => page.evaluate(() => window.__syloraGiftEngineState ?? 'missing'),
    { timeout: 12_000 }
  ).toMatch(/^(ready|failed)$/);
  const giftEngineState = await page.evaluate(() => window.__syloraGiftEngineState);
  expect(giftEngineState, JSON.stringify(runtimeErrors)).toBe('ready');
  expect(runtimeErrors).toEqual([]);
});

test('@production shell has no horizontal overflow at supported breakpoints', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1366, height: 900 }
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('.brand')).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if (viewport.width === 390) await expect(page.locator('.mobile-dock')).toBeVisible();
    if (viewport.width === 1366) await expect(page.locator('.mobile-dock')).toBeHidden();
  }
});
