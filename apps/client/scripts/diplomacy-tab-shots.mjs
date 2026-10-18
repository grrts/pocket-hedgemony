// The Diplomacy tab (DIPL-202, DIPL-221) as Castile: Portugal's card at peace (standing, envoys, demands), Morocco's at
// war (peace terms), and Castile's own overview; on a small and a large phone held sideways and a desktop. Each tab is
// shot top and scrolled to the bottom.
// Usage: pnpm build && node scripts/diplomacy-tab-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4183, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const open = (page, id) =>
  page.evaluate((id) => {
    const b = document.createElement("button");
    b.dataset.realm = String(id === "me" ? window.__phSnapshot?.()?.playerNation ?? window.__phNation("castile") : window.__phNation(id));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  }, id);
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  // Each screenful of the tab, the hints and alerts put away.
  const shot = async (what) => {
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    for (let k = 0, more = true; more && k < 8; k++) {
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
  await page.goto("http://localhost:4183/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  await page.evaluate(() => window.__phEnvoy("aragon"));
  await open(page, "portugal");
  await shot("portugal");
  await open(page, "morocco");
  await page.waitForTimeout(300);
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await shot("morocco-war");
  await open(page, "castile");
  await shot("own");
  await page.close();
}
await browser.close();
server.httpServer.close();
