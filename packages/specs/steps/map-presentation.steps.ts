import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createEngineHost, createWorld, generateSyntheticRuleset, marchMap, planRoute, processTurn } from "@ph/engine";
import { MOVE } from "@ph/engine/domain/troop-movement";
import { MONTHS as MONTH_NAMES, STEPS_PER_DAY } from "@ph/engine/domain/time-and-turns";
import {
  BUDGETS,
  PHONE_DEFAULTS,
  ambitionShimmer,
  applyTurnAnswer,
  armyMarks,
  averageColour,
  battleMarks,
  battleResultMotion,
  borderBetween,
  budget,
  chart,
  checkBudgets,
  checkTouchRules,
  classifyShape,
  closeInDetail,
  colonialMarks,
  colourVision,
  cornerOf,
  dayCountsShown,
  diplomacyLens,
  diplomacyMarks,
  dragMarks,
  explorationMarks,
  faithLens,
  faithMarks,
  fleetMarks,
  foodLensMarks,
  forbiddenFrameWork,
  framesRedrawn,
  harbourMarks,
  homelandOutlines,
  jobsLens,
  layoutFor,
  bodyTextPx,
  leagueBorders,
  lensBandPatterns,
  lensColouring,
  mapHud,
  mapInputWhileProcessing,
  measuredKnobs,
  newMapView,
  oppositeCorners,
  panFrameWork,
  pixelRendering,
  playbackCues,
  portMarks,
  portraitNotice,
  provinceMarks,
  recentreForCard,
  recolourUploads,
  revolutionLens,
  riverLine,
  routeBudgetMs,
  routeLine,
  seaLens,
  setLens,
  siegeMarks,
  subjectsLens,
  tapTargetMin,
  tileRowMarks,
  tongueLensColouring,
  tradeLens,
  tradePathMarks,
  traderMarks,
  turnBudgetMs,
  turnRunsIn,
  turnStrip,
  underParchment,
  visibleMapArea,
  withinBudget,
  worksLens,
  zoomLevel,
  type Animations,
  type ColourVision,
  type Insets,
  type MapDetail,
  type Mark,
  type RelationToYou,
  type Rgb,
  type TouchTargetSize,
  type Window,
  type WorksState,
  zoomForCamera,
  playbackDays,
  battleBar,
  seasonPalette,
  monthPalettes,
  lens,
  lensPicker,
  canvasRatios,
  defaultZoomStatement,
  aiWorkSteps,
  withBatterySaver,
} from "@ph/engine/domain/map-presentation";
import {
  ICE,
  ROUTE_STROKE,
  ZOOMS,
  armyStand,
  battleProgressMarks,
  battleSides,
  brightness,
  contrastRatio,
  iceColour,
  icedSea,
  mapNames,
  playbackAdvance,
  playbackHour,
  routeStrokeOver,
  seaIceAt,
  siegeProgressMarks,
  type IceSampler,
} from "@ph/engine/domain/map-presentation";
import { foodMonths as wfFoodMonths, newSiege as wfNewSiege, siegeMonth as wfSiegeMonth } from "@ph/engine/domain/warfare";
import { decodeRgb } from "@ph/engine/node";
import { fileURLToPath } from "node:url";
import { FLAG_COLORS, FLAG_H, FLAG_W, flagGrid } from "../../../apps/client/src/art/flags.ts";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("map-presentation");

const has = (marks: Mark[], draw: string): Mark => {
  const m = marks.find((x) => x.draw === draw);
  expect(m, `expected a "${draw}" mark in ${JSON.stringify(marks)}`).toBeDefined();
  return m!;
};

// ---------------------------------------------------------------------------
// Playtest feedback on the map (VIEW-074..083): the client draws from these.

const MAP_DIR = new URL("../../../apps/client/public/map/", import.meta.url);

/** The real map's tiles, as the client hands them to the engine with newGame. */
function realMapTiles(): { width: number; height: number; province: Uint16Array; terrain: Uint8Array } {
  const ids = decodeRgb(fileURLToPath(new URL("provinces.png", MAP_DIR)));
  const terrain = decodeRgb(fileURLToPath(new URL("terrain.png", MAP_DIR)));
  const province = new Uint16Array(ids.width * ids.height);
  for (let p = 0, i = 0; p < province.length; p++, i += 3) province[p] = (ids.rgb[i]! << 16) | (ids.rgb[i + 1]! << 8) | ids.rgb[i + 2]!;
  return { width: ids.width, height: ids.height, province, terrain: terrain.rgb };
}

// VIEW-074: the engine walks the army a tile at a time; the map stands it on its tile under its commander's banner.
Given("an army led by {string} is marching", (s, commander: string) => {
  const rules = loadDefaultRuleset();
  const nation = rules.nations.find((n) => n.commanders?.some((c) => c.name === commander)) ?? rules.nations.find((n) => n.id === "france")!;
  s.host = createEngineHost(loadDefaultRuleset);
  let snap = s.host({ id: 1, type: "newGame", seed: 1, playerNation: nation.id, map: realMapTiles() }).response.snapshot;
  const k = [...snap.armies.id.keys()].find((i: number) => snap.armies.commander[i] >= 0 && snap.commanders[snap.armies.commander[i]].name === commander);
  expect(k, `an army led by ${commander}`).toBeDefined();
  const reply = s.host({ id: 2, type: "act", order: { type: "move", army: snap.armies.id[k], to: snap.armies.location[k] + 3 } }).response;
  expect(reply.type).toBe("snapshot");
  snap = reply.snapshot;
  expect(snap.armies.path[k].length).toBeGreaterThan(1);
  s.armyK = k;
  s.snap = snap;
  s.commander = commander;
});

When("the map is drawn during playback", (s) => {
  const k = s.armyK;
  s.frames = [] as { tile: number; trail: number[]; marks: Mark[] }[];
  let snap = s.snap;
  for (let day = 0; day < 4; day++) {
    snap = s.host({ id: 10 + day, type: "advance", steps: playbackAdvance(snap.hour, false) }).response.snapshot;
    const commander = snap.armies.commander[k] >= 0 ? snap.commanders[snap.armies.commander[k]].name : null;
    s.frames.push({ tile: snap.armies.tile[k], trail: [...snap.armies.trail[k]], marks: armyStand({ tile: snap.armies.tile[k], owner: String(snap.armies.owner[k]), commander }) });
  }
  s.startTile = s.snap.armies.tile[k];
  s.tileWidth = snap.tileWidth;
});

Then("the army is drawn on its current tile with the banner of {string}", (s, commander: string) => {
  for (const f of s.frames) expect(f.marks).toEqual([{ draw: "banner", tile: f.tile, commander, colour: expect.any(String) }]);
});

Then("it moves tile by tile along its route", (s) => {
  const w: number = s.tileWidth;
  let at: number = s.startTile;
  let stepped = 0;
  for (const f of s.frames) {
    for (const t of f.trail) {
      const dx = Math.abs((t % w) - (at % w));
      const dy = Math.abs(Math.floor(t / w) - Math.floor(at / w));
      expect(Math.max(dx, dy), `a step from tile ${at} to ${t}`).toBe(1);
      at = t;
      stepped++;
    }
    expect(f.tile).toBe(at);
  }
  expect(stepped).toBeGreaterThan(s.frames.length);
});

// VIEW-075
const GROUNDS: Record<string, string> = { snow: "#f4f6ff", desert: "#e0b878", "a white realm's land": "#f4f4f4", sea: "#243a6b", forest: "#257179" };

Given("an army's route crosses snow, desert and a white realm's land", (s) => {
  s.grounds = ["snow", "desert", "a white realm's land", "sea", "forest"];
});

Then("it is a light dash over a dark outline", (s) => {
  const { dash, outline, minContrast } = ROUTE_STROKE;
  expect(contrastRatio(dash, "#000000")).toBeGreaterThan(contrastRatio(outline, "#000000"));
  expect(contrastRatio(dash, outline)).toBeGreaterThanOrEqual(minContrast);
  for (const g of s.grounds as string[]) expect(routeStrokeOver(GROUNDS[g]!).readable, g).toBe(true);
});

// VIEW-076: the clock ticks through a real turn a day at a time; through a player battle, by 4-hour steps.
Then("the top bar's date ticks one day at a time", (s) => {
  const host = createEngineHost(loadDefaultRuleset);
  let snap = host({ id: 1, type: "newGame", seed: 1, playerNation: "france" }).response.snapshot;
  const turn = snap.turn;
  const dayNo = (d: { year: number; month: number; day: number }) => Date.UTC(d.year, d.month - 1, d.day) / 86_400_000;
  const days: number[] = [dayNo(snap.date)];
  for (let i = 0; snap.turn === turn && i < 20; i++) {
    expect(playbackHour(snap.hour, false)).toBeNull();
    snap = host({ id: 2 + i, type: "advance", steps: playbackAdvance(snap.hour, false) }).response.snapshot;
    days.push(dayNo(snap.date));
  }
  expect(days.length).toBeGreaterThan(2);
  for (let i = 1; i < days.length; i++) expect(days[i]! - days[i - 1]!).toBe(1);
});

Then("it shows the hour of each 4-hour step while a player battle runs", (s) => {
  const labels: (string | null)[] = [];
  let hour = 0;
  for (let i = 0; i < STEPS_PER_DAY; i++) {
    labels.push(playbackHour(hour, true));
    hour = (hour + playbackAdvance(hour, true) * (24 / STEPS_PER_DAY)) % 24;
  }
  expect(labels).toEqual(["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"]);
  expect(hour).toBe(0);
  expect(playbackAdvance(8, false)).toBe(4);
});

// VIEW-077: the map and the battle viewer show the same men and morale from the round's published state.
Given("a battle runs at {string}", (s, place: string) => {
  s.battle = { place, attMen: 9000, defMen: 7000, attStart: 9000, defStart: 7000, round: 0, rounds: 8, attackerWins: false };
});

When("a round is fought", (s) => {
  s.before = battleSides(s.battle);
  s.battle = { ...s.battle, round: s.battle.round + 1, attMen: s.battle.attMen - 700, defMen: s.battle.defMen - 300 };
  const sides = battleSides(s.battle);
  s.mapMarks = battleProgressMarks(sides);
  s.viewerMarks = battleProgressMarks(battleSides({ ...s.battle }));
});

Then("the map shows each side's men and a bar of men and morale left", (s) => {
  const marks: Mark[] = s.mapMarks;
  expect(marks.filter((m) => m.draw === "men").map((m) => m.men)).toEqual([8300, 6700]);
  const bars = marks.filter((m) => m.draw === "bar");
  expect(bars.map((m) => m.side)).toEqual(["attacker", "defender"]);
  expect(bars[0]!.menLeft).toBeCloseTo(8300 / 9000, 5);
  expect(bars[1]!.menLeft).toBeCloseTo(6700 / 7000, 5);
  // Morale sinks each round, and faster on the side that will break.
  expect(bars[0]!.moraleLeft as number).toBeLessThan(s.before[0].moraleLeft);
  expect(bars[0]!.moraleLeft as number).toBeLessThan(bars[1]!.moraleLeft as number);
});

Then("the battle viewer shows the same", (s) => expect(s.viewerMarks).toEqual(s.mapMarks));

// VIEW-078: a month of a real siege by the warfare rules, shown on the map.
Given("the castle of {string} is besieged", (s, castle: string) => {
  const garrison = 1200;
  const siege = wfNewSiege("stone castle", { garrison, store: garrison * loadDefaultRuleset().defines.war.castleStoreMonths, besiegers: 9000, bombards: 8 });
  wfSiegeMonth(siege);
  s.castle = castle;
  s.siegeState = siege;
  s.siegeView = { days: 33, months: siege.months, breaches: siege.breaches, garrison: Math.round(siege.garrison), foodMonths: wfFoodMonths(siege) };
});

When("the map is at Region zoom", (s) => {
  s.zoom = zoomLevel("Region");
});

Then("the siege shows how long it has held, its breaches, its garrison and its food left", (s) => {
  const plate = has(siegeProgressMarks(s.zoom, s.siegeView), "siege plate");
  expect(plate).toEqual({ draw: "siege plate", held: "1 month", breaches: s.siegeState.breaches, garrison: s.siegeView.garrison, foodMonths: Math.floor(s.siegeView.foodMonths * 10) / 10 });
  expect(s.siegeView.foodMonths).toBeLessThan(6);
  expect(siegeProgressMarks("Local", s.siegeView)).toEqual([plate]);
  expect(siegeProgressMarks("World", s.siegeView)).toEqual([]);
});

// VIEW-079: the real map's provinces, the capitals of 1444.
Then("no land province names are drawn except on each country's capital", (s) => {
  const rules = loadDefaultRuleset();
  const capitals = new Set(rules.nations.map((n) => n.capital));
  const water = (p: { terrain?: string }) => p.terrain === "sea" || p.terrain === "ocean";
  const places = rules.provinces.map((p) => ({ name: p.name, sea: water(p), ownersCapital: capitals.has(p.id) }));
  const land = new Set(places.filter((p) => !p.sea).map((p) => p.name));
  const capitalNames = new Set(places.filter((p) => p.ownersCapital).map((p) => p.name));
  for (const zoom of s.zoom ? [s.zoom] : ZOOMS) {
    const { drawn } = mapNames(zoom, places);
    for (const name of drawn) if (land.has(name)) expect(capitalNames.has(name), `${name} at ${zoom} zoom`).toBe(true);
  }
  expect(mapNames("Local", places).drawn.filter((n) => land.has(n)).length).toBe([...capitalNames].length);
  s.places = places;
});

Then("a selected province shows its name on its name tab and card", (s) => {
  const p = (s.places as { name: string; sea: boolean; ownersCapital: boolean }[]).find((x) => !x.sea && !x.ownersCapital)!;
  const names = mapNames("Local", s.places, p);
  expect(names.drawn).not.toContain(p.name);
  expect([names.nameTab, names.card]).toEqual([p.name, p.name]);
});

// VIEW-080..082: the sea-ice model the map shader runs, over a cold sea zone off a coast.
/** A strip of map: land in the first columns, then one sea zone at a temperature, shallow near the coast. */
function iceStrip(celsius: number, coastCols = 20): IceSampler {
  return {
    at: (x, y) => (y < 0 || y >= 200 || x < 0 || x >= 400 ? null : x < coastCols ? { land: true } : { land: false, celsius }),
    depth: (x) => Math.min(1, Math.max(0, (x - coastCols) / 200)),
  };
}

const iceRow = (sea: IceSampler, y: number) => Array.from({ length: 360 }, (_, i) => seaIceAt(sea, 20 + i, y));

Given("the {string} is partly frozen in {string}", (s, _sea: string, _month: string) => {
  s.sea = iceStrip(-11.5);
});

Then("the edge between open sea and ice shows no checkerboard dither pattern", (s) => {
  const rows = Array.from({ length: 60 }, (_, k) => iceRow(s.sea, 70 + k));
  expect(rows.flat().some((c) => c.ice > 0.9)).toBe(true);
  expect(rows.flat().some((c) => c.slush === 0)).toBe(true);
  // An ordered dither flips pixels to and fro between water and ice, row after row: up, down, up, down.
  // A soft edge may carry texture, but never that run of flips.
  const checkerRun = (v: number[]) => {
    let run = 0;
    for (let i = 2; i < v.length; i++) {
      const a = v[i - 1]! - v[i - 2]!;
      const b = v[i]! - v[i - 1]!;
      run = Math.abs(a) > 0.15 && Math.abs(b) > 0.15 && Math.sign(a) !== Math.sign(b) ? run + 1 : 0;
      if (run >= 3) return true;
    }
    return false;
  };
  let graded = 0;
  let crossings = 0;
  for (const row of rows) {
    expect(checkerRun(row.map((c) => c.slush))).toBe(false);
    expect(checkerRun(row.map((c) => c.ice))).toBe(false);
    for (let i = 1; i < row.length; i++) if (row[i - 1]!.slush >= 0.5 !== row[i]!.slush >= 0.5) crossings++;
    graded += row.filter((c) => c.slush > 0.05 && c.slush < 0.95).length;
  }
  for (let i = 0; i < 360; i += 5) expect(checkerRun(rows.map((r) => r[i]!.slush))).toBe(false);
  // Each crossing from water to ice is a band of several part-frozen pixels, not a hard step.
  expect(crossings).toBeGreaterThan(0);
  expect(graded / crossings).toBeGreaterThan(2);
});

Given("the {string} is frozen and the land around it is under snow in {string}", (s, _sea: string, _month: string) => {
  s.sea = iceStrip(-20);
});

When("the map is drawn in every colour vision mode", (s) => {
  s.modes = Object.keys(colourVision as unknown as object).length ? (["Default", "Red-weak", "Green-weak", "Blue-weak", "No colour"] as ColourVision[]) : [];
  for (const m of s.modes) colourVision(m);
});

Then("the sea ice is grey-blue and can be told from the white snow on land", (s) => {
  const ice = icedSea([0.14, 0.23, 0.42], s.sea, 30, 100);
  const snow = ICE.landSnowColour;
  // Grey-blue: blue above red, not saturated.
  expect(ice[2]).toBeGreaterThan(ice[0]);
  expect(Math.max(...ice) - Math.min(...ice)).toBeLessThan(0.3);
  // Every colour vision mode, greys included, keeps brightness: the ice is clearly darker than snow.
  for (const _mode of s.modes) expect(brightness(snow) - brightness(ice)).toBeGreaterThan(0.12);
});

Given("the {string} is freezing in {string}", (s, _sea: string, _month: string) => {
  s.sea = iceStrip(-10);
});

Then("the ice reaches out from the coasts in a natural shape that does not follow the sea zone's outline", (s) => {
  // One sea zone, one temperature: yet ice holds near the coast and not far out, and its reach varies along the coast.
  const reach = Array.from({ length: 160 }, (_, y) => iceRow(s.sea, y + 20).findIndex((c) => c.slush < 0.5));
  const near = iceRow(s.sea, 100).slice(0, 10);
  const far = iceRow(s.sea, 100).slice(300);
  expect(Math.max(...near.map((c) => c.slush))).toBeGreaterThan(0.5);
  expect(far.every((c) => c.slush === 0)).toBe(true);
  expect(Math.max(...reach) - Math.min(...reach)).toBeGreaterThan(8);
});

Then("the edge between open sea and ice is soft and textured", (s) => {
  const row = iceRow(s.sea, 100);
  expect(row.some((c) => c.slush > 0.05 && c.slush < 0.95)).toBe(true);
  const colours = new Set(Array.from({ length: 40 }, (_, i) => iceColour(30 + i * 3, 100).map((v) => v.toFixed(3)).join()));
  expect(colours.size).toBeGreaterThan(3);
});

// VIEW-083: the flags the top bar draws (apps/client/src/art/flags.ts).
When("the player looks at the top bar as {string}", (s, realm: string) => {
  s.flag = flagGrid(realm.toLowerCase());
  s.england = flagGrid("england");
});

Then("France's flag shows blue, white and red bands with no pole", (s) => {
  const g: string[][] = s.flag;
  expect(g.length).toBe(FLAG_H);
  for (const row of g) expect(row.length).toBe(FLAG_W);
  const third = FLAG_W / 3;
  const band = (from: number, to: number) => new Set(g.flatMap((row) => row.slice(Math.ceil(from), Math.floor(to))));
  expect([...band(0, third)]).toEqual([FLAG_COLORS.B]);
  expect([...band(third, 2 * third)]).toEqual([FLAG_COLORS.W]);
  expect([...band(2 * third, FLAG_W)]).toEqual([FLAG_COLORS.R]);
  // No pole: no column in the pole's brown or ink, the cloth runs to the edge.
  expect(g.flat().some((c) => c === FLAG_COLORS.N || c === FLAG_COLORS.K)).toBe(false);
});

Then("{string} shows a red cross on white", (s, realm: string) => {
  const g = flagGrid(realm.toLowerCase())!;
  const midRow = g[Math.floor(FLAG_H / 2)]!;
  const midCol = g.map((row) => row[Math.floor(FLAG_W / 2)]!);
  expect(new Set(midRow)).toEqual(new Set([FLAG_COLORS.R]));
  expect(new Set(midCol)).toEqual(new Set([FLAG_COLORS.R]));
  expect(g[0]![0]).toBe(FLAG_COLORS.W);
  expect(g[FLAG_H - 1]![FLAG_W - 1]).toBe(FLAG_COLORS.W);
});

// ---------------------------------------------------------------------------
// Layout by window shape

const WINDOWS: Record<string, Window> = {
  "a phone in landscape, 390 px high": { width: 844, height: 390, device: "phone" },
  "a phone in landscape": { width: 844, height: 390, device: "phone" },
  "a tablet in portrait": { width: 820, height: 1180, device: "tablet" },
  "a desktop window wider than tall": { width: 1600, height: 900, device: "desktop" },
  "a Steam Deck at 1280 × 800": { width: 1280, height: 800, device: "Steam Deck" },
  "a TV": { width: 1920, height: 1080, device: "TV" },
};

function setWindow(s: Scenario, name: string): void {
  const w = WINDOWS[name];
  if (!w) throw new Error(`No window fixture for ${name}`);
  s.window = w;
  s.shape = classifyShape(w);
  s.layout = layoutFor(s.shape);
}

Given("the window is {string}", (s, name: string) => setWindow(s, name));
Given(/^the window is (a TV|a phone in landscape)$/, (s, name: string) => setWindow(s, name));

When("a card is opened during a campaign", (s) => {
  s.layout = layoutFor(s.shape);
});

Then("the shape is {string}", (s, shape: string) => expect(s.shape).toBe(shape));

Then(/^the card is (a side sheet on the left 45 %|a bottom sheet at 55 % height|a side sheet 380 px wide|a side sheet at raised scale)$/, (s, card: string) => {
  const c = s.layout.card;
  if (card.includes("left 45")) expect(c).toMatchObject({ kind: "side sheet", side: "left", widthShare: 0.45 });
  else if (card.includes("bottom")) expect(c).toMatchObject({ kind: "bottom sheet", heightShare: 0.55 });
  else if (card.includes("380")) expect(c).toMatchObject({ kind: "side sheet", widthPx: 380, raisedScale: false });
  else expect(c).toMatchObject({ kind: "side sheet", raisedScale: true });
});

Then(/^the Realm book's tabs are (a left icon rail|a bottom icon row|icons with names on a left rail)$/, (s, tabs: string) => {
  const t = s.layout.bookTabs;
  if (tabs === "a left icon rail") expect(t).toMatchObject({ place: "left rail", names: false });
  else if (tabs === "a bottom icon row") expect(t).toMatchObject({ place: "bottom row", names: false });
  else expect(t).toMatchObject({ place: "left rail", names: true });
});

When("any screen is shown", (s) => {
  s.layout = layoutFor(s.shape);
  s.hud = mapHud({ width: s.window.width, height: s.window.height, shape: s.shape });
});

Then("body text is about 1\\/30 of the screen height", (s) => {
  expect(bodyTextPx(s.layout, s.window.height)).toBeCloseTo(s.window.height / 30, 0);
});

Then("nothing is drawn in the outer 5 % of the screen", (s) => {
  const { width, height } = s.window;
  for (const r of s.hud) {
    expect(r.x).toBeGreaterThanOrEqual(width * 0.05);
    expect(r.y).toBeGreaterThanOrEqual(height * 0.05);
    expect(r.x + r.w).toBeLessThanOrEqual(width * 0.95);
    expect(r.y + r.h).toBeLessThanOrEqual(height * 0.95);
  }
});

Given("the game runs on a phone", (s) => {
  s.window = { width: 844, height: 390, device: "phone" } satisfies Window;
});
When("the phone is held upright", (s) => {
  s.window = { ...s.window, width: s.window.height, height: s.window.width };
});
Then("the notice {string} is shown", (s, notice: string) => expect(portraitNotice(s.window)).toBe(notice));

// A phone in landscape with a notch on the left and the home indicator at the bottom.
const PHONE_SAFE: Insets = { top: 0, right: 0, bottom: 21, left: 47 };

Given("the touch target size is {string}", (s, size: string) => {
  s.touch = size as TouchTargetSize;
  s.window = { width: 844, height: 390, device: "phone" } satisfies Window;
});

When("the map screen is laid out", (s) => {
  s.shape = classifyShape(s.window);
  s.hud = mapHud({ width: s.window.width, height: s.window.height, shape: s.shape, safe: PHONE_SAFE, touch: s.touch });
});

Then("every tap target is at least {int} points square with 8 points between neighbours", (s, points: number) => {
  expect(tapTargetMin(s.touch)).toBe(points);
  for (const r of s.hud) expect(Math.min(r.w, r.h)).toBeGreaterThanOrEqual(points);
  const breaks = checkTouchRules(s.hud, { width: s.window.width, height: s.window.height, safe: PHONE_SAFE, touch: s.touch });
  expect(breaks.filter((b) => b.rule === "size" || b.rule === "gap")).toEqual([]);
});

Then("End turn and the game menu button sit at opposite corners", (s) => {
  const end = s.hud.find((r: { name: string }) => r.name === "End turn");
  const menu = s.hud.find((r: { name: string }) => r.name === "game menu");
  expect(oppositeCorners(cornerOf(end, s.window.width, s.window.height), cornerOf(menu, s.window.width, s.window.height))).toBe(true);
});

Then("no button sits in a system safe area", (s) => {
  const breaks = checkTouchRules(s.hud, { width: s.window.width, height: s.window.height, safe: PHONE_SAFE, touch: s.touch });
  expect(breaks.filter((b) => b.rule === "safe area")).toEqual([]);
});

Given("the province {string} is selected near the left edge", (s, province: string) => {
  s.selected = { name: province, x: 30, y: s.window.height / 2 };
});

When("its card opens", (s) => {
  s.shape = classifyShape(s.window);
  s.recentre = recentreForCard(s.shape, s.window.width, s.window.height, s.selected);
});

Then("the map stays live on the right", (s) => {
  const v = visibleMapArea(s.shape, s.window.width, s.window.height);
  expect(v.x).toBeGreaterThan(0);
  expect(v.x + v.w).toBe(s.window.width);
  expect(layoutFor(s.shape).card).toMatchObject({ side: "left", mapLiveBeside: true });
});

Then("it is recentred so {string} isn't hidden", (s, _province: string) => {
  const v = visibleMapArea(s.shape, s.window.width, s.window.height);
  const at = s.recentre.at;
  expect(s.recentre.shift.x).toBeGreaterThan(0);
  expect(at.x).toBeGreaterThanOrEqual(v.x);
  expect(at.x).toBeLessThanOrEqual(v.x + v.w);
});

// ---------------------------------------------------------------------------
// Lenses

Given("the lens {string} is on", (s, id: string) => {
  s.view = setLens(newMapView(), id).view;
});

When("the player picks {string} from the lens picker", (s, id: string) => {
  const r = setLens(s.view, id);
  s.view = r.view;
  s.event = r.event;
});

Then("the map is recoloured by food", (s) => {
  expect(lensColouring(s.view.lens)).toBe("food");
  expect(s.event).toEqual({ type: "LensChanged", lens: "Food" });
});

Then("only one lens is on", (s) => {
  expect(typeof s.view.lens).toBe("string");
  expect(s.view.lens).toBe("Food");
});

Given(/^the (Faith|Tongue|Sea|Subjects|Revolution|Diplomacy) lens is on$/, (s, id: string) => {
  s.view = setLens(newMapView(), id).view;
});

Given(/^the province "([^"]+)" is (\w+) with a (\w+) community of (\d+) %$/, (s, province: string, majority: string, minority: string, share: string) => {
  s.faithProvince = { name: province, majority, communities: [{ faith: majority, share: 1 - Number(share) / 100 }, { faith: minority, share: Number(share) / 100 }] };
});

When("the map is drawn", (s) => {
  s.zoom ??= "World";
  s.drawn = true;
});

Then(/^the province is coloured "([^"]+)" and (hatched|not hatched)$/, (s, colour: string, hatch: string) => {
  expect(s.view.lens).toBe("Faith");
  const r = faithLens(s.faithProvince);
  expect(r.colour).toBe(colour);
  expect(r.hatched).toBe(hatch === "hatched");
});

Given(/^the kin toggle is (on|off)$/, (s, toggle: string) => {
  s.view = { ...s.view, tongueKin: toggle === "on" };
});

When(/^the map is drawn at (\w+) zoom$/, (s, zoom: string) => {
  // "any" zoom: each step that follows checks every zoom level.
  s.zoom = zoom === "any" ? undefined : zoomLevel(zoom);
  s.drawn = true;
});

Then(/^provinces are coloured by (tongue family|tongue|kin, cousin or stranger)$/, (s, colouring: string) => {
  expect(s.view.lens).toBe("Tongue");
  expect(tongueLensColouring(s.zoom, s.view.tongueKin)).toBe(colouring);
});

Given("the Basque have a homeland but no country", (s) => {
  s.peoples = [
    { people: "Basque", homeland: "Basque homeland", hasCountry: false },
    { people: "Castilian", homeland: "Castile", hasCountry: true },
  ];
});

Then("the Basque homeland is outlined", (s) => {
  const outlines = homelandOutlines(s.peoples);
  expect(outlines).toEqual([{ draw: "outline", homeland: "Basque homeland", people: "Basque" }]);
});

Given("the player is {string} and the Diplomacy lens is on", (s, player: string) => {
  s.player = player;
  s.view = setLens(newMapView(), "Diplomacy").view;
});

const RELATIONS: Record<string, RelationToYou> = {
  "your subject": "subject",
  ally: "ally",
  pledged: "pledged",
  Cool: "Cool",
  Rival: "Rival",
  "at war": "at war",
};

Given(/^the country "([^"]+)" stands toward Hungary as (.+)$/, (s, country: string, relation: string) => {
  const r = RELATIONS[relation];
  if (!r) throw new Error(`relation ${relation}`);
  s.relation = { country, relation: r };
});

Then(/^"([^"]+)" is coloured (.+)$/, (s, country: string, colour: string) => {
  expect(s.relation.country).toBe(country);
  const d = diplomacyLens(s.relation.relation, s.player);
  if (colour === "Hungary's own colour") expect(d.colour).toBe("Hungary");
  else if (colour === "red, hatched") expect(d).toEqual({ colour: "red", hatched: true });
  else expect(d).toEqual({ colour, hatched: false });
});

Given("a league has formed against Hungary", (s) => {
  s.league = ["Austria", "Bohemia", "Poland"];
});

Then("the league's members carry a red border", (s) => {
  const marks = leagueBorders(s.league);
  expect(marks.map((m) => m.country)).toEqual(s.league);
  for (const m of marks) expect(m.colour).toBe("red");
});

Then("every port is shaded by sailors who can still be called", (s) => {
  s.sea = seaLens({ ports: [{ name: "Lisbon", sailorsLeft: 900 }, { name: "Lagos", sailorsLeft: 200 }], fleetsAtSea: 2, winds: ["Bay of Biscay"], enterableZones: ["Bay of Biscay", "Gulf of Cadiz"] });
  const ports = s.sea.filter((m: Mark) => m.draw === "port shade");
  expect(ports.map((m: Mark) => m.port)).toEqual(["Lisbon", "Lagos"]);
  for (const m of ports) expect(m.by).toBe("sailors who can still be called");
});

Then("fleets at sea, the month's winds as arrows and the zones the fleet's ships can enter are shown", (s) => {
  has(s.sea, "fleet at sea");
  has(s.sea, "wind arrow");
  expect(s.sea.filter((m: Mark) => m.draw === "enterable zone")).toHaveLength(2);
});

const TRADE_FIXTURE = {
  player: "Venice",
  traders: [
    { owner: "Venice", route: ["Venice", "Ragusa"] },
    { owner: "Genoa", route: ["Genoa", "Tunis"] },
  ],
  paths: [
    { from: "Venice", to: "Verona", traders: 2 },
    { from: "Venice", to: "Ragusa", traders: 6 },
  ],
};

Then("provinces are coloured by trade ratio with the busiest roads and sea lanes as lines", (s) => {
  const r = tradeLens(s.view.lens, TRADE_FIXTURE);
  expect(r.colourBy).toBe("trade ratio");
  expect(r.lines[0]).toMatchObject({ draw: "busiest line", to: "Ragusa", thickness: 6 });
});

Then("only your traders and their routes are shown", (s) => {
  const r = tradeLens(s.view.lens, TRADE_FIXTURE);
  expect(r.traders).toEqual([{ draw: "trader route", owner: "Venice", route: ["Venice", "Ragusa"] }]);
});

const WORKS: Record<string, WorksState[] | { emptySlots: number; homeless: number }> = {
  "has a building site": ["building site"],
  "has a neglected building": ["neglected"],
  "has a ruined building": ["ruined"],
  "has empty job slots and homeless people": { emptySlots: 40, homeless: 25 },
};

Given(/^a province (has .+)$/, (s, state: string) => {
  const w = WORKS[state];
  if (!w) throw new Error(state);
  s.works = w;
});

Then(/^the province is coloured (green|amber|red|by slots against homeless)$/, (s, colour: string) => {
  if (Array.isArray(s.works)) {
    expect(s.view.lens).toBe("Works");
    expect(worksLens(s.works)).toBe(colour);
  } else {
    expect(s.view.lens).toBe("Jobs");
    const j = jobsLens(s.works);
    expect(`by ${j.colourBy}`).toBe(colour);
    expect(j.value).toBe(15);
  }
});

Given("a subject of the player is being courted by another country", (s) => {
  s.subjects = [
    { name: "Wallachia", loyalty: "loyal" },
    { name: "Moldavia", loyalty: "wavering", courtedBy: { country: "Poland", capital: "Krakow" } },
  ];
});

Then("each subject is coloured by its loyalty", (s) => {
  const marks = subjectsLens(s.subjects).filter((m) => m.draw === "subject colour");
  expect(marks.map((m) => [m.subject, m.loyalty])).toEqual([
    ["Wallachia", "loyal"],
    ["Moldavia", "wavering"],
  ]);
});

Then("a line runs from the courting country's capital to the courted subject", (s) => {
  expect(subjectsLens(s.subjects).filter((m) => m.draw === "line")).toEqual([{ draw: "line", from: "Krakow", to: "Moldavia" }]);
});

Then("provinces are shaded by how many of the revolution's province signs they meet", (s) => {
  expect(revolutionLens({ signsMet: 0, signs: 4, risen: false, colour: "tricolour" }).shade).toBe(0);
  expect(revolutionLens({ signsMet: 3, signs: 4, risen: false, colour: "tricolour" }).shade).toBe(0.75);
  expect(lensColouring(s.view.lens)).toBe("revolution signs met");
});

Then("risen provinces are hatched in the revolution's colour", (_s) => {
  expect(revolutionLens({ signsMet: 4, signs: 4, risen: true, colour: "tricolour" }).hatch).toBe("tricolour");
  expect(revolutionLens({ signsMet: 4, signs: 4, risen: false, colour: "tricolour" }).hatch).toBeNull();
});

Given("a national ambition naming an area is hot", (s) => {
  s.ambition = { hot: true, area: "Italy" };
});

Then("the area shimmers faintly", (s) => {
  expect(ambitionShimmer(s.ambition)).toMatchObject({ shimmer: "Italy", faint: true });
  expect(ambitionShimmer({ hot: false, area: "Italy" })).toBeNull();
});

Then("no target is outlined or named", (s) => {
  expect(ambitionShimmer(s.ambition)).toMatchObject({ outline: false, label: false });
});

// ---------------------------------------------------------------------------
// Map accessibility

Given("the colour vision setting is {string}", (s, mode: string) => {
  s.vision = colourVision(mode as ColourVision);
});

When("the map is drawn with the Food lens", (s) => {
  s.view = setLens(newMapView(), "Food").view;
});

Then(/^nation colours use (the normal assignment|a second assignment from the 32-colour palette|greys)$/, (s, colours: string) => {
  if (colours === "the normal assignment") expect(s.vision.nationColours).toBe("normal assignment");
  else if (colours === "greys") expect(s.vision.nationColours).toBe("greys");
  else {
    expect(s.vision.nationColours).toBe("second assignment");
    expect(s.vision.palette).toBe(32);
  }
});

Then(/^the lens uses (its normal ramp|a blue to orange ramp|greys with patterns)$/, (s, ramp: string) => {
  if (ramp === "its normal ramp") expect(s.vision.ramp).toBe("normal");
  else if (ramp === "a blue to orange ramp") expect(s.vision.ramp).toBe("blue to orange");
  else {
    expect(s.vision.ramp).toBe("greys with patterns");
    expect(s.vision.patterns).toBe(true);
  }
});

Given("patterns on lenses are on", (s) => {
  s.patterns = true;
});

When("the map is drawn with the Grievances lens", (s) => {
  s.view = setLens(newMapView(), "Grievances").view;
  s.bandPatterns = lensBandPatterns(5);
});

Then("each band of the lens carries its own hatching, dots or stripes", (s) => {
  expect(new Set(s.bandPatterns).size).toBe(5);
  for (const p of s.bandPatterns) expect(p).toMatch(/^(hatching|dots|stripes)/);
});

Given("the borders setting is {string}", (s, borders: string) => {
  s.borders = borders;
});

Then("nation borders are black and white ink two art pixels wide", (s) => {
  const b = borderBetween({ province: "Aube", owner: "France" }, { province: "Côte-d'Or", owner: "Burgundy" }, s.borders);
  expect(b).toMatchObject({ line: "ink", colours: ["black", "white"], widthArtPixels: 2 });
});

const FOOD_SHARE: Record<string, number> = { covered: 1, "under half": 0.3, empty: 0 };

Given(/^a route whose food state is (covered|under half|empty)$/, (s, state: string) => {
  s.foodShare = FOOD_SHARE[state];
});

When("the route is drawn", (s) => {
  s.routeLine = routeLine(s.foodShare);
});

Then(/^its line is (solid|dashed|dotted)$/, (s, pattern: string) => expect(s.routeLine.pattern).toBe(pattern));

Given("a route is drawn with day counts", (s) => {
  s.dayCountPoints = 12;
  expect(dayCountsShown(s.dayCountPoints)).toBe(true);
});

When("the player zooms out past where the counts would be under 10 points tall", (s) => {
  s.dayCountPoints = 9.5;
});

Then("the day counts are hidden", (s) => expect(dayCountsShown(s.dayCountPoints)).toBe(false));

Given("the tutorial asks for the Food lens", (s) => {
  s.view = setLens(newMapView(), "Food").view;
});

Then("hungry provinces also carry the hunger icon", (s) => {
  expect(s.view.lens).toBe("Food");
  has(foodLensMarks({ hungry: true, food: 0.2 }), "hunger icon");
  expect(foodLensMarks({ hungry: false, food: 2 }).some((m) => m.draw === "hunger icon")).toBe(false);
});

// ---------------------------------------------------------------------------
// Drawing the map at each scale

Given("the province id image has been uploaded once", (s) => {
  s.owners = Array.from({ length: 100 }, (_, i) => `N${i % 7}`);
  s.idImageUploaded = recolourUploads({ idImageUploaded: false, ownersBefore: [], ownersAfter: s.owners }).uploads.includes("province id image");
});

When("a turn changes the owners of {int} provinces", (s, n: number) => {
  const after = [...s.owners];
  for (let i = 0; i < n; i++) after[i * 5] = "France";
  s.upload = recolourUploads({ idImageUploaded: s.idImageUploaded, ownersBefore: s.owners, ownersAfter: after });
  s.changedOwners = n;
});

Then("only the province colour lookup texture is updated", (s) => {
  expect(s.upload.uploads).toEqual(["colour lookup texture"]);
  expect(s.upload.recoloured).toBe(s.changedOwners);
});

Then("the id image is not uploaded again", (s) => expect(s.upload.uploads).not.toContain("province id image"));

Given("the camera is zoomed out", (s) => {
  s.zoom = zoomLevel("zoomed out");
});

Then("each map pixel takes its terrain's colour with hill shading and the owner's colour washed over it", (s) => {
  const r = pixelRendering(s.zoom);
  expect(r.artPixels).toBeNull();
  expect(r.land).toBe("terrain colour with hill shading, owner colour washed over");
});

Then("the sea is shaded by depth with dithered band edges", (s) => {
  expect(pixelRendering(s.zoom).sea).toBe("shaded by depth with dithered band edges");
});

Given(/^the camera is at (\w+) zoom(?: over (.+))?$/, (s, zoom: string, over?: string) => {
  s.zoom = zoomLevel(zoom);
  if (over) s.over = over.replace(/^"|"$/g, "");
});

Then(/^each map pixel becomes (\d+) × (\d+) art pixels from the terrain tile atlas$/, (s, a: string, b: string) => {
  expect(a).toBe(b);
  const r = pixelRendering(s.zoom);
  expect(r.artPixels).toBe(Number(a));
  expect(r.from).toBe("terrain tile atlas");
});

Given("the provinces {string} of {string} and {string} of {string} are neighbours", (s, p1: string, o1: string, p2: string, o2: string) => {
  s.pair = [
    { province: p1, owner: o1 },
    { province: p2, owner: o2 },
  ];
});

Then("their border is an ink line with a band of each owner's colour on its side", (s) => {
  const b = borderBetween(s.pair[0], s.pair[1]);
  expect(b).toEqual({
    line: "ink",
    bands: [
      { side: "Aube", colour: "France" },
      { side: "Côte-d'Or", colour: "Burgundy" },
    ],
  });
  expect(borderBetween(s.pair[0], { province: "Marne", owner: "France" })).toBeNull();
});

const STEPPE: Rgb[] = [
  [160, 150, 80],
  [170, 160, 90],
  [150, 140, 70],
  [160, 150, 80],
];

Given("the tile type {string} is repainted with a paler grass", (s, tile: string) => {
  s.tile = tile;
  s.before = averageColour(STEPPE);
  s.repainted = STEPPE.map(([r, g, b]) => [r + 30, g + 30, b + 30] as Rgb);
});

When("the map is drawn zoomed out", (s) => {
  s.zoom = "World";
  s.farColour = averageColour(s.repainted);
});

Then("steppe pixels take the new average colour", (s) => {
  expect(s.farColour).toEqual([190, 180, 110]);
  expect(s.farColour).not.toEqual(s.before);
});

Given("a river traced through the province {string}", (s, _province: string) => {
  s.traced = [
    [10, 4],
    [11, 5],
    [11, 6],
    [12, 7],
  ];
});

Then("the river is one line along its traced pixels", (s) => {
  expect(s.zoom).toBe("Region");
  const r = riverLine(s.traced);
  expect(r.lines).toBe(1);
  expect(r.points).toEqual(s.traced);
});

// ---------------------------------------------------------------------------
// Month playback

Given("the config value {string} is {int}", (s, key: string, value: number) => {
  expect((MOVE as Record<string, unknown>)[key]).toBe(value);
  s.secondsPer10Days = value;
});


function dayOf(text: string) {
  const [d, m, y] = text.split(" ");
  return { year: Number(y), month: MONTH_NAMES.indexOf(m as (typeof MONTH_NAMES)[number]) + 1, day: Number(d) };
}

When(/^the turn starting on (\d+ \w+ \d+) ends$/, (s, text: string) => {
  s.days = playbackDays(dayOf(text));
  s.playback = playbackCues({ days: s.days, marches: [], castleStops: [], battles: [] }, s.secondsPer10Days);
});

Then(/^the (\d+) days of the turn play in about ([\d.]+) seconds$/, (s, days: string, seconds: string) => {
  expect(s.days).toBe(Number(days));
  expect(s.playback.seconds).toBeCloseTo(Number(seconds), 5);
});

Given("a player battle ran in {string} from day {int} for {int} days of the turn starting {int} November 1444", (s, place: string, day: number, n: number, d: number) => {
  s.month = { days: playbackDays({ year: 1444, month: 11, day: d }), marches: [], castleStops: [], battles: [{ day, place, player: true, daysRunning: n }] };
  s.battleDays = n;
});

Then(/^the (\d+) whole days play in about ([\d.]+) seconds and the (\d+) battle days in about ([\d.]+) seconds$/, (s, whole: string, ws: string, bd: string, bs: string) => {
  expect(Number(whole) + Number(bd)).toBe(s.month.days);
  expect(s.playback.seconds).toBeCloseTo(Number(ws) + Number(bs), 5);
  expect(Number(bs)).toBeCloseTo(Number(bd) * STEPS_PER_DAY * 0.5, 5);
});

Then("no skip button is offered", (s) => expect(s.playback.skip).toBe(false));

Given("the player's battles in {string} and {string} are running, {string} followed", (s, a: string, b: string, f: string) => {
  s.running = [
    { id: a, place: a, rounds: 3, days: 2 },
    { id: b, place: b, rounds: 9, days: 3 },
  ];
  s.following = f;
});

When("the player taps {string} in the battle bar", (s, place: string) => {
  s.following = s.running.find((b: { place: string }) => b.place === place).id;
  s.camera = { on: place };
  s.bar = battleBar(s.running, s.following);
});

Then("the battle bar shows both battles with their progress", (s) => {
  expect(s.bar.map((b: { place: string; progress: number }) => [b.place, b.progress])).toEqual([
    ["Langres", 0.25],
    ["Troyes", 0.5],
  ]);
});

Then("{string} is followed and the camera moves to it", (s, place: string) => {
  expect(s.bar.find((b: { followed: boolean }) => b.followed).place).toBe(place);
  expect(s.camera.on).toBe(place);
});

// Seasons on the map (X-17)

Given(/^a province at latitude (-?\d+)(?:, a dry land of (\w+))?$/, (s, lat: string, climate?: string) => {
  s.seasonProvince = { latitude: Number(lat), ...(climate ? { wetClimate: climate } : {}) };
});

Given(/^a province at latitude (-?\d+), a mountain province$/, (s, lat: string) => {
  s.seasonProvince = { latitude: Number(lat), mountain: true };
});

When(/^the map is drawn in (\w+)$/, (s, month: string) => {
  s.palette = seasonPalette(s.seasonProvince, MONTH_NAMES.indexOf(month as (typeof MONTH_NAMES)[number]) + 1);
});

Then("its tiles take the {string} palette", (s, palette: string) => expect(s.palette).toBe(palette));

Given("{int} provinces at latitudes {int}, {int} and {int}", (s, _n: number, a: number, b: number, c: number) => {
  s.seasonProvinces = [a, b, c].map((latitude, i) => ({ id: `p${i}`, latitude }));
});

When("the month turns from November to December", (s) => {
  s.calls = 0;
  s.palettes = monthPalettes(s.seasonProvinces, 12);
});

Then("each province's palette is chosen once for December", (s) => {
  expect([...s.palettes.values()]).toEqual(["snow", "base", "base"]);
  expect(s.palettes.size).toBe(3);
});

Then("no setting turns the season palettes off", (_s) => {
  expect(Object.keys(PHONE_DEFAULTS)).not.toContain("Seasons");
  expect(seasonPalette({ latitude: 60 }, 1)).toBe("snow");
});

Then("a skip button is offered", (s) => expect(s.playback.skip).toBe(true));

Given("an army marched to {string} and was stopped by its castle on day {int}", (s, place: string, day: number) => {
  s.month = { days: 7, marches: [{ army: "Armée de Dunois", route: ["Troyes", "Chaumont", place] }], castleStops: [{ day, castle: place }], battles: [] };
});

Given("a battle was fought in {string} on day {int}", (s, place: string, day: number) => {
  s.month.battles.push({ day, place });
});

When("the turn plays back", (s) => {
  // With no turn given, the steps that follow play a real one (VIEW-076).
  if (s.month) s.playback = playbackCues(s.month);
});

Then("the army walks its route", (s) => {
  expect(s.playback.cues[0]).toMatchObject({ draw: "walk route", army: "Armée de Dunois", place: "Troyes → Chaumont → Langres" });
});

Then("{string} castle rings red on day {int}", (s, place: string, day: number) => {
  const c = s.playback.cues.find((x: { draw: string }) => x.draw === "castle rings red");
  expect(c).toMatchObject({ day, place });
  expect(c.at).toBeCloseTo((day - 1) / 10, 5);
});

Then("crossed swords flash on day {int} and playback does not pause", (s, day: number) => {
  const c = s.playback.cues.find((x: { draw: string }) => x.draw === "crossed swords");
  expect(c).toMatchObject({ day });
  expect(c.at).toBeCloseTo((day - 1) / 10, 5);
  expect(s.playback.seconds).toBeCloseTo(0.7, 5);
});

Given("End turn has been given", (s) => {
  s.owners = ["France", "Burgundy", "England", "Burgundy"];
});

When("the worker is processing the turn", (s) => {
  // Results arrive in two parts; each part recolours what it changes.
  s.parts = [
    recolourUploads({ idImageUploaded: true, ownersBefore: s.owners, ownersAfter: ["France", "France", "England", "Burgundy"] }),
    recolourUploads({ idImageUploaded: true, ownersBefore: ["France", "France", "England", "Burgundy"], ownersAfter: ["France", "France", "England", "France"] }),
  ];
});

Then("the map can still be panned and zoomed", (_s) => {
  expect(mapInputWhileProcessing("pan")).toBe(true);
  expect(mapInputWhileProcessing("zoom")).toBe(true);
  expect(mapInputWhileProcessing("order")).toBe(false);
});

Then("armies march and borders change as results arrive", (s) => {
  expect(s.parts.map((p: { recoloured: number }) => p.recoloured)).toEqual([1, 1]);
});

Given("a turn takes {float} seconds", (s, seconds: number) => {
  s.turnSeconds = seconds;
});

When("the turn is processed", (s) => {
  s.strip = turnStrip(s.turnSeconds);
});

Then("no strip is shown", (s) => expect(s.strip.shown).toBe(false));
Then("a parchment strip says {string}", (s, text: string) => {
  expect(s.strip.shown).toBe(true);
  expect(s.strip.text).toBe(text);
});

// ---------------------------------------------------------------------------
// Parchment

Given("the country {string} has not charted the coast of Hispaniola", (s, country: string) => {
  s.country = country;
  s.charted = new Set(["Castile", "Canaries", "Madeira"]);
});

When("the map is drawn for Castile", (s) => {
  s.drawn = true;
});

Then("Hispaniola's coast lies under the parchment", (s) => {
  expect(underParchment("Hispaniola coast", s.charted)).toBe(true);
  expect(underParchment("Canaries", s.charted)).toBe(false);
});

Given("a caravel of {string} charted the Bahamas", (s, _country: string) => {
  s.charted = chart(new Set(["Castile", "Canaries"]), ["Bahamas"]);
});

When("the caravel returns home", (s) => {
  s.charted = chart(s.charted, ["Canaries", "Castile"]);
});

Then("the Bahamas stay out from under the parchment", (s) => {
  expect(underParchment("Bahamas", s.charted)).toBe(false);
});

// ---------------------------------------------------------------------------
// Performance budgets

Given("the built game runs in mobile Chromium", (s) => {
  s.perf = true;
});

When("the perf script pans the map at every zoom and ends three turns", (s) => {
  s.perfBudgets = BUDGETS.filter((b) => b.checkedBy === "perf");
});

const MEASURES: Record<string, string> = {
  "frame rate while panning and zooming": "60 fps",
  "overlay time per frame, average": "2.5 ms",
  "overlay time per frame, 95th percentile": "5 ms",
  "longest main-thread task while playing": "50 ms",
  "frames redrawn while armies march": "at least 90 %",
};

Then(/^"([^"]+)" is within (60 fps|2\.5 ms|5 ms|50 ms|at least 90 %)$/, (s, measure: string, limit: string) => {
  expect(MEASURES[measure]).toBe(limit);
  const b = budget(measure);
  expect(s.perfBudgets).toContain(b);
  expect(b.limit).toBe(Number(limit.match(/[\d.]+/)![0]));
  expect(withinBudget(b, b.limit)).toBe(true);
  s.measure = b;
});

Then("a broken budget fails CI", (s) => {
  const b = s.measure;
  const broken = b.bound === "max" ? b.limit * 1.1 : b.limit * 0.9;
  expect(checkBudgets({ [b.measure]: broken })).toEqual({ pass: false, broken: [b.measure] });
  expect(checkBudgets({ [b.measure]: b.limit }).pass).toBe(true);
});

Given("the map is being panned", (s) => {
  s.frameWork = panFrameWork();
});

When("a frame is drawn", (s) => {
  s.forbidden = forbiddenFrameWork(s.frameWork);
});

Then("no layout is read", (s) => {
  expect(s.forbidden).not.toContain("read layout");
  expect(forbiddenFrameWork([{ task: "read layout" }])).toEqual(["read layout"]);
});

Then("text and sprites come from cached bitmaps", (s) => {
  for (const t of s.frameWork.filter((x: { task: string }) => /labels|sprites/.test(x.task))) expect(t.from).toBe("cached bitmaps");
  expect(s.forbidden).not.toContain("draw text");
});

Then("no route is planned and the province graph is not walked", (s) => {
  expect(s.forbidden).toEqual([]);
});

Given("a synthetic world of {int} provinces and {int} nations", (s, provinces: number, nations: number) => {
  s.world = createWorld(generateSyntheticRuleset(loadDefaultRuleset(), { provinces, nations }), 1);
  s.size = { provinces, nations };
});

When("the bench processes a turn", (s) => {
  const w = s.world;
  processTurn(w, [], 0); // warm up
  s.treasuryBefore = w.nationTreasury.slice();
  s.turnBefore = w.turn;
  // Three runs of ten turns, each covering the weekly and monthly steps; the
  // median run's average per turn counts, so one runner hiccup does not fail CI
  // while a turn that is truly over budget still does (VIEW-064).
  const turns = 10;
  const runs: number[] = [];
  for (let r = 0; r < 3; r++) {
    const t0 = performance.now();
    for (let i = 0; i < turns; i++) processTurn(w, [], 0);
    runs.push((performance.now() - t0) / turns);
    if (r === 0) s.turnAfterFirstRun = w.turn;
  }
  s.turnMs = runs.sort((a, b) => a - b)[1]!;
});

Then("AI nations run in the same worker turn", (s) => {
  const w = s.world;
  expect(s.turnAfterFirstRun - s.turnBefore).toBe(10);
  // Every nation's books moved in the player's turn, not only the player's.
  let moved = 0;
  for (let n = 0; n < s.size.nations; n++) if (w.nationTreasury[n] !== s.treasuryBefore[n]) moved++;
  expect(moved).toBe(s.size.nations);
});

Given("a synthetic world of {int} provinces", (s, provinces: number) => {
  s.rules = generateSyntheticRuleset(loadDefaultRuleset(), { provinces, nations: provinces / 10 });
  s.world = createWorld(s.rules, 1);
  s.provinces = provinces;
});

When("the slowest route is planned", (s) => {
  const map = marchMap(s.world);
  const land = map.ground.flatMap((g, p) => (g ? [p] : []));
  const army = { men: 10000, horse: 2000, logistics: 0 };
  // The first ten routes warm planRoute up; the slowest of the next ten counts.
  // Each route is timed as the best of three runs so a garbage-collection pause is not counted.
  let worst = 0;
  for (let i = -10; i < 10; i++) {
    const from = land[((i + 10) * 7919) % land.length]!;
    const to = land[((i + 10) * 104729 + 13) % land.length]!;
    let ms = Infinity;
    for (let run = 0; run < 3; run++) {
      const t0 = performance.now();
      const route = planRoute(s.rules.defines.march, map, from, to, army);
      ms = Math.min(ms, performance.now() - t0);
      expect(route).not.toBeNull();
    }
    if (i >= 0) worst = Math.max(worst, ms);
  }
  s.routeMs = worst;
});

Then("it takes at most {int} ms", (s, ms: number) => {
  if (s.routeMs !== undefined) {
    expect(routeBudgetMs(s.provinces)).toBe(ms);
    expect(s.routeMs).toBeLessThanOrEqual(ms);
    return;
  }
  expect(turnBudgetMs(s.size.provinces, s.size.nations)).toBe(ms);
  expect(s.turnMs).toBeLessThanOrEqual(ms);
});

Given("the real map", (s) => {
  s.host = createEngineHost(loadDefaultRuleset);
  const first = s.host({ id: 1, type: "newGame", seed: 1, playerNation: loadDefaultRuleset().nations[0]!.id });
  expect(first.response.type).toBe("snapshot");
  s.lastOwners = Array.from(first.response.snapshot.provinceOwner as Int16Array);
});

When("End turn is given", (s) => {
  const t0 = performance.now();
  s.reply = s.host({ id: 2, type: "endTurn", orders: [] });
  s.answerMs = performance.now() - t0;
});

Then("the worker answers within 250 ms with transferred typed arrays", (s) => {
  expect(budget("worker answer after End turn").limit).toBe(250);
  expect(s.answerMs).toBeLessThanOrEqual(250);
  expect(s.reply.response.type).toBe("snapshot");
  expect(s.reply.transfer.length).toBeGreaterThan(0);
  for (const b of s.reply.transfer) expect(b).toBeInstanceOf(ArrayBuffer);
  expect(s.reply.transfer).toContain(s.reply.response.snapshot.provinceOwner.buffer);
});

Then("applying the answer takes at most 16 ms with one redraw", (s) => {
  const t0 = performance.now();
  const upload = recolourUploads({ idImageUploaded: true, ownersBefore: s.lastOwners, ownersAfter: Array.from(s.reply.response.snapshot.provinceOwner as Int16Array).map(String) });
  s.applied = applyTurnAnswer({ transfer: "typed arrays", openPanels: ["province card"], allPanels: ["province card", "realm book", "attention"] });
  const ms = performance.now() - t0;
  expect(budget("applying the answer on the main thread").limit).toBe(16);
  expect(ms).toBeLessThanOrEqual(16);
  expect(upload.uploads).not.toContain("province id image");
  expect(s.applied.redraws).toBe(1);
  expect(s.applied.ok).toBe(true);
});

Then("only open panels re-render", (s) => expect(s.applied.rerender).toEqual(["province card"]));

Given(/^the platform (supports|can't start) a module worker$/, (s, support: string) => {
  s.workerStarts = support === "supports";
});

When("a turn is processed", (s) => {
  s.runsIn = turnRunsIn(s.workerStarts);
});

Then(/^it runs (in the worker|on the main thread)$/, (s, where: string) => {
  expect(s.runsIn).toBe(where === "in the worker" ? "worker" : "main thread");
});

Given("the phone device profile with its defaults", (s) => {
  s.knobs = PHONE_DEFAULTS;
});

When("the performance targets are measured", (s) => {
  s.measuredAt = measuredKnobs();
});

Then("they are measured at Sharpness Balanced, 60 fps cap, Map detail Medium and Animations Full", (s) => {
  expect(s.measuredAt[0]).toMatchObject({ Sharpness: "Balanced", "Frame rate cap": 60, "Map detail": "Medium", Animations: "Full" });
  expect(s.measuredAt[0]).toEqual(s.knobs);
});

Then("measured once more with Battery saver on", (s) => {
  expect(s.measuredAt).toHaveLength(2);
  expect(s.measuredAt[1]).toMatchObject({ Sharpness: "Battery", "Frame rate cap": 30, Animations: "Reduced", redraw: "on change" });
});

Given("the frame rate cap is {int}", (s, cap: number) => {
  s.cap = cap;
});

Given("nothing on the map moves", (s) => {
  s.moving = false;
});

When("a second passes", (s) => {
  s.redrawn = framesRedrawn({ seconds: 1, cap: s.cap, moving: s.moving });
});

Then("the map is not redrawn", (s) => {
  expect(s.redrawn).toBe(0);
  expect(framesRedrawn({ seconds: 1, cap: s.cap, moving: true })).toBe(60);
});

Given("Map detail is {string}", (s, detail: string) => {
  s.detail = detail as MapDetail;
});

When("the map is drawn close in", (s) => {
  s.close = closeInDetail(s.detail);
  s.rendering = pixelRendering("Local", s.detail);
});

Then("tiles stay at 4 × 4 with no surf and no forest blending", (s) => {
  expect(s.rendering.artPixels).toBe(4);
  expect(s.close.without).toEqual(expect.arrayContaining(["surf", "forest blending"]));
  expect(s.rendering.coasts).not.toContain("surf");
});

Then("tiles are 8 × 8 with still water", (s) => {
  expect(s.rendering.artPixels).toBe(8);
  expect(s.close.water).toBe("still");
});

Then("everything is drawn", (s) => {
  expect(s.close.everything).toBe(true);
  expect(s.close.without).toEqual([]);
  expect(s.rendering.artPixels).toBe(8);
});

Given("Animations is {string}", (s, a: string) => {
  s.animations = a as Animations;
});

When("a battle result is shown", (s) => {
  s.motion = battleResultMotion(s.animations);
});

Then("the battle plays with full motion", (s) => expect(s.motion).toBe("full motion"));
Then("the battle plays with reduced motion", (s) => expect(s.motion).toBe("reduced motion"));
Then("the result is shown as still frames", (s) => expect(s.motion).toBe("still frames"));

// ---------------------------------------------------------------------------
// What each zoom shows

const PROVINCE_STATES: Record<string, { hungry?: boolean; rioting?: boolean; inRevolt?: boolean }> = {
  hungry: { hungry: true },
  rioting: { rioting: true },
  "in revolt": { inRevolt: true },
  "at peace and fed": {},
};

Given(/^the province "([^"]+)" is (hungry|rioting|in revolt|at peace and fed)$/, (s, name: string, state: string) => {
  s.province = { name, owner: "France", ...PROVINCE_STATES[state] };
});

Then("the province shows its owner's colour", (s) => {
  expect(provinceMarks(s.zoom, s.province)[0]).toEqual({ draw: "owner colour", owner: "France" });
});

Then(/^it shows (the hunger icon|the riot icon|the revolt icon|no icon)$/, (s, icon: string) => {
  const icons = provinceMarks(s.zoom, s.province).filter((m) => m.draw.endsWith("icon"));
  if (icon === "no icon") expect(icons).toEqual([]);
  else expect(icons.map((m) => m.draw)).toEqual([icon.replace(/^the /, "")]);
});

Given("an army of {int},{int} men is marching", (s, thousands: number, rest: number) => {
  s.army = { owner: "France", men: thousands * 1000 + rest, marching: true };
});

Given("a battle is being fought and a castle is besieged", (s) => {
  s.battle = true;
  s.siege = { breaches: 0 };
});

Then("the army shows a banner with {string} and an arrow thick by its men in its owner's colour", (s, men: string) => {
  const marks = armyMarks(s.zoom, s.army);
  expect(has(marks, "banner")).toMatchObject({ men, colour: "France" });
  expect(has(marks, "arrow")).toMatchObject({ thickness: s.army.men, colour: "France" });
  const smaller = armyMarks(s.zoom, { ...s.army, men: 3000 });
  expect(has(smaller, "arrow").thickness as number).toBeLessThan(has(marks, "arrow").thickness as number);
});

Then("no day counts are shown", (s) => {
  for (const m of armyMarks(s.zoom, s.army)) expect(m.dayCounts ?? false).toBe(false);
});

Then("the battle shows crossed swords and the besieged castle a ring", (s) => {
  expect(battleMarks(s.zoom)).toEqual([{ draw: "crossed swords" }]);
  expect(siegeMarks(s.zoom, s.siege.breaches)).toEqual([{ draw: "ring" }]);
});

Given("{string} is a great port and {string} a small harbour", (s, great: string, small: string) => {
  s.ports = [
    { name: great, owner: "Portugal", great: true },
    { name: small, owner: "England", great: false },
  ];
  s.fleets = [{ ships: 12 }, { ships: 3 }];
});

Then("both show anchor dots in their owner's colour, the one at {string} larger", (s, larger: string) => {
  const dots = s.ports.map((p: { name: string; owner: string; great: boolean }) => ({ name: p.name, mark: has(portMarks(s.zoom, p), "anchor dot") }));
  expect(dots.map((d: { mark: Mark }) => d.mark.colour)).toEqual(["Portugal", "England"]);
  expect(dots.find((d: { name: string }) => d.name === larger).mark.size).toBe("large");
  expect(dots.find((d: { name: string }) => d.name !== larger).mark.size).toBe("small");
});

Then("each fleet shows as a single ship sprite with a count", (s) => {
  for (const f of s.fleets) expect(fleetMarks(s.zoom, f)).toEqual([{ draw: "ship sprite", count: f.ships }]);
});

Given("a caravel is on a voyage and a colony is being founded", (s) => {
  s.exploration = { voyages: 1, colonies: [0.4] };
});

Then("the voyage path is a dotted line", (s) => {
  expect(has(explorationMarks(s.zoom, s.exploration), "voyage path").line).toBe("dotted");
});

Then("the colony shows a small flag with a progress ring", (s) => {
  expect(has(explorationMarks(s.zoom, s.exploration), "small flag").progressRing).toBe(0.4);
});

Then("{string} shows its town size, its castle with reach rings, its roads and rivers", (s, name: string) => {
  expect(s.over).toBe(name);
  const marks = provinceMarks(s.zoom, { name, owner: "France", townSize: 3, castle: true, roads: true, rivers: true });
  for (const d of ["town size", "castle", "reach rings", "roads", "rivers"]) has(marks, d);
});

Then("the busiest trade paths are thicker with more traders", (s) => {
  const marks = tradePathMarks(s.zoom, [
    { from: "Troyes", to: "Provins", traders: 2 },
    { from: "Troyes", to: "Reims", traders: 5 },
  ]);
  expect(marks.map((m) => [m.to, m.thickness])).toEqual([
    ["Reims", 5],
    ["Provins", 2],
  ]);
});

Then("burned provinces are hatched and plague is shown", (s) => {
  const marks = provinceMarks(s.zoom, { name: "Aube", owner: "France", burned: true, plague: true });
  expect(has(marks, "hatched").why).toBe("burned");
  has(marks, "plague");
});

Given("the army of {string} with foot, horse and {int} bombards is selected with {int} days of food", (s, _commander: string, guns: number, days: number) => {
  s.army = { owner: "France", men: 9000, foot: 7000, horse: 2000, guns, selected: true, foodDays: days, route: { days: [3, 4, 5], monthMarks: 1, foodShare: 0.8, stepIcons: ["river"] } };
});

Given("an enemy army is known only as a rumour", (s) => {
  s.rumour = { owner: "England", men: 0, rumour: true };
});

Then("the army shows sprites for foot, horse and guns and a food bar of {int} days on its banner", (s, days: number) => {
  const marks = armyMarks(s.zoom, s.army);
  expect(has(marks, "sprites").arms).toEqual(["foot", "horse", "guns"]);
  expect(has(marks, "food bar").days).toBe(days);
});

Then("its route shows day counts, month marks, food colour and step icons", (s) => {
  expect(has(armyMarks(s.zoom, s.army), "route")).toMatchObject({ dayCounts: true, monthMarks: 1, foodColour: "green", stepIcons: ["river"] });
});

Then("the rumour shows as a faded banner", (s) => {
  expect(armyMarks(s.zoom, s.rumour)).toEqual([{ draw: "faded banner" }]);
});

When("the player drags an army over the province {string}", (s, province: string) => {
  s.drag = dragMarks(s.zoom, province, 1200);
});

Then("the forage limit of {string} is shown", (s, province: string) => {
  expect(s.drag).toEqual([{ draw: "forage limit", province, value: 1200 }]);
});

Given("its harbour has {int} of {int} berths used and its slipway has hulls building", (s, used: number, berths: number) => {
  s.harbour = { berthsUsed: used, berths, hullsBuilding: 2 };
  s.fleet = { ships: 4, admiral: "Pedro de Meneses", courseDays: 6 };
});

Then("the harbour tile shows an anchor icon with {string}", (s, label: string) => {
  expect(has(harbourMarks(s.zoom, s.harbour), "anchor icon").label).toBe(label);
});

Then("the slipway icon shows the hulls building", (s) => {
  expect(has(harbourMarks(s.zoom, s.harbour), "slipway icon").hulls).toBe(2);
});

Then("each fleet shows its admiral's banner and a course line in days", (s) => {
  const marks = fleetMarks(s.zoom, s.fleet);
  expect(has(marks, "admiral's banner").admiral).toBe("Pedro de Meneses");
  expect(has(marks, "course line").days).toBe(6);
});

Given("a preacher is walking and a faith wave is active nearby", (s) => {
  s.faith = { houses: ["church", "mosque"], preachers: 1, waves: ["Edirne"] };
});

Then("the church shows a spire sprite and the mosque a dome sprite in the town", (s) => {
  expect(s.over).toBe("a province with a church and a mosque");
  const sprites = faithMarks(s.zoom, s.faith).filter((m) => m.draw === "sprite");
  expect(sprites.map((m) => [m.house, m.sprite, m.in])).toEqual([
    ["church", "spire", "town"],
    ["mosque", "dome", "town"],
  ]);
});

Then("the preacher shows as a walking figure", (s) => {
  expect(has(faithMarks(s.zoom, s.faith), "walking figure").who).toBe("preacher");
});

Then("the wave shows as a soft tint spreading from its source", (s) => {
  expect(has(faithMarks(s.zoom, s.faith), "soft tint").spreadingFrom).toBe("Edirne");
});

Given("an envoy of {string} is on the road and {string} holds a war aim against the {string}", (s, _a: string, _b: string, target: string) => {
  s.diplomacy = { envoys: 1, warAimsAgainst: [target] };
});

Then("only the diplomacy colours show", (s) => {
  expect(s.view.lens).toBe("Diplomacy");
  expect(diplomacyMarks(s.zoom, s.diplomacy)).toEqual([]);
});

Then("the envoy rides with a dotted route and the Ottomans carry the war-aim icon", (s) => {
  expect(diplomacyMarks(s.zoom, s.diplomacy)).toEqual([
    { draw: "rider", route: "dotted" },
    { draw: "war-aim icon", on: "Ottomans" },
  ]);
});

Given("a galley trader with half its purse is sailing", (s) => {
  s.trader = { medium: "sea", purseShare: 0.5 };
});

Then("the trader shows as a ship icon with a purse bar at half", (s) => {
  expect(traderMarks(s.zoom, s.trader)).toEqual([{ draw: "icon", icon: "ship", purseBar: 0.5 }]);
});

Then("{string} shows a coin for its market", (s, name: string) => {
  expect(s.over).toBe(name);
  has(provinceMarks(s.zoom, { name, owner: "Venice", market: true }), "coin");
});

Given("the country {string} has a colonial range of {int} zones", (s, _country: string, zones: number) => {
  s.colonial = { rangeZones: zones, colonisable: ["Gran Canaria", "Tenerife"] };
});

Then("the colonial range shows as a faint line on the sea", (s) => {
  expect(has(colonialMarks(s.zoom, s.colonial), "faint line")).toMatchObject({ on: "sea", zones: 20 });
});

Then("provinces Castile can colonise show a pale flag", (s) => {
  expect(colonialMarks(s.zoom, s.colonial).filter((m) => m.draw === "pale flag").map((m) => m.province)).toEqual(["Gran Canaria", "Tenerife"]);
});

const TROYES_ROW = {
  tiles: [{ building: "market", busy: true }, { building: "farm", burned: true }, { building: "harbour" }, { building: "castle" }],
  harbourShips: 2,
  roadCaravans: 1,
};

Then("each tile shows its building as a sprite", (s) => {
  const sprites = tileRowMarks(s.zoom, TROYES_ROW).filter((m) => m.draw === "building sprite");
  expect(sprites.map((m) => m.building)).toEqual(["market", "harbour", "castle"]);
});

Then("the burned field is in ash", (s) => {
  expect(has(tileRowMarks(s.zoom, TROYES_ROW), "ash").tile).toBe(1);
});

Then("workers move on busy tiles, ships sit in the harbour and caravans walk the road", (s) => {
  const marks = tileRowMarks(s.zoom, TROYES_ROW);
  expect(has(marks, "workers moving").tile).toBe(0);
  expect(marks.filter((m) => m.draw === "ship in the harbour")).toHaveLength(2);
  has(marks, "caravan on the road");
});

Given("an army of {int},{int} foot and {int},{int} horse with wagons is marching on the road", (s, f1: number, f2: number, h1: number, h2: number) => {
  const foot = f1 * 1000 + f2;
  const horse = h1 * 1000 + h2;
  s.army = { owner: "France", men: foot + horse, foot, horse, wagons: true, marching: true };
});

Then("the army shows as columns of foot, horse and wagons in proportion to its men", (s) => {
  const cols = armyMarks(s.zoom, s.army);
  expect(cols.map((c) => c.arm)).toEqual(["foot", "horse", "wagons"]);
  expect(cols[0]!.share).toBeCloseTo(10 / 12, 5);
  expect(cols[1]!.share).toBeCloseTo(2 / 12, 5);
});

Given("a battle is being watched there", (s) => {
  s.battle = true;
});

Given("its castle is besieged with one breach", (s) => {
  s.siege = { breaches: 1 };
});

Then("the battle plays on the province's tile row", (s) => {
  expect(battleMarks(s.zoom)).toEqual([{ draw: "battle on the tile row" }]);
});

Then("the castle tile shows its walls with one breach", (s) => {
  expect(siegeMarks(s.zoom, s.siege.breaches)).toEqual([{ draw: "castle tile", breaches: 1 }]);
});

// ---------------------------------------------------------------------------
// Decided rules (D-VIEW-1, 2, 3, 5, 7, 9)

Given("the lens picker", (s) => {
  s.phone = false;
});
Given("the lens picker on a phone", (s) => {
  s.phone = true;
});
When("the lenses are listed", (s) => {
  s.picker = lensPicker();
});
Then("the lens {string} is offered, from the context {string}", (s, id: string, context: string) => {
  expect(s.picker.lenses).toContain(id);
  if (context !== "world-map" && !["People", "Wealth", "Walls"].includes(id)) expect(lens(id).context).toBe(context);
});
Then("{int} lenses are offered", (s, n: number) => {
  expect(s.picker.lenses).toHaveLength(n);
  expect(new Set(s.picker.lenses).size).toBe(n);
});
Then("the picker scrolls", (s) => {
  expect(s.phone && s.picker.scrolls).toBe(true);
});
Then("the lenses {string} and {string} are not offered", (s, a: string, b: string) => {
  expect(s.picker.lenses).not.toContain(a);
  expect(s.picker.lenses).not.toContain(b);
});

Given(/^the switch "Parchment over unknown lands" is (on|off)$/, (s, sw: string) => {
  s.view = { ...newMapView(), parchment: sw === "on" };
  s.charted = new Set(["Castile", "Canaries"]);
  s.chartedBefore = new Set(s.charted);
});
Then("uncharted places lie under the parchment", (s) => {
  expect(underParchment("Sargasso Sea", s.charted, s.view.parchment)).toBe(true);
});
Then("the whole world is shown", (s) => {
  expect(underParchment("Sargasso Sea", s.charted, s.view.parchment)).toBe(false);
});
Then("nothing in the simulation changes", (s) => {
  expect([...s.charted]).toEqual([...s.chartedBefore]);
});
Given("the Sargasso Sea is uncharted for {string}", (s, _c: string) => {
  expect(s.charted.has("Sargasso Sea")).toBe(false);
});
Then("the Sargasso Sea is shown", (s) => {
  expect(underParchment("Sargasso Sea", s.charted, s.view.parchment)).toBe(false);
});
Then("the Sargasso Sea is still uncharted for {string}", (s, _c: string) => {
  expect(s.charted.has("Sargasso Sea")).toBe(false);
});

Given("a phone with a device pixel ratio of {int}", (s, dpr: number) => {
  s.dpr = dpr;
});
Given(/^Sharpness is (Battery|Balanced|Native)$/, (s, sh: string) => {
  s.sharpness = sh;
});
Then("the map canvas shades 1 pixel per CSS pixel", (s) => {
  s.ratios = canvasRatios(s.dpr, s.sharpness);
  expect(s.ratios.map).toBe(1);
});
Then("the overlay canvas draws {int} pixels per CSS pixel", (s, n: number) => {
  expect(canvasRatios(s.dpr, s.sharpness).overlay).toBe(n);
});

Given("Battery saver is on", (s) => {
  s.knobs = withBatterySaver(PHONE_DEFAULTS);
});
When("the map is shown and a turn is processed", (s) => {
  s.drawn = true;
});
Then("the frame rate is capped at 30", (s) => expect(s.knobs["Frame rate cap"]).toBe(30));
Then("Sharpness is Battery and animations are reduced", (s) => {
  expect(s.knobs.Sharpness).toBe("Battery");
  expect(s.knobs.Animations).toBe("Reduced");
});
Then("the map redraws only on change", (s) => expect(s.knobs.redraw).toBe("on change"));
Then("the AI turn has the same work-step budget as with Battery saver off", (s) => {
  expect(aiWorkSteps(s.knobs)).toBe(aiWorkSteps(PHONE_DEFAULTS));
});

Given("the system {string} gives no zoom table, with the lens {string}", (s, system: string, l: string) => {
  s.system = system;
  s.systemLens = l;
});
When("its map statement is built", (s) => {
  s.statement = defaultZoomStatement(s.system, s.systemLens);
});
Then("it shows the lens {string} at World, Region and Local zoom", (s, l: string) => {
  for (const z of ["World", "Region", "Local"] as const) expect(s.statement[z]).toContain(`lens ${l}`);
});
Then("its card shows at Local zoom only", (s) => {
  expect(s.statement.card).toEqual(["Local"]);
  expect(s.statement.World).not.toContain("card");
});

Given(/^the camera zoom is ([\d.]+)$/, (s, z: string) => {
  s.camera = Number(z);
});
When("the zoom level is worked out", (s) => {
  s.level = zoomForCamera(s.camera);
});
Then(/^the zoom level is (World|Region|Local)$/, (s, z: string) => expect(s.level).toBe(z));
