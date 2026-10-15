import defines from "../data/defines.json" with { type: "json" };
import units from "../data/units.json" with { type: "json" };
import nations from "../data/nations.json" with { type: "json" };
import provinces from "../data/provinces.json" with { type: "json" };
import type { Ruleset } from "./types.ts";
import { validateRuleset } from "./validate.ts";

export type * from "./types.ts";
export { validateRuleset, RulesetError } from "./validate.ts";

/** The bundled 1444 scenario. */
export function loadDefaultRuleset(): Ruleset {
  return validateRuleset({
    defines,
    units,
    nations,
    provinces: provinces.provinces,
  } as Ruleset);
}
