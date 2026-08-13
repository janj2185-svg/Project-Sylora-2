import puppeteer from 'puppeteer';
import path from 'path';

const screenshots = [
  { name: '01-home.png', url: 'http://127.0.0.1:8787/more' },
  { name: '02-live.png', url: 'http://127.0.0.1:8787/live' },
  { name: '03-ai.png', url: 'http://127.0.0.1:8787/ai' },
  { name: '04-messages.png', url: 'http://127.0.0.1:8787/messages' },
  { name: '05-profile.png', url: 'http://127.0.0.1:8787/profile' },
  { name: '06-more.png', url: 'http://127.0.0.1:8787/more' },
  { name: '07-studio.png', url: 'http://127.0.0.1:8787/studio' },
  { name: '08-gifts.png', url: 'http://127.0.0.1:8787/gifts' },
  { name: '09-learning.png', url: 'http://127.0.0.1:8787/learning' },
  { name: '10-business.png', url: 'http://127.0.0.1:8787/business' }
];

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureScreenshots() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    
    const outputDir = '/workspace/audit/screenshots/mobile';
    
    for (const shot of screenshots) {
      console.log(`Capturing ${shot.name}...`);
      try {
        await page.goto(shot.url, { waitUntil: 'networkidle0', timeout: 10000 });
      } catch (e) {
        await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      }
      await wait(1000);
      
      const outputPath = path.join(outputDir, shot.name);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`Saved ${outputPath}`);
    }
    
    console.log('\nAll mobile screenshots captured!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
