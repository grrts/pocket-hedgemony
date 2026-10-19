import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * A start scenario read from disk (X-25), for tools and tests. A scenario
 * built region by region (1378) keeps each region's entries in its own
 * folder; this joins them in the scenario's region order. The bundled start
 * is read through start.ts instead.
 */
const scenariosDir = join(dirname(fileURLToPath(import.meta.url)), "../data/scenarios");

export interface ScenarioData {
  scenario: { id: string; date: { year: number; month: number; day: number }; regions?: string[] };
  /** The region each map nation, sleeping realm and ruler came from. */
  regionOf: Map<string, string>;
  mapNations: { id: string; name: string; capital: [number, number] }[];
  mapOwners: { nation: string | null }[];
  sleepingRealms: { id: string; name: string }[];
  rulers: Record<string, unknown>;
  culture: { tongues: Record<string, unknown>; realms: Record<string, unknown> };
  relations: { id: string; source: string; target: string; type: string }[];
  subjects: unknown[];
  subjectsRulers: Record<string, unknown>;
  ports: { name: string; holder: string }[];
}

/** Ids defined twice across regions, as "id (region a, region b)". */
export class ScenarioClash extends Error {}

export function readScenario(id: string): ScenarioData {
  const dir = join(scenariosDir, id);
  const scenario = JSON.parse(readFileSync(join(dir, "scenario.json"), "utf8"));
  const parts: string[] = scenario.regions ? scenario.regions.map((r: string) => join(dir, "regions", r)) : [dir];
  const read = (part: string, file: string) => {
    const path = join(part, file);
    return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : undefined;
  };
  const out: ScenarioData = { scenario, regionOf: new Map(), mapNations: [], mapOwners: [], sleepingRealms: [], rulers: {}, culture: { tongues: {}, realms: {} }, relations: [], subjects: [], subjectsRulers: {}, ports: [] };
  const clashes: string[] = [];
  const claim = (key: string, region: string) => {
    const had = out.regionOf.get(key);
    if (had !== undefined) clashes.push(`${key} (${had}, ${region})`);
    else out.regionOf.set(key, region);
  };
  const merge = (into: Record<string, unknown>, from: Record<string, unknown> | undefined, kind: string, region: string) => {
    for (const [k, v] of Object.entries(from ?? {})) {
      claim(`${kind}:${k}`, region);
      into[k] = v;
    }
  };
  for (const part of parts) {
    const region = scenario.regions ? part.split(/[\\/]/).pop()! : id;
    for (const n of read(part, "map-nations.json") ?? []) (claim(`nation:${n.id}`, region), out.mapNations.push(n));
    out.mapOwners.push(...(read(part, "map-owners.json") ?? []));
    for (const s of read(part, "world/sleeping-realms.json")?.realms ?? read(part, "sleeping-realms.json")?.realms ?? []) (claim(`nation:${s.id}`, region), out.sleepingRealms.push(s));
    merge(out.rulers, read(part, "rulers.json")?.rulers, "ruler", region);
    const culture = read(part, "culture-start.json");
    merge(out.culture.tongues, culture?.tongues, "tongue", region);
    merge(out.culture.realms, culture?.realms, "culture", region);
    for (const r of read(part, "relations.json")?.relations ?? []) (claim(`relation:${r.id}`, region), out.relations.push(r));
    out.subjects.push(...(read(part, "subjects.json")?.subjects ?? []));
    merge(out.subjectsRulers, read(part, "subjects-rulers.json")?.rulers, "subject-ruler", region);
    out.ports.push(...(read(part, "ports.json")?.towns ?? []));
  }
  if (clashes.length) throw new ScenarioClash(`defined in two regions: ${clashes.join(", ")}`);
  return out;
}
