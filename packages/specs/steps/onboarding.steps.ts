import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, processTurn } from "@ph/engine";
import * as T from "@ph/engine/domain/onboarding";
import * as D from "@ph/engine/domain/diplomacy";
import * as M from "@ph/engine/domain/troop-movement";
import * as Shell from "@ph/engine/domain/game-shell";
import { realmConfig, type Lord } from "@ph/engine/domain/realm";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("onboarding");

const cfg = T.onboardingConfig;
const EN = cfg.strings.en as Record<string, string>;

// ---------------------------------------------------------------- helpers

function tutorial(s: Scenario): T.Tutorial {
  return (s.tut ??= T.startTutorial(T.newProgress()));
}
const lord = (name: string, loyalty: Lord["loyalty"], extra: Partial<Lord> = {}): Lord => ({ name, house: name, provinces: [], retinue: 300, wealth: 0, traits: [], loyalty, sons: [], ...extra });
const monthIndex = (month: string, year: number) => year * 12 + T.CHAPTERS.length * 0 + ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].indexOf(month);
function attention(s: Scenario): T.AttentionList {
  return (s.list ??= T.newAttentionList());
}

// ---------------------------------------------------------------- accessibility

Given("the UI scale is at its largest", (s) => {
  s.look = T.stepLook({ uiScale: "largest" });
});
Then("the tutorial note's text follows the UI scale", (s) => {
  expect(s.look.textScale).toBe("largest");
  expect(T.stepLook().textScale).toBe("default");
});
Then("the note may take up to two lines more", (s) => {
  expect(s.look.extraLines).toBe(2);
  expect(T.stepLook().extraLines).toBe(0);
});
Given("chapter 0's lens step", (s) => {
  s.lens = T.lensStep();
});
Then("it asks for the Food lens", (s) => {
  expect(s.lens.lens).toBe("Food");
});
Then("hungry provinces carry the hunger icon as well as a colour", (s) => {
  expect(s.lens.marks).toEqual(["colour", "hunger icon"]);
});
Given("reduced motion is on", (s) => {
  s.look = T.stepLook({ reducedMotion: true });
});
Then("the pointing hand doesn't bob", (s) => {
  expect(s.look.handBobs).toBe(false);
  expect(T.stepLook().handBobs).toBe(true);
});
Then("the spotlight doesn't pulse", (s) => {
  expect(s.look.spotlightPulses).toBe(false);
});
Then("the border clash in chapter 5 can be skipped to the result", () => {
  expect(T.battleView("Giurgiu", true).battleScreen).toBe(true);
  expect(T.battleSkippable()).toBe(true);
});
Given("a look step is shown", (s) => {
  s.run = T.showStep(0, 1);
  expect(s.run.step.kind).toBe("look");
});
When("the player waits for {int} minutes", (s, min: number) => {
  s.run = T.stepInput(s.run, { type: "idle", seconds: min * 60 });
});
Then("the step has not advanced", (s) => {
  expect(s.run.ended).toBe(false);
});
Given("a watch step is playing", (s) => {
  s.run = T.showStep(5, 0, { id: "ch5.watch_clash", kind: "watch", text: "", anchor: "battle", allow: [], done: "played out", guide_face: "vizier", max_chars: 140 });
});
Then("the player can pause it", (s) => {
  const r = T.stepInput(s.run, { type: "pause" });
  expect(r.paused).toBe(true);
  expect(r.ended).toBe(false);
});
Given("the step text key {string} translated into another language", (s, key: string) => {
  s.source = EN[key];
  // A translation (test data) that moves the token to the front, as a translator may.
  s.translated = "{ui:food_policy}: vos châteaux nourrissent les terres autour d'eux. Ouvrez-la.";
});
Then(/^the \{ui:food_policy\} token stays in the string where the translator put it$/, (s) => {
  expect(T.lintStepText(s.source, s.translated)).toEqual([]);
  const seg = T.resolveText(s.translated, { lastInput: "touch" });
  expect(seg[0]).toMatchObject({ kind: "screen", name: "Food policy", bold: true });
  expect(T.lintStepText(s.source, s.translated.replace("{ui:food_policy}", "la politique"))).toContain("tokens changed");
});
Then("the step length lint checks the translation against {int} characters", (s, n: number) => {
  expect(T.lintStepText(s.source, s.translated, n)).toEqual([]);
  const long = s.translated + " ".repeat(n);
  expect(T.lintStepText(s.source, long, n).some((e: string) => e.includes(`over ${n}`))).toBe(true);
});

// ---------------------------------------------------------------- the Almanac

When(/^the player opens the Almanac from (the pause menu|a linked word|a "Why\?")$/, (s, from: string) => {
  s.almanac = T.openAlmanac(from);
});
Then("the Almanac opens offline", (s) => {
  expect(s.almanac.offline).toBe(true);
});
When("the player opens the Almanac section {string}", (s, section: string) => {
  const ctx: T.AlmanacContext = { met: ["Ottomans", "Hungary"], eventsSeen: [T.SCRIPTED_EVENTS[0]!] };
  s.section = section;
  s.book = T.buildAlmanac(ctx);
});
const CONTENTS: Record<string, (s: Scenario) => void> = {
  "one page per system, matching the tutorial chapters": (s) => {
    const pages = s.book["How to play"];
    expect(pages.map((p: { chapter: number }) => p.chapter)).toEqual(T.CHAPTERS.filter((c) => c.topic).map((c) => c.n));
    for (const p of pages) expect(T.practiceThis(p.topic).chapter).toBe(p.chapter);
  },
  "one entry per stat with its gain and lose list and the screens that show it": (s) => {
    expect(s.book.Stats.map((x: { stat: string }) => x.stat)).toEqual(T.statKeys());
    for (const e of s.book.Stats) expect(e.gain.length + e.lose.length).toBeGreaterThan(0);
  },
  "each invention, what it needs and what it unlocks": (s) => {
    expect(s.book.Inventions.length).toBeGreaterThan(100);
    for (const i of s.book.Inventions) {
      expect(i.needs.length).toBeGreaterThan(0);
      expect(typeof i.unlocks).toBe("string");
    }
  },
  "the 22 tile types and what each does to troops, buildings and people": (s) => {
    expect(s.book.Ground).toHaveLength(22);
  },
  "every catalogue country met so far": (s) => {
    expect(s.book.Realms).toEqual(["Ottomans", "Hungary"]);
  },
  "the events fired in this campaign with their history block": (s) => {
    expect(s.book["Events seen"]).toHaveLength(1);
    expect(s.book["Events seen"][0].history.sources.length).toBeGreaterThan(0);
  },
};
Then(new RegExp(`^it holds (${Object.keys(CONTENTS).map((k) => k.replace(/[,]/g, ",")).join("|")})$`), (s, contents: string) => {
  CONTENTS[contents]!(s);
});
When("the player presses Practice this on the How to play page for food", (s) => {
  s.practice = T.practiceThis("food");
});
Then("the tutorial chapter {string} opens", (s, name: string) => {
  expect(s.practice.name).toBe(name);
  const t = T.startTutorial(T.newProgress());
  T.startChapter(t, s.practice.chapter);
  expect(t.loadedSave).toBe(T.chapterByName(name).n);
});
Given("the country {string} has not been met", (s, c: string) => {
  s.book = T.buildAlmanac({ met: ["Ottomans", "Hungary"].filter((x) => x !== c), eventsSeen: [] });
});
Then("the Almanac's Realms section does not show {string}", (s, c: string) => {
  expect(s.book.Realms).not.toContain(c);
  expect(T.buildAlmanac({ met: [c], eventsSeen: [] }).Realms).toContain(c);
});
Given("the player uses {string}", (s, what: string) => {
  s.uses = what;
});
When("the player searches the Almanac", (s) => {
  s.search = T.almanacSearch(s.uses);
});
Then(/^the search uses (.+)$/, (s, entry: string) => {
  expect(s.search).toBe(entry);
});
Given("the Almanac's Stats entry for the army food warning says {int} days", (s, days: number) => {
  expect(T.checkEntryNumber("army food low")).toBe(days);
});
When("a balance patch changes the config value", (s) => {
  s.patched = T.CHECKS.map((c) => (c.id === "army food low" ? { ...c, under_days: 10 } : c));
});
Then("the Almanac shows the new value without anyone rewriting it", (s) => {
  expect(T.checkEntryNumber("army food low", s.patched)).toBe(10);
  // The check itself follows the same number.
  expect(T.runChecks({ armies: [{ name: "Murad's army", place: "Edirne", reserveDays: 12 }] }, s.patched)).toEqual([]);
});
Then("the entry keeps the cards' parchment, ribbons and pixel icons", () => {
  expect(T.buildAlmanac({ met: [], eventsSeen: [] }).style).toEqual(["parchment", "ribbons", "pixel icons"]);
});
Given("the player has opened the Almanac page on castles but not the page on sieges", (s) => {
  s.opened = ["castles"];
  s.tips = [
    { text: "Castles feed the land around them.", entry: "castles" },
    { text: "A siege runs month by month.", entry: "sieges" },
  ];
});
When("a loading screen picks a tip", (s) => {
  s.tip = [0, 1, 2, 3].map((seed) => T.pickTip(s.tips, s.opened, seed));
});
Then("it prefers a tip linked to an unopened page such as sieges", (s) => {
  for (const t of s.tip) expect(t.entry).toBe("sieges");
});
Then("the tip links to its Almanac entry", (s) => {
  expect(s.tip[0].entry).toBe("sieges");
});

// ---------------------------------------------------------------- layers

Given(/^the player picked "I know the way"$/, (s) => {
  s.layers = { tutorial: false, goals: true };
});
Given("the player closed the goals list for good", (s) => {
  const g = T.newGoalsList({ hasLords: true });
  T.closeGoalsForGood(g);
  s.layers.goals = T.goalsVisible(g, 0);
});
Then("the Needs attention list is available", (s) => {
  expect(T.layers(s.layers)).toContain("Needs attention");
  expect(T.layers(s.layers)).not.toContain("guided first turns");
});
Then(/^every number has a tooltip and a "Why\?"$/, (s) => {
  expect(T.layers(s.layers)).toContain("tooltips and Why?");
  for (const stat of T.statKeys()) expect(T.why(stat, {}).almanac).toBe(`stats/${stat}`);
});
Then("the Almanac opens from the pause menu", (s) => {
  expect(T.layers(s.layers)).toContain("Almanac");
  expect(T.openAlmanac("the pause menu").offline).toBe(true);
});

// ---------------------------------------------------------------- guided first turns

Given("the player skipped the tutorial", (s) => {
  s.profile = { skippedTutorial: true, realCampaignsStarted: 0 };
});
Given("the player finished the tutorial and starts the first real campaign", (s) => {
  s.profile = { finishedTutorial: true, realCampaignsStarted: 0 };
});
When("the player starts a campaign", (s) => {
  s.goals = T.newGoalsList({ hasLords: true });
});
Then("the goals list sits under the top bar for the first in-game year", (s) => {
  expect(T.showsGoals(s.profile)).toBe(true);
  expect(T.goalsVisible(s.goals, 0)).toBe(true);
  expect(T.goalsVisible(s.goals, 11)).toBe(true);
  expect(T.goalsVisible(s.goals, 12)).toBe(false);
  expect(T.showsGoals({ finishedTutorial: true, realCampaignsStarted: 1 })).toBe(false);
});
Given("the goal {string} is open", (s, goal: string) => {
  s.goals = T.newGoalsList({ hasLords: true });
  s.goal = goal;
  expect(s.goals.goals.find((g: { goal: T.Goal }) => g.goal.text === goal)?.done).toBe(false);
});
const GOAL_ACTIONS: Record<string, T.GoalEvent> = {
  "the player opens the country card": { type: "opened", screen: "country_card" },
  "the player chooses a Food policy preset or setting": { type: "chosen", screen: "food_policy" },
  "the player opens the lords list": { type: "opened", screen: "lords_list" },
  "no royal province is without an official": { type: "royal provinces without official", count: 0 },
  "the player chooses an invention": { type: "chosen", screen: "research" },
  "the player opens the realms around them from the country card": { type: "opened", screen: "neighbours" },
  "the player presses End turn": { type: "pressed", screen: "end_turn" },
};
for (const [phrase, event] of Object.entries(GOAL_ACTIONS))
  When(phrase, (s) => {
    s.ticked = T.goalEvent(s.goals, event);
  });
Then("the goal {string} ticks off", (s, goal: string) => {
  expect(s.ticked).toEqual([goal]);
});
When("the player dismisses it", (s) => {
  s.ticked = T.goalEvent(s.goals, { type: "dismissed", goal: T.GOALS.find((g) => g.text === s.goal)!.id });
});
Then("the goal ticks off", (s) => {
  expect(s.ticked).toEqual([s.goal]);
  expect(T.goalEvent(T.newGoalsList({ hasLords: true }), { type: "dismissed", goal: "realm" })).toEqual([]);
});
When("the player folds the goals list", (s) => {
  s.goals = T.newGoalsList({ hasLords: true });
  T.goalEvent(s.goals, { type: "opened", screen: "country_card" });
  s.fold = T.foldGoals(s.goals);
});
Then("it shows a single icon with the count of open goals", (s) => {
  expect(s.fold).toMatchObject({ icon: true, count: 6 });
});
Then("it never covers the map", (s) => {
  expect(s.fold.coversMap).toBe(false);
});
Given("a campaign as the country {string}", (s, c: string) => {
  s.country = c;
});
When("the player presses Show me on {string}", (s, goal: string) => {
  s.showMe = T.showMe(goal);
});
Then("the matching tutorial steps run in this campaign", (s) => {
  expect(s.showMe.steps).toEqual(["ch3.open_food_policy"]);
  const run = T.showStep(3, 0, T.stepById(s.showMe.steps[0]));
  expect(run.step.done).toBe("screen_open(food_policy)");
});
Then("no tutorial scenario override is applied", (s) => {
  expect(s.showMe.scenarioOverrides).toBe(false);
});
Given("the player's realm has no lords", (s) => {
  s.goals = T.newGoalsList({ hasLords: false });
});
Then("the goal {string} is not listed", (s, goal: string) => {
  expect(s.goals.goals.map((g: { goal: T.Goal }) => g.goal.text)).not.toContain(goal);
  expect(T.newGoalsList({ hasLords: true }).goals.map((g) => g.goal.text)).toContain(goal);
});
When("the player closes the goals list for good from its menu", (s) => {
  s.goals = T.newGoalsList({ hasLords: true });
  T.closeGoalsForGood(s.goals);
});
Then("the goals list does not appear again in that campaign", (s) => {
  for (let m = 0; m < 12; m++) expect(T.goalsVisible(s.goals, m)).toBe(false);
});

// ---------------------------------------------------------------- inputs

Given("a step text {string}", (s, text: string) => {
  s.text = text;
});
Given("the player last used touch", (s) => {
  s.ctx = { lastInput: "touch" };
  s.before = T.resolveText(s.text, s.ctx);
});
When("the player picks up a controller mid-step and presses a button", (s) => {
  s.ctx = { ...s.ctx, lastInput: "controller", controller: "Xbox" };
  s.after = T.resolveText(s.text, s.ctx);
});
Then("the prompt swaps to the controller's confirm glyph at once", (s) => {
  expect(s.before[0]).toMatchObject({ kind: "prompt", action: "confirm", text: "Tap" });
  expect(s.after[0]).toMatchObject({ kind: "prompt", action: "confirm", text: "A / Cross", glyphs: "Xbox" });
  expect(s.after[1]).toEqual({ kind: "text", text: " to continue." });
});
Given("the player uses a {string} controller", (s, c: string) => {
  s.glyphs = T.glyphs(c);
});
Then("the prompts use the {string} glyphs", (s, g: string) => {
  expect(s.glyphs).toBe(g);
});
Given("the game runs on Steam with Steam Input", (s) => {
  s.glyphs = T.glyphs("Xbox", true);
});
Then("the prompts use Steam Input's own glyphs", (s) => {
  expect(s.glyphs).toBe("Steam Input's own glyphs");
});
Given("the player uses a controller", (s) => {
  s.ctx = { lastInput: "controller" };
});
When("a step that wants the Food policy button is shown", (s) => {
  s.step = T.stepById("ch3.open_food_policy");
  s.focus = T.controllerFocus(s.step);
});
Then("focus starts on the Food policy button", (s) => {
  expect(s.focus.focus).toBe("ui.country_card.food");
});
Then("the spotlight follows the focused element as the d-pad moves", (s) => {
  expect(T.controllerFocus(s.step, "ui.country_card.gold")).toEqual({ focus: "ui.country_card.gold", spotlight: "ui.country_card.gold" });
});
Given("any tutorial chapter", (s) => {
  s.all = T.CHAPTERS.flatMap((c) => T.chapterSteps(c.n));
  expect(s.all.length).toBeGreaterThan(0);
});
Then("no step asks the player to type text", (s) => {
  for (const st of s.all) expect(T.stepNeedsText(st)).toBe(false);
});
Given("the player starts chapter 0 using {string}", (s, input: string) => {
  s.script = T.chapter0Script(input);
});
Then("the chapter 0 script for {string} asks the player to try each camera action once", (s, input: string) => {
  expect(s.script.input).toBe(input);
  expect([...s.script.cameraSteps].sort()).toEqual([...cfg.camera_actions].sort());
  expect(new Set(s.script.cameraSteps).size).toBe(s.script.cameraSteps.length);
});

// ---------------------------------------------------------------- the Janissaries

Given("the Janissaries have joined the army in chapter 4", (s) => {
  s.dev = T.devshirme();
});
When(/^the step opens the Janissary regiment's card and the "Why\?" on its men$/, (s) => {
  s.line = s.dev.recruits_line;
});
Then("the recruits line reads {string}", (s, line: string) => {
  expect(s.line).toBe(line);
});
When("the player taps the recruits line", (s) => {
  s.camera = s.dev.camera_to;
});
Then("the camera moves to the Rumelian provinces the corps drew from", (s) => {
  expect(s.camera).toBe("the Rumelian provinces the corps drew from");
});
When("the devshirme vignette opens", (s) => {
  s.vignette = T.devshirme().vignette;
});
Then("it is marked depiction narrative_only", (s) => {
  expect(s.vignette.depiction).toBe("narrative_only");
});
Then(/^it has three panels: (.+), (.+), (.+)$/, (s, a: string, b: string, c: string) => {
  expect(s.vignette.panels).toEqual([a, b, c]);
});
Then(/^its only buttons are "Continue" and "Read more"$/, (s) => {
  expect(s.vignette.buttons).toEqual(["Continue", "Read more"]);
});
Then("no button gives the player anything", (s) => {
  expect(s.vignette.gives).toEqual([]);
});
When("the vignette closes", (s) => {
  s.lords = [lord("an Orthodox lord", "Loyal"), lord("another Orthodox lord", "Wavering")];
  s.card = T.devshirmeCost(s.lords);
});
Then("a Rumelian province's card opens", (s) => {
  expect(s.card).toBeDefined();
});
Then("its People line shows the boys taken", (s) => {
  expect(s.card.peopleLine).toBe("boys taken");
});
Then("its grievances show {string}", (s, g: string) => {
  expect(s.card.grievance).toBe(g);
});
Then("the province's Orthodox lords sit one step lower in loyalty", (s) => {
  expect(s.lords.map((l: Lord) => l.loyalty)).toEqual(["Wavering", "Disloyal"]);
});
Then("the vizier says {string}", (s, line: string) => {
  expect(T.devshirme().vizier_line).toBe(line);
  expect(EN["tut.ch4.vizier_devshirme"]).toBe(line);
});
When("the player presses {string}", (s, button: string) => {
  expect(T.devshirme().vignette.buttons).toContain(button);
  s.entry = T.devshirmeEntry();
});
Then("the Almanac's devshirme entry opens", (s) => {
  expect(s.entry).toBeDefined();
});
Then("its sources come from the catalogue's Ottoman record and standard histories, with no invented numbers", (s) => {
  expect(s.entry.sources).toEqual(["the catalogue's Ottoman record", "standard histories"]);
  expect(s.entry.numbers).toEqual([]);
});

// ---------------------------------------------------------------- measuring

Given(/^the player (has|has not) consented to measuring$/, (s, c: string) => {
  s.m = T.newMeasuring(c === "has");
});
When("the player skips step 3 of chapter 2", (s) => {
  const t = T.startTutorial(T.newProgress());
  T.startChapter(t, 2);
  T.tutorialInput(t, { type: "skip step" });
  for (const e of t.events) if (e.type === "StepSkipped") T.measure(s.m, "step skipped", 0);
});
Then(/^one event "step skipped" is sent and nothing else$/, (s) => {
  expect(s.m.sent).toEqual([{ event: "step skipped", day: 0 }]);
});
Then("nothing is sent", (s) => {
  expect(s.m.sent).toEqual([]);
  expect(s.m.queue).toEqual([]);
});
const MEASURED: Record<string, string> = {
  "a tutorial step is reached": "step reached",
  "a tutorial step is finished": "step finished",
  "a Needs attention entry is followed": "entry followed",
  "a Needs attention kind is muted": "kind muted",
};
for (const [phrase, event] of Object.entries(MEASURED))
  When(phrase, (s) => {
    T.measure(s.m, event, 0);
  });
Then("one measuring event is sent", (s) => {
  expect(s.m.sent).toHaveLength(1);
});
Given("the player has consented and is offline", (s) => {
  s.m = T.newMeasuring(true, false);
});
Given("a measuring event was queued {int} days ago", (s, days: number) => {
  T.measure(s.m, "step reached", 100 - days);
  T.measure(s.m, "step finished", 100 - 2);
  s.today = 100;
});
When("the game goes online", (s) => {
  T.goOnline(s.m, s.today);
});
Then("that event has been dropped", (s) => {
  expect(s.m.sent.map((e: { event: string }) => e.event)).toEqual(["step finished"]);
});

// ---------------------------------------------------------------- Needs attention

const TURAHAN = cfg.scenario.overrides.lords.find((l) => l.house === "Turahan")!;
const CONDITIONS: [RegExp, (s: Scenario, ...a: string[]) => void][] = [
  [/^the local store of "(\w+)" will reach zero before the next harvest$/, (s, p) => ((s.facts.storesRunningOut ??= []).push({ province: p!, month: "March" }))],
  [/^Murad's army has (\d+) days of food in reserve$/, (s, d) => ((s.facts.armies ??= []).push({ name: "Murad's army", place: "Edirne", reserveDays: Number(d) }))],
  [/^the lord "([^"]+)" turns Wavering$/, (s, l) => ((s.facts.lords ??= []).push({ name: l!, loyalty: "Wavering", want: TURAHAN.want! }))],
  [/^the soldiers have not been paid for two months$/, (s) => (s.facts.monthsUnpaid = 2)],
  [/^gold will run out in under three months at this rate$/, (s) => (s.facts.gold = { monthsLeft: 2, emptyBy: "June" })],
  [/^(\d+) farmers are levied with the harvest three weeks away$/, (s, n) => (s.facts.leviedNearHarvest = { farmers: Number(n), weeks: 3 })],
  [/^grievances in "(\w+)" pass the rising threshold$/, (s, p) => ((s.facts.risingTalk ??= []).push(p!))],
  [/^the royal province "(\w+)" has no official$/, (s, p) => ((s.facts.royalWithoutOfficial ??= []).push(p!))],
  [/^a neighbour's lord is disloyal and borders the realm$/, (s) => ((s.facts.disloyalBorderLords ??= []).push({ place: "Wallachia" }))],
  [/^the castle of "(\w+)" has more grain than it can hold$/, (s, c) => ((s.facts.surplus ??= []).push({ castle: c! }))],
];
for (const [re, fn] of CONDITIONS)
  Given(re, (s, ...a: string[]) => {
    s.facts ??= {};
    fn(s, ...a);
  });
When("the turn's simulation ends", (s) => {
  s.added = T.runAttention(attention(s), s.facts, 0);
});
Then(/^the Needs attention list has the (warning|opportunity) "(.*)"$/, (s, kind: string, line: string) => {
  expect(attention(s).entries.map((e) => [e.kind, e.line])).toContainEqual([kind, line]);
  // Nothing holds without the fact.
  expect(T.runChecks({})).toEqual([]);
});
const FIRSTS: Record<string, string> = { "a siege": "siege", "a plague": "plague", "the first invention of a new era": "new era invention", "a new age": "new age" };
Given(/^the campaign has not yet seen (a siege|a plague|the first invention of a new era|a new age)$/, (s, what: string) => {
  expect(attention(s).seen).not.toContain(FIRSTS[what]);
});
When(/^(a siege|a plague|the first invention of a new era|a new age) happens$/, (s, what: string) => {
  s.added = T.runAttention(attention(s), { firsts: [FIRSTS[what]!] }, 0);
  s.again = T.runAttention(attention(s), { firsts: [FIRSTS[what]!] }, 1);
});
Then("the Needs attention list has a new entry linked to its Almanac page", (s) => {
  expect(s.added).toHaveLength(1);
  expect(s.added[0].kind).toBe("new");
  expect(typeof s.added[0].almanac).toBe("string");
  expect(T.goThere(s.added[0]).screen).toBe(`almanac:${s.added[0].almanac}`);
  expect(s.again).toEqual([]);
});
Given(/^the warning "([^"]+)" is listed$/, (s, line: string) => {
  const rising = /^Talk of rising in (\w+)\.$/.exec(line);
  const noOfficial = /^(\w+) pays half its taxes without an official\.$/.exec(line);
  s.facts = rising ? { risingTalk: [rising[1]] } : noOfficial ? { royalWithoutOfficial: [noOfficial[1]] } : {};
  T.runAttention(attention(s), s.facts, 0);
  s.entry = attention(s).entries.find((e) => e.line === line);
  expect(s.entry).toBeDefined();
});
When("the player presses Show", (s) => {
  s.go = T.show(s.entry);
});
Then("the camera moves to {string}", (s, place: string) => {
  expect(s.go).toEqual({ camera: place });
});
When("an official is placed in {string}", (s, p: string) => {
  s.facts.royalWithoutOfficial = s.facts.royalWithoutOfficial.filter((x: string) => x !== p);
  T.runAttention(attention(s), s.facts, 1);
});
Then("the warning leaves the list", (s) => {
  expect(attention(s).entries.map((e) => e.key)).not.toContain(s.entry.key);
});
Given("an entry of the kind {string} is listed", (s, kind: string) => {
  s.facts = { armies: [{ name: "Murad's army", place: "Edirne", reserveDays: 12 }] };
  T.runAttention(attention(s), s.facts, 0);
  s.entry = attention(s).entries.find((e) => e.check === kind);
  expect(s.entry).toBeDefined();
});
When(/^the player uses (.+) on the entry and picks "Don't list this kind again"$/, (s, gesture: string) => {
  const menu = T.entryMenu(gesture);
  expect(menu).toContain("Don't list this kind again");
  T.muteKind(attention(s), s.entry.check);
});
Then("entries of the kind {string} are no longer listed", (s, kind: string) => {
  expect(attention(s).entries.filter((e) => e.check === kind)).toEqual([]);
  T.runAttention(attention(s), s.facts, 1);
  expect(attention(s).entries.filter((e) => e.check === kind)).toEqual([]);
});
Given("the tutorial is running", (s) => {
  s.running = true;
  tutorial(s);
});
When(/^the check "army food reserve under (\d+) days" holds after the turn's simulation$/, (s, days: string) => {
  expect(T.check("army food low").under_days).toBe(Number(days));
  s.added = T.runAttention(attention(s), { armies: [{ name: "Murad's army", place: "Edirne", reserveDays: Number(days) - 3 }] }, 0);
});
Then("the vizier reads out the line in his note", (s) => {
  expect(T.vizierNotes(attention(s).entries, s.running)).toEqual(["Murad's army has twelve days of food left."]);
  expect(T.vizierNotes(attention(s).entries, false)).toEqual([]);
  expect(T.guideFace(false)).toBeNull();
});
Given("{int} warnings are on the list", (s, n: number) => {
  s.facts = { royalWithoutOfficial: ["Bursa", "Konya", "Ankara"].slice(0, n), disloyalBorderLords: [{ place: "Wallachia" }] };
  T.runAttention(attention(s), s.facts, 0);
});
Then("the End turn button shows the count {int}", (s, n: number) => {
  expect(T.endTurnBadge(attention(s))).toBe(n);
});
Then("the turn report shows the line {string} that opens the list", (s, line: string) => {
  expect(T.turnReportAttention(attention(s))).toMatchObject({ links: "Needs attention", line });
});
Then("the turn report does not repeat the warnings", (s) => {
  expect(T.turnReportAttention(attention(s)).repeats).toBe(false);
});
Given(/^the famine warning for "(\w+)" was dismissed in (\w+) (\d+)$/, (s, p: string, month: string, year: string) => {
  s.facts = { storesRunningOut: [{ province: p, month: "March" }] };
  const m = monthIndex(month, Number(year));
  T.runAttention(attention(s), s.facts, m);
  T.dismiss(attention(s), `province bread:${p}`);
  s.dismissedAt = m;
});
Given(/^the famine check for "(\w+)" holds again in (\w+) (\d+)$/, (s, p: string, month: string, year: string) => {
  s.again = monthIndex(month, Number(year));
  expect(s.facts.storesRunningOut[0].province).toBe(p);
});
Then(/^the warning is not listed again before (\w+) (\d+)$/, (s, month: string, year: string) => {
  const until = monthIndex(month, Number(year));
  for (let m = s.again; m < until; m++) {
    T.runAttention(attention(s), s.facts, m);
    expect(attention(s).entries).toEqual([]);
  }
  T.runAttention(attention(s), s.facts, until);
  expect(attention(s).entries.map((e) => e.check)).toEqual(["province bread"]);
});
Given("a new system design lists its warnings and first-time moments", (s) => {
  s.newChecks = [{ id: "fleet in danger", kind: "warning", line: "A fleet is in danger.", source: "Naval", go: "place" }] as T.Check[];
});
Then("those checks are added to the one checks config file", (s) => {
  const all = T.addSystemChecks(T.CHECKS, s.newChecks);
  expect(all).toHaveLength(T.CHECKS.length + 1);
  expect(() => T.addSystemChecks(all, s.newChecks)).toThrow();
});

// ---------------------------------------------------------------- off script

Given(/^the player's army lost the border clash at "Giurgiu"$/, (s) => {
  s.stepText = T.clashStepText(false);
});
Then("the step reads {string}", (s, text: string) => {
  expect(s.stepText).toBe(text);
});
When(/^the country "Hungary" fails to take one castle in two months$/, (s) => {
  s.terms = T.hungaryOffersTerms(2);
  expect(T.hungaryOffersTerms(1)).toBe(false);
});
Then("Hungary offers terms", (s) => {
  expect(s.terms).toBe(true);
});
Then("chapter 5 ends in peace", () => {
  expect(T.chapterDoneWhen(5, new Set(["peace signed"]))).toBe(true);
});
Given("a do step is shown", (s) => {
  s.run = T.showStep(3, 0);
  expect(s.run.step.kind).toBe("do");
});
When("the player is idle for {int} seconds", (s, sec: number) => {
  s.before = T.stepInput(s.run, { type: "idle", seconds: sec - 1 });
  s.run = T.stepInput(s.run, { type: "idle", seconds: sec });
});
Then("the pointer pulses on the target again", (s) => {
  expect(s.run.pulse).toBe(true);
  expect(s.before.pulse).toBe(false);
  expect(s.run.stuckHint).toBe(false);
});
Then("the note adds {string}", (s, text: string) => {
  expect(s.run.stuckHint).toBe(true);
  expect(T.noteText(s.run).endsWith(text)).toBe(true);
  expect(T.noteText(s.before)).not.toContain(text);
});
Given("chapter 6 needs a minimum of gold at its start", (s) => {
  s.minimum = 100;
});
Given("the player has less than that minimum", (s) => {
  s.gold = 40;
});
When("chapter 6 starts", (s) => {
  s.loan = T.chapterStartLoan(s.minimum, s.gold, 0);
  s.loan2 = T.chapterStartLoan(s.minimum, s.gold, 1);
});
Then("a scripted loan from a Genoese or Venetian banking house fills the gap", (s) => {
  expect(s.loan).toMatchObject({ lender: "a Genoese banking house", amount: 60 });
  expect(s.loan2.lender).toBe("a Venetian banking house");
  expect(T.chapterStartLoan(100, 120, 0)).toBeNull();
});
Then("it is shown as a real debt line", (s) => {
  expect(s.loan.debtLine).toBe(true);
});
Given("the storm of the Hexamilion has failed", (s) => {
  s.siege = { breached: false, moreaOffersTerms: false };
});
Then("the siege carries on month by month", (s) => {
  expect(T.siegeMonth(s.siege)).toBe("carries on");
});
Then("the chapter ends when the wall is breached or the Morea offers terms", () => {
  expect(T.siegeMonth({ breached: true, moreaOffersTerms: false })).toBe("chapter ends");
  expect(T.siegeMonth({ breached: false, moreaOffersTerms: true })).toBe("chapter ends");
  expect(T.chapterDoneWhen(8, new Set(["Hexamilion fallen or terms agreed"]))).toBe(true);
});

// ---------------------------------------------------------------- pacing tools

Given(/^chapter 3 offers "Advance to the harvest, (\w+) (\d+)"$/, (s, month: string, year: string) => {
  expect(T.chapter(3).advance).toBe(true);
  s.target = { year: Number(year), month: monthIndex(month, 0) + 1 };
});
When("the player takes the Advance to… ribbon", (s) => {
  const w = createWorld(loadDefaultRuleset(), 7);
  s.world = w;
  s.adv = T.advanceTo(() => w.date, s.target, () => processTurn(w, [], 0));
});
Then(/^the turns run in a row until (\w+) (\d+)$/, (s, month: string, year: string) => {
  expect(s.world.date).toEqual({ year: Number(year), month: monthIndex(month, 0) + 1 });
  expect(s.adv.turns).toBe(s.adv.reports.length);
  expect(s.adv.turns).toBeGreaterThan(1);
});
Then("one combined turn report is shown", (s) => {
  expect(s.adv.combinedReports).toBe(1);
});
Given("the step {string} allows only {string} and {string}", (s, id: string, a: string, b: string) => {
  s.run = T.showStep(3, 0, T.stepById(id));
  expect(s.run.step.allow).toEqual([a, b]);
});
When("the player taps the levy button", (s) => {
  s.control = T.controlState(s.run, "ui.levy");
});
Then("nothing happens", (s) => {
  expect(s.control.responds).toBe(false);
  expect(T.controlState(s.run, "ui.country_card.food").responds).toBe(true);
});
Then("the levy button is dimmed, not hidden", (s) => {
  expect(s.control).toMatchObject({ dimmed: true, hidden: false });
});
Given("a do step with input focus is shown", (s) => {
  s.run = T.showStep(3, 0);
  expect(T.controlState(s.run, "ui.levy").responds).toBe(false);
});
When("the player presses Free look", (s) => {
  s.run = T.stepInput(s.run, { type: "free look" });
});
Then("every control responds for the rest of that step", (s) => {
  for (const c of ["ui.levy", "ui.lords", "camera", "ui.country_card.food"]) expect(T.controlState(s.run, c).responds).toBe(true);
  expect(s.run.ended).toBe(false);
});
Given(/^the AI country "(\w+)" wants a war "(against the Ottomans|in the Balkans)"$/, (s, country: string, target: string) => {
  s.war = target === "against the Ottomans" ? { attacker: country, target: "Ottomans" } : { attacker: country, target: "Bosnia", region: "the Balkans" };
});
Then("the war is held back", (s) => {
  expect(T.warHeldBack(s.war, s.running)).toBe(true);
  expect(T.warHeldBack(s.war, false)).toBe(false);
});
When("the crusaders' fleet reaches the Danube in chapter 4", (s) => {
  expect(T.SCRIPTED_EVENTS.find((e) => e.id === "tut_danube_fleet")!.chapter).toBe(4);
  s.war = { attacker: "Hungary", target: "Ottomans", scripted: true };
});
Then("the crusade war against the Ottomans goes on", (s) => {
  expect(T.warHeldBack(s.war, s.running)).toBe(false);
  expect(T.warHeldBack({ ...s.war, scripted: false }, s.running)).toBe(true);
});
When("the border clash at Giurgiu starts in chapter 5", (s) => {
  s.view = T.battleView("Giurgiu", true);
  expect(T.battleView("Varna", true).battleScreen).toBe(false);
});
Then("the battle screen opens", (s) => {
  expect(s.view.battleScreen).toBe(true);
});
Then("one bell plays every {int} seconds", (s, sec: number) => {
  expect(s.view.secondsPerBell).toBe(sec);
  expect(T.battleView("Kosovo", true).secondsPerBell).toBeNull();
});

// ---------------------------------------------------------------- skipping, leaving, returning

When("the player chooses to {string}", (s, action: string) => {
  const t = tutorial(s);
  T.startChapter(t, 0);
  s.before = { ...t.run! };
  if (action === "skip the step") T.tutorialInput(t, { type: "skip step" });
  else if (action === "skip this chapter") {
    expect(T.pauseMenuLines()).toContain("Skip this chapter");
    T.skipChapter(t);
  } else if (action === "leave the tutorial") s.left = T.leaveTutorial(t);
  else throw new Error(action);
});
Then("the next step is shown", (s) => {
  expect(s.tut.run.chapter).toBe(s.before.chapter);
  expect(s.tut.run.index).toBe(s.before.index + 1);
  expect(s.tut.events.at(-2)).toMatchObject({ type: "StepSkipped" });
});
Then("the next chapter starts from its chapter save", (s) => {
  expect(s.tut.run.chapter).toBe(1);
  expect(s.tut.loadedSave).toBe(1);
});
Then("the player returns to the menu and nothing in the game is locked", (s) => {
  expect(s.tut.inMenu).toBe(true);
  expect(s.left.locked).toEqual([]);
  expect(s.tut.progress.current).not.toBeNull();
});
Given("the player is on step {int} of chapter {int}", (s, step: number, ch: number) => {
  const p = T.newProgress();
  p.current = { chapter: ch, step: step - 1 };
  s.stored = T.saveProgress(p);
});
When("the player closes the app and opens it again", (s) => {
  s.tut = T.startTutorial(T.loadProgress(s.stored));
});
Then("the tutorial resumes at step {int} of chapter {int}", (s, step: number, ch: number) => {
  expect(s.tut.run.chapter).toBe(ch);
  expect(s.tut.run.index).toBe(step - 1);
});
function chaptersDone(s: Scenario, a: number, b: number): void {
  s.profile = { progress: T.newProgress(), saves: ["campaign 1", "campaign 2"] };
  for (let n = a; n <= b; n++) T.markDone(s.profile.progress, n);
}
Given("chapters {int} to {int} are done", (s, a: number, b: number) => chaptersDone(s, a, b));
When("the player opens the chapter list in the main menu", (s) => {
  s.chapters = T.chapterList(s.profile.progress);
});
Then("chapters {int} to {int} show a tick", (s, a: number, b: number) => {
  for (const row of s.chapters) expect(row.tick).toBe(row.n >= a && row.n <= b);
});
Then("the player can start chapter {int}", (s, n: number) => {
  expect(s.chapters.find((r: { n: number }) => r.n === n).canStart).toBe(true);
  const t = T.startTutorial(s.profile.progress);
  T.startChapter(t, n);
  expect(t.run!.chapter).toBe(n);
});
Given(/^chapters (\d+) to (\d+) are done and the kind "([^"]+)" is muted$/, (s, a: string, b: string, kind: string) => {
  chaptersDone(s, Number(a), Number(b));
  s.profile.progress.muted.push(kind);
});
When("the player deletes every campaign save", (s) => {
  s.profile.saves = [];
});
Then("chapters {int} to {int} are still done", (s, a: number, b: number) => {
  expect(s.profile.saves).toEqual([]);
  expect(s.profile.progress.done).toEqual(Array.from({ length: b - a + 1 }, (_, i) => a + i));
});
Then("the kind {string} is still muted", (s, kind: string) => {
  expect(s.profile.progress.muted).toContain(kind);
  expect(T.newAttentionList(s.profile.progress.muted).muted).toContain(kind);
});
Given("chapter 9 is reached", (s) => {
  s.save = T.tutorialSave("tutorial");
  expect(T.chapter(9).done_when).toEqual(["keep playing or new campaign picked"]);
});
When(/^the player picks "Keep ruling the Ottomans"$/, (s) => {
  s.save = T.keepRuling(s.save);
});
Then("the tutorial save becomes a normal campaign save", (s) => {
  expect(s.save.kind).toBe("campaign");
});
Then("the quiet world lifts and scripted events stop", (s) => {
  expect(s.save.quietWorld).toBe(false);
  expect(s.save.scriptedEvents).toBe(false);
});
Then("the Needs attention list replaces the vizier's notes", (s) => {
  expect(s.save.advice).toBe("Needs attention");
});
Then(/^the save is marked "began as the tutorial" and is not ironman$/, (s) => {
  expect(s.save.beganAsTutorial).toBe(true);
  expect(s.save.ironman).toBe(false);
});
When("the first harvest is brought in", (s) => {
  s.save = T.tutorialSave("tutorial");
});
Then("no achievement unlocks", (s) => {
  expect(T.achievementsAllowed(s.save)).toBe(false);
  expect(T.achievementsAllowed(T.keepRuling(s.save))).toBe(false);
});

// ---------------------------------------------------------------- the step script

Given("the step {string} of kind {string}", (s, id: string, kind: string) => {
  s.step = T.stepById(id);
  expect(s.step.kind).toBe(kind);
});
Then("its text key {string} reads {string}", (s, key: string, text: string) => {
  expect(s.step.text).toBe(key);
  expect(EN[key]).toBe(text);
});
Then("its anchor is {string}", (s, a: string) => {
  expect(s.step.anchor).toBe(a);
});
Then("it ends when the screen {string} is open", (s, screen: string) => {
  const r = T.showStep(3, 0, s.step);
  expect(T.stepInput(r, { type: "condition", done: `screen_open(${screen})` }).ended).toBe(true);
  expect(T.stepInput(r, { type: "confirm" }).ended).toBe(false);
});
Then("its guide face is the vizier", (s) => {
  expect(s.step.guide_face).toBe("vizier");
});
Then("its text is at most {int} characters", (s, n: number) => {
  expect(s.step.max_chars).toBe(n);
  expect(T.lintStepText(EN[s.step.text]!, EN[s.step.text]!, n)).toEqual([]);
});
Given("a step of kind {string}", (s, kind: T.StepKind) => {
  s.step = { id: `test.${kind}`, kind, text: "", anchor: "x", allow: [], done: "screen_open(x)", guide_face: "vizier", max_chars: 140 };
  s.run = T.showStep(0, 0, s.step);
});
Then(/^it ends when the player presses \{btn:confirm\} or taps anywhere$/, (s) => {
  expect(T.stepInput(s.run, { type: "confirm" }).ended).toBe(true);
  expect(T.stepInput(s.run, { type: "tap", target: "anywhere" }).ended).toBe(true);
  expect(T.stepInput(s.run, { type: "idle", seconds: 600 }).ended).toBe(false);
});
Then("it ends when its condition is met, with no Next button", (s) => {
  expect(T.hasNextButton(s.step)).toBe(false);
  expect(T.stepInput(s.run, { type: "confirm" }).ended).toBe(false);
  expect(T.stepInput(s.run, { type: "condition", done: s.step.done }).ended).toBe(true);
});
Then("it ends when the player makes any choice, and the next step reacts to which", (s) => {
  const a = T.stepInput(s.run, { type: "choice", option: "Keep it Restricted" });
  const b = T.stepInput(s.run, { type: "choice", option: "Tolerate it" });
  expect(a.ended && b.ended).toBe(true);
  expect([a.lastChoice, b.lastChoice]).toEqual(["Keep it Restricted", "Tolerate it"]);
  expect(T.stepKind("choose").next_reacts).toBe(true);
});
Then("it ends when the turn or battle it plays ends", (s) => {
  expect(T.stepInput(s.run, { type: "confirm" }).ended).toBe(false);
  expect(T.stepInput(s.run, { type: "played out" }).ended).toBe(true);
});
Given("a step text with the token {string}", (s, token: string) => {
  s.seg = T.resolveText(token, { lastInput: "touch" })[0];
  s.segController = T.resolveText(token, { lastInput: "controller", controller: "PlayStation" })[0];
});
Then("the note shows the prompt for the player's current input", (s) => {
  expect(s.seg).toMatchObject({ kind: "prompt", text: "Tap" });
  expect(s.segController).toMatchObject({ kind: "prompt", text: "A / Cross", glyphs: "PlayStation" });
});
Then("the note shows the screen's name in bold with its icon", (s) => {
  expect(s.seg).toEqual({ kind: "screen", name: "Food policy", bold: true, icon: "food_policy" });
});
Then("the note shows the stat's icon and name, linked to its Almanac entry", (s) => {
  expect(s.seg).toEqual({ kind: "stat", name: "Gold", icon: "gold", link: "stats/gold" });
});
Then("the note shows the name {string}, linked, moving the camera there when tapped", (s, name: string) => {
  expect(s.seg).toEqual({ kind: "name", text: name, link: true, cameraTo: name });
});
Given(/^the step's target is (high|low) on the screen$/, (s, pos: string) => {
  s.note = T.notePlacement(pos === "high" ? 0.2 : 0.8);
});
Then("the note sits at the {word} edge", (s, edge: string) => {
  expect(s.note.edge).toBe(edge);
});
Then("it takes at most a third of the screen height", (s) => {
  expect(s.note.maxHeightShare).toBeCloseTo(1 / 3);
});
Given(/^the second of six steps of chapter 0 is shown on "(\w+)"$/, (s, place: string) => {
  expect(T.chapterSteps(0)).toHaveLength(6);
  s.run = T.showStep(0, 1);
  expect(s.run.step.anchor).toBe(`place.${place.toLowerCase()}`);
  s.look = T.stepLook();
});
Then("the rest of the screen is dimmed to {int} %, not black", (s, pct: number) => {
  expect(s.look.dim).toBe(pct / 100);
  expect(s.look.black).toBe(false);
});
Then("the note shows the face of the grand vizier Çandarlı Halil", (s) => {
  expect(s.look.face).toBe("the grand vizier Çandarlı Halil");
  expect(T.guideFace(true)).toBe("Çandarlı Halil");
});
Then("the counter reads {string}", (s, c: string) => {
  expect(T.stepCounter(s.run)).toBe(c);
});
When("the player opens the pause menu", (s) => {
  s.lines = T.pauseMenuLines();
});
Then(/^it shows the lines "Skip this chapter", "Chapter list" and "Leave the tutorial"$/, (s) => {
  expect(s.lines).toEqual(["Skip this chapter", "Chapter list", "Leave the tutorial"]);
});

// ---------------------------------------------------------------- tooltips and Why?

/** UI string table fixture: localisation owns the real text. */
const STRINGS = { "stat.gold.name": "Gold", "stat.gold.line": "Coin in the treasury." };
Given("the gold number on the country card", (s) => {
  s.stat = "gold";
});
When(/^the player uses (.+) on "(\w+)"$/, (s, gesture: string, input: "touch" | "mouse" | "controller") => {
  s.opened = T.numberGesture(input, gesture);
});
Then("a tooltip shows the stat's name and one line on what it is", (s) => {
  expect(s.opened).toBe("tooltip");
  expect(T.tooltip(s.stat, STRINGS)).toEqual({ name: "Gold", line: "Coin in the treasury." });
});
Then(/^"Why\?" shows the full gain and lose list with this month's numbers$/, (s) => {
  expect(s.opened).toBe("why");
  s.why = T.why(s.stat, { royal_taxes: 120, soldiers_pay: 80 });
  expect(s.why.gain.map((g: { cause: string }) => g.cause)).toEqual(realmConfig.stats.gold.gain);
  expect(s.why.lose.map((g: { cause: string }) => g.cause)).toEqual(realmConfig.stats.gold.lose);
  expect(s.why.gain.find((g: { cause: string }) => g.cause === "royal_taxes").amount).toBe(120);
  expect(s.why.lose.find((g: { cause: string }) => g.cause === "soldiers_pay").amount).toBe(80);
  expect(s.why.gain.length + s.why.lose.length).toBe(16);
});
Then("it links to the Almanac", (s) => {
  expect(s.why.almanac).toBe("stats/gold");
});
Given("a stat key without an Almanac entry in the UI string tables", (s) => {
  s.lintArgs = [["gold", "debt"], { ...STRINGS, "stat.debt.line": "What you owe." }, ["stats/gold"]];
});
When("the lint test runs", (s) => {
  s.lint = T.lintStats(...(s.lintArgs as [string[], Record<string, string>, string[]]));
});
Then("it fails", (s) => {
  expect(s.lint).toEqual(["debt: no Almanac entry"]);
});
Given("an event option text uses the term {string} twice", (s, term: string) => {
  s.term = term;
  s.pieces = T.linkTerms(`Call the ${term} now; a ${term} called late is no ${term}.`.replace(/ no levy\.$/, "."), { [term]: term });
});
Then("the first {string} has a dotted underline and opens its Almanac entry", (s, term: string) => {
  const linked = s.pieces.filter((p: T.Piece) => p.link);
  expect(linked).toEqual([{ text: term, link: term, dotted: true }]);
  expect(s.pieces.findIndex((p: T.Piece) => p.link)).toBe(1);
});
Then("the second {string} is plain text", (s, term: string) => {
  const plain = s.pieces.filter((p: T.Piece) => !p.link).map((p: T.Piece) => p.text).join("");
  expect(plain).toContain(term);
});
Given("the glossary file maps {string} and {string} in English", (s, a: string, b: string) => {
  s.glossary = { [a]: a, [b]: a };
});
When("a tooltip uses {string}", (s, word: string) => {
  s.pieces = T.linkTerms(`Your ${word} want land.`, s.glossary);
});
Then("{string} links to the Almanac entry for {string}", (s, word: string, entry: string) => {
  expect(s.pieces.find((p: T.Piece) => p.link)).toEqual({ text: word, link: entry, dotted: true });
});

// ---------------------------------------------------------------- the chapters

Given("the chapter {int} {string} is started from its own chapter save", (s, n: number, name: string) => {
  expect(T.chapter(n).name).toBe(name);
  s.tut = T.startTutorial(T.newProgress());
  T.startChapter(s.tut, n);
  expect(s.tut.loadedSave).toBe(n);
  s.n = n;
});
Given("the date is {}", (s, date: string) => {
  expect(T.chapter(s.n).date).toBe(date);
});
const DONE_WHEN: Record<string, string[]> = {
  'the player has opened the province card of "Edirne" and seen the Food and Faith lenses': ["province card of Edirne opened", "Food lens seen", "Faith lens seen"],
  'the event "Murad goes back to Manisa" is answered and the turn report is read': ["Manisa event answered", "turn report read"],
  "an official is placed and one wavering lord has been given his want, given a gift or left alone": ["official placed", "wavering lord handled"],
  'a Food policy preset is chosen, the harvest turn is played and one hungry province\'s "Why?" is opened': ["food policy preset chosen", "harvest turn played", "hungry province Why opened"],
  "an army of levies, lords' riders and Janissaries stands with a commander": ["army of levies, riders and Janissaries with a commander"],
  "peace is signed": ["peace signed"],
  "an invention is chosen and the player has seen the recruit pool shrink": ["invention chosen", "recruit pool shrink seen"],
  'the rising in "Edirne" ends by any means': ["rising ended"],
  "the Hexamilion falls or terms are agreed": ["Hexamilion fallen or terms agreed"],
  "the player picks to keep playing these Ottomans or to start a new campaign": ["keep playing or new campaign picked"],
};
for (const [phrase, happened] of Object.entries(DONE_WHEN))
  When(phrase, (s) => {
    const all = new Set(happened);
    // Each part is needed: without the last one the chapter is not done.
    if (happened.length > 1) expect(T.chapterDoneWhen(s.n, new Set(happened.slice(0, -1)))).toBe(false);
    expect(T.chapterDoneWhen(s.n, new Set())).toBe(false);
    if (T.chapterDoneWhen(s.n, all)) T.markDone(s.tut.progress, s.n);
  });
Then("the chapter {int} is marked done", (s, n: number) => {
  expect(s.tut.progress.done).toEqual([n]);
});
Then("the chapter list shows a tick on {string}", (s, name: string) => {
  const rows = T.chapterList(s.tut.progress);
  expect(rows.filter((r) => r.tick).map((r) => r.name)).toEqual([name]);
});
Given("the tutorial's scripted events", (s) => {
  s.events = T.SCRIPTED_EVENTS;
});
Then("the tutorial starts on 11 November 1444, the day after the battle of Varna", () => {
  expect(T.CHAPTERS.some((c) => c.name === "Varna")).toBe(false);
  expect(T.historicalDate("tutorial start")).toBe("11 November 1444");
  expect(T.tutorialStart().date).toBe("11 November 1444");
  expect(T.historicalDate("battle of Varna")).toBe("10 November 1444");
});
Then(/^Murad goes back to Manisa in (\w+ \d+)$/, (s, date: string) => {
  expect(T.historicalDate("Murad goes back to Manisa")).toBe(date);
  expect(s.events.find((e: T.ScriptedEvent) => e.id === "tut_murad_to_manisa").date).toBe(date);
});
Then(/^the crusaders' fleet is on the Danube in (summer \d+)$/, (s, date: string) => {
  expect(T.historicalDate("the crusaders' fleet on the Danube")).toBe(date);
  expect(s.events.find((e: T.ScriptedEvent) => e.id === "tut_danube_fleet").date).toBe(date);
});
Then(/^the storming of the Hexamilion comes in (\w+ \d+)$/, (s, date: string) => {
  expect(T.historicalDate("storming of the Hexamilion")).toBe(date);
});
Given("the player asked Murad to stay in chapter 1", (s) => {
  s.tut = T.startTutorial(T.newProgress());
  T.startChapter(s.tut, 1);
  s.off = T.offScript("Ask him to stay this winter", 1);
  s.world = { differed: true, chapterSave: s.tut.loadedSave };
});
Then("chapter 1 carries on from what happened, as a real campaign would", (s) => {
  // Nothing resets the world inside the chapter.
  T.tutorialInput(s.tut, { type: "confirm" });
  expect(s.tut.loadedSave).toBe(1);
  expect(s.off.murad).toBe("stays at Edirne as a commander");
});
When("the player starts chapter 2", (s) => {
  T.startChapter(s.tut, 2);
  s.card = T.openingCard(2, !!s.world?.differed);
});
Then("the world is back on its historical course", (s) => {
  expect(s.tut.loadedSave).toBe(2);
  expect(s.card.fromSave).toBe(2);
});
Then("the opening card of chapter 2 says so in one line", (s) => {
  expect(s.card.backOnCourseLine).toBe(true);
  expect(T.openingCard(2, false).backOnCourseLine).toBe(false);
});
Given("the scripted event {string}", (s, name: string) => {
  s.event = T.SCRIPTED_EVENTS.find((e) => e.name === name);
});
Then("it has the event tree's history block with sources", (s) => {
  expect(s.event.history.summary.length).toBeGreaterThan(0);
  expect(s.event.history.sources.length).toBeGreaterThan(0);
  for (const e of T.SCRIPTED_EVENTS) expect(e.history.sources.length).toBeGreaterThan(0);
});
When("the player starts the tutorial", (s) => {
  s.playable = T.playableChapters(s.uses);
});
Then("every chapter can be played", (s) => {
  expect(s.playable).toEqual(T.CHAPTERS.map((c) => c.n));
});
Given("the tutorial scenario file", (s) => {
  s.sc = cfg.scenario;
  s.o = T.scenarioOverrides();
});
Then("it starts from the normal 11 November 1444 setup", (s) => {
  expect(s.sc.base).toBe("the normal 11 November 1444 setup");
});
Then(/^the country "Ottomans" has Mehmed II, aged (\d+), as ruler, with Murad II retired at Manisa$/, (s, age: string) => {
  expect(T.tutorialStart()).toMatchObject({ ruler: "Mehmed II", rulerAge: Number(age), retired: "Murad II", retiredAt: "Manisa" });
  expect(cfg.tutorial_nation).toBe("Ottomans");
  // The catalogue already has this court: no ruler or heir override.
  expect("ruler" in s.o || "heir" in s.o).toBe(false);
});
Then("the crusade war is still open, with the league holding the Defend the faith aim", () => {
  expect(T.tutorialStart()).toMatchObject({ crusadeWarOpen: true, leagueAim: "Defend the faith", aimGrantedBy: "the start state" });
});
Then("Çandarlı Halil is grand vizier", (s) => {
  expect(s.o.grand_vizier).toBe("Çandarlı Halil");
});
Then("the Evrenos, Mihal and Turahan families are lords, one of them wavering", (s) => {
  expect(s.o.lords.map((l: { house: string }) => l.house)).toEqual(["Evrenos", "Mihal", "Turahan"]);
  expect(s.o.lords.filter((l: { loyalty: string }) => l.loyalty === "Wavering")).toHaveLength(1);
});
Then("one royal province in Anatolia has no official", (s) => {
  expect(s.o.royal_province_without_official.region).toBe("Anatolia");
});
Then("the Orthodox row of the Faith policy is Restricted", (s) => {
  expect(s.o.faith_policy.Orthodox).toBe("Restricted");
});
Then("the Christian sipahis have a lord card", (s) => {
  expect(s.o.lord_cards.map((l: { name: string }) => l.name)).toContain("the Christian sipahis");
});
Then("the seed is fixed", (s) => {
  expect(s.o.seed).toBe("fixed");
});
Given(/^a real campaign as the country "(\w+)" in (\d+)$/, (s) => {
  s.campaign = "real";
});
When("the month of June 1444 is played", (s) => {
  s.fired = T.SCRIPTED_EVENTS.filter((e) => e.date === "June 1444" || e.date.endsWith("1444")).filter((e) => T.mayFire(e, s.campaign));
});
Then("no event marked tutorial_only fires", (s) => {
  expect(s.fired).toEqual([]);
  expect(T.SCRIPTED_EVENTS.every((e) => e.tutorial_only)).toBe(true);
  expect(T.SCRIPTED_EVENTS.filter((e) => T.mayFire(e, "tutorial")).length).toBe(T.SCRIPTED_EVENTS.length);
});
Given("chapter {int} is played", (s, n: number) => {
  s.n = n;
});
Then(/^the country "Hungary" crosses the Danube at "Giurgiu" with Hunyadi commanding$/, (s) => {
  const h = T.forcedAi("Hungary") as { chapter: number; marches_on: string; commander: string };
  expect(h).toMatchObject({ chapter: s.n, marches_on: "Giurgiu", commander: "Hunyadi" });
});
Given("chapter 8 is played and the wall has fallen", (s) => {
  s.wall = true;
});
Then("the Morea accepts terms", (s) => {
  expect(T.moreaAcceptsTerms(s.wall)).toBe(true);
  expect(T.moreaAcceptsTerms(false)).toBe(false);
});

// ---------------------------------------------------------------- the Varna crusade

When("chapter 3's last turn is played", (s) => {
  s.n = 3;
  // The news comes at the end of chapter 3; the event itself opens chapter 4.
  expect(T.SCRIPTED_EVENTS.find((e) => e.id === "tut_danube_fleet")!.chapter).toBe(s.n + 1);
  s.news = T.danubeNewsLine();
});
Then(/^a crusading league against the country "(\w+)" is at war from the start, regardless of the usual threshold$/, (s, c: string) => {
  s.league = T.crusadeLeague();
  expect(s.league.against).toBe(c);
  expect(s.league.regardlessOfThreshold).toBe(true);
  expect(T.tutorialStart().crusadeWarOpen).toBe(true);
});
Then(/^its members are (.+)$/, (s, list: string) => {
  expect(s.league.members).toEqual([...list.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
});
Then("the news reads {string}", (s, line: string) => {
  expect(s.news).toBe(line);
});
Then(/^"(\w+)" and "(\w+)" send fleets$/, (s, a: string, b: string) => {
  expect(s.league.fleets).toEqual([a, b]);
});
Then("the country card shows {string}", (s, line: string) => {
  expect(s.league.line).toBe(line);
});
Given("the Orthodox in Ottoman border provinces are Restricted, not Persecuted", (s) => {
  expect(cfg.scenario.overrides.faith_policy.Orthodox).toBe("Restricted");
});
When("the player opens the crusade's war screen", (s) => {
  s.screen = T.crusadeWarScreen();
});
Then("the league's war aim is Defend the faith, held from the start state", (s) => {
  expect(s.screen).toMatchObject({ aim: "Defend the faith", cause: "the start state" });
});
Then("the war screen shows the aim and its cause", (s) => {
  expect(s.screen.aim && s.screen.cause).toBeTruthy();
});
Then("one linked line explains why this aim and not Take land", (s) => {
  expect(s.screen.whyNotTakeLand.linked).toBe(true);
});
When("the player taps the league member {string}", (s, member: string) => {
  const d = D.createDiplomacy("1444-11-11");
  for (const c of T.crusadeLeague().members) D.country(d, c).faith = c === "Wallachia" ? "Orthodox" : "Catholic";
  s.reasons = T.memberReasons(d, member, "Hungary");
  s.d = d;
});
Then("the member's reasons open on the same screen used for the player's own alliances", (s) => {
  expect(s.reasons.screen).toBe("alliance reasons");
});
Then(/^"Same faith" shows \+(\d+) between the Catholic members$/, (s, w: string) => {
  expect(s.reasons.entries.find((e: { name: string }) => e.name === "Same faith").weight).toBe(Number(w));
  expect(T.memberReasons(s.d, "Wallachia", "Hungary").entries.find((e) => e.name === "Same faith")).toBeUndefined();
});
function straitsWorld(fleetIn?: string): M.MoveWorld {
  const land = (id: string): M.Place => ({ id, terrain: "grassland", owner: "Ottomans", harbour: true });
  const w: M.MoveWorld = {
    date: { year: 1444, month: 10 },
    places: { Lapseki: land("Lapseki"), Gallipoli: land("Gallipoli"), Uskudar: land("Uskudar"), Rumelihisari: land("Rumelihisari"), Dardanelles: { id: "Dardanelles", terrain: "sea" }, Bosporus: { id: "Bosporus", terrain: "sea" } },
    neighbours: { Lapseki: ["Dardanelles"], Gallipoli: ["Dardanelles"], Uskudar: ["Bosporus"], Rumelihisari: ["Bosporus"], Dardanelles: ["Lapseki", "Gallipoli"], Bosporus: ["Uskudar", "Rumelihisari"] },
    relations: { wars: [["Venice", "Ottomans"]], alliances: [], passage: [], subjects: [] },
    movers: [],
    straits: [
      { a: "Lapseki", b: "Gallipoli", zone: "Dardanelles" },
      { a: "Uskudar", b: "Rumelihisari", zone: "Bosporus" },
    ],
  };
  if (fleetIn) w.movers.push({ id: "crusade fleet", kind: "fleet", owner: "Venice", place: fleetIn, route: [], progress: 0, greyed: [] });
  return w;
}
Given("the crusaders' fleet holds the Dardanelles", (s) => {
  s.w = straitsWorld("Dardanelles");
  s.army = M.newArmy("murad", "Ottomans", "Lapseki", 20000);
});
Then("the Dardanelles crossing shows as closed with the fleet's banner on it", (s) => {
  expect(T.straitCrossing(s.w, s.army, "Lapseki", "Gallipoli")).toEqual({ open: false, banner: "Venice", reason: "strait closed" });
  expect(T.straitCrossing(straitsWorld(), s.army, "Lapseki", "Gallipoli").open).toBe(true);
});
Given("chapter 0 is played and the Food lens has been seen", (s) => {
  s.run = T.showStep(0, 4);
  expect(s.run.step.lens).toBe("Food");
  s.run = T.stepInput(s.run, { type: "condition", done: "lens(Food)" });
  expect(s.run.ended).toBe(true);
});
When("the player switches to the Faith lens", (s) => {
  s.run = T.showStep(0, 5);
  s.stepText = T.noteText(s.run);
});
Then("Rumelia shows Orthodox under a Sunni realm", () => {
  expect(cfg.scenario.faith_lens).toMatchObject({ rumelia: "Orthodox", realm: "Sunni" });
});
Then("provinces where a community is {int} % or more are hatched", (s, pct: number) => {
  expect(T.faithLensHatched(pct / 100)).toBe(true);
  expect(T.faithLensHatched(pct / 100 - 0.01)).toBe(false);
});
Given("the league calls on the sultan's Christian subjects to rise", (s) => {
  s.sipahis = lord("the Christian sipahis", "Wavering", { retinue: 2000 });
  s.pious = [lord("a Pious Sunni lord", "Loyal", { traits: ["Pious"] })];
});
Given("the vizier opens the Faith policy screen at the Orthodox row, set to Restricted", (s) => {
  expect(cfg.scenario.overrides.faith_policy.Orthodox).toBe("Restricted");
});
When("the player chooses {string}", (s, choice: T.FaithChoice) => {
  s.choice = T.faithChoice(choice, s.sipahis, s.pious);
});
Then("the Christian sipahis are {string}", (s, loyalty: string) => {
  expect(s.choice.sipahis).toBe(loyalty);
});
Then(/^the faith tax (keeps paying for the war|ends)$/, (s, tax: string) => {
  expect(s.choice.faithTax).toBe(tax);
});
Then("the Christian sipahis do not bring their retinue when called", (s) => {
  expect(s.choice.retinue).toBe(0);
  expect(s.pious[0].loyalty).toBe("Loyal");
});
Then("the Christian sipahis' riders come to the Danube and Pious Sunni lords waver once", (s) => {
  expect(s.choice.retinue).toBe(2000);
  expect(s.pious[0].loyalty).toBe("Wavering");
});
When("the Faith policy screen is open in the tutorial", (s) => {
  s.persecute = T.persecuteOption(true);
});
Then("Persecute is dimmed", (s) => {
  expect(s.persecute).toMatchObject({ shown: true, dimmed: true });
  expect(T.persecuteOption(false).dimmed).toBe(false);
});
Then("its note says it would give every Orthodox neighbour the Defend the faith aim and the crusade would only grow", (s) => {
  expect(s.persecute.note).toContain("every Orthodox neighbour the Defend the faith aim");
  expect(s.persecute.note).toContain("the crusade would only grow");
});
Given("the Anatolian army of {int} men must reach Thrace", (s, men: number) => {
  s.army = M.newArmy("anatolia", "Ottomans", "Uskudar", men);
});
Given("the Dardanelles are closed by the crusaders' fleet", (s) => {
  s.w = straitsWorld("Dardanelles");
  expect(T.straitCrossing(s.w, { ...s.army, place: "Lapseki" }, "Lapseki", "Gallipoli").open).toBe(false);
});
When("the player sends the army over the Bosporus ferry", (s) => {
  s.crossing = T.straitCrossing(s.w, s.army, "Uskudar", "Rumelihisari");
});
Then("the crossing takes {int} days", (s, days: number) => {
  expect(s.crossing).toEqual({ open: true, days });
});
Given("the battle at {string} has been fought", (s, place: string) => {
  expect(place).toBe("Giurgiu");
  s.sipahis = lord("the Christian sipahis", "Wavering", { retinue: 2000 });
  s.report = T.clashReport({ won: true, choice: "Keep it Restricted", sipahis: s.sipahis, dead: { Ottomans: 1200, Hungary: 3400 } });
});
Then("the turn report shows the result together with the faith choice", (s) => {
  expect(s.report).toMatchObject({ result: "won", faithChoice: "Keep it Restricted" });
});
Then("it says how many Christian sipahis rode at Giurgiu, or why they stayed home", (s) => {
  expect(s.report).toMatchObject({ sipahisRode: 0, stayedHomeBecause: "Wavering" });
  const loyal = T.clashReport({ won: true, choice: "Tolerate it", sipahis: lord("the Christian sipahis", "Loyal", { retinue: 2000 }), dead: {} });
  expect(loyal).toMatchObject({ sipahisRode: 2000, stayedHomeBecause: null });
});
When("peace with {string} is signed", (s, c: string) => {
  expect(c).toBe("Hungary");
  s.after = T.afterClashPeace();
});
Then("the league's war ends", (s) => {
  expect(s.after.leagueWarEnds).toBe(true);
});
Then("the league ends with it", (s) => {
  expect(s.after.leagueEnds).toBe(true);
});
Then("the madrasa in {string} is Sunni", (s, p: string) => {
  expect(T.chapter6Faith().madrasa).toEqual({ province: p, faith: "Sunni" });
});
When("the step opens a Rumelian province's Faith line", (s) => {
  s.faith = T.chapter6Faith();
});
Then("the Orthodox community shows as {string}", (s, line: string) => {
  expect(s.faith.community).toBe("Orthodox");
  expect(s.faith.line).toBe(line);
});
Then(/^its "Why\?" links to the Almanac's religion page$/, (s) => {
  expect(s.faith.why_links_to).toBe("religion");
});
Then("the turn report counts the dead of both sides the same way", (s) => {
  expect(s.report.dead).toEqual([
    { side: "Ottomans", dead: 1200 },
    { side: "Hungary", dead: 3400 },
  ]);
});
Then("no step rewards harm", (s) => {
  expect(s.report.reward).toBeNull();
  expect(T.devshirme().vignette.gives).toEqual([]);
});

// ---------------------------------------------------------------- decisions of this pass (D-TUT-1 … D-TUT-15)

Given(/^a real campaign as the country "(\w+)"$/, (s) => {
  s.campaign = "real";
});
Given("there is one opportunity, one new system and one warning to list", (s) => {
  s.facts = { disloyalBorderLords: [{ place: "Wallachia" }], firsts: ["siege"], royalWithoutOfficial: ["Bursa"] };
});
When("the player opens the Needs attention list", (s) => {
  T.runAttention(attention(s), s.facts, 0);
  s.screen = T.attentionScreen(attention(s));
});
Then("the screen is titled {string}", (s, title: string) => {
  expect(s.screen.title).toBe(title);
});
Then("the group {string} holds the warning", (s, name: string) => {
  expect(s.screen.groups[0].name).toBe(name);
  expect(s.screen.groups[0].entries.map((e: T.Entry) => e.kind)).toEqual(["warning"]);
});
Then("the group {string} holds the opportunity, then the new entry", (s, name: string) => {
  expect(s.screen.groups[1].name).toBe(name);
  expect(s.screen.groups[1].entries.map((e: T.Entry) => e.kind)).toEqual(["opportunity", "new"]);
});
Then("each entry is one line with a Show button", (s) => {
  expect(s.screen.button).toBe("Show");
  for (const g of s.screen.groups) for (const e of g.entries as T.Entry[]) expect(e.line).not.toContain("\n");
});
Then("no advisor face or voice appears", (s) => {
  expect(T.guideFace(false)).toBeNull();
  expect(T.vizierNotes(attention(s).entries, false)).toEqual([]);
});
When(/^the player picks "Mute this" on the entry$/, (s) => {
  expect(T.entryMenu("a long-press")).toEqual(["Mute this", "Don't list this kind again"]);
  T.muteItem(attention(s), s.entry.key);
});
Then(/^entries of the kind "([^"]+)" for other provinces are still listed$/, (s, kind: string) => {
  s.facts.royalWithoutOfficial = ["Bursa", "Konya"];
  T.runAttention(attention(s), s.facts, 1);
  expect(attention(s).entries.filter((e) => e.check === kind).map((e) => e.place)).toEqual(["Konya"]);
});
Then("the mute can be undone in Settings", (s) => {
  T.unmute(attention(s), s.entry.key);
  T.runAttention(attention(s), s.facts, 2);
  expect(attention(s).entries.map((e) => e.key)).toContain(s.entry.key);
});

// off script stays inside its chapter (D-TUT-3)
Given(/^the player picked "([^"]+)" on the event "([^"]+)"$/, (s, option: string, event: string) => {
  const e = T.SCRIPTED_EVENTS.find((x) => x.name === event)!;
  expect(e.options).toContain(option);
  s.tut = T.startTutorial(T.newProgress());
  T.startChapter(s.tut, e.chapter);
  s.off = T.offScript(option as "Ask him to stay this winter", e.chapter);
  s.world = { differed: option !== e.options![0] };
});
Then("Murad stays at Edirne as a commander until the end of chapter 1", (s) => {
  expect(s.off).toMatchObject({ chapter: 1, murad: "stays at Edirne as a commander", until: "the end of chapter 1" });
});
Then("chapter 2 starts from its chapter save with Murad at Manisa", (s) => {
  expect(s.tut.loadedSave).toBe(2);
  expect(s.card.fromSave).toBe(2);
  expect(s.off.carriesOver).toBe(false);
  expect(T.tutorialStart().retiredAt).toBe("Manisa");
});
Given("the player left the wavering lord alone in chapter 2", (s) => {
  s.tut = T.startTutorial(T.newProgress());
  T.startChapter(s.tut, 2);
  s.off = T.offScript("ignored lord", 2);
});
Then("his loyalty drops one step within chapter 2", (s) => {
  expect(s.off.loyaltyStepsDown).toBe(1);
  expect(T.stepDown("Wavering")).toBe("Disloyal");
});
When("the player starts chapter 7", (s) => {
  T.startChapter(s.tut, 7);
});
Then("chapter 7 starts from its chapter save and nothing carries over", (s) => {
  expect(s.tut.loadedSave).toBe(7);
  expect(s.off.carriesOver).toBe(false);
});

// Ottoman worked examples (D-TUT-11)
Given("the recruiting, battle and siege lessons", (s) => {
  s.examples = T.ottomanExamples();
});
Then("their numbers come from the Ottoman set", (s, table: string[][]) => {
  expect(Object.entries(s.examples).map(([k, v]) => [k, String(v)])).toEqual(table);
  expect(cfg._provisional).toContain("ottoman_examples");
});

// first launch (D-TUT-5, the game shell's question)
Given("the game is launched for the first time", (s) => {
  s.sh = Shell.newShell();
});
When("the player taps to start for the first time", (s) => {
  s.q = Shell.firstLaunchQuestion({ asked: false, campaignExists: false });
  expect(Shell.firstLaunchQuestion({ asked: true, campaignExists: false })).toBeNull();
});
Then("the game asks {string}", (s, q: string) => {
  expect(s.q.question).toBe(q);
  expect(s.q.focus).toBe("Play the tutorial");
});
When(/^the player picks "(Play the tutorial|Guided campaign|I know the way)"$/, (s, choice: string) => {
  s.answer = Shell.answerFirstLaunch(s.sh, choice as Shell.FirstLaunchChoice);
});
Then("the tutorial starts at chapter 0", (s) => {
  expect(s.answer).toEqual({ opens: "tutorial chapter 0", guidedTurns: false });
});
Then("a normal campaign starts with guided first turns", (s) => {
  expect(s.answer).toEqual({ opens: "new_campaign", guidedTurns: true });
});
Then("a normal campaign starts", (s) => {
  expect(s.answer).toEqual({ opens: "new_campaign", guidedTurns: false });
});

// inputs (D-TUT-12)
When("the player does {string} on {string}", (s, action: string, input: T.Input) => {
  s.how = T.tutorialAction(action, input);
});
Then(/^the game takes it as (.+)$/, (s, how: string) => {
  expect(s.how).toBe(how);
  if (how.startsWith("holding")) expect(T.controllerHolds()).toEqual({ skip_step_seconds: 1, end_turn_seconds: 0.5 });
});

// sounds (D-TUT-7)
When(/^(a step appears|a step is finished|a new warning joins the Needs attention list)$/, (s, moment: string) => {
  if (moment === "a step appears") s.snd = T.onboardingSound("step shown");
  else if (moment === "a step is finished") s.snd = T.onboardingSound("step finished");
  else {
    const added = T.runAttention(attention(s), { royalWithoutOfficial: ["Bursa"] }, 0);
    s.snd = { sound: T.newEntriesSound(added), ducksMusic: false };
    expect(T.newEntriesSound(T.runAttention(T.newAttentionList(), { disloyalBorderLords: [{ place: "Wallachia" }] }, 0))).toBeNull();
  }
});
Then("the sound {string} plays", (s, sound: string) => {
  expect(s.snd.sound).toBe(sound);
});
Then("music is not ducked", (s) => {
  expect(s.snd.ducksMusic).toBe(false);
  expect(T.onboardingSound("vizier note").sound).toBeNull();
});
When("a step is shown", (s) => {
  s.run = T.showStep(0, 0);
});
Then("the face on the note is labelled {string}", (s, label: string) => {
  expect(T.guideFaceLabel()).toBe(label);
  expect(T.guideFace(true)).toBe("Çandarlı Halil");
});

// settings switches (D-TUT-13)
Given(/^the setting "(Detailed tooltips|Tutorial hints)" is (on|off)$/, (s, _name: string, v: string) => {
  s.settingOn = v === "on";
});
When("the player opens the tooltip of the gold number on the country card", (s) => {
  s.tip = T.detailedTooltip("gold", STRINGS, { royal_taxes: 120 }, s.settingOn);
});
Then("the tooltip shows the stat's name and one line", (s) => {
  expect(s.tip).toMatchObject({ name: "Gold", line: "Coin in the treasury." });
});
Then(/^the tooltip (does not show|also shows) the "Why\?" list$/, (s, how: string) => {
  if (how === "also shows") expect(s.tip.why.almanac).toBe("stats/gold");
  else expect(s.tip.why).toBeNull();
  expect(T.detailedTooltip("gold", STRINGS, {}).why).toBeNull();
});
Given("a player who skipped the tutorial starts a campaign", (s) => {
  expect(T.showsGoals({ skippedTutorial: true, realCampaignsStarted: 0 })).toBe(true);
  s.goals = T.newGoalsList({ hasLords: true });
});
Then(/^the goals list is (shown|not shown)$/, (s, shown: string) => {
  expect(T.goalsVisible(s.goals, 0, s.settingOn)).toBe(shown === "shown");
  expect(T.goalsVisible(s.goals, 0)).toBe(true);
});
