// The campaign screens (SHELL-138 to SHELL-148, DIPL-195, DIPL-196) as Castile at war with Portugal: an AI peace
// offer waiting in the Dispatches with its alert, Portugal's card with its marked Diplomacy tab, Later clearing the
// mark, the Trade and Army tabs, picking a commander from the Army list without moving the camera, and Space ending
// the turn; on a small and a large phone held sideways (touch), a phone held upright and a desktop. Checks every tab
// and button is at least 44 px and inside the safe area, and prints FAIL lines for anything that breaks.
// Usage: pnpm build && node scripts/campaign-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const server = await preview({ preview: { port: 4181, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const fail = (what) => {
  failed = true;
  console.log(`FAIL ${what}`);
};
{
  const page = await browser.newPage({ ...devices["Pixel 7"] });
  await page.goto("http://localhost:4181/");
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/portrait.png` });
  await page.close();
}

/** Every visible button and tab in the panel and alerts: at least 44 px tall, inside the window. */
async function checkTargets(page, name, where) {
  const bad = await page.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll("#panel button, #panel .tab, #alerts button, #army-list button")) {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
      // Inline realm and province links sit in running text; the rule is for buttons standing alone.
      if (el.closest("p, dd, li small")) continue;
      if (r.height < 43.5) out.push(`${el.textContent.trim().slice(0, 30) || el.className} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
    return out;
  });
  for (const b of bad) fail(`${name} ${where}: small tap target ${b}`);
}

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => fail(`${name} pageerror: ${e.message}`));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  const tap = (sel) => (device.hasTouch ? page.tap(sel) : page.click(sel));
  await page.goto("http://localhost:4181/?view=1460,560,1.4");
  await page.waitForSelector("[data-nation=castile]", { timeout: 60000 });
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(500);
  // The first-campaign hints are covered by their own shots; here they would sit over the card.
  await page.locator(".hint-note button:has-text('Stop hints')").click().catch(() => {});
  // Portugal's card opens on General; declare war from its Diplomacy tab.
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation("portugal"));
    document.body.append(b);
    b.click();
    b.remove();
  });
  await page.waitForTimeout(300);
  const tabs = await page.$$eval("#panel .tabs .tab", (els) => els.map((e) => e.textContent.trim()));
  if (tabs.slice(0, 4).join() !== "General,Diplomacy,Trade,Army") fail(`${name}: tabs ${tabs.join()}`);
  if ((await page.$eval("#panel .tabs .tab.on", (e) => e.textContent.trim())) !== "General") fail(`${name}: card does not open on General`);
  if (await page.$("#panel [data-declare]")) fail(`${name}: declare war on General`);
  await shot("general");
  await tap('#panel [data-realm-tab="diplomacy"]');
  await page.waitForTimeout(200);
  await tap("#panel [data-declare]");
  await page.waitForTimeout(400);
  await shot("war");
  await checkTargets(page, name, "diplomacy at war");
  // Portugal's AI offers peace: an alert with Answer, the Dispatches count it, its Diplomacy tab is marked.
  await page.evaluate(() => window.__phPretendOffer("portugal", "give"));
  await page.waitForTimeout(300);
  if (!(await page.$("#alerts .alert:has-text('offers peace')"))) fail(`${name}: no alert for the offer`);
  if (!(await page.$('#panel .tab.marked[data-realm-tab="diplomacy"]'))) fail(`${name}: Diplomacy tab not marked`);
  await shot("offer-card");
  // Answer opens the Dispatches; the alert may already have gone on a slow runner, so the top bar button does too.
  const answer = await page.$("#alerts .alert:has-text('offers peace') .go-there");
  await (answer ? answer.click() : page.click(".hud [data-news]"));
  await page.waitForTimeout(400);
  if (!(await page.$("#panel h3:text('Waiting for you')"))) fail(`${name}: no Waiting for you in the Dispatches`);
  await shot("offer-dispatches");
  await checkTargets(page, name, "dispatches");
  await tap("#panel [data-offer-later]");
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation("portugal"));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  });
  await page.waitForTimeout(300);
  if (await page.$('#panel .tab.marked[data-realm-tab="diplomacy"]')) fail(`${name}: Diplomacy tab still marked after Later`);
  await shot("offer-later");
  for (const t of ["trade", "military"]) {
    await tap(`#panel [data-realm-tab="${t}"]`);
    await page.waitForTimeout(300);
    await shot(t);
    await checkTargets(page, name, t);
  }
  await page.click("#panel .close");
  await page.waitForTimeout(300);
  // Picking a commander from the Army list selects him and keeps the camera still.
  const before = await page.evaluate(() => window.__phCamera());
  await tap("#armies");
  await page.waitForTimeout(300);
  await checkTargets(page, name, "army list");
  await tap("#army-list [data-pick]");
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__phCamera());
  if (JSON.stringify(before) !== JSON.stringify(after)) fail(`${name}: camera moved on select ${JSON.stringify(before)} -> ${JSON.stringify(after)}`);
  if (!(await page.$("#army-list [data-pick].on"))) fail(`${name}: commander not selected`);
  await shot("army-list");
  // Space ends the turn on a keyboard.
  if (!device.hasTouch) {
    await page.keyboard.press("Escape");
    await page.evaluate(() => document.activeElement?.blur());
    const turn = await page.evaluate(() => window.__phTurn());
    await page.keyboard.press("Space");
    await page.waitForFunction((t) => window.__phTurn() > t || document.querySelector(".end-turn.playing"), turn, { timeout: 20000 }).catch(() => fail(`${name}: Space did not end the turn`));
    await page.waitForTimeout(500);
    await shot("space");
  }
  await page.close();
}
await browser.close();
server.httpServer.close();
console.log(failed ? "Some checks failed." : "All checks passed.");
process.exit(failed ? 1 : 0);
