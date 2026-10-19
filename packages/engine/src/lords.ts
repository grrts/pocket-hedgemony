import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { houseMemberName, personName } from "./names.ts";
import { loyaltyCause, realmConfig, startingLords, type Lord, type Loyalty } from "./domain/realm/index.ts";
import { startLords, type HistoricalLordDef } from "@ph/rules";

/**
 * Lords (milestone 3): each realm starts with lords who hold some of its
 * provinces (realm REALM-166: the great houses where the data names them,
 * else one lord per 4 provinces). A lord's province gives the crown half its
 * tax while he is loyal or wavering, and nothing once he is disloyal; its
 * recruits are his retinue (retinues.ts). Loyalty moves a step at a time with the realm context's causes:
 * gifts, fiefs and quiet years raise it; lost wars and seized land lower it.
 */

export const LOYALTY: readonly Loyalty[] = realmConfig.loyalty.steps as Loyalty[];

export interface RealmLord {
  name: string;
  /** His house, or the province he was first named for. */
  house: string;
  nation: number;
  loyalty: Loyalty;
  /** Up-causes counted toward the next step, for a great lord (REALM-162). */
  upCredit: number;
  /** His two traits (REALM-070); unset, they are drawn from his name (lordTraits). */
  traits?: string[];
  /** His Want, a province id (REALM-070); unset, it is worked out from his lands' borders (lordWant). */
  want?: string;
  /** Himself as a commander (index into the commanders), once he has first led his retinue out (WAR-254). */
  commander?: number;
  /** His retinue on its way to his seat after a call: men and days until it stands there (WAR-253). */
  call?: { men: number; daysLeft: number };
  /** His wealth as a share of what he had, in percent; unset is 100 (a summoned house's falls, INST-063). */
  wealth?: number;
  /** His age (REALM-273); unset, people.ts draws it from his index the first time it is needed. */
  age?: number;
  /** The son who takes his lands when he dies, null for none (REALM-070, REALM-079). */
  heir?: { name: string; age: number } | null;
  /** His line died out: his lands went back to the crown (REALM-082). */
  gone?: boolean;
  /** What his lands make him: "Earl of Northumberland" (REALM-281); passes to whoever holds them after him. */
  title?: string;
  /** A real person of history: his id in the start's historical lords, and one line on who he was (REALM-280). His heir is not. */
  historical?: string;
  note?: string;
}

export interface LordState {
  lords: RealmLord[];
  /** Lord holding each province (index into lords), -1 = royal land. */
  provinceLord: Int16Array;
}

export function createLordState(P: number): LordState {
  return { lords: [], provinceLord: new Int16Array(P).fill(-1) };
}

const capitalize = (s: string) => s.replace(/(^|[\s-])\S/g, (c) => c.toUpperCase());

/** Provinces of a realm by distance from its capital over its own land, nearest first. */
export function byDistance(world: World, n: number, capital: number): number[] {
  const seen = new Set([capital]);
  const order = [capital];
  for (let i = 0; i < order.length; i++) {
    const p = order[i]!;
    for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
      const q = world.adjList[k]!;
      if (!seen.has(q) && world.provinceOwner[q] === n) (seen.add(q), order.push(q));
    }
  }
  // Islands and enclaves the walk can't reach come last.
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !seen.has(p)) order.push(p);
  return order;
}

/**
 * Gives every realm its starting lords: the royal land is the half of its
 * provinces nearest the capital (the realm data's moderate royal share), and
 * each lord grows his lands from a seat among the rest.
 */
export function seedLords(world: World): void {
  const royalShare = realmConfig.starting.royal_share[2]!;
  const great = realmConfig.starting_lords.great_houses as Record<string, string[]>;
  const seated = realmConfig.starting_lords.house_lands as unknown as Record<string, Record<string, { name: string; provinces: string[] }>>;
  for (let n = 0; n < world.nationCount; n++) {
    const def = world.rules.nations[n]!;
    const capital = world.provinceIndex.get(def.capital);
    if (capital === undefined) continue;
    const history = startLords.realms[def.id] ?? [];
    if (seated[def.id]) {
      seatHouses(world, n, seated[def.id]!);
      // The head of a seated house in history is that house's lord (REALM-282); the others are seated on their own land.
      seatHistorical(world, n, capital, history.filter((h) => !world.lords.some((l) => l.nation === n && l.house === h.house && (asHistorical(world, l, h), true))));
      continue;
    }
    const historical = seatHistorical(world, n, capital, history);
    const land = byDistance(world, n, capital);
    // The historical lords stand for the realm's great houses: the catalogue's list is for a later start (REALM-282).
    const start = startingLords(land.length, history.length ? [] : (great[def.id] ?? []));
    const count = Math.max(0, (start.names.length || start.generated) - historical);
    if (count === 0) continue;
    const royal = Math.max(1, Math.ceil(land.length * royalShare));
    const rest = land.slice(royal).filter((p) => world.provinceLord[p]! < 0);
    if (rest.length === 0) continue;
    const seats = Array.from({ length: Math.min(count, rest.length) }, (_, k) => rest[Math.floor((k * rest.length) / Math.min(count, rest.length))]!);
    const first = world.lords.length;
    seats.forEach((seat, k) => {
      const place = world.rules.provinces[seat]!.name;
      const house = start.names[k] ? capitalize(start.names[k]!) : place;
      world.lords.push({ name: personName(world.rules, n, seat * 7 + k, house), house, nation: n, loyalty: "Loyal", upCredit: 0 });
      world.provinceLord[seat] = first + k;
    });
    // Each lord's lands grow outward from his seat over the land no one else holds.
    const left = new Set(rest.filter((p) => world.provinceLord[p]! < 0));
    let frontier = [...seats];
    while (left.size && frontier.length) {
      const next: number[] = [];
      for (const p of frontier) {
        for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
          const q = world.adjList[k]!;
          if (!left.has(q)) continue;
          left.delete(q);
          world.provinceLord[q] = world.provinceLord[p]!;
          next.push(q);
        }
      }
      frontier = next;
    }
    // What no lord reached by land goes to the nearest seat's lord in the list.
    for (const p of left) world.provinceLord[p] = first;
  }
}

/**
 * Seats a realm's historical lords on the land history gave them, where the
 * realm holds it at the start: never its capital, never land another lord
 * already holds (REALM-280). Returns how many were seated.
 */
function seatHistorical(world: World, n: number, capital: number, history: readonly HistoricalLordDef[]): number {
  let seated = 0;
  for (const h of history) {
    const land = h.provinces.map((id) => world.provinceIndex.get(id)).filter((p): p is number => p !== undefined && p !== capital && world.provinceOwner[p] === n && world.provinceLord[p]! < 0);
    if (!land.length) continue;
    const k = world.lords.length;
    const l: RealmLord = { name: h.name, house: h.house, nation: n, loyalty: "Loyal", upCredit: 0 };
    asHistorical(world, l, h);
    world.lords.push(l);
    for (const p of land) world.provinceLord[p] = k;
    seated++;
  }
  return seated;
}

/** Makes a lord the historical person: his name, house, title, traits, age and heir by the start year (where the sources give his birth; else the game draws them), and the line on who he was. */
export function asHistorical(world: World, l: RealmLord, h: HistoricalLordDef): void {
  const year = world.date.year;
  l.name = h.name;
  l.house = h.house;
  l.title = h.title;
  l.traits = [...h.traits];
  if (h.born !== null) {
    l.age = Math.max(16, year - h.born);
    l.heir = h.heir && year >= h.heir.born ? { name: h.heir.name, age: year - h.heir.born } : null;
  }
  l.historical = h.id;
  l.note = h.note;
}

/** Someone new holds a lord's lands (an heir, a kinsman, a confirmed son): the title stays with the lands, the history was the man's. */
export function newHolder(l: RealmLord): void {
  delete l.historical;
  delete l.note;
}

/** Great houses the realm data seats on named land (D-INST-1): each holds its listed provinces that the realm owns; the rest is royal. */
function seatHouses(world: World, n: number, houses: Record<string, { name: string; provinces: string[] }>): void {
  for (const h of Object.values(houses)) {
    const land = h.provinces.map((id) => world.provinceIndex.get(id)).filter((p): p is number => p !== undefined && world.provinceOwner[p] === n);
    if (!land.length) continue;
    const k = world.lords.length;
    world.lords.push({ name: houseMemberName(world.rules, n, land[0]! * 7, h.name), house: h.name, nation: n, loyalty: "Loyal", upCredit: 0 });
    for (const p of land) world.provinceLord[p] = k;
  }
}

/** Provinces a lord holds. */
export function lordLands(world: World, lord: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceLord[p] === lord) out.push(p);
  return out;
}

/** Share of a province's tax that reaches the crown: all of royal land, half of a lord's, none of a disloyal lord's. */
export function crownShare(world: World, p: number): number {
  const l = world.provinceLord[p]!;
  if (l < 0) return 1;
  const loyalty = world.lords[l]!.loyalty;
  return loyalty === "Loyal" || loyalty === "Wavering" ? 1 - realmConfig.lords.tax_share : 0;
}

/** The lord a commander is, or -1: a lord leads only his own retinue (RECR-111, WAR-255). */
export function lordOfCommander(world: World, c: number): number {
  // Only a lord's own command has his origin: the common case answers without a search.
  if (c < 0 || world.commanders[c]?.origin !== "a lord") return -1;
  return world.lords.findIndex((l) => l.commander === c);
}

/** Men coming home to a lord's lands fill their recruit pools, by each one's gap (WAR-256). */
export function lordSendHome(world: World, lord: number, men: number): void {
  if (men <= 0 || lord < 0) return;
  const lands = lordLands(world, lord);
  const gap = lands.reduce((t, p) => t + Math.max(0, world.provinceRecruitCeiling[p]! - world.provinceRecruits[p]!), 0);
  if (gap <= 0) return;
  const share = Math.min(1, men / gap);
  for (const p of lands) world.provinceRecruits[p] = world.provinceRecruits[p]! + Math.max(0, world.provinceRecruitCeiling[p]! - world.provinceRecruits[p]!) * share;
}

/**
 * Moves a lord one step by a realm-context cause (REALM-088, REALM-089, great
 * lords REALM-162). A caller stepping many lords passes each one's number of
 * provinces, counted in one pass, instead of a search of the map per lord.
 */
export function loyaltyStep(world: World, lord: number, cause: string, news: News[] = [], lands?: number): void {
  const l = world.lords[lord]!;
  const before = l.loyalty;
  // A great lord is known by how many provinces he holds (greatLordReasons).
  const provinces = lands === undefined ? lordLands(world, lord).map(String) : Array.from({ length: lands }, (_, i) => String(i));
  const view: Lord = { name: l.name, house: l.house, provinces, retinue: 0, wealth: 0, traits: [], loyalty: l.loyalty, upCredit: l.upCredit, sons: [] };
  l.loyalty = loyaltyCause(view, cause);
  l.upCredit = view.upCredit ?? 0;
  if (l.nation === world.player && l.loyalty !== before && LOYALTY.indexOf(l.loyalty) > LOYALTY.indexOf(before)) {
    news.push({ kind: "unrest", text: `${l.name} is now ${l.loyalty.toLowerCase()}`, nations: [l.nation] });
  }
}

/** A realm is fighting a war on either side. */
export function inAnyWar(world: World, n: number): boolean {
  const id = world.nationIds[n]!;
  return world.diplomacy.wars.some((w) => w.attackers.includes(id) || w.defenders.includes(id));
}

/** A realm lost a war: its lords think less of the crown. */
export function lordsLoseWar(world: World, n: number, news: News[]): void {
  world.lords.forEach((l, k) => l.nation === n && !l.gone && loyaltyStep(world, k, "war_lost", news));
}

/** Gold a gift to a lord costs. */
export function giftGold(world: World): number {
  return world.rules.defines.living.lordGiftGold;
}

export function giveGift(world: World, n: number, lord: number): string | null {
  const l = world.lords[lord];
  if (!l || l.nation !== n) return "not your lord";
  const gold = giftGold(world);
  if (world.nationTreasury[n]! < gold) return "not enough gold";
  if (l.loyalty === "Loyal") return "he is loyal already";
  world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  loyaltyStep(world, lord, "gift_of_gold");
  return null;
}

/** Grants a royal province to a lord as a fief: the want granted raises his loyalty. */
export function grantFief(world: World, n: number, province: number, lord: number): string | null {
  const l = world.lords[lord];
  if (l?.gone) return "his line has died out";
  if (!l || l.nation !== n) return "not your lord";
  if (world.provinceOwner[province] !== n) return "not your province";
  if (world.provinceLord[province]! >= 0) return "a lord holds it already";
  if (world.rules.nations[n]!.capital === world.provinceIds[province]) return "the capital stays royal";
  world.provinceLord[province] = lord;
  loyaltyStep(world, lord, "want_granted");
  return null;
}

/** Takes a province back from its lord: he loses a step, and every other lord of the realm notices. */
export function seizeFief(world: World, n: number, province: number, news: News[]): string | null {
  const lord = world.provinceLord[province]!;
  if (world.provinceOwner[province] !== n || lord < 0) return "no lord of yours holds it";
  world.provinceLord[province] = -1;
  loyaltyStep(world, lord, "land_seized_from_him", news);
  world.lords.forEach((l, k) => k !== lord && l.nation === n && !l.gone && loyaltyStep(world, k, "land_seized_from_another", news));
  return null;
}

/**
 * The monthly lords step: a province that changed hands leaves its lord;
 * each January the lords of a realm at peace grow loyal (a long, secure
 * reign); the AI gives gold to disloyal lords (REALM-171).
 */
export function monthlyLords(world: World, atPeace: (n: number) => boolean, news: News[]): void {
  for (let p = 0; p < world.provinceCount; p++) {
    const l = world.provinceLord[p]!;
    if (l >= 0 && world.lords[l]!.nation !== world.provinceOwner[p]) world.provinceLord[p] = -1;
  }
  if (world.date.month === 1) {
    const lands = new Int32Array(world.lords.length);
    for (let p = 0; p < world.provinceCount; p++) if (world.provinceLord[p]! >= 0) lands[world.provinceLord[p]!]! += 1;
    world.lords.forEach((l, k) => !l.gone && l.loyalty !== "Loyal" && atPeace(l.nation) && loyaltyStep(world, k, "long_secure_reign", news, lands[k]!));
  }
  world.lords.forEach((l, k) => {
    if (l.gone || l.nation === world.player || (l.loyalty !== "Disloyal" && l.loyalty !== "Wavering")) return;
    // REALM-171 gives when it has 20 domain gold; here, when the treasury holds two gifts.
    if (world.nationTreasury[l.nation]! >= giftGold(world) * 2) giveGift(world, l.nation, k);
  });
}

/**
 * The crown pays for a building in a lord's province (PROV-206): the building
 * is his, and he takes it as a gift, a step more loyal, unless he is in revolt.
 */
export function lordGetsBuilding(world: World, p: number, news: News[]): void {
  const lord = world.provinceLord[p]!;
  if (lord < 0 || world.lords[lord]!.loyalty === "In revolt") return;
  loyaltyStep(world, lord, "gift_of_gold", news);
}
