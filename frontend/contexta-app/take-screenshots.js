const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', '..', 'assets', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932 });

  let connected = false;
  for (let i = 0; i < 30; i++) {
    try {
      await page.goto('http://localhost:8081', { waitUntil: 'networkidle0', timeout: 5000 });
      connected = true;
      break;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!connected) {
    console.error('Failed to connect to dev server');
    process.exit(1);
  }

  await new Promise(r => setTimeout(r, 2000));
  
  await page.screenshot({ path: path.join(screenshotsDir, 'context_tab.png') });
  console.log('Saved context_tab.png');

  const clickText = async (text) => {
    try {
      await page.evaluate((t) => {
        const elements = Array.from(document.querySelectorAll('*'));
        for (let el of elements) {
          if (el.textContent === t && el.children.length === 0) {
            let curr = el;
            while(curr && curr !== document.body) {
              curr.click();
              curr = curr.parentElement;
            }
            break;
          }
        }
      }, text);
    } catch(e) { console.error('Click error', e); }
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  await clickText('⚡ Inject');
  await page.screenshot({ path: path.join(screenshotsDir, 'signal_monitor.png') });
  console.log('Saved signal_monitor.png');

  await clickText('🔔 Override');
  await page.screenshot({ path: path.join(screenshotsDir, 'override_panel.png') });
  console.log('Saved override_panel.png');

  await clickText('🚶 Walking');
  await page.evaluate(() => {
    window.scrollBy(0, 500);
    const scrollables = document.querySelectorAll('div[style*="overflow"]');
    for (let s of scrollables) { s.scrollTop += 500; }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, 'audit_log.png') });
  console.log('Saved audit_log.png');

  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const scrollables = document.querySelectorAll('div[style*="overflow"]');
    for (let s of scrollables) { s.scrollTop = 0; }
  });
  await new Promise(r => setTimeout(r, 1000));
  await clickText('🏠 Home');
  await page.screenshot({ path: path.join(screenshotsDir, 'home_summary.png') });
  console.log('Saved home_summary.png');

  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.screenshot({ path: path.join(screenshotsDir, 'classifier_debug.png') });
  console.log('Saved classifier_debug.png');

  await browser.close();
}

run().catch(console.error);
