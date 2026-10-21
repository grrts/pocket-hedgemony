// The tutorial hints on a phone, played by touch: at every stage the script
// taps the middle of the brass ring and nothing else, so each hint has to ring
// the exact control that moves it on (onboarding TUT-121 … TUT-130, TUT-135).
// Then the Settings switch, and the phone held upright.
// Usage: pnpm build && node scripts/hints-shots.mjs [outDir]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? "shots";
const server = await preview({ preview: { port: 4176, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ ...devices["Pixel 7 landscape"] })).newPage();
const shot = (name) => page.screenshot({ path: `${out}/hints-${name}.png` });
const hint = () => page.evaluate(() => (document.querySelector(".hint-note")?.hidden ? null : document.querySelector(".hint-note")?.dataset.hint ?? null));
let failed = false;
const fail = (why) => ((failed = true), console.log(`FAIL ${why}`));

/** Boxes overlap. */
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

await page.goto("http://localhost:4176/?new");
await page.waitForSelector(".hint-note:not([hidden])");
const seen = [];
let taps = 0;
let stage = 0;
while (taps < 60) {
  // An event card holds the hints back: answer it as a player would.
  const option = page.locator("#event-card:not([hidden]) [data-event-option]").first();
  if (await option.count()) {
    await option.tap();
    await page.waitForTimeout(400);
    continue;
  }
  // The week plays: wait for End turn to come back.
  if (await page.locator(".end-turn.playing").count()) {
    await page.waitForFunction(() => !document.querySelector(".end-turn")?.classList.contains("playing"), null, { timeout: 120000 });
    await page.waitForTimeout(500);
    continue;
  }
  const id = await hint();
  if (!id) {
    // Held back for a moment (the loading screen, a card, the turn): look again before calling it done.
    await page.waitForFunction(() => document.querySelector("#loader")?.classList.contains("done") || document.querySelector("#loader")?.hidden, null, { timeout: 120000 });
    await page.waitForTimeout(800);
    if (await hint()) continue;
    break;
  }
  if (seen.at(-1) !== id) seen.push(id);
  const line = (await page.locator(".hint-note p").textContent())?.trim();
  // A card that has just opened may still be scrolling its button into view.
  if (await page.locator(".hint-ring").isHidden()) await page.waitForTimeout(1000);
  const ring = (await page.locator(".hint-ring").isHidden()) ? null : await page.locator(".hint-ring").boundingBox();
  const note = await page.locator(".hint-note").boundingBox();
  console.log(`${id}: ${line} | ring ${ring ? "on" : "OFF"}`);
  await shot(`${String(++stage).padStart(2, "0")}-${id}`);
  if (!ring) {
    fail(`hint ${id} rings nothing at "${line}"`);
    if (await page.locator("[data-hint=show]").count()) await page.tap("[data-hint=show]");
    else await page.tap("[data-hint=dismiss]");
  } else {
    if (overlaps(ring, note)) fail(`the note covers the ring for ${id}`);
    const x = ring.x + ring.width / 2;
    const y = ring.y + ring.height / 2;
    const under = await page.evaluate(([x, y]) => {
      const el = document.elementFromPoint(x, y);
      return el ? `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}.${[...el.classList].join(".")} ${(el.closest("button")?.textContent ?? "").trim().slice(0, 30)}` : "nothing";
    }, [x, y]);
    console.log(`  tap ${Math.round(x)},${Math.round(y)} on ${under}`);
    await page.touchscreen.tap(x, y);
  }
  taps++;
  await page.waitForTimeout(700);
}
const all = ["realm", "province", "realm_book", "lens", "move", "end_turn", "news", "study", "recruit", "build", "lords", "treasury", "envoy"];
console.log("hints seen:", seen.join(", "), "in", taps, "taps");
for (const id of all) if (!seen.includes(id)) fail(`hint ${id} never shown`);
if (await hint()) fail(`hints still open after ${taps} taps`);

// Settings open from the game menu (SHELL-168).
await page.tap(".hud .game-menu");
await page.tap(".game-menu [data-shell=settings]");
await page.tap(".settings [data-section=gameplay]");
await page.waitForTimeout(300);
await shot("90-settings");
await page.tap("[data-hints-reset]");
await page.waitForTimeout(300);
await page.tap(".settings .close");
await page.waitForTimeout(300);
// Portrait: the phone shows its turn-sideways notice over everything.
await page.setViewportSize({ width: 412, height: 915 });
await page.waitForTimeout(400);
if (!(await page.locator(".hint-note").isHidden())) fail("the note shows in portrait");
await shot("91-portrait");
await browser.close();
server.httpServer.close();
if (failed) process.exitCode = 1;
