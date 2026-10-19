// Screenshots the map's moving pieces for review: an army on the march with
// its route and week markers, close and far, and a battle as it plays out.
// Usage: pnpm build && node scripts/look-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4176, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"], deviceScaleFactor: 2 });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4176/");
await page.waitForSelector(".map-layer", { timeout: 60000 });
await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
await page.click("[data-nation=castile]");
await page.click("[data-begin]");
await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
await page.waitForTimeout(500);
await page.evaluate(() => window.__phMoveTo("p1325"));
await page.waitForTimeout(300);
await page.evaluate(() => window.__phLookAtArmy(6));
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/1-march.png` });
await page.evaluate(() => window.__phLookAtArmy(14));
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/2-march-close.png` });
await page.evaluate(() => window.__phLookAtArmy(2.5));
await page.waitForTimeout(700);
await page.screenshot({ path: `${out}/3-far.png` });
// War on Portugal, and turns until a battle is on.
await page.evaluate(() => {
  const b = document.createElement("button");
  b.dataset.realm = String(window.__phNation("portugal"));
  b.dataset.realmOpen = "diplomacy";
  document.body.append(b);
  b.click();
  b.remove();
});
await page.click("[data-declare]");
await page.click("[data-declare-confirm]");
await page.waitForTimeout(300);
let shot = false;
for (let t = 0; t < 20 && !shot; t++) {
  await page.evaluate(() => window.__phMarchOn("portugal"));
  const turn = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn");
  // Watch the week play out; stop on the first battle.
  while (!shot && (await page.evaluate(() => window.__phTurn())) === turn) {
    if (await page.evaluate(() => window.__phLookAtBattle(9))) {
      await page.evaluate(() => (document.querySelector("#panel").hidden = true));
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/4-battle.png` });
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/5-battle-later.png` });
      shot = true;
    }
    await page.waitForTimeout(100);
  }
  await page.waitForFunction((n) => window.__phTurn() > n, turn, { timeout: 120000 });
}
// A siege, if one is on: its province opens on the siege view.
const besieged = await page.evaluate(() => window.__phLookAtSiege?.() ?? null);
if (besieged) {
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/6a-siege-map.png` });
  await page.evaluate((id) => window.__phSelect(id), besieged);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/6b-siege.png` });
}
// The panels: a province's overview and garrison, and the realm.
await page.evaluate(() => window.__phSelect("p1601"));
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/7-province.png` });
await page.click("[data-tab=garrison]").catch(() => {});
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/8-garrison.png` });
await page.click(".hud .realm");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/9-realm.png` });
await page.goto("http://localhost:4176/style.html");
await page.waitForTimeout(800);
const sprites = page.locator("section", { hasText: "rider0" }).first();
await sprites.screenshot({ path: `${out}/6-sprites.png` }).catch((e) => console.log(e.message));
await browser.close();
server.httpServer.close();
