// The Land tab with fever land and a worn field, on a small and a large phone held sideways and a phone upright (PROV-335, PROV-336).
// Usage: pnpm build && node scripts/wear-shots.mjs <outDir> [nation]
// A worn field takes 30 years of overwork; build with province.worn.overwork_years at 1 to see one in the first January.
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const nation = process.argv[3] ?? "majapahit";
const server = await preview({ preview: { port: 4178, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const all = [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]]];
for (const [name, device] of all.filter(([n]) => !process.env.ONLY || process.env.ONLY === n)) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  page.on("console", (m) => m.type() === "error" && console.log("console:", m.text()));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4178/");
  await page.waitForSelector("[data-nation]", { timeout: 60000 });
  await page.evaluate((id) => {
    const b = document.querySelector("[data-nation]");
    b.dataset.nation = id;
    b.click();
  }, nation);
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(1000);
  // To the first January: the wearing year runs then.
  for (let k = 0; k < 9; k++) {
    const turn = await page.evaluate(() => window.__phTurn());
    await page.click("#fab").catch(() => {});
    await page.waitForFunction((t) => window.__phTurn() > t, turn, { timeout: 60000 }).catch(() => {});
  }
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.waitForTimeout(300);
  await page.click("[data-tab=land]");
  await page.waitForTimeout(300);
  await shot("fever");
  const fever = await page.$eval(".land-grid", (g) => g.previousElementSibling?.textContent ?? "").catch(() => "");
  console.log(name, "fever line:", fever.trim().slice(0, 80));
  const worn = await page.evaluate(() => window.__phWorn());
  console.log(name, "worn province:", worn);
  if (worn) {
    await page.evaluate((id) => window.__phSelect(id), worn);
    await page.waitForTimeout(300);
    await page.click("[data-tab=land]");
    await page.waitForTimeout(300);
    await page.click(".land-tile.worn");
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelector(".land-sheet")?.scrollIntoView({ block: "end" }));
    await shot("worn");
    const sizes = await page.$$eval("[data-land-tile]", (bs) => bs.map((b) => Math.round(Math.min(b.getBoundingClientRect().width, b.getBoundingClientRect().height))));
    console.log(name, "smallest tile:", Math.min(...sizes), "worn text:", (await page.$eval(".land-sheet", (e) => e.textContent)).match(/Worn[^.]*\./)?.[0]);
  }
  await page.close();
}
await browser.close();
server.httpServer.close();
