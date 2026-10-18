import { crownShare, inAnyWar } from "./lords.ts";
import { refillPaces } from "./fallen.ts";
import { moodShare } from "./moods.ts";
import * as rc from "./domain/recruiting/index.ts";
import * as wf from "./domain/warfare/index.ts";
import { mix, officialName, personName, rankedName } from "./names.ts";
import { OFFICIALS, officialAt, officialBonus } from "./officials.ts";
import { monthlyRations, wagonRations } from "./march.ts";
import { campaigning, halt, isMarching } from "./turn.ts";
import { spawnArmy, type World } from "./world.ts";
import { armyBreak, atWar, controller, wallsOf, type News } from "./war.ts";
import { armUnlocked, knownSet } from "./research.ts";
import { heritageFactor } from "./heritage.ts";
import { noteRegiment } from "./achievements.ts";
import { W as WORK, worksAt } from "./works.ts";
import { refusingPeace } from "./peace.ts";

/**
 * Milestone 2, armies that cost something: wires the recruiting context (who
 * can be called, the levy, training, pay, going home) and the warfare
 * context's troop cap, company kinds and commanders into the weekly turn.
 *
 * The flow follows Leroy's design: recruit men a thousand at a time from one
 * province's people; each thousand takes 14 days to gather (3 with railway
 * mobilization), then stands in
 * the province as its garrison. Troops without a commander can't march: a
 * commander (commissioned from a province's official) leads them or picks
 * them up. Training happens in the army, from its commander's screen.
 * Mercenaries are bought with gold, take weeks to arrive, and bring their own
 * captain.
 */

export const FOOT_ARMS = ["levy foot", "armoured foot", "pikes", "archers"] as const;
export const HORSE_ARMS = ["light horse", "knights and lancers"] as const;
export const ARMS: readonly string[] = [...FOOT_ARMS, ...HORSE_ARMS];
const A = ARMS.length;
const LEVY = 0;

export function armIndex(arm: string): number {
  const i = ARMS.indexOf(arm);
  if (i < 0) throw new Error(`no arm ${arm}`);
  return i;
}

export const isHorseArm = (arm: string): boolean => (HORSE_ARMS as readonly string[]).includes(arm);

/** Company kinds an army can be, by the warfare context's names. */
export const KIND = { levy: 0, hired: 1 } as const;
export const KIND_NAMES = ["levy", "hired company"] as const;

/** Men called up in a province, gathering a thousand at a time (RECR-013; Leroy: no instant armies). */
export interface Muster {
  nation: number;
  province: number;
  /** Men still to gather. */
  men: number;
  /** Days until the next thousand has gathered (RECR-106). */
  daysLeft: number;
}

/** A free company: a named band under its captain, gathered at a home capital, with its men by arm (in ARMS order). */
export interface FreeCompany {
  id: number;
  group: string;
  name: string;
  /** The captain's name with his rank, in the language of the company's home (feedback 125). */
  captain: string;
  /** Province it gathers at, -1 = unknown. */
  home: number;
  byArm: number[];
}

/** A free company hired and on its way to the capital. */
export interface Mercenary {
  nation: number;
  company: FreeCompany;
  weeksLeft: number;
}

export { OFFICIALS };

export function createRecruitState(P: number, N: number) {
  return {
    provinceRecruits: new Float32Array(P),
    provinceRecruitCeiling: new Float32Array(P),
    nationTroopCap: new Float64Array(N),
    nationCapUsed: new Float64Array(N),
    musters: [] as Muster[],
    mercs: [] as Mercenary[],
    /** Free companies for hire, shared by every realm that can reach them. */
    freeCompanies: [] as FreeCompany[],
    freeCompanySeq: 0,
    /** Official of each province (index into OFFICIALS), -1 = none: his post is empty. */
    provinceOfficial: new Int8Array(P).fill(-1),
    /** Province each official's name comes from (names.ts officialName): it goes with him from post to post. */
    provinceOfficialSeed: new Int16Array(P),
    /** Day the official at each post took it up (world.day): his years served count from it. */
    provinceOfficialSince: new Int32Array(P),
    /** Realm a foreign specialist came from, -1 = one of the realm's own (PROV-334). */
    provinceOfficialFrom: new Int16Array(P).fill(-1),
    /** New land waiting for its owner's decision (officials.ts provinceTaken). */
    provinceNewLand: new Uint8Array(P),
    /** Province each commander was commissioned from, -1 = none. */
    commanderHome: [] as number[],
    /** Name seed of each commander commissioned from an official (-1 = none), so he goes back to a post as himself. */
    commanderSeed: [] as number[],
  };
}

const provinceName = (world: World, p: number) => world.rules.provinces[p]!.name;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const capitalOf = (world: World, n: number) => world.provinceIndex.get(world.rules.nations[n]!.capital)!;
const gold = (world: World, domainGold: number) => domainGold * world.rules.defines.recruit.goldScale;

// ---------------------------------------------------------------- commanders

/** Adds a commander to the realm and returns his index. */
export function addCommander(world: World, owner: number, c: wf.Commander, id = `${world.nationIds[owner]}_${world.commanderIds.length + 1}`): number {
  const k = world.commanderIds.length;
  world.commanderIds.push(id);
  const grow = <T extends Int16Array | Int8Array>(old: T, make: (n: number) => T, v: number): T => {
    const next = make(k + 1);
    next.set(old);
    next[k] = v;
    return next;
  };
  world.commanderOwner = grow(world.commanderOwner, (n) => new Int16Array(n), owner);
  world.commanderLogistics = grow(world.commanderLogistics, (n) => new Int8Array(n), c.logistics);
  world.commanders.push({ ...c, country: world.nationIds[owner]! });
  world.commanderHome.push(-1);
  world.commanderSeed.push(-1);
  return k;
}

/** The army a commander leads, or -1 if he waits at court. */
export function armyOf(world: World, c: number): number {
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.commander[i] === c) return i;
  return -1;
}

/** Commanders of a realm who lead no army, best first. */
export function idleCommanders(world: World, n: number): number[] {
  const busy = new Set<number>();
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i]) busy.add(a.commander[i]!);
  const out: number[] = [];
  for (let c = 0; c < world.commanderIds.length; c++) if (world.commanderOwner[c] === n && !busy.has(c)) out.push(c);
  const score = (c: number) => world.commanders[c]!.might + world.commanders[c]!.cunning + world.commanders[c]!.logistics;
  return out.sort((x, y) => score(y) - score(x) || x - y);
}

/** Gold a commission costs once (RECR-114). */
export const COMMISSION_GOLD = rc.recruitingConfig.commissionCost;

/**
 * Commission a province's official as a commander: he gets his type's skills and waits at court
 * (RECR-069..073). The post is left empty: the province pays half its tax and gives half its
 * recruits until he is released back to it (RECR-083 "Leave it").
 */
export function commissionOfficial(world: World, n: number, p: number, news: News[]): string | null {
  if (p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  if (world.provinceLord[p]! >= 0) return `${provinceName(world, p)} is a lord's: his official serves the lord, not the crown`;
  const type = world.provinceOfficial[p]!;
  if (type < 0) return `${provinceName(world, p)} has no official to spare`;
  const { commission, cost } = rc.commission({ official: OFFICIALS[type]!, type: OFFICIALS[type]!, province: world.provinceIds[p]! });
  if (cost > world.nationTreasury[n]!) return "not enough gold";
  const skills = commission.skills ?? { might: 1, cunning: 1, logistics: 1 };
  // The official himself takes the command, under his own name.
  const seed = world.provinceOfficialSeed[p]!;
  const name = officialAt(world, p)!;
  world.nationTreasury[n] = world.nationTreasury[n]! - cost;
  const c = addCommander(world, n, wf.newCommander(name, { ...skills, origin: OFFICIALS[type]! }));
  world.commanderHome[c] = p;
  world.commanderSeed[c] = seed;
  world.provinceOfficial[p] = -1;
  if (n === world.player) news.push({ kind: "raised", text: `${name}, ${OFFICIALS[type]!.toLowerCase()} of ${provinceName(world, p)}, takes a commission as commander. The post stands empty until he returns.`, nations: [n], province: p });
  return null;
}

/** Release a commander at court back to the post he left; he becomes its official again (RECR-087). */
export function releaseCommander(world: World, n: number, c: number): string | null {
  if (c < 0 || c >= world.commanderIds.length || world.commanderOwner[c] !== n) return "no such commander of yours";
  if (armyOf(world, c) >= 0) return "he leads an army: give it to another commander or leave it as a garrison first";
  const home = world.commanderHome[c]!;
  if (home < 0 || world.provinceOwner[home] !== n) return "he has no post in your lands to go back to";
  if (world.provinceOfficial[home]! >= 0) return `another official holds his post at ${provinceName(world, home)} now`;
  const type = OFFICIALS.indexOf(world.commanders[c]!.origin as (typeof OFFICIALS)[number]);
  const seed = world.commanderSeed[c]! >= 0 ? world.commanderSeed[c]! : home;
  // Back at his own post he keeps his years there; if someone else held it meanwhile he starts again.
  if (world.provinceOfficialSeed[home] !== seed) (world.provinceOfficialSince[home] = world.day), (world.provinceOfficialFrom[home] = -1);
  world.provinceOfficial[home] = Math.max(0, type);
  world.provinceOfficialSeed[home] = seed;
  world.commanderOwner[c] = -1;
  return null;
}

/** A captain who comes with a mercenary company: skills of 1 to 3. */
function newCaptain(world: World, n: number, name?: string): number {
  const skill = () => 1 + world.rng.int(3);
  const capital = world.rules.provinces.find((p) => p.id === world.rules.nations[n]!.capital)?.name ?? "";
  return addCommander(world, n, wf.newCommander(name ?? rankedName(world.rules, n, personName(world.rules, n, world.rng.int(1 << 30), capital), "captain"), { might: skill(), cunning: skill(), logistics: skill(), origin: "a hired captain" }));
}

/** Battles teach commanders: victories grow Might, defeats are counted (WAR-050, WAR-052). */
export function commanderBattle(world: World, c: number, won: boolean, outnumbered: boolean): void {
  if (c < 0) return;
  const cmd = world.commanders[c]!;
  if (won) wf.winBattle(cmd, { outnumbered });
  else wf.loseBattle(cmd);
  world.commanderLogistics[c] = cmd.logistics;
}

// ---------------------------------------------------------------- what an army is made of

/** Men of an army by arm, in ARMS order. */
export function menByArm(world: World, slot: number): number[] {
  const a = world.armies;
  const foot = a.men[slot]! - a.horse[slot]!;
  const horse = a.horse[slot]!;
  return ARMS.map((arm, k) => (isHorseArm(arm) ? horse : foot) * a.mix[slot * A + k]!);
}

/** Sets an army's men from men by arm, keeping the mix shares in step. */
function setByArm(world: World, slot: number, by: number[]): void {
  const a = world.armies;
  let foot = 0;
  let horse = 0;
  ARMS.forEach((arm, k) => (isHorseArm(arm) ? (horse += by[k]!) : (foot += by[k]!)));
  a.men[slot] = Math.round(foot + horse);
  a.horse[slot] = Math.round(horse);
  ARMS.forEach((arm, k) => {
    const total = isHorseArm(arm) ? horse : foot;
    a.mix[slot * A + k] = total > 0 ? by[k]! / total : k === LEVY || arm === HORSE_ARMS[0] ? 1 : 0;
  });
}

/** Domain gold a month for `men` of one arm (RECR-017, RECR-051). */
const armPay = (arm: string, men: number) => (men > 0 ? rc.regimentPay(rc.payGroupOf(arm), men) : 0);

const kindMultiplier = (kind: number) => (wf.W.kinds as Record<string, { pay: { multiplier: number } }>)[KIND_NAMES[kind]!]!.pay.multiplier;

/**
 * Treasury gold an army costs this month: pay by arm times its kind's multiplier
 * (a levy kept at peace is free for its first 3 months, F-23; at war it is paid from its first,
 * WAR-225; a hired company costs three times) (RECR-017, warfare kinds).
 */
export function armyPay(world: World, slot: number): number {
  const a = world.armies;
  const kind = a.kind[slot]!;
  if (kind === KIND.levy && a.monthsOut[slot]! <= wf.W.levy.free_months && !inAnyWar(world, a.owner[slot]!)) return 0;
  const by = menByArm(world, slot);
  let pay = 0;
  ARMS.forEach((arm, k) => (pay += armPay(arm, by[k]!)));
  return gold(world, pay * kindMultiplier(kind)) * (kind === KIND.hired ? heritageFactor(world, a.owner[slot]!, "hired_company_cost_pct") : 1);
}

/**
 * Troop cap and its use for every nation: a share of the people of each province
 * it owns and holds, against its armies and its recruits (WAR-029, WAR-030).
 */
export function recomputeCap(world: World): void {
  const cap = world.nationTroopCap;
  const used = world.nationCapUsed;
  cap.fill(0);
  used.fill(0);
  // W12, W15 and W18 raise each province's share (WAR-032): one share per realm, worked out once (provinceCap's rule for a royal province).
  const share = new Float64Array(world.nationCount).fill(-1);
  for (let p = 0; p < world.provinceCount; p++) {
    const owner = world.provinceOwner[p]!;
    if (owner < 0 || world.provinceOccupier[p]! >= 0) continue;
    if (share[owner]! < 0) share[owner] = wf.capShare({}, knownSet(world, owner));
    cap[owner] = cap[owner]! + world.provincePopulation[p]! * 1000 * share[owner]!;
  }
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i]) used[a.owner[i]!] = used[a.owner[i]!]! + a.men[i]!;
  for (const m of world.musters) used[m.nation] = used[m.nation]! + m.men;
  for (const m of world.mercs) used[m.nation] = used[m.nation]! + companyMen(m.company);
}

/** Gold a nation pays its men this month, with double pay for the men over its troop cap (WAR-035). */
export function nationPay(world: World, n: number): number {
  const a = world.armies;
  let pay = 0;
  let men = 0;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.owner[i] !== n) continue;
    pay += armyPay(world, i);
    men += a.men[i]!;
  }
  return withOverCap(world, n, pay, men);
}

/** Every realm's army pay a month in one pass over the armies (the same sums as nationPay). */
export function allNationPay(world: World): Float64Array {
  const a = world.armies;
  const pay = new Float64Array(world.nationCount);
  const men = new Float64Array(world.nationCount);
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const n = a.owner[i]!;
    pay[n] = pay[n]! + armyPay(world, i);
    men[n] = men[n]! + a.men[i]!;
  }
  for (let n = 0; n < world.nationCount; n++) pay[n] = withOverCap(world, n, pay[n]!, men[n]!);
  return pay;
}

/** Men over the troop cap are paid twice. */
function withOverCap(world: World, n: number, pay: number, men: number): number {
  const over = wf.overCap(world.nationCapUsed[n]!, world.nationTroopCap[n]!).doublePayFor;
  return over > 0 && men > 0 ? pay + (pay / men) * Math.min(over, men) : pay;
}

/** Rations a month for an army, by the march rules (men, horses, its commander's logistics). */
export function armyRations(world: World, slot: number): number {
  const a = world.armies;
  const c = a.commander[slot]!;
  return monthlyRations(world.rules.defines.march, { men: a.men[slot]!, horse: a.horse[slot]!, logistics: c >= 0 ? world.commanderLogistics[c]! : 0, campaigning: campaigning(world, slot) });
}

// ---------------------------------------------------------------- the pools

/** Men going home return to the pools of their realm's provinces, by each one's gap (RECR-020). */
export function sendHome(world: World, n: number, men: number): void {
  if (men <= 0) return;
  let gap = 0;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) gap += world.provinceRecruitCeiling[p]! - world.provinceRecruits[p]!;
  if (gap <= 0) return;
  const share = Math.min(1, men / gap);
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n) continue;
    world.provinceRecruits[p] = world.provinceRecruits[p]! + (world.provinceRecruitCeiling[p]! - world.provinceRecruits[p]!) * share;
  }
}

/** Where a realm may call men: a province it owns and holds, not besieged, with no enemy army in it. */
function callingPlace(world: World, n: number, p: number): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || world.provinceWater[p]) return "no such province";
  if (world.provinceOwner[p] !== n || world.provinceOccupier[p]! >= 0) return `${provinceName(world, p)} is not in your hands`;
  if (world.sieges.has(p)) return `${provinceName(world, p)} is under siege`;
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.location[i] === p && atWar(world, n, a.owner[i]!)) return `an enemy army stands in ${provinceName(world, p)}`;
  return null;
}

/** Men a realm can still call now: its pools, held under its troop cap. */
export function canCall(world: World, n: number): number {
  return Math.max(0, Math.min(world.nationLevies[n]!, world.nationTroopCap[n]! - world.nationCapUsed[n]!));
}

// ---------------------------------------------------------------- orders

/**
 * Recruit men from one province's people, a thousand at a time: levy money now;
 * each thousand gathers in two weeks, one after another, then stands in the
 * province as troops without a commander (RECR-008..018).
 */
export function recruit(world: World, n: number, p: number, thousands: number, news: News[]): string | null {
  const refused = recruitRefusal(world, n, p, thousands);
  if (refused) return refused;
  const men = Math.round(thousands) * LEVY_UNIT;
  const queued = world.musters.find((m) => m.nation === n && m.province === p);
  world.provinceRecruits[p] = Math.max(0, world.provinceRecruits[p]! - men);
  world.nationTreasury[n] = world.nationTreasury[n]! - gold(world, rc.levyMoney(men));
  const days = gatherDays(world, n);
  if (queued) queued.men += men;
  else world.musters.push({ nation: n, province: p, men, daysLeft: days });
  recount(world);
  if (n === world.player) news.push({ kind: "raised", text: `${fmt(men)} men of ${provinceName(world, p)} are called up; they gather a thousand every ${days} days.`, nations: [n], province: p });
  return null;
}

/** Men in a levy step: a levy is called in whole thousands (RECR-105, `levyUnit`). */
export const LEVY_UNIT: number = rc.recruitingConfig.levyUnit;

/** Days each thousand of a realm's levy takes to gather: 14, or 3 with W18 Railway mobilization (RECR-106). */
export function gatherDays(world: World, n: number): number {
  return rc.gatheringDays(knownSet(world, n));
}

/** Why a realm can't call `thousands` more thousands in a province now, or null when it can (the Recruit button says it). */
export function recruitRefusal(world: World, n: number, p: number, thousands: number): string | null {
  const where = callingPlace(world, n, p);
  if (where) return where;
  // A lord's men answer his call for his retinue, not the crown's levy (RECR Levy: royal provinces).
  if (world.provinceLord[p]! >= 0) return `${provinceName(world, p)} is ${world.lords[world.provinceLord[p]!]!.name}'s land: its men answer his call, not yours`;
  const men = Math.round(thousands) * LEVY_UNIT;
  if (men <= 0) return "no men asked for";
  const queued = world.musters.find((m) => m.nation === n && m.province === p);
  const max = world.rules.defines.recruit.queueMax;
  if (men > world.provinceRecruits[p]! + 0.5) return `${provinceName(world, p)} has only ${fmt(world.provinceRecruits[p]!)} men left to call`;
  if ((queued ? Math.ceil(queued.men / LEVY_UNIT) : 0) + men / LEVY_UNIT > max) return `the recruit queue at ${provinceName(world, p)} is full: at most ${max} thousands wait to gather`;
  if (!wf.overCap(world.nationCapUsed[n]! + men, world.nationTroopCap[n]!).canRaise) return "that would go over your troop cap";
  if (gold(world, rc.levyMoney(men)) > world.nationTreasury[n]!) return "not enough gold";
  return null;
}

/**
 * Take the last thousand off a province's recruit queue: its levy money comes
 * back and the men go back to the province's pool. The thousand already
 * gathering can be cancelled too, losing its weeks.
 */
export function cancelRecruit(world: World, n: number, p: number): string | null {
  const i = world.musters.findIndex((m) => m.nation === n && m.province === p);
  if (i < 0) return `no men are gathering at ${provinceName(world, p)}`;
  const m = world.musters[i]!;
  const men = m.men - Math.floor((m.men - 1) / 1000) * 1000;
  m.men -= men;
  if (m.men < 1) world.musters.splice(i, 1);
  world.provinceRecruits[p] = Math.min(world.provinceRecruitCeiling[p]!, world.provinceRecruits[p]! + men);
  world.nationTreasury[n] = world.nationTreasury[n]! + gold(world, rc.levyMoney(men));
  recount(world);
  return null;
}

/** Days until all the men called in a province have gathered. */
export function daysToGather(world: World, m: Muster): number {
  return m.daysLeft + (Math.ceil(m.men / LEVY_UNIT) - 1) * gatherDays(world, m.nation);
}

/** Troops of a realm in a province with no commander: its garrison, by army slot. */
export function garrisonTroops(world: World, n: number, p: number): number[] {
  const a = world.armies;
  const out: number[] = [];
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n && a.location[i] === p && a.commander[i]! < 0) out.push(i);
  return out;
}

/** A province's Garrison tab for its realm (PROV-302, RECR-107, RECR-118). */
export interface GarrisonView {
  province: number;
  /** Troops without a commander: their army id, men, men by arm (ARMS order), drill and kind. */
  troops: { army: number; men: number; byArm: number[]; drill: number; kind: number }[];
  /** Each thousand called and not yet gathered, oldest first: the first gathers, the rest wait. */
  gathering: { men: number; daysLeft: number; state: "gathering" | "waiting" }[];
  /** Commanders standing here at the head of an army of the realm, who can pick the troops up. */
  commanders: { commander: number; army: number }[];
}

/** The Garrison tab of province p for realm n. */
export function garrisonView(world: World, n: number, p: number): GarrisonView {
  return garrisonViews(world, n, p)[0] ?? { province: p, troops: [], gathering: [], commanders: [] };
}

/**
 * The Garrison tabs of every province where realm n has men gathering or troops
 * without a commander (or only province `only`), in one pass over the armies.
 */
export function garrisonViews(world: World, n: number, only = -1): GarrisonView[] {
  const views = new Map<number, GarrisonView>();
  const view = (p: number) => {
    let v = views.get(p);
    if (!v) views.set(p, (v = { province: p, troops: [], gathering: [], commanders: [] }));
    return v;
  };
  const a = world.armies;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.owner[i] !== n || a.commander[i]! >= 0) continue;
    const p = a.location[i]!;
    if (only >= 0 && p !== only) continue;
    view(p).troops.push({ army: i, men: a.men[i]!, byArm: menByArm(world, i), drill: a.drill[i]!, kind: a.kind[i]! });
  }
  const days = gatherDays(world, n);
  for (const m of world.musters) {
    if (m.nation !== n || (only >= 0 && m.province !== only)) continue;
    const queued = Math.ceil(m.men / LEVY_UNIT);
    view(m.province).gathering = Array.from({ length: queued }, (_, k) => ({
      men: k === queued - 1 ? m.men - (queued - 1) * LEVY_UNIT : LEVY_UNIT,
      daysLeft: m.daysLeft + k * days,
      state: k === 0 ? "gathering" : "waiting",
    }));
  }
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.owner[i] !== n || a.commander[i]! < 0) continue;
    const v = views.get(a.location[i]!);
    if (v && v.troops.some((t) => t.kind === a.kind[i])) v.commanders.push({ commander: a.commander[i]!, army: i });
  }
  return [...views.values()].sort((x, y) => x.province - y.province);
}

/** What the commander screen shows of an army (RECR-110). */
export interface CommanderScreen {
  commander: { name: string; might: number; cunning: number; logistics: number };
  /** Men by arm (ARMS order) and the army's kind ("levy" or "hired company"). */
  byArm: number[];
  kind: string;
  drill: number;
  /** Share of its men it can lose before it breaks. */
  breakPoint: number;
  /** One row per arm it has, with what can be done with it. */
  companies: { arm: string; men: number; actions: ("split" | "leave as garrison" | "send home")[] }[];
  /** Armies of the realm here it can merge with. */
  mergeWith: number[];
  food: { reserve: number; perDay: number; perMonth: number };
  payPerMonth: number;
  training: { arm: string; men: number; monthsLeft: number } | null;
  /** True where it stands at a castle or drill yard of its own (RECR-109). */
  canTrain: boolean;
}

/** The commander screen of an army led by a commander of realm n, or null for troops without one. */
export function commanderScreen(world: World, n: number, army: number): CommanderScreen | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n || a.commander[army]! < 0) return null;
  const c = world.commanders[a.commander[army]!]!;
  const by = menByArm(world, army);
  const hired = a.kind[army] === KIND.hired;
  const perMonth = armyRations(world, army);
  const p = a.location[army]!;
  const mergeWith: number[] = [];
  for (let i = 0; i < a.count; i++) if (i !== army && a.alive[i] && a.owner[i] === n && a.location[i] === p && a.kind[i] === a.kind[army] && a.commander[i]! >= 0) mergeWith.push(i);
  return {
    commander: { name: c.name, might: c.might, cunning: c.cunning, logistics: c.logistics },
    byArm: by,
    kind: KIND_NAMES[a.kind[army]!]!,
    drill: a.drill[army]!,
    breakPoint: armyBreak(world, army),
    companies: ARMS.map((arm, k) => ({ arm, men: by[k]! })).filter((x) => x.men >= 1).map((x) => ({ ...x, actions: hired ? ["split"] : ["split", "leave as garrison", "send home"] })),
    mergeWith,
    food: { reserve: a.food[army]!, perDay: perMonth / RATION_MONTH_DAYS, perMonth },
    payPerMonth: armyPay(world, army),
    training: a.trainArm[army]! >= 0 ? { arm: ARMS[a.trainArm[army]!]!, men: a.trainMen[army]!, monthsLeft: a.trainLeft[army]! } : null,
    canTrain: !hired && trainingGround(world, n, p),
  };
}

/** Days a month of rations is counted over on the commander screen. */
const RATION_MONTH_DAYS = 30;

/** Provinces of realm n where its armies can train now (RECR-109). */
export function trainingGrounds(world: World, n: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && trainingGround(world, n, p)) out.push(p);
  return out;
}

/** Gathered men join the province's levy garrison, or stand as a new one. */
function addToGarrison(world: World, n: number, p: number, men: number): void {
  const a = world.armies;
  const troop = garrisonTroops(world, n, p).find((i) => a.kind[i] === KIND.levy);
  if (troop === undefined) {
    spawnArmy(world, n, p, men, -1, 0, { kind: KIND.levy });
    return;
  }
  const by = menByArm(world, troop);
  const before = a.men[troop]!;
  by[LEVY] = by[LEVY]! + men;
  a.drill[troop] = (a.drill[troop]! * before) / (before + men);
  a.monthsOut[troop] = Math.round((a.monthsOut[troop]! * before) / (before + men));
  if (men > before) a.home[troop] = p;
  setByArm(world, troop, by);
  a.food[troop] = a.food[troop]! + wagonRations(world.rules.defines.march, { men, horse: 0, logistics: 0 });
}

/**
 * An army's commander takes in the province's garrison troops of its own kind where it stands,
 * at once: all of them, or `men` of them (whole thousands from the levy screen), each arm by its
 * share (RECR-108).
 */
export function pickUp(world: World, n: number, army: number, men?: number): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  if (a.commander[army]! < 0) return "troops without a commander can't take in others";
  const troops = garrisonTroops(world, n, a.location[army]!).filter((i) => a.kind[i] === a.kind[army]);
  if (!troops.length) return `no troops wait in ${provinceName(world, a.location[army]!)}`;
  let want = men === undefined ? Infinity : Math.round(men);
  if (want < 1) return "no men asked for";
  for (const t of troops) {
    if (want < 1) break;
    const here = a.men[t]!;
    if (here <= want + 0.5) {
      want -= here;
      mergeArmies(world, n, t, army);
      continue;
    }
    // Part of this troop: its arms by their share, with its drill and months out.
    const share = want / here;
    const from = menByArm(world, t);
    const into = menByArm(world, army);
    const before = a.men[army]!;
    setByArm(world, t, from.map((v) => v * (1 - share)));
    setByArm(world, army, into.map((v, k) => v + from[k]! * share));
    const total = a.men[army]!;
    a.drill[army] = total > 0 ? (a.drill[army]! * before + a.drill[t]! * want) / total : 0;
    a.monthsOut[army] = total > 0 ? Math.round((a.monthsOut[army]! * before + a.monthsOut[t]! * want) / total) : 0;
    if (want > before) a.home[army] = a.home[t]!;
    a.food[army] = a.food[army]! + a.food[t]! * share;
    a.food[t] = a.food[t]! * (1 - share);
    holdTraining(world, t);
    want = 0;
  }
  return null;
}

/** Where an army may train: a province of its own realm, held, not besieged, with a castle (capitals have one) or a drill yard (RECR-109). */
export function trainingGround(world: World, n: number, p: number): boolean {
  return controller(world, p) === n && world.provinceOwner[p] === n && !world.sieges.has(p) && (wallsOf(world, p) !== null || worksAt(world, p, WORK["drill yard"]) > 0);
}

/**
 * Train levy foot of an army as another arm: gold now, then months in which
 * the army must stand at a castle of its own (RECR-043..051, RECR-109).
 * Training stops while it marches or stands elsewhere, and goes on when it is back.
 */
export function trainTroops(world: World, n: number, army: number, arm: string, men: number, news: News[]): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  // Garrison troops train only once a commander has picked them up (RECR-107).
  if (a.commander[army]! < 0) return "troops without a commander can't train: a commander must pick them up first";
  if (a.trainArm[army]! >= 0) return `already training ${ARMS[a.trainArm[army]!]}`;
  if (arm === rc.LEVY_ARM || !world.rules.defines.recruit.armsAtStart.includes(arm) || !armUnlocked(world, n, arm)) return `you can't train ${arm} yet`;
  men = Math.round(Math.min(men, menByArm(world, army)[LEVY]!));
  if (men < 1) return "no levy foot to train";
  if (!trainingGround(world, n, a.location[army]!)) return "men train only at a castle or drill yard of your own: march the army to one";
  const cost = rc.trainingCost(arm, men);
  const g = gold(world, cost.gold);
  if (g > world.nationTreasury[n]!) return "not enough gold";
  world.nationTreasury[n] = world.nationTreasury[n]! - g;
  a.trainArm[army] = armIndex(arm);
  a.trainMen[army] = men;
  a.trainLeft[army] = Math.max(1, Math.ceil(cost.months));
  if (n === world.player) news.push({ kind: "raised", text: `${fmt(men)} levy foot begin training as ${arm}: ${Math.ceil(cost.months)} months, ${g.toFixed(1)} gold.`, nations: [n], province: a.location[army]! });
  return null;
}

/** Send home men of one arm (or a hired company's men leave). */
export function dismissTroops(world: World, n: number, army: number, arm: string, men: number): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  const k = ARMS.indexOf(arm);
  if (k < 0) return `no arm ${arm}`;
  const by = menByArm(world, army);
  men = Math.round(Math.min(men, by[k]!));
  if (men < 1) return `no ${arm} to send home`;
  if (men >= a.men[army]! - 0.5) return disbandArmy(world, n, army);
  by[k] = by[k]! - men;
  setByArm(world, army, by);
  if (a.kind[army] === KIND.levy) sendHome(world, n, men);
  holdTraining(world, army);
  recount(world);
  return null;
}

/** Split men of one arm off: under a commander waiting at court, or left behind as the province's garrison. */
export function splitTroops(world: World, n: number, army: number, arm: string, men: number, commander?: number): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  const k = ARMS.indexOf(arm);
  if (k < 0) return `no arm ${arm}`;
  const c = commander ?? -1;
  if (c >= 0 && !idleCommanders(world, n).includes(c)) return "that commander already leads an army";
  const by = menByArm(world, army);
  men = Math.round(Math.min(men, by[k]!));
  if (men < 1) return `no ${arm} to split off`;
  if (men >= a.men[army]! - 0.5) return "leave some men with the army";
  const share = men / a.men[army]!;
  by[k] = by[k]! - men;
  setByArm(world, army, by);
  holdTraining(world, army);
  const horse = isHorseArm(arm);
  const slot = spawnArmy(world, n, a.location[army]!, men, c, horse ? men : 0, { kind: a.kind[army]!, drill: a.drill[army]!, tile: a.tile[army]!, home: a.home[army]!, ...(horse ? { horseArm: arm } : { foot: arm }) });
  a.monthsOut[slot] = a.monthsOut[army]!;
  // The new army takes its share of the wagons, not a full set.
  a.food[slot] = a.food[army]! * share;
  a.food[army] = a.food[army]! * (1 - share);
  return null;
}

/** Keeps a training order within the levy foot an army still has. */
function holdTraining(world: World, army: number): void {
  const a = world.armies;
  if (a.trainArm[army]! < 0) return;
  a.trainMen[army] = Math.min(a.trainMen[army]!, Math.round(menByArm(world, army)[LEVY]!));
  if (a.trainMen[army]! < 1) a.trainArm[army] = -1;
}

// ---------------------------------------------------------------- free companies

export const companyMen = (c: FreeCompany) => c.byArm.reduce((t, m) => t + m, 0);

/** A company's own dice: a seed from the world's and the company's number, so drawing one leaves the world's rng alone. */
function companyDice(world: World, id: number): () => number {
  let t = (world.rng.state[0]! ^ Math.imul(id, 0x9e3779b1)) >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** A new free company of one of the age's groups: a size up to the age's largest and a mix of arms within the group's ranges. */
function newFreeCompany(world: World): FreeCompany | null {
  const d = world.rules.defines.recruit;
  const homesOf = (f: (typeof d.freeCompanies)[number]) => f.homes.map((h) => world.nationIndex.get(h)).filter((n): n is number => n !== undefined && !world.nationGone[n]);
  // One company of a name at a time: those for hire and those hired and still on the way.
  const taken = new Set([...world.freeCompanies, ...world.mercs.map((m) => m.company)].map((c) => c.name));
  const free = (f: (typeof d.freeCompanies)[number]) => f.names.filter((x) => !taken.has(x));
  const defs = d.freeCompanies.filter((f) => homesOf(f).length && free(f).length);
  if (!defs.length) return null;
  const id = ++world.freeCompanySeq;
  const roll = companyDice(world, id);
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(roll() * xs.length)]!;
  const def = pick(defs);
  const step = 50;
  const men = Math.round((d.freeCompanyMen.min + roll() * (d.freeCompanyMen.max - d.freeCompanyMen.min)) / step) * step;
  const share = ARMS.map((arm) => {
    const range = def.mix[arm];
    return range ? range[0]! + roll() * (range[1]! - range[0]!) : 0;
  });
  const total = share.reduce((t, x) => t + x, 0) || 1;
  const byArm = share.map((x) => Math.round((men * x) / total / step) * step);
  // Rounding: the largest arm takes up the difference, so the company has exactly its men.
  const big = byArm.indexOf(Math.max(...byArm));
  byArm[big] = byArm[big]! + men - byArm.reduce((t, m) => t + m, 0);
  const name = pick(free(def));
  const given = pick(def.captains);
  const from = pick(homesOf(def));
  const home = capitalOf(world, from);
  // The captain is named and ranked in the language of the land the company gathers in (feedback 125): "Hauptmann Ulrich von Hallwyl".
  const captain = rankedName(world.rules, from, personName(world.rules, from, mix(id, 125), provinceName(world, home), given), "captain");
  return { id, group: def.group, name, captain, home, byArm };
}

/** Each month a free company may move on, and new ones gather until the age's number are for hire (warfare free_companies). */
export function refreshFreeCompanies(world: World): void {
  const want = world.rules.defines.recruit.freeCompaniesForHire;
  const roll = companyDice(world, world.freeCompanySeq * 7919 + world.turn);
  world.freeCompanies = world.freeCompanies.filter(() => roll() >= 1 / 6);
  while (world.freeCompanies.length < want) {
    const c = newFreeCompany(world);
    if (!c) break;
    world.freeCompanies.push(c);
  }
}

/** Weeks a free company takes to reach nation n's capital: gathering, then the march from its home (WAR-210). */
export function companyWeeks(world: World, c: FreeCompany, n: number): number {
  const d = world.rules.defines.recruit;
  if (c.home < 0) return d.mercenaryWeeks;
  const a = world.rules.provinces[c.home]!;
  const b = world.rules.provinces[capitalOf(world, n)]!;
  const px = Math.hypot((a.x ?? 0) - (b.x ?? 0), (a.y ?? 0) - (b.y ?? 0));
  return d.mercenaryWeeks + Math.round(px / MAP_PX_PER_WEEK);
}

/** Map pixels a company marches in a week (about 175 km). */
const MAP_PX_PER_WEEK = 25;
/** Companies farther than this won't come. */
export const FREE_COMPANY_REACH_WEEKS = 16;

/** Free companies nation n can hire: those that would reach its capital in time. */
export function freeCompaniesFor(world: World, n: number): FreeCompany[] {
  return world.freeCompanies.filter((c) => companyWeeks(world, c, n) <= FREE_COMPANY_REACH_WEEKS);
}

/** Treasury gold a free company costs a month: its arms' pay times the hired multiplier. */
export function companyPay(world: World, c: FreeCompany, n = -1): number {
  return gold(world, ARMS.reduce((t, arm, k) => t + armPay(arm, c.byArm[k]!), 0) * kindMultiplier(KIND.hired)) * heritageFactor(world, n, "hired_company_cost_pct");
}

/**
 * Hire a free company: its first month's pay now; it marches in to the
 * capital over some weeks, always under its own captain (warfare kinds: hired
 * companies cost three times a levy's pay; WAR-210).
 */
export function hireCompany(world: World, n: number, id: number, news: News[]): string | null {
  const c = freeCompaniesFor(world, n).find((x) => x.id === id);
  if (!c) return "that company is not for hire to you";
  const men = companyMen(c);
  const cap = capitalOf(world, n);
  if (controller(world, cap) !== n || world.sieges.has(cap)) return "your capital is under siege: no company will come";
  if (!wf.overCap(world.nationCapUsed[n]! + men, world.nationTroopCap[n]!).canRaise) return "that would go over your troop cap";
  const cost = companyPay(world, c, n);
  if (cost > world.nationTreasury[n]!) return "not enough gold";
  world.nationTreasury[n] = world.nationTreasury[n]! - cost;
  const weeks = companyWeeks(world, c, n);
  world.freeCompanies = world.freeCompanies.filter((x) => x !== c);
  world.mercs.push({ nation: n, company: c, weeksLeft: weeks });
  recount(world);
  if (n === world.player) news.push({ kind: "raised", text: `${c.name} (${fmt(men)} men under ${c.captain}) is hired for ${cost.toFixed(1)} gold; it reaches ${provinceName(world, cap)} in ${weeks} weeks.`, nations: [n] });
  return null;
}

/** Two armies of one kind in one province become one; the other's commander goes back to court. */
export function mergeArmies(world: World, n: number, from: number, into: number): string | null {
  const a = world.armies;
  for (const s of [from, into]) if (s < 0 || s >= a.count || !a.alive[s] || a.owner[s] !== n) return "no such army of yours";
  if (from === into) return "an army can't join itself";
  if (a.location[from] !== a.location[into]) return "armies must stand in the same province to join";
  if (a.kind[from] !== a.kind[into]) return `a ${KIND_NAMES[a.kind[from]!]} can't join a ${KIND_NAMES[a.kind[into]!]}`;
  const byF = menByArm(world, from);
  const byI = menByArm(world, into);
  const men = a.men[from]! + a.men[into]!;
  a.drill[into] = men > 0 ? (a.drill[from]! * a.men[from]! + a.drill[into]! * a.men[into]!) / men : 0;
  a.monthsOut[into] = men > 0 ? Math.round((a.monthsOut[from]! * a.men[from]! + a.monthsOut[into]! * a.men[into]!) / men) : 0;
  // One home per army: the larger part's (WAR-226).
  if (a.men[from]! > a.men[into]!) a.home[into] = a.home[from]!;
  setByArm(world, into, byI.map((v, k) => v + byF[k]!));
  a.food[into] = a.food[into]! + a.food[from]!;
  if (a.trainArm[into]! < 0 && a.trainArm[from]! >= 0) {
    a.trainArm[into] = a.trainArm[from]!;
    a.trainMen[into] = a.trainMen[from]!;
    a.trainLeft[into] = a.trainLeft[from]!;
  }
  a.alive[from] = 0;
  halt(world, from);
  return null;
}

/**
 * Put a commander at the head of an army or of a province's garrison troops
 * (swapping with the army he led, if any); commander -1 sends the army's
 * commander back to court and leaves its men as the province's garrison.
 */
export function appointCommander(world: World, n: number, army: number, commander: number): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  if (commander < 0) {
    if (a.kind[army] === KIND.hired) return "a mercenary company keeps its own captain";
    a.commander[army] = -1;
    halt(world, army);
    return null;
  }
  if (commander >= world.commanderIds.length || world.commanderOwner[commander] !== n) return "no such commander of yours";
  const other = armyOf(world, commander);
  if (other >= 0) {
    if (a.kind[other] === KIND.hired) return "a mercenary captain stays with his company";
    a.commander[other] = a.commander[army]!;
    if (a.commander[other]! < 0) halt(world, other);
  }
  a.commander[army] = commander;
  return null;
}

/** Send an army home: levies go back to the pools, a hired company and its captain leave; the commander returns to court. */
export function disbandArmy(world: World, n: number, army: number, recountAfter = true): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army]) return "no such army";
  if (a.owner[army] !== n) return "not your army";
  if (a.kind[army] === KIND.hired) {
    const c = a.commander[army]!;
    if (c >= 0) world.commanderOwner[c] = -1;
  } else sendHome(world, n, a.men[army]!);
  a.alive[army] = 0;
  halt(world, army);
  if (recountAfter) recount(world);
  return null;
}

/** The levies of the realm's provinces and its troop cap, after anything that changed them. */
export function recount(world: World): void {
  recomputeCap(world);
  const now = world.nationLevies;
  const max = world.nationMaxLevies;
  now.fill(0);
  max.fill(0);
  for (let p = 0; p < world.provinceCount; p++) {
    const owner = world.provinceOwner[p]!;
    if (owner < 0) continue;
    max[owner] = max[owner]! + world.provinceRecruitCeiling[p]!;
    if (world.provinceOccupier[p]! < 0) now[owner] = now[owner]! + world.provinceRecruits[p]!;
  }
}

// ---------------------------------------------------------------- the turn

/** Each week: a thousand men gather in each province calling them; mercenaries march in; recruits where an enemy holds the land scatter. */
export function weeklyMusters(world: World, news: News[], days = 7): void {
  world.musters = world.musters.filter((m) => {
    if (controller(world, m.province) !== m.nation) {
      sendHome(world, m.nation, m.men);
      if (m.nation === world.player) news.push({ kind: "refused", text: `${fmt(m.men)} men called up at ${provinceName(world, m.province)} scatter home as the enemy takes it.`, nations: [m.nation], province: m.province });
      return false;
    }
    m.daysLeft -= days;
    // One thousand at a time; with railway mobilization several may gather in one week (RECR-106).
    let gathered = 0;
    while (m.daysLeft <= 0 && m.men >= 1) {
      const men = Math.min(LEVY_UNIT, m.men);
      addToGarrison(world, m.nation, m.province, men);
      m.men -= men;
      m.daysLeft += gatherDays(world, m.nation);
      gathered += men;
    }
    if (gathered && m.nation === world.player) news.push({ kind: "raised", text: `${fmt(gathered)} men have gathered at ${provinceName(world, m.province)} and wait for a commander.`, nations: [m.nation], province: m.province });
    return m.men >= 1;
  });
  world.mercs = world.mercs.filter((m) => {
    if (--m.weeksLeft > 0) return true;
    const cap = capitalOf(world, m.nation);
    // With the capital lost, they come to the realm's first province still held.
    let at = controller(world, cap) === m.nation ? cap : -1;
    for (let p = 0; at < 0 && p < world.provinceCount; p++) if (world.provinceOwner[p] === m.nation && controller(world, p) === m.nation) at = p;
    if (at < 0) return false;
    const c = m.company;
    const captain = newCaptain(world, m.nation, c.captain || undefined);
    const slot = spawnArmy(world, m.nation, at, companyMen(c), captain, 0, { kind: KIND.hired, drill: rc.drillAndBreak("trained").drill });
    setByArm(world, slot, c.byArm);
    if (m.nation === world.player) news.push({ kind: "raised", text: `${world.commanders[captain]!.name} arrives at ${provinceName(world, at)} with ${c.name}, ${fmt(companyMen(c))} men.`, nations: [m.nation], province: at });
    return false;
  });
}

/**
 * Each month: pools refill, levies count their months (pay begins in the
 * fourth), men over the troop cap or unpaid desert, and training moves on
 * (RECR-019, RECR-050, WAR-035).
 */
export function monthlyRecruits(world: World, news: News[]): void {
  const rate = rc.refillRate() / 12;
  const empty = rc.emptyProvinceEffect("Leave it").recruits;
  // Many fallen in the last ten years slow the refill (REALM-096).
  const fallen = refillPaces(world);
  for (let p = 0; p < world.provinceCount; p++) {
    const pool = { recruits: world.provinceRecruits[p]!, ceiling: world.provinceRecruitCeiling[p]! };
    // A muster master refills the pool faster (province officials table: +25 %).
    const muster = officialBonus(world, p, "Muster master", "recruit_refill");
    const heritage = heritageFactor(world, world.provinceOwner[p]!, "recruit_refill_pct");
    const owner = world.provinceOwner[p]!;
    rc.refill(pool as rc.ProvincePool, 1, rate * muster * heritage * (owner >= 0 ? fallen[owner]! : 1) * (ungoverned(world, p) ? empty : 1) * moodShare(world, p) * crownShare(world, p));
    world.provinceRecruits[p] = pool.recruits;
  }
  recomputeCap(world);

  const a = world.armies;
  const deserted = new Float64Array(world.nationCount);
  const broke = world.nationTreasury.map((t) => (t < 0 ? 1 : 0));
  const refusing = Array.from({ length: world.nationCount }, (_, n) => refusingPeace(world, n));
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const n = a.owner[i]!;
    a.monthsOut[i] = Math.min(65535, a.monthsOut[i]! + 1);
    const kind = a.kind[i]!;
    // Levies don't go home on their own: once raised, the player decides (Leroy's design, over RECR-053).
    let desert = (kind === KIND.levy ? wf.overCap(world.nationCapUsed[n]!, world.nationTroopCap[n]!).levyDesertion : 0) + (broke[n] ? world.rules.defines.recruit.unpaidDesertion : 0);
    // A ruler refusing a peace his voices oblige him to take: levies desert twice as fast, from at least the old going-home pace (WAR-181).
    if (kind === KIND.levy && refusing[n]) desert = Math.max(desert, wf.W.levy.go_home_rate) * wf.W.peace.refuse_desertion;
    const share = Math.min(1, desert);
    if (share > 0) {
      const lost = Math.round(a.men[i]! * share);
      setByArm(world, i, menByArm(world, i).map((v) => v * (1 - share)));
      holdTraining(world, i);
      if (kind === KIND.levy) sendHome(world, n, lost);
      deserted[n] = deserted[n]! + lost;
      if (a.men[i]! < 1) a.alive[i] = 0;
    }
    if (a.alive[i]) trainMonth(world, i, news);
  }
  refreshFreeCompanies(world);
  const p = world.player;
  if (p >= 0 && deserted[p]! >= 1) news.push({ kind: "refused", text: `${fmt(deserted[p]!)} men desert: ${broke[p] ? "the treasury can't pay them" : "you keep more men than your troop cap"}.`, nations: [p] });
  recount(world);
}

/** A province of a realm whose official's post stands empty (he was commissioned). */
export function ungoverned(world: World, p: number): boolean {
  return world.provinceOwner[p]! >= 0 && world.provinceOfficial[p]! < 0;
}

/** A month of training: on at a castle of its own with no march under way, else held (RECR-050, RECR-100, RECR-109). */
function trainMonth(world: World, i: number, news: News[]): void {
  const a = world.armies;
  const k = a.trainArm[i]!;
  if (k < 0) return;
  const p = a.location[i]!;
  if (isMarching(world, i) || !trainingGround(world, a.owner[i]!, p)) return;
  a.trainLeft[i] = a.trainLeft[i]! - 1;
  if (a.trainLeft[i]! > 0) return;
  const arm = ARMS[k]!;
  const by = menByArm(world, i);
  const men = Math.min(a.trainMen[i]!, by[LEVY]!);
  by[LEVY] = by[LEVY]! - men;
  by[k] = by[k]! + men;
  const total = a.men[i]!;
  a.drill[i] = total > 0 ? (a.drill[i]! * (total - men) + rc.drillAndBreak("trained").drill * men) / total : 0;
  setByArm(world, i, by);
  a.trainArm[i] = -1;
  a.trainMen[i] = 0;
  noteRegiment(world, a.owner[i]!);
  if (a.owner[i] === world.player) {
    const c = a.commander[i]!;
    news.push({ kind: "raised", text: `${fmt(men)} men of ${c >= 0 ? world.commanders[c]!.name : "an army"}'s army finish their training as ${arm}.`, nations: [a.owner[i]!], province: p });
  }
}

// ---------------------------------------------------------------- the AI

/**
 * AI realms at war call men, a thousand at a time, from their capital and the
 * land around it, as far as their purse allows; at peace they send levies home
 * before their pay begins.
 */
export function aiRecruits(world: World, news: News[], atWarNow: (n: number) => boolean): void {
  const a = world.armies;
  const levyPer1000 = gold(world, rc.levyPay(1000, 99));
  const atWar = Uint8Array.from({ length: world.nationCount }, (_, n) => (atWarNow(n) ? 1 : 0));
  // At peace, levies go home before their pay begins (one pass over the armies for every realm, one recount after it).
  let sent = false;
  for (let i = 0; i < a.count; i++) {
    const n = a.owner[i]!;
    if (a.alive[i] && n !== world.player && !world.nationGone[n] && !atWar[n] && a.kind[i] === KIND.levy && a.monthsOut[i]! >= wf.W.levy.free_months) sent = disbandArmy(world, n, i, false) === null || sent;
  }
  if (sent) recount(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || world.nationGone[n] || !atWar[n]) continue;
    // Men it could not put under a commander would only stand as garrisons (feedback 28).
    if (world.nationTreasury[n]! < COMMISSION_GOLD && !idleCommanders(world, n).length) continue;
    const cap = capitalOf(world, n);
    if (callingPlace(world, n, cap)) continue;
    // Keep the levies' future pay within half the income.
    let budget = Math.floor(Math.min(canCall(world, n), ((world.nationMonthlyIncome[n]! * 0.5) / levyPer1000) * 1000, 10000) / 1000);
    if (budget < 2) continue;
    for (const p of [cap, ...neighbours(world, cap)]) {
      if (budget < 1 || callingPlace(world, n, p) || world.musters.some((m) => m.nation === n && m.province === p)) continue;
      const k = Math.min(budget, 3, Math.floor(world.provinceRecruits[p]! / 1000));
      if (k >= 1 && !recruit(world, n, p, k, news)) budget -= k;
    }
  }
}

const AI_MEN_PER_COMMANDER = 8000;
const commandersOf = (world: World, n: number) => world.commanderOwner.reduce((t, o) => t + (o === n ? 1 : 0), 0);

/** Each week, AI commanders take in the troops that have gathered, or a free (or newly commissioned) one leads them out. */
export function aiCollect(world: World, news: News[]): void {
  const a = world.armies;
  // Led armies by realm, place and kind, and each realm's idle commanders, worked out once for the week
  // (a realm's many garrisons would otherwise each search every army).
  const key = (n: number, p: number, kind: number) => (p * world.nationCount + n) * KIND_NAMES.length + kind;
  const led = new Map<number, number>();
  const busy = new Set<number>();
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.commander[i]! < 0) continue;
    busy.add(a.commander[i]!);
    const k = key(a.owner[i]!, a.location[i]!, a.kind[i]!);
    if (!led.has(k)) led.set(k, i);
  }
  const idle = new Map<number, number[]>();
  for (let c = 0; c < world.commanderIds.length; c++) {
    const n = world.commanderOwner[c]!;
    if (n < 0 || busy.has(c)) continue;
    const list = idle.get(n);
    if (list) list.push(c);
    else idle.set(n, [c]);
  }
  const score = (c: number) => world.commanders[c]!.might + world.commanders[c]!.cunning + world.commanders[c]!.logistics;
  for (const list of idle.values()) list.sort((x, y) => score(y) - score(x) || x - y);
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.commander[i]! >= 0) continue;
    const n = a.owner[i]!;
    if (n === world.player || world.nationGone[n]) continue;
    const k = key(n, a.location[i]!, a.kind[i]!);
    const here = led.get(k);
    if (here !== undefined && a.alive[here] && a.commander[here]! >= 0) {
      mergeArmies(world, n, i, here);
      continue;
    }
    let free = idle.get(n) ?? [];
    if (!free.length) {
      // Commissions cost and empty a post, so the AI makes one only for at least
      // `aiCommissionMinMen` men without a commander, and keeps about one commander
      // to each 8,000 men it has under arms (RECR-115, feedback 28).
      if (a.men[i]! < rc.recruitingConfig.aiCommissionMinMen || commandersOf(world, n) >= 1 + world.nationCapUsed[n]! / AI_MEN_PER_COMMANDER) continue;
      let post = -1;
      // A lord's official serves the lord, so only royal posts can give a commander.
      for (let p = 0; p < world.provinceCount && post < 0; p++) if (world.provinceOwner[p] === n && world.provinceLord[p]! < 0 && world.provinceOfficial[p]! >= 0) post = p;
      if (post < 0 || commissionOfficial(world, n, post, news)) continue;
      free = idleCommanders(world, n);
    }
    const c = free[0]!;
    if (appointCommander(world, n, i, c)) continue;
    idle.set(n, free.slice(1));
    led.set(k, i);
  }
}

function neighbours(world: World, p: number): number[] {
  return Array.from(world.adjList.subarray(world.adjStart[p]!, world.adjStart[p + 1]!));
}

function findArmyAt(world: World, n: number, p: number, kind: number): number {
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n && a.location[i] === p && a.kind[i] === kind && a.commander[i]! >= 0) return i;
  return -1;
}
