// The realm picker before a game (scenario-setup SETUP-072 to SETUP-075): the suggested realms, the Region select
// with Sub-Saharan Africa chosen (the map framing the region, every realm listed), a realm's card with Ways to grow
// opened from the list, and a small realm's province tapped on the map. On a phone held sideways (Wide), a narrow
// upright window (Tall) and a desktop. Each screen reports buttons and rows under 44 points, sideways overflow and
// a panel off screen.
// Usage: pnpm build && node scripts/picker-shots.mjs <outDir>
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4191, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const check = (page, name, what) =>
  page
    .evaluate(() => {
      const el = document.querySelector("#panel");
      if (!el || el.hidden) return { panel: "hidden" };
      const small = [...el.querySelectorAll("button:not([disabled]), select")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      const r = el.getBoundingClientRect();
      return { small, sideways: el.scrollWidth > el.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, offscreen: r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1, rows: el.querySelectorAll(".pick-row").length };
    })
    .then((r) => {
      failed ||= !!r.small?.length || !!r.sideways || !!r.offscreen;
      console.log(name, what, JSON.stringify(r));
    });

const layouts = [
  ["landscape", { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
  ["portrait", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
];
try {
  for (const [name, device] of layouts) {
    const page = await browser.newPage(device);
    page.on("pageerror", (e) => console.log("pageerror:", e.message));
    const shot = (what) => page.screenshot({ path: `${out}/picker-${name}-${what}.png`, timeout: 120000 });
    const tap = (loc) => (device.hasTouch ? loc.tap() : loc.click());
    await page.goto("http://localhost:4191/");
    await page.waitForSelector(".map-layer", { timeout: 60000 });
    await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
    await page.waitForFunction(() => window.__phMap, null, { timeout: 60000 });
    await page.waitForTimeout(500);
    await shot("suggested");
    // The first hint stands over the sheet; a player reads it once, the shots put it away.
    if (await page.isVisible("[data-hint=stop]")) await tap(page.locator("[data-hint=stop]"));
    await check(page, name, "suggested");
    await page.selectOption("[data-pick-region]", "sub_saharan_africa");
    await page.waitForTimeout(800);
    await shot("sub-saharan");
    await check(page, name, "sub-saharan");
    await page.evaluate(() => {
      const p = document.querySelector("#panel");
      p.scrollTop = p.scrollHeight;
    });
    await page.waitForTimeout(300);
    await shot("sub-saharan-end");
    await tap(page.locator(".pick-row", { hasText: "Benin" }).first());
    await page.waitForTimeout(800);
    await shot("benin-card");
    await check(page, name, "benin card");
    console.log(name, "ways:", await page.textContent("#panel .ways-to-grow"));
    await tap(page.locator("#panel .close"));
    await page.waitForTimeout(400);
    console.log(name, "back to the list:", await page.locator("#panel .pick-row").count(), "rows");
    // A one-province realm tapped on the map: its province card carries the realm at a glance.
    await page.evaluate(() => window.__phSelect?.("p3373"));
    await page.waitForTimeout(600);
    await shot("province-card");
    await check(page, name, "province card");
    await page.close();
  }
} finally {
  await browser.close();
  server.httpServer.close();
}
if (failed) console.log("Some screens have small targets or overflow (see above).");
