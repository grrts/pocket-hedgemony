// Research as its own screen (RSCH-084 to RSCH-113): the nation picker's standing, the "choose what to study"
// alert, the top bar's research plaque, Next (the study, the queue and what can be started, best first),
// Study and ＋ from Next, the Tree (jump chips, the one tree with its four branch bands, the sheet beside it
// or sliding up from the bottom), Queue the path, the Whole tree zoom and tapping a place in it, moving and
// removing in the queue, Schools, the General tab's line and another realm's line. France plays on every
// size; Mali (which starts in Ancient) shows Catch up first.
// Sizes: a phone held sideways (844 × 390), a narrow upright window (390 × 844, the Tall layout) and a desktop.
// Checks: Next, Tree and Schools in the Realm book's pages row, the top bar fits, one picture with four bands, no bough tabs,
// a locked invention offers no Study now, queue and path orders land, every tap target on the screen at
// least 44 px, and the panel never scrolls sideways (the tree scrolls inside itself).
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
      await page.click("#panel [data-realm-section=Research]");
      await page.click(".tabs.pages [data-learn-part=next]");
    }
    await page.waitForSelector(".learn-screen.next");
    await page.waitForTimeout(300);
    await shot("research");
    // Research takes the screen; its parts stand in the Realm book's pages row, and the top bar's plaque asks for a study (RSCH-113).
    const parts = await page.locator(".tabs.pages .tab").allTextContents();
    if (!/^Next,Tree,Schools · \d+,Peoples$/.test(parts.join(","))) fail(name, "the pages row reads", parts);
    if (!(await page.locator(".hud .research-plaque.idle").count())) fail(name, "the top bar has no research plaque asking for a study");
    const hudOver = await page.evaluate(() => {
      const h = document.querySelector(".hud");
      return h.scrollWidth - h.clientWidth;
    });
    if (hudOver > 1) fail(name, "the top bar overflows by", hudOver);
    if (!(await page.locator(".next-card").count())) fail(name, "Next offers nothing to start");
    await checkTargets("at the start");
    if (realm === "mali") {
      // Behind the times: the standing and Catch up first in Next (RSCH-103, RSCH-113).
      const standing = await page.locator(".learn-stand").textContent();
      if (!/Behind by/.test(standing)) fail(name, "standing reads", standing);
      if (!(await page.locator(".next-card").first().locator(".tag.catch").count())) fail(name, "Next does not put a past invention first");
      await press(page.locator("[data-jump=catch]").last());
      await shot("catch-up");
      if (!(await page.locator(".pick-sheet.picked .pick-without").count())) fail(name, "a past invention's sheet has no Without it line");
      await page.close();
      continue;
    }
    // Study the first pick, then queue the next two from Next (RSCH-113).
    await press(page.locator(".next-card [data-study]").first());
    await page.waitForSelector("button.next-now");
    if (!(await page.locator(".hud .research-plaque:not(.idle)").count())) fail(name, "the plaque does not show the study");
    await press(page.locator(".next-card [data-queue-study]").first());
    await page.waitForSelector(".next-q");
    await press(page.locator(".next-card [data-queue-study]").first());
    await page.waitForTimeout(200);
    await shot("next");
    await checkTargets("in Next with a queue");
    // The tree: one picture, four branch bands, no bough tabs (RSCH-100).
    await press(page.locator(".tabs.pages [data-learn-part=tree]"));
    await page.waitForSelector(".tree-view.near");
    await shot("tree");
    if ((await page.locator(".tree-view.near .tree-bands .band-name").count()) !== 4) fail(name, "the tree has not four bands");
    if (await page.locator("[data-bough]").count()) fail(name, "the bough tabs are still there");
    if ((await page.locator(".tree-eras b.now").count()) !== 1) fail(name, "no era marked Now");
    await checkTargets("in the tree");
    // A locked invention far off: the sheet shows the path and offers no Study now (RSCH-109).
    await press(page.locator(".tnode.locked").nth(30));
    await shot("path");
    if (await page.locator(".pick-sheet [data-study]").count()) fail(name, "a locked invention offers Study now");
    if (!(await page.locator(".tnode.path").count())) fail(name, "the path is not drawn in the tree");
    if (size === "tall") await checkTargets("with the sheet up");
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
    // The order's answer redraws the screen: wait for it before tapping on.
    await page.waitForTimeout(500);
    if (!(await page.locator(".tnode .qn").count())) fail(name, "queued inventions carry no place number in the tree");
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
    // Back in Next: the queue moves and ✕ removes (RSCH-110).
    await press(page.locator(".tabs.pages [data-learn-part=next]"));
    const rows = await page.locator(".next-q").count();
    if (rows < 3) fail(name, "the queue holds", rows);
    const second = await page.locator(".next-q .q-name span").nth(1).textContent();
    await press(page.locator(".next-q [data-by='-1']").nth(1));
    await page.waitForTimeout(200);
    if ((await page.locator(".next-q .q-name span").first().textContent()) !== second) fail(name, "▲ did not move the study earlier");
    await press(page.locator(".next-q [data-unqueue]").first());
    await page.waitForTimeout(200);
    if ((await page.locator(".next-q").count()) >= rows) fail(name, "✕ did not remove from the queue");
    await shot("queue-moved");
    // Schools, one tab away.
    await press(page.locator(".tabs.pages [data-learn-part=schools]"));
    await shot("schools");
    await checkTargets("in Schools");
    // The General tab's line opens Research on Next, then another realm's card (RSCH-088, RSCH-104).
    await page.click(".hud button.realm");
    await page.waitForTimeout(200);
    await page.locator(".learning-line").scrollIntoViewIfNeeded();
    await shot("general-line");
    await press(page.locator(".learning-line"));
    if (!(await page.locator(".learn-screen.next").count())) fail(name, "the General line does not open Next");
    await page.click(".hud button.realm");
    await page.waitForTimeout(200);
    await press(page.locator(".nations [data-realm]").first());
    await page.waitForTimeout(300);
    const line = page.locator("dt:text-is('Research') + dd");
    await line.scrollIntoViewIfNeeded();
    const text = await line.textContent();
    if (!/(abreast of|behind) the times/.test(text) || !/ahead of you/.test(text)) fail(name, "another realm's Research line reads", text);
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
