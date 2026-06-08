import puppeteer from "puppeteer";

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Test on mobile viewport
    await page.setViewport({ width: 375, height: 812 });
    await page.goto("http://localhost:5173/clo", { waitUntil: "networkidle2", timeout: 10000 });
    
    // Click the notification bell to open dropdown
    const bellButton = await page.$("button[title='Notifications']");
    if (bellButton) {
      await bellButton.click();
      await page.waitForTimeout(500);
    }
    
    // Check the dropdown width
    const mobileDropdown = await page.evaluate(() => {
      const dropdown = document.querySelector("div[class*='absolute'][class*='right-0'][class*='mt-2']");
      if (dropdown) {
        const styles = window.getComputedStyle(dropdown);
        return {
          width: styles.width,
          maxWidth: styles.maxWidth,
          classes: dropdown.className,
          exists: true
        };
      }
      return { exists: false, message: "Dropdown not found" };
    });
    
    console.log("Mobile view (375px):", JSON.stringify(mobileDropdown, null, 2));
    
    // Test on desktop viewport
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto("http://localhost:5173/clo", { waitUntil: "networkidle2", timeout: 10000 });
    
    const bellButton2 = await page.$("button[title='Notifications']");
    if (bellButton2) {
      await bellButton2.click();
      await page.waitForTimeout(500);
    }
    
    const desktopDropdown = await page.evaluate(() => {
      const dropdown = document.querySelector("div[class*='absolute'][class*='right-0'][class*='mt-2']");
      if (dropdown) {
        const styles = window.getComputedStyle(dropdown);
        return {
          width: styles.width,
          maxWidth: styles.maxWidth,
          classes: dropdown.className,
          exists: true
        };
      }
      return { exists: false, message: "Dropdown not found" };
    });
    
    console.log("Desktop view (1024px):", JSON.stringify(desktopDropdown, null, 2));
    
    await browser.close();
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
