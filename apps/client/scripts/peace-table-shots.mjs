// The peace table (WAR-248) as Castile at war with Granada: march on Granada until its castles fall, then open its
// Diplomacy tab; on a small and a large phone held sideways and a desktop. The tab is shot top to bottom, then with a
// province taken off the draft and gold added.
// Usage: pnpm build && node scripts/peace-table-shots.mjs <outDir> [foe] [turns]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const foe = process.argv[3] ?? "granada";
const turns = Number(process.argv[4] ?? 40);
const server = await preview({ preview: { port: 4191, strictPort: true } });
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
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = async (what) => {
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    await page.evaluate(() => document.querySelector(".peace-table")?.scrollIntoView());
    for (let k = 0, more = true; more && k < 4; k++) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${out}/${name}-${what}-${k}.png` });
      more = await page.evaluate(() => {
        const p = document.querySelector("#panel");
        const before = p.scrollTop;
        p.scrollTop += p.clientHeight * 0.8;
        return p.scrollTop > before;
      });
    }
  };
  await page.goto("http://localhost:4191/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  await open(page, foe);
  await page.waitForTimeout(300);
  await page.click("[data-declare]");
  for (let t = 0; t < turns; t++) {
    await page.evaluate((id) => window.__phMarchOn(id), foe);
    const turn = await page.evaluate(() => window.__phTurn());
    // A peace offer or a battle may hold the turn: put the alerts away and end it again.
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    await page.click(".end-turn", { timeout: 5000 }).catch(() => {});
    const moved = await page.waitForFunction((n) => window.__phTurn() > n, turn, { timeout: 20000 }).then(() => true, () => false);
    if (!moved) await page.screenshot({ path: `${out}/${name}-stuck-${t}.png` });
    if (await page.evaluate(() => (window.__phPeaceTable?.() ?? 0) >= 2)) break;
  }
  await page.click("#panel .close").catch(() => {});
  await open(page, foe);
  await shot("table");
  await page.click("[data-peace-pick][aria-pressed=true]").catch(() => {});
  await page.click("[data-peace-gold='1']").catch(() => {});
  await shot("edited");
  await page.close();
}
await browser.close();
server.httpServer.close();
