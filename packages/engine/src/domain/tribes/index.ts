/**
 * Tribes (tribes spec §5.1): which realms are tribal realms, and which
 * catalogue records of North America become new tribes on the 1444 map
 * (TRIBE-001 … TRIBE-005). The map build places them (tools/mapgen,
 * nations-1444.json `grows`); this reads the same config and the build's
 * report.
 */
import config from "../../../../rules/data/domain/tribes.json" with { type: "json" };
import report from "../../../../rules/data/domain/scenario-setup-report.json" with { type: "json" };
import { allRecords, type CatalogueRow } from "../scenario-setup/catalogue.ts";

export const tribesConfig = config;

/** A realm is tribal while its form is clan council, chiefdom or confederation and its capital lies in a tribal region (TRIBE-001). */
export function isTribalRealm(form: string, capitalRegion: string): boolean {
  return config.tribal_forms.includes(form) && config.regions.includes(capitalRegion);
}

/** Records the new-tribe rule looks at, and the ones it leaves out as not of 1444 or already on the map (TRIBE-002, D-TRIBE-2). */
export function newTribeRecords(): CatalogueRow[] {
  const leftOut = config.new_tribes_left_out as Record<string, string>;
  return allRecords().filter((r) => config.new_tribe_regions.includes(r.region) && config.new_tribe_representations.includes(r.representation) && !Object.hasOwn(leftOut, r.id));
}

/** Provinces a new tribe starts with, by catalogue tier (TRIBE-003). */
export function newTribeProvinces(tier: string): number {
  return (config.new_tribe_provinces as Record<string, number>)[tier] ?? 1;
}

/** Added realms the map build left as reference data, with the province and realm that held their capital (SETUP-064, TRIBE-004). */
export function leftOutAtBuild(): { id: string; capital: string; owner: string }[] {
  return report.left_out;
}

/** Each added realm's wanted and built size (SETUP-063, TRIBE-003). */
export function grownAtBuild(): Record<string, { wanted: number; got: number }> {
  return report.grown;
}
