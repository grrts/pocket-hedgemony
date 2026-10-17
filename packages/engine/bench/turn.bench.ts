// Times turns and route planning on synthetic worlds bigger than EU4's
// (~5k land provinces), against the budgets in docs/performance.md.
// Fails (exit 1) when a budget is broken. Run with: pnpm bench
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, generateSyntheticRuleset, marchMap, planRoute, processTurn } from "../src/index.ts";

// A turn runs in the engine worker while the player waits; this leaves most
// of the 250 ms answer budget for messaging and the snapshot.
const TURN_MS = { 5000: 25, 20000: 100 } as const;
// The map plans a route every time the player drags an army; one frame's slack.
const ROUTE_MS = 8;

let failed = false;
const check = (name: string, ms: number, budget: number) => {
  const ok = ms <= budget;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${ms.toFixed(3)} ms (budget ${budget})`);
};

for (const [provinces, nations] of [[5000, 500], [20000, 2000]] as const) {
  const rules = generateSyntheticRuleset(loadDefaultRuleset(), { provinces, nations });
  const world = createWorld(rules, 1);
  const turns = 120;
  const t0 = performance.now();
  for (let i = 0; i < turns; i++) processTurn(world, [], 0);
  check(`${provinces} provinces, ${nations} nations, per turn`, (performance.now() - t0) / turns, TURN_MS[provinces]);

  const map = marchMap(world);
  const land = map.ground.flatMap((g, p) => (g ? [p] : []));
  const army = { men: 10000, horse: 2000, logistics: 0 };
  const routes = 50;
  let worst = 0;
  // The first routes include compiling planRoute; time the warm ones.
  for (let i = -10; i < routes; i++) {
    const from = land[((i + 10) * 7919) % land.length]!;
    const to = land[((i + 10) * 104729 + 13) % land.length]!;
    const r0 = performance.now();
    planRoute(rules.defines.march, map, from, to, army);
    if (i >= 0) worst = Math.max(worst, performance.now() - r0);
  }
  check(`${provinces} provinces, slowest of ${routes} routes`, worst, ROUTE_MS * (provinces / 5000));
}
if (failed) process.exit(1);
