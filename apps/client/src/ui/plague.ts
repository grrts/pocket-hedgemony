import { PALETTE } from "../art/palette.ts";

/**
 * Plague on the screens (province PROV-361 to PROV-363): the plague card on a
 * province's Overview, with its step, the dead so far and the Quarantine
 * button; and the mark over a sick province on the map, a pale door with the
 * plague cross, barred while the province is closed. Everything the card says
 * is in words, never in colour alone, and nothing needs hover.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en");

/** The step as the player reads it, with what it means. */
const STEP_TEXT: Record<string, string> = {
  rumour: "Word of plague: the first sick",
  outbreak: "Outbreak: the dying has begun",
  "burning out": "Burning out: fewer fall sick each week",
};

export interface PlagueCardView {
  name: string;
  /** Step name (rumour, outbreak, burning out), or "none". */
  step: string;
  /** Plague weeks left at the step (four a month). */
  weeks: number;
  /** People dead of this plague so far. */
  dead: number;
  closed: boolean;
  /** The player's own province: the Quarantine button shows. */
  mine: boolean;
  /** What a closed province still pays of its tax (0.5 = half). */
  taxShare: number;
  /** Neighbours with an outbreak, for a healthy province. */
  nearby: number;
}

/** About how long the step lasts yet, in words. */
function timeLeft(step: string, weeks: number): string {
  if (step === "outbreak") return weeks > 8 ? `about ${Math.round(weeks / 4)} months more` : weeks > 4 ? "a month or two more" : "a few weeks more";
  return weeks > 1 ? `${weeks} weeks or so` : "about a week";
}

/**
 * The plague card on the province's Overview: shown while the province is
 * sick, and on the owner's own healthy province as a single line with the
 * button, so a province next to the plague can be closed before it arrives.
 */
export function plagueCard(v: PlagueCardView): string {
  const cost = `trade stops and tax falls to ${v.taxShare === 0.5 ? "half" : `${Math.round(v.taxShare * 100)} %`}`;
  const button = v.mine
    ? `<button class="paper plague-toggle" data-quarantine="${v.closed ? "off" : "on"}">${v.closed ? "Lift quarantine" : "Quarantine"}<small>${v.closed ? "traders come back slowly" : cost}</small></button>`
    : "";
  if (v.step === "none") {
    if (!v.mine) return "";
    if (v.closed) return `<section class="plague-card closed"><p><b>Closed against plague</b> · ${cost}. No plague here now.</p>${button}</section>`;
    // Plague next door: the province can be closed before it comes.
    if (v.nearby > 0) return `<section class="plague-card near"><p><b>Plague next door</b> in ${v.nearby} province${v.nearby === 1 ? "" : "s"}. Closing this one keeps most of it out.</p>${button}</section>`;
    return "";
  }
  return `<section class="plague-card">
    <h3 class="sub">Plague in ${esc(v.name)}</h3>
    <dl class="facts">
      <dt>Step</dt><dd><b>${esc(STEP_TEXT[v.step] ?? v.step)}</b> · ${timeLeft(v.step, v.weeks)}</dd>
      <dt>Dead</dt><dd>${v.dead > 0 ? `<b>${fmt(v.dead)}</b> so far, townsfolk first` : "None yet"}</dd>
      <dt>Closed</dt><dd>${v.closed ? `<b>Yes</b> · ${cost}; nothing spreads out by trade` : "No · it can spread along roads, rivers and the sea"}</dd>
    </dl>
    ${button}
  </section>`;
}

/**
 * The map's plague mark (VIEW-011, VIEW-128): a pale door with the plague
 * cross on it over the province, barred with a plank while it is closed;
 * the outbreak's door is drawn whole, the rumour's and burning out's fainter.
 */
export function drawPlagueMark(ctx: CanvasRenderingContext2D, x: number, y: number, u: number, step: number, closed: boolean): void {
  const w = 7 * u;
  const h = 10 * u;
  const left = Math.round(x - w / 2);
  const top = Math.round(y - h);
  ctx.save();
  ctx.globalAlpha *= step === 2 ? 1 : 0.7;
  // The doorway, in ink, then the pale door.
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(left - u, top - u, w + 2 * u, h + 2 * u);
  ctx.fillStyle = PALETTE.mist;
  ctx.fillRect(left, top, w, h);
  ctx.fillStyle = PALETTE.paper;
  ctx.fillRect(left + u, top + u, w - 2 * u, h - 2 * u);
  // The cross painted on a sick house's door.
  ctx.fillStyle = PALETTE.blood;
  ctx.fillRect(left + 3 * u, top + 2 * u, u, 6 * u);
  ctx.fillRect(left + u + u, top + 4 * u, 3 * u, u);
  if (closed) {
    // A plank nailed across: the province is closed.
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(left - 2 * u, top + 6 * u, w + 4 * u, 3 * u);
    ctx.fillStyle = PALETTE.clay;
    ctx.fillRect(left - u, top + 7 * u, w + 2 * u, u);
  }
  ctx.restore();
}
