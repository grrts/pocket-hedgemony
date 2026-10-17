import type { World } from "./world.ts";

/**
 * FNV-1a over the raw bytes of the simulation arrays. Two worlds with the
 * same hash are in the same state, which lets tests (and later the server)
 * check that a turn was computed identically elsewhere.
 */
export function hashWorld(world: World): string {
  let h = 0x811c9dc5;
  const feed = (view: ArrayBufferView) => {
    const bytes = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    for (let i = 0; i < bytes.length; i++) h = Math.imul(h ^ bytes[i]!, 0x01000193);
  };
  const a = world.armies;
  feed(new Int32Array([world.turn, world.date.year, world.date.month, world.date.day ?? 1, a.count]));
  feed(world.rng.state);
  feed(world.provinceOwner);
  feed(world.provinceOccupier);
  feed(world.provinceGarrison);
  feed(world.nationTreasury);
  feed(world.nationLevies);
  feed(a.alive.subarray(0, a.count));
  feed(a.owner.subarray(0, a.count));
  feed(a.location.subarray(0, a.count));
  feed(a.men.subarray(0, a.count));
  feed(a.horse.subarray(0, a.count));
  feed(a.food.subarray(0, a.count));
  feed(a.progress.subarray(0, a.count));
  for (let i = 0; i < a.count; i++) feed(Int32Array.from(a.route[i]!));
  return (h >>> 0).toString(16).padStart(8, "0");
}
