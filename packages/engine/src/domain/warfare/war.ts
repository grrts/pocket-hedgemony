import { truceMonthsAfterPeace } from "../diplomacy/index.ts";
import type { Lord } from "../realm/index.ts";
import { waver } from "./commanders.ts";
import { W } from "./model.ts";

/**
 * Occupation, raids and the war state (spec §5.18, §5.19): occupying
 * provinces, horse raids, peace voices and what they oblige, peace terms'
 * war-state preconditions, how a war ends, the war-aim effects table.
 */

// ---------------------------------------------------------------- occupation (WAR-175)

export interface Holding {
  province: string;
  owner: string;
  castle: boolean;
  occupiedBy?: string;
  /** Months an enemy army has held it. */
  heldMonths?: number;
  lord?: Lord & { wavesToward?: string };
}

/** Taking the castle, or holding a castle-less province a season, occupies it; its lord wavers toward the occupier (WAR-175). */
export function occupy(h: Holding, by: string, how: "takes its castle" | "holds it for a season"): boolean {
  const ok = how === "takes its castle" ? h.castle : !h.castle && (h.heldMonths ?? 0) >= W.occupation.hold_months;
  if (!ok) return false;
  h.occupiedBy = by;
  if (h.lord) {
    waver(h.lord);
    h.lord.wavesToward = by;
  }
  return true;
}

/** What an occupier gets from the province (WAR-175). */
export const occupierGets = (h: Holding): string[] => (h.occupiedBy ? ["tax", "recruits", "food", "trade"] : []);

// ---------------------------------------------------------------- raids (WAR-176)

/** A horse raid: each week burn one tile and take loot up to 1 load per 50 riders, then move on; never besiege or occupy (WAR-176). */
export function raidWeek(riders: number, horseOnly: boolean): { tilesBurned: number; maxLoot: number; loot: string[]; besieges: false; occupies: false; movesOn: boolean } | null {
  if (!horseOnly) return null;
  return { tilesBurned: W.raid.tiles_per_week, maxLoot: riders / W.raid.riders_per_load, loot: ["gold from market and town", "herds and horses from pasture"], besieges: false, occupies: false, movesOn: true };
}
/** A raiding army can't besiege or occupy; the castles there may sally against it (WAR-176). */
export const raiderMay = (): { besiege: boolean; occupy: boolean; castlesMaySally: boolean } => ({ besiege: false, occupy: false, castlesMaySally: true });

// ---------------------------------------------------------------- peace voices (WAR-180 … WAR-183)

export type Voice = "peace" | "war" | "none";

export interface LordVoiceState {
  provinces: number;
  anyOccupied?: boolean;
  retinueHalfLost?: boolean;
  loyalty: "Loyal" | "Wavering" | "Disloyal" | "In revolt";
  landsHungry?: boolean;
  warlike?: boolean;
  aimIsWant?: boolean;
  moreVictories?: boolean;
}

/** A lord's voices: one per province; peace when hurt or unsure, war when Warlike, his Want, or loyal and winning (WAR-180). */
export function lordVoice(l: LordVoiceState): { voices: number; says: Voice } {
  let says: Voice = "none";
  if (l.anyOccupied || l.retinueHalfLost || l.loyalty === "Wavering" || l.loyalty === "Disloyal" || l.landsHungry) says = "peace";
  else if (l.warlike || l.aimIsWant || (l.loyalty === "Loyal" && l.moreVictories)) says = "war";
  return { voices: l.provinces, says };
}

/** A royal province: peace with 2 or more of the war grievances, or when occupied; otherwise no voice (WAR-180). */
export function royalVoice(grievances: string[], occupied = false): Voice {
  if (occupied) return "peace";
  const n = grievances.filter((g) => W.peace.royal_grievances.includes(g)).length;
  return n >= W.peace.royal_grievances_needed ? "peace" : "none";
}

export interface VoiceCount {
  peace: number;
  war: number;
  none: number;
  total: number;
  /** The share that counts as peace after a Warlike ruler's quarter. */
  peaceShare: number;
}

/**
 * All voices of one side: lords (and a child ruler's regent, as a lord), royal
 * provinces, and the capital as a third of all; a Warlike ruler ignores a
 * quarter of the peace voices (WAR-180, INV-WAR-19: recomputed, never stored).
 */
export function countVoices(o: { lords: LordVoiceState[]; regent?: LordVoiceState; royal: Voice[]; capitalPeace: boolean; warlikeRuler?: boolean }): VoiceCount {
  const tally = { peace: 0, war: 0, none: 0 };
  for (const l of [...o.lords, ...(o.regent ? [o.regent] : [])]) {
    const v = lordVoice(l);
    tally[v.says] += v.voices;
  }
  for (const v of o.royal) tally[v] += 1;
  const others = tally.peace + tally.war + tally.none;
  // The capital weighs a third of all voices: half as much as all the others.
  const capital = others > 0 ? (others * W.peace.capital_share) / (1 - W.peace.capital_share) : 1;
  if (o.capitalPeace) tally.peace += capital;
  else tally.none += capital;
  const total = tally.peace + tally.war + tally.none;
  const peace = tally.peace * (o.warlikeRuler ? 1 - W.peace.warlike_ignore : 1);
  return { ...tally, total, peaceShare: total > 0 ? peace / total : 0 };
}

/** A Warlike ruler ignores a quarter of the peace voices (WAR-180). */
export const warlikeShare = (share: number): number => share * (1 - W.peace.warlike_ignore);

export type Obligation = "free" | "occupied provinces and gold" | "also tribute, a pretender or becoming a subject";

/** Over half say peace: accept occupied provinces and gold up to the treasury; over three quarters: also tribute, a pretender or becoming a subject (WAR-181, WAR-182). */
export function obligation(peaceShare: number): Obligation {
  if (peaceShare > W.peace.three_quarters) return "also tribute, a pretender or becoming a subject";
  if (peaceShare > W.peace.half) return "occupied provinces and gold";
  return "free";
}

/** A player who refuses an obliged peace: every lord loses a step each season and levies desert twice as fast (WAR-181). */
export const refusalPenalty = (): { lordStepsPerSeason: number; levyDesertion: number } => ({ lordStepsPerSeason: 1, levyDesertion: W.peace.refuse_desertion });

export type Term =
  | { kind: "cede"; province: string }
  | { kind: "gold"; amount: number }
  | { kind: "tribute" }
  | { kind: "pretender" }
  | { kind: "subject" }
  | { kind: "demolish"; province: string }
  | { kind: "open roads" }
  | { kind: "give back" }
  | { kind: "prisoners" }
  | { kind: "marriage" }
  | { kind: "white peace" }
  | { kind: "renounce" };

export interface WarState {
  /** Provinces the asker occupies. */
  occupied: string[];
  enemyTreasury: number;
  /** The share of the enemy's voices saying peace. */
  enemyPeaceShare: number;
  overlord?: boolean;
  capitalOccupied?: boolean;
  /** Provinces the enemy keeps. */
  enemyKeeps?: string[];
  pretender?: boolean;
  asDebt?: boolean;
}

/** War-state preconditions of each peace term (WAR-184). */
export function mayAsk(t: Term, s: WarState): boolean {
  const q = W.peace.three_quarters;
  switch (t.kind) {
    case "cede":
      return s.occupied.includes(t.province);
    case "gold":
      return t.amount <= s.enemyTreasury || s.asDebt === true;
    case "tribute":
      return s.enemyPeaceShare > q || s.overlord === true;
    case "pretender":
      return s.capitalOccupied === true;
    case "subject":
      return s.enemyPeaceShare > q;
    case "demolish":
      return (s.enemyKeeps ?? []).includes(t.province);
    case "renounce":
      return s.pretender === true;
    default:
      return true;
  }
}

/** The AI accepts a peace by the same counts as the player is obliged to (WAR-183). */
export function aiAccepts(peaceShare: number, terms: Term[], s: { occupiedByEnemy: string[]; treasury: number }): boolean {
  const ob = obligation(peaceShare);
  if (ob === "free") return false;
  return terms.every((t) => {
    if (t.kind === "cede") return s.occupiedByEnemy.includes(t.province);
    if (t.kind === "gold") return t.amount <= s.treasury;
    if (t.kind === "tribute" || t.kind === "pretender" || t.kind === "subject") return ob === "also tribute, a pretender or becoming a subject";
    return t.kind === "white peace" || t.kind === "give back" || t.kind === "prisoners";
  });
}

// ---------------------------------------------------------------- the war (WAR-177 … WAR-179, WAR-185 … WAR-189)

export interface War {
  id: string;
  aim: string | null;
  aimTarget?: string[];
  sides: [string, string];
  months: number;
  ended?: { how: string; winner?: string; takes?: string[] };
  visibleTo: "everyone";
}

export function openWar(id: string, attacker: string, defender: string, aim: string | null, target: string[] = []): War {
  return { id, aim, aimTarget: target, sides: [attacker, defender], months: 0, visibleTo: "everyone" };
}

/** A war with no fitting aim: Lands taken per province taken, non-Warlike lords waver, allies not obliged (WAR-178). */
export function noAimTaken(provincesTaken: number, lords: (Lord & { warlike?: boolean })[]): { landsTaken: number; alliesObliged: boolean } {
  for (const l of lords) if (!l.warlike && !l.traits.includes("Warlike")) waver(l);
  return { landsTaken: provincesTaken, alliesObliged: false };
}

/** Breaking a truce: an oath broken and every lord wavers one step (WAR-179). */
export function breakTruce(lords: Lord[]): { oathsBroken: number } {
  lords.forEach(waver);
  return { oathsBroken: 1 };
}

/** A side with no soldiers and no castles left loses: the winner takes all it occupies (WAR-185). */
export function checkCollapse(w: War, side: { country: string; soldiers: number; castles: number }, winnerOccupies: string[]): boolean {
  if (side.soldiers > 0 || side.castles > 0) return false;
  w.ended = { how: "collapse", winner: w.sides.find((s) => s !== side.country)!, takes: winnerOccupies };
  return true;
}

/** A Raid war ends by itself after 12 months; only raids, no occupation (WAR-186). */
export function raidWarMonth(w: War): { ended: boolean; mayOccupy: boolean } {
  w.months += 1;
  if (w.aim === "Raid" && w.months >= W.raid_war_months) w.ended = { how: "raid war over" };
  return { ended: w.ended !== undefined, mayOccupy: w.aim !== "Raid" };
}

/** A succession war ends a foreign war as a white peace, unless the enemy backs a claimant (WAR-187). */
export function successionWar(w: War, enemyBacksClaimant: boolean): void {
  if (!enemyBacksClaimant) w.ended = { how: "white peace" };
}

/** A signed peace ends the war and starts diplomacy's truce: 5 years, +5 if provinces moved or a subject was made (WAR-188). */
export function signPeace(w: War, moves: { landOrSubject?: boolean; white?: boolean }): { truceYears: number } {
  w.ended = { how: "peace" };
  return { truceYears: truceMonthsAfterPeace(moves) / 12 };
}

/** The war-aim effects table (WAR-189). */
export const aimEffect = (aim: string): string => {
  const e = (W.war_aims as Record<string, string>)[aim];
  if (!e) throw new Error(`unknown war aim ${aim}`);
  return e;
};
