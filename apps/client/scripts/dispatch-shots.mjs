// Plays a war as Castile against Portugal and screenshots the battle alert, the battle watch and the Dispatches log (feedback 72, 73).
// Usage: pnpm build && node scripts/dispatch-shots.mjs <outDir> [device]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const device = process.argv[3] ?? "Pixel 7 landscape";
const TARGET = process.argv[4] ?? "granada";
const server = await preview({ preview: { port: 4176, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage(device === "desktop" ? { viewport: { width: 1440, height: 900 } } : { ...devices[device] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4176/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=castile]");
await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
await page.waitForTimeout(3000);
await page.evaluate((t) => {
  const b = document.createElement("button");
  b.dataset.realm = String(window.__phNation(t));
  b.dataset.realmOpen = "diplomacy";
  document.body.append(b);
  b.click();
  b.remove();
}, TARGET);
await page.waitForTimeout(300);
console.log("declaring");
await page.click("[data-declare]").catch((e) => console.log("declare:", e.message));
await page.waitForTimeout(300);
await page.click(".panel .close").catch(() => {});
let watched = false;
let sieged = false;
for (let t = 0; t < 60 && !watched; t++) {
  await page.evaluate((t) => window.__phAttack(t), TARGET);
  const turn = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn");
  console.log("turn", turn, await page.evaluate(() => document.querySelector("#alerts").innerText.replace(/\n/g, " | ")));
  // Wait for the week to end, or for a battle alert to stop it.
  for (;;) {
    await page.waitForTimeout(250);
    if ((await page.evaluate(() => window.__phTurn())) > turn) break;
    if (!sieged && (await page.locator(".alert", { hasText: "siege" }).count())) {
      sieged = true;
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/0-siege-alert.png` });
    }
    const watch = page.locator(".alert .go-there", { hasText: "Watch" });
    if (await watch.count()) {
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/1-battle-alert.png` });
      await watch.first().click();
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `${out}/2-battle-watch.png` });
      watched = true;
      await page.waitForFunction((n) => window.__phTurn() > n, turn, { timeout: 120000 });
      await page.screenshot({ path: `${out}/3-battle-over.png` });
      break;
    }
  }
}
console.log("watched a battle:", watched);
await page.click(".battle-watch .dismiss").catch(() => {});
await page.click("[data-news]");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/4-dispatches.png` });
await browser.close();
server.httpServer.close();
