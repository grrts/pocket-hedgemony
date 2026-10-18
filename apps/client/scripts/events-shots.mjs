// Plays the Ottomans' war on Byzantium until Constantinople falls, and screenshots the event card
// in a phone's landscape and portrait, folded into End turn, in the dispatches and on desktop (EVT-076).
// Usage: pnpm build && node scripts/events-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const context = await browser.newContext({ ...devices["Pixel 7 landscape"] });
const page = await context.newPage();
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4177/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=ottomans]");
await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
await page.waitForTimeout(2000);
await page.evaluate(() => {
  const b = document.createElement("button");
  b.dataset.realm = String(window.__phNation("byzantium"));
  b.dataset.realmOpen = "diplomacy";
  document.body.append(b);
  b.click();
  b.remove();
});
await page.waitForTimeout(300);
await page.click("[data-declare]");
await page.waitForTimeout(300);
await page.click(".panel .close").catch(() => {});
const card = page.locator("#event-card:not([hidden])");
for (let t = 0; t < 120 && !(await card.count()); t++) {
  await page.evaluate(() => window.__phMarchOn("byzantium"));
  const turn = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn");
  for (;;) {
    await page.waitForTimeout(250);
    if (await card.count()) break;
    if ((await page.evaluate(() => window.__phTurn())) > turn) break;
    const watch = page.locator(".battle-watch .dismiss");
    if (await page.locator(".alert .go-there", { hasText: "Watch" }).count()) {
      // A battle stops the week: play on.
      await page.locator(".alert .dismiss").first().click().catch(() => {});
      await page.click(".end-turn");
    }
    if (await watch.isVisible().catch(() => false)) await watch.click().catch(() => {});
  }
  if (t % 5 === 0) console.log("turn", turn, await page.locator(".turn-label").innerText().catch(() => ""));
}
console.log("card shown:", await card.count());
await page.waitForTimeout(500);
await page.screenshot({ path: `${out}/1-card-phone-landscape.png` });
await page.setViewportSize({ width: 932, height: 430 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/2-card-tall-phone-landscape.png` });
await page.setViewportSize({ width: 412, height: 915 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/3-phone-portrait.png` });
await page.setViewportSize({ width: 915, height: 412 });
await page.click("[data-event-fold]");
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/4-folded-end-turn.png` });
await page.click("[data-news]");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/5-dispatches.png` });
await page.click("[data-event-open]");
await page.waitForTimeout(300);
await page.setViewportSize({ width: 1440, height: 900 });
await page.waitForTimeout(300);
await page.screenshot({ path: `${out}/6-card-desktop.png` });
await page.setViewportSize({ width: 915, height: 412 });
await page.click("[data-event-option]");
await page.waitForTimeout(1500);
console.log("after answer, card:", await card.count(), "owner of Istanbul handled; alerts:", await page.locator("#alerts").innerText());
await page.screenshot({ path: `${out}/7-answered.png` });
await browser.close();
server.httpServer.close();
