import { describe, it } from "vitest";
import "../steps/index.ts";
import { loadFeatures } from "../src/features.ts";
import { readiness, runPickle } from "../src/run.ts";

/**
 * Runs every scenario in domain/ whose steps all have a definition in steps/.
 * The rest show as todo: they are specified but not yet built, which is the
 * gap `pnpm --filter @ph/specs report` lists per context.
 */
for (const feature of loadFeatures()) {
  describe(`${feature.path}: ${feature.name}`, () => {
    for (const pickle of feature.pickles) {
      // Scenarios that build a whole world and write saves take seconds on a shared CI runner; 5 s was too tight for them.
      if (readiness(pickle, feature.context).automated) it(pickle.name, () => runPickle(pickle, feature.context).then(() => undefined), 30_000);
      else it.todo(pickle.name);
    }
  });
}
