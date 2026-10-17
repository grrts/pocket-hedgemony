import config from "../../../../rules/data/domain/revolutions.json" with { type: "json" };
import eventsData from "../../../../rules/data/domain/revolutions-events.json" with { type: "json" };
import type { Condition, EventDef } from "../events/index.ts";

/**
 * The revolution layer's data (revolutions/generated/runtime and the merged
 * event-tree patch): 36 revolutions, 33 regimes, 34 decrees, 9 families and
 * the balance values of revolutions-design 7 and 12. All numbers are placeholders.
 */

export type Stance = "lead" | "bend" | "fight" | "path";
export type Loyalty = "loyal" | "wavering" | "disloyal" | "in_revolt";
export const LOYALTY_STEPS: Loyalty[] = ["loyal", "wavering", "disloyal", "in_revolt"];

export interface Sign {
  label: string;
  ease: string;
  if: Condition;
}
export interface Spark {
  label: string;
  mult: number;
  if: Condition;
  foreign_backing?: boolean;
}
export interface Camp {
  joins?: Record<string, number>;
  farmers_if_hungry?: number;
  only_of_faith?: boolean;
  only_of_culture?: boolean;
  lords?: string;
  army?: string;
  clergy?: string;
  note?: string;
}
export interface Wave {
  kind: string;
  id?: string;
  amount?: number;
  where: string;
  note?: string;
}
export interface Family {
  id: string;
  name: string;
  cause: string;
  camps: { revolution: Camp; old_order: Camp };
  stance_labels: { lead: string; bend: string; fight: string };
  wave: Wave;
}
export interface Revolution {
  family: string;
  /** The role the revolution happens in, e.g. "$realm". */
  country: string;
  cause: string;
  requirements: Condition[];
  signs: { need: number; warn_at: number; list: Sign[] } | null;
  sparks: Spark[];
  stances: Record<string, Stance>;
  camps: Family["camps"];
  wave: Wave;
  keep_trigger: boolean;
  rearm: { grace_years: number; after: Record<string, "chosen" | "rising_crushed"> };
}
export interface Regime {
  id: string;
  name: string;
  add_on?: boolean;
  /** A government form id, `keep`, or `old_form`. */
  form?: string;
  form_before_g14?: string;
  ruler?: "kept" | "deposed" | "replaced" | "elected";
  power_base_add?: string[];
  lords?: string;
  church?: string;
  faith?: string;
  decrees?: string[];
  locks?: string[];
  grievances_end?: string[];
  grievances_add?: string[];
  flags?: string[];
  flags_clear?: string[];
  abroad?: string;
  risk?: string;
  loop?: string;
}
export interface Decree {
  id: string;
  name: string;
  card: "country" | "province";
  cost: string;
  limit: string;
  does: string;
}
/** A revolution event as merged into the event tree (patch), with `new` for the 10 added events. */
export type RevolutionEvent = EventDef & { new: boolean };

export type RevolutionsConfig = typeof config;
export const revolutionsConfig: RevolutionsConfig = config;
export const families = config.families as unknown as Record<string, Family>;
export const regimes = config.regimes as unknown as Record<string, Regime>;
export const decrees = config.decrees as unknown as Record<string, Decree>;
export const revolutions = config.revolutions as unknown as Record<string, Revolution>;
export const revolutionEvents = (eventsData as unknown as { events: Record<string, RevolutionEvent> }).events;

export function revolution(id: string): Revolution {
  const r = revolutions[id];
  if (!r) throw new Error(`Unknown revolution: ${id}`);
  return r;
}
export function family(id: string): Family {
  const f = families[id];
  if (!f) throw new Error(`Unknown family: ${id}`);
  return f;
}
export function regime(id: string): Regime {
  const r = regimes[id];
  if (!r) throw new Error(`Unknown regime: ${id}`);
  return r;
}
export function decree(id: string): Decree {
  const d = decrees[id];
  if (!d) throw new Error(`Unknown decree: ${id}`);
  return d;
}
export function revolutionEvent(id: string): RevolutionEvent {
  const e = revolutionEvents[id];
  if (!e) throw new Error(`Unknown revolution event: ${id}`);
  return e;
}

/** The event's role the revolution happens in, without the `$` ("realm"). */
export function roleOf(rev: Revolution): string {
  return rev.country.replace(/^\$/, "");
}

/**
 * The compiled trigger (INV-REVO-1, REVO-010): all requirements plus at least
 * `need` of the signs. A `keep_trigger` revolution keeps the event's own (REVO-017).
 */
export function compileTrigger(rev: Revolution, existing: Condition | null = null, need = rev.signs?.need ?? 0): Condition | null {
  if (rev.keep_trigger || !rev.signs) return existing;
  return { all: [...rev.requirements, { at_least: { n: need, of: rev.signs.list.map((s) => s.if) } }] };
}

/** One selection modifier per spark, the foreign-backing spark included (REVO-010, REVO-062). */
export function compileSelection(rev: Revolution): { if: Condition; mult: number }[] {
  return rev.sparks.map((s) => ({ if: s.if, mult: s.mult }));
}
