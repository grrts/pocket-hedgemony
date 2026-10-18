import config from "../../../../rules/data/domain/religion.json" with { type: "json" };

/**
 * Heads of the faith (religion §5.17, RELG-139 to RELG-156): who leads each
 * faith, how a realm becomes the head's patron, the conclave, censure and the
 * Orthodox way out. Pure rules on plain values; the engine's faithHeads.ts
 * maps the world onto them. No meter: every effect is a tie, a wrong, a
 * preacher, a lord's step, a war aim, a call to arms or an oath broken.
 */

export type HeadWay = "chosen" | "held" | "claimed";

export interface Head {
  id: string;
  name: string;
  faith: string;
  /** The holy place the head sits at. */
  seat: string;
  way: HeadWay;
  /** Year the head first exists (the Dalai Lama, 1578). */
  from?: number;
  /** The realm that rules the seat for a chosen head (the Papal States). */
  seatRealm?: string;
  /** The event whose chooser becomes the first patron. */
  createdByEvent?: string;
}

export const FH = config.faith_heads;

type HeadRow = { id: string; name: string; faith: string; seat: string; way: string; from?: number; seat_realm?: string; created_by_event?: string };
const HEADS: Head[] = (FH.heads as HeadRow[]).map((h) => ({
  id: h.id,
  name: h.name,
  faith: h.faith,
  seat: h.seat,
  way: h.way as HeadWay,
  ...(h.from !== undefined ? { from: h.from } : {}),
  ...(h.seat_realm ? { seatRealm: h.seat_realm } : {}),
  ...(h.created_by_event ? { createdByEvent: h.created_by_event } : {}),
}));

/** Every head of a faith (RELG-139). */
export function heads(): Head[] {
  return HEADS;
}

export function headById(id: string): Head | undefined {
  return HEADS.find((h) => h.id === id);
}

/** The head of a faith, or null for a crown-headed church or a faith with no head (RELG-139). */
export function headOf(faith: string): Head | null {
  return HEADS.find((h) => h.faith === faith) ?? null;
}

/** The crown heads its church: anglican, protestant, and an Orthodox realm that raised its own patriarch (RELG-139, RELG-152). */
export function crownHeaded(faith: string, ownPatriarch = false): boolean {
  return (FH.crown_headed as string[]).includes(faith) || (ownPatriarch && faith === "orthodox");
}

/** Why a faith has no head of its own, for the card's one line (RELG-135). */
export function noHeadReason(faith: string): string {
  const r = FH.no_head_reasons as Record<string, string>;
  return r[faith] ?? r.default!;
}

/** How a faith is led, in a word. */
export function leadership(faith: string, ownPatriarch = false): "head" | "crown" | "none" {
  if (crownHeaded(faith, ownPatriarch)) return "crown";
  return headOf(faith) ? "head" : "none";
}

/** A head exists in this year (the Dalai Lama from 1578, RELG-154). */
export function exists(h: Head, year: number): boolean {
  return year >= (h.from ?? 0);
}

// ---------------------------------------------------------------- held seats

/** The patron of a held seat: its owner's overlord if it has one, else the owner (RELG-140, RELG-143). */
export function seatPatron(owner: string | null, overlord: string | null): string | null {
  if (!owner) return null;
  return overlord ?? owner;
}

/** What a realm taking a seat leaves with the head's faith: Seized the seat from a fellow believer, Freed the seat from another faith (RELG-144). */
export function seatTaken(headFaith: string, loserFaith: string): { kind: "wrongs" | "ties"; key: "seized" | "freed"; name: string; weight: number; fadeYears: number } {
  const r = loserFaith === headFaith ? FH.seized : FH.freed;
  return { kind: loserFaith === headFaith ? "wrongs" : "ties", key: loserFaith === headFaith ? "seized" : "freed", name: r.name, weight: r.weight, fadeYears: r.fade_years };
}

/** What a patron gets (RELG-145, RELG-146): of the head's faith, the tie with every realm of it and a preacher; of another faith, only its communities served. */
export function patronGets(patronFaith: string, h: Head): { tie: number; preachers: number; servesCommunities: boolean } {
  if (patronFaith === h.faith) return { tie: FH.patron.tie, preachers: FH.patron.preachers, servesCommunities: false };
  return { tie: 0, preachers: 0, servesCommunities: true };
}

/** The patron's tie's name: "The Pope favours us". */
export const favourName = (h: Head): string => cap(FH.patron.tie_name.replace("{head}", h.name));

// ---------------------------------------------------------------- the caliphate

/** Claim the caliphate is open to a Sunni realm that holds Mecca and Medina, directly or as overlord, while no ruler is Caliph (RELG-141). */
export function whyNotClaimCaliphate(o: { faith: string; holdsSeat: boolean; caliph: string | null; self: string }): string | null {
  if (o.faith !== "sunni") return "only a Sunni ruler may claim it";
  if (o.caliph === o.self) return "you are the Caliph";
  if (o.caliph) return "another ruler is Caliph";
  if (!o.holdsSeat) return "you must hold Mecca and Medina, yourself or as overlord";
  return null;
}

// ---------------------------------------------------------------- the conclave

/** Gold votes a realm's gold buys: one per gold_per_vote, at most as many as its cardinals (RELG-142). */
export function goldVotes(cardinals: number, gold: number): number {
  const c = FH.conclave;
  return Math.min(Math.floor(gold / c.gold_per_vote), Math.floor(cardinals * c.gold_votes_max_share_of_cardinals));
}

export interface ConclaveEntry {
  realm: string;
  cardinals: number;
  gold: number;
}

export interface ConclaveResult {
  /** Votes per realm, Rome's included under "rome". */
  votes: Record<string, number>;
  /** The realm that becomes the Pope's patron, or null when Rome wins or ties (an Italian Pope). */
  patron: string | null;
}

/** The count when a conclave closes (RELG-142): the realm with the most votes is the patron; Rome winning or tying means no patron, and so does a tie between realms. */
export function conclaveResult(entries: ConclaveEntry[]): ConclaveResult {
  const votes: Record<string, number> = { rome: FH.conclave.rome_votes };
  for (const e of entries) votes[e.realm] = e.cardinals * FH.conclave.cardinals_per_house_step3 + goldVotes(e.cardinals, e.gold);
  const realms = entries.map((e) => e.realm).sort((a, b) => votes[b]! - votes[a]!);
  const best = realms[0];
  if (!best) return { votes, patron: null };
  const top = votes[best]!;
  const tied = realms.filter((r) => votes[r] === top).length > 1;
  return { votes, patron: top > votes.rome! && !tied ? best : null };
}

/** The least gold a realm must send to win a conclave against the others as they stand, or null when no gold can win it. */
export function goldToWin(entries: ConclaveEntry[], realm: string): number | null {
  const me = entries.find((e) => e.realm === realm);
  if (!me) return null;
  const step = FH.conclave.gold_per_vote;
  const most = Math.floor(me.cardinals * FH.conclave.gold_votes_max_share_of_cardinals);
  for (let k = goldVotes(me.cardinals, me.gold); k <= most; k++) {
    const gold = k * step;
    if (conclaveResult(entries.map((e) => (e.realm === realm ? { ...e, gold: Math.max(e.gold, gold) } : e))).patron === realm) return Math.max(0, gold - me.gold);
  }
  return null;
}

// ---------------------------------------------------------------- censure

/** The head who censures a war, or null (RELG-149): same faith on both sides, an aim for gain, a faith with a head and no crown-headed church on the attacker's side. */
export function censuringHead(o: { attackerFaith: string; targetFaith: string; aim: string; attackerOwnPatriarch?: boolean }): Head | null {
  if (o.attackerFaith !== o.targetFaith) return null;
  if (!(FH.censure.aims as string[]).includes(o.aim)) return null;
  if (crownHeaded(o.attackerFaith, o.attackerOwnPatriarch)) return null;
  return headOf(o.attackerFaith);
}

/** The censure's wrong's name: "Censured by the Pope". */
export const censureName = (h: Head): string => FH.censure.name.replace("{head}", h.name);

/** A censure ends at once when the peace gives back every province taken in its war (RELG-151); otherwise it lasts until its wrong has faded. */
export function censureEndsAtPeace(provincesKept: number): boolean {
  return provincesKept === 0;
}

// ---------------------------------------------------------------- the Orthodox way out

/** Raise our own patriarch (RELG-152): once, Orthodox, the step-4 house in the capital, Constantinople under another faith, the gold. */
export function whyNotOwnPatriarch(o: { faith: string; raised: boolean; capitalHouse: boolean; constantinopleFaith: string | null; gold: number; cost: number }): string | null {
  if (o.faith !== "orthodox") return "only an Orthodox realm may raise its own patriarch";
  if (o.raised) return "your church already has its own patriarch";
  if (o.constantinopleFaith === null || o.constantinopleFaith === "orthodox") return "Constantinople must be held by a ruler of another faith";
  if (!o.capitalHouse) return "needs a great Orthodox house of worship in your capital";
  if (o.gold < o.cost) return "not enough gold";
  return null;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
