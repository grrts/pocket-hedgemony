// Plays each map moment over France's capital at Region zoom and screenshots it mid-flight, on a phone held
// sideways (VIEW-140 to VIEW-144).
// Usage: pnpm build && node scripts/effects-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext(devices["Pixel 7 landscape"])).newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4181/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=france]");
await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
await page.waitForTimeout(2000);
await page.click(".panel .close").catch(() => {});
await page.click("[data-hint=stop]").catch(() => {});
for (const [kind, zoom] of [["flip", 6], ["built", 6], ["rising", 6], ["glory", 6], ["plague", 6], ["flip", 20]]) {
  const p = await page.evaluate(([kind, zoom]) => {
    const p = window.__phNation("france");
    const map = window.__phMap;
    // Paris, France's capital: the province the realm card names.
    const at = window.__phCapitalOf(p);
    map.lookAt(at.x, at.y, zoom);
    return [at.province, window.__phMoment(kind, at.province, kind === "flip" ? window.__phNation("england") : p), window.__phMap.stats.frames];
  }, [kind, zoom]);
  // Early, mid-flight and late.
  for (const ms of [250, 600, 1100]) {
    await page.waitForTimeout(ms === 250 ? 250 : ms === 600 ? 350 : 500);
    await page.screenshot({ path: `${out}/${kind}-z${zoom}-${ms}.png`, clip: { x: 300, y: 80, width: 300, height: 180 } });
  }
  console.log(kind, zoom, p);
  await page.waitForTimeout(1500);
}
await browser.close();
server.httpServer.close();
