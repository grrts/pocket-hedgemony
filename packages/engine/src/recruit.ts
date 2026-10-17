import * as rc from "./domain/recruiting/index.ts";
import * as wf from "./domain/warfare/index.ts";
import { monthlyRations } from "./march.ts";
import { halt, isMarching } from "./turn.ts";
import { spawnArmy, type World } from "./world.ts";
import { atWar, controller, wallsOf, type News } from "./war.ts";

/**
 * Milestone 2, armies that cost something: wires the recruiting context (who
 * can be called, the levy, training, pay, going home) and the warfare
 * context's troop cap, company kinds and commanders into the weekly turn.
 *
 * The flow follows Leroy's design: recruit men a thousand at a time from one
 * province's people; each thousand takes two weeks to gather, then stands in
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
  /** Weeks until the next thousand has gathered. */
  weeksLeft: number;
}

/** A mercenary company on its way to the capital with its captain. */
export interface Mercenary {
  nation: number;
  arm: string;
  men: number;
  weeksLeft: number;
}

/** Officials a province can have (recruiting: commanders from officials), dealt out to provinces at start. */
export const OFFICIALS = ["Warden", "Steward", "Muster master", "Master of works", "Tax collector", "Customs officer", "Judge", "Schoolmaster"] as const;

export function createRecruitState(P: number, N: number) {
  return {
    provinceRecruits: new Float32Array(P),
    provinceRecruitCeiling: new Float32Array(P),
    nationTroopCap: new Float64Array(N),
    nationCapUsed: new Float64Array(N),
    musters: [] as Muster[],
    mercs: [] as Mercenary[],
    /** Official of each province (index into OFFICIALS), -1 = none: his post is empty. */
    provinceOfficial: new Int8Array(P).fill(-1),
    /** Province each commander was commissioned from, -1 = none. */
    commanderHome: [] as number[],
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

/**
 * Commission a province's official as a commander: he gets his type's skills and waits at court
 * (RECR-069..073). The post is left empty: the province pays half its tax and gives half its
 * recruits until he is released back to it (RECR-083 "Leave it").
 */
export function commissionOfficial(world: World, n: number, p: number, news: News[]): string | null {
  if (p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  const type = world.provinceOfficial[p]!;
  if (type < 0) return `${provinceName(world, p)} has no official to spare`;
  const cost = world.rules.defines.recruit.commanderGold;
  if (cost > world.nationTreasury[n]!) return "not enough gold";
  const { commission } = rc.commission({ official: OFFICIALS[type]!, type: OFFICIALS[type]!, province: world.provinceIds[p]! });
  const skills = commission.skills ?? { might: 1, cunning: 1, logistics: 1 };
  const names = world.rules.defines.recruit.commanderNames;
  const name = `${names[world.rng.int(names.length)]} of ${provinceName(world, p)}`;
  world.nationTreasury[n] = world.nationTreasury[n]! - cost;
  const c = addCommander(world, n, wf.newCommander(name, { ...skills, origin: OFFICIALS[type]! }));
  world.commanderHome[c] = p;
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
  const type = OFFICIALS.indexOf(world.commanders[c]!.origin as (typeof OFFICIALS)[number]);
  world.provinceOfficial[home] = Math.max(0, type);
  world.commanderOwner[c] = -1;
  return null;
}

/** A captain who comes with a mercenary company: skills of 1 to 3. */
function newCaptain(world: World, n: number): number {
  const names = world.rules.defines.recruit.commanderNames;
  const skill = () => 1 + world.rng.int(3);
  return addCommander(world, n, wf.newCommander(`Captain ${names[world.rng.int(names.length)]}`, { might: skill(), cunning: skill(), logistics: skill(), origin: "a hired captain" }));
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
 * (a levy is free for its first 3 months, a hired company costs three times)
 * (RECR-017, warfare kinds).
 */
export function armyPay(world: World, slot: number): number {
  const a = world.armies;
  const kind = a.kind[slot]!;
  if (kind === KIND.levy && a.monthsOut[slot]! <= wf.W.levy.free_months) return 0;
  const by = menByArm(world, slot);
  let pay = 0;
  ARMS.forEach((arm, k) => (pay += armPay(arm, by[k]!)));
  return gold(world, pay * kindMultiplier(kind));
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
  for (let p = 0; p < world.provinceCount; p++) {
    const owner = world.provinceOwner[p]!;
    if (owner < 0) continue;
    cap[owner] = cap[owner]! + wf.provinceCap({ people: world.provincePopulation[p]! * 1000, royal: true, occupied: world.provinceOccupier[p]! >= 0 });
  }
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i]) used[a.owner[i]!] = used[a.owner[i]!]! + a.men[i]!;
  for (const m of world.musters) used[m.nation] = used[m.nation]! + m.men;
  for (const m of world.mercs) used[m.nation] = used[m.nation]! + m.men;
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
  const over = wf.overCap(world.nationCapUsed[n]!, world.nationTroopCap[n]!).doublePayFor;
  if (over > 0 && men > 0) pay += (pay / men) * Math.min(over, men);
  return pay;
}

/** Rations a month for an army, by the march rules (men, horses, its commander's logistics). */
export function armyRations(world: World, slot: number): number {
  const a = world.armies;
  const c = a.commander[slot]!;
  return monthlyRations(world.rules.defines.march, { men: a.men[slot]!, horse: a.horse[slot]!, logistics: c >= 0 ? world.commanderLogistics[c]! : 0 });
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
  if (p < 0 || p >= world.provinceCount || world.provinceWater[p]) return "no such province";
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
  const where = callingPlace(world, n, p);
  if (where) return where;
  const men = Math.round(thousands) * 1000;
  if (men <= 0) return "no men asked for";
  if (men > world.provinceRecruits[p]! + 0.5) return `${provinceName(world, p)} has only ${fmt(world.provinceRecruits[p]!)} men left to call`;
  if (!wf.overCap(world.nationCapUsed[n]! + men, world.nationTroopCap[n]!).canRaise) return "that would go over your troop cap";
  const cost = gold(world, rc.levyMoney(men));
  if (cost > world.nationTreasury[n]!) return "not enough gold";
  world.provinceRecruits[p] = Math.max(0, world.provinceRecruits[p]! - men);
  world.nationTreasury[n] = world.nationTreasury[n]! - cost;
  const weeks = world.rules.defines.recruit.gatherWeeks;
  const queue = world.musters.find((m) => m.nation === n && m.province === p);
  if (queue) queue.men += men;
  else world.musters.push({ nation: n, province: p, men, weeksLeft: weeks });
  recount(world);
  if (n === world.player) news.push({ kind: "raised", text: `${fmt(men)} men of ${provinceName(world, p)} are called up; they gather a thousand every ${weeks} weeks.`, nations: [n], province: p });
  return null;
}

/** Weeks until all the men called in a province have gathered. */
export function weeksToGather(world: World, m: Muster): number {
  return m.weeksLeft + (Math.ceil(m.men / 1000) - 1) * world.rules.defines.recruit.gatherWeeks;
}

/** Troops of a realm in a province with no commander: its garrison, by army slot. */
export function garrisonTroops(world: World, n: number, p: number): number[] {
  const a = world.armies;
  const out: number[] = [];
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n && a.location[i] === p && a.commander[i]! < 0) out.push(i);
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
  setByArm(world, troop, by);
  a.food[troop] = a.food[troop]! + monthlyRations(world.rules.defines.march, { men, horse: 0, logistics: 0 }) * world.rules.defines.march.monthsCarried;
}

/** An army's commander takes in the province's garrison troops of its own kind where it stands. */
export function pickUp(world: World, n: number, army: number): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  if (a.commander[army]! < 0) return "troops without a commander can't take in others";
  const troops = garrisonTroops(world, n, a.location[army]!).filter((i) => a.kind[i] === a.kind[army]);
  if (!troops.length) return `no troops wait in ${provinceName(world, a.location[army]!)}`;
  for (const t of troops) mergeArmies(world, n, t, army);
  return null;
}

/** Where an army may train: a province of its own realm, held, not besieged, with a stone castle (capitals have one) (RECR-109). */
export function trainingGround(world: World, n: number, p: number): boolean {
  return controller(world, p) === n && world.provinceOwner[p] === n && !world.sieges.has(p) && wallsOf(world, p) === "stone castle";
}

/**
 * Train levy foot of an army as another arm: gold now, then months in which
 * the army must stand at a castle of its own (RECR-043..051, RECR-109).
 * Training stops while it marches or stands elsewhere, and goes on when it is back.
 */
export function trainTroops(world: World, n: number, army: number, arm: string, men: number, news: News[]): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army] || a.owner[army] !== n) return "no such army of yours";
  if (a.trainArm[army]! >= 0) return `already training ${ARMS[a.trainArm[army]!]}`;
  if (arm === rc.LEVY_ARM || !world.rules.defines.recruit.armsAtStart.includes(arm)) return `you can't train ${arm} yet`;
  men = Math.round(Math.min(men, menByArm(world, army)[LEVY]!));
  if (men < 1) return "no levy foot to train";
  if (!trainingGround(world, n, a.location[army]!)) return "men train only at a castle of your own: march the army to one";
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
  const slot = spawnArmy(world, n, a.location[army]!, men, c, horse ? men : 0, { kind: a.kind[army]!, drill: a.drill[army]!, tile: a.tile[army]!, ...(horse ? { horseArm: arm } : { foot: arm }) });
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

/**
 * Buy a mercenary company: its first month's pay now; it marches in to the
 * capital over some weeks, always under its own captain (warfare kinds: hired
 * companies cost three times a levy's pay).
 */
export function hireCompany(world: World, n: number, arm: string, news: News[]): string | null {
  const d = world.rules.defines.recruit;
  if (!d.hiredArms.includes(arm)) return `no companies of ${arm} for hire`;
  const men = d.hiredCompanyMen;
  const cap = capitalOf(world, n);
  if (controller(world, cap) !== n || world.sieges.has(cap)) return "your capital is under siege: no company will come";
  if (!wf.overCap(world.nationCapUsed[n]! + men, world.nationTroopCap[n]!).canRaise) return "that would go over your troop cap";
  const cost = mercenaryPrice(world, arm);
  if (cost > world.nationTreasury[n]!) return "not enough gold";
  world.nationTreasury[n] = world.nationTreasury[n]! - cost;
  world.mercs.push({ nation: n, arm, men, weeksLeft: d.mercenaryWeeks });
  recount(world);
  if (n === world.player) news.push({ kind: "raised", text: `A company of ${fmt(men)} ${arm} is bought for ${cost.toFixed(1)} gold; it reaches ${provinceName(world, capitalOf(world, n))} in ${d.mercenaryWeeks} weeks.`, nations: [n] });
  return null;
}

/** Gold to buy a mercenary company: its first month's pay. */
export function mercenaryPrice(world: World, arm: string): number {
  return gold(world, armPay(arm, world.rules.defines.recruit.hiredCompanyMen) * kindMultiplier(KIND.hired));
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
export function disbandArmy(world: World, n: number, army: number): string | null {
  const a = world.armies;
  if (army < 0 || army >= a.count || !a.alive[army]) return "no such army";
  if (a.owner[army] !== n) return "not your army";
  if (a.kind[army] === KIND.hired) {
    const c = a.commander[army]!;
    if (c >= 0) world.commanderOwner[c] = -1;
  } else sendHome(world, n, a.men[army]!);
  a.alive[army] = 0;
  halt(world, army);
  recount(world);
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
export function weeklyMusters(world: World, news: News[]): void {
  const weeks = world.rules.defines.recruit.gatherWeeks;
  world.musters = world.musters.filter((m) => {
    if (controller(world, m.province) !== m.nation) {
      sendHome(world, m.nation, m.men);
      if (m.nation === world.player) news.push({ kind: "refused", text: `${fmt(m.men)} men called up at ${provinceName(world, m.province)} scatter home as the enemy takes it.`, nations: [m.nation], province: m.province });
      return false;
    }
    if (--m.weeksLeft > 0) return true;
    const men = Math.min(1000, m.men);
    addToGarrison(world, m.nation, m.province, men);
    m.men -= men;
    m.weeksLeft = weeks;
    if (m.nation === world.player) news.push({ kind: "raised", text: `${fmt(men)} men have gathered at ${provinceName(world, m.province)} and wait for a commander.`, nations: [m.nation], province: m.province });
    return m.men >= 1;
  });
  world.mercs = world.mercs.filter((m) => {
    if (--m.weeksLeft > 0) return true;
    const cap = capitalOf(world, m.nation);
    // With the capital lost, they come to the realm's first province still held.
    let at = controller(world, cap) === m.nation ? cap : -1;
    for (let p = 0; at < 0 && p < world.provinceCount; p++) if (world.provinceOwner[p] === m.nation && controller(world, p) === m.nation) at = p;
    if (at < 0) return false;
    const captain = newCaptain(world, m.nation);
    const horse = isHorseArm(m.arm);
    spawnArmy(world, m.nation, at, m.men, captain, horse ? m.men : 0, { kind: KIND.hired, drill: rc.drillAndBreak("trained").drill, ...(horse ? { horseArm: m.arm } : { foot: m.arm }) });
    if (m.nation === world.player) news.push({ kind: "raised", text: `${world.commanders[captain]!.name} arrives at ${provinceName(world, at)} with ${fmt(m.men)} ${m.arm}.`, nations: [m.nation], province: at });
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
  for (let p = 0; p < world.provinceCount; p++) {
    const pool = { recruits: world.provinceRecruits[p]!, ceiling: world.provinceRecruitCeiling[p]! };
    rc.refill(pool as rc.ProvincePool, 1, rate * (ungoverned(world, p) ? empty : 1));
    world.provinceRecruits[p] = pool.recruits;
  }
  recomputeCap(world);

  const a = world.armies;
  const deserted = new Float64Array(world.nationCount);
  const broke = world.nationTreasury.map((t) => (t < 0 ? 1 : 0));
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const n = a.owner[i]!;
    a.monthsOut[i] = Math.min(65535, a.monthsOut[i]! + 1);
    const kind = a.kind[i]!;
    // Levies don't go home on their own: once raised, the player decides (Leroy's design, over RECR-053).
    const desert = (kind === KIND.levy ? wf.overCap(world.nationCapUsed[n]!, world.nationTroopCap[n]!).levyDesertion : 0) + (broke[n] ? world.rules.defines.recruit.unpaidDesertion : 0);
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
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || world.nationGone[n]) continue;
    if (!atWarNow(n)) {
      for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n && a.kind[i] === KIND.levy && a.monthsOut[i]! >= wf.W.levy.free_months) disbandArmy(world, n, i);
      continue;
    }
    if (world.nationTreasury[n]! < 0) continue;
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

const AI_COMMAND_MIN_MEN = 3000;
const AI_MEN_PER_COMMANDER = 8000;
const commandersOf = (world: World, n: number) => world.commanderOwner.reduce((t, o) => t + (o === n ? 1 : 0), 0);

/** Each week, AI commanders take in the troops that have gathered, or a free (or newly commissioned) one leads them out. */
export function aiCollect(world: World, news: News[]): void {
  const a = world.armies;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.commander[i]! >= 0) continue;
    const n = a.owner[i]!;
    if (n === world.player || world.nationGone[n]) continue;
    const here = findArmyAt(world, n, a.location[i]!, a.kind[i]!);
    if (here >= 0) {
      mergeArmies(world, n, i, here);
      continue;
    }
    if (!idleCommanders(world, n).length) {
      // Commissions cost and empty a post, so the AI makes one only for a stack worth leading,
      // and keeps about one commander to each 8,000 men it has under arms (feedback 28).
      if (a.men[i]! < AI_COMMAND_MIN_MEN || commandersOf(world, n) >= 1 + world.nationCapUsed[n]! / AI_MEN_PER_COMMANDER) continue;
      let post = -1;
      for (let p = 0; p < world.provinceCount && post < 0; p++) if (world.provinceOwner[p] === n && world.provinceOfficial[p]! >= 0) post = p;
      if (post < 0 || commissionOfficial(world, n, post, news)) continue;
    }
    appointCommander(world, n, i, idleCommanders(world, n)[0]!);
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
