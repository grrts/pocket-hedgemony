// The Land tab of a province as Castile, a tile tapped, on a small and a large phone held sideways (feedback 80, 87).
// Usage: pnpm build && node scripts/land-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4177/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(1000);
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.waitForTimeout(300);
  await page.click("[data-tab=land]");
  await page.waitForTimeout(300);
  await shot("land");
  const tiles = await page.$$eval("[data-land-tile]", (bs) => bs.map((b) => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]));
  console.log(name, "tiles:", tiles.length, "smallest:", Math.min(...tiles.map((t) => Math.min(...t))));
  await page.click("[data-land-tile='1']");
  await page.waitForTimeout(300);
  await shot("land-tile");
  console.log(name, "build in sheet:", (await page.$$(".land-sheet [data-build]")).length);
  await page.close();
}
await browser.close();
server.httpServer.close();
