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
  feed(world.provinceRecruits);
  feed(a.alive.subarray(0, a.count));
  feed(a.owner.subarray(0, a.count));
  feed(a.location.subarray(0, a.count));
  feed(a.cameFrom.subarray(0, a.count));
  feed(a.men.subarray(0, a.count));
  feed(a.horse.subarray(0, a.count));
  feed(a.food.subarray(0, a.count));
  feed(a.progress.subarray(0, a.count));
  feed(a.kind.subarray(0, a.count));
  feed(a.monthsOut.subarray(0, a.count));
  feed(a.drill.subarray(0, a.count));
  feed(a.mix.subarray(0, a.count * (a.mix.length / a.alive.length)));
  feed(new Int32Array(world.commanders.flatMap((c) => [c.might, c.cunning, c.logistics, c.victories, c.defeats])));
  feed(new Float64Array(world.musters.flatMap((m) => [m.nation, m.province, m.men, m.weeksLeft])));
  feed(new Float64Array(world.mercs.flatMap((m) => [m.nation, m.men, m.weeksLeft])));
  feed(world.provinceOfficial);
  feed(a.trainArm.subarray(0, a.count));
  feed(a.trainMen.subarray(0, a.count));
  feed(a.trainLeft.subarray(0, a.count));
  for (let i = 0; i < a.count; i++) feed(Int32Array.from(a.route[i]!));
  return (h >>> 0).toString(16).padStart(8, "0");
}
