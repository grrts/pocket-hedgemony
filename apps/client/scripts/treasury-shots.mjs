// Tax and the treasury as Castile (milestone 3): a province's Tax line and rate buttons, and the country card's Treasury tab, on a small and a large phone held sideways.
// Usage: pnpm build && node scripts/treasury-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4178/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__phSelect("p1601"));
  await page.waitForTimeout(200);
  await page.click(".tax-rates [data-tax='3']");
  await page.waitForTimeout(300);
  await page.locator(".tax-rates").scrollIntoViewIfNeeded();
  await shot("province-tax");
  await page.click(".hud [data-realm-open=treasury]");
  await page.waitForTimeout(300);
  await page.locator(".purse").scrollIntoViewIfNeeded();
  await shot("treasury");
  await page.locator(".ledger-bars").scrollIntoViewIfNeeded();
  await shot("treasury-ledger");
  await page.locator("[data-borrow]").first().scrollIntoViewIfNeeded();
  await shot("treasury-loan");
  await page.evaluate(() => document.querySelector("[data-borrow]").click());
  await page.waitForTimeout(300);
  await shot("treasury-after-loan");
  await page.locator(".debt-meter").scrollIntoViewIfNeeded({ timeout: 5000 });
  await shot("treasury-debt");
  await page.close();
}
await browser.close();
server.httpServer.close();
