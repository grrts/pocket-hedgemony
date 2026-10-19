// Fleets as armies (feedback: flags, choosing and the course over the sea): a fleet's token and hulls, chosen by a tap,
// and its course over the sea tiles to a far zone, on a phone held sideways and upright and a desktop.
// Usage: pnpm build && node scripts/fleet-path-shots.mjs <outDir>
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? ".";
const nation = process.env.NATION ?? "portugal";
const server = await preview({ preview: { port: 4184, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
for (const [name, device] of [["landscape", devices["Pixel 7 landscape"]], ["small", devices["iPhone SE landscape"]], ["desktop", { viewport: { width: 1280, height: 800 } }]].filter(([n]) => !process.env.ONLY || process.env.ONLY.split(",").includes(n))) {
  const page = await browser.newPage({ ...device });
  page.on("pageerror", (e) => console.log("pageerror:", e.message));
  const shot = (what) => page.screenshot({ path: `${out}/${name}-${what}.png`, timeout: 120000 });
  await page.goto("http://localhost:4184/");
  await page.waitForSelector(`[data-nation=${nation}]`, { timeout: 60000 });
  await page.click(`[data-nation=${nation}]`);
  await page.click("[data-begin]");
  await page.waitForSelector(".hud [data-news]", { timeout: 60000 });
  await page.locator("[data-hint=stop]").first().click({ timeout: 3000 }).catch(() => {});
  await page.click(".panel .close").catch(() => {});
  const fleets = await page.evaluate(() => window.__phNavy().mine.map((m) => ({ id: m.id, ships: m.ships.length })));
  console.log(name, "fleets", JSON.stringify(fleets));
  for (const z of [6, 12, 20]) {
    await page.evaluate((z) => window.__phLookAtFleet(z), z);
    await page.waitForTimeout(500);
    await shot(`1-fleet-z${z}`);
  }
  // Tap the fleet in the middle of the screen.
  const vp = page.viewportSize();
  await page.evaluate(() => window.__phLookAtFleet(8));
  await page.waitForTimeout(400);
  const box = await page.evaluate(() => window.__phFleetBoxes?.() ?? null);
  console.log(name, "fleet boxes", JSON.stringify(box));
  if (box?.length) await page.mouse.click(box[0].x + box[0].w / 2, box[0].y + box[0].h / 2);
  await page.waitForTimeout(400);
  await shot("2-fleet-chosen");
  // A long voyage.
  const fleet = fleets[0]?.id;
  const far = Number(process.env.TO ?? -1);
  const idle = await page.evaluate(() => window.__phIdleCommander());
  if (idle < 0) await page.evaluate(() => window.__phFreeCommander());
  const admiral = idle >= 0 ? idle : await page.evaluate(() => window.__phIdleCommander());
  console.log(name, "admiral", admiral, JSON.stringify(await page.evaluate(([fleet, commander]) => window.__phNavyOrder({ do: "admiral", fleet, commander }), [fleet, admiral])));
  const home = await page.evaluate((id) => window.__phNavy().fleets.find((f) => f.id === id)?.at ?? -1, fleet);
  const seas = far >= 0 ? [far] : (await page.evaluate(([id, p]) => window.__phSeaBy(id, p), [process.env.FOE ?? "castile", home])).reverse();
  for (const to of seas) {
    const no = await page.evaluate(([fleet, to]) => window.__phNavyOrder({ do: "sail", fleet, to }), [fleet, to]);
    console.log(name, "sail", fleet, to, JSON.stringify(no));
    if (!no.length) break;
  }
  await page.waitForTimeout(500);
  for (const z of [2, 6]) {
    await page.evaluate((z) => window.__phLookAtFleet(z), z);
    await page.waitForTimeout(500);
    await shot(`3-course-z${z}`);
  }
  // A week at sea: the ship glides along its course, close in as hulls and further out as a token with its flag.
  await page.locator("[data-hint=stop]").first().click({ timeout: 1000 }).catch(() => {});
  for (const z of [8, 18]) {
    await page.evaluate((z) => window.__phLookAtFleet(z), z);
    await page.click(".end-turn");
    for (let i = 0; i < 4; i++) {
      await page.waitForTimeout(700);
      await page.evaluate((z) => window.__phLookAtFleet(z), z);
      await shot(`4-sailing-z${z}-${i}`);
    }
    await page.waitForTimeout(2500);
  }
  // A tap on the fleet chooses it; a tap on the army beside it chooses the army.
  await page.evaluate(() => window.__phLookAtFleet(8));
  await page.waitForTimeout(400);
  const boxes = await page.evaluate(() => window.__phFleetBoxes());
  console.log(name, "boxes", JSON.stringify(boxes));
  if (boxes[0]) await page.mouse.click(boxes[0].x + boxes[0].w / 2, boxes[0].y + boxes[0].h / 2);
  await page.waitForTimeout(400);
  await shot("5-chosen-at-sea");
  await page.close();
}
await browser.close();
server.httpServer.close();
