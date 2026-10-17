import { parseChange } from "./modifiers.ts";
import { eventsConfig, type World } from "./model.ts";

/**
 * The anti-corruption mapping (EVT-056, D-EVT-4): the event data keeps the
 * tree's abstract statistic names, and each change lands as the owning
 * context's concrete change (province stats 15, country stats 11, trade v2,
 * diplomacy 11). The table lives in events.json `stat_mapping`.
 */

export interface Landing {
  /** The context that applies the change. */
  owner: string;
  /** What the change becomes, e.g. `fitting_buildings`, `burned_tiles_pct`. */
  landsAs: string;
  /** How much of it: buildings, steps, percent, or 1 for a one-off (a grievance, an outbreak). */
  amount: number;
}

interface MappingRow {
  owner: string;
  lands_as: string;
  per_point?: number;
  fixed?: number;
  scale?: number;
  per_tenth?: number;
}

function row(stat: string): MappingRow | undefined {
  const m = eventsConfig.stat_mapping as unknown as Record<string, MappingRow | string>;
  const r = m[stat];
  return typeof r === "object" ? r : undefined;
}

/** Whether a statistic has a concrete landing in the mapping. */
export function mapped(stat: string): boolean {
  const r = row(stat);
  return !!r && r.lands_as !== "read_only";
}

/** How an event's change to an event-tree statistic lands (EVT-056). */
export function landStat(stat: string, change: number | string): Landing {
  const r = row(stat);
  if (!r || r.lands_as === "read_only") throw new Error(`The statistic ${stat} has no landing; events only read it (D-EVT-4)`);
  const c = parseChange(change).value;
  let amount: number;
  if (r.fixed !== undefined) amount = c === 0 ? 0 : Math.sign(c) * r.fixed;
  else if (r.scale !== undefined) amount = c * r.scale;
  else if (r.per_tenth !== undefined) amount = Math.round((c / 0.1) * r.per_tenth);
  else amount = c * (r.per_point ?? 1);
  return { owner: r.owner, landsAs: r.lands_as, amount };
}

/**
 * Recomputes the tree's derived province values from their stored inputs
 * (EVT-054): local supply and resource output, with the provisional k values
 * of events.json `derived_formulas`.
 */
export function deriveAll(w: World): void {
  const k = eventsConfig.derived_formulas;
  for (const p of Object.values(w.places)) {
    const s = p.stats;
    if (s.prosperity === undefined) continue;
    const prosperity = Number(s.prosperity);
    const kept = 1 - Number(s.devastation ?? 0) / 100;
    const control = Number(s.control ?? 100) / 100;
    s.local_supply = k.k_supply * (prosperity + Number(s.infrastructure ?? 0) * 2) * k.terrain_supply_mult * kept;
    s.resource_output = prosperity * k.good_base_yield * (1 + k.tech_economy_bonus) * kept * control;
  }
}
