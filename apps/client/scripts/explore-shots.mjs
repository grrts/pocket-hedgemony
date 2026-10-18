// Exploration and colonies as Portugal (exploration spec, How the player uses it, EXPL-069 … EXPL-074): a caravel
// ordered at Lisbon, its fleet card with Explore, drawing a course with the voyage bar, the parchment lifting as it
// sails, the Charts lens and the Colonies tab; then the Colony sections a short game can't reach yet (a governor
// aboard beside an empty coast, a colony growing, the tab with both), built from the same card code. On a small and a
// large phone held sideways, a phone held upright (asked to turn), and a desktop. Each screen reports buttons under
// 44 points and sideways overflow.
// Usage: pnpm build && node scripts/explore-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4184, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const check = (page, name, what, sel = ".panel") =>
  page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el || el.hidden) return { [sel]: "hidden" };
    const small = [...el.querySelectorAll("button:not([disabled])")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    const r = el.getBoundingClientRect();
    return { small, sideways: el.scrollWidth > el.clientWidth + 1, offscreen: r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 };
  }, sel).then((r) => console.log(name, what, JSON.stringify(r)));

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 120000 });
  const tap = async (sel) => (device.hasTouch ? page.tap(sel) : page.click(sel));
  await page.goto("http://localhost:4184/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=portugal]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await tap("[data-nation=portugal]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
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
  const lisbonId = await page.evaluate(() => window.__phCapital());
  const lisbon = await page.evaluate((id) => window.__phProvince(id), lisbonId);
  const openPort = async () => {
    await page.evaluate((id) => window.__phSelect(id), lisbonId);
    await page.waitForTimeout(200);
    await tap("[data-tab=port]");
    await page.waitForTimeout(200);
  };
  // Crew for a caravel, then the caravel.
  await openPort();
  await tap("[data-port-muster='30']");
  for (let t = 0; t < 8; t++) {
    await endTurn();
    await openPort();
    if (await page.locator("[data-port-buy=caravel]:not([disabled])").count()) break;
  }
  await shot("1-port-caravel");
  await check(page, name, "port");
  await tap("[data-port-buy=caravel]");
  for (let t = 0; t < 30 && !(await page.evaluate(() => window.__phNavy().mine.length)); t++) await endTurn();
  console.log(name, "fleets", await page.evaluate(() => window.__phNavy().mine.length));
  // Its card, from the Navy tab: Explore and Colony.
  await page.click(".panel .close").catch(() => {});
  await tap(".hud button.realm");
  await page.waitForTimeout(300);
  await tap("[data-realm-tab=navy]");
  await page.waitForTimeout(300);
  await tap("[data-fleet-open]");
  await page.waitForTimeout(300);
  await shot("2-fleet-card");
  await check(page, name, "fleet card");
  // Explore: the card folds away and the voyage bar comes up; each tap on the sea adds a leg.
  await tap("[data-explore]");
  await page.waitForTimeout(300);
  await shot("3-voyage-bar-empty");
  await check(page, name, "voyage bar", "#voyage-bar");
  const fleet = await page.evaluate(() => window.__phNavy().mine[0].id);
  const reach = await page.evaluate((id) => window.__phExploration().fleets.find((f) => f.id === id)?.oceanReach ?? -1, fleet);
  const vp = page.viewportSize();
  for (const k of [4, 9]) {
    const zone = await page.evaluate(([p, k, r]) => window.__phSeaOut(p, k, r), [lisbon, k, reach]);
    const [zx, zy] = await page.evaluate((p) => window.__phPoint(p), zone);
    await page.evaluate(([x, y]) => window.__phMap.lookAt(x, y, 5), [zx, zy]);
    await page.waitForTimeout(400);
    if (device.hasTouch) await page.touchscreen.tap(vp.width / 2, vp.height / 2 - 30);
    else await page.mouse.click(vp.width / 2, vp.height / 2 - 30);
    await page.waitForTimeout(300);
  }
  await shot("4-voyage-bar-course");
  await check(page, name, "voyage bar with a course", "#voyage-bar");
  console.log(name, "bar", await page.evaluate(() => document.querySelector("#voyage-bar .summary")?.textContent));
  await tap("[data-voyage-go]");
  await page.waitForTimeout(300);
  console.log(name, "voyages", JSON.stringify(await page.evaluate(() => window.__phExploration().voyages)));
  for (let t = 0; t < 3; t++) await endTurn();
  const [lx, ly] = await page.evaluate((p) => window.__phPoint(p), lisbon);
  await page.evaluate(([x, y]) => window.__phMap.lookAt(x - 60, y, 2.2), [lx, ly]);
  await page.waitForTimeout(600);
  await shot("5-parchment-lifting");
  // The Charts lens.
  await tap("#mode");
  await page.waitForTimeout(200);
  await tap("[data-lens=charts]");
  await page.waitForTimeout(600);
  await shot("6-charts-lens");
  await check(page, name, "lens menu", "#lenses");
  await tap("#mode");
  // The Colonies tab, before ocean navigation.
  await tap(".hud button.realm");
  await page.waitForTimeout(300);
  await tap("[data-realm-tab=colonies]");
  await page.waitForTimeout(300);
  await shot("7-colonies-tab-not-yet");
  await check(page, name, "colonies tab");
  // Later states, built by the same card code from the real view with a governor and a colony added.
  await page.evaluate(() => {
    const ex = window.__phExploration();
    const navy = window.__phNavy();
    const f = { ...navy.fleets.find((x) => x.id === navy.mine[0].id), route: [], at: -1 };
    const fake = {
      ...ex,
      colonial: true,
      slots: 2,
      used: 2,
      range: 14,
      governors: [
        { id: 1, name: "Diogo de Teive", age: 41, port: -1, fleet: f.id, colony: -1, homeward: false },
        { id: 2, name: "João Vaz Corte-Real", age: 36, port: -1, fleet: -1, colony: 7, homeward: false },
      ],
      colonies: [{ province: 7, owner: 0, progress: 40, aggression: "Wary", food: 900, monthsOfFood: 6, average: 9, pressureMax: 4, lastChange: 11, governor: "João Vaz Corte-Real", monthsLeft: 9 }],
      fleets: [{ id: f.id, oceanReach: 255, frozen: false, load: { rations: 300, pays: "food", gold: 0 } }],
    };
    const ui = window.__phExploreUi;
    const name = (p) => (p === 8 ? "Cabo Frio" : "Terra Nova");
    window.__phFake = {
      fleet: `<header><h2 class="ribbon">Explorers</h2></header>${ui.colonySection(f, fake, { inPort: false, portOfMine: false, gold: 120, stores: 300, storesMax: 300, coasts: [{ province: 7, why: null }, { province: 8, why: "beyond your colonial range" }], colonyHere: null, waiting: [], name })}`,
      colony: `<header><h2 class="ribbon">Terra Nova</h2></header>${ui.colonyCard(fake.colonies[0], fake, { mine: true, owner: "Portugal", shipBeside: false })}`,
      tab: `<header><h2 class="ribbon">Portugal</h2></header>${ui.coloniesTab(fake, { name, fleetName: () => "the explorers", inRange: 3 })}`,
    };
  });
  for (const k of ["fleet", "colony", "tab"]) {
    await page.evaluate((k) => {
      const p = document.querySelector(".panel");
      p.innerHTML = window.__phFake[k];
      p.hidden = false;
      p.scrollTop = 0;
    }, k);
    await page.waitForTimeout(200);
    await shot(`8-${k}-with-colony`);
    await check(page, name, `${k} with a colony`);
  }
  await page.close();
}
await browser.close();
server.httpServer.close();
