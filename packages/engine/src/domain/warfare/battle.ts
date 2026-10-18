import { groundTroops, localsBonus, type Ground } from "../province/index.ts";
import { againstEnemy, breakPoint, levelAbilities, levelHits, levelOf, strengthOf } from "./companies.ts";
import { W, armDef, eraIndex, knows, type Company, type Commander, type Era, type Known, type Role } from "./model.ts";

/**
 * Battle rules (spec §5.9 … §5.14): the battlefield on the tile row, sectors
 * and ground, roles, levels in battle, skills, orders, hits, the flee share,
 * breaking, night and the aftermath. The bell-by-bell resolver is in
 * resolver.ts; these are its pieces.
 */

// ---------------------------------------------------------------- the field (WAR-090 … WAR-093)

export interface SectorDef {
  room: number | string;
  charge: boolean | string;
  horse?: number;
  cover?: number;
  hide?: boolean;
  all?: number;
  open_grounds?: string[];
  rough_grounds?: string[];
  attack_across?: number;
  defender?: number;
  burns_town?: boolean;
  walls?: boolean;
}

export interface Sector {
  use: string;
  room: number;
  charge: boolean;
  /** Shooting into it is multiplied by this (woods, town: halved). */
  cover: number;
  hide: boolean;
  /** Everyone's change here (marsh −25 %). */
  all: number;
  horse: number;
  defender: number;
  attackAcross: number;
  burnsTown: boolean;
}

const sectorDef = (use: string): SectorDef => {
  const d = (W.sectors as Record<string, SectorDef>)[use];
  if (!d) throw new Error(`unknown sector ${use}`);
  return d;
};
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

/** One sector of a tile use, on a ground, by era (WAR-091, WAR-148). */
export function sectorOf(use: string, opts: { ground?: Ground; bridge?: boolean; frozen?: boolean; era?: Era; garrison?: number } = {}): Sector {
  const u = cap(use);
  const d = sectorDef(u);
  const charge = d.charge === "by ground" ? !(d.rough_grounds ?? []).includes(opts.ground ?? "farmland") : d.charge === true;
  const baseRoom = d.room === "garrison" ? (opts.garrison ?? 0) : (d.room as number);
  return {
    use: u,
    room: baseRoom * (opts.era ? W.era_scale[opts.era].room : 1),
    charge,
    cover: d.cover ?? 1,
    hide: d.hide ?? false,
    all: d.all ?? 0,
    horse: d.horse ?? 0,
    defender: d.defender ?? 0,
    // A frozen river (X-17) is crossed like a bridge: no penalty for attacking across it.
    attackAcross: d.attack_across !== undefined && !opts.bridge && !opts.frozen ? d.attack_across : 0,
    burnsTown: d.burns_town ?? false,
  };
}

/** The battlefield: the middle 7 tiles of the province's row (all of them if fewer) (WAR-091, INV-WAR-16). */
export function battlefield(row: string[], opts: { ground?: Ground; bridge?: boolean; era?: Era; atSea?: boolean } = {}): Sector[] {
  const max = opts.atSea ? W.battle.max_sectors_sea : W.battle.max_sectors;
  const start = Math.max(0, Math.floor((row.length - max) / 2));
  return row.slice(start, start + max).map((u) => sectorOf(u, opts));
}

/** The ground on top of the sectors: foot, horse, guns, defender, and +10 % for local defenders in rough country (WAR-092). */
export function groundOn(ground: Ground, opts: { defenderHomeland?: boolean } = {}): { foot: number; horse: number; guns: number; defender: number; locals: number } {
  const t = groundTroops(ground);
  return { foot: t.foot, horse: t.horse, guns: t.guns, defender: t.defender, locals: localsBonus(ground, opts.defenderHomeland === true) };
}

/** Depth steps forward at the end of a bell to fill the room (WAR-093). */
export function fillFromDepth(front: number, room: number, depth: number): { front: number; depth: number; moved: number } {
  const moved = Math.min(depth, Math.max(0, room - front));
  return { front: front + moved, depth: depth - moved, moved };
}

/** Men of one side that fit in the front of a row; the rest stand as depth (WAR-093). */
export function frontAndDepth(men: number, sectors: Sector[]): { front: number; depth: number } {
  const room = sectors.reduce((s, x) => s + x.room, 0);
  return { front: Math.min(men, room), depth: Math.max(0, men - room) };
}

/** Battle scale of an era: bells a day, longest battle, bell length (WAR-090, WAR-148). */
export const battleScale = (era: Era = "I"): { bellsPerDay: number; maxDays: number; bell: string; room: number } => ({
  bellsPerDay: W.battle.bells_per_day,
  maxDays: W.era_scale[era].max_days,
  bell: W.era_scale[era].bell,
  room: W.era_scale[era].room,
});

/** After the last day with no army broken the attacker pulls back (WAR-090). */
export const afterLastDay = (day: number, era: Era = "I"): "fight on" | "the attacker pulls back" => (day >= W.era_scale[era].max_days ? "the attacker pulls back" : "fight on");

/** Two hostile armies in one province fight, unless one slips away: higher Cunning and not trapped (WAR-089). */
export const slipsAway = (o: { wants: boolean; cunning: number; enemyCunning: number; trapped: boolean }): boolean => o.wants && o.cunning > o.enemyCunning && !o.trapped;

/** The first bell: only shooting, unless an Assault commander advances (no shooting for either side, losses ×1.25) (WAR-103, WAR-112). */
export function firstBell(attackerApproach: string, defenderApproach = "Steadfast"): { shooting: boolean; melee: boolean; lossMul: number } {
  const assault = attackerApproach === "Assault" || defenderApproach === "Assault";
  return { shooting: !assault, melee: assault, lossMul: assault ? W.assault_losses : 1 };
}

/** Entrenchment: digs in in the first bell when attacked (dug sectors +50 %, charges reversed); fights as Steadfast when attacking (WAR-101, WAR-102). */
export function entrenchment(side: "attacker" | "defender"): { digsFirstBell: boolean; fightsAs: string; dugDefender: number; reversesCharges: boolean } {
  if (side === "attacker") return { digsFirstBell: false, fightsAs: W.approaches.Entrenchment.attacking_as as string, dugDefender: 0, reversesCharges: false };
  return { digsFirstBell: true, fightsAs: "Entrenchment", dugDefender: W.dug_in.defender, reversesCharges: chargeOf({ sectorCharge: true, firstContact: true, targetRoles: [], dugIn: true }).taken > 1 };
}

/** Overnight the fled men who will come back return (half), and ammunition refills (WAR-124). */
export function overnight(u: { men: number; fled: number; ammoUsed: number }): { back: number } {
  const back = u.fled * W.after.fled_return;
  u.fled -= back;
  u.men += back;
  u.ammoUsed = 0;
  return { back };
}

/** Attack or wait: an army set to attack marches on an enemy that comes next door; one set to wait stays put (WAR-134). */
export const attackOrWait = (attack: boolean): "marches on the enemy army" | "stays put" => (attack ? "marches on the enemy army" : "stays put");

/** Retreat if outnumbered: the standing order's ratio, checked before battle and each night (WAR-134). */
export const wantsToRetreat = (ours: number, theirs: number, ratio: number | null): boolean => ratio !== null && theirs / ours > ratio;

// ---------------------------------------------------------------- roles (WAR-095, WAR-096)

/** A charge: Shock doubles hits in the first bell it meets the enemy (and after a bell out of contact), only in open sectors; Brace reverses it (WAR-095, WAR-122). */
export function chargeOf(o: { sectorCharge: boolean; firstContact: boolean; targetRoles: Role[]; chargeMul?: number; braceIgnored?: boolean; dugIn?: boolean; known?: Known; enemyKnown?: Known; attackerApproach?: string }): { can: boolean; dealt: number; taken: number } {
  if (!o.sectorCharge) return { can: false, dealt: 1, taken: 1 };
  // W19: charges into dug-in sectors always fail.
  if (o.dugIn && knows(o.enemyKnown, "W19")) return { can: true, dealt: 0, taken: W.roles.brace.chargers_take };
  if (!o.firstContact) return { can: true, dealt: 1, taken: 1 };
  const reversed = (o.targetRoles.includes("Brace") || o.dugIn === true) && !o.braceIgnored;
  if (reversed) return { can: true, dealt: W.roles.brace.chargers_deal, taken: W.roles.brace.chargers_take };
  const mul = o.chargeMul ?? (o.attackerApproach === "Breakthrough" && knows(o.known, "W2") ? 2.5 : W.roles.shock.first_contact);
  return { can: true, dealt: mul, taken: 1 };
}

/** What shooting does to a target: Brace takes ×1.5 (not with W7 when mixed with its own shot); Heavy halves arrows and spears (not with W5 or hand guns); cover halves (WAR-095, WAR-122). */
export function shotInto(o: { shooterArm: string; targetRoles: Role[]; cover?: number; targetKnown?: Known; shooterKnown?: Known }): number {
  let m = o.cover ?? 1;
  const brace = o.targetRoles.includes("Brace");
  const mixedShot = brace && o.targetRoles.includes("Shot") && knows(o.targetKnown, "W7");
  if (brace && !mixedShot) m *= W.roles.brace.shot_taken;
  const def = armDef(o.shooterArm);
  const missile = def.shoots === "arrows" || (def.spears === true && !def.shoots);
  if (o.targetRoles.includes("Heavy") && missile && !knows(o.shooterKnown, "W5")) m *= 0.5;
  return m;
}

/** Guns shoot into their own sector and its neighbours (W8 field guns reach neighbours) and have no melee (WAR-095, WAR-122). */
export function gunTargets(sector: number, count: number): number[] {
  const r = W.roles.guns.reach;
  const out: number[] = [];
  for (let i = sector - r; i <= sector + r; i++) if (i >= 0 && i < count) out.push(i);
  return out;
}
export const hasMelee = (roles: Role[]): boolean => !(roles.length === 1 && roles[0] === "Guns");

/** Light steps back a sector without fleeing and shoots again (WAR-095). */
export const stepsBackWithoutFleeing = (roles: Role[]): boolean => roles.includes("Light");

/** Elephants panic when their sector loses a bell badly: −10 % of its men (WAR-096). */
export const elephantPanic = (sectorMen: number): number => sectorMen * (armDef("war elephants").panic ?? 0);

/** An arm's ground change: elephants −50 % in forest and jungle; camels take no desert penalty (WAR-012). */
export function armGround(arm: string, ground: Ground): number {
  const def = armDef(arm);
  const special = def.ground?.[ground];
  if (special !== undefined) return special;
  const t = groundTroops(ground);
  if (def.unit === "gun") return t.guns;
  if (def.horse) return def.no_desert_penalty && ground === "desert" ? Math.max(0, t.camels ?? 0) : t.horse;
  return t.foot;
}

// ---------------------------------------------------------------- skills (WAR-104 … WAR-109, WAR-155 … WAR-157)

/** Might by era: hits and break point per point, in his sector or for the whole army, and his risk (WAR-104, WAR-155). */
export function mightEffect(might: number, era: Era): { hits: number; breakPoint: number; scope: string; risk: number | null; riskIf: string; drive: number } {
  const m = W.might_by_era[era] as { hits: number; break: number; scope: string; risk?: number; risk_if?: string; drive?: number };
  return { hits: m.hits * might, breakPoint: m.break * might, scope: m.scope, risk: m.risk ?? null, riskIf: m.risk_if ?? "sector lost", drive: (m.drive ?? 0) * might };
}

/** Orders per bell by Cunning and era, +1 with W14 and with W23 (WAR-105, WAR-156, WAR-122); a stale style loses one (WAR-144). */
export function ordersPerBell(cunning: number, era: Era, known?: Known, stale = false): number {
  let n = W.cunning_by_era[era].orders[Math.max(0, Math.min(5, cunning))]!;
  for (const [inv, plus] of Object.entries(W.order_inventions)) if (knows(known, inv)) n += plus;
  return Math.max(0, n - (stale ? 1 : 0));
}

/** The commander with less Cunning gives his orders first (WAR-105, WAR-111). */
export function orderSequence(a: { side: string; cunning: number }, b: { side: string; cunning: number }): [string, string] {
  return a.cunning <= b.cunning ? [a.side, b.side] : [b.side, a.side];
}

/** When an order to another sector arrives: era I next bell, era II from 3 sectors away next bell, later the same bell (WAR-156). */
export function orderArrives(era: Era, distance: number): "the same bell" | "next bell" {
  const from = (W.cunning_by_era[era] as { messenger_from?: number }).messenger_from;
  return from !== undefined && distance >= from ? "next bell" : "the same bell";
}

/** From era VI captains give their own orders in their sectors (WAR-156). */
export const captainsGiveOrders = (era: Era): boolean => (W.cunning_by_era[era] as { captains_order?: boolean }).captains_order === true;

/** A hidden company is seen by a commander whose Cunning is at least the ambusher's; Careful counts +1; W22 sees all (WAR-106, WAR-058, WAR-122). */
export function seesHidden(spotter: { cunning: number; careful?: boolean; known?: Known }, ambusherCunning: number): boolean {
  if (knows(spotter.known, "W22")) return true;
  return spotter.cunning + (spotter.careful ? W.traits.Careful.spot_bonus : 0) >= ambusherCunning;
}

/** Bells a company shoots before refilling, by era: base + Logistics, +1 with W10 (WAR-107, WAR-157). */
export function ammunitionBells(logistics: number, era: Era, known?: Known): number {
  return W.logistics_by_era[era].ammo_base + logistics + (knows(known, "W10") ? W.w10_ammo : 0);
}

/** What Logistics does by era (WAR-157). */
export function logisticsEffect(logistics: number, era: Era): { ammo: number; who: string; powderWagons: boolean; withoutAmmo: number; freeRotation: number; fuel: boolean; depthReplaces: number } {
  const l = W.logistics_by_era[era] as { ammo_base: number; who: string; powder_wagons?: boolean; without_ammo?: number; rotation: number; fuel?: boolean; depth_per_point?: number };
  return { ammo: l.ammo_base + logistics, who: l.who, powderWagons: l.powder_wagons ?? false, withoutAmmo: l.without_ammo ?? 1, freeRotation: logistics * l.rotation, fuel: l.fuel ?? false, depthReplaces: (l.depth_per_point ?? 0) * logistics };
}

/** −10 % hits for each bell past the 3rd in a row (WAR-109). */
export const tiredness = (bell: number): number => 1 - W.tired.penalty * Math.max(0, bell - W.tired.after_bells);

/** Sectors that may swap a tired company for free each bell: up to Logistics (WAR-108). */
export const freeRotations = (logistics: number, era: Era = "III"): number => logisticsEffect(logistics, era).freeRotation;

// ---------------------------------------------------------------- hits, flee share, breaking (WAR-113 … WAR-121)

/** The share of the front a company hits each bell: 4 %, riflemen 5 % with W16, 6 % with W17, 8 % with W19; era VI 6 %, VII 8 % (WAR-113, WAR-148). */
export function hitsShare(known?: Known, era?: Era): number {
  const h = W.hits_per_bell;
  let s = h.base;
  for (const r of h.by_invention) if (knows(known, r.needs)) {
    s = r.share;
    break;
  }
  if (era === "VI") s = Math.max(s, h.era_VI);
  if (era === "VII") s = Math.max(s, h.era_VII);
  return s;
}

export interface HitContext {
  era?: Era;
  known?: Known;
  enemyKnown?: Known;
  /** The company's level, if not read from it. */
  level?: number;
  /** Men in the front, if not all of the company. */
  front?: number;
  roles?: number;
  might?: number;
  sector?: number;
  inventions?: number;
  /** The bell number in a row this company is fighting (tired from the 4th). */
  bellInRow?: number;
  hungry?: boolean;
  forcedFirstDay?: boolean;
}

/** Hits = share × men in front × strength × roles × level × Might × sector and ground × inventions × tired × hungry × forced march (WAR-113). */
export function hitsOf(c: Company, ctx: HitContext = {}): number {
  const level = ctx.level ?? levelOf(c, ctx.era, ctx.known);
  const front = ctx.front ?? c.men;
  let h = hitsShare(ctx.known, ctx.era) * front * strengthOf(c.arm, ctx.known) * againstEnemy(c.arm, ctx.enemyKnown).strength;
  h *= ctx.roles ?? 1;
  h *= 1 + levelHits(level, ctx.era);
  h *= 1 + (ctx.might ?? 0);
  h *= 1 + (ctx.sector ?? 0);
  h *= ctx.inventions ?? 1;
  h *= tiredness(ctx.bellInRow ?? 1);
  if (ctx.hungry) h *= 1 + W.hunger_hits;
  if (ctx.forcedFirstDay) h *= 1 + W.forced_march.first_day_strength;
  return h;
}

/** The flee share: 50 % − 30 % × the content share (WAR-115). */
export const fleeFromContent = (content: number): number => W.flee.base - W.flee.content_factor * content;

export interface FleeContext {
  /** Content share of the company's home provinces (or the lord's lands). */
  content?: number;
  lordLoyalty?: "Loyal" | "Wavering" | "Disloyal" | "In revolt";
  /** A garrison defending its own province's castle is fully content. */
  ownCastle?: boolean;
  /** Offensive à outrance halves the attacker's flee share. */
  multiplier?: number;
}

/** The flee share by kind (WAR-116). */
export function fleeShare(c: Company, ctx: FleeContext = {}): number {
  const F = W.flee;
  let f: number;
  switch (c.kind) {
    case "hired company":
      f = F.hired + F.per_month_owed * c.payOwed;
      break;
    case "rebel band":
      f = F.rebel;
      break;
    case "retinue": {
      const share = ctx.lordLoyalty === "Disloyal" || ctx.lordLoyalty === "In revolt" ? 0 : ctx.lordLoyalty === "Wavering" ? 0.5 : 1;
      f = fleeFromContent((ctx.content ?? 1) * share);
      break;
    }
    case "garrison":
      f = fleeFromContent(ctx.ownCastle ? 1 : (ctx.content ?? 1));
      break;
    default:
      f = fleeFromContent(ctx.content ?? 1);
  }
  return f * (ctx.multiplier ?? 1);
}

/** Each hit takes one man out: the flee share flees, the rest are half killed, half wounded (WAR-114). */
export function splitHits(hits: number, flee: number): { fled: number; killed: number; wounded: number } {
  const fled = hits * flee;
  return { fled, killed: (hits - fled) / 2, wounded: (hits - fled) / 2 };
}

/** A company breaks when its losses (killed, wounded, fled) pass its break point (WAR-117, WAR-118). */
export const companyBreaks = (startMen: number, losses: number, bp: number): boolean => losses > startMen * bp;

/** An army breaks: more than half its sectors lost, losses past its men-weighted break point, or camp taken and a third of its sectors lost (WAR-120). */
export function armyBreaks(o: { startedSectors: number; lostSectors: number; losses: number; men: number; breakPoint: number; campTaken?: boolean }): boolean {
  if (o.lostSectors > o.startedSectors / 2) return true;
  if (o.losses > o.men * o.breakPoint) return true;
  return o.campTaken === true && o.lostSectors >= o.startedSectors / 3;
}

/** The men-weighted average break point of an army's companies (WAR-120). */
export function armyBreakPoint(companies: Company[], ctx: Parameters<typeof breakPoint>[1] = {}): number {
  const men = companies.reduce((s, c) => s + c.men, 0);
  return men > 0 ? companies.reduce((s, c) => s + c.men * breakPoint(c, ctx), 0) / men : 0;
}

/** If both armies break in the same bell, only the one further past breaks (WAR-121). */
export function whoBreaks(a: { side: string; past: number }, b: { side: string; past: number }): string {
  return a.past >= b.past ? a.side : b.side;
}

/** A sector no company of one side stands in is lost by it and won by the other (WAR-119). */
export const sectorHolder = (sideA: { side: string; men: number }, sideB: { side: string; men: number }): string | null =>
  sideA.men > 0 && sideB.men <= 0 ? sideA.side : sideB.men > 0 && sideA.men <= 0 ? sideB.side : null;

// ---------------------------------------------------------------- orders (WAR-110)

export type OrderName = keyof typeof W.orders;
export const ORDERS = Object.keys(W.orders) as OrderName[];
export const orderEffect = (o: string): Record<string, unknown> => {
  const e = (W.orders as Record<string, Record<string, unknown>>)[o];
  if (!e) throw new Error(`unknown order ${o}`);
  return e;
};

/** Falling back: Raw companies break instead (WAR-110, WAR-097). */
export const fallBack = (level: number): "falls back" | "breaks" => (levelAbilities(level).fall_back_breaks ? "breaks" : "falls back");

/** Shift: a Seasoned or better company arrives the same bell (WAR-110). */
export const shiftArrives = (level: number): "the same bell" | "next bell" => (level >= (W.orders.Shift.same_bell_level as number) ? "the same bell" : "next bell");

// ---------------------------------------------------------------- night and the aftermath (WAR-123 … WAR-133)

/** A night withdrawal is clean if his Cunning is at least the enemy's; otherwise it counts as breaking with half the pursuit (WAR-123). */
export const nightWithdrawal = (cunning: number, enemyCunning: number): { clean: boolean; pursuit: number } =>
  cunning >= enemyCunning ? { clean: true, pursuit: 0 } : { clean: false, pursuit: 0.5 };

/** The wounded after a battle: the field-holder gets two thirds back after 5 weeks if fed (the rest die); the broken side's become the winner's prisoners (WAR-125). */
export function woundedAfter(wounded: number, heldField: boolean, fed = true): { back: number; die: number; prisoners: number; weeks: number } {
  const A = W.after;
  if (!heldField) return { back: 0, die: 0, prisoners: wounded, weeks: 0 };
  const back = fed ? wounded * A.wounded_return : 0;
  return { back, die: wounded - back, prisoners: 0, weeks: A.wounded_weeks };
}

/** The fled after a battle: half return (the broken side's only at a friendly castle), half go home to recruits (WAR-126). */
export function fledAfter(fled: number, heldField: boolean): { back: number; home: number; weeks: number | null; needsFriendlyCastle: boolean } {
  const back = fled * W.after.fled_return;
  return { back, home: fled - back, weeks: heldField ? W.after.fled_weeks : null, needsFriendlyCastle: !heldField };
}

/** Pursuit: 1 in 4 of the field-holder's unbroken Shock and Light catches one fleeing man (WAR-127). */
export const pursuit = (pursuers: number, fleeing: number, share = 1): number => Math.min(fleeing, pursuers * W.after.pursuit * share);

/** The field-holder takes the arms of the loser's killed and wounded, and half its wagons and food (all if the camp was taken) (WAR-128). */
export function spoils(o: { lostArms: number; wagons: number; reserve: number; campTaken: boolean }): { arms: number; wagons: number; reserve: number } {
  const share = o.campTaken ? 1 : W.after.camp_share;
  return { arms: o.lostArms, wagons: o.wagons * share, reserve: o.reserve * share };
}

/** Each leader of the broken side: 1 in 10 capture, more if pursued (WAR-129). */
export const captureChance = (pursued: boolean): { chance: number; more: boolean } => ({ chance: W.capture_chance, more: pursued });

/** Capture warfare: half the enemy's killed are taken as prisoners instead (WAR-133, Xochiyaoyotl). */
export const captureWarfare = (killed: number): { killed: number; prisoners: number } => ({ killed: killed * (1 - W.capture_warfare.share), prisoners: killed * W.capture_warfare.share });

export type PrisonerChoice = "ransom" | "exchange" | "release" | "enlist" | "hold";

/** What becomes of a prisoner (WAR-132). */
export function decidePrisoner(choice: PrisonerChoice, p: { owner: string; rank: string }): { goesHome: boolean; payer?: string; byRank?: string; goodwill?: boolean; enlistedLevel?: number; eats?: number; swapped?: boolean } {
  switch (choice) {
    case "ransom":
      return { goesHome: true, payer: p.owner, byRank: p.rank };
    case "exchange":
      return { goesHome: true, swapped: true };
    case "release":
      return { goesHome: true, goodwill: true };
    case "enlist":
      return { goesHome: false, enlistedLevel: W.prisoner_enlist_level };
    case "hold":
      return { goesHome: false, eats: W.rations.prisoner };
  }
}

export const eraBefore = (a: Era, b: Era): boolean => eraIndex(a) < eraIndex(b);
export type { Commander };
