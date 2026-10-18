import { config } from "./rules.ts";
import * as rel from "./relations.ts";
import { borders, country, ledgerOf, neighbours, standingWord, standing, type Ask, type Count, type Diplomacy } from "./model.ts";
import { kindFights } from "../subjects/index.ts";
import { countAsk } from "./reasons.ts";
import { courtView, envoyRoute, envoysAbroad, envoySeats, freeSeats, leagueAgainst, routeDays, subjectKind, warAimsOf } from "./actions.ts";

/**
 * The diplomacy AI (diplomacy 12): the same counts as the player, its posture
 * and negotiation rows added, estimated under the player's limits.
 */

/** Countries an AI considers (DIPL-178). */
export function horizon(d: Diplomacy, c: string): string[] {
  const out = new Set<string>();
  for (const n of neighbours(d, c)) {
    out.add(n);
    for (const nn of neighbours(d, n)) out.add(nn);
  }
  for (const r of d.graph.relations) if (r.source === c || r.target === c) out.add(r.source === c ? r.target : r.source);
  for (const f of d.graph.facts) if (f.source === c || f.target === c) out.add(f.source === c ? f.target : f.source);
  for (const r of d.graph.relations) {
    if (r.type !== "rival" || (r.source !== c && !(r.direction === "mutual" && r.target === c))) continue;
    const rival = r.source === c ? r.target : r.source;
    for (const e of rel.enemiesOf(d.graph, rival)) out.add(e);
  }
  out.delete(c);
  return [...out];
}

/** An estimate of another's count under the player's limits: without a resident, strength is not known exactly (DIPL-179). */
export function estimateCount(d: Diplomacy, ask: Ask): { count: Count; soldiers: "exact" | "estimate" } {
  return { count: countAsk(d, ask), soldiers: courtView(d, ask.asker, ask.asked).soldiers };
}

const CANDIDATE_ACTIONS = ["propose_alliance", "trade_pact", "swear_peace"];

export interface Candidate {
  action: string;
  target: string;
  estimate: number;
}

/** At most 5 candidates per free seat, within the horizon (DIPL-178). */
export function aiCandidates(d: Diplomacy, c: string): Candidate[] {
  const out: Candidate[] = [];
  for (const t of horizon(d, c)) {
    for (const action of CANDIDATE_ACTIONS) {
      if (rel.has(d.graph, "at_war", c, t)) continue;
      if (action === "propose_alliance" && (rel.has(d.graph, "alliance", c, t) || rel.overlord(d.graph, c) === t || rel.overlord(d.graph, t) === c)) continue;
      if (action === "propose_alliance" && [rel.stance(d.graph, c, t), rel.stance(d.graph, t, c)].includes("hostile")) continue;
      if (action === "trade_pact" && rel.hasFact(d.graph, "trade_agreement", c, t)) continue;
      if (action === "swear_peace" && rel.stateOf(d.graph, c, t)) continue;
      out.push({ action, target: t, estimate: estimateCount(d, { action, asker: c, asked: t }).count.total });
    }
  }
  out.sort((a, b) => b.estimate - a.estimate || a.target.localeCompare(b.target) || a.action.localeCompare(b.action));
  return out.slice(0, config.ai.candidates_per_free_seat * Math.max(0, freeSeats(d, c)));
}

export type AiChoice = "send" | "gift_first" | "nothing";

/** Sends the best over-zero request, a gift first on a close no, or nothing (DIPL-179). */
export function aiChoose(bestEstimate: number): AiChoice {
  if (bestEstimate > 0) return "send";
  if (bestEstimate >= config.ai.gift_first_if_total_at_least) return "gift_first";
  return "nothing";
}

/** Tries a fitting demand before war unless an Opportunist whose target's armies are away (DIPL-180). */
export function aiWarPlan(d: Diplomacy, a: string, b: string): "demand_first" | "declare" {
  const fits = new Set(Object.values(config.actions.demand.kinds).map((k) => k.grants_aim));
  const hasFit = warAimsOf(d, a, b).some((x) => fits.has(x.aim));
  if (!hasFit) return "declare";
  if (country(d, a).posture === "opportunist" && country(d, b).armiesAway) return "declare";
  return "demand_first";
}

/** Rivals an Opportunist or Hegemon seeker may fund: a revolution card with a sign lit (DIPL-182, D-DIPL-23). */
export function aiFundingTargets(d: Diplomacy, c: string): string[] {
  const k = country(d, c);
  const p = config.ai.posture[k.posture] ?? {};
  if (!p.funds_rebels_if_grievances_at_least || freeSeats(d, c) <= 0 || !k.goldToSpare) return [];
  return Object.values(d.countries)
    .filter((t) => t.id !== c && rel.stance(d.graph, c, t.id) === "rival" && t.revolutionSigns >= config.actions.fund_rebels.needs_revolution_signs)
    .map((t) => t.id);
}

// ---------------------------------------------------------------- screen

/** The diplomacy lens colour of a country for a viewer (DIPL-183). */
export function lensColour(d: Diplomacy, viewer: string, c: string): string {
  if (c === viewer || rel.overlord(d.graph, c) === viewer) return "own";
  if (rel.has(d.graph, "at_war", viewer, c)) return "red, hatched";
  if (rel.has(d.graph, "alliance", viewer, c)) return "blue";
  if (rel.hasFact(d.graph, "protection_pledge", viewer, c) ) return "light blue";
  const s = rel.stance(d.graph, viewer, c), back = rel.stance(d.graph, c, viewer);
  if (s === "hostile" || back === "hostile") return "red";
  if (s === "rival" || back === "rival") return "orange";
  if (!d.ledgers[`${c}>${viewer}`] && rel.relationsBetween(d.graph, viewer, c).length === 0 && d.standingOverride[`${c}>${viewer}`] === undefined) return "grey";
  const word = standingWord(standing(d, c, viewer));
  return { Close: "green", Warm: "pale green", Cool: "grey", Cold: "orange", Bitter: "red" }[word] ?? "grey";
}

/** Members of a league against the viewer get a red border (DIPL-183). */
export function lensBorder(d: Diplomacy, viewer: string, c: string): string | null {
  return leagueAgainst(d, viewer)?.members.includes(c) ? "red" : null;
}

/** The envoys strip (DIPL-188). */
export function envoysStrip(d: Diplomacy, c: string): string[] {
  const abroad = envoysAbroad(d, c).sort((a, b) => Number(a.status === "resident") - Number(b.status === "resident"));
  const out = abroad.map((e) => (e.status === "resident" ? `resident ${e.target}` : e.status === "road" ? `${e.target} ${Math.max(0, Math.round((Date.parse(e.arrival) - Date.parse(d.date)) / 86400000))} days` : `${e.target} ${e.status}`));
  for (let i = abroad.length; i < envoySeats(d, c); i++) out.unshift("free");
  return out;
}

/** The country card diplomacy line (DIPL-080). */
export function cardLine(d: Diplomacy, c: string): string[] {
  const leagues = d.leagues.filter((l) => l.target === c).length;
  return [
    `Allies ${rel.alliesOf(d.graph, c).length}`,
    `Enemies ${rel.enemiesOf(d.graph, c).length}`,
    `Oaths broken ${country(d, c).oaths.length}`,
    `Envoys ${envoysAbroad(d, c).length} of ${envoySeats(d, c)} abroad`,
    `Leagues against you ${leagues}`,
  ];
}

/** What X sees of a league against it (DIPL-162). */
export function leagueCard(d: Diplomacy, x: string): { name: string; members: { id: string; soldiers: number }[] } | null {
  const l = leagueAgainst(d, x);
  return l ? { name: `League against ${x}`, members: l.members.map((m) => ({ id: m, soldiers: country(d, m).soldiers })) } : null;
}

export { envoyRoute, routeDays };

// ---------------------------------------------------------------- war declaration sheet

export interface DeclarationSheet {
  target: string;
  aim: string;
  source: string;
  sides: { country: string; side: string; how: string; soldiers: number }[];
  peaceVoices: number;
  answersArrive: string;
  choices: string[];
}

/** The war declaration sheet (DIPL-189, D-DIPL-33): it never shows how the called will answer. */
export function declarationSheet(d: Diplomacy, a: string, b: string, aim: string): DeclarationSheet {
  const held = warAimsOf(d, a, b).find((x) => x.aim === aim);
  const sides: DeclarationSheet["sides"] = [];
  const row = (c: string, side: string, how: string) => sides.push({ country: c, side, how, soldiers: country(d, c).soldiers });
  for (const x of rel.alliesOf(d.graph, a)) row(x, a, "called");
  for (const x of rel.alliesOf(d.graph, b)) row(x, b, "called");
  for (const f of d.graph.facts) if (f.fact === "protection_pledge" && f.target === b) row(f.source, b, "called");
  for (const [side, enemy] of [[a, b], [b, a]] as const) {
    for (const s of rel.subjectsOf(d.graph, side)) {
      const kind = subjectKind(d, s);
      const fights = kindFights(kind);
      const joins = fights === "always_if_loyal_or_wavering" || (fights === "own_frontier_only" && borders(d, s, enemy));
      const how = joins ? "joins" : fights === "when_called_by_loyalty" ? "called" : "does not join";
      row(s, side, `${kind}, ${how}`);
    }
  }
  const name = (id: string) => ({ take_land: "Take land", no_aim: "No aim" } as Record<string, string>)[id] ?? id;
  return {
    target: b,
    aim: held?.province ? `${name(aim)} — ${held.province}` : name(aim),
    source: held?.source ?? "",
    sides,
    peaceVoices: country(d, a).peaceVoicesForPeace,
    answersArrive: "a month later",
    choices: ["Send a demand first", "Declare"],
  };
}

/** The lens at a zoom (DIPL-184): world shows colours only; regional adds envoy riders and crossed swords. */
export function lensMarks(d: Diplomacy, viewer: string, zoom: "world" | "regional"): string[] {
  if (zoom === "world") return [];
  const out: string[] = [];
  for (const e of d.envoys) if (e.country === viewer && e.status === "road") out.push(`envoy rider to ${e.target}`, `dotted route to ${e.target}`);
  for (const x of new Set(d.aims.filter((x) => x.holder === viewer).map((x) => x.target))) out.push(`crossed sword over ${x}`);
  return out;
}

/** The country diplomacy card (DIPL-185): numbers of standing, never a prediction. */
export function diplomacyCard(d: Diplomacy, viewer: string, c: string): { toward: string; from: string; entries: { name: string; weight: number }[]; status: string; aims: string; lastAnswer?: string; buttons: { label: string; prediction?: string }[] } {
  const towardN = standing(d, c, viewer);
  const status = [rel.enemiesOf(d.graph, c).length ? `at war with ${rel.enemiesOf(d.graph, c).join(", ")}` : "", rel.alliesOf(d.graph, c).length ? `allied with ${rel.alliesOf(d.graph, c).join(", ")}` : ""].filter(Boolean).join(" · ");
  const aims = warAimsOf(d, viewer, c).filter((x) => x.aim !== "raid" && x.aim !== "no_aim");
  const last = [...d.letters].reverse().find((l) => l.to === viewer && l.from === c && l.answer !== "done");
  const out: ReturnType<typeof diplomacyCard> = {
    toward: `${standingWord(towardN)} (${towardN >= 0 ? "+" : ""}${towardN})`,
    from: standingWord(standing(d, viewer, c)),
    entries: ledgerOf(d, c, viewer).map((e) => ({ name: e.key === "same_faith" && country(d, c).faith ? `${e.name} (${country(d, c).faith!.replace(/^./, (x) => x.toUpperCase())})` : e.name, weight: e.weight })),
    status,
    aims: aims.length ? aims.map((x) => x.aim).join(", ") : "none",
    buttons: ["Alliance", "Marriage", "Trade pact", "Gift", "Demand"].map((label) => ({ label })),
  };
  if (last) out.lastAnswer = `${last.action}, ${last.answer.toUpperCase()} (${last.total ?? 0})`;
  return out;
}

/** The envoy picker (DIPL-186): each free official, his days on the road and the province he leaves. */
export function envoyPicker(d: Diplomacy, c: string, target: string): { official: string; days: number; leaves: string | undefined }[] {
  const busy = new Set(envoysAbroad(d, c).map((e) => e.person));
  const days = routeDays(envoyRoute(d, c, target).legs);
  return country(d, c).officials.filter((o) => !busy.has(o.name)).map((o) => ({ official: o.name, days, leaves: o.province }));
}

/** Where the card sits (DIPL-187). */
export const cardPlacement = (orientation: "portrait" | "landscape") => (orientation === "landscape" ? "right of the map" : "over the map");
