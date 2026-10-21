// Screenshots for the website (docs/website.md): a fixed set of real game views on a
// phone held sideways, plus one on a desktop, saved as WebP in server/public/site/shots/.
// Plays the Ottomans from the 1378 start: the world map far out and close in, a
// province card, the realm card, the diplomacy lens and a battle against Karaman;
// then France until its first event card, and the map on a desktop screen. For the
// press kit it also draws the name in the title lettering (logo.png) and the crown
// icon enlarged (crown.png), both transparent, from the site's own font and art.
// Usage: pnpm build && node scripts/site-shots.mjs [outDir] [--png] [--art-only]
import { mkdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const keepPng = args.includes("--png");
const site = resolve(here, "../../../server/public/site");
const out = resolve(args.find((a) => !a.startsWith("--")) ?? `${site}/shots`);
mkdirSync(out, { recursive: true });

const PORT = 4191;
const server = await preview({ preview: { port: PORT, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
// A blank page that turns PNG screenshots into WebP with the browser's own encoder.
const encoder = await browser.newPage();
const saved = [];

/** Saves a PNG screenshot as `<name>.webp` (and `<name>.png` with --png). */
async function save(name, png) {
  if (keepPng) writeFileSync(`${out}/${name}.png`, png);
  const b64 = await encoder.evaluate(async (src) => {
    const img = new Image();
    img.src = `data:image/png;base64,${src}`;
    await img.decode();
    const c = Object.assign(document.createElement("canvas"), { width: img.width, height: img.height });
    c.getContext("2d").drawImage(img, 0, 0);
    return c.toDataURL("image/webp", 0.86).split(",")[1];
  }, png.toString("base64"));
  const file = `${out}/${name}.webp`;
  writeFileSync(file, Buffer.from(b64, "base64"));
  saved.push([name, statSync(file).size]);
}

/** Opens the game, takes a realm and clears the first-launch hints. */
async function start(device, nation = "ottomans") {
  const page = await browser.newPage(device);
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  await page.goto(`http://localhost:${PORT}/?new`);
  await page.waitForSelector(`[data-nation=${nation}]`, { timeout: 60000 });
  await page.click(`[data-nation=${nation}]`);
  const rule = page.locator(`.wax.play[data-nation=${nation}]`);
  if (await rule.count()) await rule.click();
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.waitForTimeout(800);
  await page.locator("[data-hint=stop]").first().click().catch(() => {});
  return page;
}

/** Clears the alerts over the map, so the shot shows the game itself. */
const tidy = (page) => page.evaluate(() => document.querySelectorAll("#alerts > *").forEach((e) => e.remove()));

const shoot = async (page, name, wait = 700) => {
  await tidy(page);
  await page.waitForTimeout(wait);
  await save(name, await page.screenshot());
};

/** The press kit's art: the name in Jacquard 12 beside the crown, and the crown alone, on a transparent ground. */
async function pressArt() {
  const font = readFileSync(`${site}/fonts/jacquard-12-latin-400-normal.woff2`).toString("base64");
  const crown = `data:image/png;base64,${readFileSync(`${site}/art/icon-crown.png`).toString("base64")}`;
  const page = await browser.newPage({ viewport: { width: 2000, height: 800 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>
    @font-face { font-family: J; src: url(data:font/woff2;base64,${font}) format("woff2"); }
    body { margin: 0; background: transparent; }
    #logo { display: inline-flex; align-items: center; gap: 36px; padding: 24px 48px 36px 24px; font: 144px/1 J; white-space: nowrap; color: #f8ecc8; text-shadow: 12px 12px 0 #24150c; }
    #logo img { width: 120px; height: 96px; image-rendering: pixelated; filter: drop-shadow(12px 12px 0 #24150c); }
    #crown { display: inline-block; width: 320px; height: 256px; image-rendering: pixelated; }
  </style><div id="logo"><img src="${crown}" alt="">Pocket Hegemony</div><br><img id="crown" src="${crown}" alt="">`);
  await page.evaluate(() => document.fonts.ready);
  for (const name of ["logo", "crown"]) {
    const png = await page.locator(`#${name}`).screenshot({ omitBackground: true });
    const file = `${out}/${name}.png`;
    writeFileSync(file, png);
    saved.push([`${name}.png`, statSync(file).size]);
  }
  await page.close();
}

const closePanel = (page) => page.evaluate(() => document.querySelector("#panel .close")?.click());

try {
  await pressArt();
  if (args.includes("--art-only")) process.exit(0);
  const phone = { ...devices["Pixel 7 landscape"], deviceScaleFactor: 2 };
  const page = await start(phone);
  const capital = await page.evaluate(() => window.__phCapital());

  // The world map: far out over Europe and the Near East, then close in on Edirne.
  await closePanel(page);
  await page.evaluate(() => window.__phLookAtArmy(1.6));
  await shoot(page, "map-far", 1200);
  await page.evaluate(() => window.__phLookAtArmy(12));
  await shoot(page, "map-close", 1200);

  // A province card, and the realm card.
  await page.evaluate((id) => window.__phSelect(id), capital);
  await shoot(page, "province");
  await page.evaluate(() => window.__phRealmTab("general"));
  await shoot(page, "realm");
  await closePanel(page);

  // The diplomacy lens over the region.
  await page.click("#mode");
  await page.click("[data-lens=diplomacy]");
  await page.click("#mode").catch(() => {});
  await page.evaluate(() => window.__phLookAtArmy(3));
  await shoot(page, "diplomacy", 1000);
  await page.click("#mode");
  await page.click("[data-lens=realms]");
  await page.click("#mode").catch(() => {});

  // War on Karaman: send the armies at its host, week by week, and follow the first battle.
  const foe = "karaman";
  await page.evaluate((id) => {
    const b = document.createElement("button");
    b.dataset.realm = String(window.__phNation(id));
    b.dataset.realmOpen = "diplomacy";
    document.body.append(b);
    b.click();
    b.remove();
  }, foe);
  await page.click("[data-declare]");
  await page.click("[data-declare-confirm]");
  await page.waitForTimeout(300);
  await closePanel(page);
  let battle = false;
  for (let t = 0; t < 30 && !battle; t++) {
    await page.evaluate((id) => window.__phAttack(id), foe);
    const turn = await page.evaluate(() => window.__phTurn());
    await page.click(".end-turn");
    while ((await page.evaluate(() => window.__phTurn())) === turn) {
      await page.waitForTimeout(150);
      await page.locator("#event-card:not([hidden]) [data-event-option]").first().click().catch(() => {});
      const go = page.locator(".alert .go-there", { hasText: "Watch" });
      if (!battle && (await go.count())) {
        await go.first().click();
        await page.waitForTimeout(700);
        await page.evaluate(() => document.querySelectorAll("#alerts > *").forEach((e) => e.remove()));
        await save("battle", await page.screenshot());
        battle = true;
        await page.locator(".battle-watch .dismiss").click().catch(() => {});
      }
    }
    console.log("week", t, await page.locator(".turn-label").innerText().catch(() => ""), { battle });
  }
  await page.close();

  // An event card: France declares for Clement in the schism, in mid-November 1378.
  const france = await start(phone, "france");
  const card = france.locator("#event-card:not([hidden])");
  for (let t = 0; t < 16 && !(await card.count()); t++) {
    const turn = await france.evaluate(() => window.__phTurn());
    await france.click(".end-turn");
    while (!(await card.count()) && (await france.evaluate(() => window.__phTurn())) === turn) await france.waitForTimeout(200);
  }
  if (await card.count()) await shoot(france, "event", 600);
  else console.log("no event card turned up");
  await france.close();

  // The same game on a desktop screen.
  const desk = await start({ viewport: { width: 1366, height: 768 }, deviceScaleFactor: 1 });
  await closePanel(desk);
  await desk.evaluate(() => window.__phLookAtArmy(4));
  await shoot(desk, "desktop", 1200);
  await desk.close();
} finally {
  await browser.close();
  server.httpServer.close();
  const total = saved.reduce((s, [, n]) => s + n, 0);
  for (const [name, n] of saved) console.log(`${name.includes(".") ? name : `${name}.webp`} ${Math.round(n / 1024)} KB`);
  console.log(`${saved.length} shots, ${Math.round(total / 1024)} KB in ${out}`);
}
