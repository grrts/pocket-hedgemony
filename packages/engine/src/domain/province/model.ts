import config from "../../../../rules/data/domain/province.json" with { type: "json" };
import type { Ground } from "@ph/rules";

/**
 * The province aggregate (domain/province/spec.md §4): tiles, people by class,
 * and the stored stats of province-stats §17. Everything else (food made,
 * wares made, tax, town size, sums) is worked out from these when needed.
 * State is plain data the caller owns; rules never roll dice except through
 * an Rng they are handed.
 */

export type ProvinceConfig = typeof config;
export const provinceConfig: ProvinceConfig = config;

export type { Ground };
export type Use = "Fields" | "Pasture" | "Woods" | "Marsh" | "Waste" | "Shore" | "Town" | "Castle";
export type TileState = "Burned" | "Fallow" | "Worn";
export type ClassName = "farmers" | "herders" | "woodsmen" | "miners" | "seafolk" | "craftsmen" | "market folk" | "clergy" | "clerks" | "scholars" | "homeless";
export const CLASSES = config.classes.all as ClassName[];
export type TaxRate = "none" | "light" | "normal" | "heavy" | "crushing";
export type TollRate = "none" | "low" | "high";
export type CastleStep = "none" | "earthwork ring fort" | "stone castle" | "bastion fort" | "star fort";
export type RoadStep = "none" | "track" | "road" | "paved road" | "turnpike" | "railway";
export type PlagueStep = "none" | "rumour" | "outbreak" | "burning out";
export type GovernedBy = "official" | "lord" | "no one" | "subject ruler" | "occupied";
export type Settlement = "none" | "trading post" | "settlement" | "colony";
export type TownSize = "hamlet" | "village" | "market town" | "town" | "city" | "great city";
export type Loyalty = "In revolt" | "Disloyal" | "Wavering" | "Loyal";

export interface Tile {
  use: Use;
  building: string | null;
  state: TileState | null;
  /** A use change under way (clearing woods, fields to pasture, castle ruin). */
  change: { to: Use; monthsLeft: number } | null;
  /** Years in a row nobody worked the tile (fields grow back to woods; worn recovers). */
  idleYears: number;
  /** Years in a row the tile was farmed with more farmers than the province's slots hold (it wears, PROV-034). */
  overworkedYears: number;
  /** Years of digging left, for a mine. */
  seams: number;
  /** A farm with a mill (F5). */
  mill: boolean;
  /** A shore tile on a river (bridges, river crossings). */
  river: boolean;
  /** Worked by the local people of an unowned or colonial province. */
  local: boolean;
}

export interface Official {
  id: string;
  type: string;
  yearsServed: number;
  /** Whose service he is in: the ruler, or a lord's name. */
  employer: string;
}

export interface Grievance {
  name: string;
  /** Months since it started. */
  months: number;
}

export interface Pretender {
  name: string;
  /** Years since he lost the province in war; null for a right by inheritance, marriage or a bought title. */
  lostYearsAgo: number | null;
  heirs: boolean;
  renounced: boolean;
  marriedIn: boolean;
}

export interface Refugees {
  from: string;
  count: number;
  months: number;
  /** The class they had, kept if a slot is free (craftsmen, scholars). */
  class: ClassName | null;
}

export interface Province {
  id: string;
  owner: string | null;
  ground: Ground;
  tiles: Tile[];
  /** Town buildings, by name, in the order they were built. */
  town: string[];
  people: Record<ClassName, number>;
  refugees: Refugees[];
  faith: Record<string, number>;
  tongue: Record<string, number>;
  recruits: number;
  recruitPool: number;
  students: number;
  /** Scholar slots in the province's school (set by research). */
  schoolSeats: number;
  taxRate: TaxRate | null;
  tolls: Record<string, TollRate>;
  charters: string[];
  /** Years since each revoked charter was revoked. */
  brokenCharters: { kind: string; years: number }[];
  grievances: Grievance[];
  rebels: { source: string } | null;
  road: RoadStep;
  river: boolean;
  canal: boolean;
  plague: PlagueStep;
  plagueSeasonsLeft: number;
  smoke: boolean;
  /** Months of food in the local store. */
  storeMonths: number;
  /** Months in a row the store has stayed above the Hungry end mark. */
  storeAboveMonths: number;
  castle: CastleStep;
  castleYearsUnkept: number;
  breaches: number;
  garrison: number;
  castleHolder: string | null;
  governedBy: GovernedBy;
  official: Official | null;
  lord: string | null;
  occupiedBy: string | null;
  occupiedMonths: number;
  yearsHeld: number;
  homeland: string[];
  pretenders: Pretender[];
  settlement: Settlement;
  settlers: number;
  /** Inventions known by the owner, by id or name. */
  known: string[];
  war: boolean;
  blockaded: boolean;
  quarantined: boolean;
  /** Months the current army has stayed. */
  armyMonths: number;
  /** Months since an army last took food from the store; null if never. */
  requisitionedMonthsAgo: number | null;
  /** Days to the capital or nearest seat. */
  daysToCapital: number;
  /** The province lies in the tropics: its fever land is a step worse (PROV-243). */
  tropical: boolean;
  /** Years since a rising of this province's faith or tongue was massacred; null if none in memory. */
  bloodshedYears: number | null;
  /** Neighbouring rebels that share one of this province's grievances. */
  neighbourRebels: string[];
  /** Loads of timber in hand. */
  timber: number;
  /** Town size as set at the start or by events; thresholds in townsfolk are not given (OQ-PROV-11). */
  townSize: TownSize | null;
  /** The official of the province's seat, if it has one (a seat needs its own, PROV-191). */
  seatOfficial: Official | null;
  /** Faith of the ruler who holds the province. */
  rulerFaith: string | null;
  /** Tongue of whoever holds it: the ruler, or the lord it is granted to. */
  holderTongue: string | null;
  /** Traits of the province's lord, plus "hostile to faith" / "hostile to tongue". */
  lordTraits: string[];
  /** Who the province's recruits go to (subject ruler, lord's retinue or owner) is worked out from governance. */
  subjectOf: string | null;
}

export function tile(use: Use, building: string | null = null): Tile {
  return { use, building, state: null, change: null, idleYears: 0, overworkedYears: 0, seams: 0, mill: false, river: false, local: false };
}

export function emptyClasses(): Record<ClassName, number> {
  return Object.fromEntries(CLASSES.map((c) => [c, 0])) as Record<ClassName, number>;
}

export function newProvince(id: string, ground: Ground, init: Partial<Province> = {}): Province {
  return {
    id,
    owner: null,
    ground,
    tiles: [],
    town: [],
    people: emptyClasses(),
    refugees: [],
    faith: {},
    tongue: {},
    recruits: 0,
    recruitPool: 0,
    students: 0,
    schoolSeats: 0,
    taxRate: null,
    tolls: {},
    charters: [],
    brokenCharters: [],
    grievances: [],
    rebels: null,
    road: "none",
    river: false,
    canal: false,
    plague: "none",
    plagueSeasonsLeft: 0,
    smoke: false,
    storeMonths: 6,
    storeAboveMonths: 0,
    castle: "none",
    castleYearsUnkept: 0,
    breaches: 0,
    garrison: 0,
    castleHolder: null,
    governedBy: "official",
    official: null,
    lord: null,
    occupiedBy: null,
    occupiedMonths: 0,
    yearsHeld: 0,
    homeland: [],
    pretenders: [],
    settlement: "none",
    settlers: 0,
    known: [],
    war: false,
    blockaded: false,
    quarantined: false,
    armyMonths: 0,
    requisitionedMonthsAgo: null,
    daysToCapital: 0,
    tropical: false,
    bloodshedYears: null,
    neighbourRebels: [],
    timber: 0,
    townSize: null,
    seatOfficial: null,
    rulerFaith: null,
    holderTongue: null,
    lordTraits: [],
    subjectOf: null,
    ...init,
  };
}

export function knows(p: Province, invention: string): boolean {
  return p.known.some((k) => k === invention || k.startsWith(`${invention} `) || k.endsWith(` ${invention}`));
}

// ---------------------------------------------------------------- slots and workers

export interface LandBuilding {
  uses: string[];
  slots: number;
  class: string | null;
  unlock: string | null;
  food_per_worker?: number;
  harvests?: number;
  harvest_roll?: boolean;
  hazards?: string[];
  grounds?: string[];
  rough_grounds?: string[];
  fields_grounds?: string[];
  needs_water?: boolean;
  needs_seam?: boolean;
  needs_timber?: boolean;
  needs_harbour?: boolean;
  tropical?: boolean;
  dry_or_warm_coast?: boolean;
  river?: boolean;
}

export interface TownBuilding {
  slots: number;
  class: string;
  needs: string[];
  min_town_size?: string;
}

export function landBuilding(name: string, cfg: ProvinceConfig = config): LandBuilding | undefined {
  return (cfg.buildings.land as Record<string, LandBuilding>)[name];
}

export function townBuilding(name: string, cfg: ProvinceConfig = config): TownBuilding | undefined {
  return (cfg.buildings.town as Record<string, TownBuilding>)[name];
}

/** One place people can work: a tile (with or without a building) or a town building. */
export interface Workplace {
  kind: "tile" | "town";
  index: number;
  building: string | null;
  class: ClassName;
  slots: number;
  workers: number;
}

/** Job slots of a tile: its building's, or the bare-tile slots of its use (PROV-068). Burned tiles have none. */
export function tileSlots(t: Tile, cfg: ProvinceConfig = config): { class: ClassName; slots: number } | null {
  if (t.state === "Burned" || t.use === "Castle" || t.use === "Town") return null;
  if (t.building) {
    const b = landBuilding(t.building, cfg);
    return b && b.class ? { class: b.class as ClassName, slots: b.slots } : null;
  }
  const bare = (cfg.bare_tile.by_use as Record<string, { class: string }>)[t.use];
  return bare ? { class: bare.class as ClassName, slots: cfg.bare_tile.slots } : null;
}

/** Every workplace with the people of its class filled in, in building order: tiles first, then the town (PROV-110, PROV-117). */
export function workplaces(p: Province, cfg: ProvinceConfig = config): Workplace[] {
  const out: Workplace[] = [];
  p.tiles.forEach((t, index) => {
    const s = tileSlots(t, cfg);
    if (s && s.slots > 0) out.push({ kind: "tile", index, building: t.building, class: s.class, slots: s.slots, workers: 0 });
  });
  p.town.forEach((name, index) => {
    const b = townBuilding(name, cfg);
    if (b && b.slots > 0 && b.class !== "scholars") out.push({ kind: "town", index, building: name, class: b.class as ClassName, slots: b.slots, workers: 0 });
  });
  const left = { ...p.people };
  for (const w of out) {
    w.workers = Math.min(w.slots, left[w.class]);
    left[w.class] -= w.workers;
  }
  return out;
}

/** Job slots per class in the province. */
export function slotsByClass(p: Province, cfg: ProvinceConfig = config): Record<ClassName, number> {
  const s = emptyClasses();
  for (const w of workplaces(p, cfg)) s[w.class] += w.slots;
  s.scholars += scholarSlots(p);
  return s;
}

/** Scholar slots: the province's schools hold the scholars working here. */
export function scholarSlots(p: Province): number {
  return p.town.includes("school") ? p.schoolSeats : 0;
}

export function totalPeople(p: Province): number {
  return CLASSES.reduce((n, c) => n + p.people[c], 0);
}

export function townsfolk(p: Province, cfg: ProvinceConfig = config): number {
  return (cfg.classes.town as ClassName[]).reduce((n, c) => n + p.people[c], 0);
}

export function countryfolk(p: Province, cfg: ProvinceConfig = config): number {
  return totalPeople(p) - townsfolk(p, cfg) - p.people.homeless;
}

export function homelessShare(p: Province): number {
  const all = totalPeople(p);
  return all > 0 ? p.people.homeless / all : 0;
}
