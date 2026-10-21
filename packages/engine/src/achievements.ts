import * as A from "./domain/achievements/index.ts";
import * as rs from "./domain/research/index.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { catalogueRecord } from "./domain/scenario-setup/catalogue.ts";
import type { World } from "./world.ts";
import { GRIEVANCES, moodIndex } from "./moods.ts";
import { HARVESTS, harvestMonthsOf } from "./food.ts";
import { schoolsOf } from "./research.ts";
import { bondOf, subjectTies } from "./subjects.ts";
import { hasCastle } from "./works.ts";
import { realmStrengths } from "./realmStrengths.ts";

/**
 * Achievements in the live game (domain/achievements "How the player uses
 * it"): the player's campaign keeps its eligibility, counters and earned list
 * here, systems tell it of the moments they see (noteMoment), and at the end
 * of each weekly turn, after every other system, the tests of the catalogue
 * run on the player's final values (ACH-033, ACH-082). Unlocks wait in
 * `fresh` until the next snapshot carries them to the client, which keeps
 * them in the player profile on the device (ACH-081). Nothing here changes
 * the simulation (ACH-001).
 */

/** Rows whose stats the engine does not keep yet: shown as "Not in the game yet" and never tested (D-ACH-15). */
export const NOT_YET: ReadonlySet<string> = new Set([
  "famine_averted",
  // The east bridge events (Kulikovo, Kosovo, Ankara, Timur's death) are not loaded by the engine yet.
  "kulikovo_free",
  "kosovo_free",
  "ankara_weathered",
  "timurid_heirs",
  "trade_hub_held",
  "castle_reach_3",
  "charters_5",
  "long_reign",
  "peaceful_succession",
  "castle_by_gold",
  "wintered_well",
  "marshal_victory",
  "style_adopted",
  "ocean_crossed",
  "first_contact",
  "around_the_world",
  "demand_granted",
  "great_revolt_beaten",
  "four_quarters_hold",
  "never_colonised",
  "kept_out_great_war",
  "crash_weathered",
  "japan_whole_1600",
  "sahel_whole_1600",
  "every_macro_region",
]);

export interface Unlock {
  id: string;
  date: string;
  /** Province it happened in, when there is one (ACH-074). */
  province?: number;
}

export interface AchievementLog {
  campaign: A.CampaignAchievements;
  /** The engine's own scratch profile: the real one lives on the device. */
  profile: A.Profile;
  catalogue: A.Catalogue;
  /** Unlocks not yet carried to the client. */
  fresh: Unlock[];
  /** Moments seen since the last turn end, tested then. */
  queue: { moment: string; facts: A.Facts; province?: number }[];
  /** The month last run (yyyy-mm), so monthly moments run once. */
  month: string;
  months: number;
  // Start facts.
  startProvinces: number;
  startKind: string;
  startedAsSubject: boolean;
  // What the last turn end saw, to find what changed.
  allies: string[];
  rivals: string[];
  subject: boolean;
  provinces: number;
  castles: number;
  lords: number;
  debt: number;
  peakDebt: number;
  atWar: boolean;
  // Counters.
  harvestsSeen: number;
  goodStreak: number;
  monthsNoHungry: number;
  monthsNoUnrest: number;
  inventionsDone: number;
  inventionsSinceWar: number;
  regiments: number;
  castlesGained: number;
  lordsCreated: number;
  historical: number;
  nonhistoricalMajor: number;
  /** Distinct non-historical options picked (event:option), for the lifetime row on the device. */
  choices: string[];
  /** Province harvests brought in this campaign (ACH-085). */
  provincesHarvested?: number;
  /** Amounts for the device's lifetime totals not yet read (ACH-085). */
  added?: Record<string, number>;
}

const isoOf = (world: World): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${world.date.year}-${pad(world.date.month)}-${pad(world.date.day ?? 1)}`;
};

function landOf(world: World, n: number): number {
  let k = 0;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !world.provinceWater[p]) k++;
  return k;
}

function castlesOf(world: World, n: number): number {
  let k = 0;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !world.provinceWater[p] && hasCastle(world, p)) k++;
  return k;
}

const lordsOf = (world: World, n: number) => world.lords.filter((l) => l.nation === n && !l.gone);

function startKindOf(world: World, n: number): string {
  try {
    const cid = realmStrengths(world.nationIds[n]!).catalogue;
    return cid && catalogueRecord(cid).representation === "decentralized_polity" ? "decentralised" : "state";
  } catch {
    return "state";
  }
}

/**
 * A new campaign for the player. Only an ironman campaign earns achievements
 * (ACH-034, SET-032); a world started without the options step (tests, the
 * probes) counts as ironman, as the first slice did (ACH-083).
 */
export function startAchievements(world: World, o: { ironman?: boolean } = {}): void {
  const n = world.player;
  if (n < 0) {
    delete world.achievements;
    return;
  }
  const g = world.diplomacy.graph;
  const id = world.nationIds[n]!;
  world.achievements = {
    // Days on or before the start are never reached (ACH-088): The Old Start is not won by starting in 1444.
    campaign: A.newCampaign({
      ironman: o.ironman ?? true,
      realm: id,
      start: isoOf(world),
      ...(world.options ? { difficulty: world.campaign.difficulty } : {}),
      // Any events choice counts (ACH-038); plausible is filed as free, the history not followed.
      ...(world.options?.events ? { events: world.options.events === "historical" ? ("historical" as const) : ("free" as const) } : {}),
    }),
    profile: A.newProfile(),
    // Lifetime rows add up across campaigns, so the device tests them (ACH-028).
    catalogue: { list: A.ACHIEVEMENTS.filter((d) => !NOT_YET.has(d.id) && d.scope === "campaign"), retired: [] },
    fresh: [],
    queue: [],
    month: isoOf(world).slice(0, 7),
    months: 0,
    startProvinces: landOf(world, n),
    startKind: startKindOf(world, n),
    startedAsSubject: bondOf(world, n) !== null,
    allies: dip.relations.alliesOf(g, id),
    rivals: [],
    subject: bondOf(world, n) !== null,
    provinces: landOf(world, n),
    castles: castlesOf(world, n),
    lords: lordsOf(world, n).length,
    debt: world.nationDebt[n]!,
    peakDebt: world.nationDebt[n]!,
    atWar: false,
    harvestsSeen: 0,
    goodStreak: 0,
    monthsNoHungry: 0,
    monthsNoUnrest: 0,
    inventionsDone: 0,
    inventionsSinceWar: 0,
    regiments: 0,
    castlesGained: 0,
    lordsCreated: 0,
    historical: 0,
    nonhistoricalMajor: 0,
    choices: [],
    provincesHarvested: 0,
    added: {},
  };
}

/** A system saw a moment for realm n: tested at the turn's end, the player's realm only (spec §12: no AI). */
export function noteMoment(world: World, n: number, moment: string, facts: A.Facts = {}, province?: number): void {
  const log = world.achievements;
  if (!log || n !== world.player || n < 0) return;
  log.queue.push({ moment, facts, ...(province === undefined ? {} : { province }) });
}

/** An invention finished: era, first anywhere, and the run since the last war (learning rows). */
export function noteInvention(world: World, n: number, id: string): void {
  const log = world.achievements;
  if (!log || n !== world.player) return;
  log.inventionsDone++;
  log.inventionsSinceWar++;
  const inv = rs.invention(id);
  const first = !world.research.some((p, m) => m !== n && p?.known.has(id));
  noteMoment(world, n, "invention_done", { invention: inv.name, invention_era: inv.era, first_in_world: first });
}

/** A land battle ended: who won and how outnumbered they were (war rows). */
export function noteBattle(world: World, winner: number, loser: number, winMen: number, loseMen: number, province: number): void {
  const n = world.player;
  if (!world.achievements || (winner !== n && loser !== n)) return;
  const mine = winner === n ? winMen : loseMen;
  const theirs = winner === n ? loseMen : winMen;
  noteMoment(world, n, "battle_end", { player_won: winner === n, enemy_to_player_men_ratio: mine > 0 ? theirs / mine : 0 }, province);
}

/** A castle fell to realm n's siege: by terms or by storm; it counts as a castle gained (D-ACH-1). */
export function noteSiege(world: World, n: number, result: "terms" | "stormed", province: number): void {
  const log = world.achievements;
  if (!log || n !== world.player) return;
  log.castlesGained++;
  noteMoment(world, n, "siege_end", { siege_result: result }, province);
  noteMoment(world, n, "castle_gained", {}, province);
}

/** A peace was made, before its land changes hands: the player's side, role, whether it won and what it lost (war_end rows). */
export function notePeace(world: World, war: { attackers: string[]; defenders: string[] }, a: number, b: number, ceded: number[]): void {
  const n = world.player;
  if (!world.achievements || n < 0) return;
  const id = world.nationIds[n]!;
  const role = war.attackers.includes(id) ? "attacker" : war.defenders.includes(id) ? "defender" : null;
  if (!role) return;
  const mine = new Set((role === "attacker" ? war.attackers : war.defenders).map((x) => world.nationIndex.get(x)!));
  const theirs = new Set((role === "attacker" ? war.defenders : war.attackers).map((x) => world.nationIndex.get(x)!));
  const lost = ceded.filter((p) => mine.has(world.provinceOwner[p]!)).length;
  const gained = ceded.filter((p) => theirs.has(world.provinceOwner[p]!)).length;
  let ours = 0;
  let foes = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o === n) ours += world.provincePopulation[p]!;
    else if (theirs.has(o)) foes += world.provincePopulation[p]!;
  }
  noteMoment(world, n, "war_end", {
    war_ended_by: "peace_treaty",
    player_signed: a === n || b === n,
    player_role: role,
    player_won: gained > 0 && lost === 0,
    enemy_to_player_people_ratio: ours > 0 ? foes / ours : 0,
    provinces_lost: ceded.filter((p) => world.provinceOwner[p] === n).length,
  });
}

/** Levy foot finished training as a regiment of another arm. */
export function noteRegiment(world: World, n: number): void {
  const log = world.achievements;
  if (!log || n !== world.player) return;
  log.regiments++;
  noteMoment(world, n, "regiment_trained");
}

/** An event option was picked: count historical and non-historical choices for the player's realm. */
export function noteChoice(world: World, n: number | undefined, ev: { id: string; importance?: string; options: { id: string; historical?: boolean }[] }, option: string): void {
  const log = world.achievements;
  if (!log || n !== world.player) return;
  const historical = ev.options.find((o) => o.id === option)?.historical === true;
  if (historical) log.historical++;
  else {
    if (ev.importance === "major") log.nonhistoricalMajor++;
    const key = `${ev.id}:${option}`;
    if (!log.choices.includes(key)) log.choices.push(key);
  }
  noteMoment(world, n, "event_choice");
}

/** The player's final values this turn, under the names the tests read. */
function stateFacts(world: World, log: AchievementLog): A.Facts {
  const n = world.player;
  const id = world.nationIds[n]!;
  const d = world.diplomacy;
  let people = 0;
  let royalOfficials = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceWater[p]) continue;
    people += world.provincePopulation[p]! * 1000;
    if (world.provinceLord[p]! < 0 && world.provinceOfficial[p]! >= 0) royalOfficials++;
  }
  const lords = lordsOf(world, n);
  const research = world.research[n];
  const inScope = rs.tree().inventions.size;
  let tradeShips = 0;
  for (const f of world.navy.fleets) if (f.owner === n) for (const s of f.ships) if (s.type === "cog" || s.type === "junk" || s.type === "dhow") tradeShips++;
  const oaths = dip.country(d, id).oaths.length;
  const years = Math.floor(log.months / 12);
  const g = world.events;
  const tid = g?.treeId[n];
  const roles: { event: string; role: string }[] = [];
  const owns: string[] = [];
  let slavery = false;
  if (g && tid) {
    for (const h of g.state.world.history) for (const [role, ids] of Object.entries(h.roles ?? {})) if ((ids as string[]).includes(tid)) roles.push({ event: h.event, role });
    for (const [place, ps] of g.places) if (ps.some((p) => world.provinceOwner[p] === n)) owns.push(place.replace(/^province:/, "city:"));
    const w = g.state.world;
    slavery = w.flags.some((f) => f.on === tid && f.id === "slavery_abolished") || (w.countries[tid]?.flags ?? []).includes("slavery_abolished");
  }
  return {
    date: isoOf(world),
    months_played: log.months,
    years_played: years,
    gold: world.nationTreasury[n]!,
    people,
    provinces: log.provinces,
    harvests_seen: log.harvestsSeen,
    provinces_harvested: log.provincesHarvested ?? 0,
    capital_good_harvest_streak: log.goodStreak,
    years_in_a_row: log.goodStreak,
    months_no_hungry_province: log.monthsNoHungry,
    months_no_unrest_tier: log.monthsNoUnrest,
    regiments_trained: log.regiments,
    inventions_done: log.inventionsDone,
    inventions_since_last_war: log.inventionsSinceWar,
    inventions_known_in_scope: research?.known.size ?? 0,
    inventions_known_all_in_scope: (research?.known.size ?? 0) >= inScope,
    castles_gained: log.castlesGained,
    lords_created: log.lordsCreated,
    lords: lords.length,
    lords_wavering: lords.filter((l) => l.loyalty === "Wavering").length,
    lords_disloyal: lords.filter((l) => l.loyalty === "Disloyal").length,
    royal_provinces_with_official: royalOfficials,
    schools: schoolsOf(world, n).filter((s) => s.open).length,
    scholars: research?.scholars ?? 0,
    trade_ships: tradeShips,
    alliances: dip.relations.alliesOf(d.graph, id).length,
    tributaries: subjectTies(world).filter((t) => t.o === n && t.bond.kind === "tributary").length,
    started_as_subject: log.startedAsSubject,
    subject_of_anyone: bondOf(world, n) !== null,
    oaths_broken: oaths,
    years_without_broken_oath: oaths ? 0 : years,
    historical_choices: log.historical,
    nonhistorical_major_choices: log.nonhistoricalMajor,
    event_roles: roles,
    owns,
    ...(slavery ? { realm_flag_set: "slavery_abolished" } : {}),
    start_provinces: log.startProvinces,
    start_polity_kind: log.startKind,
    reached_end_date: isoOf(world) >= "1939-08-31",
  };
}

/** What changed since the last turn end, raised as the moments it is (alliances, land, castles, lords, loans). */
function changes(world: World, log: AchievementLog): void {
  const n = world.player;
  const id = world.nationIds[n]!;
  const g = world.diplomacy.graph;
  const allies = dip.relations.alliesOf(g, id);
  for (const a of allies) if (!log.allies.includes(a)) noteMoment(world, n, "relation_changed", { relation_formed: "alliance", relation_to: "alliance", ...(log.rivals.includes(a) ? { relation_from: "rival", same_partner: true } : {}) });
  const subject = bondOf(world, n) !== null;
  if (subject !== log.subject) noteMoment(world, n, "relation_changed");
  log.allies = allies;
  log.subject = subject;
  log.rivals = world.nationIds.filter((o, m) => m !== n && !world.nationGone[m] && dip.relations.stance(g, id, o) === "rival");
  const provinces = landOf(world, n);
  if (provinces > log.provinces) noteMoment(world, n, "province_gained");
  log.provinces = provinces;
  const castles = castlesOf(world, n);
  if (castles > log.castles) {
    log.castlesGained += castles - log.castles;
    noteMoment(world, n, "castle_gained");
  }
  log.castles = castles;
  const lords = lordsOf(world, n).length;
  if (lords > log.lords) {
    log.lordsCreated += lords - log.lords;
    noteMoment(world, n, "lord_created");
  }
  log.lords = lords;
  const debt = world.nationDebt[n]!;
  log.peakDebt = Math.max(log.peakDebt, debt);
  if (log.debt > 0 && debt <= 0) {
    noteMoment(world, n, "loan_closed", { closed_by: "repaid", loan_size: log.peakDebt });
    log.peakDebt = 0;
  }
  log.debt = debt;
  const atWar = world.diplomacy.wars.some((w) => w.attackers.includes(id) || w.defenders.includes(id));
  if (atWar && !log.atWar) log.inventionsSinceWar = 0;
  log.atWar = atWar;
}

/** The monthly counters and moments, once at the first turn end of each month. */
function newMonth(world: World, log: AchievementLog): string[] {
  const n = world.player;
  const month = world.date.month;
  log.months++;
  const moments: string[] = [];
  if (month === 1) moments.push("year_end");
  if (month === 3) moments.push("spring_start");
  const hungry = 1 << GRIEVANCES.indexOf("Hungry");
  let anyHungry = false;
  let unrest = false;
  let harvested = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceWater[p]) continue;
    if (world.provinceGrievances[p]! & hungry) anyHungry = true;
    if (moodIndex(world, p) >= 2) unrest = true;
    if (harvestMonthsOf(world, p).includes(month)) harvested++;
  }
  log.monthsNoHungry = anyHungry ? 0 : log.monthsNoHungry + 1;
  log.monthsNoUnrest = unrest ? 0 : log.monthsNoUnrest + 1;
  if (harvested) {
    log.harvestsSeen++;
    log.provincesHarvested = (log.provincesHarvested ?? 0) + harvested;
    const added = (log.added ??= {});
    added.provinces_harvested = (added.provinces_harvested ?? 0) + harvested;
    moments.push("harvest");
    const cap = world.provinceIndex.get(world.rules.nations[n]!.capital);
    if (cap !== undefined && world.provinceOwner[cap] === n && harvestMonthsOf(world, cap).includes(month)) {
      const roll = HARVESTS[world.provinceHarvest[cap]!];
      log.goodStreak = roll === "good" || roll === "bumper" ? log.goodStreak + 1 : 0;
    }
  }
  return moments;
}

const capitalHarvest = (world: World): string | undefined => {
  const cap = world.provinceIndex.get(world.rules.nations[world.player]!.capital);
  return cap === undefined ? undefined : HARVESTS[world.provinceHarvest[cap]!];
};

/** Progress values for the rows that have a bar, by stat (ACH-044, ACH-050). */
function counters(log: AchievementLog, f: A.Facts): void {
  for (const d of A.ACHIEVEMENTS) {
    const stat = d.progress?.stat;
    if (stat && typeof f[stat] === "number") log.campaign.counters[stat] = f[stat] as number;
  }
}

/**
 * The turn's end, last of all its systems (ACH-033): what changed becomes
 * moments, the month's moments run once, then every moment seen, then the
 * `turn_end` rows, on the player's final values.
 */
export function turnEndAchievements(world: World): void {
  const log = world.achievements;
  if (!log || world.player < 0 || world.nationGone[world.player]) return;
  changes(world, log);
  const month = isoOf(world).slice(0, 7);
  const monthly = month !== log.month ? newMonth(world, log) : [];
  log.month = month;
  const f = stateFacts(world, log);
  counters(log, f);
  const date = String(f.date);
  const run = (moment: string, extra: A.Facts = {}, province?: number, on = date) => {
    for (const u of A.evaluate(log.catalogue, log.campaign, log.profile, moment, { ...f, ...extra }, on).unlocked) log.fresh.push({ id: u.id, date, ...(province === undefined ? {} : { province }) });
  };
  for (const m of monthly) run(m, m === "harvest" ? { capital_harvest: capitalHarvest(world) } : {});
  // A date row is checked once, at the first turn end on or after its day (ACH-082).
  for (const d of log.catalogue.list) if (d.moment === "date" && typeof d.test.date === "string" && d.test.date <= date && !log.campaign.datesChecked.includes(d.id)) run("date", { date: d.test.date }, undefined, d.test.date);
  const queue = log.queue;
  log.queue = [];
  for (const q of queue) run(q.moment, q.facts, q.province);
  run("turn_end");
}

/** The snapshot's part: new unlocks (handed over once), the earned list, the progress values and eligibility. */
export function achievementsView(world: World): { fresh: Unlock[]; added: Record<string, number>; earned: Record<string, string>; counters: Record<string, number>; eligible: boolean; inScope: number; choices: string[]; months: number } | null {
  const log = world.achievements;
  if (!log) return null;
  const fresh = log.fresh;
  log.fresh = [];
  const added = log.added ?? {};
  log.added = {};
  return { fresh, added, earned: { ...log.campaign.earned }, counters: { ...log.campaign.counters }, eligible: A.eligible(log.campaign), inScope: rs.tree().inventions.size, choices: [...log.choices], months: log.months };
}
