import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { officialName } from "./names.ts";
import { officialEffectShare } from "./domain/province/rule.ts";
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
  return officialName(world.rules, world.provinceOfficialSeed[p]!, owner);
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
      lines.push("Tongue drifts toward yours faster");
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
  return 1 + (effectsOf(type)[key] ?? 0) * officialEffectShare(yearsServed(world, p));
}

/**
 * Officials start the campaign with a spread of years served, 0 to 10, worked
 * out from the province alone so every game starts the same.
 */
export function seedOfficials(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) {
    world.provinceOfficialSeed[p] = p;
    const months = (Math.imul(p + 1, 0x9e3779b1) >>> 0) % 121;
    world.provinceOfficialSince[p] = world.day - Math.round((months / 12) * YEAR_DAYS);
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
  world.provinceOfficial[a] = tb;
  world.provinceOfficial[b] = ta;
  world.provinceOfficialSeed[a] = world.provinceOfficialSeed[b]!;
  world.provinceOfficialSeed[b] = sa;
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
