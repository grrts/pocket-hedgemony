// Plays as Navarre until an AI envoy waits at the court for an answer, and screenshots the alert and the answer card in landscape and portrait (DIPL-212).
// Usage: pnpm build && node scripts/ask-shots.mjs <outDir> [nation]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const NATION = process.argv[3] ?? "navarre";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4177/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click(`[data-nation=${NATION}]`);
await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
let found = false;
for (let t = 0; t < 120 && !found; t++) {
  const turn = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn");
  for (let k = 0; k < 400; k++) {
    await page.waitForTimeout(150);
    if (await page.locator(".alert", { hasText: "waits for your answer" }).count()) {
      found = true;
      break;
    }
    if ((await page.evaluate(() => window.__phTurn())) > turn) break;
  }
  if (!found) await page.click(".panel .close").catch(() => {});
}
console.log("ask arrived:", found);
if (found) {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/1-alert-landscape.png` });
  await page.click("[data-news]");
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/2-card-landscape.png` });
  const sizes = await page.$$eval("[data-ask]", (bs) => bs.map((b) => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]));
  console.log("button sizes (landscape):", JSON.stringify(sizes));
  await page.setViewportSize({ width: 412, height: 839 });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/3-card-portrait.png` });
  console.log("button sizes (portrait):", JSON.stringify(await page.$$eval("[data-ask]", (bs) => bs.map((b) => [Math.round(b.getBoundingClientRect().width), Math.round(b.getBoundingClientRect().height)]))));
  const text = await page.$$eval(".call", (cs) => cs.map((c) => c.innerText.replace(/\n+/g, " | ")));
  console.log(text.join("\n"));
  await page.click("[data-ask][data-yes='1']");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/4-after-answer-portrait.png` });
  console.log("cards left:", await page.locator("[data-ask]").count());
}
await browser.close();
server.httpServer.close();
