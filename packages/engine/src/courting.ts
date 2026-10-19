import type { World } from "./world.ts";
import { cedeProvince, type News } from "./war.ts";
import { LOYALTY, loyaltyStep } from "./lords.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { isSeasonEnd } from "./domain/subjects/index.ts";

/**
 * Courting in the game (milestone 5, DIPL-215 to DIPL-219, D-DIPL-38): an
 * envoy stationed at a foreign court works against its ruler, on one of his
 * lords or on a subject of his. He takes a seat while he stays. A courted
 * lord loses a step each season and defects with his land after a year once
 * Disloyal and next to the courting realm; a courted subject counts
 * *Courted*. Each season the envoy is found out at 1 in 4.
 */

const rel = dip.relations;
const C = dip.config.actions.court_lord;

/** One courting envoy: who sends him, the realm he works in, the lord he courts (none for a subject), since when, and the lord's loyalty at the last season's end. */
export interface Courting {
  by: string;
  target: string;
  lord?: number;
  since: number;
  last?: string;
}
type WithCourting = dip.Diplomacy & { courting?: Courting[] };

export const courtingsOf = (world: World): Courting[] => ((world.diplomacy as WithCourting).courting ??= []);
const monthNow = (world: World): number => world.date.year * 12 + world.date.month - 1;
const ACTION = (c: Courting) => (c.lord === undefined ? "court_subject" : "court_lord");

/** Whether a foreign envoy courts subject s now (the *Courted* reason, DIPL-218). */
export function isCourted(world: World, s: number): boolean {
  const id = world.nationIds[s]!;
  return courtingsOf(world).some((c) => c.lord === undefined && c.target === id);
}

/** The realms courting subject s. */
export function courtersOf(world: World, s: number): number[] {
  const id = world.nationIds[s]!;
  return courtingsOf(world).filter((c) => c.lord === undefined && c.target === id).map((c) => world.nationIndex.get(c.by)!).filter((n) => n !== undefined);
}

/** Why realm n can't court lord k, or subject s when lord is undefined, now; null when it can (DIPL-215). */
export function whyNotCourt(world: World, n: number, t: number, lord?: number): string | null {
  const d = world.diplomacy;
  const me = world.nationIds[n]!;
  const them = world.nationIds[t];
  if (!them || world.nationGone[t] || t === n) return "no such realm";
  if (lord !== undefined) {
    const l = world.lords[lord];
    if (!l || l.nation !== t) return "no such lord";
    if (l.loyalty !== "Wavering" && l.loyalty !== "Disloyal") return `he is ${l.loyalty}; only a Wavering or Disloyal lord listens`;
  } else if (!rel.overlord(d.graph, them)) return "they answer to no overlord";
  else if (rel.overlord(d.graph, them) === me) return "they are your own subject";
  if (courtingsOf(world).some((c) => c.by === me && c.target === them && c.lord === lord)) return "your envoy is there already";
  if (rel.has(d.graph, "at_war", me, them)) return "you are at war with them";
  if (rel.overlord(d.graph, me) === them || rel.overlord(d.graph, them) === me) return "a subject tie binds you";
  if (dip.freeSeats(d, me) <= 0) return "no free envoy: every seat is taken";
  return null;
}

function seat(world: World, c: Courting): void {
  const month = dip.monthOf(world.diplomacy.date);
  world.diplomacy.envoys.push({ id: `${ACTION(c)}-${c.by}-${c.target}-${c.lord ?? "s"}-${c.since}`, country: c.by, person: "", personKind: "official", type: "", years: 0, action: ACTION(c), target: c.target, status: "resident", sent: month, arrival: month, residentSince: month });
}

function end(world: World, c: Courting): void {
  const d = world.diplomacy;
  const id = `${ACTION(c)}-${c.by}-${c.target}-${c.lord ?? "s"}-${c.since}`;
  d.envoys = d.envoys.filter((e) => e.id !== id);
  (d as WithCourting).courting = courtingsOf(world).filter((x) => x !== c);
}

const seated = (world: World, c: Courting) => {
  const id = `${ACTION(c)}-${c.by}-${c.target}-${c.lord ?? "s"}-${c.since}`;
  return world.diplomacy.envoys.some((e) => e.id === id && e.status === "resident");
};

/** Realm n sends an envoy to court lord k of realm t, or subject t (CourtLord, DIPL-215). */
export function court(world: World, n: number, t: number, lord?: number): string | null {
  const why = whyNotCourt(world, n, t, lord);
  if (why) return why;
  const c: Courting = { by: world.nationIds[n]!, target: world.nationIds[t]!, since: monthNow(world), ...(lord === undefined ? {} : { lord, last: world.lords[lord]!.loyalty }) };
  courtingsOf(world).push(c);
  seat(world, c);
  return null;
}

/** Realm n calls its courting envoy home. */
export function recallCourting(world: World, n: number, t: number, lord?: number): string | null {
  const c = courtingsOf(world).find((x) => x.by === world.nationIds[n] && x.target === world.nationIds[t] && x.lord === lord);
  if (!c) return "you have no envoy courting there";
  end(world, c);
  return null;
}

/** Whether lord k's land borders realm n (a defection needs it, DIPL-129). */
function lordBorders(world: World, k: number, n: number): boolean {
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceLord[p] !== k) continue;
    for (let j = world.adjStart[p]!; j < world.adjStart[p + 1]!; j++) if (world.provinceOwner[world.adjList[j]!] === n) return true;
  }
  return false;
}

/**
 * The courting month (DIPL-216, DIPL-217): an envoy whose seat was lost or
 * whose target is gone ends; at each season's end a courted lord loses a
 * step unless he rose this season, a Disloyal lord next to the courter
 * defects after a year, and every courting envoy may be found out.
 */
export function monthlyCourting(world: World, news: News[]): void {
  const list = courtingsOf(world);
  if (!list.length) return;
  const d = world.diplomacy;
  const name = (n: number) => world.rules.nations[n]!.name;
  const season = isSeasonEnd(world.date.month);
  for (const c of [...list]) {
    const by = world.nationIndex.get(c.by);
    const t = world.nationIndex.get(c.target);
    const lord = c.lord === undefined ? undefined : world.lords[c.lord];
    if (by === undefined || t === undefined || world.nationGone[by] || world.nationGone[t] || !seated(world, c) || (lord && lord.nation !== t) || (c.lord === undefined && !rel.overlord(d.graph, c.target)) || rel.has(d.graph, "at_war", c.by, c.target)) {
      end(world, c);
      continue;
    }
    if (!season) continue;
    const victim = c.lord === undefined ? world.nationIndex.get(rel.overlord(d.graph, c.target)!) : t;
    if (dip.draw(d) < C.discovery_chance_per_season) {
      end(world, c);
      if (victim !== undefined) dip.addRuleEntry(d, world.nationIds[victim]!, c.by, "wrongs", "courted_our_lord");
      const whom = lord ? lord.name : name(t);
      if (by === world.player) news.push({ kind: "envoy", text: `${victim === undefined ? "They" : name(victim)} found out your envoy courting ${whom}: he is sent home, and they will remember it.`, nations: [by, t] });
      else if (victim === world.player) news.push({ kind: "envoy", text: `An envoy of ${name(by)} was caught courting ${c.lord === undefined ? `${whom}, your subject` : `${whom}, your lord`}, and sent home.`, nations: [victim, by] });
      continue;
    }
    if (!lord || c.lord === undefined) continue;
    // His ruler paid him more, a fief, a victory: a season's work undone (DIPL-128, D-DIPL-38).
    const rose = c.last !== undefined && LOYALTY.indexOf(lord.loyalty) < LOYALTY.indexOf(c.last as never);
    if (!rose && lord.loyalty === "Wavering") loyaltyStep(world, c.lord, "foreign_bribes", news);
    c.last = lord.loyalty;
    if (lord.loyalty !== "Disloyal" || monthNow(world) - c.since < C.defect_after_months || !lordBorders(world, c.lord, by)) continue;
    defect(world, c, by, t, news);
  }
}

/** A courted lord defects with his land (DIPL-129): it is the courter's now, held by him, Wavering; his old ruler holds *Took our land*. */
function defect(world: World, c: Courting, by: number, t: number, news: News[]): void {
  const k = c.lord!;
  const lord = world.lords[k]!;
  const land: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceLord[p] === k) land.push(p);
  end(world, c);
  const quiet: News[] = [];
  for (const p of land) cedeProvince(world, p, by, quiet);
  for (const p of land) world.provinceLord[p] = k;
  lord.nation = by;
  lord.loyalty = "Wavering";
  news.push(...quiet.filter((x) => x.kind !== "envoy"));
  if (by === world.player || t === world.player) news.push({ kind: "envoy", text: `${lord.name} leaves ${world.rules.nations[t]!.name} and comes over to ${world.rules.nations[by]!.name} with his ${land.length} province${land.length === 1 ? "" : "s"}.`, nations: [by, t], ...(land.length ? { province: land[0]! } : {}) });
}

/**
 * AI realms court once a season (DIPL-219): one with a free seat and a Rival
 * or Hostile stance toward a neighbour courts a Wavering or Disloyal lord of
 * that neighbour whose land borders it, else a Wavering or Disloyal subject of
 * it that borders it. One courting envoy at a time for each realm.
 */
export function aiCourting(world: World, loyaltyOf: (s: number) => string | null): void {
  if (!isSeasonEnd(world.date.month)) return;
  const d = world.diplomacy;
  const busy = new Set(courtingsOf(world).map((c) => c.by));
  const pairs: { source: string; target: string }[] = [];
  for (const r of d.graph.relations) {
    if (r.type !== "rival" && r.type !== "hostile") continue;
    pairs.push(r);
    if (r.direction === "mutual") pairs.push({ source: r.target, target: r.source });
  }
  // A rival overlord with more Disloyal subjects is courted first, as it is the one to break (SUBJ-100, SUBJ-139).
  // Each overlord's subjects, a Wavering one first: a Disloyal one is already lost to its overlord.
  const disloyal = new Map<string, number>();
  const subjectsOf = new Map<string, { id: string; si: number; loyalty: string | null }[]>();
  for (const s of d.graph.relations) {
    const si = s.type === "subject" ? world.nationIndex.get(s.source) : undefined;
    if (si === undefined) continue;
    const loyalty = loyaltyOf(si);
    if (loyalty === "disloyal") disloyal.set(s.target, (disloyal.get(s.target) ?? 0) + 1);
    subjectsOf.set(s.target, [...(subjectsOf.get(s.target) ?? []), { id: s.source, si, loyalty }]);
  }
  for (const list of subjectsOf.values()) list.sort((x, y) => Number(y.loyalty === "wavering") - Number(x.loyalty === "wavering"));
  pairs.sort((x, y) => (disloyal.get(y.target) ?? 0) - (disloyal.get(x.target) ?? 0));
  for (const r of pairs) {
    const n = world.nationIndex.get(r.source);
    const t = world.nationIndex.get(r.target);
    if (n === undefined || t === undefined || n === world.player || busy.has(r.source) || world.nationGone[n] || world.nationGone[t]) continue;
    if (!dip.borders(d, r.source, r.target)) continue;
    const k = world.lords.findIndex((l, i) => l.nation === t && !l.gone && (l.loyalty === "Wavering" || l.loyalty === "Disloyal") && lordBorders(world, i, n));
    if (k >= 0 && !court(world, n, t, k)) {
      busy.add(r.source);
      continue;
    }
    for (const { id, si, loyalty: l } of subjectsOf.get(r.target) ?? []) {
      if (world.nationGone[si] || !dip.borders(d, r.source, id)) continue;
      if (l !== "wavering" && l !== "disloyal") continue;
      if (!court(world, n, si)) {
        busy.add(r.source);
        break;
      }
    }
  }
}

/** The player's courting envoys, and why each lord or subject can't be courted, for the screens (DIPL-220). */
export interface CourtingView {
  mine: { target: number; lord: number | null; lordName: string | null; since: string }[];
  /** Why each lord of another realm can't be courted (null when he can), by lord index. */
  lords: Record<number, string | null>;
  /** Why each other realm's subject can't be courted (null when it can), by realm. */
  subjects: Record<number, string | null>;
}

const yearMonth = (m: number): string => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;

export function courtingView(world: World, player: number): CourtingView | null {
  if (player < 0) return null;
  const me = world.nationIds[player]!;
  const mine = courtingsOf(world)
    .filter((c) => c.by === me && world.nationIndex.has(c.target))
    .map((c) => ({ target: world.nationIndex.get(c.target)!, lord: c.lord ?? null, lordName: c.lord === undefined ? null : (world.lords[c.lord]?.name ?? null), since: yearMonth(c.since) }));
  const lords: CourtingView["lords"] = {};
  world.lords.forEach((l, k) => {
    if (!l.gone && l.nation !== player && l.nation >= 0 && !world.nationGone[l.nation]) lords[k] = whyNotCourt(world, player, l.nation, k);
  });
  const subjects: CourtingView["subjects"] = {};
  for (const r of world.diplomacy.graph.relations) {
    if (r.type !== "subject" || r.target === me || r.source === me) continue;
    const s = world.nationIndex.get(r.source);
    if (s !== undefined && !world.nationGone[s]) subjects[s] = whyNotCourt(world, player, s);
  }
  return { mine, lords, subjects };
}
