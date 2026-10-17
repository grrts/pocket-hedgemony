// Screenshots the interface for review: the loading screen, a province's
// overview and garrison, the realm's tabs, and the art page's portraits.
// Usage: pnpm build && node scripts/ui-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"], deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4178/");
await page.waitForTimeout(250);
await page.screenshot({ path: `${out}/u1-loading.png` });
await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
await page.click("[data-nation=castile]");
await page.waitForTimeout(150);
await page.screenshot({ path: `${out}/u2-loading-game.png` });
await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
await page.waitForTimeout(600);
await page.evaluate(() => window.__phSelect("p1601"));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/u3-province.png` });
await page.click("[data-tab=garrison]").catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/u4-garrison.png` });
await page.click(".hud .realm");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/u5-realm.png` });
for (const tab of ["diplomacy", "military", "officials"]) {
  if (!(await page.$(`[data-realm-tab=${tab}]`))) continue;
  await page.click(`[data-realm-tab=${tab}]`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/u6-realm-${tab}.png` });
}
await browser.close();
server.httpServer.close();
