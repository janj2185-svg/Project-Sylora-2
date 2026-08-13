import puppeteer from 'puppeteer';
import path from 'path';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureTablet() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 768, height: 1024 });
    
    const shots = [
      { name: 'tablet-home.png', url: 'http://127.0.0.1:8787/more' },
      { name: 'tablet-live.png', url: 'http://127.0.0.1:8787/live' }
    ];
    
    for (const shot of shots) {
      console.log(`Capturing ${shot.name}...`);
      await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(1000);
      
      const outputPath = path.join('/workspace/audit/screenshots/mobile', shot.name);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`Saved ${outputPath}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureTablet();
