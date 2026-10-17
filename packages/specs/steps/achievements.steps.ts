import { expect } from "vitest";
import { steps, type Scenario } from "../src/registry.ts";
import { loadDefaultRuleset } from "@ph/rules";
import * as A from "@ph/engine/domain/achievements";

const { Given, When, Then } = steps("achievements");

// ---------------------------------------------------------------- helpers

const START = "1444-11-11";

function campaign(s: Scenario): A.CampaignAchievements {
  // Scenarios that say nothing about eligibility play an unbroken ironman campaign.
  return (s.c ??= A.newCampaign({ ironman: true }));
}
function profile(s: Scenario): A.Profile {
  return (s.p ??= A.newProfile());
}
function catalogue(s: Scenario): A.Catalogue {
  return (s.cat ??= A.launchCatalogue());
}
function stores(s: Scenario): Record<A.Store, A.StoreState> {
  return (s.stores ??= Object.fromEntries(A.STORES.map((st) => [st, { reachable: true, unlocked: [], hidden: [] }])) as unknown as Record<A.Store, A.StoreState>);
}
function facts(s: Scenario): A.Facts {
  return (s.facts ??= {});
}
function def(id: string): A.AchievementDefinition {
  return A.definition(id);
}
/** Runs a moment and remembers what ran and unlocked. */
function occur(s: Scenario, moment: string, f: A.Facts = facts(s), date: string = s.date ?? (typeof f.date === "string" ? f.date : START), place?: string): A.Evaluation {
  s.last = A.evaluate(catalogue(s), campaign(s), profile(s), moment, f, date, place);
  s.unlocks = [...(s.unlocks ?? []), ...s.last.unlocked];
  s.evaluated = true;
  return s.last;
}
/** Makes an achievement unlock the way the game does: its moment, with facts that meet its test. */
function earn(s: Scenario, id: string, place?: string): A.Evaluation {
  const d = def(id);
  const e = occur(s, d.on, A.factsMeeting(d.test), d.on === "date" ? String(d.test.date) : START, place);
  s.toast = A.toastFor(d, s.settings ?? { toasts: true }, s.open ?? null);
  return e;
}
const earnedIds = (s: Scenario): string[] => (s.unlocks ?? []).map((u: A.AchievementUnlocked) => u.id);

/** Parses a test as the feature writes it: a YAML flow map such as `{a: 1, b: {c: d}}`. */
function parseFlow(text: string): A.Test {
  let i = 0;
  const ws = () => {
    while (text[i] === " ") i++;
  };
  const scalar = (raw: string): A.TestValue => {
    const v = raw.trim();
    if (v === "true") return true;
    if (v === "false") return false;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  };
  const value = (): A.TestValue => {
    ws();
    if (text[i] === "{") return map();
    const start = i;
    while (i < text.length && text[i] !== "," && text[i] !== "}") i++;
    return scalar(text.slice(start, i));
  };
  const map = (): { [k: string]: A.TestValue } => {
    const out: { [k: string]: A.TestValue } = {};
    i++; // {
    for (;;) {
      ws();
      if (text[i] === "}") {
        i++;
        return out;
      }
      const colon = text.indexOf(":", i);
      const key = text.slice(i, colon).trim();
      i = colon + 1;
      out[key] = value();
      ws();
      if (text[i] === ",") i++;
    }
  };
  ws();
  return map() as A.Test;
}

// ---------------------------------------------------------------- eligibility

Given("the campaign was started as ironman and has never left it", (s) => {
  s.c = A.newCampaign({ ironman: true, realm: "France" });
});
Given("the campaign is ironman and has never left ironman", (s) => {
  s.c = A.newCampaign({ ironman: true });
});
Given("the campaign's difficulty is {string}", (s, d: string) => {
  campaign(s).difficulty = d;
});
Given("the campaign uses {string} events", (s, e: "historical" | "free") => {
  campaign(s).events = e;
});
Given("the campaign is not cheat-marked", (s) => {
  expect(campaign(s).flags.cheat_marked).toBe(false);
});
Given("the player still plays the realm they started with", (s) => {
  expect(campaign(s).flags.switched_country).toBe(false);
});
Given("the campaign was started without ironman", (s) => {
  s.c = A.newCampaign({ ironman: false });
});
Given("the player is playing the tutorial {string}", (s, _name: string) => {
  s.c = A.newCampaign({ ironman: false, tutorial: true });
});
Given("a new ironman campaign is started", (s) => {
  s.c = A.newCampaign({ ironman: true });
});

const FIRST_TIME: Record<string, A.Facts> = { harvest: { harvests_seen: 1 } };
When("the moment {string} occurs for the first time", (s, moment: string) => {
  occur(s, moment, { ...FIRST_TIME[moment] });
});

Then("the achievement {string} unlocks", (s, id: string) => {
  if (!s.evaluated) {
    // Said as an action ("When the achievement … unlocks"): it happens in play.
    earn(s, id);
    return;
  }
  expect(earnedIds(s)).toContain(id);
});
Then("no achievement unlocks", (s) => {
  expect(s.last.unlocked).toEqual([]);
});
Then("the campaign can never earn achievements", (s) => {
  const c = campaign(s);
  expect(c.flags.ironman_unbroken).toBe(false);
  expect(A.eligible(c)).toBe(false);
  // Nothing turns it back on: a later moment still earns nothing.
  expect(occur(s, "turn_end", { turns_played: 12 }).unlocked).toEqual([]);
});

When("the player uses a {string} cheat once", (s, cheat: A.Cheat) => {
  s.lost = A.useCheat(campaign(s), cheat);
});
Then("the save is cheat-marked for good", (s) => {
  const c = campaign(s);
  expect(c.flags.cheat_marked).toBe(true);
  expect(s.lost.flag).toBe("cheat_marked");
  expect(A.eligible(c)).toBe(false);
});
Then("no achievement unlocks from that save, in-game or on any store", (s) => {
  const e = occur(s, "harvest", { harvests_seen: 1 });
  expect(e.unlocked).toEqual([]);
  expect(campaign(s).earned).toEqual({});
  expect(profile(s).unlocked).toEqual({});
  expect(profile(s).queue).toEqual([]);
  A.startUp(profile(s), stores(s));
  for (const st of A.STORES) expect(stores(s)[st].unlocked).toEqual([]);
});

Given("the player's realm {string} has been annexed and the game is over", (s, realm: string) => {
  campaign(s).realm = realm;
  // France played some years before the end: its first harvest was earned then.
  occur(s, "harvest", { harvests_seen: 1 });
  s.before = { ...profile(s).unlocked };
  expect(Object.keys(s.before)).toContain("first_harvest");
});
When("the player plays on as the country {string}", (s, country: string) => {
  s.lost = A.switchCountry(campaign(s), country);
});
Then("no achievement unlocks from that moment on", (s) => {
  expect(occur(s, "turn_end", { turns_played: 12, gold: 10000 }).unlocked).toEqual([]);
  expect(occur(s, "regiment_trained", { regiments_trained: 1 }).unlocked).toEqual([]);
});
Then("achievements earned before the switch are kept", (s) => {
  expect(profile(s).unlocked).toEqual(s.before);
});

Then("its save has the flag {string} set to {word}", (s, flag: A.Flag, value: string) => {
  expect(campaign(s).flags[flag]).toBe(value === "true");
});

Given("the player has {int} distinct realms played for 10 years in the profile", (s, n: number) => {
  profile(s).lifetime.distinct_realms_played_10_years = Array.from({ length: n }, (_, i) => `realm_${i + 1}`);
});
Given("the campaign as the country {string} is cheat-marked", (s, realm: string) => {
  s.c = A.newCampaign({ ironman: true, realm });
  A.useCheat(s.c, "debug");
});
When("the country {string} completes 10 years of play", (s, realm: string) => {
  A.countLifetime(profile(s), campaign(s), "distinct_realms_played_10_years", realm);
});
Then(/^the lifetime counter "([^"]*)" (?:stays at|reaches) (\d+)$/, (s, counter: string, n: string) => {
  expect(profile(s).lifetime[counter]?.length ?? 0).toBe(Number(n));
});

Given("the campaign is an unbroken ironman campaign", (s) => {
  s.c = A.newCampaign({ ironman: true });
});
Given("the campaign is cheat-marked", (s) => {
  s.c = A.newCampaign({ ironman: true });
  A.useCheat(s.c, "editor");
});
Given("the campaign is about to start without ironman", (s) => {
  s.c = A.newCampaign({ ironman: false });
});
When("the player opens the {string}", (s, screen: string) => {
  s.screen = screen;
  s.line = A.eligibilityLine(campaign(s));
});
Then("the screen shows that the campaign {word} earn achievements", (s, can: string) => {
  expect(["pause menu", "new game screen"]).toContain(s.screen);
  expect(s.line).toBe(`${can} earn achievements`);
});

Given("the campaign is eligible for achievements", (s) => {
  s.c = A.newCampaign({ ironman: true });
  expect(A.eligible(s.c)).toBe(true);
});
When("the player chooses to {string}", (s, action: A.EndingAction) => {
  s.action = action;
  s.ask = A.askEndingAction(campaign(s), action, false);
});
Then("the game warns once that achievements end for this campaign", (s) => {
  expect(s.ask.warning).toMatch(/Achievements end/);
  // Asking again does not warn a second time.
  expect(A.askEndingAction(campaign(s), s.action, false).warning).toBeNull();
});
Then("the action only goes ahead after the player confirms", (s) => {
  const c = campaign(s);
  expect(s.ask.proceeds).toBe(false);
  expect(A.eligible(c)).toBe(true);
  const go = A.askEndingAction(c, s.action, true);
  expect(go.proceeds).toBe(true);
  if (s.action === "turn on a cheat") A.useCheat(c, "free play");
  else A.switchCountry(c, "Burgundy");
  expect(A.eligible(c)).toBe(false);
});

// ---------------------------------------------------------------- list rules

Given("the achievement {string} has unlocked", (s, id: string) => {
  const d = def(id);
  s.facts = A.factsMeeting(d.test);
  s.factsBefore = structuredClone(s.facts);
  occur(s, d.on, s.facts);
  expect(earnedIds(s)).toContain(id);
});
Then("the country gains no bonus, no unlocked nation and no cosmetic", (s) => {
  const u: A.AchievementUnlocked = s.last.unlocked[0];
  expect(Object.keys(u).sort()).toEqual(["date", "id", "tier", "type"]);
  expect(s.facts).toEqual(s.factsBefore);
  const fields = new Set(["id", "name", "text", "category", "tier", "hidden", "scope", "on", "test", "progress", "full_game", "refs"]);
  for (const d of A.ACHIEVEMENTS) for (const k of Object.keys(d)) expect(fields.has(k), `${d.id}.${k}`).toBe(true);
});

When("the store lists are built from the YAML", (s) => {
  s.locales = { de: { first_harvest: { name: "Erste Ernte", text: "Bringe deine erste Herbsternte ein." } } };
  s.lists = A.buildStoreLists(catalogue(s), s.locales);
});
Then("Steam, Game Center and Google Play each receive the same {int} achievements", (s, n: number) => {
  const ids = (st: A.Store) => s.lists[st].rows.map((r: A.StoreRow) => r.id);
  for (const st of A.STORES) expect(ids(st)).toHaveLength(n);
  expect(ids("Game Center")).toEqual(ids("Steam"));
  expect(ids("Google Play")).toEqual(ids("Steam"));
  expect(s.lists["Game Center"].rows.map((r: A.StoreRow) => r.points)).toEqual(s.lists["Google Play"].rows.map((r: A.StoreRow) => r.points));
});

Given("the achievement list", (s) => {
  s.list = A.ACHIEVEMENTS;
});
Then("no test names a country", (s) => {
  const nations = loadDefaultRuleset().nations.flatMap((n) => [n.id.toLowerCase(), n.name.toLowerCase()]);
  for (const d of s.list as A.AchievementDefinition[]) {
    for (const v of A.testValues(d.test)) {
      const [kind, rest] = v.includes(":") ? v.split(":", 2) : ["", v];
      expect(kind, `${d.id} names a country`).not.toBe("country");
      if (kind === "region" || kind === "area") continue;
      expect(nations, `${d.id}: ${v}`).not.toContain(String(rest).toLowerCase());
    }
  }
});
Then("only {string} and {string} name a region", (s, a: string, b: string) => {
  expect(A.regionNamingRows(s.list)).toEqual([a, b]);
});
Then("{string} names the event role {string} of the event {string}", (_s, id: string, role: string, event: string) => {
  expect(def(id).test.event_role).toEqual({ event, role });
});

Given("an event marked {string}", (s, depiction: string) => {
  expect(depiction).toBe("narrative_only");
  s.events = A.NARRATIVE_ONLY_EVENTS;
  expect(s.events.length).toBeGreaterThan(0);
});
Then("no achievement test reads that event", (s) => {
  expect(A.rowsReadingEvents(s.events)).toEqual([]);
});
Then("no achievement rewards conquering a named people, sacking or scorching land", () => {
  for (const d of A.ACHIEVEMENTS) {
    const words = [...Object.keys(d.test), ...A.testValues(d.test)].join(" ");
    expect(words, d.id).not.toMatch(/conquer|sack|scorch|burn|people:/);
  }
});

Given("the achievement {string}", (s, id: string) => {
  s.d = def(id);
});
Then("its refs name {string}", (s, ref: string) => {
  expect(s.d.refs).toContain(ref);
});

Given("the launch achievement list", (s) => {
  s.list = A.ACHIEVEMENTS;
});
Then("it holds {int} achievements worth {int} points", (s, n: number, pts: number) => {
  expect(s.list).toHaveLength(n);
  expect(A.totalPoints(s.list)).toBe(pts);
  expect(A.checkList(s.list)).toEqual([]);
});
Then("every achievement's points are a multiple of {int} and at most {int}", (s, m: number, max: number) => {
  for (const d of s.list as A.AchievementDefinition[]) {
    expect(A.pointsOf(d) % m).toBe(0);
    expect(A.pointsOf(d)).toBeLessThanOrEqual(max);
  }
});
Then("{int} slots and {int} points are kept for updates", (s, slots: number, pts: number) => {
  expect(A.reserve(s.list.length, A.totalPoints(s.list))).toEqual({ slots, points: pts });
});
Then("the list can never hold more than {int} achievements or {int} points", (s, n: number, pts: number) => {
  expect(A.LIMITS.max_achievements).toBe(n);
  expect(A.LIMITS.max_points_total).toBe(pts);
  const extra = Array.from({ length: n + 1 - s.list.length }, (_, i) => ({ id: `extra_${i}`, name: "Extra", text: "Extra.", tier: "copper" as const }));
  expect(A.checkList([...s.list, ...extra]).join()).toMatch(/more than 100/);
  const heavy = Array.from({ length: 9 }, (_, i) => ({ id: `heavy_${i}`, name: "Heavy", text: "Heavy.", tier: "crown" as const }));
  expect(A.checkList([...s.list, ...heavy]).join()).toMatch(/more than 1000/);
});

Given("an achievement of tier {string}", (s, tier: A.Tier) => {
  s.tier = tier;
});
Then("it is worth {int} points on Game Center and Google Play", (s, pts: number) => {
  expect(A.pointsOf({ tier: s.tier })).toBe(pts);
  const lists = A.buildStoreLists(catalogue(s));
  const row = A.ACHIEVEMENTS.find((d) => d.tier === s.tier)!;
  for (const st of ["Game Center", "Google Play"] as const) expect(lists[st].rows.find((r) => r.id === row.id)!.points).toBe(pts);
});
Then("the launch list has {int} achievements of that tier", (s, n: number) => {
  expect(A.ACHIEVEMENTS.filter((d) => d.tier === s.tier)).toHaveLength(n);
});

Given("the list has {int} achievements worth {int} points", (s, n: number, pts: number) => {
  s.before = { count: n, points: pts };
});
When("an update adds {int} achievements worth {int} points", (s, n: number, pts: number) => {
  s.update = A.checkUpdate(s.before, { count: n, points: pts });
});
Then("{int} slots remain, fewer than the {int} that must stay in reserve", (s, slots: number, min: number) => {
  expect(s.update.slots).toBe(slots);
  expect(A.LIMITS.reserve_slots_min).toBe(min);
  expect(slots).toBeLessThan(min);
});
Then("the update is refused", (s) => {
  expect(s.update.ok).toBe(false);
});

Given("an achievement with a name of {int} characters and a text of {int} characters", (s, n: number, t: number) => {
  s.row = { id: "made_up", name: "N".repeat(n), text: "T".repeat(t), tier: "copper" };
});
Then("the list check {word}", (s, result: string) => {
  expect(A.checkList([s.row]).length === 0 ? "passes" : "fails").toBe(result);
});

Given("no achievement is hidden at launch", () => {
  expect(A.ACHIEVEMENTS.filter((d) => d.hidden)).toEqual([]);
});
When("a later update adds a hidden achievement for an event chain", (s) => {
  s.hidden = { id: "secret_chain", name: "A Secret Chain", text: "Follow the hidden chain to its end.", category: "history", tier: "silver", hidden: true, scope: "campaign", on: "event_end", test: { event: "secret_chain_end" }, refs: [] } satisfies A.AchievementDefinition;
});
Then("before it is earned the list shows it as {string} with its tier", (s, label: string) => {
  expect(A.shownAs(s.hidden, false)).toEqual({ name: label, text: null, tier: "silver" });
});
Then("its name and text stay secret until it is earned", (s) => {
  const before = A.shownAs(s.hidden, false);
  expect(before.name).not.toBe(s.hidden.name);
  expect(before.text).toBeNull();
  expect(A.shownAs(s.hidden, true)).toEqual({ name: s.hidden.name, text: s.hidden.text, tier: "silver" });
});

// ---------------------------------------------------------------- unlocking the catalogue

Given("the achievement {string} is locked", (s, id: string) => {
  s.id = id;
  expect(campaign(s).earned[id]).toBeUndefined();
  expect(profile(s).unlocked[id]).toBeUndefined();
});

// Rows that wait on the subjects, naval and exploration designs (OQ-ACH-5) stay todo:
// their tests read stats those designs have not taken in yet.
const WAITING_ON_OQ_ACH_5 = ["started_as_subject", "tributaries_min", "fleet_crossed_ocean_and_returned", "contact_by", "founded_with_consent_of_local_people", "fleet_circumnavigated"];
Given(new RegExp(`^its test (\\{(?!.*\\b(?:${WAITING_ON_OQ_ACH_5.join("|")})\\b).*\\}) holds$`), (s, text: string) => {
  const d = def(s.id);
  const test = parseFlow(text);
  expect(test, "the feature's test is the catalogue's").toEqual(d.test);
  if (d.scope === "lifetime") {
    // Lifetime rows read the profile's counters, built up across games.
    for (const [k, v] of Object.entries(d.test)) {
      if (k.endsWith("_min")) profile(s).lifetime[k.slice(0, -4)] = Array.from({ length: Number(v) }, (_, i) => `${k}_${i}`);
    }
    s.facts = {};
  } else s.facts = A.factsMeeting(test);
});

// Only the design's moments (§5.1); `castle_gained` is not among them (OQ-ACH-1).
When(new RegExp(`^the moment "(${A.MOMENTS.join("|")})" occurs$`), (s, moment: string) => {
  occur(s, moment);
});
Then("it is worth {int} points as tier {string}", (s, pts: number, tier: A.Tier) => {
  const d = def(s.id);
  expect(d.tier).toBe(tier);
  expect(A.pointsOf(d)).toBe(pts);
});
Then("its scope is {string}", (s, scope: string) => {
  expect(def(s.id).scope).toBe(scope);
});

Given("the country holds {int} gold in its treasury", (s, gold: number) => {
  facts(s).gold = gold;
});
Then("the achievement {string} stays locked", (s, id: string) => {
  expect(earnedIds(s)).not.toContain(id);
  expect(campaign(s).earned[id]).toBeUndefined();
});
Given("the player's army ends a siege with the result {string}", (s, result: string) => {
  facts(s).siege_result = result;
});

// ---------------------------------------------------------------- when tests run

Then("only the tests of {string}, {string} and {string} run", (s, a: string, b: string, c: string) => {
  expect([...s.last.ran].sort()).toEqual([a, b, c].sort());
});
Then("the tests of rows for {string} do not run", (s, moment: string) => {
  for (const id of s.last.ran) expect(def(id).on).not.toBe(moment);
});

Given("the date is {word}", (s, date: string) => {
  s.date = date;
});
When("the turn reaches that day", (s) => {
  occur(s, "date", {}, s.date);
});
Then("the test of {string} runs once", (s, id: string) => {
  expect(s.last.ran.filter((x: string) => x === id)).toEqual([id]);
});
Then("it does not run again on a later day", (s) => {
  const id = s.last.ran[0];
  expect(occur(s, "date", {}, s.date).ran).not.toContain(id);
  const next = new Date(`${s.date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  expect(occur(s, "date", {}, next.toISOString().slice(0, 10)).ran).not.toContain(id);
});

Given("the country has {int} gold before the month", (s, gold: number) => {
  s.treasury = { gold };
});
Given("the month's income brings the treasury to {int} gold", (s, gold: number) => {
  s.income = gold - s.treasury.gold;
});
When("the turn's own systems have all run", (s) => {
  s.seenGold = [] as number[];
  s.log = A.runTurnWithTests(
    { date: { year: 1450, month: 3 }, systems: [{ name: "treasury income", run: () => (s.treasury.gold += s.income) }] },
    [{ name: "achievement tests: turn_end", run: () => (s.seenGold.push(s.treasury.gold), occur(s, "turn_end", { gold: s.treasury.gold })) }],
  );
});
Then("the {string} tests run last", (s, moment: string) => {
  expect(s.log.at(-1).name).toBe(`achievement tests: ${moment}`);
  expect(s.seenGold).toEqual([10010]);
});

// ---------------------------------------------------------------- scope and progress

Given("the player held {int} gold in an earlier campaign", (s, gold: number) => {
  const earlier = A.newCampaign({ ironman: true });
  A.evaluate(catalogue(s), earlier, profile(s), "turn_end", { gold }, START);
  s.c = A.newCampaign({ ironman: true });
});
Given("the player holds {int} gold in this campaign", (s, gold: number) => {
  facts(s).gold = gold;
});

Given("the profile counts {int} distinct non-historical event options picked", (s, n: number) => {
  profile(s).lifetime.distinct_nonhistorical_options = Array.from({ length: n }, (_, i) => `option_${i}`);
});
When("the player picks a non-historical event option never picked before in a new eligible campaign", (s) => {
  s.c = A.newCampaign({ ironman: true });
  const n = A.countLifetime(profile(s), s.c, "distinct_nonhistorical_options", "option_new");
  occur(s, "event_choice", {});
  s.mirror = A.progress(profile(s), s.c, def("paths_not_taken"), n, stores(s));
});
Then("the counter is mirrored to the store's progress", (s) => {
  expect(s.mirror.reported.map((r: { store: A.Store }) => r.store).sort()).toEqual([...A.STORES].sort());
  for (const r of s.mirror.reported) expect(r.value).toBe(50);
});

Given("the achievement {string} has the progress target {int}", (s, id: string, target: number) => {
  s.d = def(id);
  expect(A.targetOf(s.d)).toBe(target);
});
When("the country has {int} scholars at work", (s, n: number) => {
  expect(s.d.progress.stat).toBe("scholars");
  s.value = n;
});
Then("Game Center is told the achievement is {int} percent complete", (s, pct: number) => {
  expect(A.gameCenterPercent(A.targetOf(s.d), s.value)).toBe(pct);
});
When("the counter {string} is {int}", (s, stat: string, n: number) => {
  expect(s.d.progress.stat).toBe(stat);
  s.value = n;
});
Then("Google Play is told {int} steps", (s, n: number) => {
  expect(A.googleSteps(s.d.progress.stat, A.targetOf(s.d), s.value)).toBe(n);
});
When("the counter {string} reaches {int}", (s, stat: string, n: number) => {
  expect(s.d.progress.stat).toBe(stat);
  s.popups = A.steamPopups(A.targetOf(s.d), n - 1, n);
});
Then("Steam shows a progress popup at {int} percent", (s, pct: number) => {
  expect(s.popups).toEqual([pct]);
});

Given("the best value reported to the stores for {string} is {int}", (s, stat: string, n: number) => {
  profile(s).best[stat] = { Steam: n, "Game Center": n, "Google Play": n };
});
Given("a new campaign has begun, so the campaign counter {string} starts at {int}", (s, stat: string, n: number) => {
  s.c = A.newCampaign({ ironman: true });
  s.c.counters[stat] = 4;
  A.resetCounters(s.c);
  expect(s.c.counters[stat] ?? 0).toBe(n);
  s.d = A.ACHIEVEMENTS.find((d) => d.progress?.stat === stat);
});
When("the player grants charters until {int} are in force", (s, n: number) => {
  s.report = A.progress(profile(s), campaign(s), s.d, n, stores(s));
});
Then("the in-game list shows {int} of {int}", (s, v: number, t: number) => {
  expect(s.report.inGame).toEqual({ value: v, target: t });
});
Then("no progress is reported to any store", (s) => {
  expect(s.report.reported).toEqual([]);
});
Then("the stores are told {int} of {int}", (s, v: number, t: number) => {
  expect(s.report.reported.map((r: { store: A.Store }) => r.store).sort()).toEqual([...A.STORES].sort());
  for (const r of s.report.reported) expect(r.value).toBe(v);
  expect(A.targetOf(s.d)).toBe(t);
});

// ---------------------------------------------------------------- store sync and ids

Given("the store is not reachable", (s) => {
  for (const st of A.STORES) stores(s)[st].reachable = false;
});
Then("it is written to the profile at once", (s) => {
  expect(Object.keys(profile(s).unlocked)).toEqual(earnedIds(s));
});
Then("it is shown in the game at once", (s) => {
  for (const id of earnedIds(s)) expect(campaign(s).earned[id]).toBeDefined();
  expect(s.last.unlocked[0].type).toBe("AchievementUnlocked");
});
Then("it waits in the unlock queue", (s) => {
  A.drainQueue(profile(s), stores(s));
  expect(profile(s).queue.map((q: { id: string }) => q.id)).toContain(earnedIds(s)[0]);
  for (const st of A.STORES) expect(stores(s)[st].unlocked).toEqual([]);
});
When("the store becomes reachable", (s) => {
  for (const st of A.STORES) stores(s)[st].reachable = true;
  A.drainQueue(profile(s), stores(s));
});
Then("the queued unlock is sent to the store", (s) => {
  expect(profile(s).queue).toEqual([]);
  for (const st of A.STORES) expect(stores(s)[st].unlocked).toEqual(earnedIds(s));
});

Given("the unlock queue holds {string}", (s, id: string) => {
  profile(s).unlocked[id] = START;
  for (const st of A.STORES) profile(s).queue.push({ id, store: st });
});
When("the game starts and the store is reachable", (s) => {
  for (const st of A.STORES) stores(s)[st].reachable = true;
  A.startUp(profile(s), stores(s));
});
Given("the profile holds the unlocks {string} and {string}", (s, a: string, b: string) => {
  profile(s).unlocked[a] = START;
  profile(s).unlocked[b] = "1500-01-01";
});
Given("the store on this device lists only {string}", (s, id: string) => {
  for (const st of A.STORES) stores(s)[st].unlocked = [id];
});
When("the game starts", (s) => {
  s.alreadyListed = A.STORES.map((st) => [...stores(s)[st].unlocked]);
  A.startUp(profile(s), stores(s));
});
Then("{string} is sent to the store", (s, id: string) => {
  for (const st of A.STORES) {
    expect(stores(s)[st].unlocked).toContain(id);
    expect(profile(s).sent).toContainEqual({ store: st, id, kind: "unlock" });
  }
  // Nothing the store already had is sent again.
  for (const listed of s.alreadyListed ?? []) for (const x of listed) expect(profile(s).sent.filter((c: { id: string }) => c.id === x)).toEqual([]);
});

Given("the achievement id {string}", (s, id: string) => {
  s.id = id;
});
Then("its id on {string} is {string}", (s, store: A.Store, storeId: string) => {
  if (store === "Steam") expect(A.steamId(s.id)).toBe(storeId);
  else if (store === "Game Center") expect(A.gameCenterId(s.id)).toBe(storeId);
  else {
    expect(storeId).toContain(A.GOOGLE_MAPPING_FILE);
    expect(A.googleId(s.id, {})).toBeUndefined();
    expect(A.googleId(s.id, { [s.id]: "CgkIconsole" })).toBe("CgkIconsole");
  }
});

Then("a Steam upload file, an App Store Connect list and a Google achievements CSV are written", (s) => {
  expect(s.lists.Steam.file).toMatch(/Steam/);
  expect(s.lists["Game Center"].file).toBe("App Store Connect list");
  expect(s.lists["Google Play"].file).toBe("Google achievements CSV");
});
Then("each holds the localised names and texts", (s) => {
  for (const st of A.STORES) {
    for (const r of s.lists[st].rows as A.StoreRow[]) expect(r.names.en).toEqual({ name: def(r.id).name, text: def(r.id).text });
    expect(s.lists[st].rows.find((r: A.StoreRow) => r.id === "first_harvest").names.de).toEqual(s.locales.de.first_harvest);
  }
});

Given("the player has earned the achievement {string}", (s, id: string) => {
  earn(s, id);
  A.startUp(profile(s), stores(s));
  expect(stores(s).Steam.unlocked).toContain(id);
});
When("{string} is retired in an update", (s, id: string) => {
  s.cat = A.retire(catalogue(s), id, stores(s));
  s.retiredId = id;
});
Then("it is hidden in every store and its test is turned off", (s) => {
  const id = s.retiredId;
  for (const st of A.STORES) expect(stores(s)[st].hidden).toContain(id);
  const d = def(id);
  const fresh = A.newCampaign({ ironman: true });
  expect(A.evaluate(catalogue(s), fresh, A.newProfile(), d.on, A.factsMeeting(d.test), START).ran).not.toContain(id);
  expect(catalogue(s).list.map((x: A.AchievementDefinition) => x.id)).toContain(id);
});
Then("the player keeps it", (s) => {
  expect(profile(s).unlocked[s.retiredId]).toBeDefined();
  for (const st of A.STORES) expect(stores(s)[st].unlocked).toContain(s.retiredId);
});

// ---------------------------------------------------------------- free tier and demo

Given(/^the player uses the (iOS|Android) free download$/, (s, os: string) => {
  s.p = A.newProfile(os === "iOS" ? "free_ios" : "free_android");
});
Given("the player plays an ironman campaign as the country {string}", (s, realm: string) => {
  s.c = A.newCampaign({ ironman: true, realm });
});
When("the player buys the full game", (s) => {
  s.p = A.buyFromFreeDownload(profile(s));
});
Then("{string} stays earned", (s, id: string) => {
  expect(profile(s).app).toBe("full");
  expect(profile(s).unlocked[id]).toBeDefined();
});
Then("the achievement {string} can't be earned with the free countries alone", (_s, id: string) => {
  expect(A.earnableWithFreeCountries(def(id))).toBe(false);
  expect(A.ACHIEVEMENTS.filter((d) => !A.earnableWithFreeCountries(d)).map((d) => d.id)).toEqual(["many_crowns", "every_macro_region"]);
});

Given("the player plays an ironman campaign in the Steam demo", (s) => {
  s.p = A.newProfile("steam_demo");
  s.c = A.newCampaign({ ironman: true });
});
Given("the player plays a normal campaign in the Steam demo", (s) => {
  s.p = A.newProfile("steam_demo");
  s.c = A.newCampaign({ ironman: false });
});
When("the achievement {string} is earned", (s, id: string) => {
  earn(s, id);
  expect(earnedIds(s)).toContain(id);
});
Then("nothing is sent to Steam", (s) => {
  A.startUp(profile(s), stores(s));
  expect(profile(s).sent).toEqual([]);
  expect(profile(s).queue).toEqual([]);
  expect(stores(s).Steam.unlocked).toEqual([]);
});
Then("the demo keeps {string} in its local list", (s, id: string) => {
  expect(profile(s).demoList).toEqual([id]);
});
Then("the demo's local list stays empty", (s) => {
  expect(profile(s).demoList).toEqual([]);
});

Given("the demo's profile lists {string} and {string}", (s, a: string, b: string) => {
  s.demo = A.newProfile("steam_demo");
  s.demo.demoList.push(a, b);
});
When("the player buys the full game and starts it", (s) => {
  s.p = A.newProfile("full");
  s.imported = A.importDemo(s.p, s.demo, "1460-01-01");
  A.startUp(s.p, stores(s));
});
Then("the full game reads the demo's profile", (s) => {
  expect(s.imported.map((u: A.AchievementUnlocked) => u.id)).toEqual(s.demo.demoList);
});
Then("{string} and {string} are awarded", (s, a: string, b: string) => {
  for (const id of [a, b]) {
    expect(profile(s).unlocked[id]).toBeDefined();
    expect(stores(s).Steam.unlocked).toContain(id);
  }
});

// ---------------------------------------------------------------- icons

Then("its icon is drawn at {int} by {int} pixels in the game's palette", (s, w: number, h: number) => {
  expect(w).toBe(h);
  expect(A.iconOf(s.tier).size).toBe(w);
});
Then("it has a {int}-pixel frame in {string}", (s, px: number, colour: string) => {
  expect(A.iconOf(s.tier)).toMatchObject({ frame: px, frameColour: colour });
});
Given("an icon of {int} by {int} pixels", (s, w: number) => {
  expect(A.iconOf("copper").size).toBe(w);
});
When(/^the icons? (?:is|are) exported for "([^"]*)"$/, (s, store: A.Store) => {
  s.export = A.iconExport(store);
});
When("it is exported for {string}", (s, store: A.Store) => {
  s.export = A.iconExport(store);
});
Then("it is scaled by {int} with nearest-neighbour to {int} pixels square, without smoothing", (s, factor: number, size: number) => {
  expect(s.export).toMatchObject({ factor, size, filter: "nearest", smoothing: false });
});
Then("each achievement also has a locked image in the grey {string} parchment tones", (s, tone: string) => {
  expect(s.export.locked).toContain(`"${tone}"`);
  expect(A.iconExport("Game Center").locked).toBeNull();
});

// ---------------------------------------------------------------- in the game

Given("the {string} setting is {word}", (s, setting: string, value: string) => {
  expect(setting).toBe("Achievement toasts");
  s.settings = { toasts: value === "on" };
});
When("the achievement {string} unlocks on the map", (s, id: string) => {
  earn(s, id);
});
Then("a toast slides in at the top for {int} seconds", (s, secs: number) => {
  expect(s.toast.show).toBe(true);
  expect(s.toast.seconds).toBe(secs);
});
Then("it shows the icon, the name {string} and the tier {string}", (s, name: string, tier: A.Tier) => {
  expect(s.toast.shows).toEqual({ icon: A.iconOf(tier), name, tier });
});
Then("a short chip-tune sting plays", (s) => {
  expect(s.toast.sound).toBe("ui_achievement");
});
Given("the {string} screen is open", (s, screen: A.OpenScreen) => {
  s.open = screen;
});
When("an achievement unlocks", (s) => {
  earn(s, "first_harvest");
});
Then("the toast waits until the {string} screen closes", (s, screen: string) => {
  expect(s.toast.waitsFor).toBe(screen);
});
Then("no toast is shown", (s) => {
  expect(s.toast.show).toBe(false);
  expect(s.toast.sound).toBeNull();
});
Then("the achievement is unlocked", (s) => {
  expect(earnedIds(s)).toEqual(["first_harvest"]);
  expect(profile(s).unlocked.first_harvest).toBeDefined();
});

Given("the achievement {string} is already earned", (s, id: string) => {
  earn(s, id);
});
When("the player turns on the {string} filter", (s, filter: string) => {
  expect(filter).toBe("earnable in this campaign");
  s.shown = A.earnableInCampaign(catalogue(s), campaign(s).earned, s.date);
});
Then("{string} is not shown", (s, id: string) => {
  expect(s.shown).not.toContain(id);
});
Then("{string} is not shown, because {int} has passed", (s, id: string, year: number) => {
  expect(s.shown).not.toContain(id);
  expect(String(def(id).test.before)).toMatch(new RegExp(`^${year}`));
});
Then("{string} is shown", (s, id: string) => {
  expect(s.shown).toContain(id);
});

When("the achievement {string} unlocks at the castle of {string}", (s, id: string, province: string) => {
  earn(s, id, `castle of ${province}`);
  s.lines = s.last.unlocked.map(A.reportLine);
});
Then("the turn report has one line for it", (s) => {
  expect(s.lines).toHaveLength(1);
  expect(s.lines[0].text).toContain(def(s.last.unlocked[0].id).name);
});
Then("the line jumps to the castle of {string}", (s, province: string) => {
  expect(s.lines[0].jumpTo).toBe(`castle of ${province}`);
});
