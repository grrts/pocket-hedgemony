import * as ns from "./domain/national-strengths/index.ts";
import { traitPct } from "./rulers.ts";
import * as dip from "./domain/diplomacy/index.ts";
import tree from "../../rules/data/domain/events-tree.json" with { type: "json" };
import places from "../../rules/data/domain/events-places.json" with { type: "json" };
import gazetteer from "../../rules/data/domain/national-strengths-places.json" with { type: "json" };
import { conditionId, realmHeritageData } from "./realmStrengths.ts";
import { Rng } from "./rng.ts";
import { stabilityOf } from "./stability.ts";
import { knownSet } from "./research.ts";
import { W, worksAt } from "./works.ts";
import { eraOf } from "./domain/research/index.ts";
import { lonLatOf } from "./domain/world-map/index.ts";
import type { News } from "./war.ts";
import type { World } from "./world.ts";

/**
 * Heritage in play (national-strengths HER-078, spec §9): every realm's
 * birthright, heydays, ambitions, legacies and burden are evaluated once a
 * month, after the event tree, against what the game knows; heyday time is
 * counted a month at a time. What is in force then pulls the levers the game
 * simulates (IN_PLAY) until the next month. The rules are the library's
 * (domain/national-strengths); this file reads the world into its facts and
 * its levers back into the game.
 */

/** Levers the game applies, and where (each owner reads its own through heritageFactor or heritageSteps). */
export const IN_PLAY: Readonly<Record<string, string>> = {
  tax_reach_pct: "tax each province sends you",
  official_wage_pct: "officials' wages",
  loan_interest_pct: "interest on debt",
  building_cost_pct: "gold for new works",
  growth_pct: "births",
  recruit_refill_pct: "how fast recruits refill",
  harvest_steps: "harvests",
  garrison_pct: "men behind your walls",
  hired_company_cost_pct: "hired companies' pay",
};

/** Effect params that narrow an effect to one kind of thing; a lever above applies only an effect without them. */
const NARROWING = ["arm", "ware", "kind", "class", "lord_kind", "cause", "route_kind", "building", "type", "style", "event", "option", "sea", "ship"];

export interface GameHeritage {
  /** Each realm's heritage by nation index, null for one with none recorded. */
  realms: (ns.Heritage | null)[];
  /** The id each realm goes by in heritage conditions (its catalogue record's). */
  ids: string[];
  /** Country-card counts at the campaign start ("start*2"). */
  start: Record<string, number>[];
  /** Realm-wide levers in force by nation, summed by lever key. */
  levers: Record<string, number>[];
  /** Tax reaching each province's holder from heritage: 1 = as it is. */
  taxReach: Float32Array;
  /** The holder each province's reach was worked out for; a province changing hands mid-month takes its new holder's realm-wide reach. */
  reachOwner: Int32Array;
  /** The heritage the snapshot last showed, rebuilt when it changes. */
  version: number;
}

/** Seeded apart from the world's dice, so heritage draws never shift a battle or a harvest. */
const rngFor = (world: World, n: number): Rng => new Rng((world.weatherSeed ^ Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(world.date.year * 12 + world.date.month, 0x85ebca6b)) >>> 0);

/** Every realm's heritage at the campaign start, with its three ambitions drawn (HER-015, HER-023). */
export function createGameHeritage(world: World): GameHeritage {
  const N = world.nationCount;
  const g: GameHeritage = {
    realms: world.nationIds.map((id) => {
      const d = realmHeritageData(id);
      return d ? ns.newHeritage(d.id, d) : null;
    }),
    ids: world.nationIds.map(conditionId),
    start: [],
    levers: Array.from({ length: N }, () => ({})),
    taxReach: new Float32Array(world.provinceCount).fill(1),
    reachOwner: new Int32Array(world.provinceCount).fill(-1),
    version: 0,
  };
  if (!g.realms.some(Boolean)) return g;
  const facts = worldFacts(world, g);
  g.start = world.nationIds.map((_, n) => ({ ...facts.countries[g.ids[n]!]?.counts }));
  for (const c of Object.values(facts.countries)) if (c.counts) c.start = c.counts;
  for (let n = 0; n < g.realms.length; n++) {
    const h = g.realms[n];
    if (!h) continue;
    // The birthright and heydays whose age is under way come first, so a burden's shed condition sees them (HER-084).
    const burden = h.burden;
    h.burden = null;
    ns.evaluate(h, facts);
    h.burden = burden;
    ns.startCampaign(h, rngFor(world, n), facts);
    ns.evaluate(h, facts);
    h.log = [];
    h.digest = [];
  }
  publish(world, g);
  return g;
}

/**
 * The month's heritage (HER-078): every realm evaluated once, a month served
 * by each awake heyday, replacements drawn, the AI's choices made (HER-079),
 * the player told what changed, and the levers in force published.
 */
export function monthlyHeritage(world: World, news: News[]): void {
  const g = (world.heritage ??= createGameHeritage(world));
  if (!g.realms.some(Boolean)) return;
  const facts = worldFacts(world, g);
  for (let n = 0; n < g.realms.length; n++) {
    const h = g.realms[n];
    if (!h || world.nationGone[n]) continue;
    for (const a of ageBeginnings(h, facts)) ns.ageBegins(h, a);
    const happened = ns.monthTick(h, facts, rngFor(world, n));
    if (n !== world.player) while (h.ask) ns.aiAnswer(h);
    if (n === world.player) tellPlayer(world, n, h, happened, news);
    h.digest = [];
    // The log is the library's record for tests; the game keeps only the month's.
    h.log = [];
  }
  publish(world, g);
}

/** Age entries of a pool join when their age has begun (HER-026). */
function ageBeginnings(h: ns.Heritage, w: ns.WorldFacts): string[] {
  return [...new Set(h.waitingForAge.map((a) => a.age!).filter((a) => w.ages.active.includes(a) || w.ages.ended.includes(a)))];
}

const NEWS_LINE: Record<string, (h: ns.Heritage, id: string) => string | null> = {
  HeydayWoke: (h, id) => `${heydayName(h, id)} begins: its golden age has come.`,
  HeydaySlept: (h, id) => `${heydayName(h, id)} is inactive until its time returns.`,
  MarkGranted: (h, id) => `${h.legacies.find((l) => l.id === id)?.name ?? "A golden age"} stays with you as a legacy.`,
  AmbitionDone: (h, id) => {
    const a = h.ambitions.find((x) => x.item.id === id)!.item;
    return `Ambition fulfilled: ${a.name}. ${a.legacy.name} is yours: ${a.legacy.text}`;
  },
  AmbitionLost: (h, id) => {
    const a = h.ambitions.find((x) => x.item.id === id)!.item;
    return `Ambition lost: ${a.name}. ${a.legacy.name} will not be yours.`;
  },
  AmbitionDrawn: (h, id) => {
    const a = h.ambitions.find((x) => x.item.id === id)?.item;
    return a ? `A new ambition: ${a.name}. ${a.text}` : null;
  },
  BurdenShed: (h) => `${h.burden!.item.name} is overcome: ${h.burden!.item.turned.name} takes its place.`,
  BirthrightDormant: (h, id) => `${h.birthrights.find((b) => b.item.id === id)!.item.name} lies dormant.`,
  BirthrightWoke: (h, id) => `${h.birthrights.find((b) => b.item.id === id)!.item.name} wakes again.`,
};

const heydayName = (h: ns.Heritage, id: string) => h.heydays.find((x) => x.item.id === id)?.item.name ?? id;

/** One dispatch line for each change the player should hear of (HER-071), and one when a choice waits. */
function tellPlayer(world: World, n: number, h: ns.Heritage, happened: ns.HeritageEvent[], news: News[]): void {
  const lines = [...h.digest];
  for (const e of happened) {
    const line = e.id ? NEWS_LINE[e.type]?.(h, e.id) : null;
    if (line) lines.push(line);
  }
  if (h.ask) lines.push(h.ask.kind === "sleep_heyday" ? "A third golden age would begin: choose which one becomes inactive." : "A sixth legacy is earned: choose which one to let go.");
  for (const text of lines) news.push({ kind: "heritage", text, nations: [n] });
}

// ---------------------------------------------------------------- the world as heritage reads it

/** Ages under way and ended: the event tree's when it runs, else each age's forced dates (events §ages). */
export function ageClock(world: World): { active: string[]; ended: string[] } {
  const s = world.events?.state;
  if (s) return { active: [...s.world.ages], ended: [...s.agesEnded] };
  const y = world.date.year;
  const active: string[] = [];
  const ended: string[] = [];
  for (const a of tree.ages as { id: string; force_start?: number; force_end?: number; window?: { latest_end?: number } }[]) {
    const end = a.force_end ?? a.window?.latest_end ?? Infinity;
    if (y >= end) ended.push(a.id);
    else if (a.force_start !== undefined && y >= a.force_start) active.push(a.id);
  }
  return { active, ended };
}

/**
 * The provinces of each area, region and named province heritage owns or
 * scopes a lever to: the event tree's table (D-EVT-17), then the heritage
 * gazetteer's boxes and points (D-HER-16), worked out once per ruleset.
 */
const targetCache = new WeakMap<World["rules"], Map<string, number[]>>();
function targets(world: World): Map<string, number[]> {
  let m = targetCache.get(world.rules);
  if (m) return m;
  m = new Map();
  for (const [key, ids] of Object.entries(places.places as Record<string, string[]>)) m.set(key, ids.map((id) => world.provinceIndex.get(id) ?? -1).filter((p) => p >= 0));
  const land = world.rules.provinces.flatMap((p, k) => (world.provinceWater[k] || p.x === undefined || p.y === undefined ? [] : [{ k, id: p.id, x: p.x, y: p.y, terrain: p.terrain, at: lonLatOf(p.x, p.y) }]));
  for (const [key, [w, s, e, n]] of Object.entries(gazetteer.areas as unknown as Record<string, [number, number, number, number]>))
    if (!m.has(key)) m.set(key, land.filter(({ at }) => at.lon >= w && at.lon <= e && at.lat >= s && at.lat <= n).map(({ k }) => k));
  for (const [key, [lon, lat]] of Object.entries(gazetteer.provinces as unknown as Record<string, [number, number]>)) {
    if (m.has(key)) continue;
    let best = -1;
    let dist = Infinity;
    for (const p of land) {
      const d = (p.at.lon - lon) ** 2 + (p.at.lat - lat) ** 2;
      if (d < dist) [best, dist] = [p.k, d];
    }
    if (best >= 0) m.set(key, [best]);
  }
  targetCache.set(world.rules, m);
  return m;
}

/** Heritage place names bound once per ruleset to their province (D-HER-16). */
const bound = new WeakMap<World["rules"], Map<string, number>>();
function placeProvinces(world: World, g: GameHeritage): Map<string, number> {
  let m = bound.get(world.rules);
  if (m) return m;
  m = new Map();
  const names = new Set<string>();
  for (const h of g.realms) if (h) collect(h, names);
  const provinces = world.rules.provinces.map((p) => ({ id: p.id, ...(p.x !== undefined && p.y !== undefined ? { x: p.x, y: p.y } : {}), terrain: p.terrain }));
  for (const name of names) {
    const id = ns.bindPlace(name, provinces);
    const p = id ? world.provinceIndex.get(id) : undefined;
    if (p !== undefined) m.set(name, p);
  }
  bound.set(world.rules, m);
  return m;
}

function collect(h: ns.Heritage, out: Set<string>): void {
  const visit = (c: unknown): void => {
    if (!c || typeof c !== "object") return;
    for (const [k, v] of Object.entries(c as Record<string, unknown>)) {
      if (k === "holds_place" && v && typeof v === "object") out.add(String((v as { place: string }).place));
      else if (Array.isArray(v)) v.forEach(visit);
      else visit(v);
    }
  };
  visit(h.birthrights.map((b) => b.item.needs));
  visit(h.heydays.map((x) => [x.item.wakes, x.item.ends]));
  visit([...h.pool, ...h.waitingForAge, ...h.ambitions.map((a) => a.item)].map((a) => [a.stir, a.goal, a.fail]));
  visit(h.burden?.item.shed);
}

/** The named seas heritage reads (coastal), as [west, south, east, north] boxes a sea zone's centre lies in (approximate). */
const SEAS: Record<string, [number, number, number, number]> = {
  mediterranean: [-5.6, 30, 36.5, 46],
  black_sea: [27, 40.5, 42, 47.5],
  atlantic: [-80, -40, -5.6, 62],
  baltic: [9, 53, 31, 66],
  white_sea: [32, 63, 45, 68],
  caspian: [46, 36, 55, 47.5],
  red_sea: [32, 12, 44, 30],
  arabian_sea: [50, 5, 77, 26],
  bay_of_bengal: [78, 5, 100, 23],
  java_sea: [105, -8, 120, -2],
};

/** The named seas each sea zone belongs to, worked out once per ruleset. */
const seaNames = new WeakMap<World["rules"], string[][]>();
function seasOf(world: World): string[][] {
  let out = seaNames.get(world.rules);
  if (out) return out;
  out = world.rules.provinces.map((p, k) => {
    if (!world.provinceWater[k] || p.x === undefined || p.y === undefined) return [];
    const { lon, lat } = lonLatOf(p.x, p.y);
    return Object.entries(SEAS).filter(([, [w, s, e, n]]) => lon >= w && lon <= e && lat >= s && lat <= n).map(([id]) => id);
  });
  seaNames.set(world.rules, out);
  return out;
}

/** Works the `count building:<id>` condition reads, by the buildings design's ids. */
const BUILDING_IDS = ["market", "granary", "mine", "ranch", "harbour", "farm", "fishery", "road", "castle", "quarry"] as const;

/**
 * What heritage conditions read, worked out once a month (HER-040, HER-041):
 * lands, places, counts on the country card, wars, ties, inventions and the
 * ages. What no context keeps yet (trade presence, named seas, religion,
 * rebels) is left out, so conditions on it do not hold.
 */
export function worldFacts(world: World, g: GameHeritage): ns.WorldFacts {
  const N = world.nationCount;
  const counts = Array.from({ length: N }, () => ({ provinces: 0, royal_provinces: 0, officials: 0, castles: 0, soldiers: 0, gold: 0, debt: 0, lords: 0, loyal_lords: 0, allies: 0, subjects: 0, schools: 0, scholars: 0, victories: 0 }) as Record<string, number>);
  const harbours = Array.from({ length: N }, () => new Set<string>());
  const seas = seasOf(world);
  const borders = Array.from({ length: N }, () => new Set<number>());
  const works = BUILDING_IDS.map((id) => W[id]);
  const built = BUILDING_IDS.map(() => new Int32Array(N));
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (n < 0) continue;
    const c = counts[n]!;
    c.provinces!++;
    if (world.provinceLord[p]! < 0) {
      c.royal_provinces!++;
      if (world.provinceOfficial[p]! >= 0) c.officials!++;
    }
    for (let b = 0; b < works.length; b++) if (worksAt(world, p, works[b]!) > 0) built[b]![n]!++;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const q = world.adjList[k]!;
      if (world.provinceWater[q]) {
        harbours[n]!.add("any");
        for (const sea of seas[q]!) harbours[n]!.add(sea);
      }
      const o = world.provinceOwner[q]!;
      if (o >= 0 && o !== n) borders[n]!.add(o);
    }
  }
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i]! >= 0) counts[a.owner[i]!]!.soldiers! += a.men[i]!;
  for (const l of world.lords) {
    if (l.gone) continue;
    counts[l.nation]!.lords!++;
    if (l.loyalty === "Loyal") counts[l.nation]!.loyal_lords!++;
  }
  world.commanders.forEach((c, k) => {
    const o = world.commanderOwner[k]!;
    if (o >= 0) counts[o]!.victories! += c.victories;
  });
  const gr = world.diplomacy.graph;
  const relations: ns.WorldFacts["relations"] = [];
  const idOf = (mapId: string) => g.ids[world.nationIndex.get(mapId) ?? -1] ?? mapId;
  for (const r of gr.relations) {
    const s = world.nationIndex.get(r.source);
    const t = world.nationIndex.get(r.target);
    if (s === undefined || t === undefined) continue;
    if (r.type === "alliance") {
      relations.push({ who: g.ids[s]!, other: g.ids[t]!, type: "alliance" });
      counts[s]!.allies!++;
      counts[t]!.allies!++;
    } else if (r.type === "subject") {
      relations.push({ who: g.ids[s]!, other: g.ids[t]!, type: "subject" });
      if (r.subject_kind === "personal_union") relations.push({ who: g.ids[s]!, other: g.ids[t]!, type: "personal_union" });
      counts[t]!.subjects!++;
    } else if (r.type === "rival") relations.push({ who: g.ids[s]!, other: g.ids[t]!, type: "rivalry" });
  }
  // Owning a place or area of the event tree: all its provinces, or a share of them (`min_share`).
  const shares = Array.from({ length: N }, () => ({}) as Record<string, number>);
  for (const [target, ps] of targets(world)) {
    for (const p of ps) {
      const o = world.provinceOwner[p]!;
      if (o >= 0) shares[o]![target] = (shares[o]![target] ?? 0) + 1 / ps.length;
    }
  }
  const placesHeld = Array.from({ length: N }, () => [] as string[]);
  for (const [name, q] of placeProvinces(world, g)) {
    const o = world.provinceOwner[q]!;
    if (o >= 0) placesHeld[o]!.push(name);
  }
  const countries: Record<string, ns.CountryFacts> = {};
  for (let n = 0; n < N; n++) {
    if (world.nationGone[n]) continue;
    const id = world.nationIds[n]!;
    const c = counts[n]!;
    BUILDING_IDS.forEach((id, b) => built[b]![n] && (c[`building:${id}`] = built[b]![n]!));
    c.castles = built[BUILDING_IDS.indexOf("castle")]![n]!;
    c.gold = world.nationTreasury[n]!;
    c.debt = world.nationDebt[n]!;
    const p = world.research[n];
    if (p) {
      c.schools = p.schools.length;
      c.scholars = p.scholars;
    }
    const facts: ns.CountryFacts = {
      exists: true,
      counts: c,
      start: g.start[n] ?? c,
      overlord: (() => {
        const o = dip.relations.overlord(gr, id);
        return o ? idOf(o) : null;
      })(),
      atWarWith: dip.relations.enemiesOf(gr, id).map(idOf),
      borders: [...borders[n]!].map((m) => g.ids[m]!),
      harbours: [...harbours[n]!],
      owns: Object.keys(shares[n]!).filter((t) => shares[n]![t]! > 0.999),
      shares: shares[n]!,
      places: placesHeld[n]!,
    };
    // Read only when a condition asks: inventions known, and stability as a number (Steady 2 … Crumbling −1, inferred).
    let knows: string[] | undefined;
    let stats: Record<string, number> | undefined;
    Object.defineProperty(facts, "knows", { get: () => (knows ??= [...knownSet(world, n)]), enumerable: true });
    Object.defineProperty(facts, "stats", { get: () => (stats ??= { stability: 2 - stabilityOf(world, n).step }), enumerable: true });
    countries[g.ids[n]!] = facts;
  }
  const heritage: Record<string, ns.Heritage> = {};
  g.realms.forEach((h) => h && (heritage[h.country] = h));
  const events = world.events ? [...new Set(world.events.state.world.history.map((o) => o.event))] : [];
  return { year: world.date.year, month: world.date.month, countries, ages: ageClock(world), events, relations, heritage };
}

// ---------------------------------------------------------------- levers in force

/**
 * Publishes each realm's levers in force (spec §9 step 5): realm-wide sums by
 * lever, and tax reaching the holder of each province from the levers scoped
 * to capital, coast, core, royal or lords' land, frontier or terrain.
 */
function publish(world: World, g: GameHeritage): void {
  g.version++;
  const scoped: ns.Effect[][] = [];
  g.realms.forEach((h, n) => {
    const out: Record<string, number> = {};
    const tax: ns.Effect[] = [];
    if (h)
      for (const e of ns.activeEffects(h)) {
        if (!effectInPlay(e)) continue;
        if (e.where && e.where !== "realm") tax.push(e);
        else out[e.lever] = (out[e.lever] ?? 0) + (typeof e.value === "number" ? e.value : 0);
      }
    g.levers[n] = out;
    scoped[n] = tax;
  });
  const reach = g.taxReach;
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    g.reachOwner[p] = n;
    if (n < 0 || !g.realms[n]) {
      reach[p] = 1;
      continue;
    }
    let pct = g.levers[n]!.tax_reach_pct ?? 0;
    if (scoped[n]!.length) {
      const place = placeOf(world, p, n);
      for (const e of scoped[n]!) if (ns.appliesIn(e, place)) pct += Number(e.value);
    }
    reach[p] = Math.max(0, 1 + pct / 100);
  }
}

/** What a province is, for a scoped lever (HER-037). */
function placeOf(world: World, p: number, n: number): ns.Place {
  let frontier = false;
  for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]! && !frontier; k++) {
    const o = world.provinceOwner[world.adjList[k]!]!;
    frontier = o >= 0 && o !== n;
  }
  const prov = world.rules.provinces[p]!;
  const start = world.rules.provinces[p]!.owner;
  return {
    capital: world.rules.nations[n]!.capital === prov.id,
    coast: !!prov.coastal,
    core: start === world.nationIds[n],
    royal: world.provinceLord[p]! < 0,
    lords: world.provinceLord[p]! >= 0,
    frontier,
    terrain: prov.terrain,
  };
}

/** A realm's percent lever in force as a factor (1 = unchanged): what its owner multiplies its rule by. Its ruler's traits add theirs (REALM-236). */
export function heritageFactor(world: World, n: number, lever: string): number {
  const pct = (n >= 0 ? world.heritage?.levers[n]?.[lever] ?? 0 : 0) + traitPct(world, n, lever);
  return pct ? Math.max(0, 1 + pct / 100) : 1;
}

/** A realm's steps or count lever in force (harvest steps …), 0 without. */
export function heritageSteps(world: World, n: number, lever: string): number {
  return (n >= 0 ? world.heritage?.levers[n]?.[lever] : undefined) ?? 0;
}

/** Tax reaching a province's holder from heritage (1 = unchanged). */
export function heritageTaxReach(world: World, p: number): number {
  const g = world.heritage;
  if (!g) return 1;
  const n = world.provinceOwner[p]!;
  const trait = traitPct(world, n, "tax_reach_pct") / 100;
  if (g.reachOwner[p] === n) return g.taxReach[p]! + trait;
  const pct = (n >= 0 ? g.levers[n]?.tax_reach_pct ?? 0 : 0) / 100 + trait;
  return pct ? Math.max(0, 1 + pct) : 1;
}

// ---------------------------------------------------------------- the player's choices

/** Counsel (HER-024, X-27): for gold by era, once every ten years, one open ambition is set aside and a new one drawn. */
export function payCounsel(world: World, n: number, ambition: string): string | null {
  const h = world.heritage?.realms[n];
  if (!h) return "this realm has no heritage recorded";
  const treasury = { gold: world.nationTreasury[n]! };
  const r = ns.payCounsel(h, ambition, worldFacts(world, world.heritage!), eraOf({ year: world.date.year, month: world.date.month, day: world.date.day ?? 1 }), treasury, rngFor(world, n));
  if (!r.ok)
    return r.reason === "too_soon"
      ? `the court can be asked again in ${h.counselYear! + ns.RULES.ambitions.counsel.cooldown_years}`
      : r.reason === "gold"
        ? "not enough gold"
        : r.reason === "none_left"
          ? "no other ambition is left to draw"
          : "no such open ambition";
  world.nationTreasury[n] = treasury.gold;
  h.digest = [];
  h.log = [];
  world.heritage!.version++;
  return null;
}

/** The answer to a waiting choice: the heyday that sleeps (HER-013) or the legacy let go (HER-030). */
export function heritageChoice(world: World, n: number, id: string): string | null {
  const g = world.heritage;
  const h = g?.realms[n];
  if (!h?.ask) return "no choice waits";
  if (h.ask.kind === "sleep_heyday") {
    if (![h.ask.waking, ...h.ask.awake].includes(id)) return "not one of the golden ages";
    ns.chooseSleepingHeyday(h, id);
  } else {
    if (![h.ask.legacy.id, ...h.legacies.map((l) => l.id)].includes(id)) return "not one of the legacies";
    ns.letGoLegacy(h, id);
  }
  h.log = [];
  publish(world, g!);
  return null;
}

// ---------------------------------------------------------------- saves

/** A realm's heritage as saved: states and ids only; the texts and conditions come from the build. */
/**
 * One realm's heritage in a save, kept small: ids lose the realm's own prefix
 * ("france_bureau_guns" is "bureau_guns" under France), heydays and seals are
 * tuples, and what is empty or as it starts is left out.
 */
export interface SavedRealmHeritage {
  dormant?: number[];
  /** [id, state, years awake, forced until]. */
  heydays: [string, ns.HeydayState, number, number?][];
  /** Read from saves before X-27 only: the pool is now whatever of the realm's ambitions is neither drawn nor waiting for its age. */
  pool?: string[];
  waiting?: string[];
  /** [id, state, share met, within reach]; saves before X-27 hold "sealed" or "stirred" and a warmth band. */
  ambitions: [string, ns.AmbitionState, number, (boolean | string)?][];
  legacies?: string[];
  burden?: { state: "held" | "shed"; armed?: boolean };
  counselYear?: number;
  slept?: string[];
  ask?: { kind: "let_go_legacy"; legacy: string } | { kind: "sleep_heyday"; waking: string; awake: string[] };
}

const round4 = (x: number): number => Math.round(x * 1e4) / 1e4;

/** Every realm's heritage by nation id. */
export function saveHeritage(world: World): Record<string, SavedRealmHeritage> | undefined {
  const g = world.heritage;
  if (!g) return undefined;
  const out: Record<string, SavedRealmHeritage> = {};
  g.realms.forEach((h, n) => {
    if (!h) return;
    const pre = `${world.nationIds[n]!}_`;
    const short = (id: string): string => (id.startsWith(pre) ? id.slice(pre.length) : `=${id}`);
    const ids = (xs: string[]): string[] | undefined => (xs.length ? xs.map(short) : undefined);
    const r: SavedRealmHeritage = {
      heydays: h.heydays.map((x) => (x.forcedUntil !== undefined ? [short(x.item.id), x.state, round4(x.yearsAwake), x.forcedUntil] : [short(x.item.id), x.state, round4(x.yearsAwake)])),
      ambitions: h.ambitions.map((a) => (a.near ? [short(a.item.id), a.state, round4(a.share), true] : [short(a.item.id), a.state, round4(a.share)])),
    };
    const dormant = h.birthrights.flatMap((b, k) => (b.dormant ? [k] : []));
    if (dormant.length) r.dormant = dormant;
    const waiting = ids(h.waitingForAge.map((a) => a.id));
    if (waiting) r.waiting = waiting;
    const legacies = ids(h.legacies.map((l) => l.id));
    if (legacies) r.legacies = legacies;
    if (h.burden && (h.burden.state !== "held" || h.burden.armed !== undefined)) r.burden = { state: h.burden.state, ...(h.burden.armed !== undefined ? { armed: h.burden.armed } : {}) };
    if (h.counselYear !== null) r.counselYear = h.counselYear;
    const slept = ids(h.slept);
    if (slept) r.slept = slept;
    if (h.ask) r.ask = h.ask.kind === "let_go_legacy" ? { kind: "let_go_legacy", legacy: short(h.ask.legacy.id) } : { kind: "sleep_heyday", waking: short(h.ask.waking), awake: h.ask.awake.map(short) };
    out[world.nationIds[n]!] = r;
  });
  return out;
}

/** Puts saved heritage back onto a world's fresh heritage; anything the build no longer has is dropped. */
export function restoreHeritage(world: World, saved: Record<string, SavedRealmHeritage>): void {
  const g = (world.heritage ??= createGameHeritage(world));
  g.realms.forEach((h, n) => {
    const s = h && saved[world.nationIds[n]!];
    if (!h || !s) return;
    const d = realmHeritageData(world.nationIds[n]!)!;
    const ambitions = new Map(d.ambitions.map((a) => [a.id, a]));
    const legacies = new Map<string, ns.Legacy>();
    for (const a of d.ambitions) legacies.set(a.legacy.id, a.legacy);
    for (const x of d.heydays) legacies.set(`${x.id}_mark`, ns.markOf(x));
    if (d.burden) legacies.set(d.burden.turned.id, d.burden.turned);
    const pre = `${world.nationIds[n]!}_`;
    const long = (id: string): string => (id.startsWith("=") ? id.slice(1) : pre + id);
    h.birthrights.forEach((b, k) => (b.dormant = !!s.dormant?.includes(k)));
    for (const [id, state, years, forcedUntil] of s.heydays) {
      const hd = h.heydays.find((y) => y.item.id === long(id));
      if (!hd) continue;
      hd.state = state;
      hd.yearsAwake = years;
      if (forcedUntil !== undefined) hd.forcedUntil = forcedUntil;
    }
    const pick = (ids: string[] = []) => ids.map(long).flatMap((id) => (ambitions.has(id) ? [ambitions.get(id)!] : []));
    h.waitingForAge = pick(s.waiting);
    // Before X-27 an open ambition was "sealed" or "stirred", and "hot" was within reach.
    h.ambitions = s.ambitions.flatMap(([id, state, share, near]) =>
      ambitions.has(long(id)) ? [{ item: ambitions.get(long(id))!, state: (state as string) === "sealed" || (state as string) === "stirred" ? "open" : state, share, near: near === true || near === "hot" }] : [],
    );
    // The pool is every ambition of the realm neither drawn nor waiting for its age, so ambitions written later join old saves too.
    const taken = new Set([...h.waitingForAge, ...h.ambitions.map((a) => a.item)].map((a) => a.id));
    h.pool = d.ambitions.filter((a) => !taken.has(a.id));
    h.legacies = (s.legacies ?? []).map(long).flatMap((id) => (legacies.has(id) ? [legacies.get(id)!] : []));
    if (h.burden) {
      h.burden.state = s.burden?.state ?? "held";
      if (s.burden?.armed !== undefined) h.burden.armed = s.burden.armed;
      else delete h.burden.armed;
    }
    h.counselYear = s.counselYear ?? null;
    h.slept = (s.slept ?? []).map(long);
    const ask = s.ask;
    h.ask = !ask
      ? null
      : ask.kind === "sleep_heyday"
        ? { kind: "sleep_heyday", waking: long(ask.waking), awake: ask.awake.map(long) }
        : legacies.has(long(ask.legacy))
          ? { kind: "let_go_legacy", legacy: legacies.get(long(ask.legacy))! }
          : null;
  });
  publish(world, g);
}

// ---------------------------------------------------------------- what the Heritage tab shows

/** One realm's heritage as the Heritage tab shows it; ambitions only for the player's own realm (HER-016, X-27). */
export interface HeritageView {
  /** Each birthright held: the realm's own first; dormant ones are greyed (HER-006). */
  birthrights: { id: string; dormant: boolean }[];
  /** Each heyday's state and months it has been awake (25 years leave a mark, HER-012). */
  heydays: { id: string; state: ns.HeydayState; months: number }[];
  burden: { state: "held" | "shed"; turned: { name: string; text: string } } | null;
  legacies: { id: string; name: string; text: string; great: boolean; effects: ns.Effect[] }[];
  /** Open ambitions, counted for any realm (HER-073). */
  open: number;
  ambitions?: (ns.AmbitionView & { id: string })[];
  ask?: { kind: "sleep_heyday" | "let_go_legacy"; options: { id: string; name: string }[] };
  /** Counsel's price now and the year it can next be asked, null when it can be asked now (HER-024). */
  counsel?: { gold: number; nextYear: number | null };
}

/** Months as heritage counts them: 12 to a year. */
const months = (years: number) => Math.round(years * ns.RULES.timing.months_per_year);

export function heritageView(world: World, n: number): HeritageView | null {
  const h = world.heritage?.realms[n];
  if (!h) return null;
  const v: HeritageView = {
    birthrights: h.birthrights.map((b) => ({ id: b.item.id, dormant: b.dormant })),
    heydays: h.heydays.map((x) => ({ id: x.item.id, state: x.state, months: months(x.yearsAwake) })),
    burden: h.burden ? { state: h.burden.state, turned: { name: h.burden.item.turned.name, text: h.burden.item.turned.text } } : null,
    legacies: h.legacies.map((l) => ({ id: l.id, name: l.name, text: l.text, great: !!l.great, effects: l.effects })),
    open: ns.openAmbitions(h).length,
  };
  if (n !== world.player) return v;
  const facts = worldFacts(world, world.heritage!);
  v.ambitions = h.ambitions.map((a) => ({ id: a.item.id, ...ns.ambitionView(a, facts, h.country) }));
  if (h.ask?.kind === "sleep_heyday") v.ask = { kind: "sleep_heyday", options: [h.ask.waking, ...h.ask.awake].map((id) => ({ id, name: heydayName(h, id) })) };
  else if (h.ask) v.ask = { kind: "let_go_legacy", options: [...h.legacies, h.ask.legacy].map((l) => ({ id: l.id, name: l.name })) };
  const era = eraOf({ year: world.date.year, month: world.date.month, day: world.date.day ?? 1 });
  const next = h.counselYear === null ? null : h.counselYear + ns.RULES.ambitions.counsel.cooldown_years;
  v.counsel = { gold: ns.counselGold(era), nextYear: next !== null && next > world.date.year ? next : null };
  return v;
}

const views = new WeakMap<GameHeritage, { key: string; out: (HeritageView | null)[] }>();

/** Every realm's view for the snapshot, worked out again only when heritage or the player changes. */
export function heritageViews(world: World): (HeritageView | null)[] {
  const g = world.heritage;
  if (!g) return [];
  // Progress moves with the world, so the player's view is worked out again each week.
  const key = `${g.version}:${world.player}:${world.date.year}:${world.date.month}:${world.date.day ?? 1}`;
  const hit = views.get(g);
  if (hit?.key === key) return hit.out;
  const out = g.realms.map((_, n) => heritageView(world, n));
  views.set(g, { key, out });
  return out;
}

/** Whether the game applies an effect yet: a lever in IN_PLAY over the whole realm (or tax scoped to its lands), not narrowed to one kind of thing. */
export function effectInPlay(e: { lever: string; where?: unknown; [k: string]: unknown }): boolean {
  if (!(e.lever in IN_PLAY) || NARROWING.some((k) => k in e)) return false;
  const where = typeof e.where === "string" ? e.where : "realm";
  return where === "realm" || (e.lever === "tax_reach_pct" && (!where.includes(":") || where.startsWith("terrain:")));
}
