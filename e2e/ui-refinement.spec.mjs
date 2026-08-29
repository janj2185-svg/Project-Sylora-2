import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { expectNoHorizontalOverflow, registerViaUi, uniqueAccount } from './helpers.mjs';

const qaDir='tmp/ui-qa';
fs.mkdirSync(qaDir,{recursive:true});

const canonicalLogo='/assets/brand/canonical/SYLORA_CANONICAL_LOGO_MASTER.png';
const canonicalLogoSha256='dc50f228968b2cebe46a2030cb5b22789482f680caca58171f06b0f25db40f08';
const canonicalLockup='/assets/brand/sylora-canonical-lockup.png';
const canonicalLockupSha256='061430e7d2fceefb660d049838603cffc0f30433a704dd3eb239b9f59e57fa50';
const canonicalSymbol='/assets/brand/sylora-canonical-symbol.png';
const canonicalSymbolSha256='9975f9f178eee4cf747f258e68d268ef512b4786342aee45bf932e8a2f941df1';

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
  await expect(page.locator('.home-screen .hero-copy')).toBeVisible();
  await expect(page.locator('#localeSwitch')).toHaveCount(1);
}

async function selectLocaleFromSettings(page,locale){
  await page.goto('/more');
  const selector=page.locator('#settingsLocaleSwitch');
  await expect(selector).toBeVisible();
  await selector.selectOption(locale);
  await expect(page.locator('html')).toHaveAttribute('lang',locale);
  await page.goto('/');
  await expect(page.locator('.home-screen .hero-copy')).toBeVisible();
}

test('master brand, five-language selector, persistence and ecosystem-first Home render',async({page})=>{
  await page.setViewportSize({width:1366,height:900});
  await waitBoot(page);

  const desktopBrand=page.locator('.brand-zone .brand-lockup-full');
  const mobileBrand=page.locator('.mobile-brand .brand-lockup-symbol');
  await expect(desktopBrand).toHaveAttribute('src',canonicalLockup);
  await expect(desktopBrand).toHaveAttribute('data-brand-sha256',canonicalLockupSha256);
  await expect(desktopBrand).toHaveAttribute('alt','SYLORA — YOUR AI. YOUR WORLD. YOUR LEGACY.');
  await expect(mobileBrand).toHaveAttribute('src',canonicalSymbol);
  await expect(mobileBrand).toHaveAttribute('data-brand-sha256',canonicalSymbolSha256);
  await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href',canonicalSymbol);

  const values=await page.locator('#localeSwitch option').evaluateAll(options=>options.map(option=>option.value));
  const labels=await page.locator('#localeSwitch option').evaluateAll(options=>options.map(option=>option.textContent));
  expect(values).toEqual(['uk','en','pl','de','ru']);
  expect(labels).toEqual(['UA','EN','PL','DE','RU']);

  await expect(page.locator('.sylora-presence,.sylora-mini,.ai-rail')).toHaveCount(0);
  await expect(page.locator('.mobile-dock [data-view="ai"]')).toHaveCount(1);
  await expect(page.locator('.mobile-dock [data-create-hub]')).toHaveCount(0);
  const integrations=page.locator('[data-integration-view="studio"] .platform-pills i');
  await expect(integrations).toHaveCount(4);
  expect(await integrations.allTextContents()).toEqual(['TikTok','YouTube','OBS','TikFinity']);
  await expect(page.locator('.home-horizon-scene')).toBeVisible();
  expect(await page.locator('.home-horizon-orbit--one').evaluate(element=>getComputedStyle(element).animationName)).toBe('home-orbit-one');

  for(const [locale,home] of Object.entries(localeExpectations)){
    await selectLocaleFromSettings(page,locale);
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

test('Settings exposes the same five persisted interface languages',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await waitBoot(page);
  await page.goto('/more');
  await expect(page.locator('body')).toHaveAttribute('data-view','more');
  const selector=page.locator('#settingsLocaleSwitch');
  await expect(selector).toBeVisible();
  await expect(selector.locator('option')).toHaveCount(5);
  await selector.selectOption('pl');
  await expect(page.locator('html')).toHaveAttribute('lang','pl');
  await expect(page.locator('#languageSettings h1')).toHaveText('Język interfejsu');
});

test('all required responsive widths have no accidental horizontal overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await waitBoot(page);
  await selectLocaleFromSettings(page,'uk');
  for(const width of [320,390,430,768,1024,1366,1920]){
    await page.setViewportSize({width,height:Math.min(1080,Math.max(700,Math.round(width*.75)))});
    await waitBoot(page);
    await expectNoHorizontalOverflow(page);
    if(width<=767){
      await expect(page.locator('.mobile-dock')).toBeVisible();
      await expect(page.locator('#mobileMenu')).toBeVisible();
      await expect(page.locator('.mobile-brand .brand-lockup-symbol')).toBeVisible();
      await expect(page.locator('#localeSwitch')).toBeHidden();
    }else if(width<=1099){
      await expect(page.locator('.left-rail')).toBeVisible();
      await expect(page.locator('.brand-zone .brand-lockup-symbol')).toBeVisible();
      await expect(page.locator('.mobile-dock')).toBeHidden();
    }else{
      await expect(page.locator('.left-rail')).toBeVisible();
      await expect(page.locator('.brand-zone .brand-lockup-full')).toBeVisible();
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
  const hero=page.locator('.home-screen .hero-copy');
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
  await expect(page.locator('.studio-stage.program-canvas')).toBeVisible();
  await expect(page.locator('.studio-controls')).toBeVisible();
  const desktopStage=await page.locator('.studio-stage.program-canvas').boundingBox();
  const desktopControls=await page.locator('.studio-controls').boundingBox();
  expect(desktopStage?.width).toBeGreaterThan(desktopControls?.width||0);

  await page.setViewportSize({width:390,height:844});
  await page.emulateMedia({reducedMotion:'reduce'});
  await expect(page.locator('.studio-mobile-tools')).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const intelSelect=page.locator('#creatorLiveSelect');
  const intelButton=page.locator('#creatorInsightsBtn');
  const [intelSelectBox,intelButtonBox]=await Promise.all([intelSelect.boundingBox(),intelButton.boundingBox()]);
  expect((intelSelectBox?.y||0)+(intelSelectBox?.height||0)).toBeLessThanOrEqual(intelButtonBox?.y||0);
  const tools=page.locator('.studio-mobile-tools button[data-studio-tool]');
  await expect(tools).toHaveCount(8);
  const distributionTool=page.locator('.studio-mobile-tools button[data-studio-tool="distribution"]');
  await expect(distributionTool).toBeVisible();
  await distributionTool.click();
  await expect(page.locator('.studio-controls>.card[data-studio-panel="distribution"]')).toHaveAttribute('data-studio-open','true');
  const sourcesTool=page.locator('.studio-mobile-tools button[data-studio-tool="sources"]');
  await sourcesTool.scrollIntoViewIfNeeded();
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
  expect(await page.locator('.hero-copy h1').evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);

  await page.goto('/ai');
  await expect(page.locator('body')).toHaveAttribute('data-view','ai');
  await expect(page.locator('.sylora-ai-hero.ai-presence-container')).toBeVisible();
  await expect(page.locator('#aiVisualToggle')).toHaveText('Сховати Sylora');
  await page.locator('#aiVisualToggle').click();
  await expect(page.locator('.sylora-ai-hero')).toHaveClass(/sylora-visual-hidden/);
  await expect(page.locator('.sylora-avatar-motion')).toBeHidden();
  expect((await page.locator('.sylora-ai-hero').boundingBox())?.height).toBeLessThanOrEqual(360);
  await page.locator('#aiVisualToggle').click();
  await expect(page.locator('.sylora-ai-hero')).not.toHaveClass(/sylora-visual-hidden/);
  await expect(page.locator('.sylora-avatar-motion')).toBeVisible();
  await expect(page.locator('.sylora-avatar-motion')).toHaveAttribute('data-avatar-version','2.1.0');
  await expect(page.locator('.sylora-avatar-motion')).toHaveAttribute('data-render-mode','single-plate-2d');
  await expect(page.locator('.sylora-avatar-frame')).toHaveCount(1);
  await expect(page.locator('.sylora-avatar-gesture')).toHaveCount(0);
  await expect.poll(()=>page.locator('.sylora-avatar-frame').evaluate(image=>({
    complete:image.complete,
    width:image.naturalWidth,
    height:image.naturalHeight,
    frame:image.dataset.frame
  }))).toEqual({complete:true,width:940,height:1254,frame:'neutral'});
  const mobilePresenceLayout=await page.locator('.sylora-ai-hero').evaluate(hero=>{
    const visible=node=>getComputedStyle(node).display!=='none';
    const copy=[...hero.querySelectorAll(':scope > .eyebrow,:scope > h1,:scope > p,:scope > .sy-ai-context-status')].filter(visible);
    const avatar=hero.querySelector('.sylora-avatar-motion')?.getBoundingClientRect();
    return{avatarTop:avatar?.top??0,copyBottom:Math.max(...copy.map(node=>node.getBoundingClientRect().bottom))};
  });
  expect(mobilePresenceLayout.avatarTop).toBeGreaterThanOrEqual(mobilePresenceLayout.copyBottom+8);
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
    ['studio','.studio-stage.program-canvas','studio'],
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
