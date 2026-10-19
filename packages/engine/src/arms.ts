import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as rc from "./domain/recruiting/index.ts";
import * as wf from "./domain/warfare/index.ts";
import { canCall, COMMISSION_GOLD, disbandArmy, idleCommanders, KIND, recount, recruit } from "./recruit.ts";
import { neighbourRealms } from "./statecraft.ts";
import { LEDGER, LEDGER_LINES } from "./treasury.ts";

/**
 * Arms and fear (DIPL-228 to DIPL-231, Leroy 19 Oct): each month every realm
 * measures its neighbours' strength against its own side's and is Wary or
 * Threatened of a much stronger one; an AI realm keeps a standing army sized
 * against its neighbours and its fear, calls men across the whole realm at
 * war, and borrows for war (treasury.ts). There is no rivalry: fear is
 * measured again each month from the armies and leaves no lasting tie.
 */

const rel = dip.relations;
const AF = dip.AF;
const name = (world: World, n: number) => world.rules.nations[n]!.name;

/** Every realm's strength in one pass over the armies: men under arms, levies it can call and its lords' men (war.ts strength). */
export function strengths(world: World): Float64Array {
  const s = new Float64Array(world.nationCount);
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i]! >= 0) s[a.owner[i]!] = s[a.owner[i]!]! + a.men[i]!;
  for (let n = 0; n < world.nationCount; n++) s[n] = s[n]! + canCall(world, n) + world.nationLordsMen[n]!;
  return s;
}

/** A realm's friends, whom it counts on its side: its allies, its overlord and its subjects (DIPL-228). */
function friendsOf(world: World, n: number): Set<number> {
  const g = world.diplomacy.graph;
  const id = world.nationIds[n]!;
  const out = new Set<number>();
  const lord = rel.overlord(g, id);
  for (const x of [...rel.alliesOf(g, id), ...rel.subjectsOf(g, id), ...(lord ? [lord] : [])]) {
    const k = world.nationIndex.get(x);
    if (k !== undefined && !world.nationGone[k]) out.add(k);
  }
  return out;
}

/**
 * The month's fears (DIPL-228): each realm against each neighbour that is not
 * its friend, the neighbour's strength over its own side's. A neighbour that
 * comes to be Threatened of the player says so in the news (DIPL-233).
 */
export function monthlyFear(world: World, news: News[]): void {
  const d = world.diplomacy;
  const s = strengths(world);
  const near = neighbourRealms(world);
  const me = world.player >= 0 ? world.nationIds[world.player]! : null;
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n]) continue;
    const c = dip.country(d, world.nationIds[n]!);
    const friends = friendsOf(world, n);
    const side = Math.max(1, dip.ownSide(s[n]!, [...friends].map((f) => s[f]!)));
    const fears: dip.Fear[] = [];
    for (const x of near[n]!) {
      if (world.nationGone[x] || friends.has(x)) continue;
      const ratio = s[x]! / side;
      const level = dip.fearOf(ratio);
      if (level !== "calm") fears.push({ of: world.nationIds[x]!, level, ratio: Math.round(ratio * 10) / 10 });
    }
    fears.sort((p, q) => q.ratio - p.ratio || p.of.localeCompare(q.of));
    if (me && n !== world.player) {
      const was = c.fears?.find((f) => f.of === me)?.level;
      const now = fears.find((f) => f.of === me)?.level;
      if (now === "threatened" && was !== "threatened") news.push({ kind: "envoy", text: `${name(world, n)} feels threatened by your strength: it keeps more men under arms against you.`, nations: [n, world.player] });
    }
    if (fears.length) c.fears = fears;
    else delete c.fears;
  }
}

/** The worst fear a realm holds this month (DIPL-228). */
export function fearOfRealm(world: World, n: number): dip.FearWord {
  return dip.fearLevel(dip.country(world.diplomacy, world.nationIds[n]!).fears);
}

/** A levy's pay a month per 1,000 men once its pay has begun. */
const levyPer1000 = (world: World) => rc.levyPay(1000, 99) * world.rules.defines.recruit.goldScale;

/** A realm's gold a month before its army's pay, so the army it keeps is weighed against what it earns, not what is left. */
const incomeBeforePay = (world: World, n: number) => world.nationMonthlyIncome[n]! - world.nationLedger[n * LEDGER_LINES + LEDGER.indexOf("army pay")]!;

/** The men an AI realm keeps under arms at peace (DIPL-229). */
export function standingTargetOf(world: World, n: number, near: Set<number>[] = neighbourRealms(world)): number {
  const friends = friendsOf(world, n);
  let largest = 0;
  for (const x of near[n]!) if (!world.nationGone[x] && !friends.has(x)) largest = Math.max(largest, world.nationCapUsed[x]!);
  return dip.standingTarget({ cap: world.nationTroopCap[n]!, largestNeighbour: largest, income: incomeBeforePay(world, n), levyPer1000: levyPer1000(world), fear: fearOfRealm(world, n) });
}

/** Men an AI realm at war calls this month (DIPL-230): what it can call, within its share of the cap and what its income pays its whole army. */
export function warRaise(world: World, n: number): number {
  const per = levyPer1000(world);
  const pays = per > 0 ? ((Math.max(0, incomeBeforePay(world, n)) * AF.war.pay_share_of_income) / per) * 1000 - world.nationCapUsed[n]! : 0;
  return Math.max(0, Math.min(canCall(world, n), pays, AF.war.share_of_cap * world.nationTroopCap[n]!));
}

/**
 * The AI's men each month (DIPL-229, DIPL-230). At peace a realm keeps its
 * standing army: under the target it calls men, over it levies whose free
 * months are over go home, smallest first, never taking it under the target.
 * At war it calls men in every royal province it holds, the most men to call
 * first. At war, men it could not put under a commander would only stand as
 * garrisons (feedback 28), so a realm with no idle commander and no gold to
 * commission one calls none; at peace a garrison is standing army enough.
 */
export function aiRecruits(world: World, news: News[], atWarNow: (n: number) => boolean): void {
  const a = world.armies;
  const N = world.nationCount;
  const ai = (n: number) => n !== world.player && !world.nationGone[n];
  const atWar = Uint8Array.from({ length: N }, (_, n) => (ai(n) && atWarNow(n) ? 1 : 0));
  const near = neighbourRealms(world);
  const target = new Float64Array(N);
  for (let n = 0; n < N; n++) if (ai(n) && !atWar[n]) target[n] = standingTargetOf(world, n, near);
  // At peace, levies past their free months go home only beyond the standing army, smallest first.
  const spare: number[][] = Array.from({ length: N }, () => []);
  for (let i = 0; i < a.count; i++) {
    const n = a.owner[i]!;
    if (a.alive[i] && n >= 0 && ai(n) && !atWar[n] && a.kind[i] === KIND.levy && a.monthsOut[i]! >= wf.W.levy.free_months) spare[n]!.push(i);
  }
  let sent = false;
  for (let n = 0; n < N; n++) {
    if (!spare[n]!.length) continue;
    let over = world.nationCapUsed[n]! - target[n]!;
    for (const i of spare[n]!.sort((p, q) => a.men[p]! - a.men[q]! || p - q)) {
      if (over <= AF.standing.slack || a.men[i]! > over) break;
      over -= a.men[i]!;
      sent = disbandArmy(world, n, i, false) === null || sent;
    }
  }
  if (sent) recount(world);
  // Each realm's royal provinces, for the realms that call men this month.
  let royal: number[][] | null = null;
  let called = false;
  let gathering: Set<number> | null = null;
  let standing: Set<number> | null = null;
  for (let n = 0; n < N; n++) {
    if (!ai(n)) continue;
    let thousands: number;
    if (atWar[n]) thousands = Math.floor(warRaise(world, n) / 1000);
    else {
      const gap = target[n]! - world.nationCapUsed[n]!;
      thousands = gap < AF.standing.slack ? 0 : Math.min(AF.standing.raise_per_month, Math.floor(gap / 1000), Math.floor(canCall(world, n) / 1000));
    }
    if (thousands < 1) continue;
    if (atWar[n] && world.nationTreasury[n]! < COMMISSION_GOLD && !idleCommanders(world, n, false).length) continue;
    royal ??= royalProvinces(world);
    gathering ??= new Set(world.musters.map((m) => m.province * N + m.nation));
    standing ??= garrisoned(world);
    // At peace the standing army gathers where its garrisons already stand, so it stays a few armies, not one in every province.
    const first = (p: number) => (!atWar[n] && standing!.has(p * N + n) ? 0 : 1);
    const places = royal[n]!.filter((p) => world.provinceRecruits[p]! >= 1000).sort((p, q) => first(p) - first(q) || world.provinceRecruits[q]! - world.provinceRecruits[p]! || p - q);
    const per = atWar[n] ? AF.war.per_province : AF.standing.raise_per_month;
    for (const p of places) {
      if (thousands < 1) break;
      if (gathering!.has(p * N + n)) continue;
      const k = Math.min(thousands, per, Math.floor(world.provinceRecruits[p]! / 1000));
      if (k >= 1 && !recruit(world, n, p, k, news, false)) (thousands -= k), (called = true);
    }
  }
  if (called) recount(world);
}

/** Where each realm's garrisons stand, as province × realms + realm. */
function garrisoned(world: World): Set<number> {
  const a = world.armies;
  const out = new Set<number>();
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i]! >= 0 && a.commander[i]! < 0 && a.kind[i] === KIND.levy) out.add(a.location[i]! * world.nationCount + a.owner[i]!);
  return out;
}

/** Each realm's royal provinces it holds (a lord's land answers his own call). */
function royalProvinces(world: World): number[][] {
  const out: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (n >= 0 && !world.provinceWater[p] && world.provinceLord[p]! < 0 && world.provinceOccupier[p]! < 0) out[n]!.push(p);
  }
  return out;
}
