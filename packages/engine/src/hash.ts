import { LOYALTY } from "./lords.ts";
import { tradeHashData } from "./trade.ts";
import { researchHashData } from "./research.ts";
import { castleFoodHashData } from "./castleFood.ts";
import { rebelsHashData } from "./rebels.ts";
import { revolutionsHashData } from "./revolutions.ts";
import { institutionsHashData } from "./institutions.ts";
import { tribesHashData } from "./tribes.ts";
import { plagueHashData } from "./plague.ts";
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
  feed(new Int32Array([world.weatherSeed, world.turn, world.day, world.step, world.date.year, world.date.month, world.date.day ?? 1, a.count, world.battles.length]));
  feed(world.rng.state);
  feed(world.provinceOwner);
  feed(world.provinceOccupier);
  feed(world.provinceGarrison);
  feed(world.nationTreasury);
  // Who sleeps (SETUP-082).
  feed(world.nationAsleep);
  feed(world.nationLevies);
  feed(world.provinceRecruits);
  feed(world.provincePopulation);
  feed(world.provinceClasses);
  feed(world.provinceTax);
  feed(world.nationTaxDefault);
  feed(world.nationDebt);
  feed(world.provinceStore);
  feed(world.provinceHarvest);
  feed(world.provinceStarved);
  feed(world.provinceGrievances);
  feed(world.provinceArmyMonths);
  feed(world.provinceBattleYear);
  feed(world.provinceLord);
  feed(world.provinceWorks);
  feed(world.provinceTiles);
  feed(world.provinceGame);
  feed(world.provinceHardWinter);
  feed(world.provinceWorn);
  feed(world.provinceOverwork);
  feed(world.provinceRested);
  feed(world.provinceSeam);
  feed(world.provinceSeamYears);
  feed(world.provinceChangeTile);
  feed(world.provinceChangeLeft);
  feed(world.nationNeglect);
  feed(Float64Array.from(world.sites.flatMap((s) => [s.nation, s.province, s.work, s.step, s.monthsLeft])));
  feed(Int32Array.from(world.workQueue.flatMap((q) => [q.nation, q.province, q.work, q.step])));
  feed(Int32Array.from(world.lords.flatMap((l) => [l.nation, LOYALTY.indexOf(l.loyalty), l.upCredit])));
  feed(researchHashData(world));
  feed(castleFoodHashData(world));
  // Army fields of live slots only: a dead slot keeps whatever it held, and a save drops it.
  const live = <T extends ArrayBufferView & ArrayLike<number> & { slice(a?: number, b?: number): T; fill(v: number, a?: number, b?: number): T }>(arr: T, stride = 1): T => {
    const out = arr.slice(0, a.count * stride);
    for (let i = 0; i < a.count; i++) if (!a.alive[i]) out.fill(0, i * stride, (i + 1) * stride);
    return out;
  };
  feed(a.alive.subarray(0, a.count));
  feed(live(a.owner));
  feed(live(a.location));
  feed(live(a.tile));
  feed(live(a.battle));
  feed(live(a.retreating));
  feed(live(a.cameFrom));
  feed(live(a.men));
  feed(live(a.horse));
  feed(live(a.food));
  feed(live(a.progress));
  feed(live(a.kind));
  feed(live(a.monthsOut));
  feed(live(a.home));
  feed(live(a.drill));
  feed(live(a.mix, a.mix.length / a.alive.length));
  feed(new Int32Array(world.commanders.flatMap((c) => [c.might, c.cunning, c.logistics, c.victories, c.defeats])));
  feed(new Float64Array(world.musters.flatMap((m) => [m.nation, m.province, m.men, m.daysLeft])));
  feed(new Float64Array(world.mercs.flatMap((m) => [m.nation, m.company.id, m.weeksLeft])));
  feed(new Float64Array(world.freeCompanies.flatMap((c) => [c.id, c.home, ...c.byArm])));
  feed(world.provinceOfficial);
  feed(world.nationForm);
  feed(world.provinceGrasping);
  feed(world.provinceTradeRatio);
  feed(tradeHashData(world));
  feed(world.campaign.nationLargest);
  feed(world.campaign.nationBattlesWon);
  feed(world.provinceRebels);
  feed(rebelsHashData(world));
  feed(revolutionsHashData(world));
  feed(institutionsHashData(world));
  feed(tribesHashData(world));
  for (const v of plagueHashData(world)) feed(v);
  feed(world.provinceLightTax);
  feed(world.provinceSelfRule);
  feed(world.provinceTongue);
  feed(world.provinceTongueShare);
  feed(world.provinceFaith);
  feed(world.provinceFaithShare);
  feed(world.provinceHouses);
  feed(world.provinceHeldSince);
  feed(world.nationTonguePolicy);
  feed(world.nationFaithPolicy);
  feed(world.nationFaithPending);
  feed(world.provinceOfficialSeed);
  feed(world.provinceOfficialSince);
  feed(world.provinceOfficialFrom);
  feed(world.provinceNewLand);
  feed(world.nationManualPosts);
  feed(live(a.trainArm));
  feed(live(a.trainMen));
  feed(live(a.trainLeft));
  for (let i = 0; i < a.count; i++) if (a.alive[i]) feed(Int32Array.from(a.route[i]!));
  // Only the path still to walk: a save keeps no more.
  for (let i = 0; i < a.count; i++) if (a.alive[i]) feed(a.path[i]!.subarray(a.pathAt[i]!));
  for (const b of world.battles) feed(new Float64Array([b.id, b.tile, b.round, b.rounds, b.attDealt, b.defDealt, ...b.attackers, -1, ...b.defenders]));
  return (h >>> 0).toString(16).padStart(8, "0");
}
