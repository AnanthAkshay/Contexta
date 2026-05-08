const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', '..', 'assets', 'screenshots');
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  const browser = await puppeteer.launch({
    headless: "new"
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932 }); // iPhone 14 Pro Max size

  console.log('Navigating to http://localhost:8081...');
  
  let connected = false;
  for (let i = 0; i < 30; i++) {
    try {
      await page.goto('http://localhost:8081', { waitUntil: 'networkidle0', timeout: 5000 });
      connected = true;
      break;
    } catch (e) {
      console.log('Waiting for server...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  if (!connected) {
    console.error('Failed to connect to dev server');
    process.exit(1);
  }

  console.log('Page loaded, preparing to take dynamic screenshots...');
  await new Promise(resolve => setTimeout(resolve, 2000)); // wait for animations

  // 1. context_tab.png (Initial state)
  await page.screenshot({ path: path.join(screenshotsDir, 'context_tab.png') });
  console.log('Saved context_tab.png');

  // Helper to click text
  const clickText = async (text) => {
    try {
      await page.evaluate((t) => {
        const elements = Array.from(document.querySelectorAll('*'));
        for (let el of elements) {
          if (el.textContent === t && el.children.length === 0) {
            // Find closest clickable (cursor: pointer, or role="button", or tabIndex)
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

  // 2. signal_monitor.png (After Inject Meeting)
  await clickText('⚡ Inject');
  await page.screenshot({ path: path.join(screenshotsDir, 'signal_monitor.png') });
  console.log('Saved signal_monitor.png');

  // 3. override_panel.png (After Override)
  await clickText('🔔 Override');
  await page.screenshot({ path: path.join(screenshotsDir, 'override_panel.png') });
  console.log('Saved override_panel.png');

  // 4. audit_log.png (After some movement and scrolling down)
  await clickText('🚶 Walking');
  // Scroll down to see logs
  await page.evaluate(() => {
    window.scrollBy(0, 500);
    const scrollables = document.querySelectorAll('div[style*="overflow"]');
    for (let s of scrollables) { s.scrollTop += 500; }
  });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, 'audit_log.png') });
  console.log('Saved audit_log.png');

  // 5. home_summary.png (After Home inject)
  // scroll back up
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    const scrollables = document.querySelectorAll('div[style*="overflow"]');
    for (let s of scrollables) { s.scrollTop = 0; }
  });
  await new Promise(r => setTimeout(r, 1000));
  await clickText('🏠 Home');
  await page.screenshot({ path: path.join(screenshotsDir, 'home_summary.png') });
  console.log('Saved home_summary.png');

  // 6. classifier_debug.png (Settings page)
  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle0' });
  await new Promise(resolve => setTimeout(resolve, 1500));
  await page.screenshot({ path: path.join(screenshotsDir, 'classifier_debug.png') });
  console.log('Saved classifier_debug.png');

  await browser.close();
  console.log('Done taking unique screenshots!');
}

run().catch(console.error);
