// Research as France: the "choose what to study" alert, the Research tab (the overview, the tree with a
// locked and an open invention tapped, studying, another branch, then Schools with seats and founding)
// and the General tab's line, on a small and a large phone held sideways (the Short wide layout)
// and a desktop window taller than wide (the Tall layout). Also checks that a
// locked invention offers no Study button, that no tap target in the tab is under 44 px, and that the
// panel never scrolls sideways (the tree scrolls inside its own frame).
// Usage: pnpm build && node scripts/research-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const tall = { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false };
let problems = 0;
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", tall]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => {
    problems++;
    console.log("pageerror:", e.message);
  });
  const press = (l) => (device.hasTouch ? l.tap() : l.click());
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4177/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);
  // Nothing is studied at the start: the alert opens the Research tab.
  await shot("alert");
  await page.click(".alert [data-realm-open=learning]");
  await page.waitForTimeout(300);
  await shot("learning-top");
  await page.locator(".tree-view").scrollIntoViewIfNeeded();
  await shot("tree");
  // A locked invention: the sheet says what to learn first and offers no Study button.
  await press(page.locator(".tnode.locked").first());
  await page.waitForTimeout(300);
  await shot("tree-locked");
  if (await page.locator(".pick-sheet [data-study]").count()) {
    problems++;
    console.log(name, "a locked invention offers a Study button");
  }
  await press(page.locator(".tnode.open").first());
  await page.waitForTimeout(300);
  await shot("tree-open");
  await press(page.locator(".pick-sheet [data-study]"));
  await page.waitForTimeout(300);
  await shot("learning-studying");
  await press(page.locator("[data-bough=R2]"));
  await page.waitForTimeout(300);
  await shot("tree-fire-and-metal");
  const outside = await page.evaluate(() => {
    const v = document.querySelector(".tree-view").getBoundingClientRect();
    return v.width > 0 && v.height >= 200 ? 0 : 1;
  });
  if (outside) console.log(name, "the tree frame is too small");
  problems += outside;
  await press(page.locator("[data-learn-part=schools]"));
  await page.waitForTimeout(300);
  await shot("schools");
  await press(page.locator(".stepper [data-seats]:last-of-type"));
  await page.waitForTimeout(300);
  await page.locator(".stepper").scrollIntoViewIfNeeded();
  await shot("schools-seats");
  await press(page.locator(".found-school:not(.arms) summary"));
  await page.waitForTimeout(200);
  await page.locator(".found-school:not(.arms)").scrollIntoViewIfNeeded();
  await shot("schools-found");
  // Every button and fold in the tab (not the shell's header and tab row) is at least 44 px tall, and the panel never scrolls sideways.
  const small = await page.evaluate(() =>
    [...document.querySelectorAll(".panel button, .panel summary")]
      .filter((b) => b.offsetParent && !b.closest("header, nav.tabs") && b.getBoundingClientRect().height < 44)
      .map((b) => `${b.className || b.tagName}: ${b.textContent.trim().slice(0, 30)} (${Math.round(b.getBoundingClientRect().height)}px)`),
  );
  const sideways = await page.evaluate(() => {
    const p = document.querySelector(".panel");
    return p.scrollWidth - p.clientWidth;
  });
  if (small.length) console.log(name, "small targets:", small.slice(0, 12));
  if (sideways > 1) console.log(name, "panel scrolls sideways by", sideways);
  problems += small.length + (sideways > 1 ? 1 : 0);
  await page.click("[data-realm-tab=general]");
  await page.waitForTimeout(200);
  await page.locator(".learning-line").scrollIntoViewIfNeeded();
  await shot("general-line");
  await page.close();
}
await browser.close();
server.httpServer.close();
if (problems) {
  console.log(`${problems} problem(s)`);
  process.exit(1);
}
console.log("research shots done");
