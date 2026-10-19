/**
 * Particles and animations on the map (VIEW-140..VIEW-150,
 * particles-and-animations-design.md): which moments a played day shows, how
 * many particles each may take at the player's Animations setting, and which
 * looping effects (chimney smoke, snow, birds) run. Decoration only: every
 * moment has its news line as well (VIEW-127), and nothing here feeds back
 * into the simulation (INV-VIEW-3). Numbers come from `effects` in
 * map-presentation.json.
 */
import config from "../../../../rules/data/domain/map-presentation.json" with { type: "json" };
import type { Animations } from "./index.ts";

const E = config.effects;
export const EFFECTS = E;

export type MomentKind = "flip" | "built" | "rising" | "glory" | "plague";

/** A one-shot effect at a province, in a realm's colour (VIEW-140). */
export interface Moment {
  kind: MomentKind;
  province: number;
  /** The realm whose colour it takes: the new holder for a flip, else the province's realm. */
  nation: number;
}

export interface MomentNews {
  kind: string;
  nations: number[];
  province?: number;
  begins?: true;
}

export interface MomentInput {
  /** The player's realm. */
  me: number;
  /** The player's capital province, where a realm-wide moment plays. */
  capital: number;
  /** Who holds each province (the occupier if any, else the owner) before the day, or null for the first snapshot of a session. */
  heldBefore: ArrayLike<number> | null;
  heldAfter: ArrayLike<number>;
  news: readonly MomentNews[];
  /** Each sick province's plague step before and after the day, and the outbreak step's index. */
  plagueBefore?: ReadonlyMap<number, number>;
  plagueAfter?: ReadonlyMap<number, number>;
  outbreakStep?: number;
}

/** Who holds a province on the map: its occupier while occupied, else its owner (-1 for nobody). */
export function holderOf(owner: number, occupier: number): number {
  return occupier >= 0 ? occupier : owner;
}

/**
 * The moments a played day shows (VIEW-140..VIEW-144): every province that
 * changed hands, the player's works finished, risings begun, plague breaking
 * out, and one gold shower over the player's capital for a new ruler, reform,
 * invention or heritage. At most one of each kind per province.
 */
export function moments(x: MomentInput): Moment[] {
  const out: Moment[] = [];
  const seen = new Set<string>();
  const add = (kind: MomentKind, province: number, nation: number) => {
    const key = `${kind}:${province}`;
    if (province < 0 || seen.has(key)) return;
    seen.add(key);
    out.push({ kind, province, nation });
  };
  if (x.heldBefore)
    for (let p = 0; p < x.heldAfter.length; p++) {
      const after = x.heldAfter[p]!;
      if (after >= 0 && after !== x.heldBefore[p]) add("flip", p, after);
    }
  for (const n of x.news) {
    if (n.kind === "built" && n.province !== undefined && n.nations.includes(x.me)) add("built", n.province, x.me);
    else if (n.kind === "rebels" && n.begins && n.province !== undefined) add("rising", n.province, x.heldAfter[n.province] ?? -1);
    else if ((E.gloryNews as string[]).includes(n.kind) && n.nations.includes(x.me)) add("glory", x.capital, x.me);
  }
  if (x.plagueAfter && x.outbreakStep !== undefined)
    for (const [p, step] of x.plagueAfter)
      if (step === x.outbreakStep && (x.plagueBefore?.get(p) ?? 0) < step) add("plague", p, x.heldAfter[p] ?? -1);
  return out;
}

/** Particles a moment takes at an Animations setting: all of them at Full, half at Reduced, none at Off (VIEW-145). */
export function momentParticles(kind: MomentKind, animations: Animations): number {
  const n = E.moments[kind].particles;
  return animations === "Full" ? n : animations === "Reduced" ? Math.round(n * E.reducedShare) : 0;
}

/** How long a moment's particles live, in seconds. */
export function momentSeconds(kind: MomentKind): number {
  return E.moments[kind].seconds;
}

/** Whether moments play at a camera zoom: from Region zoom in (VIEW-140). */
export function momentsShown(zoom: number): boolean {
  return zoom >= E.fromZoom;
}

/** Whether the looping effects run: only at Animations Full, and never under Battery saver (VIEW-145). */
export function loopingEffects(animations: Animations, batterySaver: boolean): boolean {
  return animations === "Full" && !batterySaver;
}

/** Chimneys smoking over a town of this many core cells: one per `coreCellsPerChimney`, at most `maxPerTown` (VIEW-146). */
export function chimneyCount(coreCells: number): number {
  if (coreCells <= 0) return 0;
  return Math.min(E.chimneys.maxPerTown, Math.ceil(coreCells / E.chimneys.coreCellsPerChimney));
}

/** Whether chimney smoke shows at a camera zoom: in the living band (VIEW-146). */
export function chimneysShown(zoom: number): boolean {
  return zoom >= E.chimneys.fromZoom;
}

/** Whether snow falls on a province at this temperature in °C (VIEW-147). */
export function snowing(celsius: number): boolean {
  return celsius < E.snow.belowCelsius;
}
