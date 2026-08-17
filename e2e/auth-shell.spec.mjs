import { test, expect } from '@playwright/test';
import { authFetch, loginViaUi, registerViaUi, uniqueAccount } from './helpers.mjs';

test('register, session, profile navigation, logout, and login work through the browser', async ({ page }) => {
  const account = uniqueAccount('auth');
  const registrationToken = await registerViaUi(page, account);

  await expect(page.locator('#composer')).toBeVisible();
  await page.locator('button[data-view="profile"]').first().click();
  await expect(page.locator('#profile')).toBeVisible();
  await expect(page.locator('#profile [name="displayName"]')).toHaveValue(account.username);

  const me = await authFetch(page, '/api/me');
  expect(me.status).toBe(200);
  expect(me.body.user.username).toBe(account.username);

  await page.locator('#logout').click();
  await expect(page.locator('#signin')).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('sylora_token'))).toBeNull();

  const loginToken = await loginViaUi(page, account);
  expect(loginToken).toBeTruthy();
  expect(loginToken).not.toBe(registrationToken);
  await page.locator('button[data-view="live"]').first().click();
  await expect(page.locator('[data-live-tab="discover"]')).toBeVisible();

  await page.locator('#logout').click();
  await expect(page.locator('#signin')).toBeVisible();
});
