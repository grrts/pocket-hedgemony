import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { loadDefaultRuleset } from "@ph/rules";
import * as E from "@ph/engine";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { loadMapTiles } from "@ph/engine/node";
import { battlePhase, type Battle } from "../../engine/src/war.ts";

/**
 * Battle length (warfare §5.25, battle-length.feature, F-158): one battle on
 * the 1444 map played step by step, each step's clock, phase, bells and men
 * recorded.
 */

const { Given, When, Then } = steps("warfare");

const rules = loadDefaultRuleset();
let base: E.World | null = null;

interface Step {
  hour: number;
  day: number;
  phase: string;
  bell: number;
  men: [number, number];
  morale: [number, number];
}

Given("Castile's army of {int} men meets Portugal's army of {int} men in a Castilian province", (s: Scenario, mine: number, theirs: number) => {
  base ??= E.createWorld(rules, 7, loadMapTiles(rules));
  const w = copyWorld(base);
  const me = w.nationIndex.get("castile")!;
  const foe = w.nationIndex.get("portugal")!;
  E.applyNow(w, { type: "declareWar", target: foe }, me);
  const p = Array.from({ length: w.provinceCount }, (_, i) => i).find((i) => w.provinceOwner[i] === me && w.provinceIndex.get(rules.nations[me]!.capital) !== i)!;
  s.armies = [E.spawnArmy(w, me, p, mine, w.commanderOwner.indexOf(me)), E.spawnArmy(w, foe, p, theirs, w.commanderOwner.indexOf(foe))];
  s.start = [mine, theirs];
  s.w = w;
});

/** Plays one step and records it. */
function step(s: Scenario): void {
  const w: E.World = s.w;
  const hour = w.step * 4;
  const day = w.day;
  E.advance(w, 1);
  s.battle ??= w.battles.find((b) => b.attackers.includes(s.armies[0]) || b.defenders.includes(s.armies[0]));
  const b: Battle | undefined = s.battle;
  if (!b) return;
  const ours = b.attackers.includes(s.armies[0]) ? 0 : 1;
  const morale: [number, number] = ours === 0 ? [b.attMorale, b.defMorale] : [b.defMorale, b.attMorale];
  (s.log ??= [] as Step[]).push({ hour, day, phase: (b.contact ?? 0) > 0 || b.bell === 0 ? "contact" : battlePhaseAt(hour), bell: b.bell, men: [w.armies.men[s.armies[0]]!, w.armies.men[s.armies[1]]!], morale });
}
const battlePhaseAt = (hour: number) => (hour >= 8 && hour < 20 ? "fighting" : "night");

When("the battle's first day passes", (s) => {
  for (let k = 0; k < 6; k++) step(s);
});
When("the battle is fought to its end", (s) => {
  for (let k = 0; k < 6 * 12 && (!s.battle || s.w.battles.includes(s.battle)); k++) step(s);
  expect(s.w.battles.includes(s.battle)).toBe(false);
});

Then("nobody on either side has been lost", (s) => {
  expect(s.log.at(-1).men).toEqual(s.start);
});
Then("the battle is in contact until the next morning's first bell at {int} o'clock", (s, h: number) => {
  const b: Battle = s.battle;
  expect(battlePhase(s.w, b)).toBe("contact");
  // Stepping on, the first bell is fought in the step that starts at that hour.
  while (b.bell === 0 && s.w.battles.includes(b)) step(s);
  const first = s.log.find((x: Step) => x.bell === 1);
  expect(first.hour).toBe(h);
});
Then("every bell was fought between {int} and {int} o'clock", (s, from: number, to: number) => {
  const log: Step[] = s.log;
  log.forEach((x, i) => {
    if (x.bell > (log[i - 1]?.bell ?? 0)) expect(x.hour >= from && x.hour < to).toBe(true);
  });
});
Then("no more than {int} bells were fought on any day", (s, n: number) => {
  const per = new Map<number, number>();
  const log: Step[] = s.log;
  log.forEach((x, i) => {
    if (x.bell > (log[i - 1]?.bell ?? 0)) per.set(x.day, (per.get(x.day) ?? 0) + 1);
  });
  expect(Math.max(...per.values())).toBeLessThanOrEqual(n);
});
Then("the battle lasted more than {int} days from contact to its end", (s, d: number) => {
  expect(s.log.length / 6).toBeGreaterThan(d);
});
Then("the losses were dealt over more than one bell", (s) => {
  const log: Step[] = s.log;
  const bellsWithLoss = log.filter((x, i) => i > 0 && (x.men[0] < log[i - 1]!.men[0] || x.men[1] < log[i - 1]!.men[1])).length;
  expect(bellsWithLoss).toBeGreaterThan(1);
});
Then("the beaten side's morale fell bell by bell", (s) => {
  const log: Step[] = s.log;
  const b: Battle = s.battle;
  const beaten = b.attackerWins === b.attackers.includes(s.armies[0]) ? 1 : 0;
  const seen = [...new Set(log.filter((x) => x.bell > 0).map((x) => x.morale[beaten]))];
  expect(seen.length).toBeGreaterThan(1);
  for (let i = 1; i < seen.length; i++) expect(seen[i]!).toBeLessThan(seen[i - 1]!);
});
Then("the beaten side lost a larger share of its men than the winner", (s) => {
  const b: Battle = s.battle;
  const end = s.log.at(-1).men as [number, number];
  const lost = [0, 1].map((i) => (s.start[i] - end[i]!) / s.start[i]);
  const beaten = b.attackerWins === b.attackers.includes(s.armies[0]) ? 1 : 0;
  expect(lost[beaten]!).toBeGreaterThan(lost[1 - beaten]!);
});
Then('the battle\'s phase went from "contact" to "fighting" and "night", and back to "fighting"', (s) => {
  const phases = (s.log as Step[]).map((x) => x.phase).filter((p, i, all) => p !== all[i - 1]);
  expect(phases.slice(0, 4)).toEqual(["contact", "fighting", "night", "fighting"]);
});
