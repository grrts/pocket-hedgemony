// Traders on the living map (VIEW-123, VIEW-132) as France: caravans, barges and ships on their paths at zoom 12 (icons),
// 15 (cross-fade), 20 and 36 (living), each paired with a shot a few days of play later, and a tap on one of France's
// caravans opening its card in the Trade tab; on a small and a large phone held sideways, a tall window and a desktop.
// Usage: pnpm build && node scripts/living-traders-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 90000 });
  await page.goto("http://localhost:4183/");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  // On one of France's walking traders.
  for (const zoom of [12, 15, 20, 36]) {
    await page.evaluate((z) => window.__phLookAtTrader(z), zoom);
    await page.waitForTimeout(500);
    await shot(`zoom-${zoom}`);
    console.log(name, zoom, "traders drawn", (await page.evaluate(() => window.__phTraderBoxes())).length);
  }
  await page.evaluate(() => window.__phLookAtTrader(20));
  await page.waitForTimeout(400);
  // A tap on one of France's caravans opens its card in the Trade tab.
  const { width, height } = page.viewportSize();
  const box = (await page.evaluate(() => window.__phTraderBoxes())).find((b) => b.mine >= 0 && b.x > 0 && b.y > 60 && b.x + b.w < width - 120 && b.y + b.h < height - 100);
  if (box) {
    console.log(name, "tap box", Math.round(box.w), Math.round(box.h));
    await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
    await page.waitForTimeout(400);
    console.log(name, "trader card open", await page.evaluate(() => !!document.querySelector("#panel:not([hidden]) .trader-card")));
    await shot("tapped");
  } else console.log(name, "no French mover on screen to tap");
  await page.evaluate(() => document.querySelector("#panel .close")?.click());
  await page.waitForTimeout(300);
  // A few days on, they have walked on.
  await page.evaluate(() => window.__phLookAtTrader(20));
  await shot("zoom-20-before");
  await page.click("#fab").catch(() => {});
  await page.waitForTimeout(2500);
  await shot("zoom-20-later");
  await page.close();
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
