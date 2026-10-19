// The living map's roads close in: around Castile and the empty land south of Tlemcen, on a phone held sideways.
// Usage: pnpm build && node scripts/roads-shots.mjs <outDir> [zoom] [nation] [name=province ...]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const zoom = Number(process.argv[3] ?? 20);
const nation = process.argv[4] ?? "castile";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4181/");
await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
// "none" stays on the start screen, where the whole map is charted.
if (nation !== "none") {
  await page.click(`[data-nation=${nation}]`);
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
}
await page.evaluate(() => document.querySelectorAll(".panel .close").forEach((b) => b.click()));
await page.getByText("Stop hints").click().catch(() => {});
await page.evaluate(() => document.querySelectorAll(".hint, .note, [data-hint]").forEach((e) => e.remove()));
for (const [name, at] of (process.argv.length > 5 ? process.argv.slice(5).map((a) => a.split("=")) : [["toledo", "p1601"], ["burgos", "p1332"], ["tlemcen", "p1888"]])) {
  const [x, y] = Array.isArray(at) ? at : await page.evaluate((id) => window.__phPoint(window.__phProvince(id)), at);
  await page.evaluate(([x, y, z]) => window.__phMap.lookAt(x, y, z), [x, y, zoom]);
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/roads-${nation}-${name}-${zoom}.png` });
}
await browser.close();
server.httpServer.close();
