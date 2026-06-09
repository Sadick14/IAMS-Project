const puppeteer = require("puppeteer");

(async () => {
  try {
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    
    // Test on mobile viewport
    await page.setViewport({ width: 375, height: 812 });
    await page.goto("http://localhost:5173/clo", { waitUntil: "networkidle2" });
    
    // Try to find the notification bell dropdown
    const dropdownElement = await page.evaluate(() => {
      const dropdown = document.querySelector("[class*='w-80']");
      if (dropdown) {
        return {
          width: window.getComputedStyle(dropdown).width,
          classes: dropdown.className,
          exists: true
        };
      }
      return { exists: false, message: "Dropdown not found" };
    });
    
    console.log("Mobile view:", JSON.stringify(dropdownElement, null, 2));
    
    // Test on desktop viewport
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto("http://localhost:5173/clo", { waitUntil: "networkidle2" });
    
    const desktopDropdown = await page.evaluate(() => {
      const dropdown = document.querySelector("[class*='w-96']");
      if (dropdown) {
        return {
          width: window.getComputedStyle(dropdown).width,
          classes: dropdown.className,
          exists: true
        };
      }
      return { exists: false, message: "Dropdown not found" };
    });
    
    console.log("Desktop view:", JSON.stringify(desktopDropdown, null, 2));
    
    await browser.close();
  } catch (error) {
    console.error("Error:", error.message);
  }
})();
