import * as tr from "./domain/tribes/index.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as gov from "./domain/government/index.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { addBorders, atWar } from "./war.ts";
import { formOf, capsOf } from "./government.ts";
import { inAnyWar } from "./lords.ts";
import { hireOfficial, nativeTypes, OFFICIALS, provinceTaken } from "./officials.ts";
import { SLOTS } from "./peoples.ts";
import { ensureRoute } from "./statecraft.ts";

/**
 * Hunting grounds in the game (TRIBE-006 to TRIBE-033): each tribal realm
 * walks a few unowned land provinces next to its land. They pay furs, feed
 * its armies, make neighbours, and after ten years can be taken in. A colony
 * founded on one angers the tribe; a colonial power can ask for the land
 * first. The rules are the tribes context's (domain/tribes); this file maps
 * the world onto them, as institutions.ts does for the Empire.
 */

const C = tr.tribesConfig;
const rel = dip.relations;

export interface LandAsk {
  id: number;
  asker: number;
  tribe: number;
  province: number;
  gold: number;
  /** Month the tribe answers (the AI by its count; the player any time before). */
  answerOn: number;
}

export interface TribesState {
  /** Per province: the realm whose hunting ground it is, -1 none (INV-TRIBE-2). */
  provinceHunt: Int16Array;
  /** Per province: the month number it became a ground. */
  provinceHuntSince: Int32Array;
  tribes: {
    /** At most one claim under way per realm (TRIBE-008). */
    claims: { realm: number; province: number; ends: number }[];
    /** Provinces a realm may not claim again before a month: left (TRIBE-010) or given up (TRIBE-024). */
    barred: { realm: number; province: number; until: number }[];
    /** Asks for the land waiting for an answer (TRIBE-023). */
    asks: LandAsk[];
    /** Asks answered, kept so an AI founder knows it has asked (TRIBE-033). */
    answered: { asker: number; province: number; yes: boolean; on: number }[];
    /** Land given up for gold: the asker's next colony there is founded with consent (TRIBE-024). */
    given: { realm: number; province: number }[];
    seq: number;
  };
}

export function createTribesState(P: number): TribesState {
  return {
    provinceHunt: new Int16Array(P).fill(-1),
    provinceHuntSince: new Int32Array(P),
    tribes: { claims: [], barred: [], asks: [], answered: [], given: [], seq: 0 },
  };
}

// ---------------------------------------------------------------- reading the world

const nowMonth = (world: World): number => tr.monthNumber(world.date.year, world.date.month);
const realmName = (world: World, n: number): string => world.rules.nations[n]!.name;
const provinceName = (world: World, p: number): string => world.rules.provinces[p]!.name;
/** "the Creek": a tribe as the cards name it. */
export const tribeName = (world: World, n: number): string => `the ${realmName(world, n)}`;

function* landNeighbours(world: World, p: number): Generator<number> {
  for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
    const q = world.adjList[k]!;
    if (!world.provinceWater[q]) yield q;
  }
}

/** The capital's longitude and latitude, read off the map. */
function capitalPlace(world: World, n: number): { lon: number; lat: number } | null {
  const p = world.provinceIndex.get(world.rules.nations[n]!.capital);
  const def = p === undefined ? undefined : world.rules.provinces[p];
  const m = world.rules.map;
  if (!def || def.x === undefined || def.y === undefined || !m) return null;
  return { lon: def.x / m.pxPerDeg - 180, lat: m.latTop - def.y / m.pxPerDeg };
}

const ownsLand = (world: World, n: number): boolean => {
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) return true;
  return false;
};

/** TRIBE-001: a tribal form with its capital in a tribal region, and land of its own (TRIBE-013). */
export function isTribal(world: World, n: number): boolean {
  if (n < 0 || n >= world.nationCount || world.nationGone[n]) return false;
  if (!tr.isTribalForm(formOf(world, n))) return false;
  const at = capitalPlace(world, n);
  return !!at && tr.inTribalRegion(at.lon, at.lat);
}

/** TRIBE-006: the range size of a realm, 0 when it is not tribal. */
export const rangeOf = (world: World, n: number): number => (isTribal(world, n) ? tr.rangeSize(formOf(world, n)) : 0);

/** The realm whose hunting ground p is, or -1 (a province that gained an owner is no one's). */
export const huntOf = (world: World, p: number): number => (world.provinceOwner[p]! >= 0 ? -1 : world.provinceHunt[p]!);

/** A realm's hunting grounds, oldest first. */
export function groundsOf(world: World, n: number): number[] {
  pruneGrounds(world);
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceHunt[p] === n) out.push(p);
  return out.sort((a, b) => world.provinceHuntSince[a]! - world.provinceHuntSince[b]! || a - b);
}

/** Grounds held per realm. */
function groundCounts(world: World): Int32Array {
  const out = new Int32Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) {
    const g = huntOf(world, p);
    if (g >= 0) out[g]!++;
  }
  return out;
}

const colonyAt = (world: World, p: number) => world.explore.colonies.find((c) => c.province === p);
const claimOf = (world: World, n: number) => world.tribes.claims.find((c) => c.realm === n);

/** Touches, by land, the realm's own land or one of its grounds. */
function touchesRealm(world: World, n: number, p: number): boolean {
  for (const q of landNeighbours(world, p)) if (world.provinceOwner[q] === n || huntOf(world, q) === n) return true;
  return false;
}

/**
 * Drops grounds that broke the invariants (TRIBE-011, TRIBE-013): a province
 * that gained an owner, or a realm that is no longer a tribal realm. Grounds
 * cut off from the realm (TRIBE-012) go only at the monthly step.
 */
function pruneGrounds(world: World, news?: News[]): void {
  const tribal = new Map<number, boolean>();
  const isT = (n: number) => tribal.get(n) ?? (tribal.set(n, isTribal(world, n) && ownsLand(world, n)), tribal.get(n)!);
  for (let p = 0; p < world.provinceCount; p++) {
    const g = world.provinceHunt[p]!;
    if (g < 0) continue;
    if (world.provinceOwner[p]! >= 0 || !isT(g)) {
      world.provinceHunt[p] = -1;
      if (news && g === world.player && world.provinceOwner[p]! >= 0) news.push({ kind: "colony", text: `${provinceName(world, p)} is no longer our hunting ground: ${realmName(world, world.provinceOwner[p]!)} holds it now.`, nations: [g], province: p });
    }
  }
  world.tribes.claims = world.tribes.claims.filter((c) => isT(c.realm) && world.provinceOwner[c.province]! < 0);
}

/** TRIBE-012: grounds no longer joined to the realm's land, by land through its other grounds. */
function cutOff(world: World): number[] {
  const out: number[] = [];
  const reached = new Uint8Array(world.provinceCount);
  const queue: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    const g = huntOf(world, p);
    if (g < 0 || reached[p]) continue;
    if ([...landNeighbours(world, p)].some((q) => world.provinceOwner[q] === g)) ((reached[p] = 1), queue.push(p));
  }
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i]!;
    for (const q of landNeighbours(world, p)) if (!reached[q] && huntOf(world, q) === huntOf(world, p)) ((reached[q] = 1), queue.push(q));
  }
  for (let p = 0; p < world.provinceCount; p++) if (huntOf(world, p) >= 0 && !reached[p]) out.push(p);
  return out;
}

/** TRIBE-016: a ground makes its realm a neighbour of every realm whose land or grounds touch it. */
function groundBorders(world: World, p: number): void {
  const g = huntOf(world, p);
  if (g < 0) return;
  const d = world.diplomacy;
  const a = world.nationIds[g]!;
  for (const q of landNeighbours(world, p)) {
    const other = world.provinceOwner[q]! >= 0 ? world.provinceOwner[q]! : huntOf(world, q);
    if (other < 0 || other === g) continue;
    const b = world.nationIds[other]!;
    if (!dip.borders(d, a, b)) dip.setBorder(d, a, b);
  }
}

/** Makes p a hunting ground of n since a month (the start, a claim ended, or a scenario's setup). */
export function makeGround(world: World, n: number, p: number, since: number): void {
  world.provinceHunt[p] = n;
  world.provinceHuntSince[p] = since;
  groundBorders(world, p);
}

// ---------------------------------------------------------------- the start (TRIBE-007)

/** Fills every tribal realm's range at the start of a campaign, realms in nation order. */
export function seedTribes(world: World): void {
  const realms: tr.StartRealm[] = [];
  const land: number[][] = world.nationIds.map(() => []);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p]! >= 0) land[world.provinceOwner[p]!]!.push(p);
  for (let n = 0; n < world.nationCount; n++) if (land[n]!.length && isTribal(world, n)) realms.push({ realm: n, size: tr.rangeSize(formOf(world, n)), land: land[n]! });
  if (!realms.length) return;
  const ranges = tr.startRanges(
    realms,
    (p) => [...landNeighbours(world, p)],
    (p) => !world.provinceWater[p] && world.provinceOwner[p]! < 0 && world.provinceHunt[p]! < 0,
    (p) => world.provincePopulation[p]!,
  );
  const now = nowMonth(world);
  for (const [n, grounds] of ranges) for (const p of grounds) makeGround(world, n, p, now);
}

// ---------------------------------------------------------------- claiming, leaving, taking in

/** Why realm n may not claim province p now, or null (TRIBE-008). */
export function whyNotClaim(world: World, n: number, p: number, counts?: Int32Array): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount) return "no such place";
  if (!counts) pruneGrounds(world);
  const g = huntOf(world, p);
  const now = nowMonth(world);
  const bar = world.tribes.barred.find((b) => b.realm === n && b.province === p && now < b.until);
  return tr.whyNotClaim({
    tribal: isTribal(world, n),
    held: (counts ?? groundCounts(world))[n] ?? 0,
    size: rangeOf(world, n),
    claimUnderWay: !!claimOf(world, n),
    water: !!world.provinceWater[p],
    owned: world.provinceOwner[p]! >= 0,
    groundOf: g >= 0 && g !== n ? tribeName(world, g) : null,
    ownGround: g === n,
    colony: !!colonyAt(world, p),
    touches: touchesRealm(world, n, p),
    barredUntil: bar ? bar.until : null,
    now,
  });
}

/** ClaimGround (TRIBE-008, TRIBE-009): the claim runs three months. */
export function claimGround(world: World, n: number, p: number, news: News[]): string | null {
  const why = whyNotClaim(world, n, p);
  if (why) return why;
  const ends = tr.claimEnds(nowMonth(world));
  world.tribes.claims.push({ realm: n, province: p, ends });
  if (n === world.player) news.push({ kind: "colony", text: `Our hunters start walking ${provinceName(world, p)}: it is our hunting ground on ${tr.monthText(ends)}.`, nations: [n], province: p });
  return null;
}

/** Calls off the claim under way. */
export function cancelClaim(world: World, n: number): string | null {
  const c = claimOf(world, n);
  if (!c) return "no claim is under way";
  world.tribes.claims = world.tribes.claims.filter((x) => x !== c);
  return null;
}

/** LeaveGround (TRIBE-010): no longer walked, and not claimed again for five years. */
export function leaveGround(world: World, n: number, p: number, news: News[]): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || huntOf(world, p) !== n) return "not your hunting ground";
  world.provinceHunt[p] = -1;
  const until = tr.reclaimFrom(nowMonth(world));
  world.tribes.barred = world.tribes.barred.filter((b) => !(b.realm === n && b.province === p));
  world.tribes.barred.push({ realm: n, province: p, until });
  if (n === world.player) news.push({ kind: "colony", text: `Our hunters leave ${provinceName(world, p)}. We may walk it again from ${tr.monthText(until)}.`, nations: [n], province: p });
  return null;
}

/** Whether the province's largest tongue is the realm's own (GOV-023, D-GOV-13). */
export function ownPeople(world: World, n: number, p: number): boolean {
  const court = world.nationCourt[n]!;
  return court !== undefined && world.provinceTongue[p * SLOTS] === court;
}

/** GOV-023: a self-run form needs no official in a province of its own people. */
export function selfRun(world: World, p: number): boolean {
  const o = world.provinceOwner[p]!;
  return o >= 0 && !gov.needsOfficial(formOf(world, o), ownPeople(world, o, p));
}

/** Why realm n may not take ground p in now, or null (TRIBE-018). */
export function whyNotTakeIn(world: World, n: number, p: number): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || huntOf(world, p) !== n) return "not your hunting ground";
  return tr.whyNotTakeIn({ heldMonths: nowMonth(world) - world.provinceHuntSince[p]!, atWar: inAnyWar(world, n), colony: !!colonyAt(world, p) });
}

/** TakeIn (TRIBE-018 to TRIBE-020): the ground becomes a province of the realm with its people, and frees its place. */
export function takeIn(world: World, n: number, p: number, news: News[]): string | null {
  const why = whyNotTakeIn(world, n, p);
  if (why) return why;
  world.provinceHunt[p] = -1;
  world.provinceOwner[p] = n;
  world.provinceLord[p] = -1;
  world.provinceOccupier[p] = -1;
  world.provinceHold[p] = 0;
  provinceTaken(world, p, news);
  const own = ownPeople(world, n, p);
  // Their own people run themselves: no post waits to be filled (GOV-023).
  if (own && selfRun(world, p)) world.provinceNewLand[p] = 0;
  addBorders(world, n);
  if (n === world.player) news.push({ kind: "colony", text: `${provinceName(world, p)} is taken in: its people are ${realmName(world, n)}'s now${selfRun(world, p) ? ", and run themselves" : ", and it needs an official"}.`, nations: [n], province: p });
  return null;
}

// ---------------------------------------------------------------- settlers on our land (TRIBE-021, TRIBE-022, TRIBE-024)

/**
 * A colony starts on province p (exploration's foundColony): the locals as
 * rolled, one step fiercer on a tribe's ground, Peaceful on land given; the
 * tribe holds the wrong and *Punish* against the founder (TRIBE-021,
 * TRIBE-022). Returns the aggression and whether the land was given.
 */
export function colonyStarts(world: World, n: number, p: number, rolled: tr.AggressionLevel, news: News[]): { aggression: tr.AggressionLevel; consent: boolean } {
  const T = world.tribes;
  const gi = T.given.findIndex((x) => x.realm === n && x.province === p);
  if (gi >= 0) {
    T.given.splice(gi, 1);
    return { aggression: "Peaceful", consent: true };
  }
  const t = huntOf(world, p);
  if (t < 0 || t === n) return { aggression: rolled, consent: false };
  const d = world.diplomacy;
  const a = world.nationIds[t]!;
  const b = world.nationIds[n]!;
  dip.eventOpinion(d, tr.SETTLERS_WRONG, a, b, C.settlers_wrong.weight, C.settlers_wrong.fade_years);
  dip.grantAim(d, { holder: a, target: b, aim: "punish", until: dip.addMonths(dip.monthOf(d.date), C.settlers_punish_years * 12), source: tr.SETTLERS_WRONG });
  const where = `${realmName(world, n)} at ${provinceName(world, p)}`;
  if (t === world.player) news.push({ kind: "tribe", text: `Settlers on our land: ${where}`, nations: [t, n], province: p });
  else if (n === world.player) news.push({ kind: "colony", text: `${provinceName(world, p)} is a hunting ground of ${tribeName(world, t)}: settling here angers them.`, nations: [n, t], province: p });
  return { aggression: tr.fiercer(rolled), consent: false };
}

/** Whether the tribe holds the wrong Settlers on our land against the asker. */
function settlersHeld(world: World, tribe: number, asker: number): boolean {
  return dip.ledgerOf(world.diplomacy, world.nationIds[tribe]!, world.nationIds[asker]!).some((e) => e.name === tr.SETTLERS_WRONG && e.weight !== 0);
}

/** The tribe's reasons count when asked for a ground (TRIBE-025). */
export function landAskCount(world: World, asker: number, tribe: number, gold: number): ReturnType<typeof tr.landAskCount> {
  const d = world.diplomacy;
  const a = world.nationIds[tribe]!;
  const b = world.nationIds[asker]!;
  return tr.landAskCount({
    gold,
    standing: dip.standing(d, a, b),
    settlersHeld: settlersHeld(world, tribe, asker),
    hostile: rel.stance(d.graph, a, b) === "hostile",
    grounds: groundCounts(world)[tribe] ?? 0,
  });
}

/** Why realm n may not ask for ground p offering this gold, or null (TRIBE-023). */
export function whyNotAskLand(world: World, n: number, p: number, gold: number): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount) return "no such place";
  const t = huntOf(world, p);
  if (t < 0) return "it is no one's hunting ground";
  if (t === n) return "it is your own ground";
  if (atWar(world, n, t)) return "you are at war with them";
  if (world.tribes.asks.some((a) => a.asker === n && a.province === p)) return "you have asked already: wait for their answer";
  if (!Number.isFinite(gold) || gold < tr.landPrice()) return `offer at least ${tr.landPrice()} gold`;
  if (world.nationTreasury[n]! < gold) return `needs ${gold} gold`;
  return null;
}

/** AskForLand (TRIBE-023): an envoy asks; the tribe answers a month later. */
export function askForLand(world: World, n: number, p: number, gold: number, news: News[]): string | null {
  const why = whyNotAskLand(world, n, p, gold);
  if (why) return why;
  const T = world.tribes;
  const t = huntOf(world, p);
  ensureRoute(world, n, t);
  T.asks.push({ id: ++T.seq, asker: n, tribe: t, province: p, gold: Math.round(gold), answerOn: nowMonth(world) + C.ask.answer_months });
  if (n === world.player) news.push({ kind: "envoy", text: `Our envoy asks ${tribeName(world, t)} for ${provinceName(world, p)}, offering ${Math.round(gold)} gold. They answer next month.`, nations: [n, t], province: p });
  if (t === world.player) news.push({ kind: "tribe", text: `${realmName(world, n)} asks for our hunting ground ${provinceName(world, p)}, offering ${Math.round(gold)} gold.`, nations: [t, n], province: p });
  return null;
}

/** AnswerLandAsk (TRIBE-024): yes pays the tribe and gives up the ground; no refuses. */
function settleAsk(world: World, ask: LandAsk, yes: boolean, news: News[]): void {
  const T = world.tribes;
  T.asks = T.asks.filter((a) => a !== ask);
  const { asker, tribe, province: p } = ask;
  const still = huntOf(world, p) === tribe && world.nationTreasury[asker]! >= ask.gold;
  const done = yes && still;
  T.answered = T.answered.filter((x) => !(x.asker === asker && x.province === p));
  T.answered.push({ asker, province: p, yes: done, on: nowMonth(world) });
  if (done) {
    world.nationTreasury[asker] = world.nationTreasury[asker]! - ask.gold;
    world.nationTreasury[tribe] = world.nationTreasury[tribe]! + ask.gold;
    world.provinceHunt[p] = -1;
    T.barred = T.barred.filter((b) => !(b.realm === tribe && b.province === p));
    T.barred.push({ realm: tribe, province: p, until: tr.givenReclaimFrom(nowMonth(world)) });
    T.given = T.given.filter((x) => x.province !== p);
    T.given.push({ realm: asker, province: p });
  }
  const text = done
    ? `${tribeName(world, tribe)} give up ${provinceName(world, p)} to ${realmName(world, asker)} for ${ask.gold} gold: a colony there is founded in peace.`
    : `${tribeName(world, tribe)} refuse to give up ${provinceName(world, p)} to ${realmName(world, asker)}.`;
  if (asker === world.player || tribe === world.player) news.push({ kind: "envoy", text: text[0]!.toUpperCase() + text.slice(1), nations: [asker, tribe], province: p });
}

/** The player's tribe answers an ask for its land. */
export function answerLandAsk(world: World, n: number, id: number, yes: boolean, news: News[]): string | null {
  const ask = world.tribes.asks.find((a) => a.id === id);
  if (!ask) return "that ask has lapsed";
  if (ask.tribe !== n) return "that ask is not yours to answer";
  settleAsk(world, ask, yes, news);
  return null;
}

/**
 * TRIBE-033: whether an AI founder waits before settling ground p: it asks
 * first (once, at the asking price) while it holds the price twice over,
 * and founds there only after the answer.
 */
export function aiWaitsToFound(world: World, n: number, p: number, news: News[]): boolean {
  const t = huntOf(world, p);
  if (t < 0 || t === n) return false;
  const T = world.tribes;
  if (T.given.some((x) => x.realm === n && x.province === p)) return false;
  if (T.answered.some((x) => x.asker === n && x.province === p)) return false;
  if (T.asks.some((a) => a.asker === n && a.province === p)) return true;
  if (!tr.aiMayAsk(world.nationTreasury[n]!)) return false;
  return askForLand(world, n, p, tr.landPrice(), news) === null;
}

// ---------------------------------------------------------------- each month (tribes §9)

/** Furs and hides, gold a month per realm (TRIBE-014); the ledger reads it. */
export function fursOf(world: World): Float64Array {
  const counts = groundCounts(world);
  return Float64Array.from(counts, (c) => tr.fursGold(c));
}

/**
 * The monthly step, after government (X-2): claims whose three months are up
 * become grounds, grounds cut off are dropped, asks due are answered, then
 * the AI claims; in January the AI takes in what it may.
 */
export function monthlyTribes(world: World, news: News[]): void {
  pruneGrounds(world, news);
  const T = world.tribes;
  const now = nowMonth(world);
  for (const c of [...T.claims]) {
    if (c.ends > now) continue;
    T.claims = T.claims.filter((x) => x !== c);
    if (world.provinceOwner[c.province]! >= 0 || huntOf(world, c.province) >= 0) continue;
    makeGround(world, c.realm, c.province, now);
    if (c.realm === world.player) news.push({ kind: "colony", text: `${provinceName(world, c.province)} is our hunting ground now.`, nations: [c.realm], province: c.province });
  }
  for (const p of cutOff(world)) {
    const g = huntOf(world, p);
    world.provinceHunt[p] = -1;
    if (g === world.player) news.push({ kind: "colony", text: `${provinceName(world, p)} is cut off from our land: our hunters can no longer walk it.`, nations: [g], province: p });
  }
  T.barred = T.barred.filter((b) => b.until > now);
  T.answered = T.answered.filter((a) => now - a.on < C.ai.answered_years * 12);
  for (const a of [...T.asks]) {
    if (a.answerOn > now) continue;
    // The player's tribe answers itself; an ask it leaves a month past its answer lapses as a no.
    if (a.tribe === world.player && a.answerOn + 1 > now) continue;
    const yes = a.tribe === world.player ? false : landAskCount(world, a.asker, a.tribe, a.gold).yes;
    settleAsk(world, a, yes, news);
  }
  aiClaims(world, news);
  if (world.date.month === 1) aiTakeIn(world, news);
}

/** TRIBE-031: a tribal AI realm with a free place and no claim under way claims the most-peopled province it may. */
function aiClaims(world: World, news: News[]): void {
  const counts = groundCounts(world);
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || claimOf(world, n) || !isTribal(world, n) || counts[n]! >= rangeOf(world, n)) continue;
    const seen = new Set<number>();
    const candidates: { province: number; people: number }[] = [];
    for (let p = 0; p < world.provinceCount; p++) {
      if (world.provinceOwner[p] !== n && huntOf(world, p) !== n) continue;
      for (const q of landNeighbours(world, p)) {
        if (seen.has(q)) continue;
        seen.add(q);
        if (!whyNotClaim(world, n, q, counts)) candidates.push({ province: q, people: world.provincePopulation[q]! });
      }
    }
    const pick = tr.aiClaimPick(candidates);
    if (pick >= 0) claimGround(world, n, pick, news);
  }
}

/** Officials a realm has at their posts and posts that need one, against its officials cap. */
function officialsRoom(world: World, n: number): number {
  let used = 0;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceLord[p]! >= 0) continue;
    if (world.provinceOfficial[p]! >= 0 || !selfRun(world, p)) used++;
  }
  return capsOf(world, n).officials.total - used;
}

/** TRIBE-032: each January a tribal AI realm takes in every ground it may, oldest first, while within its officials cap. */
function aiTakeIn(world: World, news: News[]): void {
  for (let n = 0; n < world.nationCount; n++) {
    if (n === world.player || !isTribal(world, n)) continue;
    for (const p of groundsOf(world, n)) {
      if (whyNotTakeIn(world, n, p)) continue;
      const needs = gov.needsOfficial(formOf(world, n), ownPeople(world, n, p));
      if (needs && officialsRoom(world, n) < 1) continue;
      takeIn(world, n, p, news);
      if (!needs) continue;
      // The new post: an official of a trade the realm knows, else one from abroad, if the treasury allows.
      const native = [...nativeTypes(world, n, p)];
      if (native.length) hireOfficial(world, n, p, native[0]!, false, news);
      else hireOfficial(world, n, p, OFFICIALS.indexOf("Warden"), true, news);
    }
  }
}

// ---------------------------------------------------------------- orders

export type TribesOrder =
  | { type: "tribes"; action: "claim" | "leave" | "takeIn"; province: number }
  | { type: "tribes"; action: "cancelClaim" }
  | { type: "tribes"; action: "askLand"; province: number; gold: number }
  | { type: "tribes"; action: "answerLand"; ask: number; yes: boolean };

export function tribesOrder(world: World, n: number, o: TribesOrder, news: News[]): string | null {
  switch (o.action) {
    case "claim":
      return claimGround(world, n, o.province, news);
    case "leave":
      return leaveGround(world, n, o.province, news);
    case "takeIn":
      return takeIn(world, n, o.province, news);
    case "cancelClaim":
      return cancelClaim(world, n);
    case "askLand":
      return askForLand(world, n, o.province, o.gold, news);
    case "answerLand":
      return answerLandAsk(world, n, o.ask, o.yes, news);
  }
  return "no such order";
}

// ---------------------------------------------------------------- what the screens read (TRIBE-026 to TRIBE-029)

export interface GroundRow {
  province: number;
  /** Thousands of people. */
  people: number;
  since: string;
  years: number;
  furs: number;
  /** Their own people: taken in, they need no official. */
  ownPeople: boolean;
  /** Why it can't be taken in now, or null when it is ready. */
  takeInWhy: string | null;
}

export interface TribesView {
  /** Per province: the realm whose hunting ground it is, -1 none (for the map hatch and the cards). */
  ground: Int16Array;
  /** Per province: the realm claiming it, -1 none. */
  claiming: Int16Array;
  /** The asking price, in gold. */
  landPrice: number;
  /** Months a claim takes, and years before a ground can be taken in. */
  claimMonths: number;
  takeInYears: number;
  /** The player's range; null when the player's realm is not tribal. */
  mine: {
    size: number;
    held: number;
    fursPerMonth: number;
    claim: { province: number; ends: string } | null;
    /** Ground rows, those ready to take in first, then oldest first. */
    grounds: GroundRow[];
    /** Unowned land touching the player's land or grounds, with why it can't be claimed now (null: it can). */
    candidates: { province: number; why: string | null }[];
    /** Colonies being founded on the player's grounds. */
    settlers: { province: number; founder: number }[];
    /** Asks for the player's land waiting for an answer. */
    asks: { id: number; asker: number; province: number; gold: number; count: { reasons: tr.LandReason[]; total: number; yes: boolean } }[];
  } | null;
  /** For the player as an asker: per ground of another realm, why the player can't ask for it at the price now, or null. */
  askWhy: { province: number; tribe: number; why: string | null; asked: boolean; given: boolean }[];
  /** Land given to the player, waiting for its colony. */
  given: number[];
  /** Grounds held and range size of every tribal realm, by realm index (0 0 for the rest). */
  counts: { held: number; size: number }[];
}

export function tribesView(world: World, n: number): TribesView {
  pruneGrounds(world);
  const P = world.provinceCount;
  const ground = new Int16Array(P).fill(-1);
  for (let p = 0; p < P; p++) ground[p] = huntOf(world, p);
  const claiming = new Int16Array(P).fill(-1);
  for (const c of world.tribes.claims) claiming[c.province] = c.realm;
  const counts = groundCounts(world);
  const now = nowMonth(world);
  let mine: TribesView["mine"] = null;
  if (n >= 0 && isTribal(world, n)) {
    const claim = claimOf(world, n);
    const rows: GroundRow[] = groundsOf(world, n).map((p) => {
      const months = now - world.provinceHuntSince[p]!;
      return { province: p, people: world.provincePopulation[p]!, since: tr.monthText(world.provinceHuntSince[p]!), years: Math.floor(months / 12), furs: tr.fursGold(1), ownPeople: ownPeople(world, n, p), takeInWhy: whyNotTakeIn(world, n, p) };
    });
    rows.sort((a, b) => Number(a.takeInWhy !== null) - Number(b.takeInWhy !== null));
    const seen = new Set<number>();
    const candidates: { province: number; why: string | null }[] = [];
    for (let p = 0; p < P; p++) {
      if (world.provinceOwner[p] !== n && ground[p] !== n) continue;
      for (const q of landNeighbours(world, p)) {
        if (seen.has(q) || world.provinceOwner[q]! >= 0 || ground[q] === n) continue;
        seen.add(q);
        candidates.push({ province: q, why: whyNotClaim(world, n, q, counts) });
      }
    }
    candidates.sort((a, b) => a.province - b.province);
    mine = {
      size: rangeOf(world, n),
      held: counts[n]!,
      fursPerMonth: tr.fursGold(counts[n]!),
      claim: claim ? { province: claim.province, ends: tr.monthText(claim.ends) } : null,
      grounds: rows,
      candidates,
      settlers: world.explore.colonies.filter((c) => ground[c.province] === n).map((c) => ({ province: c.province, founder: c.owner })),
      asks: world.tribes.asks.filter((a) => a.tribe === n).map((a) => ({ id: a.id, asker: a.asker, province: a.province, gold: a.gold, count: landAskCount(world, a.asker, n, a.gold) })),
    };
  }
  const askWhy: TribesView["askWhy"] = [];
  if (n >= 0) {
    for (let p = 0; p < P; p++) {
      const t = ground[p]!;
      if (t < 0 || t === n) continue;
      askWhy.push({ province: p, tribe: t, why: whyNotAskLand(world, n, p, tr.landPrice()), asked: world.tribes.asks.some((a) => a.asker === n && a.province === p), given: false });
    }
  }
  return {
    ground,
    claiming,
    landPrice: tr.landPrice(),
    claimMonths: C.claim_months,
    takeInYears: C.take_in_years,
    mine,
    askWhy,
    given: world.tribes.given.filter((g) => g.realm === n).map((g) => g.province),
    counts: Array.from(counts, (held, k) => ({ held, size: held || isTribal(world, k) ? rangeOf(world, k) : 0 })),
  };
}

// ---------------------------------------------------------------- saves and the hash

export interface SavedTribes {
  hunts: [string, string, number][];
  claims: [string, string, number][];
  barred: [string, string, number][];
  asks: [number, string, string, string, number, number][];
  answered: [string, string, boolean, number][];
  given: [string, string][];
  seq: number;
}

export function saveTribes(world: World): SavedTribes {
  const N = (n: number) => world.nationIds[n]!;
  const P = (p: number) => world.provinceIds[p]!;
  const T = world.tribes;
  const hunts: SavedTribes["hunts"] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceHunt[p]! >= 0) hunts.push([P(p), N(world.provinceHunt[p]!), world.provinceHuntSince[p]!]);
  return {
    hunts,
    claims: T.claims.map((c) => [N(c.realm), P(c.province), c.ends]),
    barred: T.barred.map((b) => [N(b.realm), P(b.province), b.until]),
    asks: T.asks.map((a) => [a.id, N(a.asker), N(a.tribe), P(a.province), a.gold, a.answerOn]),
    answered: T.answered.map((a) => [N(a.asker), P(a.province), a.yes, a.on]),
    given: T.given.map((g) => [N(g.realm), P(g.province)]),
    seq: T.seq,
  };
}

/** Restores the ranges; a save from before hunting grounds keeps the ranges the new world was seeded with. */
export function restoreTribes(world: World, saved: SavedTribes | undefined): void {
  if (!saved) return;
  const N = (id: string) => world.nationIndex.get(id) ?? -1;
  const P = (id: string) => world.provinceIndex.get(id) ?? -1;
  world.provinceHunt.fill(-1);
  for (const [p, n, since] of saved.hunts ?? []) if (P(p) >= 0 && N(n) >= 0) ((world.provinceHunt[P(p)] = N(n)), (world.provinceHuntSince[P(p)] = since));
  const ok = <T extends { realm?: number; province: number }>(x: T) => x.province >= 0 && (x.realm === undefined || x.realm >= 0);
  world.tribes = {
    claims: saved.claims.map(([n, p, ends]) => ({ realm: N(n), province: P(p), ends })).filter(ok),
    barred: saved.barred.map(([n, p, until]) => ({ realm: N(n), province: P(p), until })).filter(ok),
    asks: saved.asks.map(([id, a, t, p, gold, answerOn]) => ({ id, asker: N(a), tribe: N(t), province: P(p), gold, answerOn })).filter((a) => a.asker >= 0 && a.tribe >= 0 && a.province >= 0),
    answered: saved.answered.map(([a, p, yes, on]) => ({ asker: N(a), province: P(p), yes, on })).filter((a) => a.asker >= 0 && a.province >= 0),
    given: saved.given.map(([n, p]) => ({ realm: N(n), province: P(p) })).filter(ok),
    seq: saved.seq,
  };
}

export function tribesHashData(world: World): Int32Array {
  const T = world.tribes;
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceHunt[p]! >= 0) out.push(p, world.provinceHunt[p]!, world.provinceHuntSince[p]!);
  for (const c of T.claims) out.push(c.realm, c.province, c.ends);
  for (const a of T.asks) out.push(a.asker, a.province, a.gold, a.answerOn);
  return Int32Array.from(out);
}
