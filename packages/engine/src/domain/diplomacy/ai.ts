import { config } from "./rules.ts";
import * as rel from "./relations.ts";
import { country, neighbours, standingWord, standing, type Ask, type Count, type Diplomacy } from "./model.ts";
import { countAsk } from "./reasons.ts";
import { courtView, envoyRoute, envoysAbroad, envoySeats, freeSeats, leagueAgainst, routeDays, warAimsOf } from "./actions.ts";

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

/** Provinces of rivals an Opportunist or Hegemon seeker may fund (DIPL-182). */
export function aiFundingTargets(d: Diplomacy, c: string): string[] {
  const k = country(d, c);
  const p = config.ai.posture[k.posture] ?? {};
  const min = p.funds_rebels_if_grievances_at_least;
  if (typeof min !== "number" || freeSeats(d, c) <= 0 || !k.goldToSpare) return [];
  return Object.values(d.provinces)
    .filter((pr) => rel.stance(d.graph, c, pr.owner) === "rival" && pr.grievances.length >= min)
    .map((pr) => pr.id);
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
