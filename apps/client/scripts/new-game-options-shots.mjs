// The options step of a new game (scenario-setup SETUP-054, SETUP-055, SETUP-058): a suggested realm tapped opens
// "Rules of the campaign" with the last choices; ironman and fog are turned on and off with taps; Begin starts the
// campaign, and the game menu shows its rules read-only, without Save in ironman. On a phone held sideways (844 × 390)
// and a narrow upright window (390 × 844). Each screen reports buttons and selects under 44 points, sideways
// overflow and a card off screen.
// Usage: pnpm build && node scripts/new-game-options-shots.mjs <outDir>
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4193, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const report = (ok, what) => {
  console.log(ok ? "ok  " : "FAIL", what);
  if (!ok) failed = true;
};
const check = (page, name, what, root = "#panel") =>
  page
    .evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el || el.hidden) return { hidden: true };
      const small = [...el.querySelectorAll("button:not([disabled]), select")]
        .filter((b) => b.offsetParent)
        .map((b) => [b, b.getBoundingClientRect()])
        .filter(([, r]) => r.height < 43.5 || r.width < 43.5)
        .map(([b, r]) => `${(b.textContent.trim() || b.getAttribute("aria-label")).slice(0, 24)} ${Math.round(r.width)}×${Math.round(r.height)}`);
      const r = el.getBoundingClientRect();
      return { small, sideways: el.scrollWidth > el.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, offscreen: r.left < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1 };
    }, root)
    .then((r) => report(!r.hidden && !r.small?.length && !r.sideways && !r.offscreen, `${name} ${what} ${JSON.stringify(r)}`));

const layouts = [
  ["landscape", { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }],
  ["portrait", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 }],
];
try {
  for (const [name, device] of layouts) {
    const page = await browser.newPage(device);
    page.on("pageerror", (e) => console.log("pageerror:", e.message));
    const shot = (what) => page.screenshot({ path: `${out}/options-${name}-${what}.png`, timeout: 120000 });
    const tap = (sel) => (device.hasTouch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
    await page.goto("http://localhost:4193/");
    await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
    await page.waitForTimeout(500);
    if (await page.isVisible("[data-hint=stop]")) await tap("[data-hint=stop]");
    await tap("[data-nation=france]");
    await page.waitForSelector(".ng-rules", { timeout: 10000 });
    await page.waitForTimeout(300);
    // The first-campaign hint points at Begin; a player reads it once, the later shots put it away.
    await shot("step-hint");
    if (await page.isVisible("[data-hint=stop]")) await tap("[data-hint=stop]");
    await page.waitForTimeout(200);
    await shot("step");
    await check(page, name, "options step");
    report(await page.isVisible("[data-begin]"), `${name}: Begin in view without scrolling`);
    await tap('[data-rule=ironman][data-value="true"]');
    await tap('[data-rule=fogOfWar][data-value="false"]');
    await tap('[data-rule=difficulty][data-value="hard"]');
    await page.selectOption("[data-rule-end]", "1800-08-31");
    await page.waitForTimeout(200);
    await shot("ironman");
    report((await page.textContent(".ng-meaning")).includes("Achievements count"), `${name}: ironman says achievements count`);
    await page.evaluate(() => {
      const p = document.querySelector("#panel");
      p.scrollTop = p.scrollHeight;
    });
    await page.waitForTimeout(200);
    await shot("step-end");
    // Back to the realms and in again: the choices stay.
    await tap("[data-options-back]");
    await page.waitForSelector("[data-nation=france]");
    await tap("[data-nation=france]");
    report(await page.isVisible('[data-rule=ironman][data-value="true"][aria-checked="true"]'), `${name}: choices kept after Back`);
    await tap("[data-begin]");
    await page.waitForSelector(".hud [data-news]", { timeout: 120000 });
    await page.waitForTimeout(800);
    await tap(".hud .game-menu");
    await page.waitForSelector(".game-menu");
    await page.waitForTimeout(200);
    await shot("menu");
    await check(page, name, "game menu", "#overlay .game-menu");
    const rules = await page.textContent(".menu-rules");
    report(rules.includes("Hard") && rules.includes("ironman") && rules.includes("no fog") && rules.includes("1800"), `${name}: menu shows the rules: ${rules.trim()}`);
    report(!(await page.isVisible(".game-menu [data-shell=save]")), `${name}: no Save in ironman`);
    // The next new game starts from these choices (SETUP-058).
    report((await page.evaluate(() => localStorage.getItem("ph-new-game-rules"))).includes('"ironman":true'), `${name}: choices remembered`);
    await page.close();
  }
} finally {
  await browser.close();
  server.httpServer.close();
}
if (failed) {
  console.log("Some checks failed (see above).");
  process.exitCode = 1;
}
