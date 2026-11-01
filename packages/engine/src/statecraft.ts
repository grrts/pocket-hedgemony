import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import { cedeProvince, relationState, type News } from "./war.ts";
import { grabbedLand, nameAbroadView, type NameAbroadView } from "./conquest.ts";
import { priceContext, priceOfWar, type PriceOfWar } from "./priceOfWar.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { goalAsks } from "./goals.ts";
import goalsConfig from "../../rules/data/domain/events.json" with { type: "json" };
import { LEDGER, LEDGER_LINES } from "./treasury.ts";
import { houseView, yearlyCrowns, type HouseView } from "./crowns.ts";
import { yearlyPeople } from "./people.ts";
import { aiCourting, courtingView, monthlyCourting, type CourtingView } from "./courting.ts";
import { bondOf, aiMayTakeSubject, aiOverlordEnvoys, aiOverlords, aiRisings, monthlySubjectEnvoys, makeSubject, seasonalSubjects, subjectByAgreement, subjectsView, type SubjectsView } from "./subjects.ts";

/**
 * Milestone 5, statecraft (first slice): envoys carry the realm's asks to
 * other courts. Every realm has envoy seats (DIPL-048); an envoy rides to the
 * court, stays a month, and the answer comes back a month after it is given
 * (DIPL-055 to DIPL-059, DIPL-082). Alliances and marriages are counted by the
 * reasons (DIPL-081); gifts and courtesy visits always land. Standing between
 * realms is the ledger's (DIPL-071 to DIPL-077). The AI sends its envoys by
 * the same counts (DIPL-177 to DIPL-179). The domain library keeps the rules;
 * this file feeds it the realm's numbers and turns its letters into news.
 */

const rel = dip.relations;

/** The envoy missions the player can send in this slice. */
export const ENVOY_ACTIONS = ["propose_alliance", "arrange_marriage", "courtesy_visit", "send_gift", "offer_overlordship", "ask_protection"] as const;
export type EnvoyAction = (typeof ENVOY_ACTIONS)[number];

/** A gift's worth in the diplomacy data's gold (the most a gift counts for: +30 at 0.2 a gold), and what it costs the treasury. */
const GIFT_DATA_GOLD = 150;
export const giftGold = (world: World): number => Math.round(GIFT_DATA_GOLD * world.rules.defines.works.goldScale);

/** Map pixels an envoy covers in one crossing unit (2 days, DIPL-055): about 30 km a day on the road. */
const PIXELS_PER_UNIT = 6;

const capital = (world: World, n: number): number => world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1;

/** Gives the library what it reads of each realm: soldiers, provinces, gold, and who is the player. */
export function syncCountries(world: World): void {
  const d = world.diplomacy;
  const soldiers = new Float64Array(world.nationCount);
  const provinces = new Int32Array(world.nationCount);
  const a = world.armies;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i]! >= 0) soldiers[a.owner[i]!]! += a.men[i]!;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0) provinces[world.provinceOwner[p]!]!++;
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n]) continue;
    const c = dip.country(d, world.nationIds[n]!);
    c.soldiers = soldiers[n]!;
    c.provinces = Math.max(1, provinces[n]!);
    c.gold = world.nationTreasury[n]!;
    c.goldToSpare = world.nationTreasury[n]! > giftGold(world) * 2;
    c.ai = !isHuman(world, n);
    // Every ruling house has a son or daughter to marry until dynasties are simulated (DIPL-104).
    c.unmarriedChildren = 2;
    c.capital = world.rules.nations[n]!.capital;
  }
}

/** Crossing units between two courts' capitals on the map (DIPL-055). */
function routeUnits(world: World, a: number, b: number): number {
  const pa = world.rules.provinces[capital(world, a)];
  const pb = world.rules.provinces[capital(world, b)];
  const px = pa && pb ? Math.hypot((pa.x ?? 0) - (pb.x ?? 0), (pa.y ?? 0) - (pb.y ?? 0)) : 60;
  return Math.max(1, Math.ceil(px / PIXELS_PER_UNIT));
}

/** The road between two courts, kept for a pair once an envoy is sent between them. */
export function ensureRoute(world: World, a: number, b: number): void {
  const d = world.diplomacy;
  const key = dip.pairKey(world.nationIds[a]!, world.nationIds[b]!);
  if (!d.routes[key]) d.routes[key] = { land: [{ kind: "land", units: routeUnits(world, a, b) }] };
}

/** Days on the road between two courts for a count, without storing a route for every pair counted. */
function countDays(world: World): (a: string, b: string) => number {
  const d = world.diplomacy;
  return (a, b) => {
    if (d.routes[dip.pairKey(a, b)]) return dip.routeDays(dip.envoyRoute(d, a, b).legs);
    return routeUnits(world, world.nationIndex.get(a) ?? -1, world.nationIndex.get(b) ?? -1) * dip.config.envoys.days_per_crossing_unit;
  };
}

/** Envoy seats of a realm, and how many are free. */
export function seatsOf(world: World, n: number): { seats: number; free: number } {
  const id = world.nationIds[n]!;
  return { seats: dip.envoySeats(world.diplomacy, id), free: dip.freeSeats(world.diplomacy, id) };
}

/** An envoy of n on the way to, or at, t's court. */
const envoyTo = (world: World, n: number, t: number) => world.diplomacy.envoys.find((e) => e.country === world.nationIds[n] && e.target === world.nationIds[t] && (e.status === "road" || e.status === "court"));

/** Why realm n can't send this envoy to t now, or null. */
export function whyNotEnvoy(world: World, n: number, t: number, action: string): string | null {
  if (!(ENVOY_ACTIONS as readonly string[]).includes(action)) return "no such mission";
  return whyNotCourt(world, n, t) ?? whyNotMission(world, n, t, action);
}

/** Why realm n can't send any envoy to t now, or null. */
function whyNotCourt(world: World, n: number, t: number): string | null {
  if (n < 0 || t < 0 || n >= world.nationCount || t >= world.nationCount || n === t) return "no such realm";
  if (world.nationGone[t]) return "that realm is gone";
  const a = world.nationIds[n]!;
  if (rel.has(world.diplomacy.graph, "at_war", a, world.nationIds[t]!)) return "you are at war";
  if (envoyTo(world, n, t)) return "an envoy is already on the way";
  if (dip.freeSeats(world.diplomacy, a) <= 0) return "no free envoy: every seat is taken";
  return null;
}

/** Why realm n can't send this mission to t, once an envoy can ride there. */
function whyNotMission(world: World, n: number, t: number, action: string): string | null {
  const g = world.diplomacy.graph;
  const a = world.nationIds[n]!;
  const b = world.nationIds[t]!;
  if (action === "propose_alliance") {
    if (rel.has(g, "alliance", a, b)) return "already allies";
    if (rel.overlord(g, a) === b || rel.overlord(g, b) === a) return "a subject is bound already";
    if (rel.stance(g, a, b) === "hostile" || rel.stance(g, b, a) === "hostile") return "they are hostile";
  }
  if (action === "offer_overlordship" || action === "ask_protection") {
    const [o, sub] = action === "offer_overlordship" ? [n, t] : [t, n];
    if (rel.overlord(g, world.nationIds[sub]!)) return action === "offer_overlordship" ? "they already answer to an overlord" : "you already answer to an overlord";
    if (rel.overlord(g, world.nationIds[o]!) === world.nationIds[sub]) return "a subject is bound already";
    if (rel.has(g, "alliance", a, b)) return "you are allies: end the alliance first";
    // Only the smaller realm comes under the larger (SUBJ-086).
    const size = (k: number) => dip.country(world.diplomacy, world.nationIds[k]!).provinces ?? 1;
    if (size(sub) >= size(o)) return action === "offer_overlordship" ? "they are not smaller than you" : "you are not smaller than them";
  }
  if (action === "arrange_marriage" && dip.marriagesBetween(world.diplomacy, a, b) > 0) return "your houses are married already";
  if (action === "send_gift" && world.nationTreasury[n]! < giftGold(world)) return `needs ${giftGold(world)} gold`;
  return null;
}

/** The missions the reasons decide, which show a hint before sending (DIPL-229); a visit and a gift always land. */
const COUNTED: readonly string[] = ["propose_alliance", "arrange_marriage", "offer_overlordship", "ask_protection"];

/** How the count of n's ask of t stands now (DIPL-229). */
function countNow(world: World, n: number, t: number, action: string, days: (a: string, b: string) => number, demandKind?: string): number {
  const ask: dip.Ask = { action, asker: world.nationIds[n]!, asked: world.nationIds[t]!, ...(demandKind ? { demandKind } : {}) };
  return dip.countAsk(world.diplomacy, ask, days).total;
}

/**
 * How each ask of the player's would count with a realm now: the missions the
 * reasons decide, tribute, and a province demand before It's our heartland.
 * The view reads them for every realm, and a count reads the whole realm, so
 * they are counted once a month, as the world stands then; the word is rough
 * enough that a gift arriving mid-month waits for the next (DIPL-229).
 */
const hintCache = new WeakMap<World, { month: string; player: number; by: Map<number, Record<string, number>> }>();

function countsNow(world: World, player: number, n: number, days: (a: string, b: string) => number): Record<string, number> {
  const month = dip.monthOf(world.diplomacy.date);
  let c = hintCache.get(world);
  if (!c || c.month !== month || c.player !== player) hintCache.set(world, (c = { month, player, by: new Map() }));
  let out = c.by.get(n);
  if (!out) {
    out = {};
    for (const a of COUNTED) out[a] = countNow(world, player, n, a, days);
    for (const k of DEMAND_KINDS) out[k] = countNow(world, player, n, "demand", days, k);
    c.by.set(n, out);
  }
  return out;
}

/** Sends an envoy (an order of the player's or the AI's). */
export function sendEnvoy(world: World, n: number, t: number, action: string): string | null {
  const why = whyNotEnvoy(world, n, t, action);
  if (why) return why;
  ensureRoute(world, n, t);
  const d = world.diplomacy;
  const ask: Partial<dip.Ask> = action === "send_gift" ? { gift: GIFT_DATA_GOLD } : {};
  if (action === "send_gift") world.nationTreasury[n] = world.nationTreasury[n]! - giftGold(world);
  try {
    dip.sendEnvoy(d, { country: world.nationIds[n]!, target: world.nationIds[t]!, action, ask });
  } catch (e) {
    if (action === "send_gift") world.nationTreasury[n] = world.nationTreasury[n]! + giftGold(world);
    return e instanceof Error ? e.message : String(e);
  }
  // The library also takes a gift from its own copy of the gold; the treasury paid it above.
  return null;
}

/** The demands the player can make in this slice (Demand kinds table, DIPL-111). */
export const DEMAND_KINDS = ["hand_over_province", "pay_tribute"] as const;
export type DemandKind = (typeof DEMAND_KINDS)[number];

/** Why realm n can't make any demand of t now, or null: an envoy, and a war aim on them or a Rival or Hostile stance (DIPL-111). */
export function whyNotDemandAtAll(world: World, n: number, t: number): string | null {
  const why = whyNotEnvoy(world, n, t, "courtesy_visit");
  if (why) return why;
  const d = world.diplomacy;
  const a = world.nationIds[n]!;
  const b = world.nationIds[t]!;
  if (rel.overlord(d.graph, a) === b || rel.overlord(d.graph, b) === a) return "a subject is bound already";
  const stance = rel.stance(d.graph, a, b);
  const aim = dip.warAimsOf(d, a, b).some((x) => x.aim !== "raid" && x.aim !== "no_aim");
  if (stance !== "rival" && stance !== "hostile" && !aim) return "you need a reason: a war aim on them, or a Rival or Hostile stance toward them";
  return null;
}

/** Their provinces that border your land: the ones you can demand (Hand over a province needs a border). */
export function demandableProvinces(world: World, n: number, t: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== t) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      if (world.provinceOwner[world.adjList[k]!] === n) {
        out.push(p);
        break;
      }
    }
  }
  return out;
}

/** Why this demand can't be made now, or null (Demand kinds table). */
export function whyNotDemand(world: World, n: number, t: number, kind: string, p = -1): string | null {
  if (!(DEMAND_KINDS as readonly string[]).includes(kind)) return "no such demand";
  const why = whyNotDemandAtAll(world, n, t);
  if (why) return why;
  if (kind === "pay_tribute") {
    if (!demandableProvinces(world, n, t).length) return "you share no border";
    if (rel.overlord(world.diplomacy.graph, world.nationIds[t]!)) return "they already answer to an overlord";
  }
  if (kind === "hand_over_province") {
    if (p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== t) return "that province is not theirs";
    if (!demandableProvinces(world, n, t).includes(p)) return "it does not border your land";
  }
  return null;
}

/** Sends an envoy with a demand (MakeDemand): counted from base −60 when he arrives (DIPL-111, DIPL-112). */
export function makeDemand(world: World, n: number, t: number, kind: string, p = -1): string | null {
  const why = whyNotDemand(world, n, t, kind, p);
  if (why) return why;
  ensureRoute(world, n, t);
  const d = world.diplomacy;
  const ask: Partial<dip.Ask> = { demandKind: kind };
  if (kind === "hand_over_province") {
    const id = world.provinceIds[p]!;
    // The library reads the province for It's our heartland (their capital).
    dip.province(d, id, world.nationIds[t]!).capital = world.rules.nations[t]!.capital === id;
    ask.province = id;
  }
  try {
    dip.sendEnvoy(d, { country: world.nationIds[n]!, target: world.nationIds[t]!, action: "demand", ask });
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  return null;
}

/** A demand given in (DIPL-113): the province changes hands, or they become a Tributary (SUBJ-005). */
function demandGivenIn(world: World, asker: number, asked: number, kind: string, province: string | undefined, news: News[]): void {
  if (kind === "hand_over_province" && province) {
    const p = world.provinceIndex.get(province);
    if (p !== undefined && world.provinceOwner[p] === asked) {
      cedeProvince(world, p, asker, news);
      // Neighbours remember land grabbed near them (DIPL-222).
      if (world.provinceOwner[p] === asker) grabbedLand(world, [p], new Set([asked]), false);
    }
  }
  if (kind === "pay_tribute" && !rel.overlord(world.diplomacy.graph, world.nationIds[asked]!)) {
    try {
      makeSubject(world, asked, asker, "tributary");
      news.push({ kind: "envoy", text: `${world.rules.nations[asked]!.name} agrees to pay tribute to ${world.rules.nations[asker]!.name}.`, nations: [asked, asker] });
    } catch {
      // A tie the relation rules forbid (an alliance, a truce of another kind): the demand lapses.
    }
  }
}

/** Breaks an alliance (DIPL-103): an Oath broken and the wrong Broke our alliance. */
export function breakAlliance(world: World, n: number, t: number): string | null {
  const a = world.nationIds[n];
  const b = world.nationIds[t];
  if (!a || !b || !rel.has(world.diplomacy.graph, "alliance", a, b)) return "not allies";
  dip.breakAlliance(world.diplomacy, a, b);
  return null;
}

/** What an answer letter says, in the player's words. */
const ACTION_TEXT: Record<string, { yes: string; no: string; done: string }> = {
  propose_alliance: { yes: "agrees to an alliance", no: "turns down an alliance", done: "" },
  arrange_marriage: { yes: "agrees to a royal marriage", no: "turns down a royal marriage", done: "" },
  courtesy_visit: { yes: "", no: "", done: "receives our envoy kindly" },
  send_gift: { yes: "", no: "", done: "accepts our gift" },
  seek_vote: { yes: "", no: "", done: "hears our case for the crown" },
  demand: { yes: "gives in to our demand", no: "refuses our demand", done: "" },
};

/** The answer letter in the player's words ("Castile agrees to an alliance"). */
export function letterText(world: World, l: dip.Letter): string {
  const from = world.rules.nations[world.nationIndex.get(l.from) ?? -1]?.name ?? l.from;
  const t = ACTION_TEXT[l.action]?.[l.answer];
  return `${from} ${t || (l.answer === "yes" ? "says yes" : l.answer === "no" ? "says no" : "answers")}`;
}

/**
 * The month of statecraft: the realms' numbers go to the library, envoys
 * arrive and come home, ledger entries fade, letters that arrive this month
 * become the player's news, and some of the AI realms send envoys.
 */
export function monthlyStatecraft(world: World, news: News[]): void {
  const d = world.diplomacy;
  syncCountries(world);
  dip.envoysAndLedgers(d);
  const month = dip.monthOf(d.date);
  const me = world.player >= 0 ? world.nationIds[world.player] : undefined;
  for (const l of d.letters) {
    if (l.deliverOn !== month) continue;
    const to = world.nationIndex.get(l.to);
    if (to === undefined) continue;
    if (l.to === me || l.answer === "yes") {
      const from = world.nationIndex.get(l.from)!;
      news.push({ kind: "envoy", text: letterText(world, l), nations: l.to === me ? [to] : [to, from] });
      if (me && l.answer === "yes" && l.action === "propose_alliance" && l.to !== me && l.from !== me) alliedAgainstYou(world, to, from, news);
    }
  }
  // Letters are kept two years for the Why? on the Diplomacy tab; the library's event log is not kept.
  d.letters = d.letters.filter((l) => dip.monthsBetween(l.deliverOn, month) < 24);
  d.envoys = d.envoys.filter((e) => (e.status !== "home" && e.status !== "failed") || dip.monthsBetween(dip.monthOf(e.returnDate ?? e.arrival), month) < 12);
  libraryEvents(world, news);
  seasonalSubjects(world, news);
  monthlySubjectEnvoys(world, news);
  aiRisings(world, news);
  aiOverlords(world, news);
  aiOverlordEnvoys(world, news);
  // Everyone ages and may die each January, then claims lapse (REALM-270, SUBJ-126).
  yearlyPeople(world, news);
  yearlyCrowns(world, news);
  monthlyCourting(world, news);
  aiCourting(world, (s) => bondOf(world, s)?.loyalty ?? null);
  aiEnvoys(world);
  // An AI envoy to a near court arrives this month: the player hears of the ask at once.
  libraryEvents(world, news);
}

/**
 * DIPL-244: when two realms that both fear the player ally, and one of them
 * borders the player, the news says they have allied against the player out
 * of fear.
 */
export function alliedAgainstYou(world: World, a: number, b: number, news: News[]): void {
  const near = neighbourRealms(world)[world.player]!;
  if (!dip.alliedOutOfFear(world.diplomacy, world.nationIds[a]!, world.nationIds[b]!, world.nationIds[world.player]!, (x) => near.has(world.nationIndex.get(x) ?? -1))) return;
  const name = (k: number) => world.rules.nations[k]!.name;
  news.push({ kind: "envoy", text: `${name(a)} and ${name(b)} ally out of fear of your strength: they will answer each other's call against you.`, nations: [world.player, a, b] });
}

/** Acts on what the library reports: subject ties agreed, demands given in, and asks waiting on the player (DIPL-211). */
export function libraryEvents(world: World, news: News[]): void {
  const d = world.diplomacy;
  for (const e of d.events) {
    if (e.type === "SubjectByAgreementAgreed") {
      const o = world.nationIndex.get(String(e.overlord));
      const s = world.nationIndex.get(String(e.subject));
      // Ask for protection comes from the subject; Offer overlordship from the overlord (SUBJ-086).
      const asked = d.letters.some((l) => l.action === "ask_protection" && l.from === String(e.overlord) && l.to === String(e.subject) && l.answer === "yes");
      if (o !== undefined && s !== undefined) subjectByAgreement(world, o, s, asked, news);
      continue;
    }
    if (e.type === "AskAwaitingAnswer") {
      const asker = world.nationIndex.get(String(e.asker));
      if (asker !== undefined && world.player >= 0) news.push({ kind: "envoy", text: `${world.rules.nations[asker]!.name}'s envoy ${ASK_TEXT[String(e.action)] ?? "asks something of you"}.`, nations: [world.player, asker] });
      continue;
    }
    if (e.type !== "DemandGivenIn") continue;
    const asker = world.nationIndex.get(String(e.asker));
    const asked = world.nationIndex.get(String(e.asked));
    if (asker !== undefined && asked !== undefined) demandGivenIn(world, asker, asked, String(e.kind), e.province === undefined ? undefined : String(e.province), news);
  }
  d.events.length = 0;
}

/** What an envoy at the player's court asks, in the alert's words. */
const ASK_TEXT: Record<string, string> = {
  propose_alliance: "proposes an alliance",
  arrange_marriage: "proposes a royal marriage",
  demand: "comes with a demand",
  offer_overlordship: "offers you protection as their tributary",
  ask_protection: "asks for your protection",
};

/** What a yes to an ask at the player's court brings, for the news. */
const ASK_DONE: Record<string, string> = {
  propose_alliance: "you are allies",
  arrange_marriage: "your houses are married",
  offer_overlordship: "you become their tributary",
  ask_protection: "they become your subject",
};

/** Why the player can't answer this ask now, or null. */
function whyNotAnswer(world: World, n: number, p: dip.PendingAsk): string | null {
  const me = world.nationIds[n];
  if (!me || p.ask.asked !== me) return "that ask is not yours to answer";
  if (rel.has(world.diplomacy.graph, "at_war", p.ask.asker, me)) return "you are at war with them now";
  return null;
}

/** The player gives in to, agrees to or refuses an ask at their court (AnswerAsk, DIPL-212). */
export function answerAsk(world: World, n: number, id: string, yes: boolean, news: News[]): string | null {
  const d = world.diplomacy;
  const p = (d.asks ?? []).find((x) => x.id === id);
  if (!p) return "that ask has lapsed";
  const why = whyNotAnswer(world, n, p);
  if (why) {
    if (why !== "that ask is not yours to answer") d.asks = d.asks!.filter((x) => x !== p);
    return why;
  }
  syncCountries(world);
  try {
    dip.answerAsk(d, id, yes);
  } catch (e) {
    return e instanceof Error ? e.message : String(e);
  }
  const asker = world.nationIndex.get(p.ask.asker)!;
  const name = world.rules.nations[asker]!.name;
  const what = p.ask.action === "demand" ? (yes ? `You give in to ${name}'s demand.` : `You refuse ${name}'s demand.`) : yes ? `You agree to ${name}'s ask: ${ASK_DONE[p.ask.action] ?? "it is done"}.` : `You turn down ${name}'s envoy.`;
  news.push({ kind: "envoy", text: what, nations: [n, asker] });
  libraryEvents(world, news);
  return null;
}

/** Realms next to each realm, from the map; worked out again when owners change. */
const neighbourCache = new WeakMap<World, { key: string; table: Set<number>[] }>();
export function neighbourRealms(world: World): Set<number>[] {
  let owned = 0;
  for (let p = 0; p < world.provinceCount; p++) owned = (owned * 31 + world.provinceOwner[p]! + 2) | 0;
  const key = String(owned);
  const hit = neighbourCache.get(world);
  if (hit && hit.key === key) return hit.table;
  const table = world.nationIds.map(() => new Set<number>());
  for (let p = 0; p < world.provinceCount; p++) {
    const a = world.provinceOwner[p]!;
    if (a < 0) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
      const b = world.provinceOwner[world.adjList[k]!]!;
      if (b >= 0 && b !== a) table[a]!.add(b);
    }
  }
  neighbourCache.set(world, { key, table });
  return table;
}

/** AI realms consider their envoys once a year, a twelfth of them each month, so the work is spread. */
const AI_EVERY_MONTHS = 12;

/**
 * The AI's envoys (DIPL-177 to DIPL-179): a realm with a free seat looks at
 * its neighbours, counts an alliance and a marriage with each the way the
 * answer will, and sends the best ask that would be a yes; when the best is a
 * near miss (within the data's gift-first margin) it sends a gift first.
 */
function aiEnvoys(world: World): void {
  const d = world.diplomacy;
  const turn = world.date.year * 12 + world.date.month;
  const near = neighbourRealms(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (isHuman(world, n) || world.nationGone[n]) continue;
    const id = world.nationIds[n]!;
    // A Threatened realm weighs its envoys more often (DIPL-239).
    const fear = dip.fearLevel(dip.country(d, id).fears);
    if ((n + turn) % dip.envoyEveryMonths(fear, AI_EVERY_MONTHS) !== 0) continue;
    if (dip.freeSeats(d, id) <= 0) continue;
    // The neighbour who thinks best of us is the one worth an envoy; only that court's asks are counted in full.
    let t = -1;
    let warmest = -Infinity;
    for (const x of near[n]!) {
      if (world.nationGone[x]) continue;
      const w = dip.standing(d, world.nationIds[x]!, id);
      if (w > warmest) {
        t = x;
        warmest = w;
      }
    }
    // Besides the warmest neighbour, the realms its ally and subject goals name (EVT-106).
    const asks = goalAsks(world, n);
    // A Threatened realm also weighs an alliance with realms beside what it fears that fear it too (DIPL-239).
    const partners = fear === "threatened" ? fearPartners(world, n, near) : [];
    if (t < 0 && !asks.length && !partners.length) continue;
    const days = countDays(world);
    let best: { t: number; action: string; total: number } | null = null;
    // Nothing changes while the asks are weighed: each court's envoy check and the reach are read once.
    const court = new Map<number, string | null>();
    let mayTake: boolean | undefined;
    const warm = t;
    const weigh = (t: number, action: string, extra: number) => {
      if (!(ENVOY_ACTIONS as readonly string[]).includes(action)) return;
      let why = court.get(t);
      if (why === undefined) court.set(t, (why = whyNotCourt(world, n, t)));
      if (why !== null || whyNotMission(world, n, t, action)) return;
      // An AI overlord takes no subject that would put it more than 1 over its reach (SUBJ-098).
      if (action === "offer_overlordship" && !(mayTake ??= aiMayTakeSubject(world, n))) return;
      // The warmest neighbour's standing toward us is known already.
      const count = dip.countAsk(d, { action, asker: id, asked: world.nationIds[t]! }, days, t === warm ? warmest : undefined);
      // The AI counts the other court's notoriety against binding itself to it (DIPL-223).
      const total = count.total - (dip.NOTORIETY_ASKS.includes(action) ? dip.notorietyPoints(d, world.nationIds[t]!) : 0) + extra;
      if (!best || total > best.total) best = { t, action, total };
    };
    if (t >= 0) for (const action of ["propose_alliance", "arrange_marriage", "offer_overlordship"] as const) weigh(t, action, 0);
    for (const a of asks) for (const action of a.actions) weigh(a.target, action, goalsConfig.goals.envoy_points_per_pull * a.pull);
    for (const x of partners) if (x !== t) weigh(x, "propose_alliance", 0);
    if (!best) continue;
    best = best as { t: number; action: string; total: number };
    const choice = dip.aiChoose(best.total);
    if (choice === "send") sendEnvoy(world, n, best.t, best.action);
    else if (choice === "gift_first" && dip.country(d, id).goldToSpare) sendEnvoy(world, n, best.t, "send_gift");
  }
}

/** Partners against a common fear (DIPL-239), by index: the map's realms beside the realm n is Threatened of most that fear it too. */
export function fearPartners(world: World, n: number, near: Set<number>[] = neighbourRealms(world)): number[] {
  const ids = (x: string) => {
    const k = world.nationIndex.get(x);
    return k === undefined ? [] : [...near[k]!].filter((j) => !world.nationGone[j]).map((j) => world.nationIds[j]!);
  };
  return dip.fearPartners(world.diplomacy, world.nationIds[n]!, ids).map((x) => world.nationIndex.get(x)!);
}

/** One line of the standing between two realms, as the Diplomacy tab shows it. */
export interface StandingLine {
  name: string;
  weight: number;
}

const RELATION_NAME: Record<string, string> = { alliance: "Allies", friendly: "Friendly", rival: "Rivals", hostile: "Hostile", at_war: "At war", truce: "Truce" };

/** What another realm thinks of the player: its standing, the word, and the ledger lines behind it (DIPL-071 to DIPL-077). */
export function standingOf(world: World, holder: number, other: number): { standing: number; word: string; lines: StandingLine[] } {
  const d = world.diplomacy;
  const a = world.nationIds[holder]!;
  const b = world.nationIds[other]!;
  // The ledger and relation line are read once, for the standing and its lines alike.
  const ledger = dip.ledgerOf(d, a, b);
  const line = dip.relationLine(d, a, b);
  const n = dip.standing(d, a, b, ledger, line);
  const lines: StandingLine[] = ledger.map((e) => ({ name: e.name, weight: Math.round(e.weight) }));
  if (line.weight) lines.unshift({ name: RELATION_NAME[line.relation] ?? line.relation.replace(/_/g, " "), weight: line.weight });
  return { standing: Math.round(n), word: dip.standingWord(n), lines };
}

/** What the Diplomacy tab shows of statecraft for the player (DIPL-197 to DIPL-202). */
export interface StatecraftView {
  /** The player's realm. */
  me: number;
  seats: number;
  free: number;
  /** Gold a gift costs. */
  giftGold: number;
  /** The player's envoys abroad: where, on what mission, and when they reach the court and come home. */
  envoys: { target: number; action: string; status: string; arrival: string; home?: string }[];
  /** Answers received in the last two years, newest first, with the reasons each court counted. */
  letters: { from: number; action: string; answer: "yes" | "no" | "done"; text: string; reasons: { name: string; number: number }[]; total?: number; month: string }[];
  /**
   * For every other realm: what it thinks of the player, the ledger behind it, why each mission can't be sent now
   * (null when it can) and, for one the reasons decide that can be sent, how likely a yes is (DIPL-229), in ENVOY_ACTIONS order;
   * and whom it fears (DIPL-235).
   */
  realms: Record<number, { standing: number; word: string; lines: StandingLine[]; why: (string | null)[]; hints: (dip.AskHint | null)[]; married: boolean; demands: DemandView; notoriety: number; price: PriceOfWar | null; fears: FearView[] }>;
  /** The player's own name abroad: notoriety, Lands taken against the league threshold and the leagues against them (DIPL-225). */
  nameAbroad: NameAbroadView;
  /** The player's subjects and its own overlord (SUBJ-091, SUBJ-102). */
  subjects: SubjectsView | null;
  /** The houses married into the player's and its claims to other thrones (SUBJ-130). */
  house: HouseView | null;
  /** The player's courting envoys, and why each foreign lord or subject can't be courted (DIPL-220). */
  courting: CourtingView | null;
  /** Envoys waiting at the player's court for an answer, oldest first (DIPL-211): what they ask, and the month it stands until. */
  asks: AskView[];
}

/** A neighbour a realm is Wary or Threatened of this month (DIPL-231, DIPL-235): who, how much, and its strength over the realm's side's. */
export interface FearView {
  nation: number;
  level: "wary" | "threatened";
  ratio: number;
}

/** A reason's name with the realms it names in brackets read by their names ("We fear the same realm (Ottomans)"). */
export function reasonName(world: World, name: string): string {
  return name.replace(/\(([^()]*)\)$/, (all, ids: string) => {
    const names = ids.split(", ").map((id) => world.nationIndex.get(id));
    return names.every((k) => k !== undefined) ? `(${names.map((k) => world.rules.nations[k!]!.name).join(", ")})` : all;
  });
}

/** The neighbours a realm fears this month, most feared first. */
export function fearsOf(world: World, n: number): FearView[] {
  return (dip.country(world.diplomacy, world.nationIds[n]!).fears ?? []).flatMap((f) => {
    const x = world.nationIndex.get(f.of);
    return x === undefined || world.nationGone[x] ? [] : [{ nation: x, level: f.level, ratio: f.ratio }];
  });
}

/** An ask waiting on the player: the asker, the mission, a demand's kind and province, and the last month to answer. */
export interface AskView {
  id: string;
  from: number;
  action: string;
  kind?: string;
  province?: { province: number; name: string; capital: boolean };
  until: string;
}

/** The demands the player can make of a realm: why none can (null when some can), tribute or why not, and the border provinces. */
export interface DemandView {
  why: string | null;
  tribute: string | null;
  /** How likely they are to give in to each demand that can be made (DIPL-229). */
  tributeHint: dip.AskHint | null;
  provinces: { province: number; name: string; capital: boolean; hint: dip.AskHint }[];
}

export function statecraftView(world: World, player: number): StatecraftView | null {
  if (player < 0) return null;
  const d = world.diplomacy;
  const me = world.nationIds[player]!;
  const month = dip.monthOf(d.date);
  const { seats, free } = seatsOf(world, player);
  const envoys = d.envoys
    .filter((e) => e.country === me && (e.status === "road" || e.status === "court" || e.status === "returning" || e.status === "held"))
    .map((e) => ({ target: world.nationIndex.get(e.target) ?? -1, action: e.action, status: e.status, arrival: e.arrival, ...(e.returnDate ? { home: e.returnDate } : {}) }));
  const letters = d.letters
    .filter((l) => l.to === me && l.deliverOn <= month)
    .sort((a, b) => b.deliverOn.localeCompare(a.deliverOn))
    .map((l) => ({ from: world.nationIndex.get(l.from) ?? -1, action: l.action, answer: l.answer, text: letterText(world, l), reasons: l.reasons.map((r) => ({ name: reasonName(world, r.name), number: Math.round(r.number) })), ...(l.total !== undefined ? { total: Math.round(l.total) } : {}), month: l.deliverOn }));
  const realms: StatecraftView["realms"] = {};
  // The declare sheet's Price of war (WAR-229) for every realm the player could declare on, sharing the player's own reads.
  const ctx = priceContext(world, player);
  const days = countDays(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (n === player || world.nationGone[n]) continue;
    const s = standingOf(world, n, player);
    const why = whyNotDemandAtAll(world, player, n);
    const near = why ? [] : demandableProvinces(world, player, n);
    const capital = world.provinceIndex.get(world.rules.nations[n]!.capital);
    const tribute = why ? why : whyNotDemand(world, player, n, "pay_tribute");
    const whys = ENVOY_ACTIONS.map((a) => whyNotEnvoy(world, player, n, a));
    const counts = countsNow(world, player, n, days);
    // A province demand is counted like any other, with It's our heartland for their capital (DIPL-204).
    const heart = dip.config.actions.demand.heartland_province;
    const provinces = near.map((p) => ({ province: p, name: world.rules.provinces[p]!.name, capital: p === capital, hint: dip.askHint(counts.hand_over_province! + (p === capital ? heart : 0)) }));
    const demands: DemandView = { why, tribute, tributeHint: tribute === null ? dip.askHint(counts.pay_tribute!) : null, provinces };
    realms[n] = {
      ...s,
      why: whys,
      hints: ENVOY_ACTIONS.map((a, k) => (whys[k] === null && a in counts ? dip.askHint(counts[a]!) : null)),
      married: dip.marriagesBetween(d, me, world.nationIds[n]!) > 0,
      demands,
      notoriety: dip.notoriety(d, world.nationIds[n]!),
      price: mayPrice(world, player, n, ctx.counts) ? priceOfWar(world, player, n, ctx) : null,
      fears: fearsOf(world, n),
    };
  }
  const subjects = subjectsView(world, player, (n) => world.nationLedger[n * LEDGER_LINES + LEDGER.indexOf("tribute")]!);
  const asks: AskView[] = (d.asks ?? [])
    .filter((p) => p.ask.asked === me && world.nationIndex.has(p.ask.asker))
    .map((p) => {
      const prov = p.ask.province === undefined ? undefined : world.provinceIndex.get(p.ask.province);
      return {
        id: p.id,
        from: world.nationIndex.get(p.ask.asker)!,
        action: p.ask.action,
        ...(p.ask.demandKind ? { kind: p.ask.demandKind } : {}),
        ...(prov !== undefined ? { province: { province: prov, name: world.rules.provinces[prov]!.name, capital: world.rules.nations[player]!.capital === p.ask.province } } : {}),
        until: p.until,
      };
    });
  return { me: player, seats, free, giftGold: giftGold(world), envoys, letters, realms, subjects, house: houseView(world, player), courting: courtingView(world, player), asks, nameAbroad: nameAbroadView(world, player) };
}

/** A realm the player could declare war on: no war, alliance or subject tie between them (a truce may be broken). */
function mayPrice(world: World, player: number, n: number, counts: Int32Array): boolean {
  const st = relationState(world, player, n).state;
  return (st === null || st === "truce") && counts[n]! > 0;
}
