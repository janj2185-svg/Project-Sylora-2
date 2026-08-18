import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, registerViaUi, uniqueAccount } from './helpers.mjs';

const qaDir='tmp/ui-qa';
fs.mkdirSync(qaDir,{recursive:true});

const localeExpectations={
  uk:'Головна',
  en:'Home',
  pl:'Główna',
  de:'Start',
  ru:'Главная'
};

async function waitBoot(page){
  await page.goto('/');
  await expect(page.locator('body')).toHaveAttribute('data-view','feed');
  await expect(page.locator('.living-horizon.home-compact')).toBeVisible();
  await expect(page.locator('#localeSwitch')).toBeVisible();
}

test('master brand, five-language selector, persistence and ecosystem-first Home render',async({page})=>{
  await page.setViewportSize({width:1366,height:900});
  await waitBoot(page);

  await expect(page.locator('.brand img')).toHaveAttribute('src','/assets/sylora-mark-v2.svg');
  await expect(page.locator('.brand-copy small')).toHaveText('YOUR AI. YOUR WORLD. YOUR LEGACY.');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href','/assets/sylora-app-icon.svg');

  const values=await page.locator('#localeSwitch option').evaluateAll(options=>options.map(option=>option.value));
  const labels=await page.locator('#localeSwitch option').evaluateAll(options=>options.map(option=>option.textContent));
  expect(values).toEqual(['uk','en','pl','de','ru']);
  expect(labels).toEqual(['UA','EN','PL','DE','RU']);

  const presence=page.locator('.sylora-presence');
  await expect(presence).toBeVisible();
  const presenceBox=await presence.boundingBox();
  expect(presenceBox?.height).toBeLessThanOrEqual(58);
  const imageStyle=await page.locator('.sylora-presence-image').evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(imageStyle).toContain('sylora-mark-v2.svg');

  for(const [locale,home] of Object.entries(localeExpectations)){
    await page.locator('#localeSwitch').selectOption(locale);
    await expect(page.locator('html')).toHaveAttribute('lang',locale);
    await expect(page.locator('button[data-view="feed"]').first()).toHaveText(home);
    expect(await page.evaluate(()=>localStorage.getItem('sylora_locale'))).toBe(locale);
  }

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang','ru');
  await expect(page.locator('#localeSwitch')).toHaveValue('ru');
  await expect(page.locator('button[data-view="feed"]').first()).toHaveText('Главная');
  await expect(page.locator('#syloraDegraded')).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:`${qaDir}/home-1366-ru.png`,fullPage:true});
});

test('all required responsive widths have no accidental horizontal overflow',async({page})=>{
  for(const width of [320,390,430,768,1024,1366,1920]){
    await page.setViewportSize({width,height:Math.min(1080,Math.max(700,Math.round(width*.75)))});
    await waitBoot(page);
    await expectNoHorizontalOverflow(page);
    if(width<=900){
      await expect(page.locator('.mobile-dock')).toBeVisible();
      await expect(page.locator('.left-rail')).toBeHidden();
      await expect(page.locator('#localeSwitch')).toBeVisible();
    }else{
      await expect(page.locator('.left-rail')).toBeVisible();
      await expect(page.locator('.mobile-dock')).toBeHidden();
    }
    if(width===320)await page.screenshot({path:`${qaDir}/home-320-uk.png`,fullPage:true});
    if(width===390)await page.screenshot({path:`${qaDir}/home-390-uk.png`,fullPage:true});
    if(width===1920)await page.screenshot({path:`${qaDir}/home-1920-uk.png`,fullPage:true});
  }
});

test('mobile Home collapses after engagement and remains compact on revisit',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await waitBoot(page);
  const hero=page.locator('.living-horizon.home-compact');
  const before=await hero.boundingBox();
  await page.mouse.wheel(0,180);
  await expect(page.locator('body')).toHaveClass(/sy-home-engaged/);
  const after=await hero.boundingBox();
  expect(after?.height).toBeLessThan(before?.height||9999);
  expect(await page.evaluate(()=>localStorage.getItem('sylora_home_engaged_v1'))).toBe('1');
  await page.reload();
  await expect(page.locator('body')).toHaveClass(/sy-home-engaged/);
});

test('Studio is preview-first on desktop and sheet-driven on mobile',async({page})=>{
  const account=uniqueAccount('ui');
  await page.setViewportSize({width:1366,height:900});
  await registerViaUi(page,account);
  await page.locator('button[data-view="studio"]:visible').first().click();
  await expect(page.locator('body')).toHaveAttribute('data-view','studio');
  await expect(page.locator('.studio-stage')).toBeVisible();
  await expect(page.locator('.studio-controls')).toBeVisible();
  const desktopStage=await page.locator('.studio-stage').boundingBox();
  const desktopControls=await page.locator('.studio-controls').boundingBox();
  expect(desktopStage?.width).toBeGreaterThan(desktopControls?.width||0);

  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.studio-mobile-tools')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const tools=page.locator('.studio-mobile-tools button[data-studio-tool]');
  await expect(tools).toHaveCount(7);
  await page.locator('.studio-mobile-tools button[data-studio-tool="sources"]').click();
  await expect(page.locator('.studio-controls>.card[data-studio-panel="sources"]')).toHaveAttribute('data-studio-open','true');
  await expect(page.locator('body')).toHaveClass(/sy-studio-sheet-open/);
  await page.screenshot({path:`${qaDir}/studio-390-sheet.png`,fullPage:true});
});

test('AI outage is contextual and LIVE state styling follows actual status text',async({page})=>{
  const account=uniqueAccount('presence');
  await page.setViewportSize({width:390,height:844});
  await registerViaUi(page,account);

  await page.locator('.mobile-dock button[data-view="ai"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-view','ai');
  await expect(page.locator('.sylora-ai-hero.ai-presence-container')).toBeVisible();
  const source=page.locator('#syloraDegraded');
  await expect(source).toBeHidden();

  await page.locator('.mobile-dock button[data-view="live"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-view','live');
  await expect(page.locator('#syloraDegraded')).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:`${qaDir}/live-390-hub.png`,fullPage:true});
});
