import type { NationDef, ProvinceDef, Ruleset } from "@ph/rules";
import { Rng } from "./rng.ts";

/**
 * Builds a grid-shaped world of the given size, used to stress-test the
 * engine at full-world scale before the real map exists.
 */
export function generateSyntheticRuleset(base: Ruleset, opts: { provinces: number; nations: number; seed?: number }): Ruleset {
  const rng = new Rng(opts.seed ?? 1);
  const width = Math.ceil(Math.sqrt(opts.provinces));
  const provinces: ProvinceDef[] = [];
  for (let i = 0; i < opts.provinces; i++) {
    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors: string[] = [];
    if (x > 0) neighbors.push(`p${i - 1}`);
    if (x < width - 1 && i + 1 < opts.provinces) neighbors.push(`p${i + 1}`);
    if (y > 0) neighbors.push(`p${i - width}`);
    if (i + width < opts.provinces) neighbors.push(`p${i + width}`);
    provinces.push({
      id: `p${i}`,
      name: `Province ${i}`,
      owner: `N${Math.floor((i * opts.nations) / opts.provinces)}`,
      terrain: "grassland",
      tax: 1 + rng.int(8),
      production: 1 + rng.int(8),
      manpower: 1 + rng.int(6),
      neighbors,
    });
  }
  const nations: NationDef[] = [];
  for (let n = 0; n < opts.nations; n++) {
    const capital = provinces.find((p) => p.owner === `N${n}`)!;
    nations.push({ id: `N${n}`, name: `Nation ${n}`, color: "#808080", capital: capital.id, commanders: [] });
  }
  return { ...base, provinces, nations };
}
