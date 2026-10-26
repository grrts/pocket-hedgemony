// The last screens of the screens review (ui-review.md, feedback 150): your realm's Military section, the province card's tabs
// and another realm's card's tabs, on a phone held sideways, a small phone held sideways and a tablet held upright, with how far each scrolls.
// Usage: pnpm build && node scripts/screens-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4193, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const report = [];
for (const [name, device] of [
  ["wide", devices["Pixel 7 landscape"]],
  ["small", devices["iPhone SE landscape"]],
  ["tall", { viewport: { width: 820, height: 1180 }}],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = async (what) => {
    await page.waitForTimeout(300);
    await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
    await page.screenshot({ path: `${out}/${name}-${what}.png` });
    report.push({
      layout: name,
      ...(await page.evaluate((what) => {
        const p = document.querySelector("#panel");
        const small = [...p.querySelectorAll("button")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).length;
        return { what, screens: +(p.scrollHeight / p.clientHeight).toFixed(1), words: (p.innerText || "").split(/\s+/).filter(Boolean).length, buttons: p.querySelectorAll("button").length, tabs: p.querySelectorAll(".tabs .tab").length, under44: small };
      }, what)),
    });
  };
  const openRealm = (id) =>
    page.evaluate((id) => {
      const b = document.createElement("button");
      b.dataset.realm = String(window.__phNation(id));
      document.body.append(b);
      b.click();
      b.remove();
    }, id);
  await page.goto("http://localhost:4193/");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.click("[data-hint=stop]").catch(() => {});
  // Your realm's Military section and each of its pages.
  await openRealm("castile");
  await page.waitForTimeout(300);
  await page.click("#panel [data-realm-section=Military]");
  const pages = await page.$$eval("#panel [data-realm-tab]", (bs) => bs.map((b) => b.dataset.realmTab));
  if (!pages.length) await shot("military");
  for (const key of pages) {
    await page.click(`#panel [data-realm-tab=${key}]`);
    await shot(`military-${key}`);
  }
  // The province card: the capital, each tab.
  await page.evaluate(() => window.__phSelect(window.__phCapital()));
  await page.waitForTimeout(300);
  // Each tab, and each page of a tab with a second row (SHELL-187).
  for (const t of await page.$$eval("#panel nav.tabs:not(.pages) [data-tab]", (bs) => bs.map((b) => b.dataset.tab))) {
    await page.click(`#panel nav.tabs:not(.pages) [data-tab=${t}]`);
    const pages = await page.$$eval("#panel nav.pages [data-tab]", (bs) => bs.map((b) => b.dataset.tab));
    if (!pages.length) await shot(`province-${t}`);
    for (const k of pages) {
      await page.click(`#panel nav.pages [data-tab=${k}]`);
      await shot(`province-${t}-${k}`);
    }
  }
  // The Overview with every fold open, scrolled to the folds.
  await page.click("#panel nav.tabs [data-tab=overview]");
  await page.evaluate(() => document.querySelectorAll("#panel details[data-page-fold]").forEach((d) => (d.open = true)));
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector("#panel details[data-page-fold]")?.scrollIntoView());
  await page.screenshot({ path: `${out}/${name}-province-folds-open.png` });
  await page.evaluate(() => document.querySelectorAll("#panel details[data-page-fold]").forEach((d) => (d.open = false)));
  // Another realm's card: Portugal, each tab.
  await openRealm("portugal");
  await page.waitForTimeout(300);
  for (const t of await page.$$eval("#panel [data-realm-tab]", (bs) => bs.map((b) => b.dataset.realmTab))) {
    await page.click(`#panel [data-realm-tab=${t}]`);
    await shot(`realm-${t}`);
  }
  // Its Heritage, a page of General, and back.
  await page.click("#panel nav.tabs [data-realm-tab=general]");
  await page.click("#panel [data-realm-open-tab=heritage]");
  await shot("realm-heritage-page");
  await page.click("#panel [data-realm-open-tab=general]");
  await page.close();
}
console.table(report);
await browser.close();
server.httpServer.close();
