import { readFileSync } from "node:fs";
import { expect } from "vitest";
import { steps } from "../src/registry.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { createEngineHost, LEDGER, RATE_LABELS, STABILITY, stabilitySection, taxLine, TOP_BAR_PLAQUE, topBar, treasuryView, type Order, type Snapshot, type TopBarItem } from "@ph/engine";

/**
 * The realm's screens (REALM-183 to REALM-185, REALM-203 to REALM-205, X-19):
 * the top bar, the General tab's Stability section, the Treasury tab and a
 * province's Tax line. They run against the models the client draws from
 * (packages/engine/src/realmScreens.ts), fed by the snapshot the engine
 * worker sends the client, and the orders the buttons send.
 */

const { Given, When, Then } = steps("realm");

type S = Record<string, any>;
const RULES = loadDefaultRuleset();

/** Sends one order as the client does (an "act" request), and keeps the new snapshot. */
function act(s: S, order: Order): Snapshot {
  const reply = s.host({ id: ++s.request, type: "act", order });
  expect(reply.response.type).toBe("snapshot");
  s.snap = reply.response.snapshot as Snapshot;
  expect(s.snap.rejectedOrders).toEqual([]);
  return s.snap;
}

const bar = (s: S): TopBarItem[] => topBar(s.snap, 0);
const item = (s: S, key: TopBarItem["key"]) => bar(s).find((p) => p.key === key)!;

Given("the player rules {string}", (s, name: string) => {
  const nation = RULES.nations.find((n) => n.name === name)!;
  s.host = createEngineHost(loadDefaultRuleset);
  s.request = 0;
  const reply = s.host({ id: ++s.request, type: "newGame", seed: 1, playerNation: nation.id });
  expect(reply.response.type).toBe("snapshot");
  s.snap = reply.response.snapshot as Snapshot;
  s.me = s.snap.playerNation;
  expect(s.me).toBeGreaterThanOrEqual(0);
});

// ------------------------------------------------------------ the top bar (REALM-185, REALM-203, REALM-205)

Then("the top bar shows a stability plaque with the step in words", (s) => {
  const p = item(s, "stability");
  expect(p.key === "stability" && p.plaque).toBe(true);
  if (p.key !== "stability") return;
  expect(p.step).toBe(s.snap.stability!.step);
  expect(p.words).toBe(STABILITY[s.snap.stability!.step]);
  expect(STABILITY).toContain(p.words);
});

When("the player taps the stability plaque", (s) => {
  s.opened = item(s, "stability").opens;
});
When("the player taps the gold plaque", (s) => {
  const p = item(s, "gold");
  // The gold plaque is the treasury's overview: gold and its change a month.
  expect(p.key === "gold" && p.gold === s.snap.nationTreasury[s.me] && p.perMonth === s.snap.nationMonthlyIncome[s.me]).toBe(true);
  s.opened = p.opens;
});

Then("the General tab of the country card opens on the Stability section", (s) => {
  expect(s.opened).toEqual({ card: "realm", tab: "general", section: "stability" });
});
Then("the Treasury tab of the country card opens", (s) => {
  expect(s.opened).toEqual({ card: "realm", tab: "treasury" });
});

Then("the top bar shows the realm, the date, gold, stability, research, the war plaque while at war and the News button", (s) => {
  expect(bar(s).map((p) => p.key)).toEqual(["realm", "date", "gold", "stability", "research", "dispatches"]);
  // Research shows the study's progress and opens the Research screen; with nothing studied it is marked (RSCH-113).
  const research = bar(s).find((p) => p.key === "research")!;
  expect(research.opens).toEqual({ card: "realm", tab: "learning" });
  const idle = topBar({ ...s.snap, research: { ...s.snap.research!, study: null } }, 0).find((p) => p.key === "research")!;
  expect(idle.key === "research" && idle.study).toBe(null);
  // While at war the war plaque stands between stability and News, and opens Diplomacy.
  const atWar = { ...s.snap, wars: [{ id: "w", attackers: [s.me], defenders: [s.me === 0 ? 1 : 0], start: "1444-11-11" }] };
  const warBar = topBar(atWar, 0);
  expect(warBar.map((p) => p.key)).toEqual(["realm", "date", "gold", "stability", "research", "war", "dispatches"]);
  expect(warBar.find((p) => p.key === "war")!.opens).toEqual({ card: "realm", tab: "diplomacy" });
  // A war between others puts no plaque up.
  const others = { ...s.snap, wars: [{ id: "w", attackers: [s.me + 1], defenders: [s.me + 2], start: "1444-11-11" }] };
  expect(topBar(others, 0).some((p) => p.key === "war")).toBe(false);
  // Dispatches count the unread news, calls to arms and peace offers.
  const d = topBar(s.snap, 3).find((p) => p.key === "dispatches")!;
  expect(d.key === "dispatches" && d.count === 3 + s.snap.calls.length + s.snap.peaceOffers.length).toBe(true);
});

Then("every plaque has the same height and type", (s) => {
  // The realm's flag and name heads the bar; every other item is a plaque.
  expect(bar(s).filter((p) => p.key !== "realm").every((p) => p.plaque)).toBe(true);
  expect(TOP_BAR_PLAQUE.drawn).toBe(36);
  expect(TOP_BAR_PLAQUE.tap).toBe(44);
  // The client's stylesheet draws every top-bar plaque at that height and in that one type,
  // and stretches its tap area over the bar's full height.
  const css = readFileSync(new URL("../../../apps/client/src/style.css", import.meta.url), "utf8");
  const rule = (selector: string) => css.match(new RegExp(`\\n${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`))?.[1] ?? "";
  const plaque = rule(".hud .plaque");
  expect(plaque).toContain(`height: ${TOP_BAR_PLAQUE.drawn}px;`);
  expect(plaque).toContain(`font: ${TOP_BAR_PLAQUE.font};`);
  expect(rule(".hud")).toContain(`min-height: calc(${TOP_BAR_PLAQUE.tap}px`);
  const inset = Number(rule(".hud button.plaque::after").match(/inset: -(\d+)px/)?.[1] ?? 0);
  expect(TOP_BAR_PLAQUE.drawn + 2 * inset).toBeGreaterThanOrEqual(TOP_BAR_PLAQUE.tap);
});

// ------------------------------------------------------------ the General tab's Stability section (REALM-204)

When("the player opens the General tab of the country card", (s) => {
  s.section = stabilitySection(s.snap.stability!);
});

Then("it shows the stability step, what it means and one row for each pillar with its counts and step", (s) => {
  const v = s.section;
  expect(v.step).toBe(s.snap.stability!.step);
  expect(v.words).toBe(STABILITY[v.step]);
  expect(v.note.length).toBeGreaterThan(0);
  expect(v.pillars.map((p: any) => p.key)).toEqual(["lords", "subjects", "officials", "provinces"]);
  for (const [k, p] of v.pillars.entries()) {
    expect(p.step).toBe(s.snap.stability!.pillars[k]!.step);
    expect(p.words).toBe(STABILITY[p.step]);
    expect(p.line.length).toBeGreaterThan(0);
  }
  // The counts are the pillar's own: France 1444 holds its provinces, all counted.
  const provinces = Array.from(s.snap.provinceOwner).filter((o) => o === s.me).length;
  const row = v.pillars.find((p: any) => p.key === "provinces");
  expect(row.line).toMatch(new RegExp(`^All ${provinces} calm$|grumbling|rioting|plotting`));
});

Then("tapping a pillar opens the Lords, Diplomacy, Officials or Provinces tab", (s) => {
  expect(Object.fromEntries(s.section.pillars.map((p: any) => [p.label, p.opens]))).toEqual({ Lords: "lords", Subjects: "diplomacy", Officials: "officials", Provinces: "provinces" });
});

// ------------------------------------------------------------ a province's Tax line (REALM-183)

When("the player opens the Overview tab of the province {string}", (s, name: string) => {
  s.province = RULES.provinces.findIndex((p) => p.name === name);
  expect(s.province).toBeGreaterThanOrEqual(0);
  // The Tax line shows on the player's own provinces.
  expect(s.snap.provinceOwner[s.province]).toBe(s.me);
  s.tax = taxLine(s.snap, s.province);
});

Then("it shows a Tax line with the rate, whether it follows the realm default, and the gold it pays a month", (s) => {
  expect(s.tax.followsDefault).toBe(true);
  expect(s.tax.rate).toBe(s.snap.taxDefault);
  expect(s.tax.rateLabel).toBe("Normal");
  expect(s.tax.goldPerMonth).toBe(s.snap.provinceTaxGold[s.province]);
  expect(s.tax.goldPerMonth).toBeGreaterThan(0);
});

Then("a row of buttons sets the rate to Realm default, None, Light, Normal, Heavy or Crushing", (s) => {
  const labels = (t: any) => t.buttons.map((b: any) => b.label);
  const marked = (t: any) => t.buttons.filter((b: any) => b.on).map((b: any) => b.label);
  expect(labels(s.tax)).toEqual(["Realm default", "None", "Light", "Normal", "Heavy", "Crushing"]);
  expect(marked(s.tax)).toEqual(["Realm default"]);
  // Each button sends its rate; the line and the marked button follow.
  for (const label of ["Heavy", "None", "Crushing", "Realm default"]) {
    const b = s.tax.buttons.find((x: any) => x.label === label);
    act(s, { type: "setTax", province: s.province, rate: b.rate });
    const t = taxLine(s.snap, s.province);
    expect(marked(t)).toEqual([label]);
    expect(t.followsDefault).toBe(label === "Realm default");
    expect(t.rateLabel).toBe(label === "Realm default" ? RATE_LABELS[s.snap.taxDefault] : label);
    if (label === "None") expect(t.goldPerMonth).toBe(0);
    if (label === "Crushing") expect(t.goldPerMonth).toBeGreaterThan(s.tax.goldPerMonth);
  }
});

// ------------------------------------------------------------ the Treasury tab (REALM-184)

When("the player opens the Treasury tab of the country card", (s) => {
  s.treasury = treasuryView(s.snap);
});

Then("it shows gold, its change a month and the month's ledger line by line", (s) => {
  const t = s.treasury;
  expect(t.gold).toBe(s.snap.nationTreasury[s.me]);
  expect(t.ledger.length).toBeGreaterThan(0);
  expect(t.perMonth).toBeCloseTo(t.ledger.reduce((sum: number, l: any) => sum + l.gold, 0));
  // Every line with gold in or out, income first.
  expect(t.ledger.map((l: any) => l.line).sort()).toEqual((s.snap as Snapshot).ledger.filter((l) => l.gold !== 0).map((l) => l.line).sort());
  const firstOut = t.ledger.findIndex((l: any) => l.gold < 0);
  if (firstOut >= 0) expect(t.ledger.slice(firstOut).every((l: any) => l.gold < 0)).toBe(true);
  for (const l of t.ledger) expect(LEDGER).toContain(l.line);
  expect(t.ledger.find((l: any) => l.line === "tax")?.label).toBe("Tax");
});

Then("it sets the realm tax default", (s) => {
  const t = s.treasury;
  expect(t.rateButtons.map((b: any) => b.label)).toEqual(["None", "Light", "Normal", "Heavy", "Crushing"]);
  expect(t.rateButtons.filter((b: any) => b.on).map((b: any) => b.label)).toEqual([RATE_LABELS[s.snap.taxDefault]]);
  act(s, { type: "setTax", province: -1, rate: t.rateButtons.find((b: any) => b.label === "Heavy").rate });
  const after = treasuryView(s.snap);
  expect(RATE_LABELS[after.taxDefault]).toBe("Heavy");
  expect(after.rateButtons.filter((b: any) => b.on).map((b: any) => b.label)).toEqual(["Heavy"]);
  act(s, { type: "setTax", province: -1, rate: t.taxDefault });
});

Then("it shows the debt, its interest and what lenders would still give, with buttons to borrow and repay", (s) => {
  const t = s.treasury;
  // A realm may start owing (REALM-230): the tab shows what the snapshot says, and repay buttons only while it owes.
  const start = s.snap.debt as number;
  expect(t.debt).toBe(start);
  expect(t.repay.length > 0).toBe(start > 0);
  expect(t.canBorrow).toBe(s.snap.canBorrow);
  expect(t.canBorrow).toBeGreaterThan(10);
  expect(t.debtLimit).toBeGreaterThan(0);
  // Each borrow button names the gold and what the realm will owe for it; the last takes all lenders give.
  expect(t.borrow.at(-1).gold).toBe(Math.floor(t.canBorrow));
  for (const b of t.borrow) expect(b.owe).toBe(Math.round(b.gold * s.snap.loanDebtFactor));
  const ten = t.borrow.find((b: any) => b.gold === 10);
  expect(ten).toBeDefined();

  act(s, { type: "borrow", gold: ten.gold });
  const owing = treasuryView(s.snap);
  expect(owing.debt).toBe(start + ten.owe);
  expect(owing.gold).toBeCloseTo(t.gold + 10);
  expect(owing.canBorrow).toBeLessThan(t.canBorrow);
  expect(owing.interest).toBe(-((s.snap as Snapshot).ledger.find((l) => l.line === "interest")?.gold ?? 0));
  expect(owing.repay.map((b: any) => [b.gold, b.all])).toEqual([[10, false], [owing.debt, true]]);

  // Repaying takes the debt down by the gold paid; paying it all clears it.
  act(s, { type: "repay", gold: 10 });
  expect(treasuryView(s.snap).debt).toBe(owing.debt - 10);
  if (!treasuryView(s.snap).repay.at(-1)!.disabled) {
    act(s, { type: "repay", gold: treasuryView(s.snap).repay.at(-1)!.gold });
    expect(treasuryView(s.snap).debt).toBe(0);
  }
});
