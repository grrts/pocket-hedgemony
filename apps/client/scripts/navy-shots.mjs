// Ships and ports as Portugal (naval spec, How the player uses it): the Port tab of Lisbon, ordering a carrack and
// mustering its crew in the queues, the fleet on the map, its card with an admiral, sailing by tapping the sea, and the Navy tab;
// on a small and a large phone held sideways, a phone held upright (asked to turn), and a desktop.
// Usage: pnpm build && node scripts/navy-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const check = (page, name, what) =>
  page.evaluate(() => {
    const panel = document.querySelector(".panel");
    if (!panel || panel.hidden) return { panel: "hidden" };
    const small = [...panel.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    return { small, sideways: panel.scrollWidth > panel.clientWidth + 1 };
  }).then((r) => console.log(name, what, JSON.stringify(r)));

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 120000 });
  await page.goto("http://localhost:4183/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=portugal]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=portugal]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const lisbonId = await page.evaluate(() => window.__phCapital());
  await page.evaluate((id) => window.__phSelect(id), lisbonId);
  await page.waitForTimeout(300);
  await page.click("[data-tab=port]");
  await page.waitForTimeout(300);
  await shot("1-port");
  await check(page, name, "port");
  // Order a carrack (Portugal's yard no longer offers the cog it replaces), then muster its crew for the queue.
  await page.click("[data-port-buy=carrack]");
  await page.waitForTimeout(300);
  await page.locator("[data-port-muster]").last().click();
  await page.waitForTimeout(300);
  await shot("2-port-queues");
  await check(page, name, "port queues");
  const endTurn = async () => {
    const turn = await page.evaluate(() => window.__phTurn());
    await page.click(".end-turn");
    for (let i = 0; i < 200 && (await page.evaluate(() => window.__phTurn())) <= turn; i++) {
      await page.waitForTimeout(150);
      if (await page.locator("#event-card:not([hidden]) [data-event-option]").count()) await page.locator("#event-card [data-event-option]").first().click().catch(() => {});
      if (await page.locator(".alert .go-there", { hasText: "Watch" }).count()) {
        await page.locator(".alert .dismiss").first().click().catch(() => {});
        await page.click(".end-turn").catch(() => {});
      }
    }
  };
  for (let t = 0; t < 5; t++) await endTurn();
  await page.evaluate((id) => window.__phSelect(id), lisbonId);
  await page.waitForTimeout(200);
  await page.click("[data-tab=port]");
  await page.waitForTimeout(200);
  await shot("2b-port-building");
  const lisbon = await page.evaluate((id) => window.__phProvince(id), lisbonId);
  for (let t = 0; t < 30 && !(await page.evaluate(() => window.__phNavy().mine.length)); t++) await endTurn();
  console.log(name, "fleets", await page.evaluate(() => window.__phNavy().mine.length));
  // The fleet off Lisbon on the map.
  await page.click(".panel .close").catch(() => {});
  const [x, y] = await page.evaluate((p) => window.__phPoint(p), lisbon);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 8), [x, y]);
  await page.waitForTimeout(600);
  await shot("3-fleet-on-map");
  // An official commissioned, to be the fleet's admiral.
  console.log(name, "commission", await page.evaluate(() => window.__phCommission()));
  // Its card from the Navy tab.
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.click("[data-realm-tab=navy]");
  await page.waitForTimeout(300);
  await shot("4-navy-tab");
  await check(page, name, "navy tab");
  await page.click("[data-fleet-open]");
  await page.waitForTimeout(300);
  await shot("5-fleet-card");
  await check(page, name, "fleet card");
  if (await page.locator("[data-fleet-admiral]").count()) {
    await page.locator("[data-fleet-admiral]").first().click();
    await page.waitForTimeout(300);
  }
  // Sail: tap Sail, then a sea zone to the west.
  await page.click("[data-fleet-sail]");
  await page.waitForTimeout(300);
  const zone = await page.evaluate((p) => window.__phSeaNear(p), lisbon);
  const [zx, zy] = await page.evaluate((p) => window.__phPoint(p), zone);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 8), [zx, zy]);
  await page.waitForTimeout(400);
  const vp = page.viewportSize();
  await page.mouse.click(vp.width / 2, vp.height / 2);
  await page.waitForTimeout(600);
  const route = await page.evaluate(() => window.__phNavy().fleets.filter((f) => window.__phNavy().mine.some((m) => m.id === f.id)).map((f) => f.route.length));
  console.log(name, "route after tap", JSON.stringify(route));
  await shot("6-sailing");
  await endTurn();
  await shot("7-at-sea");
  await page.close();
}
await browser.close();
server.httpServer.close();
