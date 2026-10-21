// Screenshots every card and tab for the screens review (ui-review.md): each section and page of your realm, each province tab, News, the army card
// and the game menu, on a phone held sideways and a tablet held upright, with how far each tab scrolls.
// Usage: pnpm build && node scripts/audit-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";
import { writeFileSync } from "node:fs";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4191, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const report = [];
for (const [name, device] of [
  ["wide", devices["Pixel 7 landscape"]],
  ["tall", { viewport: { width: 820, height: 1180 } }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const measure = (what) =>
    page.evaluate((what) => {
      const p = document.querySelector("#panel");
      const tabs = p.querySelectorAll(".tabs .tab").length;
      const words = (p.innerText || "").split(/\s+/).filter(Boolean).length;
      const buttons = p.querySelectorAll("button").length;
      return { what, screens: +(p.scrollHeight / p.clientHeight).toFixed(1), words, buttons, tabs };
    }, what);
  const shot = async (what) => {
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
    await page.screenshot({ path: `${out}/${name}-${what}.png` });
    report.push({ layout: name, ...(await measure(what)) });
  };
  await page.goto("http://localhost:4191/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(600);
  await page.click("[data-hint=stop]").catch(() => {});
  await page.screenshot({ path: `${out}/${name}-map.png` });
  await page.click(".hud .realm");
  await page.waitForTimeout(300);
  // Your realm: every section and each of its pages (SHELL-165), or the old row of tabs on a build without sections.
  const sections = await page.$$eval("#panel [data-realm-section]", (bs) => bs.map((b) => b.dataset.realmSection));
  for (const sec of sections.length ? sections : [null]) {
    if (sec) await page.click(`#panel [data-realm-section=${sec}]`);
    const tabs = await page.$$eval("#panel [data-realm-tab]", (bs) => bs.map((b) => b.dataset.realmTab));
    if (!tabs.length) await shot(`realm-${sec}`);
    for (const key of tabs) {
      await page.click(`#panel [data-realm-tab=${key}]`);
      await shot(`realm-${sec ? `${sec}-` : ""}${key}`);
    }
  }
  await page.evaluate(() => window.__phSelect("p1601") ?? null).catch(() => {});
  await page.waitForTimeout(300);
  if (await page.$("#panel [data-tab]")) {
    const ptabs = await page.$$eval("#panel [data-tab]", (bs) => bs.map((b) => b.dataset.tab));
    for (const t of ptabs) {
      await page.click(`#panel [data-tab=${t}]`);
      await shot(`province-${t}`);
    }
  }
  await page.click(".hud [data-news]").catch(() => {});
  await shot("news");
  await page.click(".hud [data-shell=menu]").catch(() => {});
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${out}/${name}-game-menu.png` });
  await page.close();
}
writeFileSync(`${out}/audit.json`, JSON.stringify(report, null, 1));
console.table(report);
await browser.close();
server.httpServer.close();
