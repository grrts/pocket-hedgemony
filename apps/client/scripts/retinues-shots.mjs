// Lords' retinues (WAR-259 to WAR-262) as Castile at war with Portugal: the Army tab's Lords' men section before
// and after Call the lords, a lord's screen with his Retinue block, and a lord's army on its commander screen once
// his men have gathered. Shot on a small and a large phone held sideways (Wide), a tablet held upright (Tall) and a
// desktop window.
// Usage: pnpm build && node scripts/retinues-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4191, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const openRealm = (page, id, tab) =>
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
for (const [name, device] of [
  ["small", devices["iPhone SE landscape"]],
  ["wide", devices["Pixel 7 landscape"]],
  ["tall", { viewport: { width: 820, height: 1180 } }],
  ["desktop", { viewport: { width: 1280, height: 800 } }],
]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = async (what, screens = 2) => {
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
  const toLordsMen = () => page.evaluate(() => document.querySelector("[data-call-lords]")?.scrollIntoView({ block: "center" }));
  await page.goto("http://localhost:4191/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.click("[data-hint=stop]").catch(() => {});
  // At peace: the section with its greyed call and the reason.
  await openRealm(page, "castile", "military");
  await toLordsMen();
  await shot("peace", 1);
  // Declare on Portugal, then call the lords.
  await openRealm(page, "portugal", "diplomacy");
  await page.waitForTimeout(300);
  await page.click("[data-declare]");
  await page.waitForTimeout(300);
  await page.evaluate(() => (document.querySelector("#panel").scrollTop = 0));
  await page.click("[data-declare-confirm]");
  await page.waitForTimeout(300);
  await openRealm(page, "castile", "military");
  await toLordsMen();
  await shot("at-war", 1);
  await page.click("[data-call-lords]");
  await page.waitForTimeout(400);
  await toLordsMen();
  await shot("called", 1);
  // A lord's own screen with his Retinue block.
  await page.click(".retinue-row [data-lord-open] >> nth=0").catch(() => console.log(`${name}: no lord row to open`));
  await page.waitForTimeout(300);
  await shot("lord", 2);
  // Play until the loyal lords' men have gathered (6 weeks for a wavering lord), then open one lord's army.
  for (let t = 0; t < 7; t++) {
    const turn = await page.evaluate(() => window.__phTurn());
    await page.click(".end-turn");
    await page.waitForFunction((n) => window.__phTurn() > n, turn, { timeout: 30000 }).catch(() => console.log(`${name}: week ${t} did not end`));
  }
  await page.waitForTimeout(600);
  await openRealm(page, "castile", "military");
  await toLordsMen();
  await shot("in-field", 1);
  const command = page.locator(".retinue-row [data-command]");
  if (await command.count()) {
    await command.first().click();
    await page.waitForTimeout(300);
    await shot("army", 2);
  } else console.log(`${name}: no lord in the field`);
  await page.close();
}
await browser.close();
server.httpServer.close();
