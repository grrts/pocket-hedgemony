import { ARMS, createWorld, garrisonTroops, menByArm, processTurn, spawnArmy, type World } from "@ph/engine";
import { loadDefaultRuleset, type Ruleset } from "@ph/rules";
import type { Scenario } from "../src/registry.ts";

/**
 * The 1444 game with France as the player, for the recruiting and province
 * scenarios that run the real levy, garrison and training rules. The design's
 * places are the map's: Troyes stands in Aube, Langres in Haute-Marne.
 */
export interface LevyGame {
  w: World;
  /** France. */
  n: number;
}

let rules: Ruleset | undefined;
const PLACES: Record<string, string> = { Troyes: "Aube", Langres: "Haute-Marne", Reims: "Marne" };

export function province(g: LevyGame, name: string): number {
  const real = PLACES[name] ?? name;
  const p = g.w.rules.provinces.findIndex((x) => x.name === real);
  if (p < 0) throw new Error(`no province ${name}`);
  return p;
}

/** The scenario's game, made on first use: France plays, with gold, men to call and inventions the scenario named. */
export function levyGame(s: Scenario): LevyGame {
  if (s.game) return s.game as LevyGame;
  rules ??= loadDefaultRuleset();
  const w = createWorld(rules, 1);
  const n = w.nationIndex.get("france")!;
  w.player = n;
  w.nationTreasury[n] = 10_000;
  // W6 opens pikes, the arm the training scenarios train.
  for (const id of ["W6", ...((s.known as string[] | undefined) ?? [])]) w.research[n]?.known.add(id);
  const g = { w, n };
  // Troyes starts with no troops of its own and men enough for the scenarios' levies.
  const troyes = province(g, "Troyes");
  for (const i of garrisonTroops(w, n, troyes)) w.armies.alive[i] = 0;
  w.provinceRecruitCeiling[troyes] = Math.max(w.provinceRecruitCeiling[troyes]!, 10_000);
  w.provinceRecruits[troyes] = w.provinceRecruitCeiling[troyes]!;
  s.game = g;
  return g;
}

/** Plays whole weeks of turns with no orders. */
export function playDays(g: LevyGame, days: number): void {
  for (let d = 0; d < days; d += 7) processTurn(g.w, [], g.n);
}

/** Men of France's troops without a commander in a province. */
export function garrisonMen(g: LevyGame, p: number, arm?: string): number {
  return garrisonTroops(g.w, g.n, p).reduce((t, i) => t + (arm === undefined ? g.w.armies.men[i]! : menByArm(g.w, i)[ARMS.indexOf(arm)]!), 0);
}

/** A commander of France at the head of an army of `men` levy foot in province p: the first of hers, with a new army there. */
export function commanderAt(g: LevyGame, p: number, men = 1000): { army: number; commander: number } {
  const a = g.w.armies;
  const commander = g.w.commanderOwner.findIndex((o) => o === g.n);
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.owner[i] !== g.n || a.commander[i] !== commander) continue;
    a.alive[i] = 0;
  }
  if (commander < 0) throw new Error("France has no commander");
  return { army: spawnArmy(g.w, g.n, p, men, commander), commander };
}
