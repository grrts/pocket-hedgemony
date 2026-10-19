// The Trade tab as an overview and banking on the map (TRADE-156, TRADE-157) as France: after a turn of play, the tab
// (this month, where the gold comes from, trader rows, Use all), then the map at regional zoom over France while a turn
// plays, catching coins dropping into cities with their gold rising; on a small and a large phone held sideways, a tall
// window and a desktop.
// Usage: pnpm build && node scripts/trade-overview-shots.mjs <outDir> [devices]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const only = process.argv[3]?.split(",");
const server = await preview({ preview: { port: 4185, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  if (only && !only.includes(name)) continue;
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 90000 });
  await page.goto("http://localhost:4185/");
  await page.waitForSelector("[data-nation=france]", { timeout: 60000 });
  await page.click("[data-nation=france]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  const stopHints = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stopHints.isVisible()) await stopHints.click();
  await page.evaluate(() => document.querySelectorAll(".alert .dismiss").forEach((b) => b.click()));
  // Over France at regional zoom, a turn plays: coins drop where traders bank.
  await page.evaluate(() => window.__phLookAtTrader(5));
  await page.waitForTimeout(300);
  await page.click("#fab").catch(() => {});
  let caught = 0;
  for (let k = 0; k < 12; k++) {
    await page.waitForTimeout(350);
    const n = await page.evaluate(() => window.__phBankings?.() ?? 0);
    if (n > 0 && caught < 3) await shot(`banking-${caught++}`);
  }
  console.log(name, "banking shots", caught);
  await page.waitForTimeout(3000);
  await page.evaluate(() => window.__phRealmTab("trade"));
  await page.waitForTimeout(500);
  await shot("trade-tab");
  await page.evaluate(() => document.querySelector("#panel")?.scrollTo(0, 99999));
  await shot("trade-tab-foot");
  const check = await page.evaluate(() => {
    const p = document.querySelector("#panel");
    const small = [...(p?.querySelectorAll(".trader-row, .use-all button, .source-row button") ?? [])].filter((b) => b.getBoundingClientRect().height < 43.5).length;
    return { rows: p?.querySelectorAll(".trader-row").length ?? 0, sources: p?.querySelectorAll(".source-row").length ?? 0, small, sideways: p ? p.scrollWidth > p.clientWidth + 1 : false };
  });
  console.log(name, JSON.stringify(check));
  // Found a trader: each city says how many traders it is home to (TRADE-161).
  await page.locator('[data-page-fold="trade-found"] > summary').click();
  await page.waitForTimeout(300);
  await page.locator('[data-page-fold="trade-found"]').scrollIntoViewIfNeeded();
  await shot("found");
  console.log(name, "found", JSON.stringify(await page.evaluate(() => {
    const p = document.querySelector("#panel");
    const f = p?.querySelector('[data-page-fold="trade-found"]');
    return { homes: [...(f?.querySelectorAll(".found-name small") ?? [])].slice(0, 3).map((x) => x.textContent), small: [...(f?.querySelectorAll("button") ?? [])].filter((b) => b.getBoundingClientRect().height < 43.5).length, sideways: p ? p.scrollWidth > p.clientWidth + 1 : false };
  })));
  // A row opens the trader's card.
  await page.locator(".trader-row").first().click();
  await page.waitForTimeout(400);
  console.log(name, "row opens card", await page.evaluate(() => !!document.querySelector("#panel:not([hidden]) .trader-card")));
  await page.close();
}
await browser.close();
await new Promise((r) => server.httpServer.close(r));
