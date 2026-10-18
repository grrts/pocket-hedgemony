// Harvests and army supply (feedback 82, 83): Castile at war with Portugal into the autumn of 1445,
// then a province's harvest, the provinces overview and an army's supply, on a small and a large phone held sideways.
// Usage: pnpm build && node scripts/food-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4179, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4179/");
await page.waitForSelector(".map-layer", { timeout: 60000 });
await page.click("[data-nation=castile]");
await page.waitForTimeout(500);
await page.evaluate(() => {
  const b = document.createElement("button");
  b.dataset.realm = String(window.__phNation("portugal"));
  document.body.append(b);
  b.click();
  b.remove();
});
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector("[data-realm-tab=diplomacy]")?.click());
await page.waitForTimeout(300);
await page.evaluate(() => document.querySelector("[data-declare]")?.click());
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector("[data-declare-confirm]")?.click());
await page.waitForTimeout(300);
// Into the autumn of 1445: past the September harvest. A battle that pauses the week plays on at another End turn.
const turns = Number(process.env.TURNS ?? 46);
while ((await page.evaluate(() => window.__phTurn())) < turns) {
  const t = await page.evaluate(() => window.__phTurn());
  await page.evaluate(() => window.__phMarchOn("portugal"));
  await page.evaluate(() => document.querySelector(".end-turn")?.click());
  await page.waitForFunction((n) => window.__phTurn() > n, t, { timeout: 20000 }).catch(() => page.screenshot({ path: `${out}/stuck-${t}.png` }));
}
await page.waitForTimeout(500);
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]]]) {
  await page.setViewportSize(device.viewport);
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  const scrollTo = (sel) => page.evaluate((q) => document.querySelector(q)?.scrollIntoView({ block: "start" }), sel);
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.waitForTimeout(300);
  await scrollTo(".panel dl.facts");
  await page.waitForTimeout(200);
  await shot("province");
  // The province the first army stands in, at its food and army lines.
  await page.evaluate(() => window.__phArmyProvince() && window.__phSelect(window.__phArmyProvince()));
  await page.waitForTimeout(300);
  await scrollTo(".panel dl.facts");
  await page.waitForTimeout(200);
  await shot("army-province");
  await scrollTo(".panel .army");
  await page.waitForTimeout(200);
  await shot("army-here");
  await page.evaluate(() => document.querySelector("[data-command]")?.click());
  await page.waitForTimeout(300);
  await scrollTo(".panel dl.facts dt:nth-of-type(5)");
  await page.waitForTimeout(200);
  await shot("commander");
  await page.click(".hud .realm");
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelector("[data-realm-tab=provinces]")?.click());
  await page.waitForTimeout(300);
  await shot("provinces");
  await page.click(".panel .close").catch(() => {});
}
await browser.close();
server.httpServer.close();
