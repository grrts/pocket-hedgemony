// Playing as a subject (SUBJ-131 to SUBJ-140): as Granada, the card from below on your own Diplomacy tab and on
// Castile's card; as France, Brittany's subject card in the lord card's frame and a long-press on Brittany that opens
// it; on a small and a large phone held sideways, a phone held upright and a desktop.
// Usage: pnpm build && node scripts/subject-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const open = (page, id) =>
  page.evaluate((id) => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation(id));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  }, id);
const scrollTo = (page, text) =>
  page.evaluate((text) => {
    const h = [...document.querySelectorAll("#panel h3")].find((x) => x.textContent.includes(text));
    h?.scrollIntoView({ block: "start" });
  }, text);
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  for (const who of ["granada", "france"]) {
    const page = await browser.newPage({ ...device });
    page.on("pageerror", (e) => console.log("pageerror:", e.message));
    const shot = (what) => page.screenshot({ path: `${out}/${name}-${who}-${what}.png` });
    await page.goto("http://localhost:4181/?view=1460,560,1.4");
    // Any realm can be ruled: open its card on the map and tap Rule.
    await page.waitForSelector("[data-nation]", { timeout: 60000 });
    await open(page, who);
    await page.click(`[data-nation=${who}]`);
    await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
    await page.waitForTimeout(500);
    await page.click("[data-hint=stop]").catch(() => {});
    await page.waitForTimeout(300);
    if (who === "granada") {
      await open(page, "granada");
      await page.waitForTimeout(400);
      await scrollTo(page, "Your overlord");
      await shot("below");
      await scrollTo(page, "Your choices");
      await shot("choices");
      await open(page, "castile");
      await page.waitForTimeout(400);
      await scrollTo(page, "Your overlord");
      await shot("castile");
    } else {
      await open(page, "brittany");
      await page.waitForTimeout(400);
      await scrollTo(page, "Your vassal");
      await shot("brittany");
      await page.click("#panel .close").catch(() => {});
      await page.evaluate(() => window.__phSelect(window.__phCapital()));
      await page.click("#panel .close").catch(() => {});
      await shot("map");
    }
    await page.close();
  }
}
await browser.close();
server.httpServer.close();
