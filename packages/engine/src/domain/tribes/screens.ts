import { layoutFor, tapTargetMin, type Shape } from "../map-presentation/layout.ts";
import C from "../../../../rules/data/domain/tribes.json" with { type: "json" };

/**
 * How the player meets hunting grounds (TRIBE-026 to TRIBE-030): the line
 * and buttons on a province card, the Hunting grounds tab and its line on
 * the General tab, the fleet card's note, the settlers alert and the map's
 * hatch. The client draws these; the words live here so the specs can read
 * them.
 */

/** The tab on a tribal realm's card: in the Lands section, beside Colonies (TRIBE-027). */
export const HUNT_TAB = { id: "hunting", label: "Hunting grounds", section: "Lands" } as const;

export const NO_COUNTRY = "Land of a people with no country";

/** TRIBE-026: under an unowned province's name: whose ground it is, or no one's. `tribe` as "the Creek". */
export const groundLine = (tribe: string | null): string => (tribe ? `Hunting ground of ${tribe}` : NO_COUNTRY);

export interface ButtonView {
  label: string;
  enabled: boolean;
  /** Written under the button when it can't be used: never only in a hover title (TRIBE-030). */
  note: string | null;
  /** Asked before it acts, or null. */
  confirm: string | null;
  minHeight: number;
}

const button = (label: string, why: string | null, confirm: string | null = null): ButtonView => ({ label, enabled: why === null, note: why, confirm, minHeight: tapTargetMin() });

export const CLAIM_LABEL = `Claim as hunting ground · ${C.claim_months} months`;

/** TRIBE-026: the claim button on the card of a province the player may claim, greyed with the reason. */
export const claimButton = (why: string | null): ButtonView => button(CLAIM_LABEL, why);
/** TRIBE-026: Take them in, greyed with "held 6 of 10 years" or "not while at war". */
export const takeInButton = (why: string | null): ButtonView => button("Take them in", why);
/** TRIBE-026: Leave this ground, which asks to confirm. */
export const leaveButton = (province: string): ButtonView => button("Leave this ground", null, `Leave ${province}? Our hunters stop walking it, and we may not claim it again for ${C.reclaim_years} years.`);
/** TRIBE-023: Ask for the land, at the asking price. */
export const askButton = (gold: number, why: string | null): ButtonView => button(`Ask for the land · ${gold} gold`, why);

const gold = (n: number): string => (Math.round(n * 10) / 10).toString();

/** TRIBE-027: the tab's head, with its bar (0 to 1). */
export const rangeHeader = (held: number, size: number): { text: string; bar: number } => ({ text: `Hunting grounds ${held} of ${size}`, bar: size > 0 ? Math.min(1, held / size) : 0 });
/** TRIBE-027: the General tab's one line, which opens the Hunting grounds tab. */
export const generalLine = (held: number, size: number, furs: number): { text: string; opens: typeof HUNT_TAB.id } => ({ text: `Hunting grounds ${held} of ${size} · furs ${gold(furs)} gold a month`, opens: HUNT_TAB.id });
/** One ground's row: its people, years held and furs. */
export const groundRow = (r: { people: number; years: number; furs: number }): string => `${Math.round(r.people)}k people · held ${r.years} ${r.years === 1 ? "year" : "years"} · furs ${gold(r.furs)} a month`;

/** TRIBE-027: settlers on the realm's grounds lead the tab, in red, with Go there. */
export const settlersRow = (founder: string, province: string): { text: string; tone: "red"; button: "Go there" } => ({ text: `${founder} is founding a colony at ${province}`, tone: "red", button: "Go there" });

/** TRIBE-029: the alert over the map when someone starts settling a ground of the player's; the dispatches keep it. */
export const settlersAlert = (founder: string, province: string): { text: string; buttons: ["Go there"]; kept: true } => ({ text: `Settlers on our land: ${founder} at ${province}`, buttons: ["Go there"], kept: true });

/** TRIBE-029: the fleet card's Colony section over a tribe's ground. */
export const colonyNote = (tribe: string): string => `Hunting ground of ${tribe}: settling here angers them`;
export const COLONY_BUTTONS = ["Found colony", "Ask for the land"] as const;

/** TRIBE-028: how the map draws a ground. */
export const HUNT_KEY = { what: "A tribe's hunting ground", colour: "the tribe's colour", pattern: "light diagonal hatch", zooms: "every zoom", lenses: ["political", "charts"] } as const;
/** TRIBE-028: the Charts lens marks an empty coast in range green, amber when it is someone's hunting ground. */
export const chartsCoast = (ground: boolean): "amber" | "green" => (ground ? "amber" : "green");

/** TRIBE-030: the tab and the card buttons on a phone: one column, no sideways scrolling, 44-point taps, nothing on hover. */
export function tribesCard(shape: Shape): { sheet: "side sheet" | "bottom sheet"; safeAreas: true; minTap: number; hover: false; columns: 1; sidewaysScroll: false } {
  const card = layoutFor(shape).card;
  return { sheet: card.kind === "bottom sheet" ? "bottom sheet" : "side sheet", safeAreas: true, minTap: tapTargetMin(), hover: false, columns: 1, sidewaysScroll: false };
}
