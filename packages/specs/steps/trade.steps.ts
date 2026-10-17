import { expect } from "vitest";
import { Rng } from "@ph/engine";
import * as T from "@ph/engine/domain/trade";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("trade");

// ---------------------------------------------------------------- helpers

function W(s: Scenario): T.TradeWorld {
  return (s.w ??= T.createTradeWorld());
}

/** Actions queued by Givens that "the trade rules are applied" runs. */
function later(s: Scenario, fn: () => void): void {
  (s.pending ??= []).push(fn);
}

function runPending(s: Scenario): void {
  const list: (() => void)[] = s.pending ?? [];
  s.pending = [];
  for (const fn of list) fn();
}

const adjectives: Record<string, string> = {
  French: "France",
  Burgundian: "Burgundy",
  Venetian: "Venice",
  Portuguese: "Portugal",
  Florentine: "Florence",
  Ottoman: "Ottoman",
  Milanese: "Milan",
  Ryukyuan: "Ryukyu",
  English: "England",
  Castilian: "Castile",
};

function countryOfAdjective(adj: string): string {
  const c = adjectives[adj];
  if (!c) throw new Error(`Unknown adjective ${adj}`);
  return c;
}

function city(s: Scenario, id: string, owner: string | null, init: Partial<T.ProvinceTrade> = {}): T.ProvinceTrade {
  const p = W(s).provinces.get(id);
  if (p) {
    Object.assign(p, { owner, ...init });
    return p;
  }
  return T.addProvince(W(s), id, { owner, size: "town", market: "weekly_market", ...init });
}

let traderSeq = 0;
function caravan(s: Scenario, owner: string, init: Partial<T.Trader> = {}): T.Trader {
  const id = init.id ?? `caravan-${++traderSeq}`;
  return T.addTrader(W(s), { id, name: id, kind: "pack_caravan", owner, home: init.home ?? "Troyes", ...init });
}

function stops(text: string): string[] {
  return text.split("▸").map((x) => x.trim());
}

function near(actual: number, expected: number, digits = 2): void {
  expect(actual).toBeCloseTo(expected, digits);
}

const roman: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8 };

// ---------------------------------------------------------------- shared

Given("the trade config of the design", (s) => {
  s.config = T.tradeConfig;
});

When("the trade rules are applied", (s) => runPending(s));

// ---------------------------------------------------------------- traders

Given("the country {string} has a pack caravan {string} with {int} market folk", (s, owner: string, name: string, crew: number) => {
  s.trader = caravan(s, owner, { id: name, name });
  expect(s.trader.crew).toEqual({ class: "market_folk", count: crew });
});

Given("its route is {string} on a loop of {int} days", (s, route: string, days: number) => {
  for (const c of new Set(stops(route))) city(s, c, s.trader.owner);
  const r = T.setRoute(W(s), s.trader.owner, s.trader.id, stops(route));
  expect(r.ok).toBe(true);
  s.loopDays = days;
});

Given("it is in {string} on day {int} of {int} to {string}", (s, at: string, day: number, of: number, to: string) => {
  s.trader.position = at;
  s.progress = `day ${day} of ${of} to ${to}`;
});

Given("its purse holds {float} of {int} gold", (s, purse: number, size: number) => {
  s.trader.purse = purse;
  expect(T.kindStats(s.trader.kind).purse).toBe(size);
});

When("the player opens the trader card", (s) => {
  s.card = T.traderCard(s.trader, { loopDays: s.loopDays, progress: s.progress });
});

Then("the card shows kind, crew, route, loop days, position, purse, last collections, fees and tolls, danger and an upkeep of {float} gold a month", (s, upkeep: number) => {
  const card: T.TraderCard = s.card;
  expect(card.kind).toBe("pack_caravan");
  expect(card.crew).toBe("50 market folk");
  expect(card.route).toBe("Troyes ▸ Dijon ▸ Geneva ▸ Dijon ▸ Troyes");
  expect(card.loopDays).toBe(38);
  expect(card.position).toBe("Langres, day 12 of 15 to Dijon");
  expect(card.purse).toBe("6.1 / 10");
  expect(card.lastCollections).toEqual([]);
  expect(card.feesAndTolls).toBe(0);
  expect(card.danger).toBeTruthy();
  expect(card.upkeep).toBe(upkeep);
});

Given("the caravan {string} has home city {string} and no route", (s, name: string, home: string) => {
  s.trader = caravan(s, "France", { id: name, name, home });
  s.trader.position = "Langres";
});

When("the day loop runs", (s) => {
  s.heading = T.destination(s.trader);
});

Then("the caravan heads for {string}", (s, home: string) => {
  expect(s.heading).toBe(home);
});

Given("the country {string} has a port {string} with enough sailors", (s, owner: string, port: string) => {
  city(s, port, owner, { port: true });
  s.country = owner;
  s.port = port;
});

When(/^"([^"]+)" buys a carrack in "([^"]+)" and sets it to Trade$/, (s, owner: string, port: string) => {
  s.ship = T.setShipToTrade(W(s), owner, "carrack-1", "carrack", port);
});

When(/^"([^"]+)" turns a cog it owns to trade$/, (s, owner: string) => {
  s.ship = T.setShipToTrade(W(s), owner, "cog-1", "cog", s.port);
});

Then("it has a trade ship", (s) => {
  expect(s.ship).not.toBeNull();
  expect(T.isSeaKind(s.ship.kind)).toBe(true);
  expect(T.tradersOf(W(s), s.country)).toContain(s.ship);
});

When(/^(a French army takes a Burgundian caravan and keeps it|a lord of "France" gifts a caravan to the crown|an event gives "France" a trader)$/, (s, way: string) => {
  const w = W(s);
  s.before = T.tradersOf(w, "France").length;
  if (way.startsWith("a French army")) {
    T.setWar(w, "France", "Burgundy");
    const t = caravan(s, "Burgundy", { home: "Dijon" });
    expect(T.meetArmy(w, t, "France", false)).toBe("captured");
    T.gainTrader(w, "France", t, "capture", "Troyes");
  } else if (way.startsWith("a lord")) {
    const t = caravan(s, "France", { lord: "Count of Champagne" });
    T.gainTrader(w, "France", t, "gift", "Troyes");
  } else {
    T.gainTrader(w, "France", { ...caravan(s, "Event"), owner: "Event" }, "event", "Troyes");
  }
});

Then("the country {string} has one more trader", (s, owner: string) => {
  expect(T.tradersOf(W(s), owner).length).toBe(s.before + 1);
});

Given("the caravan {string} has a crew of {int} market folk", (s, name: string, crew: number) => {
  s.trader = caravan(s, "France", { id: name, name, home: "Troyes" });
  expect(s.trader.crew.count).toBe(crew);
  s.slots = [
    { building: "market", class: "market_folk", slots: 1500, filled: 1490 },
    { building: "warehouse", class: "market_folk", slots: 900, filled: 860 },
  ] satisfies T.JobSlots[];
});

When("the player dismisses it", (s) => {
  s.overflowed = T.dismissTrader(W(s), s.trader.id, s.slots);
});

Then("the caravan is gone", (s) => {
  expect(W(s).traders.has(s.trader.id)).toBe(false);
});

Then("its {int} market folk overflow into the emptiest slots of {string}", (s, n: number, home: string) => {
  expect(s.trader.home).toBe(home);
  expect(s.overflowed).toBe(n);
  // The warehouse had 40 empty slots against the market's 10: it fills first.
  expect(s.slots[1].filled).toBeGreaterThan(860 + 25);
  expect(s.slots[0].filled + s.slots[1].filled).toBe(1490 + 860 + n);
});

Given("the caravan {string} has an empty purse and no route", (s, name: string) => {
  s.trader = caravan(s, "France", { id: name, name });
  expect(s.trader.purse).toBe(0);
  expect(s.trader.route).toBeNull();
});

Given("its upkeep has been unpaid for {int} months", (s, months: number) => {
  s.trader.unpaidMonths = months;
  later(s, () => {
    if (months === 0) {
      s.payer = { gold: 100 };
      s.upkeep = T.chargeUpkeep(W(s), s.trader, s.payer);
    } else s.upkeep = { paid: 0, lost: T.checkUnpaid(W(s), s.trader) };
  });
});

Then(/^the caravan (still costs [\d.]+ gold a month|still exists|is gone and its crew leave)$/, (s, state: string) => {
  const cost = /^still costs ([\d.]+)/.exec(state)?.[1];
  if (cost !== undefined) {
    expect(s.upkeep.paid).toBe(Number(cost));
    expect(s.payer.gold).toBe(100 - Number(cost));
  } else if (state === "still exists") expect(W(s).traders.has(s.trader.id)).toBe(true);
  else {
    expect(W(s).traders.has(s.trader.id)).toBe(false);
    expect(W(s).events).toContainEqual({ type: "TraderLost", trader: s.trader.id });
  }
});

Given("the country {string} has {int} traders", (s, owner: string, n: number) => {
  city(s, "Venice", owner);
  for (let i = 0; i < n; i++) caravan(s, owner, { home: "Venice" });
  s.country = owner;
});

When(/^"([^"]+)" founds another trader with gold and market folk to spare$/, (s, owner: string) => {
  T.country(W(s), owner).treasury = 1000;
  const r = T.foundTrader(W(s), owner, "new-trader", "pack_caravan", "Venice", [{ building: "market", class: "market_folk", slots: 3000, filled: 3000 }]);
  expect(r.ok).toBe(true);
});

Then("it has {int} traders", (s, n: number) => {
  expect(T.tradersOf(W(s), s.country).length).toBe(n);
});

Given("the cog {string} is a Venetian trade ship with {int} gold in its purse", (s, name: string, gold: number) => {
  city(s, "Venice", "Venice", { port: true });
  city(s, "Ragusa", "Ragusa", { port: true, value: 10, ratio: 50 });
  s.trader = T.addTrader(W(s), { id: name, name, kind: "cog_junk_dhow", owner: "Venice", home: "Venice", purse: gold });
});

When(/^"([^"]+)" presses it into war$/, (s) => {
  T.pressIntoWar(s.trader);
});

Then("it stops trading", (s) => {
  expect(s.trader.trading).toBe(false);
  const r = T.enterProvince(W(s), s.trader, "Ragusa");
  expect(r.collected).toBe(0);
});

Then("it keeps its {int} gold until it next reaches a Venetian port", (s, gold: number) => {
  expect(s.trader.purse).toBe(gold);
  const r = T.enterProvince(W(s), s.trader, "Venice");
  expect(r.deposited).toBe(gold);
});

Given("the lord {string} runs a caravan from {string}", (s, lord: string, home: string) => {
  W(s).lords.set(lord, { id: lord, liege: "France", wealth: 0 });
  city(s, home, "France", { lord });
  s.trader = caravan(s, "France", { lord, home, purse: 4 });
  s.lord = lord;
});

When("the caravan deposits", (s) => {
  s.deposited = T.enterProvince(W(s), s.trader, s.trader.home).deposited;
});

Then("the gold goes to the lord's wealth", (s) => {
  expect(s.deposited).toBe(4);
  expect(W(s).lords.get(s.lord)!.wealth).toBe(4);
  expect(T.country(W(s), "France").treasury).toBe(0);
});

Then("the crown can see the caravan but cannot steer it", (s) => {
  expect([...W(s).traders.values()]).toContain(s.trader);
  expect(T.setRoute(W(s), "France", s.trader.id, ["Dijon", "Troyes"]).ok).toBe(false);
  expect(T.setRoute(W(s), s.lord, s.trader.id, ["Dijon", "Troyes"]).ok).toBe(true);
});

// ---------------------------------------------------------------- kinds

Then(/^a "([^"]+)" has era (\w+), hold ([\d.]+), purse (\d+), crew (\d+) ([a-z ]+), founding cost (\d+) and upkeep ([\d.]+) a month$/, (s, kind: string, era: string, hold: string, purse: string, crew: string, cls: string, found: string, upkeep: string) => {
  const k = T.kindStats(T.kindOf(kind));
  expect(k.era).toBe(roman[era]);
  expect(k.hold).toBe(Number(hold));
  expect(k.purse).toBe(Number(purse));
  expect(k.crew).toEqual({ class: cls.replace(/ /g, "_"), count: Number(crew) });
  expect(k.found).toBe(Number(found));
  expect(k.upkeep).toBe(Number(upkeep));
});

const groundOf: Record<string, string> = { Champagne: "farmland", Sahara: "desert" };

Given("an army takes {int} days to cross the province {string}", (s, days: number, p: string) => {
  s.armyDays = days;
  s.ground = groundOf[p];
});

When("a {string} crosses it", (s, kind: string) => {
  const k = T.kindOf(kind);
  if (!T.isLandKind(k)) throw new Error("land kind expected");
  s.days = T.traderStepDays(k, s.armyDays, s.ground);
});

Then("it takes {float} days", (s, days: number) => {
  near(s.days, days);
});

Given("the pass {string} is closed by snow this season", (s, pass: string) => {
  s.pass = { id: pass, snowedIn: true };
});

Then("no caravan can use the {string} pass", (s) => {
  expect(T.mayUsePass(s.pass)).toBe(false);
  expect(T.mayUsePass({ snowedIn: false })).toBe(true);
});

Then("traders never use march orders and have no column penalty", () => {
  expect(T.traderMovement.marchOrders).toBe(false);
  expect(T.traderMovement.columnPenalty).toBe(false);
});

Given(/^the country "([^"]+)" (knows|doesn't know) "([A-Z]\d+)[^"]*"$/, (s, c: string, knows: string, id: string) => {
  const inv = T.country(W(s), c).inventions;
  if (knows === "knows") inv.add(id);
  s.country = c;
});

Given("its home province is {string}", (s, ground: string) => {
  s.homeGround = ground;
});

Then(/^it (may|may not) found a camel caravan$/, (s, may: string) => {
  expect(T.mayFoundCamelCaravan(T.country(W(s), s.country).inventions, s.homeGround)).toBe(may === "may");
});

Given("the province {string} has a shore tile on the Seine", (s, p: string) => {
  city(s, p, "France");
  s.shore = { [p]: ["Seine"] };
});

When(/^"([^"]+)" founds a river barge in "([^"]+)"$/, (s, owner: string, home: string) => {
  expect(T.mayFoundRiverBarge({ shoreRivers: s.shore[home] })).toBe(true);
  s.trader = T.addTrader(W(s), { id: "barge", kind: "river_barge", owner, home, river: "Seine" });
});

Then("the barge may only enter provinces with shore tiles on the Seine", (s) => {
  expect(T.bargeMayEnter(s.trader, { shoreRivers: ["Seine"] })).toBe(true);
  expect(T.bargeMayEnter(s.trader, { shoreRivers: ["Loire"] })).toBe(false);
  expect(T.bargeMayEnter(s.trader, { shoreRivers: [] })).toBe(false);
});

Given(/^the country "([^"]+)" knows "(B9) [^"]*" and "([^"]+)" has a paved road$/, (s, c: string, id: string, home: string) => {
  T.country(W(s), c).inventions.add(id);
  s.country = c;
  s.homeRoad = { [home]: "paved_road" };
});

Then(/^"([^"]+)" may found a wagon train in "([^"]+)"$/, (s, c: string, home: string) => {
  expect(T.mayFoundWagonTrain(T.country(W(s), c).inventions, s.homeRoad[home])).toBe(true);
  expect(T.mayFoundWagonTrain(new Set(), s.homeRoad[home])).toBe(false);
  expect(T.mayFoundWagonTrain(T.country(W(s), c).inventions, "road")).toBe(false);
});

Then("it moves only on land with at least a road", () => {
  expect(T.wagonMayEnter("road")).toBe(true);
  expect(T.wagonMayEnter("paved_road")).toBe(true);
  expect(T.wagonMayEnter("track")).toBe(false);
  expect(T.wagonMayEnter("none")).toBe(false);
});

Given(/^"([^"]+)" and "([^"]+)" have rail stations and "([^"]+)" does not$/, (s, a: string, b: string, c: string) => {
  s.stations = { [a]: { railStation: true }, [b]: { railStation: true }, [c]: { railStation: false } };
});

Then("rail freight may run {string}", (s, leg: string) => {
  const [a, b] = stops(leg);
  expect(T.railLegOk(s.stations[a!], s.stations[b!])).toBe(true);
});

Then("not a leg to {string}", (s, to: string) => {
  for (const from of Object.keys(s.stations)) if (from !== to) expect(T.railLegOk(s.stations[from], s.stations[to])).toBe(false);
});

Then("a trading {string} has hold {float}, purse {int} and upkeep {float} a month", (s, ship: string, hold: number, purse: number, upkeep: number) => {
  const k = T.kindStats(T.kindOf(ship));
  expect(k.hold).toBe(hold);
  expect(k.purse).toBe(purse);
  expect(k.upkeep).toBe(upkeep);
});

Given("a trade {string} plans a route", (s, ship: string) => {
  s.shipKind = T.kindOf(ship);
});

Then("it enters port provinces only", (s) => {
  const w = W(s);
  T.addProvince(w, "Venice", { owner: "Venice", port: true, size: "city" });
  T.addProvince(w, "Padua", { owner: "Venice", size: "city" });
  const t = T.addTrader(w, { id: "cog", kind: s.shipKind, owner: "Venice", home: "Venice" });
  expect(T.mayEnter(w, t, "Venice")).toBe(true);
  expect(T.mayEnter(w, t, "Padua")).toBe(false);
});

Then("it stays in enclosed seas", (s) => {
  expect(T.shipMayEnterZone(s.shipKind, { id: "Adriatic", enclosed: true, ports: [] })).toBe(true);
  expect(T.shipMayEnterZone(s.shipKind, { id: "Bay of Biscay", enclosed: false, ports: [] })).toBe(false);
  expect(T.shipMayEnterZone("carrack", { id: "Bay of Biscay", enclosed: false, ports: [] })).toBe(true);
});

Then("its route needs a port with coal", (s) => {
  expect(T.shipRouteOk(s.shipKind, [{ coal: false }, { coal: false }])).toBe(false);
  expect(T.shipRouteOk(s.shipKind, [{ coal: false }, { coal: true }])).toBe(true);
  expect(T.shipRouteOk("carrack", [{}, {}])).toBe(true);
});

// ---------------------------------------------------------------- trade value

Given("the province {string} makes {int} cloth and {int} wool a year", (s, p: string, cloth: number, wool: number) => {
  s.province = p;
  s.made = [
    { ware: "cloth", loads: cloth },
    { ware: "wool", loads: wool },
  ];
});

Given("it has a yearly fair and {int} working loom houses", (s, n: number) => {
  s.buildings = ["yearly_fair", ...Array.from({ length: n }, () => "loom_house")];
});

When("its trade value is worked out", (s) => {
  s.goods = T.goodsValue(s.made);
  s.weights = T.buildingWeights(s.buildings);
  s.value = T.tradeValue(s.goods, s.weights);
});

Then("its goods value is {int} gold a year", (s, v: number) => near(s.goods, v));
Then("its building weights are {float}", (s, v: number) => near(s.weights, v));
Then("its trade value is about {float} gold a month", (s, v: number) => near(s.value, v, 1));

Given("the province {string} has {int} burned fields", (s, _p: string, n: number) => {
  s.made = Array.from({ length: n }, () => ({ ware: "grain", loads: 500, burned: true }));
});

Given("it eats most of its grain and stores a surplus of {int} grain", (s, surplus: number) => {
  s.made.push({ ware: "grain", loads: 4000 });
  s.surplus = { grain: surplus };
});

Then("only the {int} grain surplus counts toward goods value", (s, surplus: number) => {
  expect(T.goodsValue(s.made, s.surplus)).toBe(surplus * T.pricePerLoad("grain"));
});

Then("the burned fields add nothing", (s) => {
  const unburned = s.made.filter((m: T.WareSource) => !m.burned);
  expect(T.goodsValue(s.made, { grain: 1e9 })).toBe(T.goodsValue(unburned, { grain: 1e9 }));
});

Then("a load of {string} is worth {int} gold", (_s, ware: string, price: number) => {
  expect(T.pricePerLoad(ware)).toBe(price);
});

Given(/^the province "([^"]+)" has a "([^"]+)"$/, (s, p: string, building: string) => {
  s.province = p;
  s.building = building.replace(/ /g, "_");
});

Then(/^the building adds ([\d.]+) to its building weights (for every trader|for land traders only|for ships only)$/, (s, weight: string, applies: string) => {
  const land = T.buildingWeight(s.building, "land");
  const sea = T.buildingWeight(s.building, "sea");
  const w = Number(weight);
  if (applies === "for every trader") expect([land, sea]).toEqual([w, w]);
  else if (applies === "for land traders only") expect([land, sea]).toEqual([w, 0]);
  else expect([land, sea]).toEqual([0, w]);
});

Given("the province {string} is a village with no market", (s, p: string) => {
  s.province = p;
  T.addProvince(W(s), p, { owner: "France", size: "village", market: null, value: T.tradeValue(T.goodsValue([{ ware: "wool", loads: 24 }]), 0) });
});

Then("it still has a trade value", (s) => {
  expect(T.province(W(s), s.province).value).toBeGreaterThan(0);
});

Then("it gets busier when traders pass", (s) => {
  const w = W(s);
  const t = caravan(s, "France");
  T.enterProvince(w, t, s.province);
  const before = T.province(w, s.province).ratio;
  T.endOfMonth(w);
  expect(T.province(w, s.province).ratio).toBeGreaterThan(before);
});

Then("it pays traders who walk through it", (s) => {
  const w = W(s);
  const t = caravan(s, "France");
  expect(T.enterProvince(w, t, s.province).collected).toBeGreaterThan(0);
});

Then("it cannot be a route stop", (s) => {
  T.addProvince(W(s), "Troyes", { owner: "France", size: "town", market: "yearly_fair" });
  expect(T.makeRoute(W(s), ["Troyes", s.province]).ok).toBe(false);
});

// ---------------------------------------------------------------- ratio

// As a Given it sets the ratio; once the month has ended (One month's ratio change) it checks it.
Given("the province {string} has a trade ratio of {float}", (s, p: string, ratio: number) => {
  if (s.changes) return near(T.province(W(s), p).ratio, ratio);
  s.province = p;
  city(s, p, "France", { ratio });
});

Given("{int} traders passed it this month", (s, n: number) => {
  for (let i = 0; i < n; i++) T.province(W(s), s.province).passedBy.add(`t${i}`);
});

When("the month's day loop ends", (s) => {
  s.changes = T.endOfMonth(W(s));
});

function change(s: Scenario, p: string): T.RatioChange {
  return (s.changes as T.RatioChange[]).find((c) => c.province === p)!;
}

Then("the ratio gain is {float}", (s, g: number) => near(change(s, s.province).gain, g));
Then("the ratio decay is {float}", (s, d: number) => near(change(s, s.province).decay, d));

Given("{int} traders pass the province {string} every month", (s, n: number, p: string) => {
  s.perMonth = n;
  s.province = p;
  city(s, p, "France", { ratio: 0 });
});

When("many months pass", (s) => {
  const w = W(s);
  for (let m = 0; m < 600; m++) {
    for (let i = 0; i < s.perMonth; i++) T.province(w, s.province).passedBy.add(`t${i}`);
    T.endOfMonth(w);
  }
});

Then("the trade ratio of {string} settles at about {int}", (s, p: string, r: number) => {
  expect(Math.abs(T.province(W(s), p).ratio - r)).toBeLessThan(1);
});

When("{int} months pass with no traders", (s, n: number) => {
  for (let m = 0; m < n; m++) T.endOfMonth(W(s));
});

Then("the trade ratio of {string} is about {float}", (s, p: string, r: number) => near(T.province(W(s), p).ratio, r, 1));

Given(/^a (French|Burgundian) caravan walks through "([^"]+)" without stopping$/, (s, adj: string, p: string) => {
  const w = W(s);
  T.addProvince(w, p, { owner: "France", size: "village" });
  s.french = caravan(s, countryOfAdjective(adj));
  T.enterProvince(w, s.french, p);
});

Given("a Burgundian caravan stops in {string} for {int} days", (s, p: string) => {
  T.enterProvince(W(s), caravan(s, "Burgundy"), p);
});

Given("the French caravan enters {string} a second time this month", (s, p: string) => {
  T.enterProvince(W(s), s.french, p);
});

Then("{string} counts {int} traders passing this month", (s, p: string, n: number) => {
  expect(T.tradersPassing(T.province(W(s), p))).toBe(n);
});

Given("a Venetian cog sails through the sea zone {string} without calling at a port", (s, zone: string) => {
  const w = W(s);
  T.country(w, "Venice").knownSeaZones.add(zone);
  s.ship = T.addTrader(w, { id: "cog", kind: "cog_junk_dhow", owner: "Venice", home: "Venice" });
  later(s, () => expect(T.sailThrough(w, s.ship, zone).entered).toBe(true));
  s.zone = zone;
});

Given(/^the ports "([^"]+)" and "([^"]+)" lie on that sea zone's coast$/, (s, a: string, b: string) => {
  const w = W(s);
  T.addProvince(w, a, { owner: "Venice", port: true });
  T.addProvince(w, b, { owner: "Naples", port: true });
  w.seaZones.set(s.zone, { id: s.zone, enclosed: true, ports: [a, b] });
});

Then(/^"([^"]+)" and "([^"]+)" each count half a trader passing$/, (s, a: string, b: string) => {
  expect(T.tradersPassing(T.province(W(s), a))).toBe(0.5);
  expect(T.tradersPassing(T.province(W(s), b))).toBe(0.5);
});

When("{string} is put under plague quarantine", (s, p: string) => {
  T.quarantine(W(s), p);
});

Then("its trade ratio is 0 while the quarantine lasts", (s) => {
  const p = T.province(W(s), s.province);
  expect(p.ratio).toBe(0);
  p.passedBy.add("x");
  T.endOfMonth(W(s));
  expect(p.ratio).toBe(0);
});

Then("no trader may enter {string}", (s, p: string) => {
  expect(T.mayEnter(W(s), caravan(s, "France"), p)).toBe(false);
  expect(T.mayEnter(W(s), caravan(s, "Savoy"), p)).toBe(false);
});

Given("a Burgundian army besieges {string} this month", (s, p: string) => {
  city(s, p, "France", { ratio: 20, siege: true, enemyArmy: true });
  s.province = p;
});

Given("{int} traders passed {string} this month", (s, n: number, p: string) => {
  for (let i = 0; i < n; i++) T.province(W(s), p).passedBy.add(`t${i}`);
  later(s, () => (s.changes = T.endOfMonth(W(s))));
});

Then("{string} has no ratio gain this month", (s, p: string) => {
  expect(change(s, p).gain).toBe(0);
});

Given("an enemy fleet blockades {string}", (s, p: string) => {
  const w = W(s);
  T.addProvince(w, p, { owner: "Portugal", port: true, blockaded: true, size: "city" });
  w.seaZones.set("Atlantic", { id: "Atlantic", enclosed: false, ports: [p] });
  T.country(w, "Portugal").knownSeaZones.add("Atlantic");
  s.ship = T.addTrader(w, { id: "carrack", kind: "carrack", owner: "Portugal", home: p });
  later(s, () => T.sailThrough(w, s.ship, "Atlantic"));
});

Then("no trade ship may enter {string}", (s, p: string) => {
  expect(T.mayEnter(W(s), s.ship, p)).toBe(false);
});

Then("{string} gets no sea-lane gain", (s, p: string) => {
  expect(T.tradersPassing(T.province(W(s), p))).toBe(0);
});

// ---------------------------------------------------------------- collecting

Given("the province {string} has a trade value of {float} gold a month and a trade ratio of {int}", (s, p: string, value: number, ratio: number) => {
  // Not a city of the trader's own country, so the purse is not deposited on entering.
  city(s, p, "France", { value, ratio, size: "village", market: null });
  s.province = p;
});

Given("it has not yet served its trader visits this month", (s) => {
  expect(T.province(W(s), s.province).visits).toBe(0);
});

When("a trader with hold {float} enters {string}", (s, hold: number, p: string) => {
  const kind = (["pack_caravan", "camel_caravan", "wagon_train"] as const).find((k) => T.kindStats(k).hold === hold)!;
  s.trader = caravan(s, "France", { kind });
  s.result = T.enterProvince(W(s), s.trader, p);
});

Then("it collects {float} gold into its purse", (s, gold: number) => {
  near(s.result.collected, gold, 3);
  near(s.trader.purse, gold, 3);
});

Given("a caravan is in {string} waiting for snow to clear", (s, p: string) => {
  const w = W(s);
  city(s, p, "France", { value: 4, ratio: 40, size: "village", market: null });
  city(s, "Dijon", "France", { value: 6, ratio: 40 });
  s.trader = caravan(s, "France");
  T.enterProvince(w, s.trader, p);
  s.purseBefore = s.trader.purse;
  s.trader.purse = 0.4;
  s.purseBefore = 0.4;
});

When("it waits {int} days", () => {
  // Waiting is not entering: nothing to call on the day loop.
});

Then("it collects nothing more in {string}", (s, p: string) => {
  expect(s.trader.position).toBe(p);
  expect(s.trader.purse).toBe(s.purseBefore);
});

Then("when it leaves for {string} it collects only on entering {string}", (s, _to: string, p: string) => {
  const r = T.enterProvince(W(s), s.trader, p);
  expect(r.collected).toBeGreaterThan(0);
  near(r.collected, T.collectAmount(6, 40, 1));
});

Given("a pack caravan's purse holds {int} of {int} gold", (s, purse: number, size: number) => {
  s.trader = caravan(s, "France", { purse });
  expect(T.kindStats("pack_caravan").purse).toBe(size);
});

When("it enters {string}", (s, p: string) => {
  city(s, p, "Savoy", { value: 10, ratio: 50 });
  s.result = T.enterProvince(W(s), s.trader, p);
});

Then("it collects nothing until it deposits", (s) => {
  expect(s.result.collected).toBe(0);
  expect(s.trader.purse).toBe(10);
});

Given(/^a Venetian galley sails from "([^"]+)" through the "([^"]+)" to "([^"]+)"$/, (s, from: string, zone: string, to: string) => {
  const w = W(s);
  city(s, from, "Venice", { port: true });
  city(s, to, "Venice", { port: true, value: 5, ratio: 50, size: "village", market: null });
  w.seaZones.set(zone, { id: zone, enclosed: true, ports: [from, to] });
  T.country(w, "Venice").knownSeaZones.add(zone);
  s.ship = T.addTrader(w, { id: "galley", kind: "galley", owner: "Venice", home: from });
  later(s, () => {
    s.atSea = s.ship.purse;
    T.sailThrough(w, s.ship, zone);
    s.atSea = s.ship.purse - s.atSea;
    s.result = T.enterProvince(w, s.ship, to);
  });
});

Then("it collects nothing in the sea zones", (s) => {
  expect(s.atSea).toBe(0);
});

Then("it collects on entering {string}", (s, p: string) => {
  expect(s.ship.position).toBe(p);
  expect(s.result.collected).toBeGreaterThan(0);
});

Given("a French caravan collects {float} gold in {string} owned by {string}", (s, gold: number, p: string, owner: string) => {
  s.collected = gold;
  s.owner = owner;
  s.province = p;
});

Given(/^"([^"]+)" and "([^"]+)" (have|lack) a trade pact$/, (s, a: string, b: string, have: string) => {
  if (have === "have") T.setPact(W(s), a, b);
  later(s, () => (s.fee = T.marketFee(W(s), "France", s.owner, s.collected)));
});

Then("{string} receives a market fee of {float} gold", (s, _owner: string, fee: number) => near(s.fee, fee, 4));

Given("the province {string} has a yearly fair, serving {int} visits a month", (s, p: string, served: number) => {
  city(s, p, "France", { market: "yearly_fair", value: 10, ratio: 50 });
  expect(T.servedVisits("yearly_fair")).toBe(served);
  s.province = p;
});

Given("{int} trader visits have already been made this month", (s, n: number) => {
  T.province(W(s), s.province).visits = n;
});

When("another trader enters {string}", (s, p: string) => {
  s.trader = caravan(s, "France");
  s.result = T.enterProvince(W(s), s.trader, p);
});

Then("its collection is multiplied by {float}", (s, f: number) => {
  near(s.result.collected, T.collectAmount(10, 50, 1) * f, 4);
});

Given(/^the province "([^"]+)" has (no market|a weekly market|a yearly fair|a trading house)$/, (s, _p: string, market: string) => {
  s.market = market === "no market" ? null : (market.replace(/^an? /, "").replace(/ /g, "_") as T.MarketStep);
});

Then("it serves {int} trader visits a month at full value", (s, n: number) => {
  expect(T.servedVisits(s.market)).toBe(n);
});

// ---------------------------------------------------------------- routes

Given(/^the province "([^"]+)" is a "([^"]+)" (without a market|with a weekly market|with a trading post)$/, (s, p: string, size: string, market: string) => {
  T.addProvince(W(s), p, {
    owner: "France",
    size: size.replace(/ /g, "_") as T.TownSize,
    market: market === "with a weekly market" ? "weekly_market" : null,
    tradingPost: market === "with a trading post",
  });
});

Then(/^"([^"]+)" (can|cannot) be a route stop$/, (s, p: string, can: string) => {
  expect(T.isTradeCity(T.province(W(s), p))).toBe(can === "can");
  T.addProvince(W(s), "Paris", { owner: "France", size: "great_city" });
  expect(T.makeRoute(W(s), ["Paris", p]).ok).toBe(can === "can");
});

When("the player sets a route with {int} stops", (s, n: number) => {
  const names = Array.from({ length: n }, (_, i) => `City ${i}`);
  for (const c of names) T.addProvince(W(s), c, { owner: "France", size: "city" });
  s.route = T.makeRoute(W(s), names);
});

Then(/^the route is (refused|accepted)$/, (s, r: string) => {
  expect(s.route.ok).toBe(r === "accepted");
});

Given(/^a caravan has the route "([^"]+)" in mode "(loop|there and back|once)"$/, (s, route: string, mode: string) => {
  for (const c of stops(route)) city(s, c, "France");
  s.trader = caravan(s, "France");
  const r = T.setRoute(W(s), "France", s.trader.id, stops(route), mode.replace(/ /g, "_") as T.RouteMode);
  expect(r.ok).toBe(true);
});

When("it reaches {string}", (s, p: string) => {
  for (const stop of s.trader.route.stops) {
    T.enterProvince(W(s), s.trader, stop);
    if (stop === p) break;
  }
});

Then(/^it goes back to "([^"]+)" and starts again$/, (s, p: string) => {
  expect(T.destination(s.trader)).toBe(p);
  expect(s.trader.route.next).toBe(0);
});

Then(/^it reverses toward "([^"]+)"$/, (s, p: string) => {
  expect(T.destination(s.trader)).toBe(p);
  expect(s.trader.route.direction).toBe(-1);
});

Then("it stops and waits for orders", (s) => {
  expect(s.trader.route.waiting).toBe(true);
  expect(T.destination(s.trader)).toBeNull();
});

Given(/^two paths from "([^"]+)" to "([^"]+)" take (\d+) and (\d+) days$/, (s, _a: string, _b: string, d1: string, d2: string) => {
  s.paths = [
    { provinces: ["Jura"], days: Number(d1), tolls: 0 },
    { provinces: ["Vaud"], days: Number(d2), tolls: 0 },
  ];
});

Given("the {int}-day path has a toll and the {int}-day path has none", (s, tolled: number) => {
  for (const p of s.paths) if (p.days === tolled) p.tolls = 1;
  later(s, () => (s.chosen = T.choosePath(s.paths)));
});

Then("the planner takes the {int}-day path, a toll counting as {int} days", (s, days: number, tollDays: number) => {
  expect(s.chosen.days).toBe(days);
  expect(T.tradeConfig.route.toll_counts_as_days).toBe(tollDays);
});

const coastRoad = ["Lübeck", "Hamburg", "Bremen", "Groningen", "Holland", "Bruges"];

Given(/^a caravan walks from "([^"]+)" to "([^"]+)" along the coast road$/, (s) => {
  const w = W(s);
  for (const p of coastRoad) T.addProvince(w, p, { owner: "Hanse", size: "village", value: 5, ratio: 30 });
  s.trader = caravan(s, "Hanse", { home: "Lübeck", position: "Lübeck" });
  later(s, () => {
    s.collections = coastRoad.slice(1).map((p) => T.enterProvince(w, s.trader, p).collected);
    s.trader.purse = 0;
    for (const p of coastRoad.slice(1)) T.province(w, p).passedBy.add(s.trader.id);
    s.changes = T.endOfMonth(w);
  });
});

Then("every province on the coast road gets the ratio gain", (s) => {
  for (const p of coastRoad.slice(1)) expect(change(s, p).gain).toBeGreaterThan(0);
});

Then("the caravan collects in each of them", (s) => {
  for (const c of s.collections) expect(c).toBeGreaterThan(0);
});

Given(/^a caravan has the route "([^"]+)"$/, (s, route: string) => {
  for (const c of stops(route)) city(s, c, c === "Geneva" ? "Savoy" : "France", { size: "city" });
  city(s, "Paris", "France", { size: "great_city" });
  s.trader = caravan(s, "France", { name: "Caravan of Troyes", purse: 3 });
  expect(T.setRoute(W(s), "France", s.trader.id, stops(route)).ok).toBe(true);
  s.pathOptions = {
    "Troyes>Dijon": [{ provinces: ["Troyes", "Langres", "Dijon"], days: 10, tolls: 0 }],
    "Dijon>Geneva": [
      { provinces: ["Dijon", "Jura", "Geneva"], days: 15, tolls: 1 },
      { provinces: ["Dijon", "Bresse", "Geneva"], days: 18, tolls: 0 },
    ],
  };
  for (const p of ["Langres", "Jura", "Bresse"]) city(s, p, p === "Langres" ? "France" : "Savoy", { size: "village", market: null });
});

function plan(s: Scenario): T.RoutePlan {
  return T.checkRoute(W(s), s.trader, (a, b) => s.pathOptions[`${a}>${b}`] ?? [], () => "Paris");
}

When(/^the path from "([^"]+)" to "([^"]+)" closes and (another exists|none exists)$/, (s, _a: string, _b: string, other: string) => {
  T.province(W(s), "Jura").quarantine = true;
  if (other === "none exists") T.province(W(s), "Bresse").quarantine = true;
  s.plan = plan(s);
});

When(/^"([^"]+)" is put under quarantine$/, (s, p: string) => {
  T.quarantine(W(s), p);
  s.plan = plan(s);
});

When("every stop is closed", (s) => {
  for (const p of s.trader.route.stops) T.quarantine(W(s), p);
  s.plan = plan(s);
  if ("allClosed" in s.plan && s.plan.goTo) {
    T.enterProvince(W(s), s.trader, s.plan.goTo);
    s.trader.route.waiting = true;
  }
});

Then("the caravan takes the other path as a dashed detour", (s) => {
  const leg = s.plan.legs.find((l: T.LegPlan) => l.to === "Geneva");
  expect(leg.detour).toBe(true);
  expect(leg.path.provinces).toContain("Bresse");
  expect(s.plan.skipped).toEqual([]);
});

Then(/^the caravan skips "([^"]+)"$/, (s, p: string) => {
  expect(s.plan.skipped).toContain(p);
  expect(s.plan.legs.some((l: T.LegPlan) => l.to === p)).toBe(false);
});

Then(/^the caravan skips "([^"]+)", which shows red; the turn report says so once$/, (s, p: string) => {
  expect(s.plan.skipped).toContain(p);
  expect(s.plan.redStops).toEqual([p]);
  expect(s.plan.report.filter((l: string) => l.includes(p))).toHaveLength(1);
});

Then("the caravan goes to the nearest own city, deposits and waits for orders", (s) => {
  expect(s.plan.allClosed).toBe(true);
  expect(s.trader.position).toBe("Paris");
  expect(s.trader.purse).toBe(0);
  expect(T.country(W(s), "France").treasury).toBe(3);
  expect(T.destination(s.trader)).toBeNull();
});

// ---------------------------------------------------------------- deposits

Given("the caravan {string} has {float} gold in its purse", (s, name: string, gold: number) => {
  s.trader = caravan(s, "France", { id: name, name, purse: gold, position: "Langres" });
});

When(/^it enters "([^"]+)", a city of "([^"]+)"$/, (s, p: string, owner: string) => {
  city(s, p, owner, { size: "town" });
  T.enterProvince(W(s), s.trader, p);
});

Then(/^([\d.]+) gold goes to the treasury of "([^"]+)"( that day)?$/, (s, gold: string, owner: string) => {
  near(T.country(W(s), owner).treasury, Number(gold));
});

Then("the turn report says {string}", (s, line: string) => {
  const lines = [...W(s).report, ...T.turnReportLines(W(s).events)];
  expect(lines).toContain(line);
});

Given(/^a French caravan with (\d+) gold walks through "([^"]+)", a French city that is not a stop$/, (s, gold: string, p: string) => {
  city(s, "Troyes", "France");
  city(s, "Dijon", "France");
  city(s, p, "France", { size: "city" });
  s.trader = caravan(s, "France", { purse: Number(gold) });
  T.setRoute(W(s), "France", s.trader.id, ["Troyes", "Dijon"]);
  later(s, () => (s.result = T.enterProvince(W(s), s.trader, p)));
});

Then("it deposits {int} gold in {string}", (s, gold: number, p: string) => {
  expect(s.trader.position).toBe(p);
  expect(s.result.deposited).toBe(gold);
});

Given(/^the city "([^"]+)" belongs to the lord "([^"]+)", a lord of "([^"]+)"$/, (s, p: string, lord: string, crown: string) => {
  W(s).lords.set(lord, { id: lord, liege: crown, wealth: 0 });
  city(s, p, crown, { lord });
  s.lord = lord;
});

When("a crown caravan with {int} gold enters {string}", (s, gold: number, p: string) => {
  s.trader = caravan(s, "France", { purse: gold });
  T.enterProvince(W(s), s.trader, p);
});

Then("the lord takes no fee", (s) => {
  expect(W(s).lords.get(s.lord)!.wealth).toBe(0);
  expect(T.tradeConfig.deposit.lord_city.to_treasury).toBe(1);
});

Given(/^a French caravan with (\d+) gold enters "([^"]+)"$/, (s, gold: string, p: string) => {
  s.trader = caravan(s, "France", { purse: Number(gold) });
  s.city = p;
  later(s, () => (s.result = T.enterProvince(W(s), s.trader, p)));
});

Given(/^"([^"]+)" is (a city of a subject of "[^"]+"|a French city occupied by "[^"]+")$/, (s, p: string, state: string) => {
  const overlord = /subject of "([^"]+)"/.exec(state)?.[1];
  const occupier = /occupied by "([^"]+)"/.exec(state)?.[1];
  const w = W(s);
  if (overlord) {
    T.addCountry(w, "Comtat", { overlord, subjectKind: "vassal" });
    city(s, p, "Comtat", { size: "city" });
  } else {
    T.setWar(w, "France", occupier!);
    city(s, p, "France", { size: "city", occupiedBy: occupier! });
  }
});

Then("the caravan deposits nothing there", (s) => {
  expect(s.result.deposited).toBe(0);
  expect(T.country(W(s), "France").treasury).toBe(0);
});

Given("this year the traders of {string} deposited {int} gold", (s, c: string, gold: number) => {
  city(s, "Troyes", c);
  T.enterProvince(W(s), caravan(s, c, { purse: gold }), "Troyes");
  s.country = c;
});

Given("foreign traders paid {string} {int} gold in market fees", (s, c: string, gold: number) => {
  T.country(W(s), c).income.fees += gold;
});

Given("toll points of {string} took {int} gold", (s, c: string, gold: number) => {
  T.country(W(s), c).income.tolls += gold;
});

Then("the trade income of {string} this year is {int} gold", (s, c: string, gold: number) => {
  expect(T.tradeIncome(T.country(W(s), c))).toBe(gold);
});

Given("the city {string} of {string} has a counting house", (s, p: string, owner: string) => {
  city(s, p, owner, { size: "city", buildings: ["counting_house"] });
});

Given(/^"([^"]+)" is (at peace|at war) with "([^"]+)"$/, (s, a: string, rel: string, b: string) => {
  T.setWar(W(s), a, b, rel === "at war");
});

When("a Florentine trader with {int} gold enters {string}", (s, gold: number, p: string) => {
  s.trader = caravan(s, "Florence", { purse: gold, home: "Florence" });
  s.result = T.enterProvince(W(s), s.trader, p);
});

Then(/^(\d+) gold reach the treasury of "([^"]+)" and (\d+) go to "([^"]+)"$/, (s, kept: string, c: string, fee: string, owner: string) => {
  near(T.country(W(s), c).treasury, Number(kept));
  near(T.country(W(s), owner).treasury, Number(fee));
});

Then("nothing is deposited", (s) => {
  expect(s.result.deposited).toBe(0);
  expect(T.country(W(s), "Florence").treasury).toBe(0);
});

// ---------------------------------------------------------------- may enter

Given(/^a (land trader|trade ship) of "([^"]+)"$/, (s, kind: string, c: string) => {
  s.trader = kind === "land trader" ? caravan(s, c) : T.addTrader(W(s), { id: "ship", kind: "carrack", owner: c, home: "Bordeaux" });
});

Then(/^it (may|may not) enter (.+)$/, (s, may: string, place: string) => {
  const w = W(s);
  let id = place;
  if (place === "a province of a French lord") T.addProvince(w, (id = "Burgundy"), { owner: "France", lord: "Duke of Burgundy" });
  else if (place === 'a province of a subject of "France"') {
    T.addCountry(w, "Comtat", { overlord: "France", subjectKind: "vassal" });
    T.addProvince(w, (id = "Avignon"), { owner: "Comtat" });
  } else if (place === 'a province of "Savoy" at peace with "France"') T.addProvince(w, (id = "Geneva"), { owner: "Savoy" });
  else if (place === 'a province of "England" at war with "France"') {
    T.setWar(w, "England", "France");
    T.addProvince(w, (id = "Calais"), { owner: "England" });
  } else if (place === "a quarantined province") T.addProvince(w, (id = "Marseille"), { owner: "France", quarantine: true });
  else if (place === "unclaimed land, collecting nothing there") T.addProvince(w, (id = "Waste"), { owner: null, value: 5, ratio: 50 });
  else if (place === "a sea zone") w.seaZones.set((id = "Channel"), { id, enclosed: false, ports: [] });
  else if (place === 'a port of "Portugal" at peace with "France"') T.addProvince(w, (id = "Lisbon"), { owner: "Portugal", port: true });
  else if (place === 'a sea zone unknown to "France"') w.seaZones.set((id = "Indian Ocean"), { id, enclosed: false, ports: [] });
  else throw new Error(`Unknown place ${place}`);
  expect(T.mayEnter(w, s.trader, id)).toBe(may === "may");
  if (id === "Waste") expect(T.enterProvince(w, s.trader, id).collected).toBe(0);
  if (id === "Channel") T.country(w, s.trader.owner).knownSeaZones.add("Channel");
  if (id === "Channel") expect(T.mayEnter(w, s.trader, id)).toBe(false);
});

Given("unclaimed land has a trading post", (s) => {
  T.addProvince(W(s), "Elmina", { owner: null, tradingPost: true, size: "hamlet", value: 5, ratio: 50 });
});

When("a trader enters it", (s) => {
  s.trader = caravan(s, "Portugal");
  s.result = T.enterProvince(W(s), s.trader, "Elmina");
});

Then("the trader may collect there", (s) => {
  expect(s.result.collected).toBeGreaterThan(0);
});

Given(/^"([^"]+)" has no passage through "([^"]+)"$/, (s, a: string, b: string) => {
  s.passage = { from: a, through: b, has: false };
});

Given(/^"([^"]+)" and "([^"]+)" are at (war|peace)$/, (s, a: string, b: string, rel: string) => {
  T.setWar(W(s), a, b, rel === "war");
});

Then(/^French traders may cross into "([^"]+)"$/, (s, c: string) => {
  T.addProvince(W(s), "Geneva", { owner: c });
  expect(s.passage.has).toBe(false);
  expect(T.mayEnter(W(s), caravan(s, "France"), "Geneva")).toBe(true);
});

Given(/^the "([^"]+)" pass has a toll rate "(none|low|high)" set by its owner$/, (s, pass: string, rate: "none" | "low" | "high") => {
  s.toll = { id: pass, owner: "Burgundy", rate } satisfies T.TollPoint;
});

When(/^a caravan passes the "([^"]+)" pass$/, (s) => {
  s.trader = caravan(s, "France", { purse: 5 });
  s.paid = T.payToll(W(s), s.trader, s.toll);
});

Then(/^it pays (nothing|[\d.]+ gold) from its purse$/, (s, toll: string) => {
  const gold = toll === "nothing" ? 0 : parseFloat(toll);
  near(s.paid, gold);
  near(s.trader.purse, 5 - gold);
  near(T.country(W(s), "Burgundy").income.tolls, gold);
});

Then(/^Venetian traders pay no market fee and no toll in "([^"]+)"$/, (s, c: string) => {
  const t = caravan(s, "Venice");
  expect(T.marketFee(W(s), "Venice", c, 1)).toBe(0);
  expect(T.tollFor(W(s), t, { id: "Adda", owner: c, rate: "low" })).toBe(0);
  expect(T.marketFee(W(s), "Venice", "Genoa", 1)).toBeGreaterThan(0);
});

Then(/^Milanese traders pay none in "([^"]+)"$/, (s, c: string) => {
  const t = caravan(s, "Milan");
  expect(T.marketFee(W(s), "Milan", c, 1)).toBe(0);
  expect(T.tollFor(W(s), t, { id: "Brenta", owner: c, rate: "low" })).toBe(0);
});

Given(/^"([^"]+)" embargoes "([^"]+)"$/, (s, by: string, target: string) => {
  T.embargo(W(s), by, target);
});

Then("Portuguese traders may neither enter nor stop in Castilian provinces or ports", (s) => {
  const w = W(s);
  T.addProvince(w, "Toledo", { owner: "Castile", size: "city" });
  T.addProvince(w, "Seville", { owner: "Castile", size: "city", port: true });
  const land = caravan(s, "Portugal");
  const ship = T.addTrader(w, { id: "ship", kind: "carrack", owner: "Portugal", home: "Lisbon" });
  expect(T.mayEnter(w, land, "Toledo")).toBe(false);
  expect(T.mayEnter(w, ship, "Seville")).toBe(false);
  expect(T.makeRoute(w, ["Toledo", "Seville"]).ok).toBe(true);
  expect(T.mayEnter(w, caravan(s, "Castile"), "Toledo")).toBe(true);
});

Given("a French caravan is in {string}", (s, p: string) => {
  T.addProvince(W(s), p, { owner: "England" });
  T.addProvince(W(s), "Amiens", { owner: "France", size: "city" });
  s.trader = caravan(s, "France", { position: p, purse: 3 });
});

When(/^"([^"]+)" and "([^"]+)" go to war while "([^"]+)" is English$/, (s, a: string, b: string) => {
  s.moved = T.onWarStarted(W(s), a, b, () => "Amiens");
});

Then("the caravan heads at once for the nearest own or neutral city", (s) => {
  expect(s.moved).toContain(s.trader);
  expect(s.trader.heading).toBe("Amiens");
});

Then("it may be caught on the way", (s) => {
  expect(T.meetArmy(W(s), s.trader, "England", false)).toBe("captured");
  expect(T.country(W(s), "England").treasury).toBe(3);
});

Given(/^"([^"]+)" won a peace with the term "Open the roads" against "([^"]+)" in (\d+)$/, (s, winner: string, loser: string, year: string) => {
  s.term = T.openTheRoads(W(s), winner, loser, Number(year));
  s.year = Number(year);
});

Then(/^French traders pay no tolls in Burgundian provinces until (\d+)$/, (s, until: string) => {
  const t = caravan(s, "France");
  const point: T.TollPoint = { id: "Jura", owner: "Burgundy", rate: "low" };
  expect(T.tollFor(W(s), t, point, s.year)).toBe(0);
  expect(T.tollFor(W(s), t, point, Number(until) - 1)).toBe(0);
  expect(T.tollFor(W(s), t, point, Number(until))).toBeGreaterThan(0);
});

Given(/^"([^"]+)" is a tributary of "([^"]+)"$/, (s, sub: string, over: string) => {
  T.addCountry(W(s), sub, { overlord: over, subjectKind: "tributary" });
  T.addProvince(W(s), "Fuzhou", { owner: over, size: "city" });
  T.addProvince(W(s), "Naha", { owner: sub, size: "city" });
});

Then(/^Ryukyuan traders pay no toll in Ming cities$/, (s) => {
  s.trader = caravan(s, "Ryukyu", { purse: 5 });
  expect(T.tollFor(W(s), s.trader, { id: "Min river mouth", owner: "Ming", rate: "low" })).toBe(0);
});

Then(/^they deposit into the treasury of "([^"]+)"$/, (s, c: string) => {
  T.enterProvince(W(s), s.trader, "Fuzhou");
  expect(T.country(W(s), "Ming").treasury).toBe(0);
  T.enterProvince(W(s), s.trader, "Naha");
  expect(T.country(W(s), c).treasury).toBeGreaterThan(0);
});

// ---------------------------------------------------------------- risks

Given(/^a French caravan with (\d+) gold meets a Burgundian army in "([^"]+)"$/, (s, gold: string, p: string) => {
  T.addProvince(W(s), p, { owner: "France" });
  s.trader = caravan(s, "France", { purse: Number(gold), position: p });
});

Given(/^the caravan (cannot|can) back the way it came that day$/, (s, can: string) => {
  later(s, () => (s.outcome = T.meetArmy(W(s), s.trader, "Burgundy", can === "can")));
});

Then(/^its purse goes to "([^"]+)" and the caravan is captured$/, (s, c: string) => {
  expect(s.outcome).toBe("captured");
  expect(T.country(W(s), c).treasury).toBe(6);
  expect(W(s).traders.has(s.trader.id)).toBe(false);
});

Then("it steps back and keeps its purse", (s) => {
  expect(s.outcome).toBe("stepped_back");
  expect(s.trader.purse).toBe(6);
});

Given("a French caravan sees a Burgundian army ahead on its path", (s) => {
  later(s, () => (s.reaction = T.onEnemyAhead(true)));
});

Then("by default it waits a day and goes round if it can", (s) => {
  expect(s.reaction).toEqual({ waitDays: 1, goRound: true });
  expect(T.onEnemyAhead(false).goRound).toBe(false);
});

Given("a Burgundian army on Raid passes a French caravan", (s) => {
  T.setWar(W(s), "France", "Burgundy");
  later(s, () => {
    const rng = new Rng(1444);
    let escaped = 0;
    let lost = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) {
      const t = caravan(s, "France", { purse: 6 });
      const r = T.raidPasses(W(s), t, "Burgundy", rng);
      if (r.escaped) escaped++;
      if (r.lost === 6 && t.purse === 0) lost++;
    }
    s.raid = { escaped: escaped / n, lost: lost / n };
  });
});

Then("the caravan loses its purse", (s) => {
  expect(s.raid.lost).toBe(1);
});

Then("it escapes half the time", (s) => {
  expect(Math.abs(s.raid.escaped - 0.5)).toBeLessThan(0.03);
});

Given(/^the province "([^"]+)" has (riots|rebels|\d+ % homeless)$/, (s, _p: string, trouble: string) => {
  const homeless = /^(\d+) %/.exec(trouble)?.[1];
  s.ground = trouble === "riots" ? { riots: true } : trouble === "rebels" ? { rebels: true } : { homelessShare: Number(homeless) / 100 };
});

Given(/^it (has no caravanserai or castle|has a caravanserai|has a garrisoned castle)$/, (s, guard: string) => {
  if (guard === "has a caravanserai") s.ground.caravanserai = true;
  if (guard === "has a garrisoned castle") s.ground.garrisonedCastle = true;
});

Given(/^the owner (knows|doesn't know) "T1 Caravanserai networks"$/, (s, knows: string) => {
  s.inventions = new Set(knows === "knows" ? ["T1"] : []);
});

Then("a land trader there has a chance of {float} a month of losing its purse", (s, chance: number) => {
  near(T.banditChance(s.ground, s.inventions), chance, 4);
});

Given("rebels hold {string}", (s, p: string) => {
  T.addProvince(W(s), p, { owner: "France", rebels: true });
});

When("a French caravan enters {string}", (s, p: string) => {
  s.result = T.enterProvince(W(s), caravan(s, "France"), p);
});

Then("it is treated as meeting an enemy army", (s) => {
  expect(s.result.metEnemy).toBe(true);
  expect(s.result.collected).toBe(0);
});

Given("a caravan passes through an outbreak in {string}", (s, p: string) => {
  T.addProvince(W(s), p, { owner: "Genoa", plague: true });
  s.trader = caravan(s, "Milan");
  later(s, () => T.enterProvince(W(s), s.trader, p));
});

Then("it carries plague onward", (s) => {
  expect(s.trader.carriesPlague).toBe(true);
});

Given(/^an (Ottoman|enemy) fleet hunts in the "([^"]+)"$/, (s, who: string, zone: string) => {
  const w = W(s);
  T.setWar(w, "Ottoman", "Venice");
  w.hunters.set(zone, [{ country: "Ottoman" }]);
  w.seaZones.set(zone, { id: zone, enclosed: true, ports: [] });
  T.country(w, "Venice").knownSeaZones.add(zone);
  s.zone = zone;
  if (who === "enemy") {
    later(s, () => {
      const paths: T.PathOption[] = [
        { provinces: ["Venice", "Candia"], zones: ["Ionian Sea", zone], days: 20, tolls: 0 },
        { provinces: ["Venice", "Candia"], zones: ["Ionian Sea", "Libyan Sea"], days: 26, tolls: 0 },
      ];
      s.chosen = T.choosePath(paths, () => false, (z) => (w.hunters.get(z) ?? []).some((h) => h.country === null || T.atWar(w, h.country, "Venice")));
      s.onlyPath = T.choosePath([paths[0]!], () => false, (z) => z === zone);
    });
  }
});

Given(/^Venetian warships (do not escort|escort) in the "([^"]+)"$/, (s, esc: string, zone: string) => {
  if (esc === "escort") W(s).escorts.set(zone, new Set(["Venice"]));
});

When(/^a Venetian trade ship sails through the "([^"]+)"$/, (s, zone: string) => {
  s.ship = T.addTrader(W(s), { id: "cog", kind: "cog_junk_dhow", owner: "Venice", home: "Venice", purse: 12 });
  s.sail = T.sailThrough(W(s), s.ship, zone);
});

Then("the ship and its purse are captured", (s) => {
  expect(s.sail.captured).toBe(true);
  expect(T.country(W(s), "Ottoman").treasury).toBe(12);
});

Then("the ship is protected until the escort is beaten", (s) => {
  expect(s.sail.captured).toBe(false);
  T.escortBeaten(W(s), s.zone, "Venice");
  expect(T.sailThrough(W(s), s.ship, s.zone).captured).toBe(true);
});

Then(/^Venetian trade routes avoid the "([^"]+)" if they can$/, (s, zone: string) => {
  expect(s.chosen.zones).not.toContain(zone);
  expect(s.onlyPath.zones).toContain(zone);
});

Given(/^a trade ship with (\d+) gold in its purse is lost in a storm$/, (s, gold: string) => {
  s.ship = T.addTrader(W(s), { id: "carrack", kind: "carrack", owner: "Portugal", home: "Lisbon", purse: Number(gold) });
  later(s, () => (s.refund = T.stormLoss(W(s), s.ship)));
});

Given(/^its owner (knows|doesn't know) "T11 Marine insurance"$/, (s, knows: string) => {
  if (knows === "knows") T.country(W(s), "Portugal").inventions.add("T11");
});

Then("{int} gold is refunded", (s, gold: number) => {
  expect(s.refund).toBe(gold);
  expect(W(s).traders.has(s.ship.id)).toBe(false);
});

Given(/^the naval design adds a pirate fleet in the "([^"]+)"$/, (s, zone: string) => {
  const w = W(s);
  w.hunters.set(zone, [{ country: null }]);
  w.seaZones.set(zone, { id: zone, enclosed: false, ports: [] });
  s.zone = zone;
});

Then("it acts as a hunting fleet with no country", (s) => {
  const w = W(s);
  for (const owner of ["Malacca", "Ryukyu"]) {
    T.country(w, owner).knownSeaZones.add(s.zone);
    const ship = T.addTrader(w, { id: `junk-${owner}`, kind: "cog_junk_dhow", owner, home: owner, purse: 10 });
    expect(T.sailThrough(w, ship, s.zone).captured).toBe(true);
  }
  expect(W(s).events.filter((e) => e.type === "TraderCaptured").every((e) => e.type === "TraderCaptured" && e.by === null)).toBe(true);
});

// ---------------------------------------------------------------- effects

Then(/^tax owed in "([^"]+)" is raised by (\d+) %$/, (s, _p: string, tax: string) => {
  near(T.taxRaise(T.province(W(s), s.province).ratio), Number(tax) / 100, 6);
});

Then(/^craft buildings (can|cannot) appear there by themselves$/, (s, can: string) => {
  expect(T.craftsMayAppear(T.province(W(s), s.province).ratio)).toBe(can === "can");
});

Given("the province {string} has a forge and makes no iron", (s) => {
  s.inputs = { madeHere: false, inReach: [], passingRoutes: [] };
});

Given(/^(a province one ring away makes iron|a trader's route passing through "Troyes" passes a province making iron|no province in reach or on a passing route makes iron)$/, (s, source: string) => {
  if (source.startsWith("a province one ring")) s.inputs.inReach.push(["iron", "grain"]);
  else if (source.startsWith("a trader's route")) {
    s.inputs.inReach.push(["grain"]);
    s.inputs.passingRoutes.push(["wool"], ["iron"]);
  } else s.inputs.inReach.push(["grain", "wool"]);
});

Then(/^the forge works at (full|half)$/, (s, out: string) => {
  expect(T.inputOutput("iron", s.inputs)).toBe(out === "full" ? 1 : 0.5);
});

Given("Venetian traders collect in Ottoman cities", (s) => {
  const w = W(s);
  T.addProvince(w, "Constantinople", { owner: "Ottoman", size: "great_city", value: 20, ratio: 50 });
  later(s, () => T.enterProvince(w, caravan(s, "Venice"), "Constantinople"));
});

Then(/^"([^"]+)" counts "([^"]+)" as a trade partner for research spread$/, (s, a: string, b: string) => {
  expect(T.country(W(s), a).partners.has(b)).toBe(true);
  expect(W(s).events).toContainEqual({ type: "TradePartnerCounted", country: a, partner: b });
});

Then(/^"T17 Container shipping" has no effect on trade before 31 August 1939$/, () => {
  expect(T.tradeEffectOf("T17")).toBeNull();
  expect(T.tradeEffectOf("T3")).not.toBeNull();
});

// ---------------------------------------------------------------- event-tree stats

When(/^the modifier "([^"]+)" gives "([^"]+)" trade_power \+(\d+) % for (\d+) years$/, (s, _id: string, c: string, pct: string, years: string) => {
  const w = W(s);
  T.addProvince(w, "Calicut", { owner: "Calicut", size: "city", value: 10, ratio: 50 });
  s.base = T.collectAmount(10, 50, T.kindStats("pack_caravan").hold);
  T.applyTradePower(w, c, Number(pct) / 100, Number(years) * 12);
  s.country = c;
  s.months = Number(years) * 12;
});

Then(/^Portuguese traders collect (\d+) % more for (\d+) years$/, (s, pct: string) => {
  const w = W(s);
  const during = T.enterProvince(w, caravan(s, "Portugal"), "Calicut").collected;
  near(during, s.base * (1 + Number(pct) / 100), 4);
  w.month += s.months;
  T.province(w, "Calicut").visits = 0;
  const after = T.enterProvince(w, caravan(s, "Portugal"), "Calicut").collected;
  near(after, s.base, 4);
});

When(/^an event gives the province "([^"]+)" trade_access −([\d.]+)$/, (s, p: string, share: string) => {
  const w = W(s);
  T.addProvince(w, p, { owner: "Mamluks", ratio: 40 });
  s.province = p;
  s.months = 12;
  T.applyTradeAccess(w, p, -Number(share), s.months);
});

Then(/^its ratio gain is (\d+) % lower for the duration$/, (s, pct: string) => {
  const w = W(s);
  const p = T.province(w, s.province);
  p.passedBy.add("a").add("b");
  const plain = T.ratioGain(p.ratio, 2);
  const c = T.endOfMonth(w).find((x) => x.province === s.province)!;
  near(c.gain, plain * (1 - Number(pct) / 100), 6);
  w.month += s.months;
  p.passedBy.add("a");
  const later = T.endOfMonth(w).find((x) => x.province === s.province)!;
  near(later.gain, T.ratioGain(later.ratio + later.decay - later.gain, 1), 6);
});

When(/^the modifier "([^"]+)" sets world_trade_index −(\d+) %$/, (s, _id: string, pct: string) => {
  const w = W(s);
  T.addProvince(w, "Venice", { value: 20 });
  T.addProvince(w, "Bruges", { value: 15 });
  s.months = 24;
  T.applyWorldTradeIndex(w, -Number(pct) / 100, s.months);
});

Then(/^every province's trade value is (\d+) % lower for the duration$/, (s, pct: string) => {
  const w = W(s);
  for (const p of w.provinces.values()) near(T.currentValue(w, p), p.value * (1 - Number(pct) / 100), 6);
  w.month += s.months;
  for (const p of w.provinces.values()) near(T.currentValue(w, p), p.value, 6);
});

Given(/^the trade income of "([^"]+)" over the last 12 months is (\d+) % of its 1444-scaled reference$/, (s, _c: string, pct: string) => {
  s.reference = 200;
  s.income = (s.reference * Number(pct)) / 100;
});

Then(/^the trigger "trade_index >= (\d+)" holds for "([^"]+)"$/, (s, v: string) => {
  expect(T.tradeIndex(s.income, s.reference)).toBeGreaterThanOrEqual(Number(v));
  expect(T.tradeIndex(s.income - 1, s.reference)).toBeLessThan(Number(v));
});

Given(/^traders of "([^"]+)" took (\d+) % of all collections in the Amsterdam hub's provinces over the last 12 months$/, (s, c: string, pct: string) => {
  const w = W(s);
  w.hubs.set("amsterdam", { provinces: ["Amsterdam"], seaZones: [] });
  T.addHubCollection(w, "amsterdam", c, Number(pct));
  T.addHubCollection(w, "amsterdam", "Hanse", 100 - Number(pct));
});

Then(/^the trigger trade_presence with who "([^"]+)", hub "([^"]+)" and value ([\d.]+) holds$/, (s, who: string, hub: string, v: string) => {
  expect(T.tradePresence(W(s), who, hub, Number(v))).toBe(true);
  expect(T.tradePresence(W(s), who, hub, Number(v) + 0.05)).toBe(false);
});

When(/^the effect "([^"]+)" applies trade_route from "([^"]+)" to "([^"]+)" with open (true|false)$/, (s, _e: string, from: string, to: string, open: string) => {
  s.closed = new Set<string>();
  s.passage = ["Cape of Good Hope", "Agulhas", "Mozambique Channel"];
  s.link = `${from}>${to}`;
  T.applyTradeRoute(W(s), "Portugal", s.passage, open === "true", s.closed, s.link);
});

Then(/^the sea zones round the Cape become known to "([^"]+)"$/, (s, c: string) => {
  for (const z of s.passage) expect(T.country(W(s), c).knownSeaZones.has(z)).toBe(true);
});

Then("the link is marked closed for route planning", (s) => {
  expect(s.closed.has(s.link)).toBe(true);
  expect(T.country(W(s), "Portugal").knownSeaZones.size).toBe(0);
});

Given(/^the hub "([^"]+)" is a named set of provinces and sea zones$/, (s, hub: string) => {
  W(s).hubs.set(hub, { provinces: ["Malacca"], seaZones: ["Strait of Malacca"] });
  T.addProvince(W(s), "Malacca", { owner: "Malacca", size: "city", value: 10, ratio: 50 });
  s.hub = hub;
});

Then("no trader may route to the hub", (s) => {
  expect(T.makeRoute(W(s), ["Malacca", s.hub]).ok).toBe(false);
});

Then("triggers may read it", (s) => {
  T.enterProvince(W(s), caravan(s, "Ayutthaya"), "Malacca");
  expect(T.tradePresence(W(s), "Ayutthaya", s.hub, 1)).toBe(true);
});

Then("trade_good is read as the wares made in the province", () => {
  expect(T.tradeGood([{ ware: "pepper", loads: 12 }, { ware: "pepper", loads: 3 }, { ware: "tin", loads: 4 }], "pepper")).toBe(15);
});

// ---------------------------------------------------------------- start and AI

Given("the country {string} has catalogue trade_access {string}", (s, c: string, access: string) => {
  s.access = { country: c, access };
});

When("the campaign starts", (s) => {
  if (s.access) s.startCount = T.startingTraderCount(s.access.access);
  if (s.coastal) s.startKinds = Object.fromEntries(Object.entries(s.coastal).map(([c, ports]) => [c, T.startingKinds({ ports: ports as number }, 2)]));
});

Then("{string} has {int} starting traders", (s, _c: string, n: number) => {
  expect(s.startCount).toBe(n);
});

Then("{string} has the starting route {string}", (s, c: string, route: string) => {
  const shown = T.startingRoutes(c).map((r) => (r.label ? `${r.label} ` : "") + r.stops.join(" ▸ "));
  expect(shown).toContain(route);
});

Given(/^the country "([^"]+)" is (coastal with ports|inland)$/, (s, c: string, kind: string) => {
  (s.coastal ??= {})[c] = kind === "inland" ? 0 : 3;
});

Then(/^the starting traders of "([^"]+)" include trade ships$/, (s, c: string) => {
  expect(s.startKinds[c].some((k: T.TraderKind) => T.isSeaKind(k))).toBe(true);
});

Then(/^the starting traders of "([^"]+)" are caravans or barges$/, (s, c: string) => {
  for (const k of s.startKinds[c]) expect(["pack_caravan", "camel_caravan", "river_barge"]).toContain(k);
});

When("a campaign loads", (s) => {
  const w = W(s);
  const route = T.startingRoutes("Venice")[0]!;
  for (const p of route.stops) T.addProvince(w, p, { owner: p === "Venice" || p === "Corfu" ? "Venice" : "Other", size: "city", port: true, value: 10 });
  s.route = route.stops;
  s.months = T.warmUp(w, (world) => {
    for (const p of route.stops) T.province(world, p).passedBy.add("galley line");
  });
});

Then("the starting traders run for {int} months before the first turn", (s, n: number) => {
  expect(s.months).toBe(n);
  expect(W(s).month).toBe(n);
});

Then(/^the road "([^"]+)" is already busy on 11 Nov 1444$/, (s, road: string) => {
  for (const p of stops(road)) expect(T.province(W(s), p).ratio).toBeGreaterThan(T.nextRatio(0, 1));
});

Given(/^the AI country "([^"]+)" has (an unused loop expecting [\d.]+ gold a month against [\d.]+ upkeep|a trader whose loop has lost money for \d+ months)$/, (s, _c: string, sit: string) => {
  const loop = /expecting ([\d.]+) gold a month against ([\d.]+)/.exec(sit);
  const expect_ = loop?.[1];
  const upkeep = loop?.[2];
  const losing = /for (\d+) months/.exec(sit)?.[1];
  s.ai = expect_ !== undefined ? { found: T.aiShouldFound(Number(expect_), Number(upkeep)) } : { dismiss: T.aiShouldDismiss(Number(losing)) };
});

Then(/^the AI (founds a trader|does not found a trader|dismisses it)$/, (s, action: string) => {
  if (action === "dismisses it") expect(s.ai.dismiss).toBe(true);
  else expect(s.ai.found).toBe(action === "founds a trader");
});

Given(/^the AI country "([^"]+)" scores loops$/, (s) => {
  s.reach = T.aiReach;
});

Then("caravan loops reach about {int} provinces and ship loops about {int} sea zones", (s, p: number, z: number) => {
  expect(s.reach).toEqual({ caravanProvinces: p, shipSeaZones: z });
});

Given(/^the province "([^"]+)" had a ratio of (\d+) and no traders for (\d+) months$/, (s, p: string, r: string, m: string) => {
  s.lazy = { province: p, ratio: Number(r), months: Number(m) };
});

When("its ratio is next read", (s) => {
  s.read = T.lazyRatio(s.lazy.ratio, s.lazy.months);
});

Then(/^it is (\d+) × 0\.9 × 0\.9 × 0\.9$/, (s, r: string) => {
  near(s.read, Number(r) * 0.9 * 0.9 * 0.9, 9);
  const w = T.createTradeWorld();
  T.addProvince(w, "x", { ratio: Number(r) });
  for (let i = 0; i < 3; i++) T.endOfMonth(w);
  near(T.province(w, "x").ratio, s.read, 9);
});

Then("paths between two cities are cached until something on the path changes", () => {
  const cache = T.createPathCache();
  let planned = 0;
  const planner = () => (planned++, { provinces: ["Troyes", "Langres", "Dijon"], days: 10, tolls: 0 });
  cache.get("Troyes", "Dijon", planner);
  cache.get("Troyes", "Dijon", planner);
  expect(planned).toBe(1);
  cache.changed("Geneva");
  cache.get("Troyes", "Dijon", planner);
  expect(planned).toBe(1);
  cache.changed("Langres");
  cache.get("Troyes", "Dijon", planner);
  expect(planned).toBe(2);
});

// ---------------------------------------------------------------- screens

Then(/^the lenses "Trade ratio", "Trade value" and "Traders" exist$/, () => {
  expect([...T.tradeLenses]).toEqual(["Trade ratio", "Trade value", "Traders"]);
});

Then(/^the lenses "Traders passing" and "Trade balance" do not$/, () => {
  expect(T.tradeLenses as readonly string[]).not.toContain("Traders passing");
  expect(T.tradeLenses as readonly string[]).not.toContain("Trade balance");
});

Given("five caravans of {string}", (s, c: string) => {
  for (const p of ["Venice", "Padua", "Verona"]) city(s, p, c);
  s.caravans = Array.from({ length: 5 }, () => caravan(s, c));
  T.setRoute(W(s), c, s.caravans[0].id, ["Venice", "Padua", "Verona"]);
  s.country = c;
});

When("four of them copy the first one's route", (s) => {
  for (const t of s.caravans.slice(1)) expect(T.copyRoute(W(s), s.country, t.id, s.caravans[0].id).ok).toBe(true);
});

Then("all five run the same loop", (s) => {
  for (const t of s.caravans) {
    expect(t.route.stops).toEqual(["Venice", "Padua", "Verona"]);
    expect(t.route.mode).toBe("loop");
  }
});

Given(/^traders of "([^"]+)" deposited (\d+) gold this month and one caravan was robbed$/, (s, c: string, gold: string) => {
  city(s, "Troyes", c);
  T.enterProvince(W(s), caravan(s, c, { purse: 10 }), "Troyes");
  T.enterProvince(W(s), caravan(s, c, { purse: Number(gold) - 10 }), "Troyes");
  s.robbed = caravan(s, c, { name: "Caravan of Dijon", purse: 4 });
  T.rob(W(s), s.robbed);
});

Then("the robbery has its own line", (s) => {
  const lines = T.turnReportLines(W(s).events);
  expect(lines.filter((l) => l.includes(s.robbed.id) && l.includes("robbed"))).toHaveLength(1);
  expect(lines.filter((l) => l.startsWith("Traders brought"))).toHaveLength(1);
});
