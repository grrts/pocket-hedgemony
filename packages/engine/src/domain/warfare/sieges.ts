import { W, knows, type Known } from "./model.ts";

/**
 * Sieges (spec §5.17): castles' war numbers, closing, the monthly siege,
 * breaches, storming, terms, sacks and bribes.
 */

export type CastleType = keyof typeof W.castles;
export interface CastleDef {
  invention: string;
  walls: number;
  shot_per_breach: number;
  mining_months: number;
  room: number;
  scaling?: boolean;
  bombards_nearly_useless?: boolean;
}
export const castleDef = (t: string): CastleDef => {
  const d = (W.castles as Record<string, CastleDef>)[t];
  if (!d) throw new Error(`unknown castle ${t}`);
  return d;
};

/** A castle's walls bonus, +25 % on hills and +50 % on mountains (WAR-159). */
export const wallsBonus = (t: string, ground = "farmland"): number => castleDef(t).walls + ((W.castle_ground as Record<string, number>)[ground] ?? 0);

/** The walls bonus less a third per breach (WAR-169, INV-WAR-15). */
export const wallsWithBreaches = (t: string, ground: string, breaches: number): number => wallsBonus(t, ground) * Math.max(0, 1 - breaches / 3);

export interface Siege {
  castle: string;
  ground: string;
  garrison: number;
  /** Rations in the castle store. */
  store: number;
  townsfolk: number;
  townsfolkOut: boolean;
  breaches: number;
  shot: number;
  miningMonths: number;
  months: number;
  besiegers: number;
  bombards: number;
  fieldGuns: number;
  besiegerKnown?: Known;
  siegeMaster?: boolean;
  logistics?: number;
  /** Attaque en règle: breaches ×1.5. */
  styleBreaches?: number;
  warden?: boolean;
  spareMen?: number;
  sallied?: boolean;
  starving?: boolean;
  shore?: boolean;
  blockaded?: boolean;
  fallen?: boolean;
}

export function newSiege(castle: string, init: Partial<Siege> = {}): Siege {
  castleDef(castle);
  return { castle, ground: "farmland", garrison: 0, store: 0, townsfolk: 0, townsfolkOut: false, breaches: 0, shot: 0, miningMonths: 0, months: 0, besiegers: 0, bombards: 0, fieldGuns: 0, ...init };
}

/** Besieging a castle with no garrison takes it at once (WAR-160, INV-WAR-14). */
export function besiege(s: Siege): "falls at once" | "siege started" {
  if (s.garrison <= 0) {
    s.fallen = true;
    return "falls at once";
  }
  return "siege started";
}

/** Closed: at least 3 besiegers per garrison man; no food or men reach it (WAR-161). */
export const isClosed = (s: Pick<Siege, "besiegers" | "garrison">): boolean => s.besiegers >= s.garrison * W.siege.close_ratio;

/** How an open castle can be fed: by road, and by sea from a shore tile not blockaded (WAR-161). */
export function fedBy(s: Pick<Siege, "besiegers" | "garrison" | "shore" | "blockaded">): ("road" | "sea")[] {
  if (isClosed(s)) return [];
  return s.shore && !s.blockaded ? ["road", "sea"] : ["road"];
}

/** Shot added a month: bombards 2, field guns 1, ×1.5 with B7 (WAR-164). */
export function shotPerMonth(s: Pick<Siege, "bombards" | "fieldGuns" | "besiegerKnown">): number {
  const raw = s.bombards * 2 + s.fieldGuns * 1;
  return raw * (knows(s.besiegerKnown, "B7") ? W.siege.b7_multiplier : 1);
}

/** How fast breaches come: Siege master 25 % faster, Logistics digs 10 % faster per point, Attaque en règle ×1.5 (WAR-164). */
export function breachSpeed(s: Pick<Siege, "siegeMaster" | "logistics" | "styleBreaches" | "bombards" | "fieldGuns">, mining: boolean): number {
  let v = s.siegeMaster ? W.traits["Siege master"].breach_speed : 1;
  if (mining) v *= 1 + W.logistics.dig_speed * (s.logistics ?? 0);
  return v * (s.styleBreaches ?? 1);
}

export interface SiegeMonth {
  eaten: number;
  newBreaches: number;
  repaired: number;
  hungerLoss: number;
  sicknessMultiplier: number;
}

/**
 * One month of siege (WAR-162 … WAR-168, WAR-198): the garrison and
 * townsfolk eat, shot or mining opens breaches, a warden or 200 spare men
 * repair one, an empty store starves the garrison, camp fever after 3 months.
 */
export function siegeMonth(s: Siege): SiegeMonth {
  const S = W.siege;
  s.months += 1;
  s.sallied = false;
  const eaters = s.garrison + (s.townsfolkOut ? 0 : s.townsfolk);
  const eaten = Math.min(s.store, eaters * S.ration);
  const short = eaters * S.ration > s.store;
  s.store -= eaten;
  let hungerLoss = 0;
  if (short) {
    hungerLoss = s.garrison * S.hunger_loss;
    s.garrison -= hungerLoss;
    s.starving = true;
  }
  const def = castleDef(s.castle);
  const before = s.breaches;
  const guns = s.bombards + s.fieldGuns > 0;
  if (guns) {
    s.shot += shotPerMonth(s) * breachSpeed(s, false);
    while (s.shot >= def.shot_per_breach) {
      s.breaches += 1;
      s.shot -= def.shot_per_breach;
    }
  } else {
    s.miningMonths += breachSpeed(s, true) * (knows(s.besiegerKnown, "B7") ? S.b7_multiplier : 1);
    while (s.miningMonths >= def.mining_months) {
      s.breaches += 1;
      s.miningMonths -= def.mining_months;
    }
  }
  const newBreaches = s.breaches - before;
  let repaired = 0;
  if (newBreaches === 0 && s.breaches > 0 && (s.warden || (s.spareMen ?? 0) >= S.repair_men)) {
    s.breaches -= 1;
    repaired = 1;
  }
  return { eaten, newBreaches, repaired, hungerLoss, sicknessMultiplier: s.months > S.fever_after_months ? S.fever_mul : 1 };
}

/** Driving out the townsfolk: they stop eating; next door gains refugees and Burned homes (WAR-162). */
export function driveOutTownsfolk(s: Siege): { refugees: number; nextDoor: string[] } {
  s.townsfolkOut = true;
  return { refugees: s.townsfolk, nextDoor: ["refugees", "Burned homes"] };
}

/** A sally: a third of the garrison, once a month, a one-bell battle against the siege camp (WAR-166). */
export function sally(s: Siege): { men: number; bells: number } | null {
  if (s.sallied) return null;
  s.sallied = true;
  return { men: s.garrison * W.siege.sally_share, bells: 1 };
}

/** Storming: with a breach, or scaling an earthwork ring fort at double losses; one sector of 500 room per breach (WAR-169). */
export function stormable(s: Pick<Siege, "castle" | "breaches">): { can: boolean; scaling: boolean; room: number } {
  const def = castleDef(s.castle);
  if (s.breaches > 0) return { can: true, scaling: false, room: W.storm.room_per_breach * s.breaches };
  return { can: def.scaling === true, scaling: def.scaling === true, room: 0 };
}

/** The storm's terms: up to 6 bells; the garrison's walls bonus less a third a breach; stormers' losses ×1.5 (×2 scaling; halved by Attaque en règle) (WAR-169). */
export function storm(s: Pick<Siege, "castle" | "ground" | "breaches">, opts: { stormLosses?: number } = {}): { bells: number; walls: number; stormerLosses: number } {
  const st = stormable(s);
  const losses = (st.scaling ? W.storm.scaling : W.storm.losses) * (opts.stormLosses ?? 1);
  return { bells: W.storm.bells, walls: wallsWithBreaches(s.castle, s.ground, s.breaches), stormerLosses: losses };
}

export type SiegeEnd = "honours of war" | "surrender" | "storm" | "relief" | "lifting";

/** How a siege ends (WAR-170). */
export function endSiege(s: Siege, how: SiegeEnd): { castleTaken: boolean; garrison: "marches out with arms" | "prisoners" | "killed or taken" | "joins as reserve" | "stays"; choices?: string[]; reliefBonus?: number } {
  switch (how) {
    case "honours of war":
      s.fallen = true;
      return { castleTaken: true, garrison: "marches out with arms" };
    case "surrender":
      s.fallen = true;
      return { castleTaken: true, garrison: "prisoners" };
    case "storm":
      s.fallen = true;
      return { castleTaken: true, garrison: "killed or taken", choices: ["Spare", "Plunder", "Raze"] };
    case "relief":
      return { castleTaken: false, garrison: "joins as reserve", reliefBonus: W.relief_bonus };
    case "lifting":
      return { castleTaken: false, garrison: "stays" };
  }
}

/** After a storm: Spare, Plunder (a year's tax, 1 in 3 town buildings, 10 % townsfolk, Burned homes; Cruel +50 %), or Raze (WAR-171). */
export function sack(choice: "Spare" | "Plunder" | "Raze", p: { yearTax: number; townBuildings: number; townsfolk: number; cruel?: boolean }): { gold: number; buildingsBurned: number; townsfolkLost: number; burnedHomes: boolean; castleDestroyed: boolean } {
  const none = { gold: 0, buildingsBurned: 0, townsfolkLost: 0, burnedHomes: false, castleDestroyed: false };
  if (choice === "Spare") return none;
  if (choice === "Raze") return { ...none, castleDestroyed: true };
  const S = W.sack;
  return { gold: p.yearTax * S.plunder_tax_years * (p.cruel ? S.cruel : 1), buildingsBurned: p.townBuildings * S.town_buildings, townsfolkLost: p.townsfolk * S.townsfolk, burnedHomes: true, castleDestroyed: false };
}

/** An AI garrison accepts honours with a breach or under a month of food and no relief within 10 days; never from a Cruel commander (WAR-172). */
export function aiAcceptsHonours(o: { breaches: number; foodMonths: number; reliefDays: number | null; cruel: boolean }): boolean {
  if (o.cruel) return false;
  const relief = o.reliefDays !== null && o.reliefDays <= W.ai_honours.relief_days;
  return (o.breaches > 0 || o.foodMonths < W.ai_honours.food_months) && !relief;
}

/** A bribe can work only with pay owed 2 months, a wavering or disloyal lord, or a captain of another tongue (WAR-173). */
export function bribeCanWork(o: { payOwed?: number; lordLoyalty?: string; captainTongue?: string; rulerTongue?: string }): boolean {
  if ((o.payOwed ?? 0) >= W.bribe.pay_owed_months) return true;
  if (o.lordLoyalty === "Wavering" || o.lordLoyalty === "Disloyal") return true;
  return o.captainTongue !== undefined && o.rulerTongue !== undefined && o.captainTongue !== o.rulerTongue;
}

/** Greedy commanders and bribes: one inside takes it; one outside pockets a tenth (WAR-173). */
export function bribeGreed(gold: number, o: { greedyInside?: boolean; greedyOutside?: boolean }): { taken: boolean; pocketed: number } {
  return { taken: o.greedyInside === true, pocketed: o.greedyOutside ? gold * W.bribe.greedy_outside_share : 0 };
}

/** Months of food in a castle store for its garrison. */
export const foodMonths = (s: Pick<Siege, "store" | "garrison" | "townsfolk" | "townsfolkOut">): number => {
  const eaters = s.garrison + (s.townsfolkOut ? 0 : s.townsfolk);
  return eaters > 0 ? s.store / (eaters * W.siege.ration) : Infinity;
};

/** Breaking terms once accepted is an oath broken (WAR-170). */
export const breakTerms = (realm: { oathsBroken: number }): void => void (realm.oathsBroken += 1);

/** Taking a castle hands over its store and makes it the food hub of the province (WAR-174, WAR-082). */
export function takeCastle(s: Siege, province: string): { store: number; foodHubOf: string } {
  const store = s.store;
  s.store = 0;
  s.fallen = true;
  return { store, foodHubOf: province };
}

/** Where the honoured garrison marches: the nearest friendly castle (WAR-170). */
export const honoursMarchTo = (friendlyCastles: { province: string; days: number }[]): string | null =>
  friendlyCastles.length ? [...friendlyCastles].sort((a, b) => a.days - b.days)[0]!.province : null;
