// Screenshots the founding card (SETUP-092 to SETUP-094) in the Wide and Tall phone layouts, then Show on the map.
// A realm founded takes decades of play, so the card is shown for staged news of Spain's founding.
// Usage: pnpm build && node scripts/founding-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const layouts = [
  ["wide", { ...devices["Pixel 7 landscape"] }],
  ["tall", { ...devices["iPhone SE landscape"] ?? devices["Pixel 7 landscape"], viewport: { width: 568, height: 320 } }],
];
for (const [name, device] of layouts) {
  const page = await browser.newPage(device);
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto("http://localhost:4177/");
  await page.waitForSelector(".map-layer", { timeout: 30000 });
  await page.click("[data-nation=castile]");
  await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 60000 });
  await page.waitForTimeout(2000);
  await page.evaluate(() => {
    const spain = window.__phNation("spain");
    const castile = window.__phNation("castile");
    const aragon = window.__phNation("aragon");
    const toledo = 1601;
    window.__phFoundingCard([
      { kind: "founded", text: "Your realm is now Spain.", nations: [spain], province: toledo, major: true },
      { kind: "founded", text: "Spain is founded from Castile and Aragon.", nations: [spain, castile, aragon], province: toledo, major: true },
    ]);
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${out}/${name}-1-card.png` });
  const sizes = await page.$$eval(".founding button", (bs) => bs.map((b) => `${b.textContent.trim()} ${Math.round(b.getBoundingClientRect().width)}x${Math.round(b.getBoundingClientRect().height)}`));
  console.log(name, "buttons:", sizes.join(", "));
  await page.click(".founding .go-there");
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${out}/${name}-2-shown.png` });
  await page.close();
}
await browser.close();
server.httpServer.close();
