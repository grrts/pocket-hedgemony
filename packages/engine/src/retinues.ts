import * as rc from "./domain/recruiting/index.ts";
import * as wf from "./domain/warfare/index.ts";
import type { GameWar } from "./peace.ts";
import { lordWant } from "./peace.ts";
import { addCommander, armyOf, KIND, recountLordsMen } from "./recruit.ts";
import { inAnyWar, lordLands, lordOfCommander, lordSendHome, loyaltyStep } from "./lords.ts";
import { knownSet } from "./research.ts";
import { halt } from "./turn.ts";
import { controller, type News } from "./war.ts";
import { spawnArmy, type World } from "./world.ts";

/**
 * Lords lead their own retinues (WAR-252 to WAR-258, Leroy 18 Oct): a lord's
 * lands fill his retinue rather than the crown's levy; at war the ruler calls
 * the lords, and each answers by his loyalty (WAR-038). A called retinue
 * gathers at the lord's seat and takes the field as its own army under the
 * lord himself. It costs the crown nothing and does not count toward the
 * troop cap, but it is his: it only marches or goes home, and it goes home at
 * peace, when he turns disloyal, or when a wavering lord has served his months.
 */

const L = wf.W.lords;

const provinceName = (world: World, p: number) => world.rules.provinces[p]!.name;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** The most men a lord's retinue can be: his own cap on his held lands (WAR-033). */
export function retinueCap(world: World, lord: number): number {
  const known = knownSet(world, world.lords[lord]!.nation);
  let cap = 0;
  for (const p of lordLands(world, lord)) {
    if (world.provinceOccupier[p]! >= 0) continue;
    cap += world.provincePopulation[p]! * 1000 * wf.capShare({ official: world.provinceOfficial[p]! >= 0 }, known);
  }
  return cap;
}

/** A lord's retinue in the field (army slot), or -1. */
export function retinueArmy(world: World, lord: number): number {
  const c = world.lords[lord]!.commander;
  if (c === undefined) return -1;
  const s = armyOf(world, c);
  return s >= 0 && world.armies.kind[s] === KIND.retinue ? s : -1;
}

/** Men a lord could bring now: his held lands' recruits, up to his cap less any men already out (WAR-252). */
export function retinueAtHome(world: World, lord: number): number {
  let pool = 0;
  for (const p of lordLands(world, lord)) if (world.provinceOccupier[p]! < 0) pool += world.provinceRecruits[p]!;
  const out = (world.lords[lord]!.call?.men ?? 0) + (retinueArmy(world, lord) >= 0 ? world.armies.men[retinueArmy(world, lord)]! : 0);
  return Math.max(0, Math.floor(Math.min(pool, retinueCap(world, lord) - out)));
}

/** The lord's seat: his held province with the most people, where his retinue gathers (-1 when he holds none). */
export function lordSeat(world: World, lord: number): number {
  const n = world.lords[lord]!.nation;
  let best = -1;
  for (const p of lordLands(world, lord)) if (controller(world, p) === n && (best < 0 || world.provincePopulation[p]! > world.provincePopulation[best]!)) best = p;
  return best;
}

/** A war of the lord's realm whose aim is his Want: he comes, and stays to its end (WAR-039). */
export function wantsThisWar(world: World, lord: number): boolean {
  const l = world.lords[lord]!;
  const want = lordWant(world, lord);
  if (!want) return false;
  const id = world.nationIds[l.nation]!;
  return world.diplomacy.wars.some((w) => w.attackers.includes(id) && w.aim === "take_land" && (w as GameWar).aimProvince === want);
}

export type RetinueState = "ready" | "gathering" | "in the field" | "refuses" | "no men";

/** Where a lord's retinue stands, for the Army tab and his card. */
export function retinueState(world: World, lord: number): RetinueState {
  const l = world.lords[lord]!;
  if (retinueArmy(world, lord) >= 0) return "in the field";
  if (l.call) return "gathering";
  if (l.loyalty === "Disloyal" || l.loyalty === "In revolt") return "refuses";
  return retinueAtHome(world, lord) >= L.min_men ? "ready" : "no men";
}

/** The men a lord would bring if called now, by his loyalty (WAR-038, WAR-039). */
export function answerOf(world: World, lord: number): wf.LordAnswer {
  const l = world.lords[lord]!;
  const want = wantsThisWar(world, lord) ? lordWant(world, lord) : undefined;
  return wf.callLord({ loyalty: l.loyalty, retinue: retinueAtHome(world, lord), ...(want ? { want } : {}) }, want ? { warAim: want } : {});
}

/** Why a lord can't be called now, or null: only at war, once at a time, and he must answer (WAR-253). */
export function callRefusal(world: World, n: number, lord: number): string | null {
  const l = world.lords[lord];
  if (!l || l.nation !== n) return "not your lord";
  if (!inAnyWar(world, n)) return "lords are called only at war";
  if (retinueArmy(world, lord) >= 0) return `${l.name} is in the field already`;
  if (l.call) return `${l.name}'s men are on their way`;
  if (l.loyalty === "Disloyal" || l.loyalty === "In revolt") return `${l.name} is ${l.loyalty.toLowerCase()} and will not come`;
  if (lordSeat(world, lord) < 0) return `the enemy holds all of ${l.name}'s land`;
  if (answerOf(world, lord).men < L.min_men) return `${l.name} has no men to send`;
  return null;
}

/** Call one lord's retinue: his men leave his lands' pools and gather at his seat after his days (WAR-038). */
export function callLord(world: World, n: number, lord: number, news: News[]): string | null {
  const refused = callRefusal(world, n, lord);
  if (refused) return refused;
  const l = world.lords[lord]!;
  const answer = answerOf(world, lord);
  const men = Math.floor(answer.men);
  // His men leave his held lands' pools by each one's share.
  const lands = lordLands(world, lord).filter((p) => world.provinceOccupier[p]! < 0);
  const pool = lands.reduce((t, p) => t + world.provinceRecruits[p]!, 0);
  for (const p of lands) world.provinceRecruits[p] = world.provinceRecruits[p]! * (1 - men / pool);
  l.call = { men, daysLeft: answer.days ?? L.loyal_days };
  if (n === world.player) news.push({ kind: "raised", text: `${l.name} answers your call: ${fmt(men)} men gather at ${provinceName(world, lordSeat(world, lord))} in ${Math.round(l.call.daysLeft / 7)} weeks.`, nations: [n], province: lordSeat(world, lord) });
  return null;
}

/**
 * Call the lords (WAR-038): each of the realm's lords answers by his loyalty;
 * the disloyal refuse, and the realm learns who came. Returns null when anyone
 * answered, else why no one did.
 */
export function callLords(world: World, n: number, news: News[]): string | null {
  if (!inAnyWar(world, n)) return "lords are called only at war";
  let came = 0;
  const refused: string[] = [];
  world.lords.forEach((l, k) => {
    if (l.nation !== n || l.call || retinueArmy(world, k) >= 0) return;
    if (l.loyalty === "Disloyal" || l.loyalty === "In revolt") refused.push(l.name);
    else if (!callLord(world, n, k, news)) came++;
  });
  if (n === world.player && refused.length) news.push({ kind: "refused", text: `${refused.join(", ")} refuse${refused.length === 1 ? "s" : ""} your call.`, nations: [n] });
  return came ? null : refused.length ? "every lord you could call refuses" : "no lord has men to send";
}

/** The lord as a commander: made the first time he leads his men out, a noble with skills of 1 to 3 (WAR-061, WAR-139). */
function lordCommander(world: World, lord: number): number {
  const l = world.lords[lord]!;
  if (l.commander !== undefined && world.commanderOwner[l.commander] === l.nation) return l.commander;
  const skill = () => 1 + world.rng.int(3);
  l.commander = addCommander(world, l.nation, wf.newCommander(l.name, { might: skill(), cunning: skill(), logistics: skill(), origin: "a lord" }));
  return l.commander;
}

/** Each week: called retinues gather; when their days are up they take the field at the lord's seat under him (WAR-254). */
export function weeklyRetinues(world: World, news: News[], days = 7): void {
  world.lords.forEach((l, k) => {
    const call = l.call;
    if (!call) return;
    call.daysLeft -= days;
    if (call.daysLeft > 0) return;
    delete l.call;
    const seat = lordSeat(world, k);
    // Peace came, or the enemy took his land while they gathered: the men go back home.
    if (seat < 0 || !inAnyWar(world, l.nation) || l.loyalty === "Disloyal" || l.loyalty === "In revolt") {
      lordSendHome(world, k, call.men);
      return;
    }
    const horse = Math.round(call.men * L.retinue_horse_share);
    spawnArmy(world, l.nation, seat, call.men, lordCommander(world, k), horse, { kind: KIND.retinue, home: seat, drill: rc.drillAndBreak("trained").drill, horseArm: L.retinue_horse_arm });
    if (l.nation === world.player) news.push({ kind: "raised", text: `${l.name} takes the field at ${provinceName(world, seat)} with ${fmt(call.men)} men.`, nations: [l.nation], province: seat });
  });
  // The week's recount, which follows, counts the men sent home.
}

/**
 * Each month: a retinue goes home at peace, when its lord turns disloyal or
 * rises, or when a wavering lord has served his months unless the war is for
 * his Want (WAR-038, WAR-039, WAR-256); the AI calls its lords at war (WAR-258).
 */
export function monthlyRetinues(world: World, news: News[]): void {
  const a = world.armies;
  let changed = false;
  for (let s = 0; s < a.count; s++) {
    if (!a.alive[s] || a.kind[s] !== KIND.retinue || a.battle[s]! >= 0) continue;
    const k = lordOfCommander(world, a.commander[s]!);
    const l = k >= 0 ? world.lords[k] : undefined;
    const why = !l
      ? "has no lord"
      : !inAnyWar(world, l.nation)
        ? "goes home: the war is over"
        : l.loyalty === "Disloyal" || l.loyalty === "In revolt"
          ? "goes home: he no longer serves you"
          : l.loyalty === "Wavering" && a.monthsOut[s]! >= L.wavering_stay_months && !wantsThisWar(world, k)
            ? `goes home after ${L.wavering_stay_months} months: a wavering lord serves no longer`
            : null;
    if (!why) continue;
    if (l && l.nation === world.player) news.push({ kind: "refused", text: `${l.name} ${why}, with ${fmt(a.men[s]!)} men.`, nations: [l.nation], province: a.location[s]! });
    lordSendHome(world, k, a.men[s]!);
    a.alive[s] = 0;
    halt(world, s);
    changed = true;
  }
  // The AI calls every lord it can at war (WAR-258); a lord gathering, out or unwilling is passed over before the costlier checks.
  const out = new Set<number>();
  for (let s = 0; s < a.count; s++) if (a.alive[s] && a.kind[s] === KIND.retinue) out.add(a.commander[s]!);
  const atWar = new Map<number, boolean>();
  world.lords.forEach((l, k) => {
    const n = l.nation;
    if (n === world.player || world.nationGone[n] || l.call || l.loyalty === "Disloyal" || l.loyalty === "In revolt" || (l.commander !== undefined && out.has(l.commander))) return;
    if (!atWar.has(n)) atWar.set(n, inAnyWar(world, n));
    if (atWar.get(n) && !callRefusal(world, n, k) && !callLord(world, n, k, news)) changed = true;
  });
  // A retinue counts toward no cap or levy: only the lords' men at home changed.
  if (changed) recountLordsMen(world);
}

/** A lord whose retinue fought on the winning side gains a step of loyalty (REALM-088, WAR-257). */
export function retinuesWon(world: World, slots: readonly number[], news: News[]): void {
  const a = world.armies;
  for (const s of slots) {
    if (a.kind[s] !== KIND.retinue) continue;
    const k = lordOfCommander(world, a.commander[s]!);
    if (k >= 0 && world.lords[k]!.loyalty !== "Loyal") loyaltyStep(world, k, "victory_taken_part", news);
  }
}

/** Where a beaten lord's men find their way home: to his lands (WAR-256). */
export function retinueScatters(world: World, s: number, men: number): void {
  lordSendHome(world, lordOfCommander(world, world.armies.commander[s]!), men);
}

/** A lord's retinue, for the player's screens. */
export interface RetinueView {
  state: RetinueState;
  /** Men he would bring if called now (by his loyalty). */
  wouldBring: number;
  /** Men at home, ready, and his cap. */
  atHome: number;
  cap: number;
  /** Men on their way and days until they stand at his seat, when gathering. */
  gathering?: { men: number; days: number };
  /** His army, by slot, when in the field. */
  army: number;
  /** His seat (-1 = the enemy holds all his land). */
  seat: number;
  /** Why he can't be called now, or null. */
  refusal: string | null;
  /** Months in the field after which he goes home (a wavering lord whose Want is not the war's aim), or null: he stays to the end. */
  leavesAfter: number | null;
}

export function retinueView(world: World, n: number, lord: number): RetinueView {
  const l = world.lords[lord]!;
  return {
    state: retinueState(world, lord),
    wouldBring: Math.floor(answerOf(world, lord).men),
    atHome: retinueAtHome(world, lord),
    cap: Math.floor(retinueCap(world, lord)),
    ...(l.call ? { gathering: { men: l.call.men, days: Math.max(0, l.call.daysLeft) } } : {}),
    army: retinueArmy(world, lord),
    seat: lordSeat(world, lord),
    refusal: callRefusal(world, n, lord),
    leavesAfter: l.loyalty === "Wavering" && !wantsThisWar(world, lord) ? L.wavering_stay_months : null,
  };
}
