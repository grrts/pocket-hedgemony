import { balance, eventsConfig, type ModifierDef, type ModifierInstance } from "./model.ts";

/**
 * Modifiers (EVT-051 … EVT-053): named, timed bundles of stat changes with a
 * scope, a duration (0 = permanent), decay and stacking.
 */

export type { ModifierInstance };

export type Stacking = "none" | "refresh" | "stack";

/** The stacking rule, `refresh` when the modifier names none (EVT-052). */
export function stackingOf(def: Pick<ModifierDef, "stacking">): Stacking {
  return (def.stacking ?? balance.modifier_rules.default_stacking) as Stacking;
}

/**
 * Applies a modifier to a target: `none` keeps the copy as it is, `refresh`
 * restarts its duration, `stack` adds a copy up to `max_stacks` (EVT-051, EVT-052).
 */
export function applyModifier(list: ModifierInstance[], def: ModifierDef, target: string, at: number, years = def.years): ModifierInstance[] {
  const found = list.find((m) => m.id === def.id && m.target === target);
  if (!found) return [...list, { id: def.id, target, start: at, years, stacks: 1 }];
  const rule = stackingOf(def);
  if (rule === "none") return list;
  return list.map((m) => {
    if (m !== found) return m;
    if (rule === "refresh") return { ...m, start: at, years };
    return { ...m, start: at, years, stacks: Math.min(balance.modifier_rules.max_stacks, m.stacks + 1) };
  });
}

/** Share (0..1) of the full magnitude left after `elapsedYears` (EVT-051, EVT-052). */
export function decayFactor(def: Pick<ModifierDef, "decay">, years: number, elapsedYears: number): number {
  if (years === 0 || !def.decay || def.decay === "none") return 1;
  if (elapsedYears >= years) return 0;
  if (def.decay === "linear") return 1 - elapsedYears / years;
  // exponential: half the magnitude at half the duration
  const halfLife = years * balance.modifier_rules.exponential_half_life_share;
  return Math.pow(0.5, elapsedYears / halfLife);
}

/** A change's magnitude after decay. */
export function magnitude(value: number, def: Pick<ModifierDef, "decay">, years: number, elapsedYears: number): number {
  return value * decayFactor(def, years, elapsedYears);
}

/** A permanent modifier (0 years) never expires. */
export function expired(m: ModifierInstance, at: number): boolean {
  return m.years !== 0 && at - m.start >= m.years * 12;
}

export type ChangeKind = "level" | "accumulating" | "scale" | "population_removed" | "growth_rate";

/** How one change applies (EVT-053, modifiers.yaml header). */
export function changeKind(stat: string, value: number | string): ChangeKind {
  if (stat.endsWith("_growth")) return "growth_rate";
  if (typeof value === "string" && value.endsWith("%")) return stat === "population" ? "population_removed" : "scale";
  return eventsConfig.modifier_changes.accumulating.includes(stat) ? "accumulating" : "level";
}

/** A number or a "+n%" string. */
export function parseChange(value: number | string): { value: number; percent: boolean } {
  if (typeof value === "number") return { value, percent: false };
  const percent = value.trim().endsWith("%");
  return { value: Number(value.replace("%", "").replace("+", "")), percent };
}

/**
 * What one active change does over one year to a stat, given its current
 * value and its value without the modifier: level stats hold the offset,
 * accumulating stats gain it each year, percents scale or remove (EVT-053).
 */
export function yearOfChange(stat: string, change: number | string, current: number, base: number): { value: number; growthRate?: number } {
  const kind = changeKind(stat, change);
  const c = parseChange(change);
  switch (kind) {
    case "level":
      return { value: base + c.value };
    case "accumulating":
      return { value: current + c.value };
    case "scale":
      return { value: base * (1 + c.value / 100) };
    case "population_removed":
      return { value: current * (1 + c.value / 100) };
    case "growth_rate":
      return { value: current, growthRate: c.value };
  }
}

/** Provinces a modifier lands on: a region-scoped modifier on a country hits all its provinces (EVT-053). */
export function modifierTargets(def: ModifierDef, target: string, provincesOf: (country: string) => string[]): string[] {
  if (def.scope === "region" && !target.includes(":") && target !== "global") return provincesOf(target);
  return [target];
}
