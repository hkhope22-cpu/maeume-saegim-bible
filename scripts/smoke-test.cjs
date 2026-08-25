const { chromium } = require("playwright");
const fs = require("node:fs");

const baseUrl = process.argv[2] || "http://127.0.0.1:49189/";

(async () => {
  const installedChrome = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({ headless: true, ...(fs.existsSync(installedChrome) ? { executablePath: installedChrome } : {}) });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => document.querySelector("#bibleSourceStatus")?.textContent.includes("모든 방문자"), null, { timeout: 30000 });

    const sourceCount = await page.locator("#bibleSourceCount").textContent();
    if (!sourceCount.includes("66권") || !sourceCount.includes("30,991절")) throw new Error(`Unexpected source count: ${sourceCount}`);

    await page.locator("#mobileMenuBtn").click();
    await page.locator('[data-view="bible"]').click();
    if (await page.locator("#bibleBookSelect option").count() !== 66) throw new Error("The whole-Bible selector does not contain 66 books.");

    await page.locator("#bibleBookSelect").selectOption("EPH");
    await page.locator("#bibleChapterSelect").selectOption("2");
    await page.locator("#bibleStartSelect").selectOption("5");
    await page.locator("#bibleEndSelect").selectOption("6");
    const summary = await page.locator("#bibleRangeSummary").textContent();
    if (!summary.includes("에베소서 2:5–6") || !summary.includes("2절")) throw new Error(`Unexpected range summary: ${summary}`);

    await page.locator("#practiceBibleRangeBtn").click();
    await page.locator("#gameOverlay.open").waitFor();
    if ((await page.locator("#gameProgressText").textContent()) !== "1 / 2") throw new Error("Selected passage length was not preserved.");
    if (!(await page.locator("#gameVerseRef").textContent()).includes("에베소서 2:5")) throw new Error("The first selected verse did not open.");
    if (pageErrors.length) throw new Error(`Page errors: ${pageErrors.join(" | ")}`);

    console.log("Smoke test passed: 66 books loaded, mobile selector works, and Ephesians 2:5–6 opens as a two-verse game.");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
