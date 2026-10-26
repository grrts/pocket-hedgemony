// A realm's heritage and 1444 assessments (HER-080..085): the Heritage line on the General tab and the Heritage tab, before a campaign (the picker) and as France with heritage in play (states, ambitions, legacies), on a small and a large phone held sideways, a phone held upright and a desktop.
// Usage: pnpm build && node scripts/heritage-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const openRealm = (page, i, tab) =>
  page.evaluate(([i, tab]) => {
    const b = document.createElement("button");
    b.dataset.realm = String(i);
    if (tab) b.dataset.realmOpen = tab;
    document.body.append(b);
    b.click();
    b.remove();
  }, [i, tab]);
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1440, height: 900 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4179/");
  await page.waitForSelector(".map-layer", { timeout: 60000 });
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  // Before a campaign: England's card from the picker, then its Heritage tab.
  await openRealm(page, 0);
  await page.waitForTimeout(300);
  await page.locator(".heritage-line").scrollIntoViewIfNeeded();
  await shot("picker-general");
  await page.click("[data-realm-open-tab=heritage]");
  await page.waitForTimeout(300);
  await shot("picker-heritage");
  await page.goto("http://localhost:4179/");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click(".hud .realm[data-realm]");
  await page.waitForTimeout(300);
  await page.locator(".heritage-line").scrollIntoViewIfNeeded();
  await shot("general");
  await page.click(".heritage-line");
  await page.waitForTimeout(300);
  await shot("heritage");
  await page.click(".heritage-part summary");
  await page.waitForTimeout(200);
  await shot("heritage-open");
  await page.locator(".seals").scrollIntoViewIfNeeded();
  await shot("ambitions");
  await page.locator(".assessment-groups").scrollIntoViewIfNeeded();
  await shot("assessments");
  // A few months on: ambitions are revealed, golden ages count their months.
  await page.click(".panel .close").catch(() => {});
  for (let t = 0; t < 12; t++) {
    const turn = await page.evaluate(() => window.__phTurn());
    await page.click(".end-turn");
    for (let k = 0; k < 80 && (await page.evaluate(() => window.__phTurn())) <= turn; k++) await page.waitForTimeout(250);
  }
  await page.click(".hud .realm[data-realm]");
  await page.waitForTimeout(300);
  await page.click("#panel [data-realm-section=Realm]").catch(() => {});
  await page.click("[data-realm-tab=heritage]");
  await page.waitForTimeout(300);
  await shot("heritage-later");
  await page.locator(".seals").scrollIntoViewIfNeeded();
  await shot("ambitions-later");
  console.log(name, "alerts:", await page.locator("#alerts").innerText().catch(() => ""));
  await page.close();
}
await browser.close();
server.httpServer.close();
