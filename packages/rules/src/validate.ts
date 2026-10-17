import type { Ruleset } from "./types.ts";

export class RulesetError extends Error {
  readonly problems: string[];

  constructor(problems: string[]) {
    super(`Invalid ruleset:\n- ${problems.join("\n- ")}`);
    this.problems = problems;
    this.name = "RulesetError";
  }
}

const TERRAINS = new Set(["grassland", "farmland", "hills", "mountains", "drylands", "marsh", "forest", "desert", "tundra", "jungle", "savanna", "sea", "ocean"]);

/**
 * Cross-checks the config files against each other so balancing mistakes
 * (a typo in an owner tag, a one-way border) fail at load time, not mid-campaign.
 */
export function validateRuleset(rules: Ruleset): Ruleset {
  const problems: string[] = [];
  const nationIds = new Set<string>();
  const provinceIds = new Set<string>();

  if (rules.names) {
    const { cultures, nations, fallback } = rules.names;
    if (!cultures[fallback]) problems.push(`names: fallback culture "${fallback}" is not listed`);
    for (const [n, c] of Object.entries(nations)) if (!cultures[c]) problems.push(`names: realm ${n} has unknown culture "${c}"`);
    for (const [id, c] of Object.entries(cultures)) {
      if (!c.given?.length) problems.push(`names: culture ${id} has no given names`);
      if ((c.style === "family" || c.style === "family_first") && !c.family?.length) problems.push(`names: culture ${id} needs family names`);
      if (c.style === "title" && !c.title?.length) problems.push(`names: culture ${id} needs titles`);
    }
  }

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
    for (const field of ["population", "wealth"] as const) {
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
    else if (capital.terrain === "sea" || capital.terrain === "ocean") problems.push(`nation ${n.id}: capital ${n.capital} is at sea`);
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
