const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Set mobile viewport
  await page.setViewport({
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
  });

  // Capture console messages and errors
  page.on('console', msg => console.log('BROWSER LOG:', msg.type().toUpperCase(), msg.text()));
  page.on('pageerror', err => console.log('BROWSER ERROR:', err));
  page.on('error', err => console.log('PAGE ERROR:', err));

  try {
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2', timeout: 10000 });
    console.log('✓ Page loaded');

    // Wait 3 seconds for any render errors
    await new Promise(r => setTimeout(r, 3000));
    console.log('✓ No render errors after 3 seconds');
  } catch (err) {
    console.log('✗ Error:', err.message);
  }

  await browser.close();
})();
