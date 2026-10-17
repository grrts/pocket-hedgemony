import type { Rng } from "../../rng.ts";
import { armDef, W, knows, type Company, type Known } from "./model.ts";

/**
 * March effects and seeing the enemy (spec §5.7). Marching itself is
 * troop-movement's; here only what a march does to the army, and who sees whom.
 */

/** What a march order does to an army (WAR-066, WAR-067). */
export function marchEffects(march: "Normal" | "Forced" | "Careful" | "Raid"): { sickness: number; levyDesertionWeek: number; firstDayStrength: number; ambushable: boolean; scoutRange: number | null } {
  const f = W.forced_march;
  if (march === "Forced") return { sickness: f.sickness, levyDesertionWeek: f.levy_desertion_week, firstDayStrength: f.first_day_strength, ambushable: true, scoutRange: null };
  if (march === "Careful") return { sickness: 1, levyDesertionWeek: 0, firstDayStrength: 0, ambushable: false, scoutRange: W.scouting.careful_range };
  return { sickness: 1, levyDesertionWeek: 0, firstDayStrength: 0, ambushable: true, scoutRange: null };
}

/** Riders who scout: light horse, horse archers and camel riders. */
export const ridersOf = (companies: Company[]): number => companies.filter((c) => armDef(c.arm).rider).reduce((s, c) => s + c.men, 0);

/** How many provinces an army sees: next door, +1 per 500 riders; Careful sees 2; W22 scouts see 4 (WAR-067, WAR-068, WAR-193). */
export function sightRange(riders: number, opts: { careful?: boolean; known?: Known } = {}): number {
  let r = W.scouting.base_range + Math.floor(riders / W.scouting.riders_per_province);
  if (opts.careful) r = Math.max(r, W.scouting.careful_range);
  if (knows(opts.known, "W22")) r = Math.max(r, W.scouting.w22_range);
  return r;
}

/** A realm sees an enemy army in its own provinces, next to its castles, and within its armies' sight (WAR-068). */
export function sees(o: { inOwnProvince?: boolean; nextToOwnCastle?: boolean; distanceToArmy?: number; range?: number }): boolean {
  if (o.inOwnProvince || o.nextToOwnCastle) return true;
  return o.distanceToArmy !== undefined && o.range !== undefined && o.distanceToArmy <= o.range;
}

/** A rumour of an unseen army: its size wrong by up to a third (WAR-069). */
export function rumour(men: number, place: string, rng: Rng): { men: number; place: string; low: number; high: number } {
  const e = W.rumour_error;
  const shown = Math.round(men * (1 - e + 2 * e * rng.next()));
  return { men: shown, place, low: men * (1 - e), high: men * (1 + e) };
}

/** Rumours and scouting are worked out only for the player's view (WAR-070). */
export const scoutingWorkedOut = (observerIsPlayer: boolean): boolean => observerIsPlayer;
