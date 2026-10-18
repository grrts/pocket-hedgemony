import type { World } from "./world.ts";
import { beliefRevoltFactor } from "./belief.ts";
import * as rb from "./domain/rebellions/index.ts";
import * as wf from "./domain/warfare/index.ts";
import { battleArmy, battleRow, cedeProvince, nearest, SIEGE_MONTH_DAYS, wallsOf, type News } from "./war.ts";
import { cultureKey, grievanceCount, grievancesOf, moodIndex, risingChance, taxWeight } from "./moods.ts";
import { storeMonths } from "./food.ts";
import { commanderBattle } from "./recruit.ts";
import { halt, marchTo } from "./turn.ts";
import { loyaltyStep } from "./lords.ts";
import { NORMAL_TAX, runLedger, taxRateOf, TAX_RATES } from "./treasury.ts";
import { CLASS_COUNT, classIndex, CLASS_NAMES } from "./living.ts";
import { rebelsWonAgainst, revolutionSettled } from "./revolutions.ts";

/**
 * Rebellions (milestone 6): grievances raise rebel bands. A plotting province
 * rises on its monthly roll, a spark tips a rioting one at once; the band
 * holds its province (no tax, recruits or food reach the owner), musters men
 * from the recruits while its cause holds, besieges castles, spreads to
 * restless neighbours and marches on castles beyond once it is a Rebellion.
 * The owner grants the demand, talks, bribes the leader, waits or attacks;
 * beaten rebels scatter and the owner pardons, punishes or massacres. Held a
 * year, or with the capital taken, the rebels win their cause. The rules are
 * the rebellions context's (domain/rebellions); this file maps the engine's
 * arrays onto them, as war.ts does for warfare.
 */

const C = rb.rebellionsConfig;
const P = C.provisional;

/** A rising: its cause and leader, the provinces and castles it holds, and the band that fights for it. */
export interface Band {
  id: number;
  /** The realm it rose against. */
  owner: number;
  cause: rb.Cause;
  /** The grievance that set the cause, shown on the card. */
  grievance: string;
  leader: (rb.Leader & rb.LeaderStats) | null;
  /** The spark that started it, or "roll". */
  reason: string;
  /** Province it rose in, then the ones it took or that joined it. */
  provinces: number[];
  /** Provinces whose castle the rebels hold. */
  castles: number[];
  men: number;
  sources: rb.ArmsSource[];
  /** Province the band stands in, the one it marches to (-1 = none) and days to the next province on the way. */
  location: number;
  target: number;
  daysLeft: number;
  siege: { province: number; days: number; siege: wf.Siege } | null;
  monthsHeld: number;
  /** Days an army of the owner has stood in each held province the band is not in: at holdWeeks it is freed. */
  retaking: Record<number, number>;
  /** world.day of the last talks (one a month). */
  talked: number;
  started: string;
  /** The revolution family whose Fight raised it (REVO-021), absent for an ordinary rising. */
  revolution?: string;
}

/** A beaten rising whose survivors wait on the owner's verdict (REBL-050). */
export interface Verdict {
  id: number;
  owner: number;
  cause: rb.Cause;
  leader: string;
  province: number;
  provinces: number[];
  /** The third who went home as homeless: a pardon sends them back to their work. */
  homeless: number;
}

export interface RebelState {
  bands: Band[];
  bandSeq: number;
  /** Rising holding each province (its id), 0 = none. */
  provinceRebels: Int32Array;
  /** Sparks since the last monthly step (REBL-010), applied by it (spec §9 step 2). */
  rebelSparks: { province: number; spark: string }[];
  /** The player's beaten risings waiting for Pardon, Punish or Massacre. */
  verdicts: Verdict[];
  /** No-rising locks by province (after Punish or Massacre). */
  rebelLocks: Map<number, rb.Locks>;
  /** Year until which a province's tax stays light at most (a won tax rising, a charter), 0 = none; self-rule is for good. */
  provinceLightTax: Int16Array;
  /** 1 where self-rule was granted: its people no longer count Foreign rule (D-REBL-11). */
  provinceSelfRule: Uint8Array;
  /** Months a granted demand still emboldens the realm's other plotting provinces (D-REBL-6), and the cause granted. */
  nationEmboldened: Uint8Array;
  nationEmboldenedCause: string[];
}

export function createRebelState(P: number, N: number): RebelState {
  return {
    bands: [],
    bandSeq: 0,
    provinceRebels: new Int32Array(P),
    rebelSparks: [],
    verdicts: [],
    rebelLocks: new Map(),
    provinceLightTax: new Int16Array(P),
    provinceSelfRule: new Uint8Array(P),
    nationEmboldened: new Uint8Array(N),
    nationEmboldenedCause: Array.from({ length: N }, () => ""),
  };
}

const pname = (world: World, p: number) => world.rules.provinces[p]!.name;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const SELF_RULE = 32767;
/** Index of the light rate in TAX_RATES (read when first needed: treasury.ts and this file import each other). */
let light = -1;
const lightRate = () => (light < 0 ? (light = TAX_RATES.indexOf("light")) : light);

/** The band holding province p, or undefined. */
export function bandAt(world: World, p: number): Band | undefined {
  const id = world.provinceRebels[p]!;
  return id ? world.bands.find((b) => b.id === id) : undefined;
}

/** A rising as the rebellions context sees it, for its tier and its rules. */
function asRising(world: World, b: Band): rb.Rising {
  const capital = world.provinceIndex.get(world.rules.nations[b.owner]!.capital)!;
  const near = b.provinces.some((p) => p === capital || neighbours(world, p).includes(capital));
  return rb.newRising(String(b.id), b.cause, pname(world, b.provinces[0]!), {
    provinces: b.provinces.map((p) => pname(world, p)),
    sources: b.sources,
    leader: b.leader,
    army: true,
    holdsCastle: b.castles.length > 0,
    holdsCapital: b.castles.includes(capital) || (b.provinces.includes(capital) && !wallsOf(world, capital)),
    nearCapital: near,
    grievance: b.grievance,
    men: { all: b.men },
    monthsHeld: b.monthsHeld,
  });
}

export const tierOf = (world: World, b: Band): rb.Tier => rb.severity(asRising(world, b));

function neighbours(world: World, p: number): number[] {
  return Array.from(world.adjList.subarray(world.adjStart[p]!, world.adjStart[p + 1]!));
}

/** A plotting province's monthly chance to rise, by its heaviest cause: faith and separatist risings come more often in a realm of low faith or tongue (REALM-238). */
export function risingChanceIn(world: World, p: number): number {
  const chance = risingChance(world, p);
  if (chance <= 0) return chance;
  const found = rb.heaviestCause(weighted(world, p));
  return found ? Math.min(1, chance * beliefRevoltFactor(world, world.provinceOwner[p]!, found.cause)) : chance;
}

// ---------------------------------------------------------------- sparks

/** A spark happened in province p (REBL-010): a rioting province rises from it at the next monthly step. */
export function spark(world: World, p: number, what: string): void {
  if (p >= 0 && world.provinceOwner[p]! >= 0 && rb.sparkKind(what) && !world.rebelSparks.some((s) => s.province === p)) world.rebelSparks.push({ province: p, spark: what });
}

/** The tax of a province (or the realm's default, province -1) was raised: a new burden (REBL-010). */
export function taxRaised(world: World, n: number, province: number): void {
  const what = C.sparks["new burden"][0]!;
  if (province >= 0) return spark(world, province, what);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.provinceTax[p]! < 0 && world.provinceGrievances[p]) spark(world, p, what);
}

/** A realm's army lost a battle in province p: a defeat in or next to its provinces there (REBL-010). */
export function lostBattle(world: World, n: number, p: number): void {
  const what = C.sparks.defeat[0]!;
  for (const q of [p, ...neighbours(world, p)]) if (world.provinceOwner[q] === n && world.provinceGrievances[q]) spark(world, q, what);
}

// ---------------------------------------------------------------- the monthly step

/** Grievances of a province with their weights, for the cause (D-REBL-7). */
function weighted(world: World, p: number): { name: string; weight: number }[] {
  return grievancesOf(world, p).map((name) => ({ name, weight: name === "Heavy taxes" ? Math.max(1, taxWeight(world, p)) : 1 }));
}

/** Whether a rising may start in p now: owned, not already held, no lock on the cause (REBL-050). */
function mayStart(world: World, p: number, cause: rb.Cause): boolean {
  if (world.provinceWater[p] || world.provinceOwner[p]! < 0 || world.provinceRebels[p]) return false;
  const locks = world.rebelLocks.get(p);
  return !locks || rb.mayRise(locks, cause, world.date.year);
}

/** Share of the recruits that joins this month, by the class mix of the province (REBL-024, D-REBL-1). */
function joinShare(world: World, p: number, cause: rb.Cause): number {
  let people = 0;
  let share = 0;
  for (let c = 0; c < CLASS_COUNT; c++) {
    const n = world.provinceClasses[p * CLASS_COUNT + c]!;
    people += n;
    share += n * rb.joinShare(cause, CLASS_NAMES[c]!, rb.rebellionsConfig.faith_or_tongue_causes.includes(cause));
  }
  return people > 0 ? share / people : C.join_share.other;
}

/** Men of province p join the band: out of the recruits, so the owner can no longer call them (REBL-023, REBL-026). */
function muster(world: World, b: Band, p: number, first = 0): number {
  const pool = world.provinceRecruits[p]!;
  // A rising begins with the men who rose: the first month's share at least a muster's worth.
  const men = Math.min(pool, Math.floor(pool * joinShare(world, p, b.cause) * (first || 1)));
  world.provinceRecruits[p] = pool - men;
  b.men += men;
  return men;
}

/** A revolution's Fight (REVO-084): its cause, its family, and how many first musters it rises with. */
export interface RevolutionTag {
  cause: rb.Cause;
  family: string;
  musters: number;
}

function startRising(world: World, p: number, reason: string, news: News[], tag?: RevolutionTag): Band | null {
  const found = tag ? { cause: tag.cause, grievance: grievancesOf(world, p)[0] ?? "the revolution" } : rb.heaviestCause(weighted(world, p));
  if (!found || !mayStart(world, p, found.cause)) return null;
  const owner = world.provinceOwner[p]!;
  const leader = rb.chooseLeader(found.cause, pname(world, p), world.rng);
  const b: Band = {
    id: ++world.bandSeq,
    owner,
    cause: found.cause,
    grievance: found.grievance,
    leader: { name: leader.name, kind: leader.kind, might: leader.might, cunning: leader.cunning, logistics: leader.logistics },
    reason,
    provinces: [p],
    castles: [],
    men: 0,
    sources: [],
    location: p,
    target: -1,
    daysLeft: 0,
    siege: null,
    monthsHeld: 0,
    retaking: {},
    talked: -1,
    started: `${world.date.year}-${String(world.date.month).padStart(2, "0")}`,
    ...(tag ? { revolution: tag.family } : {}),
  };
  muster(world, b, p, tag?.musters ?? 3);
  if (b.men < P.melts_below_men) {
    // Too few to hold the province: the trouble stays riots.
    world.provinceRecruits[p] = world.provinceRecruits[p]! + b.men;
    return null;
  }
  world.bands.push(b);
  world.provinceRebels[p] = b.id;
  if (tag) return b;
  const why = reason === "roll" ? "" : ` after ${sparkText(reason)}`;
  news.push({ kind: "rebels", text: `Rising in ${pname(world, p)}${why}: ${leader.name} leads ${fmt(b.men)} men over ${b.grievance.toLowerCase()}. They want ${demandOf(b)}.`, nations: [owner], province: p, begins: true });
  return b;
}

/** A revolution's rising in province p (REVO-084); null when too few rise or the province can't. */
export const startRevolutionRising = (world: World, p: number, tag: RevolutionTag, news: News[]): Band | null => startRising(world, p, "revolution", news, tag);

/** A spark as a few words for the news and the card. */
const SPARK_TEXT: Record<string, string> = {
  "the tax rate of the province is raised": "a tax rise",
  "the owner's army loses a battle in or next to the province": "a lost battle nearby",
};
export const sparkText = (spark: string): string => SPARK_TEXT[spark] ?? spark.replace(/^the /, "");

/** "You" for the player, else the realm's name. */
const who = (world: World, n: number, you: string, they: string) => (n === world.player ? you : `${world.rules.nations[n]!.name} ${they}`);

const demandOf = (b: Band) => (C.card.demand as Partial<Record<rb.Cause, string>>)[b.cause] ?? rb.demandOf(b.cause);

/**
 * The monthly rebellions step (spec §9): sparks, the rising roll, then for
 * each rising its muster, food, spread, months held and win; the AI answers
 * its own risings.
 */
export function monthlyRebels(world: World, news: News[]): void {
  // 2. Sparks since the last step tip rioting provinces (REBL-004).
  for (const s of world.rebelSparks) if (moodIndex(world, s.province) >= 2) startRising(world, s.province, s.spark, news);
  world.rebelSparks = [];
  // 3. Plotting provinces roll (REBL-005); a granted demand emboldens the realm's others (D-REBL-6).
  for (let p = 0; p < world.provinceCount; p++) {
    if (!world.provinceGrievances[p] || world.provinceRebels[p]) continue;
    let chance = risingChanceIn(world, p);
    if (chance <= 0) continue;
    const owner = world.provinceOwner[p]!;
    if (owner < 0) continue;
    if (world.nationEmboldened[owner]! > 0 && grievancesOf(world, p).some((g) => rb.causeOfGrievance(g) === world.nationEmboldenedCause[owner])) chance += P.grant_points / 100;
    if (world.rng.next() < chance) startRising(world, p, "roll", news);
  }
  for (let n = 0; n < world.nationCount; n++) if (world.nationEmboldened[n]! > 0) world.nationEmboldened[n] = world.nationEmboldened[n]! - 1;
  for (const b of [...world.bands]) monthlyBand(world, b, news);
  aiRebels(world, news);
}

function monthlyBand(world: World, b: Band, news: News[]): void {
  // 4. Muster while the cause still holds in a province it holds (REBL-025, REBL-043).
  const growing = b.provinces.some((p) => grievancesOf(world, p).some((g) => rb.causeOfGrievance(g) === b.cause));
  if (growing) for (const p of b.provinces) muster(world, b, p);
  // 5. Food from the store where the band stands, else a tenth go to hunger; rebels with only tools and nothing to shelter them drift home (REBL-031, REBL-032, REBL-048).
  const need = b.men / 1000;
  const hasFood = world.provinceStore[b.location]! >= need;
  if (hasFood) world.provinceStore[b.location] = world.provinceStore[b.location]! - need;
  if (rb.waitMonth(asRising(world, b), hasFood).shrinks) b.men -= Math.round(b.men * C.starving_loss);
  if (b.men < P.melts_below_men) return endBand(world, b, "melted", `The rising in ${pname(world, b.provinces[0]!)} melts away.`, news);
  // 6. Spread to restless neighbours (REBL-038, D-REBL-6).
  for (const p of [...b.provinces]) {
    for (const q of neighbours(world, p)) {
      if (world.provinceOwner[q] !== b.owner || world.provinceRebels[q] || grievanceCount(world, q) < C.steps.riots) continue;
      const locks = world.rebelLocks.get(q);
      if (locks && !rb.mayRise(locks, b.cause, world.date.year)) continue;
      if (world.rng.next() >= P.spread_chance_per_month) continue;
      takeProvince(world, b, q);
      muster(world, b, q);
      news.push({ kind: "rebels", text: `The rising spreads to ${pname(world, q)}: ${fmt(b.men)} rebels now.`, nations: [b.owner], province: q });
    }
  }
  chooseTarget(world, b);
  // 8. A year held with no army beating them wins it (REBL-056).
  b.monthsHeld++;
  if (rb.isWon(asRising(world, b))) rebelsWin(world, b, news);
}

function takeProvince(world: World, b: Band, p: number): void {
  if (!b.provinces.includes(p)) b.provinces.push(p);
  world.provinceRebels[p] = b.id;
  delete b.retaking[p];
}

/**
 * Where the band goes: a castle it holds the province of but not the walls,
 * else, once a Rebellion, the nearest castle of the owner next to its land
 * (REBL-036, REBL-054).
 */
function chooseTarget(world: World, b: Band): void {
  if (b.siege || b.target >= 0) return;
  const walled = (p: number) => wallsOf(world, p) !== null && world.provinceGarrison[p]! > 0 && !b.castles.includes(p);
  let to = b.provinces.find(walled) ?? -1;
  if (to < 0 && tierOf(world, b) !== "Rising") {
    to = nearest(world, b.location, (p) => world.provinceOwner[p] === b.owner && walled(p) && (b.provinces.includes(p) || neighbours(world, p).some((q) => b.provinces.includes(q))), 6);
  }
  if (to < 0) return;
  if (to === b.location) beginSiege(world, b, to);
  else marchBand(world, b, to);
}

function marchBand(world: World, b: Band, to: number): void {
  b.target = to;
  b.daysLeft = P.march_days_per_province;
}

/** The next province on the way from `from` to `to` over land, or -1. */
function stepToward(world: World, from: number, to: number): number {
  const back = new Map<number, number>([[to, to]]);
  const queue = [to];
  for (let h = 0; h < queue.length && h < 400; h++) {
    const p = queue[h]!;
    for (const q of neighbours(world, p)) {
      if (back.has(q) || world.provinceWater[q]) continue;
      back.set(q, p);
      if (q === from) return p;
      queue.push(q);
    }
  }
  return -1;
}

function beginSiege(world: World, b: Band, p: number): void {
  const walls = wallsOf(world, p)!;
  const garrison = world.provinceGarrison[p]!;
  b.siege = { province: p, days: 0, siege: wf.newSiege(walls, { ground: world.provinceGround[p] ?? "farmland", garrison, store: garrison * world.rules.defines.war.castleStoreMonths, townsfolk: 0 }) };
}

// ---------------------------------------------------------------- the daily step

/** Each day: bands march, besiege, and fight any army of the owner that stands with them. */
export function dailyRebels(world: World, news: News[]): void {
  if (!world.bands.length) return;
  for (const b of [...world.bands]) {
    // Castles the rebels hold keep no garrison of the owner's.
    for (const p of b.castles) world.provinceGarrison[p] = 0;
    if (b.target >= 0 && --b.daysLeft <= 0) {
      const next = stepToward(world, b.location, b.target);
      if (next < 0) b.target = -1;
      else {
        b.location = next;
        if (next === b.target) {
          b.target = -1;
          if (wallsOf(world, next) && world.provinceGarrison[next]! > 0) beginSiege(world, b, next);
        } else b.daysLeft = P.march_days_per_province;
      }
    }
    const army = ownerArmies(world, b, b.location);
    if (army.length) {
      fight(world, b, army, news);
      if (!world.bands.includes(b)) continue;
    } else if (b.siege && b.siege.province === b.location) siegeDay(world, b, news);
    retake(world, b, news);
  }
}

/** The owner's armies (with a commander, not fighting or falling back) in province p. */
function ownerArmies(world: World, b: Band, p: number): number[] {
  const a = world.armies;
  const out: number[] = [];
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === b.owner && a.location[i] === p && a.commander[i]! >= 0 && a.battle[i]! < 0 && !a.retreating[i]) out.push(i);
  return out;
}

/** A held province the band is not in, where an army of the owner stands its holdWeeks, is the owner's again. */
function retake(world: World, b: Band, news: News[]): void {
  const days = world.rules.defines.war.holdWeeks * 7;
  for (const p of [...b.provinces]) {
    if (p === b.location || !ownerArmies(world, b, p).length) {
      delete b.retaking[p];
      continue;
    }
    b.retaking[p] = (b.retaking[p] ?? 0) + 1;
    if (b.retaking[p]! < days) continue;
    b.provinces = b.provinces.filter((q) => q !== p);
    b.castles = b.castles.filter((q) => q !== p);
    world.provinceRebels[p] = 0;
    delete b.retaking[p];
    news.push({ kind: "rebels", text: `${pname(world, p)} is yours again: the rebels are driven out.`, nations: [b.owner], province: p });
    if (!b.provinces.length) return endBand(world, b, "scattered", `The rising is put down: it holds no land.`, news);
  }
}

/** A siege day by the warfare siege rules (WAR-160 …), the rebels' men counting by their arms. */
function siegeDay(world: World, b: Band, news: News[]): void {
  const st = b.siege!;
  const p = st.province;
  st.siege.besiegers = b.men * rb.armsMultiplier(rb.armsOf(asRising(world, b)));
  st.days++;
  if (st.days % SIEGE_MONTH_DAYS !== 0) return;
  const store = st.siege.store;
  wf.siegeMonth(st.siege);
  if (!wf.isClosed(st.siege)) st.siege.store = store;
  world.provinceGarrison[p] = st.siege.garrison;
  if (st.siege.garrison < 1 || wf.aiAcceptsHonours({ breaches: st.siege.breaches, foodMonths: wf.foodMonths(st.siege), reliefDays: null, cruel: false })) {
    wf.endSiege(st.siege, st.siege.starving ? "surrender" : "honours of war");
  } else if (wf.stormable(st.siege).can && st.siege.besiegers >= st.siege.garrison * world.rules.defines.war.stormRatio) {
    const terms = wf.storm(st.siege);
    b.men = Math.max(0, b.men - Math.round(st.siege.garrison * terms.stormerLosses * (1 + terms.walls)));
    wf.endSiege(st.siege, "storm");
  } else return;
  b.siege = null;
  world.provinceGarrison[p] = 0;
  b.castles.push(p);
  // A captured castle's store arms them (REBL-027).
  if (!b.sources.includes("captured castle store")) b.sources.push("captured castle store");
  takeProvince(world, b, p);
  news.push({ kind: "rebels", text: `Rebels take the castle of ${pname(world, p)}.`, nations: [b.owner], province: p, begins: true });
  if (rb.isWon(asRising(world, b))) rebelsWin(world, b, news);
}

// ---------------------------------------------------------------- battle

/** The rebels as a warfare army: rebel band companies, their men counted by arms and the lie of the land (REBL-021, REBL-022, REBL-029). */
function rebelArmy(world: World, b: Band, factor: number): wf.Army {
  const size = wf.W.company_size.max;
  const companies: wf.Company[] = [];
  for (let left = Math.round(b.men * factor); left > 0; left -= size) {
    const m = Math.min(size, left);
    companies.push(wf.newCompany({ kind: rb.REBEL_BAND.toLowerCase() as wf.Company["kind"], arm: "levy foot", men: m, arms: wf.armsNeeded("levy foot", m) }));
  }
  const l = b.leader;
  return wf.newArmy("rebels", "rebels", companies, l ? { commander: wf.newCommander(l.name, { might: l.might, cunning: l.cunning, logistics: l.logistics }) } : {});
}

/** The owner's armies attack the band where it stands (AttackRebels): a battle by the warfare rules, fought out at once. */
function fight(world: World, b: Band, slots: number[], news: News[]): void {
  const a = world.armies;
  const p = b.location;
  const ground = world.provinceGround[p] ?? "grassland";
  const factor = rb.armsMultiplier(rb.battleArms(asRising(world, b))) * rb.rebelGroundFactor(ground);
  const me = world.rules.nations[b.owner]!.name;
  const [own, lead] = battleArmy(world, slots, me);
  const era = wf.eraOfYear(world.date.year);
  const r = wf.fightBattle({
    attacker: { country: me, army: own, known: new Set(), homeland: true },
    defender: { country: "rebels", army: rebelArmy(world, b, factor), known: new Set(), homeland: true },
    sectors: wf.battlefield(battleRow(ground), { ground, era }),
    ground,
    era,
  });
  const lost = (side: string, men: number) => {
    const l = r.losses[side]!;
    const held = r.winner === side;
    return Math.min(men, Math.round(l.killed + wf.woundedAfter(l.wounded, held).die + wf.fledAfter(l.fled, held).home));
  };
  const ownMen = slots.reduce((t, s) => t + a.men[s]!, 0);
  const ownLost = lost(me, ownMen);
  for (const s of slots) {
    const cut = Math.round((ownLost * a.men[s]!) / Math.max(1, ownMen));
    a.horse[s] = Math.max(0, Math.round(a.horse[s]! * (1 - cut / Math.max(1, a.men[s]!))));
    a.men[s] = Math.max(0, a.men[s]! - cut);
  }
  const rebelsLost = Math.min(b.men, Math.round(lost("rebels", Math.round(b.men * factor)) / factor));
  world.provinceBattleYear[p] = world.date.year;
  const won = r.winner === me;
  commanderBattle(world, lead, won, won && ownMen < b.men);
  if (won) {
    b.men -= rebelsLost;
    news.push({ kind: "battle", text: `Battle of ${pname(world, p)}: ${me} (${fmt(ownMen)}) beat the rebels (${fmt(b.men + rebelsLost)}). The rising is broken.`, nations: [b.owner], province: p });
    rebelsBeaten(world, b, news);
    return;
  }
  b.men -= rebelsLost;
  news.push({ kind: "battle", text: `Battle of ${pname(world, p)}: the rebels (${fmt(b.men + rebelsLost)}) beat ${me} (${fmt(ownMen)}). Losses ${fmt(rebelsLost)} and ${fmt(ownLost)}.`, nations: [b.owner], province: p });
  lostBattle(world, b.owner, p);
  // The beaten army falls back to the nearest of its realm's provinces the rebels do not hold.
  for (const s of slots) {
    if (!a.alive[s] || a.men[s]! < world.rules.defines.war.disperseBelow) {
      a.alive[s] = 0;
      continue;
    }
    halt(world, s);
    const to = nearest(world, p, (q) => q !== p && world.provinceOwner[q] === b.owner && !world.provinceRebels[q], 12);
    if (to >= 0 && !marchTo(world, s, to)) a.retreating[s] = 1;
  }
}

/** Beaten rebels scatter: a third die, a third flee abroad, a third go home as homeless (REBL-049); the owner chooses their fate. */
function rebelsBeaten(world: World, b: Band, news: News[]): void {
  const r = asRising(world, b);
  r.men = { all: b.men };
  const s = rb.scatter(r);
  const home = b.provinces[0]!;
  const homeless = classIndex("homeless");
  world.provinceClasses[home * CLASS_COUNT + homeless] = world.provinceClasses[home * CLASS_COUNT + homeless]! + s.homeless / 1000;
  const v: Verdict = { id: b.id, owner: b.owner, cause: b.cause, leader: b.leader?.name ?? "", province: home, provinces: [...b.provinces], homeless: s.homeless };
  b.men = 0;
  endBand(world, b, "scattered", null, news);
  if (b.owner === world.player) world.verdicts.push(v);
  else treatRebels(world, v, "Punish the leaders", news);
}

// ---------------------------------------------------------------- the end of a rising

/** A rising ends: its provinces are the owner's again, its men go back to the recruits of its land (unless scattered). */
function endBand(world: World, b: Band, how: NonNullable<rb.Rising["ended"]>, text: string | null, news: News[]): void {
  world.bands = world.bands.filter((x) => x !== b);
  for (const p of b.provinces) if (world.provinceRebels[p] === b.id) world.provinceRebels[p] = 0;
  if (b.men > 0) {
    const each = b.men / b.provinces.length;
    for (const p of b.provinces) world.provinceRecruits[p] = Math.min(world.provinceRecruitCeiling[p]!, world.provinceRecruits[p]! + each);
  }
  b.men = 0;
  if (text) news.push({ kind: "rebels", text, nations: [b.owner], province: b.provinces[0]! });
  if (b.revolution && how !== "won") revolutionSettled(world, b, how === "granted" || how === "talked" ? "stopped" : "crushed", news);
}

/** The owner's armies standing in province p march out to the nearest of its provinces with no rebels (a Town demand: the soldiers gone). */
function soldiersLeave(world: World, n: number, provinces: number[]): void {
  const a = world.armies;
  for (const p of provinces) {
    world.provinceArmyMonths[p] = 0;
    for (let i = 0; i < a.count; i++) {
      if (!a.alive[i] || a.owner[i] !== n || a.location[i] !== p || a.battle[i]! >= 0) continue;
      const to = nearest(world, p, (q) => q !== p && world.provinceOwner[q] === n && !world.provinceRebels[q] && !provinces.includes(q), 8);
      if (to >= 0 && a.commander[i]! >= 0) marchTo(world, i, to);
    }
  }
}

/** Tax down to light at most, until a year (SELF_RULE for good). */
export function lightTax(world: World, provinces: number[], until: number): void {
  for (const p of provinces) {
    world.provinceLightTax[p] = Math.max(world.provinceLightTax[p]!, until);
    if (taxRateOf(world, p, world.provinceOwner[p]!) > lightRate()) world.provinceTax[p] = lightRate();
  }
}

/** Food from the castles that feed the provinces into the provinces' stores, up to `months` of eating (Hunger: the granary opened). */
export function openGranary(world: World, provinces: number[], months: number): number {
  let given = 0;
  for (const p of provinces) {
    const c = world.provinceCastle[p]!;
    if (c < 0) continue;
    const want = Math.max(0, world.provincePopulation[p]! * months - world.provinceStore[p]!);
    const take = Math.min(want, world.castleStore[c]!);
    world.castleStore[c] = world.castleStore[c]! - take;
    world.provinceStore[p] = world.provinceStore[p]! + take;
    given += take;
  }
  return given;
}

/** Granary food a Hunger grant would hand out now. */
function granaryFood(world: World, provinces: number[]): number {
  let food = 0;
  const seen = new Set<number>();
  for (const p of provinces) {
    const c = world.provinceCastle[p]!;
    if (c >= 0 && !seen.has(c)) (seen.add(c), (food += world.castleStore[c]!));
  }
  return food;
}

/** What granting the demand does, by cause (REBL-045); `half` for a deal reached in talks (REBL-046). */
function giveDemand(world: World, b: Band, half: boolean): void {
  const year = world.date.year;
  switch (b.cause) {
    case "Hunger":
      openGranary(world, b.provinces, half ? P.grant_food_months / 2 : P.grant_food_months);
      break;
    case "Tax":
      for (const p of b.provinces) {
        const now = taxRateOf(world, p, b.owner);
        // Back to normal when heavier; otherwise, or in a half deal, a step lighter.
        world.provinceTax[p] = Math.min(now, !half && now > NORMAL_TAX ? NORMAL_TAX : Math.max(lightRate(), now - 1));
      }
      // The levy ended: musters in their land stop.
      world.musters = world.musters.filter((m) => m.nation !== b.owner || !b.provinces.includes(m.province));
      break;
    case "Homeland":
      // Self-rule: an own-tongue charter where they hold, light tax for good (D-REBL-11).
      for (const p of b.provinces) world.provinceSelfRule[p] = 1;
      lightTax(world, b.provinces, SELF_RULE);
      break;
    case "Town":
      soldiersLeave(world, b.owner, b.provinces);
      if (!half) lightTax(world, b.provinces, year + P.light_tax_years_granted);
      break;
    default:
      lightTax(world, b.provinces, year + P.light_tax_years_granted);
  }
}

/** What a won rising takes, by cause (REBL-057). */
function rebelsWin(world: World, b: Band, news: News[]): void {
  if (b.revolution) {
    endBand(world, b, "won", null, news);
    return revolutionSettled(world, b, "won", news);
  }
  const year = world.date.year;
  const where = b.provinces.map((p) => pname(world, p)).join(", ");
  let what: string;
  switch (b.cause) {
    case "Hunger":
      openGranary(world, b.provinces, 12);
      for (const p of b.provinces) {
        const l = world.provinceLord[p]!;
        if (l >= 0) world.lords[l]!.loyalty = "Disloyal";
      }
      what = "the castles' food is handed out and their lords turn disloyal";
      break;
    case "Tax":
      lightTax(world, b.provinces, year + C.tax_win_years);
      what = `their tax is fixed at light for ${C.tax_win_years} years`;
      break;
    case "Homeland": {
      // They break away to the realm that held them in 1444 when it still stands, else they rule themselves (REBL-058).
      const first = world.rules.provinces[b.provinces[0]!]!.owner;
      const to = first ? world.nationIndex.get(first) ?? -1 : -1;
      if (to >= 0 && to !== b.owner && !world.nationGone[to]) {
        const lands = [...b.provinces];
        endBand(world, b, "won", null, news);
        for (const p of lands) cedeProvince(world, p, to, news);
        news.push({ kind: "rebels", text: `The rebels win: ${where} break away to ${world.rules.nations[to]!.name}.`, nations: [b.owner, to], province: lands[0]! });
        return;
      }
      for (const p of b.provinces) world.provinceSelfRule[p] = 1;
      lightTax(world, b.provinces, SELF_RULE);
      what = "they rule themselves, at light tax for good";
      break;
    }
    case "Town":
      soldiersLeave(world, b.owner, b.provinces);
      lightTax(world, b.provinces, year + C.tax_win_years);
      what = "a town charter: the soldiers leave and the tax stays light";
      break;
    default:
      lightTax(world, b.provinces, year + C.tax_win_years);
      what = "their tax stays light";
  }
  endBand(world, b, "won", `The rebels win in ${where}: ${what}.`, news);
  rebelsWonAgainst(world, b, news);
}

// ---------------------------------------------------------------- answers

export type Answer = "grant" | "talk" | "bribe";

/** What each answer costs now, and why it can't be given (null = it can). */
export function answerCost(world: World, b: Band): Record<Answer, { gold: number; why: string | null; note: string }> {
  const gold = world.nationTreasury[b.owner]!;
  const talkGold = P.talk_gold_per_province * b.provinces.length;
  const bribeGold = Math.max(1, Math.ceil((b.men / 100) * P.bribe_gold_per_100_rebels * (b.leader && rb.bribeCostsMore(b.leader.kind) ? 2 : 1)));
  const t = rb.talk(b.cause);
  const chance = t.works === "usually" ? P.talk_usually_chance : t.works === "rarely" ? P.talk_rarely_chance : P.talk_other_chance;
  const grant = grantNote(world, b);
  return {
    grant: { gold: 0, why: grant.why, note: grant.note },
    talk: { gold: talkGold, why: gold < talkGold ? `talks cost ${talkGold} gold` : world.day - b.talked < 28 && b.talked >= 0 ? "they will talk again next month" : null, note: `${Math.round(chance * 100)} in 100 they take half their demand` },
    bribe: { gold: bribeGold, why: !b.leader ? "they have no leader to bribe" : gold < bribeGold ? `the bribe costs ${bribeGold} gold` : null, note: `${Math.round(P.bribe_melt_chance * 100)} in 100 they melt away without him` },
  };
}

function grantNote(world: World, b: Band): { why: string | null; note: string } {
  switch (b.cause) {
    case "Hunger": {
      const food = granaryFood(world, b.provinces);
      const people = b.provinces.reduce((t, p) => t + world.provincePopulation[p]!, 0);
      return { why: food < 1 ? "no castle granary feeds their land" : null, note: `the castle granary opened to them: ${Math.min(P.grant_food_months, Math.floor(food / Math.max(1, people)))} months of food` };
    }
    case "Tax":
      return { why: null, note: b.grievance === "Heavy taxes" ? "their tax back to normal and the levy ended" : "their tax a step lighter and the levy ended" };
    case "Homeland":
      return { why: null, note: "self-rule: Foreign rule ends there, and their tax stays light for good" };
    case "Town":
      return { why: null, note: `the soldiers gone and light tax for ${P.light_tax_years_granted} years` };
    default:
      return { why: null, note: `light tax for ${P.light_tax_years_granted} years` };
  }
}

/** The owner answers a rising (GrantDemand, TalkWithRebels, BribeLeader, REBL-045 to REBL-047). */
export function answerRebels(world: World, n: number, id: number, answer: string, news: News[]): string | null {
  const b = world.bands.find((x) => x.id === id);
  if (!b) return "that rising is over";
  if (b.owner !== n) return "not a rising against you";
  if (answer !== "grant" && answer !== "talk" && answer !== "bribe") return "no such answer";
  const cost = answerCost(world, b)[answer];
  if (cost.why) return cost.why;
  world.nationTreasury[n] = world.nationTreasury[n]! - cost.gold;
  const where = pname(world, b.provinces[0]!);
  if (answer === "grant") {
    const note = grantNote(world, b).note;
    giveDemand(world, b, false);
    world.nationEmboldened[n] = P.grant_months;
    world.nationEmboldenedCause[n] = b.cause;
    endBand(world, b, "granted", `${who(world, n, "You grant", "grants")} the rebels of ${where} their demand: ${note}. They go home.`, news);
  } else if (answer === "talk") {
    b.talked = world.day;
    const t = rb.talk(b.cause);
    const chance = t.works === "usually" ? P.talk_usually_chance : t.works === "rarely" ? P.talk_rarely_chance : P.talk_other_chance;
    if (world.rng.next() < chance) {
      giveDemand(world, b, true);
      endBand(world, b, "talked", `${n === world.player ? "Your" : `${world.rules.nations[n]!.name}'s`} talks with the rebels of ${where} end in a deal: half their demand, and they go home.`, news);
    } else news.push({ kind: "rebels", text: `Talks with the rebels of ${where} fail.`, nations: [n], province: b.location });
  } else {
    const r = asRising(world, b);
    const out = rb.bribeLeader(r);
    b.leader = null;
    if (world.rng.next() < P.bribe_melt_chance && out.mayMeltOrSplit) endBand(world, b, "melted", `${out.left} takes your gold and leaves; without him the rising in ${where} melts away.`, news);
    else news.push({ kind: "rebels", text: `${out.left} takes your gold and leaves, but the rebels of ${where} fight on without a leader.`, nations: [n], province: b.location });
  }
  runLedger(world, false);
  return null;
}

/** The owner's verdict on beaten rebels: Pardon, Punish the leaders or Massacre (TreatDefeatedRebels, REBL-050, REBL-041). */
export function treatRebels(world: World, v: Verdict, t: rb.Treatment, news: News[]): void {
  world.verdicts = world.verdicts.filter((x) => x !== v);
  const year = world.date.year;
  const where = pname(world, v.province);
  const locksOf = (p: number) => world.rebelLocks.get(p) ?? (world.rebelLocks.set(p, rb.newLocks()), world.rebelLocks.get(p)!);
  if (t === "Pardon") {
    // The survivors go back to their work instead of the road.
    const homeless = classIndex("homeless");
    const k = v.province * CLASS_COUNT + homeless;
    world.provinceClasses[k] = Math.max(0, world.provinceClasses[k]! - v.homeless / 1000);
    world.provinceRecruits[v.province] = Math.min(world.provinceRecruitCeiling[v.province]!, world.provinceRecruits[v.province]! + v.homeless);
    if (v.owner === world.player) news.push({ kind: "rebels", text: `You pardon the rebels of ${where}: they go back to their work.`, nations: [v.owner], province: v.province });
    return;
  }
  for (const p of v.provinces) rb.treat(rb.newRising(String(v.id), v.cause, where), t, locksOf(p), year);
  if (t === "Punish the leaders") {
    if (v.owner === world.player) news.push({ kind: "rebels", text: `${v.leader || "The leaders"} of ${where} ${v.leader ? "is" : "are"} executed: no ${v.cause.toLowerCase()} rising there for ${C.punish_lock_years} years.`, nations: [v.owner], province: v.province });
    return;
  }
  // Massacre: Bloodshed for 20 years over every province of the realm of the same people, and their lords waver.
  const people = cultureKey(world, world.rules.provinces[v.province]!.owner ?? world.nationIds[v.owner]!);
  const lords = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== v.owner) continue;
    const first = world.rules.provinces[p]!.owner ?? world.nationIds[v.owner]!;
    if (cultureKey(world, first) !== people) continue;
    world.provinceBattleYear[p] = year;
    if (world.provinceLord[p]! >= 0) lords.add(world.provinceLord[p]!);
  }
  for (const l of lords) loyaltyStep(world, l, "massacre", news);
  if (v.owner === world.player) news.push({ kind: "rebels", text: `The rebels of ${where} are massacred. No rising there for ${C.massacre_lock_years} years, but Bloodshed lies on every province of their people.`, nations: [v.owner], province: v.province });
}

/** The player's verdict, by its rising's id. */
export function verdictOrder(world: World, n: number, id: number, treatment: string, news: News[]): string | null {
  const v = world.verdicts.find((x) => x.id === id && x.owner === n);
  if (!v) return "no beaten rising waits on you";
  if (treatment !== "Pardon" && treatment !== "Punish the leaders" && treatment !== "Massacre") return "no such verdict";
  treatRebels(world, v, treatment, news);
  return null;
}

// ---------------------------------------------------------------- AI

/**
 * AI realms answer their risings (spec §12): an army big enough marches on
 * the band; without one, a hunger, tax or town demand is granted once the
 * rising has spread or stands by the capital, else talks are tried.
 */
function aiRebels(world: World, news: News[]): void {
  const a = world.armies;
  for (const b of [...world.bands]) {
    if (b.owner === world.player) continue;
    const costs = answerCost(world, b);
    let best = -1;
    let dist = Infinity;
    for (let i = 0; i < a.count; i++) {
      if (!a.alive[i] || a.owner[i] !== b.owner || a.commander[i]! < 0 || a.battle[i]! >= 0 || a.retreating[i] || a.men[i]! < b.men) continue;
      const d = Math.abs(a.location[i]! - b.location) === 0 ? 0 : 1 + world.rng.next();
      if (d < dist) ((dist = d), (best = i));
    }
    if (best >= 0) {
      if (a.location[best] !== b.location && a.route[best]!.at(-1) !== b.location) marchTo(world, best, b.location);
    } else if (tierOf(world, b) !== "Rising" && !costs.grant.why && rb.talk(b.cause).works === "usually") answerRebels(world, b.owner, b.id, "grant", news);
    else if (!costs.talk.why) answerRebels(world, b.owner, b.id, "talk", news);
  }
}

// ---------------------------------------------------------------- the view

export interface RisingView {
  id: number;
  owner: number;
  /** Where the band stands, its tile, and the province it marches to (-1 = none). */
  location: number;
  tile: number;
  target: number;
  men: number;
  cause: string;
  grievance: string;
  demand: string;
  leader: string;
  /** The leader's kind and what he brings, with his skills. */
  leaderNote: string;
  reason: string;
  joiners: string;
  arms: string;
  armsFactor: number;
  provinces: number[];
  castles: number[];
  /** Months of food where the band stands. */
  food: number;
  tier: string;
  monthsHeld: number;
  monthsToWin: number;
  /** Neighbours of its land with 3 or more grievances: where it may spread next month. */
  spreadTo: number[];
  siege: { province: number; months: number; progress: number; garrison: number } | null;
  /** The answers with their gold and why each can't be given now (null = it can); only for the player's risings. */
  answers: { answer: Answer; label: string; gold: number; note: string; why: string | null }[];
}

export interface RebelsView {
  risings: RisingView[];
  /** The player's beaten risings waiting for a verdict. */
  verdicts: { id: number; province: number; cause: string; leader: string; homeless: number }[];
  /** Monthly chance (0..1) that each of the player's plotting provinces rises. */
  chance: Float32Array;
}

const LABEL: Record<Answer, string> = { grant: "Grant demand", talk: "Talk", bribe: "Bribe leader" };

export function rebelsView(world: World): RebelsView {
  const me = world.player;
  const chance = new Float32Array(world.provinceCount);
  if (me >= 0) for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === me && world.provinceGrievances[p] && !world.provinceRebels[p]) chance[p] = risingChanceIn(world, p);
  return {
    risings: world.bands.map((b) => {
      const r = asRising(world, b);
      const arms = rb.battleArms(r);
      const spread = new Set<number>();
      for (const p of b.provinces) for (const q of neighbours(world, p)) if (world.provinceOwner[q] === b.owner && !world.provinceRebels[q] && grievanceCount(world, q) >= C.steps.riots) spread.add(q);
      const costs = me === b.owner ? answerCost(world, b) : null;
      const l = b.leader;
      return {
        id: b.id,
        owner: b.owner,
        location: b.location,
        tile: world.tiles.centre[b.location]!,
        target: b.target,
        men: b.men,
        cause: b.cause,
        grievance: b.grievance,
        demand: demandOf(b),
        leader: l?.name ?? "",
        leaderNote: l ? `${rb.leaderBrings(l.kind)} · might ${l.might} · cunning ${l.cunning}` : "no leader: bribed away",
        reason: b.reason === "roll" ? "the province rose by itself" : `rose after ${sparkText(b.reason)}`,
        joiners: rb.joinersOf(b.cause),
        arms: C.card.arms[arms],
        armsFactor: rb.armsMultiplier(arms),
        provinces: [...b.provinces],
        castles: [...b.castles],
        food: storeMonths(world, b.location),
        tier: rb.severity(r),
        monthsHeld: b.monthsHeld,
        monthsToWin: C.win_hold_months,
        spreadTo: [...spread],
        siege: b.siege ? { province: b.siege.province, months: b.siege.siege.months, progress: (b.siege.days % SIEGE_MONTH_DAYS) / SIEGE_MONTH_DAYS, garrison: b.siege.siege.garrison } : null,
        answers: costs ? (Object.keys(costs) as Answer[]).map((k) => ({ answer: k, label: LABEL[k], gold: costs[k].gold, note: costs[k].note, why: costs[k].why })) : [],
      };
    }),
    verdicts: world.verdicts.filter((v) => v.owner === me).map((v) => ({ id: v.id, province: v.province, cause: v.cause, leader: v.leader, homeless: v.homeless })),
    chance,
  };
}

/** Whether province p's tax may be raised to `rate` (a won tax rising or self-rule keeps it light). */
export function taxCapped(world: World, p: number, rate: number): string | null {
  const until = world.provinceLightTax[p]!;
  if (rate > lightRate() && until > world.date.year) return until === SELF_RULE ? `${pname(world, p)} rules itself: its tax stays light` : `${pname(world, p)} keeps light tax until ${until}`;
  return null;
}

// ---------------------------------------------------------------- saves

export interface SavedRebels {
  bands: Band[];
  bandSeq: number;
  sparks: { province: number; spark: string }[];
  verdicts: Verdict[];
  locks: [number, rb.Locks][];
  lightTax: number[];
  selfRule: number[];
  emboldened: number[];
  emboldenedCause: string[];
}

export function saveRebels(world: World): SavedRebels {
  return {
    bands: world.bands,
    bandSeq: world.bandSeq,
    sparks: world.rebelSparks,
    verdicts: world.verdicts,
    locks: [...world.rebelLocks],
    lightTax: Array.from(world.provinceLightTax),
    selfRule: Array.from(world.provinceSelfRule),
    emboldened: Array.from(world.nationEmboldened),
    emboldenedCause: world.nationEmboldenedCause,
  };
}

/** Restores the risings, mapping old province and realm indexes; a save from before rebellions has none. */
export function restoreRebels(world: World, s: SavedRebels, mapN: (old: number) => number, mapP: (old: number) => number): void {
  const ps = (list: number[]) => list.map(mapP).filter((p) => p >= 0);
  world.bands = s.bands
    .map((b) => ({ ...b, owner: mapN(b.owner), provinces: ps(b.provinces), castles: ps(b.castles), location: mapP(b.location), target: b.target >= 0 ? mapP(b.target) : -1, siege: b.siege && mapP(b.siege.province) >= 0 ? { ...b.siege, province: mapP(b.siege.province) } : null, retaking: {} }))
    .filter((b) => b.owner >= 0 && b.location >= 0 && b.provinces.length);
  world.bandSeq = s.bandSeq;
  for (const b of world.bands) for (const p of b.provinces) world.provinceRebels[p] = b.id;
  world.rebelSparks = s.sparks.map((x) => ({ ...x, province: mapP(x.province) })).filter((x) => x.province >= 0);
  world.verdicts = s.verdicts.map((v) => ({ ...v, owner: mapN(v.owner), province: mapP(v.province), provinces: ps(v.provinces) })).filter((v) => v.owner >= 0 && v.province >= 0);
  world.rebelLocks = new Map(s.locks.map(([p, l]) => [mapP(p), l] as [number, rb.Locks]).filter(([p]) => p >= 0));
  s.lightTax.forEach((y, old) => {
    const p = mapP(old);
    if (p >= 0) world.provinceLightTax[p] = y;
  });
  s.selfRule.forEach((v, old) => {
    const p = mapP(old);
    if (p >= 0) world.provinceSelfRule[p] = v;
  });
  s.emboldened.forEach((m, old) => {
    const n = mapN(old);
    if (n >= 0) {
      world.nationEmboldened[n] = m;
      world.nationEmboldenedCause[n] = s.emboldenedCause[old] ?? "";
    }
  });
}

/** Numbers of the risings for the world's hash. */
export function rebelsHashData(world: World): Float64Array {
  return new Float64Array(world.bands.flatMap((b) => [b.id, b.owner, b.men, b.location, b.target, b.daysLeft, b.monthsHeld, ...b.provinces, -1, ...b.castles, -2, b.siege?.days ?? -1]));
}

