import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { isSeasonEnd } from "./domain/subjects/index.ts";

/**
 * Claims and forging them (F-30, DIPL-256 to DIPL-260, D-DIPL-40): a claim is
 * a realm's right to one province of another realm, the fact
 * `territorial_claim` naming the province, and gives *Take land* on it. An
 * envoy forges one on a province on the realm's border: a year at that court
 * holding a seat, found out now and then (a wrong, and the work goes on).
 */

const rel = dip.relations;
const C = dip.config.claims;

/** One forging envoy: who sends him, the realm he works in, the province he forges a claim on, since when (month index). */
export interface Forging {
  by: string;
  target: string;
  province: string;
  since: number;
}
type WithForging = dip.Diplomacy & { forging?: Forging[] };

export const forgingsOf = (world: World): Forging[] => ((world.diplomacy as WithForging).forging ??= []);
const monthNow = (world: World): number => world.date.year * 12 + world.date.month - 1;
const yearMonth = (m: number): string => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;
const envoyId = (f: Forging) => `forge_claim-${f.by}-${f.target}-${f.province}-${f.since}`;

/** Gold forging a claim costs, paid when the envoy is sent (DIPL-257). */
export const forgeGold = (world: World): number => Math.round(C.forge.gold);

/** Whether province p borders realm n's land. */
function bordersRealm(world: World, p: number, n: number): boolean {
  for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) if (world.provinceOwner[world.adjList[k]!] === n) return true;
  return false;
}

/** The claims of realm n now standing, as facts (DIPL-256). */
export function claimFacts(world: World, n: number): dip.relations.FactRecord[] {
  const me = world.nationIds[n]!;
  return world.diplomacy.graph.facts.filter((f) => f.fact === "territorial_claim" && f.source === me && typeof f.province === "string");
}

/** Whether realm n holds Take land on province p now, from any reason (a claim, a refused demand, a defection, ...). */
export function holdsTakeLand(world: World, n: number, p: number): boolean {
  const t = world.provinceOwner[p]!;
  if (t < 0 || t === n) return false;
  return dip.holdsAim(world.diplomacy, world.nationIds[n]!, world.nationIds[t]!, "take_land", world.provinceIds[p]!);
}

/** Why realm n can't forge a claim on province p now; null when it can (DIPL-257). */
export function whyNotForge(world: World, n: number, p: number): string | null {
  const d = world.diplomacy;
  if (p < 0 || p >= world.provinceCount) return "no such province";
  const t = world.provinceOwner[p]!;
  if (t < 0 || world.nationGone[t]!) return "no realm holds it";
  if (t === n) return "it is yours already";
  const me = world.nationIds[n]!;
  const them = world.nationIds[t]!;
  if (rel.has(d.graph, "at_war", me, them)) return "you are at war with them";
  if (rel.overlord(d.graph, me) === them || rel.overlord(d.graph, them) === me) return "a subject tie binds you";
  if (forgingsOf(world).some((f) => f.by === me && f.target === them)) return "your envoy is there already";
  if (!bordersRealm(world, p, n)) return "it does not border your land";
  if (holdsTakeLand(world, n, p)) return "you already hold a claim on it";
  if (dip.freeSeats(d, me) <= 0) return "no free envoy: every seat is taken";
  if (world.nationTreasury[n]! < forgeGold(world)) return `needs ${forgeGold(world)} gold`;
  return null;
}

function seat(world: World, f: Forging): void {
  const month = dip.monthOf(world.diplomacy.date);
  world.diplomacy.envoys.push({ id: envoyId(f), country: f.by, person: "", personKind: "official", type: "", years: 0, action: "forge_claim", target: f.target, status: "resident", sent: month, arrival: month, residentSince: month });
}

function end(world: World, f: Forging): void {
  const d = world.diplomacy;
  d.envoys = d.envoys.filter((e) => e.id !== envoyId(f));
  (d as WithForging).forging = forgingsOf(world).filter((x) => x !== f);
}

const seated = (world: World, f: Forging) => world.diplomacy.envoys.some((e) => e.id === envoyId(f) && e.status === "resident");

/** Realm n sends an envoy to forge a claim on province p (ForgeClaim, DIPL-257). */
export function forgeClaim(world: World, n: number, p: number): string | null {
  const why = whyNotForge(world, n, p);
  if (why) return why;
  const f: Forging = { by: world.nationIds[n]!, target: world.nationIds[world.provinceOwner[p]!]!, province: world.provinceIds[p]!, since: monthNow(world) };
  world.nationTreasury[n] = world.nationTreasury[n]! - forgeGold(world);
  forgingsOf(world).push(f);
  seat(world, f);
  return null;
}

/** Realm n calls home its envoy forging a claim at realm t's court: nothing is made, the gold is spent. */
export function recallForging(world: World, n: number, t: number): string | null {
  const f = forgingsOf(world).find((x) => x.by === world.nationIds[n] && x.target === world.nationIds[t]);
  if (!f) return "you have no envoy forging a claim there";
  end(world, f);
  return null;
}

/** Makes realm n's claim on province p, standing `claims.years` from today (DIPL-256). */
export function makeClaim(world: World, n: number, p: number): void {
  const d = world.diplomacy;
  const me = world.nationIds[n]!;
  const province = world.provinceIds[p]!;
  const owner = world.provinceOwner[p]!;
  d.graph.facts = d.graph.facts.filter((f) => !(f.fact === "territorial_claim" && f.source === me && f.province === province));
  d.seq++;
  d.graph.facts.push({ id: `claim${d.seq}`, fact: "territorial_claim", source: me, target: owner >= 0 ? world.nationIds[owner]! : "", direction: "directed", province, until: dip.addMonths(dip.monthOf(d.date), C.years * 12), origin: "gameplay" });
}

/**
 * Claims follow their province (DIPL-256): each claim's target is the realm
 * that owns the province now; a claim ends when its claimant owns the
 * province, the province is no one's, the claimant is gone, or it lapses.
 */
export function syncClaims(world: World): void {
  const g = world.diplomacy.graph;
  const now = dip.monthOf(world.diplomacy.date);
  if (!g.facts.some((f) => f.fact === "territorial_claim" && typeof f.province === "string")) return;
  g.facts = g.facts.filter((f) => {
    if (f.fact !== "territorial_claim" || typeof f.province !== "string") return true;
    const p = world.provinceIndex.get(f.province);
    const by = world.nationIndex.get(f.source);
    if (p === undefined || by === undefined || world.nationGone[by]) return false;
    if (typeof f.until === "string" && now >= f.until) return false;
    const owner = world.provinceOwner[p]!;
    if (owner < 0 || owner === by) return false;
    f.target = world.nationIds[owner]!;
    return true;
  });
}

/**
 * The forging month (DIPL-258, DIPL-259): a forging whose seat was lost, whose
 * realms went to war or were bound by a subject tie, or whose province left
 * the target or the forger's border ends with nothing; at each season's end a
 * forger is found out at 1 in 10 (a wrong, the work goes on); after
 * `claims.forge.months` the claim is made and the envoy comes home.
 */
export function monthlyClaims(world: World, news: News[]): void {
  syncClaims(world);
  const list = forgingsOf(world);
  if (!list.length) return;
  const d = world.diplomacy;
  const name = (n: number) => world.rules.nations[n]!.name;
  const season = isSeasonEnd(world.date.month);
  for (const f of [...list]) {
    const by = world.nationIndex.get(f.by);
    const t = world.nationIndex.get(f.target);
    const p = world.provinceIndex.get(f.province);
    if (by === undefined || t === undefined || p === undefined || world.nationGone[by] || world.nationGone[t] || !seated(world, f) || world.provinceOwner[p] !== t || !bordersRealm(world, p, by) || rel.has(d.graph, "at_war", f.by, f.target) || rel.overlord(d.graph, f.by) === f.target || rel.overlord(d.graph, f.target) === f.by) {
      end(world, f);
      if (by !== undefined && t !== undefined && isHuman(world, by)) news.push({ kind: "envoy", text: `Your envoy forging a claim on ${world.rules.provinces[p ?? 0]?.name ?? "their land"} comes home with nothing made.`, nations: [by, t] });
      continue;
    }
    const pname = world.rules.provinces[p]!.name;
    if (season && foundOut(world, f) < C.forge.discovery_chance_per_season) {
      dip.addRuleEntry(d, f.target, f.by, "wrongs", "forged_a_claim_on_us");
      if (isHuman(world, by)) news.push({ kind: "envoy", text: `${name(t)} found out your envoy forging a claim on ${pname}: they will remember it, but his work goes on.`, nations: [by, t], province: p });
      else if (isHuman(world, t)) news.push({ kind: "envoy", text: `An envoy of ${name(by)} was caught forging a claim on ${pname}.`, nations: [t, by], province: p });
    }
    if (monthNow(world) - f.since < C.forge.months) continue;
    end(world, f);
    makeClaim(world, by, p);
    if (isHuman(world, by)) news.push({ kind: "envoy", text: `Your envoy has forged a claim on ${pname}: you hold Take land on it against ${name(t)} until ${dip.addMonths(dip.monthOf(d.date), C.years * 12).slice(0, 4)}.`, nations: [by, t], province: p });
    else if (isHuman(world, t)) news.push({ kind: "envoy", text: `${name(by)} now holds a claim on ${pname}: a reason for war against you.`, nations: [t, by], province: p });
  }
}

/**
 * The season's roll of finding a forger out, in [0, 1): seeded by the world,
 * the forging and the month, so a campaign stays deterministic without
 * drawing on the dice the rest of diplomacy shares (X-15).
 */
function foundOut(world: World, f: Forging): number {
  let h = 0x811c9dc5 ^ world.weatherSeed;
  for (const ch of `${envoyId(f)}@${monthNow(world)}`) h = Math.imul(h ^ ch.charCodeAt(0), 0x01000193);
  h ^= h >>> 15;
  h = Math.imul(h, 0x2c1b3c6d);
  h ^= h >>> 12;
  return (h >>> 0) / 0x100000000;
}

/** Whether realm n holds an aim on t other than Raid and No aim. */
function holdsFittingAim(world: World, n: number, t: number): boolean {
  return dip.warAimsOf(world.diplomacy, world.nationIds[n]!, world.nationIds[t]!).some((a) => a.aim !== "raid" && a.aim !== "no_aim");
}

/**
 * AI realms forge once a season (DIPL-260): one with a free seat and no
 * forging envoy that holds a Rival or Hostile stance toward a neighbour at
 * peace with it, holding no aim on it besides Raid and No aim, forges on that
 * neighbour's border province with the most people, its capital last.
 */
export function aiForging(world: World): void {
  if (!C.ai_forges || !isSeasonEnd(world.date.month)) return;
  const d = world.diplomacy;
  const busy = new Set(forgingsOf(world).map((f) => f.by));
  const pairs: { source: string; target: string }[] = [];
  for (const r of d.graph.relations) {
    if (r.type !== "rival" && r.type !== "hostile") continue;
    pairs.push(r);
    if (r.direction === "mutual") pairs.push({ source: r.target, target: r.source });
  }
  for (const r of pairs) {
    const n = world.nationIndex.get(r.source);
    const t = world.nationIndex.get(r.target);
    if (n === undefined || t === undefined || isHuman(world, n) || busy.has(r.source) || world.nationGone[n] || world.nationGone[t]) continue;
    if (!dip.borders(d, r.source, r.target) || rel.has(d.graph, "at_war", r.source, r.target) || dip.freeSeats(d, r.source) <= 0) continue;
    if (holdsFittingAim(world, n, t)) continue;
    const capital = world.provinceIndex.get(world.rules.nations[t]!.capital);
    let best = -1;
    for (let p = 0; p < world.provinceCount; p++) {
      if (world.provinceOwner[p] !== t || !bordersRealm(world, p, n)) continue;
      if (best < 0 || (best === capital && p !== capital) || (p !== capital && world.provincePopulation[p]! > world.provincePopulation[best]!)) best = p;
    }
    if (best >= 0 && !forgeClaim(world, n, best)) busy.add(r.source);
  }
}

/** The player's claims and forging envoys, for the Diplomacy tabs (DIPL-262, DIPL-263). */
export interface ClaimsView {
  /** Gold a forging costs, and its months, and the chance a season of being found out. */
  gold: number;
  months: number;
  discovery: number;
  /** The player's envoys forging a claim: at whose court, on which province, and the month the claim is made. */
  forging: { target: number; province: number; name: string; since: string; done: string }[];
  /** Every province the player holds Take land on, by the realm that owns it, with why and when a forged claim lapses. */
  claims: Record<number, { province: number; name: string; why: string; until?: string }[]>;
  /** For each realm the player borders and could send an envoy: its border provinces with why each can't be forged on (null when it can). */
  forge: Record<number, { why: string | null; provinces: { province: number; name: string; capital: boolean; why: string | null }[] }>;
}

export function claimsView(world: World, player: number): ClaimsView | null {
  if (player < 0) return null;
  syncClaims(world);
  const d = world.diplomacy;
  const me = world.nationIds[player]!;
  const name = (p: number) => world.rules.provinces[p]!.name;
  const forging = forgingsOf(world)
    .filter((f) => f.by === me && world.nationIndex.has(f.target) && world.provinceIndex.has(f.province))
    .map((f) => {
      const p = world.provinceIndex.get(f.province)!;
      return { target: world.nationIndex.get(f.target)!, province: p, name: name(p), since: yearMonth(f.since), done: yearMonth(f.since + C.forge.months) };
    });
  const claims: ClaimsView["claims"] = {};
  const forge: ClaimsView["forge"] = {};
  // Their provinces on our border, by realm.
  const near = new Map<number, number[]>();
  for (let p = 0; p < world.provinceCount; p++) {
    const t = world.provinceOwner[p]!;
    if (t < 0 || t === player || world.nationGone[t]) continue;
    if (bordersRealm(world, p, player)) near.set(t, [...(near.get(t) ?? []), p]);
  }
  const until = new Map(claimFacts(world, player).map((f) => [f.province as string, typeof f.until === "string" ? f.until : undefined]));
  for (let t = 0; t < world.nationCount; t++) {
    if (t === player || world.nationGone[t]) continue;
    const held = dip.warAimsOf(d, me, world.nationIds[t]!).filter((a) => a.aim === "take_land" && a.province !== undefined);
    const seen = new Set<number>();
    const rows: ClaimsView["claims"][number] = [];
    for (const a of held) {
      const p = world.provinceIndex.get(a.province!);
      if (p === undefined || seen.has(p) || world.provinceOwner[p] !== t) continue;
      seen.add(p);
      const u = a.source === "our claim" ? until.get(a.province!) : undefined;
      rows.push({ province: p, name: name(p), why: a.source.replace(/_/g, " "), ...(u ? { until: u } : {}) });
    }
    if (rows.length) claims[t] = rows;
    const border = near.get(t);
    if (!border) continue;
    const them = world.nationIds[t]!;
    const atAll =
      rel.has(d.graph, "at_war", me, them) ? "you are at war with them"
      : rel.overlord(d.graph, me) === them || rel.overlord(d.graph, them) === me ? "a subject tie binds you"
      : forgingsOf(world).some((f) => f.by === me && f.target === them) ? "your envoy is there already"
      : null;
    const capital = world.provinceIndex.get(world.rules.nations[t]!.capital);
    forge[t] = {
      why: atAll,
      provinces: atAll ? [] : border.filter((p) => !seen.has(p)).sort((a, b) => world.provincePopulation[b]! - world.provincePopulation[a]!).slice(0, 8).map((p) => ({ province: p, name: name(p), capital: p === capital, why: whyNotForge(world, player, p) })),
    };
  }
  return { gold: forgeGold(world), months: C.forge.months, discovery: C.forge.discovery_chance_per_season, forging, claims, forge };
}
