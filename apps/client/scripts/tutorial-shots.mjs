// The tutorial "Murad's Frontier" played through on a phone in landscape
// (844 x 390, touch) and in a narrow upright window (390 x 844): the
// first-launch question, every step of chapter 0 done the way its note asks
// (dragging and zooming the map, tapping only inside the spotlight), the end
// card, and the hints coming back after it (onboarding TUT-131 … TUT-134,
// D-TUT-19). Fails when the note covers the spotlight or a button is under 44 px.
// Usage: pnpm build && node scripts/tutorial-shots.mjs [outDir]
import { chromium } from "playwright-core";
import { preview } from "vite";

const out = process.argv[2] ?? "shots";
const server = await preview({ preview: { port: 4177, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let failed = false;
const fail = (why) => ((failed = true), console.log(`FAIL ${why}`));
const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function play(name, context) {
  const page = await (await browser.newContext(context)).newPage();
  page.on("pageerror", (e) => fail(`${name}: ${e.stack}`));
  const shot = (what) => page.screenshot({ path: `${out}/tutorial-${name}-${what}.png`, timeout: 120000 });
  const touch = !!context.hasTouch;
  const tap = (x, y) => (touch ? page.touchscreen.tap(x, y) : page.mouse.click(x, y));
  const step = () => page.evaluate(() => {
    const n = document.querySelector(".coach-note");
    return n && !n.hidden ? `${n.querySelector(".coach-face small")?.textContent ?? ""}|${n.querySelector("p")?.textContent ?? ""}`.split(" Stuck?")[0] : null;
  });
  /** Waits for the note to show another step (the map draws slowly in a software renderer). */
  const moved = async (before, what) => {
    const ok = await page
      .waitForFunction((b) => {
        const n = document.querySelector(".coach-note");
        const now = n && !n.hidden ? `${n.querySelector(".coach-face small")?.textContent ?? ""}|${n.querySelector("p")?.textContent ?? ""}` : null;
        return now !== b && !(now ?? "").startsWith(b?.split(" Stuck?")[0] ?? "~");
      }, before, { timeout: 60000 })
      .then(() => true, () => false);
    if (!ok) fail(`${name} ${what}: the step did not move on`);
    await page.waitForTimeout(300);
    console.log(name, await step());
  };
  /** Checks the note against the spotlight and the tap sizes of its buttons. */
  const check = async (what) => {
    const note = await page.locator(".coach-note").boundingBox();
    const spot = (await page.locator(".coach-spot").isHidden()) ? null : await page.locator(".coach-spot").boundingBox();
    if (spot && note && overlaps(spot, note)) fail(`${name} ${what}: the note covers the spotlight`);
    for (const b of await page.locator(".coach-buttons button").all()) {
      const r = await b.boundingBox();
      if (r && (r.height < 44 || r.width < 44)) fail(`${name} ${what}: a button is ${Math.round(r.width)} x ${Math.round(r.height)}`);
    }
    const vw = page.viewportSize();
    if (note && (note.x < 0 || note.x + note.width > vw.width || note.y < 0 || note.y + note.height > vw.height)) fail(`${name} ${what}: the note leaves the screen`);
    if (note && note.height > vw.height / 3 + 1) fail(`${name} ${what}: the note is taller than a third of the screen`);
  };
  /** Taps the middle of the spotlight until the step moves on. */
  const tapSpot = async (what) => {
    const before = await step();
    for (let i = 0; i < 4 && (await step()) === before; i++) {
      await page.waitForTimeout(400);
      if (await page.locator(".coach-spot").isHidden()) {
        if (await page.locator("[data-coach=show]").count()) await page.locator("[data-coach=show]").click();
        else fail(`${name} ${what}: nothing in the spotlight`);
        continue;
      }
      await check(`${what} tap ${i + 1}`);
      await shot(`${what}-${i + 1}`);
      const r = await page.locator(".coach-spot").boundingBox();
      // The step may have moved on while the shot was taken.
      if (!r) continue;
      await tap(r.x + r.width / 2, r.y + r.height / 2);
      // Wait for the tap to show: the note's next step, or the spotlight moving on to the next tap.
      await page
        .waitForFunction(([b, box]) => {
          const n = document.querySelector(".coach-note");
          const now = `${n.querySelector(".coach-face small")?.textContent ?? ""}|${n.querySelector("p")?.textContent ?? ""}`;
          const s = document.querySelector(".coach-spot").getBoundingClientRect();
          return now.split(" Stuck?")[0] !== b.split(" Stuck?")[0] || Math.abs(s.x - box.x) > 2 || Math.abs(s.y - box.y) > 2;
        }, [before, r], { timeout: 15000 })
        .catch(() => {});
      await page.waitForTimeout(300);
    }
    await moved(before, what);
  };

  await page.goto("http://localhost:4177/?start");
  await page.waitForSelector(".start-play", { timeout: 120000 });
  await page.waitForFunction(() => document.querySelector("#loader")?.classList.contains("done") || document.querySelector("#loader")?.hidden, null, { timeout: 120000 });
  await page.locator(".start-play").click();
  await page.waitForSelector(".start-ask");
  await shot("0-first-launch");
  await page.locator('[data-choice="Play the tutorial"]').click();
  await page.waitForSelector(".coach-note:not([hidden])", { timeout: 120000 });
  await page.waitForTimeout(800);
  console.log(name, await step());
  if (await page.locator(".hint-note:not([hidden])").count()) fail(`${name}: a hint shows while the tutorial runs`);

  // 1 Pan: drag the map.
  await check("1-pan");
  await shot("1-pan");
  // The drag is sent in one go inside the page: a slow software-drawn frame between Playwright's
  // moves would otherwise read as a long-press.
  let before = await step();
  await page.evaluate(() => {
    const c = document.querySelector("#map canvas:last-of-type");
    const at = openMap();
    // A synthetic pointer cannot be captured; the drag never leaves the canvas anyway.
    c.setPointerCapture = () => {};
    const ev = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { pointerId: 7, pointerType: "touch", clientX: x, clientY: y, bubbles: true, isPrimary: true }));
    ev("pointerdown", at.x, at.y);
    for (let i = 1; i <= 8; i++) ev("pointermove", at.x - i * 12, at.y - i * 4);
    ev("pointerup", at.x - 96, at.y - 32);
    function openMap() {
      for (let y = innerHeight * 0.3; y < innerHeight * 0.8; y += 20)
        for (let x = innerWidth * 0.2; x < innerWidth * 0.9; x += 20) if (document.elementFromPoint(x, y) === c && document.elementFromPoint(x - 100, y - 40) === c) return { x, y };
      return { x: innerWidth / 2, y: innerHeight / 2 };
    }
  });
  await moved(before, "1-pan");

  // 2 Look at Edirne: Next.
  await check("2-edirne");
  await shot("2-edirne");
  before = await step();
  await page.locator("[data-coach=next]").click();
  await moved(before, "2-edirne");

  // 3 Zoom in on Gallipoli: its name moves the camera there, then a zoom.
  await check("3-zoom");
  await page.locator("[data-coach-place=gallipoli]").click();
  await page.waitForTimeout(300);
  await shot("3-zoom");
  before = await step();
  await page.evaluate(() => {
    const c = document.querySelector("#map canvas:last-of-type");
    for (let y = innerHeight * 0.3; y < innerHeight * 0.8; y += 20)
      for (let x = innerWidth * 0.2; x < innerWidth * 0.9; x += 20)
        if (document.elementFromPoint(x, y) === c) return void c.dispatchEvent(new WheelEvent("wheel", { clientX: x, clientY: y, deltaY: -300, bubbles: true, cancelable: true }));
  });
  await moved(before, "3-zoom");

  // 4 Open Edirne's card; 5 the Food lens; 6 the Faith lens: only taps inside the spotlight.
  await tapSpot("4-card");
  await tapSpot("5-food");
  await tapSpot("6-faith");
  await check("7-end");
  await shot("7-end");
  if (!(await page.locator("[data-coach='keep ruling']").count())) {
    fail(`${name}: no end card`);
    return page.context().close();
  }
  await page.locator("[data-coach='keep ruling']").click();
  await page.waitForTimeout(1200);
  if (await page.locator(".coach-note:not([hidden])").count()) fail(`${name}: the note stays after the end card`);
  await shot("8-after");
  const done = await page.evaluate(() => JSON.parse(localStorage.getItem("ph-tutorial") ?? "{}").done);
  if (!done?.includes(0)) fail(`${name}: chapter 0 not marked done`);
  await page.context().close();
}

// [outDir] [landscape|portrait] plays one of them only.
const only = process.argv[3];
if (only !== "portrait") await play("landscape", { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
if (only !== "landscape") await play("portrait", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });

// A phone held upright: the turn-sideways notice covers everything, the note included.
const upright = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true })).newPage();
await upright.goto("http://localhost:4177/?start");
await upright.waitForSelector(".start-play", { timeout: 120000 });
await upright.screenshot({ path: `${out}/tutorial-phone-upright.png` });

await browser.close();
server.httpServer.close();
console.log(failed ? "tutorial-shots: FAILED" : "tutorial-shots: ok");
process.exit(failed ? 1 : 0);
