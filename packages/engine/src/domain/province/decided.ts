import { provinceConfig, type ClassName, type ProvinceConfig } from "./model.ts";
import { type HarvestRoll } from "./land.ts";

/** Rules settled in spec §13 (D-PROV-1 to D-PROV-24). Numbers live in province.json "decided". */

// ---------------------------------------------------------------- tax (D-PROV-10, D-PROV-22)

/** One month's share of the yearly tax owed (PROV-293). */
export function monthlyTax(owedPerYear: number, cfg: ProvinceConfig = provinceConfig): number {
  return owedPerYear / cfg.decided.tax_months_per_year;
}

/** Gold reaching the treasury: owed × (1 − 5 % per day beyond 5) × (1 + collector), never above owed (PROV-293). */
export function taxReaching(owed: number, travelDays: number, collectorEffect = 0, cfg: ProvinceConfig = provinceConfig): number {
  const d = cfg.decided;
  const lost = Math.max(0, travelDays - cfg.tax.free_travel_days) * d.tax_travel_loss_per_day;
  const got = owed * Math.max(0, 1 - lost) * (1 + d.tax_collector_bonus * collectorEffect);
  return Math.min(owed, got);
}

// ---------------------------------------------------------------- sizes (D-PROV-11)

/** Tiles by land-area rank: rank 0 is the smallest province, rank count−1 the largest (PROV-294). */
export function tilesByAreaRank(rank: number, count: number, cfg: ProvinceConfig = provinceConfig): number {
  if (count <= 1) return cfg.tiles.min;
  return Math.round(cfg.tiles.min + ((cfg.tiles.max - cfg.tiles.min) * rank) / (count - 1));
}

/** Town size from its townsfolk (PROV-294). */
export function townSizeFor(townsfolk: number, cfg: ProvinceConfig = provinceConfig): string {
  let size = "hamlet";
  for (const [name, floor] of Object.entries(cfg.decided.town_size_floors)) if (townsfolk >= floor) size = name;
  return size;
}

/** Town tiles a town of this many townsfolk takes (PROV-294). */
export function townTilesFor(townsfolk: number, cfg: ProvinceConfig = provinceConfig): number {
  return cfg.decided.town_tiles_at.filter((n) => townsfolk >= n).length;
}

// ---------------------------------------------------------------- harvest steps (D-PROV-14)

/** Each harvest step moves the roll one band better; bumper is the top; steps add up (PROV-295). */
export function harvestWithSteps(roll: HarvestRoll, steps: number, cfg: ProvinceConfig = provinceConfig): HarvestRoll {
  const order = cfg.food.harvest_order as HarvestRoll[];
  const i = Math.min(order.length - 1, Math.max(0, order.indexOf(roll) + steps));
  return order[i] ?? roll;
}

// ---------------------------------------------------------------- people (D-PROV-8, D-PROV-17)

/** A class's yearly rate with modifiers in percentage points: 4 % + 0.5 = 4.5 % (PROV-297). */
export function rateWithPoints(baseRate: number, points: number[]): number {
  return Math.max(0, baseRate + points.reduce((a, b) => a + b, 0) / 100);
}

/** Recruits one year adds: 1 % of every class except clergy and scholars (PROV-296). */
export function yearlyRecruits(classes: Partial<Record<ClassName, number>>, cfg: ProvinceConfig = provinceConfig): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [c, n] of Object.entries(classes)) {
    if (cfg.recruits.no_recruits_from.includes(c)) continue;
    out[c] = Math.floor((n ?? 0) * cfg.decided.recruit_share_per_class);
  }
  return out;
}

/** Homeless who drift to free slots elsewhere in a year (PROV-296). */
export function homelessDriftPerYear(homeless: number, cfg: ProvinceConfig = provinceConfig): number {
  return Math.floor(homeless * cfg.decided.homeless_drift_share);
}

/** Refugees settle after this many years (PROV-296). */
export function refugeesSettle(yearsHere: number, cfg: ProvinceConfig = provinceConfig): boolean {
  return yearsHere >= cfg.decided.refugee_settle_years;
}

/** Homeless above 5 % cut tax and trade ratio gain by 5 % per 5 % (D-PROV-1). */
export function homelessCut(share: number, cfg: ProvinceConfig = provinceConfig): number {
  const over = share - cfg.homeless.theft_from;
  if (over <= 0) return 0;
  return Math.ceil(Math.round(over * 1000) / 1000 / cfg.homeless.theft_step) * cfg.decided.homeless_trade_cut_per_5pct;
}

// ---------------------------------------------------------------- rebels (D-PROV-2, PROV-236)

export type DecidedMood = "calm" | "grumbling" | "rioting" | "plotting";

/** Mood with the judge's raised riot bar; 4+ is Plotting (PROV-231, PROV-232, PROV-236). */
export function moodOf(count: number, judge = false, cfg: ProvinceConfig = provinceConfig): { mood: DecidedMood; rioting: boolean; plotting: boolean } {
  const riotsAt = cfg.grievances.levels.riots + (judge ? cfg.decided.judge_riots_extra : 0);
  const plotting = count >= cfg.decided.plotting_at;
  const rioting = count >= riotsAt;
  const mood: DecidedMood = plotting ? "plotting" : rioting ? "rioting" : count >= cfg.grievances.levels.grumbling ? "grumbling" : "calm";
  return { mood, rioting, plotting };
}

/** Monthly chance a Plotting province rises: 5 %, 15 %, 30 % at 4, 5, 6+ grievances (PROV-232). */
export function riseChance(count: number, cfg: ProvinceConfig = provinceConfig): number {
  if (count < cfg.decided.plotting_at) return 0;
  const r = cfg.decided.rise_chance as Record<string, number>;
  return r[String(Math.min(6, count))] ?? 0;
}

/** Whether a spark (event) can start a rising at this many grievances (PROV-232). */
export function sparkCanStart(count: number, cfg: ProvinceConfig = provinceConfig): boolean {
  return count >= cfg.decided.spark_at;
}

/** Men of a rising: they come from the recruit pool (PROV-232, D-PROV-18). */
export function risingMen(recruitPool: number, wanted: number): number {
  return Math.max(0, Math.min(recruitPool, wanted));
}

// ---------------------------------------------------------------- colonies (D-PROV-7)

export type LandOwner = "none" | "stateless people" | "country" | "tribal country";

/** Only land no realm owns can be colonised; stateless peoples' land counts as unowned (PROV-250, PROV-298). */
export function canColonise(owner: LandOwner): boolean {
  return owner === "none" || owner === "stateless people";
}

/** The subjects design's stage for a settlement step (PROV-298). */
export function settlementStage(step: string, cfg: ProvinceConfig = provinceConfig): string | null {
  return (cfg.decided.settlement_stages as Record<string, string>)[step] ?? null;
}

// ---------------------------------------------------------------- officials, lords (D-PROV-13, D-PROV-23, D-PROV-24)

export type Kinship = "own" | "cousin" | "stranger";

/** Years an official takes to learn a province (PROV-299). */
export function officialLearnYears(k: Kinship, cfg: ProvinceConfig = provinceConfig): number {
  return cfg.decided.official_learn_years[k];
}

/** What a lord gets from a province he holds without his own official (PROV-300). */
export function lordUngovernedGives(tax: number, recruits: number, cfg: ProvinceConfig = provinceConfig): { tax: number; recruits: number } {
  const s = cfg.decided.lord_ungoverned_share;
  return { tax: tax * s, recruits: Math.floor(recruits * s) };
}

/** Provinces one official runs: 1 with G1, 2 with G9, 3 with G16, plus one each for B2, G11, T14 (D-PROV-24). */
export function provincesPerOfficial(known: string[], cfg: ProvinceConfig = provinceConfig): number {
  const o = cfg.decided.officials_per_province;
  let base = 1;
  if (known.includes("G9")) base = o.G9;
  if (known.includes("G16")) base = o.G16;
  return base + o.extra_from.filter((x) => known.includes(x)).length;
}

// ---------------------------------------------------------------- health (D-PROV-4, D-PROV-15)

/** Days of the month on which the weekly plague step runs (D-PROV-4). */
export function plagueWeekDays(cfg: ProvinceConfig = provinceConfig): number[] {
  return [...cfg.decided.plague_week_days];
}

/** Men an army loses to sickness in a month (PROV-301). */
export function sicknessLoss(men: number, sickness: string, feverLand = false, cfg: ProvinceConfig = provinceConfig): number {
  const t = cfg.decided.sickness_monthly as Record<string, number>;
  const share = feverLand ? Math.max(t.High ?? 0, t[sickness] ?? 0) : t[sickness] ?? 0;
  return Math.floor(men * share);
}

/**
 * Men an army loses to its ground's sickness in a month, worst for soldiers not born on that
 * ground: men born there lose half the rate, and fever land spares them (PROV-048, PROV-301, D-PROV-15).
 */
export function armySickness(men: number, sickness: string, bornOnGround: boolean, feverLand = false, cfg: ProvinceConfig = provinceConfig): number {
  if (!bornOnGround) return sicknessLoss(men, sickness, feverLand, cfg);
  const t = cfg.decided.sickness_monthly as Record<string, number>;
  return Math.floor(men * (t[sickness] ?? 0) * cfg.decided.sickness_local_share);
}

// ---------------------------------------------------------------- births, events, sums (D-PROV-8, D-PROV-16, D-PROV-1)

/** A class's yearly birth rate under named conditions, each worth percentage points (PROV-297). */
export function birthRateWith(base: number, conditions: string[], cfg: ProvinceConfig = provinceConfig): number {
  const pts = cfg.decided.birth_points as Record<string, number>;
  return rateWithPoints(base, conditions.map((c) => pts[c] ?? 0));
}

/** The concrete change an event-tree effect makes to a province (PROV-270, D-PROV-16). */
export function eventEffectResult(effect: string, cfg: ProvinceConfig = provinceConfig): string | null {
  const key = effect.split(" ")[0] ?? effect;
  return (cfg.decided.event_effects as Record<string, string>)[key] ?? null;
}

/** What a country-card stat sums over its provinces (PROV-260). */
export function countrySumOf(stat: string, cfg: ProvinceConfig = provinceConfig): string | null {
  return (cfg.decided.country_sums as Record<string, string>)[stat] ?? null;
}

// ---------------------------------------------------------------- losing buildings (D-PROV-3)

/** What happens to a building after a cause (PROV-063): burned, sacked, demolished or ploughed under is lost; 10 years neglected drops a step; one unpaid month neglects it. */
export function buildingAfter(cause: string): "lost" | "one step down" | "neglected" {
  if (cause.includes("neglected for 10 years")) return "one step down";
  if (cause.includes("unpaid for a month")) return "neglected";
  return "lost";
}

/** A neglected building works at half (buildings §5.2). */
export function neglectedOutput(cfg: ProvinceConfig = provinceConfig): number {
  return cfg.decided.neglected_output;
}

/** Gold reaching the treasury from a province that owes `owed` (PROV-163, PROV-293). An enemy army on the road adds `blockedDays`. */
export function reachesTreasury(owed: number, c: { official?: boolean; lord?: boolean; occupied?: boolean; days?: number; blockedDays?: number }, cfg: ProvinceConfig = provinceConfig): number {
  if (c.occupied) return 0;
  let share = 1;
  if (c.lord) share = cfg.tax.lord_share;
  else if (c.official === false) share = cfg.tax.no_official_share;
  return taxReaching(owed * share, (c.days ?? 0) + (c.blockedDays ?? 0), 0, cfg);
}
