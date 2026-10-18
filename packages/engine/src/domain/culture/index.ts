import config from "../../../../rules/data/domain/culture.json" with { type: "json" };
import start from "../../../../rules/data/domain/culture-start-1444.json" with { type: "json" };
import { localsBonus } from "../province/index.ts";
import { REGIONS, type Ground } from "../world-map/index.ts";

/**
 * Culture (domain/culture/spec.md): tongues and families, the court tongue,
 * kin / cousin / stranger / trading people, Tongue %, yearly drift, the Tongue
 * policy and the *Own tongue* charter, culture's inputs to other contexts, and
 * how tongues move through history. Balance numbers live in
 * rules/data/domain/culture.json. State is plain data the caller owns.
 */

export type CultureConfig = typeof config;
export const cultureConfig: CultureConfig = config;

export type Relation = "kin" | "cousin" | "stranger" | "trading";
export type TonguePolicy = "let_be" | "teach" | "impose";
export type WayOfLife = "settled" | "herding" | "forest" | "seafaring" | "trading";

export interface Tongue {
  id: string;
  name: string;
  family: string | null;
  way_of_life: WayOfLife;
  diaspora?: boolean;
  merges_into?: string;
  splits_to?: string;
  local_names?: string[];
}

/** The config's tongues, then those the 1444 start adds (CULT-086); a start row with the same id fills in a family the config left open. */
const START_TONGUES = Object.entries(start.tongues as Record<string, Omit<Tongue, "id">>).map(([id, t]) => ({ id, ...t }) as Tongue);
const TONGUES: Tongue[] = [...(config.tongues as Tongue[]), ...(config.tongues_added as Tongue[])].map((t) => START_TONGUES.find((s) => s.id === t.id) ?? t);
for (const t of START_TONGUES) if (!TONGUES.some((x) => x.id === t.id)) TONGUES.push(t);
const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-]+/g, "_");

// ---------------------------------------------------------------- 5.1 tongues and families

/** Every family: the event tree's culture groups plus the four added (CULT-002). */
export function families(): string[] {
  return [...config.families_event_tree, ...config.families_added];
}

/** Every tongue row in config. */
export function tongues(): Tongue[] {
  return TONGUES;
}

/** A tongue by id or name (case and spaces ignored). */
export function tongue(idOrName: string): Tongue | undefined {
  const hit = BY_KEY.get(idOrName);
  if (hit) return hit;
  const k = norm(idOrName);
  const t = TONGUES.find((t) => t.id === k || norm(t.name) === k);
  if (t) BY_KEY.set(idOrName, t);
  return t;
}
/** Tongues already looked up, by the key they were asked for (drift asks for the same few each year). */
const BY_KEY = new Map<string, Tongue>();

/** A tongue that must exist. */
export function mustTongue(idOrName: string): Tongue {
  const t = tongue(idOrName);
  if (!t) throw new Error(`unknown tongue ${idOrName}`);
  return t;
}

/** The family of a tongue (CULT-001). */
export function familyOf(idOrName: string): string | null {
  return mustTongue(idOrName).family;
}

/**
 * Maps catalogue culture strings onto tongues once: a string matches a tongue's
 * name or one of its local names; the rest go to the review list (CULT-004, CULT-005).
 */
export function mapCatalogueStrings(strings: string[]): { tongueOf: Record<string, string>; localName: Record<string, string>; review: string[] } {
  const tongueOf: Record<string, string> = {};
  const localName: Record<string, string> = {};
  const review: string[] = [];
  for (const s of strings) {
    const k = norm(s);
    const t = TONGUES.find((t) => norm(t.name) === k || t.id === k || (t.local_names ?? []).some((n) => norm(n) === k));
    if (t) {
      tongueOf[s] = t.id;
      localName[s] = s;
    } else review.push(s);
  }
  return { tongueOf, localName, review };
}

// ---------------------------------------------------------------- 5.3 kin, cousins, strangers

/** Nationalism at or above which cousins count as strangers (CULT-074). */
export const COUSINS_BECOME_STRANGERS_AT = config.nationalism.cousins_become_strangers_at;

/**
 * How a court sees people of a tongue (CULT-012, CULT-014, CULT-074): kin, a
 * trading people (diaspora), a cousin of the same family (a stranger once the
 * province's nationalism is 0.3 or more), or a stranger.
 */
export function relationTo(court: string, people: string, nationalism = 0): Relation {
  const c = mustTongue(court);
  const p = mustTongue(people);
  if (c.id === p.id) return "kin";
  if (p.diaspora) return "trading";
  // A tongue split abroad stays cousin to the court it split from, and the other way round (CULT-072).
  if (c.splits_to === p.id || p.splits_to === c.id) return nationalism >= COUSINS_BECOME_STRANGERS_AT ? "stranger" : "cousin";
  if (c.family !== null && c.family === p.family) return nationalism >= COUSINS_BECOME_STRANGERS_AT ? "stranger" : "cousin";
  return "stranger";
}

/** Weight of a relation toward Tongue % (config relation.*.tongue_share_weight). */
export function tongueShareWeight(r: Relation): number {
  return config.relation[r].tongue_share_weight;
}

/** Tongue %: (kin + ½ cousins) ÷ realm people, worked out on demand (CULT-013, CULT-088). */
export function tonguePercent(court: string, people: Record<string, number>): number {
  let all = 0;
  let counted = 0;
  for (const [t, n] of Object.entries(people)) {
    all += n;
    counted += n * tongueShareWeight(relationTo(court, t));
  }
  return all > 0 ? counted / all : 0;
}

/** Does this relation give *Foreign rule* in its homeland (config relation.*.foreign_rule; kin never). */
function givesForeignRule(r: Relation): boolean {
  return r === "stranger";
}

// ---------------------------------------------------------------- 5.2 the court tongue

export interface CountryCulture {
  id: string;
  court: string;
  /** Realm-wide Tongue policy; Teach by default (CULT-038). */
  policy: TonguePolicy;
  /** Per-province overrides (CULT-038). */
  overrides: Record<string, TonguePolicy>;
  /** Inventions known, for *Impose* and drift (printing, mass schooling, newspapers, railways). */
  inventions: string[];
  /** Houses married into: their lords count as kin for loyalty (CULT-049). */
  marriedHouses: string[];
}

export function newCountryCulture(id: string, court: string, init: Partial<CountryCulture> = {}): CountryCulture {
  return { id, court: mustTongue(court).id, policy: "teach", overrides: {}, inventions: [], marriedHouses: [], ...init };
}

/** The court tongue at the start: the first catalogue culture that maps to a tongue (CULT-009). */
export function startCourtTongue(cultures: string[]): string | null {
  for (const c of cultures) {
    const t = tongue(c) ?? TONGUES.find((t) => (t.local_names ?? []).some((n) => norm(n) === norm(c)));
    if (t) return t.id;
  }
  return null;
}

export interface CourtTongueChanged {
  country: string;
  old: string;
  new: string;
  /** The music palette follows from the next track (CULT-011). */
  musicPaletteFromNextTrack: true;
}

/** A dynasty of another tongue, an event or *Take their language* sets the court tongue (CULT-010, CULT-011). */
export function setCourtTongue(cc: CountryCulture, to: string): CourtTongueChanged | null {
  const t = mustTongue(to).id;
  if (t === cc.court) return null;
  const old = cc.court;
  cc.court = t;
  return { country: cc.id, old, new: t, musicPaletteFromNextTrack: true };
}

// ---------------------------------------------------------------- 5.6 Tongue policy

/** States with a chancery tradition may *Impose* from 1444 (CULT-043). */
export function hasChanceryTradition(country: string): boolean {
  return config.start_flag_chancery_tradition.includes(norm(country));
}

/** *Impose* needs *Printing* or a chancery tradition (CULT-042, INV-CULT-6). */
export function mayImpose(cc: CountryCulture): boolean {
  return cc.inventions.includes("printing") || hasChanceryTradition(cc.id);
}

/** Sets the realm-wide policy, or a province override; refuses *Impose* without its needs. */
export function setTonguePolicy(cc: CountryCulture, policy: TonguePolicy, province?: string): boolean {
  if (policy === "impose" && !mayImpose(cc)) return false;
  if (province === undefined) cc.policy = policy;
  else cc.overrides[province] = policy;
  return true;
}

/** The policy in force in a province. */
export function policyIn(cc: CountryCulture, province?: string): TonguePolicy {
  return (province !== undefined ? cc.overrides[province] : undefined) ?? cc.policy;
}

/** Drift multiplier of a policy, toward the court tongue (CULT-025). */
export function policyDriftMultiplier(policy: TonguePolicy): number {
  return config.policy[policy].drift;
}

/** Upkeep multiplier of a school: Teach raises schools teaching in the court tongue by 10 % (CULT-039). */
export function schoolUpkeepMultiplier(cc: CountryCulture, schoolTongue: string, province?: string): number {
  return policyIn(cc, province) === "teach" && mustTongue(schoolTongue).id === cc.court ? config.policy.teach.school_upkeep : 1;
}

// ---------------------------------------------------------------- provinces, grievances and charters

/** What culture reads of a province (storage is province's). */
export interface ProvinceTongues {
  id: string;
  /** People per tongue id; at most three (INV-CULT-7). */
  people: Record<string, number>;
  /** Of those, people in town classes (craftsmen, market folk, clerks, scholars). */
  townPeople?: Record<string, number>;
  /** Tongues this province is a homeland of. */
  homelandOf: string[];
  yearsHeld: number;
  governor: { kind: "official"; tongue?: string } | { kind: "lord"; tongue: string } | { kind: "none" };
  /** Teaching tongues of the schools in the province. */
  schools: string[];
  schoolmaster: boolean;
  /** Tongue of the *Own tongue* charter, if one stands (CULT-087: one byte). */
  ownTongueCharter: string | null;
  /** The event tree's nationalism support here, 0..1; culture only reads it (CULT-073). */
  nationalism: number;
  /** The province's main ground and whether it touches the sea, for the way-of-life rule (CULT-027, CULT-092). */
  ground?: Ground;
  coastal?: boolean;
  /** Grievances from culture standing here (*Foreign rule*, *Banned language*, *Broken charter*). */
  grievances: string[];
  /** Taken with *Gather our kin*: no *Foreign rule* (CULT-060). */
  gatheredKin?: boolean;
  /** Refugees not yet settled: they count after 2 years (CULT-036). */
  refugees?: { tongue: string; people: number; years: number }[];
}

export function newProvinceTongues(id: string, people: Record<string, number>, init: Partial<ProvinceTongues> = {}): ProvinceTongues {
  const ids: Record<string, number> = {};
  for (const [t, n] of Object.entries(people)) ids[mustTongue(t).id] = n;
  return { id, people: ids, homelandOf: [], yearsHeld: 0, governor: { kind: "none" }, schools: [], schoolmaster: false, ownTongueCharter: null, nationalism: 0, grievances: [], ...init };
}

export function totalPeople(p: ProvinceTongues): number {
  return Object.values(p.people).reduce((a, b) => a + b, 0);
}

/** Share of a tongue in a province (0..1). */
export function share(p: ProvinceTongues, t: string): number {
  const all = totalPeople(p);
  return all > 0 ? (p.people[mustTongue(t).id] ?? 0) / all : 0;
}

/** The largest tongue of a province. */
export function majorityTongue(p: ProvinceTongues): string {
  let best = "";
  let n = -1;
  for (const [t, k] of Object.entries(p.people)) if (k > n) [best, n] = [t, k];
  return best;
}

/**
 * *Foreign rule* (CULT-015, CULT-045, CULT-048, CULT-060, CULT-074): a homeland
 * whose tongue is a stranger to the court (cousins too once nationalism is 0.3),
 * unless an *Own tongue* charter stands, a lord of that tongue holds it, or it
 * was taken with *Gather our kin*.
 */
export function hasForeignRule(p: ProvinceTongues, cc: CountryCulture): boolean {
  if (p.ownTongueCharter !== null || p.gatheredKin) return false;
  return p.homelandOf.some((h) => {
    if (p.governor.kind === "lord" && mustTongue(p.governor.tongue).id === mustTongue(h).id) return false;
    return givesForeignRule(relationTo(cc.court, h, p.nationalism));
  });
}

/**
 * *Banned language* (CULT-040, CULT-044): under *Impose*, where most people are
 * strangers (cousins once nationalism is 0.3); ends with Let be / Teach, an
 * *Own tongue* charter, or a kin majority.
 */
export function hasBannedTongue(p: ProvinceTongues, cc: CountryCulture): boolean {
  if (policyIn(cc, p.id) !== "impose" || p.ownTongueCharter !== null) return false;
  // An official of the local tongue keeps *Banned language* away (CULT-052, D-CULT-11).
  if (p.governor.kind === "official" && p.governor.tongue !== undefined && mustTongue(p.governor.tongue).id === majorityTongue(p)) return false;
  return relationTo(cc.court, majorityTongue(p), p.nationalism) === "stranger";
}

/** Works out culture's grievances in a province, keeping others (e.g. *Broken charter*). */
export function updateGrievances(p: ProvinceTongues, cc: CountryCulture): string[] {
  const keep = p.grievances.filter((g) => g !== "Foreign rule" && g !== "Banned language");
  if (hasForeignRule(p, cc)) keep.push("Foreign rule");
  if (hasBannedTongue(p, cc)) keep.push("Banned language");
  p.grievances = keep;
  return keep;
}

/** Who may bring an *Own tongue* charter (CULT-046). */
export function charterBroughtBy(): string[] {
  return [...config.charter_brought_by];
}

/** Grants the *Own tongue* charter for the local majority tongue (CULT-045). */
export function grantOwnTongue(p: ProvinceTongues, cc: CountryCulture): void {
  p.ownTongueCharter = majorityTongue(p);
  updateGrievances(p, cc);
}

/** Revoking the charter gives *Broken charter* as for any charter (CULT-047). */
export function revokeOwnTongue(p: ProvinceTongues, cc: CountryCulture): void {
  p.ownTongueCharter = null;
  p.grievances.push("Broken charter");
  updateGrievances(p, cc);
}

/** Under an *Own tongue* charter, officials must be of the local tongue (CULT-045). */
export function officialTongueRequired(p: ProvinceTongues): string | null {
  return p.ownTongueCharter;
}

// ---------------------------------------------------------------- 5.4 drift

/** The pull tongue: the court's if held 20 years and governed by an official or a court-tongue lord, else the majority (CULT-017, CULT-018). */
export function pullTongue(p: ProvinceTongues, cc: CountryCulture): string {
  const g = p.governor;
  const governed = g.kind === "official" || (g.kind === "lord" && mustTongue(g.tongue).id === cc.court);
  if (p.yearsHeld >= config.drift.court_pull_needs_years_held && governed) return cc.court;
  return majorityTongue(p);
}

export interface DriftCase {
  pull: string;
  drifting: string;
  townClass?: boolean;
  school?: boolean;
  schoolmaster?: boolean;
  /** The Tongue policy, counted only when the pull tongue is the court's. */
  policy?: TonguePolicy;
  towardCourt?: boolean;
  homeland?: boolean;
  ground?: Ground;
  coastal?: boolean;
  ownTongueCharter?: boolean;
  nationalism?: number;
  inventions?: string[];
}

/** The named multipliers that apply to one drifting group (CULT-020 to CULT-031). */
export function driftMultipliers(c: DriftCase): { name: string; value: number }[] {
  const m = config.drift.multipliers;
  const out: { name: string; value: number }[] = [];
  const t = mustTongue(c.drifting);
  const nat = c.nationalism ?? 0;
  if (c.townClass) out.push({ name: "town classes", value: m.town_classes });
  if (relationTo(c.pull, c.drifting, nat) === "cousin") out.push({ name: "related to the language it drifts toward", value: config.relation.cousin.drift_multiplier });
  if (c.school) out.push({ name: "school in the language it drifts toward", value: m.school_in_pull_tongue });
  if (c.schoolmaster) out.push({ name: "Schoolmaster", value: m.schoolmaster_official });
  if (c.towardCourt && c.policy) out.push({ name: `Language policy ${c.policy}`, value: policyDriftMultiplier(c.policy) });
  if (c.homeland) out.push({ name: "homeland", value: m.homeland_of_drifting_tongue });
  if (livesInOwnLand(t.way_of_life, c.ground, c.coastal)) out.push({ name: "way of life in its own land", value: m.way_of_life_in_own_land });
  if (t.diaspora) out.push({ name: "trading people", value: m.diaspora });
  if (c.towardCourt && c.ownTongueCharter) out.push({ name: "Own-language charter", value: m.own_tongue_charter });
  if (nat >= COUSINS_BECOME_STRANGERS_AT) out.push({ name: "nationalism", value: m.nationalism_0_3 });
  for (const inv of c.inventions ?? []) {
    const v = (m.inventions as Record<string, number>)[inv];
    if (v !== undefined) out.push({ name: inv, value: v });
  }
  return out;
}

/**
 * Does a herding, forest or seafaring tongue live in its own kind of land
 * (CULT-027, CULT-092)? Steppe is grassland or drylands ground, deep forest is
 * forest or jungle ground, and islands are any province touching the sea.
 */
export function livesInOwnLand(way: WayOfLife, ground?: Ground, coastal?: boolean): boolean {
  const lands = config.drift.way_of_life_lands as Record<string, string[] | "coastal">;
  const l = lands[way];
  if (l === undefined) return false;
  if (l === "coastal") return coastal === true;
  return ground !== undefined && l.includes(ground);
}

/** The tongue a school teaches in, for drift: none for a learned tongue such as Latin (CULT-023, D-CULT-15). */
export function schoolTongue(school: string): string | null {
  if (config.schools.learned_tongues.some((l) => norm(l) === norm(school))) return null;
  return mustTongue(school).id;
}

/** Yearly drift rate of one group: base 0.5 % times every multiplier (CULT-020). */
export function driftRate(c: DriftCase): number {
  return driftMultipliers(c).reduce((r, x) => r * x.value, config.drift.base_rate_per_year);
}

export interface DriftResult {
  province: string;
  pull: string;
  moved: Record<string, number>;
  removed: string[];
}

/**
 * One year's drift in a province, after births and deaths (CULT-016, CULT-019):
 * people of the pull tongue stay, everyone else moves toward it at their rate;
 * then tongues under 1 % are removed (CULT-032).
 */
export function driftYear(p: ProvinceTongues, cc: CountryCulture): DriftResult {
  const pull = pullTongue(p, cc);
  const towardCourt = pull === cc.court;
  const moved: Record<string, number> = {};
  for (const [t, n] of Object.entries(p.people)) {
    if (t === pull) continue;
    const town = Math.min(n, p.townPeople?.[t] ?? 0);
    const base: DriftCase = {
      pull,
      drifting: t,
      school: p.schools.some((s) => schoolTongue(s) === pull),
      schoolmaster: p.schoolmaster,
      policy: policyIn(cc, p.id),
      towardCourt,
      homeland: p.homelandOf.some((h) => mustTongue(h).id === t),
      ...(p.ground !== undefined ? { ground: p.ground } : {}),
      coastal: p.coastal === true,
      ownTongueCharter: p.ownTongueCharter !== null,
      nationalism: p.nationalism,
      inventions: cc.inventions,
    };
    const m = (n - town) * driftRate(base) + town * driftRate({ ...base, townClass: true });
    moved[t] = m;
  }
  for (const [t, m] of Object.entries(moved)) {
    p.people[t] = (p.people[t] ?? 0) - m;
    if (p.townPeople?.[t] !== undefined) p.townPeople[t] = Math.max(0, p.townPeople[t]! - m);
    p.people[pull] = (p.people[pull] ?? 0) + m;
  }
  return { province: p.id, pull, moved, removed: dropSmallTongues(p, pull) };
}

/** Removes tongues under 1 % of the province; their people have drifted into the pull tongue (CULT-032). */
export function dropSmallTongues(p: ProvinceTongues, into: string = majorityTongue(p)): string[] {
  const all = totalPeople(p);
  const removed: string[] = [];
  for (const [t, n] of Object.entries(p.people)) {
    if (t === into || n / all >= config.drift.drop_below_share) continue;
    delete p.people[t];
    p.people[into] = (p.people[into] ?? 0) + n;
    removed.push(t);
  }
  return removed;
}

/** The drift explanation on the Tongue line: pull tongue, rates and reasons (CULT-081). */
export function driftExplanation(p: ProvinceTongues, cc: CountryCulture): { pull: string; why: string; groups: { tongue: string; rate: number; multipliers: string[] }[] } {
  const pull = pullTongue(p, cc);
  const why = pull === cc.court ? `held ${p.yearsHeld} years and governed for the court` : "the majority language";
  const groups = Object.keys(p.people)
    .filter((t) => t !== pull)
    .map((t) => {
      const c: DriftCase = { pull, drifting: t, school: p.schools.some((s) => schoolTongue(s) === pull), schoolmaster: p.schoolmaster, policy: policyIn(cc, p.id), towardCourt: pull === cc.court, homeland: p.homelandOf.includes(t), nationalism: p.nationalism, inventions: cc.inventions, ownTongueCharter: p.ownTongueCharter !== null };
      return { tongue: t, rate: driftRate(c), multipliers: driftMultipliers(c).map((m) => m.name) };
    });
  return { pull, why, groups };
}

// ---------------------------------------------------------------- 5.5 people moving

export type Movers = "settlers" | "refugees" | "homeless" | "soldiers" | "migrants";

/**
 * People carry their tongue into the destination's mix (CULT-034): settlers into
 * any own province with free tiles (CULT-035), refugees after 2 years
 * (CULT-036), soldiers back into their home tongue (CULT-037). A fourth tongue
 * replaces the smallest of the three, which joins the majority (CULT-033).
 */
export function arrive(p: ProvinceTongues, kind: Movers, t: string, people: number, opts: { ownProvince?: boolean; freeTiles?: boolean } = {}): boolean {
  const id = mustTongue(t).id;
  if (kind === "settlers" && !(opts.ownProvince && opts.freeTiles)) return false;
  if (kind === "refugees") {
    (p.refugees ??= []).push({ tongue: id, people, years: 0 });
    return true;
  }
  addPeople(p, id, people);
  return true;
}

/**
 * Adds people of a tongue, keeping at most three tongues (CULT-033, D-CULT-5):
 * a fourth tongue enters only if it is larger than the smallest of the three;
 * whichever group is smallest of the four joins the majority tongue.
 */
export function addPeople(p: ProvinceTongues, id: string, people: number): void {
  if (p.people[id] === undefined && Object.keys(p.people).length >= 3) {
    const major = majorityTongue(p);
    const [smallest, n] = Object.entries(p.people).sort((a, b) => a[1] - b[1])[0]!;
    if (people <= n) {
      p.people[major] = (p.people[major] ?? 0) + people;
      return;
    }
    delete p.people[smallest];
    p.people[major] = (p.people[major] ?? 0) + n;
  }
  p.people[id] = (p.people[id] ?? 0) + people;
}

/** A year passes for waiting refugees: after 2 years they settle into the mix (CULT-036). */
export function ageRefugees(p: ProvinceTongues): void {
  const still: NonNullable<ProvinceTongues["refugees"]> = [];
  for (const r of p.refugees ?? []) {
    r.years++;
    if (r.years >= config.refugees.settle_after_years) addPeople(p, r.tongue, r.people);
    else still.push(r);
  }
  p.refugees = still;
}

// ---------------------------------------------------------------- 5.8 officials and lords

/** Years to full effect for an official: 5 among kin, 7 cousins, 10 strangers; 5 if of the province's own tongue (CULT-050). */
export function officialYearsToFullEffect(cc: CountryCulture, officialTongue: string, provinceTongue: string): number {
  const y = config.officials.years_to_full_effect;
  if (mustTongue(officialTongue).id === mustTongue(provinceTongue).id) return y.local_tongue;
  const r = relationTo(cc.court, provinceTongue);
  return r === "kin" ? y.kin : r === "cousin" ? y.cousin : y.stranger;
}

/** An official's tongue: the province he was hired in, or the school he graduated from (CULT-051). */
export function officialTongue(from: { hiredIn: ProvinceTongues } | { school: string }): string {
  return "hiredIn" in from ? majorityTongue(from.hiredIn) : mustTongue(from.school).id;
}

/** Does a lord count as kin for loyalty: his tongue is the court's, or the ruler married into his house (CULT-049). */
export function lordCountsAsKin(cc: CountryCulture, lord: { tongue: string; house?: string }): boolean {
  return mustTongue(lord.tongue).id === cc.court || (lord.house !== undefined && cc.marriedHouses.includes(lord.house));
}

/**
 * How a lord's tongue enters the realm's loyalty (CULT-054, D-CULT-8): a kin lord
 * (or one of a house the ruler married into) has the rising cause "shares your
 * tongue", one step a year toward Loyal; a stranger lord starts one step lower;
 * a cousin lord has neither.
 */
export function lordTongueLoyalty(cc: CountryCulture, lord: { tongue: string; house?: string }): { sharesTongue: boolean; startSteps: number } {
  if (lordCountsAsKin(cc, lord)) return { sharesTongue: true, startSteps: 0 };
  return { sharesTongue: false, startSteps: relationTo(cc.court, lord.tongue) === "stranger" ? -1 : 0 };
}

/**
 * Lords who waver when a Tongue policy is set (CULT-041, D-CULT-7): only when
 * the policy turns to *Impose* from another, once; keeping *Impose* costs no more.
 */
export function wavererOnPolicyChange(cc: CountryCulture, from: TonguePolicy, to: TonguePolicy, lords: { name: string; tongue: string }[]): string[] {
  return from !== "impose" && to === "impose" ? imposeWaverOrder(cc, lords) : [];
}

/** Lords of the tongues hit by *Impose* waver one step, strangers first (CULT-041). */
export function imposeWaverOrder(cc: CountryCulture, lords: { name: string; tongue: string }[]): string[] {
  const hit = lords.filter((l) => relationTo(cc.court, l.tongue) !== "kin");
  return [...hit.filter((l) => relationTo(cc.court, l.tongue) === "stranger"), ...hit.filter((l) => relationTo(cc.court, l.tongue) !== "stranger")].map((l) => l.name);
}

// ---------------------------------------------------------------- 5.9 order and war

/** A homeland rising draws 8 % of everyone of the tongue (CULT-055). */
export function homelandRisingDraw(peopleOfTongue: number): number {
  return peopleOfTongue * config.risings.homeland_draw;
}

/** A homeland rising's demand: a new country from nationalism 0.5 (CULT-056, CULT-075). */
export function homelandRisingDemand(nationalism: number): "self-rule" | "a new country" {
  return nationalism >= config.nationalism.homeland_demands_country_at ? "a new country" : "self-rule";
}

/** Locals know the land: defenders of the homeland tongue, rebels included, get +10 % in rough ground (CULT-057). */
export function locals(ground: Ground, defenderTongue: string, homelandTongue: string): number {
  return localsBonus(ground, mustTongue(defenderTongue).id === mustTongue(homelandTongue).id);
}

/** A garrison captain of another tongue may be bribed; cousins only after nationalism (CULT-058). */
export function captainBribable(rulerTongue: string, captainTongue: string, nationalism: number): boolean {
  const r = relationTo(rulerTongue, captainTongue, nationalism);
  return r === "stranger" || r === "trading";
}

/** *Free a people* opens on a stranger homeland, or a cousin one at nationalism 0.3 (CULT-059, CULT-074). */
export function freeAPeopleOpen(rulerTongue: string, homelandTongue: string, nationalism: number): boolean {
  return relationTo(rulerTongue, homelandTongue, nationalism) === "stranger";
}

/** Has the age of revolutions begun: never before its earliest start, always from its forced start; between, the event tree decides. */
export function ageOfRevolutions(year: number, startedByEvents = false): boolean {
  if (year < config.age_of_revolutions.earliest_start) return false;
  return year >= config.age_of_revolutions.force_start || startedByEvents;
}

/** *Gather our kin*: from the age of revolutions, on a province whose majority is the court tongue held by another country (CULT-060). */
export function gatherOurKinOffered(ageBegun: boolean, cc?: CountryCulture, target?: { province: ProvinceTongues; holder: string }): boolean {
  if (!ageBegun) return false;
  if (!cc || !target) return true;
  return target.holder !== cc.id && majorityTongue(target.province) === cc.court;
}

/** *National levy* refill multiplier (CULT-061). */
export function nationalLevy(relation: Relation, nationalism: number, ageBegun: boolean): number {
  const n = config.effects.national_levy;
  if (!ageBegun || nationalism < n.needs_nationalism) return 1;
  return relation === "kin" ? n.kin_refill : relation === "stranger" ? n.stranger_refill : 1;
}

// ---------------------------------------------------------------- 5.10 trade, research and diplomacy

/** Trading-people bonus of a diaspora tongue in a province (CULT-062). */
export function tradingPeopleBonus(t: string, shareOfProvince: number, market: boolean): { tradeValue: number; extraTraders: number } | null {
  const e = config.effects.trading_people;
  if (!mustTongue(t).diaspora || !market || shareOfProvince < e.min_share) return null;
  return { tradeValue: e.trade_value, extraTraders: e.extra_traders };
}

/**
 * Persecuting or expelling a trading people (CULT-063): their people leave as
 * refugees to a neighbour, ending the bonus here; once settled there they bring it.
 */
export function expelTradingPeople(from: ProvinceTongues, to: ProvinceTongues, t: string): number {
  const id = mustTongue(t).id;
  const n = from.people[id] ?? 0;
  delete from.people[id];
  if (from.townPeople) delete from.townPeople[id];
  arrive(to, "refugees", id, n);
  return n;
}

/** Weight of a neighbour toward the 60 % research cap: double if of the same family (CULT-064). */
export function neighbourResearchWeight(ownFamily: string, neighbourFamily: string): number {
  return ownFamily === neighbourFamily ? config.effects.family_neighbour_research_weight : 1;
}

/** Foreign scholars settle first in realms of their own family (CULT-065). */
export function scholarRealmOrder<T extends { family: string }>(scholarTongue: string, realms: T[]): T[] {
  const f = familyOf(scholarTongue);
  return [...realms.filter((r) => r.family === f), ...realms.filter((r) => r.family !== f)];
}

/** Starting warmth between two rulers: 2 steps for the same court tongue, 1 for the same family (CULT-066). */
export function warmthSteps(a: string, b: string): number {
  if (mustTongue(a).id === mustTongue(b).id) return 2;
  const fa = familyOf(a);
  return fa !== null && fa === familyOf(b) ? 1 : 0;
}

/** After nationalism, a country holding many people of your court tongue is a natural rival (CULT-066). */
export function naturalRival(nationalismSpread: boolean, holdsManyOfYourTongue: boolean): boolean {
  return nationalismSpread && holdsManyOfYourTongue;
}

// ---------------------------------------------------------------- 5.11 history

/** The tongue a family `spread` raises: the leading tongue of that family here, or the region default (CULT-067). */
export function spreadTarget(p: ProvinceTongues, family: string, region?: string): string | null {
  let best: string | null = null;
  let n = -1;
  for (const [t, k] of Object.entries(p.people)) if (familyOf(t) === family && k > n) [best, n] = [t, k];
  if (best) return best;
  const d = (config.family_default_by_region as Record<string, Record<string, string>>)[family];
  return (region !== undefined ? d?.[region] : undefined) ?? null;
}

/** Applies `spread: {kind: culture, id: family}` with an amount of people (CULT-067). */
export function spreadFamily(p: ProvinceTongues, family: string, amount: number, region?: string): string | null {
  const t = spreadTarget(p, family, region);
  if (t) addPeople(p, t, amount);
  return t;
}

/** `tongue_spread`: as `spread` for a named tongue (CULT-078). */
export function tongueSpread(p: ProvinceTongues, t: string, amount: number): void {
  addPeople(p, mustTongue(t).id, amount);
}

/** Per-country timers for the engine-raised checks (EngineCultureCheck). */
export interface CultureChecks {
  /** First year the court tongue was seen under 20 % of the people, or null. */
  courtSmallSince: number | null;
  /** No court-goes-native check before this year (after *Keep ours*). */
  nextCheck: number;
  /** Year *Impose* was set, or null. */
  imposeSince: number | null;
}

export function newChecks(): CultureChecks {
  return { courtSmallSince: null, nextCheck: 0, imposeSince: null };
}

export interface CourtGoesNative {
  country: string;
  majority: string;
  choices: ["Take their language", "Keep ours"];
  year: number;
}

/** The 5-yearly court-goes-native check (CULT-068, CULT-069). */
export function checkCourtGoesNative(cc: CountryCulture, checks: CultureChecks, people: Record<string, number>, year: number): CourtGoesNative | null {
  const e = config.engine_events.court_goes_native;
  const all = Object.values(people).reduce((a, b) => a + b, 0);
  const court = (people[cc.court] ?? 0) / (all || 1);
  if (court >= e.court_share_below) {
    checks.courtSmallSince = null;
    return null;
  }
  checks.courtSmallSince ??= year;
  if (year - checks.courtSmallSince < e.for_years || year < checks.nextCheck) return null;
  const major = Object.entries(people).find(([t, n]) => t !== cc.court && n / all > e.other_tongue_above);
  if (!major) return null;
  return { country: cc.id, majority: major[0], choices: ["Take their language", "Keep ours"], year };
}

/** Answers *The court goes native* (CULT-070, CULT-071). */
export function answerCourtGoesNative(cc: CountryCulture, checks: CultureChecks, ev: CourtGoesNative, choice: "Take their language" | "Keep ours", lords: { name: string; tongue: string }[] = []): { changed: CourtTongueChanged | null; wavering: string[] } {
  if (choice === "Keep ours") {
    checks.nextCheck = ev.year + config.engine_events.court_goes_native.recheck_years;
    return { changed: null, wavering: [] };
  }
  const old = cc.court;
  const changed = setCourtTongue(cc, ev.majority);
  checks.courtSmallSince = null;
  return { changed, wavering: lords.filter((l) => mustTongue(l.tongue).id === old).map((l) => l.name) };
}

/** Is this a year the 5-yearly culture checks run (CULT-068): every 5 years counted from 1444. */
export function cultureCheckYear(year: number): boolean {
  return (year - 1444) % config.engine_events.check_every_years === 0;
}

/** The continent a map region lies in: its top-level region (D-CULT-10). */
export function continentOf(regionId: string): string {
  let r = REGIONS.find((x) => x.id === regionId);
  if (!r) throw new Error(`unknown region ${regionId}`);
  while (r.parent !== null) {
    const up: string = r.parent;
    r = REGIONS.find((x) => x.id === up);
    if (!r) throw new Error(`unknown region ${up}`);
  }
  return r.id;
}

/**
 * New tongue abroad (CULT-072, D-CULT-10): settlers of a tongue with a
 * `splits_to` entry who have been the majority of a map macro-region for 100
 * years, where that region lies on another continent than the court's capital
 * (separated by sea), become the `splits_to` tongue there.
 */
export function newTongueAbroad(settlers: string, majorityYears: number, region: string, courtRegion: string): string | null {
  const t = mustTongue(settlers);
  if (!t.splits_to || majorityYears < config.engine_events.new_tongue_abroad.settler_majority_years) return null;
  if (continentOf(region) === continentOf(courtRegion)) return null;
  return mustTongue(t.splits_to).id;
}

/** Splits a settler tongue into its new tongue in the region's provinces (CULT-072). */
export function splitTongue(from: string, to: string, where: ProvinceTongues[]): void {
  mergeTongues([from], to, where);
}

/** A nation state: its court tongue is the national tongue some tongue `merges_into` (CULT-077, D-CULT-2). */
export function isNationState(cc: CountryCulture): boolean {
  return TONGUES.some((t) => t.merges_into === cc.court);
}

/**
 * Merge without an event (CULT-077, D-CULT-2): a nation state that has kept
 * *Impose* for 50 years merges, in its own provinces, the cousin tongues whose
 * `merges_into` is its court tongue. Returns the tongues merged.
 */
export function mergeWithoutEvent(cc: CountryCulture, imposeYears: number, provinces: ProvinceTongues[]): string[] {
  const e = config.engine_events.merge_without_event;
  if (cc.policy !== e.needs_policy || imposeYears < e.years || !isNationState(cc)) return [];
  const ids = [...new Set(provinces.flatMap((p) => Object.keys(p.people)))].filter((t) => mustTongue(t).merges_into === cc.court);
  mergeTongues(ids, cc.court, provinces);
  return ids;
}

/**
 * A released people's country (CULT-075, D-CULT-16): the catalogue record whose
 * first culture maps to the tongue (X-13: a record that owns no province is
 * reference data events can draw on); if none fits, a generated one named after
 * the tongue, with that tongue as court tongue and the form of the country it left.
 */
export function releasedCountry(t: string, form: string, catalogue: { id: string; cultures: string[] }[]): { id: string; court: string; form: string; generated: boolean } {
  const id = mustTongue(t).id;
  const rec = catalogue.find((r) => r.cultures.length > 0 && startCourtTongue([r.cultures[0]!]) === id);
  if (rec) return { id: rec.id, court: id, form, generated: false };
  return { id: mustTongue(t).name, court: id, form, generated: true };
}

/** `merge_tongues`: folds the named tongues into one in the given provinces (CULT-076, CULT-078). */
export function mergeTongues(ids: string[], into: string, where: ProvinceTongues[]): void {
  const to = mustTongue(into).id;
  const from = ids.map((i) => mustTongue(i).id);
  for (const p of where) {
    let n = 0;
    for (const f of from) {
      n += p.people[f] ?? 0;
      delete p.people[f];
    }
    if (n > 0) p.people[to] = (p.people[to] ?? 0) + n;
  }
}

/** The tongues a nation-building event merges: every tongue whose `merges_into` is its national tongue (CULT-076). */
export function mergeEventTongues(event: string): { ids: string[]; into: string } | null {
  const m = (config.merge_events as Record<string, { into: string }>)[event];
  if (!m) return null;
  return { ids: TONGUES.filter((t) => t.merges_into === m.into).map((t) => t.id), into: m.into };
}

/** `move_people`: people of a tongue leave `from` as refugees and settle in `to` (CULT-079). */
export function movePeople(t: string, from: ProvinceTongues, to: ProvinceTongues, amount: number): number {
  const id = mustTongue(t).id;
  const n = Math.min(amount, from.people[id] ?? 0);
  from.people[id] = (from.people[id] ?? 0) - n;
  if (from.people[id] === 0) delete from.people[id];
  arrive(to, "refugees", id, n);
  return n;
}

/** Event triggers (CULT-078). */
export const triggers = {
  court_tongue: (cc: CountryCulture, t: string) => cc.court === mustTongue(t).id,
  tongue_share: (p: ProvinceTongues, t: string) => share(p, t),
  kin_of: (cc: CountryCulture, t: string, nationalism = 0) => relationTo(cc.court, t, nationalism) === "kin",
  cousin_of: (cc: CountryCulture, t: string, nationalism = 0) => relationTo(cc.court, t, nationalism) === "cousin",
  stranger_to: (cc: CountryCulture, t: string, nationalism = 0) => relationTo(cc.court, t, nationalism) === "stranger",
};

// ---------------------------------------------------------------- 5.12 what the player sees

/** The dot colour of a tongue on the province card (CULT-080). */
export function dotColour(r: Relation): string {
  return config.dots[r];
}

/** The province card's Tongue line, largest first (CULT-080). */
export function tongueLine(p: ProvinceTongues, cc: CountryCulture): { text: string; dots: Record<string, string> } {
  const all = totalPeople(p);
  const rows = Object.entries(p.people).sort((a, b) => b[1] - a[1]);
  const text = "Language " + rows.map(([t, n]) => `${mustTongue(t).name} ${Math.round((n / all) * 100)} %`).join(" · ");
  const dots: Record<string, string> = {};
  for (const [t] of rows) dots[mustTongue(t).name] = dotColour(relationTo(cc.court, t, p.nationalism));
  return { text, dots };
}

export interface PeoplesRowInput {
  tongue: string;
  people: number;
  provinces: number;
  homeland: boolean;
  grievances: string[];
  lords: number;
  charter: boolean;
  driftingTo: string | null;
  tradeBonusIn: string[];
}

export interface PeoplesRow {
  tongue: string;
  family: string | null;
  people: string;
  relation: Relation;
  where: string;
  notes: string;
}

function millions(n: number): string {
  const m = n / 1e6;
  return `${m >= 0.1 ? Number(m.toFixed(1)) : Number(m.toFixed(2))} m`;
}

/** The Peoples screen: one row per tongue in the realm, largest first (CULT-083). */
export function peoplesScreen(cc: CountryCulture, rows: PeoplesRowInput[]): { policy: TonguePolicy; rows: PeoplesRow[] } {
  const out = [...rows]
    .sort((a, b) => b.people - a.people)
    .map((r) => {
      const relation = relationTo(cc.court, r.tongue);
      const notes: string[] = [];
      if (r.homeland) notes.push("homeland");
      if (r.grievances.length === 1) notes.push(r.grievances[0]!);
      else if (r.grievances.length > 1) notes.push(`${r.grievances.length} grievances`);
      if (r.charter) notes.push("Own-language charter");
      if (r.lords > 0) notes.push(`${r.lords} lord${r.lords > 1 ? "s" : ""}`);
      if (r.driftingTo) notes.push(`drifting to ${mustTongue(r.driftingTo).name}`);
      if (r.tradeBonusIn.length) notes.push(`+${config.effects.trading_people.trade_value * 100} % trade in ${r.tradeBonusIn.join(", ")}`);
      return {
        tongue: mustTongue(r.tongue).name,
        family: familyOf(r.tongue),
        people: millions(r.people),
        relation,
        where: relation === "trading" ? `${r.provinces} towns` : `${r.provinces} prov`,
        notes: notes.join(", "),
      };
    });
  return { policy: cc.policy, rows: out };
}

/** The Peoples screen grouped by family, each group folded shut (CULT-083). */
export function foldByFamily<T extends { family: string | null }>(rows: T[]): { family: string | null; folded: boolean; rows: T[] }[] {
  const groups = new Map<string | null, T[]>();
  for (const r of rows) groups.set(r.family, [...(groups.get(r.family) ?? []), r]);
  return [...groups].map(([family, rs]) => ({ family, folded: true, rows: rs }));
}

/** Tapping a Peoples row lights the provinces where that tongue lives (CULT-084). */
export function peoplesRowTap(t: string, provinces: ProvinceTongues[]): string[] {
  const id = mustTongue(t).id;
  return provinces.filter((p) => (p.people[id] ?? 0) > 0).map((p) => p.id);
}

/** Long-pressing a Peoples row shows that tongue's lords, officials and any rising (CULT-084). */
export function peoplesRowLongPress(
  t: string,
  realm: { lords: { name: string; tongue: string }[]; officials: { name: string; tongue: string }[]; risings: { tongue: string; province: string }[] },
): { lords: string[]; officials: string[]; risings: string[] } {
  const id = mustTongue(t).id;
  const of = (x: { tongue: string }) => mustTongue(x.tongue).id === id;
  return { lords: realm.lords.filter(of).map((l) => l.name), officials: realm.officials.filter(of).map((o) => o.name), risings: realm.risings.filter(of).map((r) => r.province) };
}

/** What the Language lens colours by (CULT-085). */
export function lensColouring(zoom: "far" | "regional", realmToggle = false): string {
  if (realmToggle) return config.lens.realm_toggle;
  return zoom === "far" ? config.lens.far : config.lens.regional;
}

/** Homelands outlined on the Language lens: those of peoples without a country (CULT-085). */
export function outlinedHomelands(tonguesWithHomeland: string[], courtTongues: string[]): string[] {
  const courts = new Set(courtTongues.map((t) => mustTongue(t).id));
  return tonguesWithHomeland.map((t) => mustTongue(t).id).filter((t) => !courts.has(t));
}

/** What the country card shows of culture: the Tongue line only; no meter, power or accepted list (CULT-008). */
export function countryCardCulture(cc: CountryCulture, people: Record<string, number>): { tongue: string; percent: number } {
  return { tongue: mustTongue(cc.court).name, percent: Math.round(tonguePercent(cc.court, people) * 100) };
}

// ---------------------------------------------------------------- 5.14 AI

export type Personality = "hegemon seeker" | "expansionist" | "isolationist" | "mercantile" | "opportunist" | "zealot";

/** AI Tongue policy by personality (CULT-090). */
export function aiTonguePolicy(personality: Personality, printing: boolean): TonguePolicy {
  const row = config.ai.policy[personality] as { policy: string; with_printing?: string };
  return (printing && row.with_printing ? row.with_printing : row.policy) as TonguePolicy;
}

/** The culture levers an AI uses by personality (CULT-091). */
export function aiLevers(personality: Personality): string[] {
  return [...config.ai.levers[personality]];
}
