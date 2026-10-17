import { W, armDef, clamp, eraIndex, knows, type ArmDef, type Company, type Era, type Kind, type Known, type Role } from "./model.ts";

/**
 * Companies, arms, kinds, levels and obsolescence (spec §5.1, §5.2, §5.16):
 * how men, drill, scars and loads of arms come and go, what a company fights
 * as, its level by era, its break point and its pay.
 */

// ---------------------------------------------------------------- men (WAR-002, WAR-004)

/** Causes that bring men into a company; the first two are new men who dilute drill and scars. */
export const JOIN_CAUSES = { "refilling from recruits": true, "enlisting prisoners": true, "wounded coming back": false, raising: true } as const;
export type JoinCause = keyof typeof JOIN_CAUSES;
export type LeaveCause = "killed in battle" | "wounded in battle" | "fleeing" | "desertion" | "sickness" | "hunger" | "disbanding";

/** New men set drill to drill × old men ÷ all men, and dilute scars the same way (WAR-004). */
export function addMen(c: Company, n: number, cause: JoinCause = "refilling from recruits"): void {
  const all = c.men + n;
  if (JOIN_CAUSES[cause] && all > 0) {
    c.drill = (c.drill * c.men) / all;
    c.scars = (c.scars * c.men) / all;
  }
  c.men = all;
}

/** Men leave; killed and fled men take their share of the loads of arms with them (WAR-002, WAR-009). */
export function removeMen(c: Company, n: number, cause: LeaveCause): void {
  const n2 = Math.min(n, c.men);
  if ((cause === "killed in battle" || cause === "fleeing") && c.men > 0) c.arms -= (c.arms * n2) / c.men;
  c.men -= n2;
}

/** A change of men by a named cause: positive joins, negative leaves (WAR-002). */
export function changeMen(c: Company, cause: string, change: number): void {
  if (change >= 0) addMen(c, change, cause as JoinCause);
  else removeMen(c, -change, cause as LeaveCause);
}

// ---------------------------------------------------------------- drill and scars (WAR-003 … WAR-008)

export type Where = "in camp" | "in garrison" | "in winter quarters" | "marching";

/** Drill +1 a month in camp, garrison or winter quarters; standing regiments drill all year; Old soldier +2 (WAR-003, WAR-058). */
export function monthDrill(c: Company, where: Where, opts: { oldSoldier?: boolean; era?: Era } = {}): void {
  if (where === "marching" && c.kind !== "standing regiment") return;
  const step = opts.oldSoldier ? W.traits["Old soldier"].drill_per_month : 1;
  c.drill = Math.min(W.drill_max, c.drill + step);
  if (c.levelDrop) {
    c.levelDrop.drillSince += step;
    if (c.levelDrop.drillSince >= W.levels_by_era[opts.era ?? "II"].drill[0]!) delete c.levelDrop;
  }
}

/** A hungry month costs 1 drill (WAR-005). */
export function hungryMonth(c: Company): void {
  c.drill = Math.max(0, c.drill - 1);
  c.hungry = true;
}

/** Standing through a battle without breaking: +1 scar, +1 more if its side won (WAR-006). */
export function standThrough(c: Company, won: boolean): void {
  c.scars = Math.min(W.scars_max, c.scars + 1 + (won ? 1 : 0));
  c.yearsWithoutBattle = 0;
}

/** −1 scar for every 5 years without a battle (WAR-007). */
export function yearsPass(c: Company, years: number, battle = false): void {
  if (battle) {
    c.yearsWithoutBattle = 0;
    return;
  }
  const before = c.yearsWithoutBattle ?? 0;
  const after = before + years;
  const fades = Math.floor(after / W.scar_fade_years) - Math.floor(before / W.scar_fade_years);
  c.scars = Math.max(0, c.scars - fades);
  c.yearsWithoutBattle = after;
}

/** What disbanding hands back: men to the home recruit pool, arms to the store (WAR-046). */
export interface Disbanded {
  men: number;
  arms: number;
  home: string | undefined;
}

/** Disbanding resets drill and scars, and sends men home and arms to the store (WAR-008, WAR-046, WAR-047). */
export function disband(c: Company): Disbanded {
  const out = { men: c.men, arms: c.arms, home: c.home };
  c.drill = 0;
  c.scars = 0;
  c.men = 0;
  c.arms = 0;
  delete c.levelDrop;
  return out;
}

// ---------------------------------------------------------------- arms (WAR-009 … WAR-014)

export const captureArms = (c: Company, loads: number): void => void (c.arms += loads);
export const leaveArms = (c: Company, loads: number): void => void (c.arms = Math.max(0, c.arms - loads));

/** Loads of arms the company's arm needs for its men (per 100 men). */
export const armsNeeded = (arm: string, men: number): number => ((armDef(arm).needs.arms ?? 0) * men) / 100;

/** A company short of loads of arms fights as the next arm down (WAR-010). */
export function fightsAs(c: Company, era?: Era): string {
  let arm = c.arm;
  const def = armDef(arm);
  if (def.next_down && c.arms < armsNeeded(arm, c.men)) arm = def.next_down;
  // Era II: pike and shot below level 2 fight as levy foot (WAR-153).
  const n = W.era_notes.pike_and_shot_below;
  if (era === n.era && c.arm === "pike and shot" && levelOf(c, era) < n.level) arm = n.fights_as;
  return arm;
}

/** Powder an arm takes from the store for one battle (per 100 men, or per gun). */
export function battlePowder(c: Company): number {
  const def = armDef(c.arm);
  if (def.needs.powder_per !== "battle") return 0;
  const per = def.unit === "gun" ? c.men : c.men / 100;
  return (def.needs.powder ?? 0) * per;
}

export const usesPowder = (arm: string): boolean => (armDef(arm).needs.powder ?? 0) > 0;

/**
 * Take each company's powder for a battle from the store; a powder arm
 * whose powder isn't there does not fire (WAR-013). Guns count one gun per man.
 */
export function drawBattlePowder(companies: Company[], store: { powder: number }): { firing: Company[]; silent: Company[] } {
  const firing: Company[] = [];
  const silent: Company[] = [];
  for (const c of companies) {
    if (!usesPowder(c.arm)) {
      firing.push(c);
      continue;
    }
    const need = battlePowder(c);
    if (store.powder > 0 && store.powder >= need) {
      store.powder -= need;
      firing.push(c);
    } else silent.push(c);
  }
  return { firing, silent };
}

/** Strength per man (per gun for guns) by what the realm knows (WAR-011). */
export function strengthOf(arm: string, known?: Known): number {
  const def = armDef(arm);
  let s = def.strength;
  for (const [inv, v] of Object.entries(def.strength_with ?? {})) if (knows(known, inv)) s = v;
  return s;
}

/** A realm can field an arm it has unlocked; start arms with regions only in those regions (WAR-011, WAR-012). */
export function canField(arm: string, realm: { known?: Known; regions?: string[] }): boolean {
  const def: ArmDef = armDef(arm);
  if (def.unlock === "start") return !def.start_regions || def.start_regions.some((r) => realm.regions?.includes(r));
  return knows(realm.known, def.unlock);
}

// ---------------------------------------------------------------- kinds (WAR-015 … WAR-022)

export interface KindDef {
  break_point: number;
  pay: { by: "treasury" | "lord" | "loot"; multiplier: number; free_months?: number; all_year?: boolean };
  needs?: string;
  counts_toward_cap: "yes" | "no" | "above room";
  min_level?: number;
}
export const kindDef = (k: Kind): KindDef => (W.kinds as Record<Kind, KindDef>)[k];

/** A realm can keep a kind only with its invention (standing regiments need W12, WAR-015). */
export const canKeep = (k: Kind, known?: Known): boolean => !kindDef(k).needs || knows(known, kindDef(k).needs!);

/** Who pays a company this month and at how many times normal pay (WAR-015, WAR-044). */
export function payThisMonth(c: Company): { treasury: boolean; multiplier: number } {
  const p = kindDef(c.kind).pay;
  if (p.by !== "treasury") return { treasury: false, multiplier: 0 };
  if (p.free_months !== undefined && c.monthsOut <= p.free_months) return { treasury: false, multiplier: 0 };
  return { treasury: true, multiplier: p.multiplier };
}

/** Levies out past their months send 5 % home a month unless paid double; W15 and Beloved keep them longer (WAR-016, WAR-058, WAR-192). */
export function levyGoingHome(c: Company, opts: { paidDouble?: boolean; known?: Known; beloved?: boolean } = {}): number {
  if (c.kind !== "levy" || opts.paidDouble) return 0;
  let after: number = knows(opts.known, "W15") ? W.levy.w15_go_home_after : W.levy.go_home_after;
  if (opts.beloved) after += W.traits.Beloved.levy_extra_months;
  if (c.monthsOut < after) return 0;
  const n = c.men * W.levy.go_home_rate;
  c.men -= n;
  return n;
}

/** Levies away at harvest: the province is told how many of its farmers are away, and its harvest falls by that share (WAR-017). */
export const levyAwayAtHarvest = (province: string, levied: number): { province: string; farmersAway: number } => ({ province, farmersAway: levied });

/** Unpaid hired companies: owed 1 month won't fight; 2 loot or take a higher offer (WAR-019). */
export function hiredBehaviour(owed: number, enemyOffer = 0, owedPay = 0): "fights" | "will not fight" | "loots" | "takes the enemy's offer" {
  if (owed >= W.hired.loot_owed) return enemyOffer > owedPay ? "takes the enemy's offer" : "loots";
  if (owed >= W.hired.no_fight_owed) return "will not fight";
  return "fights";
}

/** Garrison men above the castle's room count toward the troop cap (WAR-021, WAR-030). */
export const garrisonOverRoom = (men: number, room: number): number => Math.max(0, men - room);

// ---------------------------------------------------------------- levels (WAR-097 … WAR-099, WAR-152 … WAR-154)

/** Level 1 to 5 from drill and scars by era (WAR-097, WAR-098, WAR-152). */
export function levelOf(c: Company, era: Era = "II", known?: Known): number {
  if (c.fixedLevel !== undefined) return c.fixedLevel;
  const [drilled, seasoned, elite] = W.levels_by_era[era].drill as [number, number, number];
  const s = W.level_scars;
  let l = 1;
  if (c.drill >= drilled) l = 2;
  if (c.drill >= seasoned && c.scars >= s.Seasoned) l = 3;
  if (l >= 3 && c.scars >= s.Veteran) l = 4;
  if (l >= 4 && c.scars >= s.Elite && c.drill >= elite) l = 5;
  // Era I: levies can't pass level 3 without becoming standing troops (WAR-153).
  if (c.kind === "levy" && era === W.era_notes.levy_cap.era) l = Math.min(l, W.era_notes.levy_cap.level);
  if (c.startLevel !== undefined) l = Math.max(l, c.startLevel);
  if (c.levelDrop) l -= c.levelDrop.levels;
  // W12: standing regiments never below level 2 (WAR-099).
  if (c.kind === "standing regiment" && knows(known, "W12")) l = Math.max(l, kindDef(c.kind).min_level ?? 1);
  return clamp(l, 1, 5);
}

/** The hits change at a level, by era (WAR-097, WAR-152). */
export const levelHits = (level: number, era: Era = "II"): number => W.levels_by_era[era].hits[level - 1]!;
/** The break point bonus at a level, by era: levels 3 to 5 only (WAR-097, WAR-152). */
export const levelBreak = (level: number, era: Era = "II"): number => (level >= 3 ? W.levels_by_era[era].break[level - 3]! : 0);
/** What a level allows (WAR-097). */
export const levelAbilities = (level: number): { fall_back_breaks?: boolean; fall_back?: boolean; light_step_back?: boolean; shift_same_bell?: boolean; line_half_brace?: boolean; free_orders?: number } =>
  (W.level_abilities as Record<string, object>)[String(level)]!;

/** A company raised gets the era's start level (era I knights at level 3, WAR-153). */
export function raiseCompany(c: Company, era: Era): Company {
  const s = (W.era_notes.start_level as Record<string, { era: string; level: number }>)[c.arm];
  if (s && s.era === era) c.startLevel = s.level;
  return c;
}

/** Era notes on levels for a company (WAR-153). */
export function eraNotes(c: Company, era: Era, known?: Known): { fightsAs: string; shotFactor: number; canShiftInBell: boolean; canInfiltrate: boolean } {
  const level = levelOf(c, era, known);
  const n = W.era_notes;
  const musket = c.arm === "musketeers" && era === n.musketeers_below.era && knows(known, n.musketeers_below.needs) && level < n.musketeers_below.level;
  const linear = era === n.linear_shift_level.era && level < n.linear_shift_level.level;
  return {
    fightsAs: fightsAs(c, era),
    shotFactor: musket ? n.musketeers_below.shot : 1,
    canShiftInBell: !linear && (level >= 3 || era === n.linear_shift_level.era),
    canInfiltrate: era === n.infiltrate.era && level >= n.infiltrate.level,
  };
}

/** Reservists: a realm with W18 calls up former soldiers at level 2 in era VI (WAR-153). */
export function reservistLevel(era: Era, known?: Known): number | null {
  const r = W.era_notes.reservists;
  return eraIndex(era) >= eraIndex(r.era as Era) && knows(known, r.needs) ? r.level : null;
}

/** Drop a company one level until it has drilled the era's Drilled months again (WAR-151, WAR-154). */
export function dropLevel(c: Company): void {
  c.levelDrop = { levels: (c.levelDrop?.levels ?? 0) + 1, drillSince: 0 };
}

/** An invention that changes a company's arm or role drops it a level (WAR-154). */
export function learnInvention(companies: Company[], id: string): Company[] {
  const change = (W.role_changing_inventions as Record<string, { foot?: boolean }>)[id];
  if (!change) return [];
  const hit = companies.filter((c) => (change.foot ? armDef(c.arm).foot === true : true));
  hit.forEach(dropLevel);
  return hit;
}

/** Re-arming takes the new arm's loads of arms and powder from the stores and drops a level (WAR-151). */
export function rearm(c: Company, arm: string, stores: { arms: number; powder: number }): { arms: number; powder: number } {
  const def = armDef(arm);
  const arms = ((def.needs.arms ?? 0) * c.men) / 100;
  const powder = ((def.needs.powder ?? 0) * c.men) / 100;
  stores.arms -= arms;
  stores.powder -= powder;
  c.arm = arm;
  c.arms = arms;
  dropLevel(c);
  return { arms, powder };
}

// ---------------------------------------------------------------- obsolescence (WAR-149, WAR-150)

interface ObsoleteRow {
  arm: string;
  by: string;
  role?: string;
  keeps_role?: string;
  keeps?: string[];
  field_only?: boolean;
}
const OBSOLETE = W.obsolete as ObsoleteRow[];

/** How an arm fights against an enemy who knows what made it obsolete (WAR-149). */
export function againstEnemy(arm: string, enemy?: Known): { strength: number; roles: Role[]; keeps: string[] } {
  let roles = [...armDef(arm).roles] as Role[];
  let strength = 1;
  const keeps: string[] = [];
  for (const o of OBSOLETE) {
    if (o.arm !== arm || !knows(enemy, o.by)) continue;
    if (o.role) {
      roles = roles.filter((r) => r !== o.role);
      if (roles.length === 0) strength = 0.5;
    } else strength = 0.5;
    keeps.push(...(o.keeps ?? []));
  }
  return { strength, roles, keeps };
}

/** A realm can't raise an arm once it knows the invention that made it obsolete (WAR-150). */
export function canRaise(arm: string, realm: { known?: Known; regions?: string[] }): boolean {
  if (!canField(arm, realm)) return false;
  return !OBSOLETE.some((o) => o.arm === arm && !o.role && knows(realm.known, o.by));
}

// ---------------------------------------------------------------- break point (WAR-023)

export interface BreakContext {
  era?: Era;
  known?: Known;
  /** The leader's Might bonus in the company's sector (already per point × Might). */
  might?: number;
  homeland?: boolean;
  hungry?: boolean;
  /** Commander traits of its army. */
  traits?: string[];
  /** A starving garrison (WAR-167). */
  starving?: boolean;
}

/** A company's break point: base by kind, level, Might, homeland, hunger, pay owed and traits (WAR-023). */
export function breakPoint(c: Company, ctx: BreakContext = {}): number {
  let bp = kindDef(c.kind).break_point + levelBreak(levelOf(c, ctx.era, ctx.known), ctx.era);
  bp += ctx.might ?? 0;
  if (ctx.homeland) bp += W.break.homeland;
  if (ctx.hungry || c.hungry) bp += W.break.hungry;
  bp += W.break.pay_owed * c.payOwed;
  for (const t of ctx.traits ?? []) bp += (W.traits as Record<string, { army_break?: number }>)[t]?.army_break ?? 0;
  if (ctx.starving) bp += W.siege.hunger_break;
  return bp;
}
