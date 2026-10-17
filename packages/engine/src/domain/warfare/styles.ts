import { W, knows, type Commander, type Era, type Known } from "./model.ts";

/**
 * Commander styles (spec §5.15, styles §2–§3): a country's list, styles by
 * origin, region fallback, adoption, staleness, learning, and each style's
 * special rule as data.
 */

export interface Style {
  era: string;
  name: string;
  from: string;
  needs: string[];
  approach: string;
  rule: string;
  effects: Record<string, number | boolean>;
  stale: string[][];
  kind: string;
  adopted_only?: boolean;
  after_1939?: boolean;
  weakened_by?: string[];
}

export const STYLES = W.styles as Style[];
export function style(name: string): Style {
  const s = STYLES.find((x) => x.name === name);
  if (!s) throw new Error(`unknown style ${name}`);
  return s;
}

/** The realms and peoples a style's *From* column names. */
export const fromNames = (s: Style): string[] => s.from.split(/,|;| and /).map((x) => x.trim()).filter(Boolean);
const knowsAll = (known: Known | undefined, ids: string[]): boolean => ids.every((i) => knows(known, i));

/** A country's own styles: those whose *From* names it and whose inventions it knows (WAR-138). */
export function countryStyles(country: string, known?: Known, adopted: string[] = []): string[] {
  const own = STYLES.filter((s) => !s.adopted_only && fromNames(s).includes(country) && knowsAll(known, s.needs)).map((s) => s.name);
  return [...own, ...adopted.filter((a) => !own.includes(a))];
}

/** A country with no named style of its own in an era uses its region's (culture group) style (WAR-141). */
export function regionStyle(cultureGroup: string): string | undefined {
  return (W.style_region_fallback as Record<string, string>)[cultureGroup];
}

/** The style a new commander takes by origin: noble or lord the horse style, risen or hired the foot style, graduate the academy's (WAR-139). */
export function styleByOrigin(origin: "a noble" | "a lord" | "risen from the ranks" | "a hired captain" | "an academy graduate", list: { horse?: string; foot?: string; academy?: string }): string | undefined {
  if (origin === "an academy graduate") return list.academy;
  if (origin === "a noble" || origin === "a lord") return list.horse ?? list.foot;
  return list.foot ?? list.horse;
}

/** A hired captain brings his own people's style wherever he serves (WAR-140). */
export function hiredCaptainStyle(people: string): string | undefined {
  return STYLES.find((s) => fromNames(s).includes(people))?.name;
}

export interface AdoptionRecord {
  officersYears?: { count: number; years: number };
  academyTeacher?: boolean;
  /** Years of the battles lost to it. */
  lostTo?: number[];
  alliedBattles?: number;
  tookCapital?: boolean;
}

/** A country adopts a foreign style when it knows its inventions and one way is met (WAR-142). */
export function adopts(name: string, known: Known | undefined, r: AdoptionRecord, now = 0): boolean {
  const s = style(name);
  if (!knowsAll(known, s.needs)) return false;
  const A = W.adoption;
  if (r.officersYears && r.officersYears.count >= A.officers && r.officersYears.years >= A.years) return true;
  if (r.academyTeacher) return true;
  if ((r.lostTo ?? []).filter((y) => y > now - A.lessons_years).length >= A.lessons) return true;
  if ((r.alliedBattles ?? 0) >= A.alliance_battles) return true;
  return r.tookCapital === true;
}

/** An adopted style's rule works at half strength in a commander's first battle with it (WAR-143). */
export function ruleStrength(c: Commander, name: string, adopted: boolean): number {
  return adopted && (c.battlesInStyle?.[name] ?? 0) === 0 ? W.adoption.first_battle_strength : 1;
}

/** A style is stale when the enemy has every item of one of its "stale against" lists (WAR-144). */
export function isStale(name: string, enemy: ReadonlySet<string>): boolean {
  return style(name).stale.some((alt) => alt.every((t) => enemy.has(t)));
}

/** A stale style loses its special rule and one order per bell, and the report says why (WAR-144). */
export function styleInBattle(name: string, enemy: ReadonlySet<string>): { rule: Record<string, number | boolean> | null; orderLoss: number; reason: string | null } {
  if (!isStale(name, enemy)) return { rule: style(name).effects, orderLoss: 0, reason: null };
  const why = style(name).stale.find((alt) => alt.every((t) => enemy.has(t)))!;
  return { rule: null, orderLoss: 1, reason: `${name} is stale against ${why.join(" with ")}` };
}

/** Learning a newer style of his country's list: 3 years served after it entered, an academy that teaches it, or losing to it (WAR-145). */
export function learnsStyle(c: Commander, name: string, how: { yearsServedSince?: number; academy?: boolean; lostTo?: boolean }): boolean {
  const ok = (how.yearsServedSince ?? 0) >= W.style_learn_years || how.academy === true || how.lostTo === true;
  if (!ok) return false;
  if (!c.styles.includes(name)) {
    if (c.styles.length >= 2 || (c.styles.length >= 1 && c.victories < W.second_style_victories)) c.styles = [name];
    else c.styles.push(name);
  }
  return true;
}

/** The approach a commander fights with: Entrenchment fights as Steadfast when attacking (WAR-101). */
export function approachOf(styleName: string, side: "attacker" | "defender"): string {
  const a = style(styleName).approach;
  return a === "Entrenchment" && side === "attacker" ? (W.approaches.Entrenchment.attacking_as as string) : a;
}

/** Era of a style, for listing. */
export const styleEra = (name: string): Era => style(name).era as Era;

/** La guerrilla: hidden bands raid the occupier's food reserve each month in occupied homeland provinces (WAR-146). */
export const guerrillaRaids = (styles: string[], homelandOccupied: boolean): boolean => homelandOccupied && styles.some((s) => style(s).effects["raid_occupier_food"] === true);
/** People's war: rebel bands form for you each month in occupied homeland provinces (WAR-146). */
export const peoplesWarBands = (styles: string[], homelandOccupied: boolean): boolean => homelandOccupied && styles.some((s) => style(s).effects["rebel_bands_occupied"] === true);
/** Ganimi kava: hidden companies attack enemy armies marching through, raiding their food (WAR-146). */
export const raidsMarchers = (styleName: string, hasHidden: boolean): boolean => hasHidden && style(styleName).effects["raid_marching"] === true;
