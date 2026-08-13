import puppeteer from 'puppeteer';
import path from 'path';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function capture360() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 360, height: 800 });
    
    console.log('Capturing 11-home-360.png...');
    await page.goto('http://127.0.0.1:8787/more', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(1000);
    
    const outputPath = '/workspace/audit/screenshots/mobile/11-home-360.png';
    await page.screenshot({ path: outputPath, fullPage: true });
    console.log(`Saved ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

capture360();
