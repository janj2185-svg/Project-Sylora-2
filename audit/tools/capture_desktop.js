import puppeteer from 'puppeteer';
import path from 'path';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function captureDesktop() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    
    const shots = [
      { name: '20-agents.png', url: 'http://127.0.0.1:8787/agents' },
      { name: '21-developer.png', url: 'http://127.0.0.1:8787/developer' },
      { name: '22-security.png', url: 'http://127.0.0.1:8787/security' },
      { name: '23-canvas.png', url: 'http://127.0.0.1:8787/canvas' },
      { name: '24-videos.png', url: 'http://127.0.0.1:8787/videos' }
    ];
    
    const outputDir = '/workspace/audit/screenshots/desktop';
    
    for (const shot of shots) {
      console.log(`Capturing ${shot.name}...`);
      await page.goto(shot.url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await wait(1000);
      
      const outputPath = path.join(outputDir, shot.name);
      await page.screenshot({ path: outputPath, fullPage: true });
      console.log(`Saved ${outputPath}`);
    }
    
    console.log('\nAll desktop screenshots captured!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

captureDesktop();
