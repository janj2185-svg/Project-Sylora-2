import { test, expect } from '@playwright/test';
import { authFetch, loginViaUi, registerViaUi, uniqueAccount } from './helpers.mjs';

test('desktop registration explains invalid fields before sending a request',async({page})=>{
  await page.addInitScript(()=>localStorage.setItem('sylora_locale','uk'));
  const authRequests=[];
  page.on('request',request=>{if(/\/api\/auth\/(register|login)$/.test(request.url()))authRequests.push(request.url())});
  await page.goto('/');
  await page.locator('#signin').click();
  await page.locator('#authForm [name="username"]').fill('Іван');
  await page.locator('#authForm [name="email"]').fill('ivan@example.com');
  await page.locator('#authForm [name="password"]').fill('password123');
  await page.locator('#authSubmit').click();
  await expect(page.locator('#authError')).toBeVisible();
  await expect(page.locator('#authError')).toContainText('латинських');
  await expect(page.locator('#authForm [name="username"]')).toHaveAttribute('aria-invalid','true');
  expect(authRequests).toHaveLength(0);

  await page.locator('#authForm [name="username"]').fill('ivan_user');
  await page.locator('#authForm [name="password"]').fill('onlyletters');
  await page.locator('#authSubmit').click();
  await expect(page.locator('#authError')).toContainText('одну цифру');
  await expect(page.locator('#authForm [name="password"]')).toHaveAttribute('aria-invalid','true');
  expect(authRequests).toHaveLength(0);
});

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
