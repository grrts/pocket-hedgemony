import config from "../../../../rules/data/domain/rebellions.json" with { type: "json" };
import type { Rng } from "../../rng.ts";
import { homelessGrievanceWeight, inRevolt, provinceConfig, type Loyalty, type Mood } from "../province/index.ts";

/**
 * Rebellions (domain/rebellions/spec.md): the steps from grievances to a
 * rising, sparks, cause, demand and leader, strength, severity and spread,
 * the ruler's answers, prevention and what rebels win. Balance numbers live
 * in rules/data/domain/rebellions.json. State is plain data the caller owns;
 * dice are rolled only through an Rng the caller hands in.
 */

export type RebellionsConfig = typeof config;
export const rebellionsConfig: RebellionsConfig = config;

export type Step = "calm" | "grumbling" | "riots" | "plotting" | "rising";
export type Cause = "Hunger" | "Tax" | "Faith" | "Homeland" | "Town" | "Lord" | "Pretender" | "New ideas";
export type Arms = "Tools" | "Old weapons" | "Armed" | "Soldiers";
export type Tier = "Riot" | "Rising" | "Rebellion" | "Great revolt";
export type LeaderKind = "local" | "preacher" | "veteran" | "the lord himself" | "the pretender";
export type Treatment = "Pardon" | "Punish the leaders" | "Massacre";
export type ArmsSource =
  | "forge"
  | "market"
  | "veteran leader"
  | "captured castle store"
  | "foreign gold"
  | "lord's retinue"
  | "deserters"
  | "rival's troops"
  | "pretender's army";

const ARMS = config.arms.steps as Arms[];
const CAUSES = config.causes as Record<Cause, { grievances: string[]; demand: string; joiners: string; classes: string[]; leader: string }>;

// ---------------------------------------------------------------- 5.1 from grievances to a rising

/** What the province tells this context about its trouble (province stats 6.4, 10.2, 12.1). */
export interface Unrest {
  /** Grievances other than *Homeless*, each counting one. */
  grievances: number;
  /** Share of the people who are homeless (0..1). */
  homelessShare?: number;
  /** An almshouse shelters the homeless: they do not count toward the trouble (REBL-053). */
  almshouse?: boolean;
  /** A judge runs the province: each bar is one grievance higher (REBL-052). */
  judge?: boolean;
}

/** *Homeless* counts fully, and as two above a fifth (REBL-009, REBL-053). */
export function homelessCount(u: Unrest): number {
  if (u.almshouse) return 0;
  return homelessGrievanceWeight(u.homelessShare ?? 0);
}

/** The effective grievance count the steps are read from. */
export function effectiveCount(u: Unrest): number {
  return u.grievances + homelessCount(u);
}

function bar(name: keyof RebellionsConfig["steps"], judge: boolean | undefined): number {
  return config.steps[name] + (judge ? config.judge_raises_bars_by : 0);
}

/** Calm, grumbling, riots or plotting from the effective count (REBL-001, REBL-052). */
export function stepOf(u: Unrest): Exclude<Step, "rising"> {
  const n = effectiveCount(u);
  if (n >= bar("plotting", u.judge)) return "plotting";
  if (n >= bar("riots", u.judge)) return "riots";
  if (n >= bar("grumbling", u.judge)) return "grumbling";
  return "calm";
}

/** The step's effects, as listed in the config (REBL-002, REBL-003). */
export function stepEffects(step: Step): string[] {
  const s = step === "rising" ? "plotting" : step;
  return [...config.step_effects[s]];
}

/** Tax and recruits factor at a step: halved from riots up (REBL-003). */
export function stepTaxFactor(step: Step): number {
  return step === "riots" || step === "plotting" || step === "rising" ? config.riots_factor : 1;
}

/** Monthly chance (percent) that a plotting province rises by itself (REBL-005). Zero below plotting. */
export function risingChance(u: Unrest): number {
  if (stepOf(u) !== "plotting") return 0;
  const n = effectiveCount(u) - (u.judge ? config.judge_raises_bars_by : 0);
  let pct = 0;
  for (const row of config.rising_chance) if (n >= row.grievances) pct = row.percent;
  return pct;
}

/** Rolls the monthly rising chance (REBL-005). A rioting province never rises on its own. */
export function rollRising(u: Unrest, rng: Rng): boolean {
  const pct = risingChance(u);
  return pct > 0 && rng.next() * 100 < pct;
}

/** The plotting card: monthly chance and a named plotter (REBL-006). */
export function plottingCard(province: string, u: Unrest, rng: Rng): { chance: number; plotter: string } {
  return { chance: risingChance(u), plotter: localLeader(province, rng).name };
}

/** A named local drawn from the province: a dyer, a miller or a village elder (REBL-017). */
export function localLeader(province: string, rng: Rng): Leader {
  const roles = config.leaders.local.roles;
  const role = roles[rng.int(roles.length)] ?? roles[0]!;
  return { name: `the ${role} of ${province}`, kind: "local" };
}

/** The step shown on the map (REBL-008). */
export function mapStep(u: Unrest, risen: boolean): Step {
  return risen ? "rising" : stepOf(u);
}

// ---------------------------------------------------------------- 5.2 sparks

export function sparkKind(spark: string): string | null {
  for (const [kind, list] of Object.entries(config.sparks)) if (list.includes(spark)) return kind;
  return null;
}

/**
 * A spark in a province with riots or worse starts a rising at once
 * (REBL-004, REBL-010); requisitioning and a failed harvest count only where
 * the province is already *Hungry*.
 */
export function sparkStartsRising(u: Unrest, spark: string, hungry: boolean): boolean {
  if (sparkKind(spark) === null) return false;
  if (config.sparks_needing_hungry.includes(spark) && !hungry) return false;
  const step = stepOf(u);
  return step === "riots" || step === "plotting";
}

// ---------------------------------------------------------------- 5.3 cause, demand and leader

export interface CauseInputs {
  /** The province's heaviest grievance. */
  heaviest?: string;
  /** Number of grievances in the province. */
  grievances: number;
  /** A pretender has a right to the province. */
  pretenderRight?: boolean;
  /** The event tree's highest support for a new ideology in the province (0..1). */
  ideologySupport?: number;
  /** The age of revolutions has begun. */
  ageOfRevolutions?: boolean;
}

/** The cause from the heaviest grievance (REBL-013). A pretender with a right plus any grievance wins. */
export function causeOf(i: CauseInputs): Cause | null {
  if (i.pretenderRight && i.grievances >= 1) return "Pretender";
  if (i.ageOfRevolutions && i.grievances >= 1 && (i.ideologySupport ?? 0) >= config.new_ideas.min_support) return "New ideas";
  if (!i.heaviest) return null;
  for (const [c, def] of Object.entries(CAUSES) as [Cause, (typeof CAUSES)[Cause]][]) if (def.grievances.includes(i.heaviest)) return c;
  return null;
}

export function demandOf(cause: Cause): string {
  return CAUSES[cause].demand;
}

export function joinersOf(cause: Cause): string {
  return CAUSES[cause].joiners;
}

export function causeGrievances(cause: Cause): string[] {
  return [...CAUSES[cause].grievances];
}

export interface Leader {
  name: string;
  kind: LeaderKind;
}

/** The leader kind a cause draws (REBL-017). */
export function leaderKindFor(cause: Cause): LeaderKind {
  return CAUSES[cause].leader as LeaderKind;
}

/** What a leader kind brings (REBL-017). */
export function leaderBrings(kind: LeaderKind): string {
  return config.leaders[kind].brings;
}

/** Leaders a rising may have: the cause's own, and a veteran where returned soldiers are among the homeless (REBL-017). */
export function possibleLeaders(cause: Cause, veteransAmongHomeless: boolean): LeaderKind[] {
  const out: LeaderKind[] = [leaderKindFor(cause)];
  if (veteransAmongHomeless && !out.includes("veteran")) out.push("veteran");
  return out;
}

/** How fast a faith rising spreads its faith to neighbours: twice as fast under a preacher (REBL-018). */
export function faithSpreadFactor(r: Pick<Rising, "cause" | "leader">): number {
  return r.cause === "Faith" && r.leader?.kind === "preacher" ? config.preacher_faith_spread : 1;
}

// ---------------------------------------------------------------- the rising

export interface Rising {
  id: string;
  cause: Cause;
  /** The grievance that set the cause, shown on the card. */
  grievance: string;
  demand: string;
  leader: Leader | null;
  /** The spark that started it, or "roll". */
  reason: string;
  provinces: string[];
  /** Men by class of origin. */
  men: Record<string, number>;
  sources: ArmsSource[];
  foodMonths: number;
  growing: boolean;
  monthsHeld: number;
  lordsRevolt: boolean;
  lord: string | null;
  resistance: boolean;
  backer: string | null;
  holdsCastle: boolean;
  holdsCapital: boolean;
  /** The rising is in or next to the capital's province (D-REBL-8). */
  nearCapital: boolean;
  holdsWholeLordLand: boolean;
  army: boolean;
  /** The revolution event that raised it, or null (D-REBL-4). */
  revolution: string | null;
  ended: null | "granted" | "talked" | "melted" | "starved" | "scattered" | "won";
  cardShown: boolean;
}

export function newRising(id: string, cause: Cause, province: string, init: Partial<Rising> = {}): Rising {
  return {
    id,
    cause,
    grievance: CAUSES[cause].grievances[0] ?? cause,
    demand: demandOf(cause),
    leader: null,
    reason: "roll",
    provinces: [province],
    men: {},
    sources: [],
    foodMonths: 0,
    growing: true,
    monthsHeld: 0,
    lordsRevolt: false,
    lord: null,
    resistance: false,
    backer: null,
    holdsCastle: false,
    holdsCapital: false,
    nearCapital: false,
    holdsWholeLordLand: false,
    army: false,
    revolution: null,
    ended: null,
    cardShown: false,
    ...init,
  };
}

/** A rising begins: from the roll or a spark, the card appears (REBL-007, REBL-011). */
export function startRising(id: string, cause: Cause, province: string, reason = "roll", leader: Leader | null = null): Rising {
  return newRising(id, cause, province, { reason, leader, cardShown: true });
}

/** Settlers taking local people's tiles raise a resistance: same rules, their tiles back as the demand (REBL-016). */
export function startResistance(id: string, province: string, leader: Leader): Rising {
  return newRising(id, "Homeland", province, { resistance: true, leader, demand: "their tiles back", grievance: "Tiles taken", cardShown: true, reason: "settlers took local tiles" });
}

/** A resistance plays by the same rules as any rising, so it can win (REBL-016). */
export function canWin(_r: Rising): boolean {
  return true;
}

export function totalMen(r: Rising): number {
  return Object.values(r.men).reduce((a, b) => a + b, 0);
}

// ---------------------------------------------------------------- 5.4 strength

/** Multiplier of an arms step (REBL-027). */
export function armsMultiplier(a: Arms): number {
  return config.arms.multiplier[a];
}

/** The highest arms step the sources give; each step above Tools needs one source (REBL-027, REBL-028). */
export function armsFrom(sources: readonly ArmsSource[]): Arms {
  const have = new Set(sources);
  let best: Arms = "Tools";
  for (const [step, ways] of Object.entries(config.arms.sources) as [Arms, string[][]][]) {
    if (ways.some((w) => w.every((x) => have.has(x as ArmsSource))) && ARMS.indexOf(step) > ARMS.indexOf(best)) best = step;
  }
  return best;
}

export function armsOf(r: Rising): Arms {
  return armsFrom(r.sources);
}

/** In battle a veteran leader makes the rebels fight one step better armed (REBL-019). */
export function battleArms(r: Rising): Arms {
  if (r.leader?.kind !== "veteran") return armsOf(r);
  // The veteran's step is the one he gives as an arms source, so it is not counted twice.
  const a = armsFrom(r.sources.filter((x) => x !== "veteran leader"));
  return ARMS[Math.min(ARMS.length - 1, ARMS.indexOf(a) + config.veteran_arms_steps)]!;
}

/** Strength = Men × Arms × Leader × Ground (REBL-021). The leader and ground factors come from warfare and the province. */
export function strength(men: number, arms: Arms, leaderFactor = 1, groundFactor = 1): number {
  return men * armsMultiplier(arms) * leaderFactor * groundFactor;
}

/** Rebels fight as this warfare kind (REBL-022). */
export const REBEL_BAND: string = config.battle_kind;
export const LOCALS_BONUS: string = config.locals_bonus_name;

/** Rebels fighting in rough ground of their province get *Locals know the land* (REBL-029). */
export function rebelsGetLocalsBonus(ground: string): boolean {
  return provinceConfig.locals_rough_bonus.grounds.includes(ground);
}

/** The ground factor of rebels in their province: 1 plus the province's *Locals know the land* bonus on rough ground. */
export function rebelGroundFactor(ground: string): number {
  return 1 + (rebelsGetLocalsBonus(ground) ? provinceConfig.locals_rough_bonus.bonus : 0);
}

/** Rebels holding a castle fight from its walls (REBL-030). */
export function fightsFromWalls(r: Rising): boolean {
  return r.holdsCastle;
}

/** Join share of a class while the rising grows (REBL-024). */
export function joinShare(cause: Cause, cls: string, sharesFaithOrTongue = false): number {
  const s = config.join_share;
  if (config.clergy_scholars.includes(cls) && !config.clergy_scholars_causes.includes(cause)) return 0;
  if (cls === "homeless") return s.homeless;
  if (CAUSES[cause].classes.includes(cls)) return s.cause_class;
  if (sharesFaithOrTongue && config.faith_or_tongue_causes.includes(cause)) return s.faith_or_tongue;
  return s.other;
}

/** People of a province the muster draws from. */
export interface Pool {
  classes: Record<string, number>;
  recruits: number;
  /** Classes whose men share the rebels' faith or tongue. */
  sharing?: string[];
}

/**
 * One month of muster while the rising grows (REBL-023 to REBL-026): men
 * leave their classes (their slots go empty) and stop being recruits.
 * Returns the men who joined, by class.
 */
export function muster(r: Rising, pool: Pool): Record<string, number> {
  const joined: Record<string, number> = {};
  if (!r.growing || r.ended) return joined;
  for (const [cls, n] of Object.entries(pool.classes)) {
    const k = Math.floor(n * joinShare(r.cause, cls, pool.sharing?.includes(cls) ?? false) + 1e-9);
    if (k <= 0) continue;
    joined[cls] = k;
    pool.classes[cls] = n - k;
    r.men[cls] = (r.men[cls] ?? 0) + k;
  }
  takeFromRecruits(pool, Object.values(joined).reduce((a, b) => a + b, 0));
  return joined;
}

/** Men who join the rebels are no longer recruits for the owner (REBL-026). */
export function takeFromRecruits(pool: Pool, men: number): void {
  pool.recruits = Math.max(0, pool.recruits - men);
}

/** The rising grows while its cause still holds; once fixed it stops (REBL-025, REBL-043). */
export function updateGrowth(r: Rising, grievancesHeld: readonly string[]): boolean {
  const own = causeGrievances(r.cause);
  r.growing = own.length === 0 || own.some((g) => grievancesHeld.includes(g));
  return r.growing;
}

export interface JoiningLord {
  name: string;
  loyalty: Loyalty;
  retinue: number;
  sharesFaithOrTongue: boolean;
}

/** Loyal lords keep out of risings and their retinues fight for the owner (REBL-055). */
export function lordMayJoin(l: JoiningLord): boolean {
  return l.loyalty !== "Loyal";
}

/**
 * A lord joins with all his retinue at once (REBL-024); a disloyal lord of
 * the rebels' faith or tongue turns it into a lord's revolt with Soldiers'
 * arms (REBL-040). Returns the men who joined.
 */
export function lordJoins(r: Rising, l: JoiningLord): number {
  if (!lordMayJoin(l)) return 0;
  r.men["retinue"] = (r.men["retinue"] ?? 0) + l.retinue;
  if (!r.sources.includes("lord's retinue")) r.sources.push("lord's retinue");
  if (l.loyalty === "In revolt" || (l.loyalty === "Disloyal" && l.sharesFaithOrTongue)) {
    r.lordsRevolt = true;
    r.lord = l.name;
  }
  return l.retinue;
}

/** A lord at loyalty *In revolt* is a lord's revolt holding his lands (REBL-060). */
export function lordsRevolt(id: string, lord: JoiningLord, lands: string[]): Rising {
  const r = newRising(id, "Lord", lands[0] ?? "", { provinces: [...lands], leader: { name: lord.name, kind: "the lord himself" }, cardShown: true, holdsWholeLordLand: true, army: true });
  lordJoins(r, lord);
  return r;
}

// ---------------------------------------------------------------- food

/**
 * One month of food (REBL-031 to REBL-033): from the local store, else by
 * foraging, which burns tiles (how many is the foraging limit of warfare;
 * the caller passes it) and adds *Burned homes*; with neither, a tenth of the
 * men go to hunger and desertion.
 */
export function feed(r: Rising, store: { months: number; forageTiles: number; tilesBurnedByForage: number }): { from: "store" | "forage" | "none"; tilesBurned: number; burnedHomes: boolean; lost: number } {
  if (store.months > 0) return { from: "store", tilesBurned: 0, burnedHomes: false, lost: 0 };
  if (store.forageTiles > 0) {
    const n = Math.min(store.forageTiles, store.tilesBurnedByForage);
    return { from: "forage", tilesBurned: n, burnedHomes: n > 0, lost: 0 };
  }
  return { from: "none", tilesBurned: 0, burnedHomes: false, lost: starve(r) };
}

/** Removes a tenth of the men, spread over their classes. Returns the men lost. */
export function starve(r: Rising): number {
  let lost = 0;
  for (const [cls, n] of Object.entries(r.men)) {
    const k = Math.round(n * config.starving_loss);
    r.men[cls] = n - k;
    lost += k;
  }
  return lost;
}

// ---------------------------------------------------------------- 5.5 severity and spread

/** Severity tier by size (INV-REBL-4, REBL-034, REBL-044). */
export function severity(r: Pick<Rising, "provinces" | "holdsCapital" | "holdsWholeLordLand" | "army"> & { nearCapital?: boolean }): Tier {
  if (r.nearCapital && config.great_revolt_near_capital) return "Great revolt";
  const n = r.provinces.length;
  if (n > config.severity.rebellion_max || r.holdsCapital || r.holdsWholeLordLand) return "Great revolt";
  if (n >= config.severity.rebellion_min) return "Rebellion";
  return r.army ? "Rising" : "Riot";
}

export interface TierEffects {
  /** Share of tax, recruits, food and trade the owner still gets from a held province. */
  ownerGets: number;
  officialFlees: boolean;
  neighbourLordsOfFaithOrTongueWaver: boolean;
  besiegeCastles: boolean;
  civilWar: boolean;
  lordsPickSides: boolean;
  alliesMayStayOut: boolean;
  rivalsMayAttack: boolean;
}

/** What each tier does (REBL-035 to REBL-037). */
export function tierEffects(t: Tier): TierEffects {
  const held = t !== "Riot";
  const rebellion = t === "Rebellion" || t === "Great revolt";
  const great = t === "Great revolt";
  return {
    ownerGets: held ? 0 : 1,
    officialFlees: held,
    neighbourLordsOfFaithOrTongueWaver: rebellion,
    besiegeCastles: rebellion,
    civilWar: great,
    lordsPickSides: great,
    alliesMayStayOut: great,
    rivalsMayAttack: great,
  };
}

/** Which way a neighbour's spread chance moves for one condition, +1 higher or −1 lower (REBL-038, REBL-054). */
export function spreadDirection(condition: string): 1 | -1 | 0 {
  if (config.spread.higher.includes(condition)) return 1;
  if (config.spread.lower.includes(condition)) return -1;
  return 0;
}

/** The net direction of all a neighbour's conditions against a neighbour with none. */
export function spreadLean(conditions: readonly string[]): number {
  return conditions.reduce((a, c) => a + spreadDirection(c), 0);
}

/** A neighbour sharing a grievance with the rebels gets *Neighbour in revolt* (REBL-039). */
export function neighbourInRevolt(r: Rising, neighbourGrievances: readonly string[]): boolean {
  if (r.ended) return false;
  const rebels = new Set([r.grievance, ...causeGrievances(r.cause)]);
  return neighbourGrievances.some((g) => rebels.has(g));
}

/** A garrisoned castle on the road makes the rebels besiege it to pass (REBL-054). */
export function mustBesiegeToPass(garrisonedCastleOnRoad: boolean): boolean {
  return garrisonedCastleOnRoad;
}

/**
 * A season of holding a province (REBL-042): loot one town building, the
 * market first; officials killed or driven out; scholars flee.
 */
export function holdSeason(townBuildings: string[]): { looted: string | null; officialsGone: boolean; scholarsFlee: boolean } {
  let i = townBuildings.findIndex((b) => config.loot_first.includes(b));
  if (i < 0) i = townBuildings.length > 0 ? 0 : -1;
  const looted = i >= 0 ? townBuildings.splice(i, 1)[0]! : null;
  return { looted, officialsGone: true, scholarsFlee: true };
}

/** Looting happens once a season. */
export function lootsThisMonth(monthsHeld: number): boolean {
  return monthsHeld > 0 && monthsHeld % provinceConfig.months_per_season === 0;
}

// ---------------------------------------------------------------- 5.6 answering

function endRising(r: Rising, how: NonNullable<Rising["ended"]>): void {
  r.ended = how;
  r.growing = false;
}

/** The rebels go back to their classes. Returns men by class. */
export function sendHome(r: Rising): Record<string, number> {
  const back = { ...r.men };
  r.men = {};
  return back;
}

/**
 * Granting the demand (REBL-045): pays what was asked, ends the rising at
 * once, the rebels go home, the cause grievance goes, and other provinces
 * with the same grievance become more likely to rise and ask the same.
 */
export function grantDemand(r: Rising, others: { name: string; grievances: string[] }[]): { back: Record<string, number>; removed: string[]; emboldened: string[] } {
  endRising(r, "granted");
  const removed = causeGrievances(r.cause);
  const emboldened = others.filter((o) => o.grievances.some((g) => removed.includes(g))).map((o) => o.name);
  return { back: sendHome(r), removed, emboldened };
}

/** Talks give half the demand; they usually work on hunger, tax and town and rarely on faith or homeland (REBL-046). */
export function talk(cause: Cause): { share: number; works: "usually" | "rarely" | "no rule" } {
  const t = config.talk;
  const works = t.usually_works.includes(cause) ? "usually" : t.rarely_works.includes(cause) ? "rarely" : "no rule";
  return { share: t.share, works };
}

/**
 * Bribing the leader (REBL-047): he leaves and his bonus goes; the rebels may
 * split or melt away, but a faith rising finds a new preacher quickly.
 */
export function bribeLeader(r: Rising, newPreacher?: string): { left: string | null; mayMeltOrSplit: boolean; newLeader: Leader | null } {
  const left = r.leader?.name ?? null;
  r.leader = null;
  if (r.cause === "Faith") r.leader = { name: newPreacher ?? "a new preacher", kind: "preacher" };
  return { left, mayMeltOrSplit: r.cause !== "Faith", newLeader: r.leader };
}

/** The leader factor a rising gets from its leader: none without one. */
export function hasLeaderBonus(r: Rising): boolean {
  return r.leader !== null;
}

/** Bribing a lord or a pretender costs more than bribing anyone else (REBL-047). */
export function bribeCostsMore(kind: LeaderKind): boolean {
  return config.bribe_costs_more.includes(kind);
}

/**
 * Waiting a month (REBL-048): the owner loses the province's tax and output;
 * rebels without food or arms shrink, but not those holding a castle, with a
 * lord or with foreign gold.
 */
export function waitMonth(r: Rising, hasFood: boolean): { ownerLosesTaxAndOutput: boolean; shrinks: boolean } {
  const protectedRising = r.holdsCastle || r.lordsRevolt || r.lord !== null || r.sources.includes("foreign gold");
  const noArms = armsOf(r) === "Tools";
  return { ownerLosesTaxAndOutput: true, shrinks: !protectedRising && (!hasFood || noArms) };
}

/** Beaten rebels scatter: a third die, a third flee abroad, a third go home as homeless (REBL-049). */
export function scatter(r: Rising): { die: number; flee: number; homeless: number } {
  const men = totalMen(r);
  const die = Math.round(men * config.scatter.die);
  const flee = Math.round(men * config.scatter.flee);
  endRising(r, "scattered");
  r.men = {};
  return { die, flee, homeless: men - die - flee };
}

/** No-rising locks of a province (INV province unrest state). */
export interface Locks {
  /** Year until which a rising of this cause cannot start, per cause. */
  cause: Partial<Record<Cause, number>>;
  /** Year until which no rising can start. */
  any: number;
}

export function newLocks(): Locks {
  return { cause: {}, any: 0 };
}

export function mayRise(l: Locks, cause: Cause, year: number): boolean {
  return year >= l.any && year >= (l.cause[cause] ?? 0);
}

export interface TreatmentResult {
  survivorsHome: boolean;
  calmsFaster: boolean;
  leaderMayRiseAgain: boolean;
  leaderExecuted: boolean;
  /** Provinces given *Bloodshed* and for how many years. */
  bloodshed: { provinces: string[]; years: number };
  lordsWaver: string[];
}

/** Pardon, punish the leaders or massacre after a victory (REBL-050, REBL-041). */
export function treat(
  r: Rising,
  t: Treatment,
  locks: Locks,
  year: number,
  sameFaithOrTongue: { provinces: string[]; lords: string[] } = { provinces: [], lords: [] },
): TreatmentResult {
  const out: TreatmentResult = { survivorsHome: false, calmsFaster: false, leaderMayRiseAgain: false, leaderExecuted: false, bloodshed: { provinces: [], years: 0 }, lordsWaver: [] };
  if (t === "Pardon") {
    out.survivorsHome = true;
    out.calmsFaster = true;
    out.leaderMayRiseAgain = true;
  } else if (t === "Punish the leaders") {
    out.leaderExecuted = true;
    r.leader = null;
    locks.cause[r.cause] = Math.max(locks.cause[r.cause] ?? 0, year + config.punish_lock_years);
  } else {
    locks.any = Math.max(locks.any, year + config.massacre_lock_years);
    out.bloodshed = { provinces: [...sameFaithOrTongue.provinces], years: config.bloodshed_years };
    out.lordsWaver = [...sameFaithOrTongue.lords];
  }
  return out;
}

// ---------------------------------------------------------------- 5.8 if the rebels win

/** Held 12 months with no army defeating them, or the capital taken (REBL-056). */
export function isWon(r: Pick<Rising, "monthsHeld" | "holdsCapital">): boolean {
  return r.holdsCapital || r.monthsHeld >= config.win_hold_months;
}

/** Marks the rising won when it has held long enough or holds the capital (REBL-056). */
export function checkWin(r: Rising): boolean {
  if (!r.ended && isWon(r)) endRising(r, "won");
  return r.ended === "won";
}

/** Advances a month held; a defeat resets the count. Marks the rising won when it is. */
export function advanceMonth(r: Rising, defeated = false): boolean {
  r.monthsHeld = defeated ? 0 : r.monthsHeld + 1;
  if (isWon(r)) endRising(r, "won");
  return r.ended === "won";
}

export interface Outcome {
  /** What happens; for Lord and Pretender risings, the alternatives of which one happens. */
  results: string[];
  oneOf: boolean;
  taxFixed?: { rate: string; years: number };
  chartersIn?: string[];
}

/** What a won rising gets by cause (REBL-057). */
export function outcome(r: Rising, tier: Tier = severity(r)): Outcome {
  const o = config.outcomes;
  switch (r.cause) {
    case "Tax":
      return { results: [...o.Tax], oneOf: false, taxFixed: { rate: config.tax_win_rate, years: config.tax_win_years } };
    case "Faith":
      return tier === "Great revolt" ? { results: [...o["Faith great revolt"]], oneOf: false } : { results: [...o.Faith], oneOf: false, chartersIn: [...r.provinces] };
    case "Lord":
    case "Pretender":
      return { results: [...o[r.cause]], oneOf: true };
    default:
      return { results: [...o[r.cause]], oneOf: false };
  }
}

/** A won homeland rising breaks away: a catalogue entity if one fits, else a new country named for the homeland (REBL-058). */
export function breakAway(people: string, homeland: string, catalogue: (people: string) => string | null): { country: string; fromCatalogue: boolean } {
  const hit = catalogue(people);
  return hit ? { country: hit, fromCatalogue: true } : { country: homeland, fromCatalogue: false };
}

// ---------------------------------------------------------------- 5.9 other systems

/** Provinces with riots or rebels count as *In revolt* (REBL-059). */
export function inRevoltCount(provinces: { step: Step; rebels: boolean }[]): number {
  const moods = provinces.map((p) => ({ mood: (p.step === "plotting" || p.step === "rising" ? "rebels" : p.step) as Mood, rebels: p.rebels }));
  return inRevolt(moods);
}

/** An event's `unrest` effect lands as one named grievance (REBL-061; province stats §15). */
export function unrestGrievances(eventGrievance: string): string[] {
  return Array.from({ length: config.unrest_grievances_per_effect }, () => eventGrievance);
}

export interface HostileAct {
  by: string;
  against: string;
  act: "paid rebels";
  known: boolean;
}

/** A rival paying the rebels is a hostile act the victim may find out about through envoys (REBL-062). */
export function payRebels(r: Rising, by: string, against: string): HostileAct {
  r.backer = by;
  if (!r.sources.includes("foreign gold")) r.sources.push("foreign gold");
  return { by, against, act: "paid rebels", known: false };
}

export function envoyFindsOut(a: HostileAct): void {
  a.known = true;
}

// ---------------------------------------------------------------- 5.10 the card

export interface CardInputs {
  holds: string;
  neighboursSharing: number;
  spreadTo: string[];
}

/** The rebellion card (REBL-063). */
export interface RebellionCard {
  cause: string;
  demand: string;
  leader: string;
  men: string;
  arms: string;
  holds: string;
  food: string;
  severity: string;
  backer: string;
  spread: string;
  answers: string[];
}

export function rebellionCard(r: Rising, c: CardInputs): RebellionCard {
  const arms = armsOf(r);
  const demand = (config.card.demand as Partial<Record<Cause, string>>)[r.cause] ?? r.demand;
  const n = r.provinces.length;
  return {
    cause: r.grievance,
    demand,
    leader: r.leader?.name ?? "",
    men: `Men ${totalMen(r).toLocaleString("en-US")}`,
    arms: `Arms: ${config.card.arms[arms]} (x${armsMultiplier(arms)})`,
    holds: `Holds ${c.holds}`,
    food: `Food: ${r.foodMonths} months`,
    severity: `Severity ${severity(r)} · ${n} province${n === 1 ? "" : "s"} · ${c.neighboursSharing} neighbours share the grievance`,
    backer: r.backer ? `Backed by ${r.backer}` : "Backed by nobody yet",
    spread: c.spreadTo.length ? `May spread to ${c.spreadTo.join(", ")}` : "May spread to nowhere next month",
    answers: [...config.card.answers],
  };
}

// ---------------------------------------------------------------- revolution events (D-REBL-4)

/** A revolution event raises a tagged rising at once in every province that meets its conditions. */
export function revolutionRisings(event: string, provinces: { name: string; meets: boolean }[]): Rising[] {
  return provinces
    .filter((p) => p.meets)
    .map((p, i) => newRising(`${event}-${i + 1}`, "New ideas", p.name, { reason: event, revolution: event, army: true, cardShown: true }));
}

// ---------------------------------------------------------------- leader stats (D-REBL-10)

export interface LeaderStats {
  might: number;
  cunning: number;
  logistics: number;
}

/** A leader drawn by cause: a local gets a role from the list; stats as a commander's (provisional numbers). */
export function chooseLeader(cause: Cause, province: string, rng: Rng): Leader & LeaderStats & { brings: string } {
  const kind = leaderKindFor(cause);
  const roles = config.leaders.local.roles;
  const name = kind === "local" ? `the ${roles[rng.int(roles.length)] ?? "village elder"} of ${province}` : kind;
  const cunning = config.provisional.leader_cunning;
  const might = config.provisional.leader_might;
  return { name, kind, might, cunning, logistics: 1, brings: config.leaders[kind].brings };
}
