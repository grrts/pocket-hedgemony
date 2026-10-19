import { describe, expect, it, vi } from "vitest";
import type { NameAbroadView, PeaceVoices, PriceOfWar, Snapshot } from "@ph/engine";
// The pixel icons paint on a canvas; the builders only need their markup.
vi.mock("../art/ui.ts", () => ({ icon: (name: string) => `<i class="icon-${name}"></i>` }));

import { declareSheetHtml, nameAbroadHtml, priceOfWarHtml, voiceLevel, warCardHtml, warPlaqueBars } from "./priceOfWar.ts";

const NAMES = ["France", "Burgundy", "Austria", "Savoy", "Milan", "Venice", "Castile"];
const name = (n: number) => NAMES[n]!;
const titles = { lord: "boyar", lords: "boyars", official: "voivode", officials: "voivodes" };

const price = (over: Partial<PriceOfWar> = {}): PriceOfWar => ({
  target: 1,
  against: [{ nation: 2, via: "alliance", soldiers: 20000 }],
  friends: [],
  threatened: [3, 4],
  waveringLords: 3,
  noAim: true,
  truce: null,
  monthlyPay: 12.4,
  maxCeded: 4,
  targetProvinces: 11,
  ourSide: 30000,
  theirSide: 45000,
  ...over,
});

const voices = (nation: number, share: number, over: Partial<PeaceVoices> = {}): PeaceVoices =>
  ({ nation, peace: Math.round(share * 20), war: 20 - Math.round(share * 20), none: 0, total: 20, share, obligation: "none", obliged: share > 0.5, refused: false, ...over }) as PeaceVoices;

const war = (share: number, over: Partial<NonNullable<Snapshot["wars"][number]["peace"]>> = {}): Snapshot["wars"][number] => ({
  id: "w1",
  attackers: [0],
  defenders: [1, 2],
  start: "1450-03",
  peace: {
    aim: "take_land",
    aimProvince: 7,
    months: 14,
    longWar: false,
    voices: { attacker: voices(0, share), defender: voices(1, 0.2) },
    cede: { attacker: { max: 3, of: 9, now: 0 }, defender: { max: 4, of: 11, now: 2 } },
    ...over,
  },
});

describe("the declare sheet's Price of war (WAR-229, WAR-232)", () => {
  const html = priceOfWarHtml(price(), { name, titles, income: 20 });

  it("lists who is called against you with soldiers and how, neighbours who hold Threatened us, wavering lords by the realm's title, pay and the peace limit", () => {
    expect(html).toContain("Against you: Austria");
    expect(html).toContain("ally · 20,000 soldiers");
    expect(html).toContain("2 realms will hold <em>Threatened us</em>");
    expect(html).toContain("Savoy, Milan");
    expect(html).toContain("3 boyars will waver");
    expect(html).toContain("12.4 gold a month");
    expect(html).toContain("at most 4 of their 11 provinces");
  });

  it("marks the lines that hurt red with the mark, and every line opens its reason on a tap", () => {
    const lines = html.match(/<details class="pow-line[^"]*">/g)!;
    expect(lines.length).toBeGreaterThanOrEqual(6);
    for (const l of html.split("<details").slice(1)) expect(l).toContain('<p class="hint">');
    // Austria, the sides (theirs stronger), the neighbours and the lords hurt; the pay (under income) and the limit do not.
    expect(html.match(/pow-line hurt/g)).toHaveLength(4);
    expect(html.match(/class="hurt-mark"/g)).toHaveLength(4);
  });

  it("shows a truce broken with its end, and pay over income as a hurt", () => {
    const h = priceOfWarHtml(price({ truce: { until: "1460-03" }, monthlyPay: 30 }), { name, titles, income: 20 });
    expect(h).toContain("holds until March 1460");
    expect(h).toContain("more than your realm takes in");
  });

  it("puts Confirm at the foot, breaking the truce when one holds, with the censure and the name abroad link above it", () => {
    const base = { target: 1, name, titles, income: 20, me: 0, censure: '<div class="censure-warn">x</div>', nameAbroad: { notoriety: 30, word: "Watched", landsTaken: 2, threshold: 8, leagues: [], fearful: [], fearRatios: { wary: 1.5, threatened: 2.5 } } as NameAbroadView };
    const plain = declareSheetHtml({ ...base, price: price() });
    expect(plain).toContain('data-declare-confirm="1"');
    expect(plain).not.toContain("data-break-truce");
    expect(plain.indexOf("censure-warn")).toBeLessThan(plain.indexOf("data-declare-confirm"));
    expect(plain).toContain('data-realm="0" data-realm-open="diplomacy"');
    expect(plain).toContain("Your name abroad: <b>Watched</b>");
    const truce = declareSheetHtml({ ...base, price: price({ truce: { until: null } }) });
    expect(truce).toContain('data-break-truce="1"');
    expect(truce).toContain("Break the truce and declare war");
  });
});

describe("the war card and the war plaque (WAR-230, WAR-231)", () => {
  it("shows the aim, both sides' voices as bars with the half mark and numbers, months, land occupied each way and what one peace takes now", () => {
    const html = warCardHtml(war(0.55), 0, { name, taken: 2, lost: 1, provinceName: () => "Champagne", titles });
    expect(html).toContain("War with Burgundy");
    expect(html).toContain("Take land: Champagne");
    expect(html).toContain("55 to 20 in 100");
    expect(html.match(/class="half"/g)).toHaveLength(2);
    expect(html).toContain("must take a fair peace");
    expect(html).toContain("14 months");
    expect(html).toContain("you hold 2 of theirs · they hold 1 of yours");
    expect(html).toContain("2 of theirs (most 4 of 11)");
    expect(html).toContain('data-war-card="w1"');
  });

  it("marks a long war", () => {
    const html = warCardHtml(war(0.2, { longWar: true, months: 30 }), 0, { name, taken: 0, lost: 0, provinceName: () => "", titles });
    expect(html).toContain("a long war");
  });

  it("colours the plaque's bar amber past a third and red past half, with the number as text", () => {
    expect(voiceLevel(0.3)).toBe("calm");
    expect(voiceLevel(0.4)).toBe("amber");
    expect(voiceLevel(0.55)).toBe("red");
    const bars = warPlaqueBars([war(0.55)], 0);
    expect(bars).toContain("plaque-voices red");
    expect(bars).toContain("<small>55</small>");
    // The defender sees its own side's voices.
    expect(warPlaqueBars([war(0.55)], 1)).toContain("<small>20</small>");
  });
});

describe("Your name abroad (DIPL-225, DIPL-226)", () => {
  const v: NameAbroadView = { notoriety: 55, word: "Feared", landsTaken: 6, threshold: 8, leagues: [{ target: 5, members: [{ nation: 2, soldiers: 20000 }, { nation: 3, soldiers: 5000 }, { nation: 4, soldiers: 8000 }] }], fearful: [], fearRatios: { wary: 1.5, threatened: 2.5 } };
  const html = nameAbroadHtml(v, name);

  it("shows the notoriety word, Lands taken against the threshold and the league with its members and soldiers first", () => {
    expect(html).toContain("<b>Feared</b>");
    expect(html).toContain("6 of 8 before a league");
    expect(html).toContain('aria-label="6 of 8"');
    expect(html).toContain("3 realms · 33,000 soldiers");
    expect(html).toContain("Savoy");
    expect(html).toContain("5,000 soldiers");
    expect(html.indexOf("League against you")).toBeLessThan(html.indexOf("Notoriety"));
  });

  it("opens every row's reason on a tap", () => {
    expect(html.match(/<details class="pow-line/g)).toHaveLength(3);
    for (const l of html.split("<details").slice(1)) expect(l).toContain('<p class="hint">');
  });

  it("says when a league may form", () => {
    expect(nameAbroadHtml({ ...v, landsTaken: 9, leagues: [] }, name)).toContain("9 of 8: a league may form");
  });
});

describe("Neighbours who fear you (DIPL-233)", () => {
  const v: NameAbroadView = { notoriety: 10, word: "Trusted", landsTaken: 0, threshold: 8, leagues: [], fearful: [{ nation: 2, level: "threatened", ratio: 3.2 }, { nation: 3, level: "wary", ratio: 1.6 }], fearRatios: { wary: 1.5, threatened: 2.5 } };
  const html = nameAbroadHtml(v, name);

  it("lists each neighbour who fears you with how much stronger you are, before notoriety", () => {
    expect(html).toContain("Neighbours who fear you");
    expect(html).toContain("2 realms · 1 threatened");
    expect(html).toContain("Threatened · you are 3.2 times their side");
    expect(html).toContain("Wary · you are 1.6 times their side");
    expect(html).toContain('data-realm="2" data-realm-open="diplomacy"');
    expect(html.indexOf("Neighbours who fear you")).toBeLessThan(html.indexOf("Notoriety"));
  });

  it("marks the row as hurting only when someone is threatened, and leaves it out when no one fears you", () => {
    expect(html).toContain('class="pow-line fearful hurt"');
    expect(nameAbroadHtml({ ...v, fearful: [v.fearful[1]!] }, name)).toContain('class="pow-line fearful"><summary><span class="calm-mark"');
    expect(nameAbroadHtml({ ...v, fearful: [] }, name)).not.toContain("Neighbours who fear you");
  });
});
