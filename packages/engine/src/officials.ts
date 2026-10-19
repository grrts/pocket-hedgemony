import type { World } from "./world.ts";
import { officialPace } from "./belief.ts";
import type { News } from "./war.ts";
import { officialName } from "./names.ts";
import { hirePrice, officialEffectShare } from "./domain/province/rule.ts";
import { provinceConfig } from "./domain/province/model.ts";
import { ungoverned } from "./recruit.ts";
import { moodIndex } from "./moods.ts";
import { storeMonths } from "./food.ts";
import { atWar, wallsOf } from "./war.ts";
import { provinceTax } from "./treasury.ts";
import { capsOf } from "./government.ts";

/**
 * Officials as people (province §5.18): each one has a type, a name that goes
 * with him from post to post, and the years he has served in his province.
 * His type's effect grows from half in his first year to full after 5 years
 * there (PROV-192); moving him to another province starts him again at half.
 */

/** Officials a province can have (recruiting: commanders from officials), dealt out to provinces at start. */
export const OFFICIALS = ["Warden", "Steward", "Muster master", "Master of works", "Tax collector", "Customs officer", "Judge", "Schoolmaster"] as const;

/** Days in a year, for years served. */
const YEAR_DAYS = 365.25;

/** Years the official at province p has served there (0 when the post stands empty). */
export function yearsServed(world: World, p: number): number {
  if (world.provinceOfficial[p]! < 0) return 0;
  return Math.max(0, (world.day - world.provinceOfficialSince[p]!) / YEAR_DAYS);
}

/** The name of the official at province p's post, or null when it stands empty. */
export function officialAt(world: World, p: number): string | null {
  const owner = world.provinceOwner[p]!;
  if (owner < 0 || world.provinceOfficial[p]! < 0) return null;
  // A foreign specialist bears a name of the realm he came from (PROV-334).
  const from = world.provinceOfficialFrom[p]!;
  return officialName(world.rules, world.provinceOfficialSeed[p]!, from >= 0 ? from : owner);
}

/** A type's effects in the province config, by the engine's name for it ("Tax collector" → "tax collector"). */
const effectsOf = (type: string): Record<string, number> => (provinceConfig.officials.effects as Record<string, Record<string, number>>)[type.toLowerCase()] ?? {};

const pct = (v: number) => `${Math.round(v * 100)}%`;

/** What an official's type does where he runs a province, for the player: the share of his effect he gives now and a line per effect. */
export interface OfficialEffectView {
  /** Share of his full effect: 0.5 in his first year, 1 after 5 years (PROV-192). */
  share: number;
  /** Short lines, scaled by share ("+14% tax reaching you"). */
  lines: string[];
  /** Set when the system his type works on isn't in the game yet. */
  note: string | null;
}

/** An official's effect by type (an OFFICIALS name) and years served, for showing to the player. */
export function officialEffect(type: string, years: number): OfficialEffectView {
  const share = officialEffectShare(years);
  const e = effectsOf(type);
  const add = (k: string) => (e[k] ?? 0) * share;
  const lines: string[] = [];
  let note: string | null = null;
  switch (type) {
    case "Tax collector":
      lines.push(`+${pct(add("tax_reach"))} tax reaching you`);
      break;
    case "Steward":
      lines.push(`+${pct(add("food"))} food from the harvest`);
      break;
    case "Judge":
      lines.push("Riots need one grievance more");
      break;
    case "Muster master":
      lines.push(`+${pct(add("recruit_refill"))} recruits refilling`);
      break;
    case "Customs officer":
      lines.push(`+${pct(add("trade_ratio_gain"))} trade income`);
      break;
    case "Warden":
      lines.push(`+${pct(add("garrison"))} garrison strength against a storm`);
      break;
    case "Master of works":
      lines.push(`Buildings ${pct(-add("build_cost"))} cheaper`);
      note = "Takes effect when buildings arrive";
      break;
    case "Schoolmaster":
      lines.push("Language drifts toward yours faster");
      note = "Takes effect when schools arrive";
      break;
  }
  return { share, lines, note };
}

const TYPE_INDEX = new Map<string, number>(OFFICIALS.map((t, k) => [t, k]));

/**
 * 1 + the bonus of one effect (`key` in the province config) of the official
 * at province p, if he is of `type`; 1 otherwise. It works on the province's
 * own output, before a lord takes his share (a lord's officials give their
 * effects in his provinces too, PROV-202).
 */
export function officialBonus(world: World, p: number, type: (typeof OFFICIALS)[number], key: string): number {
  if (world.provinceOfficial[p] !== TYPE_INDEX.get(type) || world.provinceOccupier[p]! >= 0) return 1;
  // In a realm of a low Tongue % an official's effect grows more slowly (REALM-238).
  return 1 + (effectsOf(type)[key] ?? 0) * officialEffectShare(yearsServed(world, p) * officialPace(world, p));
}

/**
 * Officials start the campaign with a spread of years served, 0 to 10, worked
 * out from the province alone so every game starts the same.
 */
export function seedOfficials(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) {
    world.provinceOfficialSeed[p] = p;
    const months = (Math.imul(p + 1, 0x9e3779b1) >>> 0) % 121;
    world.provinceOfficialSince[p] = world.day - Math.floor((months / 12) * YEAR_DAYS);
  }
}

/**
 * Moves officials between two provinces of a realm (AssignOfficial): the two
 * swap posts, or one goes to the other's empty post and leaves his own empty.
 * Neither province may be a lord's, whose officials serve him. Each official
 * who moves starts again at half his effect (PROV-192).
 */
export function swapOfficials(world: World, n: number, a: number, b: number, news: News[]): string | null {
  const valid = (p: number) => Number.isInteger(p) && p >= 0 && p < world.provinceCount;
  if (!valid(a) || !valid(b)) return "no such province";
  if (a === b) return "pick another province";
  for (const p of [a, b]) {
    if (world.provinceOwner[p] !== n) return `${world.rules.provinces[p]!.name} is not your province`;
    if (world.provinceLord[p]! >= 0) return `${world.rules.provinces[p]!.name} is a lord's: his officials serve him, not the crown`;
  }
  const ta = world.provinceOfficial[a]!;
  const tb = world.provinceOfficial[b]!;
  if (ta < 0 && tb < 0) return "both posts stand empty";
  const nameA = officialAt(world, a);
  const nameB = officialAt(world, b);
  const sa = world.provinceOfficialSeed[a]!;
  const fa = world.provinceOfficialFrom[a]!;
  world.provinceOfficial[a] = tb;
  world.provinceOfficial[b] = ta;
  world.provinceOfficialSeed[a] = world.provinceOfficialSeed[b]!;
  world.provinceOfficialSeed[b] = sa;
  world.provinceOfficialFrom[a] = world.provinceOfficialFrom[b]!;
  world.provinceOfficialFrom[b] = fa;
  world.provinceOfficialSince[a] = world.provinceOfficialSince[b] = world.day;
  if (n === world.player) {
    const pa = world.rules.provinces[a]!.name;
    const pb = world.rules.provinces[b]!.name;
    const moved = (who: string, type: number, from: string, to: string) => `${who}, ${OFFICIALS[type]!.toLowerCase()}, moves from ${from} to ${to}`;
    const parts: string[] = [];
    if (ta >= 0) parts.push(moved(nameA!, ta, pa, pb));
    if (tb >= 0) parts.push(moved(nameB!, tb, pb, pa));
    const empty = ta < 0 ? pb : tb < 0 ? pa : null;
    news.push({ kind: "raised", text: `${parts.join("; ")}.${empty ? ` The post at ${empty} stands empty.` : ""} A new post starts him at half his effect.`, nations: [n], province: b });
  }
  return null;
}

/** Official types serving in a realm's royal posts, but province `except`'s: the ones it can hire at home (PROV-333). */
export function nativeTypes(world: World, n: number, except = -1): Set<number> {
  const out = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) {
    if (p !== except && world.provinceOwner[p] === n && world.provinceLord[p]! < 0 && world.provinceOfficial[p]! >= 0) out.add(world.provinceOfficial[p]!);
  }
  return out;
}

/** Gold to hire an official into an empty post: a foreign specialist costs more (PROV-333, PROV-334). */
export const hireGold = (foreign: boolean): number => hirePrice(foreign);

/** A realm next to the post for a foreign specialist to come from; else the next realm in the list. */
function abroad(world: World, n: number, p: number): number {
  for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
    const o = world.provinceOwner[world.adjList[k]!]!;
    if (o >= 0 && o !== n) return o;
  }
  for (let k = 1; k < world.nationCount; k++) if (!world.nationGone[(n + k) % world.nationCount]) return (n + k) % world.nationCount;
  return n;
}

/** A new official of `type` takes the post at p for `gold`, at half his effect: the checks are the caller's. */
function seat(world: World, n: number, p: number, type: number, foreign: boolean, gold: number): void {
  world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  world.provinceOfficial[p] = type;
  // A new man: his name comes from a seed no official of this post has carried at the start.
  world.provinceOfficialSeed[p] = (p + world.day * 31) % world.provinceCount;
  world.provinceOfficialSince[p] = world.day;
  world.provinceOfficialFrom[p] = foreign ? abroad(world, n, p) : -1;
}

/**
 * Hires an official of `type` (an OFFICIALS index) into province p's empty
 * royal post (HireOfficial, PROV-333 to 335): gold up front, and he starts at
 * half his effect. A type serving in none of the realm's other royal posts
 * can only come from abroad, as a foreign specialist who costs more.
 */
export function hireOfficial(world: World, n: number, p: number, type: number, foreign: boolean, news: News[]): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  const place = world.rules.provinces[p]!.name;
  if (world.provinceLord[p]! >= 0) return `${place} is a lord's: his own officials serve him, not the crown`;
  if (world.provinceOfficial[p]! >= 0) return `${place} has an official already`;
  if (!Number.isInteger(type) || type < 0 || type >= OFFICIALS.length) return "no such kind of official";
  if (!foreign && !nativeTypes(world, n, p).has(type)) return `no one at home knows the ${OFFICIALS[type]!.toLowerCase()}'s trade: hire one from abroad`;
  const gold = hireGold(foreign);
  if (world.nationTreasury[n]! < gold) return "not enough gold";
  seat(world, n, p, type, foreign, gold);
  if (n === world.player) {
    const from = foreign ? ` from ${world.rules.nations[world.provinceOfficialFrom[p]!]!.name}` : "";
    news.push({ kind: "raised", text: `${officialAt(world, p)}, a ${OFFICIALS[type]!.toLowerCase()}${from}, takes up the post at ${place} for ${gold} gold. A new post starts him at half his effect.`, nations: [n], province: p });
  }
  return null;
}

/**
 * A province a realm has just taken, by peace or handed over: its official
 * fled or fell with it (PROV-194), so its post stands empty. The player's
 * new land waits for him to fill the post, grant it as a fief, or keep it
 * as royal land with the post empty before the turn ends (PROV-340).
 */
export function provinceTaken(world: World, p: number, news: News[] = []): void {
  world.provinceOfficial[p] = -1;
  world.provinceOfficialFrom[p] = -1;
  world.provinceOfficialSince[p] = world.day;
  const n = world.provinceOwner[p]!;
  const auto = n >= 0 && autoFills(world, n);
  // A realm that fills its own posts fills this one at once if its gold allows, and does not wait on the player (PROV-344).
  world.provinceNewLand[p] = n === world.player && !auto ? 1 : 0;
  const occupier = world.provinceOccupier[p]!;
  if (!auto || world.provinceLord[p]! >= 0 || (occupier >= 0 && occupier !== n) || !ungoverned(world, p)) return;
  const r = postsOf(world, n);
  if (roomOf(world, n, r) <= 0) return;
  const hired: string[] = [];
  const before = world.nationTreasury[n]!;
  if (fillPost(world, n, p, autoFillReserve(), r, hired) && n === world.player) news.push({ kind: "raised", text: fillNews(hired, before - world.nationTreasury[n]!), nations: [n], province: p });
}

/** The realm's new land still waiting for a decision (PROV-340): its post empty and no lord granted it. */
export function newLands(world: World, n: number): number[] {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceNewLand[p] && world.provinceOwner[p] === n && world.provinceOfficial[p]! < 0 && world.provinceLord[p]! < 0) out.push(p);
  }
  return out;
}

/** Keeps new land as royal land with its post empty for now (SettleLand, PROV-340). */
export function settleLand(world: World, n: number, p: number): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  world.provinceNewLand[p] = 0;
  return null;
}

// ---------------------------------------------------------------- filling posts with fewer taps (PROV-342 to PROV-347)

const autoCfg = () => (provinceConfig.officials as unknown as { auto_fill: { reserve_gold: number; hungry_months: number; traders_passing: number } }).auto_fill;
/** Gold auto-fill keeps back in the treasury (PROV-342). */
export const autoFillReserve = (): number => autoCfg().reserve_gold;

/** Whether realm n fills its own empty posts each month: every AI realm, and the player's while Auto-fill posts is on (PROV-342). */
export function autoFills(world: World, n: number): boolean {
  return n !== world.player || !world.nationManualPosts[n];
}

/** The best fit for a province's post and why, in a few words (PROV-343). */
export interface PostFit {
  /** Index in OFFICIALS. */
  type: number;
  why: string;
}

const typeOf = (name: (typeof OFFICIALS)[number]) => TYPE_INDEX.get(name)!;

/** Whether province p borders the land of a realm its owner is at war with. */
function onWarBorder(world: World, p: number): boolean {
  const n = world.provinceOwner[p]!;
  for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) {
    const o = world.provinceOwner[world.adjList[k]!]!;
    if (o >= 0 && o !== n && atWar(world, n, o)) return true;
  }
  return false;
}

/**
 * The best fit for the post at province p (PROV-343): a judge where it riots
 * or plots, a steward where its store holds under a month of food, a warden
 * where it has walls facing an enemy at war, a customs officer where
 * traders pass, else a tax collector.
 */
export function bestFit(world: World, p: number): PostFit {
  if (moodIndex(world, p) >= 2) return { type: typeOf("Judge"), why: "riots here" };
  if (world.provincePopulation[p]! > 0 && storeMonths(world, p) < autoCfg().hungry_months) return { type: typeOf("Steward"), why: "under a month of food" };
  if (wallsOf(world, p) && onWarBorder(world, p)) return { type: typeOf("Warden"), why: "walls facing the enemy" };
  // A customs officer speeds the trade ratio's gain from traders passing, so he helps only where they pass (TRADE-035).
  if (world.provincePassed[p]! >= autoCfg().traders_passing) return { type: typeOf("Customs officer"), why: "traders pass here" };
  const owner = world.provinceOwner[p]!;
  const tax = owner >= 0 ? provinceTax(world, p, owner, 1) : 0;
  return { type: typeOf("Tax collector"), why: `${(Math.round(tax * 10) / 10).toFixed(1)} gold tax a month` };
}

/** A realm's royal posts in one pass: officials in post, posts that can be filled now (most people first) and how many serve of each type. */
interface RealmPosts {
  used: number;
  empty: number[];
  /** Officials in royal posts by type (index in OFFICIALS): a type with one can be hired at home (PROV-333). */
  native: Int32Array;
}

/** Every realm's royal posts (or realm `only`'s), in one pass over the provinces. */
function realmPosts(world: World, only = -1): (RealmPosts | undefined)[] {
  const out: (RealmPosts | undefined)[] = new Array(world.nationCount);
  for (let p = 0; p < world.provinceCount; p++) {
    const n = world.provinceOwner[p]!;
    if (n < 0 || (only >= 0 && n !== only) || world.provinceLord[p]! >= 0) continue;
    const r = (out[n] ??= { used: 0, empty: [], native: new Int32Array(OFFICIALS.length) });
    const o = world.provinceOfficial[p]!;
    if (o >= 0) r.used++, r.native[o]!++;
    else if (world.provinceOccupier[p]! < 0 && ungoverned(world, p)) r.empty.push(p);
  }
  for (const r of out) r?.empty.sort((a, b) => world.provincePopulation[b]! - world.provincePopulation[a]! || a - b);
  return out;
}

const NO_POSTS: RealmPosts = { used: 0, empty: [], native: new Int32Array(OFFICIALS.length) };
const postsOf = (world: World, n: number): RealmPosts => realmPosts(world, n)[n] ?? NO_POSTS;
const roomOf = (world: World, n: number, r: RealmPosts) => capsOf(world, n).officials.total - r.used;

/** Room under realm n's officials cap: royal posts filled count against it (GOV-001). */
export function officialsRoom(world: World, n: number): number {
  return roomOf(world, n, postsOf(world, n));
}

/** The hire for a post by its best fit, with the realm's officials by type: at home when someone else knows the trade, else from abroad (PROV-342). */
function hireFor(world: World, p: number, native: Int32Array): PostFit & { foreign: boolean; gold: number } {
  const fit = bestFit(world, p);
  const foreign = native[fit.type]! - (world.provinceOfficial[p] === fit.type ? 1 : 0) <= 0;
  return { ...fit, foreign, gold: hireGold(foreign) };
}

/** The hire auto-fill and Fill all make for a post: the best fit, at home when someone knows the trade, else from abroad (PROV-342). */
export function fitHire(world: World, n: number, p: number): PostFit & { foreign: boolean; gold: number } {
  return hireFor(world, p, postsOf(world, n).native);
}

/** The best hire for each of realm n's royal posts, by province, worked out in one pass (the Officials tab and post screens). */
export function fitHires(world: World, n: number): Record<number, PostFit & { foreign: boolean; gold: number }> {
  const native = postsOf(world, n).native;
  const out: Record<number, PostFit & { foreign: boolean; gold: number }> = {};
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.provinceLord[p]! < 0) out[p] = hireFor(world, p, native);
  return out;
}

/** Fills one empty post by its best fit if the treasury keeps `reserve` after; adds "Name, type, at Place" to `hired`. */
function fillPost(world: World, n: number, p: number, reserve: number, r: RealmPosts, hired: string[]): boolean {
  const h = hireFor(world, p, r.native);
  if (world.nationTreasury[n]! - h.gold < reserve) return false;
  seat(world, n, p, h.type, h.foreign, h.gold);
  r.used++;
  r.native[h.type]!++;
  hired.push(`${officialAt(world, p)}, ${OFFICIALS[h.type]!.toLowerCase()}${h.foreign ? " from abroad" : ""}, at ${world.rules.provinces[p]!.name}`);
  return true;
}

/** Realm n's empty royal posts that can be filled now, most people first: not a lord's, not self-run, not occupied. */
export function emptyPosts(world: World, n: number): number[] {
  return postsOf(world, n).empty;
}

/** What filling every empty post would cost now, by PROV-342's choices, and how many posts the cap leaves room for. */
export function fillAllCost(world: World, n: number): { posts: number; gold: number } {
  const r = postsOf(world, n);
  const posts = r.empty.slice(0, Math.max(0, roomOf(world, n, r)));
  return { posts: posts.length, gold: posts.reduce((g, p) => g + hireFor(world, p, r.native).gold, 0) };
}

/**
 * Fills realm n's empty royal posts, most people first, each with its best
 * fit, while the treasury keeps `reserve` and the officials cap has room
 * (PROV-342, PROV-348). Returns the hires, and whether a post went unfilled for want of gold.
 */
function fillPosts(world: World, n: number, reserve: number, r: RealmPosts): { hired: string[]; short: boolean; gold: number } {
  const hired: string[] = [];
  const before = world.nationTreasury[n]!;
  let room = roomOf(world, n, r);
  let short = false;
  for (const p of r.empty) {
    if (room <= 0) break;
    if (fillPost(world, n, p, reserve, r, hired)) room--;
    else short = true;
  }
  return { hired, short, gold: before - world.nationTreasury[n]! };
}

const fillNews = (hired: string[], gold: number) => `Auto-fill: ${hired.join("; ")}. ${Math.round(gold)} gold.`;

/** Each month, every realm that fills its own posts fills them (PROV-342); the player hears it in one line (PROV-347). */
export function monthlyPosts(world: World, news: News[]): void {
  const all = realmPosts(world);
  for (let n = 0; n < world.nationCount; n++) {
    const r = all[n];
    if (!r?.empty.length || world.nationGone[n] || !autoFills(world, n)) continue;
    const { hired, short, gold } = fillPosts(world, n, autoFillReserve(), r);
    if (n !== world.player) continue;
    if (hired.length) news.push({ kind: "raised", text: fillNews(hired, gold), nations: [n] });
    // A post left empty for want of gold is said once a year, in January (PROV-347).
    if (short && world.date.month === 1) news.push({ kind: "raised", text: `Auto-fill keeps ${autoFillReserve()} gold back: ${emptyPosts(world, n).length} posts stand empty until the treasury allows.`, nations: [n] });
  }
}

/** Fill all (PROV-348): every empty post by its best fit, whatever the switch, until the gold runs out or the cap is reached. */
export function fillAllPosts(world: World, n: number, news: News[]): string | null {
  const r = postsOf(world, n);
  if (!r.empty.length) return "no post stands empty";
  if (roomOf(world, n, r) <= 0) return "the realm holds as many officials as its government allows";
  const { hired, gold } = fillPosts(world, n, 0, r);
  if (!hired.length) return "not enough gold";
  if (n === world.player) news.push({ kind: "raised", text: `${hired.join("; ")} take up their posts for ${Math.round(gold)} gold. A new post starts each at half his effect.`, nations: [n] });
  return null;
}

/** Turns the player's Auto-fill posts on or off (SetAutoFill, PROV-342); turned on, land waiting for a decision no longer waits (PROV-344). */
export function setAutoFill(world: World, n: number, on: boolean): string | null {
  world.nationManualPosts[n] = on ? 0 : 1;
  if (on) for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) world.provinceNewLand[p] = 0;
  return null;
}

/**
 * Dismisses the official of a royal post (DismissOfficial, PROV-345): he
 * leaves the realm's service and the post stands empty; with `hire`, a new
 * official of that type takes it in the same step, refused (keeping him) when
 * the hire would be.
 */
export function dismissOfficial(world: World, n: number, p: number, hire: { type: number; foreign: boolean } | null, news: News[]): string | null {
  if (!Number.isInteger(p) || p < 0 || p >= world.provinceCount || world.provinceOwner[p] !== n) return "not your province";
  const place = world.rules.provinces[p]!.name;
  if (world.provinceLord[p]! >= 0) return `${place} is a lord's: his officials serve him, not the crown`;
  const type = world.provinceOfficial[p]!;
  if (type < 0) return `the post at ${place} stands empty`;
  const name = officialAt(world, p)!;
  if (hire) {
    if (hire.type === type) return `he is a ${OFFICIALS[type]!.toLowerCase()} already`;
    // Someone else of the new type must serve at home for a native hire; the dismissed man's own type no longer counts.
    if (!hire.foreign && !nativeTypes(world, n, p).has(hire.type)) return `no one at home knows the ${OFFICIALS[hire.type]!.toLowerCase()}'s trade: hire one from abroad`;
    if (world.nationTreasury[n]! < hireGold(hire.foreign)) return "not enough gold";
  }
  world.provinceOfficial[p] = -1;
  world.provinceOfficialFrom[p] = -1;
  world.provinceOfficialSince[p] = world.day;
  if (n === world.player) news.push({ kind: "raised", text: `${name}, ${OFFICIALS[type]!.toLowerCase()} of ${place}, is dismissed and leaves your service.${hire ? "" : " The post stands empty: half tax and recruits until it is filled."}`, nations: [n], province: p });
  return hire ? hireOfficial(world, n, p, hire.type, hire.foreign, news) : null;
}
