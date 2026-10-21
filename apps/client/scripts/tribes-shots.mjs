// Hunting grounds (TRIBE-026 to TRIBE-030) as the Creek: the Hunting grounds tab with a claim under way, the General
// tab's line, the province card of land it may claim, of its own ground (Take them in, Leave with its confirm), the
// political and Exploration map modes over its grounds; on a phone held sideways (Wide, 844x390) and upright (Tall,
// 390x844). It checks every button is 44 points high and nothing scrolls sideways.
// Usage: pnpm build && node scripts/tribes-shots.mjs <outDir>
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

/** Buttons under 44 points, reasons only in a title, and anything wider than the panel (TRIBE-030). */
const check = (page, name, what) =>
  page
    .evaluate(() => {
      const root = document.querySelector(".panel");
      const small = [...root.querySelectorAll(".hunt-tab button, .hunt-card button, .hunt-act button")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      const hoverOnly = [...root.querySelectorAll(".hunt-tab [title], .hunt-card [title]")].map((b) => b.title);
      return { small, hoverOnly, sideways: root.scrollWidth > root.clientWidth + 1 };
    })
    .then((r) => console.log(name, what, JSON.stringify(r)));

for (const [name, device] of [
  ["wide", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["tall", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/tribes-${name}-${what}.png` });
  const tap = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
  const top = (sel) =>
    page.evaluate((s) => {
      const p = document.querySelector(".panel");
      const el = document.querySelector(s);
      if (el) p.scrollTop += el.getBoundingClientRect().top - p.querySelector("header").getBoundingClientRect().bottom - 4;
    }, sel);
  await page.goto("http://localhost:4183/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.evaluate(() => window.__phSelect("p2148"));
  await page.waitForTimeout(300);
  await tap("[data-nation=creek]");
  await tap("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  const t = await page.evaluate(() => window.__phTribes());
  const mine = t?.mine;
  console.log(name, "range", mine && `${mine.held} of ${mine.size}`, "candidates", mine?.candidates.length, "claimable", mine?.candidates.filter((c) => !c.why).length);
  if (!mine) {
    console.log("The Creek are not tribal here: nothing to show");
    await page.close();
    continue;
  }
  // A claimable province's card, before any claim.
  const free = mine.candidates.find((c) => !c.why) ?? mine.candidates[0];
  if (free) {
    await page.evaluate((p) => window.__phSelect(window.__phProvinceId(p)), free.province);
    await page.waitForTimeout(400);
    await shot("claim-card");
    await check(page, name, "claim card");
  }
  // Leave one ground (so there is a free place), then claim, so the tab shows a claim under way.
  let claimed = null;
  if (!mine.candidates.some((c) => !c.why) && mine.grounds.length) {
    console.log(name, "leave", await page.evaluate((p) => window.__phTribesOrder({ action: "leave", province: p }), mine.grounds.at(-1).province));
  }
  const again = (await page.evaluate(() => window.__phTribes())).mine;
  const pick = again.candidates.find((c) => !c.why);
  if (pick) {
    console.log(name, "claim", await page.evaluate((p) => window.__phTribesOrder({ action: "claim", province: p }), pick.province));
    claimed = pick.province;
  }
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await page.evaluate(() => window.__phRealmTab("hunting"));
  await page.waitForTimeout(400);
  await top(".hunt-tab");
  await shot("tab");
  await check(page, name, "tab");
  await top(".hunt-tab h3:last-of-type");
  await shot("tab-candidates");
  await page.evaluate(() => window.__phRealmTab("general"));
  await page.waitForTimeout(300);
  await top("[data-realm-open-tab=hunting]");
  await shot("general-line");
  // The claim under way on its card.
  if (claimed !== null) {
    await page.evaluate((p) => window.__phSelect(window.__phProvinceId(p)), claimed);
    await page.waitForTimeout(400);
    await shot("claiming-card");
  }
  // A ground of ours: Take them in greyed with its reason, then Leave's confirm.
  const g = (await page.evaluate(() => window.__phTribes())).mine.grounds[0];
  if (g) {
    await page.evaluate((p) => window.__phSelect(window.__phProvinceId(p)), g.province);
    await page.waitForTimeout(400);
    await shot("ground-card");
    await check(page, name, "ground card");
    await tap("[data-hunt-leave]");
    await page.waitForTimeout(300);
    await top(".hunt-confirm");
    await shot("leave-confirm");
    await tap("[data-hunt-leave-no]");
    // The map over the Creek's grounds, political then Exploration.
    await page.evaluate(() => document.querySelector(".panel .close")?.click());
    await page.evaluate((p) => window.__phMap.lookAt(...window.__phPoint(p), 3), g.province);
    await page.waitForTimeout(600);
    await shot("map-political");
    await page.evaluate((p) => window.__phMap.lookAt(...window.__phPoint(p), 1), g.province);
    await page.waitForTimeout(600);
    await shot("map-far");
    await tap("#mode");
    await tap("[data-lens=charts]");
    await page.waitForTimeout(600);
    await shot("map-charts");
  }
  await page.close();
}
// A colonial power looking at the Creek's grounds (TRIBE-026, TRIBE-027): Castile, drawn as if it could found colonies
// (ocean navigation is decades away at the start), on a Creek ground's card and the Creek's Diplomacy tab.
for (const [name, device] of [
  ["wide", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }],
  ["tall", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/tribes-${name}-${what}.png` });
  const tap = (sel) => page.evaluate((s) => document.querySelector(s).click(), sel);
  await page.goto("http://localhost:4183/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await tap("[data-nation=castile]");
  await tap("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  await page.evaluate(() => window.__phStageColonial());
  const creek = await page.evaluate(() => window.__phNation("creek"));
  const t = await page.evaluate(() => window.__phTribes());
  const p = t.ground.findIndex((g) => g === creek);
  if (p >= 0) {
    await page.evaluate((q) => window.__phSelect(window.__phProvinceId(q)), p);
    await page.waitForTimeout(400);
    await shot("ask-card");
    await check(page, name, "ask card");
  }
  await page.evaluate((n) => document.querySelector(".hud").insertAdjacentHTML("beforeend", `<button id="open-creek" data-realm="${n}" data-realm-open="diplomacy" hidden></button>`), creek);
  await tap("#open-creek");
  await page.waitForTimeout(400);
  await page.evaluate(() => {
    const p = document.querySelector(".panel");
    const el = document.querySelector(".hunt-rows");
    if (el) p.scrollTop += el.getBoundingClientRect().top - p.querySelector("header").getBoundingClientRect().bottom - 60;
  });
  await shot("ask-rows");
  await page.close();
}
await browser.close();
server.httpServer.close();
