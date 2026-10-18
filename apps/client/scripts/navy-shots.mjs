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
    // The leader's posts sit on one row (NAVY-164).
    const posts = [...panel.querySelectorAll(".fleet-posts button")].map((b) => Math.round(b.getBoundingClientRect().top));
    return { small, sideways: panel.scrollWidth > panel.clientWidth + 1, ...(posts.length ? { postsOneRow: new Set(posts).size === 1, posts: posts.length } : {}) };
  }).then((r) => console.log(name, what, JSON.stringify(r)));

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]].filter(([n]) => !process.env.ONLY || process.env.ONLY.split(",").includes(n))) {
  let page = await browser.newPage({ ...device });
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
  await page.locator("[data-hint=stop]").first().click({ timeout: 3000 }).catch(() => {});
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
  let flagship = await page.evaluate(() => window.__phNavy().mine.find((m) => m.ships.some((s) => s.type === "galley"))?.id ?? window.__phNavy().mine[0].id);
  for (const other of await page.evaluate((id) => window.__phNavy().mine.filter((m) => m.id !== id).map((m) => m.id), flagship))
    console.log(name, "merge", await page.evaluate(([fleet, into]) => window.__phNavyOrder({ do: "merge", fleet, into }), [other, flagship]));
  // The fleet off Lisbon on the map.
  await page.click(".panel .close").catch(() => {});
  const [x, y] = await page.evaluate((p) => window.__phPoint(p), lisbon);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 8), [x, y]);
  await page.waitForTimeout(600);
  await shot("3-fleet-on-map");
  // No leader yet when gold ran short: the realm's general leaves his army to lead the fleet.
  console.log(name, "free commander", await page.evaluate(() => window.__phFreeCommander()));
  await page.locator("[data-hint=stop]").first().click({ timeout: 2000 }).catch(() => {});
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
  // Sail: tap Sail (the sighting ring shows round the chosen fleet), then a spot of the sea off Lisbon (galleys keep to the coast).
  await page.click("[data-fleet-sail]");
  await page.waitForTimeout(300);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 4), [x, y]);
  await page.waitForTimeout(400);
  await shot("5d-chosen-ring");
  const zone = await page.evaluate((p) => window.__phSeaNear(p, 1), lisbon);
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
  // Portugal's galleys may not leave its ocean coast, so the blockade is played as the Ottomans, whose galleys hold the
  // Aegean: war on the nearest realm whose coast they can reach, and the fleet sent to lie off it (NAVY-155, NAVY-156).
  await page.close();
  page = await browser.newPage({ ...device });
  await page.goto("http://localhost:4183/");
  await page.waitForSelector("[data-nation=ottomans]", { timeout: 60000 });
  await page.click("[data-nation=ottomans]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.locator("[data-hint=stop]").first().click({ timeout: 3000 }).catch(() => {});
  flagship = await page.evaluate(() => window.__phNavy().mine.find((m) => m.ships.some((s) => s.type === "galley"))?.id ?? -1);
  const home = await page.evaluate((id) => window.__phNavy().fleets.find((f) => f.id === id)?.at ?? -1, flagship);
  const leader = await page.evaluate(() => window.__phCommission());
  console.log(name, "ottoman fleet", flagship, "commission", JSON.stringify(leader));
  if (leader?.length) console.log(name, "free commander", await page.evaluate(() => window.__phFreeCommander()));
  const idle = await page.evaluate(() => window.__phIdleCommander());
  console.log(name, "admiral", idle, await page.evaluate(([fleet, commander]) => window.__phNavyOrder({ do: "admiral", fleet, commander }), [flagship, idle]));
  let off = -1;
  const foes = await page.evaluate((p) => window.__phCoastRealms(p), home);
  console.log(name, "coast realms", JSON.stringify(foes));
  for (const foe of foes) {
    for (const z of await page.evaluate(([id, p]) => window.__phSeaBy(id, p), [foe, home])) {
      const no = await page.evaluate(([fleet, to]) => window.__phNavyOrder({ do: "sail", fleet, to }), [flagship, z]);
      if (no.length) {
        console.log(name, "no way to", foe, z, JSON.stringify(no));
        continue;
      }
      console.log(name, "war on", foe, JSON.stringify(await page.evaluate((id) => window.__phWar(id), foe)), "sail to", z);
      off = z;
      break;
    }
    if (off >= 0) break;
  }
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
  await page.locator(".panel h3.sub", { hasText: "Blockades" }).scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(200);
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
