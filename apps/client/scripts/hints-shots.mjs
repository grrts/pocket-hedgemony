// First-campaign hints on a phone, played by touch: the note and ring at each
// hint, Show me, and the Settings switch (onboarding TUT-121 … TUT-130).
// Usage: pnpm build && node scripts/hints-shots.mjs [outDir]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? "shots";
const server = await preview({ preview: { port: 4176, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ ...devices["Pixel 7 landscape"] })).newPage();
const shot = (name) => page.screenshot({ path: `${out}/hints-${name}.png` });
const hint = () => page.locator(".hint-note").getAttribute("data-hint");
const say = async (what) => console.log(what, await hint(), (await page.locator(".hint-note p").textContent())?.trim(), "ring:", !(await page.locator(".hint-ring").isHidden()));
let failed = false;
const expect = async (id) => {
  const got = await hint();
  if (got !== id) (failed = true), console.log(`FAIL expected hint ${id}, got ${got}`);
};

await page.goto("http://localhost:4173/".replace("4173", "4176"));
await page.waitForSelector(".hint-note:not([hidden])");
await say("start");
await expect("realm");
await shot("1-realm");
await page.tap("[data-nation=france]");
await page.waitForFunction(() => document.querySelector(".hint-note")?.dataset.hint === "move");
await page.waitForTimeout(400);
await say("realm chosen");
await shot("2-move");
await page.tap("#armies");
await page.waitForTimeout(300);
await say("commanders open");
await shot("3-move-list");
await page.tap("[data-pick]");
await page.waitForTimeout(300);
await say("commander picked");
await shot("4-move-map");
// March to the land a little east of the army.
const box = await page.locator("#map").boundingBox();
await page.touchscreen.tap(box.x + box.width * 0.42, box.y + box.height * 0.45);
await page.waitForTimeout(800);
await say("marched");
await shot("5-end-turn");
await page.tap(".end-turn");
await page.waitForSelector(".turn-label:text('18 Nov 1444')", { timeout: 60000 });
await page.waitForFunction(() => !document.querySelector(".end-turn")?.classList.contains("playing"));
await page.waitForTimeout(500);
await say("turn ended");
await expect("recruit");
await shot("6-recruit");
await page.tap("[data-hint=show]");
await page.waitForTimeout(400);
await say("show me");
await shot("7-recruit-tab");
await page.tap("[data-recruit]");
await page.waitForTimeout(600);
await say("recruited");
await shot("8-build");
await page.tap("[data-tab=build]");
await page.waitForTimeout(400);
await say("build tab");
await shot("9-build-tab");
await page.tap("[data-build]");
await page.waitForTimeout(600);
await say("built");
await shot("10-envoy");
if (await page.locator("[data-hint=show]").count()) await page.tap("[data-hint=show]");
await page.waitForTimeout(400);
await say("diplomacy");
await shot("11-envoy-tab");
await page.tap("[data-envoy]");
// The envoy is an order sent to the engine; wait for it to come back rather than a fixed time.
await page.waitForFunction(() => document.querySelector(".hint-note")?.hidden, null, { timeout: 10000 }).catch(() => {});
console.log("after envoy hidden:", await page.locator(".hint-note").isHidden(), await hint(), await page.locator(".alert").allTextContents());
if (!(await page.locator(".hint-note").isHidden())) failed = true;
// Settings open from the game menu (SHELL-168).
await page.tap(".hud .game-menu");
await page.tap(".game-menu [data-shell=settings]");
await page.tap(".settings [data-section=gameplay]");
await page.waitForTimeout(300);
await shot("12-settings");
await page.tap("[data-hints-reset]");
await page.waitForTimeout(300);
await shot("13-settings-reset");
await page.tap("[data-hints-toggle]");
await page.waitForTimeout(300);
console.log("off hidden:", await page.locator(".hint-note").isHidden());
await page.tap("[data-hints-toggle]");
await page.waitForTimeout(300);
await page.tap(".settings .close");
await page.waitForTimeout(300);
// Portrait: the phone shows its turn-sideways notice over everything.
await page.setViewportSize({ width: 412, height: 915 });
await page.waitForTimeout(400);
await shot("14-portrait");
await browser.close();
server.httpServer.close();
if (failed) process.exitCode = 1;
