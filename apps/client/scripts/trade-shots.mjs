// Trade (TRADE-141 to TRADE-145) as France: the General tab's trade line, the Trade tab (last month, traders, found a
// trader, busiest cities), a province card's Trade line, the Trade lens at world and regional zoom, and route mode
// with where it starts and where it goes picked; on a small and a large phone held sideways, a phone held upright (asked to turn), a tall
// window and a desktop.
// Usage: pnpm build && node scripts/trade-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
// An optional third argument picks devices by name ("small,desktop"), for a quicker look.
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4182, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
// Small targets and sideways scrolling are what break on a phone.
const check = (page, name, what, sel) =>
  page
    .evaluate((sel) => {
      const box = document.querySelector(sel);
      if (!box || box.hidden) return null;
      const small = [...box.querySelectorAll("button:not(.tab):not(header button)")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      const r = box.getBoundingClientRect();
      return { small, sideways: box.scrollWidth > box.clientWidth + 1, inside: r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight };
    }, sel)
    .then((x) => console.log(name, what, JSON.stringify(x)));
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4182/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  // First-campaign hints would cover the shots: stop them.
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  // The alert asking for a study would cover the card.
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  // The General tab's line, then the Trade tab from it.
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.locator("[data-realm-open-tab=trade]").scrollIntoViewIfNeeded();
  await shot("general");
  await page.click("[data-realm-open-tab=trade]");
  await page.waitForTimeout(300);
  await shot("trade");
  await check(page, name, "trade tab", ".panel");
  await page.locator(".found-city").first().scrollIntoViewIfNeeded();
  await shot("trade-found");
  await page.locator(".trade-cities").scrollIntoViewIfNeeded();
  await shot("trade-cities");
  // Dismiss asks once more.
  await page.locator(".traders").scrollIntoViewIfNeeded();
  await page.click("[data-trader-ask]");
  await page.waitForTimeout(200);
  await shot("trade-dismiss");
  await page.click("[data-trader-keep]");
  // A province card's Trade line: the busiest city.
  const cities = await page.evaluate(() => window.__phTradeCities());
  await page.evaluate((id) => window.__phSelect(id), cities[0]);
  await page.waitForTimeout(300);
  await page.locator(".trade-line").scrollIntoViewIfNeeded();
  await shot("province");
  await page.click("#panel .close");
  // The Trade lens with its key, at world zoom and at regional.
  await page.click("#mode");
  await page.click("[data-lens=trade]");
  await page.waitForTimeout(500);
  await shot("lens-menu");
  await page.click("#mode");
  await page.evaluate((id) => window.__phLookAt(id, 1.2), cities[0]);
  await page.waitForTimeout(600);
  await shot("lens-world");
  await page.evaluate((id) => window.__phLookAt(id, 3), cities[0]);
  await page.waitForTimeout(600);
  await shot("lens-regional");
  // Route mode: Route on the first trader card, then where it starts and where it goes tapped on the map.
  await page.click(".hud button.realm");
  await page.waitForTimeout(200);
  await page.click("[data-realm-tab=trade]");
  await page.waitForTimeout(200);
  await page.click("[data-trader-route]");
  await page.waitForTimeout(600);
  await shot("route-start");
  const box = await page.locator("#map").boundingBox();
  // Each city is brought to the middle of the map first, clear of the bar.
  const tap = async (id) => {
    await page.evaluate((id) => window.__phLookAt(id, 3), id);
    await page.waitForTimeout(200);
    const [x, y] = await page.evaluate((id) => window.__phScreenOf(id), id);
    await page.mouse.click(box.x + x, box.y + y);
    await page.waitForTimeout(700);
  };
  await tap(cities[0]);
  await shot("route-from");
  await tap(cities[1]);
  await shot("route");
  await check(page, name, "route bar", ".route-bar");
  // Another city moves where it goes; the way is planned again.
  if (cities[2] !== undefined) {
    await tap(cities[2]);
    await shot("route-moved");
  }
  // A tap on the sea says why not.
  await page.mouse.click(box.x + 20, box.y + box.height * 0.45);
  await page.waitForTimeout(300);
  await shot("route-why");
  await page.click("[data-route-cancel]");
  await page.waitForTimeout(400);
  await shot("route-cancel");
  await page.close();
}
await browser.close();
server.httpServer.close();
