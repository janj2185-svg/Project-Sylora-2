import puppeteer from 'puppeteer';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testGifts() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    console.log('Navigating to gifts page...');
    await page.goto('http://127.0.0.1:8787/gifts', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(2000);
    
    // Take initial screenshot
    await page.screenshot({ path: '/workspace/audit/screenshots/desktop/25-gifts-initial.png', fullPage: true });
    console.log('Initial gifts page captured');
    
    // Try to find and click on recipient selector or Crystal Star
    const selectors = [
      'button:has-text("Crystal Star")',
      '[data-gift-id]',
      '.gift-item',
      'button.gift',
      '[class*="gift"]'
    ];
    
    for (const selector of selectors) {
      try {
        const element = await page.$(selector);
        if (element) {
          console.log(`Found element with selector: ${selector}`);
          await element.click();
          await wait(1000);
          await page.screenshot({ path: '/workspace/audit/screenshots/desktop/26-gifts-interaction.png', fullPage: true });
          console.log('Interaction captured');
          break;
        }
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // Take final screenshot
    await page.screenshot({ path: '/workspace/audit/screenshots/desktop/27-gifts-final.png', fullPage: true });
    console.log('Final gifts page captured');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

testGifts();
