import { sprite } from "./art/sprites.ts";

/**
 * The loading screen (feedback 47): the game's name, a rider galloping along
 * a pixel road as each stage of loading finishes, what is being done now, and
 * a tip to read meanwhile. Its markup sits in index.html so it shows before
 * any script has arrived; this module moves it on.
 *
 * The motion that says the game is still working (the gallop, the passing
 * road, the shine running along the bar, the dots) is all CSS transform and
 * opacity animation, which the browser plays off the main thread: building the
 * map and the realms blocks scripts for a second or more at a time, and a
 * script-drawn rider froze there, so loading looked stuck.
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
const track = root?.querySelector<HTMLElement>(".loader-track");
const rider = root?.querySelector<HTMLElement>(".loader-rider");

let progress = 0;
let tipTimer = 0;
const RIDER_COLOR = "#a8323e";
/** Sprite pixels are drawn at this size, and shown at one 180th of the road's width each. */
const SCALE = 3;

/** The rider's two gallop frames, one over the other, which CSS shows in turn. */
function drawRider(): void {
  if (!rider) return;
  const frames = (["rider0", "rider1"] as const).map((name) => {
    const src = sprite(name, RIDER_COLOR, SCALE);
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    c.getContext("2d")!.drawImage(src, 0, 0);
    return c;
  });
  track?.style.setProperty("--rw", String(frames[0]!.width / SCALE));
  track?.style.setProperty("--rh", String(frames[0]!.height / SCALE));
  rider.replaceChildren(...frames);
}

/** Moves the rider and the bar to how far along loading is (0 to 1). */
function show(at: number): void {
  progress = at;
  if (barEl) barEl.style.width = `${(at * 100).toFixed(1)}%`;
  if (track) track.style.transform = `translateX(${(at * 100).toFixed(1)}%)`;
}

function setStage(stage: string): void {
  // The dots after the words are animated, so the words lose their own.
  if (stageEl) stageEl.textContent = stage.replace(/(…|\.\.\.)$/, "");
}

function nextTip(): void {
  if (tipEl) tipEl.textContent = `Tip: ${TIPS[Math.floor(Math.random() * TIPS.length)]}`;
}

/** Shows the loading screen (again), titled with what is loading. */
export function showLoading(stage: string, at = 0): void {
  if (!root) return;
  root.hidden = false;
  root.classList.remove("done");
  show(at);
  setStage(stage);
  nextTip();
  clearInterval(tipTimer);
  tipTimer = window.setInterval(nextTip, 4500);
}

/** Moves on to the next stage: what is being done now, and how far along loading is (0 to 1). */
export function loadingStage(stage: string, at: number): void {
  if (!root) return;
  show(Math.max(progress, at));
  setStage(stage);
}

/** Finishes loading: the rider reaches the end of the road and the screen fades away. */
export function hideLoading(): void {
  if (!root) return;
  show(1);
  setStage("Ready");
  root.classList.add("done");
  setTimeout(() => {
    if (!root.classList.contains("done")) return;
    root.hidden = true;
    clearInterval(tipTimer);
    show(0);
  }, 450);
}

/** Waits for the browser to draw the screen once, so a stage's text shows before heavy work starts. */
export const painted = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 0)));

if (root) {
  drawRider();
  show(0.08);
  nextTip();
  tipTimer = window.setInterval(nextTip, 4500);
}
