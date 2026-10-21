// The living map's detailed pieces close in (feedback 126): a capital's keep and walls,
// a town, an army, a fleet and a trader, as Castile on a phone held sideways.
// Usage: pnpm build && node scripts/sprite-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4185, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
const shot = (what) => page.screenshot({ path: `${out}/${what}.png` });
await page.goto("http://localhost:4185/");
await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
await page.click("[data-nation=castile]");
await page.click("[data-begin]");
await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
await page.click(".panel .close").catch(() => {});
await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
const look = async (name, fn, ...zooms) => {
  for (const z of zooms) {
    await page.evaluate(fn, z);
    await page.waitForTimeout(700);
    await shot(`${name}-${z}`);
  }
};
await look("toledo", (z) => window.__phLookAt("p1601", z), 10, 20, 32, 48);
await look("barcelona", (z) => window.__phLookAt("p1618", z), 20, 48);
await look("army", (z) => window.__phLookAtArmy(z), 10, 20, 48);
await look("fleet", (z) => window.__phLookAtFleet(z), 10, 20, 32);
await look("trader", (z) => window.__phLookAtTrader(z), 20, 48);
await browser.close();
server.httpServer.close();
