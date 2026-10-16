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
      if (readiness(pickle).automated) it(pickle.name, () => runPickle(pickle).then(() => undefined));
      else it.todo(pickle.name);
    }
  });
}
