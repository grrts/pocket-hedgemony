// Checks that every panel's close button closes it, tapped with a finger on a
// phone in landscape: each card in turn, then the realm after a commander's
// screen has been open (a forgotten view used to come back on close), and
// while the week plays and the panel redraws every day.
// Usage: pnpm build && pnpm close-check
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
const cdp = await page.context().newCDPSession(page);
let failed = false;

/** A finger's tap: down, held as long as a real one, then up. */
async function press(selector) {
  // While the week plays the panel is redrawn each day, so the button can be between two drawings: take the next one.
  let box = null;
  for (let k = 0; k < 10 && !box; k++) box = await page.locator(selector).boundingBox({ timeout: 1000 }).catch(() => null);
  const touchPoints = [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }];
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints });
  await page.waitForTimeout(150);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function check(name, open) {
  await open();
  await page.waitForTimeout(300);
  if (await page.isHidden("#panel")) await page.tap("#reopen");
  await page.waitForTimeout(200);
  if (!(await page.isVisible("#panel .close"))) {
    console.log(`FAIL ${name}: no open panel with a close button`);
    failed = true;
    return;
  }
  const hit = await page.evaluate(() => {
    const b = document.querySelector("#panel .close").getBoundingClientRect();
    const h = document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2);
    return h?.closest(".close") ? "" : h ? `covered by ${h.tagName.toLowerCase()}.${h.className}` : `off screen at y ${b.y}`;
  });
  if (hit) console.log(`  close button ${hit}`);
  await press("#panel .close");
  await page.waitForTimeout(300);
  const ok = await page.isHidden("#panel");
  if (!ok) console.log("  still open:", await page.textContent("#panel h2"));
  failed ||= !ok;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}`);
}

const SECTION = { general: "Realm", government: "Realm", heritage: "Realm", score: "Realm", treasury: "Economy", trade: "Economy", food: "Economy", provinces: "Lands", officials: "Lands", lords: "Lands", colonies: "Lands", military: "Military", navy: "Military", diplomacy: "Diplomacy", learning: "Research", peoples: "Research" };
const realm = (tab) => async () => {
  await page.tap(".hud .realm");
  await page.waitForTimeout(300);
  // Your realm's pages sit inside its six sections (SHELL-165): open the section first.
  if (tab) await page.evaluate((t) => document.querySelector(`#panel [data-realm-section=${t.section}]`)?.click(), { section: SECTION[tab] });
  if (tab) await page.waitForTimeout(200);
  if (tab && (await page.$(`[data-realm-tab=${tab}]`))) await page.tap(`[data-realm-tab=${tab}]`);
};
const then = (...steps) => async () => {
  for (const step of steps) {
    await step();
    await page.waitForTimeout(300);
  }
};

try {
  await page.goto("http://localhost:4179/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.tap("[data-nation=castile]");
  await page.tap("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(600);

  await check("province", () => page.evaluate(() => window.__phSelect("p1601")));
  await check("dispatches", () => page.tap(".hud [data-news]"));
  for (const tab of [null, "treasury", "diplomacy", "military", "officials", "lords", "learning"]) await check(`realm ${tab ?? "general"}`, realm(tab));
  await check(
    "declare sheet",
    then(
      () =>
        page.evaluate(() => {
          const b = document.createElement("button");
          b.dataset.realm = String(window.__phNation("portugal"));
          b.dataset.realmOpen = "diplomacy";
          document.body.append(b);
          b.click();
          b.remove();
        }),
      () => page.tap("[data-declare]"),
    ),
  );
  // The officials in post sit in a fold (SHELL-172): open it, then tap the first official.
  await check("official", then(realm("officials"), () => page.evaluate(() => document.querySelector("[data-page-fold=officials-in-post]")?.setAttribute("open", "")), () => page.tap("[data-official]")));
  // The commanders sit in a fold on the Army page (SHELL-185): open it, then tap Command.
  const commanders = () => page.evaluate(() => document.querySelector("[data-page-fold=war-commanders]")?.setAttribute("open", ""));
  await check("commander", then(realm("military"), commanders, () => page.tap("[data-command]")));
  await check("realm after a commander", realm(null));
  await check("province after a commander", then(realm("military"), commanders, () => page.tap("[data-command]"), () => page.evaluate(() => window.__phSelect("p1601"))));
  await page.tap(".end-turn");
  await check("realm while the week plays", realm(null));
} finally {
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
