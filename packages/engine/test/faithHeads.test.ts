import { describe, expect, it } from "vitest";
import { loadMapTiles } from "../src/node/mapTiles.ts";
import { loadDefaultRuleset } from "@ph/rules";
import { applyNow, createWorld, type World } from "../src/index.ts";
import * as dip from "../src/domain/diplomacy/index.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { FAITH_IDS } from "../src/peoples.ts";
import { offerPeace, type News } from "../src/war.ts";
import { cardinals, censuresOf, conclaveEntries, faithBadge, faithHeadsView, headCard, monthlyFaithHeads, patronOf, rulerDied, seatOwner, syncFavour } from "../src/faithHeads.ts";
import * as relg from "../src/domain/religion/index.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);
const N = (w: World, id: string) => w.nationIndex.get(id)!;
const P = (w: World, id: string) => w.provinceIndex.get(id)!;
const refused = (w: World, order: Parameters<typeof applyNow>[1], n: number) => applyNow(w, order, n).rejectedOrders[0]?.reason ?? null;
const ledger = (w: World, holder: string, other: string) => dip.ledgerOf(w.diplomacy, holder, other);
const H = relg.heads;

/** Two Catholic realms, the first able to declare war on the second: no truce, tie or subject between them. */
function catholicPair(w: World): [number, number] {
  const cat = FAITH_IDS.indexOf("catholic");
  const ids = ["aragon", "genoa", "savoy", "milan", "florence", "venice", "france", "burgundy", "castile", "portugal", "naples"];
  for (const a of ids) for (const b of ids) {
    const x = N(w, a), y = N(w, b);
    if (x === undefined || y === undefined || x === y || w.nationStateFaith[x] !== cat || w.nationStateFaith[y] !== cat) continue;
    if (dip.relations.stateOf(w.diplomacy.graph, a, b) || dip.relations.overlord(w.diplomacy.graph, a) || dip.relations.overlord(w.diplomacy.graph, b)) continue;
    if (dip.relations.alliesOf(w.diplomacy.graph, a).length || dip.relations.alliesOf(w.diplomacy.graph, b).length) continue;
    return [x, y];
  }
  throw new Error("no pair");
}

/** Gives every province of `from` to `to`. */
function hand(w: World, from: string, to: string): void {
  for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === N(w, from)) w.provinceOwner[p] = N(w, to);
}

describe("heads of the faith", () => {
  it("starts 1444 with the Patriarch's patron Byzantium, the Catholicos's the Qara Qoyunlu, the Mamluks as Caliph and the Pope with no patron (RELG-153)", () => {
    const w = createWorld(rules, 1, tiles);
    expect(patronOf(w, "pope")).toBe(-1);
    expect(patronOf(w, "ecumenical_patriarch")).toBe(N(w, "byzantium"));
    expect(patronOf(w, "catholicos")).toBe(N(w, "qara_qoyunlu"));
    expect(patronOf(w, "caliph")).toBe(N(w, "mamluks"));
    expect(seatOwner(w, H.headById("pope")!)).toBe(N(w, "papal_states"));
    // The Dalai Lama comes in 1578.
    expect(faithHeadsView(w, N(w, "tibet")).seats.some((s) => s.head === "dalai_lama")).toBe(false);
    // Every orthodox realm holds the patron's tie toward Byzantium; Byzantium has the badge (RELG-146, RELG-138).
    expect(ledger(w, "novgorod", "byzantium").some((e) => e.name === "The Ecumenical Patriarch favours us" && e.weight === 15)).toBe(true);
    expect(faithBadge(w, N(w, "byzantium"))?.text).toBe("Patron of the Ecumenical Patriarch");
    expect(faithBadge(w, N(w, "mamluks"))?.text).toBe("Caliph");
  });

  it("shows the Head of the faith card, and a faith with no head says why (RELG-135)", () => {
    const w = createWorld(rules, 1, tiles);
    const c = headCard(w, "catholic", N(w, "castile"));
    expect(c.title).toBe("The Pope");
    expect(c.seat).toBe("Rome");
    expect(c.holder).toBe(N(w, "papal_states"));
    expect(c.patron).toBe(-1);
    expect(c.gets.length).toBeGreaterThan(0);
    expect(c.owes.length).toBeGreaterThan(0);
    expect(c.action).toEqual({ kind: "conclave", label: "Send gold to the conclave", why: "No conclave sits" });
    expect(headCard(w, "hindu", -1).line).toMatch(/^Hindu has no single head/);
    expect(headCard(w, "protestant", -1).leadership).toBe("crown");
  });

  it("holds a conclave when the ruler of the Papal States dies: gold buys votes up to the cardinals, Rome casts 10 (RELG-142, RELG-136)", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = N(w, "france");
    w.player = fr;
    const k = cardinals(w, fr);
    expect(k).toBeGreaterThan(0);
    const news: News[] = [];
    rulerDied(w, N(w, "papal_states"), news);
    expect(news.some((x) => x.text.startsWith("The Pope is dead"))).toBe(true);
    expect(w.faithHeads.conclave).not.toBeNull();
    w.nationTreasury[fr] = 10000;
    expect(refused(w, { type: "conclaveGold", gold: 50 }, fr)).toBe("Gold goes in steps of 100");
    // Enough gold that France beats Rome's 10.
    const need = Math.max(0, 11 - k) * 100;
    if (need > 0) for (let g = 0; g < need; g += 100) expect(refused(w, { type: "conclaveGold", gold: 100 }, fr)).toBeNull();
    expect(refused(w, { type: "conclaveGold", gold: (k + 1) * 100 }, fr)).toBe("No more gold votes than you have cardinals");
    const card = headCard(w, "catholic", fr);
    expect(card.conclave!.rows.length).toBeLessThanOrEqual(4);
    expect(card.conclave!.rows.some((r) => r.n === fr)).toBe(true);
    w.date = { year: 1445, month: 1, day: 1 };
    const out: News[] = [];
    monthlyFaithHeads(w, out);
    expect(w.faithHeads.conclave).toBeNull();
    const votes = Object.fromEntries(conclaveEntries(w).map((e) => [e.n, e.cardinals]));
    const best = Math.max(...Object.values(votes));
    // France wins unless an AI's gold beat it.
    expect(patronOf(w, "pope") === fr || best + 0 > k).toBe(true);
    if (patronOf(w, "pope") === fr) {
      expect(ledger(w, "castile", "france").some((e) => e.name === "The Pope favours us")).toBe(true);
      expect(faithBadge(w, fr)?.text).toBe("Patron of the Pope");
    }
  });

  it("censures a war between fellow believers: the wrong, the Punish aim, the lords waver, and a white peace ends it at once (RELG-149 to RELG-151)", () => {
    const w = createWorld(rules, 1, tiles);
    const [ar, ge] = catholicPair(w);
    w.player = ar;
    expect(faithHeadsView(w, ar).censure[ge]).toMatchObject({ head: "the Pope", wrong: "Censured by the Pope", weight: -25 });
    const before = w.lords.filter((l) => l.nation === ar).map((l) => l.loyalty);
    expect(refused(w, { type: "declareWar", target: ge }, ar)).toBeNull();
    expect(censuresOf(w, ar)).toHaveLength(1);
    expect(faithBadge(w, ar)).toEqual({ text: "Censured", warn: true });
    const [A, other] = [w.nationIds[ar]!, w.nationIds[[N(w, "castile"), N(w, "france")].find((x) => x !== ar && x !== ge)!]!];
    expect(ledger(w, other, A).some((e) => e.name === "Censured by the Pope" && e.weight === -25 && e.fadeYears === undefined)).toBe(true);
    expect(dip.holdsAim(w.diplomacy, other, A, "punish")).toBe(true);
    const after = w.lords.filter((l) => l.nation === ar).map((l) => l.loyalty);
    if (before.length) expect(after).not.toEqual(before);
    // A white peace gives back all: the censure ends at once and its wrong fades over 10 years.
    offerPeace(w, ar, ge, "white", [], true);
    w.date = { year: 1444, month: 12, day: 1 };
    monthlyFaithHeads(w, []);
    expect(censuresOf(w, ar)).toHaveLength(0);
    expect(ledger(w, other, A).find((e) => e.name === "Censured by the Pope")?.fadeYears).toBe(10);
    expect(dip.holdsAim(w.diplomacy, other, A, "punish")).toBe(false);
  });

  it("does not censure across faiths, nor a crown-headed church (RELG-149)", () => {
    const w = createWorld(rules, 1, tiles);
    w.player = N(w, "castile");
    expect(faithHeadsView(w, N(w, "castile")).censure[N(w, "granada")]).toBeUndefined();
    w.nationStateFaith[N(w, "sweden")] = FAITH_IDS.indexOf("protestant");
    w.nationStateFaith[N(w, "denmark")] = FAITH_IDS.indexOf("protestant");
    w.player = N(w, "sweden");
    expect(faithHeadsView(w, N(w, "sweden")).censure[N(w, "denmark")]).toBeUndefined();
  });

  it("calls the patron to defend a holder of a holy place attacked by another faith; refusing breaks an oath (RELG-147)", () => {
    const w = createWorld(rules, 1, tiles);
    const fr = N(w, "france");
    w.faithHeads.patron.pope = fr;
    w.faithHeads.patronFaith.pope = "catholic";
    syncFavour(w);
    w.player = fr;
    expect(refused(w, { type: "declareWar", target: N(w, "castile") }, N(w, "morocco"))).toBeNull();
    const call = w.diplomacy.calls.find((c) => c.called === "france" && c.against === "morocco");
    expect(call?.kind).toBe("defensive");
    const oaths = dip.oathsBroken(w.diplomacy, "france");
    expect(refused(w, { type: "answerCall", call: call!.id, yes: false }, fr)).toBeNull();
    expect(dip.oathsBroken(w.diplomacy, "france")).toBe(oaths + 1);
  });

  it("gives the Ottomans the Patriarch with Constantinople: no tie, communities served, every orthodox realm holds Seized the seat (RELG-140, RELG-144, RELG-145)", () => {
    const w = createWorld(rules, 1, tiles);
    w.provinceOwner[P(w, "p1662")] = N(w, "ottomans");
    monthlyFaithHeads(w, []);
    expect(patronOf(w, "ecumenical_patriarch")).toBe(N(w, "ottomans"));
    expect(ledger(w, "novgorod", "ottomans").some((e) => e.name === "Seized the seat" && e.weight === -20)).toBe(true);
    expect(ledger(w, "novgorod", "ottomans").some((e) => e.name.endsWith("favours us"))).toBe(false);
    expect(ledger(w, "novgorod", "byzantium").some((e) => e.name.endsWith("favours us"))).toBe(false);
    expect(w.nationServes[N(w, "ottomans") * FAITH_IDS.length + FAITH_IDS.indexOf("orthodox")]).toBe(1);
  });

  it("ends the Caliph when Mecca and Medina change hands, and lets the new Sunni holder claim it (RELG-141)", () => {
    const w = createWorld(rules, 1, tiles);
    const ot = N(w, "ottomans");
    w.player = ot;
    for (const id of ["p2932", "p2721"]) w.provinceOwner[P(w, id)] = ot;
    monthlyFaithHeads(w, []);
    expect(patronOf(w, "caliph")).toBe(-1);
    expect(refused(w, { type: "claimCaliphate" }, ot)).toBeNull();
    expect(faithBadge(w, ot)?.text).toBe("Caliph");
    expect(refused(w, { type: "claimCaliphate" }, ot)).toBe("you are the Caliph");
  });

  it("marks a patron who changes faith as having betrayed it (RELG-148)", () => {
    const w = createWorld(rules, 1, tiles);
    const en = N(w, "england");
    w.faithHeads.patron.pope = en;
    w.faithHeads.patronFaith.pope = "catholic";
    w.nationStateFaith[en] = FAITH_IDS.indexOf("anglican");
    monthlyFaithHeads(w, []);
    expect(patronOf(w, "pope")).toBe(-1);
    expect(ledger(w, "france", "england").some((e) => e.name === "Betrayed the faith" && e.weight === -30 && e.fadeYears === 30)).toBe(true);
    expect(faithBadge(w, en)?.text).toBe("Heads its church");
  });

  it("lets an Orthodox realm raise its own patriarch once Constantinople is under another faith (RELG-152)", () => {
    const w = createWorld(rules, 1, tiles);
    const no = N(w, "novgorod");
    w.player = no;
    expect(refused(w, { type: "raiseOwnPatriarch" }, no)).toBe("Constantinople must be held by a ruler of another faith");
    w.provinceOwner[P(w, "p1662")] = N(w, "ottomans");
    w.nationTreasury[no] = 1000;
    const why = refused(w, { type: "raiseOwnPatriarch" }, no);
    if (why === null) {
      expect(w.faithHeads.ownPatriarch).toContain(no);
      expect(faithBadge(w, no)?.text).toBe("Heads its church");
      expect(refused(w, { type: "raiseOwnPatriarch" }, no)).toBe("your church already has its own patriarch");
    } else expect(why).toBe("needs a great Orthodox house of worship in your capital");
  });

  it("names the Dalai Lama in 1578 with the holder of Lhasa as patron (RELG-154)", () => {
    const w = createWorld(rules, 1, tiles);
    w.date = { year: 1578, month: 1, day: 1 };
    monthlyFaithHeads(w, []);
    expect(patronOf(w, "dalai_lama")).toBe(N(w, "tibet"));
  });

  it("keeps the patrons, the conclave and the censures in the save (RELG-155)", () => {
    const w = createWorld(rules, 1, tiles);
    const [ar, ge] = catholicPair(w);
    w.player = ar;
    applyNow(w, { type: "declareWar", target: ge }, ar);
    rulerDied(w, N(w, "papal_states"), []);
    w.faithHeads.conclave!.gold[ar] = 200;
    w.faithHeads.ownPatriarch.push(N(w, "novgorod"));
    const back = restoreWorld(new Map(worldChunks(w, { playerNation: w.nationIds[ar]!, options: {} as never }).map((c) => [c.id, c])), rules, {}, tiles).world;
    expect(back.faithHeads.patron).toEqual(w.faithHeads.patron);
    expect(back.faithHeads.conclave).toEqual(w.faithHeads.conclave);
    expect(back.faithHeads.censures).toEqual(w.faithHeads.censures);
    expect(back.faithHeads.ownPatriarch).toEqual(w.faithHeads.ownPatriarch);
  });

  it("the Hejaz's own seat is Mecca and Medina (the map's provinces)", () => {
    const w = createWorld(rules, 1, tiles);
    expect(seatOwner(w, H.headById("caliph")!)).toBe(N(w, "hejaz"));
    void hand;
  });
});
