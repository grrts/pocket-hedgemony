// The trader card (TRADE-153 to TRADE-155) as France: a tap on a walking caravan opens its card with its way drawn on the
// map, Change destination shows the best cities as picks and gold over the cities, and Use sets a better route; on a small
// and a large phone held sideways, a tall window and a desktop.
// Usage: pnpm build && node scripts/trader-card-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4184, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 90000 });
  await page.goto("http://localhost:4184/");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await page.evaluate(() => window.__phLookAtTrader(20));
  await page.waitForTimeout(500);
  const { width, height } = page.viewportSize();
  const box = (await page.evaluate(() => window.__phTraderBoxes())).find((b) => b.mine >= 0 && b.x > 0 && b.y > 60 && b.x + b.w < width - 120 && b.y + b.h < height - 100);
  if (!box) {
    console.log(name, "no French trader on screen to tap");
    await page.close();
    continue;
  }
  await page.mouse.click(box.x + box.w / 2, box.y + box.h / 2);
  await page.waitForTimeout(500);
  console.log(name, "trader card open", await page.evaluate(() => !!document.querySelector("#panel:not([hidden]) .trader-card")));
  await shot("card");
  // The card scrolled to its foot, then folded so the drawn way shows.
  await page.evaluate(() => document.querySelector("#panel")?.scrollTo(0, 99999));
  await shot("card-foot");
  await page.evaluate(() => document.querySelector("#panel .fold")?.click());
  await page.waitForTimeout(300);
  await page.evaluate(() => window.__phLookAtTrader(8));
  await page.waitForTimeout(400);
  await shot("way");
  await page.evaluate(() => document.querySelector("#reopen")?.click());
  await page.waitForTimeout(300);
  // Change destination: the bar with the best picks, and gold over the cities.
  const dest = page.locator("[data-trader-dest]");
  if (await dest.count()) {
    await dest.first().click();
    await page.waitForSelector(".route-picks button", { timeout: 20000 }).catch(() => console.log(name, "no picks"));
    await page.waitForTimeout(500);
    await shot("change-destination");
    const pick = page.locator(".route-picks button").first();
    if (await pick.count()) {
      await pick.click();
      await page.waitForTimeout(800);
      await shot("picked");
    }
    await page.click("[data-route-cancel]");
    await page.waitForTimeout(300);
  }
  // Use the best better route, if one is offered.
  const use = page.locator("[data-trader-use]");
  console.log(name, "better routes offered", await use.count());
  if (await use.count()) {
    await use.first().click();
    await page.waitForTimeout(600);
    await shot("used");
  }
  // Every button and row in the card is at least 44 points high.
  const small = await page.evaluate(() => [...document.querySelectorAll("#panel .trader-card button")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 43.5).map((b) => b.textContent.trim()));
  console.log(name, "buttons under 44", JSON.stringify(small));
  const wide = await page.evaluate(() => { const p = document.querySelector("#panel"); return p ? p.scrollWidth > p.clientWidth + 1 : false; });
  console.log(name, "panel scrolls sideways", wide);
  await page.close();
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
