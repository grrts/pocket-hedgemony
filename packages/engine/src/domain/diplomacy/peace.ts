/**
 * The AI's peace (DIPL-195, WAR-196): the terms an AI war leader settles for,
 * by one count used between AI realms and toward the player alike. Between AI
 * realms the peace is signed at once; to the player it goes as an offer that
 * waits for an answer (game-shell SHELL-141).
 */
import warfare from "../../../../rules/data/domain/warfare.json" with { type: "json" };
import { monthOf, monthsBetween } from "./dates.ts";
import { country, type Diplomacy } from "./model.ts";
import { aiMustAcceptPeace } from "./relations.ts";

/** take: the AI side takes the land it holds; give: it gives up the land held of it; white: no land changes hands. */
export type PeaceTerms = "take" | "give" | "white";

export interface PeaceCount {
  /** Share of the AI side's peace voices that want peace. */
  ourShare: number;
  /** Share of the other side's. */
  theirShare: number;
  /** Provinces of theirs the AI side holds, and of its own they hold. */
  weHold: number;
  theyHold: number;
  /** Months the war has run. */
  months: number;
}

/**
 * When the other side's people want peace and the AI holds their land, it
 * asks for that land; when its own people want peace and has lost land, it
 * gives that up; when its own people want peace, or the war has run its course,
 * a white peace; otherwise it fights on.
 */
export function aiPeaceTerms(o: PeaceCount): PeaceTerms | null {
  const half = warfare.peace.half;
  if (o.theirShare > half && o.weHold) return "take";
  if (o.ourShare > half && o.theyHold) return "give";
  if (o.ourShare > half || aiMustAcceptPeace(o.months)) return "white";
  return null;
}

export interface PeaceOfferToPlayer {
  from: string;
  to: string;
  terms: PeaceTerms;
}

/**
 * The month's diplomacy for the player's wars: the AI leader of each war
 * against the player counts its peace and, when it would settle, sends the
 * player an offer to answer. `held(a, b)` is how many of b's provinces a holds.
 * An offer already waiting from that realm is kept, its terms brought up to date.
 */
export function aiPeaceOffers(d: Diplomacy, player: string, held: (holder: string, of: string) => number, waiting: PeaceOfferToPlayer[] = []): PeaceOfferToPlayer[] {
  const out = waiting.filter((o) => d.wars.some((w) => (w.declarer === o.from && w.target === player) || (w.target === o.from && w.declarer === player)));
  for (const war of d.wars) {
    if (war.declarer !== player && war.target !== player) continue;
    const ai = war.declarer === player ? war.target : war.declarer;
    const terms = aiPeaceTerms({
      ourShare: country(d, ai).peaceVoicesForPeace,
      theirShare: country(d, player).peaceVoicesForPeace,
      weHold: held(ai, player),
      theyHold: held(player, ai),
      months: monthsBetween(war.start, monthOf(d.date)),
    });
    if (!terms) continue;
    const old = out.find((o) => o.from === ai);
    if (old) old.terms = terms;
    else out.push({ from: ai, to: player, terms });
  }
  return out;
}
