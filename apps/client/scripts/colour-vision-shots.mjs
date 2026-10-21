// Colour vision (SET-095, SET-096, SET-128, VIEW-047, VIEW-048): the map and the Food lens in each mode, and the
// Accessibility section of Settings, on a phone held sideways (844 × 390) and in a tall window (390 × 844; a phone held
// upright shows the turn-sideways notice, so the tall window has a mouse). Checks that every tap target is 44 px or more.
// Usage: pnpm build && node scripts/colour-vision-shots.mjs <outDir>
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
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
    for (const el of document.querySelectorAll("#overlay button, #overlay input")) {
      const r = el.getBoundingClientRect();
      if (!r.width || getComputedStyle(el).visibility === "hidden") continue;
      if (r.height < 43.5 || (el.tagName === "BUTTON" && r.width < 43.5)) bad.push(`${el.textContent.trim() || el.getAttribute("aria-label")} ${Math.round(r.width)}×${Math.round(r.height)}`);
      if (r.right > innerWidth + 1 || r.left < -1) bad.push(`off screen: ${el.textContent.trim()}`);
    }
    return bad;
  });

const MODES = [
  ["default", "Default"],
  ["deutan", "Green-weak (deutan)"],
  ["protan", "Red-weak (protan)"],
  ["tritan", "Blue-weak (tritan)"],
  ["none", "No colour"],
];

for (const [name, device] of [
  ["landscape", { viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 }],
  ["portrait", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 120000 });
  const tap = (sel) => (device.hasTouch ? page.locator(sel).first().tap() : page.locator(sel).first().click());
  await page.goto("http://localhost:4181/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await tap("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.evaluate(() => document.querySelector(".panel .close")?.click());
  // Lift the parchment so the crowded realms of the Empire show.
  await page.evaluate(() => {
    const fog = document.querySelector("#fog");
    if (fog?.checked) fog.click();
  });

  for (const [mode, label] of MODES) {
    // Settings → Accessibility → Colour vision.
    await tap(".hud .game-menu");
    await page.waitForSelector(".game-menu");
    await tap(".game-menu [data-shell=settings]");
    await page.waitForSelector(".settings");
    if (await page.locator("[data-section=accessibility]").isVisible()) await tap("[data-section=accessibility]");
    await tap(`[data-set="accessibility.colour_vision"][data-v='"${mode}"']`);
    await page.waitForTimeout(200);
    check((await page.getAttribute(`[data-set="accessibility.colour_vision"][data-v='"${mode}"']`, "aria-checked")) === "true", `${name}: ${label} chosen`);
    if (mode === "none") check((await page.textContent('[data-row="accessibility.lens_patterns"] small'))?.includes("Set by Colour vision"), `${name}: Patterns on lenses shows Set by Colour vision`);
    if (mode === "default" || mode === "deutan" || mode === "none") await shot(`settings-${mode}`);
    check((await targets(page)).length === 0, `${name}: settings tap targets ${JSON.stringify(await targets(page))}`);
    await tap(".settings .close");
    await page.waitForTimeout(200);
    // Back from the game menu to the map, over Iberia and its neighbours.
    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const n = ["castile"].map((id) => window.__phNation(id)).find((i) => i !== undefined);
      const c = window.__phCapitalOf(n);
      window.__phMap.lookAt(c.x, c.y, 2.4);
    });
    await page.waitForTimeout(400);
    // The realms, then the Food lens with its key: the change shows at once, without a restart.
    await page.evaluate(() => document.querySelector("#lenses [data-lens=realms]")?.click());
    await page.waitForTimeout(400);
    await shot(`map-${mode}`);
    if (mode === "none") {
      // Close in, the realms' patterns in the tiles.
      await page.evaluate(() => window.__phMap.lookAt(window.__phMap.camera.x, window.__phMap.camera.y, 5));
      await page.waitForTimeout(400);
      await shot("map-none-close");
    }
    await tap("#mode");
    await page.waitForTimeout(200);
    await page.evaluate(() => document.querySelector("#lenses [data-lens=food]")?.click());
    await page.waitForTimeout(500);
    await shot(`food-${mode}`);
    await page.evaluate(() => document.querySelector("#lenses [data-lens=realms]")?.click());
    await tap("#mode");
    await page.waitForTimeout(200);
  }
  // The setting is saved with the others: it outlives a reload.
  await page.goto("http://localhost:4181/", { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem("ph.settings-personal.json") ?? localStorage.getItem("ph.settings-device.json") ?? "{}"));
  check(JSON.stringify(kept).includes('"none"'), `${name}: Colour vision saved with the settings`);
  await page.close();
}
await browser.close();
server.httpServer.close();
process.exit(failed ? 1 : 0);
