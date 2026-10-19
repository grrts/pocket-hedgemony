// The living map's figure armies (VIEW-116..VIEW-126) as Castile on a phone held sideways:
// an army across the 14-16 cross-fade and close in, with Markers, marching, and at war in battle and siege.
// Usage: pnpm build && node scripts/figure-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
const shot = (what) => page.screenshot({ path: `${out}/${what}.png` });
await page.goto("http://localhost:4183/");
await page.waitForSelector(".map-layer", { timeout: 60000 });
await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
await page.click("[data-nation=castile]");
await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
await page.click(".panel .close").catch(() => {});
await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
for (const z of [12, 15, 20, 32]) {
  await page.evaluate((z) => window.__phLookAtArmy(z), z);
  await page.waitForTimeout(400);
  await shot(`army-zoom-${z}`);
}
// Markers on, from the lens menu.
await page.evaluate(() => document.querySelector("[data-hint=stop]")?.click());
await page.click("#mode");
await page.waitForTimeout(200);
await shot("lens-menu");
await page.click("#markers");
await page.click("#mode");
await page.evaluate(() => window.__phLookAtArmy(20));
await page.waitForTimeout(300);
await shot("army-markers");
// A war with Portugal: march on it until a battle or siege shows.
await page.evaluate(() => window.__phWar("portugal"));
await page.waitForTimeout(300);
await page.click(".panel .close").catch(() => {});
let battle = false;
let siege = null;
for (let t = 0; t < 12 && !(battle && siege); t++) {
  await page.evaluate(() => window.__phMarchOn("portugal"));
  if (t === 0) {
    await page.evaluate(() => window.__phLookAtArmy(20));
    await page.waitForTimeout(300);
    await shot("army-marching");
  }
  // Answer any event or offer with its first choice, so the turn can end.
  for (const sel of ["#event-card button", "#overlay button", ".revolution-sheet button"]) await page.locator(sel).first().click({ timeout: 500 }).catch(() => {});
  const before = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn");
  if (t === 0) {
    // The week plays: the column sets off behind its banner, a few moments apart.
    for (let i = 1; i <= 4; i++) {
      await page.evaluate(() => window.__phLookAtArmy(24));
      await page.waitForTimeout(350);
      await shot(`march-${i}`);
    }
  }
  const ended = await page.waitForFunction((n) => window.__phTurn() > n, before, { timeout: 60000 }).catch(() => null);
  if (!ended) {
    // The week waits on a battle: look at it close in, as figures, then with Markers off.
    if (await page.evaluate(() => window.__phLookAtBattle(20))) {
      await page.waitForTimeout(600);
      await shot("battle-markers");
      await page.click("#mode");
      await page.click("#markers");
      await page.click("#mode");
      await page.waitForTimeout(400);
      await shot("battle");
      battle = true;
    } else await shot(`stuck-${t}`);
    break;
  }
  await page.click(".panel .close").catch(() => {});
  if (!battle && (await page.evaluate(() => window.__phLookAtBattle(20)))) {
    battle = true;
    await page.waitForTimeout(400);
    await shot("battle");
  }
  if (!siege && (siege = await page.evaluate(() => window.__phLookAtSiege(20)))) {
    await page.waitForTimeout(400);
    await shot("siege");
  }
}
console.log(`battle ${battle}, siege ${siege}`);
await browser.close();
server.httpServer.close();
