import { describe, it } from "vitest";
import "../steps/index.ts";
import { loadFeatures } from "../src/features.ts";
import { readiness, runPickle } from "../src/run.ts";

/**
 * Runs every scenario in domain/ whose steps all have a definition in steps/.
 * The rest show as todo: they are specified but not yet built, which is the
 * gap `pnpm --filter @ph/specs report` lists per context.
 */
// Some scenarios open a whole 1444 save at every cut or write twenty of them, and the save grows as systems join the turn.
const SCENARIO_TIMEOUT_MS = 30_000;

for (const feature of loadFeatures()) {
  describe(`${feature.path}: ${feature.name}`, () => {
    for (const pickle of feature.pickles) {
      if (readiness(pickle, feature.context).automated) it(pickle.name, () => runPickle(pickle, feature.context).then(() => undefined), SCENARIO_TIMEOUT_MS);
      else it.todo(pickle.name);
    }
  });
}
