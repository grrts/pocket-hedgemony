import type { Ruleset } from "./types.ts";

export class RulesetError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid ruleset:\n- ${problems.join("\n- ")}`);
    this.problems = problems;
    this.name = "RulesetError";
  }
}

const TERRAINS = new Set(["grassland", "farmland", "hills", "mountains", "drylands", "marsh", "forest", "desert", "tundra", "jungle"]);

/**
 * Cross-checks the config files against each other so balancing mistakes
 * (a typo in an owner tag, a one-way border) fail at load time, not mid-campaign.
 */
export function validateRuleset(rules: Ruleset): Ruleset {
  const problems: string[] = [];
  const nationIds = new Set<string>();
  const provinceIds = new Set<string>();

  for (const n of rules.nations) {
    if (nationIds.has(n.id)) problems.push(`duplicate nation id "${n.id}"`);
    nationIds.add(n.id);
    if (!/^#[0-9a-f]{6}$/i.test(n.color)) problems.push(`nation ${n.id}: color "${n.color}" is not #rrggbb`);
  }

  for (const p of rules.provinces) {
    if (provinceIds.has(p.id)) problems.push(`duplicate province id "${p.id}"`);
    provinceIds.add(p.id);
  }

  const byId = new Map(rules.provinces.map((p) => [p.id, p]));
  for (const p of rules.provinces) {
    if (p.owner !== null && !nationIds.has(p.owner)) problems.push(`province ${p.id}: unknown owner "${p.owner}"`);
    if (!TERRAINS.has(p.terrain)) problems.push(`province ${p.id}: unknown terrain "${p.terrain}"`);
    for (const field of ["tax", "production", "manpower"] as const) {
      if (!Number.isFinite(p[field]) || p[field] < 0) problems.push(`province ${p.id}: ${field} must be >= 0`);
    }
    for (const nb of p.neighbors) {
      const other = byId.get(nb);
      if (!other) problems.push(`province ${p.id}: unknown neighbor "${nb}"`);
      else if (!other.neighbors.includes(p.id)) problems.push(`province ${p.id}: border with ${nb} is one-way`);
    }
  }

  for (const n of rules.nations) {
    const capital = byId.get(n.capital);
    if (!capital) problems.push(`nation ${n.id}: unknown capital "${n.capital}"`);
    else if (capital.owner !== n.id) problems.push(`nation ${n.id}: capital ${n.capital} is owned by ${capital.owner}`);
  }

  const unitIds = new Set<string>();
  for (const u of rules.units) {
    if (unitIds.has(u.id)) problems.push(`duplicate unit id "${u.id}"`);
    unitIds.add(u.id);
  }

  const { month } = rules.defines.startDate;
  if (!Number.isInteger(month) || month < 1 || month > 12) problems.push(`defines.startDate.month must be 1-12`);

  if (problems.length > 0) throw new RulesetError(problems);
  return rules;
}
