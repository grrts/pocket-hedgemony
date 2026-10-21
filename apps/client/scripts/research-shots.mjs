// Research on one screen (RSCH-084 to RSCH-111): the nation picker's standing, the "choose what to study"
// alert, the Research tab as one screen (queue strip, jump chips, the one tree with its four branch bands,
// the sheet beside it or sliding up from the bottom), Study now, Add to queue, Queue the path, moving and
// removing in the queue, the Whole tree zoom and tapping a place in it, Schools, the General tab's line and
// another realm's line. France plays on every size; Mali (which starts in Ancient) shows Catch up.
// Sizes: a phone held sideways (844 × 390), a narrow upright window (390 × 844, the Tall layout) and a desktop.
// Checks: one picture with four bands, no bough tabs, a locked invention offers no Study now, queue and
// path orders land, every tap target in the tab at least 44 px, and the panel never scrolls sideways
// (the tree and the queue strip scroll inside themselves).
// Usage: pnpm build && node scripts/research-shots.mjs <outDir>
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const phone = { deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const sizes = [
  ["landscape", { viewport: { width: 844, height: 390 }, ...phone }, ["france", "mali"]],
  // Upright, a phone browser shows the "turn your phone sideways" notice; the Tall layout is a narrow upright window.
  ["tall", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: false, hasTouch: false }, ["france", "mali"]],
  ["desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }, ["france"]],
];
let problems = 0;
const fail = (...m) => {
  problems++;
  console.log(...m);
};
for (const [size, device, realms] of sizes) {
  for (const realm of realms) {
    const name = `${size}-${realm}`;
    const page = await browser.newPage(device);
    page.on("pageerror", (e) => fail("pageerror:", e.message));
    const press = async (l) => {
      await l.scrollIntoViewIfNeeded();
      await (device.hasTouch ? l.tap() : l.click());
      await page.waitForTimeout(250);
    };
    const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
    /** Every button and fold in the tab (not the shell's header and tab row) at least 44 px, and no sideways scroll. */
    const checkTargets = async (when) => {
      const small = await page.evaluate(() =>
        [...document.querySelectorAll(".panel button, .panel summary, .panel [data-whole]")]
          .filter((b) => b.offsetParent && !b.closest("header, nav.tabs") && (b.getBoundingClientRect().height < 44 || b.getBoundingClientRect().width < 44))
          .map((b) => `${b.className || b.tagName}: ${b.textContent.trim().slice(0, 30)} (${Math.round(b.getBoundingClientRect().width)}×${Math.round(b.getBoundingClientRect().height)})`),
      );
      if (small.length) fail(name, when, "small targets:", small.slice(0, 8));
      const sideways = await page.evaluate(() => {
        const p = document.querySelector(".panel");
        return Math.max(p.scrollWidth - p.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth);
      });
      if (sideways > 1) fail(name, when, "scrolls sideways by", sideways);
    };
    await page.goto("http://localhost:4177/");
    await page.waitForSelector(".map-layer", { timeout: 60000 });
    await page.waitForSelector(`[data-nation=${realm}]`, { timeout: 60000 });
    // The nation picker says where each realm starts (RSCH-105).
    const starts = await page.locator(`[data-nation=${realm}] .starts`).textContent();
    if (!/^Starts in (Ancient|Medieval|Era I)$/.test(starts ?? "")) fail(name, "picker standing reads", starts);
    if (realm === "france") await shot("picker");
    await page.click(`[data-nation=${realm}]`);
    await page.click("[data-begin]");
    await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
    await page.waitForTimeout(800);
    // First-campaign hints would cover the shots: stop them.
    const stop = page.locator(".hint-note button", { hasText: "Stop hints" });
    if (await stop.count()) await stop.first().click();
    // Nothing is studied at the start: the alert opens the Research tab.
    await shot("alert");
    const alert = page.locator(".alert [data-realm-open=learning]");
    if (await alert.count()) await alert.first().click();
    else {
      // The alert may have given way to others: the realm button in the top bar opens the card.
      await page.click(".hud [data-realm]");
      await page.click("#panel [data-realm-section=Research]").catch(() => {});
      await page.click("[data-realm-tab=learning]");
    }
    await page.waitForSelector(".learn-screen");
    await page.waitForTimeout(300);
    await shot("research");
    // One picture: four branch bands, no bough tabs (RSCH-100).
    if ((await page.locator(".tree-view.near .tree-bands .band-name").count()) !== 4) fail(name, "the tree has not four bands");
    if (await page.locator("[data-bough]").count()) fail(name, "the bough tabs are still there");
    if ((await page.locator(".tree-eras b.now").count()) !== 1) fail(name, "no era marked Now");
    await checkTargets("at the start");
    if (realm === "mali") {
      // Behind the times: the standing line and Catch up (RSCH-102, RSCH-103).
      const standing = await page.locator(".learn-standing .standing").textContent();
      if (!/behind the times/.test(standing)) fail(name, "standing reads", standing);
      await press(page.locator("[data-jump=catch]").last());
      await shot("catch-up");
      if (!(await page.locator(".pick-sheet.picked .pick-without").count())) fail(name, "a past invention's sheet has no Without it line");
      await press(page.locator("[data-jump=catch]").last());
      await shot("catch-up-next");
      await page.close();
      continue;
    }
    // A locked invention far off: the sheet shows the path and offers no Study now (RSCH-109).
    await press(page.locator(".tnode.locked").nth(30));
    await shot("path");
    if (await page.locator(".pick-sheet [data-study]").count()) fail(name, "a locked invention offers Study now");
    if (!(await page.locator(".tnode.path").count())) fail(name, "the path is not drawn in the tree");
    if (size === "tall") await checkTargets("with the sheet up");
    // Study now on one that can be studied.
    await press(page.locator("[data-jump=open]"));
    await shot("open");
    await press(page.locator(".pick-sheet [data-study]"));
    await page.waitForSelector(".q-study:not(.idle)");
    await shot("studying");
    // Add to queue: the next one that can be studied.
    await press(page.locator("[data-jump=open]"));
    await press(page.locator(".pick-sheet [data-queue-study]"));
    await page.waitForSelector(".q-chip");
    // Queue the path to a locked invention whose path fits.
    const locked = page.locator(".tnode.locked");
    let queued = false;
    for (let k = 0; k < 12 && !queued; k++) {
      // In Tall the sheet covers the bottom of the tree: its ✕ puts it away first.
      if (size === "tall" && (await page.locator("[data-sheet-close]").count())) await press(page.locator("[data-sheet-close]"));
      await press(locked.nth(k));
      if (await page.locator(".pick-sheet [data-queue-path]").count()) {
        await shot("queue-path");
        await press(page.locator(".pick-sheet [data-queue-path]"));
        queued = true;
      }
    }
    if (!queued) fail(name, "no path could be queued");
    const chips = await page.locator(".q-chip").count();
    if (chips < 2) fail(name, "the queue holds", chips);
    if (!(await page.locator(".tnode .qn").count())) fail(name, "queued inventions carry no place number in the tree");
    // A chip selects its invention and shows ◀ ▶ ✕ (RSCH-110).
    await press(page.locator(".q-chip").first());
    await shot("queue-chip");
    await checkTargets("with the queue");
    await press(page.locator(".q-item.on [data-unqueue]"));
    await page.waitForTimeout(200);
    if ((await page.locator(".q-chip").count()) >= chips) fail(name, "✕ did not remove from the queue");
    await shot("queue-removed");
    // Whole tree, then a place tapped in it opens Close up there (RSCH-101).
    if (size === "tall" && (await page.locator("[data-sheet-close]").count())) await press(page.locator("[data-sheet-close]"));
    await press(page.locator("[data-zoom]"));
    await page.waitForSelector(".tree-view.whole");
    await shot("whole");
    await checkTargets("in the whole tree");
    await page.locator("[data-whole]").scrollIntoViewIfNeeded();
    const plot = await page.locator("[data-whole]").boundingBox();
    if (device.hasTouch) await page.touchscreen.tap(plot.x + plot.width * 0.6, plot.y + plot.height * 0.7);
    else await page.mouse.click(plot.x + plot.width * 0.6, plot.y + plot.height * 0.7);
    await page.waitForSelector(".tree-view.near");
    await page.waitForTimeout(200);
    await shot("close-there");
    const moved = await page.evaluate(() => document.querySelector(".tree-view.near").scrollLeft);
    if (moved < 200) fail(name, "Close up did not open at the place tapped", moved);
    // Schools, one button away in the header.
    await press(page.locator("[data-learn-part=schools]"));
    await shot("schools");
    await checkTargets("in Schools");
    await press(page.locator("[data-learn-part=tree]"));
    // The General tab's line, then another realm's card (RSCH-088, RSCH-104).
    await page.click("#panel [data-realm-section=Realm]").catch(() => {});
    await page.click("[data-realm-tab=general]");
    await page.waitForTimeout(200);
    await page.locator(".learning-line").scrollIntoViewIfNeeded();
    await shot("general-line");
    await press(page.locator(".nations [data-realm]").first());
    await page.waitForTimeout(300);
    const line = page.locator("dt:text-is('Research') + dd");
    await line.scrollIntoViewIfNeeded();
    const text = await line.textContent();
    if (!/(abreast of|behind) the times/.test(text) || !/you don't/.test(text)) fail(name, "another realm's Research line reads", text);
    await shot("other-realm");
    await page.close();
  }
}
await browser.close();
server.httpServer.close();
if (problems) {
  console.log(`${problems} problem(s)`);
  process.exit(1);
}
console.log("research shots done");
