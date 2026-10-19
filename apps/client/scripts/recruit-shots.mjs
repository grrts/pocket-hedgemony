// Recruits, commissions a commander, trains and hires a free company as Castile, and screenshots it.
// Usage: pnpm build && node scripts/recruit-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4176, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
page.on("pageerror", (e) => console.log("pageerror:", e.message));
const endTurn = async () => {
  const t = await page.evaluate(() => window.__phTurn());
  await page.click(".end-turn");
  await page.waitForFunction((n) => window.__phTurn() > n, t);
  await page.waitForTimeout(200);
};
const shot = (name) => page.screenshot({ path: `${out}/${name}.png` });
await page.goto("http://localhost:4176/");
await page.waitForSelector(".map-layer", { timeout: 30000 });
await page.click("[data-nation=castile]");
await page.waitForTimeout(500);
// A province next to the capital: its Garrison tab.
await page.evaluate(() => window.__phSelect("p1594"));
await page.click("[data-tab=garrison]");
await page.waitForTimeout(200);
await shot("1-garrison");
for (let i = 0; i < 3; i++) {
  await page.click("[data-recruit]");
  await page.waitForTimeout(300);
}
await shot("1b-queue");
await page.click(".panel .close").catch(() => {});
await endTurn();
await endTurn();
await page.evaluate(() => window.__phSelect("p1594"));
await page.click("[data-tab=garrison]");
await page.waitForTimeout(200);
await shot("2-gathered");
await page.click("[data-commission]");
await page.waitForTimeout(300);
await page.click("[data-tab=garrison]").catch(() => {});
await page.waitForTimeout(200);
await shot("3-commissioned");
await page.click("[data-lead]");
await page.waitForTimeout(300);
await shot("4-led");
// The starting army's commander's screen in the capital.
await page.evaluate(() => window.__phSelect("p1601"));
await page.waitForTimeout(200);
await page.click("[data-command]");
await page.waitForTimeout(200);
await page.click("[data-train='archers']");
await page.waitForTimeout(300);
await shot("5-commander");
// The realm's Military tab, then its Mercenaries tab: hire the first company for hire.
await page.click(".hud .realm");
await page.waitForTimeout(300);
await page.click("#panel [data-realm-section=Military]").catch(() => {});
await page.click("[data-realm-tab=military]");
await page.waitForTimeout(200);
await shot("6-military");
await page.click("[data-realm-open-tab=mercenaries]");
await page.waitForTimeout(200);
await shot("7-mercenaries");
await page.click("[data-hire]:not([disabled])");
await page.waitForTimeout(300);
await page.click(".hud .realm").catch(() => {});
await page.waitForTimeout(300);
await page.click("#panel [data-realm-section=Military]").catch(() => {});
await page.click("[data-realm-tab=military]").catch(() => {});
await page.click("[data-realm-open-tab=mercenaries]").catch(() => {});
await page.waitForTimeout(200);
await shot("8-hired");
await browser.close();
server.httpServer.close();
