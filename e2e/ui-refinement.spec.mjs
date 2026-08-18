import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, registerViaUi, uniqueAccount } from './helpers.mjs';

const qaDir='tmp/ui-qa';
fs.mkdirSync(qaDir,{recursive:true});

const canonicalLogo='/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
const canonicalLogoSha256='dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08';

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

  await expect(page.locator('.brand img')).toHaveAttribute('src',canonicalLogo);
  await expect(page.locator('.brand img')).toHaveAttribute('data-brand-sha256',canonicalLogoSha256);
  await expect(page.locator('.brand img')).toHaveAttribute('alt','SYLORA — YOUR AI. YOUR WORLD. YOUR LEGACY.');
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',canonicalLogo);

  const values=await page.locator('#localeSwitch option').evaluateAll(options=>options.map(option=>option.value));
  const labels=await page.locator('#localeSwitch option').evaluateAll(options=>options.map(option=>option.textContent));
  expect(values).toEqual(['uk','en','pl','de','ru']);
  expect(labels).toEqual(['UA','EN','PL','DE','RU']);

  const presence=page.locator('.sylora-presence');
  await expect(presence).toBeVisible();
  const presenceBox=await presence.boundingBox();
  expect(presenceBox?.height).toBeLessThanOrEqual(58);
  const imageStyle=await page.locator('.sylora-presence-image').evaluate(el=>getComputedStyle(el).backgroundImage);
  expect(imageStyle).toContain(canonicalLogo);

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
  await page.setViewportSize({width:390,height:844});
  await waitBoot(page);
  await page.locator('#localeSwitch').selectOption('uk');
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
  const sourcesTool=page.locator('.studio-mobile-tools button[data-studio-tool="sources"]');
  const sourcesBox=await sourcesTool.boundingBox();
  expect(sourcesBox?.x).toBeGreaterThanOrEqual(0);
  expect((sourcesBox?.x||0)+(sourcesBox?.width||0)).toBeLessThanOrEqual(390);
  await sourcesTool.click();
  await expect(page.locator('.studio-controls>.card[data-studio-panel="sources"]')).toHaveAttribute('data-studio-open','true');
  await expect(page.locator('body')).toHaveClass(/sy-studio-sheet-open/);
  await page.screenshot({path:`${qaDir}/studio-390-sheet.png`,fullPage:true});
});

test('AI outage is contextual and LIVE state styling follows actual status text',async({page})=>{
  test.setTimeout(120000);
  const account=uniqueAccount('presence');
  await page.setViewportSize({width:390,height:844});
  await registerViaUi(page,account);
  expect(await page.locator('.horizon-copy h1').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);

  await page.locator('.mobile-dock button[data-view="ai"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-view','ai');
  await expect(page.locator('.sylora-ai-hero.ai-presence-container')).toBeVisible();
  const source=page.locator('#syloraDegraded');
  await expect(source).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:`${qaDir}/ai-390-presence.png`,fullPage:true});

  await page.locator('.mobile-dock button[data-view="live"]').click();
  await expect(page.locator('body')).toHaveAttribute('data-view','live');
  await expect(page.locator('.live-tabs')).toBeVisible();
  await expect(page.locator('#syloraDegraded')).toBeHidden();
  await expectNoHorizontalOverflow(page);
  await page.screenshot({path:`${qaDir}/live-390-hub.png`,fullPage:true});

  for(const [view,ready,name] of [
    ['messages','.messages-hero','inbox'],
    ['profile','.profile-hero','profile'],
    ['more','.settings-scene','settings']
  ]){
    await page.goto(`/${view}`);
    await expect(page.locator('body')).toHaveAttribute('data-view',view);
    await expect(page.locator(ready)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    if(view==='profile'){
      const values=await page.locator('#profile select[name="locale"] option').evaluateAll(options=>options.map(option=>option.value));
      expect(values).toEqual(['uk','en','pl','de','ru']);
      expect(await page.locator('.profile-hero h1').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
    }
    await page.screenshot({path:`${qaDir}/${name}-390.png`,fullPage:true});
  }

  await page.setViewportSize({width:1366,height:900});
  for(const [view,ready,name] of [
    ['ai','.sylora-ai-hero.ai-presence-container','ai'],
    ['live','.live-tabs','live'],
    ['studio','.studio-stage','studio'],
    ['messages','.messages-hero','inbox'],
    ['profile','.profile-hero','profile'],
    ['more','.settings-scene','settings']
  ]){
    await page.goto(`/${view}`);
    await expect(page.locator('body')).toHaveAttribute('data-view',view);
    await expect(page.locator(ready)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await page.screenshot({path:`${qaDir}/${name}-1366.png`,fullPage:true});
  }
});

test('standalone Phoenix preview uses the immutable canonical brand',async({page})=>{
  const pageErrors=[];
  const consoleErrors=[];
  page.on('pageerror',error=>pageErrors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text())});
  for(const [width,height] of [[390,844],[1366,900]]){
    await page.setViewportSize({width,height});
    await page.goto('/phoenix-preview.html');
    const brand=page.locator('.preview-head .brand-mark');
    await expect(brand).toBeVisible();
    await expect(brand).toHaveAttribute('src',canonicalLogo);
    await expect(brand).toHaveAttribute('data-brand-sha256',canonicalLogoSha256);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',canonicalLogo);
    await expect(page.locator('#recordingDownload')).toBeHidden();
    await expect.poll(()=>brand.evaluate(image=>({width:image.naturalWidth,height:image.naturalHeight}))).toEqual({width:1100,height:650});
    await expectNoHorizontalOverflow(page);
    await page.screenshot({path:`${qaDir}/phoenix-preview-${width}.png`,fullPage:true,animations:'disabled'});
  }
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
});
