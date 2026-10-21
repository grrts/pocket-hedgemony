// Heads of the faith (RELG-135 to RELG-138) as Castile: the Head of the faith card under the faith cards on the
// Peoples tab, the censure warning before declaring war on a fellow Catholic (Portugal), the badge on Byzantium's
// Faith line, and the Faiths map mode with its seats and the Ecumenical Patriarch's card opened read-only; on a
// small and a large phone held sideways, a tall window and a desktop. Each screen is checked for buttons under
// 44 points and anything that scrolls sideways.
// Usage: pnpm build && node scripts/faith-heads-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4185, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const open = (page, id, tab) =>
  page.evaluate(
    ([id, tab]) => {
      const b = document.createElement("button");
      b.dataset.realm = String(window.__phNation(id));
      b.dataset.realmOpen = tab;
      document.body.append(b);
      b.click();
      b.remove();
    },
    [id, tab],
  );
const check = (page, name, where) =>
  page
    .evaluate(() => {
      const panel = document.querySelector(".panel");
      const small = [...panel.querySelectorAll("button:not([disabled]):not(.tab):not(.close), summary")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: panel.scrollWidth > panel.clientWidth + 1 };
    })
    .then((r) => console.log(name, where, JSON.stringify(r)));
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = async (what) => {
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    await page.screenshot({ path: `${out}/${name}-${what}.png` });
  };
  await page.goto("http://localhost:4185/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.click("#panel [data-realm-section=Research]").catch(() => {});
  await page.click("[data-realm-tab=peoples]");
  await page.waitForTimeout(300);
  await page.locator(".faith-head").scrollIntoViewIfNeeded();
  await shot("head-card");
  await check(page, name, "head-card");
  await open(page, "portugal", "diplomacy");
  await page.waitForTimeout(300);
  await page.locator(".censure-warn").scrollIntoViewIfNeeded().catch(() => console.log(name, "no censure warning"));
  await shot("censure");
  await check(page, name, "censure");
  await open(page, "byzantium", "general");
  await page.waitForTimeout(300);
  await page.locator(".panel .badge").first().scrollIntoViewIfNeeded().catch(() => console.log(name, "no badge"));
  await shot("badge");
  await page.click(".panel button.close").catch(() => {});
  await page.click("#mode");
  await page.click("[data-lens=faiths]");
  await page.waitForTimeout(600);
  await page.locator(".seat-keys").scrollIntoViewIfNeeded().catch(() => console.log(name, "no seats"));
  await shot("lens-seats");
  await page.click("[data-head-view=ecumenical_patriarch]");
  await page.waitForTimeout(400);
  await shot("seat-card");
  await check(page, name, "seat-card");
  await page.close();
}
await browser.close();
server.httpServer.close();
