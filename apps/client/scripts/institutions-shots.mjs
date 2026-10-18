// The Empire (INST-080 to INST-085) as Saxony, an elector: the Institutions row on the Diplomacy tab, the Empire card
// with the Election fold and a seat's reasons open, the Members and Hold folds, Brandenburg's badge and the
// Institutions map mode; on a phone held sideways (Wide), upright (Tall) and a desktop window.
// Then slice 2 (INST-040 to INST-043, INST-081, INST-083): the Reforms fold with a Diet sitting, the Take to court list,
// a Breaker of the Peace among the members, and the Diet's and a court ruling's answer cards in the News, in Wide
// (844x390) and Tall (390x844). A Diet needs hold 50 and a ruling the Imperial Court, years of play away: the script
// stages them over the real Empire view (__phStageEmpire), and the game's own card draws them.
// Usage: pnpm build && node scripts/institutions-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [
  ["wide", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  // Tall: a window taller than wide (a desktop window or a tablet upright); a phone always plays sideways.
  ["tall", { viewport: { width: 700, height: 1000 } }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  const tap = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
  await page.goto("http://localhost:4181/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  // Saxony is not among the featured realms: pick its province on the map, then rule it.
  await page.evaluate(() => window.__phSelect("p829"));
  await page.waitForTimeout(300);
  await page.waitForSelector("[data-nation=saxony]", { timeout: 10000 }).catch(() => console.log("no Rule Saxony button"));
  await tap("[data-nation=saxony]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await tap(".hud button.realm");
  await tap("[data-realm-tab=diplomacy]");
  await page.waitForTimeout(300);
  await shot("diplomacy-row");
  await tap("[data-empire-open]");
  await page.waitForTimeout(300);
  await shot("empire-card");
  await tap("[data-seat=Brandenburg]");
  await page.waitForTimeout(300);
  await page.locator(".seat-reasons > :last-child").scrollIntoViewIfNeeded();
  await shot("seat-reasons");
  await page.evaluate(() => document.querySelectorAll("details.inst-fold[data-fold]").forEach((d) => (d.open = d.dataset.fold === "Members")));
  await page.waitForTimeout(200);
  await page.locator("[data-fold=Members]").scrollIntoViewIfNeeded();
  await shot("members");
  await page.evaluate(() => document.querySelectorAll("details.inst-fold[data-fold]").forEach((d) => (d.open = d.dataset.fold === "Hold" || d.dataset.fold === "Reforms")));
  await page.waitForTimeout(200);
  await page.locator("[data-fold=Reforms]").scrollIntoViewIfNeeded();
  await shot("reforms-hold");
  await page.evaluate(() => document.querySelector(`.member-row[data-realm="${window.__phNation("brandenburg")}"]`).click());
  await page.waitForTimeout(300);
  await shot("badge");
  await page.evaluate(() => document.querySelector(".panel .close")?.click());
  await tap("#mode");
  await tap("[data-lens=institutions]");
  await page.waitForTimeout(300);
  await shot("map-mode-key");
  await page.evaluate(() => document.querySelector("#lenses")?.setAttribute("hidden", ""));
  // Over the heart of the Empire (Sachsen), zoomed in enough for the electors' crowns.
  await page.evaluate(() => window.__phMap.lookAt(3093, 431, 3));
  await page.waitForTimeout(500);
  await shot("map-mode");
  await page.close();
}

/** Buttons, fold headers and rows under 44 points, and anything wider than the panel (INST-085). */
const check = (page, name, what) =>
  page
    .evaluate(() => {
      const root = document.querySelector(".panel");
      const small = [...root.querySelectorAll("button:not([disabled]), summary, .court-row, .ladder li")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
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
  // Scrolls the panel so an element sits just under its header.
  const top = (sel) =>
    page.evaluate((s) => {
      const p = document.querySelector(".panel");
      p.scrollTop += document.querySelector(s).getBoundingClientRect().top - p.querySelector("header").getBoundingClientRect().bottom - 4;
    }, sel);
  await page.goto("http://localhost:4181/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.evaluate(() => window.__phSelect("p829"));
  await page.waitForTimeout(300);
  await tap("[data-nation=saxony]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  // Public Peace and the Imperial Court passed, the Diet sitting on the Circles; Brandenburg broke the Peace, the
  // court ruled Saxony hands Thüringen to it, and Saxony holds a claim on Prague it may take to court.
  await page.evaluate(() => {
    const v = structuredClone(window.__phEmpire());
    const n = (id) => window.__phNation(id);
    const r = v.reforms;
    r.ladder.forEach((x, i) => (x.passed = i < 2));
    const circles = r.ladder[2];
    r.next = { id: circles.id, name: circles.name, effect: circles.effect, passCost: 30, failCost: 10, yes: 14, no: 9, whyNot: "only the Emperor calls the Diet" };
    r.diet = { reform: circles.id, name: circles.name, ends: "1444-12", playerVote: null, yes: 14, no: 9 };
    r.rulings = [{ id: "ruling_staged", plaintiff: n("brandenburg"), province: window.__phProvince("p829"), answerOn: "1445-02" }];
    r.court = [{ realm: n("bohemia"), province: window.__phProvince("p839"), source: "claim on Prague" }];
    v.hold = 52;
    v.word = "Firm";
    for (const m of v.members) if (m.realm === n("brandenburg")) m.breaker = true;
    window.__phStageEmpire(v);
  });
  await page.evaluate(() => document.querySelector("[data-news]").click());
  await page.waitForTimeout(400);
  await page.evaluate(() => (document.querySelector(".panel").scrollTop = 0));
  await shot("diet-card");
  await check(page, name, "diet card");
  await top(".panel .empire-ask:has([data-ruling])");
  await shot("ruling-card");
  await tap(".panel .empire-ask [data-empire-open]");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll("details.inst-fold[data-fold]").forEach((d) => (d.open = d.dataset.fold === "Reforms")));
  await page.waitForTimeout(200);
  await top("[data-fold=Reforms]");
  await shot("reforms");
  await check(page, name, "reforms");
  await top(".panel .reform-next");
  await shot("reforms-diet");
  await top(".panel .reform-next ~ h4");
  await shot("reforms-court");
  await page.evaluate(() => document.querySelectorAll("details.inst-fold[data-fold]").forEach((d) => (d.open = d.dataset.fold === "Members")));
  await page.waitForTimeout(200);
  await top(`.member-row[data-realm="${await page.evaluate(() => window.__phNation("brandenburg"))}"]`);
  await shot("members-breaker");
  await page.close();
}
await browser.close();
server.httpServer.close();
