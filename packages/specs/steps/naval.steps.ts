import { expect } from "vitest";
import * as N from "@ph/engine/domain/naval";
import { emptyProvinceChoices, release, commission as commissionOfficial } from "@ph/engine/domain/recruiting";
import { type MoveWorld, type Place, createMover, playDays } from "@ph/engine/domain/troop-movement";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When: WhenRaw, Then } = steps("naval");

/** Every When marks the scenario as acted, so a "has N sailors in port" line sets before it and checks after. */
const When = (pattern: string | RegExp, fn: (s: Scenario, ...args: any[]) => void) =>
  WhenRaw(pattern, (s, ...args) => {
    s.acted = true;
    return fn(s, ...args);
  });

const re = (src: string): RegExp => new RegExp(`^${src}$`);
const num = (t: string | number): number => Number(String(t).replace(/,/g, ""));
const near = (a: number, b: number, tol = 1e-9) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol);

// ---------------------------------------------------------------- realms, ports, ships

/** Inventions a country knows; unless a scenario says otherwise, every S-bough step in the ship table. */
const ALL = ["S1", "S3", "S4", "S5", "S6", "S7", "S8", "S9", "S13"];
const knownOf = (s: Scenario, c: string): string[] => ((s.known ??= {})[c] ??= [...ALL]);
const learn = (s: Scenario, c: string, id: string) => {
  const k = knownOf(s, c);
  if (!k.includes(id)) k.push(id);
};
const forget = (s: Scenario, c: string, id: string) => {
  const k = knownOf(s, c).filter((x) => x !== id);
  s.known[c] = k;
};
function buyer(s: Scenario, c: string): N.Buyer {
  return ((s.buyers ??= {})[c] ??= { name: c, known: knownOf(s, c), gold: 10000, timber: 1000, explorationUnlock: s.noExploration?.[c] ? false : true });
}

/** A port by name: harbour 2, no shipyard, owned by Portugal unless set. */
function port(s: Scenario, name: string, owner = "Portugal"): N.Port {
  return ((s.ports ??= {})[name] ??= N.newPort(name, owner, 2, 0));
}

let shipIds = 0;
const ship = (type: string, more: Partial<N.Ship> = {}): N.Ship => N.newShip(`${type}-${++shipIds}`, type, more.owner ?? "Portugal", more.crew ?? N.shipRow(type).crew, more);

// ---------------------------------------------------------------- the sea, as a small graph

type Spec = Omit<Place, "id">;
function sea(places: Record<string, Spec>, edges: string[]): MoveWorld {
  const neighbours: Record<string, string[]> = {};
  for (const id of Object.keys(places)) neighbours[id] = [];
  for (const e of edges) {
    const [a, b] = e.split("~") as [string, string];
    neighbours[a]!.push(b);
    neighbours[b]!.push(a);
  }
  return {
    date: { year: 1444, month: 8 },
    places: Object.fromEntries(Object.entries(places).map(([id, p]) => [id, { id, ...p }])),
    neighbours,
    relations: { wars: [], alliances: [], passage: [], subjects: [] },
    movers: [],
  };
}
const coast = (owner: string, harbour = true): Spec => ({ terrain: "farmland", owner, harbour });
const zone = (ocean = false): Spec => ({ terrain: ocean ? "ocean" : "sea" });

/** Puts a fleet on the map and in the naval state. */
function launch(s: Scenario, f: N.Fleet, place: string): N.Fleet {
  s.sea ??= { fleets: {}, known: {} } satisfies N.Sea;
  s.sea.fleets[f.id] = f;
  s.sea.known[f.owner] = knownOf(s, f.owner);
  s.w.movers.push(N.fleetMover(f, place));
  s.fleet = f;
  return f;
}

/** Lagos, its bay, nine ocean zones down the African coast, and Arguin, a canoe landing. */
function lagosToArguin(): MoveWorld {
  const places: Record<string, Spec> = { Lagos: coast("Portugal"), "Lagos Bay": zone(), Arguin: coast("sanhaja_zenaga", false) };
  const edges = ["Lagos~Lagos Bay"];
  let prev = "Lagos Bay";
  for (let i = 1; i <= 9; i++) {
    places[`O${i}`] = zone(true);
    edges.push(`${prev}~O${i}`);
    prev = `O${i}`;
  }
  edges.push("O9~Arguin");
  return sea(places, edges);
}

/** A chain from Lagos into the ocean: the bay, then ocean zones 1..n zones from a coast. */
function oceanChain(n: number): { w: MoveWorld; distance: Record<string, number> } {
  const places: Record<string, Spec> = { Lagos: coast("Portugal"), Bay: zone() };
  const edges = ["Lagos~Bay"];
  const distance: Record<string, number> = {};
  let prev = "Bay";
  for (let i = 1; i <= n; i++) {
    places[`O${i}`] = zone(true);
    distance[`O${i}`] = i;
    edges.push(`${prev}~O${i}`);
    prev = `O${i}`;
  }
  return { w: sea(places, edges), distance };
}

function plan(s: Scenario, to: string): void {
  s.plan = N.planVoyage(s.w, s.sea, s.fleet, to);
  s.routeOk = s.plan.end === "arrives";
}

// ---------------------------------------------------------------- generic outcomes

Then(re("the order is (allowed|refused)"), (s, r: string) => {
  expect(s.result.ok).toBe(r === "allowed");
});
Then(re("the route is (allowed|refused)"), (s, r: string) => {
  expect(s.routeOk).toBe(r === "allowed");
});

// ---------------------------------------------------------------- knowing inventions

Given(re('the country "(\\w+)" (knows|does not know) (S\\d+) "[^"]+"'), (s, c: string, k: string, id: string) => {
  if (k === "knows") learn(s, c, id);
  else forget(s, c, id);
});
Given(re('the country "(\\w+)" (knows|does not know) the invention "(S\\d+) [^"]+"'), (s, c: string, k: string, id: string) => {
  if (k === "knows") learn(s, c, id);
  else forget(s, c, id);
});
Given(re('the country "(\\w+)" knows (neither S1 nor S5|S1 only|S1 and S5|S1 and S4)'), (s, c: string, what: string) => {
  (s.known ??= {})[c] = { "neither S1 nor S5": [], "S1 only": ["S1"], "S1 and S5": ["S1", "S5"], "S1 and S4": ["S1", "S4"] }[what];
});
Given(re('a country (knows|does not know) S3 "Outrigger voyaging"'), (s, k: string) => {
  (s.known ??= {})["X"] = k === "knows" ? ["S3"] : [];
  s.country = "X";
});

// ---------------------------------------------------------------- ports (NAVY-001..021)

Given(re('the province "(\\w+)" has a harbour at step (\\d) on a shore tile'), (s, p: string, step: string) => {
  (s.ports ??= {})[p] = N.newPort(p, "Portugal", num(step));
});
Given(re('the province "(\\w+)" is coastal and has no harbour'), (s, p: string) => {
  (s.ports ??= {})[p] = N.newPort(p, "Portugal", 0);
});
Given(re('the province "(\\w+)" has seafolk'), (s, p: string) => {
  port(s, p).seafolk = 300;
});
When(re('the game checks what the province "(\\w+)" allows at sea'), (s, p: string) => {
  s.uses = N.seaUses(port(s, p));
});
Then(re('the province "(\\w+)" is a port'), (s, p: string) => {
  expect(N.isPort(port(s, p))).toBe(true);
  if (s.uses) expect(s.uses.kind).toBe("port");
});
Then(re('sailors can be mustered in the province "(\\w+)"'), (s) => {
  expect(s.uses.muster).toBe(true);
});
Then(re('ships can be bought and berthed in the province "(\\w+)"'), (s) => {
  expect(s.uses.buyShips && s.uses.berth).toBe(true);
});
Then(re('the province "(\\w+)" is a plain shore'), (s) => {
  expect(s.uses.kind).toBe("plain shore");
});
Then(re('no sailors can be mustered in the province "(\\w+)"'), (s) => {
  expect(s.uses.muster).toBe(false);
});
Then(re('no ship can be bought, berthed or crewed in the province "(\\w+)" except small craft'), (s) => {
  expect([s.uses.buyShips, s.uses.berth, s.uses.crew, s.uses.smallCraft]).toEqual([false, false, false, true]);
});
Then("its seafolk fish from the beach", (s) => {
  expect(s.uses.fishFromBeach).toBe(true);
});
Then(re('an army can land in the province "(\\w+)"'), (s) => {
  expect(s.uses.armyLands).toBe(true);
});

Given(re("a port has a harbour at step (\\d)"), (s, step: string) => {
  s.port = N.newPort("P", "Portugal", num(step));
});
Given(re("a port has a shipyard at step (\\d)"), (s, step: string) => {
  s.port = N.newPort("P", "Portugal", 2, num(step));
});
When("the game counts the port's berths", (s) => {
  s.berths = N.berths(s.port);
});
Then(re("the port has (\\d+) berths"), (s, n: string) => {
  expect(N.berths(s.port)).toBe(num(n));
});
When("the game counts the port's slipways", (s) => {
  s.slipways = N.slipways(s.port);
});
Then(re("the port has (\\d+) slipways"), (s, n: string) => {
  expect(s.slipways).toBe(num(n));
});
When("the game checks what the port allows", (s) => {
  s.allows = N.harbourAllows(s.port.harbourStep);
});
const allowed = (s: Scenario, what: string[]) => what.every((w) => s.allows.includes(w));
Then(re("mustering, buying and resupply are (allowed|not allowed)"), (s, a: string) => {
  expect(allowed(s, ["muster", "buy", "resupply"])).toBe(a === "allowed");
});
Then(re("refit and hiring foreign crews are (allowed|not allowed)"), (s, a: string) => {
  expect(allowed(s, ["refit", "foreign crews"])).toBe(a === "allowed");
});
Then(re("coaling for steamships is (allowed|not allowed)"), (s, a: string) => {
  expect(allowed(s, ["coaling"])).toBe(a === "allowed");
});

When(re('the country orders a "([^"]+)" there on a slipway'), (s, type: string) => {
  s.port.sailorsInPort = N.shipRow(type).crew;
  s.result = N.orderShip(s.port, type, buyer(s, "Portugal"));
});

Given("a port has 10 berths and 0 ships berthed", (s) => {
  s.port = N.newPort("P", "Portugal", 1);
  expect(N.freeBerths(s.port)).toBe(10);
});
When(re('an? "([^"]+)" is berthed in the port'), (s, type: string) => {
  N.putIn(s.port, ship(type, { state: "in port" }));
});
When(re('an? "([^"]+)" is drawn up on the beach in the port'), (s, type: string) => {
  const t = type === "small craft" ? "small craft" : type;
  s.ship = ship(t, { state: "in port" });
  expect(N.putIn(s.port, s.ship, true)).toBe("drawn up");
});
Then(re("the port has (\\d+) free berths"), (s, n: string) => {
  expect(N.freeBerths(s.port)).toBe(num(n));
});
Then(re('the "([^"]+)" rots at the anchorage rate'), (s) => {
  expect(N.rotMonths(s.ship)).toBe(N.navalConfig.rotMonths.anchorage);
  expect(N.anchorageRules("drawn up").rotsAs).toBe("at sea");
});

Given(re('the towns "Genoa", "Savona", "La Spezia" and "Finale" fall in the province "Genova"'), (s) => {
  s.towns = N.towns1444().filter((t) => ["Genoa", "Savona", "La Spezia", "Finale"].includes(t.name));
  expect(s.towns).toHaveLength(4);
  expect(new Set(s.towns.map((t: N.Town) => t.province_name))).toEqual(new Set(["Genova"]));
});
Given('the town "Genoa" is a great port with a shipyard', (s) => {
  const g = (s.towns as N.Town[]).find((t) => t.name === "Genoa")!;
  expect([g.tier, g.shipyard]).toEqual(["great", true]);
});
When("the 1444 ports are placed", (s) => {
  s.placed = N.placePorts(s.towns ?? N.towns1444());
});
Then('the province "Genova" is a great port with a shipyard', (s) => {
  const p = Object.values(s.placed.provinces as Record<string, { tier: string; shipyard: boolean; name?: string }>).find((x) => x.name === "Genova")!;
  expect([p.tier, p.shipyard]).toEqual(["great", true]);
});

Given("the date is 1444", (s) => {
  s.year = 1444;
});
Given(re('the province "(\\w+)" holds a 1444 port town of tier "(\\w+)"'), (s, p: string, tier: string) => {
  const t = N.towns1444().find((x) => x.name === p);
  expect(t?.tier).toBe(tier);
  s.town = t;
});
Given(re('the town\'s holder "(\\w+)" (knows|does not know) S4 "Carrack and caravel"'), (s, holder: string, k: string) => {
  expect(s.town.holder).toBe(holder);
  s.holderKnows = k === "knows" ? ["S4"] : [];
});
Given('a province holds a 1444 port town of tier "port"', (s) => {
  s.town = { name: "Town", holder: "x", tier: "port", shipyard: false };
  s.holderKnows = [];
});
Given("the town is smaller than the market town harbour step 2 needs", (s) => {
  s.tooSmall = true;
});
When("the campaign starts", (s) => {
  s.start = N.startPort({ tier: s.town.tier, shipyard: s.town.shipyard, holderKnows: s.holderKnows ?? [], townTooSmall: !!s.tooSmall, towns: [s.town.name] });
});
Then(re('the province "(\\w+)" has harbour step (\\d) and shipyard step (\\d)'), (s, _p: string, h: string, y: string) => {
  expect([s.start.harbour, s.start.shipyard]).toEqual([num(h), num(y)]);
});
Then("the province has harbour step 1", (s) => {
  expect(s.start.harbour).toBe(1);
});

Given("the 1444 ports data", (s) => {
  s.towns = N.towns1444();
});
When("the ports are placed on the current map", (s) => {
  s.placed = N.placePorts(s.towns);
  s.startPorts = N.startPortsTable(() => false);
});
Then("315 of 317 towns are placed in 248 provinces", (s) => {
  expect(s.towns).toHaveLength(317);
  expect(317 - s.placed.notPlaced.length).toBe(315);
  expect(Object.keys(s.placed.provinces)).toHaveLength(248);
});
Then("51 of those provinces have a shipyard", (s) => {
  expect(Object.values(s.placed.provinces as Record<string, { shipyard: boolean }>).filter((p) => p.shipyard)).toHaveLength(51);
});
Then("the start ports table lists 236 provinces with a harbour", (s) => {
  expect(s.startPorts).toHaveLength(236);
});

Given(re('the 1444 port town "(\\w+)" falls on no land of the current map'), (s, t: string) => {
  s.towns = N.towns1444();
  expect(s.towns.find((x: N.Town) => x.name === t)?.province).toBeNull();
});
Then(re('the town "(\\w+)" is listed as not placed'), (s, t: string) => {
  expect(s.placed.notPlaced).toContain(t);
});

Given('the country "Portugal" holds a shore tile with no harbour in the province "Nagasaki"', (s) => {
  (s.ports ??= {})["Nagasaki"] = N.newPort("Nagasaki", "Portugal", 0);
  expect(N.isPort(s.ports.Nagasaki)).toBe(false);
});
When('the country "Portugal" builds a harbour there by the buildings rules', (s) => {
  expect(N.buildHarbour(s.ports.Nagasaki, "Portugal")).toBe(true);
});

When("the harbour is burned in a raid", (s) => {
  N.burnHarbour(s.port);
});
Then(re("the port has a harbour at step (\\d)"), (s, n: string) => {
  expect(s.port.harbourStep).toBe(num(n));
});
Given("the harbour's slots are under half filled because its seafolk are at sea", (s) => {
  s.port.harbourFill = 0.4;
});
Then("the port has half of its 25 berths", (s) => {
  expect(s.berths).toBe(12.5);
});

When(re("(the shipyard is burned|no timber is in reach|the shipyard's slots fall under half filled)"), (s, cause: string) => {
  expect(N.slipways(s.port)).toBe(2);
  if (cause === "the shipyard is burned") s.port.shipyardBurned = true;
  else if (cause === "no timber is in reach") s.port.timberInReach = false;
  else s.port.shipyardFill = 0.4;
});
Then("the port's slipways build nothing", (s) => {
  expect(N.slipways(s.port)).toBe(0);
});

Given('the port "Lagos" has 0 sailors in port and 0 ships in port', (s) => {
  const p = port(s, "Lagos");
  expect([p.sailorsInPort, p.ships.length]).toEqual([0, 0]);
  s.lagosProvince = { id: "Lagos", people: { seafolk: 4600 } } satisfies N.SeaProvince;
});
When(re('(\\d+) sailors are mustered in the port "Lagos"'), (s, n: string) => {
  N.musterSailors(s.lagosProvince, num(n), port(s, "Lagos"));
});
When('a caravel is launched in the port "Lagos" with 25 of them aboard', (s) => {
  const p = port(s, "Lagos");
  const r = N.orderShip(p, "caravel", buyer(s, "Portugal"));
  if (!r.ok) throw new Error(r.reason);
  for (let i = 0; i < 10 && p.hulls.length; i++) N.advanceHulls(p, () => "caravel-1");
  s.caravel = p.ships[0];
  expect(s.caravel.crew).toBe(25);
});
Then(re('the port "(\\w+)" has (\\d+) ships? in port'), (s, p: string, n: string) => {
  expect(port(s, p).ships.filter((x) => x.state !== "at sea")).toHaveLength(num(n));
});
When("the caravel sails", (s) => {
  const p = port(s, "Lagos");
  expect(N.mayLeavePort(s.caravel)).toBe(true);
  s.caravel.state = "at sea";
  p.ships = p.ships.filter((x) => x !== s.caravel);
});

// ---------------------------------------------------------------- sailors (NAVY-022..041)

Given('the province "Lagos" is a port of the country "Portugal"', (s) => {
  port(s, "Lagos");
  s.lagosProvince = { id: "Lagos", people: { seafolk: 4600 } } satisfies N.SeaProvince;
});
Given(re('the province "Lagos" has (\\d+) seafolk'), (s, n: string) => {
  if (s.acted) expect(s.lagosProvince.people.seafolk).toBe(num(n));
  else s.lagosProvince = { id: "Lagos", people: { seafolk: num(n) } } satisfies N.SeaProvince;
});
When(re('the country "Portugal" musters (\\d+) sailors in the province "Lagos"'), (s, n: string) => {
  s.muster = N.musterSailors(s.lagosProvince, num(n), port(s, "Lagos"));
});
Then(re('(\\d+) seafolk slots in the province "Lagos" stay empty until the sailors are released'), (s, n: string) => {
  expect(s.lagosProvince.emptySlots.seafolk).toBe(num(n));
});
Then(re("each of the (\\d+) sailors counts the same toward a ship's crew"), (s, n: string) => {
  expect(port(s, "Lagos").sailorsInPort).toBe(num(n));
  expect(s.muster.count).toBe(num(n));
});

Given('the province "Arguin" has no harbour', (s) => {
  (s.ports ??= {})["Arguin"] = N.newPort("Arguin", "Portugal", 0);
});
When('the country "Portugal" opens Muster sailors from the country card', (s) => {
  s.picks = N.musterPicks(Object.values(s.ports as Record<string, N.Port>));
});
Then(re('the province "(\\w+)" (can|cannot) be picked'), (s, p: string, c: string) => {
  expect(s.picks.includes(p)).toBe(c === "can");
});

Given(re('the province "Lagos" has (\\d+) people of the class "([^"]+)"'), (s, n: string, cls: string) => {
  s.people = { [cls]: num(n) };
});
When(re('the game counts who of the class "([^"]+)" can be called to sea'), (s, cls: string) => {
  s.callable = N.callableToSea(s.people)[cls];
});
Then(re("(\\d+) of them can be called"), (s, n: string) => {
  near(s.callable, num(n), 1e-6);
});

Given('the province "Lagos" has 75 men away as sailors', (s) => {
  s.away = 75;
  s.pool = 800;
});
When('the country "Portugal" opens the levy in the province "Lagos"', (s) => {
  s.levyPool = N.levyPoolWithSailors(s.pool, s.away);
});
Then('the levy pool of the province "Lagos" shows 75 sailors already gone', (s) => {
  expect(s.levyPool.sailorsGone).toBe(75);
});
Then("those 75 men cannot be levied", (s) => {
  expect(s.levyPool.pool).toBe(s.pool - 75);
});

Given(re('the port "(\\w+)" has (\\d+) sailors in port'), (s, p: string, n: string) => {
  if (s.acted) expect(port(s, p).sailorsInPort).toBe(num(n));
  else port(s, p).sailorsInPort = num(n);
});
When("a month passes", (s) => {
  if (s.ship) s.month = N.shipMonth(s.ship, { navalBase: !!s.navalBase });
  else if (s.waiting) s.drifted = N.driftHome(100, s.waiting.months, s.waiting.building);
  else s.month = N.portMonth(port(s, "Lagos"));
});
Then(re('the province "Lagos" store loses (\\d+) rations'), (s, n: string) => {
  expect(s.month.rations).toBe(num(n));
});
Then(re('the country "Portugal" pays ([\\d.]+) gold in wages'), (s, g: string) => {
  near(s.month.wages, Number(g));
});

Given(re('the port "Lagos" has 100 sailors in port who have waited (\\d+) months'), (s, m: string) => {
  s.waiting = { months: num(m), building: false };
});
Given(re('(no|a) ship is being built for them in the port "Lagos"'), (s, b: string) => {
  s.waiting.building = b === "a";
});
Then(re("(\\d+) of them return to their slots"), (s, n: string) => {
  expect(s.drifted).toBe(num(n));
});

Given(re('the port "Lagos" has a harbour at step (\\d)'), (s, step: string) => {
  port(s, "Lagos").harbourStep = num(step);
});
Given('Genoese ships call at the port "Lagos"', (s) => {
  s.genoeseCall = true;
});
When('the country "Portugal" hires a Genoese crew in the port "Lagos"', (s) => {
  s.hire = N.mayHireForeignCrew(port(s, "Lagos").harbourStep, s.genoeseCall);
});
Then(re("the hire is (refused|allowed)"), (s, r: string) => {
  expect(s.hire).toBe(r === "allowed");
});
Given('the port "Lagos" has 30 hired Genoese sailors in port', (s) => {
  s.foreign = 30;
});
When('a month passes and the country "Portugal" cannot pay them', (s) => {
  s.foreignWages = N.sailorsInPortMonth(s.foreign, { foreign: true }).wages;
  s.leaves = N.foreignCrewLeaves(false);
});
Then("the 30 Genoese sailors leave", (s) => {
  expect(s.leaves).toBe(true);
  near(s.foreignWages, 2 * N.sailorsInPortMonth(30).wages);
});

Given('a loyal lord of the country "Portugal" holds the port "Porto"', (s) => {
  port(s, "Porto", "Lord of Porto");
  s.lord = N.lordSailors("Lord of Porto", true);
});
When('the lord musters sailors in the port "Porto"', (s) => {
  expect(s.lord.mayMuster).toBe(true);
  const prov: N.SeaProvince = { id: "Porto", people: { seafolk: 3000 } };
  N.musterSailors(prov, 60, port(s, "Porto"));
  s.result = N.orderShip(port(s, "Porto"), "cog", { name: s.lord.owner, known: ALL, gold: 100, timber: 20 });
});
Then("the sailors and the ships they crew stay the lord's", (s) => {
  expect(s.result.ok).toBe(true);
  expect(s.result.hull.owner).toBe("Lord of Porto");
  expect(port(s, "Porto").owner).toBe("Lord of Porto");
});
Then('the lord brings his ships when the country "Portugal" calls him', (s) => {
  expect(s.lord.bringsShipsWhenCalled).toBe(true);
  expect(N.lordSailors("Lord of Porto", false).bringsShipsWhenCalled).toBe(false);
});

Given('the country "Portugal" captured a ship with 40 sailors aboard', (s) => {
  s.prisoners = 40;
});
When('the country "Portugal" takes the 40 sailors into its service', (s) => {
  s.inService = s.prisoners;
});
When("their ship next enters a port friendly to them", (s) => {
  s.deserters = N.prizeCrewDeserters(s.inService);
});
Then("10 of them desert", (s) => {
  expect(s.deserters).toBe(10);
});

When('the country "Portugal" presses 100 seafolk in the port "Lagos"', (s) => {
  s.press = N.pressSailors(knownOf(s, "Portugal"));
});
Then(re('the pressing is (done without bounty and Lagos has the grievance "Pressed" for a year|refused)'), (s, r: string) => {
  if (r === "refused") expect(s.press.ok).toBe(false);
  else expect(s.press).toEqual({ ok: true, bounty: 0, grievance: "Pressed", years: 1 });
});

When(re('the country "Portugal" moves them to the port "Lisbon" (by road|aboard a ship with room)'), (s, way: string) => {
  s.move = N.moveSailors(way === "by road" ? "by road" : "aboard");
});
Then(re("they travel (at levy marching pace and eat on the way|as passengers counted as men carried)"), (s, how: string) => {
  if (how.startsWith("at levy")) expect(s.move).toMatchObject({ pace: "levy marching pace", eats: true });
  else expect(s.move.countsAsMenCarried).toBe(true);
});

Given('60 sailors from the province "Lagos" crew a carrack', (s) => {
  s.carrack = ship("carrack", { state: "in port" });
  s.emptySlots = 60;
});
Given('the fisheries of the province "Lagos" were filled by others while they were at sea', (s) => {
  s.emptySlots = 0;
});
Given('the province "Lagos" has 60 empty seafolk slots', (s) => {
  s.emptySlots = 60;
});
When(re("the (carrack is laid up|fleet is disbanded)"), (s) => {
  s.walkHome = N.payOff(N.layUp(s.carrack), s.emptySlots);
});
Then('the 60 sailors walk home to the province "Lagos"', (s) => {
  expect(s.walkHome.slots + s.walkHome.homeless).toBe(60);
});
Then("they come back as homeless", (s) => {
  expect(s.walkHome.homeless).toBe(60);
});
Then('the 60 sailors walk home and refill the emptiest slots of the province "Lagos"', (s) => {
  expect(s.walkHome).toEqual({ slots: 60, homeless: 0 });
});

Given('men of the province "Lagos" have served 2 years at sea', (s) => {
  s.served = 2;
});
When('the game checks the province "Lagos"', (s) => {
  if (s.served !== undefined) s.skilled = N.seaSkilled(s.served, 1450);
  if (s.lost !== undefined) s.widows = N.widowsPort(s.lost, 4600, 1450);
});
Then('the province "Lagos" has +10 percent fish and +10 percent traders by sea for 10 years', (s) => {
  expect(s.skilled).toEqual({ fish: 0.1, traders: 0.1, until: 1460 });
  expect(N.seaSkilled(1.5, 1450)).toBeNull();
});

Given('the port "Lagos" has sailors in port paid 10 gold this month', (s) => {
  s.wagesPaid = 10;
});
When("the month ends", (s) => {
  if (s.wagesPaid !== undefined) s.ashore = N.wagesSpentAshore(s.wagesPaid);
  if (s.ship) N.monthOfWear(s.ship);
});
Then('2 gold is spent in the port "Lagos" as trade for its market folk', (s) => {
  expect(s.ashore).toBe(2);
});

Given('the fishery of the province "Lagos" has more than half its slots emptied by sailors away', (s) => {
  s.fishery = { workers: 40, slots: 100 };
});
When("the month's fish is counted", (s) => {
  s.fish = N.fisheryFish(s.fishery.workers, s.fishery.slots, 500);
});
Then('the fishery of the province "Lagos" is fallow and gives no fish', (s) => {
  expect(s.fish).toEqual({ fallow: true, fish: 0 });
});

Given('the shipyard of the province "Lagos" fills its slots from seafolk', (s) => {
  const p = port(s, "Lagos");
  p.shipyardStep = 2;
  p.shipyardFill = 1;
  expect(N.slipways(p)).toBe(2);
});
When('the country "Portugal" musters every seafolk man who can be called in the province "Lagos"', (s) => {
  const callable = N.callableToSea(s.lagosProvince.people)["seafolk"]!;
  N.musterSailors(s.lagosProvince, callable, port(s, "Lagos"));
  // The shipyard's workers are the seafolk men a muster can call: all of them gone.
  port(s, "Lagos").shipyardFill = 1 - callable / callable;
});
Then('the slipways of the province "Lagos" stop', (s) => {
  expect(N.slipways(port(s, "Lagos"))).toBe(0);
});

Given('the province "Lagos" has lost more than a tenth of its seafolk at sea in 5 years', (s) => {
  s.lost = 500;
});
Then('the province "Lagos" has fewer births for 10 years', (s) => {
  expect(s.widows.birthsUntil - 1450).toBe(10);
  expect(N.widowsPort(400, 4600, 1450)).toBeNull();
});
Then('the province "Lagos" has the grievance "Lost at sea" for 2 years', (s) => {
  expect(s.widows.grievance).toBe("Lost at sea");
  expect(s.widows.grievanceUntil - 1450).toBe(2);
});

// ---------------------------------------------------------------- buying ships (NAVY-042..057)

Given(re('the port "(\\w+)" has a free slipway at shipyard step (\\d)'), (s, p: string, step: string) => {
  port(s, p).shipyardStep = num(step);
});
Given('the country "Portugal" has 100 gold and 20 timber in reach of the port "Lagos"', (s) => {
  const b = buyer(s, "Portugal");
  b.gold = 100;
  b.timber = 20;
});
When(re('the country "(\\w+)" orders an? (carrack|caravel|armed carrack) in the port "(\\w+)"'), (s, c: string, type: string, p: string) => {
  const b = buyer(s, c);
  s.goldBefore = b.gold;
  s.timberBefore = b.timber;
  const pt = port(s, p);
  s.result = s.abroad ? N.orderShipAbroad(pt, type, b, s.abroad) : N.orderShip(pt, type, b);
});
Then('the country "Portugal" pays 60 gold and 12 timber at once', (s) => {
  const b = buyer(s, "Portugal");
  expect([s.goldBefore - b.gold, s.timberBefore - b.timber]).toEqual([60, 12]);
});
Then("60 sailors are assigned to the hull and help build it", (s) => {
  expect(s.result.hull.crew).toBe(60);
  expect(s.result.hull.on).toBe("slipway");
});
Then("the order is refused because the carrack needs a crew of 60", (s) => {
  expect(s.result).toEqual({ ok: false, reason: "needs a crew of 60" });
});

When(re('the country "(\\w+)" orders a "([^"]+)" in a port with the right slipway and crew'), (s, c: string, type: string) => {
  const p = N.newPort("P", c, 2, 3);
  p.sailorsInPort = N.shipRow(type).crew;
  s.result = N.orderShip(p, type, buyer(s, c));
});
When(re('the country "(\\w+)" orders a caravel'), (s, c: string) => {
  const p = N.newPort("P", c, 2, 2);
  p.sailorsInPort = 25;
  s.result = N.orderShip(p, "caravel", buyer(s, c));
});

Given(re('a ship of the type "([^"]+)" of the family "([^"]+)"'), (s, type: string, family: string) => {
  expect(N.shipRow(type).family).toBe(family);
  s.type = type;
});
When("it leaves port with full supply", (s) => {
  s.ship = ship(s.type);
});
Then(re("it carries (\\d+) zones of supply"), (s, n: string) => {
  expect(s.ship.supply).toBe(num(n));
});

Given(re('a ship type "([^"]+)"'), (s, type: string) => {
  s.type = type;
});
When("its cost is read from the ship table", (s) => {
  s.row = N.shipRow(s.type);
});
Then(re("it needs (\\d+) sailors, (\\d+) gold, (\\d+) timber and (\\d+) months, and costs ([\\d.]+) gold a month"), (s, c: string, g: string, t: string, m: string, u: string) => {
  const r = s.row as N.ShipRow;
  expect([r.crew, r.gold, r.timber, r.months, r.upkeep]).toEqual([num(c), num(g), num(t), num(m), Number(u)]);
});

Given('the country "Portugal" has the exploration unlock', (s) => {
  buyer(s, "Portugal").explorationUnlock = true;
});
Given('the port "Lagos" has shipyard step 2 with 2 free slipways', (s) => {
  port(s, "Lagos").shipyardStep = 2;
  expect(N.slipways(port(s, "Lagos"))).toBe(2);
});
When(re('the country "Portugal" orders (\\d+) (caravels|cogs) in the port "(\\w+)"'), (s, n: string, kind: string, p: string) => {
  const b = buyer(s, "Portugal");
  s.goldBefore = b.gold;
  s.timberBefore = b.timber;
  s.results = [];
  for (let i = 0; i < num(n); i++) s.results.push(N.orderShip(port(s, p), kind === "caravels" ? "caravel" : "cog", b));
});
Then('the country "Portugal" pays 75 gold and 12 timber', (s) => {
  const b = buyer(s, "Portugal");
  expect([s.goldBefore - b.gold, s.timberBefore - b.timber]).toEqual([75, 12]);
});
Then("2 caravels are built on the slipways in 3 months", (s) => {
  const on = (s.results as N.OrderResult[]).filter((r) => r.ok && r.hull.on === "slipway");
  expect(on.map((r) => (r.ok ? r.hull.monthsLeft : 0))).toEqual([3, 3]);
});
Then("1 caravel is built on the harbour in 4.5 months", (s) => {
  const on = (s.results as N.OrderResult[]).filter((r) => r.ok && r.hull.on === "harbour");
  expect(on.map((r) => (r.ok ? r.hull.monthsLeft : 0))).toEqual([4.5]);
});
Given('the port "Funchal" has a harbour and no shipyard', (s) => {
  (s.ports ??= {})["Funchal"] = N.newPort("Funchal", "Portugal", 1, 0);
});
Then("only one cog is built at a time on the harbour", (s) => {
  const hulls = port(s, "Funchal").hulls;
  expect(hulls.map((h) => h.on)).toEqual(["harbour", "waiting"]);
  for (let i = 0; i < 5; i++) N.advanceHulls(port(s, "Funchal"), () => "cog");
  expect(port(s, "Funchal").hulls.map((h) => h.on)).toEqual(["harbour"]);
});

Given(re('a port on the "([^"]+)"'), (s, seaName: string) => {
  s.seaName = seaName;
});
When("a cog, junk or dhow is ordered there", (s) => {
  s.built = N.tradeShipFor(s.seaName);
});
Then(re('the ship built is a "(\\w+)"'), (s, t: string) => {
  expect(s.built).toBe(t);
});

When('the country "Portugal" orders an armed carrack', (s) => {
  const p = N.newPort("P", "Portugal", 2, 2);
  p.sailorsInPort = 120;
  s.result = N.orderShip(p, "armed carrack", buyer(s, "Portugal"));
  s.needs = N.shootingNeeds("armed carrack");
});
Then("the armed carrack also needs its guns, cast or bought as for gun crews", (s) => {
  expect(s.result.ok).toBe(true);
  expect(s.needs).toContain("guns");
  expect(N.shootingNeeds("carrack")).toEqual([]);
});
Then("it needs powder for each voyage", (s) => {
  expect(s.needs).toContain("powder each voyage");
});

/** Lagos, its bay and a neighbouring sea zone. */
function lagosWaters(): MoveWorld {
  return sea({ Lagos: coast("Portugal"), "Lagos Bay": zone(), "Cape St Vincent": zone() }, ["Lagos~Lagos Bay", "Lagos Bay~Cape St Vincent"]);
}
Given('an enemy fleet is in the sea zone of the port "Lagos"', (s) => {
  s.w = lagosWaters();
  s.w.relations.wars.push(["Castile", "Portugal"]);
  s.w.movers.push(createMover("CF", "fleet", "Castile", "Lagos Bay"));
  N.blockade(s.w, port(s, "Lagos"), "Lagos Bay");
  port(s, "Lagos").shipyardStep = 2;
  port(s, "Lagos").sailorsInPort = 25;
});
Then('no ship leaves the port "Lagos" without a sea battle', (s) => {
  s.w ??= lagosWaters();
  expect(N.blockade(s.w, port(s, "Lagos"), "Lagos Bay")).toBe(true);
  expect(N.leaveBlockadedPort(port(s, "Lagos"))).toBe("needs a sea battle");
});

Given('the port "Lagos" has 2 caravels on its slipways', (s) => {
  const p = port(s, "Lagos");
  p.shipyardStep = 2;
  p.sailorsInPort = 50;
  for (let i = 0; i < 2; i++) expect(N.orderShip(p, "caravel", buyer(s, "Portugal")).ok).toBe(true);
});
When('the country "Castile" takes the port "Lagos"', (s) => {
  s.taken = N.takePort(port(s, "Lagos"), "Castile");
});
Then('the 2 hulls on the slipways belong to the country "Castile"', (s) => {
  expect(s.taken.hulls.filter((h: N.Hull) => h.on === "slipway" && h.owner === "Castile")).toHaveLength(2);
});

Given('the country "Venice" holds a great port with a shipyard', (s) => {
  (s.ports ??= {})["Venice"] = Object.assign(N.newPort("Venice", "Venice", 2, 4), { tier: "great" });
});
Given('the country "Hungary" is at peace with the country "Venice"', (s) => {
  s.abroad = { ...(s.abroad ?? { ownerAgrees: false }), atPeace: true };
});
Given('the country "Venice" agrees to sell', (s) => {
  s.abroad = { ...s.abroad, ownerAgrees: true };
});
Given('the country "Venice" agrees to sell a hull to the country "Hungary"', (s) => {
  (s.ports ??= {})["Venice"] = Object.assign(N.newPort("Venice", "Venice", 2, 4), { tier: "great" });
  s.abroad = { atPeace: true, ownerAgrees: true };
});
Given('60 sailors of the country "Hungary" wait in the port "Venice"', (s) => {
  port(s, "Venice").sailorsInPort = 60;
});
Given('no sailors of the country "Hungary" wait in the port "Venice"', (s) => {
  port(s, "Venice").sailorsInPort = 0;
});
Then('the country "Hungary" pays 90 gold', (s) => {
  expect(s.goldBefore - buyer(s, "Hungary").gold).toBe(90);
});
Then("the carrack is built on a Venetian slipway", (s) => {
  expect(s.result.hull.on).toBe("slipway");
  expect(port(s, "Venice").hulls).toContain(s.result.hull);
});
Then("the Hungarian sailors waiting in Venice are paid double", () => {
  near(N.sailorsInPortMonth(60, { foreign: true }).wages, 12);
});

Given('the province "Arguin" has seafolk and no harbour', (s) => {
  (s.ports ??= {})["Arguin"] = N.newPort("Arguin", "sanhaja_zenaga", 0, 0, { seafolk: 300 });
});
When('the country owning "Arguin" buys 5 small craft there', (s) => {
  s.craft = N.smallCraft(5);
  const p = port(s, "Arguin");
  p.sailorsInPort = 30;
  s.result = N.orderShip(p, "small craft", buyer(s, "sanhaja_zenaga"));
});
Then("30 sailors crew them", (s) => {
  expect(s.craft.sailors).toBe(30);
  expect(s.result.ok).toBe(true);
});
Then("each small craft carries 10 men or a load of goods along coastal zones only", (s) => {
  expect([s.craft.carriesMen, s.craft.carriesLoads, s.craft.ocean]).toEqual([50, 5, false]);
});
Then("the small craft serve as the fishery's boats", (s) => {
  expect(s.craft.fisheryBoats).toBe(true);
});

/** Small craft at Lagos, and the zone ahead held by an enemy war fleet. */
Given('small craft of the country "Portugal" plan to enter a zone with an enemy war fleet', (s) => {
  s.w = lagosWaters();
  s.w.relations.wars.push(["Castile", "Portugal"]);
  launch(s, N.newFleet("P", "Portugal", [ship("small craft")]), "Lagos Bay");
  launch(s, N.newFleet("C", "Castile", [ship("galleon", { owner: "Castile" })]), "Cape St Vincent");
  s.fleet = s.sea.fleets["P"];
});
When("the route is planned", (s) => {
  plan(s, "Cape St Vincent");
  s.verdict = N.fleetMayEnter(s.w, s.sea, s.fleet, "Cape St Vincent");
});
Then("the zone is closed to them", (s) => {
  expect(s.verdict).toEqual({ ok: false, reason: "enemy war fleet" });
  expect(s.routeOk).toBe(false);
  expect(N.smallCraft(1).fights).toBe(false);
});

When("its small craft plan a route across an ocean zone", (s) => {
  const { w, distance } = oceanChain(2);
  s.w = w;
  launch(s, N.newFleet("F", s.country, [ship("small craft", { owner: s.country })]), "Bay");
  s.sea.coastDistance = distance;
  plan(s, "O2");
});
Given("it holds a beach with seafolk and no harbour", (s) => {
  s.beach = N.newPort("Beach", s.country, 0, 0, { seafolk: 500 });
});
When("it orders a war canoe fleet and a voyaging canoe there", (s) => {
  s.beach.sailorsInPort = 120;
  const b: N.Buyer = { name: s.country, known: s.known[s.country], gold: 100, timber: 10 };
  s.results = [N.orderShip(s.beach, "war canoe fleet", b), N.orderShip(s.beach, "voyaging canoe", b)];
});
Then("both orders are allowed", (s) => {
  expect(s.results.map((r: N.OrderResult) => r.ok)).toEqual([true, true]);
});

Given('the country "Portugal" has no ship of that kind', (s) => {
  s.ships = [];
});
When(re("(it captures a ship and puts a prize crew aboard|a loyal lord with a port is called|it hires a privateer|an event gives a treasure fleet)"), (s, way: string) => {
  const w = way.startsWith("it captures") ? "capture" : way.startsWith("a loyal lord") ? "lord" : way.startsWith("it hires") ? "privateer" : "event";
  s.gets = N.otherShips(w);
  if (w === "capture") {
    const prize = ship("carrack", { owner: "Castile" });
    expect(N.putPrizeCrew(prize, 15, "Portugal")).toBe("captured");
  }
});
Then(
  re('the country "Portugal" (the captured ship|the lord\'s ships until his service ends|a ship, crew and commander for a season|the ships the event names)'),
  (s, what: string) => {
    expect(s.gets).toBe(what);
  },
);

// ---------------------------------------------------------------- fleets and hulls (NAVY-058..064)

Given('the country "Portugal" has 3 caravels and 1 carrack at sea under the admiral "Rui Vaz"', (s) => {
  s.fleet = N.newFleet("Algarve", "Portugal", [ship("caravel"), ship("caravel"), ship("caravel"), ship("carrack")], { name: "Rui Vaz", might: 0, cunning: 5, logistics: 1 });
});
When("the fleet card is read", (s) => {
  s.card = N.fleetCard(s.fleet);
});
Then("the fleet has one admiral and 4 ships", (s) => {
  expect([s.card.admiral, s.card.ships]).toEqual(["Rui Vaz", 4]);
});
Then("the fleet shows crew 135 of 135", (s) => {
  expect([s.card.crew, s.card.crewNeeded]).toEqual([135, 135]);
});
Then("each ship has a crew, a hull step, supply left and an age in years", (s) => {
  for (const p of s.card.perShip) expect(Object.keys(p).sort()).toEqual(["age", "crew", "hull", "supply"]);
});

Given("a carrack was launched 3 years ago", (s) => {
  s.ship = ship("carrack", { age: 3 });
});
When("a year passes", (s) => {
  N.yearOfAge(s.ship);
});
Then(re("the carrack has age (\\d+)"), (s, n: string) => {
  expect(s.ship.age).toBe(num(n));
});

Given(re('a ship with a hull "(\\w+)" has been (\\d+) months at sea since its last hull step'), (s, h: N.HullStep, m: string) => {
  s.ship = ship("carrack", { hull: h, state: "at sea", monthsSinceStep: num(m) - 1 });
});
Then(re('the ship has a hull "(\\w+)"'), (s, h: string) => {
  expect(s.ship.hull).toBe(h);
});

Given(re('a ship with a hull "(\\w+)" is in a berth of a port at harbour step 2 (without a shipyard|with a shipyard)'), (s, h: N.HullStep, yard: string) => {
  s.ship = ship("carrack", { hull: h, state: "in port", berth: "berth" });
  s.yard = yard === "with a shipyard";
  expect(N.mayRefit({ harbourStep: 2, shipyardStep: s.yard ? 1 : 0, inBerth: true })).toBe(true);
});
When(re("([\\d.]+) months pass"), (s, m: string) => {
  if (Number(m) >= N.refitMonths(s.ship.hull, s.yard)) s.ship.hull = "sound";
});

Given(re('a ship with a hull "(\\w+)" at sea'), (s, h: N.HullStep) => {
  s.ship = ship("carrack", { hull: h, state: "at sea" });
});
When("it sails a zone", (s) => {
  s.days = N.shipStepDays(s.ship, "sea");
  s.normal = N.shipStepDays({ ...s.ship, hull: "sound" }, "sea");
});
When("a storm hits its zone", (s) => {
  s.storm = N.hullAtSea(s.ship.hull).onStorm;
});
When("it is ordered to sail", (s) => {
  s.atSea = N.hullAtSea(s.ship.hull);
  s.result = { ok: N.mayLeavePort(s.ship) };
});
Then(re("(it sails at its normal days|it needs twice the days|its hull falls to \"wrecked\"|it may only limp into the nearest port|it sinks)"), (s, r: string) => {
  if (r === "it sails at its normal days") expect(s.days).toBe(s.normal);
  else if (r === "it needs twice the days") expect(s.days).toBe(2 * s.normal);
  else if (r === "it may only limp into the nearest port") expect(s.atSea.mayOnlyLimpToPort).toBe(true);
  else expect(s.storm).toBe(r === "it sinks" ? "sinks" : "wrecked");
});

Given(re("a galleon with (\\d+) sailors of its crew of 200"), (s, n: string) => {
  s.ship = ship("galleon", { crew: num(n) });
});
When("it sails a zone and fights a sea battle", (s) => {
  s.share = N.fightingShare(s.ship);
  s.days = N.shipStepDays(s.ship, "sea");
});
Then("it fights with half its strength", (s) => {
  expect(s.share).toBe(0.5);
});
Then("it needs twice the days per zone", (s) => {
  expect(s.days).toBe(2 * N.shipRow("galleon").stepDays.sea);
});
Given(re("a galleon in port with (\\d+) sailors of its crew of 200"), (s, n: string) => {
  s.ship = ship("galleon", { crew: num(n), state: "in port" });
});

// ---------------------------------------------------------------- admirals (NAVY-065..075)

Given('the country "Portugal" has 2 galleons in the port "Lisbon" with no admiral', (s) => {
  s.fleet = N.newFleet("L", "Portugal", [ship("galleon", { state: "in port" }), ship("galleon", { state: "in port" })]);
});
When("the galleons are ordered to sail", (s) => {
  s.result = N.maySail(s.fleet);
});
When('an enemy fleet enters the sea zone of the port "Lisbon"', (s) => {
  s.defend = s.fleet.ships.filter((x: N.Ship) => N.defendsPort(x, "Lisbon Bay", "Lisbon Bay"));
});
Then("the 2 galleons fight the sea battle in the port's own zone", (s) => {
  expect(s.defend).toHaveLength(2);
  expect(N.defendsPort(s.fleet.ships[0], "Cape Roca", "Lisbon Bay")).toBe(false);
});

Given('the country "Portugal" has a cog set to trade in the port "Lisbon"', (s) => {
  s.fleet = N.newFleet("T", "Portugal", [ship("cog", { setToTrade: true, state: "in port" })]);
});
When("the trade design gives it a route", (s) => {
  s.w = sea({ Lisbon: coast("Portugal"), "Lisbon Bay": zone(), Porto: coast("Portugal") }, ["Lisbon~Lisbon Bay", "Lisbon Bay~Porto"]);
  launch(s, s.fleet, "Lisbon");
  s.voyage = N.sail(s.w, s.sea, s.fleet, "Porto", 10);
});
Then('the cog sails the route under the country "Portugal" with no admiral', (s) => {
  expect(s.fleet.admiral).toBeUndefined();
  expect(s.w.movers.find((m: { id: string }) => m.id === "T").place).toBe("Porto");
  expect(s.fleet.owner).toBe("Portugal");
});

Given('the official "Rui Vaz" runs the province "Lagos"', (s) => {
  s.official = { name: "Rui Vaz", type: "Customs officer", province: "Lagos" };
});
When('the country "Portugal" commissions "Rui Vaz" as admiral of the fleet of the Algarve', (s) => {
  s.admiral = N.commissionAdmiral("Rui Vaz", "customs officer").admiral;
  s.commission = commissionOfficial({ official: "Rui Vaz", type: "Customs officer", province: "Lagos" }).commission;
  s.choices = emptyProvinceChoices(20);
});
Then(
  'the province "Lagos" is handled as an official leaving it: left, another official moved in, a deputy named or the lord next door asked',
  (s) => {
    expect(s.choices).toEqual(["Leave it", "Move another official in", "Name a deputy", "Ask the lord next door"]);
  },
);
When('the country "Portugal" releases "Rui Vaz"', (s) => {
  s.released = release(s.commission, "Porto");
});
Then('"Rui Vaz" returns to a province the country "Portugal" chooses', (s) => {
  expect(s.released.province).toBe("Porto");
});

Given('a large fleet of the country "Portugal" with an admiral', (s) => {
  s.fleet = N.newFleet("Big", "Portugal", Array.from({ length: 12 }, () => ship("galleon")), { name: "A", might: 1, cunning: 1, logistics: 1 });
});
When(re('the country "Portugal" names (\\d) vice-admirals from officials or lords'), (s, n: string) => {
  s.named = N.nameViceAdmirals(s.fleet, Array.from({ length: num(n) }, (_, i) => `V${i}`));
});
Then(re("the naming is (allowed|refused)"), (s, r: string) => {
  expect(s.named).toBe(r === "allowed");
});

Given(re("an admiral with (Might|Cunning|Logistics) (\\d+)"), (s, skill: string, n: string) => {
  s.admiral = { name: "A", might: 0, cunning: 0, logistics: 0, [skill.toLowerCase()]: num(n) } as N.Admiral;
});
When(re("his fleet (fights a sea battle|boards an enemy ship|sails a zone|looks for enemy fleets|sails through a storm|sails 10 zones)"), (s, does: string) => {
  s.effects = N.admiralEffects(s.admiral);
  if (does === "sails a zone") {
    const with_ = N.newFleet("F", "Portugal", [ship("carrack")], s.admiral);
    const without = N.newFleet("G", "Portugal", [ship("carrack")], { name: "B", might: 0, cunning: 0, logistics: 0 });
    s.daysRatio = N.fleetStepDays(with_, "ocean") / N.fleetStepDays(without, "ocean");
  }
  if (does === "sails through a storm") s.storm = N.stormLossFactor({ logistics: s.admiral.logistics });
  if (does === "sails 10 zones") {
    const f = N.newFleet("F", "Portugal", [ship("carrack")], s.admiral);
    N.useSupply(f, 10);
    s.used = 15 - f.ships[0]!.supply;
  }
});
Then("ships in his part of the line make +10 percent hits", (s) => {
  near(s.effects.hits, 0.1);
});
Then("soldiers and crew he leads aboard fight +20 percent", (s) => {
  near(s.effects.boarding, 0.2);
});
Then("it needs 25 percent fewer days", (s) => {
  near(s.daysRatio, 0.75);
});
Then("it sees enemy fleets one zone further", (s) => {
  expect(s.effects.sightZones).toBe(1);
});
Then("it suffers 20 percent fewer storm losses", (s) => {
  near(s.storm, 0.8);
});
Then(re("it uses (\\d+) supply"), (s, n: string) => {
  expect(s.used).toBe(num(n));
});

Given('the admiral "Rui Vaz" has Logistics 1', (s) => {
  s.admiral = { name: "Rui Vaz", might: 0, cunning: 5, logistics: 1 } satisfies N.Admiral;
});
Given("he has spent 3 years at sea without losing a ship to a storm", (s) => {
  for (let i = 0; i < 3; i++) N.admiralYearAtSea(s.admiral, false);
});
When("the year ends", (s) => {
  N.admiralYearEnds(s.admiral);
});
Then('the admiral "Rui Vaz" has Logistics 2', (s) => {
  expect(s.admiral.logistics).toBe(2);
});

Given("an admiral wins a sea battle", (s) => {
  s.admiral = { name: "A", might: 1, cunning: 1, logistics: 1 } satisfies N.Admiral;
});
When("skills are gained by the warfare rules", (s) => {
  N.seaVictory(s.admiral);
});
Then("the sea battle counts as a victory", (s) => {
  expect(s.admiral.victories).toBe(1);
});

Given(re('an official of the type "([^"]+)" with no years served'), (s, t: string) => {
  s.type = t;
});
When("he is commissioned as admiral", (s) => {
  s.commissioned = N.commissionAdmiral("O", s.type);
});
Then(re("he starts with Might (\\d+), Cunning (\\d+) and Logistics (\\d+)"), (s, m: string, c: string, l: string) => {
  const a = s.commissioned.admiral as N.Admiral;
  expect([a.might, a.cunning, a.logistics]).toEqual([num(m), num(c), num(l)]);
});
Then(re('he is offered the trait "(\\w+)"'), (s, t: string) => {
  expect(s.commissioned.traitOffered).toBe(t);
});

Given('the country "Portugal" has a current sea style', (s) => {
  s.seaStyle = "line ahead";
});
When('the country "Portugal" commissions an admiral', (s) => {
  s.admiral = N.commissionAdmiral("O", "warden", { seaStyle: s.seaStyle }).admiral;
});
Then("the admiral uses that sea style", (s) => {
  expect(s.admiral.style).toBe(s.seaStyle);
});

Given(re('the country "(\\w+)" has a fleet'), (s, c: string) => {
  s.country = c;
});
When(re("(the ruler|a proud lord|a hired privateer|an elder) takes command"), (s, l: Parameters<typeof N.otherFleetLeader>[0]) => {
  s.catch = N.otherFleetLeader(l).replace("his employer", s.country);
});
Then(
  re(
    "(if he is lost at sea or captured the country faces a succession crisis|he will not sail under an official admiral|he leaves when unpaid and may raid neutral shipping and drag Portugal into a war|the fleet is led as by any lord)",
  ),
  (s, c: string) => {
    expect(s.catch).toBe(c);
  },
);

// ---------------------------------------------------------------- keeping ships (NAVY-076..088)

Given(re("a carrack with a crew of 60 is (at sea|in port, crewed|laid up)"), (s, st: string) => {
  s.ship = ship("carrack", { state: st === "at sea" ? "at sea" : st === "laid up" ? "laid up" : "in port", berth: "berth" });
  if (st === "laid up") N.layUp(s.ship);
});
Given("a carrack with a crew of 60 is in port, crewed, in a berth at a naval base", (s) => {
  s.ship = ship("carrack", { state: "in port", berth: "berth" });
  s.navalBase = true;
});
Then(re("the country pays ([\\d.]+) gold in wages and ([\\d.]+) gold in upkeep"), (s, w: string, u: string) => {
  near(s.month.wages, Number(w));
  near(s.month.upkeep, Number(u));
});
Then(re("the port's province gives (\\d+) rations"), (s, r: string) => {
  expect(s.month.rations).toBe(num(r));
});
Then(re("the carrack loses a hull step every (\\d+) (months|years)"), (s, n: string, unit: string) => {
  expect(N.rotMonths(s.ship)).toBe(num(n) * (unit === "years" ? 12 : 1));
});

Given("a galley has been laid up for 10 years", (s) => {
  s.ship = ship("galley", { state: "in port" });
  N.layUp(s.ship);
  s.ship.laidUpMonths = 119;
});
Then("the galley is wrecked", (s) => {
  expect(s.ship.hull).toBe("wrecked");
});

Given('a carrack with a crew of 60 in the port "Lisbon"', (s) => {
  s.carrack = ship("carrack", { state: "in port" });
});
When('the country "Portugal" lays the carrack up', (s) => {
  s.released = N.layUp(s.carrack);
});
Then("the 60 sailors are released and walk home", (s) => {
  expect(s.released).toBe(60);
  expect(s.carrack.crew).toBe(0);
  expect(N.payOff(s.released, 60)).toEqual({ slots: 60, homeless: 0 });
});

Given('a laid-up carrack in the port "Lisbon"', (s) => {
  s.carrack = ship("carrack", { state: "in port" });
  N.layUp(s.carrack);
});
When('the country "Portugal" fits the carrack out', (s) => {
  s.result = N.fitOut(s.carrack, port(s, "Lisbon"));
});
Then("the carrack is crewed and ready after a month", (s) => {
  expect(s.result).toEqual({ ok: true, months: 1 });
  expect(s.carrack.crew).toBe(60);
});

Given("a port with 10 berths has 10 ships berthed", (s) => {
  s.port = N.newPort("P", "Portugal", 1);
  for (let i = 0; i < 10; i++) N.putIn(s.port, ship("carrack", { state: "in port" }));
  expect(N.freeBerths(s.port)).toBe(0);
});
When("an 11th ship puts in", (s) => {
  s.ship = ship("carrack");
  s.berthing = N.putIn(s.port, s.ship);
});
Then("the 11th ship rides at the anchorage", (s) => {
  expect(s.berthing).toBe("anchorage");
});
Then("it can resupply but not refit", (s) => {
  expect(N.anchorageRules(s.berthing)).toMatchObject({ resupply: true, refit: false });
});
Then("it rots as if at sea and faces storms as if at sea", (s) => {
  expect(N.anchorageRules(s.berthing)).toMatchObject({ rotsAs: "at sea", storms: true });
  expect(N.rotMonths(s.ship)).toBe(N.navalConfig.rotMonths["at sea"]);
});

Given(re('the country "Portugal" has a fleet next to a port of the country "(\\w+)"'), (s, owner: string) => {
  s.dockAt = N.newPort("Port", owner, 2);
});
Given(re('the country "(\\w+)" is (the realm|an ally|at peace and not a rival|a rival|at war) of the country "Portugal"'), (s, _o: string, r: string) => {
  s.relation = r === "at peace and not a rival" ? "at peace" : r;
});
When("the fleet tries to dock", (s) => {
  s.dock = N.mayDock(s.dockAt, s.relation);
});
Then(re("docking is (allowed, paid in food|allowed, paid in gold|refused)"), (s, r: string) => {
  if (r === "refused") expect(s.dock.ok).toBe(false);
  else expect(s.dock).toEqual({ ok: true, pays: r.endsWith("food") ? "food" : "gold" });
});

Given("a carrack with a crew of 60 has 5 of its 15 supply left", (s) => {
  s.ship = ship("carrack", { supply: 5 });
});
When(re("it docks in a (friendly|neutral) port"), (s, k: string) => {
  s.resupply = N.resupply(s.ship, k === "friendly" ? "food" : "gold");
});
Then("it is refilled to 15 supply in one day", (s) => {
  expect(s.ship.supply).toBe(15);
  expect(s.resupply.days).toBe(1);
});
Then(re("it pays (60 rations from the province|6 gold to the port's country)"), (s, what: string) => {
  if (what.includes("rations")) expect([s.resupply.rations, s.resupply.gold]).toEqual([60, 0]);
  else expect([s.resupply.rations, s.resupply.gold]).toEqual([0, 6]);
});
Given("the friendly port's province has 30 rations", (s) => {
  s.food = 30;
});
When("the carrack docks there", (s) => {
  s.resupply = N.resupply(s.ship, "food", s.food);
});
Then(re("the carrack is refilled to (\\d+) supply"), (s, n: string) => {
  expect(s.ship.supply).toBe(num(n));
  expect(s.resupply.rations).toBe(30);
});

Given(
  re("a worn ship docks in a (friendly berth at harbour 1, no shipyard|friendly berth at harbour 2|friendly port with a shipyard|neutral berth at harbour 2)"),
  (s, where: string) => {
    s.dockAt = {
      "friendly berth at harbour 1, no shipyard": { harbourStep: 1, shipyardStep: 0, inBerth: true, friendly: true },
      "friendly berth at harbour 2": { harbourStep: 2, shipyardStep: 0, inBerth: true, friendly: true },
      "friendly port with a shipyard": { harbourStep: 1, shipyardStep: 1, inBerth: false, friendly: true },
      "neutral berth at harbour 2": { harbourStep: 2, shipyardStep: 0, inBerth: true, friendly: false },
    }[where];
    s.ship = ship("carrack", { hull: "worn" });
  },
);
When("it refits", (s) => {
  const d = s.dockAt;
  s.refit = N.mayRefit(d) ? N.refitCost(N.shipRow("carrack").upkeep, d.friendly) : null;
});
Then(re("the refit is (refused|done at the upkeep cost|done at 1.5 times upkeep)"), (s, r: string) => {
  const up = N.shipRow("carrack").upkeep;
  if (r === "refused") expect(s.refit).toBeNull();
  else expect(s.refit).toBe(r === "done at the upkeep cost" ? up : 1.5 * up);
});

Given("a fleet of carracks with 15 supply", (s) => {
  s.fleet = N.newFleet("F", "Portugal", [ship("carrack"), ship("carrack")], { name: "A", might: 0, cunning: 0, logistics: 0 });
});
When(re("it (sails 4 zones|holds one coastal zone blockading for 8 days)"), (s, what: string) => {
  if (what === "sails 4 zones") N.useSupply(s.fleet, 4);
  else N.holdZone(s.fleet, 8, N.fleetStepDays(s.fleet, "sea"));
});
Then(re("it has (\\d+) supply left"), (s, n: string) => {
  for (const x of s.fleet.ships) expect(x.supply).toBe(num(n));
});

Given("a fleet of a carrack and a caravel", (s) => {
  // Lagos Bay to Madeira: straight through an uncharted zone, or round by a charted one.
  s.w = sea({ Lagos: coast("Portugal"), A: zone(), B: zone(), C: zone(), D: zone(), E: zone() }, ["Lagos~A", "A~B", "B~E", "A~C", "C~D", "D~E"]);
  launch(s, N.newFleet("F", "Portugal", [ship("carrack"), ship("caravel")], { name: "A", might: 0, cunning: 0, logistics: 0 }), "A");
});
Given("the next zone of its route is uncharted", (s) => {
  expect(N.planVoyage(s.w, s.sea, s.fleet, "E").path).toEqual(["B", "E"]);
  s.sea.uncharted = { Portugal: ["B"] };
});
When("the fleet plans its route", (s) => plan(s, "E"));
Then("the route avoids the uncharted zone", (s) => {
  expect(s.routeOk).toBe(true);
  expect(s.plan.path).toEqual(["C", "D", "E"]);
});

Given("a caravel docks in a friendly port with 60 supply and 0 colony stores", (s) => {
  s.ship = ship("caravel");
  expect([s.ship.supply, s.ship.colonyStores]).toEqual([60, 0]);
});
When("it loads 300 rations of colony stores", (s) => {
  s.loaded = N.loadColonyStores(s.ship, 300, "food");
});
Then("the caravel has 300 colony stores and still 60 supply", (s) => {
  expect([s.ship.colonyStores, s.ship.supply]).toEqual([300, 60]);
});
Then("the stores are paid as resupply is paid there: food from the province", (s) => {
  expect(s.loaded).toEqual({ paid: "food from the province", amount: 300 });
});

Given("a carrack with a crew of 60 has 0 supply", (s) => {
  s.fleet = N.newFleet("F", "Portugal", [ship("carrack", { supply: 0 })], { name: "A", might: 0, cunning: 0, logistics: 0 });
});
When("it sails 1 zone", (s) => {
  N.useSupply(s.fleet, 1);
});
Then("it has a crew of 54", (s) => {
  expect(s.fleet.ships[0].crew).toBe(54);
});
Then("it fights at no more than half strength until it docks", (s) => {
  const x = s.fleet.ships[0] as N.Ship;
  expect(N.fightingShare(x)).toBe(0.5);
  N.resupply(x, "food");
  expect(N.fightingShare(x)).toBe(54 / 60);
});

// ---------------------------------------------------------------- sailing (NAVY-089..097)

Given('a fleet of the country "Portugal" in the port "Lagos"', (s) => {
  s.w = sea(
    { Lagos: coast("Portugal"), Algarve: coast("Portugal", false), Alentejo: coast("Portugal", false), "Lagos Bay": zone(), "Cape St Vincent": zone(), Lisbon: coast("Portugal") },
    ["Lagos~Lagos Bay", "Lagos~Algarve", "Algarve~Alentejo", "Alentejo~Lisbon", "Lagos Bay~Cape St Vincent", "Cape St Vincent~Lisbon"],
  );
  launch(s, N.newFleet("F", "Portugal", [ship("carrack")], { name: "A", might: 0, cunning: 0, logistics: 0 }), "Lagos");
});
When("the shared planner plans its route", (s) => plan(s, "Lisbon"));
Then("the route uses only sea zones and port provinces entered through their harbour", (s) => {
  expect(s.routeOk).toBe(true);
  for (const p of s.plan.path as string[]) {
    const place = s.w.places[p] as Place;
    expect(place.terrain === "sea" || place.terrain === "ocean" || place.harbour === true).toBe(true);
  }
});

Given(re('a fleet of only "([^"]+)" ships with full crews and an admiral with Cunning 0'), (s, type: string) => {
  s.fleet = N.newFleet("F", "Portugal", [ship(type), ship(type)], { name: "A", might: 0, cunning: 0, logistics: 0 });
});
Given("there is no wind effect", (s) => {
  s.wind = "none";
});
When(re('it crosses one "(sea|ocean)" zone( with no wind effect)?'), (s, water: "sea" | "ocean") => {
  s.days = N.fleetStepDays(s.fleet, water, s.wind ?? "none");
});
Then(re("it needs ([\\d.]+) days"), (s, d: string) => {
  expect(s.days).toBe(Number(d));
});
Given("a fleet of a caravel and a cog", (s) => {
  s.fleet = N.newFleet("F", "Portugal", [ship("caravel"), ship("cog")], { name: "A", might: 0, cunning: 0, logistics: 0 });
});

When(re("its carrack plans a route into an ocean zone (\\d+) zones from a coast"), (s, d: string) => {
  const { w, distance } = oceanChain(num(d));
  s.w = w;
  const owner = Object.keys(s.known)[0]!;
  launch(s, N.newFleet("F", owner, [ship("carrack", { owner })], { name: "A", might: 0, cunning: 0, logistics: 0 }), "Bay");
  s.sea.coastDistance = distance;
  plan(s, `O${num(d)}`);
});
When("its galley plans a route into an ocean zone", (s) => {
  const { w, distance } = oceanChain(1);
  s.w = w;
  launch(s, N.newFleet("F", "Venice", [ship("galley", { owner: "Venice" })], { name: "A", might: 0, cunning: 0, logistics: 0 }), "Bay");
  s.sea.coastDistance = distance;
  plan(s, "O1");
  expect(N.fleetMayEnter(s.w, s.sea, s.fleet, "O1").reason).toBe("galleys stay off the ocean");
});

Given("a fleet of caravels that needs 2 days per ocean zone", (s) => {
  s.fleet = N.newFleet("F", "Portugal", [ship("caravel"), ship("caravel")], { name: "A", might: 0, cunning: 0, logistics: 0 });
  expect(N.fleetStepDays(s.fleet, "ocean")).toBe(2);
});
Given("a fleet of steamers", (s) => {
  s.fleet = N.newFleet("F", "Portugal", [ship("steamer")], { name: "A", might: 0, cunning: 0, logistics: 0 });
});
When(re("it sails (with|against) the wind"), (s, w: N.Wind) => {
  s.days = N.fleetStepDays(s.fleet, "ocean", w);
});
Then(re("it needs (\\d+) days per ocean zone"), (s, d: string) => {
  expect(s.days).toBe(num(d));
});
Then("it needs 1 day per zone", (s) => {
  expect(s.days).toBe(1);
  expect(N.fleetStepDays(s.fleet, "sea", "against")).toBe(1);
});

Given("a sea zone is in its storm season", (s) => {
  s.stormSeason = true;
});
Given("a lighthouse stands in that sea zone", (s) => {
  s.lighthouse = true;
});
When("ships at sea there suffer storm losses", (s) => {
  s.loss = N.stormLossFactor({ lighthouse: s.lighthouse });
  s.without = N.stormLossFactor({});
});
Then("the losses are half those of the same zone without a lighthouse", (s) => {
  expect(s.loss).toBe(s.without / 2);
});

Given("it is winter and the Baltic zones are frozen", (s) => {
  s.w = sea({ Danzig: coast("Teutonic Order"), "Gulf of Danzig": zone(), "Baltic Sea": zone(), "Gulf of Finland": zone() }, [
    "Danzig~Gulf of Danzig",
    "Gulf of Danzig~Baltic Sea",
    "Baltic Sea~Gulf of Finland",
  ]);
  launch(s, N.newFleet("F", "Teutonic Order", [ship("cog", { owner: "Teutonic Order" })]), "Danzig");
  s.sea.frozen = ["Baltic Sea", "Gulf of Finland"];
});
When("a fleet plans a route into a Baltic zone", (s) => plan(s, "Baltic Sea"));
Then("a fleet caught in a Baltic zone when it freezes is iced into the nearest port", (s) => {
  const caught = N.newFleet("G", "Teutonic Order", [ship("cog", { owner: "Teutonic Order" })]);
  launch(s, caught, "Gulf of Finland");
  expect(N.iceIn(s.w, s.sea, caught)).toBe("Danzig");
});

Given("an army of 1000 men, 100 horses and 5 guns with its food reserve", (s) => {
  s.army = { men: 1000, horses: 100, guns: 5 };
});
When("it boards ships in a port", (s) => {
  s.room = N.armyRoom(s.army.men, s.army.horses, s.army.guns);
});
Then("it takes the room of 1500 men plus its food reserve as loads", (s) => {
  expect(s.room).toEqual({ men: 1500, foodAsLoads: true });
});

Given("an army aboard small craft", (s) => {
  s.w = sea({ Lagos: coast("Portugal"), Bay: zone(), Cape: zone(), Ocean: zone(true) }, ["Lagos~Bay", "Bay~Cape", "Bay~Ocean"]);
  s.w.relations.wars.push(["Castile", "Portugal"]);
  launch(s, N.newFleet("C", "Castile", [ship("galleon", { owner: "Castile" })]), "Cape");
  launch(s, N.newFleet("F", "Portugal", [ship("small craft"), ship("small craft")]), "Bay");
  s.sea.armyAboard = ["F"];
  s.sea.coastDistance = { Ocean: 1 };
});
When("the route crosses an ocean zone or a zone with an enemy war fleet", (s) => {
  const f = s.sea.fleets["F"];
  s.verdicts = ["Ocean", "Cape"].map((z) => N.fleetMayEnter(s.w, s.sea, f, z).ok);
  s.routeOk = s.verdicts.some(Boolean);
});

Given('a fleet of 3 caravels under an admiral with Cunning 5 in the port "Lagos"', (s) => {
  s.w = lagosToArguin();
  launch(s, N.newFleet("Algarve", "Portugal", [ship("caravel"), ship("caravel"), ship("caravel")], { name: "Rui Vaz", might: 0, cunning: 5, logistics: 1 }), "Lagos");
});
Given('the route to "Arguin" is 1 coastal zone and 9 ocean zones, all within 3 zones of the African coast', (s) => {
  s.sea.coastDistance = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`O${i + 1}`, 1 + (i % 3)]));
});
Given("the north-east trade winds are with the fleet", (s) => {
  s.sea.wind = Object.fromEntries(["Lagos Bay", ...Array.from({ length: 9 }, (_, i) => `O${i + 1}`)].map((z) => [z, "with"]));
});
When('the fleet sails to "Arguin"', (s) => {
  s.toArguin = N.planVoyage(s.w, s.sea, s.fleet, "Arguin");
  s.voyage = N.sail(s.w, s.sea, s.fleet, "O9", 30);
});
Then("the crossing takes about 7 days", (s) => {
  expect(s.voyage.plan.path).toHaveLength(10);
  expect(Math.round(s.voyage.plan.arrive[9])).toBe(7);
});
Then("each caravel uses 10 supply and has 50 left", (s) => {
  for (const x of s.fleet.ships as N.Ship[]) expect(x.supply).toBe(50);
});
Then('the fleet cannot dock at "Arguin" because it is a canoe landing', (s) => {
  expect(s.toArguin.end).toBe("no route");
  expect(N.mayDock(N.newPort("Arguin", "sanhaja_zenaga", N.startPort({ tier: "landing", shipyard: false, holderKnows: [] }).harbour), "at peace")).toEqual({ ok: false, reason: "no port" });
});

// ---------------------------------------------------------------- at sea against an enemy (NAVY-098..107)

When("it fights a sea battle", (s) => {
  s.share = N.fightingShare(s.ship);
});
Then("it fights with three quarters of its strength", (s) => {
  expect(s.share).toBe(0.75);
});

Given('a fleet of the country "Portugal" in a sea battle', (s) => {
  s.battle = true;
});
When(re("(its admiral gives a Close order|one of its galleys rams)"), (s, t: string) => {
  s.boarding = N.boarding(t.includes("Close") ? "close order" : "galley rams");
});
Then("its soldiers aboard fight the enemy ship's crew and soldiers by the land bell rules on a single sector", (s) => {
  expect(s.boarding).toMatchObject({ sectors: 1, rules: "land bell" });
});
Then("the enemy ship is taken if its defenders break", (s) => {
  expect(s.boarding.takenIf).toBe("defenders break");
});

Given('the country "Portugal" has taken an enemy carrack with a crew of 60', (s) => {
  s.prize = ship("carrack", { owner: "Castile" });
});
When(re('the country "Portugal" puts (\\d+) of its fleet\'s sailors aboard'), (s, n: string) => {
  s.prizeResult = N.putPrizeCrew(s.prize, num(n), "Portugal");
});
Then(re("the carrack is (Portuguese|burned)"), (s, r: string) => {
  expect(s.prizeResult).toBe(r === "Portuguese" ? "captured" : "burned");
  if (r === "Portuguese") expect(s.prize.owner).toBe("Portugal");
});
Then("its own crew become prisoners or prize crew", (s) => {
  expect(N.prizeCrewDeserters(60)).toBe(15);
});
Given("a Portuguese fleet hunts traders in a zone", (s) => {
  s.hunting = true;
});
Given("an enemy cog strikes to the stronger Portuguese fleet", (s) => {
  s.prize = ship("cog", { owner: "Castile" });
});
When('the country "Portugal" puts a prize crew of 8 aboard', (s) => {
  s.prizeResult = N.putPrizeCrew(s.prize, 8, "Portugal");
});
Then('the cog belongs to the country "Portugal"', (s) => {
  expect(s.prizeResult).toBe("captured");
  expect(s.prize.owner).toBe("Portugal");
});

Given("an enemy galleon with a crew of 210 sinks in battle", (s) => {
  s.sunkCrew = 210;
});
When("the battle ends", (s) => {
  s.survive = N.sunkCrew(s.sunkCrew);
});
Then("70 of its crew swim ashore or are picked up by the winner as prisoners", (s) => {
  expect(s.survive.survivors).toBe(70);
});
Then("140 drown", (s) => {
  expect(s.survive.drowned).toBe(140);
});

Given(re('the pirate fleet of the "([^"]+)" has (\\d+) ships'), (s, coast: string, n: string) => {
  s.pirates = N.pirateFleet(coast, num(n), ["Home"]);
});
Given(re("this season trade ships (passed through|did not pass) its home zones"), (s, p: string) => {
  s.tradePassed = p === "passed through";
});
Given(re("(no|a) warship hunted there"), (s, h: string) => {
  s.hunted = h === "a";
});
When("the season ends", (s) => {
  N.pirateSeason(s.pirates, s.tradePassed, s.hunted);
});
Then(re("the pirate fleet has (\\d+) ships"), (s, n: string) => {
  expect(s.pirates.ships).toBe(num(n));
});
Given('the pirate fleet of the "Aegean corsairs"', (s) => {
  s.pirates = N.pirateFleet("Aegean corsairs", 4, ["Aegean"]);
});
When("it chooses where to hunt", (s) => {
  s.hunt = N.pirateHunt(s.pirates, { Aegean: ["Ionian", "Sea of Crete"], Ionian: ["Aegean", "Adriatic"], "Sea of Crete": ["Aegean", "Libyan Sea"] });
});
Then("it hunts trade ships in its home zones and one zone beyond", (s) => {
  expect([...s.hunt].sort()).toEqual(["Aegean", "Ionian", "Sea of Crete"]);
});
Then("it belongs to no country", (s) => {
  expect(s.pirates.owner).toBeNull();
});
When("a Ming fleet sinks 2 of them", (s) => {
  N.piratesLost(s.pirates, 2);
});

Given('the "Orang Laut" is a catalogue record', (s) => {
  s.pirates = N.pirateFleet("Orang Laut", 3, ["Malacca strait"]);
  expect(N.navalConfig.pirateCoasts["Orang Laut"].catalogueRecord).toBe(true);
});
When('the country "Malacca" hires the Orang Laut', (s) => {
  s.hired = N.hirePirates(s.pirates, "Malacca");
});
Then('the Orang Laut pirate fleet sails for the country "Malacca" as a hired fleet', (s) => {
  expect(s.hired).toBe(true);
  expect(s.pirates.owner).toBe("Malacca");
  expect(N.hirePirates(N.pirateFleet("Barbary corsairs", 2, []), "Tunis")).toBe(false);
});

Given('the country "Castile" is at war with the country "Portugal"', (s) => {
  s.w = lagosWaters();
  s.w.relations.wars.push(["Castile", "Portugal"]);
});
When('a Castilian fleet enters the sea zone of the port "Lagos"', (s) => {
  s.w.movers.push(createMover("CF", "fleet", "Castile", "Lagos Bay"));
  playDays(s.w, 1, 1);
});
Then('the port "Lagos" is blockaded', (s) => {
  expect(N.blockade(s.w, port(s, "Lagos"), "Lagos Bay")).toBe(true);
});
Then('the port "Lagos" can still muster and build', (s) => {
  const p = port(s, "Lagos");
  p.shipyardStep = 2;
  N.musterSailors({ id: "Lagos", people: { seafolk: 4600 } }, 25, p);
  expect(N.orderShip(p, "caravel", buyer(s, "Portugal")).ok).toBe(true);
});

Given('the port "Lagos" has 2 carracks in port and 1 caravel on a slipway', (s) => {
  const p = port(s, "Lagos");
  p.shipyardStep = 2;
  N.putIn(p, ship("carrack", { state: "in port" }));
  N.putIn(p, ship("carrack", { state: "in port" }));
  p.sailorsInPort = 25;
  expect(N.orderShip(p, "caravel", buyer(s, "Portugal")).ok).toBe(true);
});
When('a Castilian army takes the castle of the province "Lagos"', (s) => {
  s.taken = N.takePort(port(s, "Lagos"), "Castile");
});
Then('the 2 carracks and the caravel hull belong to the country "Castile"', (s) => {
  expect(s.taken.ships.filter((x: N.Ship) => x.type === "carrack" && x.owner === "Castile")).toHaveLength(2);
  expect(s.taken.hulls.map((h: N.Hull) => [h.type, h.owner])).toEqual([["caravel", "Castile"]]);
});

// ---------------------------------------------------------------- AI and the phone (NAVY-109..116)

Given('the country "Genoa" is an AI sea power', (s) => {
  s.seaPower = true;
});
Given('the fleet of its rival "Venice" grows', (s) => {
  s.rivalGrew = true;
});
When("the AI plans its ships", (s) => {
  s.buys = N.seaPowerBuys(!!s.rivalGrew);
});
Then('the country "Genoa" buys warships', (s) => {
  expect(s.buys).toBe("warships");
  expect(N.seaPowerBuys(false)).toBe("trade ships first");
});

Given('the country "Hungary" is an AI land power with 2 galleys', (s) => {
  s.galleys = [ship("galley", { owner: "Hungary", state: "in port" }), ship("galley", { owner: "Hungary", state: "in port" })];
});
When(re("(it is at peace|a war starts across water)"), (s, sit: string) => {
  s.action = N.landPowerShips(sit === "a war starts across water");
});
Then(re('the country "Hungary" (lays its galleys up|fits its galleys out)'), (s, a: string) => {
  expect(s.action).toBe(a === "lays its galleys up" ? "lay up" : "fit out");
});

Given('the AI country "Portugal" holds the great port "Lisbon"', (s) => {
  s.aiPorts = [
    { province: "Lisbon", tier: "great" },
    { province: "Porto", tier: "port" },
  ];
});
When("the AI places its officials", (s) => {
  s.officials = N.aiPortOfficials(s.aiPorts);
});
Then('a customs officer runs the province "Lisbon"', (s) => {
  expect(s.officials).toEqual({ Lisbon: "customs officer" });
});

Given("an AI fleet plans a voyage", (s) => {
  s.w = lagosToArguin();
  s.known = { Portugal: ["S1", "S4"], Castile: ["S1", "S4"] };
  launch(s, N.newFleet("AI", "Castile", [ship("caravel", { owner: "Castile" })], { name: "A", might: 0, cunning: 0, logistics: 0 }), "Lagos Bay");
  launch(s, N.newFleet("PL", "Portugal", [ship("caravel")], { name: "B", might: 0, cunning: 0, logistics: 0 }), "Lagos Bay");
  s.sea.coastDistance = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`O${i + 1}`, 1]));
  s.sea.wind = { O1: "with", O2: "against" };
});
When("its route is computed", (s) => {
  s.ai = N.planVoyage(s.w, s.sea, s.sea.fleets["AI"], "O9");
  s.player = N.planVoyage(s.w, s.sea, s.sea.fleets["PL"], "O9");
});
Then("it uses the same sea-zone graph and wind calendar as the player", (s) => {
  expect(s.ai.path).toEqual(s.player.path);
  expect(s.ai.arrive).toEqual(s.player.arrive);
});

Given(re("an AI fleet is (\\d+) zones from the player's realm and ports"), (s, d: string) => {
  s.distance = num(d);
});
Given(re("the AI country is (at peace|at war) with the player"), (s, w: string) => {
  s.atWar = w === "at war";
});
When("the day loop runs", (s) => {
  s.runsAi = N.runsFleetAi(s.distance, s.atWar);
});
Then(re("the fleet (has its voyage resolved as a day count|runs its fleet AI)"), (s, r: string) => {
  expect(s.runsAi).toBe(r === "runs its fleet AI");
});

Given("a path is cached for caravels at research step S4 in March", (s) => {
  s.cache = N.pathCache<string[]>();
  s.cache.get("caravel", "S4", 3, () => ["A", "B"]);
  expect(s.cache.computed).toBe(1);
});
When("the country learns S5", (s) => {
  s.cache.invalidate();
  s.path = s.cache.get("caravel", "S5", 3, () => ["A", "C"]);
});
Then("the cached path is recomputed", (s) => {
  expect(s.cache.computed).toBe(2);
  expect(s.path).toEqual(["A", "C"]);
});
Then("a path is otherwise reused for the same ship class, research step and month", (s) => {
  s.cache.get("caravel", "S5", 3, () => ["X"]);
  expect(s.cache.computed).toBe(2);
  s.cache.get("caravel", "S5", 4, () => ["X"]);
  expect(s.cache.computed).toBe(3);
});

Given("a port with sailors in port and ships in port", (s) => {
  const p = port(s, "Lagos");
  p.sailorsInPort = 100;
  p.waitedMonths = 8;
  N.putIn(p, ship("carrack", { state: "in port", monthsSinceStep: 35 }));
  s.w = lagosWaters();
  s.before = { sailors: p.sailorsInPort, hull: p.ships[0]!.hull };
});
When("days pass inside a month", (s) => {
  playDays(s.w, 1, 15);
  const p = port(s, "Lagos");
  s.during = { sailors: p.sailorsInPort, hull: p.ships[0]!.hull };
});
Then("sailors in port and ship states change only at the monthly province update", (s) => {
  expect(s.during).toEqual(s.before);
  N.portMonth(port(s, "Lagos"));
  const p = port(s, "Lagos");
  expect(p.sailorsInPort).toBeLessThan(s.before.sailors);
  expect(p.ships[0]!.hull).toBe("worn");
});

Given("two large fleets meet in a sea zone", (s) => {
  s.wanted = 5;
});
When("the sea battle is set up", (s) => {
  s.sectors = N.seaBattleSectors(s.wanted);
});
Then("it is fought on at most 3 sectors", (s) => {
  expect(s.sectors).toBe(3);
});

// ---------------------------------------------------------------- decided 17 October (D-NAVY-*)

Given(re('the official "([^"]+)" is a customs officer who ran the port province "(\\w+)" for (\\d+) years'), (s, name: string, _p: string, y: string) => {
  s.official = { name, type: "customs officer", years: num(y) };
});
When(re('the country "Portugal" commissions "([^"]+)" as admiral'), (s, name: string) => {
  s.commissioned = N.commissionAdmiral(name, s.official.type, { yearsServed: s.official.years, inPortProvince: true });
});
Then(re("his (\\d+) years in a port count as (\\d+)"), (s, _y: string, c: string) => {
  expect(s.commissioned.countedYears).toBe(num(c));
});

Given(re("an admiral whose wage is (\\d+) gold a month"), (s, w: string) => {
  s.wage = num(w);
});
When('the country "Portugal" commissions him', (s) => {
  s.pay = { sea: N.admiralPay(s.wage, true), port: N.admiralPay(s.wage, false) };
});
Then(re('the country "Portugal" pays (\\d+) gold of commission'), (s, g: string) => {
  expect(s.pay.sea.commission).toBe(num(g));
});
Then(re("he is paid (\\d+) gold a month while at sea and (\\d+) in port"), (s, a: string, b: string) => {
  expect([s.pay.sea.wage, s.pay.port.wage]).toEqual([num(a), num(b)]);
});

Given(re('the official "([^"]+)" is a colonial governor'), (s, name: string) => {
  s.official = { name, type: "colonial governor" };
});
When(re('the country "Portugal" tries to commission "([^"]+)" as admiral'), (s, name: string) => {
  try {
    N.commissionAdmiral(name, s.official.type);
    s.refused = false;
  } catch {
    s.refused = true;
  }
});
Then("the commission is refused", (s) => {
  expect(s.refused).toBe(true);
});

Given(re('a "([\\w ]+)"'), (s, type: string) => {
  s.shipType = type;
});
Then(re("it (can|cannot) be set to trade"), (s, can: string) => {
  expect(N.shipRow(s.shipType).family === "trade" || s.shipType === "galleon").toBe(can === "can");
  expect(N.shipRow(s.shipType).hold !== undefined).toBe(can === "can");
});

Given(re('a galleon with a hull "(\\w+)" and a strength of (\\d+)'), (s, h: N.HullStep, st: string) => {
  s.hull = h;
  s.strength = num(st);
});
When(re("it takes (\\d+) hits in a sea battle"), (s, hits: string) => {
  s.after = N.battleHull(s.hull, num(hits), s.strength);
});
Then(re('its hull is "(\\w+)"'), (s, h: string) => {
  expect(s.after === "sinks" ? "sunk" : s.after).toBe(h);
});

Given(re('a Portuguese fleet docks at "(\\w+)", a port of a subject of "Portugal" with (\\d+) food in store'), (s, p: string, food: string) => {
  expect(N.dockingRight("a subject")).toBe("food");
  s.store = { id: p, food: num(food) };
});
When(re("it resupplies (\\d+) rations"), (s, r: string) => {
  s.dock = N.dockInSubjectPort(s.store, num(r));
});
Then(re('the province "(\\w+)" has (\\d+) food in store'), (s, _p: string, food: string) => {
  expect(s.store.food).toBe(num(food));
});
Then('"Portugal" owes nothing', (s) => {
  expect(s.dock.owed).toBe(0);
});

Given('the country "Venice" is an AI sea power by its catalogue personality', (s) => {
  s.seaPower = true;
});
Given(re("it can call (\\d+) seafolk to sea"), (s, n: string) => {
  s.callableSeafolk = num(n);
});
When("it buys ships in peace", (s) => {
  s.buys = N.seaPowerBuys(false);
});
Then("it buys trade ships before warships", (s) => {
  expect(s.buys).toBe("trade ships first");
});
Then(re("it keeps (\\d+) of its seafolk always at sea"), (s, n: string) => {
  expect(N.seaPowerAtSea(s.callableSeafolk)).toBe(num(n));
});

Then(re('the province "Arguin" has (\\d+) extra seafolk and (\\d+) small craft only'), (s, sf: string, sc: string) => {
  expect([s.start.extraSeafolk, s.start.smallCraft, s.start.smallCraftOnly]).toEqual([num(sf), num(sc), true]);
});

Given(re('a dhow of a Gujarati country that (knows|does not know) T5 "Monsoon sailing calendars"'), (s, k: string) => {
  s.known = { Gujarat: k === "knows" ? ["T5"] : [] };
});
When(re('it plans a route into the ocean zone "([^"]+)"'), (s, z: string) => {
  s.w = sea({ Surat: coast("Gujarat"), Bay: zone(), [z]: zone(true) }, ["Surat~Bay", `Bay~${z}`]);
  launch(s, N.newFleet("F", "Gujarat", [ship("dhow", { owner: "Gujarat" })], { name: "A", might: 0, cunning: 0, logistics: 0 }), "Bay");
  plan(s, z);
});

Given(re('the province "Lagos" has (\\d+) men who can be called: (\\d+) seafolk, (\\d+) homeless and (\\d+) others'), (s, _t: string, a: string, b: string, c: string) => {
  s.split = N.byShare({ seafolk: num(a), homeless: num(b), other: num(c) }, 300);
});
Then(re("(\\d+) seafolk, (\\d+) homeless and (\\d+) others are taken"), (s, a: string, b: string, c: string) => {
  expect(s.split).toEqual({ seafolk: num(a), homeless: num(b), other: num(c) });
});

Given(re('the province "Lagos" has (\\d+) fighting-age men, of whom about (\\d+) can go to sea'), (s, men: string, sea: string) => {
  const seafolk = s.lagosProvince.people.seafolk as number;
  near(seafolk * N.navalConfig.fightingAgeShare, num(men), 1);
  near(N.callableToSea({ seafolk }).seafolk!, num(sea), 5);
});
Then(re('the country "Portugal" pays (\\d+) gold of bounty'), (s, g: string) => {
  expect(N.musterBounty(s.muster.count)).toBe(num(g));
});
Then(re('the province "Lagos" loses (\\d+) percent of its fish while they serve'), (s, pct: string) => {
  expect(Math.round(N.fishLostShare(s.muster.byClass.seafolk, 4600) * 100)).toBe(num(pct));
});
Then(re("the (\\d+) sailors are sailors in port at Lagos after (\\d+) days"), (s, n: string, d: string) => {
  expect(port(s, "Lagos").sailorsInPort).toBe(num(n));
  expect(N.musterDays()).toBe(num(d));
});

Given(re('Genoese trade ships call at the port "(\\w+)"'), (s) => {
  s.call = true;
});
Given(re('the port "(\\w+)" has hired (\\d+) Genoese sailors this year'), (s, _p: string, n: string) => {
  s.hired = num(n);
});
When(re('the country "Portugal" hires (\\d+) more'), (s, n: string) => {
  s.hire = N.mayHireForeignSailors(s.call, s.hired, num(n));
});
Then(re("the hire is (done|over the year's limit)"), (s, r: string) => {
  expect(s.hire).toBe(r === "done");
});

Given(re('the pirate base of the "([^"]+)" is the province "(\\w+)"'), (s, coast: string, p: string) => {
  expect(N.pirateBase(coast)).toBe(p);
  s.pirates = N.pirateFleet(coast, 3, ["Home"]);
  s.base = p;
});
When("the base is burned", (s) => {
  expect(N.burnPirateBase(s.pirates, s.base)).toBe(true);
});
Then("the pirate fleet ends until trade brings it back", (s) => {
  expect(s.pirates.ended).toBe(true);
  N.pirateSeason(s.pirates, true, false);
  expect(s.pirates.ships).toBe(0);
  N.piratesReturn(s.pirates, true, false);
  expect([s.pirates.ended, s.pirates.ships]).toEqual([false, N.navalConfig.pirates.startShips]);
});

Given("the pirate config of the design", (s) => {
  s.pirateConfig = N.navalConfig.pirates;
});
Then(re('the pirate fleet of the "([^"]+)" starts with (\\d+) ships'), (s, coast: string, n: string) => {
  expect(coast in N.navalConfig.pirateCoasts).toBe(true);
  expect(s.pirateConfig.startShips).toBe(num(n));
});
Then(re("a pirate season lasts (\\d+) months"), (s, n: string) => {
  expect(s.pirateConfig.seasonMonths).toBe(num(n));
});

// ---------------------------------------------------------------- frozen seas (X-17, NAVY-125)

const monthNumber: Record<string, number> = { January: 1, February: 2, March: 3, April: 4, May: 5, June: 6, July: 7, August: 8, September: 9, October: 10, November: 11, December: 12 };
Given(re("it is (January|February|March|April|May|June|July|August|September|October|November|December)"), (s, m: string) => {
  s.month = monthNumber[m];
});
When(re('a fleet plans a route into the "([^"]+)"'), (s, z: string) => {
  s.w = sea({ Port: coast("Sweden"), Bay: zone(), [z]: zone() }, ["Port~Bay", `Bay~${z}`]);
  launch(s, N.newFleet("F", "Sweden", [ship("cog", { owner: "Sweden" })], { name: "A", might: 0, cunning: 0, logistics: 0 }), "Bay");
  s.sea.frozen = N.frozenZones(s.month);
  plan(s, z);
});
Then(re('a port on the "([^"]+)" (can|cannot) launch or take in ships'), (s, z: string, c: string) => {
  expect(N.portIceBound(z, s.month)).toBe(c === "cannot");
});

// ---------------------------------------------------------------- fleets at sea (NAVY-150..144, feedback 122..127)

Given(re("a fleet whose leader has Cunning (\\d+)"), (s, c: string) => {
  s.seaCunning = num(c);
});
Given("a fleet with no leader", (s) => {
  s.seaCunning = null;
});
Then(re("the fleet sights enemy fleets in its own sea zone within (\\d+) tiles"), (s, n: string) => {
  expect(N.seaEngageTiles(s.seaCunning)).toBe(num(n));
});

const shipList = (t: string): string[] => t.split(",").map((x) => x.trim()).filter(Boolean);
Given(re("a fleet made up of ([a-z ]+(?:, [a-z ]+)*)"), (s, list: string) => {
  s.seaTypes = shipList(list);
});
When("a leader is appointed to the fleet", (s) => {
  s.post = N.fittingPost(s.seaTypes);
});
Then(re('the leader holds the post "(admiral|commodore|viceroy)"'), (s, post: string) => {
  expect(s.post).toBe(post);
});

Given(re('a fleet leader with Might (\\d+) in the post "(admiral|commodore|viceroy)"'), (s, might: string, post: string) => {
  expect(N.isPost(post)).toBe(true);
  s.leaderMight = num(might);
  s.post = post;
});
Then(re("his Might counts as ([\\d.]+) in a sea battle"), (s, might: string) => {
  near(N.battleMight(s.leaderMight, s.post), num(might));
});

Given(
  re("a ([a-z ]+) fleet (with a leader|with no leader), its realm (at war|at peace), (lying still in a sea zone|sailing a voyage|in a sea battle|running for port|landing an army|lying in port)"),
  (s, type: string, leader: string, war: string, where: string) => {
    s.blockadeFleet = {
      types: [type],
      hasLeader: leader === "with a leader",
      atWar: war === "at war",
      atSea: where !== "lying in port",
      sailing: where === "sailing a voyage",
      inBattle: where === "in a sea battle",
      fleeing: where === "running for port",
      landing: where === "landing an army",
    };
  },
);
Then(re("the fleet (blockades|does not blockade)"), (s, b: string) => {
  expect(N.blockades(s.blockadeFleet)).toBe(b === "blockades");
});

Given(re("a sea zone that (no blockade closes|a blockade closes)"), (s, b: string) => {
  s.zoneBlockaded = b === "a blockade closes";
});
Given(re("(no commodore|a commodore) of its realm lies there"), (s, c: string) => {
  s.ownCommodore = c === "a commodore";
});
Then(re("a trade ship of the blocked realm (passes|may not pass) the zone"), (s, p: string) => {
  expect(N.tradeShipPasses(s.zoneBlockaded, s.ownCommodore)).toBe(p === "passes");
});

Given(re("a closed port whose sea trade value is ([\\d.]+) gold a month at a trade ratio of ([\\d.]+)"), (s, v: string, r: string) => {
  s.portSeaValue = num(v);
  s.portRatio = num(r);
});
When(re('the month\'s prize money is taken by a fleet under its "(admiral|commodore|viceroy)"'), (s, post: N.Post) => {
  s.prize = N.blockadePrize(s.portSeaValue, s.portRatio, post);
});
Then(re("the blockading realm takes ([\\d.]+) gold"), (s, g: string) => {
  near(s.prize, num(g));
});

Given("the blockade config of the design", (s) => {
  s.peaceWeight = N.blockadePeaceWeight();
});
Then(re("each closed port counts as ([\\d.]+) of an occupied province when its side weighs peace"), (s, w: string) => {
  near(s.peaceWeight, num(w));
});
