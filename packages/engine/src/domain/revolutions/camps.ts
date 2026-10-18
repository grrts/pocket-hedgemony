import { family, revolution, revolutionsConfig, LOYALTY_STEPS, type Camp, type Loyalty } from "./model.ts";
import type { Lord, RevoState, TaggedRising } from "./state.ts";

/**
 * Camps of a revolution's rising (REVO-026 … REVO-031): the family's join
 * shares replace the rebellions join table for a tagged rising only; lords
 * and soldiers follow the family's camp rules.
 */

/** Which join table a rising uses: the family's camps for a tagged rising, the rebellions table otherwise (REVO-026). */
export function joinTableFor(r: RevoState, risingId: string): "camps" | "rebellions" {
  return r.risings.some((t) => t.rising.id === risingId) ? "camps" : "rebellions";
}

export interface JoinInput {
  /** The province is Hungry (liberal and national farmers join faster). */
  hungry?: boolean;
  /** These people share the movement's faith / the region's culture. */
  sameFaith?: boolean;
  sameCulture?: boolean;
  /** The revolution is funded from abroad (REVO-062). */
  funded?: boolean;
}

/** Monthly join share of a class in a family's revolution camp (REVO-027, REVO-030). */
export function joinShare(familyId: string, cls: string, i: JoinInput = {}): number {
  const camp: Camp = family(familyId).camps.revolution;
  if (camp.only_of_faith && i.sameFaith === false) return 0;
  if (camp.only_of_culture && i.sameCulture === false) return 0;
  let share = camp.joins?.[cls] ?? 0;
  if (cls === "farmers" && i.hungry && camp.farmers_if_hungry !== undefined) share = camp.farmers_if_hungry;
  if (i.funded) share *= revolutionsConfig.reference.foreign_backing.joins_mult;
  return share;
}

/** Men of a class who join the revolution camp this month. */
export function joiners(familyId: string, cls: string, men: number, i: JoinInput = {}): number {
  return Math.floor(men * joinShare(familyId, cls, i) + 1e-9);
}

/** One month of muster for a tagged rising: the camp's shares, not the rebellions table (REVO-026). */
export function musterCamp(t: TaggedRising, classes: Record<string, number>, i: JoinInput = {}): Record<string, number> {
  const fam = revolution(t.revolution).family;
  const joined: Record<string, number> = {};
  for (const [cls, n] of Object.entries(classes)) {
    const k = joiners(fam, cls, n, { ...i, ...(t.funded ? { funded: true } : {}) });
    if (k <= 0) continue;
    joined[cls] = k;
    classes[cls] = n - k;
    t.rising.men[cls] = (t.rising.men[cls] ?? 0) + k;
  }
  return joined;
}

// ---------------------------------------------------------------- lords and soldiers (REVO-028, REVO-031)

interface LordRule {
  same_faith?: boolean;
  other_faith?: boolean;
  same_culture?: boolean;
  other_culture?: boolean;
  loyalty_at_least?: Loyalty;
  loyalty?: Loyalty;
  trait?: string;
  traits?: string[];
  with_retinue?: boolean;
  any?: boolean;
  emigre?: boolean;
  old_house?: boolean;
  planter_or_settler?: boolean;
  gained_under_revolution?: boolean;
}
interface CampRules {
  revolution_lords: LordRule[];
  old_order_lords: LordRule[];
  desertion?: { rate: number; [k: string]: unknown };
  mutiny?: { rate: number; war_weariness_above: number };
}

export function campRules(familyId: string): CampRules {
  const c = (revolutionsConfig.camp_rules as unknown as Record<string, CampRules>)[familyId];
  if (!c) throw new Error(`No camp rules for the family ${familyId}`);
  return c;
}

export interface Movement {
  faith?: string;
  culture?: string;
}

function ruleHolds(rule: LordRule, l: Lord, m: Movement): boolean {
  const step = (x: Loyalty) => LOYALTY_STEPS.indexOf(x);
  if (rule.any) return true;
  if (rule.same_faith && l.faith !== m.faith) return false;
  if (rule.other_faith && (l.faith === undefined || l.faith === m.faith)) return false;
  if (rule.same_culture && l.culture !== m.culture) return false;
  if (rule.other_culture && (l.culture === undefined || l.culture === m.culture)) return false;
  if (rule.loyalty_at_least && step(l.loyalty) < step(rule.loyalty_at_least)) return false;
  if (rule.loyalty && l.loyalty !== rule.loyalty) return false;
  if (rule.trait && !(l.traits ?? []).includes(rule.trait)) return false;
  if (rule.traits && !rule.traits.some((t) => (l.traits ?? []).includes(t))) return false;
  if (rule.emigre && !l.emigre) return false;
  if (rule.old_house && !l.oldHouse) return false;
  if (rule.planter_or_settler && !l.planterOrSettler) return false;
  if (rule.gained_under_revolution && !l.gainedUnderRevolution) return false;
  return true;
}

/** The camp a lord joins: revolution rules first, then the old order's (REVO-031). */
export function lordCamp(familyId: string, l: Lord, m: Movement = {}): "revolution" | "old_order" | null {
  const c = campRules(familyId);
  if (c.revolution_lords.some((x) => ruleHolds(x, l, m))) return "revolution";
  if (c.old_order_lords.some((x) => ruleHolds(x, l, m))) return "old_order";
  return null;
}

/** Whether a lord who joins the revolution brings his retinue (estates: "with their retinues"). */
export function bringsRetinue(familyId: string, l: Lord, m: Movement = {}): boolean {
  return campRules(familyId).revolution_lords.some((x) => x.with_retinue && ruleHolds(x, l, m));
}

/** Monthly desertion of soldiers to the revolution, with the rule's conditions (REVO-031). */
export function desertion(familyId: string): { rate: number; conditions: string[] } | null {
  const d = campRules(familyId).desertion;
  if (!d) return null;
  return { rate: d.rate, conditions: Object.keys(d).filter((k) => k !== "rate") };
}

/** Monthly mutiny share while war weariness is above the rule's line (socialist_defeat, REVO-031). */
export function mutiny(familyId: string, warWeariness: number): number {
  const m = campRules(familyId).mutiny;
  return m && warWeariness > m.war_weariness_above ? m.rate : 0;
}

/**
 * The old order camp of a revolution in a country: its lords send their
 * retinues to the ruler and the state clergy calm their provinces (REVO-028);
 * after a Lead it is who may rise against the new regime (REVO-019).
 */
export function oldOrderCamp(r: RevoState, id: string, country: string, m: Movement = {}): { lords: string[]; retinues: number; clergy?: string } {
  const fam = revolution(id).family;
  const lords = (r.lords[country] ?? []).filter((l) => lordCamp(fam, l, m) === "old_order");
  const clergy = family(fam).camps.old_order.clergy;
  return { lords: lords.map((l) => l.id), retinues: lords.reduce((n, l) => n + (l.retinue ?? 0), 0), ...(clergy ? { clergy } : {}) };
}

/** The revolution camp takes a province's castle: the province counts as risen (REVO-029). */
export function takeCastle(t: TaggedRising, province: string): void {
  if (!t.castles.includes(province)) t.castles.push(province);
  if (!t.rising.provinces.includes(province)) t.rising.provinces.push(province);
  t.rising.holdsCastle = true;
}
export function isRisen(r: RevoState, province: string): boolean {
  return r.risings.some((t) => t.castles.includes(province));
}
