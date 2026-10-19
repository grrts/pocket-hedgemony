// Plays the multiplayer prototype through the real UI and takes screenshots:
//   1. Pass and play: two realms on one phone, each plans in turn, the week plays.
//   2. Online: two tabs of one browser (the browser-storage table), one hosts and
//      one joins, both press Ready, both play the week and agree on the hash.
// Usage: pnpm build && node scripts/multiplayer-shots.mjs <outDir>
import { mkdirSync } from "node:fs";
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? "mp-shots";
mkdirSync(out, { recursive: true });
const server = await preview({ preview: { port: 4174, strictPort: true } });
const base = "http://localhost:4174/?start";
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const check = (ok, what) => {
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${what}`);
};
const ready = (page) => page.waitForFunction(() => globalThis.__phDiagnostics?.engineRoundTripMs != null, null, { timeout: 30000 });
const mpState = (page) => page.evaluate(() => globalThis.__phMp());

async function hotseat(device, name) {
  const context = await browser.newContext({ ...devices[device] });
  const page = await context.newPage();
  await page.goto(base);
  await ready(page);
  await page.click("[data-start=multiplayer]");
  await page.waitForSelector(".mp-menu");
  await page.screenshot({ path: `${out}/${name}-1-menu.png` });
  await page.click("[data-mp=hotseat]");
  await page.click("[data-nation=castile]");
  await page.click("[data-nation=portugal]");
  await page.screenshot({ path: `${out}/${name}-2-choose.png` });
  await page.click("[data-mp-go]");
  await page.waitForSelector(".mp-cover:not([hidden])", { timeout: 60000 });
  await page.screenshot({ path: `${out}/${name}-3-cover.png` });
  await page.click("[data-mp-plan]");
  await page.waitForSelector(".mp-cover[hidden]", { state: "attached" });
  await page.screenshot({ path: `${out}/${name}-4-castile-plans.png` });
  await page.click(".mp-plaque");
  await page.screenshot({ path: `${out}/${name}-5-players.png` });
  await page.click(".end-turn");
  await page.waitForSelector(".mp-cover:not([hidden])");
  await page.click("[data-mp-plan]");
  await page.click(".end-turn");
  // The week plays, and the device goes back to the first player.
  await page.waitForFunction(() => globalThis.__phMp()?.turn === 1 && globalThis.__phMp()?.cover >= 0, null, { timeout: 60000 });
  await page.screenshot({ path: `${out}/${name}-6-next-week.png` });
  check(true, `${name}: pass and play plays a week`);
  await context.close();
}

async function online() {
  const context = await browser.newContext({ ...devices["Pixel 7 landscape"] });
  const a = await context.newPage();
  const b = await context.newPage();
  await a.goto(base);
  await b.goto(base);
  await ready(a);
  await ready(b);
  await a.click("[data-start=multiplayer]");
  await a.click("[data-mp=host]");
  await a.click("[data-nation=castile]");
  await a.waitForSelector("[data-mp-start]");
  const code = (await a.textContent(".mp-code")).trim();
  await b.click("[data-start=multiplayer]");
  await b.waitForSelector("[data-mp-join-form] input:not([disabled])");
  await b.fill("#mp-code-input", "zzzzz");
  await b.click("[data-mp-join-form] button");
  await b.waitForSelector(".mp-menu [role=alert]");
  await b.evaluate(() => (document.querySelector(".mp-menu").scrollTop = 1e4));
  await b.screenshot({ path: `${out}/online-1-wrong-code.png` });
  await b.fill("#mp-code-input", code.toLowerCase());
  await b.click("[data-mp-join-form] button");
  await b.click("[data-nation=france]");
  await a.waitForSelector("[data-mp-start]:not([disabled])");
  await a.screenshot({ path: `${out}/online-2-lobby.png` });
  await a.click("[data-mp-start]");
  await a.waitForFunction(() => globalThis.__phMp()?.turn === 0, null, { timeout: 60000 });
  await b.waitForFunction(() => globalThis.__phMp()?.turn === 0, null, { timeout: 60000 });
  check((await mpState(a)).hash === (await mpState(b)).hash, "online: both devices start from the same world");
  for (let week = 1; week <= 3; week++) {
    await a.click(".end-turn");
    await a.waitForFunction(() => globalThis.__phMp()?.waiting === true);
    if (week === 1) await a.screenshot({ path: `${out}/online-3-waiting.png` });
    await b.click(".end-turn");
    await a.waitForFunction((w) => globalThis.__phMp()?.turn === w && !globalThis.__phMp()?.waiting, week, { timeout: 90000 });
    await b.waitForFunction((w) => globalThis.__phMp()?.turn === w && !globalThis.__phMp()?.waiting, week, { timeout: 90000 });
    const [sa, sb] = [await mpState(a), await mpState(b)];
    check(sa.hash === sb.hash && !sa.outOfStep && !sb.outOfStep, `online week ${week}: both devices agree (${sa.hash} / ${sb.hash})`);
  }
  await a.screenshot({ path: `${out}/online-4-after.png` });
  // Coming back: a third tab comes back from Your games and plays the weeks again to the same world.
  const c = await context.newPage();
  await c.goto(base);
  await ready(c);
  await c.click("[data-start=multiplayer]");
  await c.waitForSelector("[data-mp-rejoin]");
  await c.evaluate(() => (document.querySelector(".mp-menu").scrollTop = 1e4));
  await c.screenshot({ path: `${out}/online-5-your-games.png` });
  await c.click("[data-mp-rejoin]");
  await c.waitForFunction(() => globalThis.__phMp()?.turn === 3, null, { timeout: 120000 });
  check((await mpState(c)).hash === (await mpState(a)).hash, "online: a device coming back catches up to the same world");
  await context.close();
}

try {
  await hotseat("Pixel 7 landscape", "phone");
  await hotseat("iPad Pro 11 landscape", "tablet");
  await online();
} catch (e) {
  console.log("FAIL", e);
  failed = true;
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
