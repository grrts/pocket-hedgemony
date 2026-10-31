// Plays France until an everyday event's card opens, and screenshots it in a phone's landscape and
// portrait, then Look at the map on it (EVT-121, EVT-129).
// Usage: pnpm build && node scripts/everyday-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ ...devices["Pixel 7 landscape"] });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4178/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=france]");
await page.click("[data-begin]");
await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
await page.waitForTimeout(2000);
await page.click(".panel .close").catch(() => {});
const card = page.locator("#event-card:not([hidden])");
const everyday = page.locator("#event-card:not([hidden])", { hasText: "In your realm" });
for (let t = 0; t < 80 && !(await everyday.count()); t++) {
  // A historical event: take its first option and play on.
  if (await card.count()) {
    await page.locator("[data-event-option]").first().click();
    await page.waitForTimeout(300);
    continue;
  }
  const turn = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn").catch(() => {});
  for (let k = 0; k < 120; k++) {
    await page.waitForTimeout(250);
    if (await card.count()) break;
    if ((await page.evaluate(() => window.__phTurn())) > turn) break;
    await page.locator(".alert .dismiss").first().click({ timeout: 200 }).catch(() => {});
  }
}
console.log("everyday card shown:", await everyday.count(), await page.locator("#event-title").innerText().catch(() => ""));
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/1-everyday-phone-landscape.png` });
await page.setViewportSize({ width: 412, height: 915 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/2-everyday-phone-portrait.png` });
await page.setViewportSize({ width: 915, height: 412 });
await page.waitForTimeout(300);
await page.click("[data-event-fold]");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/3-everyday-folded.png` });
await browser.close();
server.httpServer.close();
