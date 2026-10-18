/**
 * Exploration config (EXPL-057): every number this context uses, read from one
 * file, packages/rules/data/domain/exploration.json, plus the event tree's
 * regions and ages (exploration-regions.json, generated).
 */
import raw from "../../../../rules/data/domain/exploration.json" with { type: "json" };
import regions from "../../../../rules/data/domain/exploration-regions.json" with { type: "json" };

export type AggressionLevel = "Peaceful" | "Wary" | "Hostile" | "Fierce";
export type ExplorationShipType = keyof typeof raw.naval.exploration_ships;
export type LowSupply = "Turn back" | "Carry on";

export interface AggressionRow {
  level: AggressionLevel;
  chance_pct: number;
  average_loss: number;
}

export const explorationConfig = raw;
export const AGGRESSION = raw.aggression as AggressionRow[];
export const regionData = regions as {
  macro_regions: string[];
  parents: Record<string, string | null>;
  ages: Record<string, { regions: string[]; force_start: number | null; force_end: number | null }>;
  polities_1444: Record<string, string>;
};
