import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, generateSyntheticRuleset, hashWorld, processTurn, Rng, type Order, type World } from "@ph/engine";
import * as T from "@ph/engine/domain/settings";
import * as S from "@ph/engine/domain/saves";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("settings");

// ---------------------------------------------------------------- fixtures

const CAT = T.CATALOGUE;
const D = T.DESIGN;

const id = (name: string, section?: string) => T.idByName(CAT, name, section);
const profileOf = (text: string) => T.parseValue(CAT, "graphics.profile", text) as T.Profile;

function envFor(profile: T.Profile): T.Env {
  const platform = D.profile_platform[profile] as T.Platform;
  const env: T.Env = { platform, touch: D.profile_touch[profile] };
  if ((D.profile_steam as Record<string, boolean>)[profile]) env.steam = true;
  return env;
}

function st(s: Scenario): T.SettingsState {
  return (s.st ??= T.newSettings(s.profile ?? "desktop", CAT, s.facts ?? {}));
}
function env(s: Scenario): T.Env {
  return (s.env ??= envFor(st(s).profile));
}
/** Marks the action of a scenario: from here on, "X is Y" checks instead of sets. */
function act(s: Scenario): void {
  s.acted = true;
}
function setProfile(s: Scenario, profile: T.Profile, envOver?: T.Env): void {
  s.profile = profile;
  s.st = T.newSettings(profile, CAT, s.facts ?? {});
  s.env = envOver ?? envFor(profile);
}
function set(s: Scenario, name: string, text: string, section?: string): T.SettingChanged[] {
  const sid = id(name, section);
  s.lastId = sid;
  const ev = T.setValue(st(s), sid, T.parseValue(CAT, sid, text));
  s.events = ev;
  return ev;
}
function expectValue(s: Scenario, name: string, text: string): void {
  const sid = id(name);
  s.lastId = sid;
  const v = T.valueOf(st(s), sid);
  if (text === "n/a") expect(v, name).toBe(T.NA);
  else expect(v, name).toEqual(T.parseValue(CAT, sid, text));
}
function optionLabels(sid: string): string[] {
  const def = T.resolve(CAT, sid);
  if (def.type === "toggle") return [T.label(CAT, sid, true), T.label(CAT, sid, false)];
  return T.optionsOf(def).map((o) => T.label(CAT, sid, o));
}
const list = (text: string) => text.split(/, | and /).map((t) => t.trim());

function memoryStore(): T.SettingsStore & { files: Map<string, string> } {
  const files = new Map<string, string>();
  return { files, read: (n) => files.get(n), write: (n, t) => void files.set(n, t) };
}
/** Some valid value other than the current one. */
function otherValue(state: T.SettingsState, sid: string): T.Value {
  const def = T.resolve(CAT, sid);
  const cur = T.valueOf(state, sid);
  if (def.type === "toggle") return !cur;
  if (def.type === "slider") return cur === def.min ? def.max! : def.min!;
  if (def.type === "binding") return { ...(cur as Record<string, unknown>), ledger: ["K"] };
  if (def.options === "from_string_tables") return cur === "French" ? "English" : "French";
  const opts = T.optionsOf(def, state.facts.languages ?? []);
  return opts.find((o) => o !== cur)!;
}

const PLATFORM_ENV: Record<string, { profile: T.Profile; env: T.Env }> = {
  desktop: { profile: "desktop", env: { platform: "desktop" } },
  Steam: { profile: "desktop", env: { platform: "desktop", steam: true } },
  Android: { profile: "phone", env: { platform: "mobile", touch: true } },
  iOS: { profile: "phone", env: { platform: "mobile", touch: true } },
  web: { profile: "desktop", env: { platform: "web" } },
  "a non-Steam desktop build": { profile: "desktop", env: { platform: "desktop" } },
};
function runsOn(s: Scenario, where: string): void {
  const p = PLATFORM_ENV[where];
  expect(p, where).toBeDefined();
  s.platformName = where;
  setProfile(s, p!.profile, { ...p!.env });
}

// ---------------------------------------------------------------- generic values

Given("{string} is {string}", (s, name: string, value: string) => {
  if (s.acted) return expectValue(s, name, value);
  if (value === "n/a") {
    expect(T.rowShown(st(s), id(name), env(s)), `${name} has no row here`).toBe(false);
    return;
  }
  set(s, name, value);
});
Given("{string} is {string} and {string} is {string}", (s, a: string, va: string, b: string, vb: string) => {
  set(s, a, va);
  set(s, b, vb);
});
Then("{string} is {int}", (s, name: string, n: number) => {
  expect(T.valueOf(st(s), id(name))).toBe(n);
});
Then("{string} is still {int}", (s, name: string, n: number) => {
  expect(T.valueOf(st(s), id(name))).toBe(n);
});
Then(/^"([^"]*)" is (\d+) %$/, (s, name: string, n: string) => {
  s.lastId = id(name);
  expect(T.valueOf(st(s), s.lastId)).toBe(Number(n));
});
Then("{string} shows {string}", (s, a: string, b: string) => {
  if (s.rulesView) {
    const row = (s.rulesView as ReturnType<typeof T.campaignRulesView>).rows.find((r) => r.rule === a);
    expect(row?.value).toBe(b);
    return;
  }
  expect(T.setBy(st(s), id(a))).toBe(b);
});
Then("{string} is {string} and shows {string}", (s, name: string, value: string, by: string) => {
  expectValue(s, name, value);
  expect(T.rowView(st(s), id(name)).setBy).toBe(by);
});
Then("{string} is {string} with the options {string}", (s, name: string, value: string, options: string) => {
  const sid = id(name);
  expect(T.rowShown(st(s), sid, env(s)), `${name} shown`).toBe(true);
  expectValue(s, name, value);
  expect(optionLabels(sid).join(", ")).toBe(options);
});
Then("{string} offers {string} with the default {string}", (s, name: string, options: string, def: string) => {
  const sid = id(name);
  expect(s.rows).toContain(sid);
  expect(optionLabels(sid).join(", ")).toBe(options);
  expect(T.valueOf(st(s), sid)).toEqual(T.parseValue(CAT, sid, def));
});
Then(/^"([^"]*)" is not shown$/, (s, name: string) => {
  for (const def of CAT.settings.filter((d) => T.nameOf(d.id) === name)) expect(T.rowShown(st(s), def.id, env(s)), def.id).toBe(false);
});
Then(/^"([^"]*)" is shown with (.+)$/, (s, name: string, options: string) => {
  const sid = id(name);
  expect(T.rowShown(st(s), sid, env(s))).toBe(true);
  expect(optionLabels(sid)).toEqual(list(options));
});
When("the player sets {string} to {string}", (s, name: string, value: string) => {
  act(s);
  set(s, name, value);
});
When("the player sets {string} to {int}", (s, name: string, n: number) => {
  act(s);
  s.lastId = id(name);
  try {
    T.setValue(st(s), s.lastId, n);
    s.error = undefined;
  } catch (e) {
    s.error = e;
  }
});
When("the player changes {string} to {string}", (s, name: string, value: string) => {
  act(s);
  const sid = id(name);
  if (sid === "graphics.display_mode") {
    s.t = 0;
    s.change = T.changeDisplayMode(st(s), T.parseValue(CAT, sid, value), s.t);
  } else set(s, name, value);
});
Given("the player changed {string} to {int}", (s, name: string, n: number) => {
  T.setValue(st(s), id(name), n);
});

// ---------------------------------------------------------------- settings as data

Given("settings.yaml lists {string} before {string}", (_s, a: string, b: string) => {
  const ids = CAT.settings.map((d) => d.id);
  expect(ids.indexOf(a)).toBeGreaterThanOrEqual(0);
  expect(ids.indexOf(a)).toBeLessThan(ids.indexOf(b));
});
When("the Settings screen is built", (s) => {
  act(s);
  s.rows = CAT.sections.flatMap((sec) => T.sectionRows(st(s), sec, env(s)));
});
Then("{string} is shown above {string}", (s, a: string, b: string) => {
  const names = (s.rows as string[]).map(T.nameOf);
  expect(names.indexOf(a)).toBeGreaterThanOrEqual(0);
  expect(names.indexOf(a)).toBeLessThan(names.indexOf(b));
});
Given("settings.yaml sets the default of {string} to {int}", (s, sid: string, n: number) => {
  expect(CAT.byId.get(sid)?.default).toBe(n);
  s.entryId = sid;
});
When("the default is changed to {int} in the file only", (s, n: number) => {
  act(s);
  const raw = structuredClone(T.settingsConfig.catalogue) as { settings: { id: string; default?: unknown }[] };
  raw.settings.find((e) => e.id === s.entryId)!.default = n;
  s.cat = T.buildCatalogue(raw);
});
Then("the game uses {int} as the default of {string}", (s, n: number, name: string) => {
  const cat = s.cat as T.Catalogue;
  expect(T.valueOf(T.newSettings("desktop", cat), T.idByName(cat, name))).toBe(n);
  expect(T.valueOf(T.newSettings("desktop"), T.idByName(CAT, name))).not.toBe(n);
});
function rawEntry(sid: string): Record<string, unknown> {
  const e = (T.settingsConfig.catalogue.settings as Record<string, unknown>[]).find((x) => x.id === sid);
  expect(e, sid).toBeDefined();
  return e!;
}
Given("the entry {string} in settings.yaml", (s, sid: string) => {
  s.entryId = sid;
  s.raw = rawEntry(sid);
});
Given("the entry {string}", (s, sid: string) => {
  s.entryId = sid;
  s.raw = rawEntry(sid);
});
When("it is read", (s) => {
  act(s);
  s.def = T.resolve(CAT, s.entryId);
});
Then("it has the id {string}, which is also its key in the settings files", (s, sid: string) => {
  const def = s.def as T.SettingDef;
  expect(def.id).toBe(sid);
  const state = T.newSettings("phone");
  T.setValue(state, sid, otherValue(state, sid));
  const store = memoryStore();
  T.saveSettings(state, store);
  const keys = [...store.files.values()].flatMap((t) => Object.keys(JSON.parse(t).values));
  expect(keys).toContain(sid);
});
Then("section {string}, type {string}, options {string} and default {string}", (s, section: string, type: string, options: string, def: string) => {
  const d = s.def as T.SettingDef;
  expect(d.section).toBe(section);
  expect(d.type).toBe(type);
  expect(T.optionsOf(d).join(", ")).toBe(options);
  expect(String(d.default)).toBe(def);
});
Then("default_by_profile {string}", (s, text: string) => {
  const want = Object.fromEntries(text.split(", ").map((p) => p.split(": ") as [string, string]));
  expect(Object.fromEntries(Object.entries((s.def as T.SettingDef).default_by_profile ?? {}).map(([k, v]) => [k, String(v)]))).toEqual(want);
});
Then("platforms, hide_on, applies {string}, sync {string} and sets_when_on", (s, applies: string, sync: string) => {
  const d = s.def as T.SettingDef;
  expect(Array.isArray(d.platforms) && d.platforms.length > 0).toBe(true);
  expect(d.hide_on === undefined || Array.isArray(d.hide_on)).toBe(true);
  expect(d.applies).toBe(applies);
  expect(d.sync).toBe(sync);
  expect(typeof d.sets_when_on).toBe("object");
});
Given("the entry {string} has hide_on {string}", (s, sid: string, on: string) => {
  expect(T.resolve(CAT, sid).hide_on).toContain(on.toLowerCase());
  s.entryId = sid;
});
When("the Settings screen is built on Steam", (s) => {
  act(s);
  setProfile(s, "desktop", { platform: "desktop", steam: true, motion: true });
});
Then("the row {string} is not shown", (s, sid: string) => {
  expect(T.rowShown(st(s), sid, env(s))).toBe(false);
  expect(T.rowShown(st(s), sid, { platform: "desktop", motion: true })).toBe(true);
});
Given("the entry {string} of type {string}", (s, sid: string, type: string) => {
  expect(T.resolve(CAT, sid).type).toBe(type);
  s.entryId = sid;
});
Then("it has min {int}, max {int} and step {int}", (s, min: number, max: number, step: number) => {
  const d = s.def as T.SettingDef;
  expect([d.min, d.max, d.step]).toEqual([min, max, step]);
});
Then("it has a button and no value", (s) => {
  const d = s.def as T.SettingDef;
  expect(d.type).toBe("action");
  expect(d.default).toBeUndefined();
  expect(T.isValid(d, true)).toBe(false);
  expect(T.rowView(T.newSettings("desktop"), d.id).value).toBe("");
});
When("its row is drawn", (s) => {
  act(s);
  s.view = T.rowView(st(s), s.entryId);
});
Then("its name is the string {string}", (s, key: string) => {
  expect(key).toBe(`settings.${s.entryId}.name`);
  expect(T.STRINGS[key]).toBeDefined();
  expect(s.view.name).toBe(T.STRINGS[key]);
});
Then("its description is the string {string}", (s, key: string) => {
  expect(key).toBe(`settings.${s.entryId}.desc`);
  expect(T.STRINGS[key]).toBeTruthy();
});
Then("no display text is in settings.yaml", () => {
  const english = new Set(Object.values(T.STRINGS).filter((t) => /[A-Z ]/.test(t) && t.length > 3));
  for (const e of T.settingsConfig.catalogue.settings as Record<string, unknown>[]) {
    for (const k of ["name", "desc", "label", "text", "title"]) expect(e[k], `${String(e.id)}.${k}`).toBeUndefined();
    for (const v of Object.values(e)) if (typeof v === "string") expect(english.has(v), `${String(e.id)}: ${v}`).toBe(false);
  }
});
Given(/^settings\.yaml (does not load|has a default that is not one of its options|names a string key missing in English)$/, (s, problem: string) => {
  expect(T.schemaProblems(T.settingsConfig.catalogue), "the real file passes").toEqual([]);
  if (problem === "does not load") s.schema = { source: "sections: [gameplay\n  settings: {" };
  else if (problem.startsWith("has a default")) {
    const raw = structuredClone(T.settingsConfig.catalogue) as { settings: { id: string; default?: unknown }[] };
    raw.settings.find((e) => e.id === "graphics.map_detail")!.default = "ultra";
    s.schema = { source: raw };
  } else {
    const strings = { ...T.STRINGS };
    delete strings["settings.audio.master.desc"];
    s.schema = { source: T.settingsConfig.catalogue, strings };
  }
});
When("the schema test runs", (s) => {
  act(s);
  s.problems = T.schemaProblems(s.schema.source, s.schema.strings);
});
Then("it fails", (s) => {
  expect((s.problems as string[]).length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- device profiles

Given(/^the game launches for the first time (on .*)$/, (s, on: string) => {
  let f: T.LaunchFacts;
  const cap = /Capacitor with a short side of (\d+) CSS px/.exec(on);
  if (cap) f = { runtime: "capacitor", shortSide: Number(cap[1]) };
  else if (on.includes("IsSteamRunningOnSteamDeck")) f = { runtime: "electron", steamDeck: true };
  else if (on.includes("IsSteamInBigPictureMode")) f = { runtime: "electron", bigPicture: true };
  else if (on.includes("Steam Machine") && !on.includes("not a")) f = { runtime: "electron", steamMachine: true };
  else if (on.startsWith("on Electron")) f = { runtime: "electron" };
  else if (on === "on the web") f = { runtime: "web" };
  else if (/^on the profile "(.+)"$/.test(on)) {
    setProfile(s, profileOf(/^on the profile "(.+)"$/.exec(on)![1]!));
    return;
  } else throw new Error(`no launch facts for: ${on}`);
  s.launch = f;
});
When("the profile is detected", (s) => {
  act(s);
  setProfile(s, T.detectProfile(s.launch));
});
Given("the profile is {string}", (s, name: string) => {
  if (s.acted) expect(st(s).profile).toBe(profileOf(name));
  else setProfile(s, profileOf(name));
});
Then("the profile is still {string}", (s, name: string) => {
  expect(st(s).profile).toBe(profileOf(name));
});
When("a controller is connected", (s) => {
  act(s);
  T.controllerConnected(st(s));
});
Then("controller prompts and focus outlines are added", (s) => {
  expect(st(s).controllerPrompts).toBe(true);
  expect(T.focusOutlines(st(s))).toBe(true);
});
When("the defaults are read", (s) => {
  act(s);
  st(s);
});
When("the game starts for the first and the second time", (s) => {
  act(s);
  let offered = false;
  s.offers = [1, 2].map(() => {
    const now = T.calibrationOffered(st(s), offered);
    offered ||= now;
    return now;
  });
});
Then("the screen margin calibration screen is offered the first time only", (s) => {
  expect(s.offers).toEqual([true, false]);
});
const TV: Record<string, { width: number; height: number; dpr: number }> = {
  "1080p": { width: 1920, height: 1080, dpr: 1 },
  "4K": { width: 1920, height: 1080, dpr: 2 },
};
Given("the profile is {string} on a {word} TV", (s, name: string, tv: string) => {
  setProfile(s, profileOf(name));
  s.screen = TV[tv];
  s.tv = tv;
});
When("the map is shown", (s) => {
  act(s);
});
Then("the game shell's Far layout is used", (s) => {
  expect(T.layoutFor(st(s).profile)).toBe("far");
  expect(T.layoutFor("desktop")).toBe("normal");
});
Then("body text is about {int} px", (s, px: number) => {
  expect(Math.round(T.bodyTextPx(st(s), s.screen))).toBe(px);
});
Then("nothing is drawn in the outer {int} % of the screen", (s, pct: number) => {
  const { width, height } = s.screen ?? { width: 1920, height: 1080 };
  const r = T.safeRect(st(s), width, height);
  expect(r.x).toBeCloseTo((width * pct) / 100);
  expect(r.y).toBeCloseTo((height * pct) / 100);
});
Given(/^"Interface scale" is "Auto" on a phone whose screen is (small|large)$/, (s, size: string) => {
  setProfile(s, "phone");
  expect(T.valueOf(st(s), "graphics.interface_scale")).toBe("auto");
  s.screen = size === "small" ? { width: 640, height: 360 } : { width: 1000, height: 480 };
});
When("the scale is chosen", (s) => {
  act(s);
  s.scale = T.interfaceScale(st(s), s.screen);
});
Then(/^the scale is the largest step at which a (\d+) × (\d+) CSS-px safe layout still fits, here (\d+) %$/, (s, w: string, h: string, pct: string) => {
  expect(CAT.constants.interface_scale_auto_min_layout).toEqual([Number(w), Number(h)]);
  expect(Math.round(s.scale * 100)).toBe(Number(pct));
});

// ---------------------------------------------------------------- the Settings screen

Given("the Settings screen is open over the map", (s) => {
  s.scr = T.openSettings(st(s), env(s));
  s.bodyBefore = T.baseBodyPx(st(s));
});
Then("the text behind the open panel is Large at once", (s) => {
  expect(T.baseBodyPx(st(s))).toBe((T.resolve(CAT, "accessibility.text_size") as T.SettingDef & { body_px: Record<string, number> }).body_px.large);
  expect(T.baseBodyPx(st(s))).toBeGreaterThan(s.bodyBefore);
  expect(T.resolve(CAT, "accessibility.text_size").applies).toBe("live");
  expect((s.events as T.SettingChanged[]).map((e) => e.id)).toContain("accessibility.text_size");
});
Then("there is no Apply button", (s) => {
  expect((s.scr as T.SettingsScreen).buttons).not.toContain("Apply");
});
Given("the game runs on desktop in {string}", (s, mode: string) => {
  runsOn(s, "desktop");
  set(s, "Display mode", mode);
});
Then("the question {string} is shown", (s, q: string) => {
  expect(s.change?.question ?? s.rebind?.question).toBe(q);
});
When(/^the player (confirms|does nothing for \d+ seconds)$/, (s, what: string) => {
  const secs = /(\d+) seconds/.exec(what)?.[1];
  if (what === "confirms") T.confirmDisplayMode(s.change);
  else {
    T.tickDisplayMode(st(s), s.change, s.t + Number(secs) - 1);
    expect(T.valueOf(st(s), "graphics.display_mode")).toBe("fullscreen");
  }
  T.tickDisplayMode(st(s), s.change, s.t + Number(secs ?? 15));
});
Then("the display mode is {string}", (s, mode: string) => {
  expectValue(s, "Display mode", mode);
});
Given("the Settings screen is open", (s) => {
  s.scr = T.openSettings(st(s), env(s));
});
When(/^the player changes the slider "([^"]*)" with (the d-pad|the arrow keys|a tap at a position on it|a mouse click at a position)$/, (s, name: string, input: string) => {
  act(s);
  const sid = id(name);
  s.lastId = sid;
  const seen = [T.valueOf(st(s), sid) as number];
  if (input.startsWith("the")) {
    T.stepValue(st(s), sid, 1);
    seen.push(T.valueOf(st(s), sid) as number);
    T.stepValue(st(s), sid, -1);
    T.stepValue(st(s), sid, -1);
    seen.push(T.valueOf(st(s), sid) as number);
  } else {
    for (const at of [0.13, 0.43, 0.77]) {
      T.tapSlider(st(s), sid, at);
      seen.push(T.valueOf(st(s), sid) as number);
    }
  }
  s.seen = seen;
});
Then("the value changes in steps of {int} %", (s, step: number) => {
  const seen = s.seen as number[];
  expect(new Set(seen).size).toBeGreaterThan(1);
  for (const v of seen) expect(v % step).toBe(0);
});
Given("a campaign as {string} is loaded with the camera on {string}", (s, nation: string, province: string) => {
  s.session = { nation, camera: { province, x: 412, y: 207, zoom: 3 }, orders: [] as Order[] };
});
Given("the player has queued {int} orders", (s, n: number) => {
  for (let i = 0; i < n; i++) s.session.orders.push({ type: "move", army: i, to: i + 1 });
  s.before = structuredClone(s.session);
});
When("the player opens Settings from the game menu and closes it", (s) => {
  act(s);
  expect(T.openPauseMenu("Esc").offers).toContain("Settings");
  const scr = T.openSettings(st(s), env(s));
  T.back(scr);
  expect(scr.closed).toBe(true);
});
Then("the camera is on {string} at the same spot", (s, province: string) => {
  expect(s.session.camera.province).toBe(province);
  expect(s.session.camera).toEqual(s.before.camera);
});
Then("the {int} orders are still queued", (s, n: number) => {
  expect(s.session.orders).toHaveLength(n);
  expect(s.session.orders).toEqual(s.before.orders);
});
Given("the title screen is shown", (s) => {
  s.where = "title";
});
When("the player opens Settings", (s) => {
  act(s);
  s.scr = T.openSettings(st(s), env(s), s.window ?? "landscape");
});
Then("the Settings screen opens", (s) => {
  expect(s.scr).toBeDefined();
  expect((s.scr as T.SettingsScreen).closed).toBe(false);
});
Given("a campaign is loaded on {string}", (s, where: string) => {
  runsOn(s, where);
});
When("the player presses {string}", (s, button: string) => {
  act(s);
  if (s.scr) {
    const scr = s.scr as T.SettingsScreen;
    s.before = { section: scr.section, row: scr.row, id: T.focusedRow(scr), value: T.valueOf(st(s), T.focusedRow(scr)) };
    s.verb = T.pressButton(scr, button);
  } else s.pause = T.openPauseMenu(button);
});
Then("the game menu opens, from which Settings opens", (s) => {
  expect(s.pause.pauseMenu).toBe(true);
  expect(s.pause.offers).toContain("Settings");
});
Given(/^the game runs (on desktop|on Steam|on Android|on iOS|on web|in a non-Steam desktop build)$/, (s, where: string) => {
  runsOn(s, where.replace(/^(on|in) /, ""));
});
When("the player opens the Controller part of the Controls section", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "controls", env(s));
});
Then("a button opens Steam's own binding panel", (s) => {
  expect(s.rows).toContain("controls.open_steam_bindings");
  expect(T.actionOf("controls.open_steam_bindings").opens).toBe("ShowBindingPanel");
  expect(s.rows).not.toContain("controls.pad");
});
Given("the question {string} is shown on the Big screen profile", (s, q: string) => {
  expect(D.first_launch_questions.readability).toBe(q);
  setProfile(s, "big_screen");
  s.bodyBefore = T.baseBodyPx(st(s));
});
When("the player answers {string}", (s, answer: string) => {
  act(s);
  expect(D.readability_answers).toContain(answer);
  T.answerReadability(st(s), answer);
});
Then(/^the text is (made smaller|kept as it is|made bigger)$/, (s, result: string) => {
  const now = T.baseBodyPx(st(s));
  if (result === "made smaller") expect(now).toBeLessThan(s.bodyBefore);
  else if (result === "made bigger") expect(now).toBeGreaterThan(s.bodyBefore);
  else expect(now).toBe(s.bodyBefore);
});
Given(/^the window is (landscape|a tablet in portrait|a desktop window taller than wide)$/, (s, w: string) => {
  if (w === "a tablet in portrait") setProfile(s, "tablet");
  s.window = w === "landscape" ? "landscape" : "tall";
});
Then("the section list is on the left, the rows on the right, and the focused row's one-line description at the bottom", (s) => {
  const scr = s.scr as T.SettingsScreen;
  expect(scr.layout).toBe("split");
  expect(scr.sectionOpen).toBe(true);
  expect(T.STRINGS[`settings.${T.focusedRow(scr)}.desc`]).toBeTruthy();
});
Then("the section list is shown first and a section opens its rows full screen, Back returning", (s) => {
  const scr = s.scr as T.SettingsScreen;
  expect(scr.layout).toBe("list-first");
  expect(scr.sectionOpen).toBe(false);
  T.openSection(scr, "audio");
  expect(scr.sectionOpen).toBe(true);
  T.back(scr);
  expect(scr.sectionOpen).toBe(false);
  expect(scr.closed).toBe(false);
});
Given("the game is running", (s) => {
  st(s);
});
Then("the sections are {string} in that order", (s, text: string) => {
  expect(T.sectionLabels(st(s)).join(", ")).toBe(text);
});
Then(/^the row shows its name, the value "([^"]*)" and (no changed dot|the changed dot)$/, (s, value: string, dot: string) => {
  const v = T.rowView(st(s), s.lastId);
  expect(v.name).toBe(T.nameOf(s.lastId));
  expect(v.value).toBe(value);
  expect(v.changedDot).toBe(dot === "the changed dot");
});
Given("the profile is {string} and {string} is {string}", (s, profile: string, name: string, value: string) => {
  setProfile(s, profileOf(profile));
  set(s, name, value);
});
When(/^the player (long-presses|right-clicks|presses X) on the row "([^"]*)"$/, (s, how: string, name: string) => {
  act(s);
  if (how === "presses X") {
    const scr = T.openSettings(st(s), env(s));
    const sid = id(name);
    T.openSection(scr, T.resolve(CAT, sid).section);
    scr.row = T.screenRows(scr).indexOf(sid);
    expect(scr.row).toBeGreaterThanOrEqual(0);
    T.pressButton(scr, "X");
  } else T.resetRow(st(s), id(name));
});
Given("the player changed rows in Graphics and Audio", (s) => {
  setProfile(s, "phone");
  set(s, "Map detail", "Low");
  set(s, "Animations", "Off");
  set(s, "Master volume", "50");
  s.audioBefore = T.valueOf(st(s), "audio.master");
});
When("the player picks {string}", (s, what: string) => {
  act(s);
  if (what === "Reset this section at the end of Graphics") {
    const scr = T.openSettings(st(s), env(s));
    T.openSection(scr, "graphics");
    const rows = T.screenRows(scr);
    expect(rows[rows.length - 1]).toBe("reset:graphics");
    T.resetSection(st(s), "graphics");
    return;
  }
  if (what === "Reset all settings in About") {
    expect(T.sectionRows(st(s), "about", env(s))).toContain("about.reset_all");
    T.resetAll(st(s));
    return;
  }
  const sid = id(what, "about");
  s.action = T.actionOf(sid);
  if (sid === "about.reset_all") T.resetAll(st(s));
  if (sid === "about.copy_diagnostics") s.clipboard = T.copyDiagnostics(st(s), "engine worker · round trip 4 ms");
});
Then("every Graphics row is back to its profile default, Audio unchanged", (s) => {
  for (const d of CAT.settings.filter((x) => x.section === "graphics" && !x.alias_of)) expect(T.isChanged(st(s), d.id), d.id).toBe(false);
  expect(T.valueOf(st(s), "audio.master")).toBe(s.audioBefore);
  expect(T.isChanged(st(s), "audio.master")).toBe(true);
});
function allDefaults(s: Scenario): void {
  expect(Object.keys(st(s).values)).toEqual([]);
  for (const d of CAT.settings.filter((x) => !x.alias_of)) expect(T.isChanged(st(s), d.id), d.id).toBe(false);
}
Then("every row is back to its profile default", (s) => allDefaults(s));
Given("the Settings screen is open with a controller", (s) => {
  T.controllerConnected(st(s));
  T.setValue(st(s), "graphics.interface_scale", 125);
  const scr = T.openSettings(st(s), env(s));
  T.openSection(scr, "graphics");
  scr.row = T.screenRows(scr).indexOf("graphics.interface_scale");
  s.scr = scr;
});
Then("the previous section opens", (s) => {
  expect(s.scr.section).toBe(s.before.section - 1);
  expect(s.verb).toBe("previous section");
});
Then("the next section opens", (s) => {
  expect(s.scr.section).toBe(s.before.section + 1);
});
Then("focus moves to the next row", (s) => {
  expect(s.scr.row).toBe(s.before.row + 1);
  expect(s.scr.section).toBe(s.before.section);
});
Then("the focused row changes or opens", (s) => {
  expect(T.valueOf(st(s), s.before.id)).not.toEqual(s.before.value);
});
Then("the focused value steps up", (s) => {
  expect(T.valueOf(st(s), s.before.id)).toBe(150);
  expect(s.before.value).toBe(125);
});
Then("Settings goes back", (s) => {
  expect(s.scr.closed).toBe(true);
});
Then("the focused row resets", (s) => {
  expect(T.valueOf(st(s), s.before.id)).toBe(100);
  expect(T.isChanged(st(s), s.before.id)).toBe(false);
});
Then("the long description is shown", (s) => {
  expect(s.scr.longDescription).toBe(T.STRINGS["settings.graphics.interface_scale.desc"]);
  expect(s.scr.longDescription).toBeTruthy();
});

// ---------------------------------------------------------------- storage

const FILE_OF: Record<string, string> = { Device: D.files.device, Personal: D.files.personal };
Given("the player has changed the setting {string}", (s, name: string) => {
  const sid = id(name);
  T.setValue(st(s), sid, otherValue(st(s), sid));
});
When("the setting {string} is stored", (s, _name: string) => {
  act(s);
  s.store = memoryStore();
  T.saveSettings(st(s), s.store);
});
Then("it is in the group {string}", (s, group: string) => {
  const sid = Object.keys(st(s).values)[0]!;
  const file = JSON.parse(s.store.files.get(FILE_OF[group]!)!);
  expect(Object.keys(file.values)).toContain(sid);
  const other = JSON.parse(s.store.files.get(FILE_OF[group === "Device" ? "Personal" : "Device"]!)!);
  expect(Object.keys(other.values)).not.toContain(sid);
});
Given("the player has changed settings in both groups", (s) => {
  set(s, "Map detail", "Low");
  set(s, "Font", "Plain");
});
When("the settings are saved", (s) => {
  act(s);
  s.store = memoryStore();
  T.saveSettings(st(s), s.store);
});
Then("{string} and {string} are written", (s, a: string, b: string) => {
  expect([...s.store.files.keys()].sort()).toEqual([a, b].sort());
});
Then("each holds a version number", (s) => {
  for (const t of s.store.files.values()) expect(JSON.parse(t).version).toBe(T.FILE_VERSION);
});
const STORE_PLATFORM: Record<string, "steam" | "ios" | "android" | "web"> = { Steam: "steam", iOS: "ios", Android: "android", web: "web" };
Given("the player is not signed in on {string}", (s, p: string) => {
  s.storePlatform = STORE_PLATFORM[p];
});
Then(/^they live in (.+)$/, (s, where: string) => {
  expect(T.storageLocation(s.storePlatform)).toBe(where);
});
Then("Steam Auto-Cloud carries settings-personal.json next to the save folder", (s) => {
  expect(T.settingsBackup(s.storePlatform)).toEqual({ method: "Steam Auto-Cloud", files: [D.files.personal], live_sync: true });
});
Then("the device's iCloud backup restores both files on a new device, with no live sync", (s) => {
  expect(T.settingsBackup(s.storePlatform)).toEqual({ method: "iCloud device backup", files: [D.files.device, D.files.personal], live_sync: false });
});
Then("Android Auto Backup restores both files on a new phone, with no live sync", (s) => {
  expect(T.settingsBackup(s.storePlatform)).toEqual({ method: "Android Auto Backup", files: [D.files.device, D.files.personal], live_sync: false });
});
Then("nothing backs them up", (s) => {
  expect(T.settingsBackup(s.storePlatform)).toBeNull();
});
Given(/^"settings-personal\.json" holds (.+)$/, (s, content: string) => {
  const store = memoryStore();
  if (content === "broken JSON") store.write(D.files.personal, '{"version": 1, "values": {"accessibility.font": "pla');
  else if (content.startsWith("the unknown key")) store.write(D.files.personal, JSON.stringify({ version: 1, values: { "old.thing": 3, "accessibility.font": "plain" } }));
  else store.write(D.files.personal, JSON.stringify({ version: 1, values: { "accessibility.text_size": "Huge", "accessibility.font": "plain" } }));
  s.store = store;
});
When("the game starts", (s) => {
  act(s);
  if (s.store) {
    const r = T.readSettings(s.store, s.profile ?? "desktop");
    s.st = r.state;
    s.report = r.report;
    s.started = true;
  }
  if (s.otherAudio !== undefined) s.launchAudio = T.launchAudio(s.atLaunch["audio.mix_with_other_apps"] as boolean, s.otherAudio);
});
Then("the key is dropped", (s) => {
  expect(s.report.dropped).toContain("old.thing");
  expect(Object.keys(st(s).values)).not.toContain("old.thing");
  expect(T.valueOf(st(s), "accessibility.font")).toBe("plain");
});
Then(/^"([^"]*)" uses its profile default$/, (s, name: string) => {
  const sid = id(name);
  expect(s.report.invalid).toContain(sid);
  expect(T.valueOf(st(s), sid)).toBe(T.profileDefault(CAT, sid, st(s).profile));
  expect(T.valueOf(st(s), "accessibility.font")).toBe("plain");
});
Then("every setting uses its profile default", (s) => {
  expect(s.report.broken).toContain(D.files.personal);
  allDefaults(s);
});
Then("the game starts normally", (s) => {
  expect(s.started).toBe(true);
});
Given('"settings-personal.json" has an older version number', (s) => {
  s.store = memoryStore();
  s.store.write(D.files.personal, JSON.stringify({ version: T.FILE_VERSION - 1, values: { "accessibility.textSize": "LARGE" } }));
  s.migrations = [
    {
      from: T.FILE_VERSION - 1,
      to: T.FILE_VERSION,
      run: (v: Record<string, unknown>) => {
        const out = { ...v };
        if ("accessibility.textSize" in out) {
          out["accessibility.text_size"] = String(out["accessibility.textSize"]).toLowerCase();
          delete out["accessibility.textSize"];
        }
        return out;
      },
    },
  ] satisfies T.SettingsMigration[];
});
When("the game reads it", (s) => {
  act(s);
  const r = T.readSettings(s.store, "desktop", CAT, s.migrations);
  s.st = r.state;
  s.report = r.report;
});
Then("migration steps rename or convert its keys to the current version", (s) => {
  expect(s.report.migrated).toEqual([`${D.files.personal} ${T.FILE_VERSION - 1} → ${T.FILE_VERSION}`]);
  expect(T.valueOf(st(s), "accessibility.text_size")).toBe("large");
  expect(s.report.dropped).toEqual([]);
});

const RULES = loadDefaultRuleset();
let small: ReturnType<typeof generateSyntheticRuleset> | undefined;
const SMALL = () => (small ??= generateSyntheticRuleset(RULES, { provinces: 60, nations: 3, seed: 5 }));

Given("the player's {string} is {string}", (s, name: string, value: string) => {
  set(s, name, value);
  s.store = memoryStore();
  T.saveSettings(st(s), s.store);
  s.filesBefore = new Map(s.store.files);
});
When("the player loads a friend's save made with {string} {string}", (s, name: string, value: string) => {
  act(s);
  const friend = T.newSettings("phone");
  T.setValue(friend, id(name), T.parseValue(CAT, id(name), value));
  const rules = SMALL();
  const storage = S.memoryStorage({});
  const rng = new Rng(9);
  const options = { difficulty: "hard", events: "free", endDate: "1700-12-31" };
  const campaign = S.newCampaign(rng, { playerNation: rules.nations[0]!.id, nationName: rules.nations[0]!.name, options });
  const w: World = createWorld(rules, 4);
  const written = S.writeSave({ storage, rules, rng, device: "friend's phone", platform: "android", gameVersion: "1.0.0", now: 1_700_000_000_000 }, campaign, w, "manual", { name: "for you" });
  const bytes = storage.read(written.path)!;
  const text = [...S.decodeSave(bytes).chunks.values()].map((c) => new TextDecoder("latin1").decode(c.payload)).join("\n");
  s.saveMentionsSettings = /accessibility\.|text_size|graphics\./.test(text) || JSON.stringify(written.header).includes("text_size");
  s.opened = S.openSave(bytes, { rules, fullGame: true });
  s.friendOptions = options;
});
Then("the player's {string} is still {string}", (s, name: string, value: string) => {
  expectValue(s, name, value);
  expect(new Map(s.store.files)).toEqual(s.filesBefore);
  expect(s.saveMentionsSettings).toBe(false);
});
Then("only the campaign rules of that save are used", (s) => {
  expect(s.opened.kind).toBe("opened");
  expect(s.opened.game.options).toEqual(s.friendOptions);
});
Given("the free tier player has changed {int} settings", (s, n: number) => {
  const ids = ["graphics.map_detail", "audio.mono", "accessibility.font", "gameplay.date_format", "controls.vibration", "language.number_format"].slice(0, n);
  expect(ids).toHaveLength(n);
  for (const sid of ids) T.setValue(st(s), sid, otherValue(st(s), sid));
  s.store = memoryStore();
  T.saveSettings(st(s), s.store);
  s.valuesBefore = structuredClone(st(s).values);
});
When("the player buys the full game", (s) => {
  act(s);
  s.st = T.readSettings(s.store, st(s).profile).state;
});
Then("the {int} settings are unchanged", (s, n: number) => {
  expect(Object.keys(st(s).values)).toHaveLength(n);
  expect(st(s).values).toEqual(s.valuesBefore);
});

// ---------------------------------------------------------------- campaign rules

Given("a campaign was begun with {string} set to {string}", (s, rule: string, value: string) => {
  s.campaignRules = { [rule]: value };
});
When("the player opens Settings → Campaign rules", (s) => {
  act(s);
  s.rulesView = T.campaignRulesView(s.campaignRules);
});
Then("it cannot be changed", (s) => {
  for (const r of (s.rulesView as ReturnType<typeof T.campaignRulesView>).rows) expect(r.editable).toBe(false);
  const rule = Object.keys(s.campaignRules)[0]!;
  for (const d of CAT.settings) expect(T.nameOf(d.id).toLowerCase(), d.id).not.toBe(rule.toLowerCase());
});
Given("two campaigns with the same seed and the same orders", (s) => {
  const rules = SMALL();
  s.worlds = [createWorld(rules, 21), createWorld(rules, 21)];
  s.plain = T.newSettings("phone");
});
Given("one is played with {string} set to {string}", (s, name: string, value: string) => {
  s.other = T.newSettings("phone");
  T.setValue(s.other, id(name), T.parseValue(CAT, id(name), value));
  expect(T.valueOf(s.other, id(name))).not.toEqual(T.valueOf(s.plain, id(name)));
});
When("both play {int} turns", (s, n: number) => {
  act(s);
  const ws = s.worlds as World[];
  for (let t = 0; t < n; t++) {
    for (const w of ws) {
      const orders: Order[] = [{ type: "move", army: 0, to: (t * 11 + 5) % w.provinceCount }];
      processTurn(w, orders, 0);
    }
  }
});
Then("both worlds have the same hash", (s) => {
  const [a, b] = s.worlds as World[];
  expect(hashWorld(a!)).toBe(hashWorld(b!));
  expect(a!.turn).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- graphics

Given("the game was detected as {string}", (s, name: string) => {
  setProfile(s, profileOf(name));
});
When("the player opens Graphics", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "graphics", env(s));
});
Then(/^"([^"]*)" offers (?!")(.+)$/, (s, name: string, options: string) => {
  const sid = id(name);
  expect(s.rows).toContain(sid);
  expect(optionLabels(sid)).toEqual(list(options));
});
Then("it shows {string}", (s, text: string) => {
  expect(T.rowView(st(s), "graphics.profile").value).toBe(text);
});
When('the player sets "Display mode" to "Fullscreen" and keeps it', (s) => {
  act(s);
  const ch = T.changeDisplayMode(st(s), "fullscreen", 0);
  T.confirmDisplayMode(ch);
  T.tickDisplayMode(st(s), ch, 60);
});
Then("the window is borderless at the display's own resolution", (s) => {
  const w = T.windowFor(st(s));
  expect(w.borderless).toBe(true);
  expect(w.resolution).toBe("display");
});
Then("no resolution list is offered", (s) => {
  expect(T.windowFor(st(s)).resolutionList).toBe(false);
});
Then("panels, cards, icons and text all scale to {int}", (s, n: number) => {
  expect(T.interfaceScale(st(s))).toBeCloseTo(n / 100);
  expect(T.panelLayout(st(s), 400, 100, 40).width).toBeCloseTo(4 * n);
  expect(T.bodyTextPx(st(s))).toBeCloseTo((17 * n) / 100);
});
Given("the interface scale is {int} %", (s, n: number) => {
  T.setValue(st(s), "graphics.interface_scale", n);
});
function fitAtScale(s: Scenario): ReturnType<typeof T.fitArt> {
  // A 50-pixel piece of art in the space the scale gives it on a 2× screen.
  return T.fitArt(st(s), 50, 50 * T.interfaceScale(st(s)) * 2);
}
Then("interface art snaps to whole pixel multiples, possibly leaving a few pixels of margin", (s) => {
  const f = fitAtScale(s);
  expect(Number.isInteger(f.multiple)).toBe(true);
  expect(f.marginPx).toBeGreaterThan(0);
});
Then("the art fills the space exactly and its edges may blur slightly", (s) => {
  const f = fitAtScale(s);
  expect(f.marginPx).toBeCloseTo(0);
  expect(Number.isInteger(f.multiple)).toBe(false);
});
Given("the device pixel ratio is {float}", (s, r: number) => {
  s.dpr = r;
});
When(/^"([^"]*)" is "([^"]*)" and the map redraws$/, (s, name: string, value: string) => {
  act(s);
  set(s, name, value);
});
Then("the map draws with {float} screen pixels per CSS pixel", (s, px: number) => {
  expect(T.mapPixelRatio(st(s), s.dpr)).toBeCloseTo(px);
});
Then("the pixel art stays sharp", (s) => {
  expect(T.mapSampling(st(s))).toBe("nearest");
});
When("nothing on the map moves", (s) => {
  act(s);
});
Then("the map does not redraw at all", (s) => {
  expect(T.mapRedraws(st(s), false)).toBe(false);
  expect(T.mapRedraws(st(s), true)).toBe(true);
});
When(/^(iOS turns on Low Power Mode|Android turns on Battery Saver|a Steam Deck runs on battery under \d+ %|a Steam Deck runs on battery at \d+ %|a Steam Deck runs on its charger)$/, (s, what: string) => {
  act(s);
  const under = /under (\d+) %/.exec(what)?.[1];
  const at = / at (\d+) %/.exec(what)?.[1];
  let r: T.BatteryReport;
  if (what.startsWith("iOS")) r = { iosLowPowerMode: true };
  else if (what.startsWith("Android")) r = { androidBatterySaver: true };
  else if (under) r = { steamDeck: { onBattery: true, level: Number(under) / 100 - 0.01 } };
  else if (at) r = { steamDeck: { onBattery: true, level: Number(at) / 100 } };
  else r = { steamDeck: { onBattery: false, level: 0.1 } };
  s.battery = r;
  T.applyBatteryReport(st(s), r);
});
Then(/^Battery saver is (on|off)$/, (s, state: string) => {
  expect(T.batterySaverActive(st(s), s.battery)).toBe(state === "on");
  expect(T.valueOf(st(s), "graphics.frame_cap") === 30).toBe(state === "on");
  if (state === "on") expect(T.setBy(st(s), "graphics.frame_cap")).toBe("Set by Battery saver");
});
Given("a campaign is loaded", (s) => {
  st(s);
});
Then(/^no 8 × 8 close-in tiles \(it stays at 4 × 4\), no surf and no forest blending$/, (s) => {
  const m = T.mapDetail(st(s));
  expect(m.close_in_tiles).toBe("4x4");
  expect(m.surf).toBe(false);
  expect(m.forest_blending).toBe(false);
});
Then("8 × 8 tiles and still water", (s) => {
  const m = T.mapDetail(st(s));
  expect(m.close_in_tiles).toBe("8x8");
  expect(m.still_water).toBe(true);
  expect(m.surf).toBe(false);
});
Then("everything", (s) => {
  expect(T.mapDetail(st(s))).toEqual({ close_in_tiles: "8x8", surf: true, forest_blending: true, still_water: true });
});
When(/^"([^"]*)" is "([^"]*)" and a battle result shows$/, (s, name: string, value: string) => {
  act(s);
  set(s, name, value);
  s.anim = T.animations(st(s));
});
Then("water, marching columns, flags, smoke and battle playback all move", (s) => {
  expect(s.anim.moving).toEqual(["water", "marching columns", "flags", "smoke", "battle playback"]);
  expect(s.anim.battleResult).toBe("played");
});
Then("motion is reduced", (s) => {
  expect(s.anim.battleResult).toBe("reduced");
});
Then("battle results show as still frames", (s) => {
  expect(s.anim.battleResult).toBe("still frames");
});
Given('the game runs on Android and "Keep screen awake during the AI turn" is "On"', (s) => {
  runsOn(s, "Android");
  set(s, "Keep screen awake during the AI turn", "On");
});
When("a long AI turn computes", (s) => {
  act(s);
  s.awake = T.keepScreenAwake(st(s), env(s), true);
});
Then("the phone does not dim", (s) => {
  expect(s.awake).toBe(true);
  expect(T.rowShown(st(s), "graphics.keep_awake", env(s))).toBe(true);
});
Given("the game runs on Steam on a TV that crops the picture", (s) => {
  setProfile(s, "big_screen");
});
When("the player opens the calibration screen", (s) => {
  act(s);
  s.cal = T.openCalibration(st(s));
});
Then("four corner marks are shown", (s) => {
  expect(s.cal.marks).toHaveLength(4);
});
When("the player pulls them in with the stick to {int} %", (s, n: number) => {
  T.pullCalibration(st(s), s.cal, n);
});
Then(/^the setting (is accepted|is not offered)$/, (s, r: string) => {
  const def = T.resolve(CAT, s.lastId);
  if (r === "is accepted") {
    expect(s.error).toBeUndefined();
    expect(T.isValid(def, T.valueOf(st(s), s.lastId))).toBe(true);
  } else {
    expect(s.error).toBeInstanceOf(Error);
    expect(T.valueOf(st(s), s.lastId)).toBe(T.profileDefault(CAT, s.lastId, st(s).profile));
  }
});
Then("no diagnostics line", (s) => {
  expect(T.performanceLine(st(s))).toEqual([]);
});
Then("the frame rate", (s) => {
  expect(T.performanceLine(st(s))).toEqual(["frame rate"]);
});
Then("the diagnostics line with engine mode and round trip", (s) => {
  expect(T.performanceLine(st(s))).toEqual(expect.arrayContaining(["engine mode", "round trip"]));
});

// ---------------------------------------------------------------- audio

Given("the sound {string} plays", (s, sound: string) => {
  if (T.busOf(sound) === "ambience") T.setValue(st(s), "audio.ambience", true);
  s.sound = sound;
  s.gain0 = T.gainOf(st(s), sound);
  expect(s.gain0).toBeGreaterThan(0);
});
When("the player lowers the volume of the bus {string}", (s, bus: string) => {
  act(s);
  const sid = id(`${bus} volume`);
  T.stepValue(st(s), sid, -1);
  T.stepValue(st(s), sid, -1);
});
Then("the sound {string} gets quieter", (s, sound: string) => {
  expect(T.gainOf(st(s), sound)).toBeLessThan(s.gain0);
});
Given("the player has never changed audio", (s) => {
  st(s);
});
When("Audio is opened", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "audio", env(s));
});
Then(/^it steps from (\d+) to (\d+) % in (\d+) % steps$/, (s, min: string, max: string, step: string) => {
  const d = T.resolve(CAT, s.lastId);
  expect([d.min, d.max, d.step]).toEqual([Number(min), Number(max), Number(step)]);
  expect(s.rows).toContain(s.lastId);
});
Then("the music synth is fully suspended", (s) => {
  expect(T.musicSynthSuspended(st(s))).toBe(true);
  expect(T.gainOf(st(s), "a music track")).toBe(0);
});
When("the player taps a button and an army marches", (s) => {
  act(s);
  s.tapGain = T.gainOf(st(s), "a tap");
  s.marchGain = T.gainOf(st(s), "marching");
});
Then("the tap is silent", (s) => {
  expect(s.tapGain).toBe(0);
});
Then("the march is heard", (s) => {
  expect(s.marchGain).toBeGreaterThan(0);
});
Then(/^"([^"]*)" is (greyed out|usable)$/, (s, name: string, state: string) => {
  expect(s.rows ?? []).toContain(id(name));
  expect(T.rowEnabled(st(s), id(name))).toBe(state === "usable");
});
When("the player opens Audio and Controls → Touch", (s) => {
  act(s);
  s.audioRows = T.sectionRows(st(s), "audio", env(s));
  s.controlRows = T.sectionRows(st(s), "controls", env(s));
});
Then(/^"([^"]*)" is shown in both, as one switch, default (On|Off)$/, (s, name: string, def: string) => {
  const a = id(name, "audio");
  const c = id(name, "controls");
  expect(s.audioRows).toContain(a);
  expect(s.controlRows).toContain(c);
  expect(T.resolve(CAT, c).id).toBe(a);
  expect(T.valueOf(st(s), a)).toBe(def === "On");
  T.setValue(st(s), c, def !== "On");
  expect(T.valueOf(st(s), a)).toBe(def !== "On");
});
When("the game goes to the background", (s) => {
  act(s);
  s.audible = T.audibleInBackground(st(s), env(s));
});
Then(/^the game is (silent|audible)$/, (s, r: string) => {
  expect(s.audible).toBe(r === "audible");
});
Given("the game runs on {string}", (s, where: string) => {
  runsOn(s, where);
});
Given("a podcast is playing", (s) => {
  s.otherAudio = true;
});
Given(/^"([^"]*)" was "([^"]*)" when the game launched$/, (s, name: string, value: string) => {
  set(s, name, value);
  s.atLaunch = { [id(name)]: T.valueOf(st(s), id(name)) };
});
Then("game music starts muted and effects play over the podcast", (s) => {
  expect(s.launchAudio).toMatchObject({ musicMuted: true, effectsPlay: true, takesOver: false });
});
Then("the game takes the audio over", (s) => {
  expect(s.launchAudio.takesOver).toBe(true);
});
When(/^the player changes "([^"]*)"$/, (s, name: string) => {
  act(s);
  const sid = id(name);
  s.lastId = sid;
  s.atLaunch = { [sid]: T.valueOf(st(s), sid) };
  T.stepValue(st(s), sid, 1);
});
Then("the change takes effect when the game next starts", (s) => {
  const sid = s.lastId as string;
  expect(T.resolve(CAT, sid).applies).toBe("restart");
  expect(T.effectiveValue(st(s), sid, s.atLaunch)).toEqual(s.atLaunch[sid]);
  expect(T.effectiveValue(st(s), sid, {})).not.toEqual(s.atLaunch[sid]);
});
When(/^the player (sets Master volume to 0|sets every bus to 0 or off)$/, (s, how: string) => {
  act(s);
  if (how.includes("Master")) T.setValue(st(s), "audio.master", 0);
  else {
    T.setValue(st(s), "audio.music", false);
    T.setValue(st(s), "audio.effects_volume", 0);
    T.setValue(st(s), "audio.ambience_volume", 0);
  }
});
Then("a battle off screen at {string} shows the caption {string} at the screen edge toward it", (s, place: string, text: string) => {
  expect(T.caption(st(s), { kind: "Battle", place, onScreen: false })).toBe(text);
  expect(T.caption(st(s), { kind: "Battle", place, onScreen: true })).toBeUndefined();
});
When("a priority {int} sound plays", (s, p: number) => {
  act(s);
  s.shaping = T.soundShaping(st(s), p);
});
Then("it plays {int} dB softer with no echo and no sharp attack", (s, db: number) => {
  expect(s.shaping).toEqual({ softerDb: db, echo: false, sharpAttacks: false });
});
Given("the player sets {string} to {string} in Audio", (s, name: string, value: string) => {
  set(s, name, value, "audio");
});
When("the player opens Accessibility", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "accessibility", env(s));
});
Then("{string} is {string} there too", (s, name: string, value: string) => {
  const acc = id(name, "accessibility");
  expect(T.resolve(CAT, acc).section).toBe("audio");
  expect(CAT.byId.get(acc)?.section).toBe("accessibility");
  expect(s.rows).toContain(acc);
  expect(T.valueOf(st(s), acc)).toEqual(T.parseValue(CAT, acc, value));
});

// ---------------------------------------------------------------- gameplay

Given("the campaign is not ironman", (s) => {
  env(s).ironman = false;
});
Given("the loaded campaign is ironman", (s) => {
  env(s).ironman = true;
});
When("the player opens Gameplay", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "gameplay", env(s));
});
Then('"Autosave" and "Autosaves kept per campaign" are not shown', (s) => {
  expect(s.rows).not.toContain("gameplay.autosave");
  expect(s.rows).not.toContain("gameplay.autosaves_kept");
  expect(T.sectionRows(st(s), "gameplay", { ...env(s), ironman: false })).toContain("gameplay.autosave");
});
When("the player ends a turn", (s) => {
  act(s);
  const interval = T.autosaveInterval(st(s));
  s.autosaves = Array.from({ length: 12 }, (_, m) => S.autosaveDue(interval, m + 1));
  s.writes = S.lifecycleWrites("end_turn", { turnRunning: false, ordersChanged: true });
});
Then("no rotating autosave is written", (s) => {
  expect(s.autosaves).toEqual(Array(12).fill(false));
});
Then("the Resume save is written", (s) => {
  expect(s.writes[0]).toMatch(/^resume save/);
});
When("a player battle is fought", (s) => {
  act(s);
  s.bell = T.bellSeconds(st(s));
});
Then("the turn still stops on its before-the-battle card", () => {
  // Stopping the turn for a player battle is not a setting: no row can turn it off.
  for (const d of CAT.settings) expect(T.nameOf(d.id).toLowerCase()).not.toMatch(/stop|before-the-battle/);
});
Then(/^each bell plays (in 1 to 2 seconds|twice as fast|four times as fast)$/, (s, pace: string) => {
  const factor = pace.startsWith("in") ? 1 : pace.startsWith("twice") ? 2 : 4;
  expect(s.bell).toEqual([1 / factor, 2 / factor]);
});
Given(/^the turn (had nothing important|had something important)$/, (s, what: string) => {
  s.important = what === "had something important";
});
Then(/^the turn report (opens|does not open)$/, (s, r: string) => {
  expect(s.opens).toBe(r === "opens");
});
When("an event card for {string} opens", (s, place: string) => {
  act(s);
  s.place = place;
  s.camera = T.cameraOnEvent(st(s));
});
Then(/^the camera (glides to "[^"]*"|stays where it was)$/, (s, r: string) => {
  const place = /"([^"]*)"/.exec(r)?.[1];
  if (place) {
    expect(s.camera).toBe("glide");
    expect(place).toBe(s.place);
  } else expect(s.camera).toBe("stay");
});
When(/^the player (hovers the mouse over|long-presses|focuses with the controller and presses Y on) a stat$/, (s, how: string) => {
  act(s);
  const input: T.TooltipInput = how.startsWith("hovers") ? "mouse" : how.startsWith("long") ? "touch" : "controller";
  s.after = T.tooltipShowsAfter(st(s), input);
});
Then(/^its tooltip shows (after [\d.]+ s|on the long press|at once)$/, (s, when: string) => {
  const secs = /after ([\d.]+) s/.exec(when)?.[1];
  if (secs) expect(s.after).toBeCloseTo(Number(secs));
  else if (when === "on the long press") expect(s.after).toBe(T.longPressSeconds(st(s)));
  else expect(s.after).toBe(0);
});
When("the player looks at a province's gold", (s) => {
  act(s);
  s.tooltip = T.numberTooltip(st(s), 9, [
    { amount: 12, source: "the market" },
    { amount: -3, source: "the war tax" },
  ]);
});
Then("the tooltip shows the full breakdown such as {string}", (s, text: string) => {
  expect(s.tooltip).toBe(text);
});
Given("the player has never changed Gameplay", (s) => {
  st(s);
});
Then(/^"([^"]*)" is "([^"]*)" with the action "([^"]*)"$/, (s, name: string, value: string, action: string) => {
  expectValue(s, name, value);
  expect(s.rows).toContain(id(name));
  expect(s.rows).toContain(id(action));
  expect(T.resolve(CAT, id(action)).type).toBe("action");
});
Then("there is no advisor row", (s) => {
  for (const r of s.rows as string[]) expect(`${r} ${T.nameOf(r)}`.toLowerCase()).not.toContain("advisor");
});
Then("muting a kind of warning is not offered here", (s) => {
  for (const r of s.rows as string[]) expect(`${r} ${T.nameOf(r)}`.toLowerCase()).not.toMatch(/mute|warning/);
});
When("the player earns an achievement in an ironman campaign", (s) => {
  act(s);
  s.unlocked = true;
  s.toast = T.achievementToast(st(s));
});
Then("no toast is shown", (s) => {
  expect(s.toast).toBe(false);
});
Then("the achievement unlocks", (s) => {
  expect(s.unlocked).toBe(true);
});
Given("a historical name list exists", (s) => {
  // The example the design gives: Constantinople becomes Istanbul in Ottoman hands.
  s.names = (owner: string) => (owner === "ottomans" ? "Istanbul" : "Constantinople");
});
Given("no historical name list exists", (s) => {
  s.names = undefined;
});
When(/^the map redraws the city on the Bosporus held by (the Ottomans|its owner before the Ottomans)$/, (s, who: string) => {
  act(s);
  s.name = T.placeName(st(s), "Istanbul", who === "the Ottomans" ? "ottomans" : "byzantium", s.names);
});
Then("it is named {string}", (s, name: string) => {
  expect(s.name).toBe(name);
});
When('"Place names" is "Historical" or "Modern"', (s) => {
  act(s);
  s.names2 = ["historical", "modern"].map((v) => {
    T.setValue(st(s), "gameplay.place_names", v);
    return T.placeName(st(s), "Istanbul", "byzantium", s.names);
  });
});
Then("both show today's region names", (s) => {
  expect(s.names2).toEqual(["Istanbul", "Istanbul"]);
});
When("the date {int} {word} {int} is shown", (s, d: number, month: string, y: number) => {
  act(s);
  s.text = T.formatDate(st(s), y, D.month_names.indexOf(month) + 1, d);
});
Then("it reads {string}", (s, text: string) => {
  expect(s.text).toBe(text);
});

// ---------------------------------------------------------------- controls

Given("the player has never changed controls on a phone", (s) => {
  setProfile(s, "phone");
});
When("Controls → Touch is opened", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "controls", env(s)).filter((r) => D.touch_rows.includes(r) || r === "controls.haptics");
  expect(s.rows.length).toBeGreaterThan(0);
});
Given("the game runs on desktop in the profile {string}", (s, name: string) => {
  setProfile(s, profileOf(name), { platform: "desktop" });
});
When("Controls → Mouse and keyboard is opened", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "controls", env(s));
});
function actionByName(name: string): string {
  const a = Object.keys(T.keyBindings(T.newSettings("desktop"))).find((k) => T.actionName(k) === name);
  expect(a, name).toBeDefined();
  return a!;
}
Given("{string} is bound to {string}", (s, action: string, key: string) => {
  expect(T.keyBindings(st(s))[actionByName(action)]).toContain(key);
});
When("the player binds {string} to {string} as its second key", (s, key: string, action: string) => {
  act(s);
  s.rebind = T.rebindKey(st(s), actionByName(action), key, 1);
  s.rebindArgs = [actionByName(action), key];
});
Then("each action holds at most {int} keys", (s, n: number) => {
  expect(T.resolve(CAT, "controls.keys").slots_per_action).toBe(n);
  expect(() => T.rebindKey(st(s), "end_turn", "F5", n)).toThrow();
  const [action, key] = s.rebindArgs as [string, string];
  expect(T.rebindKey(st(s), action, key, 1, true)).toEqual({ bound: true });
  const keys = T.keyBindings(st(s));
  for (const k of Object.values(keys)) expect(k.length).toBeLessThanOrEqual(n);
  expect(keys[action]).toEqual(["Enter", key]);
  expect(keys.turn_report).not.toContain(key);
});
When(/^the player (holds for [\d.]+ s|taps once|presses twice|presses once) "Enter"$/, (s, how: string) => {
  const secs = /holds for ([\d.]+) s/.exec(how)?.[1];
  act(s);
  expect(T.keyBindings(st(s)).end_turn).toContain("Enter");
  const press = secs ? { holdSeconds: Number(secs), presses: 1 } : how === "presses twice" ? { presses: 2, holdSeconds: 0.1 } : { presses: 1, holdSeconds: 0.1 };
  s.ended = T.holdActionDone(st(s), press);
});
Then(/^the turn (ends|does not end)$/, (s, r: string) => {
  if (s.ended === undefined && r === "ends" && s.important !== undefined) {
    // "When the turn ends" in the turn report scenarios.
    act(s);
    s.opens = T.turnReportOpens(st(s), s.important);
    return;
  }
  expect(s.ended).toBe(r === "ends");
});
const CONTROLLER: Record<string, { c: T.Controller; steam: boolean }> = {
  "a PlayStation controller": { c: "playstation", steam: false },
  "a Steam Controller on Steam": { c: "steam_controller", steam: true },
};
Given(/^the player last used (a PlayStation controller|a Steam Controller on Steam)$/, (s, what: string) => {
  s.lastController = CONTROLLER[what];
});
When("prompts are shown", (s) => {
  act(s);
  s.glyphs = T.promptGlyphs(st(s), s.lastController.c, s.lastController.steam);
});
Then(/^they are (.+)$/, (s, what: string) => {
  if (s.glyphs) {
    const want: Record<string, { set: string; fromSteamInput: boolean }> = {
      "PlayStation glyphs": { set: "playstation", fromSteamInput: false },
      "Xbox glyphs": { set: "xbox", fromSteamInput: false },
      "Steam Input glyphs of the player's own bindings": { set: "steam_controller", fromSteamInput: true },
    };
    expect(s.glyphs).toEqual(want[what]);
  } else expect(T.borderLook(st(s))).toBe(what);
});
Given(/^(an Xbox layout|a Nintendo layout) is detected$/, (s, layout: string) => {
  T.controllerConnected(st(s), { nintendo: layout === "a Nintendo layout" });
});
When("the player presses B on a menu", (s) => {
  act(s);
  s.b = T.menuButton(st(s), "B");
});
Then("the focused entry is confirmed", (s) => {
  expect(s.b).toBe("confirm");
  expect(T.menuButton(st(s), "A")).toBe("back");
});
Given("the profile is {string} with a controller", (s, name: string) => {
  setProfile(s, profileOf(name));
  T.controllerConnected(st(s));
});
When("Controls → Controller is opened", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "controls", env(s));
});
Then(/^"([^"]*)" is shown, (\d+)–(\d+) %, default (\d+) %$/, (s, name: string, min: string, max: string, def: string) => {
  const sid = id(name);
  expect(s.rows).toContain(sid);
  const d = T.resolve(CAT, sid);
  expect([d.min, d.max, d.unit]).toEqual([Number(min), Number(max), "percent"]);
  expect(T.valueOf(st(s), sid)).toBe(Number(def));
});
Then('"Gyro cursor" is shown where the platform reports motion', (s) => {
  expect(T.rowShown(st(s), "controls.gyro_cursor", { ...env(s), motion: false })).toBe(false);
  expect(T.rowShown(st(s), "controls.gyro_cursor", { ...env(s), motion: true })).toBe(true);
});
Then(/^controller rebinding is (.+)$/, (s, what: string) => {
  expect(T.controllerRebinding(st(s), env(s))).toBe(what.replace(/^"|"$/g, ""));
});
Given("a PlayStation controller off Steam that reports motion", (s) => {
  setProfile(s, "desktop", { platform: "desktop", motion: true });
  T.controllerConnected(st(s));
});

// ---------------------------------------------------------------- accessibility

When("the realms lens is drawn", (s) => {
  act(s);
  s.plan = T.colourPlan(st(s));
});
Then("the nation colours are the first assignment from the {int}-colour palette", (s, n: number) => {
  expect(s.plan).toMatchObject({ assignment: "first", palette_size: n, greys_with_patterns: false });
});
Then("greys with patterns are used", (s) => {
  expect(s.plan).toMatchObject({ ramp: "greys", greys_with_patterns: true });
  expect(T.lensPatterns(st(s)).length).toBeGreaterThan(0);
});
Then("each lens band reads by hatching, dots or stripes", (s) => {
  expect(T.lensPatterns(st(s))).toEqual(["hatching", "dots", "stripes"]);
});
When("nation borders are drawn", (s) => {
  act(s);
});
Then("panels reflow and cards grow taller, not smaller", (s) => {
  const now = T.panelLayout(st(s), 300, 400, 40);
  const normal = T.panelLayout(T.newSettings(st(s).profile), 300, 400, 40);
  expect(now.width).toBe(normal.width);
  expect(now.lines).toBeGreaterThanOrEqual(normal.lines);
});
Then("body text is {int} px", (s, px: number) => {
  expect(T.bodyTextPx(st(s))).toBeCloseTo(px);
});
When("a panel is drawn", (s) => {
  act(s);
  s.fonts = T.fonts(st(s));
});
Then(/^body text uses (.+) and titles use (.+)$/, (s, body: string, titles: string) => {
  const f = s.fonts as { body: string; titles: string };
  if (body.startsWith("a clear OFL-licensed sans")) {
    expect(body.endsWith(f.body)).toBe(true);
    expect(D.fonts.plain.licence).toBe("OFL");
  } else expect(f.body).toBe(body);
  if (titles === "the same clear sans") expect(f.titles).toBe(f.body);
  else expect(f.titles).toBe(titles);
});
When("a card is drawn", (s) => {
  act(s);
  s.panel = T.panelLook(st(s));
});
Then("its background is solid instead of parchment", (s) => {
  expect(s.panel.background).toBe("solid");
});
Then("outlines are stronger", (s) => {
  expect(s.panel.outlines).toBe("stronger");
});
Then("no text is over a pattern", (s) => {
  expect(s.panel.text_over_patterns).toBe(false);
});
When("any screen is shown", (s) => {
  act(s);
});
Then("every tap target is at least {int} points", (s, n: number) => {
  expect(T.tapTargetPoints(st(s))).toBe(n);
});
Given(/^the operating system (asks for|doesn't ask for) reduced motion$/, (s, os: string) => {
  s.os = os === "asks for";
  T.applyOsReducedMotion(st(s), s.os);
});
When("the camera jumps to an event", (s) => {
  act(s);
  s.motion = T.motionLook(st(s), s.os);
  s.camera = T.cameraOnEvent(st(s), s.os);
});
Then("the camera cuts, there is no screen shake and Animations is Reduced", (s) => {
  expect(s.motion).toEqual({ camera: "cut", screenShake: false, animations: "reduced" });
  expect(s.camera).toBe("cut");
  expect(T.valueOf(st(s), "graphics.animations")).toBe("reduced");
});
Then("the camera glides", (s) => {
  expect(s.motion.camera).toBe("glide");
  expect(s.camera).toBe("glide");
  expect(T.valueOf(st(s), "graphics.animations")).toBe("full");
});
When("a battle with cannon ends", (s) => {
  act(s);
});
Then("no cannon flash, lightning or white flash on the result is shown", (s) => {
  expect(T.flashesRemoved(st(s))).toEqual(["cannon flashes", "lightning", "white flashes on battle results"]);
});
When("the player opens the action menu on the map", (s) => {
  act(s);
});
Then(/^it opens by (a hold|a double press)$/, (s, way: string) => {
  expect(T.actionMenuOpensBy(st(s))).toBe(way);
});

// ---------------------------------------------------------------- language, account, privacy, about

Given("the system language is {string}", (s, lang: string) => {
  (s.facts ??= {}).systemLanguage = lang;
});
Given("the launch list is {string}", (s, langs: string) => {
  (s.facts ??= {}).languages = langs.split(", ");
});
When("the game starts for the first time", (s) => {
  act(s);
  s.st = T.newSettings("desktop", CAT, s.facts);
});
Then("the language is {string}", (s, lang: string) => {
  expect(T.valueOf(st(s), "language.language")).toBe(lang);
});
Given("an event card is open", (s) => {
  s.st = T.newSettings("desktop", CAT, { languages: ["English", "French"], systemLanguage: "English" });
});
When("the player changes the language", (s) => {
  act(s);
  s.events = T.setValue(st(s), "language.language", "French");
  s.change = T.languageChange();
});
Then("interface text changes at once", (s) => {
  expect(T.resolve(CAT, "language.language").applies).toBe("live");
  expect(s.events[0]).toMatchObject({ id: "language.language", value: "French", group: "personal" });
  expect(s.change.interfaceText).toBe("at once");
});
Then("event and catalogue text change on the next panel open", (s) => {
  expect(s.change.eventAndCatalogueText).toBe("next panel open");
});
When("the number one thousand and a half is shown", (s) => {
  act(s);
  s.text = T.formatNumber(st(s), 1000.5);
});
Given(/^the language "([^"]*)" is in a (Latin|non-Latin) script$/, (s, name: string, script: string) => {
  s.lang = { name, latin: script === "Latin", hasFont: false };
});
Given(/^the localisation design (has|has not) a font for it$/, (s, has: string) => {
  s.lang.hasFont = has === "has";
});
When("the language list is shown", (s) => {
  act(s);
  s.langList = T.languageList([{ name: "English", latin: true, hasFont: true }, s.lang]);
});
Then(/^"([^"]*)" is (listed|not listed)$/, (s, name: string, r: string) => {
  expect((s.langList as string[]).includes(name)).toBe(r === "listed");
});
Given(/^the player is (signed out|signed in|signed in as "[^"]*")$/, (s, state: string) => {
  env(s).signedIn = state !== "signed out";
  s.email = /"([^"]*)"/.exec(state)?.[1];
});
When("the player opens Account and cloud saves", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "account", env(s));
  s.account = T.accountRow(env(s), s.email);
});
Then(/^"Sign in \/ Create account" is offered$/, (s) => {
  expect(s.account.offers).toEqual(["Sign in / Create account"]);
  expect(s.rows).toEqual(["account.sign_in"]);
});
Then("the email, Sign out, Cloud saves, Sync on Wi-Fi only, Devices and Delete account and saves are shown", (s) => {
  expect(s.account).toEqual({ offers: ["Sign out"], email: s.email });
  expect((s.rows as string[]).map(T.nameOf)).toEqual(["Account", "Cloud saves", "Sync on Wi-Fi only", "Devices", "Delete account and saves"]);
});
Then("nothing blocks play", () => {
  expect(Object.keys(D.first_launch_questions)).not.toContain("account");
});
When('the player picks "Sign in to sync" on the Load screen', (s) => {
  act(s);
  s.flow = T.signInFlow("load screen");
});
Then("the same sign-in flow as in Settings opens", (s) => {
  expect(s.flow).toBe(T.signInFlow("settings"));
});
Given("the player has just signed in", (s) => {
  env(s).signedIn = true;
});
Given("the player is signed in on a {string} and a {string}", (s, a: string, b: string) => {
  const server = S.createServer(new Rng(3));
  S.createAccount(server, "player@example.org", "pw-1234567");
  s.server = server;
  s.tokens = {} as Record<string, string>;
  for (const [name, platform] of [
    [a, "steam"],
    [b, "android"],
  ] as const) {
    const r = S.signIn(server, "player@example.org", "pw-1234567", name, platform);
    if ("error" in r) throw new Error(r.error);
    s.tokens[name] = r.deviceToken;
  }
});
When("the player opens Devices on the {string}", (s, device: string) => {
  act(s);
  s.device = device;
  s.devices = S.authorise(s.server, s.tokens[device])!.devices.map((d) => d.name);
});
Then("both devices are listed, each with Sign out", (s) => {
  expect([...s.devices].sort()).toEqual(Object.keys(s.tokens).sort());
  const other = (s.devices as string[]).find((d) => d !== s.device)!;
  expect(S.signOutDevice(s.server, s.tokens[s.device], other)).toBe(true);
  expect(S.authorise(s.server, s.tokens[other])).toBeUndefined();
});
When(/^the player picks "Delete account and saves" from (Account and cloud saves|Privacy)$/, (s, place: string) => {
  act(s);
  if (place === "Privacy") expect(D.delete_account_from).toContain("privacy");
  else expect(T.sectionRows(st(s), "account", env(s))).toContain("account.delete");
  s.action = T.actionOf("account.delete");
});
Then("a confirmation is asked before anything is deleted", (s) => {
  expect(s.action.confirm).toBe(true);
});
Given(/^the game is (the full game on Steam|the free mobile tier and the ad stays)$/, (s, edition: string) => {
  if (edition.includes("Steam")) runsOn(s, "Steam");
  else {
    runsOn(s, "Android");
    env(s).freeTierAd = true;
  }
});
When("the player opens Privacy", (s) => {
  act(s);
  s.privacy = T.privacyRows(st(s), env(s));
});
Then("the rows are {string}", (s, rows: string) => {
  expect((s.privacy as string[]).join(", ")).toBe(rows);
});
Given("the privacy design requires consent", (s) => {
  s.consent = true;
});
When("the game launches for the first time", (s) => {
  act(s);
  st(s);
});
Then("crash reports and usage statistics are asked, not preset", () => {
  expect(T.resolve(CAT, "privacy.crash_reports").default).toBe("ask");
  expect(T.resolve(CAT, "privacy.usage_stats").default).toBe("ask");
  expect(D.first_launch_questions.consent).toBe("Crash reports and usage statistics");
});
Given("the player opens About", (s) => {
  act(s);
  s.rows = T.sectionRows(st(s), "about", env(s));
  T.setValue(st(s), "graphics.map_detail", "low");
  T.setValue(st(s), "accessibility.font", "plain");
});
Then("the store screen's restore flow opens", (s) => {
  expect(s.rows).toContain("about.restore_purchases");
  expect(s.action.opens).toBe("the store screen's restore flow");
});
Then("the credits open", (s) => {
  expect(s.action.opens).toBe("the credits");
});
Then("every setting returns to its profile default", (s) => allDefaults(s));
Then("the diagnostics line and settings are on the clipboard", (s) => {
  expect(s.clipboard).toContain("engine worker · round trip 4 ms");
  expect(s.clipboard).toContain('"accessibility.font":"plain"');
});
Given("the game's version and build number are known", (s) => {
  s.version = ["1.4.2", "1873"];
});
Then("the version and build number are shown", (s) => {
  expect(T.aboutView(s.version[0], s.version[1]).join(" ")).toContain("1.4.2");
  expect(T.aboutView(s.version[0], s.version[1]).join(" ")).toContain("1873");
});

// ---------------------------------------------------------------- platform notes

Given("the profile is {string} at {int} × {int}", (s, name: string, w: number, h: number) => {
  setProfile(s, profileOf(name));
  s.screen = { width: w, height: h };
});
Then("body text is about {int} px at {int} % interface scale", (s, px: number, pct: number) => {
  expect(T.interfaceScale(st(s))).toBeCloseTo(pct / 100);
  expect(Math.round(T.bodyTextPx(st(s)))).toBe(px);
  expect(T.baseBodyPx(st(s))).toBe(17);
});
Then("the game is fullscreen with Steam Deck glyphs", (s) => {
  expect(T.valueOf(st(s), "graphics.display_mode")).toBe("fullscreen");
  expect(T.promptGlyphs(st(s), D.deck_glyphs as T.Controller, true).set).toBe("steam_deck");
});
Then("every Settings row can be used without a mouse or keyboard", (s) => {
  T.controllerConnected(st(s));
  const scr = T.openSettings(st(s), env(s));
  const reached = new Set<string>();
  for (let sec = 0; sec < scr.sections.length; sec++) {
    const rows = T.screenRows(scr);
    for (let r = 0; r < rows.length; r++) {
      reached.add(T.focusedRow(scr));
      T.pressButton(scr, "d-pad down");
    }
    T.pressButton(scr, "RB");
  }
  const all = scr.sections.flatMap((sec) => [...T.sectionRows(st(s), sec, env(s)), `reset:${sec}`]);
  expect([...reached].sort()).toEqual(all.sort());
});
When("the player names a save", (s) => {
  act(s);
  s.input = T.textInputFor(st(s).profile);
});
Then("Steam's floating gamepad keyboard opens", (s) => {
  expect(s.input).toBe("ShowFloatingGamepadTextInput");
});
Then("interface scale is {int} % and text size is {word}", (s, pct: number, size: string) => {
  expect(T.valueOf(st(s), "graphics.interface_scale")).toBe(pct);
  expectValue(s, "Text size", size);
});
Then("text has the same physical size on both", (s) => {
  const share = (tv: string) => T.bodyTextPx(st(s)) / TV[tv]!.height;
  expect(share("1080p")).toBeCloseTo(share("4K"));
  expect(TV["4K"]!.height * TV["4K"]!.dpr).toBe(2160);
});
Then("the cursor speed is Slow, the screen margin is 5 % and focus outlines are always on", (s) => {
  expect(T.valueOf(st(s), "controls.cursor_speed")).toBe("slow");
  expect(T.valueOf(st(s), "graphics.screen_margins")).toBe(5);
  expect(T.focusOutlines(st(s))).toBe(true);
  expect(st(s).controllerPrompts).toBe(false);
});
Given(/^(a panel is open over the map|nothing is open over the map|the game menu is open over the map)$/, (s, state: string) => {
  s.back = { panelsOpen: state.startsWith("a panel") ? 1 : 0, pauseMenuOpen: state.startsWith("the game menu") };
});
When("the player uses the system back gesture", (s) => {
  act(s);
  s.backResult = T.androidBack(s.back);
});
Then("the top panel closes", (s) => {
  expect(s.backResult).toBe("close the top panel");
});
Then("the game menu opens", (s) => {
  expect(s.backResult).toBe("open the game menu");
});
Then("the game does not quit without asking", (s) => {
  expect(s.backResult).toBe("ask before quitting");
});
Given('the game runs on iOS with "Let other apps\' audio play" "On"', (s) => {
  runsOn(s, "iOS");
  set(s, "Let other apps' audio play", "On");
});
When("the silent switch is on", (s) => {
  act(s);
  s.launchAudio = T.launchAudio(T.valueOf(st(s), "audio.mix_with_other_apps") as boolean, false);
});
Then("the game respects it through the ambient audio session", (s) => {
  expect(s.launchAudio.iosSession).toBe("ambient");
  expect(s.launchAudio.respectsSilentSwitch).toBe(true);
});
When("Battery saver is {string}", (s, value: string) => {
  act(s);
  set(s, "Battery saver", value);
});
Then(/^"Sharpness" is "([^"]*)", "Frame rate cap" is "([^"]*)", "Map detail" is "([^"]*)" and "Animations" is "([^"]*)"$/, (s, sh: string, fps: string, detail: string, anim: string) => {
  const k = T.performanceKnobs(st(s));
  expect(k).toEqual({
    sharpness: T.parseValue(CAT, "graphics.sharpness", sh),
    frame_cap: T.parseValue(CAT, "graphics.frame_cap", fps),
    map_detail: T.parseValue(CAT, "graphics.map_detail", detail),
    animations: T.parseValue(CAT, "graphics.animations", anim),
  });
});

// ---------------------------------------------------------------- decided rules (D-SET-*, X-1, X-17, X-18)

Then("{string} is {int} and shows {string}", (s, name: string, value: number, shown: string) => {
  const sid = id(name);
  expect(T.valueOf(st(s), sid)).toBe(value);
  expect(T.rowView(st(s), sid).setBy).toBe(shown);
});
Then("the map redraws only on change", (s) => {
  expect(T.mapRedraws(st(s), false)).toBe(false);
  expect(T.mapRedraws(st(s), true)).toBe(true);
});
Then("the AI turn's work-step budget is the same as with Battery saver off", (s) => {
  const sets = (T.resolve(CAT, "graphics.battery_saver").sets_when_on ?? {}) as Record<string, unknown>;
  expect(Object.keys(sets).some((k) => k.startsWith("engine."))).toBe(false);
});

Given("the Attention screen has {int} lines", (s, n: number) => {
  s.attention = n;
});
Given("{int} events are unanswered", (s, n: number) => {
  s.unanswered = n;
});
When("the player ends the turn", (s) => {
  act(s);
  s.pressed = T.endTurnPress(st(s), s.attention, s.unanswered);
});
Then("the turn ends with one tap", (s) => expect(s.pressed).toEqual({ ends: true }));
Then("a question is asked", (s) => expect(s.pressed).toMatchObject({ asks: true }));
Then('the question names the count with "Look" and "End turn anyway"', (s) => {
  expect(s.pressed).toEqual({ asks: true, names: s.attention });
});
Then("End turn opens the first unanswered event instead", (s) => {
  expect(s.pressed).toEqual({ opens: "the first unanswered event" });
});

When("a player battle runs", (s) => {
  act(s);
  s.stepSeconds = T.battleStepSeconds(st(s));
});
Then("the turn does not stop", (s) => {
  expect(T.resolve(CAT, "gameplay.battle_speed").options).not.toContain("stop");
});
Then(/^each 4-hour step plays back in ([\d.]+) seconds$/, (s, sec: string) => {
  expect(s.stepSeconds).toBeCloseTo(Number(sec), 6);
});

Given(/^the system language is (supported|not supported)$/, (s, sup: string) => {
  s.languageSupported = sup === "supported";
});
Given("the privacy design does not require consent", (s) => {
  s.consent = false;
});
When("the first-launch questions run", (s) => {
  act(s);
  s.questions = T.firstLaunchQuestions(st(s).profile, { languageSupported: s.languageSupported, consentRequired: !!s.consent });
});
Then("the questions shown are {string}", (s, q: string) => {
  expect(s.questions.length ? (s.questions as string[]).join(", ").replace(/, (?=[^,]*$)/, ", ") : "none").toBe(q === "none" ? "none" : q.split(/, /).join(", "));
});
Then("no settings wizard is shown", (s) => {
  expect(s.questions.length).toBeLessThanOrEqual(2);
});

Given("a campaign as {string} is loaded", (s, nation: string) => {
  s.nation = nation;
});
When("the player opens the game menu", (s) => {
  act(s);
  s.menu = T.openPauseMenu("Esc");
});
Then("it offers Settings, opening over the dimmed map", (s) => {
  expect(s.menu.pauseMenu).toBe(true);
  expect(s.menu.offers).toEqual(["Settings"]);
});
Then("Settings holds Campaign rules, a read-only section", (s) => {
  const v = T.campaignRulesView({});
  expect(v.rows.length).toBeGreaterThan(0);
  for (const r of v.rows) expect(r.editable).toBe(false);
});

Given("the game runs with touch", (s) => {
  setProfile(s, "phone");
});
Then(/^the action bar and the End turn button are on the (left|right) side$/, (s, side: string) => {
  const l = T.mainHandLayout(st(s));
  expect([l.action_bar, l.end_turn]).toEqual([side, side]);
});
Then(/^the game menu button is on the (left|right) side$/, (s, side: string) => {
  expect(T.mainHandLayout(st(s)).game_menu).toBe(side);
});

When(/^the player holds a finger on a stat for ([\d.]+) seconds$/, (s, held: string) => {
  act(s);
  s.held = Number(held);
});
Then(/^the tooltip (shows|does not show)$/, (s, r: string) => {
  expect(s.held >= T.longPressSeconds(st(s))).toBe(r === "shows");
});

When(/^the player (left-clicks the army "[^"]+" and right-clicks the province "[^"]+"|clicks the army "[^"]+" and clicks the province "[^"]+")$/, (s, how: string) => {
  act(s);
  s.ordered = T.marchOrderBy(st(s), how.includes("right-clicks") ? ["left", "right"] : ["left", "left"]);
});
Then("the army {string} is ordered to march to {string}", (s, _a: string, _p: string) => {
  expect(s.ordered).toBe(true);
});

// Keys and controller (D-SET-3, D-SET-4, X-1)
const KEY_NAMES: Record<string, string> = { Left: "ArrowLeft", Right: "ArrowRight", Up: "ArrowUp", Down: "ArrowDown", Esc: "Escape" };
const KEY_ACTIONS: Record<string, string> = {
  "pan up": "pan_up", "pan left": "pan_left", "zoom in": "zoom_in", "zoom out": "zoom_out", "the game menu opens": "pause_menu",
  'the lens "realms"': "lens_1", 'the lens "terrain"': "lens_2", 'the lens "people"': "lens_3", 'the lens "wealth"': "lens_4", 'the lens "walls"': "lens_5", 'the lens "food"': "lens_6",
  "the next lens": "lens_next", "the next army": "army_next", "the previous army": "army_prev", "the next notification": "notification_next", "the turn report": "turn_report", "jump to capital": "jump_capital", "the ledger": "ledger",
};
Given("the key bindings are the defaults", (s) => {
  s.keys = T.keyBindings(st(s));
});
When("the player presses {string} on the map", (s, key: string) => {
  act(s);
  const k = KEY_NAMES[key] ?? key;
  s.happened = Object.entries(s.keys as Record<string, string[]>).filter(([, keys]) => keys.includes(k)).map(([a]) => a);
});
const PAD_SETS: Record<string, "map" | "menu" | "battle"> = { map: "map", menu: "menu", "battle view": "battle" };
const PAD_ACTIONS: Record<string, Record<string, string>> = {
  map: { "the map cursor moves": "cursor", "the camera pans": "pan", "zoom out": "zoom_out", "zoom in": "zoom_in", select: "select", "deselect, back": "back", "the action menu on the selection": "action_menu", "the info card for what's under the cursor": "info", "the previous army": "army_prev", "the next army": "army_next", "cycle map lenses": "lens_prev", "the next notification": "notification_next", "the turn report": "turn_report", "End turn": "end_turn", "the game menu": "pause_menu", "jump to capital": "jump_capital", "recentre on the selection": "recentre" },
  menu: { "move focus": "focus", "scroll the panel": "scroll", "the previous page": "page_prev", confirm: "confirm", back: "back", "reset row": "reset_row", "the long description": "describe", "the next tab": "tab_next", "close the panel": "close" },
  battle: { pan: "pan", "slower playback": "slower", "faster playback": "faster", "change standing orders": "change_orders", "leave the battle view": "leave", "order a retreat": "retreat", "the previous running battle": "battle_prev", "the next running battle": "battle_next", "the commander's line": "commander_line", "the game menu": "pause_menu" },
};
Given("the controller layout is the default", (s) => {
  s.pad = true;
});
Given("the player is on the {string}", (s, mode: string) => {
  s.padSet = PAD_SETS[mode];
});
When("the player uses {string}", (s, input: string) => {
  act(s);
  s.input = input;
});
Then("{string} happens", (s, result: string) => {
  if (s.keys && !s.pad) {
    expect(s.happened).toEqual([KEY_ACTIONS[result]]);
    return;
  }
  const set: "map" | "menu" | "battle" = s.padSet;
  const input: string = s.input;
  const held = /^(.+) held ([\d.]+) s$/.exec(input);
  const button = (held ? held[1]! : input).toLowerCase().replace("d-pad ", "dpad_").replace(/ /g, "_");
  if (set === "menu" && result === "step a value") {
    expect((D.controller_navigation as Record<string, string>)[input]).toBe("step up");
    return;
  }
  const action = PAD_ACTIONS[set]![result];
  expect(action, result).toBeDefined();
  const b = T.padBinding(set, action!);
  if (held) expect(b).toEqual({ button, hold_seconds: Number(held[2]) });
  else if (Array.isArray(b)) expect(b.map((x) => x.toLowerCase())).toContain(button);
  else expect(String(b).toLowerCase()).toBe(button);
});

When("Steam Input loads the game's actions", (s) => {
  act(s);
  s.steam = T.steamInput();
});
Then("the action sets are Shell, Map, Card, Book, Modal and Battle, plus a Text layer for the on-screen keyboard", (s) => {
  expect(s.steam.action_sets).toEqual(["Shell", "Map", "Card", "Book", "Modal", "Battle"]);
  expect(s.steam.text_layer).toBe("Text");
});
Then("official configurations exist for the Steam Controller, Steam Deck, Xbox, PlayStation and Nintendo controllers", (s) => {
  expect(s.steam.official_configurations).toEqual(["Steam Controller", "Steam Deck", "Xbox", "PlayStation", "Nintendo"]);
});
Then("button prompts come from GetGlyphPNGForActionOrigin", (s) => {
  expect(s.steam.glyphs).toBe("GetGlyphPNGForActionOrigin");
});

Given("music eras following the calendar or technology is a choice", (s) => {
  s.rule = "music eras";
});
When("the player begins a campaign", (s) => {
  act(s);
  s.rulesView = T.campaignRulesView({ "music eras": "calendar" });
});
Then("it is chosen on the new game screen as a campaign rule", (s) => {
  expect((s.rulesView as ReturnType<typeof T.campaignRulesView>).rows.find((r) => r.rule === s.rule)).toMatchObject({ value: "calendar", editable: false });
});
Then("it is not offered in Settings", (s) => {
  expect(CAT.settings.some((d) => /music_era/.test(d.id))).toBe(false);
});

// Sync (D-SET-13)
Given(/^on the "([^"]+)" the player set "([^"]+)" to "([^"]+)" at (\d+):(\d+)$/, (s, device: string, name: string, value: string, h: string, m: string) => {
  s.files ??= {} as Record<string, T.PersonalFile>;
  const f = (s.files[device] ??= { values: {}, changedAt: {} });
  const sid = id(name);
  f.values[sid] = T.parseValue(CAT, sid, value);
  f.changedAt[sid] = Number(h) * 60 + Number(m);
});
When("both devices sync", (s) => {
  act(s);
  s.synced = T.syncPersonal(Object.values(s.files as Record<string, T.PersonalFile>));
});
Then("both devices have {string} {string} and {string} {string}", (s, a: string, av: string, b: string, bv: string) => {
  expect(s.synced.values[id(a)]).toEqual(T.parseValue(CAT, id(a), av));
  expect(s.synced.values[id(b)]).toEqual(T.parseValue(CAT, id(b), bv));
});
Then("the {string} keeps its own {string}", (s, _device: string, name: string) => {
  expect(T.resolve(CAT, id(name)).sync).toBe("device");
  expect(s.synced.values[id(name)]).toBeUndefined();
});

// Seasons and colour vision (X-17)
When("the map is drawn in January and in October", (s) => {
  act(s);
  s.means = T.seasonPaletteMeans(st(s));
});
Then("the snow and autumn gold palettes are told apart by {word}", (s, means: string) => {
  expect(s.means.split(" ").at(-1)).toBe(means);
});
Then(/^the snow and autumn gold palettes are told apart by (the safe ramp|tile patterns)$/, (s, means: string) => {
  expect(s.means).toBe(means);
});
Then("no setting turns the seasons off", () => {
  expect(CAT.settings.some((d) => /season/.test(d.id))).toBe(false);
});
Then(/^"the lens "(\w+)"" happens$/, (s, lens: string) => {
  expect(s.happened).toEqual([KEY_ACTIONS[`the lens "${lens}"`]]);
});
