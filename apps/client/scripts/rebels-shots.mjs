// Rebellions (REBL-063, REBL-065 to REBL-067) as Castile: the rebellion card with its answers and a beaten
// rising's verdict on the province card, and the Risings block of the Provinces tab, on a small and a large
// phone held sideways, a phone held upright (asked to turn), a tall window and a desktop. The cards are
// rendered by the game's own ui/rebels.ts (dev server) into the real panel, since a rising comes only after
// months of trouble.
// Usage: node scripts/rebels-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { createServer } from "vite";

const out = process.argv[2] ?? ".";
const server = await createServer({ server: { port: 4183, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const rising = {
  id: 1, owner: 0, location: 0, tile: 0, target: -1, men: 2840, cause: "Tax", grievance: "Heavy taxes", demand: "tax back to normal",
  leader: "the miller of Cuenca", leaderNote: "Cunning, little Might · might 1 · cunning 3", reason: "rose after a tax rise",
  joiners: "farmers, craftsmen, market folk", arms: "armed", armsFactor: 0.8, provinces: [0, 1], castles: [0], food: 2.4, tier: "Rebellion",
  monthsHeld: 5, monthsToWin: 12, spreadTo: [2, 3], siege: { province: 1, months: 1, progress: 0.4, garrison: 410 },
  answers: [
    { answer: "grant", label: "Grant demand", gold: 0, note: "their tax back to normal and the levy ended", why: null },
    { answer: "talk", label: "Talk", gold: 20, note: "75 in 100 they take half their demand", why: null },
    { answer: "bribe", label: "Bribe leader", gold: 29, note: "50 in 100 they melt away without him", why: null },
  ],
};

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4183/");
  await page.waitForSelector(".map-layer", { timeout: 90000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 90000 });
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.__phOpenProvince("cuenca") ?? window.__phOpenProvince(window.__phCapital()));
  await page.waitForTimeout(400);
  // A phone opens with the card folded away: unfold it.
  if (await page.locator("#reopen").isVisible()) await page.click("#reopen");
  await page.waitForTimeout(300);
  const measure = () =>
    page.evaluate(() => {
      const panel = document.querySelector(".panel");
      const small = [...panel.querySelectorAll(".rising button:not([disabled]), .rising-row")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
      return { small, sideways: panel.scrollWidth > panel.clientWidth + 1 };
    });
  await page.evaluate(async (r) => {
    const ui = await import("/src/ui/rebels.ts");
    const names = ["Cuenca", "Toledo", "Guadalajara", "Albacete"];
    const name = (p) => names[p] ?? `Province ${p}`;
    const html = ui.verdictCard({ id: 2, province: 2, cause: "Hunger", leader: "the dyer of Guadalajara", homeless: 610 }, name) + ui.risingCard(r, name, true, { army: 0, name: "Íñigo López de Mendoza", men: 9000 });
    document.querySelector(".panel .province-kind").insertAdjacentHTML("afterend", html);
  }, rising);
  await page.waitForTimeout(300);
  await shot("card");
  await page.locator(".rising .answers").last().scrollIntoViewIfNeeded();
  await shot("answers");
  console.log(name, "card", JSON.stringify(await measure()));
  // The second tap a grant asks for.
  await page.evaluate(async (r) => {
    const ui = await import("/src/ui/rebels.ts");
    ui.rebelsUi.confirm = "1:grant";
    document.querySelector("[data-rising]").outerHTML = ui.risingCard(r, (p) => ["Cuenca", "Toledo", "Guadalajara", "Albacete"][p], true, null);
  }, rising);
  await page.locator(".rising .answers").last().scrollIntoViewIfNeeded();
  await shot("grant-confirm");
  // The Provinces tab's Risings block.
  await page.click(".hud button.realm");
  await page.waitForTimeout(300);
  await page.click("#panel [data-realm-section=Lands]").catch(() => {});
  await page.click("[data-realm-tab=provinces]");
  await page.waitForTimeout(300);
  await page.evaluate(async (r) => {
    const ui = await import("/src/ui/rebels.ts");
    const html = ui.risingsOverview({ risings: [r], verdicts: [{ id: 2, province: 2, cause: "Hunger", leader: "", homeless: 610 }], chance: new Float32Array(4) }, 0, (p) => ["Cuenca", "Toledo", "Guadalajara", "Albacete"][p]);
    document.querySelector(".panel nav.tabs.small").insertAdjacentHTML("beforebegin", html);
  }, rising);
  await page.locator(".risings").scrollIntoViewIfNeeded();
  await shot("overview");
  console.log(name, "overview", JSON.stringify(await measure()));
  await page.close();
}
await browser.close();
await server.close();
