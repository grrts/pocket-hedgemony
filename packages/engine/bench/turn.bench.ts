// Times turns on a synthetic world bigger than EU4's (~5k land provinces).
// Run with: pnpm bench
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, generateSyntheticRuleset, processTurn } from "../src/index.ts";

for (const [provinces, nations] of [[5000, 500], [20000, 2000]] as const) {
  const rules = generateSyntheticRuleset(loadDefaultRuleset(), { provinces, nations });
  const world = createWorld(rules, 1);
  const turns = 120;
  const t0 = performance.now();
  for (let i = 0; i < turns; i++) processTurn(world, [], 0);
  const ms = (performance.now() - t0) / turns;
  console.log(`${provinces} provinces, ${nations} nations: ${ms.toFixed(3)} ms per turn`);
}
