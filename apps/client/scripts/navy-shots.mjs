// Ships and ports as Portugal (naval spec, How the player uses it): the Port tab of Lisbon, mustering sailors and
// ordering a cog and a galley, the fleet on the map, its card with a leader and his three posts, the sighting ring
// of the fleet chosen to sail, sailing by tapping the sea, and the Navy tab; then war on Castile and a blockade off
// its coast: the chain marks on the map, the fleet card's blockade line and the Navy tab's Blockades (NAVY-146..149);
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
    // The leader's posts sit on one row (NAVY-149).
    const posts = [...panel.querySelectorAll(".fleet-posts button")].map((b) => Math.round(b.getBoundingClientRect().top));
    return { small, sideways: panel.scrollWidth > panel.clientWidth + 1, ...(posts.length ? { postsOneRow: new Set(posts).size === 1, posts: posts.length } : {}) };
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
  // An official commissioned first, while the treasury allows: the fleet's leader later.
  console.log(name, "commission", await page.evaluate(() => window.__phCommission()));
  // Muster a cog's crew, then wait for them to arrive (two weeks).
  await page.click("[data-port-muster='30']");
  await page.waitForTimeout(300);
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
  await endTurn();
  await endTurn();
  await endTurn();
  await page.evaluate((id) => window.__phSelect(id), lisbonId);
  await page.waitForTimeout(200);
  await page.click("[data-tab=port]");
  await page.waitForTimeout(200);
  await page.click("[data-port-buy=cog]");
  await page.waitForTimeout(300);
  await shot("2-port-building");
  const lisbon = await page.evaluate((id) => window.__phProvince(id), lisbonId);
  // A galley for the war, as gold allows: its crew mustered a hundred at a time, then ordered (four months);
  // then both ships sail as one fleet.
  const galley = () => page.evaluate(() => window.__phNavy().mine.some((m) => m.ships.some((s) => s.type === "galley")));
  let ordered = false;
  for (let t = 0; t < 60 && !(await galley()); t++) {
    if (!ordered) {
      const r = await page.evaluate((p) => {
        const port = window.__phNavy().ports.find((x) => x.province === p);
        if (port.sailors >= 180) return window.__phNavyOrder({ do: "buy", province: p, ship: "galley" }).then((no) => ({ buy: no }));
        if (port.sailors + port.mustering < 180) return window.__phNavyOrder({ do: "muster", province: p, sailors: 100 }).then((no) => ({ muster: no }));
        return null;
      }, lisbon);
      if (r?.buy && !r.buy.length) ordered = true;
      if (r && Object.values(r)[0].length === 0) console.log(name, "turn", t, JSON.stringify(r));
    }
    await endTurn();
  }
  console.log(name, "fleets", await page.evaluate(() => window.__phNavy().mine.map((m) => m.ships.map((s) => s.type))));
  const flagship = await page.evaluate(() => window.__phNavy().mine.find((m) => m.ships.some((s) => s.type === "galley"))?.id ?? window.__phNavy().mine[0].id);
  for (const other of await page.evaluate((id) => window.__phNavy().mine.filter((m) => m.id !== id).map((m) => m.id), flagship))
    console.log(name, "merge", await page.evaluate(([fleet, into]) => window.__phNavyOrder({ do: "merge", fleet, into }), [other, flagship]));
  // The fleet off Lisbon on the map.
  await page.click(".panel .close").catch(() => {});
  const [x, y] = await page.evaluate((p) => window.__phPoint(p), lisbon);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 8), [x, y]);
  await page.waitForTimeout(600);
  await shot("3-fleet-on-map");
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
  // The leader's section: his three posts on one row; the commodore chosen, then back to admiral for the war.
  await page.locator(".fleet-posts").scrollIntoViewIfNeeded().catch(() => {});
  await shot("5b-fleet-posts");
  await check(page, name, "fleet posts");
  await page.click("[data-fleet-post=commodore]");
  await page.waitForTimeout(300);
  await page.locator(".fleet-posts").scrollIntoViewIfNeeded().catch(() => {});
  await shot("5c-commodore");
  console.log(name, "title", await page.evaluate(() => document.querySelector(".panel h2")?.textContent));
  await page.click("[data-fleet-post=admiral]");
  await page.waitForTimeout(300);
  // Sail: tap Sail (the sighting ring shows round the chosen fleet), then a sea zone to the west.
  await page.click("[data-fleet-sail]");
  await page.waitForTimeout(300);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 4), [x, y]);
  await page.waitForTimeout(400);
  await shot("5d-chosen-ring");
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
  // War on Castile, and the fleet sent to lie off its coast: a blockade (NAVY-140, NAVY-141).
  console.log(name, "war", await page.evaluate(() => window.__phWar("castile")));
  const off = await page.evaluate((p) => window.__phSeaBy("castile", p), lisbon);
  console.log(name, "sail to blockade", off, await page.evaluate(([fleet, to]) => window.__phNavyOrder({ do: "sail", fleet, to }), [flagship, off]));
  const blockading = () => page.evaluate((id) => window.__phNavy().fleets.find((f) => f.id === id)?.blockading.length ?? 0, flagship);
  for (let t = 0; t < 12 && !(await blockading()); t++) await endTurn();
  console.log(name, "blockades", JSON.stringify(await page.evaluate(() => ({ b: window.__phNavy().blockades, prize: window.__phNavy().prize }))));
  await page.click(".panel .close").catch(() => {});
  const [ox, oy] = await page.evaluate((p) => window.__phPoint(p), off);
  for (const [zoom, what] of [[5, "8-blockade-map"], [1.6, "8b-blockade-region"], [0.8, "8c-blockade-world"]]) {
    await page.evaluate(([x, y, z]) => window.__phMap.lookAt(x, y, z), [ox, oy, zoom]);
    await page.waitForTimeout(500);
    await shot(what);
  }
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.click("[data-realm-tab=navy]");
  await page.waitForTimeout(300);
  await shot("9-navy-blockades");
  await check(page, name, "navy tab blockades");
  await page.click(`[data-fleet-open="${flagship}"]`);
  await page.waitForTimeout(300);
  await shot("10-fleet-blockading");
  await check(page, name, "fleet card blockading");
  await page.close();
}
await browser.close();
server.httpServer.close();
