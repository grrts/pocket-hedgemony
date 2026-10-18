// Plays France with Auto turns (SHELL-159..161): checks weeks start by themselves, that a tap
// stops them at the end of the week, and screenshots the Auto button on, stopping and off.
// Usage: pnpm build && node scripts/auto-turns-shots.mjs <outDir> [device]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const device = process.argv[3] ?? "Pixel 7 landscape";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage(device === "desktop" ? { viewport: { width: 1440, height: 900 } } : { ...devices[device] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4177/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=france]");
await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
await page.waitForTimeout(2000);
const turn = () => page.evaluate(() => window.__phTurn());
let failed = false;
const check = (ok, what) => {
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
await page.screenshot({ path: `${out}/0-auto-off.png` });
const t0 = await turn();
await page.click("#auto-turns");
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/1-auto-on.png` });
// Three weeks with no tap, unless something needed the player and stopped them.
await page.waitForFunction((t) => window.__phTurn() >= t + 3 || !document.querySelector("#auto-turns.on, #auto-turns.stopping"), t0, { timeout: 120000 });
const t1 = await turn();
console.log("weeks played on their own:", t1 - t0, "alerts:", await page.evaluate(() => document.querySelector("#alerts").innerText.replace(/\n/g, " | ")));
check(t1 - t0 >= 1, "weeks start by themselves");
if (await page.locator("#auto-turns.on").count()) {
  // Pausing finishes the current week.
  await page.waitForFunction(() => document.querySelector("#fab.playing"), null, { timeout: 30000 });
  const during = await turn();
  await page.click(".end-turn");
  const stoppingNow = await page.evaluate(() => document.querySelector("#auto-turns").className);
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/2-auto-stopping.png` });
  // A tap between two weeks, while the saves are written, stops Auto turns at once.
  check(stoppingNow.includes("stopping") || !/\bon\b/.test(stoppingNow), "End turn stops Auto turns at the week's end");
  await page.waitForFunction(() => !document.querySelector("#fab.playing"), null, { timeout: 60000 });
  const ended = await turn();
  await page.waitForTimeout(3000);
  check(ended <= during + 1 && (await turn()) === ended, "the week played to its end and no new week started");
  check((await page.locator("#auto-turns.on, #auto-turns.stopping").count()) === 0, "Auto turns are off");
  check((await page.locator("#fab.playing").count()) === 0, "orders can be given");
  await page.screenshot({ path: `${out}/3-auto-stopped.png` });
}
await browser.close();
await server.close();
process.exit(failed ? 1 : 0);
