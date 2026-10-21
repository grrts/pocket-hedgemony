// Revolutions (REVO-090 to REVO-093) as Castile: the mark on the Stability plaque, the Revolution block on the
// General tab, the full-screen choice card and the regime card on the Government tab, on a small and a large
// phone held sideways, a phone held upright (asked to turn), a tall window and a desktop. The pieces are rendered by the game's
// own ui/revolution.ts (dev server) into the real screen, since a revolution comes only after years of trouble.
// Usage: node scripts/revolution-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { createServer } from "vite";

const out = process.argv[2] ?? ".";
const server = await createServer({ server: { port: 4184, strictPort: true } });
await server.listen();
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });

const sign = (key, label, ease, tab, lit) => ({ key, label, ease, tab, lit });
const revo = {
  family: "estates",
  name: "Estates and town revolutions",
  idea: "Towns, assemblies or great lords force the crown to share power, or lose it.",
  stage: "Ready",
  colour: "red",
  lit: 3,
  need: 3,
  warnAt: 2,
  signs: [
    sign("tax", "Heavy taxes in a quarter of the realm (9 of 28)", "Lower the tax", "provinces", true),
    sign("lords", "2 or more lords waver (3 now)", "Gifts and fiefs win lords back", "lords", true),
    sign("debt", "Debt above a year's income (1,240 gold)", "Repay your loans", "treasury", true),
    sign("hunger", "Hunger in a fifth of the realm (2 of 28)", "Feed them: castle granaries, less grain sold", "food", false),
    sign("restless", "Riots or plots in a tenth of the realm (1 of 28)", "Judges, lighter taxes and food calm provinces", "provinces", false),
    sign("rebels", "Rebels hold land, or won in the last 5 years", "Beat or answer the rebels", "provinces", false),
  ],
  spark: { label: "A great lord turns against the court (2 or more Disloyal)", mult: 2, lit: false },
  chance: 1 / 12,
  stopped: null,
  stances: [
    { stance: "lead", label: "Share power", does: ["League of towns at once", "Form: diet monarchy (officials 20, lords 8)", "Your ruler stays", "Locked: crushing taxes, revoking town charters"] },
    { stance: "bend", label: "Grant charters", does: ["Tax fixed at light for 10 years in 9 provinces with heavy taxes", "Stopped, not solved: after 3 years it can break out again while the signs stay lit"] },
    { stance: "fight", label: "Break them", does: ["About 2,970 rise in Cuenca", "If they win: republic of the estates. Form: merchant republic (officials 18, lords 2). The ruler is elected; your house goes abroad. Locked: crushing taxes", "If you crush them: reaction. Your ruler stays. Bloodshed where they rose; it comes back sooner (one sign fewer for 20 years)"] },
  ],
  outbreak: true,
  rising: 0,
  regime: null,
  ruler: "The house that ruled in 1444",
};
const regime = {
  ...revo,
  stage: "Stopped",
  colour: "amber",
  lit: 2,
  outbreak: false,
  stopped: { until: "March 1461" },
  regime: { id: "town_league", name: "League of towns", loop: "Your gold comes from loans and consent, not decree; towns grow fast.", since: "March 1458", ruler: "The house that ruled in 1444", formBefore: "Feudal realm", emigre: false, locks: [{ action: "revoke_charter", label: "Revoking town charters" }, { action: "crushing_taxes", label: "Crushing taxes" }] },
};

const tooSmall = (sel) =>
  page.evaluate((sel) => {
    const root = document.querySelector(sel);
    if (!root) return { missing: sel };
    const small = [...root.querySelectorAll("button:not([disabled]), summary")].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim().slice(0, 30));
    return { small, sideways: root.scrollWidth > root.clientWidth + 1 };
  }, sel);
let page;

for (const [name, device] of [["small", devices["iPhone SE landscape"]], ["landscape", devices["Pixel 7 landscape"]], ["portrait", devices["Pixel 7"]], ["tall", { viewport: { width: 700, height: 1000 } }], ["desktop", { viewport: { width: 1280, height: 800 } }]]) {
  page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png` });
  await page.goto("http://localhost:4184/");
  await page.waitForSelector(".map-layer", { timeout: 90000 });
  await page.waitForSelector("[data-nation=castile]", { timeout: 90000 });
  // A phone held upright is asked to turn sideways, as for the whole game.
  if (name === "portrait") {
    await shot("upright");
    await page.close();
    continue;
  }
  await page.click("[data-nation=castile]");
  await page.click("[data-begin]");
  await page.waitForFunction(() => window.__phTurn() >= 0, null, { timeout: 90000 });
  await page.waitForTimeout(1500);
  // First-campaign hints would cover the shots: stop them.
  const stop = page.locator(".hint-note button", { hasText: "Stop hints" });
  if (await stop.isVisible()) await stop.click();
  for (const close of await page.locator(".alerts .dismiss").all()) await close.click().catch(() => {});
  // The choice card over the map, and the plaque's mark.
  await page.evaluate(async (v) => {
    const ui = await import("/src/ui/revolution.ts");
    const plaque = document.querySelector(".plaque.stability");
    const m = ui.revolutionMark(v);
    if (plaque && m) (plaque.classList.add(`revo-${m.colour}`), plaque.insertAdjacentHTML("beforeend", m.badge));
    const sheet = document.querySelector("#revolution-card");
    sheet.innerHTML = ui.revolutionCardHtml(v, "Castile");
    sheet.hidden = false;
  }, revo);
  await page.waitForTimeout(300);
  await shot("choice");
  console.log(name, "choice", JSON.stringify(await tooSmall("#revolution-card")));
  await page.evaluate(() => (document.querySelector("#revolution-card").hidden = true));
  // The General tab's Revolution block under the pillars.
  await page.click(".plaque.stability");
  await page.waitForTimeout(400);
  if (await page.locator("#reopen").isVisible()) await page.click("#reopen");
  await page.waitForTimeout(300);
  await page.evaluate(async (v) => {
    const ui = await import("/src/ui/revolution.ts");
    document.querySelector(".panel .revolution, .panel .revo-quiet")?.remove();
    document.querySelector(".panel .pillars").insertAdjacentHTML("afterend", ui.revolutionSection(v));
    document.querySelector(".panel details.revo-fold").open = true;
  }, { ...revo, outbreak: false });
  await page.locator(".panel .revolution").scrollIntoViewIfNeeded();
  await shot("general");
  await page.locator(".panel .revo-fold").scrollIntoViewIfNeeded();
  await shot("general-fold");
  console.log(name, "general", JSON.stringify(await tooSmall(".panel")));
  // The Government tab's regime card.
  await page.click("#panel [data-realm-section=Realm]").catch(() => {});
  await page.click("[data-realm-tab=government]");
  await page.waitForTimeout(300);
  await page.evaluate(async (v) => {
    const ui = await import("/src/ui/revolution.ts");
    document.querySelector(".panel .regime, .panel .caps")?.insertAdjacentHTML("beforebegin", ui.regimeCard(v));
  }, regime);
  await page.locator(".panel .regime").scrollIntoViewIfNeeded();
  await shot("government");
  console.log(name, "government", JSON.stringify(await tooSmall(".panel")));
  await page.close();
}
await browser.close();
await server.close();
