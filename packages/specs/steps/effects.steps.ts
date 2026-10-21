// Particles and animations on the map (map-presentation, VIEW-140..VIEW-150): features/effects.feature.
// "Animations is {string}" (s.animations) and "the camera zoom is N" (s.camera) come from map-presentation.steps.ts.
import { expect } from "vitest";
import { chimneyCount, loopingEffects, momentParticles, moments, momentsShown, snowing, type MomentInput, type MomentKind, type MomentNews } from "@ph/engine/domain/map-presentation";
import { steps } from "../src/registry.ts";

const { Given, When, Then } = steps("map-presentation");

const ME = 0;
const CAPITAL = 1;
const PROVINCES = 12;
const OUTBREAK = 2;

/** A day with nothing happening: every province held by realm 1, the same before and after. */
const quietDay = (): MomentInput => ({
  me: ME, capital: CAPITAL, heldBefore: new Array(PROVINCES).fill(1), heldAfter: new Array(PROVINCES).fill(1), news: [] as MomentNews[],
  plagueBefore: new Map(), plagueAfter: new Map(), outbreakStep: OUTBREAK,
});
const day = (s: Record<string, any>): MomentInput => (s.day ??= quietDay());
const work = (s: Record<string, any>) => (s.moments = moments(day(s)));

Given("province {int} is held by realm {int}", (s, p: number, n: number) => {
  s.province = p;
  (day(s).heldBefore as number[])[p] = n;
  (day(s).heldAfter as number[])[p] = n;
});
When("a played day leaves it occupied by realm {int}", (s, n: number) => {
  (day(s).heldAfter as number[])[s.province] = n;
  work(s);
});
Then("a {string} moment plays at province {int} in realm {int}'s colour", (s, kind: string, p: number, n: number) => {
  expect(s.moments).toContainEqual({ kind, province: p, nation: n });
});

Given("no snapshot before this one", (s) => {
  const d = day(s);
  d.heldBefore = null;
  (d.heldAfter as number[])[4] = 2;
});
When("the day's moments are worked out", (s) => void work(s));
Then("no moment plays", (s) => expect(s.moments).toEqual([]));

Given("the day's news says a work of the player's is finished at province {int}", (s, p: number) => {
  (day(s).news as MomentNews[]).push({ kind: "built", nations: [ME], province: p }, { kind: "built", nations: [3], province: p + 1 });
});
Given("the day's news says a rising begins at province {int}", (s, p: number) => {
  (day(s).news as MomentNews[]).push({ kind: "rebels", nations: [1], province: p, begins: true }, { kind: "rebels", nations: [1], province: p + 1 });
});
Given("the day's news says the player's realm learned an invention and passed a reform", (s) => {
  (day(s).news as MomentNews[]).push({ kind: "invention", nations: [ME] }, { kind: "reform", nations: [ME] }, { kind: "ruler", nations: [3] });
});
Then("a {string} moment plays at province {int}", (s, kind: string, p: number) => {
  expect(s.moments.filter((m: { kind: string }) => m.kind === kind).map((m: { province: number }) => m.province)).toEqual([p]);
});
Then("exactly one {string} moment plays, at the player's capital", (s, kind: string) => {
  expect(s.moments.filter((m: { kind: string }) => m.kind === kind)).toEqual([{ kind, province: CAPITAL, nation: ME }]);
});

Given("province {int} had a plague rumour", (s, p: number) => void (day(s).plagueBefore as Map<number, number>).set(p, OUTBREAK - 1));
When("a played day brings the outbreak there", (s) => {
  const d = day(s);
  for (const [p] of d.plagueBefore!) (d.plagueAfter as Map<number, number>).set(p, OUTBREAK);
  // A province already at outbreak plays nothing again.
  (d.plagueBefore as Map<number, number>).set(10, OUTBREAK);
  (d.plagueAfter as Map<number, number>).set(10, OUTBREAK);
  work(s);
});

When("a {string} moment plays", (s, kind: string) => void (s.particles = momentParticles(kind as MomentKind, s.animations)));
Then("it takes {int} particles", (s, n: number) => expect(s.particles).toBe(n));

Given("Battery saver is switched {word}", (s, b: string) => void (s.battery = b === "on"));
Then("the looping effects {word}", (s, run: string) => expect(loopingEffects(s.animations, s.battery)).toBe(run === "run"));

Then(/^moments (play|do not play)$/, (s, play: string) => expect(momentsShown(s.camera)).toBe(play === "play"));

Given("a town of {int} core cells", (s, n: number) => void (s.core = n));
Then("{int} chimneys smoke over it", (s, n: number) => expect(chimneyCount(s.core)).toBe(n));

Given("a province at {int} °C", (s, c: number) => void (s.celsius = c));
Then(/^snow (falls|does not fall)$/, (s, f: string) => expect(snowing(s.celsius)).toBe(f === "falls"));
