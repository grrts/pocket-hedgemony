import type { World } from "./world.ts";
import { Rng } from "./rng.ts";
import { mix } from "./names.ts";
import { byDistance } from "./lords.ts";
import { realmStrengths } from "./realmStrengths.ts";
import { canBorrow, LEDGER, LEDGER_LINES, loanDebt, runLedger } from "./treasury.ts";
import { startingCounts, type Confidence, type Level, type StartingCounts } from "./domain/realm/index.ts";
import { country } from "./domain/diplomacy/index.ts";

/**
 * Each realm's starting numbers from its catalogue assessments (REALM-130,
 * REALM-131, REALM-166, SETUP-020): gold and debt, levies already gathered,
 * officials at their posts and envoys at court, each spread by the
 * assessment's confidence with a seed of the campaign's own, so the same seed
 * gives the same start. A realm the catalogue does not assess keeps the
 * engine's flat start (SETUP-047).
 */

/** A realm's starting counts, or null where the catalogue has no assessment for it. */
export function realmStartingCounts(world: World, n: number, monthIncome = 0): StartingCounts | null {
  const s = realmStrengths(world.nationIds[n]!);
  if (!s.assessments.length) return null;
  const levels: Record<string, Level | "unknown"> = {};
  const confidence: Record<string, Confidence> = {};
  for (const a of s.assessments) {
    levels[a.dimension] = a.level;
    confidence[a.dimension] = a.confidence;
  }
  let people = 0;
  let provinces = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n) continue;
    people += world.provincePopulation[p]!;
    provinces++;
  }
  // Its own stream, so the start does not shift the campaign's dice.
  return startingCounts(levels, people, provinces, confidence, new Rng(mix(world.weatherSeed, n + 1)), monthIncome);
}

/**
 * Levies and officials, once lords hold their land and before the government
 * counts its officials: recruits gathered as a share of each province's
 * ceiling, and the posts of the royal provinces farthest from the capital left
 * empty where the realm has fewer officials than royal provinces.
 */
export function seedStartingPosts(world: World): void {
  for (let n = 0; n < world.nationCount; n++) {
    const c = realmStartingCounts(world, n);
    if (!c) continue;
    const capital = world.provinceIndex.get(world.rules.nations[n]!.capital);
    if (capital === undefined) continue;
    const land = byDistance(world, n, capital);
    const royal = land.filter((p) => world.provinceLord[p]! < 0);
    const officials = Math.max(1, Math.min(royal.length, Math.round(royal.length * c.officialsPerRoyal)));
    for (const p of royal.slice(officials)) world.provinceOfficial[p] = -1;
    for (const p of land) world.provinceRecruits[p] = world.provinceRecruitCeiling[p]! * c.recruitShare;
  }
}

/**
 * Gold, debt and envoys at court, once the ledger knows each realm's tax and
 * trade: gold as months of them, debt as a share of the gold (never more than
 * lenders would lend), and the extra envoys its court starts with.
 */
export function seedStartingPurse(world: World): void {
  const L = world.nationLedger;
  const TAX = LEDGER.indexOf("tax");
  const TRADE = LEDGER.indexOf("trade");
  for (let n = 0; n < world.nationCount; n++) {
    const month = L[n * LEDGER_LINES + TAX]! + L[n * LEDGER_LINES + TRADE]!;
    const c = realmStartingCounts(world, n, month);
    if (!c) continue;
    world.nationTreasury[n] = c.gold;
    world.nationDebt[n] = Math.min(c.debt, Math.floor(canBorrow(world, n) * loanDebt(1)));
    country(world.diplomacy, world.nationIds[n]!).courtEnvoys = c.envoysAtCourt;
  }
  // The interest line follows the debt.
  runLedger(world, false);
}
