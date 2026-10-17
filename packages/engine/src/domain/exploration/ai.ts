/**
 * The exploration AI (design §8; EXPL-053, EXPL-054): sea-minded realms send
 * exploration ships along the edge of their charted map, then found colonies
 * on the nearest unowned coasts. Land powers never explore.
 */
import { isWater, type MapGraph } from "../world-map/index.ts";
import { isCharted, type ChartedMap } from "./charts.ts";
import { averageFounding, zonesToNearest } from "./colonies.ts";
import { explorationConfig as cfg, type AggressionLevel } from "./config.ts";

/** Favours expansion by sea: its catalogue personality names an expansion mode by sea. */
export function favoursSea(expansionModes: readonly string[]): boolean {
  return expansionModes.some((m) => cfg.ai.sea_expansion_modes.includes(m));
}

/** Charted water zones next to an uncharted one: the edge of the charts. */
export function chartEdge(g: MapGraph, m: ChartedMap): string[] {
  return g.places
    .filter((p) => isWater(p) && isCharted(m, p.id) && p.neighbors.some((n) => g.byId.has(n) && isWater(g.byId.get(n)!) && !isCharted(m, n)))
    .map((p) => p.id);
}

export interface ExplorationPlan {
  voyageTargets: string[];
  colonyTargets: { province: string; zones: number }[];
}

/**
 * The AI's exploration plan for one turn. A land power gives no voyage and
 * founds no colony. A sea-minded realm with the unlock aims its voyages at the
 * edge of its charts and lists unowned charted coasts, nearest first.
 */
export function planExploration(
  g: MapGraph,
  m: ChartedMap,
  c: { expansionModes: readonly string[]; unlocked: boolean; ports: readonly string[] },
): ExplorationPlan {
  if (!favoursSea(c.expansionModes) || !c.unlocked) return { voyageTargets: [], colonyTargets: [] };
  const colonyTargets: { province: string; zones: number }[] = [];
  for (const p of g.places) {
    if (isWater(p) || p.owner !== null || !p.coastal || !isCharted(m, p.id)) continue;
    const zones = zonesToNearest(g, p.id, c.ports);
    if (zones !== null) colonyTargets.push({ province: p.id, zones });
  }
  colonyTargets.sort((a, b) => a.zones - b.zones || a.province.localeCompare(b.province));
  return { voyageTargets: chartEdge(g, m), colonyTargets };
}

/**
 * Colony stores the AI loads for a colony that rolled a level: the average food
 * the level needs, times the margin (EXPL-062, D-EXPL-13; provisional 1.25).
 */
export function aiColonyStores(level: AggressionLevel): number {
  return Math.ceil(averageFounding(level).food * cfg.ai.stores_margin);
}
