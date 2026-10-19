import type { World } from "./world.ts";
import { officialPace } from "./belief.ts";
import type { News } from "./war.ts";
import { officialName } from "./names.ts";
import { hirePrice, officialEffectShare } from "./domain/province/rule.ts";
import { provinceConfig } from "./domain/province/model.ts";

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
  // Each man keeps his age as he moves (REALM-275).
  const ga = world.provinceOfficialAge[a]!;
  world.provinceOfficialAge[a] = world.provinceOfficialAge[b]!;
  world.provinceOfficialAge[b] = ga;
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
  world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  world.provinceOfficial[p] = type;
  // A new man: his name comes from a seed no official of this post has carried at the start.
  world.provinceOfficialSeed[p] = (p + world.day * 31) % world.provinceCount;
  world.provinceOfficialSince[p] = world.day;
  // A new man's age is drawn from his seed (people.ts officialAge).
  world.provinceOfficialAge[p] = 0;
  world.provinceOfficialFrom[p] = foreign ? abroad(world, n, p) : -1;
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
export function provinceTaken(world: World, p: number): void {
  world.provinceOfficial[p] = -1;
  world.provinceOfficialFrom[p] = -1;
  world.provinceOfficialSince[p] = world.day;
  world.provinceOfficialAge[p] = 0;
  world.provinceNewLand[p] = world.provinceOwner[p] === world.player ? 1 : 0;
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
