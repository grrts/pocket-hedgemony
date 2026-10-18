import { expect } from "vitest";
import { autoTurnsOffered, endTurnLabel, newAutoTurns, stopAuto, switchAuto, weekPlayed, type AutoStop } from "@ph/engine/domain/game-shell";
import { steps, type Scenario } from "../src/registry.ts";

// Auto turns (SHELL-159..161): the scenario plays the client's week loop
// around the rules, a week at a time.
const { Given, When, Then } = steps("game-shell");

function startWeek(s: Scenario): void {
  s.playing = true;
  s.paused = false;
  s.weeks = (s.weeks ?? 0) + 1;
}

function campaign(s: Scenario, on: boolean): void {
  s.auto = newAutoTurns();
  s.players = 1;
  s.playing = false;
  s.weeks = 0;
  s.blocked = null;
  if (on && switchAuto(s.auto, false).startWeek) startWeek(s);
}

Given("a single-player campaign with Auto turns off", (s) => campaign(s, false));
Given("a single-player campaign with Auto turns on", (s) => campaign(s, true));

Given("a campaign with {int} players", (s, n: number) => {
  s.players = n;
});

Then("Auto turns are not offered", (s) => {
  expect(autoTurnsOffered(s.players)).toBe(false);
});

When("the campaign is loaded again", (s) => {
  s.auto = newAutoTurns();
  s.playing = false;
});

When("the player taps Auto", (s) => {
  expect(autoTurnsOffered(s.players)).toBe(true);
  if (switchAuto(s.auto, s.playing).startWeek) startWeek(s);
});

Then("Auto turns are on", (s) => expect(s.auto.state).toBe("on"));
Then("Auto turns are off", (s) => expect(s.auto.state).toBe("off"));

Then("a week starts playing", (s) => {
  expect(s.playing).toBe(true);
  expect(s.weeks).toBe(1);
});

Given("a week is playing", (s) => {
  if (!s.playing) startWeek(s);
});

When("the week has played and its saves are written", (s) => {
  // Whatever paused the week has been answered or watched; it plays to its end.
  s.paused = false;
  s.playing = false;
  s.weeksBefore = s.weeks;
  if (weekPlayed(s.auto, s.blocked) === "next week") startWeek(s);
});

Then("the next week starts by itself", (s) => {
  expect(s.playing).toBe(true);
  expect(s.weeks).toBe(s.weeksBefore + 1);
});

Then("the week plays on", (s) => {
  expect(s.playing).toBe(true);
  expect(s.paused).toBe(false);
});

Then("End turn says {string}", (s, text: string) => {
  expect(endTurnLabel(s.auto)).toBe(text);
});

Then("no new week starts", (s) => {
  expect(s.playing).toBe(false);
  expect(s.weeks).toBe(s.weeksBefore);
});

Then("orders can be given", (s) => expect(s.playing).toBe(false));

Then("the week is paused", (s) => {
  expect(s.playing).toBe(true);
  expect(s.paused).toBe(true);
});

const STOPS: Record<string, AutoStop> = {
  "an event comes for the player": "event",
  "a battle of the player's begins": "battle",
  "a siege of the player's begins": "siege",
  "a war is declared on the player": "war",
  "a call to arms comes for the player": "call",
  "a peace offer comes for the player": "peace",
  "an envoy waits for the player's answer": "envoy",
  "beaten rebels wait for the player's verdict": "rebels",
  "the player's scholars have nothing to study": "study",
  "one of the player's armies ends its march": "arrived",
};

When(new RegExp(`^(${Object.keys(STOPS).join("|")}) during the week$`), (s, what: string) => {
  const why = STOPS[what]!;
  stopAuto(s.auto, why);
  // An event and a battle already make the week wait for the player (EVT-044, SHELL-148).
  s.paused = why === "event" || why === "battle";
});

Then("the week plays on to its end unless it already waits for the player", (s) => {
  expect(s.playing).toBe(true);
  expect(s.paused).toBe(s.auto.stop === "event" || s.auto.stop === "battle");
  expect(s.auto.state).toBe("stopping");
});

Given("land just taken waits for a decision", (s) => {
  s.blocked = "new lands";
});
