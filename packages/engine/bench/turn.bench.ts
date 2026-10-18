// Times turns and route planning on synthetic worlds bigger than EU4's
// (~5k land provinces), against the budgets in docs/performance.md.
// Fails (exit 1) when a budget is broken. Run with: pnpm bench
import { loadDefaultRuleset } from "@ph/rules";
import { blockTileGrid, corridor, createWorld, generateSyntheticRuleset, marchMap, planRoute, planTilePath, processTurn, tileMarch } from "../src/index.ts";

// A week (42 four-hour steps) in the engine worker. The game plays it a day
// or a step at a time, so each answer is a seventh of this or less.
const TURN_MS = { 5000: 25, 20000: 100 } as const;
// The map plans a route every time the player drags an army; one frame's slack.
const ROUTE_MS = 8;
// A march over tiles is planned once, when the order is given, in the worker.
const WALK_MS = 100;

let failed = false;
const check = (name: string, ms: number, budget: number) => {
  const ok = ms <= budget;
  if (!ok) failed = true;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: ${ms.toFixed(3)} ms (budget ${budget})`);
};

for (const [provinces, nations] of [[5000, 500], [20000, 2000]] as const) {
  const rules = generateSyntheticRuleset(loadDefaultRuleset(), { provinces, nations });
  // Provinces of 12 by 12 tiles, about the real map's land provinces.
  const world = createWorld(rules, 1, blockTileGrid(rules, Math.ceil(Math.sqrt(provinces)), 12));
  // Five runs of 24 turns (about half a year each); the median run's average
  // per turn counts, so a runner hiccup in one run does not fail the budget.
  const runs: number[] = [];
  for (let r = 0; r < 5; r++) {
    const t0 = performance.now();
    for (let i = 0; i < 24; i++) processTurn(world, [], 0);
    runs.push((performance.now() - t0) / 24);
  }
  check(`${provinces} provinces, ${nations} nations, per turn (median of 5 runs)`, runs.sort((a, b) => a - b)[2]!, TURN_MS[provinces]);

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

  // A march the player orders: the province route, then the walk over its tiles.
  const allowed = new Uint8Array(provinces);
  let worstWalk = 0;
  for (let i = -5; i < 20; i++) {
    const from = land[((i + 5) * 7919) % land.length]!;
    const to = land[((i + 5) * 7919 + 37 * 71) % land.length]!;
    const r0 = performance.now();
    const route = planRoute(rules.defines.march, map, from, to, army);
    if (route) planTilePath(tileMarch(world), world.tiles.centre[from]!, world.tiles.centre[to]!, corridor(map, [from, ...route.path], allowed), army);
    if (i >= 0) worstWalk = Math.max(worstWalk, performance.now() - r0);
  }
  check(`${provinces} provinces, slowest of 20 marches over tiles`, worstWalk, WALK_MS);
}
if (failed) process.exit(1);
