import puppeteer from 'puppeteer';

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function checkConsole() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    
    const consoleMessages = [];
    const errors = [];
    const warnings = [];
    
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      const location = msg.location();
      
      // Filter out browser extension messages
      if (text.includes('extension') || text.includes('Extension') || 
          location.url?.includes('extension') || location.url?.includes('chrome://')) {
        return;
      }
      
      // Only capture product errors (from sylora/localhost files)
      if (location.url && (location.url.includes('127.0.0.1') || location.url.includes('localhost'))) {
        const entry = {
          type: type,
          text: text,
          url: location.url,
          lineNumber: location.lineNumber
        };
        
        if (type === 'error') {
          errors.push(entry);
        } else if (type === 'warning') {
          warnings.push(entry);
        }
        consoleMessages.push(entry);
      }
    });
    
    page.on('pageerror', error => {
      errors.push({
        type: 'pageerror',
        text: error.message,
        stack: error.stack
      });
    });
    
    console.log('Checking console on home page...');
    await page.goto('http://127.0.0.1:8787/more', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(3000);
    
    console.log('Checking console on live page...');
    await page.goto('http://127.0.0.1:8787/live', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(3000);
    
    console.log('Checking console on gifts page...');
    await page.goto('http://127.0.0.1:8787/gifts', { waitUntil: 'domcontentloaded', timeout: 10000 });
    await wait(3000);
    
    console.log('\n=== CONSOLE REPORT ===\n');
    console.log(`Total messages: ${consoleMessages.length}`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    
    if (errors.length > 0) {
      console.log('\n--- ERRORS ---');
      errors.forEach((err, idx) => {
        console.log(`\n${idx + 1}. ${err.type.toUpperCase()}`);
        console.log(`   Message: ${err.text}`);
        if (err.url) console.log(`   File: ${err.url}:${err.lineNumber || 'N/A'}`);
        if (err.stack) console.log(`   Stack: ${err.stack.substring(0, 200)}...`);
      });
    } else {
      console.log('\nNo product console errors found.');
    }
    
    if (warnings.length > 0) {
      console.log('\n--- WARNINGS ---');
      warnings.slice(0, 5).forEach((warn, idx) => {
        console.log(`\n${idx + 1}. ${warn.text}`);
        if (warn.url) console.log(`   File: ${warn.url}:${warn.lineNumber || 'N/A'}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await browser.close();
  }
}

checkConsole();
