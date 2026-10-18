import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";

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
export const ENVOY_ACTIONS = ["propose_alliance", "arrange_marriage", "courtesy_visit", "send_gift"] as const;
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
    c.ai = n !== world.player;
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
function ensureRoute(world: World, a: number, b: number): void {
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
  if (n < 0 || t < 0 || n >= world.nationCount || t >= world.nationCount || n === t) return "no such realm";
  if (world.nationGone[t]) return "that realm is gone";
  const g = world.diplomacy.graph;
  const a = world.nationIds[n]!;
  const b = world.nationIds[t]!;
  if (rel.has(g, "at_war", a, b)) return "you are at war";
  if (envoyTo(world, n, t)) return "an envoy is already on the way";
  if (dip.freeSeats(world.diplomacy, a) <= 0) return "no free envoy: every seat is taken";
  if (action === "propose_alliance") {
    if (rel.has(g, "alliance", a, b)) return "already allies";
    if (rel.overlord(g, a) === b || rel.overlord(g, b) === a) return "a subject is bound already";
    if (rel.stance(g, a, b) === "hostile" || rel.stance(g, b, a) === "hostile") return "they are hostile";
  }
  if (action === "arrange_marriage" && dip.marriagesBetween(world.diplomacy, a, b) > 0) return "your houses are married already";
  if (action === "send_gift" && world.nationTreasury[n]! < giftGold(world)) return `needs ${giftGold(world)} gold`;
  return null;
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
    }
  }
  // Letters are kept two years for the Why? on the Diplomacy tab; the library's event log is not kept.
  d.letters = d.letters.filter((l) => dip.monthsBetween(l.deliverOn, month) < 24);
  d.envoys = d.envoys.filter((e) => (e.status !== "home" && e.status !== "failed") || dip.monthsBetween(dip.monthOf(e.returnDate ?? e.arrival), month) < 12);
  d.events.length = 0;
  aiEnvoys(world);
}

/** Realms next to each realm, from the map; worked out again when owners change. */
const neighbourCache = new WeakMap<World, { key: string; table: Set<number>[] }>();
function neighbourRealms(world: World): Set<number>[] {
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

/** AI realms consider their envoys once every few months, a share of them each month, so the work is spread. */
const AI_EVERY_MONTHS = 6;
/** How many neighbours an AI court weighs each time it considers its envoys. */
const AI_NEIGHBOURS = 3;

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
    if (n === world.player || world.nationGone[n] || (n + turn) % AI_EVERY_MONTHS !== 0) continue;
    const id = world.nationIds[n]!;
    if (dip.freeSeats(d, id) <= 0) continue;
    // A few neighbours a time, in turn, so the court's counting stays cheap on a large map.
    const list = [...near[n]!];
    let best: { t: number; action: string; total: number } | null = null;
    const from = Math.floor(turn / AI_EVERY_MONTHS) * AI_NEIGHBOURS;
    const days = countDays(world);
    for (let k = 0; k < Math.min(AI_NEIGHBOURS, list.length); k++) {
      const t = list[(from + k) % list.length]!;
      if (world.nationGone[t]) continue;
      // One ask a neighbour each time, alliance and marriage in turn.
      {
        const action = (Math.floor(turn / AI_EVERY_MONTHS) + n + k) % 2 === 0 ? "propose_alliance" : "arrange_marriage";
        if (whyNotEnvoy(world, n, t, action)) continue;
        const count = dip.countAsk(d, { action, asker: id, asked: world.nationIds[t]! }, days);
        if (!best || count.total > best.total) best = { t, action, total: count.total };
      }
    }
    if (!best) continue;
    const choice = dip.aiChoose(best.total);
    if (choice === "send") sendEnvoy(world, n, best.t, best.action);
    else if (choice === "gift_first" && dip.country(d, id).goldToSpare) sendEnvoy(world, n, best.t, "send_gift");
  }
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
  const n = dip.standing(d, a, b);
  const lines: StandingLine[] = dip.ledgerOf(d, a, b).map((e) => ({ name: e.name, weight: Math.round(e.weight) }));
  const line = dip.relationLine(d, a, b);
  if (line.weight) lines.unshift({ name: RELATION_NAME[line.relation] ?? line.relation.replace(/_/g, " "), weight: line.weight });
  return { standing: Math.round(n), word: dip.standingWord(n), lines };
}

/** What the Diplomacy tab shows of statecraft for the player (DIPL-197 to DIPL-202). */
export interface StatecraftView {
  seats: number;
  free: number;
  /** Gold a gift costs. */
  giftGold: number;
  /** The player's envoys abroad: where, on what mission, and when they reach the court and come home. */
  envoys: { target: number; action: string; status: string; arrival: string; home?: string }[];
  /** Answers received in the last two years, newest first, with the reasons each court counted. */
  letters: { from: number; action: string; answer: "yes" | "no" | "done"; text: string; reasons: { name: string; number: number }[]; total?: number; month: string }[];
  /** For every other realm: what it thinks of the player, the ledger behind it, and why each mission can't be sent now (null when it can), in ENVOY_ACTIONS order. */
  realms: Record<number, { standing: number; word: string; lines: StandingLine[]; why: (string | null)[]; married: boolean }>;
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
    .map((l) => ({ from: world.nationIndex.get(l.from) ?? -1, action: l.action, answer: l.answer, text: letterText(world, l), reasons: l.reasons.map((r) => ({ name: r.name, number: Math.round(r.number) })), ...(l.total !== undefined ? { total: Math.round(l.total) } : {}), month: l.deliverOn }));
  const realms: StatecraftView["realms"] = {};
  for (let n = 0; n < world.nationCount; n++) {
    if (n === player || world.nationGone[n]) continue;
    const s = standingOf(world, n, player);
    realms[n] = { ...s, why: ENVOY_ACTIONS.map((a) => whyNotEnvoy(world, player, n, a)), married: dip.marriagesBetween(d, me, world.nationIds[n]!) > 0 };
  }
  return { seats, free, giftGold: giftGold(world), envoys, letters, realms };
}
