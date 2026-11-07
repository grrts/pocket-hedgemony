// Coming up on Realm's Overview (SHELL-188, SHELL-189) and quiet weeks on Auto (SHELL-190), as a realm:
// plays a week with Auto off and one on Auto, timing both, reads the Auto button's word, then opens the
// Overview with its Coming up strip on a small and a large phone held sideways, a tall window and a desktop,
// and taps the first item. Fails if a Coming up chip is under 44 points or the strip scrolls sideways.
// Usage: pnpm build && node scripts/coming-up-shots.mjs <outDir> [nation]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const nation = process.argv[3] ?? "france";
const server = await preview({ preview: { port: 4188, strictPort: true } });
const browser = await chromium.launch({ ...(process.env.PH_CHROME ? { executablePath: process.env.PH_CHROME } : {}), args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const check = (ok, what) => {
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
/** Answers event cards that open over everything, as a player would; true when one was answered. */
async function answerEvents(page) {
  let any = false;
  for (let k = 0; k < 6; k++) {
    const opt = page.locator("#event-card:not([hidden]) [data-event-option]");
    if (!(await opt.count())) break;
    await opt.first().click().catch(() => {});
    any = true;
    await page.waitForTimeout(300);
  }
  return any;
}
/** Waits for the week after `t`, answering event cards on the way; says whether one stopped the week. */
async function weekAfter(page, t) {
  let stopped = false;
  for (let k = 0; k < 400; k++) {
    if ((await page.evaluate(() => window.__phTurn())) > t) return stopped;
    stopped = (await answerEvents(page)) || stopped;
    await page.waitForTimeout(300);
  }
  throw new Error("the week never ended");
}
let timed = false;
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto(`http://localhost:4188/?feature=${nation}`);
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector(`[data-nation=${nation}]`, { timeout: 60000 });
  await page.click(`[data-nation=${nation}]`);
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  if (!timed) {
    timed = true;
    const week = async (auto) => {
      const t = await page.evaluate(() => window.__phTurn());
      const t0 = Date.now();
      if (auto) await page.click("#auto-turns");
      else await page.click(".end-turn");
      await page.waitForTimeout(800);
      const label = await page.evaluate(() => document.querySelector("#auto-turns span")?.textContent ?? "");
      const stopped = await weekAfter(page, t);
      return { ms: Date.now() - t0, label, stopped };
    };
    await answerEvents(page);
    const plain = await week(false);
    await page.waitForFunction(() => !document.querySelector("#fab.playing"), null, { timeout: 60000 });
    const fast = await week(true);
    console.log(`a week with Auto off: ${plain.ms} ms${plain.stopped ? " (an event stopped it)" : ""}; on Auto: ${fast.ms} ms${fast.stopped ? " (an event stopped it)" : ""}, the button reading "${fast.label}"`);
    if (!plain.stopped && !fast.stopped) check(fast.label === "Auto ×3" ? fast.ms < plain.ms : fast.label === "Auto", "a quiet week on Auto plays faster, or the button says why not");
    // Stop Auto at the end of the week.
    if (await page.locator("#auto-turns.on").count()) await page.click("#auto-turns");
    for (let k = 0; k < 40 && (await page.locator("#auto-turns.on, #auto-turns.stopping, #fab.playing").count()); k++) {
      await answerEvents(page);
      await page.waitForTimeout(500);
    }
    await page.waitForFunction(() => !document.querySelector("#auto-turns.on, #auto-turns.stopping") && !document.querySelector("#fab.playing"), null, { timeout: 120000 });
    await page.waitForTimeout(500);
  }
  await answerEvents(page);
  await page.evaluate(() => window.__phRealmTab("general"));
  await page.waitForTimeout(400);
  const strip = page.locator("#panel .coming-up");
  if (!(await strip.count())) {
    console.log(`${name}: nothing coming for ${nation} yet`);
    await shot("overview-empty");
    await page.close();
    continue;
  }
  await strip.scrollIntoViewIfNeeded();
  await shot("overview");
  const items = await page.$$eval("#panel .coming-item", (els) => els.map((e) => ({ text: e.textContent.trim(), h: e.getBoundingClientRect().height })));
  console.log(`${name}:`, items.map((x) => x.text).join(" | "));
  check(items.every((x) => x.h >= 44), `${name}: every Coming up chip is at least 44 points tall`);
  check(await page.$eval("#panel .coming", (e) => e.scrollWidth <= e.clientWidth + 1), `${name}: the strip never scrolls sideways`);
  await page.click("#panel .coming-item >> nth=0");
  await page.waitForTimeout(400);
  await shot("tapped");
  await page.close();
}
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
