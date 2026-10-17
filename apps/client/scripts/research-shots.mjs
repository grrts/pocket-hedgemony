// Research as France (milestone 4): the "choose what to study" alert, the Learning tab (study, seats,
// schools, inventions by era, what you know) and the General tab's line, on a small and a large phone
// held sideways (the Short wide layout) and a desktop window taller than wide (the Tall layout).
// Also checks that no tap target in the tab is under 44 px and that nothing scrolls sideways.
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
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4177/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);
  // Nothing is studied at the start: the alert opens the Learning tab.
  await shot("alert");
  await page.click(".alert [data-realm-open=learning]");
  await page.waitForTimeout(300);
  await shot("learning-top");
  await page.click("[data-study]");
  await page.waitForTimeout(300);
  await shot("learning-studying");
  await page.locator(".stepper").scrollIntoViewIfNeeded();
  await page.click(".stepper [data-seats]:last-of-type");
  await page.waitForTimeout(300);
  await page.locator(".stepper").scrollIntoViewIfNeeded();
  await shot("learning-seats");
  await page.click(".found-school summary");
  await page.waitForTimeout(200);
  await page.locator(".found-school").scrollIntoViewIfNeeded();
  await shot("learning-found");
  await page.locator("h4.era").first().scrollIntoViewIfNeeded();
  await shot("learning-inventions");
  await page.click(".known-list summary");
  await page.waitForTimeout(200);
  await page.locator(".known-list").scrollIntoViewIfNeeded();
  await shot("learning-known");
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
