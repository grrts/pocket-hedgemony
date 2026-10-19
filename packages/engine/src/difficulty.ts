import type { World } from "./world.ts";
import { difficultyEffects, difficultyOf, type Difficulty } from "./domain/scenario-setup/campaign.ts";

/**
 * The campaign's difficulty as the simulation reads it (SETUP-099 to SETUP-103).
 * Each factor is applied at one point; on normal every factor is 1 and the
 * game plays exactly as balanced. No factor draws a random number.
 */

/** Factor on the AI's monthly chance to look for a war (war.ts aiDeclarations, SETUP-101). */
export function aiWarChanceFactor(world: World): number {
  return difficultyEffects(world.campaign.difficulty).ai_war_chance;
}

/** Gold a realm's monthly income pays in: an AI realm's income times the difficulty's factor; the player's, and any deficit, as it is (SETUP-102). */
export function incomePaidIn(world: World, n: number, income: number): number {
  if (n === world.player || income <= 0) return income;
  return income * difficultyEffects(world.campaign.difficulty).ai_income;
}

/** A plotting province's monthly chance to rise, with the difficulty's factor where the player owns it (SETUP-103). */
export function risingChanceByDifficulty(world: World, p: number, chance: number): number {
  if (chance <= 0 || world.player < 0 || world.provinceOwner[p] !== world.player) return chance;
  const f = difficultyEffects(world.campaign.difficulty).player_rising_chance;
  return f === 1 ? chance : Math.min(1, chance * f);
}

/** Sets the campaign's difficulty at new game; an unknown level is normal (SETUP-099). */
export function setDifficulty(world: World, level: unknown): Difficulty {
  return (world.campaign.difficulty = difficultyOf(level));
}
