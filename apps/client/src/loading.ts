import { sprite } from "./art/sprites.ts";

/**
 * The loading screen (feedback 47): the game's name, a rider galloping along
 * a pixel road as each stage of loading finishes, what is being done now, and
 * a tip to read meanwhile. Its markup sits in index.html so it shows before
 * any script has arrived; this module animates it and moves it on.
 */

const TIPS = [
  "Space ends the turn, and pauses it while the week plays.",
  "Tap a commander, then tap any land: the army marches there over the fastest ground.",
  "The numbered stones on a march show where the army stands as each week ends.",
  "Men are called up a thousand at a time from a province's Garrison tab.",
  "An army bigger than the land can feed marches slower and eats its wagons bare.",
  "Snow lies on the high passes first: in winter, go round the mountains.",
  "A province's official runs it: commission one as a commander and the post stands empty.",
];

const root = document.querySelector<HTMLElement>("#loader");
const stageEl = root?.querySelector<HTMLElement>(".loader-stage");
const tipEl = root?.querySelector<HTMLElement>(".loader-tip");
const barEl = root?.querySelector<HTMLElement>(".loader-bar i");
const art = root?.querySelector<HTMLCanvasElement>(".loader-art");

let progress = 0;
let shown = 0;
let tipAt = 0;
let raf = 0;
const RIDER_COLOR = "#a8323e";

function frame(t: number): void {
  if (!root || root.hidden) return;
  // Ease the rider toward the stage reached, so it never jumps.
  shown += (progress - shown) * 0.08;
  if (barEl) barEl.style.width = `${(shown * 100).toFixed(1)}%`;
  if (art) {
    const ctx = art.getContext("2d")!;
    const u = 3;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, art.width, art.height);
    // The road: ink edge, dust, and stones passing under the hooves.
    const road = art.height - 6 * u;
    ctx.fillStyle = "#24150c";
    ctx.fillRect(0, road, art.width, u);
    ctx.fillStyle = "#d8be86";
    ctx.fillRect(0, road + u, art.width, 4 * u);
    ctx.fillStyle = "#a26a3c";
    const scroll = Math.floor(t / 40) % (8 * u);
    for (let x = -scroll; x < art.width; x += 8 * u) ctx.fillRect(x, road + 2 * u, 2 * u, u);
    const img = sprite(Math.floor(t / 150) % 2 ? "rider1" : "rider0", RIDER_COLOR, u);
    const x = Math.round((art.width - img.width) * shown);
    const bob = Math.floor(t / 150) % 2 ? -u : 0;
    ctx.drawImage(img, x, road - img.height + 2 * u + bob);
  }
  if (tipEl && t - tipAt > 4500) {
    tipAt = t;
    tipEl.textContent = `Tip: ${TIPS[Math.floor(Math.random() * TIPS.length)]}`;
  }
  raf = requestAnimationFrame(frame);
}

/** Shows the loading screen (again), titled with what is loading. */
export function showLoading(stage: string, at = 0): void {
  if (!root) return;
  root.hidden = false;
  root.classList.remove("done");
  progress = at;
  shown = Math.min(shown, at);
  if (stageEl) stageEl.textContent = stage;
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

/** Moves on to the next stage: what is being done now, and how far along loading is (0 to 1). */
export function loadingStage(stage: string, at: number): void {
  if (!root) return;
  progress = Math.max(progress, at);
  if (stageEl) stageEl.textContent = stage;
}

/** Finishes loading: the rider reaches the end of the road and the screen fades away. */
export function hideLoading(): void {
  if (!root) return;
  progress = 1;
  if (stageEl) stageEl.textContent = "Ready";
  root.classList.add("done");
  setTimeout(() => {
    if (!root.classList.contains("done")) return;
    root.hidden = true;
    cancelAnimationFrame(raf);
    shown = 0;
  }, 450);
}

/** Waits for the browser to draw the screen once, so a stage's text shows before heavy work starts. */
export const painted = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

if (root) {
  progress = 0.08;
  raf = requestAnimationFrame(frame);
}
