import { layoutFor, tapTargetMin, type Shape } from "../map-presentation/layout.ts";
import { holdWord } from "./empire.ts";

/**
 * How the player meets the institutions (INST-080 to INST-085): the
 * Institutions row on their own Diplomacy tab, the badge on a member's
 * country card, the Empire card's folds, the map mode's key, and the card's
 * place on a phone. The client draws these; the words live here so the
 * specs can read them.
 */

/** What the Institutions row and the badge read of an institution. */
export interface InstitutionLine {
  name: string;
  office: string;
  holder: string;
  hold: number;
  role: string | null;
}

/** INST-080: "The Empire · Emperor: Austria · Hold 35 Weak · You: Elector". */
export const institutionRow = (l: InstitutionLine): string => `${l.name} · ${l.office}: ${l.holder} · Hold ${l.hold} ${holdWord(l.hold)}${l.role ? ` · You: ${l.role}` : ""}`;

/** INST-080: the badge on a member's country card: Emperor, Elector or Empire; null for a realm outside it. */
export function empireBadge(role: "Emperor" | "Elector" | "Member" | null): string | null {
  return role === null ? null : role === "Member" ? "Empire" : role;
}

/** INST-081: the Empire card's folds, in order. */
export const EMPIRE_FOLDS = ["Election", "Reforms", "Members", "Hold"] as const;

/** INST-082: the Shogunate card's folds, in order. */
export const SHOGUNATE_FOLDS = ["Houses", "The Court", "Hold"] as const;

/** INST-082: the warning line while hold is Weak or lower. */
export const BREAK_WARNING = "At hold 0 the houses break away";

/** INST-084: the Institutions map mode's key: each colour with its pattern, so it reads without colour too. */
export const INSTITUTIONS_KEY = [
  { what: "The Emperor's or the Shogun's land", colour: "gold", pattern: "solid" },
  { what: "Members' land", colour: "light gold", pattern: "solid" },
  { what: "An elector's seat", colour: "light gold", pattern: "seat mark" },
  { what: "Imperial land held by an outsider", colour: "red", pattern: "hatched" },
  { what: "A great house of Japan", colour: "the house's own", pattern: "house border" },
] as const;

/** INST-083: what silence on an answer card counts as. */
export const SILENCE = { diet: "no", defence: "refusal", oath: "refusal", election: "the seat votes by its reasons" } as const;

/** INST-085: where an institution's card sits in a layout, and the least height of its fold headers, rows and buttons. */
export function institutionCard(shape: Shape): { sheet: "side sheet" | "bottom sheet"; safeAreas: true; minTap: number; hover: false } {
  const card = layoutFor(shape).card;
  return { sheet: card.kind === "bottom sheet" ? "bottom sheet" : "side sheet", safeAreas: true, minTap: tapTargetMin(), hover: false };
}
