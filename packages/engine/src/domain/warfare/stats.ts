import { garrisonOverRoom, kindDef } from "./companies.ts";
import { W, knows, type Company, type Known } from "./model.ts";

/**
 * The realm's soldier stats (spec §5.3, §5.4): soldiers, the arms and powder
 * stores, prisoners, victories and defeats, and the troop cap.
 */

export interface RealmWar {
  country: string;
  armsStore: number;
  powderStore: number;
  prisoners: number;
  /** Years of the battles won and lost. */
  victories: number[];
  defeats: number[];
  fallen: number;
  oathsBroken: number;
  landsTaken: number;
  known: Set<string>;
}

export function newRealmWar(country: string, init: Partial<RealmWar> = {}): RealmWar {
  return { country, armsStore: 0, powderStore: 0, prisoners: 0, victories: [], defeats: [], fallen: 0, oathsBroken: 0, landsTaken: 0, known: new Set(), ...init };
}

/** Soldiers are the men in all companies, garrisons included (WAR-024). */
export const soldiers = (armyMen: number, garrisonMen: number): number => armyMen + garrisonMen;

export type ArmsEvent = { forges: number } | { handedBack: number } | { issued: number } | { lost: number } | { sold: number } | { bought: number } | { captured: number } | { rustYears: number };

/** The arms store: forges, buying, captured fields and handed-back loads in; issue, loss, rust 2 % a year and sale out (WAR-025). */
export function armsStore(r: RealmWar, e: ArmsEvent): number {
  if ("forges" in e) r.armsStore += e.forges;
  else if ("handedBack" in e) r.armsStore += e.handedBack;
  else if ("bought" in e) r.armsStore += e.bought;
  else if ("captured" in e) r.armsStore += e.captured;
  else if ("issued" in e) r.armsStore -= e.issued;
  else if ("lost" in e) r.armsStore -= e.lost;
  else if ("sold" in e) r.armsStore -= e.sold;
  else r.armsStore *= (1 - W.arms_rust) ** e.rustYears;
  return r.armsStore;
}

export type PowderEvent = { mills: number } | { bought: number } | { fired: number } | { dampYears: number } | { magazineCaptured: number };

/** The powder store: mills and buying in; firing, damp 5 % a year and a captured magazine out (WAR-026). */
export function powderStore(r: RealmWar, e: PowderEvent): number {
  if ("mills" in e) r.powderStore += e.mills;
  else if ("bought" in e) r.powderStore += e.bought;
  else if ("fired" in e) r.powderStore -= e.fired;
  else if ("magazineCaptured" in e) r.powderStore -= e.magazineCaptured;
  else r.powderStore *= (1 - W.powder_damp) ** e.dampYears;
  return r.powderStore;
}

/** Each prisoner eats 1 ration a month (WAR-027). */
export const prisonerRations = (prisoners: number): number => prisoners * W.rations.prisoner;

/** Victories (or defeats) over the last 20 years (WAR-028). */
export const recentCount = (years: number[], now: number): number => years.filter((y) => y > now - W.victories_window_years).length;

// ---------------------------------------------------------------- troop cap (WAR-029 … WAR-036)

export interface CapProvince {
  people: number;
  royal: boolean;
  official?: boolean;
  musterMaster?: boolean;
  occupied?: boolean;
  inRevolt?: boolean;
}

/** The share of people one province adds, by its official and the inventions (WAR-029, WAR-032). */
export function capShare(p: Pick<CapProvince, "official" | "musterMaster">, known?: Known): number {
  const c = W.troop_cap;
  let s = p.musterMaster ? c.muster_master : p.official ? c.with_official : c.without;
  if (knows(known, "W12")) s += c.w12;
  if (knows(known, "W15")) s *= c.w15;
  if (knows(known, "W18")) s += c.w18;
  return s;
}

/** What one province adds to the cap; occupied or revolting provinces add nothing (WAR-029, WAR-031). */
export function provinceCap(p: CapProvince, known?: Known): number {
  if (!p.royal || p.occupied || p.inRevolt) return 0;
  return p.people * capShare(p, known);
}

/** The troop cap: royal provinces' shares plus the garrison room of the castles (WAR-029). */
export function troopCap(provinces: CapProvince[], castleRooms: number[], known?: Known): number {
  return provinces.reduce((s, p) => s + provinceCap(p, known), 0) + castleRooms.reduce((s, r) => s + r, 0);
}

/** A lord's own cap by the same rule on his lands (WAR-033). */
export function lordCap(lands: { people: number; official?: boolean }[], known?: Known): number {
  return lands.reduce((s, p) => s + p.people * capShare(p, known), 0);
}

/** How a kind counts toward the cap (WAR-030). */
export function countsTowardCap(kind: Company["kind"]): "counts" | "does not count" | "counts only above its castle's room" {
  const c = kindDef(kind).counts_toward_cap;
  return c === "yes" ? "counts" : c === "no" ? "does not count" : "counts only above its castle's room";
}

export interface CapArmy {
  owner: string;
  companies: Company[];
}

/** Men counting toward a realm's cap: its own armies' levies, hired and standing, garrisons above room; allies count on their own (WAR-030, WAR-034). */
export function capUse(country: string, armies: CapArmy[], garrisons: { owner: string; men: number; room: number }[] = []): number {
  let n = 0;
  for (const a of armies) {
    if (a.owner !== country) continue;
    for (const c of a.companies) if (kindDef(c.kind).counts_toward_cap === "yes") n += c.men;
  }
  for (const g of garrisons) if (g.owner === country) n += garrisonOverRoom(g.men, g.room);
  return n;
}

/** Over the cap: no raising or hiring, double pay for those over, levies desert 5 % a month (WAR-035). */
export function overCap(used: number, cap: number): { canRaise: boolean; doublePayFor: number; levyDesertion: number } {
  const over = Math.max(0, used - cap);
  return { canRaise: over === 0, doublePayFor: over, levyDesertion: over > 0 ? W.over_cap.desertion : 0 };
}

/** One army has no size cap: food is its limit (WAR-036). */
export const armySizeAllowed = (_men: number): boolean => true;
