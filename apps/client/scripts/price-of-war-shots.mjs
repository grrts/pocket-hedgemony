// The price of war (WAR-229 to WAR-232, DIPL-225, DIPL-226) as Castile: the declare sheet against Portugal, the war
// card reached from the war plaque after a few weeks of war, and Your name abroad on Castile's own Diplomacy tab (also
// redrawn with a league against Castile to show how one looks). Shot on a small and a large phone held sideways (Wide),
// a tablet held upright (Tall) and a desktop window.
// Usage: pnpm build && node scripts/price-of-war-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4189, strictPort: true } });
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
for (const [name, device] of [
  ["small", devices["iPhone SE landscape"]],
  ["wide", devices["Pixel 7 landscape"]],
  // A window taller than wide plays in the Tall layout (SHELL-109); a phone held upright only asks to be turned.
  ["tall", { viewport: { width: 820, height: 1180 } }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = async (what, screens = 3) => {
    await page.waitForTimeout(300);
    await page.evaluate(() => document.querySelectorAll("button.dismiss").forEach((b) => !b.closest("#panel") && b.click()));
    for (let k = 0, more = true; more && k < screens; k++) {
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
  await page.goto("http://localhost:4189/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  // The declare sheet, with one line opened on a tap.
  await open(page, "portugal");
  await page.waitForTimeout(300);
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await page.click(".price-of-war details.pow-line >> nth=0");
  await shot("declare");
  // Declare, play four weeks, then open the war card from the plaque.
  await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
  await page.click("[data-declare-confirm]");
  await page.waitForTimeout(300);
  for (let t = 0; t < 4; t++) {
    const turn = await page.evaluate(() => window.__phTurn());
    await page.evaluate(() => window.__phMarchOn("portugal"));
    await page.click(".end-turn");
    await page.waitForFunction((n) => window.__phTurn() > n, turn, { timeout: 30000 }).catch(async () => {
      console.log(`${name}: week ${t} did not end`);
      await page.screenshot({ path: `${out}/${name}-stuck-${t}.png` });
    });
  }
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelector(".hud .at-war").click());
  await page.waitForTimeout(300);
  await page.evaluate(() => document.querySelectorAll(".war-card details.pow-line.voices").forEach((d) => (d.open = true)));
  await page.evaluate(() => document.querySelector("[data-war-card]")?.scrollIntoView({ block: "start" }));
  await shot("war-card", 2);
  // Your name abroad, as it stands and with a league against Castile.
  await open(page, "castile");
  await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
  await shot("name-abroad", 1);
  await page.evaluate(() =>
    window.__phNameAbroad({ notoriety: 55, landsTaken: 6, threshold: 8, leagues: [{ members: [["portugal", 21000], ["aragon", 18000], ["navarre", 4000]] }] }),
  );
  await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
  await shot("name-abroad-league", 1);
  await page.close();
}
await browser.close();
server.httpServer.close();
