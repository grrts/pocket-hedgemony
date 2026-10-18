/**
 * Playing as a subject, the subject card and the subjects lens (SUBJ-091 …
 * SUBJ-096, SUBJ-100, SUBJ-102, SUBJ-104, SUBJ-131 … SUBJ-139): pure rules,
 * read by the game and the specs alike.
 */
import config from "../../../../rules/data/domain/subjects.json" with { type: "json" };
import rulers from "../../../../rules/data/domain/subjects-rulers-1444.json" with { type: "json" };
import { becomeSubjectAllowed, cardButtons, grantsLoosenAsk, kindIcon, outgrown, stepName, type FoldInContext, type Kind, type Reason, type SubjectBond, warAnswer } from "./index.ts";

const P = config.playing_as_subject;

// ---------------------------------------------------------------------------
// Paying or not (SUBJ-102, SUBJ-132)
// ---------------------------------------------------------------------------

/** The subject stops paying: nothing reaches its overlord and it steps toward Disloyal each season end. */
export function stopPaying(b: SubjectBond): void {
  b.withholding = true;
}

/** The subject pays again: the tribute flows and *Withholds tribute* ends. */
export function payAgain(b: SubjectBond): void {
  delete b.withholding;
}

// ---------------------------------------------------------------------------
// The card from below (SUBJ-102, SUBJ-131)
// ---------------------------------------------------------------------------

export type BelowChoiceId = "pay" | "stop_paying" | "ask_loosen" | "seek_backer" | "wait_bad_war" | "marry" | "rise";

export interface BelowChoice {
  id: BelowChoiceId;
  label: string;
  /** Why it can't be done now, or null. */
  locked: string | null;
}

export interface BelowContext {
  /** The realms that would back a rising (SUBJ-133). */
  backers: readonly string[];
  /** The overlord's wars, each with the share of its voices that want peace. */
  overlordWars: readonly { peaceShare: number }[];
  /** Whether the two houses are married. */
  married: boolean;
  /** How the overlord's AI would answer an ask to loosen (SUBJ-103, SUBJ-134). */
  overlord: { cautious: boolean; overReach: boolean };
}

const LOOSER: Partial<Record<Kind, Kind>> = config.loosen.order as Partial<Record<Kind, Kind>>;

/**
 * The player's own card seen from below: the same badges its overlord reads,
 * and the subject's choices, each with why not when it can't be taken now.
 */
export function cardFromBelow(b: SubjectBond, reasons: readonly Reason[], ctx: BelowContext): { badges: Reason[]; choices: BelowChoice[] } {
  const disloyal = b.loyalty === "disloyal" || b.loyalty === "in_revolt";
  const losing = ctx.overlordWars.some((w) => w.peaceShare > config.rising.overlord_losing_peace_voice_share);
  const choices: BelowChoice[] = [
    { id: "pay", label: "Pay and be protected", locked: b.withholding ? null : "you pay already" },
    { id: "stop_paying", label: "Stop paying", locked: b.withholding ? "you pay nothing already" : disloyal ? "a Disloyal subject pays nothing already" : null },
    {
      id: "ask_loosen",
      label: "Ask to loosen",
      locked:
        b.loyalty !== "loyal" ? "only a Loyal subject asks politely"
        : !LOOSER[b.kind] ? `a ${b.kind} cannot be loosened`
        : grantsLoosenAsk(b, ctx.overlord) ? null
        : "they would refuse: they are neither cautious nor over their reach",
    },
    { id: "seek_backer", label: "Find a backer", locked: ctx.backers.length ? null : "no rival of theirs at peace borders you and is as strong as they are" },
    { id: "wait_bad_war", label: "Wait for their bad war", locked: losing ? null : ctx.overlordWars.length ? "their war goes well enough for them" : "they are at peace" },
    { id: "marry", label: "Marry into their house", locked: null },
    { id: "rise", label: "Rise for independence", locked: disloyal ? null : "only a Disloyal subject rises" },
  ];
  void ctx.married;
  return { badges: [...reasons], choices };
}

// ---------------------------------------------------------------------------
// Turning the tables (SUBJ-104, SUBJ-135)
// ---------------------------------------------------------------------------

/**
 * Whether a subject that won its independence war may make its old overlord
 * its own subject in the same peace, and of which kind: it must have outgrown
 * it and hold the *Become a subject* term's share of its peace voices.
 */
export function turnTheTables(t: { subjectProvinces: number; overlordProvinces: number; won: boolean; peaceShare: number; landPath: boolean; era?: string }): Kind | null {
  if (!t.won || t.subjectProvinces <= t.overlordProvinces) return null;
  const kind = (t.landPath ? P.turn_the_tables.kind_with_land_path : P.turn_the_tables.kind_otherwise) as Kind;
  if (t.peaceShare <= P.turn_the_tables.peace_voice_share_over) return null;
  return becomeSubjectAllowed({ kind, era: t.era ?? "1", landPath: t.landPath, peaceShare: t.peaceShare }) ? kind : null;
}

/** Whether a subject has outgrown its overlord in the turning-the-tables sense: more provinces than it. */
export function outgrewOverlord(subjectProvinces: number, overlordProvinces: number): boolean {
  return outgrown("tributary", subjectProvinces, overlordProvinces);
}

// ---------------------------------------------------------------------------
// The overlord's AI: cautious (SUBJ-134)
// ---------------------------------------------------------------------------

/** An overlord is cautious when its catalogue unrest risk or outside-threat exposure is high or very high. */
export function cautiousOverlord(assessments: Readonly<Record<string, { level: string } | undefined>>): boolean {
  return P.cautious_when.dimensions.some((d) => P.cautious_when.levels.includes(assessments[d]?.level ?? ""));
}

// ---------------------------------------------------------------------------
// The AI as a rival (SUBJ-100, SUBJ-139)
// ---------------------------------------------------------------------------

export interface RivalOverlord {
  overlord: string;
  subjects: readonly SubjectBond[];
}

/**
 * One AI rival decision: it courts a Wavering subject of its rivals, first of
 * the overlord with the most Disloyal subjects, and that overlord is the one it
 * picks *Break a subject* against.
 */
export function aiRival(rivals: readonly RivalOverlord[]): { court: string | null; breakAgainst: string | null } {
  const disloyal = (r: RivalOverlord) => r.subjects.filter((b) => b.loyalty === "disloyal").length;
  const order = [...rivals].sort((x, y) => disloyal(y) - disloyal(x));
  const target = order.find((r) => disloyal(r) > 0);
  let court: string | null = null;
  for (const r of order) {
    const w = r.subjects.find((b) => b.loyalty === "wavering");
    if (w) {
      court = w.subject;
      break;
    }
  }
  return { court, breakAgainst: target?.overlord ?? null };
}

// ---------------------------------------------------------------------------
// The subject card (SUBJ-092, SUBJ-137)
// ---------------------------------------------------------------------------

export interface Ruler {
  ruler: string;
  house?: string;
  born?: number;
}

/** A realm's ruler in 1444 as the catalogue names him, if it does. */
export function ruler1444(id: string): Ruler | null {
  return (rulers.rulers as Record<string, Ruler>)[id.toLowerCase()] ?? null;
}

/** "Duke Francis I, age 30 · House Montfort", or as much of it as is known. */
export function rulerLine(r: Ruler | null, year: number): string {
  if (!r) return "";
  return `${r.ruler}${r.born ? `, age ${year - r.born}` : ""}${r.house ? ` · ${r.house}` : ""}`;
}

const COMES: Record<string, string> = {
  whole_at_once: "Comes when called: at once, with its whole army",
  half_late: "Comes when called: half, late",
  refuses: "Refuses your calls",
  not_called: "Never called to your wars",
  frontier: "Fights on its own frontier",
  defends_self: "Defends only itself",
  at_war_with_overlord: "At war with you",
};

export interface SubjectCard {
  /** The card's frame: the lord card's, so the two read alike. */
  frame: "lord";
  name: string;
  kind: string;
  icon: string;
  ruler: string;
  facts: { provinces: number; army: number; treasury: number; ownSubjects: readonly string[] };
  loyalty: string;
  up: Reason[];
  down: Reason[];
  pays: string;
  comes: string;
  buttons: { action: string; locked: string | null }[];
}

/** The subject card (SUBJ-092): kind and ruler, its realm, loyalty and reasons, what it pays and owes, the overlord's buttons. */
export function subjectCard(
  b: SubjectBond,
  realm: { name: string; provinces: number; army: number; treasury: number; ownSubjects: readonly string[] },
  reasons: readonly Reason[],
  pays: { gold: number },
  now: number,
  foldIn: FoldInContext,
): SubjectCard {
  const year = Math.floor(now / 12);
  return {
    frame: "lord",
    name: realm.name,
    kind: b.kind.charAt(0).toUpperCase() + b.kind.slice(1),
    icon: kindIcon(b.kind),
    ruler: rulerLine(ruler1444(b.subject), year),
    facts: { provinces: realm.provinces, army: realm.army, treasury: realm.treasury, ownSubjects: realm.ownSubjects },
    loyalty: stepName(b.loyalty),
    up: reasons.filter((r) => r.arrow > 0),
    down: reasons.filter((r) => r.arrow < 0),
    pays: `Pays ${Math.round(pays.gold)} gold (${b.tribute})`,
    comes: COMES[warAnswer(b)] ?? "",
    buttons: cardButtons(b.overlord, b, now, foldIn),
  };
}

// ---------------------------------------------------------------------------
// The subjects lens and opening a card from the map (SUBJ-095, SUBJ-096, SUBJ-138)
// ---------------------------------------------------------------------------

const LENS_COLOUR: Record<string, string> = { loyal: "green", wavering: "amber", disloyal: "red", in_revolt: "red" };

/** The subjects lens: the player's subjects by loyalty, and a line from each courting realm's capital to the subject it courts. */
export function subjectsLens(
  player: string,
  bonds: readonly SubjectBond[],
  courting: readonly { by: string; target: string }[],
  capitalOf: (realm: string) => string,
): { colours: Map<string, string>; lines: { from: string; to: string }[] } {
  const mine = bonds.filter((b) => b.overlord === player);
  const ids = new Set(mine.map((b) => b.subject));
  return {
    colours: new Map(mine.map((b) => [b.subject, LENS_COLOUR[b.loyalty]!])),
    lines: courting.filter((c) => ids.has(c.target)).map((c) => ({ from: capitalOf(c.by), to: c.target })),
  };
}

/** How each input opens a realm's card from the map: a long-press on touch, the card button on a controller. */
export const OPENS_CARD: Record<"touch" | "controller" | "mouse", string> = { touch: "long-press", controller: "card button", mouse: "right click" };

/** Whether a gesture with this input opens the card of the realm under it. */
export function opensCard(input: "touch" | "controller" | "mouse", gesture: "long-press" | "tap" | "card button" | "right click"): boolean {
  return OPENS_CARD[input] === gesture;
}
