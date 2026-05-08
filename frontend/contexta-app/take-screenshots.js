const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function run() {
  const screenshotsDir = path.join(__dirname, '..', '..', 'assets', 'screenshots');
  
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 430, height: 932 });

  await page.goto('http://localhost:8081', { waitUntil: 'networkidle0' });
  
  // Wait 4 seconds for the auto-injected events to complete (Meeting, Override, Walking, Home)
  await new Promise(r => setTimeout(r, 4000));

  // 1. context_tab.png (Top of the page)
  await page.screenshot({ path: path.join(screenshotsDir, 'context_tab.png') });

  // 2. signal_monitor.png (Meeting Card area)
  await page.evaluate(() => window.scrollBy(0, 100));
  await page.screenshot({ path: path.join(screenshotsDir, 'signal_monitor.png') });

  // 3. home_summary.png (Home Card area)
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.screenshot({ path: path.join(screenshotsDir, 'home_summary.png') });

  // 4. override_panel.png (Scroll down a bit)
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.screenshot({ path: path.join(screenshotsDir, 'override_panel.png') });

  // 5. audit_log.png (Bottom of the page)
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const scrollers = document.querySelectorAll('div[style*="overflow"]');
    for (let s of scrollers) { s.scrollTop = s.scrollHeight; }
  });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: path.join(screenshotsDir, 'audit_log.png') });

  // 6. classifier_debug.png
  await page.goto('http://localhost:8081/settings', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: path.join(screenshotsDir, 'classifier_debug.png') });

  await browser.close();
  console.log('Done capturing auto-injected screenshots!');
}

run().catch(console.error);
