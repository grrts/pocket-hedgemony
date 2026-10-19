// The Shogunate (INST-080 to INST-085) as Japan: the Institutions row on the Diplomacy tab, the Shogunate card with
// its Houses fold (Summon held back at hold 30 Weak, Confirm pressed for real), the same fold at a staged Firm hold
// with a house at the capital, The Court with the port picker, the Hold fold, the Shogun badge, the Institutions map
// mode over Japan and a tap on it; then the oath's answer card in the News and the card while the office is vacant
// after a break. A Firm hold, a closed country, an oath and a break are years of play away: the script stages them
// over the real Shogunate view (__phStageShogunate), and the game's own card draws them. Wide (844x390) and Tall (390x844).
// Usage: pnpm build && node scripts/shogunate-shots.mjs <outDir>
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

/** Buttons, fold headers and rows under 44 points, and anything wider than the panel (INST-085). */
const check = (page, name, what) =>
  page
    .evaluate(() => {
      const root = document.querySelector(".panel");
      const small = [...root.querySelectorAll("button, summary, .member-row")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: root.scrollWidth > root.clientWidth + 1 };
    })
    .then((r) => console.log(name, what, JSON.stringify(r)));

for (const [name, device] of [
  ["wide", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  // Tall: an upright window of a phone's shape (a fine pointer, so no Turn your phone notice).
  ["tall", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  const tap = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
  const folds = (...open) => page.evaluate((o) => document.querySelectorAll("details.inst-fold[data-fold]").forEach((d) => (d.open = o.includes(d.dataset.fold))), open);
  // Scrolls the panel so an element sits just under its header.
  const top = (sel) =>
    page.evaluate((s) => {
      const p = document.querySelector(".panel");
      p.scrollTop += document.querySelector(s).getBoundingClientRect().top - p.querySelector("header").getBoundingClientRect().bottom - 4;
    }, sel);
  const stage = (f) => page.evaluate(`(() => { const v = structuredClone(window.__phShogunate()); const n = (id) => window.__phNation(id); (${f})(v, n); window.__phStageShogunate(v); })()`);
  await page.goto("http://localhost:4183/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  // Japan is not among the featured realms: pick Kyoto on the map, then rule it.
  await page.evaluate(() => window.__phSelect("p2110"));
  await page.waitForTimeout(300);
  await page.waitForSelector("[data-nation=japan]", { timeout: 10000 }).catch(() => console.log("no Rule Japan button"));
  await tap("[data-nation=japan]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await tap(".hud button.realm");
  await tap("[data-realm-tab=diplomacy]");
  await page.waitForTimeout(300);
  await top(".institution-row[data-shogunate-open]");
  await shot("1-diplomacy-row");
  await tap(".institution-row[data-shogunate-open]");
  await page.waitForTimeout(300);
  await page.evaluate(() => (document.querySelector(".panel").scrollTop = 0));
  await shot("2-card");
  await check(page, name, "card");
  // Confirm the first house for real: the engine moves its loyalty and hold, and the button shows why not again.
  const before = await page.evaluate(() => window.__phShogunate().hold);
  await tap("[data-house-confirm]:not([disabled])");
  await page.waitForTimeout(600);
  console.log(name, "confirm: hold", before, "->", await page.evaluate(() => window.__phShogunate().hold), JSON.stringify(await page.evaluate(() => window.__phShogunate().houses[0])));
  await top("[data-fold=Houses] .houses");
  await shot("3-houses-weak");
  // Hold staged Firm: Summon is open, one house waits at the capital with less wealth.
  await stage((v) => {
    v.hold = 62;
    v.word = "Firm";
    v.warning = null;
    v.houses.forEach((h, i) => {
      h.summonWhyNot = null;
      if (i === 1) Object.assign(h, { summoned: true, wealth: 90, summonWhyNot: "already at the capital" });
    });
  });
  await page.waitForTimeout(300);
  await top("[data-fold=Houses] .houses");
  await shot("4-houses-firm");
  await check(page, name, "houses firm");
  await folds("The Court");
  await stage((v) => {
    v.hold = 62;
    v.word = "Firm";
    v.warning = null;
    v.closeWhyNot = null;
  });
  await page.waitForTimeout(200);
  await tap("[data-close-pick]");
  await page.waitForTimeout(300);
  await top("[data-fold='The Court']");
  await shot("5-court-ports");
  await check(page, name, "court");
  await folds("Hold");
  await page.waitForTimeout(200);
  await top("[data-fold=Hold]");
  await shot("6-hold");
  // The Shogun badge on Japan's own country card.
  await tap(".hud button.realm");
  await tap("[data-realm-tab=general]").catch(() => {});
  await page.waitForTimeout(300);
  await top(".realm-card");
  await shot("7-badge");
  await page.evaluate(() => document.querySelector(".panel .close")?.click());
  await tap("#mode");
  await tap("[data-lens=institutions]");
  await page.waitForTimeout(300);
  await shot("8-map-mode-key");
  await page.evaluate(() => document.querySelector("#lenses")?.setAttribute("hidden", ""));
  await page.evaluate(() => window.__phLookAt("p2110", 3));
  await page.waitForTimeout(800);
  await shot("9-map-mode");
  // A tap on Japan under the map mode opens the Shogunate card: on a house's land west of Kyoto, clear of the army there.
  const size = page.viewportSize();
  await page.mouse.click(Math.round(size.width / 2) - 100, Math.round(size.height / 2));
  await page.waitForTimeout(600);
  console.log(name, "map tap opens:", await page.evaluate(() => document.querySelector(".panel h2")?.textContent));
  await shot("11-map-tap");
  await page.evaluate(() => document.querySelector(".panel .close")?.click());
  await page.evaluate(() => window.__phLookAt("p2110", 8));
  await page.waitForTimeout(800);
  await shot("10-map-mode-close");
  // The oath: the Court has made Hosokawa shogun and asks Japan to swear.
  await stage((v, n) => {
    v.oath = { shogun: n("hosokawa"), ends: "1445-01", total: -6, reasons: [{ name: "Base (keep our own realm)", number: -10 }, { name: "Standing / 4", number: 0 }, { name: "The shogun is stronger", number: 4 }, { name: "The shogun's hold", number: 0 }] };
  });
  await page.evaluate(() => document.querySelector("[data-news]").click());
  await page.waitForTimeout(400);
  await top(".panel .oath-ask");
  await page.evaluate(() => (document.querySelector(".oath-ask details").open = true));
  await page.waitForTimeout(200);
  await shot("12-oath-card");
  await check(page, name, "oath");
  // After a break: the office vacant, the warlord domains of Japan its members, Japan holding Kyoto and able to ask the Court.
  await stage((v, n) => {
    Object.assign(v, { shogun: -1, ruler: "", role: "Member", houses: [], warning: null, broke: "1452-09", year: [], record: [], oath: null, closeWhyNot: "only the shogun closes the country", ports: [], askWhyNot: null });
    v.members = [
      { realm: n("japan"), provinces: 19 },
      { realm: n("hosokawa"), provinces: 6 },
      { realm: n("yamana"), provinces: 5 },
      { realm: n("ouchi"), provinces: 4 },
      { realm: n("shimazu"), provinces: 3 },
    ];
  });
  await tap(".hud button.realm");
  await tap("[data-realm-tab=diplomacy]");
  await page.waitForTimeout(200);
  await tap(".institution-row[data-shogunate-open]");
  await page.waitForTimeout(300);
  await folds("Houses", "The Court");
  await page.evaluate(() => (document.querySelector(".panel").scrollTop = 0));
  await shot("13-vacant");
  await top("[data-fold='The Court']");
  await shot("14-vacant-court");
  await check(page, name, "vacant");
  await page.close();
}
await browser.close();
server.httpServer.close();
