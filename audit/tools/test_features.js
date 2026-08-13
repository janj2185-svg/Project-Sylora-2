import puppeteer from 'puppeteer';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testFeatures() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Test mobile view for dock
    console.log('\n=== MOBILE VIEW TESTING (390x844) ===');
    await page.setViewport({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:8787/more', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(2000);
    
    // Check for mobile dock
    const dockSelectors = [
      '[class*="mobile-dock"]',
      '[class*="bottom-nav"]',
      '[class*="mobile-nav"]',
      'nav[class*="dock"]',
      '.dock'
    ];
    
    let dockFound = false;
    for (const selector of dockSelectors) {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isIntersectingViewport();
        console.log(`✓ Mobile dock found: ${selector} (visible: ${isVisible})`);
        dockFound = true;
        break;
      }
    }
    if (!dockFound) {
      console.log('✗ Mobile dock not found with common selectors');
    }
    
    // Check for left sidebar
    const sidebarSelectors = [
      'aside',
      '[class*="sidebar"]',
      'nav.sidebar',
      '.side-nav'
    ];
    
    let sidebarVisible = false;
    for (const selector of sidebarSelectors) {
      const element = await page.$(selector);
      if (element) {
        const isVisible = await element.isIntersectingViewport();
        if (isVisible) {
          sidebarVisible = true;
          console.log(`! Left sidebar is visible on mobile: ${selector}`);
          break;
        }
      }
    }
    if (!sidebarVisible) {
      console.log('✓ Left sidebar hidden on mobile (correct)');
    }
    
    // Check for horizontal scroll
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    console.log(`Horizontal scroll: ${hasHorizontalScroll ? '✗ YES (issue)' : '✓ NO (good)'}`);
    
    // Test language switcher
    console.log('\n=== LANGUAGE SWITCHER TESTING ===');
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto('http://127.0.0.1:8787/more', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(2000);
    
    const langSelectors = [
      '[class*="language"]',
      '[data-lang]',
      'button:has-text("UA")',
      'button:has-text("EN")',
      '.lang-switch'
    ];
    
    let langSwitcherFound = false;
    for (const selector of langSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✓ Language switcher found: ${selector}`);
          langSwitcherFound = true;
          
          // Try clicking it
          await element.click();
          await wait(1000);
          await page.screenshot({ path: '/workspace/audit/screenshots/desktop/28-lang-switcher.png', fullPage: false });
          console.log('✓ Language switcher clicked, screenshot saved');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    if (!langSwitcherFound) {
      console.log('✗ Language switcher not found');
    }
    
    // Test Create Hub
    console.log('\n=== CREATE HUB TESTING ===');
    await page.goto('http://127.0.0.1:8787/more', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(2000);
    
    const createSelectors = [
      'button:has-text("Create")',
      '[data-create]',
      '.create-button',
      '[class*="create"]',
      'button[aria-label*="create"]'
    ];
    
    let createFound = false;
    for (const selector of createSelectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`✓ Create button found: ${selector}`);
          createFound = true;
          
          // Try clicking it
          await element.click();
          await wait(1000);
          await page.screenshot({ path: '/workspace/audit/screenshots/desktop/29-create-hub.png', fullPage: false });
          console.log('✓ Create Hub opened, screenshot saved');
          break;
        }
      } catch (e) {
        // Continue
      }
    }
    if (!createFound) {
      console.log('✗ Create Hub button not found');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testFeatures();
