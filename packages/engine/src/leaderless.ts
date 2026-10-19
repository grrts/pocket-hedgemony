import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { controller, nearest } from "./war.ts";
import { halt, marchTo } from "./turn.ts";
import { isPort, planVoyage, setCourse, type NavyFleet } from "./navy.ts";
import type { PersonDeath } from "./people.ts";

/**
 * Men and ships left without a leader when their commander dies (RECR-135 to
 * RECR-137): a general's army stands as the garrison of the crown province it
 * is in, or walks to the nearest one when it is in a lord's land, an enemy's,
 * or its own land held by an enemy; an admiral's fleet sails for the nearest
 * port of its own realm. On the way they take no orders and can't be caught,
 * like an army falling back; the map draws them close in only, with no
 * commander's banner or fleet token.
 */

const provinceName = (world: World, p: number) => world.rules.provinces[p]!.name;

/** A province of realm n's own crown land that it holds: a garrison there is the crown's. */
export const crownHeld = (world: World, n: number, p: number): boolean => world.provinceOwner[p] === n && world.provinceLord[p]! < 0 && controller(world, p) === n;

/** Sends an army whose general died to a crown garrison; returns the province it stands or walks to, or -1 if it can find none. */
export function armyHome(world: World, i: number): number {
  const a = world.armies;
  const n = a.owner[i]!;
  const here = a.location[i]!;
  if (crownHeld(world, n, here)) {
    halt(world, i);
    a.retreating[i] = 0;
    return here;
  }
  const to = nearest(world, here, (p) => crownHeld(world, n, p), 64);
  if (to < 0 || marchTo(world, i, to)) {
    // No crown land within reach: the men stand where they are, a garrison without a commander.
    halt(world, i);
    return -1;
  }
  a.retreating[i] = 1;
  return to;
}

/** Sends a fleet whose admiral died to the nearest port its realm holds; returns that port, or -1 if it stays where it is. */
export function fleetHome(world: World, f: NavyFleet): number {
  const owned = (p: number) => isPort(world, p) && world.provinceOwner[p] === f.owner && controller(world, p) === f.owner;
  if (!world.provinceWater[f.at] && owned(f.at)) return f.at;
  const plan = planVoyage(world, f, owned);
  if (!plan || !plan.path.length) return -1;
  f.landAt = -1;
  f.goal = -1;
  setCourse(f, plan.path);
  f.fleeing = true;
  return plan.path.at(-1)!;
}

/** The death listener (registered in index.ts, once every module has loaded). */
export function leaderless(world: World, d: PersonDeath, news: News[]): void {
  if (d.who.kind !== "commander" || !d.led) return;
  const a = world.armies;
  const i = d.led.army;
  // An army whose general falls in a battle leaves it by the battle's own rules (WAR-062).
  if (i >= 0 && a.alive[i] && a.commander[i]! < 0 && a.battle[i]! < 0) {
    const to = armyHome(world, i);
    if (d.nation === world.player && to >= 0 && to !== a.location[i]) news.push({ kind: "raised", text: `${d.name}'s men march for ${provinceName(world, to)} without him, to stand as its garrison.`, nations: [d.nation], province: to });
  }
  const f = d.led.fleet >= 0 ? world.navy.fleets.find((x) => x.id === d.led!.fleet) : undefined;
  if (f && f.admiral < 0 && f.battle < 0 && f.ships.length) {
    const to = fleetHome(world, f);
    if (d.nation === world.player && to >= 0 && to !== f.at) news.push({ kind: "raised", text: `${d.name}'s ships sail for ${provinceName(world, to)} without him.`, nations: [d.nation], province: to });
  }
}

