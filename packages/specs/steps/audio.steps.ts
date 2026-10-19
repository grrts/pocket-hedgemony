import { expect } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, hashWorld, processTurn, Rng } from "@ph/engine";
import * as A from "@ph/engine/domain/audio";
import { steps, type Scenario } from "../src/registry.ts";

const ALL: A.RotationContext = { variety: "all_palettes" };
const { Given, When, Then } = steps("audio");

// ---------------------------------------------------------------- helpers

const cfg = A.audioConfig;

/** Something happened that played sounds or cues: later `"x" plays` steps assert. */
function played(s: Scenario, ...ids: (string | null | undefined)[]): void {
  s.acted = true;
  s.played ??= [];
  for (const id of ids) if (id) s.played.push(id);
}
function director(s: Scenario): A.Director {
  return (s.dir ??= A.newDirector(s.palette ?? "europe_west", s.era ?? "I"));
}
function facts(s: Scenario): A.MusicFacts {
  return (s.facts ??= { era: s.era ?? "I" });
}
const rng = (seed = 1) => new Rng(seed);
const stateName = (t: string) => (t === "peace rotation" ? "peace" : t);
const romanEra = (t: string) => t as A.MusicEra;

/** Test fixtures: culture groups of countries named in scenarios (culture context owns the real ones). */
const GROUP: Record<string, string> = { Mali: "mande", Hungary: "uralic", Japan: "japonic" };

// ---------------------------------------------------------------- the generic "x plays"

// Used as an action ("When "ui_error" plays") and as an outcome ("Then "army_hungry" plays").
Given("{string} plays", (s, id: string) => {
  if (!s.acted) {
    s.playing = id;
    return;
  }
  if (s.hungerResult !== undefined) {
    expect(id).toBe("army_hungry");
    expect(s.hungerResult).toBe(true);
    return;
  }
  expect(s.played).toContain(id);
});

// ---------------------------------------------------------------- ambience

Given("a fresh install", (s) => {
  s.settings = A.defaultSettings();
});
Then("the ambience setting is off", (s) => {
  expect(s.settings.ambienceOn).toBe(false);
  expect(cfg.music.defaults.ambience).toBe(false);
});
Given("ambience is on", (s) => {
  s.ambienceOn = true;
});
Given("the camera is at {word} zoom over {}", (s, zoom: A.Zoom, ground: string) => {
  s.zoom = zoom;
  if (ground === "a big settlement") s.cam = { zoom, bigSettlement: true };
  else if (ground === "a province with an active siege") s.cam = { zoom, warFront: true };
  else s.cam = { zoom, ground };
});
Then("the bed {string} loops", (s, bed: string) => {
  const b = A.ambienceBed(true, s.cam);
  expect(b?.bed).toBe(bed);
  expect(A.sound(bed).lengthMs).toBe(0);
  expect(A.ambienceBed(false, s.cam)).toBeNull();
});
Given("the camera is at {word} zoom", (s, zoom: A.Zoom) => {
  s.zoom = zoom;
});
Then("no ambience bed is chosen", (s) => {
  expect(A.ambienceBed(!!s.ambienceOn, { zoom: s.zoom, ground: "steppe" })).toBeNull();
  expect(A.ambienceBed(!!s.ambienceOn, { zoom: s.zoom, ground: "coastal sea" })).toBeNull();
});
Given("ambience is on and the camera is over plains in January", (s) => {
  s.ambienceOn = true;
  s.cam = { zoom: "regional", ground: "plains" };
  s.month = 1;
});
Then("{string} is windier than in summer", (s, bed: string) => {
  const winter = A.ambienceBed(true, s.cam, s.month)!;
  const summer = A.ambienceBed(true, s.cam, 7)!;
  expect(winter.bed).toBe(bed);
  expect(summer.bed).toBe(bed);
  expect(winter.windier).toBe(true);
  expect(summer.windier).toBe(false);
});
Then("no rain or snow bed plays", (s) => {
  expect(A.ambienceBeds().filter((b) => /rain|snow/.test(b))).toEqual([]);
  expect(A.ambienceBed(true, s.cam, s.month)!.bed).not.toMatch(/rain|snow/);
});
Given("ambience is on and the music is in a {int} second silence between peace tracks", (s) => {
  s.ambienceOn = true;
  s.music = "silence";
});
Then("the ambience bed is heard in the silence", (s) => {
  expect(A.ambienceHeard(s.ambienceOn, s.music)).toBe(true);
});

// ---------------------------------------------------------------- accessibility

Then("a toast shows the battle as well", (s) => {
  expect(A.visualPartner(s.playing)).toBe("toast");
});
Given("sound captions are on", (s) => {
  s.captions = true;
});
When("a battle starts off screen at {string} to the left", (s, place: string) => {
  s.caption = A.caption(!!s.captions, "battle", place, "left");
});
Then("a small caption {string} with crossed swords shows at the left edge", (s, text: string) => {
  expect(s.caption).toEqual({ text, icon: "crossed swords", edge: "left" });
});
Given("sound captions were never set", (s) => {
  s.settings = A.defaultSettings();
  expect(s.settings.captions).toBe("auto");
  expect(A.captionsOn(s.settings)).toBe(false);
});
When("the player sets the master volume to 0", (s) => {
  s.settings.master = 0;
});
When("the player turns every bus off", (s) => {
  s.settings.musicOn = false;
  s.settings.effects = 0;
  s.settings.ambienceOn = false;
});
Then("sound captions turn on", (s) => {
  expect(A.captionsOn(s.settings)).toBe(true);
});
Given("mono audio is on", (s) => {
  s.mono = true;
});
When("a sound plays at the right of the screen", (s) => {
  s.placed = A.placeSound("army_arrive", { x: 0.8, y: 0 }, { mono: s.mono });
  s.unmono = A.placeSound("army_arrive", { x: 0.8, y: 0 });
});
Then("it plays without pan", (s) => {
  expect(s.placed.pan).toBe(0);
  expect(s.unmono.pan).toBeGreaterThan(0);
});
Given("reduced intensity is on", (s) => {
  s.reduced = true;
});
Then("it is {int} dB softer and has no echo", (s, db: number) => {
  const r = A.intensity(s.playing, true);
  expect(r.gainDb).toBe(-db);
  expect(r.echoRemoved).toBe(true);
});
Then("{string} plays without its stutter", (s, id: string) => {
  expect(A.intensity(id, false).stutter).toBe(true);
  expect(A.intensity(id, !!s.reduced).stutter).toBe(false);
});

// ---------------------------------------------------------------- data, build checks and tools

function goodTrack(): A.TrackSource {
  return {
    id: "peace_mena_early",
    era: "III",
    loopSeconds: 90,
    introSeconds: 4,
    voices: [
      { voice: "P1", steps: ["1", "5", "4", "5", "1↑", "r"].map((d) => [d]) },
      { voice: "T", steps: [["1"], ["5"]] },
    ],
  };
}
Given(/^an MML track file in "([^"]*)" that (uses more voices than the budget|has a loop longer than 150 seconds|never quotes the motif|is named by the selector but missing)$/, (s, dir: string, fault: string) => {
  expect(dir).toBe("packages/rules/data/music/tracks/");
  const t = goodTrack();
  expect(A.checkTrack(t)).toEqual([]);
  if (fault.startsWith("uses more voices")) t.voices = ["P1", "P2", "T", "W", "N", "W2"].map((voice) => ({ voice, steps: ["1", "5", "4", "5", "1↑"].map((d) => [d]) }));
  if (fault.startsWith("has a loop")) t.loopSeconds = 151;
  if (fault.startsWith("never quotes")) t.voices = [{ voice: "P1", steps: [["1"], ["4"], ["5"]] }];
  s.track = t;
  s.missing = fault.startsWith("is named") ? t.id : undefined;
});
When("the build compiles it to JSON", (s) => {
  s.errors = s.missing ? A.missingIds([s.missing], []) : A.checkTrack(s.track);
});
Then("the build fails", (s) => {
  expect(s.errors.length).toBeGreaterThan(0);
});
Given(/^a "\.sfx" sound in "([^"]*)" that (.+)$/, (s, dir: string, fault: string) => {
  expect(dir).toBe("packages/rules/data/audio/sfx/");
  const snd: A.SoundSource = { id: "battle_test", voices: ["S2"], lengthMs: 400, partner: "battle animation", eras: ["IV", "V"] };
  let needs: string[] = ["IV", "V"];
  expect(A.checkSound(snd, needs)).toEqual([]);
  switch (fault) {
    case "uses four voices":
      snd.voices = ["S1", "S2", "S3", "S1"];
      break;
    case "lasts 2.2 seconds and is not ambience":
      snd.lengthMs = 2200;
      break;
    case "is a ui_ sound of 10 ms":
      snd.id = "ui_test";
      snd.lengthMs = 10;
      break;
    case "is named by the director but missing":
      s.missing = "battle_missing";
      break;
    case "lacks an era variant a troop type needs":
      snd.eras = ["IV"];
      break;
    case "has no notification or animation named with it":
      delete snd.partner;
      break;
    default:
      throw new Error(`fault not automated: ${fault}`);
  }
  s.sfx = snd;
  s.needs = needs;
});
When("the build compiles it", (s) => {
  s.errors = s.missing ? A.missingIds([s.missing], A.CATALOGUE.map((x) => x.id)) : A.checkSound(s.sfx, s.needs);
});
When("the rotation weights in {string} change", (s, file: string) => {
  expect(file).toBe("music.yaml");
  const rot = structuredClone(cfg.music.rotation);
  rot.weights = { own_palette: 0.3, era_theme: 0.5, camera_palette: 0.15, neighbour_palette: 0.05 };
  s.rotation = rot;
});
Then("the director uses the new weights without a code change", (s) => {
  const d = A.newDirector("mena", "II");
  const w = Object.fromEntries(A.peaceSources(d, { rotation: s.rotation, variety: "all_palettes" }).map((o) => [o.source, o.weight]));
  expect(w.own_palette).toBe(0.3);
  expect(w.era_theme).toBe(0.5);
  // The pick follows them: over many picks the era theme now wins most often.
  let theme = 0;
  for (let i = 0; i < 200; i++) {
    const dd = A.newDirector("mena", "II");
    const cue = A.nextPeaceTrack(dd, "II", rng(i + 1), { rotation: s.rotation, variety: "all_palettes" })[0]!;
    if (cue.kind === "track" && cue.id === "era_2") theme++;
  }
  expect(theme).toBeGreaterThan(100);
});
Given(/^an event tagged (music|sfx): (\w+)$/, (s, kind: string, tag: string) => {
  s.event = kind === "music" ? { music: tag } : { sfx: tag };
});
When("it opens", (s) => {
  const d = director(s);
  if (s.event.music) {
    const t = A.musicTag(s.event.music);
    const cue = A.eventOpened(d, s.event);
    if (cue && cue.kind === "stinger") s.stinger = cue.id;
    if (t.chain) s.facts = { era: "I", eventChains: [t.chain] };
  }
  played(s, A.boundSound("event.opened", s.event.sfx));
});
Then("the stinger {string} plays", (s, id: string) => {
  expect(s.stinger).toBe(id);
  expect(A.trackList().some((t) => t.id === id && t.kind === "stinger")).toBe(true);
});
Then("the crisis chain counts for the {string} state", (s, state: string) => {
  expect(A.stateHolds(state, s.facts)).toBe(true);
  expect(A.evaluateState(s.facts).state).toBe(state);
});
Then("the sound {string} plays", (s, id: string) => {
  expect(s.played).toContain(id);
  expect(A.isSound(id)).toBe(true);
});
When("the game event {string} happens", (s, event: string) => {
  played(s, A.boundSound(event));
});
Given("the director debug overlay is on", (s) => {
  const d = director(s);
  A.decide(d, "turn_end", { era: "I", atWar: true, monthsSinceDeclaration: 1, battlesFought: 0 }, 60, rng());
  const m = A.newMixer();
  for (let i = 0; i < 6; i++) A.play(m, "ui_tap", i * 100);
  A.play(m, "ui_tap", 520);
  s.diag = A.diagnostics(d, m);
});
Then("it shows the current state, track, layer and why it was chosen", (s) => {
  expect(s.diag.state).toBe("war_mobilize");
  expect(s.diag.track).toBe("war_mobilize");
  expect(s.diag.layers).toEqual([1]);
  expect(s.diag.why).toBe("war_mobilize holds");
});
Then("it shows the last five effects, which were dropped and why", (s) => {
  expect(s.diag.effects).toHaveLength(5);
  expect(s.diag.effects.at(-1)).toEqual({ id: "ui_tap", result: "dropped", reason: "cooldown" });
});

// ---------------------------------------------------------------- many at once

Given("a new turn brings {int} results with sound", (s, n: number) => {
  s.results = Array.from({ length: n }, (_, i) => ({ id: "battle_melee", n: i }));
});
Given("{int} of them happened to the player's own armies, castles or ruler", (s, n: number) => {
  const own = ["army_trained", "siege_fall", "battle_rout"];
  for (let i = 0; i < n; i++) s.results[i] = { id: own[i % own.length], playerAsset: true };
});
Given("{int} of them are in view of the camera", (s, n: number) => {
  let k = 0;
  for (const r of s.results) if (!r.playerAsset && k < n) {
    r.inView = true;
    r.id = "battle_start";
    k++;
  }
});
When("the new turn is shown", (s) => {
  s.plan = A.turnResults(s.results);
  played(s, ...s.plan.plays.map((p: { id: string }) => p.id));
});
Then("{int} sounds play, {int} ms apart", (s, n: number, ms: number) => {
  expect(s.plan.plays).toHaveLength(n);
  s.plan.plays.forEach((p: { atMs: number }, i: number) => expect(p.atMs).toBe(i * ms));
});
Then("the {int} player results play first, highest priority first", (s, n: number) => {
  const first = s.plan.plays.slice(0, n).map((p: { id: string }) => p.id);
  expect(first).toEqual(["battle_rout", "siege_fall", "army_trained"]);
});
Then("then {int} results in view", (s, n: number) => {
  const next = s.plan.plays.slice(3, 3 + n).map((p: { id: string }) => p.id);
  expect(next).toEqual(Array(n).fill("battle_start"));
});
Then("the rest are shown in the turn report and toasts without sound", (s) => {
  expect(s.plan.silent).toHaveLength(s.results.length - s.plan.plays.length);
});
Given("{int} notifications arrive in one turn", (s, n: number) => {
  s.results = Array.from({ length: n }, (_, i) => ({ id: ["notify_ping", "notify_war", "notify_diplo", "notify_alert", "notify_ping"][i % 5], notification: true }));
  s.plan = A.turnResults(s.results);
});
Then("each notification plays its own sound", (s) => {
  expect(s.plan.plays.map((p: { id: string }) => p.id)).toEqual(s.results.map((r: { id: string }) => r.id));
});
Then("only {string} plays", (s, id: string) => {
  expect(s.plan.plays.map((p: { id: string }) => p.id)).toEqual([id]);
});
Given("all three effect voices are busy and the lowest playing priority is {int}", (s, p: number) => {
  s.mixer = A.newMixer();
  A.busyWith(s.mixer, [
    { id: "a_high", priority: 1, until: 10_000 },
    { id: "b_mid", priority: Math.min(p, 2), until: 10_000 },
    { id: `lowest_${p}`, priority: p, until: 10_000 },
  ]);
});
When("a sound of priority {int} starts", (s, p: number) => {
  const snd = A.CATALOGUE.find((x) => x.priority === p && x.voices.length === 1 && x.lengthMs > 0)!;
  s.result = A.play(s.mixer, snd.id, 100);
});
Then("the new sound takes the priority {int} sound's voice", (s, p: number) => {
  expect(s.result.played).toBe(true);
  expect(s.result.stole).toBe(`lowest_${p}`);
});
Then("the new sound is dropped", (s) => {
  expect(s.result).toMatchObject({ played: false, reason: "no voice" });
});
Given("{string} started {int} ms ago", (s, id: string, ms: number) => {
  s.mixer = A.newMixer();
  expect(A.play(s.mixer, id, 0).played).toBe(true);
  s.now = ms;
});
When("{string} is triggered again", (s, id: string) => {
  s.mixer.voices = s.mixer.voices.map(() => null);
  s.result = A.play(s.mixer, id, s.now);
});
Then("it does not restart", (s) => {
  expect(s.result).toMatchObject({ played: false, reason: "cooldown" });
});
Then("it plays", (s) => {
  expect(s.result.played).toBe(true);
});
When("{string} plays twenty times", (s, id: string) => {
  const r = rng(7);
  s.vars = Array.from({ length: 20 }, () => A.variation(id, r));
});
Then("its pitch shifts by up to one semitone with a new noise seed each time", (s) => {
  for (const v of s.vars) expect(Math.abs(v.pitchSemitones)).toBeLessThanOrEqual(1);
  expect(new Set(s.vars.map((v: { pitchSemitones: number }) => v.pitchSemitones)).size).toBeGreaterThan(1);
  expect(new Set(s.vars.map((v: { noiseSeed: number }) => v.noiseSeed)).size).toBe(20);
});
Then("its pitch never varies", (s) => {
  for (const v of s.vars) expect(v.pitchSemitones).toBe(0);
});
Given(/^an army sound happens (at the screen centre|at the screen edge|beyond the visible area)$/, (s, where: string) => {
  const x = where.includes("centre") ? 0 : where.includes("edge") ? 1 : 1.5;
  s.placed = A.placeSound("army_arrive", { x, y: 0 });
  s.x = x;
});
Then(/^it plays at (full volume|0\.4 volume|no volume) with pan following its screen position up to 30 %$/, (s, vol: string) => {
  const want = vol === "full volume" ? 1 : vol === "no volume" ? 0 : 0.4;
  expect(s.placed.volume).toBeCloseTo(want);
  expect(Math.abs(s.placed.pan)).toBeLessThanOrEqual(0.3);
  if (s.x === 1) expect(s.placed.pan).toBeCloseTo(0.3);
});
When("{string} plays for a battle off screen", (s, id: string) => {
  s.placed = A.placeSound(id, { x: 3, y: 0 });
});
Then("it plays centred and is not muted", (s) => {
  expect(s.placed).toEqual({ volume: 1, pan: 0 });
});
When("an army order, a battle start and a melee happen on screen", (s) => {
  s.heard = { order: A.heardAtZoom(s.zoom, "army_orders"), start: A.heardAtZoom(s.zoom, "battle_start"), melee: A.heardAtZoom(s.zoom, "battle"), notify: A.heardAtZoom(s.zoom, "notify") };
});
Then("none of them play from the map, only notifications", (s) => {
  expect(s.heard).toEqual({ order: false, start: false, melee: false, notify: true });
});
Then("the army order and the battle start play, the melee does not", (s) => {
  expect(s.heard).toEqual({ order: true, start: true, melee: false, notify: true });
});
Then("all three play", (s) => {
  expect(s.heard).toEqual({ order: true, start: true, melee: true, notify: true });
});

// ---------------------------------------------------------------- care

Given("the first-release track list", (s) => {
  s.tracks = A.trackList();
});
Then(/^the palettes "americas", "west_africa" and "africa_east_south" have late tracks for Eras IV and V like "europe_west"$/, (s) => {
  const late = (p: A.Palette) => s.tracks.find((t: A.Track) => t.palette === p && t.id.endsWith("_late"));
  for (const p of ["americas", "west_africa", "africa_east_south", "europe_west"] as A.Palette[]) {
    expect(late(p)?.writtenFor).toEqual(["IV", "V"]);
    expect(A.peaceTrack(p, "V").track).toBe(late(p)!.id);
  }
});
When("an event marked {string} fires", (s, mark: string) => {
  expect(mark).toBe("depiction: narrative_only");
  s.cue = A.eventOpened(director(s), { music: "event_good", narrativeOnly: true });
});
Then("no triumphant stinger plays", (s) => {
  expect(["event_good", "battle_won", "war_won"]).not.toContain(s.cue?.id);
});
Then("no stinger plays at all", (s) => {
  expect(s.cue).toBeNull();
});
When(/^(a razing|a massacre event|an enslavement event) happens$/, (s, harm: string) => {
  const kind = harm === "a razing" ? "razing" : harm === "a massacre event" ? "massacre_event" : "enslavement_event";
  s.harm = A.harmSounds(kind);
});
Then("no coin, chime, fanfare or rising sound plays", (s) => {
  for (const e of s.harm.effects) expect(A.coinSounds()).not.toContain(e);
  expect(s.harm.effects.filter((e: string) => /chime|achievement|turn_|stability_up|income/.test(e))).toEqual([]);
});
Then(/^at most "realm_fire" or a single low bell plays$/, (s) => {
  expect(s.harm.effects.length).toBeLessThanOrEqual(1);
  for (const e of s.harm.effects) expect(e).toBe("realm_fire");
});
When("the player's army plunders a province", (s) => {
  s.harm = A.harmSounds("plunder");
});
Then(/^gold is added without "econ_income" or any coin sound$/, (s) => {
  expect(s.harm.goldSound).toBeNull();
  for (const e of s.harm.effects) expect(A.coinSounds()).not.toContain(e);
  expect(A.coinSounds()).toContain("econ_income");
});
Then(/^"realm_fire" plays at low volume$/, (s) => {
  expect(s.harm.effects).toEqual(["realm_fire"]);
  expect(s.harm.quiet).toBe(true);
});
Then("no bright sound plays", (s) => {
  for (const e of s.harm.effects) expect(A.coinSounds()).not.toContain(e);
});
When("a colonial war ends with the player's win", (s) => {
  s.moment = A.momentAudio("peace_signed", { gain: true });
});
Then("the same stinger plays as for any other won war", (s) => {
  expect(s.moment.music).toBe(A.momentAudio("peace_signed", { gain: true }).music);
  expect(s.moment.music).toBe("war_won");
});

// ---------------------------------------------------------------- the effects catalogue

const MOMENTS: Record<string, keyof typeof cfg.sfx.moment_sounds> = {
  "the player taps a button": "button_tap",
  "the player confirms a choice that costs something": "confirm_costly",
  "a store unlock completes": "store_unlock",
  "the player presses End turn": "end_turn_pressed",
  "the turn that starts January is ready": "january_turn_ready",
  "the player taps a province they own": "own_province_tapped",
  "the player calls the levy": "levy_called",
  "a regiment finishes training": "regiment_trained",
  "a battle begins and the screen opens": "battle_begins",
  "a breach opens in a siege": "siege_breach",
  "a ship sinks": "ship_sinks",
  "a building finishes": "building_finished",
  "an outbreak reaches a province of the player": "plague_reaches_player",
  "an event follows from an earlier choice": "event_chain_next",
  "a battle of the player starts off screen": "player_battle_off_screen",
  "a route can't be taken": "route_impossible",
  "the player can't afford an action": "cant_afford",
};
for (const [phrase, key] of Object.entries(MOMENTS)) {
  if (phrase === "the player taps a button" || phrase === "the player presses End turn") continue;
  When(phrase, (s) => {
    played(s, A.momentSound(key));
  });
}
When("the player taps a button", (s) => {
  const id = A.momentSound("button_tap")!;
  s.mixer ??= A.newMixer();
  s.tap = A.play(s.mixer, id, 0);
  s.path = A.soundPath(id);
  played(s, id);
});
When("the player presses End turn", (s) => {
  played(s, A.momentSound("end_turn_pressed"));
  s.chime = A.turnChime("turn_end", s.era ?? "I");
});
Then("the sound {string} plays with priority {int}", (s, id: string, p: number) => {
  expect(s.played).toEqual([id]);
  expect(A.sound(id).priority).toBe(p);
});
Given("the effects catalogue", (s) => {
  s.count = A.catalogueCount();
});
Then("the catalogue counts {int} sounds in {int} groups", (s, n: number, g: number) => {
  expect(s.count.sounds).toBe(n);
  expect(Object.keys(s.count.groups)).toHaveLength(g);
  expect(s.count.groups).toEqual({ ui: 21, frame: 6, turn: 5, map: 8, "army/fleet": 15, battle: 18, siege: 10, sea: 5, econ: 8, "realm/diplo": 14, "event/notify": 9, amb: 10 });
});
Then("aliases and {string} are listed but not counted", (s, id: string) => {
  expect(s.count.listedNotCounted).toEqual(expect.arrayContaining(["army_order_invalid", "econ_cant_afford", id]));
  for (const x of s.count.listedNotCounted) expect(A.isSound(x)).toBe(false);
});
When("an invention is adopted", (s) => {
  const m = A.momentAudio("invention_adopted");
  s.stinger = m.music;
  s.moment = m;
  played(s, ...m.effects);
});
Then("no effect marks the moment", (s) => {
  expect(s.moment.effects).toEqual([]);
});
When("an autosave finishes", (s) => {
  s.mixer = A.newMixer();
  s.result = A.play(s.mixer, "turn_autosave", 0);
  played(s, A.momentSound("autosave_finished"));
});
Then("no sound plays", (s) => {
  expect(s.result).toMatchObject({ played: false, reason: "silent" });
  expect(s.played ?? []).toEqual([]);
});
When("the engine takes {int} ms to compute the turn after End turn", (s, ms: number) => {
  s.ticks = A.workingTicks(ms);
  s.ms = ms;
});
Then(/^"turn_working" never plays$/, (s) => {
  expect(s.ticks).toEqual([]);
});
Then(/^"turn_working" ticks every (\d+) ms from (\d+) ms until the turn is ready$/, (s, every: string, from: string) => {
  expect(s.ticks[0]).toBe(Number(from));
  s.ticks.forEach((t: number, i: number) => expect(t).toBe(Number(from) + i * Number(every)));
  expect(s.ticks.at(-1)).toBeLessThan(s.ms);
  expect(s.ticks.at(-1) + Number(every)).toBeGreaterThanOrEqual(s.ms);
});
When(/^a province on screen changes hands (to the player|away from the player|between two other realms)$/, (s, how: string) => {
  s.border = how === "to the player" ? A.borderChange("me", "them", "me") : how === "away from the player" ? A.borderChange("them", "me", "me") : A.borderChange("them", "others", "me");
});
Then(/^"map_border_change" plays two (rising|falling) bell notes$/, (s, dir: string) => {
  expect(s.border).toEqual({ id: "map_border_change", notes: dir });
});
Then(/^"map_border_change" is silent$/, (s) => {
  expect(s.border).toBeNull();
});
Given("{string} played for an army with {int} days of food", (s, id: string, days: number) => {
  expect(id).toBe("army_hungry");
  s.mixer = A.newMixer();
  expect(A.armyHungry(s.mixer, "murad", days, 0)).toBe(true);
  s.acted = true;
});
When("the next turn the same army still has {int} days of food", (s, days: number) => {
  s.hungerResult = A.armyHungry(s.mixer, "murad", days, 30_000);
});
Then("{string} does not play", (s, id: string) => {
  if (s.hungerResult === undefined) return expect(s.played).not.toContain(id);
  expect(id).toBe("army_hungry");
  expect(s.hungerResult).toBe(false);
});
When("the army's food falls to {int} days", (s, days: number) => {
  s.hungerResult = A.armyHungry(s.mixer, "murad", days, 60_000);
});
Given("the battle screen plays at normal speed with three sectors fighting", (s) => {
  s.mixer = A.newMixer();
  s.sectors = [
    { name: "left", distance: 0.6, sound: "battle_shoot_bow" },
    { name: "centre", distance: 0.1, sound: "battle_shoot_crossbow" },
    { name: "right", distance: 0.7, sound: "battle_shoot_bow" },
  ];
});
When("a bell's shooting step comes", (s) => {
  s.heardSectors = A.bellStep(s.mixer, s.sectors, 0);
  const busy = A.newMixer();
  A.busyWith(busy, [
    { id: "x", priority: 1, until: 1e9 },
    { id: "y", priority: 1, until: 1e9 },
    { id: "z", priority: 1, until: 1e9 },
  ]);
  s.busyHeard = A.bellStep(busy, s.sectors, 0);
});
Then("the shooting sound of the sector closest to the screen centre plays", (s) => {
  expect(s.heardSectors[0]).toBe("centre:battle_shoot_crossbow");
});
Then("other sectors' sounds play only if a voice is free", (s) => {
  // Crossbows take two voices: with three free voices one more sector fits; with one free voice none.
  expect(s.heardSectors).toEqual(["centre:battle_shoot_crossbow", "left:battle_shoot_bow"]);
  expect(s.busyHeard).toEqual([]);
});
When("the player skips ahead in a battle replay", (s) => {
  s.skip = A.battleSkipSounds();
  s.stinger = A.momentAudio("battle_result", { won: true }).music;
});
Then(/^only "battle_start", "battle_rout" and the music stinger play$/, (s) => {
  expect(s.skip).toEqual(["battle_start", "battle_rout"]);
  expect(s.stinger).toBe("battle_won");
});

// ---------------------------------------------------------------- era and region

Given("the date is {word}", (s, date: string) => {
  s.date = A.parseIso(date);
});
Then(/^"ui_tap" sounds the same as in 1444$/, (s) => {
  expect(A.timeBasis("ui_tap")).toBe("fixed");
  expect(A.variantAt("ui_tap", s.date)).toBe(A.variantAt("ui_tap", A.parseIso("1444-11-11")));
});
Given("the music era is {word}", (s, era: string) => {
  if (s.date) {
    expect(A.musicEra(s.date)).toBe(era);
    return;
  }
  s.era = romanEra(era);
});
Then(/^"turn_end" plays motif notes 1 – 5 with (.+)$/, (s, arrangement: string) => {
  expect(s.played).toContain("turn_end");
  expect(s.chime.notes).toEqual(["1", "5"]);
  if (arrangement === "a 12.5 % duty doubling and no bell") {
    expect(s.chime.dutyDoubling).toBe(0.125);
    expect(s.chime.bell).toBe(false);
    expect(s.chime.arpeggioSteps).toBe(0);
  } else if (arrangement === "one arpeggio step added") expect(s.chime.arpeggioSteps).toBe(1);
  else if (arrangement === "two arpeggio steps added") expect(s.chime.arpeggioSteps).toBe(2);
  else throw new Error(arrangement);
  expect(A.turnChime("turn_end", "I").notes).toEqual(s.chime.notes);
});
Given("an army whose inventions put it in warfare era {word}", (s, era: A.WarfareEra) => {
  s.armyEra = era;
});
When("it shoots in battle", (s) => {
  s.shot = A.shootingSound(s.armyEra);
});
Then("the sound is {string}", (s, id: string) => {
  expect(s.shot).toBe(id);
  expect(A.timeBasis(id)).toBe("army_era");
});
Given("an army of warfare era {word} marches with the camera following at local zoom", (s, era: A.WarfareEra) => {
  s.armyEra = era;
  expect(A.heardAtZoom("local", "army")).toBe(true);
});
Then(/^"army_march_loop" uses (.+)$/, (s, steps: string) => {
  expect(A.marchLoop(s.armyEra, true)).toBe(steps);
  if (s.armyEra === "VII") expect(A.marchLoop("VII", false)).toBeNull();
});
Given("the player's palette is {string}", (s, p: A.Palette) => {
  s.palette = p;
});
Then(/^it uses the "(\w+)" (.+)$/, (s, palette: string, part: string) => {
  expect(A.paletteSound(s.playing, s.palette)).toEqual({ palette, part });
});
Given("two armies of the same warfare era and troop type from different palettes", (s) => {
  s.a = { era: "III", palette: "europe_west" };
  s.b = { era: "III", palette: "west_africa" };
});
Then("their shooting sounds are the same", (s) => {
  expect(A.shootingSound(s.a.era)).toBe(A.shootingSound(s.b.era));
  expect(A.paletteSound(A.shootingSound(s.a.era), s.a.palette)).toBeNull();
});
Then("no sound variant exists for warfare era VIII or music era VI", () => {
  const v = A.variantEras();
  expect(v.warfare).not.toContain("VIII");
  expect(v.warfare.at(-1)).toBe("VII");
  expect(v.music).not.toContain("VI");
  expect(v.music.at(-1)).toBe("V");
});

// ---------------------------------------------------------------- eras and palettes

Given("the config {string} is {string}", (s, key: string, value: string) => {
  expect(key).toBe("eras.basis");
  expect(cfg.music.eras.basis).toBe(value);
});
Given("the country {string} has research far ahead of the calendar", (s) => {
  s.date = A.parseIso("1500-06-01");
  s.techEra = "V";
});
Then("the music era still follows the game year", (s) => {
  expect(A.musicEra(s.date, { techEra: s.techEra })).toBe("I");
  expect(A.musicEra(s.date, { techEra: s.techEra, bands: { ...cfg.music.eras, basis: "technology" } })).toBe("V");
});
Then("there is no music era after V", (s) => {
  expect(A.musicEra(s.date)).toBe("V");
  expect(A.musicEra("1939-09-01")).toBeNull();
  expect(A.MUSIC_ERAS.at(-1)).toBe("V");
});
Then("no music exists for the Decolonization, Cold War or Globalization ages", () => {
  for (const age of ["age_of_decolonization", "cold_war", "age_of_globalization"]) {
    expect(A.ageStinger(age)).toBeNull();
    expect(A.trackList().some((t) => t.id.includes(age))).toBe(false);
  }
});
Given("the player's primary culture group is {string}", (s, g: string) => {
  s.group = g;
});
Given(/^the capital lies (west|east) of longitude 55$/, (s, side: string) => {
  s.lon = side === "west" ? 40 : 70;
});
Then("the palette is {string}", (s, p: string) => {
  expect(A.paletteOf(s.group, s.lon)).toBe(p);
});
Given("the peace track {string} is playing", (s, track: string) => {
  const d = (s.dir = A.newDirector("steppe", "I"));
  d.track = track;
  expect(A.peaceTrackId("steppe", "I")).toBe(track);
});
When("the player's primary culture group changes to {string}", (s, g: string) => {
  A.cultureChanged(s.dir, g);
});
Then("the current track plays on", (s) => {
  expect(s.dir.track).toBe("peace_steppe_early");
  expect(s.dir.palette).toBe("steppe");
});
Then("the next track comes from the palette {string}", (s, p: A.Palette) => {
  expect(A.peaceSources(s.dir)[0]).toMatchObject({ source: "own_palette", track: A.peaceTrackId(p, "I") });
  A.nextPeaceTrack(s.dir, "I", rng(3));
  expect(s.dir.palette).toBe(p);
});

// ---------------------------------------------------------------- motif

When("the new turn is ready", (s) => {
  played(s, A.boundSound("turn.ready"));
  s.ready = A.turnChime("turn_ready", s.era ?? "I");
});
Then(/^"turn_end" plays motif notes 1 – 5$/, (s) => {
  expect(s.played).toContain("turn_end");
  expect(s.chime.notes).toEqual(["1", "5"]);
});
Then(/^"turn_ready" answers with motif notes 4 – 5 – 1↑$/, (s) => {
  expect(s.played).toContain("turn_ready");
  expect(s.ready.notes).toEqual(["4", "5", "1↑"]);
  expect([...s.chime.notes, ...s.ready.notes]).toEqual(cfg.motif.degrees);
});

// ---------------------------------------------------------------- music and effects together

When("war is declared on the player", (s) => {
  s.moment = A.momentAudio("war_declared");
  if (s.dir) {
    s.cues = A.decide(s.dir, "turn_end", { era: s.dir.era, atWar: true, monthsSinceDeclaration: 0, battlesFought: 0 }, 1000, rng());
    played(s, ...s.cues.map((c: A.Cue) => ("id" in c ? c.id : null)));
  }
});
When("the battle result is shown", (s) => {
  s.moment = A.momentAudio("battle_result", { won: true });
});
When("peace is signed with a loss", (s) => {
  s.moment = A.momentAudio("peace_signed", { gain: false });
});
When("the ruler dies and an heir takes over", (s) => {
  s.moment = A.momentAudio("new_ruler", { died: true });
});
When("an age begins", (s) => {
  s.moment = A.momentAudio("age_begins", { ageId: "age_of_exploration" });
});
Then("the music plays {string}", (s, music: string) => {
  if (music === "nothing") return expect(s.moment.music).toBeNull();
  if (music.includes("<")) expect(s.moment.music).toMatch(new RegExp(`^${music.replace(/<[^>]+>/, ".+")}$`));
  else expect(s.moment.music).toBe(music);
});
Then(/^the effects play (.+)$/, (s, what: string) => {
  const m = s.moment;
  if (what === "nothing") return expect(m.effects).toEqual([]);
  if (what === "battle_rout before it, then silence") {
    expect(m.effects).toEqual(["battle_rout"]);
    return expect(m.effectsFirst).toBe(true);
  }
  const first = /^(\w+) first$/.exec(what);
  if (!first && /^\w+$/.test(what)) return expect(m.effects).toEqual([what]);
  if (!first) throw new Error(what);
  expect(m.effects[0]).toBe(first[1]);
  expect(m.effectsFirst).toBe(true);
});
Given("a stinger is playing", (s) => {
  s.mixer = A.newMixer();
  s.mixer.stingerUntil = 5000;
});
When("an effect of priority {int} starts", (s, p: number) => {
  const snd = A.CATALOGUE.find((x) => x.priority === p && x.lengthMs > 0)!;
  s.result = A.play(s.mixer, snd.id, 1000);
  expect(A.underStinger(p)).toEqual({ dropped: !s.result.played, db: s.result.gainDb });
});
Then("it plays ducked by {int} dB", (s, db: number) => {
  expect(s.result).toMatchObject({ played: true, gainDb: -db });
});
Then("it is dropped", (s) => {
  expect(s.result).toMatchObject({ played: false, reason: "stinger" });
});
When("an effect of priority {int} plays", (s, p: number) => {
  s.ambDb = A.ambienceUnderEffect(p);
  expect(A.ambienceUnderEffect(3)).toBe(0);
});
Then("the ambience ducks by {int} dB", (s, db: number) => {
  expect(s.ambienceOn).toBe(true);
  expect(s.ambDb).toBe(-db);
});
When("a music track starts", (s) => {
  s.fade = A.ambienceFadeOnTrackStart();
});
Then("the ambience fades out over {int} seconds", (s, sec: number) => {
  expect(s.fade).toBe(sec);
});
Given("music and effects are playing at default volumes", (s) => {
  s.loud = A.loudness();
  s.settings = A.defaultSettings();
});
Then(/^a "ui_tap" sits about (\d+) dB below the music's average$/, (s, db: string) => {
  expect(s.loud.uiTapBelowMusicDb).toBe(Number(db));
});
Then("a priority 1 sound peaks about {int} dB above it", (s, db: number) => {
  expect(s.loud.priority1PeakAboveDb).toBe(db);
});
Then("the whole mix targets {int} LUFS", (s, lufs: number) => {
  expect(s.loud.mixLufs).toBe(lufs);
});
When("three achievements unlock in one turn", (s) => {
  s.plan = A.turnResults([{ id: "ui_achievement" }, { id: "ui_achievement" }, { id: "ui_achievement" }]);
  s.ach = A.achievementsSound(3);
});
Then(/^"ui_achievement" plays once$/, (s) => {
  expect(s.ach).toEqual(["ui_achievement"]);
  expect(s.plan.plays.map((p: { id: string }) => p.id)).toEqual(["ui_achievement"]);
});

// ---------------------------------------------------------------- the music director

Given("the same save and the same orders", (s) => {
  s.rules = loadDefaultRuleset();
});
When("the turn is played with music on and with music off", (s) => {
  const run = (music: boolean) => {
    const w = createWorld(s.rules, 42);
    const report = processTurn(w, [], 0);
    if (music) {
      const d = A.newDirector("mena", "I");
      A.decide(d, "turn_end", { era: A.musicEra({ year: w.date.year, month: w.date.month }) ?? "I", atWar: false }, 0, rng());
      A.turnResults([{ id: "turn_ready" }]);
    }
    return { hash: hashWorld(w), report };
  };
  s.on = run(true);
  s.off = run(false);
});
Then("the engine gives the same result", (s) => {
  expect(s.on.hash).toBe(s.off.hash);
  expect(s.on.report).toEqual(s.off.report);
});
Given("the player is at war and losing badly while a plague chain is active", (s) => {
  s.facts = { era: "I", atWar: true, enemyTermsVoiceShare: cfg.music.states.war_losing.enemy_terms_voice_share_above + 0.1, eventChains: ["crisis"] };
});
Given("the player besieges a castle with no field battle in the last 3 months and unrest is high", (s) => {
  s.facts = { era: "I", atWar: true, siegeActive: true, fieldBattlesLast3: 0, monthsSinceDeclaration: 6, unrestProvinceShare: cfg.music.states.unrest.plotting_or_risen_share };
});
Given("a crisis chain is active and the player is at peace with high stability", (s) => {
  s.facts = { era: "I", atWar: false, eventChains: ["crisis"], lords: [{ loyalty: "Loyal" }], treasuryTrend: "rising", yearsAtPeace: 12 };
});
Given("the player is at peace with nothing special", (s) => {
  s.facts = { era: "I", atWar: false };
});
When("the turn ends", (s) => {
  const d = director(s);
  A.decide(d, "turn_end", s.facts, 1000, rng());
  s.evaluated = true;
});
function stateStep(s: Scenario, state: string): void {
  if (s.evaluated) {
    expect(director(s).state).toBe(state);
    return;
  }
  s.dir = A.newDirector("europe_west", "I", state, 0);
}
Given("the music state is {string}", (s, state: string) => stateStep(s, stateName(state)));
Given("the music state is peace rotation", (s) => stateStep(s, "peace"));
When("the player opens the {string} screen", (s, screen: string) => {
  A.decide(s.dir, "screen_change", { era: "I", screen, atWar: false }, 1000, rng());
});
Then("the music state stays {string}", (s, state: string) => {
  expect(s.dir.state).toBe(state);
});
When("a stinger plays over the music", (s) => {
  s.cue = A.playStinger(s.dir, "battle_won");
});
Then("the music ducks by {int} dB under it", (s, db: number) => {
  expect(s.dir.duckDb).toBe(-db);
  expect(s.cue.duckDb).toBe(-db);
});
When("a war starts during the player's turn without a screen change", (s) => {
  s.war = { era: "I", atWar: true, monthsSinceDeclaration: 0, battlesFought: 0 };
  s.cues = A.decide(s.dir, "mid_turn", s.war, 1000, rng());
});
Then("the state does not change until the turn ends or the screen changes", (s) => {
  expect(s.cues).toEqual([]);
  expect(s.dir.state).toBe("peace");
  A.decide(s.dir, "turn_end", s.war, 1001, rng());
  expect(s.dir.state).toBe("war_mobilize");
});
Given("the music state changes to {string}", (s, to: string) => {
  const state = stateName(to);
  s.tr = A.transitionTo(state === "peace" ? "war_campaign" : "peace", state);
});
Then(/^the change waits for the next bar line$/, (s) => {
  expect(s.tr.boundary).toBe("bar");
});
Then(/^the change waits for the next phrase end, at most (\d+) bars$/, (s, bars: string) => {
  expect(s.tr).toMatchObject({ boundary: "phrase", maxWaitBars: Number(bars) });
});
Then("it crossfades over one bar", (s) => {
  expect(s.tr.crossfadeBars).toBe(1);
});
Given("the music state became {string} {int} seconds ago", (s, state: string, ago: number) => {
  s.now = 1000;
  s.dir = A.newDirector("europe_west", "I", state, s.now - ago);
});
When("the war ends at the turn end", (s) => {
  s.cues = A.decide(s.dir, "turn_end", { era: "I", atWar: false }, s.now, rng(), { peace: "gain" });
});
Then(/^the "war_won" or "war_lost" stinger plays$/, (s) => {
  expect(s.cues.filter((c: A.Cue) => c.kind === "stinger").map((c: { id: string }) => c.id)).toEqual(["war_won"]);
});
Then("the state does not leave {string} before {int} seconds have passed", (s, state: string, sec: number) => {
  expect(s.dir.state).toBe(state);
  expect(A.tick(s.dir, s.dir.enteredAt + sec - 1, rng())).toEqual([]);
  expect(s.dir.state).toBe(state);
  const later = A.tick(s.dir, s.dir.enteredAt + sec, rng());
  expect(later.length).toBeGreaterThan(0);
  expect(s.dir.state).toBe("peace");
});
When("peace is signed with a gain", (s) => {
  s.stinger = A.momentAudio("peace_signed", { gain: true }).music;
  if (s.dir) {
    s.cues = A.decide(s.dir, "turn_end", { era: "I", atWar: false }, 1000, rng(5), { peace: "gain" });
    played(s, ...s.cues.map((c: A.Cue) => (c.kind === "stinger" ? c.id : null)));
  }
});
Then("{int} to {int} seconds of silence follow", (s, lo: number, hi: number) => {
  const silence = s.cues.find((c: A.Cue) => c.kind === "silence");
  expect(silence.seconds).toBeGreaterThanOrEqual(lo);
  expect(silence.seconds).toBeLessThanOrEqual(hi);
  expect(s.cues.indexOf(silence)).toBe(1);
});
Then("the new state starts from its intro", (s) => {
  expect(s.cues.at(-1)).toMatchObject({ kind: "track", from: "intro" });
  expect(s.dir.state).toBe("peace");
});
Then(/^"war_mobilize" cuts in at the next bar$/, (s) => {
  expect(s.dir.state).toBe("war_mobilize");
  expect(s.cues).toEqual([{ kind: "track", id: "war_mobilize", from: "next bar" }]);
});
When("an event tagged {string} opens", (s, tag: string) => {
  s.cue = A.eventOpened(s.dir, { music: tag });
});
Then(/^the stinger "(\w+)" plays with the music ducked under it$/, (s, id: string) => {
  expect(s.cue).toMatchObject({ kind: "stinger", id, duckDb: cfg.music.transitions.stinger_duck_db });
});
Then("the state stays peace rotation", (s) => {
  expect(s.dir.state).toBe("peace");
});

// ---------------------------------------------------------------- peace rotation

Given("the music is in peace rotation", (s) => {
  const d = (s.dir = A.newDirector("mena", "I"));
  A.lookAt(d, "west_africa", "regional", 20);
  s.sources = A.peaceSources(d, { neighbours: ["europe_east"], variety: "all_palettes" });
});
const SOURCES: Record<string, A.Source> = {
  "the player's own palette": "own_palette",
  "the current era theme": "era_theme",
  "the palette of the region the camera looked at for 20 seconds at regional zoom": "camera_palette",
  "a neighbour's palette": "neighbour_palette",
};
Then(/^the next track comes from (.+) with weight ([\d.]+)$/, (s, source: string, w: string) => {
  const src = s.sources.find((o: { source: string }) => o.source === SOURCES[source]);
  expect(src.weight).toBe(Number(w));
  expect(s.sources.reduce((a: number, o: { weight: number }) => a + o.weight, 0)).toBeCloseTo(1);
});
Given("a peace track from the player's palette is playing", (s) => {
  const d = (s.dir = A.newDirector("mena", "I"));
  d.track = A.peaceTrackId("mena", "I");
});
When("the camera rests on West Africa at regional zoom for {int} seconds", (s, sec: number) => {
  A.lookAt(s.dir, "west_africa", "regional", sec);
});
Then("the current track plays on unchanged", (s) => {
  expect(s.dir.track).toBe("peace_mena_early");
});
Then("the next pick may come from the {string} palette", (s, p: A.Palette) => {
  expect(A.peaceSources(s.dir, ALL).some((o) => o.source === "camera_palette" && o.track === A.peaceTrackId(p, "I"))).toBe(true);
  const short = A.newDirector("mena", "I");
  A.lookAt(short, p, "regional", 10);
  expect(A.peaceSources(short, ALL).some((o) => o.source === "camera_palette")).toBe(false);
  const far = A.newDirector("mena", "I");
  A.lookAt(far, p, "world", 30);
  expect(A.peaceSources(far, ALL).some((o) => o.source === "camera_palette")).toBe(false);
});
Given("the last three tracks were {string}, {string} and {string}", (s, a: string, b: string, c: string) => {
  s.last = [a, b, c];
  s.mk = () => {
    const d = A.newDirector("europe_west", "II");
    A.lookAt(d, "mena", "regional", 25);
    d.lastTracks = [...s.last];
    return d;
  };
});
When("the next peace track is picked", (s) => {
  s.picks = Array.from({ length: 50 }, (_, i) => {
    const d = s.mk ? s.mk() : A.newDirector("mena", "II");
    // "All palettes" is the setting's other value; own palette is the default (D-AUD-3).
    const ctx: A.RotationContext = { neighbours: ["west_africa"], variety: s.variety ?? "all_palettes" };
    const cue = A.nextPeaceTrack(d, "II", rng(i + 1), ctx)[0]!;
    return cue.kind === "track" ? cue.id : "";
  });
});
Then("it is none of those three", (s) => {
  for (const p of s.picks) expect(s.last).not.toContain(p);
  expect(new Set(s.picks)).toEqual(new Set(["peace_westafrica_early"]));
});
When("a peace track starts", (s) => {
  s.starts = Array.from({ length: 40 }, (_, i) => A.nextPeaceTrack(A.newDirector("mena", "III"), "III", rng(i + 11)));
});
Then("its era variant is chosen as it starts", (s) => {
  for (const c of s.starts) expect(c[0]).toMatchObject({ kind: "track", variant: "III" });
});
Then("it plays {int} to {int} loops", (s, lo: number, hi: number) => {
  const loops = new Set(s.starts.map((c: A.Cue[]) => (c[0] as { loops: number }).loops));
  expect([...loops].sort()).toEqual([lo, hi]);
});
Then("{int} to {int} seconds of silence follow before the next track", (s, lo: number, hi: number) => {
  for (const c of s.starts) {
    expect(c[1].kind).toBe("silence");
    expect(c[1].seconds).toBeGreaterThanOrEqual(lo);
    expect(c[1].seconds).toBeLessThanOrEqual(hi);
  }
});
Given("the date reaches {word}", (s, date: string) => {
  s.date = A.parseIso(date);
  s.dir = A.newDirector("europe_west", "II");
});
When("the next peace track is due", (s) => {
  const era = A.musicEra(s.date)!;
  const age = cfg.music.eras.ages_opening[era][0]!;
  s.cues = A.nextPeaceTrack(s.dir, era, rng(), { ageStinger: A.ageStinger(age)! });
});
Then("the age stinger that caused the change plays", (s) => {
  expect(s.cues[0]).toEqual({ kind: "stinger", id: "age_age_of_crisis_and_absolutism" });
});
Then("then {string} plays in full", (s, id: string) => {
  expect(s.cues[1]).toMatchObject({ kind: "track", id, full: true });
});
Given("the variety setting is {string}", (s, v: string) => {
  expect(v).toBe("own palette only");
  s.variety = "own_palette";
});
Then("it comes from the player's own palette", (s) => {
  for (const p of s.picks) expect(p).toBe(A.peaceTrackId("mena", "II"));
});
Given("zoom mix is on", (s) => {
  s.zoomMix = true;
});
Then("the full arrangement plays", (s) => {
  expect(A.zoomMix(s.zoomMix, s.zoom)).toEqual({ percussionDb: 0, leadDb: 0 });
});
Then("percussion drops {int} dB and the lead comes forward {int} dB", (s, p: number, l: number) => {
  expect(A.zoomMix(s.zoomMix, s.zoom)).toEqual({ percussionDb: -p, leadDb: l });
});
Given("zoom mix is on and the player is at war", (s) => {
  s.zoomMix = true;
  s.facts = { era: "I", atWar: true, monthsSinceDeclaration: 5 };
});
When("the camera is over a battle province at local zoom between battles", (s) => {
  s.layers = A.layersFor("war_campaign", s.facts, { zoomMix: true, zoom: "local", overBattleProvince: true });
  s.noMix = A.layersFor("war_campaign", s.facts, { zoomMix: false, zoom: "local", overBattleProvince: true });
});
Then("layer {int} of {string} comes in", (s, layer: number, track: string) => {
  expect(track).toBe("war_campaign");
  expect(s.layers).toContain(layer);
  expect(s.noMix).not.toContain(layer);
});
Given("zoom mix is off", (s) => {
  s.zoomMix = false;
});
When("the camera moves to local zoom", (s) => {
  s.zoom = "local";
});
Then("the mix does not change", (s) => {
  expect(A.zoomMix(s.zoomMix, s.zoom)).toEqual(A.zoomMix(s.zoomMix, "world"));
});

// ---------------------------------------------------------------- platform

Given(/^the AudioWorklet (starts|can't start)$/, (s, state: string) => {
  s.worklet = state === "starts";
});
When("music starts", (s) => {
  s.synth = A.synthPath(s.worklet);
});
Then("the voices run in the AudioWorklet fed about 100 ms ahead by the scheduler", (s) => {
  expect(s.synth).toEqual({ path: "AudioWorklet", lookaheadMs: 100 });
});
Then("the voices run on OscillatorNode with PeriodicWave and a looping noise buffer", (s) => {
  expect(s.synth).toEqual({ path: "OscillatorNode", parts: ["PeriodicWave", "looping noise buffer"] });
});
Given("a cold start on {string}", (s, platform: string) => {
  s.start = A.coldStart(platform);
});
Then("the splash is silent", (s) => {
  expect(s.start.splash).toBeNull();
});
Then(/^"frame_logo" plays on the splash$/, (s) => {
  expect(s.start.splash).toBe("frame_logo");
});
Then(/^"frame_start" plays on "Tap to start"$/, (s) => {
  expect(s.start.tapToStart).toBe("frame_start");
});
Given("music is playing", (s) => {
  s.app = A.newAppAudio();
});
When("the app goes to the background", (s) => {
  A.toBackground(s.app);
});
Then("the AudioContext is suspended and music and effects stop", (s) => {
  expect(s.app.context).toBe("suspended");
});
When("two notifications arrive while away and the app returns", (s) => {
  expect(A.notifyWhileAway(s.app, "notify_war")).toBe(false);
  expect(A.notifyWhileAway(s.app, "notify_diplo")).toBe(false);
  s.back = A.toForeground(s.app);
  played(s, ...s.back.plays);
});
Then("the two notifications play no sound", (s) => {
  expect(s.back.silent).toEqual(["notify_war", "notify_diplo"]);
  expect(s.played).not.toContain("notify_war");
});
Given("haptics are on and the device is a phone", (s) => {
  s.device = { phone: true, hapticsOn: true };
});
Then("the phone gives a {word} vibration", (s, strength: string) => {
  expect(A.haptic(s.playing, s.device)).toBe(strength);
});
Given("the master volume is 0 on a phone with haptics on", (s) => {
  s.settings = { ...A.defaultSettings(), master: 0 };
  s.device = { phone: true, hapticsOn: s.settings.haptics };
});
When("a battle starts", (s) => {
  s.buzz = A.haptic(A.boundSound("battle.begin")!, s.device);
});
Then("the phone vibrates", (s) => {
  expect(s.buzz).toBe("light");
});
Given("the game runs on desktop", (s) => {
  s.device = { phone: false, hapticsOn: true };
});
Then("no haptics are used", (s) => {
  for (const id of Object.keys(cfg.sfx.haptics)) expect(A.haptic(id, s.device)).toBeNull();
});
Then(/^"ui_tap" starts within one audio block, about 3 ms at 128 samples$/, (s) => {
  expect(s.path.path).toBe("direct");
  expect(s.path.latencyMs).toBeCloseTo(3, 0);
});
Then("it bypasses the 100 ms lookahead scheduler", (s) => {
  expect(s.path.latencyMs).toBeLessThan(100);
  expect(A.soundPath("battle_start").latencyMs).toBe(100);
});
When("a battle's sounds play on the map", (s) => {
  s.paths = ["battle_start", "battle_melee", "battle_rout"].map((id) => A.soundPath(id).path);
});
Then("they go through the scheduler in step with the animation", (s) => {
  expect(s.paths).toEqual(["scheduled", "scheduled", "scheduled"]);
});

// ---------------------------------------------------------------- the sound chip

const AUDIO_FILE = /\.(mp3|wav|ogg|oga|m4a|aac|flac|opus|caf|aiff?)$/i;
function audioFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".") || name === "dist") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) audioFiles(full, out);
    else if (AUDIO_FILE.test(name)) out.push(full);
  }
  return out;
}
Given("the game is installed", (s) => {
  s.root = new URL("../../../", import.meta.url).pathname;
});
Then("it ships no recorded audio files for music or effects", (s) => {
  expect(audioFiles(join(s.root, "apps"))).toEqual([]);
  expect(audioFiles(join(s.root, "packages"))).toEqual([]);
});
Then("every sound is synthesized at runtime on the PH-5 chip", () => {
  expect(A.allSynthesized()).toBe(true);
});
Then("the music may use at most {int} voices at once", (s, n: number) => {
  expect(A.voiceBudget(s.era).voices).toBe(n);
});
Then(/^W2 is (not available|available for brass and string sections)$/, (s, w: string) => {
  expect(A.voiceBudget(s.era).w2).toBe(w !== "not available");
});
When(/^a track asks for (a sample of a real instrument|a reverb tail|a chord on one voice|a sixth voice in Era III)$/, (s, thing: string) => {
  const t = goodTrack();
  if (thing.startsWith("a sample")) t.voices[0]!.sample = true;
  if (thing === "a reverb tail") t.reverb = true;
  if (thing.startsWith("a chord")) t.voices[1]!.steps = [["1", "3", "5"]];
  if (thing.startsWith("a sixth")) t.voices = ["P1", "P2", "T", "W", "N", "W2"].map((voice) => ({ voice, steps: ["1", "5", "4", "5", "1↑"].map((d) => [d]) }));
  s.errors = A.checkTrack(t);
});
When("a track uses an echo of {int} ms", (s, ms: number) => {
  s.errors = A.checkTrack({ ...goodTrack(), echoMs: ms });
});
Then(/^the build (accepts|refuses) it$/, (s, verdict: string) => {
  if (verdict === "accepts") expect(s.errors).toEqual([]);
  else expect(s.errors.length).toBeGreaterThan(0);
});
Given("the track {string} uses a maqam tuning table", (s, track: string) => {
  // A tuning table as cents per degree (test data: a scale with a neutral second and a neutral third).
  s.tuning = { track, table: [0, 150, 350, 500, 700, 850, 1000] };
});
Then("its scale degrees are stored in cents", (s) => {
  expect(s.tuning.table.every((c: number) => Number.isFinite(c))).toBe(true);
  expect(A.degreeHz(440, s.tuning.table, 1)).toBe(440);
  expect(A.degreeHz(440, s.tuning.table, 5)).toBeCloseTo(440 * 2 ** (700 / 1200));
});
Then("neutral seconds and thirds play without 12-tone approximation", (s) => {
  const ratio = (d: number) => 1200 * Math.log2(A.degreeHz(440, s.tuning.table, d) / 440);
  expect(ratio(2)).toBeCloseTo(150);
  expect(ratio(3)).toBeCloseTo(350);
});
Given("a bass line on the triangle voice", (s) => {
  s.bass = { voice: "T", consoleOctave: 2 };
});
Then("it sits an octave higher than a console would put it", (s) => {
  expect(A.phoneBassOctave(s.bass.consoleOctave)).toBe(3);
});
Then("the triangle keeps its stepped shape", () => {
  const levels = new Set(Array.from({ length: 256 }, (_, i) => A.triangleLevel(i / 256)));
  expect(levels.size).toBe(16);
  for (const l of levels) expect(Number.isInteger(l)).toBe(true);
});
Then("the master mix passes a gentle low-pass at {int} Hz", (s, hz: number) => {
  expect(A.buses().master.lowpassHz).toBe(hz);
});
Given("the music is playing all five voices", (s) => {
  s.banks = A.voiceBanks("I");
  expect(s.banks.music).toHaveLength(5);
});
Then(/^"ui_tap" plays on an effect voice$/, (s) => {
  expect(s.tap.played).toBe(true);
  expect(s.banks.effects).toEqual(expect.arrayContaining(A.sound("ui_tap").voices));
});
Then("no music voice drops out", (s) => {
  for (const v of A.sound("ui_tap").voices) expect(s.banks.music).not.toContain(v);
  expect(A.voiceBanks("I").music).toEqual(s.banks.music);
});
Given("the sound {string}", (s, id: string) => {
  s.sid = id;
});
Then("it is a sequence of 60 Hz ticks on S1 setting pitch, volume and duty", (s) => {
  const p = A.tickProgram(s.sid);
  expect(p.tickHz).toBe(60);
  expect(Object.keys(p.voices)).toEqual(["S1"]);
  expect(p.voices.S1!.ticks.length).toBeGreaterThan(0);
  expect(A.tickControls("S1")).toEqual(["pitch", "volume", "duty"]);
});
Then("S3 may use any of the music's wavetables in other sounds", () => {
  expect(A.tickControls("S3")).toContain("wavetable");
  expect(A.s3MayUse("lute", ["lute", "horn"])).toBe(true);
  expect(A.tickProgram("turn_end").voices.S3!.wave).toBe("palette_lead");
});
Given("effects are playing", (s) => {
  s.buses = A.buses();
});
Then("effects play on their own bus with their own volume", (s) => {
  expect(s.buses.effects.volume).toBe(0.8);
  expect(s.buses.music.volume).toBe(0.7);
});
Then("they pass the same {int} Hz low-pass as the music", (s, hz: number) => {
  expect(s.buses.effects.lowpassHz).toBe(hz);
  expect(s.buses.music.lowpassHz).toBe(hz);
});
Then("no effect pans more than {int} % off centre", (s, pct: number) => {
  expect(s.buses.effects.maxPan).toBe(pct / 100);
  expect(Math.abs(A.placeSound("army_arrive", { x: 1, y: 0 }).pan)).toBeLessThanOrEqual(pct / 100);
});

// ---------------------------------------------------------------- the track list

When("the screen {string} opens", (s, screen: string) => {
  s.track = A.evaluateState({ era: "I", screen }).state;
});
Then("the track {string} plays", (s, track: string) => {
  expect(s.track).toBe(track);
  expect(A.trackList().some((t) => t.id === track)).toBe(true);
});
Given(/^"nation_select" is playing$/, (s) => {
  s.track = A.evaluateState({ era: "I", screen: "new_campaign" }).state;
  expect(s.track).toBe("nation_select");
});
When("the player highlights the country {string}", (s, country: string) => {
  s.voicing = A.nationSelectVoicing(A.paletteOf(GROUP[country]!)!);
});
Then("the same notes play with the {string} wavetable and tuning", (s, p: string) => {
  expect(s.voicing).toEqual({ notes: "same", wavetable: p, tuning: p });
});
When("the app comes back from the background", (s) => {
  const app = A.newAppAudio();
  A.toBackground(app);
  s.back = A.toForeground(app);
  s.resume = A.resumeMusic();
});
Then(/^"load_resume" plays its (\d+) second intro$/, (s, sec: string) => {
  expect(s.back.plays).toEqual(["load_resume"]);
  expect(s.resume).toMatchObject({ track: "load_resume", introSeconds: Number(sec) });
});
Then("then hands over to the normal pick", (s) => {
  expect(s.resume.then).toBe("normal pick");
});
Given("the palette is {string} and the music era is {word}", (s, p: A.Palette, era: A.MusicEra) => {
  s.palette = p;
  s.era = era;
});
When("a palette peace track is picked", (s) => {
  s.peace = A.peaceTrack(s.palette, s.era);
});
Then("it is {string} in its Era {word} arrangement", (s, track: string, era: string) => {
  expect(s.peace).toEqual({ track, variant: era });
});
Then("the era theme {string} is the same for every nation", (s, id: string) => {
  expect(A.eraTheme(s.era)).toBe(id);
  for (const p of A.PALETTES) {
    const d = A.newDirector(p, s.era);
    expect(A.peaceSources(d, ALL).find((o) => o.source === "era_theme")!.track).toBe(id);
  }
});
Given("the realm book is open on its Diplomacy section in peace", (s) => {
  s.track = A.evaluateState({ era: "I", atWar: false, screen: "realm_book", realmBookTab: "Diplomacy" }, "peace").state;
  // Other tabs keep the state; war still outranks the mood.
  expect(A.evaluateState({ era: "I", atWar: false, screen: "realm_book", realmBookTab: "Realm" }, "peace").state).toBe("peace");
  expect(A.evaluateState({ era: "I", atWar: true, monthsSinceDeclaration: 5, screen: "realm_book", realmBookTab: "Diplomacy" }, "peace").state).toBe("war_campaign");
});
Given("a plague event chain is active", (s) => {
  s.track = A.evaluateState({ era: "I", eventChains: ["crisis"] }).state;
});
Given("the player has explorers active and the camera is over open ocean", (s) => {
  s.track = A.evaluateState({ era: "I", explorersActive: true, cameraOver: "ocean" }).state;
});
Given("a revolution period touches the player in Era IV", (s) => {
  s.track = A.evaluateState({ era: "IV", periods: [{ tag: "revolution", touchesPlayer: true }] }).state;
  expect(A.evaluateState({ era: "III", periods: [{ tag: "revolution", touchesPlayer: true }] }).state).not.toBe("revolution");
});
Given("the track {string} is playing", (s, track: string) => {
  s.layered = track;
  s.facts = { era: "I" };
  expect(A.layersFor(track, s.facts)).toEqual([1]);
});
When("rebels are in the field", (s) => {
  s.facts.rebelsInField = true;
});
Then("the second layer of {string} comes in", (s, track: string) => {
  expect(A.layersFor(track, s.facts)).toEqual([1, 2]);
});
Given(/^the player is at war and "war_campaign" plays$/, (s) => {
  s.facts = { era: "I", atWar: true, monthsSinceDeclaration: 5 };
  expect(A.evaluateState(s.facts).state).toBe("war_campaign");
});
Given("no army is within 2 provinces of an enemy", (s) => {
  s.facts.armyNearEnemy = 4;
});
Given("a player army is within 2 provinces of an enemy", (s) => {
  s.facts.armyNearEnemy = 2;
});
Given("a player army is within 2 provinces of an enemy and a battle is fought this turn", (s) => {
  s.facts.armyNearEnemy = 1;
  s.facts.battleThisTurn = true;
});
Then(/^layers ([\d, and]+) play, fading at bar lines$/, (s, list: string) => {
  expect(A.layersFor("war_campaign", s.facts)).toEqual(list.match(/\d/g)!.map(Number));
  expect(cfg.music.war_layers.layer_fade_bars).toBe(1);
});
Then("war percussion uses {}", (s, drums: string) => {
  expect(A.warPercussion(s.era)).toBe(drums);
});
When("the country {string} declares war on the player", (s, country: string) => {
  s.declared = A.warDeclaredStinger(s.palette, A.paletteOf(GROUP[country]!));
});
Then(/^the stinger "(\w+)" plays in (\w+)'s palette "(\w+)"$/, (s, id: string, _who: string, p: string) => {
  expect(s.declared).toEqual({ id, palette: p });
});
When("a battle result is shown as a victory", (s) => {
  s.stinger = A.momentAudio("battle_result", { won: true }).music;
});
When("a new sea route is discovered", (s) => {
  s.stinger = A.momentAudio("discovery").music;
});
When("printing is adopted", (s) => {
  s.stinger = A.momentAudio("invention_adopted").music;
});
When("a new ruler takes power", (s) => {
  s.stinger = A.momentAudio("new_ruler").music;
});
When("an alliance is signed", (s) => {
  s.stinger = A.momentAudio("alliance").music;
});
Then("the first release has {int} loops and {int} stingers", (s, loops: number, stingers: number) => {
  expect(s.tracks.filter((t: A.Track) => t.kind === "loop")).toHaveLength(loops);
  expect(s.tracks.filter((t: A.Track) => t.kind === "stinger")).toHaveLength(stingers);
});

// ---------------------------------------------------------------- decisions of this pass (D-AUD-1 … D-AUD-12, X-1)

When("a white peace is signed", (s) => {
  s.moment = A.momentAudio("peace_signed", { white: true });
  const d = A.newDirector("europe_west", "I");
  d.state = "war_campaign";
  expect(A.decide(d, "turn_end", { era: "I", atWar: false }, 1000, rng(), { peace: "white" }).filter((c) => c.kind === "stinger")).toEqual([]);
});
Then(/^the music (ducks by 4 dB for its length|does not duck)$/, (s, how: string) => {
  expect(A.ducksMusic(s.playing)).toBe(how === "does not duck" ? 0 : -4);
});
When("the pause menu opens", (s) => {
  s.acted = true;
  s.played = ["frame_pause"];
  s.menuDb = A.gameMenuMusicDb();
});
Then("the music is unchanged while the menu is open", (s) => {
  expect(s.menuDb).toBe(0);
  expect("pause_music_db" in cfg.sfx.ducking).toBe(false);
});
When("onboarding reports {string}", (s, moment: "step shown" | "step finished" | "new warning") => {
  s.ob = A.onboardingSound(moment);
});
Then("the effect {string} plays", (s, id: string) => {
  expect(s.ob.sound).toBe(id);
});
Then("the music is not ducked", (s) => {
  expect(s.ob.ducksMusic).toBe(false);
  expect(A.ducksMusic(s.ob.sound)).toBe(0);
  expect(A.onboardingSound("vizier note").sound).toBeNull();
});
Given("the player's battles at {string} and {string} run at once", (s, a: string, b: string) => {
  s.battles = [a, b];
});
Given("the battle view shows {string}", (s, place: string) => {
  s.shown = place;
});
Then(/^the bell-step effects of "([^"]+)" (play|do not play)$/, (s, place: string, how: string) => {
  expect(A.battleStepAudible(place, s.shown)).toBe(how === "play");
});
When("the player switches to {string}", (s, place: string) => {
  expect(s.battles).toContain(place);
  s.shown = place;
});
When("a tooltip opens", (s) => {
  s.acted = true;
  s.played = A.neverPlayed("ui_tooltip") ? [] : ["ui_tooltip"];
  expect(A.neverPlayed("ui_tap")).toBe(false);
});

Then(/^"turn_end" adds a short sustained swell on S3 under the chime$/, (s) => {
  expect(s.chime.s3Swell).toBe(true);
  expect(A.turnChime("turn_end", "IV").s3Swell).toBe(false);
});
Then("no music voice is taken", (s) => {
  expect(s.chime.w2Swell).toBe(false);
  expect(cfg.sfx.era_v_swell).toEqual({ voice: "S3", music_voice: false });
});
Given("a colonial nation founded in {int}", (s, year: number) => {
  s.founded = year;
});
Then("it uses the single palette {string}, with no blend", (s, palette: string) => {
  expect(s.founded).toBeGreaterThan(1500);
  expect(A.colonialPalette(s.founded)).toBe(palette);
  expect(A.colonialPalette(1490)).toBeNull();
});
Given("the iPhone's silent switch is on", (s) => {
  s.session = A.iosSession();
});
Then(/^the game uses the native "ambient" audio session, which respects the silent switch$/, (s) => {
  expect(s.session).toMatchObject({ category: "ambient", respectsSilentSwitch: true });
});
Then("it mixes with the player's other audio apps", (s) => {
  expect(s.session.mixWithOtherApps).toBe(true);
});
Then("music and effects follow the same audio session setting", (s) => {
  expect((s.session ?? A.iosSession()).effectsFollowMusic).toBe(true);
});
Given(/^the game runs on "(\w+)" with "play in background" (on|off)$/, (s, platform: string, v: string) => {
  s.bgPlatform = platform;
  s.bgOn = v === "on";
});
When("the window is hidden", (s) => {
  s.app = A.newAppAudio();
  A.toBackground(s.app, { platform: s.bgPlatform, playInBackground: s.bgOn });
});
Then(/^the audio (is suspended|keeps playing)$/, (s, how: string) => {
  expect(s.app.context).toBe(how === "is suspended" ? "suspended" : "running");
});
Given("a fresh install on a phone", (s) => {
  s.settings = A.defaultSettings();
});
Then("master volume is {float}", (s, v: number) => {
  expect(s.settings.master).toBe(v);
});
Then(/^music volume is ([\d.]+), effects volume ([\d.]+) and ambience volume ([\d.]+)$/, (s, m: string, e: string, a: string) => {
  expect([s.settings.music, s.settings.effects, s.settings.ambience]).toEqual([Number(m), Number(e), Number(a)]);
});
Then(/^the variety is "own palette only"$/, () => {
  expect(cfg.music.defaults.variety).toBe("own_palette");
});
Then("interface sounds are on, haptics are on, ambience is off", (s) => {
  expect([s.settings.uiSounds, s.settings.haptics, s.settings.ambienceOn]).toEqual([true, true, false]);
});
Then("mono, sound captions and reduced intensity are off", (s) => {
  expect([s.settings.mono, A.captionsOn(s.settings), s.settings.reducedIntensity]).toEqual([false, false, false]);
});
When("the player turns music off", (s) => {
  s.settings.musicOn = false;
});
Then("the synth's music is fully suspended", (s) => {
  expect(A.musicSuspended(s.settings)).toBe(true);
});
const mf = (f: Partial<A.MusicFacts>): A.MusicFacts => ({ era: "I", atWar: true, ...f });
const STATE_FACTS: [RegExp, () => A.MusicFacts][] = [
  [/^60 % of the player's peace voices would accept the enemy's terms$/, () => mf({ enemyTermsVoiceShare: 0.6 })],
  [/^the capital is occupied$/, () => mf({ capitalOccupied: true })],
  [/^5 of the 8 great powers are at war in Era V$/, () => mf({ era: "V", greatPowersAtWarShare: 5 / 8 })],
  [/^war was declared 1 month ago and no battle has been fought$/, () => mf({ monthsSinceDeclaration: 1, battlesFought: 0 })],
  [/^25 % of provinces are Plotting or Risen$/, () => mf({ atWar: false, unrestProvinceShare: 0.25 })],
  [/^no lord is Disloyal, half are Loyal, the treasury is rising and the realm has been at peace for 10 years$/, () => mf({ atWar: false, lords: [{ loyalty: "Loyal" }, { loyalty: "Wavering" }], treasuryTrend: "rising", yearsAtPeace: 10 })],
];
for (const [re, f] of STATE_FACTS)
  Given(re, (s) => {
    s.stateFacts = f();
  });
Then("the music state {string} holds", (s, state: string) => {
  expect(A.stateHolds(state, s.stateFacts)).toBe(true);
  if (state === "war_losing" && s.stateFacts.enemyTermsVoiceShare) expect(A.stateHolds(state, { ...s.stateFacts, enemyTermsVoiceShare: 0.5 })).toBe(false);
  if (state === "prosperity") expect(A.stateHolds(state, { ...s.stateFacts, lords: [{ loyalty: "Disloyal" }, { loyalty: "Loyal" }] })).toBe(false);
});
Given(/^a weekly turn in which (no new month|\w+) begins$/, (s, what: string) => {
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  s.monthBegan = what === "no new month" ? null : months.indexOf(what) + 1;
});
When("the turn is ready", (s) => {
  s.readyChime = A.turnReadyChime({ monthBegan: s.monthBegan });
});
Then("the chime is {string}", (s, id: string) => {
  expect(s.readyChime).toBe(id);
});
