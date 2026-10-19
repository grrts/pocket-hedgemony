// Plays a short war as Castile against Portugal and screenshots it.
// Usage: pnpm build && node scripts/war-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4175, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4175/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=castile]");
await page.click("[data-begin]");
await page.waitForTimeout(500);
// Open Portugal's overview from the realm button list and declare war.
await page.evaluate(() => {
  const b = document.createElement("button");
  b.dataset.realm = String(window.__phNation("portugal"));
  document.body.append(b);
  b.click();
  b.remove();
});
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/1-portugal.png` });
await page.click("[data-declare]");
await page.click("[data-declare-confirm]");
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/2-declared.png` });
// March the army on Lisbon and end turns until something happens.
for (let t = 0; t < 24; t++) {
  await page.evaluate(() => window.__phMarchOn("portugal"));
  await page.click(".end-turn");
  await page.waitForFunction((n) => window.__phTurn() > n, t);
}
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/3-dispatches.png` });
await page.click(".panel .close").catch(() => {});
await page.evaluate(() => window.__phLookAtWar());
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/4-map.png` });
await browser.close();
server.httpServer.close();
