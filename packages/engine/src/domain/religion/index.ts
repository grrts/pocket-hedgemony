import config from "../../../../rules/data/domain/religion.json" with { type: "json" };
import catalogueFaiths from "../../../../rules/data/domain/religion-catalogue-faiths.json" with { type: "json" };

/**
 * Religion (domain/religion/spec.md): the faiths and their relations, the
 * faith mix of each province (pulls, hold, the yearly move), the religion rules
 * on faith buildings, communities and the Faith policy screen, expulsion and
 * the Inquisition, preachers, changing the state faith, holy places, the one
 * rule per faith, faith waves and what religion hands other systems. Balance
 * numbers live in rules/data/domain/religion.json. State is plain data the
 * caller owns.
 */

export type ReligionConfig = typeof config;
export const religionConfig: ReligionConfig = config;

export type Policy = "established" | "tolerated" | "restricted" | "persecuted";
const POLICY_RANK: Record<Policy, number> = { established: 0, tolerated: 1, restricted: 2, persecuted: 3 };

interface FaithRow {
  family: string;
  house: string[] | null;
  clergy_marry?: boolean;
  carried_by_trade?: boolean;
  rooted?: boolean;
  layered?: boolean;
  rules?: string[];
}
const FAITHS = config.faiths as Record<string, FaithRow>;

// ---------------------------------------------------------------- 5.1 faiths and relations

/** Faith ids: the event tree's `religions` plus hussite, jain and asian_traditional (RELG-001). */
export function faithIds(): string[] {
  return [...config.event_tree_religions, ...config.added_faiths.religions];
}

function row(faith: string): FaithRow {
  const r = FAITHS[faith];
  if (!r) throw new Error(`unknown faith ${faith}`);
  return r;
}

/** Is this a faith id (RELG-004: Yazidi, Druze and Zoroastrian are not). */
export function isFaith(id: string): boolean {
  return FAITHS[id] !== undefined && faithIds().includes(id);
}

/** Named minorities kept only in the catalogue (RELG-004). */
export function catalogueMinorities(): string[] {
  return [...config.catalogue_minorities_not_faiths];
}

/** The family of a faith (RELG-002). */
export function familyOf(faith: string): string {
  return row(faith).family;
}

/** Do the clergy of a faith marry (RELG-041). */
export function clergyMarry(faith: string): boolean {
  return row(faith).clergy_marry === true;
}

export function hasRule(faith: string, rule: string): boolean {
  return (row(faith).rules ?? []).includes(rule);
}

/** The five traditional faiths are rooted (RELG-007). */
export function isRooted(faith: string): boolean {
  return row(faith).rooted === true;
}

/** Kin faiths: the same family, never `none` (RELG-008); hussite is kin of protestant once the Reformation starts (RELG-089). */
export function isKin(a: string, b: string): boolean {
  return a !== b && familyOf(a) !== "none" && familyOf(a) === familyOf(b);
}

/**
 * Layered faiths (RELG-005): the layered group with each other, and a traditional
 * faith with any faith it has shared a province with for 100 years.
 */
export function isLayered(a: string, b: string, yearsTogether = 0): boolean {
  if (a === b) return false;
  const g = config.relations.layered_group;
  if (g.includes(a) && g.includes(b)) return true;
  return (isRooted(a) || isRooted(b)) && yearsTogether >= config.relations.traditional_layers_after_years;
}

/** Layered faiths do not pull against each other (RELG-006). */
export function pullAgainst(a: string, b: string, yearsTogether = 0): boolean {
  return a !== b && !isLayered(a, b, yearsTogether);
}

/** Hold of a faith: share × 4, × 8 for a rooted faith (RELG-020). */
export function hold(faith: string, share: number): number {
  return share * (isRooted(faith) ? config.mix.rooted_hold_per_share : config.mix.hold_per_share);
}

// ---------------------------------------------------------------- realm and province state

export interface Preacher {
  id: string;
  faith: string;
  /** Province he stands in, or null while at home. */
  at: string | null;
  years: number;
  where?: Destination;
}

export interface RealmFaith {
  id: string;
  stateFaith: string;
  /** One row per faith present; a faith without a row counts as Tolerated. */
  policies: Record<string, Policy>;
  /** Changes waiting for the next New Year (RELG-055). */
  pending: Record<string, Policy>;
  /** The realm's choice for Persecuted faiths' houses (D-RELG-13: one choice per realm). */
  persecutedHouses: "close" | "take_over";
  inquisition: boolean;
  lastAdoptByDecision: number | null;
  purses: Record<string, number>;
  flags: string[];
  preachers: Preacher[];
  /** Preachers granted by events: amount, faith and the year they lapse (null = permanent). */
  grants: { faith: string; amount: number; until: number | null }[];
  /** Government form id (government v2: feudal_realm, merchant_republic …), for the Inquisition (D-RELG-8). */
  government: string;
  /** Inside the Empire (cuius regio). */
  empire: boolean;
  /** Faiths expelled: their *Persecuted* grievance has ended (RELG-061). */
  expelled: string[];
  modifiers: string[];
  personality?: string;
}

export function newRealm(id: string, stateFaith: string, init: Partial<RealmFaith> = {}): RealmFaith {
  return {
    id,
    stateFaith,
    policies: { [stateFaith]: "established" },
    pending: {},
    persecutedHouses: "close",
    inquisition: false,
    lastAdoptByDecision: null,
    purses: {},
    flags: [],
    preachers: [],
    grants: [],
    government: "feudal_realm",
    empire: false,
    expelled: [],
    modifiers: [],
    ...init,
  };
}

export type BuildingKind = "house" | "minority" | "monastery" | "school" | "shrine";

export interface FaithBuilding {
  faith: string;
  kind: BuildingKind;
  /** House of worship step 1–3, or 4 for a landmark. */
  step?: number;
  /** Fewer than half its clergy: half pull (RELG-010, RELG-040). */
  fallow?: boolean;
  /** A monastery with student seats counts as a school too (RELG-031). */
  seats?: boolean;
  monasticLand?: boolean;
  burned?: boolean;
  closed?: boolean;
  /** In a lord's land, for loyalty. */
  lord?: string;
}

export interface ProvinceFaith {
  id: string;
  owner: string;
  /** Faith shares, at most three, summing to 1 (INV-RELG-3). */
  mix: Record<string, number>;
  people: number;
  buildings: FaithBuilding[];
  /** Faith of each preacher stationed here. */
  preachers: string[];
  capital: boolean;
  lordFaith: string | null;
  /** Traders passing a year from markets where a faith is the majority. */
  tradersFrom: Record<string, number>;
  chaplain: boolean;
  /** Faiths with a *Faith tolerance* charter here (RELG-057). */
  charters: string[];
  presses: number;
  /** Schools of no particular faith, counted by Protestant print and school pull and by wave carriers. */
  schools: number;
  towns: string[];
  tradersPassing: number;
  armies: string[];
  /** Faith of each landmark house of the owner's realm within 3 rings (RELG-028). */
  landmarksNear: string[];
  /** Years a traditional faith has shared the province with another (layering). */
  together: Record<string, number>;
  /** Years since a Persecuted faith's houses here were closed (hidden believers). */
  closedYearsAgo: Record<string, number>;
  /** Active waves that have reached this province. */
  waves: string[];
}

export function newProvince(id: string, owner: string, mix: Record<string, number>, init: Partial<ProvinceFaith> = {}): ProvinceFaith {
  return {
    id,
    owner,
    mix: { ...mix },
    people: 100000,
    buildings: [],
    preachers: [],
    capital: false,
    lordFaith: null,
    tradersFrom: {},
    chaplain: false,
    charters: [],
    presses: 0,
    schools: 0,
    towns: [],
    tradersPassing: 0,
    armies: [],
    landmarksNear: [],
    together: {},
    closedYearsAgo: {},
    waves: [],
    ...init,
  };
}

/** The policy row of a faith in a realm (the state faith is Established). */
export function policyOf(r: RealmFaith, faith: string): Policy {
  if (faith === r.stateFaith) return "established";
  return r.policies[faith] ?? "tolerated";
}

/** The policy in force in a province: a *Faith tolerance* charter makes it Tolerated (RELG-057). */
export function policyIn(r: RealmFaith, p: ProvinceFaith, faith: string): Policy {
  const pol = policyOf(r, faith);
  return pol !== "established" && p.charters.includes(faith) ? "tolerated" : pol;
}

function standing(b: FaithBuilding): boolean {
  return !b.burned && !b.closed;
}

// ---------------------------------------------------------------- 5.3 faith buildings

/** Pull of one faith building for its faith (RELG-010, RELG-028, RELG-030 to RELG-033, RELG-040). */
export function buildingPull(b: FaithBuilding): number {
  if (!standing(b)) return 0;
  const p = config.pull;
  let v: number;
  switch (b.kind) {
    case "house":
      v = (b.step ?? 1) >= 4 ? p.landmark_house.here : (p.house_steps[(b.step ?? 1) - 1] ?? 0);
      break;
    case "minority":
      v = p.minority_house;
      break;
    case "monastery":
      v = p.monastery + (b.seats ? p.school_of_faith : 0);
      break;
    case "school":
      v = p.school_of_faith;
      break;
    case "shrine":
      v = p.pilgrimage_shrine;
      break;
  }
  return b.fallow ? v * p.fallow_multiplier : v;
}

/** Does a building serve its faith's community: all but the religious school (RELG-028 to RELG-033). */
export function serves(b: FaithBuilding): boolean {
  return standing(b) && b.kind !== "school";
}

/** Pull of a landmark house in another province of its owner's realm: 0.5 within 3 rings (RELG-028). */
export function landmarkPullAt(rings: number, sameRealm: boolean): number {
  const l = config.pull.landmark_house;
  if (rings === 0) return l.here;
  return sameRealm && rings <= l.realm_within_rings ? l.there : 0;
}

/** A house of worship may be built for any faith present (RELG-029). */
export function mayBuildHouse(p: ProvinceFaith, faith: string): boolean {
  return (p.mix[faith] ?? 0) > 0 && row(faith).house !== null;
}

/** A minority house needs a tenth of the people or a *Faith tolerance* charter (RELG-030). */
export function mayBuildMinorityHouse(p: ProvinceFaith, faith: string): boolean {
  return (p.mix[faith] ?? 0) >= config.houses.minority_house_needs_share || p.charters.includes(faith);
}

export interface TakeOver {
  cost: number;
  gold: number;
  spark: string;
  /** Lords of the old faith lose this many loyalty steps (RELG-034). */
  oldFaithLords: number;
  from: string;
  to: string;
}

/**
 * Converts a house to another faith (RELG-034, RELG-035, RELG-086, RELG-096):
 * half the build cost, the pull flips, the property's gold is paid (twice for
 * Catholic and Orthodox monastic land), an "insult to faith" spark, old-faith lords waver.
 */
export function takeOver(b: FaithBuilding, to: string, buildCost: number): TakeOver {
  const from = b.faith;
  const g = config.houses.take_over_gold;
  const monastic = b.monasticLand && hasRule(from, "monastic_land") ? config.faith_rules.monastic_land.take_over_gold_multiplier : 1;
  const gold = g.per_step * Math.max(1, b.step ?? 1) * monastic;
  b.faith = to;
  return { cost: buildCost * config.houses.convert_cost_share_of_build, gold, spark: config.houses.take_over_spark, oldFaithLords: config.houses.take_over_old_faith_lords, from, to };
}

/** Tithes: 1 gold a year per 10,000 people of a faith, into its purse (RELG-036); seized when Persecuted (RELG-038). */
export function payTithes(r: RealmFaith, peopleByFaith: Record<string, number>): Record<string, number> {
  const paid: Record<string, number> = {};
  for (const [faith, n] of Object.entries(peopleByFaith)) {
    if (policyOf(r, faith) === "persecuted") {
      r.purses[faith] = 0;
      continue;
    }
    const g = (n / 10000) * config.houses.tithe_gold_per_10000_people;
    r.purses[faith] = (r.purses[faith] ?? 0) + g;
    paid[faith] = g;
  }
  return paid;
}

/** May a faith's clergy build new houses: not when Restricted or Persecuted (RELG-037, RELG-048). */
export function clergyMayBuild(r: RealmFaith, faith: string): boolean {
  const pol = policyOf(r, faith);
  return pol === "established" || pol === "tolerated";
}

/** A preacher 10 years in a province with no house of his faith founds a step-1 house (RELG-039). */
export function preacherFoundsHouse(p: ProvinceFaith, faith: string, yearsThere: number): FaithBuilding | null {
  if (yearsThere < config.houses.preacher_founds_house_after_years) return null;
  if (p.buildings.some((b) => b.faith === faith && b.kind === "house" && standing(b))) return null;
  const b: FaithBuilding = { faith, kind: "house", step: 1 };
  p.buildings.push(b);
  return b;
}

/** The commands religion takes (spec §6): there is no "convert province" button (RELG-115). */
export const COMMANDS = ["SetFaithPolicy", "SetPersecutedHouses", "Expel", "EstablishInquisition", "CloseInquisition", "ConvertHouse", "BuildFaithBuilding", "SendPreacher", "RecallPreacher", "AdoptFaith", "ExpelForeignPreacher"] as const;

/** What the country card shows of faith: the Faith row only; no faith meter, piety, fervour or unity score (RELG-115). */
export function countryCardFaith(r: RealmFaith, c: { percent: number; otherFaiths: number; preachers: number; holyPlaces: string[] }): { faithRow: string } {
  return { faithRow: faithRow(r, c).text };
}

// ---------------------------------------------------------------- 5.2 pulls

export interface PullSource {
  source: string;
  amount: number;
}

export interface PullContext {
  /** Active faith waves (they add pull where they have reached). */
  waves?: Wave[];
  /** Ruler faiths of the countries named as a wave's `from`, and owners for `rule`. */
  year?: number;
}

function add(out: Record<string, PullSource[]>, faith: string, source: string, amount: number): void {
  if (amount === 0) return;
  (out[faith] ??= []).push({ source, amount });
}

/** Sum of a faith's pull sources. */
export function total(sources: PullSource[] | undefined): number {
  return (sources ?? []).reduce((a, s) => a + s.amount, 0);
}

/**
 * Every faith's pull in a province this year, each with its named sources
 * (RELG-009 to RELG-019, RELG-027, RELG-050, RELG-052, RELG-064, RELG-087).
 */
export function pulls(p: ProvinceFaith, r: RealmFaith, ctx: PullContext = {}): Record<string, PullSource[]> {
  const out: Record<string, PullSource[]> = {};
  const ruler = r.stateFaith;
  const cfg = config.pull;
  let rulerHousesAndPreachers = 0;
  for (const b of p.buildings) {
    const v = buildingPull(b);
    add(out, b.faith, b.kind === "house" ? `house of worship step ${b.step ?? 1}${b.fallow ? " (fallow)" : ""}` : b.kind, v);
    if (b.faith === ruler) rulerHousesAndPreachers += v;
  }
  for (const f of p.landmarksNear) add(out, f, "landmark house nearby", cfg.landmark_house.there);
  for (const f of p.preachers) {
    add(out, f, "preacher", cfg.preacher);
    if (f === ruler) rulerHousesAndPreachers += cfg.preacher;
  }
  if (p.capital) add(out, ruler, "the ruler's capital", cfg.capital);
  if (p.lordFaith) add(out, p.lordFaith, "lord of that faith", cfg.lord_of_faith);
  for (const [f, n] of Object.entries(p.tradersFrom)) if (row(f).carried_by_trade) add(out, f, "traders passing", Math.min(cfg.traders_max, (n / 100) * cfg.traders_per_100));
  if ((p.mix["protestant"] ?? 0) > 0) {
    const pr = config.faith_rules.print_and_school_pull;
    add(out, "protestant", "presses and schools", p.presses * pr.per_press + p.schools * pr.per_school);
  }
  for (const [f, sh] of Object.entries(p.mix)) if (isRooted(f) && sh >= config.mix.rooted_sacred_places_min_share) add(out, f, "sacred places", config.mix.rooted_sacred_places_pull);
  for (const w of ctx.waves ?? []) if (p.waves.includes(w.id)) add(out, w.faith, `wave ${w.id}`, wavePull(w, p));
  if (p.chaplain) add(out, ruler, "Chaplain", rulerHousesAndPreachers * (cfg.chaplain_multiplier - 1));
  const others = Object.keys(p.mix).filter((f) => f !== ruler);
  if (others.some((f) => policyIn(r, p, f) === "restricted")) add(out, ruler, "Restricted faith escapes the tax", cfg.restricted_escape_tax);
  if (r.inquisition && others.some((f) => (p.mix[f] ?? 0) >= config.communities.min_share && ["restricted", "persecuted"].includes(policyIn(r, p, f)))) add(out, ruler, "Inquisition", cfg.inquisition);
  if (others.some((f) => policyIn(r, p, f) === "persecuted")) add(out, ruler, "persecution", total(out[ruler]) * (cfg.persecution_multiplier - 1));
  return out;
}

/** Pull of each faith as one number. */
export function pullTotals(p: ProvinceFaith, r: RealmFaith, ctx: PullContext = {}): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [f, s] of Object.entries(pulls(p, r, ctx))) out[f] = total(s);
  return out;
}

// ---------------------------------------------------------------- the yearly move

/** Target shares: (hold + pull) ÷ (all holds + all pulls), or null when nothing pulls (RELG-021, RELG-022). */
export function targets(mix: Record<string, number>, pull: Record<string, number>): Record<string, number> | null {
  const faiths = new Set([...Object.keys(mix), ...Object.keys(pull).filter((f) => (pull[f] ?? 0) > 0)]);
  const allPull = [...faiths].reduce((a, f) => a + (pull[f] ?? 0), 0);
  if (allPull <= 0) return null;
  const sum = [...faiths].reduce((a, f) => a + hold(f, mix[f] ?? 0) + (pull[f] ?? 0), 0);
  const out: Record<string, number> = {};
  for (const f of faiths) out[f] = (hold(f, mix[f] ?? 0) + (pull[f] ?? 0)) / sum;
  return out;
}

/** Moves each share 3 % of the way toward its target (RELG-021). */
export function moveMix(mix: Record<string, number>, pull: Record<string, number>): Record<string, number> {
  const t = targets(mix, pull);
  if (!t) return { ...mix };
  const out: Record<string, number> = {};
  for (const [f, target] of Object.entries(t)) out[f] = (mix[f] ?? 0) + config.mix.drift_per_year * (target - (mix[f] ?? 0));
  return out;
}

function normalise(mix: Record<string, number>): Record<string, number> {
  const s = Object.values(mix).reduce((a, b) => a + b, 0);
  const out: Record<string, number> = {};
  for (const [f, v] of Object.entries(mix)) out[f] = s > 0 ? v / s : 0;
  return out;
}

/** Does a faith keep the hidden-believer floor in a province (RELG-025). */
export function hiddenFloorApplies(p: ProvinceFaith, r: RealmFaith, faith: string): boolean {
  const ago = p.closedYearsAgo[faith];
  return ago !== undefined && ago < config.mix.hidden_believers_years && !r.inquisition;
}

/**
 * Small shares after the move (RELG-023, RELG-025): a faith under 1 % with no
 * house of its own goes, unless held at the 2 % hidden-believer floor; at most
 * three faiths stay, a newcomer only if larger than the smallest (RELG-024).
 */
export function settleSmallShares(p: ProvinceFaith, r: RealmFaith): string[] {
  const removed: string[] = [];
  const floor = config.mix.hidden_believers_floor;
  for (const f of Object.keys(p.mix)) {
    if (hiddenFloorApplies(p, r, f) && (p.mix[f] ?? 0) < floor) {
      const rest = 1 - floor;
      const others = Object.entries(p.mix).filter(([g]) => g !== f);
      const sumOthers = others.reduce((a, [, v]) => a + v, 0);
      for (const [g, v] of others) p.mix[g] = sumOthers > 0 ? (v / sumOthers) * rest : 0;
      p.mix[f] = floor;
    }
  }
  for (const [f, v] of Object.entries(p.mix)) {
    if (v >= config.mix.vanish_below || hiddenFloorApplies(p, r, f)) continue;
    if (p.buildings.some((b) => b.faith === f && standing(b))) continue;
    delete p.mix[f];
    removed.push(f);
  }
  const sorted = Object.entries(p.mix).sort((a, b) => b[1] - a[1]);
  for (const [f] of sorted.slice(config.mix.max_faiths_per_province)) {
    delete p.mix[f];
    removed.push(f);
  }
  const sum = Object.values(p.mix).reduce((a, b) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) p.mix = normalise(p.mix);
  return removed;
}

/** One year of the faith mix in a province (RELG-009, RELG-021 to RELG-025). */
export function yearMix(p: ProvinceFaith, r: RealmFaith, ctx: PullContext = {}): { before: Record<string, number>; pulls: Record<string, PullSource[]>; removed: string[] } {
  const before = { ...p.mix };
  const ps = pulls(p, r, ctx);
  const totals: Record<string, number> = {};
  for (const [f, s] of Object.entries(ps)) totals[f] = total(s);
  // A faith with pull but no people yet is "arriving": it enters only as one of three.
  const moved = moveMix(p.mix, totals);
  const present = Object.entries(moved).filter(([f, v]) => (p.mix[f] ?? 0) > 0 || v > 0);
  p.mix = Object.fromEntries(present);
  const removed = settleSmallShares(p, r);
  for (const f of Object.keys(p.closedYearsAgo)) p.closedYearsAgo[f] = (p.closedYearsAgo[f] ?? 0) + 1;
  return { before, pulls: ps, removed };
}

/**
 * Movers shift the mix by their headcount at once, outside the pulls (RELG-026).
 * A fourth faith enters only if larger than the smallest of the three; whichever
 * group is the smallest of the four joins the majority faith (RELG-024, D-RELG-17,
 * the same rule as culture's fourth tongue).
 */
export function moversArrive(p: ProvinceFaith, arrivals: Record<string, number>): void {
  const people: Record<string, number> = {};
  for (const [f, sh] of Object.entries(p.mix)) people[f] = sh * p.people;
  let all = p.people;
  for (const [f, n] of Object.entries(arrivals)) {
    all += n;
    if (people[f] === undefined && Object.keys(people).length >= config.mix.max_faiths_per_province) {
      const major = Object.entries(people).sort((a, b) => b[1] - a[1])[0]![0];
      const [smallest, k] = Object.entries(people).sort((a, b) => a[1] - b[1])[0]!;
      if (n <= k) {
        people[major] = (people[major] ?? 0) + n;
        continue;
      }
      delete people[smallest];
      people[major] = (people[major] ?? 0) + k;
    }
    people[f] = (people[f] ?? 0) + n;
  }
  p.people = all;
  p.mix = normalise(people);
}

// ---------------------------------------------------------------- 5.4 communities

/** A faith with at least 10 % of the people is a community (RELG-042). */
export function isCommunity(p: ProvinceFaith, faith: string): boolean {
  return (p.mix[faith] ?? 0) >= config.communities.min_share;
}

/**
 * Served (RELG-043, RELG-044, RELG-006, RELG-007, RELG-008): Tolerated or
 * Restricted, and a house of its own, or of a kin faith if under 20 %, or none
 * needed because rooted or layered with the ruler's faith.
 */
export function isServed(p: ProvinceFaith, r: RealmFaith, faith: string): boolean {
  const pol = policyIn(r, p, faith);
  if (pol === "established") return true;
  if (pol === "persecuted") return false;
  if (isRooted(faith)) return true;
  if (isLayered(faith, r.stateFaith, p.together[faith] ?? p.together[r.stateFaith] ?? 0)) return true;
  if (p.buildings.some((b) => b.faith === faith && serves(b))) return true;
  return (p.mix[faith] ?? 0) < config.relations.kin_serves_community_below && p.buildings.some((b) => isKin(b.faith, faith) && serves(b));
}

/** Is a Restricted, served majority protected by a Muslim ruler (RELG-090). */
function protectedCommunity(p: ProvinceFaith, r: RealmFaith, faith: string): boolean {
  return hasRule(r.stateFaith, "protected_communities") && isServed(p, r, faith);
}

/**
 * Faith grievances of a province (RELG-046, RELG-047, RELG-052, RELG-058, RELG-061):
 * *Wrong faith* where a community of another faith is a third or more and unserved,
 * or Restricted where it is the majority (unless protected or chartered);
 * *Persecuted* (counting two) where a Persecuted faith is 10 % or more.
 */
export function faithGrievances(p: ProvinceFaith, r: RealmFaith): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [f, sh] of Object.entries(p.mix)) {
    if (f === r.stateFaith || !isCommunity(p, f)) continue;
    const pol = policyIn(r, p, f);
    if (pol === "persecuted") {
      if (!r.expelled.includes(f)) out["Persecuted"] = config.policies.persecuted.grievance_weight;
      continue;
    }
    if (p.charters.includes(f)) continue;
    const unservedThird = sh >= config.communities.wrong_faith_min_share && !isServed(p, r, f);
    const restrictedMajority = pol === "restricted" && config.policies.restricted.wrong_faith_where_majority && sh > 0.5 && !protectedCommunity(p, r, f);
    if (unservedThird || restrictedMajority) out["Wrong faith"] = 1;
  }
  return out;
}

/** Faith tax multiplier: Restricted pays 25 % more, Persecuted pays none (RELG-050, RELG-052). */
export function faithTaxMultiplier(r: RealmFaith, faith: string): number {
  const pol = policyOf(r, faith);
  return pol === "restricted" ? 1 + config.policies.restricted.faith_tax : pol === "persecuted" ? 0 : 1;
}

/** The Faith policy screen: one row per faith present, exactly one Established (RELG-045). */
export function policyScreen(r: RealmFaith, faithsPresent: string[]): { faith: string; policy: Policy }[] {
  const all = [r.stateFaith, ...faithsPresent.filter((f) => f !== r.stateFaith)];
  return all.map((f) => ({ faith: f, policy: policyOf(r, f) }));
}

// ---------------------------------------------------------------- policy changes

export interface Lord {
  name: string;
  faith: string;
  pious?: boolean;
  clergy?: boolean;
  /** Pious lords of the state faith wavering steps applied so far (negative = lost). */
  steps?: number;
}

/** Sets a policy row, taking effect at the next New Year (RELG-055); a secular state may only Tolerate or Restrict (RELG-095). */
export function setPolicy(r: RealmFaith, faith: string, policy: Exclude<Policy, "established">): boolean {
  if (faith === r.stateFaith) return false;
  if (hasRule(r.stateFaith, "secular_state") && !(config.faith_rules.secular_state.allowed_policies as string[]).includes(policy)) return false;
  r.pending[faith] = policy;
  return true;
}

/** The date a change made now takes effect: the next New Year. */
export function takesEffect(year: number): { year: number; month: number; day: number } {
  return { year: year + 1, month: 1, day: 1 };
}

export interface PolicyWorld {
  provinces: ProvinceFaith[];
  lords: Lord[];
  /** Share of the realm's people of each faith. */
  realmShare: Record<string, number>;
  /** Rulers on the realm's border, with their state faith. */
  borderRulers: { id: string; faith: string }[];
}

export interface PolicyChanged {
  faith: string;
  old: Policy;
  new: Policy;
  /** Provinces where a faith-rising spark is raised (RELG-056). */
  sparks: string[];
  /** Loyalty steps by lord name (RELG-049, RELG-051, RELG-066). */
  lordSteps: Record<string, number>;
  /** Rulers who gain *Defend the faith* against the realm (RELG-054). */
  defendTheFaith: string[];
  housesClosed: number;
  housesTakenOver: number;
  purseSeized: boolean;
}

/** Applies a policy change now with all its effects (RELG-048 to RELG-058, RELG-088). */
export function applyPolicy(r: RealmFaith, faith: string, to: Policy, w: PolicyWorld): PolicyChanged {
  const old = policyOf(r, faith);
  // Pious lords waver once, when the faith is set to Tolerated; a Tolerated faith that later grows past 10 % moves no one (D-RELG-21).
  const newlyTolerated = r.policies[faith] !== "tolerated";
  r.policies[faith] = to;
  const lives = w.provinces.filter((p) => (p.mix[faith] ?? 0) > 0);
  const ev: PolicyChanged = { faith, old, new: to, sparks: [], lordSteps: {}, defendTheFaith: [], housesClosed: 0, housesTakenOver: 0, purseSeized: false };
  if (config.policies.harsher_step_is_spark && POLICY_RANK[to] > POLICY_RANK[old]) ev.sparks = lives.map((p) => p.id);
  const crownChurch = hasRule(r.stateFaith, "crown_heads_church");
  const step = (l: Lord, n: number) => {
    if (n === 0) return;
    if (crownChurch && l.clergy && l.faith === r.stateFaith) return;
    ev.lordSteps[l.name] = (ev.lordSteps[l.name] ?? 0) + n;
  };
  for (const l of w.lords) {
    if (l.faith === faith && to === "restricted") step(l, config.policies.restricted.their_lords_loyalty_steps);
    if (l.faith === faith && to === "persecuted") step(l, config.policies.persecuted.their_lords_loyalty_steps);
    if (to === "tolerated" && newlyTolerated && l.faith === r.stateFaith && (l.pious || l.clergy) && (w.realmShare[faith] ?? 0) >= config.policies.tolerated.pious_lords_waver_if_faith_share_of_realm) step(l, config.lords.pious_or_clergy_on_toleration);
  }
  if (to === "persecuted") {
    r.purses[faith] = 0;
    ev.purseSeized = true;
    if (!r.flags.includes(config.policies.persecuted.sets_flag)) r.flags.push(config.policies.persecuted.sets_flag);
    for (const p of w.provinces)
      for (const b of p.buildings)
        if (b.faith === faith && standing(b)) {
          if (r.persecutedHouses === "close") {
            b.closed = true;
            ev.housesClosed++;
            p.closedYearsAgo[faith] = 0;
          } else {
            b.faith = r.stateFaith;
            ev.housesTakenOver++;
            p.closedYearsAgo[faith] = 0;
          }
        }
    ev.defendTheFaith = w.borderRulers.filter((x) => x.faith === faith).map((x) => x.id);
  }
  if (old === "persecuted" && to !== "persecuted" && r.flags.includes(config.policies.persecuted.sets_flag) && !Object.values(r.policies).includes("persecuted")) r.flags = r.flags.filter((f) => f !== config.policies.persecuted.sets_flag);
  return ev;
}

/** At New Year the pending changes take effect (RELG-055). */
export function newYear(r: RealmFaith, w: PolicyWorld): PolicyChanged[] {
  const out: PolicyChanged[] = [];
  for (const [f, pol] of Object.entries(r.pending)) out.push(applyPolicy(r, f, pol, w));
  r.pending = {};
  return out;
}

/** Each year 2 % of a Persecuted faith's people flee, craftsmen and scholars first (RELG-053); returns who leaves by class. */
export function flee(classes: Record<string, number>, share: number, first: string[] = ["craftsmen", "scholars"]): Record<string, number> {
  let left = Object.values(classes).reduce((a, b) => a + b, 0) * share;
  const out: Record<string, number> = {};
  for (const c of first) {
    const n = Math.min(left, classes[c] ?? 0);
    if (n > 0) out[c] = n;
    left -= n;
  }
  const rest = Object.entries(classes).filter(([c]) => !first.includes(c));
  const restSum = rest.reduce((a, [, v]) => a + v, 0);
  for (const [c, v] of rest) if (left > 0 && restSum > 0) out[c] = (v / restSum) * left;
  return out;
}

/** People of a Persecuted faith who flee this year (RELG-053). */
export function persecutionFlight(classes: Record<string, number>): Record<string, number> {
  return flee(classes, config.policies.persecuted.flee_per_year);
}

// ---------------------------------------------------------------- lords and faith

export type LordChange =
  | { kind: "policy"; faith: string; to: Policy }
  | { kind: "tolerate"; faith: string; realmShare: number }
  | { kind: "take over"; faith: string }
  | { kind: "build house"; faith: string; inHisLand: boolean }
  | { kind: "state faith"; from: string; to: string };

/** Loyalty steps a lord gains or loses from a faith change (RELG-066, RELG-067). */
export function lordFaithSteps(r: RealmFaith, l: Lord, c: LordChange): number {
  const L = config.lords;
  const crownChurch = hasRule(r.stateFaith, "crown_heads_church") && l.clergy && l.faith === r.stateFaith;
  switch (c.kind) {
    case "policy":
      if (crownChurch || l.faith !== c.faith) return 0;
      return c.to === "restricted" ? config.policies.restricted.their_lords_loyalty_steps : c.to === "persecuted" ? config.policies.persecuted.their_lords_loyalty_steps : 0;
    case "tolerate":
      return !crownChurch && l.faith === r.stateFaith && (l.pious || l.clergy) && c.realmShare >= config.policies.tolerated.pious_lords_waver_if_faith_share_of_realm ? L.pious_or_clergy_on_toleration : 0;
    case "take over":
      return l.faith === r.stateFaith && (l.pious || l.clergy) && c.faith !== r.stateFaith ? L.pious_or_clergy_on_take_over : 0;
    case "build house":
      return c.inHisLand && l.faith === c.faith ? L.build_or_pay_house_of_his_faith : 0;
    case "state faith":
      return l.faith === c.from && c.to !== c.from ? L.state_faith_changes_away : l.faith === c.to ? L.state_faith_changes_to_his : 0;
  }
}

// ---------------------------------------------------------------- 5.5 expulsion and Inquisition

/** *Expel* is offered only on a Persecuted faith (RELG-059). */
export function expelOffered(r: RealmFaith, faith: string): boolean {
  return policyOf(r, faith) === "persecuted";
}

export interface Host {
  realm: RealmFaith;
  distance: number;
  /** Free class slots in the host realm. */
  freeSlots: Record<string, number>;
}

export interface Expulsion {
  host: string | null;
  withinMonths: number;
  /** Refugees by class, and whether each keeps its class (a free slot there). */
  refugees: { class: string; people: number; keepsClass: boolean }[];
  /** People who convert or hide; the hidden-believer floor still applies (RELG-060). */
  stay: number;
  houses: number;
  gold: number;
  bloodshed: string[];
  /** What the expelling realm gains in people and skilled people: never more than zero (RELG-062). */
  expellerGains: { people: number; skilled: number };
  hostGains: { people: number; skilled: number };
}

const SKILLED = ["craftsmen", "scholars", "clerks"];

/**
 * Expels a Persecuted faith (RELG-060 to RELG-062): 70 % leave within a year as
 * refugees to the nearest realm where it is Established or Tolerated, keeping
 * their class where a slot is free; the expeller takes the houses and their
 * gold, the *Persecuted* grievance ends, and *Bloodshed* follows where they lived.
 */
export function expel(r: RealmFaith, faith: string, provinces: ProvinceFaith[], classes: Record<string, number>, hosts: Host[]): Expulsion | null {
  if (!expelOffered(r, faith)) return null;
  const e = config.expulsion;
  const host = [...hosts].filter((h) => ["established", "tolerated"].includes(policyOf(h.realm, faith))).sort((a, b) => a.distance - b.distance)[0] ?? null;
  const refugees = Object.entries(classes).map(([c, n]) => {
    const people = n * e.leave_share;
    return { class: c, people, keepsClass: (host?.freeSlots[c] ?? 0) >= people };
  });
  const leaving = refugees.reduce((a, x) => a + x.people, 0);
  const skilled = refugees.filter((x) => SKILLED.includes(x.class)).reduce((a, x) => a + x.people, 0);
  let houses = 0;
  let gold = 0;
  const lived: string[] = [];
  for (const p of provinces) {
    if ((p.mix[faith] ?? 0) <= 0) continue;
    lived.push(p.id);
    for (const b of p.buildings)
      if (b.faith === faith) {
        houses++;
        gold += config.houses.take_over_gold.per_step * Math.max(1, b.step ?? 1);
        b.faith = r.stateFaith;
      }
    p.closedYearsAgo[faith] ??= 0;
  }
  r.expelled.push(faith);
  return {
    host: host?.realm.id ?? null,
    withinMonths: e.within_months,
    refugees,
    stay: Object.values(classes).reduce((a, b) => a + b, 0) - leaving,
    houses,
    gold,
    bloodshed: e.bloodshed_grievance ? lived : [],
    expellerGains: { people: -leaving, skilled: -skilled },
    hostGains: host ? { people: leaving, skilled } : { people: 0, skilled: 0 },
  };
}

/** The Inquisition: only monarchies (the forms of rule by a house, D-RELG-8) whose Established faith is Catholic (RELG-063). */
export function inquisitionOffered(r: RealmFaith): boolean {
  const a = config.inquisition.allowed_for;
  return r.stateFaith === a.state_faith && a.forms.includes(r.government);
}

export function establishInquisition(r: RealmFaith): boolean {
  if (!inquisitionOffered(r)) return false;
  r.inquisition = true;
  if (!r.flags.includes(config.inquisition.sets_flag)) r.flags.push(config.inquisition.sets_flag);
  return true;
}

/** Closing the Inquisition ends its effects (RELG-065). */
export function closeInquisition(r: RealmFaith): void {
  r.inquisition = false;
  r.flags = r.flags.filter((f) => f !== config.inquisition.sets_flag);
}

/** The Inquisition's yearly cost and the skilled people who leave a province with a Restricted or Persecuted community (RELG-064). */
export function inquisitionYear(r: RealmFaith, p: ProvinceFaith, classes: Record<string, number>): { upkeep: number; leave: Record<string, number> } {
  if (!r.inquisition) return { upkeep: 0, leave: {} };
  const hit = Object.keys(p.mix).some((f) => f !== r.stateFaith && isCommunity(p, f) && ["restricted", "persecuted"].includes(policyIn(r, p, f)));
  const leave: Record<string, number> = {};
  if (hit) for (const c of ["scholars", "craftsmen"]) leave[c] = (classes[c] ?? 0) * config.inquisition.skilled_leave_per_year;
  return { upkeep: config.inquisition.upkeep_gold_per_year, leave };
}

// ---------------------------------------------------------------- 5.7 preachers

/**
 * Preachers of the state faith (RELG-068): one per monastery or religious
 * school of the state faith, one per 5 houses, one per holy place held of its
 * faith, plus event grants still running.
 */
export function preacherCount(r: RealmFaith, c: { monasteries: number; schools: number; houses: number; holyPlaces: number }, year = 0): number {
  const per = config.houses.preacher_per_monastery_or_religious_school;
  const granted = r.grants.filter((g) => g.faith === r.stateFaith && (g.until === null || year < g.until)).reduce((a, g) => a + g.amount, 0);
  return (c.monasteries + c.schools) * per + Math.floor(c.houses / config.preachers.per_houses_of_state_faith) + c.holyPlaces * config.preachers.per_holy_place_held + granted;
}

/** The `preachers` effect: extra preachers of a faith (default the state faith) for some years, 0 = permanent (RELG-103). */
export function grantPreachers(r: RealmFaith, amount: number, years: number, year: number, faith?: string): void {
  r.grants.push({ faith: faith ?? r.stateFaith, amount, until: years === 0 ? null : year + years });
}

export type Destination = "own" | "subject" | "foreign with leave" | "foreign without leave";

/** Where a preacher may go and what he risks (RELG-069 to RELG-071). */
export function preacherMayGo(d: Destination): { may: boolean; travelsLike: "envoy"; needsPermission: boolean; expelChancePerYear: number } {
  return { may: true, travelsLike: "envoy", needsPermission: false, expelChancePerYear: d === "foreign without leave" ? config.preachers.foreign_without_leave_expel_chance_per_year : 0 };
}

/** Sends a preacher; on arrival he adds 2 pull a year for his faith (RELG-069). */
export function sendPreacher(r: RealmFaith, preacher: Preacher, to: ProvinceFaith, d: Destination): void {
  preacher.at = to.id;
  preacher.where = d;
  preacher.years = 0;
  to.preachers.push(preacher.faith);
  if (!r.preachers.includes(preacher)) r.preachers.push(preacher);
}

/** A ruler expels or executes a preacher who came without leave (RELG-071, RELG-105). */
export function expelForeignPreacher(sender: RealmFaith, host: RealmFaith, preacher: Preacher, at?: ProvinceFaith): { flag: string; defendTheFaith: { holder: string; against: string } } {
  sender.preachers = sender.preachers.filter((x) => x !== preacher);
  if (at) {
    const i = at.preachers.indexOf(preacher.faith);
    if (i >= 0) at.preachers.splice(i, 1);
  }
  const flag = config.preachers.sets_flag_when_expelled;
  if (!host.flags.includes(flag)) host.flags.push(flag);
  return { flag, defendTheFaith: { holder: sender.id, against: host.id } };
}

/** A preacher recalled or killed is lost (RELG-072). */
export function losePreacher(r: RealmFaith, preacher: Preacher): void {
  r.preachers = r.preachers.filter((x) => x !== preacher);
}

/** A preacher of a Persecuted faith inside the realm leads a faith rising there (RELG-073). */
export function leadsRising(r: RealmFaith, preacherFaith: string): boolean {
  return policyOf(r, preacherFaith) === "persecuted";
}

// ---------------------------------------------------------------- 5.8 changing the state faith

/** *Adopt a faith* is offered at 30 % of the capital, 40 % of the realm, by an event, or by cuius regio (RELG-074, RELG-079). */
export function adoptOffered(r: RealmFaith, faith: string, c: { capitalShare: number; realmShare: number; eventOffers?: boolean; firedEvents?: string[] }): boolean {
  if (faith === r.stateFaith) return false;
  if (c.eventOffers) return true;
  if (cuiusRegio(r, faith, c.firedEvents ?? [])) return true;
  const s = config.state_faith_change;
  return c.capitalShare >= s.capital_share_min || c.realmShare >= s.realm_share_min;
}

/** Cuius regio: after `peace_of_augsburg`, Empire rulers switch Catholic ↔ Protestant without the test (RELG-079). */
export function cuiusRegio(r: RealmFaith, faith: string, firedEvents: string[]): boolean {
  const s = config.state_faith_change;
  return r.empire && firedEvents.includes(s.cuius_regio_after_event) && s.cuius_regio_faiths.includes(faith) && s.cuius_regio_faiths.includes(r.stateFaith);
}

/** Adoption by decision is refused within 30 years of the last; events are not limited (RELG-078). */
export function adoptAllowed(r: RealmFaith, year: number, byDecision: boolean): boolean {
  return !byDecision || r.lastAdoptByDecision === null || year - r.lastAdoptByDecision >= config.state_faith_change.cooldown_years;
}

export interface Adoption {
  old: string;
  new: string;
  preachersLost: number;
  takenOver: TakeOver[];
  sparks: string[];
  schoolsClosed: number;
  lordSteps: Record<string, number>;
}

/**
 * Adopts a new state faith (RELG-075 to RELG-077): the old faith becomes
 * Tolerated (changeable next New Year), its preachers go, lords move, and the
 * old houses are kept or taken over; its schools are closed or kept.
 */
export function adoptFaith(
  r: RealmFaith,
  faith: string,
  opts: { houses: "keep" | "take_over"; schools: "keep" | "close"; year: number; byDecision: boolean; provinces: ProvinceFaith[]; lords: Lord[]; buildCost?: (b: FaithBuilding) => number },
): Adoption | null {
  if (!adoptAllowed(r, opts.year, opts.byDecision)) return null;
  const old = r.stateFaith;
  r.stateFaith = faith;
  r.policies[old] = "tolerated";
  r.policies[faith] = "established";
  delete r.pending[old];
  const lost = r.preachers.filter((x) => x.faith === old).length;
  r.preachers = r.preachers.filter((x) => x.faith !== old);
  for (const p of opts.provinces) p.preachers = p.preachers.filter((f) => f !== old);
  if (opts.byDecision) r.lastAdoptByDecision = opts.year;
  const takenOver: TakeOver[] = [];
  const sparks: string[] = [];
  let schoolsClosed = 0;
  for (const p of opts.provinces)
    for (const b of p.buildings) {
      if (b.faith !== old || !standing(b)) continue;
      if (b.kind === "school") {
        if (opts.schools === "close") {
          b.closed = true;
          schoolsClosed++;
        }
        continue;
      }
      if (opts.houses === "take_over") {
        takenOver.push(takeOver(b, faith, opts.buildCost?.(b) ?? 0));
        if (!sparks.includes(p.id)) sparks.push(p.id);
      }
    }
  const lordSteps: Record<string, number> = {};
  for (const l of opts.lords) {
    const n = lordFaithSteps(r, l, { kind: "state faith", from: old, to: faith });
    if (n) lordSteps[l.name] = n;
  }
  return { old, new: faith, preachersLost: lost, takenOver, sparks, schoolsClosed, lordSteps };
}

/** Preachers of the state faith from its houses, schools and monasteries: none until houses of a new faith exist (RELG-075). */
export function preacherCountFrom(r: RealmFaith, provinces: ProvinceFaith[], holyPlacesHeld: number, year = 0): number {
  const of = provinces.flatMap((p) => p.buildings.filter((b) => b.faith === r.stateFaith && standing(b)));
  return preacherCount(r, { monasteries: of.filter((b) => b.kind === "monastery").length, schools: of.filter((b) => b.kind === "school").length, houses: of.filter((b) => b.kind === "house").length, holyPlaces: holyPlacesHeld }, year);
}

// ---------------------------------------------------------------- 5.9 holy places

export interface HolyPlace {
  id: string;
  name: string;
  faiths: string[];
  province: string;
  holder1444: string | null;
  holderName: string | null;
}

/**
 * Holy places, as config lists them (RELG-080, RELG-084, D-RELG-16): Amritsar only
 * once `sikh_panth_founded` has fired and not before 1577; a place that follows
 * a relic (the Temple of the Tooth) sits in its later province from that year.
 * With no year given, the 1444 places are returned.
 */
export function holyPlaces(firedEvents: string[] = [], year = 1444): HolyPlace[] {
  const names = config.holy_place_names as Record<string, string>;
  const holders = config.holder_names as Record<string, string>;
  type Row = { id: string; faiths: string[]; province: string; holder_1444: string | null; appears_with_event?: string; earliest?: number; moves?: { from_year: number; province: string }[] };
  return (config.holy_places as Row[])
    .filter((h) => !h.appears_with_event || (firedEvents.includes(h.appears_with_event) && year >= (h.earliest ?? 0)))
    .map((h) => {
      const moved = (h.moves ?? []).filter((m) => year >= m.from_year).at(-1);
      return { id: h.id, name: names[h.id] ?? h.id, faiths: h.faiths, province: moved?.province ?? h.province, holder1444: h.holder_1444, holderName: h.holder_1444 ? (holders[h.holder_1444] ?? h.holder_1444) : null };
    });
}

/** Church heads are marked at their holy place, their seat (RELG-085); the heads of the faith rules are RELG-139 onward. */
export function churchHeads(year = 1444): { id: string; name: string; place: string }[] {
  const heads = config.church_heads as unknown as Record<string, { name: string; place: string; from?: number } | string>;
  const out: { id: string; name: string; place: string }[] = [];
  for (const [id, h] of Object.entries(heads)) if (typeof h !== "string" && year >= (h.from ?? 0)) out.push({ id, name: h.name, place: h.place });
  return out;
}

export interface HolyPlaceEffect {
  preachers: number;
  shrine: boolean;
  pilgrimTraders: number;
  /** Rulers of these faiths may use *Defend the faith* against the holder, with the place as prize. */
  defendTheFaithFor: string[];
}

/** What holding a holy place gives (RELG-081 to RELG-083, RELG-110). */
export function holdingEffect(place: HolyPlace, holder: RealmFaith, p?: ProvinceFaith): HolyPlaceEffect {
  const e = config.holy_place_effects;
  if (place.faiths.includes(holder.stateFaith)) return { preachers: e.same_faith.preachers, shrine: true, pilgrimTraders: e.same_faith.pilgrim_traders_per_year, defendTheFaithFor: place.faiths.filter((f) => f !== holder.stateFaith) };
  const served = place.faiths.some((f) => policyOf(holder, f) === e.pilgrims_still_come_if.policy && (!e.pilgrims_still_come_if.house_of_faith_in_province || (p?.buildings.some((b) => b.faith === f && b.kind !== "school" && standing(b)) ?? false)));
  return { preachers: 0, shrine: false, pilgrimTraders: served ? e.same_faith.pilgrim_traders_per_year : 0, defendTheFaithFor: [...place.faiths] };
}

/** Pilgrims of one faith still come to a place held by another faith when it is Tolerated and has a house there (RELG-083). */
export function pilgrimsCome(holder: RealmFaith, faith: string, hasHouse: boolean): boolean {
  if (holder.stateFaith === faith) return true;
  return policyOf(holder, faith) === config.holy_place_effects.pilgrims_still_come_if.policy && hasHouse;
}

// ---------------------------------------------------------------- 5.10 one rule per faith

/** Institutional rules of faith buildings (RELG-091 to RELG-094). */
export function buildingRules(b: FaithBuilding): { traders?: number; homelessSheltered?: number; studentSeats?: number; mayBeLordsLand?: boolean } {
  const r = config.faith_rules;
  if (b.kind === "house" && hasRule(b.faith, "temple_town") && (b.step ?? 1) >= 3) return { traders: r.temple_town.step3_temple_traders_per_year };
  if (b.kind === "house" && hasRule(b.faith, "langar")) return { homelessSheltered: r.langar.homeless_sheltered_per_house };
  if (b.kind === "house" && hasRule(b.faith, "monastery_school")) return { studentSeats: r.monastery_school.student_seats_per_house };
  if (hasRule(b.faith, "lama_lords") && (b.kind === "monastery" || (b.kind === "house" && (b.step ?? 1) >= 3))) return { mayBeLordsLand: r.lama_lords.step3_house_or_monastery_can_be_fief };
  return {};
}

/**
 * Secular pull (RELG-095, D-RELG-15): after 1850, in a town with a factory, in a
 * realm with mass schooling, 0.5 pull for each school.
 */
export function secularPull(year: number, town: { factory: boolean; schools: number }, innovations: string[]): number {
  const s = config.faith_rules.secular_state;
  if (year <= s.town_school_pull_after_year || !town.factory || !innovations.includes(s.needs_innovation)) return 0;
  return town.schools * s.town_school_pull;
}

/**
 * The year Hussites merge (RELG-089, D-RELG-14): the end of the Reformation period
 * or 1620, whichever comes first.
 */
export function hussiteMergeYear(reformationEnds: number | null): number {
  const m = config.faith_rules.merges_into_protestant;
  return reformationEnds === null ? m.merge_latest_year : Math.min(reformationEnds, m.merge_latest_year);
}

/** Merges a province's Hussite share into Protestant, or into Catholic where no Protestant house stands (RELG-089). */
export function mergeHussites(p: ProvinceFaith): string | null {
  const sh = p.mix["hussite"];
  if (sh === undefined) return null;
  const m = config.faith_rules.merges_into_protestant;
  const into = p.buildings.some((b) => b.faith === m.kin_of && b.kind !== "school" && standing(b)) ? m.kin_of : m.else_into;
  delete p.mix["hussite"];
  p.mix[into] = (p.mix[into] ?? 0) + sh;
  for (const b of p.buildings) if (b.faith === "hussite") b.faith = into;
  return into;
}

/** Does a new state faith count as "the ruler takes a reformed faith" for government's reform (D-RELG-9). */
export function takesReformedFaith(oldFaith: string, newFaith: string): boolean {
  const reformed = config.state_faith_change.reformed_faiths;
  return !reformed.includes(oldFaith) && reformed.includes(newFaith);
}

/**
 * Is a court-conversion event offered (D-RELG-5): `court_conversion_islam` when
 * the capital is a third Sunni, `court_conversion_christian` when the realm is
 * 15 % Protestant; never to a ruler already of that faith.
 */
export function courtConversionOffered(event: "court_conversion_islam" | "court_conversion_christian", r: RealmFaith, shares: { capital: number; realm: number }): boolean {
  const t = config.event_triggers[event] as { faith: string; capital_share_min?: number; realm_share_min?: number };
  if (r.stateFaith === t.faith) return false;
  if (t.capital_share_min !== undefined) return shares.capital >= t.capital_share_min;
  return shares.realm >= (t.realm_share_min ?? 1);
}

/** Does a faith have houses of worship at all (`secular` has none, RELG-095). */
export function hasHouses(faith: string): boolean {
  return row(faith).house !== null;
}

// ---------------------------------------------------------------- 5.11 faith waves

export type Carrier = "presses" | "schools" | "towns" | "traders" | "rule" | "army" | "preachers";

export interface Wave {
  id: string;
  faith: string;
  from: string;
  carriers: Carrier[];
  pull: number;
  reachPerYear: number;
  limit: string;
  years?: number;
  untilPeriod?: string;
  startYear: number;
}

const TOWN_SIZES = ["hamlet", "village", "market town", "town", "city", "great city"];

/** Carrier counts in a province (RELG-099). */
export function carrierCount(w: Wave, c: Carrier, p: ProvinceFaith): number {
  switch (c) {
    case "presses":
      return p.presses;
    case "schools":
      return p.schools;
    case "towns": {
      const min = TOWN_SIZES.indexOf(config.waves.town_min_size.replace("_", " "));
      return p.towns.filter((t) => TOWN_SIZES.indexOf(t) >= min).length;
    }
    case "traders":
      return Math.floor(p.tradersPassing / 100);
    case "rule":
      return p.owner === w.from ? 1 : 0;
    case "army":
      return p.armies.includes(w.from) ? 1 : 0;
    case "preachers":
      return p.preachers.filter((f) => f === w.faith).length;
  }
}

/** A wave's pull in a province it has reached: its pull per carrier (RELG-016, RELG-099); it never converts by itself (RELG-100). */
export function wavePull(w: Wave, p: ProvinceFaith): number {
  return w.carriers.reduce((a, c) => a + w.pull * carrierCount(w, c, p), 0);
}

/** Rings a wave has spread after some years, never past its limit (RELG-098). */
export function waveRings(w: Wave, year: number): number {
  return Math.floor(w.reachPerYear * Math.max(0, year - w.startYear));
}

/** Grows a wave: the provinces within its rings and inside its limit are reached (RELG-098). */
export function growWave(w: Wave, year: number, provinces: { p: ProvinceFaith; rings: number; inLimit: boolean }[]): string[] {
  const r = waveRings(w, year);
  const reached: string[] = [];
  for (const { p, rings, inLimit } of provinces) {
    if (!inLimit || rings > r) continue;
    if (!p.waves.includes(w.id)) p.waves.push(w.id);
    reached.push(p.id);
  }
  return reached;
}

/** Is a wave still running (by years or until its period ends). */
export function waveActive(w: Wave, year: number, activePeriods: string[] = []): boolean {
  if (w.untilPeriod !== undefined) return activePeriods.includes(w.untilPeriod);
  return w.years === undefined || year < w.startYear + w.years;
}

interface WaveEffect {
  id: string;
  faith: string;
  from: string;
  carriers: string[];
  pull: number;
  reach_per_year: number;
  limit: string;
  years?: number;
  until_period?: string;
}

function waveFrom(e: WaveEffect, roles: Record<string, string>, year: number): Wave {
  const w: Wave = { id: e.id, faith: e.faith, from: roles[e.from] ?? e.from, carriers: e.carriers as Carrier[], pull: e.pull, reachPerYear: e.reach_per_year, limit: e.limit, startYear: year };
  if (e.years !== undefined) w.years = e.years;
  if (e.until_period !== undefined) w.untilPeriod = e.until_period;
  return w;
}

/** All `immediate` effects an event option adds: the religion patches and the new events (RELG-097, RELG-106). */
export function optionEffects(event: string, option: string): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const p of config.patches as { event: string; option: string; add: Record<string, unknown>[] }[]) if (p.event === event && p.option === option) out.push(...p.add);
  const ev = (config.event_options as Record<string, Record<string, Record<string, unknown>[]>>)[event];
  out.push(...(ev?.[option] ?? []));
  return out;
}

/** The faith waves an event option starts (RELG-097). */
export function wavesOf(event: string, option: string, roles: Record<string, string> = {}, year = 0): Wave[] {
  return optionEffects(event, option)
    .filter((e) => "faith_wave" in e)
    .map((e) => waveFrom(e["faith_wave"] as WaveEffect, roles, year));
}

/** Applies the religion effects of an event option to a realm: `religion`, `faith_policy`, `preachers`, modifiers (RELG-102, RELG-103, RELG-106). */
export function applyOption(r: RealmFaith, event: string, option: string, year: number, world?: { provinces: ProvinceFaith[]; lords: Lord[] }): void {
  for (const e of optionEffects(event, option)) {
    if ("religion" in e) {
      const to = (e["religion"] as { set: string }).set;
      adoptFaith(r, to, { houses: "keep", schools: "keep", year, byDecision: false, provinces: world?.provinces ?? [], lords: world?.lords ?? [] });
    } else if ("faith_policy" in e) {
      const fp = e["faith_policy"] as { faith: string; set: Policy };
      r.policies[fp.faith] = fp.set;
    } else if ("preachers" in e) {
      const pr = e["preachers"] as { faith?: string; amount: number; years: number };
      grantPreachers(r, pr.amount, pr.years, year, pr.faith);
    } else if ("modifier" in e) r.modifiers.push(e["modifier"] as string);
  }
}

/** Event conditions religion provides (RELG-101, RELG-104). */
export const conditions = {
  faith_policy: (r: RealmFaith, faith: string, is: Policy) => policyOf(r, faith) === is,
  holds_holy_place: (who: string, faith: string, holders: Record<string, string>, firedEvents: string[] = []) => holyPlaces(firedEvents).filter((h) => h.faiths.includes(faith) && holders[h.id] === who).length,
  faith_wave_active: (waves: Wave[], id: string, year: number, activePeriods: string[] = []) => waves.some((w) => w.id === id && waveActive(w, year, activePeriods)),
  religion_share: (p: ProvinceFaith, faith: string) => p.mix[faith] ?? 0,
};

/** The engine flags religion sets (RELG-105). */
export const FLAGS = {
  persecution: config.policies.persecuted.sets_flag,
  missionary: config.preachers.sets_flag_when_expelled,
  inquisition: config.inquisition.sets_flag,
};

/** The religion additions to the event tree: the ten new events and their dates. */
export function additionEvents(): Record<string, unknown> {
  return { ...config.event_dates };
}

// ---------------------------------------------------------------- 5.12 the start in 1444

interface CatalogueFaith {
  region: string;
  state_faith: string | null;
  people_majority: string | null;
  communities: string[];
}

/** A country's catalogue faith record (build/catalogue-faiths.json). */
export function catalogueRecord(id: string): CatalogueFaith | undefined {
  return (catalogueFaiths as Record<string, CatalogueFaith>)[id];
}

/**
 * The 1444 state faith and province mix of a record (RELG-107, RELG-108): the
 * ruler's faith at 15 % where the people's majority differs, other communities
 * at 5 %, the majority the rest; at most three faiths.
 */
export function startMix(id: string): { stateFaith: string; mix: Record<string, number> } | null {
  const found = catalogueRecord(id);
  if (!found) return null;
  const s = config.start;
  // Records with no faith id of their own take the faith config names for them (D-RELG-12).
  const override = (s.record_faith_overrides as Record<string, string>)[id];
  const rec: CatalogueFaith = override ? { ...found, state_faith: override, people_majority: override } : found;
  if (!rec.state_faith || !isFaith(rec.state_faith)) return null;
  const majority = rec.people_majority && isFaith(rec.people_majority) ? rec.people_majority : rec.state_faith;
  const mix: Record<string, number> = {};
  if (majority !== rec.state_faith) mix[rec.state_faith] = s.ruler_faith_share_where_people_majority_differs;
  for (const c of rec.communities) {
    if (c === majority || mix[c] !== undefined || !isFaith(c)) continue;
    if (Object.keys(mix).length + 1 >= config.mix.max_faiths_per_province) break;
    mix[c] = s.community_default_share;
  }
  mix[majority] = 1 - Object.values(mix).reduce((a, b) => a + b, 0);
  return { stateFaith: rec.state_faith, mix };
}

/** The region overrides of the start mix (RELG-107): a full mix, or shares added in towns. */
export function startOverride(where: string, base: Record<string, number>, opts: { owner?: string; town?: boolean } = {}): Record<string, number> {
  for (const o of config.start.overrides as { where: string; owner?: string; towns_only?: boolean; mix?: Record<string, number>; mix_add?: Record<string, number> }[]) {
    if (o.where !== where || (o.owner && o.owner !== opts.owner) || (o.towns_only && !opts.town)) continue;
    if (o.mix) return { ...o.mix };
    if (o.mix_add) {
      const added = Object.values(o.mix_add).reduce((a, b) => a + b, 0);
      const out: Record<string, number> = {};
      for (const [f, v] of Object.entries(base)) out[f] = v * (1 - added);
      for (const [f, v] of Object.entries(o.mix_add)) out[f] = (out[f] ?? 0) + v;
      return out;
    }
  }
  return { ...base };
}

// ---------------------------------------------------------------- 5.13 other systems

/** Faith risings demand their faith Tolerated where they hold, or a house of worship there (RELG-109). */
export function risingDemands(faith: string): { tolerated: string; house: string } {
  return { tolerated: `${faith} Tolerated where they hold`, house: `a ${faith} house of worship there` };
}

/** Does a faith rising accept an offer in a Talk (RELG-109). */
export function risingAccepts(faith: string, offer: string): boolean {
  const d = risingDemands(faith);
  return offer === d.tolerated || offer === d.house;
}

/** Facts handed to diplomacy: same faith, and who allows whose preachers (RELG-112). */
export function diplomacyFacts(a: RealmFaith, b: RealmFaith, leave: { from: string; to: string }[]): { sameFaith: boolean; aAllowsB: boolean; bAllowsA: boolean } {
  return { sameFaith: a.stateFaith === b.stateFaith, aAllowsB: leave.some((l) => l.from === a.id && l.to === b.id), bAllowsA: leave.some((l) => l.from === b.id && l.to === a.id) };
}

/** Faith %: people of the state faith or a faith layered with it (RELG-113). */
export function faithPercent(stateFaith: string, people: Record<string, number>, yearsTogether: Record<string, number> = {}): number {
  const all = Object.values(people).reduce((a, b) => a + b, 0);
  let n = 0;
  for (const [f, k] of Object.entries(people)) if (f === stateFaith || isLayered(f, stateFaith, yearsTogether[f] ?? 0)) n += k;
  return all > 0 ? n / all : 0;
}

function title(f: string): string {
  return f.charAt(0).toUpperCase() + f.slice(1).replace(/_/g, " ");
}

/** The country card's Faith row (RELG-117); the card has no faith meter, piety, fervour or unity (RELG-115). */
export function faithRow(r: RealmFaith, c: { percent: number; otherFaiths: number; preachers: number; holyPlaces: string[] }): { text: string; opens: "Faith policy screen" } {
  const holy = c.holyPlaces.length === 0 ? "holds no holy place" : `holds ${c.holyPlaces.join(", ")}`;
  return { text: `${title(r.stateFaith)} · ${c.percent} % of people · ${c.otherFaiths} more faiths · ${c.preachers} preachers · ${holy}`, opens: "Faith policy screen" };
}

export interface FaithLineRow {
  faith: string;
  share: number;
  trend: "rising" | "falling" | "steady";
  pulls: PullSource[];
  community: "served" | "unserved" | "below a community" | "state faith";
  servedBy: string | null;
  policy: Policy;
  grievance: string | null;
}

/** The province card's Faith line, tapped: shares, trends, pulls with sources, communities, and how fast the mix moves (RELG-116, RELG-027). */
export function faithLine(p: ProvinceFaith, r: RealmFaith, ctx: PullContext = {}): { rows: FaithLineRow[]; toward: string | null; pointsPerYear: number } {
  const ps = pulls(p, r, ctx);
  const totals: Record<string, number> = {};
  for (const [f, s] of Object.entries(ps)) totals[f] = total(s);
  const next = moveMix(p.mix, totals);
  const g = faithGrievances(p, r);
  let toward: string | null = null;
  let best = 0;
  const rows = Object.entries(p.mix)
    .sort((a, b) => b[1] - a[1])
    .map(([f, sh]) => {
      const d = (next[f] ?? 0) - sh;
      if (d > best) [toward, best] = [f, d];
      const own = p.buildings.find((b) => b.faith === f && serves(b));
      const community: FaithLineRow["community"] = f === r.stateFaith ? "state faith" : !isCommunity(p, f) ? "below a community" : isServed(p, r, f) ? "served" : "unserved";
      return {
        faith: f,
        share: sh,
        trend: d > 1e-9 ? "rising" : d < -1e-9 ? "falling" : "steady",
        pulls: ps[f] ?? [],
        community,
        servedBy: community === "served" && own ? `its own ${own.kind === "house" ? (row(f).house?.[0] ?? "house") : own.kind}` : null,
        policy: policyIn(r, p, f),
        grievance: community === "below a community" || f === r.stateFaith ? null : (Object.keys(g)[0] ?? null),
      } satisfies FaithLineRow;
    });
  return { rows, toward, pointsPerYear: best * 100 };
}

/** What the Faith lens shows at each zoom (RELG-118). */
export function faithLens(zoom: "world" | "region" | "local"): Record<string, unknown> {
  return { ...config.lens[zoom] };
}

// ---------------------------------------------------------------- 5.15 AI

/** AI house building (RELG-119): a state-faith house where it is below half, gold allowing; a minority's house where it has *Wrong faith* and wavering lords. */
export function aiBuild(goldToSpare: boolean, stateShare: number, minority: { faith: string; wrongFaith: boolean; lordsWavering: boolean } | null, stateFaith: string): string | null {
  if (!goldToSpare) return null;
  if (stateShare < config.ai.build_state_house_where_state_share_below) return stateFaith;
  if (minority?.wrongFaith && minority.lordsWavering) return minority.faith;
  return null;
}

/** AI faith policy (RELG-120): tolerate above 20 % unless zealous; zealous restrict, and persecute only after an event or a war of religion. */
export function aiPolicy(personality: string, realmShare: number, eventOrReligiousWar: boolean): Policy | null {
  const zealous = personality === "zealot" && config.ai.zealous_personalities_restrict;
  if (zealous) return eventOrReligiousWar && config.ai.persecute_only_after_event_or_religious_war ? "persecuted" : "restricted";
  return realmShare > config.ai.tolerate_faith_above_realm_share ? "tolerated" : null;
}

/** AI preachers go first to own provinces where the state faith is under half, then abroad with leave (RELG-121). */
export function aiPreacherTarget(own: { id: string; stateShare: number }[], abroadWithLeave: string[]): string | null {
  const home = own.filter((p) => p.stateShare < 0.5).sort((a, b) => a.stateShare - b.stateShare)[0];
  return home?.id ?? abroadWithLeave[0] ?? null;
}

/** AI adopts a faith only above 60 % of the realm, or when an event offers it (RELG-122). */
export function aiAdopt(realmShare: number, eventOffers: boolean): "adopts" | "may adopt" | "does not adopt" {
  if (realmShare > config.ai.adopt_faith_without_event_above_realm_share) return "adopts";
  return eventOffers ? "may adopt" : "does not adopt";
}
