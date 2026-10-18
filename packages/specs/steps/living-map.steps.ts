// The living map close in (map-presentation, VIEW-100..VIEW-132): features/living-map.feature.
// "Map detail is {string}" (s.detail) and "the camera zoom is N" (s.camera) come from map-presentation.steps.ts.
import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { loadMapTiles } from "@ph/engine/node";
import { createWorld, tradePaths, tradeSeen } from "@ph/engine";
import {
  animatedFigures, bandArtPixels, bandFade, detailBands, figureArms, figureCount, figuresAnimate, figuresLeft, formation, hamletCount, hamletSpots,
  hullCount, hullsInPort, kindOfByte, linksOfByte, livingBand, neighbours4, pieceLabels, pieceUnit, roadGrade, roadLines, roadPath, settlementBytes,
  tapBox, tapTarget, tileDistance, townCells, townFootprint, townGrowthOrder, townPeopleThousands, townPlan, townsToRefresh, traderMovers, worksSpot, LIVING_MAP,
  type LivingBand, type MapDetail, type TownState,
} from "@ph/engine/domain/map-presentation";
import { steps } from "../src/registry.ts";

const { Given, When, Then } = steps("map-presentation");

let map: { rules: ReturnType<typeof loadDefaultRuleset>; grid: ReturnType<typeof loadMapTiles> } | null = null;
const world = () => {
  if (!map) {
    const rules = loadDefaultRuleset();
    map = { rules, grid: loadMapTiles(rules) };
  }
  return map;
};
const province = (name: string): number => {
  const i = world().rules.provinces.findIndex((p) => p.name === name);
  if (i < 0) throw new Error(`no province ${name}`);
  return i;
};
const landNeighbours = (p: number): number[] => {
  const { rules, grid } = world();
  return rules.provinces[p]!.neighbors.map((id) => rules.provinces.findIndex((q) => q.id === id)).filter((n) => n >= 0 && grid.centre[n]! >= 0);
};
const detail = (s: Record<string, any>): MapDetail => s.detail ?? "High";
const num = (t: string): number => Number(t.replace(/,/g, ""));

// Bands
Then("the close-in band is {string}", (s, band: string) => expect(livingBand(s.camera, detail(s))).toBe(band));
Then("the icons are drawn at {int} % and the living pieces at {int} %", (s, icons: number, living: number) => {
  const f = bandFade(s.camera, detail(s));
  expect(Math.round(f.icons * 100)).toBe(icons);
  expect(Math.round(f.living * 100)).toBe(living);
});
Then("each art pixel of a piece is {int} CSS pixels", (s, u: number) => expect(pieceUnit(s.camera, detail(s))).toBe(u));
Then("each map pixel is {int} art pixels across", (s, n: number) => expect(bandArtPixels(livingBand(s.camera, detail(s)))).toBe(n));
Then("the closest zoom is {int}", (s, z: number) => expect(detailBands(detail(s)).closestZoom).toBe(z));

// Towns
Given("the town people number {float} thousand", (s, k: number) => void (s.town = k));
Then("its town covers {int} map pixels", (s, cells: number) => expect(townCells(s.town)).toBe(cells));
Given(/^the people number (.+ thousand craftsmen.+)$/, (s, text: string) => {
  const classes: Record<string, number> = {};
  for (const m of text.matchAll(/([\d.]+) thousand ([a-z ]+?)(?=,| and |$)/g)) classes[m[2]!.trim()] = Number(m[1]);
  s.classes = classes;
});
Then("it has {float} thousand town people", (s, k: number) => expect(townPeopleThousands(s.classes)).toBe(k));

Given("the town of {string} covers {int} map pixels", (s, name: string, cells: number) => {
  s.province = province(name);
  s.order = townGrowthOrder(world().grid, s.province);
  s.footprint = townFootprint(world().grid, s.province, cells, s.order);
  s.state = {} as TownState;
});
When("the town grows to {int} map pixels", (s, cells: number) => {
  s.before = s.footprint;
  s.footprint = townFootprint(world().grid, s.province, cells, s.order);
});
Then("its first {int} pixels are the same as before", (s, n: number) => expect(s.footprint.tiles.slice(0, n)).toEqual(s.before.tiles));
Then("the town starts at the province's land pixel nearest its centre point", (s) => expect(s.footprint.seed).toBe(world().grid.centre[s.province]));
Then("the town starts on land of {string}", (s, name: string) => expect(world().grid.province[s.footprint.seed]).toBe(province(name) + 1));
Then("every town pixel is land of {string} within {int} pixels of the seed", (s, name: string, r: number) => {
  const { grid } = world();
  for (const t of s.footprint.tiles) {
    expect(grid.province[t]).toBe(province(name) + 1);
    expect(tileDistance(grid, s.footprint.seed, t)).toBeLessThanOrEqual(r);
  }
});
Then("every town pixel touches the town pixels before it", (s) => {
  const seen = new Set<number>([s.footprint.seed]);
  for (const t of s.footprint.tiles.slice(1)) {
    expect(neighbours4(world().grid, t).some((n) => seen.has(n))).toBe(true);
    seen.add(t);
  }
});
Then("{int} of its pixels are core and {int} are outskirts", (s, core: number, out: number) => {
  expect(s.footprint.core.length).toBe(core);
  expect(s.footprint.outskirts.length).toBe(out);
});

Given("province {int} had {int} town pixels and province {int} had {int}", (s, a: number, ca: number, b: number, cb: number) => {
  s.cellsBefore = new Map([[a, ca], [b, cb]]);
});
When(/^a turn in (the same|a new) month gives province (\d+) (\w+) town pixels$/, (s, when: string, p: string, n: string) => {
  const words: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8 };
  const after = new Map(s.cellsBefore as Map<number, number>);
  after.set(Number(p), words[n] ?? Number(n));
  s.refresh = townsToRefresh({ lastMonth: "1444-11", month: when === "the same" ? "1444-11" : "1444-12", before: s.cellsBefore, after });
});
Then("no footprint is worked out again", (s) => expect(s.refresh).toEqual([]));
Then("only the footprint of province {int} is worked out again", (s, p: number) => expect(s.refresh).toEqual([p]));

Given(/^"([^"]+)" is a realm's capital with a castle, a market and a drill yard on the coast$/, (s) => {
  s.state = { capital: true, castleStep: 2, market: true, drillYard: true, coastal: true };
});
Given(/^"([^"]+)" is a realm's capital$/, (s) => void (s.state = { ...s.state, capital: true }));
Given("{string} has castle step {int}", (s, _name: string, step: number) => void (s.state = { ...s.state, castleStep: step }));
const plan = (s: Record<string, any>) => townPlan(world().grid, s.footprint, s.state ?? {});
Then("its core holds a keep, a market square, a house of worship and a drill yard", (s) => {
  const p = plan(s);
  const core = new Set(s.footprint.core);
  const kinds = [...p.special].filter(([t]) => core.has(t)).map(([, k]) => k);
  expect(kinds).toEqual(expect.arrayContaining(["keep", "market", "worship", "drill yard"]));
});
Then("the keep is the first core pixel that is not the docks", (s) => {
  const p = plan(s);
  expect(p.special.get(s.footprint.core.find((t: number) => p.special.get(t) !== "docks"))).toBe("keep");
});
Then("its only special cell is a house of worship", (s) => expect([...plan(s).special.values()]).toEqual(["worship"]));
Then("its walls are {string}", (s, walls: string) => expect(plan(s).walls).toBe(walls));

// Hamlets, works and roads
Given("the country people number {int} thousand", (s, k: number) => void (s.rural = k));
Then("it has {int} hamlets", (s, n: number) => expect(hamletCount(s.rural)).toBe(n));
When("{string} places {int} hamlets", (s, name: string, n: number) => {
  s.hamlets = hamletSpots(world().grid, province(name), n, s.footprint.tiles);
});
Then("every hamlet is at least {int} pixels from the town and from the other hamlets", (s, d: number) => {
  expect(s.hamlets.length).toBeGreaterThan(0);
  for (const h of s.hamlets) for (const t of [...s.footprint.tiles, ...s.hamlets.filter((x: number) => x !== h)]) expect(tileDistance(world().grid, h, t)).toBeGreaterThanOrEqual(d);
});
When("{string} places a mine", (s, name: string) => void (s.mine = worksSpot(world().grid, province(name), "mine", new Set())));
Then("the mine stands on one pixel of {string}", (s, name: string) => expect(world().grid.province[s.mine]).toBe(province(name) + 1));
Given("one town has road step {int} and its neighbour road step {int}", (s, a: number, b: number) => void (s.grade = roadGrade(a, b)));
Then("the road between them is drawn as a {string}", (s, grade: string) => expect(s.grade).toBe(grade));
Given(/^roads are laid from "([^"]+)" to the towns of its neighbours$/, (s, name: string) => {
  const { grid } = world();
  const p = province(name);
  const towns = [p, ...landNeighbours(p)].map((q) => ({ province: q, seed: grid.centre[q]!, roadStep: 1 }));
  s.roads = roadLines(grid, towns, (q) => (q === p ? landNeighbours(p) : []));
});
Then("every road runs over land from town to town in steps north, east, south or west", (s) => {
  const { grid } = world();
  expect(s.roads.length).toBeGreaterThan(0);
  for (const r of s.roads) {
    expect([r.path[0], r.path.at(-1)]).toEqual([r.from, r.to]);
    for (const t of r.path) expect(grid.province[t]).toBeGreaterThan(0);
    for (let i = 1; i < r.path.length; i++) expect(neighbours4(grid, r.path[i - 1])).toContain(r.path[i]);
  }
});
When("a road is laid from {string} to {string}", (s, a: string, b: string) => {
  const { grid } = world();
  s.path = roadPath(grid, grid.centre[province(a)]!, grid.centre[province(b)]!);
});
Then("no road is found", (s) => expect(s.path).toBeNull());
When("the settlement bytes are packed", (s) => void (s.bytes = settlementBytes(world().grid, [{ plan: plan(s) }], s.roads)));
Then("the seed's byte is a {string} with road links", (s, kind: string) => {
  expect(kindOfByte(s.bytes[s.footprint.seed])).toBe(kind);
  expect(linksOfByte(s.bytes[s.footprint.seed])).toBeGreaterThan(0);
});
Then("the last town pixel's byte is {string}", (s, kind: string) => expect(kindOfByte(s.bytes[s.footprint.tiles.at(-1)])).toBe(kind));

// Figures, hulls and movers
Given(/^an army of ([\d,]+) men$/, (s, men: string) => void (s.army = { men: num(men), foot: num(men), state: "standing" }));
Given(/^an army of ([\d,]+) men standing$/, (s, men: string) => void (s.army = { men: num(men), foot: num(men), state: "standing" }));
Given(/^an army of ([\d,]+) men marching east$/, (s, men: string) => void (s.army = { men: num(men), foot: num(men), state: "marching", facing: [1, 0] }));
Given(/^a rebel band of ([\d,]+) men standing$/, (s, men: string) => void (s.army = { men: num(men), foot: num(men), state: "standing", rebel: true }));
When("it is drawn in the {string} band", (s, band: string) => {
  s.band = band;
  if (s.army) s.figures = formation({ ...s.army, band });
});
Then("it is {int} figures", (s, n: number) => expect(figureCount(s.army.men, s.band)).toBe(n));
Given("an army of {int} foot, {int} horse and {int} guns with wagons", (s, foot: number, horse: number, guns: number) => {
  s.arms = { foot, horse, guns, wagons: true };
});
When("it is drawn as {int} figures", (s, n: number) => void (s.split = figureArms(n, s.arms)));
Then("it is {int} foot, {int} horse, {int} guns and {int} wagons figures", (s, f: number, h: number, g: number, w: number) => {
  const count = (a: string) => s.split.filter((x: string) => x === a).length;
  expect([count("foot"), count("horse"), count("guns"), count("wagons")]).toEqual([f, h, g, w]);
});
Then("its figures stand in {int} files", (s, n: number) => expect(new Set(s.figures.map((f: { x: number }) => f.x)).size).toBe(n));
Then("its leading figure carries the banner", (s) => expect(s.figures[0].banner).toBe(true));
Then("the others follow behind it in one line", (s) => {
  for (let i = 1; i < s.figures.length; i++) {
    expect(s.figures[i].y).toBe(0);
    expect(s.figures[i].x).toBeLessThan(s.figures[i - 1].x);
  }
});
Then("none of its figures carries a banner", (s) => expect(s.figures.some((f: { banner?: boolean }) => f.banner)).toBe(false));
Given("a side began a battle with {int} men drawn in the {string} band", (s, men: number, band: string) => void (s.side = { men, band }));
When("it has {int} men left", (s, men: number) => void (s.left = figuresLeft(s.side.men, men, s.side.band)));
Then("it shows {int} figures", (s, n: number) => expect(s.left).toBe(n));
Given("a fleet of {int} ships", (s, ships: number) => void (s.ships = ships));
Then("it is {int} hulls", (s, n: number) => expect(hullCount(s.ships, s.band)).toBe(n));
Given("a fleet of {int} hulls is in a harbour with {int} berths", (s, hulls: number, berths: number) => void (s.port = hullsInPort(hulls, berths)));
Then("{int} hulls lie at the berths and {int} wait off the docks", (s, a: number, w: number) => expect(s.port).toEqual({ atBerth: a, waiting: w }));
Given("a river trade path with {int} traders", (s, traders: number) => {
  s.path = { id: 7, medium: "river" as const, traders };
  s.movers = traderMovers(s.path, 100);
});
Then("it carries {int} barges spaced evenly along it", (s, n: number) => {
  expect(s.movers.length).toBe(n);
  expect(s.movers.every((m: { kind: string }) => m.kind === "barge")).toBe(true);
  for (let i = 1; i < n; i++) expect((s.movers[i].at - s.movers[i - 1].at + 1) % 1).toBeCloseTo(1 / n, 6);
});
Then("a moment later they have barely moved", (s) => {
  const later = traderMovers(s.path, 100.01);
  later.forEach((m, i) => expect(Math.abs(m.at - s.movers[i].at)).toBeLessThan(0.001));
});

Given("a new game as {string}", (s, nation: string) => {
  const { rules, grid } = world();
  s.game = createWorld(rules, 1, grid);
  s.nation = s.game.nationIndex.get(nation.toLowerCase());
  expect(s.nation).toBeDefined();
});
When(/^the trade paths \w+ may see are read$/, (s) => void (s.paths = tradePaths(s.game, s.nation, LIVING_MAP.traders.maxPaths)));
Then("each is a loop of at least {int} provinces by land, river or sea with at least {int} trader", (s, stops: number, traders: number) => {
  expect(s.paths.length).toBeGreaterThan(0);
  for (const p of s.paths) {
    expect(p.path.length).toBeGreaterThanOrEqual(stops);
    expect(["land", "river", "sea"]).toContain(p.medium);
    expect(p.traders).toBeGreaterThanOrEqual(traders);
  }
});
Then(/^each enters a province whose trade \w+ sees$/, (s) => {
  const seen = tradeSeen(s.game, s.nation);
  for (const p of s.paths) expect(p.path.some((q: number) => seen[q])).toBe(true);
});
Then(/^they come busiest first, at most (\d+), and one shows on each \w+'s trader with a route$/, (s, max: string) => {
  expect(s.paths.length).toBeLessThanOrEqual(Number(max));
  for (let i = 1; i < s.paths.length; i++) expect(s.paths[i].traders).toBeLessThanOrEqual(s.paths[i - 1].traders);
  const routed = s.game.traders.filter((t: { owner: number; stops: number[] }) => t.owner === s.nation && t.stops.length >= 2);
  const mine = s.paths.filter((p: { mine: number }) => p.mine >= 0);
  expect(mine.length).toBeGreaterThan(0);
  expect(mine.reduce((n: number, p: { traders: number }) => n + p.traders, 0)).toBeLessThanOrEqual(routed.length);
});

// Taps, Markers, animation and budget
Given(/^an army stands in "([^"]+)" in the living band$/, (s, name: string) => {
  s.targets = [
    { id: name, kind: "province", x: 0, y: 0, w: 200, h: 200 },
    { id: "army", kind: "piece", x: 10, y: 10, ...tapBox(10, 6, 2) },
  ];
});
When("the player taps just beside the army's figures", (s) => void (s.opened = tapTarget({ x: 30, y: 12 }, s.targets)));
Then("the army's card opens", (s) => expect(s.opened?.id).toBe("army"));
When("the player taps the far side of {string}", (s) => void (s.opened = tapTarget({ x: -80, y: -80 }, s.targets)));
Then("the province card of {string} opens", (s, name: string) => expect(s.opened).toMatchObject({ id: name, kind: "province" }));
Given("a piece is {int} by {int} art pixels at {int} CSS pixels each", (s, w: number, h: number, u: number) => void (s.box = tapBox(w, h, u)));
Then("its tap box is {int} by {int} points", (s, w: number, h: number) => expect(s.box).toEqual({ w, h }));
Given("the camera is in the {string} band", (s, band: string) => void (s.band = band as LivingBand));
Given(/^Markers is (on|off) and the piece is (selected|not selected)$/, (s, markers: string, selected: string) => {
  s.labels = pieceLabels(s.band, { markers: markers === "on", selected: selected === "selected" });
});
Then(/^its plate is (shown|hidden) and its name is (shown|hidden)$/, (s, plate: string, name: string) => {
  expect(s.labels).toEqual({ plate: plate === "shown", name: name === "shown" });
});
Then(/^a marching army (moves|stays still) and a standing army (moves|stays still)$/, (s, m: string, st: string) => {
  expect(figuresAnimate(s.animations, "marching")).toBe(m === "moves");
  expect(figuresAnimate(s.animations, "standing")).toBe(st === "moves");
});
Given("pieces of {int} figures near the centre, {int} figures further out and {int} figures furthest", (s, a: number, b: number, c: number) => {
  s.pieces = [{ distance: 1, n: a }, { distance: 5, n: b }, { distance: 9, n: c }];
});
When("the overlay is drawn", (s) => void (s.moving = animatedFigures(s.pieces as { distance: number; n: number }[], (p) => p.n)));
Then("the {int} nearest and the {int} furthest figures move and the other {int} stand still", (s, a: number, c: number, b: number) => {
  const n = (k: number) => [...s.moving].some((p: { n: number }) => p.n === k);
  expect([n(a), n(c), n(b)]).toEqual([true, true, false]);
});
