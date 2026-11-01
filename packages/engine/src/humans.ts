import type { World } from "./world.ts";

/** Whether a person plays realm n (the player, or in multiplayer any of the players); the AI leaves it alone. */
export function isHuman(world: World, n: number | undefined): boolean {
  return n !== undefined && n >= 0 && (world.humans ? world.humans.includes(n) : n === world.player);
}

/** The realms people play: the player, or every player in multiplayer. */
export function humansOf(world: World): number[] {
  return world.humans ?? (world.player >= 0 ? [world.player] : []);
}
