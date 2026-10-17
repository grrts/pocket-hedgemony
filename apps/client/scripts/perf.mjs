// Measures frame times while panning the map at several zooms, against the
// budgets in docs/performance.md. Fails (exit 1) when a budget is broken.
// Usage: pnpm build && node scripts/perf.mjs [--report]
import { chromium, devices } from "playwright-core";
import { preview } from "vite";

const report = process.argv.includes("--report");
const server = await preview({ preview: { port: 4176, strictPort: true } });
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ ...devices["Pixel 7 landscape"] });
page.on("pageerror", (e) => console.log("pageerror:", e.message));
await page.goto("http://localhost:4176/?perf");
await page.waitForFunction(() => globalThis.__phMap, null, { timeout: 30000 });
await page.click("[data-nation=france]");
// Playing starts once the first turn is on screen; loading the map before that is not play.
await page.waitForSelector(".end-turn", { timeout: 60000 });
await page.waitForTimeout(1000);
// Main-thread tasks over 50 ms, from here on: each one is a visible stutter.
await page.evaluate(() => {
  globalThis.__longTasks = [];
  new PerformanceObserver((list) => globalThis.__longTasks.push(...list.getEntries().map((e) => e.duration))).observe({ type: "longtask" });
});

// CI shades the map on a software GPU at about 120 ms a frame, which made the
// pans below take minutes. The map's shading is not budgeted here (only the
// overlay's CPU time is), so it is switched off while panning and animating,
// timed on its own for the report, and back on before the turns are played.
const mapFrameMs = await page.evaluate(
  () =>
    new Promise((done) => {
      const map = globalThis.__phMap;
      map.lookAt(2950, 470, 4);
      let n = 0;
      let t0 = 0;
      const step = (t) => {
        if (n === 5) t0 = t;
        map.lookAt(2950 + n, 470, 4);
        if (++n < 25) requestAnimationFrame(step);
        else done((t - t0) / 19);
      };
      requestAnimationFrame(step);
    }),
);
const shadeMap = (on) =>
  page.evaluate((on) => {
    const r = globalThis.__phMap.renderer;
    if (!on) ((r.realDraw = r.draw), (r.draw = () => {}));
    else if (r.realDraw) ((r.draw = r.realDraw), delete r.realDraw);
  }, on);
await shadeMap(false);

const pan = (zoom) =>
  page.evaluate(
    (zoom) =>
      new Promise((done) => {
        const map = globalThis.__phMap;
        const start = { x: 2950, y: 470 };
        map.lookAt(start.x, start.y, zoom);
        let n = 0;
        const step = () => {
          if (n === 5) ((map.stats.mapMs.length = 0), (map.stats.overlayMs.length = 0));
          map.lookAt(start.x + n * (2 / zoom), start.y, zoom);
          if (++n < 205) requestAnimationFrame(step);
          else requestAnimationFrame(() => done([...map.stats.overlayMs]));
        };
        requestAnimationFrame(step);
      }),
    zoom,
  );

const stat = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return { avg: s.reduce((a, b) => a + b, 0) / s.length, p95: s[Math.floor(s.length * 0.95)] ?? 0 };
};
// Overlay (labels, towns, armies) is plain CPU work, so it is checked here.
const OVERLAY_AVG_MS = 2.5;
const OVERLAY_P95_MS = 5;
const TURN_WAIT_MS = 250;
const TURN_APPLY_MS = 16;
const LONG_TASK_MS = 50;
let failed = false;
for (const zoom of [1.2, 2.5, 4, 6, 10]) {
  const o = stat(await pan(zoom));
  const ok = o.avg <= OVERLAY_AVG_MS && o.p95 <= OVERLAY_P95_MS;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"} zoom ${zoom}: overlay ${o.avg.toFixed(2)} ms avg, ${o.p95.toFixed(2)} ms p95 (budget ${OVERLAY_AVG_MS} / ${OVERLAY_P95_MS})`);
}
console.log(`map shading: ${mapFrameMs.toFixed(0)} ms a frame on the software GPU (reported only)`);

// Animation: an overlay that keeps asking for frames (marching armies) must
// get every one of them, not the 5 a second the idle map redraws at.
const animFrames = await page.evaluate(
  () =>
    new Promise((done) => {
      const map = globalThis.__phMap;
      const draw = map.events.drawOverlay;
      map.events.drawOverlay = (o) => (draw(o), map.invalidate());
      map.invalidate();
      const f0 = map.stats.frames;
      const r0 = { n: 0 };
      const count = () => (++r0.n < 60 ? requestAnimationFrame(count) : (map.events.drawOverlay = draw, done((map.stats.frames - f0) / r0.n)));
      requestAnimationFrame(count);
    }),
);
const ANIM_SHARE = 0.9;
if (animFrames < ANIM_SHARE) failed = true;
console.log(`${animFrames >= ANIM_SHARE ? "PASS" : "FAIL"} animating overlay redrawn on ${(animFrames * 100).toFixed(0)}% of frames (budget ${ANIM_SHARE * 100}%)`);

await shadeMap(true);

// Ending turns: each day (or battle step) of the week as it plays, the engine
// worker's answer, then taking it in on the main thread. One turn is played
// first to warm up and is not timed. CI runners share their CPUs, so a single
// stalled day can break a budget that every other day meets by far: when an
// attempt fails, three more turns are played as a fresh attempt, up to three
// attempts. Every attempt must meet the same budgets to count, so a real
// regression still fails all of them.
const playTurns = async (n) => {
  for (let i = 0; i < n; i++) {
    await page.click(".end-turn");
    await page.waitForFunction(() => !document.querySelector(".end-turn").classList.contains("playing"), null, { timeout: 60000 });
  }
};
await playTurns(1);
await page.evaluate(() => (performance.clearMeasures("turn-wait"), performance.clearMeasures("turn-apply")));
const ATTEMPTS = 3;
let turnsOk = false;
for (let attempt = 1; attempt <= ATTEMPTS && !turnsOk; attempt++) {
  await playTurns(3);
  // Taken and cleared together, so the next attempt measures only its own turns.
  // The first attempt's long tasks also cover panning, animating and the warm-up turn.
  const turns = await page.evaluate(() => {
    const r = {
      wait: performance.getEntriesByName("turn-wait").map((e) => e.duration),
      apply: performance.getEntriesByName("turn-apply").map((e) => e.duration),
      longTasks: globalThis.__longTasks.splice(0),
    };
    performance.clearMeasures("turn-wait");
    performance.clearMeasures("turn-apply");
    return r;
  });
  const check = (name, values, budget) => {
    const worst = Math.max(0, ...values);
    const ok = worst <= budget;
    console.log(`${ok ? "PASS" : "FAIL"} ${name}: worst ${worst.toFixed(1)} ms of ${values.length} (budget ${budget})`);
    return ok;
  };
  console.log(`turns, attempt ${attempt} of ${ATTEMPTS}:`);
  turnsOk = [
    check("day of the turn answered by the worker", turns.wait, TURN_WAIT_MS),
    check("day of the turn applied on the main thread", turns.apply, TURN_APPLY_MS),
    check("longest main-thread task", turns.longTasks, LONG_TASK_MS),
  ].every(Boolean);
}
if (!turnsOk) failed = true;
await browser.close();
server.httpServer.close();
if (failed && !report) process.exit(1);
