import { monthsBetween } from "./dates.ts";
import { config } from "./rules.ts";
import { alliesOf, enemiesOf, hasFact, overlord, stance } from "./relations.ts";
import { borders, country, neighbours, notorietyPoints, oathsBroken, standing, strength, type Ask, type Count, type Diplomacy, type Reason } from "./model.ts";

/**
 * The reasons count (diplomacy 5): the asked country lists named reasons with
 * numbers; over zero is yes. The AI uses exactly the same count (DIPL-177, 181).
 */

const R = config.reasons;
const A = config.actions;

/** Divides toward zero (D-DIPL-15: +10 ÷ 4 is +2, −10 ÷ 4 is −2). */
export const quarter = (n: number, by: number) => Math.trunc(n / by);

export function baseOf(ask: Ask): number {
  switch (ask.action) {
    case "propose_alliance": return A.propose_alliance.base;
    case "arrange_marriage": return A.arrange_marriage.base;
    case "demand": return A.demand.base;
    case "ask_passage": return A.ask_passage.base;
    case "trade_pact": return A.trade_pact.base;
    case "swear_peace": return A.swear_peace.base;
    case "offer_overlordship": return A.offer_overlordship.base;
    case "ask_protection": return A.ask_protection.base;
    case "call_to_arms": return ask.callKind === "offensive" ? A.call_to_arms.offensive.base : A.call_to_arms.defensive.base;
    default: return 0;
  }
}

const sameFaith = (d: Diplomacy, a: string, b: string) => !!country(d, a).faith && country(d, a).faith === country(d, b).faith;

/** The envoy's own reason: type bonus plus years served (DIPL-051, DIPL-052). */
export function envoyReason(type: string, years: number, action: string, faithShared: boolean): number {
  const t = config.envoys.official_type_bonus[typeKey(type)];
  let n = 0;
  if (t && t.reason && (t.actions.includes(action) || t.actions.includes("*")) && (!t.only_if || (t.only_if === "same_faith" && faithShared))) n += t.reason;
  if (years >= config.envoys.years_served_bonus.at_years) n += config.envoys.years_served_bonus.reason;
  return n;
}

export const typeKey = (t: string) => t.toLowerCase().replace(/ /g, "_");

/** Gold a gift counts as: Steward or Tax collector carrying it, a very high negotiator receiving it (DIPL-051, DIPL-177). */
export function giftCounts(d: Diplomacy, gold: number, envoyType: string | undefined, receiver: string): number {
  let g = gold;
  const t = envoyType ? config.envoys.official_type_bonus[typeKey(envoyType)] : undefined;
  if (t?.gift_multiplier) g *= t.gift_multiplier;
  if (country(d, receiver).negotiation === "very_high") g *= config.ai.negotiation.very_high_gift_multiplier!;
  return g;
}

/** Full multiples of b in a (0 when b is 0 or a is not larger). */
export function multiples(a: number, b: number): number {
  return b > 0 ? Math.floor(a / b) : 0;
}

function personality(d: Diplomacy, ask: Ask): Reason[] {
  const asked = country(d, ask.asked);
  const p = config.ai.posture[asked.posture] ?? {};
  const out: Reason[] = [];
  const row = (name: string, n: number) => out.push({ name, number: n, kind: "posture" });
  const stronger = strength(d, ask.asker) > strength(d, ask.asked);
  const label = asked.posture.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
  switch (asked.posture) {
    case "bandwagoner":
      if (ask.action === "propose_alliance" && stronger) row(`${label}: alliance with a stronger`, Number(p.alliance_with_stronger));
      break;
    case "opportunist":
      if (ask.action === "call_to_arms") {
        const enemy = ask.callTarget ? strength(d, ask.callTarget) : 0;
        if (ask.callKind === "defensive" && enemy > strength(d, ask.asker)) row(`${label}: the enemy is stronger`, Number(p.defensive_call_vs_stronger));
        else if (strength(d, ask.asker) > enemy) row(`${label}: the stronger side`, Number(p.join_war_on_stronger_side));
      }
      break;
    case "isolationist":
      if (typeof p[ask.action] === "number") row(`${label}`, Number(p[ask.action]));
      break;
    case "balancer":
      if (ask.action === "propose_alliance") {
        const ns = neighbours(d, ask.asked);
        const strongest = ns.sort((x, y) => strength(d, y) - strength(d, x))[0];
        if (strongest && (enemiesOf(d.graph, ask.asker).includes(strongest) || ["rival", "hostile"].includes(stance(d.graph, ask.asker, strongest)))) {
          row(`${label}: against our strongest neighbour`, Number(p.alliance_vs_strongest_neighbour));
        }
      }
      break;
    case "client_seeker":
      if (ask.action === "offer_overlordship" && stronger && standing(d, ask.asked, ask.asker) >= 30) row(`${label}: a stronger, warm protector`, Number(p.offer_overlordship_from_stronger_warm));
      break;
    case "hegemon_seeker":
      if (ask.action === "propose_alliance") row(`${label}: alliance with a stronger`, stronger ? Number(p.alliance_with_stronger) : 0);
      break;
  }
  // DIPL-084: personality rows stay within -30..+30.
  return out.map((r) => ({ ...r, number: Math.max(-30, Math.min(30, r.number)) }));
}

function negotiation(d: Diplomacy, ask: Ask): Reason[] {
  if (ask.action === "demand") return [];
  const level = country(d, ask.asked).negotiation;
  const n = config.ai.negotiation[level] ?? 0;
  return level === "unknown" ? [] : [{ name: `Negotiation ${level.replace(/_/g, " ")}`, number: n, kind: "negotiation" }];
}

function traits(d: Diplomacy, ask: Ask): Reason[] {
  const t = country(d, ask.asked).traits;
  const rt = R.ruler_traits;
  const out: Reason[] = [];
  if (t.includes("pious") && sameFaith(d, ask.asker, ask.asked)) out.push({ name: "Pious ruler: same faith", number: rt.pious_same_faith, kind: "trait" });
  if (t.includes("warlike") && ask.action === "swear_peace") out.push({ name: "Warlike ruler", number: rt.warlike_vs_swear_peace, kind: "trait" });
  if (t.includes("greedy") && (ask.gift ?? 0) > 0) out.push({ name: "Greedy ruler: a gift", number: rt.greedy_with_gift, kind: "trait" });
  return out;
}

/** Days an envoy needs from a to b, when known. */
export type DaysFn = (from: string, to: string) => number | undefined;

/** Reasons in every count (DIPL-084 … DIPL-092). */
function common(d: Diplomacy, ask: Ask, days?: DaysFn): Reason[] {
  const out: Reason[] = [];
  const { asker, asked } = ask;
  out.push({ name: "Standing / 4", number: quarter(standing(d, asked, asker), R.standing_divisor) });
  if (R.relies_on_word.includes(ask.action)) {
    const per = country(d, asked).posture === "opportunist" ? Number(config.ai.posture.opportunist!.own_view_per_oath_broken) : R.per_oath_broken;
    const n = oathsBroken(d, asker);
    if (n > 0) out.push({ name: "Oaths broken", number: per * n });
  }
  if (ask.envoy) {
    const n = envoyReason(ask.envoy.type, ask.envoy.years, ask.action, sameFaith(d, asker, asked));
    out.push({ name: `Envoy: ${ask.envoy.type}`, number: n, kind: "envoy" });
  }
  const res = d.envoys.find((e) => e.status === "resident" && e.country === asker && e.target === asked);
  if (res?.residentSince) {
    const years = monthsBetween(res.residentSince, d.date) / 12;
    if (years >= config.envoys.resident_years_bonus.at_years) out.push({ name: "Resident for 5 years", number: config.envoys.resident_years_bonus.reason });
  }
  out.push(...personality(d, ask), ...negotiation(d, ask), ...traits(d, ask));
  const st = R.strength;
  if (st.binding_asks.includes(ask.action)) {
    const sa = strength(d, asker), sb = strength(d, asked);
    if (sa > sb) out.push({ name: "You are stronger than us", number: Math.min(st.you_are_stronger_per_multiple * multiples(sa, sb), st.you_are_stronger_max) });
    else if (sb > sa) out.push({ name: "We are stronger than you", number: Math.max(st.we_are_stronger_per_multiple * multiples(sb, sa), st.we_are_stronger_max) });
    if (enemiesOf(d.graph, asked).length > 0) {
      const against = ask.against ?? enemiesOf(d.graph, asker);
      const same = enemiesOf(d.graph, asked).every((e) => against.includes(e));
      out.push({ name: "We are already at war", number: same ? 0 : st.already_at_war_new_commitment });
    }
  }
  if (!borders(d, asker, asked) && !((near) => neighbours(d, asker).some((n) => near.has(n)))(new Set(neighbours(d, asked)))) {
    out.push({ name: "Too far to matter", number: R.distance.no_shared_border_or_neighbour });
    const n = days?.(asker, asked);
    if (n !== undefined && n > R.distance.envoy_days_over.days) out.push({ name: "Very far", number: R.distance.envoy_days_over.reason });
  }
  const shared = enemiesOf(d.graph, asker).filter((e) => enemiesOf(d.graph, asked).includes(e));
  if (shared.length) out.push({ name: `We share an enemy (${shared.join(", ")})`, number: R.share_an_enemy });
  const frontier = d.taken.filter((t) => t.by === asker && d.provinces[t.province]?.borders.includes(asked)).length;
  if (frontier) out.push({ name: "You threaten our frontier", number: R.frontier_threat_per_province * frontier });
  out.push(...notorietyReasons(d, ask.action, asker, asked));
  const allies = alliesOf(d.graph, asked).length;
  out.push({ name: "We already have allies", number: Math.min(0, R.allies_beyond_free.per_extra * (allies - R.allies_beyond_free.free)) });
  for (const row of d.revolutionRows) {
    if (row.country === asker && country(d, asked).form === row.againstForm && (!row.until || d.date < row.until)) out.push({ name: row.name, number: row.number });
  }
  return out;
}

/** The asks in which the asked country counts the asker's notoriety against it (DIPL-223). */
export const NOTORIETY_ASKS = ["propose_alliance", "arrange_marriage", "pledge_protection"];

/**
 * DIPL-223: -1 per 5 of the asker's notoriety in an alliance, marriage or
 * pledge count made with it; and, when pledging protection to a country, +1 per
 * 5 of the notoriety of its most notorious neighbour (the one it needs
 * protecting from). `asker` pledges to `asked` for a pledge.
 */
export function notorietyReasons(d: Diplomacy, action: string, asker: string, asked: string): Reason[] {
  if (!NOTORIETY_ASKS.includes(action)) return [];
  const out: Reason[] = [];
  const own = notorietyPoints(d, action === "pledge_protection" ? asked : asker);
  if (own > 0) out.push({ name: "Notoriety", number: -own });
  if (action === "pledge_protection") {
    let worst = 0;
    for (const n of neighbours(d, asked)) if (n !== asker) worst = Math.max(worst, notorietyPoints(d, n));
    if (worst > 0) out.push({ name: "A notorious neighbour", number: worst });
  }
  return out;
}

/** Strength reasons of a demand (DIPL-087). */
export function demandStrength(d: Diplomacy, asker: string, asked: string): Reason[] {
  const st = R.strength;
  const m = multiples(strength(d, asker), strength(d, asked));
  const cannot = Math.min(st.cannot_beat_you_per_multiple_beyond_1 * Math.max(0, m - 1), st.cannot_beat_you_max);
  const friends = alliesOf(d.graph, asked).length > 0 || d.graph.facts.some((f) => f.fact === "protection_pledge" && f.target === asked);
  return [
    { name: "We cannot beat you", number: cannot, own: true },
    { name: "We have strong friends", number: friends ? cannot * st.strong_friends_factor : 0, own: true },
  ];
}

/** Each action's own reasons, at most two beyond the common ones (DIPL-093). */
function ownReasons(d: Diplomacy, ask: Ask): Reason[] {
  const { asker, asked } = ask;
  switch (ask.action) {
    case "arrange_marriage": {
      const m = A.arrange_marriage;
      const n = d.marriages.filter((x) => [x.a, x.b].sort().join() === [asker, asked].sort().join()).length;
      return [
        { name: "Their house is greater", number: country(d, asker).people > country(d, asked).people ? m.their_house_greater : 0, own: true },
        { name: "A marriage already binds us", number: m.per_existing_marriage * n, own: true },
      ];
    }
    case "demand": {
      const p = ask.province ? d.provinces[ask.province] : undefined;
      const heart = !!p && (p.capital === true || (!!p.culture && p.culture === country(d, asked).culture));
      return [...demandStrength(d, asker, asked), { name: "It's our heartland", number: heart ? A.demand.heartland_province : 0, own: true }];
    }
    case "ask_passage": {
      const t = ask.passageTarget;
      const friend = !!t && (stance(d.graph, asked, t) === "friendly" || alliesOf(d.graph, asked).includes(t));
      const enemy = !!t && enemiesOf(d.graph, asked).includes(t);
      return [
        { name: "You are marching on our friend", number: friend ? A.ask_passage.marching_on_our_friend : 0, own: true },
        { name: "You are marching on our enemy", number: enemy ? A.ask_passage.marching_on_our_enemy : 0, own: true },
      ];
    }
    case "swear_peace": {
      const claim = d.graph.facts.some((f) => (f.fact === "territorial_claim" || f.fact === "dynastic_claim") && f.source === asked && f.target === asker);
      return [
        { name: "We fear you", number: A.swear_peace.we_fear_you_per_multiple * multiples(strength(d, asker), strength(d, asked)), own: true },
        { name: "We want your land", number: claim ? A.swear_peace.we_want_your_land : 0, own: true },
      ];
    }
    case "offer_overlordship": {
      const o = A.offer_overlordship;
      const threats = neighbours(d, asked).filter((n) => n !== asker && (stance(d.graph, n, asked) === "hostile" || hasFact(d.graph, "territorial_claim", n, asked, true) || hasFact(d.graph, "dynastic_claim", n, asked, true))).length;
      return [
        { name: "We need a protector", number: o.need_protector_per_threat * threats, own: true },
        { name: "You already protect us", number: hasFact(d.graph, "protection_pledge", asker, asked, true) ? o.already_pledged : 0, own: true },
        { name: "We are proud", number: o.proud_per_castle_beyond_2 * Math.max(0, country(d, asked).castles - 2), own: true },
      ];
    }
    default:
      return [];
  }
}

/** The count of a call to arms (DIPL-098). */
function callReasons(d: Diplomacy, ask: Ask): Reason[] {
  const c = A.call_to_arms;
  const called = ask.asked, target = ask.callTarget ?? "";
  const out: Reason[] = [];
  const concern = ["rival", "hostile"].includes(stance(d.graph, called, target));
  out.push({ name: "Our ally's war aim is our concern", number: concern ? c.aim_is_our_concern : 0, own: true });
  const elsewhere = enemiesOf(d.graph, called).filter((e) => e !== target);
  out.push({ name: "We are at war already", number: elsewhere.length ? R.strength.already_at_war_new_commitment : 0, own: true });
  const enemy = target ? strength(d, target) : 0;
  out.push({ name: "The enemy is far stronger", number: Math.max(c.enemy_stronger_per_multiple * multiples(enemy, country(d, called).soldiers), c.enemy_stronger_max), own: true });
  if (ask.callKind === "offensive") {
    // D-DIPL-5: the target refused a fair demand, so the asker's allies are readier to come.
    if (d.wars.some((w) => w.declarer === ask.asker && w.target === target && w.provokedBy === target)) out.push({ name: "They refused a fair demand", number: A.demand.on_refusal.our_offensive_call_bonus });
    // D-DIPL-11: +10 between mobilisation pact partners (pacts exist from era VI).
    const pact = config.eras.VI?.pact_offensive_call_bonus;
    if (pact && d.mobilisationPacts.includes([ask.asker, called].sort().join("|"))) out.push({ name: "Our mobilisation pact", number: pact });
  }
  return out;
}

/** Makes the count of an ask; yes only when the total is over zero (DIPL-081). */
export function countAsk(d: Diplomacy, ask: Ask, days?: DaysFn): Count {
  const label = ask.action === "propose_alliance" ? "alliance" : ask.action.replace(/_/g, " ");
  const reasons: Reason[] = [{ name: `Base (${label})`, number: baseOf(ask), own: true, kind: "base" }];
  if (ask.action === "call_to_arms") {
    reasons.push(...callReasons(d, ask));
    reasons.push({ name: "Standing / 4", number: quarter(standing(d, ask.asked, ask.asker), R.standing_divisor) });
    reasons.push(...personality(d, ask), ...negotiation(d, ask));
  } else {
    reasons.push(...common(d, ask, days), ...ownReasons(d, ask));
  }
  const total = reasons.reduce((s, r) => s + r.number, 0);
  return { ask, reasons, total, yes: total > 0 };
}

/** The common rows of the count of joining a league against X (DIPL-158). */
export function leagueCount(d: Diplomacy, c: string, x: string, members: number): Count {
  const L = config.leagues;
  const reasons: Reason[] = [{ name: "Base", number: L.base, own: true }];
  reasons.push({ name: "Standing toward X", number: quarter(standing(d, c, x), L.standing_divisor) });
  const took = d.taken.filter((t) => t.by === x && t.from === c).length;
  reasons.push({ name: "X took our land", number: L.took_our_land_per_province * took });
  reasons.push({ name: "X's Lands taken", number: L.lands_taken_per_province * country(d, x).landsTaken });
  const per = L.could_crush_us_per_multiple[country(d, c).posture];
  const crush = per === undefined ? 0 : Math.max(-30, Math.min(30, per * multiples(strength(d, x), strength(d, c))));
  reasons.push({ name: "X could crush us alone", number: crush, kind: "posture" });
  reasons.push({ name: "Others already in the league", number: L.per_member * members });
  reasons.push({ name: "Same faith as X", number: sameFaith(d, c, x) ? L.same_faith : 0 });
  const total = reasons.reduce((s, r) => s + r.number, 0);
  return { ask: { action: "join_league", asker: x, asked: c }, reasons, total, yes: total > 0 };
}

/**
 * The count an AI makes of joining a league against X (DIPL-158, DIPL-223):
 * the league count's rows and +1 per 5 of X's notoriety, the AI's own weighing
 * of X's name abroad.
 */
export function aiLeagueCount(d: Diplomacy, c: string, x: string, members: number): Count {
  const base = leagueCount(d, c, x, members);
  const reasons: Reason[] = [...base.reasons, { name: "X's notoriety", number: notorietyPoints(d, x) }];
  const total = reasons.reduce((s, r) => s + r.number, 0);
  return { ...base, reasons, total, yes: total > 0 };
}

/** A reason by name (a missing reason reads as 0). */
export function reasonNumber(c: Count, name: string): number {
  return c.reasons.filter((r) => r.name === name || r.name.startsWith(`${name} (`)).reduce((s, r) => s + r.number, 0);
}

export function ownTotal(c: Count): number {
  return c.reasons.filter((r) => r.own).reduce((s, r) => s + r.number, 0);
}

export { overlord };
