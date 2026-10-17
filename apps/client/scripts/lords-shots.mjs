// Officials and lords (feedback 60, 63-68, 70) as France: the Lords tab, a lord's screen, his lands lit on the map,
// the Lords lens, a lord's province with its governance card on top, and the richer Provinces tab; on a small and
// a large phone held sideways and on a desktop.
// Usage: pnpm build && node scripts/lords-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4179/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click(".hud button.realm");
  await page.click("[data-realm-tab=lords]");
  await page.waitForTimeout(300);
  await shot("lords");
  await page.click(".lord-row");
  await page.waitForTimeout(300);
  await shot("lord");
  await page.locator(".place-list").last().scrollIntoViewIfNeeded();
  await shot("lord-grant");
  await page.click("[data-lord-light]");
  await page.waitForTimeout(800);
  await shot("lord-lit");
  await page.click(".lit-chip .lit-open");
  await page.waitForTimeout(300);
  await page.click(".place-list [data-show-province]");
  await page.waitForTimeout(500);
  await shot("province-lord");
  await page.click(".panel .close");
  await page.click(".lit-chip [data-lord-light]");
  await page.evaluate(() => window.__phSelect("p1066"));
  await page.waitForTimeout(400);
  const grant = page.locator("[data-grant-open]");
  if (await grant.count()) await grant.click();
  await page.waitForTimeout(300);
  await shot("province-royal");
  await page.click(".hud button.realm");
  await page.click("[data-realm-tab=provinces]");
  await page.waitForTimeout(500);
  await shot("provinces");
  await page.close();
}
await browser.close();
server.httpServer.close();
