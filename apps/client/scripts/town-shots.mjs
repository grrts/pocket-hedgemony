// The living map's town art (VIEW-105..VIEW-112) as Castile on a phone held sideways:
// Toledo (the capital, with its keep), Barcelona and Setúbal (walled, with docks on its bay) at a few zooms,
// then each close in (zoom 40, the closest on Medium map detail) with the overlay hidden.
// Usage: pnpm build && node scripts/town-shots.mjs <outDir> [province id...]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
/** Further province ids to shoot close in, after the out dir. */
const extra = process.argv.slice(3);
const server = await preview({ preview: { port: 4184, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4184/");
await page.waitForSelector(".map-layer", { timeout: 60000 });
await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
await page.click("[data-nation=castile]");
await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
await page.click(".panel .close").catch(() => {});
await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
for (const [name, id, zooms] of extra.length ? [] : [["toledo", "p1601", [20, 32, 48]], ["barcelona", "p1618", [20, 48]], ["setubal", "p1585", [20, 40]]]) {
  for (const z of zooms) {
    await page.evaluate(([id, z]) => window.__phLookAt(id, z), [id, z]);
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${out}/${name}-zoom-${z}.png` });
  }
}
// The same towns close in with the overlay (labels, figures) hidden, cropped to the middle, to see the town art itself.
await page.evaluate(() => { document.querySelectorAll(".map-layer")[1].style.visibility = "hidden"; });
const vp = page.viewportSize();
for (const [name, id] of [["toledo", "p1601"], ["barcelona", "p1618"], ["setubal", "p1585"], ...extra.map((id) => [id, id])]) {
  await page.evaluate((id) => window.__phLookAt(id, 40), id);
  await page.waitForTimeout(1500);
  const w = 520, h = 300;
  await page.screenshot({ path: `${out}/${name}-bare-40.png`, clip: { x: (vp.width - w) / 2, y: (vp.height - h) / 2, width: w, height: h } });
}
await browser.close();
server.httpServer.close();
