import type { World } from "./world.ts";
import { strength, type News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";

/**
 * Neighbours answer conquest (X-21): the diplomacy library's leagues, the
 * wrong Grabbed land near us and notoriety, run in the game (DIPL-221 to
 * DIPL-223). Lands taken count only the last 20 years; once a year the
 * countries near a conqueror count joining a league against it; land taken
 * by a peace or a demand is remembered by everyone near it; and notoriety is
 * shown on the player's own card (DIPL-225).
 */

const rel = dip.relations;

/** Whether realm `c` (a library id) still holds the province `province` (a library id) on the map. */
function holdsFn(world: World): (c: string, province: string) => boolean {
  return (c, province) => {
    const p = world.provinceIndex.get(province);
    const n = world.nationIndex.get(c);
    return p !== undefined && n !== undefined && world.provinceOwner[p] === n;
  };
}

/** A realm still on the map, by library id; undefined when gone. */
function live(world: World, id: string): number | undefined {
  const n = world.nationIndex.get(id);
  return n === undefined || world.nationGone[n] ? undefined : n;
}

/**
 * Whether an AI realm joins a league against x (DIPL-158, DIPL-223): the
 * league count, which weighs its standing toward x, the land x took from it,
 * x's Lands taken, x's strength against its own by its posture, the members
 * already in, faith, and +1 per 5 of x's notoriety. The player is never
 * joined by the AI; it joins no league in the game yet.
 */
export function joinsLeague(world: World, c: string, x: string, members: number): boolean {
  const n = live(world, c);
  if (n === undefined || n === world.player || live(world, x) === undefined) return false;
  return dip.aiLeagueCount(world.diplomacy, c, x, members).yes;
}

/**
 * Each month Lands taken are counted again over the last 20 years and the
 * land still held (DIPL-221, REALM-168); on the 1st of January the yearly
 * league check runs (DIPL-157 to DIPL-159) and leagues whose conqueror has
 * fallen below half the threshold dissolve (DIPL-163). Runs after the
 * month's statecraft, which has synced every realm's soldiers.
 */
export function monthlyConquest(world: World, news: News[]): void {
  const d = world.diplomacy;
  dip.refreshLandsTaken(d, holdsFn(world));
  if (world.date.month !== 1) return;
  // Leagues of realms that are gone, and members that are gone, go with them.
  for (const l of [...d.leagues]) {
    if (live(world, l.target) === undefined) dip.dissolveLeague(d, l.target);
    else l.members = l.members.filter((m) => live(world, m) !== undefined);
  }
  const before = new Map(d.leagues.map((l) => [l.target, new Set(l.members)]));
  dip.checkLeagueDissolution(d);
  for (const [target] of before) {
    if (dip.leagueAgainst(d, target)) continue;
    const x = live(world, target);
    if (x !== undefined && (x === world.player || before.get(target)!.has(world.nationIds[world.player] ?? ""))) news.push({ kind: "envoy", text: `The league against ${world.rules.nations[x]!.name} breaks up.`, nations: [x] });
  }
  dip.yearlyLeagueCheck(d, (c, x, members) => joinsLeague(world, c, x, members));
  for (const l of d.leagues) {
    const had = before.get(l.target);
    const joined = l.members.filter((m) => !had?.has(m));
    if (!joined.length) continue;
    const x = world.nationIndex.get(l.target)!;
    const names = joined.map((m) => world.rules.nations[world.nationIndex.get(m)!]!.name).join(", ");
    const nations = [x, ...joined.map((m) => world.nationIndex.get(m)!)];
    news.push({ kind: "envoy", text: had ? `${names} join${joined.length === 1 ? "s" : ""} the league against ${world.rules.nations[x]!.name}.` : `A league forms against ${world.rules.nations[x]!.name}: ${names}.`, nations });
  }
}

/**
 * Land changed hands by a peace or a demand (DIPL-222): every realm that
 * borders the taker or a ceded province, other than the taker's allies and
 * subjects and the realms that lost it, holds Grabbed land near us toward the
 * taker, −5 a province. A peace that hands a member of a league land of the
 * league's target dissolves that league (DIPL-163). Called after the
 * provinces have their new owners.
 */
export function grabbedLand(world: World, ceded: readonly number[], losers: ReadonlySet<number>, peace: boolean): void {
  const d = world.diplomacy;
  const byTaker = new Map<number, number[]>();
  for (const p of ceded) {
    const t = world.provinceOwner[p]!;
    if (t >= 0 && !losers.has(t)) byTaker.set(t, [...(byTaker.get(t) ?? []), p]);
  }
  for (const [t, provinces] of byTaker) {
    const tid = world.nationIds[t]!;
    const near = new Set<number>();
    for (const id of dip.neighbours(d, tid)) {
      const n = live(world, id);
      if (n !== undefined) near.add(n);
    }
    for (const p of provinces) {
      for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
        const o = world.provinceOwner[world.adjList[k]!]!;
        if (o >= 0 && !world.nationGone[o]) near.add(o);
      }
    }
    const allies = new Set(rel.alliesOf(d.graph, tid));
    for (const n of near) {
      const id = world.nationIds[n]!;
      if (n === t || losers.has(n) || allies.has(id) || rel.overlord(d.graph, id) === tid) continue;
      dip.grabbedLandNearUs(d, id, tid, provinces.length);
    }
    if (peace) for (const l of losers) dip.peaceReturnsProvinces(d, world.nationIds[l]!, tid);
  }
}

/** Notoriety as the player reads it (DIPL-225). */
export type NotorietyWord = "Trusted" | "Watched" | "Feared" | "Hated";
export const notorietyWord = (n: number): NotorietyWord => (n >= 75 ? "Hated" : n >= 50 ? "Feared" : n >= 25 ? "Watched" : "Trusted");

/** A league against a realm: its members with their soldiers (DIPL-162). */
export interface LeagueView {
  target: number;
  members: { nation: number; soldiers: number }[];
}

/** The player's own name abroad (DIPL-225, DIPL-226): notoriety, Lands taken against the league threshold, and the leagues against them. */
export interface NameAbroadView {
  notoriety: number;
  word: NotorietyWord;
  /** Provinces taken in the last 20 years and still held. */
  landsTaken: number;
  /** Lands taken at which a league may form in this era. */
  threshold: number;
  leagues: LeagueView[];
  /** The neighbours Wary or Threatened of the player this month, most afraid first (DIPL-233). */
  fearful: { nation: number; level: "wary" | "threatened"; ratio: number }[];
  /** Strength over a realm's side at which it is Wary, and Threatened (DIPL-228). */
  fearRatios: { wary: number; threatened: number };
}

export function leagueView(world: World, target: number): LeagueView | null {
  const l = dip.leagueAgainst(world.diplomacy, world.nationIds[target]!);
  if (!l) return null;
  const members = l.members.flatMap((m) => {
    const n = live(world, m);
    return n === undefined ? [] : [{ nation: n, soldiers: Math.round(strength(world, n)) }];
  });
  return { target, members };
}

export function nameAbroadView(world: World, player: number): NameAbroadView {
  const d = world.diplomacy;
  const id = world.nationIds[player]!;
  const notoriety = dip.notoriety(d, id);
  const league = leagueView(world, player);
  const fearful: NameAbroadView["fearful"] = [];
  for (let n = 0; n < world.nationCount; n++) {
    const f = !world.nationGone[n] && n !== player ? dip.country(d, world.nationIds[n]!).fears?.find((x) => x.of === id) : undefined;
    if (f) fearful.push({ nation: n, level: f.level, ratio: f.ratio });
  }
  fearful.sort((a, b) => b.ratio - a.ratio || a.nation - b.nation);
  return { notoriety, word: notorietyWord(notoriety), landsTaken: dip.landsTakenWithin(d, id, holdsFn(world)), threshold: dip.leagueThreshold(d), leagues: league ? [league] : [], fearful, fearRatios: { wary: dip.AF.fear.wary_ratio, threatened: dip.AF.fear.threatened_ratio } };
}
