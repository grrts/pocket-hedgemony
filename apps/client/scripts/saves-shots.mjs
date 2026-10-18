// The game menu, Save, Load and Settings on phones held sideways and a tall tablet, played through with taps:
// save by hand, end a week (Resume save), exit to the start screen, Continue, load the hand save, change settings.
// Usage: pnpm build && node scripts/saves-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const check = (ok, what) => {
  console.log(ok ? "ok  " : "FAIL", what);
  if (!ok) failed = true;
};
/** Every visible button and input in the overlay is at least 44 × 44 CSS px, and none runs off the screen. */
const targets = (page) =>
  page.evaluate(() => {
    const bad = [];
    for (const el of document.querySelectorAll("#overlay button, #overlay input, .start-actions button")) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).visibility === "hidden") continue;
      if (r.height < 43.5 || (el.tagName === "BUTTON" && r.width < 43.5)) bad.push(`${el.textContent.trim() || el.getAttribute("aria-label")} ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (r.right > innerWidth + 1 || r.left < -1) bad.push(`off screen: ${el.textContent.trim()}`);
    }
    return bad;
  });

for (const [name, device] of [
  ["phone", devices["iPhone SE landscape"]],
  ["landscape", devices["Pixel 7 landscape"]],
  // A tall desktop window (phones and tablets held upright show the turn-sideways notice).
  ["tall", { viewport: { width: 720, height: 1000 } }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  const tap = (sel) => (device.hasTouch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
  await page.goto("http://localhost:4178/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  check(!(await page.$("[data-continue]")), `${name}: no Continue before any save`);
  await tap("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);

  // The game menu, from the top bar.
  await tap(".hud .game-menu");
  await page.waitForSelector(".game-menu");
  await shot("menu");
  check((await targets(page)).length === 0, `${name}: menu tap targets ${JSON.stringify(await targets(page))}`);

  // Save by hand with the default name.
  await tap(".game-menu [data-shell=save]");
  await page.waitForSelector(".new-save");
  check((await page.inputValue(".new-save input")) === "Castile, November 1444", `${name}: default save name`);
  await shot("save");
  check((await targets(page)).length === 0, `${name}: save tap targets ${JSON.stringify(await targets(page))}`);
  await tap(".new-save button[type=submit]");
  await page.waitForSelector("#toast:not([hidden])", { timeout: 30000 });
  check((await page.textContent("#toast")) === "Saved.", `${name}: toast says Saved.`);

  // Settings: turn playback 4×, then end a week (the Resume save follows it).
  await page.keyboard.press("Escape");
  await tap(".game-menu [data-shell=settings]");
  await page.waitForSelector(".settings");
  await shot("settings");
  if (name === "tall") await tap(".settings [data-section=gameplay]");
  await tap('[data-set="gameplay.turn_speed"][data-v="4"]');
  check(await page.isVisible('[data-row="gameplay.turn_speed"] .changed'), `${name}: changed dot on Turn playback speed`);
  await tap(name === "tall" ? ".settings-back" : "[data-section=accessibility]");
  if (name === "tall") await tap("[data-section=accessibility]");
  await tap('[data-set="accessibility.text_size"][data-v="\\"larger\\""]');
  await shot("settings-larger");
  check((await targets(page)).length === 0, `${name}: settings tap targets ${JSON.stringify(await targets(page))}`);
  await page.waitForTimeout(200);
  await tap('[data-set="accessibility.text_size"][data-v="\\"normal\\""]');
  if (name === "tall") await tap(".settings-back");
  await tap("[data-section=graphics]");
  await tap('[data-set="graphics.battery_saver"][data-v="\\"on\\""]');
  check((await page.textContent('[data-row="graphics.frame_cap"] small')) === "Set by Battery saver", `${name}: Battery saver drives the frame cap`);
  await shot("settings-battery");
  await tap(".settings .close");
  await tap(".game-menu [data-shell=map]");
  const t0 = Date.now();
  await tap("#fab");
  await page.waitForFunction(() => window.__phTurn() === 1, null, { timeout: 60000 });
  console.log(name, "week played in", Date.now() - t0, "ms at 4×");
  await page.waitForTimeout(2500);

  // Load lists where we left off and the hand save.
  await page.keyboard.press("Escape");
  await tap(".game-menu [data-shell=load]");
  await page.waitForSelector(".save-list .save-pick");
  const lines = await page.$$eval(".save-pick", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
  console.log(name, "load lines:", lines);
  check(lines.length === 2 && lines[0].includes("Where you left off"), `${name}: Load lists where you left off first, then the save`);
  await tap(".save-pick >> nth=1");
  await shot("load");
  check((await targets(page)).length === 0, `${name}: load tap targets ${JSON.stringify(await targets(page))}`);

  // Exit to the start screen, where Continue goes back to the week just played.
  await page.keyboard.press("Escape");
  await tap(".game-menu [data-shell=exit]");
  await page.waitForSelector("[data-continue]", { timeout: 60000 });
  await shot("start");
  check((await page.textContent("[data-continue]")).includes("Continue: Castile"), `${name}: Continue names the realm`);
  await tap("[data-continue]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  check((await page.evaluate(() => window.__phTurn())) === 1, `${name}: Continue opens week 2`);
  // The settings outlived the reload.
  await page.keyboard.press("Escape");
  await tap(".game-menu [data-shell=settings]");
  if (name === "tall") await tap(".settings [data-section=gameplay]");
  else await tap("[data-section=gameplay]");
  check(await page.getAttribute('[data-set="gameplay.turn_speed"][data-v="4"]', "aria-checked") === "true", `${name}: settings kept`);
  await tap(".settings .close");

  // Loading the hand save from the game asks first: a week since the last save.
  await tap(".game-menu [data-shell=load]");
  await tap(".save-pick >> nth=1");
  await tap("[data-load]");
  await page.waitForSelector("[data-leave]");
  await shot("load-ask");
  await tap("[data-leave]");
  await page.waitForFunction(() => window.__phTurn() === 0, null, { timeout: 60000 });
  check(true, `${name}: the hand save opens at week 1`);
  await page.close();
}
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
