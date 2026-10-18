import type { Lord } from "../realm/index.ts";
import { W, clamp, newCommander, type Army, type Commander, type Era, type StandingOrders } from "./model.ts";

/**
 * Commanders and captains (spec §5.6): skills that grow and fade, traits,
 * wounds and death, origins, captains learning the style, "their man".
 */

const SKILL_MAX = 5;
const skill = (v: number): number => clamp(v, 0, SKILL_MAX);

export type TraitName = keyof typeof W.traits;
export const traitEffects = (t: string): Record<string, number | boolean | string> => ((W.traits as Record<string, Record<string, number | boolean | string>>)[t] ?? {});
export const hasTrait = (c: Commander | undefined, t: string): boolean => c?.traits.includes(t) ?? false;

/** A named commander from the design (WAR-049). */
export function namedCommander(name: string): Commander {
  const n = (W.named_commanders as Record<string, Omit<Commander, "name">>)[name];
  if (!n) throw new Error(`no named commander ${name}`);
  return newCommander(name, structuredClone(n));
}

/** A won battle: +1 victory; +1 Might every 2 victories, or at once when outnumbered (WAR-050). */
export function winBattle(c: Commander, opts: { outnumbered?: boolean; moreOrders?: boolean } = {}): void {
  c.victories += 1;
  if (opts.outnumbered || c.victories % W.might_victories_per_point === 0) c.might = skill(c.might + 1);
  if (opts.moreOrders) c.cunning = skill(c.cunning + 1);
}

/** A lost battle: +1 defeat; a clean withdrawal from it gives +1 Cunning; ambushed and lost −1 Cunning (WAR-052, WAR-053). */
export function loseBattle(c: Commander, opts: { cleanWithdrawal?: boolean; ambushed?: boolean } = {}): void {
  c.defeats += 1;
  if (opts.cleanWithdrawal) c.cunning = skill(c.cunning + 1);
  if (opts.ambushed) c.cunning = skill(c.cunning - 1);
}

/** A serious wound: −1 Might; wounds never heal (WAR-051, WAR-057). */
export function seriousWound(c: Commander): void {
  c.wounds += 1;
  c.might = skill(c.might - 1);
}

/** A birthday: −1 Might every 5 years past 60, −1 Cunning every 5 years past 65 (WAR-051, WAR-053). */
export function birthday(c: Commander): void {
  c.age += 1;
  const a = W.age;
  if (c.age > a.might_from && (c.age - a.might_from) % a.step_years === 0) c.might = skill(c.might - 1);
  if (c.age > a.cunning_from && (c.age - a.cunning_from) % a.step_years === 0) c.cunning = skill(c.cunning - 1);
}

/** Skills age can take from him now: Logistics too past 65 (WAR-055; its rate is not designed). */
export function skillsAgeTakes(c: Commander): ("Might" | "Cunning" | "Logistics")[] {
  const out: ("Might" | "Cunning" | "Logistics")[] = [];
  if (c.age > W.age.might_from) out.push("Might");
  if (c.age > W.age.cunning_from) out.push("Cunning");
  if (c.age > W.age.logistics_from) out.push("Logistics");
  return out;
}

/** +1 Logistics for a full year in the field without a hungry month, or years as a steward or warden first (WAR-054). */
export const logisticsYear = (c: Commander): void => void (c.logistics = skill(c.logistics + 1));
export function takeCommandAfterOffice(c: Commander, office: string): void {
  if (office === "steward" || office === "warden") c.logistics = skill(c.logistics + 1);
}
/** −1 Logistics when an army starves under him (a month at no food) (WAR-055). */
export const armyStarved = (c: Commander): void => void (c.logistics = skill(c.logistics - 1));

/** An academy graduate: +1 Cunning or Logistics at start and no victories (WAR-056). */
export function academyGraduate(name: string, bonus: "Cunning" | "Logistics", base: Partial<Commander> = {}): Commander {
  const c = newCommander(name, { ...base, origin: "an academy graduate", victories: 0 });
  if (bonus === "Cunning") c.cunning = skill(c.cunning + 1);
  else c.logistics = skill(c.logistics + 1);
  return c;
}

/** Chance of a serious wound: 1 in 10 lost, 1 in 20 won, twice for Reckless (WAR-057). */
export function woundChance(c: Commander, won: boolean): number {
  const base = won ? W.wound_chance.won : W.wound_chance.lost;
  return base * (hasTrait(c, "Reckless") ? W.traits.Reckless.wound_mul : 1);
}

/** Chance the loser's commander dies in battle: 1 in 20, "more" under Reckless (how much is not designed) (WAR-062). */
export const deathChance = (c: Commander): { chance: number; more: boolean } => ({ chance: W.death_chance.loser, more: hasTrait(c, "Reckless") && W.traits.Reckless.death_more });

/** After a win a commander with 10 victories may take a second trait (WAR-059). */
export const maySecondTrait = (c: Commander): boolean => c.victories >= W.second_trait_victories && c.traits.length < 2;
/** A second style at 10 victories (WAR-145). */
export const maySecondStyle = (c: Commander): boolean => c.victories >= W.second_style_victories && c.styles.length < 2;

/** Default standing orders from the trait when the player set none (WAR-060). */
export function defaultOrders(a: Army): StandingOrders {
  if (a.ordersSetByPlayer) return a.orders;
  const o = { ...a.orders };
  if (hasTrait(a.commander, "Reckless")) o.retreat = null;
  if (hasTrait(a.commander, "Careful")) o.retreat = 1.5;
  return o;
}

/** One promotion is offered per won battle (WAR-061). */
export const promotionOffers = (won: boolean): number => (won ? 1 : 0);

export type LossCause = "killed" | "captured" | "old age" | "dismissed" | "defected" | "granted land";

/** How commanders are lost; a dismissed lord wavers, a lord granted land leads only his retinue (WAR-062). */
export function loseCommander(a: Army, cause: LossCause, lord?: Lord): { lost: boolean; leadsOnlyRetinue: boolean } {
  if (cause === "dismissed" && lord) waver(lord);
  delete a.commander;
  return { lost: true, leadsOnlyRetinue: cause === "granted land" };
}

/** One step down in loyalty: Loyal → Wavering → Disloyal (a rising is rebellions' business). */
export function waver(lord: Pick<Lord, "loyalty">): void {
  if (lord.loyalty === "Loyal") lord.loyalty = "Wavering";
  else if (lord.loyalty === "Wavering") lord.loyalty = "Disloyal";
}

/** An army takes up to two captains (WAR-063). */
export function addCaptain(a: Army, c: Commander): boolean {
  if (a.captains.length >= W.max_captains) return false;
  a.captains.push(c);
  return true;
}

/** A captain who wins 3 battles under a commander learns his style (WAR-063). */
export function captainWins(captain: Commander & { winsUnder?: number }, commander: Commander): void {
  captain.winsUnder = (captain.winsUnder ?? 0) + 1;
  const style = commander.styles[0];
  if (captain.winsUnder >= W.captain_learns_style_wins && style && !captain.styles.includes(style)) captain.styles.push(style);
}

/** "His men": 8 victories and 5 years with the same standing or hired companies (WAR-064). */
export const theirMan = (c: Commander, yearsWithCompanies: number): boolean => c.victories >= W.their_man.victories && yearsWithCompanies >= W.their_man.years;

/** Events may offer "their man" the throne when Ambitious, unpaid, or under a child or new ruler (WAR-064). */
export function throneOffer(c: Commander, yearsWithCompanies: number, realm: { payOwed?: boolean; childRuler?: boolean; newlyCrowned?: boolean }): boolean {
  return theirMan(c, yearsWithCompanies) && (hasTrait(c, "Ambitious") || !!realm.payOwed || !!realm.childRuler || !!realm.newlyCrowned);
}

export type CommanderOrigin = keyof typeof W.origins;
/** The catch that comes with a commander's origin (WAR-061, X-7, D-WAR-6). */
export function originCatch(origin: string): string {
  const c = (W.origins as Record<string, string>)[origin];
  if (c === undefined) throw new Error(`unknown commander origin ${origin}`);
  return c;
}

export type SkillName = "Might" | "Cunning" | "Logistics";
export type GrowthEvent =
  | { kind: "academy" }
  | { kind: "captain under"; commanderCunning: number }
  | { kind: "wargames"; firstThisEra: boolean }
  | { kind: "peace command year"; gainsSoFar: number }
  | { kind: "victories"; sinceLastMight: number };

/** The skills an era-III-to-VII event gives a commander: academy (staff college in VI–VII), serving as a captain, wargames, a peace year commanding, victories (WAR-158, D-WAR-13). */
export function eraSkillGain(era: Era, e: GrowthEvent): SkillName[] {
  const G = W.skill_growth;
  switch (e.kind) {
    case "academy":
      return ((G.academy as Record<string, string[]>)[era] ?? []) as SkillName[];
    case "captain under":
      return G["captain under"].eras.includes(era) && e.commanderCunning >= G["captain under"].min_cunning ? [G["captain under"].skill as SkillName] : [];
    case "wargames":
      return G.wargames.eras.includes(era) && e.firstThisEra ? [G.wargames.skill as SkillName] : [];
    case "peace command year":
      return G["peace command year"].eras.includes(era) && e.gainsSoFar < G["peace command year"].max ? [G["peace command year"].skill as SkillName] : [];
    case "victories":
      return G.victories.eras.includes(era) && e.sinceLastMight >= G.victories.every ? [G.victories.skill as SkillName] : [];
  }
}
