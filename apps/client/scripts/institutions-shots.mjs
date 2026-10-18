// The Empire (INST-080 to INST-085) as Saxony, an elector: the Institutions row on the Diplomacy tab, the Empire card
// with the Election fold and a seat's reasons open, the Members and Hold folds, Brandenburg's badge and the
// Institutions map mode; on a phone held sideways (Wide), upright (Tall) and a desktop window.
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
await browser.close();
server.httpServer.close();
