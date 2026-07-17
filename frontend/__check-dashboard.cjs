const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push("CONSOLE: " + msg.text());
  });

  await page.goto("http://localhost:5173/customer-dashboard", { waitUntil: "networkidle" });
  await page.waitForSelector("text=Welcome back");
  await page.screenshot({ path: "d:/Downloads/new start/frontend/__shots/overview.png" });

  await page.click("text=My Orders");
  await page.waitForSelector("text=Search orders");
  await page.screenshot({ path: "d:/Downloads/new start/frontend/__shots/orders.png" });

  await page.click("button:has-text('Returns')");
  await page.waitForSelector("text=Submit Return Request");
  await page.screenshot({ path: "d:/Downloads/new start/frontend/__shots/returns.png" });

  await page.click("button:has-text('Profile')");
  await page.waitForSelector("text=Account Statistics");
  await page.screenshot({ path: "d:/Downloads/new start/frontend/__shots/profile.png" });

  console.log("ERRORS:", JSON.stringify(errors, null, 2));
  await browser.close();
})();
