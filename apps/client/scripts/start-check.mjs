// Check of the default start (1378, X-25): loads the build as a phone held
// sideways, shows the loading screen and the realm picker, picks a realm,
// plays one week, and saves screenshots of each; held upright, the phone asks
// to be turned sideways. Then opens the 1444 checkpoint behind ?start=1444 and
// plays one week there.
// Usage: pnpm build && node scripts/start-check.mjs [realm] [outDir]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const realm = process.argv[2] ?? "ottomans";
const out = process.argv[3] ?? ".";
const server = await preview({ preview: { port: 4175, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errors = [];
let failed = false;

async function play(device, tag, query, nation, firstWeek) {
  const context = await browser.newContext({ ...devices[device] });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(`${tag}: ${e.message}`));
  page.on("console", (m) => m.type() === "error" && errors.push(`${tag}: ${m.text()}`));
  await page.goto(`http://localhost:4175/${query}`);
  await page.screenshot({ path: `${out}/${tag}-loading.png` });
  const d = await page
    .waitForFunction(() => {
      const d = globalThis.__phDiagnostics;
      return d && (d.engineRoundTripMs !== null || d.engineError !== null) ? d : null;
    }, null, { timeout: 60000 })
    .then((h) => h.jsonValue());
  await page.waitForSelector(`[data-nation=${nation}]`, { timeout: 60000 });
  await page.screenshot({ path: `${out}/${tag}-picker.png` });
  // The realm's card before Begin (its ruler and start day), opened as a row of a region's list opens it.
  const index = await page.evaluate((id) => globalThis.__phNation(id), nation);
  await page.evaluate((i) => {
    const b = Object.assign(document.createElement("button"), { hidden: true });
    b.dataset.realm = String(i);
    document.querySelector(".panel, #panel, aside")?.append(b);
    b.click();
  }, index);
  await page.waitForSelector(`.wax.play[data-nation=${nation}]`, { timeout: 10000 });
  await page.screenshot({ path: `${out}/${tag}-card.png` });
  await page.click(`.wax.play[data-nation=${nation}]`);
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${out}/${tag}-start.png` });
  await page.click(".end-turn");
  await page.waitForSelector(`.turn-label:text('${firstWeek}')`, { timeout: 90000 });
  await page.screenshot({ path: `${out}/${tag}-week.png` });
  console.log(`PASS ${tag}: one week as ${nation} (${d.engineMode})`);
  await context.close();
}

/** Held upright, the phone shows the loading screen and then asks to be turned sideways. */
async function upright() {
  const context = await browser.newContext({ ...devices["Pixel 7"] });
  const page = await context.newPage();
  await page.goto("http://localhost:4175/?new");
  await page.screenshot({ path: `${out}/1378-tall-loading.png` });
  await page.waitForSelector(".rotate", { state: "visible", timeout: 60000 });
  await page.screenshot({ path: `${out}/1378-tall.png` });
  console.log("PASS 1378-tall: asks to turn the phone sideways");
  await context.close();
}

try {
  await play("Pixel 7 landscape", "1378-wide", "?new", realm, "27 Sep 1378");
  await upright();
  await play("Pixel 7 landscape", "1444-wide", "?start=1444&new", "france", "18 Nov 1444");
} catch (e) {
  console.log("FAIL", e.message);
  failed = true;
} finally {
  console.log("errors:", errors.slice(0, 10));
  await browser.close();
  server.httpServer.close();
}
process.exit(failed ? 1 : 0);
