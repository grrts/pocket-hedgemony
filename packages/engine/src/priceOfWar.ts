import type { World } from "./world.ts";
import { declaringAim, relationState, strength } from "./war.ts";
import { censureOf } from "./faithHeads.ts";
import { maxCeded, peaceShare } from "./peace.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as wf from "./domain/warfare/index.ts";
import * as rc from "./domain/recruiting/index.ts";
import { kindFights } from "./domain/subjects/index.ts";
import { ARMS, armyPay, canCall, KIND, KIND_NAMES, menByArm } from "./recruit.ts";
import { LOYALTY } from "./lords.ts";
import { warRaise } from "./arms.ts";
import { canBorrow } from "./treasury.ts";

/**
 * The price of war (X-21): what a declaration costs before it is made. The
 * declare sheet shows it to the player (WAR-229) and the AI weighs the same
 * numbers before it declares (WAR-228). Pure reads of the world; nothing here
 * changes it.
 */

const rel = dip.relations;

/** Someone a declaration calls into the war, with the soldiers they bring (strength: men under arms and levies at home). */
export interface PriceOfWarCall {
  nation: number;
  via: "alliance" | "pledge" | "league" | "subject";
  soldiers: number;
}

/** What the declare sheet's Price of war block shows (WAR-229), and what the AI weighs (WAR-228). */
export interface PriceOfWar {
  /** The realm declared on. */
  target: number;
  /** Realms called against the declarer: the target's allies and pledgers (unless it refused a demand of ours), every member of a league against the declarer, and the target's subjects that fight. */
  against: PriceOfWarCall[];
  /** The declarer's allies who are called to its side. */
  friends: PriceOfWarCall[];
  /** Neighbours who will hold Threatened us for a war with no aim (DIPL-150). */
  threatened: number[];
  /** The declarer's lords who will waver when it takes land in a war with no fitting aim (WAR-222). */
  waveringLords: number;
  /**
   * The aim the declaration will be made with (declaringAim: the best fitting
   * aim the declarer holds against the target, else "no_aim"), as diplomacy
   * names it, with the province a Take land aim names and why it is held.
   */
  aim: { aim: string; province?: number; source?: string };
  /** The declarer holds no fitting aim against the target: the war is declared with no aim. */
  noAim: boolean;
  /** A truce the declaration breaks, and the month it would have lasted to. */
  truce: { until: string | null } | null;
  /** Gold a month the declarer's armies draw at war, levies paid from their first month (WAR-225). */
  monthlyPay: number;
  /** The most of the target's provinces one peace can take (WAR-227), and how many it has. */
  maxCeded: number;
  targetProvinces: number;
  /** Each side's strength: the declarer with the friends that answer; the target with everyone called against the declarer and every member of a league against it, called or not (WAR-228). */
  ourSide: number;
  theirSide: number;
}

/** Provinces each realm holds, by nation index. */
function provinceCounts(world: World): Int32Array {
  const out = new Int32Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0) out[world.provinceOwner[p]!]!++;
  return out;
}

/**
 * The most of the loser's provinces one peace can take (WAR-227): a third of
 * them, rounded up. The peace limit's own key, `warfare.peace.max_ceded_share`,
 * belongs to the peace rules; this reads a third until they supply it.
 */
export function maxCededProvinces(world: World, loser: number, counts?: Int32Array): number {
  if (!counts) return maxCeded(world, loser).max;
  return wf.maxCeded(counts[loser]!).max;
}

/** A levy's pay a month per 1,000 men once its pay has begun. */
const levyPer1000 = (world: World) => rc.levyPay(1000, 99) * world.rules.defines.recruit.goldScale;

/**
 * Gold a month the realm's armies draw at war (WAR-225: levies are paid from
 * their first month at war): each army's pay, a levy still in its free months
 * counted as if its pay had begun.
 */
export function warPay(world: World, n: number): number {
  const a = world.armies;
  const scale = world.rules.defines.recruit.goldScale;
  const levyMul = (wf.W.kinds as Record<string, { pay: { multiplier: number } }>)[KIND_NAMES[KIND.levy]!]!.pay.multiplier;
  let pay = 0;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.owner[i] !== n) continue;
    if (a.kind[i] === KIND.levy) {
      const by = menByArm(world, i);
      let raw = 0;
      ARMS.forEach((arm, k) => (raw += by[k]! > 0 ? rc.regimentPay(rc.payGroupOf(arm), by[k]!) : 0));
      pay += raw * levyMul * scale;
    } else {
      pay += armyPay(world, i);
    }
  }
  return pay;
}


/**
 * Gold a month an AI realm would pay at war: its armies at war pay, and the
 * levies it would call in its first month (as aiRecruits does, DIPL-233).
 */
export function aiWarPay(world: World, n: number): number {
  return warPay(world, n) + (warRaise(world, n) / 1000) * levyPer1000(world);
}

/**
 * Whether the realm's own peace voices would say peace on the day it
 * declares (WAR-228): its share of peace voices (WAR-221) in a war it is
 * already fighting, or at peace the weight of its fallen (REALM-096), over half.
 */
export function wouldSayPeaceAtDeclaration(world: World, n: number): boolean {
  return peaceShare(world, n) > wf.W.peace.half;
}

/** A Warlike ruler or a hegemon seeker declares whatever its notoriety (WAR-228). */
export function heedsNoNotoriety(world: World, n: number): boolean {
  const warlike = (world.rulers?.[n]?.traits ?? []).includes("Warlike");
  return warlike || dip.country(world.diplomacy, world.nationIds[n]!).posture === "hegemon_seeker";
}

/** Shared reads of the declarer for many targets at once (the Diplomacy tab prices every realm). */
export interface PriceContext {
  a: number;
  counts: Int32Array;
  threatened: number[];
  waveringLords: number;
  monthlyPay: number;
  leagueAgainstA: string[];
  allies: Map<string, string[]>;
  pledgers: Map<string, string[]>;
  subjects: Map<string, string[]>;
  strengths: Map<number, number>;
}

export function priceContext(world: World, a: number): PriceContext {
  const d = world.diplomacy;
  const aid = world.nationIds[a]!;
  const allies = new Map<string, string[]>();
  const subjects = new Map<string, string[]>();
  const push = (m: Map<string, string[]>, k: string, v: string) => (m.get(k) ?? m.set(k, []).get(k)!).push(v);
  for (const r of d.graph.relations) {
    if (r.type === "alliance") (push(allies, r.source, r.target), push(allies, r.target, r.source));
    else if (r.type === "subject") push(subjects, r.target, r.source);
  }
  const pledgers = new Map<string, string[]>();
  for (const f of d.graph.facts) if (f.fact === "protection_pledge") push(pledgers, f.target, f.source);
  const threatened = dip.neighbours(d, aid).flatMap((id) => {
    const n = world.nationIndex.get(id);
    return n === undefined || world.nationGone[n] ? [] : [n];
  });
  // Lords holding land who can still drop a step (WAR-222: lords who aren't Warlike waver; the game's lords have no traits yet).
  const landed = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === a && world.provinceLord[p]! >= 0) landed.add(world.provinceLord[p]!);
  const lowest = LOYALTY[LOYALTY.length - 1];
  let waveringLords = 0;
  for (const l of landed) if (world.lords[l] && world.lords[l]!.nation === a && world.lords[l]!.loyalty !== lowest) waveringLords++;
  return {
    a,
    counts: provinceCounts(world),
    threatened,
    waveringLords,
    monthlyPay: warPay(world, a),
    leagueAgainstA: dip.leagueAgainst(d, aid)?.members ?? [],
    allies,
    pledgers,
    subjects,
    strengths: new Map(),
  };
}

const strengthOf = (world: World, ctx: PriceContext, n: number): number => {
  let s = ctx.strengths.get(n);
  if (s === undefined) ctx.strengths.set(n, (s = strength(world, n)));
  return s;
};

/**
 * The price of a declaring war on b (WAR-229, WAR-228): who is called against
 * a, as declareWar would call them (DIPL-148 … DIPL-151, DIPL-160, D-DIPL-10);
 * a's allies who are called to its side and would answer (an AI ally at peace
 * and at least half the target's strength, as the AI answers offensive calls);
 * the neighbours who will hold Threatened us; a's lords who will waver; a
 * truce broken; a's armies' pay a month at war; and the most land one peace
 * can take.
 */
export function priceOfWar(world: World, a: number, b: number, ctx: PriceContext = priceContext(world, a)): PriceOfWar {
  const d = world.diplomacy;
  const aid = world.nationIds[a]!;
  const bid = world.nationIds[b]!;
  const seen = new Set<number>([a, b]);
  const against: PriceOfWarCall[] = [];
  const add = (list: PriceOfWarCall[], id: string, via: PriceOfWarCall["via"]) => {
    const n = world.nationIndex.get(id);
    if (n === undefined || world.nationGone[n] || seen.has(n)) return;
    seen.add(n);
    list.push({ nation: n, via, soldiers: Math.round(strengthOf(world, ctx, n)) });
  };
  // A target that refused a fair demand of ours calls no allies or pledgers (D-DIPL-5).
  const provoked = d.refusedDemands.some((x) => x.asker === aid && x.asked === bid);
  if (!provoked) {
    for (const id of ctx.allies.get(bid) ?? []) add(against, id, "alliance");
    for (const id of ctx.pledgers.get(bid) ?? []) add(against, id, "pledge");
  }
  // Every member of a league against a is called, whoever a declares on (DIPL-148, DIPL-160).
  for (const id of ctx.leagueAgainstA) add(against, id, "league");
  for (const id of ctx.subjects.get(bid) ?? []) {
    const fights = kindFights(dip.subjectKind(d, id));
    if (fights === "always_if_loyal_or_wavering" || fights === "when_called_by_loyalty" || (fights === "own_frontier_only" && dip.borders(d, id, aid))) add(against, id, "subject");
  }
  const friends: PriceOfWarCall[] = [];
  const target = strengthOf(world, ctx, b);
  for (const id of ctx.allies.get(aid) ?? []) {
    const n = world.nationIndex.get(id);
    if (n === undefined || n === world.player || seen.has(n) || dip.warOf(d, id)) continue;
    if (strengthOf(world, ctx, n) * 2 >= target) add(friends, id, "alliance");
  }
  const st = relationState(world, a, b);
  const held = declaringAim(world, a, b);
  const aimProvince = held.province === undefined ? undefined : world.provinceIndex.get(held.province);
  const aim: PriceOfWar["aim"] = { aim: held.aim, ...(aimProvince !== undefined ? { province: aimProvince } : {}), ...(held.source && held.aim !== "no_aim" ? { source: held.source } : {}) };
  const ourSide = strengthOf(world, ctx, a) + friends.reduce((t, c) => t + c.soldiers, 0);
  let theirSide = target + against.reduce((t, c) => t + c.soldiers, 0);
  // A league against a may join any later war: the AI counts every member (WAR-228).
  for (const id of ctx.leagueAgainstA) {
    const n = world.nationIndex.get(id);
    if (n !== undefined && !world.nationGone[n] && !seen.has(n)) theirSide += strengthOf(world, ctx, n);
  }
  return {
    target: b,
    against,
    friends,
    threatened: ctx.threatened.filter((n) => n !== b),
    waveringLords: ctx.waveringLords,
    aim,
    noAim: aim.aim === "no_aim",
    truce: st.state === "truce" ? { until: st.until ?? null } : null,
    monthlyPay: ctx.monthlyPay,
    maxCeded: maxCededProvinces(world, b, ctx.counts),
    targetProvinces: ctx.counts[b]!,
    ourSide,
    theirSide,
  };
}

/**
 * Why the AI realm n would not declare on t now, or null when it may (WAR-228):
 * its side must beat t's side, with everyone called against it, by
 * `warfare.ai.declare_strength_ratio`; its treasury must hold
 * `warfare.ai.war_chest_months` of its pay at war; its own peace voices must
 * not say peace on the day; and its notoriety must be under
 * `diplomacy.ai.notoriety_restraint` unless it is Warlike or a hegemon seeker.
 */
export function whyAiWontDeclare(world: World, n: number, t: number, price: PriceOfWar = priceOfWar(world, n, t)): string | null {
  const ratio = world.rules.defines.war.aiDeclareStrengthRatio;
  if (!(price.ourSide > price.theirSide * ratio)) return "their side is too strong";
  // What lenders would give counts toward the chest: an AI realm borrows for its wars (DIPL-234).
  const chest = wf.W.ai.war_chest_months * aiWarPay(world, n);
  if (world.nationTreasury[n]! + canBorrow(world, n) < chest) return "no war chest";
  if (wouldSayPeaceAtDeclaration(world, n)) return "its people want peace";
  if (!heedsNoNotoriety(world, n) && dip.notoriety(world.diplomacy, world.nationIds[n]!) >= dip.config.ai.notoriety_restraint) return "too notorious";
  // A war its faith's head would censure costs a wrong with every fellow believer and a Punish aim for all (RELG-156).
  if (!heedsNoNotoriety(world, n) && censureOf(world, n, t, price.aim.aim)) return "the faith would censure it";
  return null;
}
