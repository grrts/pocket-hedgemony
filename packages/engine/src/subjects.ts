import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as subj from "./domain/subjects/index.ts";
import config from "../../rules/data/domain/subjects.json" with { type: "json" };

/**
 * Subjects in the game (milestone 5, SUBJ-005, SUBJ-026 to SUBJ-046,
 * SUBJ-086, SUBJ-091): each subject tie in the diplomacy graph carries its
 * bond (kind, loyalty, tribute level and timed reasons) on the relation
 * record, so saves keep it. Loyalty is counted at the end of every season,
 * what a subject pays follows its kind, its loyalty and the tribute level, and
 * the overlord can set the tribute, send a gift, loosen or release it.
 */

const rel = dip.relations;
type Bond = subj.SubjectBond;

/** Subject reach until the catalogue's administrative capacity is read: moderate, 5 (SUBJ-056, D-SUBJ-26). */
export const REACH = subj.reachFromCapacity("moderate");

/** The game's month count, the bonds' clock. */
export const monthNow = (world: World): number => world.date.year * 12 + world.date.month - 1;

const AUTONOMY = ["very_low", "low", "moderate", "high", "very_high"];

/** Bonds change the ledger; this counter tells the payment cache when. */
const bondSeq = new WeakMap<World, number>();
export const bondsChanged = (world: World): void => void bondSeq.set(world, (bondSeq.get(world) ?? 0) + 1);

/** The bond on a subject relation, made from the 1444 data the first time it is read (SUBJ-036, SUBJ-065). */
function bondOn(world: World, r: dip.RelationRecord): Bond {
  if (r.bond) return r.bond as Bond;
  const g = world.diplomacy.graph;
  const raw = r.subject_kind ?? "vassal";
  const mapped = (subj.KINDS as string[]).includes(raw) ? { kind: raw as subj.Kind, ties: [] as subj.Tie[] } : subj.mapRelationKind(raw, subj.isReligiousHead(r.target));
  const kind = "lord" in mapped ? "vassal" : mapped.kind;
  const ties = "lord" in mapped ? [] : mapped.ties;
  const autonomy = (AUTONOMY.includes(String(r.autonomy)) ? r.autonomy : "moderate") as subj.Autonomy;
  const loyalty = subj.startLoyalty1444(autonomy, rel.stance(g, r.source, r.target) === "hostile");
  const now = monthNow(world);
  const startYear = r.start_date ? Number(String(r.start_date).slice(0, 4)) : NaN;
  const fromData = r.origin !== "game";
  const held = fromData ? subj.heldAtStart(Number.isFinite(startYear) ? String(r.start_date) : null, world.date.year, loyalty === "loyal") : { yearsHeld: 0, yearsLoyal: 0 };
  const b: Bond = {
    ...subj.newBond({ subject: r.source, overlord: r.target, kind, ties, loyalty }, now),
    since: now - held.yearsHeld * 12,
    loyalSince: loyalty === "loyal" ? now - held.yearsLoyal * 12 : null,
  };
  r.bond = b;
  return b;
}

/** Every subject tie with its bond, as realm numbers. */
export function subjectTies(world: World): { s: number; o: number; bond: Bond; r: dip.RelationRecord }[] {
  const out: { s: number; o: number; bond: Bond; r: dip.RelationRecord }[] = [];
  for (const r of world.diplomacy.graph.relations) {
    if (r.type !== "subject") continue;
    const s = world.nationIndex.get(r.source);
    const o = world.nationIndex.get(r.target);
    if (s === undefined || o === undefined || world.nationGone[s] || world.nationGone[o]) continue;
    out.push({ s, o, bond: bondOn(world, r), r });
  }
  return out;
}

/** The bond of realm s with its overlord, or null. */
export function bondOf(world: World, s: number): Bond | null {
  const id = world.nationIds[s];
  const r = world.diplomacy.graph.relations.find((x) => x.type === "subject" && x.source === id);
  return r ? bondOn(world, r) : null;
}

/** Makes a subject tie the game made (a demand, an agreement): it starts Loyal and is held from today. */
export function makeSubject(world: World, s: number, o: number, kind: subj.Kind): void {
  const r = rel.makeSubject(world.diplomacy.graph, world.nationIds[s]!, world.nationIds[o]!, kind);
  r.origin = "game";
  r.bond = subj.newBond({ subject: r.source, overlord: r.target, kind }, monthNow(world));
  bondsChanged(world);
}

/**
 * What each subject pays its overlord a month, as a share (SUBJ-005, SUBJ-026,
 * SUBJ-037): the kind's share times the tribute level times what its loyalty
 * pays. A Vassal pays out of its taxes, every other kind out of its income.
 */
const payCache = new WeakMap<World, { key: string; pays: [number, number, number, boolean][] }>();
export function subjectPayments(world: World): [payer: number, receiver: number, share: number, taxOnly: boolean][] {
  const g = world.diplomacy.graph;
  const key = `${g.relations.length}|${g.seq}|${world.diplomacy.seq}|${bondSeq.get(world) ?? 0}`;
  const hit = payCache.get(world);
  if (hit && hit.key === key) return hit.pays.filter(([a, b]) => !world.nationGone[a] && !world.nationGone[b]);
  const pays: [number, number, number, boolean][] = [];
  for (const { s, o, bond } of subjectTies(world)) {
    const share = subj.baseShare(bond) * subj.tributeMultiplier(bond.tribute) * subj.loyaltyPays(bond.loyalty);
    if (share > 0) pays.push([s, o, share, bond.kind === "vassal"]);
  }
  payCache.set(world, { key, pays });
  return pays;
}

/** What a subject sees of its overlord and the overlord of it this season: the facts the count reads (SUBJ-032 to SUBJ-034). */
function situation(world: World, s: number, o: number, ownSubjects: number, thin: number): subj.SubjectSituation {
  const d = world.diplomacy;
  const g = d.graph;
  const a = world.nationIds[s]!;
  const b = world.nationIds[o]!;
  const cs = dip.country(d, a);
  const co = dip.country(d, b);
  const culture = (id: string) => world.rules.names?.nations[id];
  const stance = rel.stance(g, a, b);
  const theirs = new Set(rel.enemiesOf(g, a));
  return {
    overlordSoldiers: co.soldiers ?? 0,
    subjectSoldiers: cs.soldiers ?? 0,
    ...(culture(a) && culture(b) ? { sameCulture: culture(a) === culture(b) } : {}),
    overlordProvinces: co.provinces ?? 1,
    subjectProvinces: cs.provinces ?? 1,
    stance: stance === "hostile" || stance === "rival" ? stance : null,
    commonEnemy: rel.enemiesOf(g, b).some((x) => theirs.has(x)),
    ownSubjects,
    stretchedThin: thin,
  };
}

/** Each overlord's roster and the *Stretched thin* arrows it gives (SUBJ-057, SUBJ-058). */
function stretched(world: World, ties: ReturnType<typeof subjectTies>): Map<string, number> {
  const out = new Map<string, number>();
  const byOverlord = new Map<number, subj.RosterEntry[]>();
  const own = ownSubjectCounts(ties);
  for (const t of ties) {
    const list = byOverlord.get(t.o) ?? [];
    const ps = world.rules.provinces[world.provinceIndex.get(world.rules.nations[t.s]!.capital) ?? 0];
    const po = world.rules.provinces[world.provinceIndex.get(world.rules.nations[t.o]!.capital) ?? 0];
    list.push({ bond: t.bond, ownSubjects: own.get(t.s) ?? 0, distance: Math.hypot((ps?.x ?? 0) - (po?.x ?? 0), (ps?.y ?? 0) - (po?.y ?? 0)) });
    byOverlord.set(t.o, list);
  }
  for (const roster of byOverlord.values()) for (const [k, v] of subj.stretchedThin(roster, REACH)) out.set(k, v);
  return out;
}

function ownSubjectCounts(ties: ReturnType<typeof subjectTies>): Map<number, number> {
  const own = new Map<number, number>();
  for (const t of ties) own.set(t.o, (own.get(t.o) ?? 0) + 1);
  return own;
}

/** The reasons behind a subject's loyalty now, as its card shows them (SUBJ-029). */
export function reasonsNow(world: World, s: number): subj.Reason[] {
  const ties = subjectTies(world);
  const t = ties.find((x) => x.s === s);
  if (!t) return [];
  const thin = stretched(world, ties).get(t.bond.subject) ?? 0;
  return subj.reasonsOf(t.bond, monthNow(world), situation(world, t.s, t.o, ownSubjectCounts(ties).get(t.s) ?? 0, thin));
}

const STEP_WORD: Record<subj.Step, string> = { loyal: "Loyal", wavering: "Wavering", disloyal: "Disloyal", in_revolt: "In revolt" };

/**
 * The season count (SUBJ-030, SUBJ-031, SUBJ-101): at the end of every third
 * month each subject's arrows move its loyalty a step, and the player hears of
 * its own subjects' and overlord's changes.
 */
export function seasonalSubjects(world: World, news: News[]): void {
  if (!subj.isSeasonEnd(world.date.month)) return;
  const ties = subjectTies(world);
  if (!ties.length) return;
  const now = monthNow(world);
  const thin = stretched(world, ties);
  const own = ownSubjectCounts(ties);
  let changed = false;
  for (const t of ties) {
    const before = t.bond.loyalty;
    const reasons = subj.reasonsOf(t.bond, now, situation(world, t.s, t.o, own.get(t.s) ?? 0, thin.get(t.bond.subject) ?? 0));
    const after = subj.seasonCount(t.bond, subj.arrows(reasons).total, now);
    // Timed reasons that ran out are dropped so saves stay small.
    t.bond.reasons = t.bond.reasons.filter((x) => x.until === undefined || x.until > now);
    if (after === before) continue;
    changed = true;
    if (world.player === t.o || world.player === t.s) {
      const name = (n: number) => world.rules.nations[n]!.name;
      news.push({
        kind: "envoy",
        text: world.player === t.o ? `${name(t.s)}, your subject, is now ${STEP_WORD[after]}${after === "disloyal" ? ": it pays you nothing and refuses your calls" : ""}.` : `You grow ${STEP_WORD[after]} toward ${name(t.o)}, your overlord.`,
        nations: [t.s, t.o],
      });
    }
  }
  if (changed) bondsChanged(world);
}

/** How a subject answers its overlord's call to arms (SUBJ-028, SUBJ-038): a Disloyal one refuses. */
export function subjectAnswersCall(world: World, s: number): boolean {
  const b = bondOf(world, s);
  if (!b) return true;
  const answer = subj.callToWar(b, monthNow(world));
  return answer !== "refuses" && answer !== "not_called" && answer !== "at_war_with_overlord";
}

// ---------------------------------------------------------------- overlord actions

export const TRIBUTE_LEVELS = Object.keys(config.tribute_levels) as subj.TributeLevel[];

/** Gold a gift to subject s costs: six months of its income (SUBJ-039, D-SUBJ-10). */
export function subjectGiftCost(world: World, s: number): number {
  return Math.max(10, Math.round(subj.giftCost(Math.max(0, world.nationMonthlyIncome[s]!))));
}

/** Why overlord n can't take this action on s now, or null (SUBJ-048: a locked button names what is missing). */
export function whyNotSubjectAction(world: World, n: number, s: number, action: string, level?: string): string | null {
  const b = bondOf(world, s);
  if (!b || b.overlord !== world.nationIds[n]) return "not your subject";
  if (action === "tribute") return level && (TRIBUTE_LEVELS as string[]).includes(level) ? (b.tribute === level ? "the tribute is set so already" : null) : "no such tribute";
  if (action === "gift") return world.nationTreasury[n]! < subjectGiftCost(world, s) ? `needs ${subjectGiftCost(world, s)} gold` : null;
  if (action === "loosen") return (config.loosen.order as Partial<Record<subj.Kind, string>>)[b.kind] ? null : `a ${KIND_NAME[b.kind]} cannot be loosened`;
  if (action === "release") return null;
  return "no such action";
}

/** The overlord's action on its subject (SetTribute, SendSubjectGift, Loosen, ReleaseSubject). */
export function subjectAction(world: World, n: number, s: number, action: string, news: News[], level?: string): string | null {
  const why = whyNotSubjectAction(world, n, s, action, level);
  if (why) return why;
  const b = bondOf(world, s)!;
  const now = monthNow(world);
  const name = (k: number) => world.rules.nations[k]!.name;
  if (action === "tribute") subj.setTribute(b, level as subj.TributeLevel);
  if (action === "gift") {
    world.nationTreasury[n] = world.nationTreasury[n]! - subjectGiftCost(world, s);
    world.nationTreasury[s] = world.nationTreasury[s]! + subjectGiftCost(world, s);
    subj.sendGift(b, now);
  }
  if (action === "loosen") {
    subj.loosen(b, now);
    const r = world.diplomacy.graph.relations.find((x) => x.type === "subject" && x.source === b.subject)!;
    r.subject_kind = b.kind;
    news.push({ kind: "envoy", text: `${name(n)} loosens its hold: ${name(s)} is now a tributary.`, nations: [n, s] });
  }
  if (action === "release") {
    rel.releaseSubject(world.diplomacy.graph, b.subject);
    news.push({ kind: "envoy", text: `${name(n)} releases ${name(s)}, which goes free as a friend.`, nations: [n, s] });
  }
  bondsChanged(world);
  return null;
}

/** An agreement counted yes (SUBJ-086): the smaller realm becomes a Tributary, or a Vassal if it asked. */
export function subjectByAgreement(world: World, overlord: number, subject: number, asked: boolean, news: News[]): void {
  if (rel.overlord(world.diplomacy.graph, world.nationIds[subject]!)) return;
  try {
    makeSubject(world, subject, overlord, subj.kindByAgreement(asked));
  } catch {
    return;
  }
  const name = (k: number) => world.rules.nations[k]!.name;
  news.push({ kind: "envoy", text: asked ? `${name(subject)} places itself under ${name(overlord)}'s protection as its vassal.` : `${name(subject)} accepts ${name(overlord)} as its overlord and will pay it tribute.`, nations: [subject, overlord] });
}

/** AI overlords loosen a Disloyal subject while at war elsewhere (SUBJ-098), once a season. */
export function aiOverlords(world: World, news: News[]): void {
  if (!subj.isSeasonEnd(world.date.month)) return;
  for (const t of subjectTies(world)) {
    if (t.o === world.player || t.bond.loyalty !== "disloyal") continue;
    if (!dip.warOf(world.diplomacy, world.nationIds[t.o]!)) continue;
    if (!whyNotSubjectAction(world, t.o, t.s, "loosen")) subjectAction(world, t.o, t.s, "loosen", news);
  }
}

/** Whether an AI overlord has reach for one more Tributary (SUBJ-098). */
export function aiMayTakeSubject(world: World, n: number): boolean {
  const mine = subjectTies(world).filter((t) => t.o === n);
  const used = subj.reachUsed(mine.map((t) => ({ bond: t.bond, ownSubjects: 0, distance: 0 })));
  return subj.aiAcceptsNewSubject(used, REACH, subj.reachWeight({ kind: "tributary", ties: [] }));
}

// ---------------------------------------------------------------- the view

/** One subject as the Diplomacy tab shows it (SUBJ-091, SUBJ-092). */
export interface SubjectView {
  subject: number;
  kind: subj.Kind;
  kindName: string;
  loyalty: string;
  up: number;
  down: number;
  /** Gold it sends a month (what the overlord's ledger counts). */
  pays: number;
  share: number;
  tribute: subj.TributeLevel;
  reasons: { label: string; arrow: number }[];
  worst: string;
  fights: string;
  /** Why each action can't be taken now (null when it can): gift, loosen, release; and the gift's cost. */
  why: { gift: string | null; loosen: string | null; release: string | null };
  giftCost: number;
}

/** The player's subjects and its overlord, for the Diplomacy tab (SUBJ-091, SUBJ-102). */
export interface SubjectsView {
  reach: number;
  used: number;
  /** Gold a month from all subjects. */
  gold: number;
  subjects: SubjectView[];
  /** The player's own bond when it is someone's subject. */
  overlord: (SubjectView & { overlord: number }) | null;
}

const KIND_NAME: Record<subj.Kind, string> = { vassal: "Vassal", tributary: "Tributary", union: "Union", march: "March", colony: "Colony", protectorate: "Protectorate" };
const FIGHTS: Record<string, string> = {
  when_called_by_loyalty: "Comes when called, if Loyal (half, late, if Wavering).",
  never: "Never joins your wars.",
  always_if_loyal_or_wavering: "Joins every war of yours unless Disloyal.",
  own_frontier_only: "Fights only on its own frontier.",
  defends_self: "Defends only itself.",
  when_called: "Comes when called.",
};

export function subjectsView(world: World, player: number, ledgerTribute: (n: number) => number): SubjectsView | null {
  if (player < 0) return null;
  const ties = subjectTies(world);
  const thin = stretched(world, ties);
  const own = ownSubjectCounts(ties);
  const now = monthNow(world);
  const one = (t: (typeof ties)[number]): SubjectView => {
    const reasons = subj.reasonsOf(t.bond, now, situation(world, t.s, t.o, own.get(t.s) ?? 0, thin.get(t.bond.subject) ?? 0));
    const a = subj.arrows(reasons);
    return {
      subject: t.s,
      kind: t.bond.kind,
      kindName: KIND_NAME[t.bond.kind],
      loyalty: STEP_WORD[t.bond.loyalty],
      up: a.up,
      down: a.down,
      pays: Math.max(0, -ledgerTribute(t.s)),
      share: subj.baseShare(t.bond) * subj.tributeMultiplier(t.bond.tribute) * subj.loyaltyPays(t.bond.loyalty),
      tribute: t.bond.tribute,
      reasons: reasons.map((x) => ({ label: x.label, arrow: x.arrow })),
      worst: subj.worstReason(reasons)?.label ?? "",
      fights: FIGHTS[subj.kindFights(t.bond.kind)] ?? "",
      why: { gift: whyNotSubjectAction(world, t.o, t.s, "gift"), loosen: whyNotSubjectAction(world, t.o, t.s, "loosen"), release: whyNotSubjectAction(world, t.o, t.s, "release") },
      giftCost: subjectGiftCost(world, t.s),
    };
  };
  const mine = ties.filter((t) => t.o === player);
  const order = subj.STEPS;
  const subjects = mine.map(one).sort((x, y) => order.indexOf(y.loyalty.toLowerCase().replace(" ", "_") as subj.Step) - order.indexOf(x.loyalty.toLowerCase().replace(" ", "_") as subj.Step));
  const above = ties.find((t) => t.s === player);
  return {
    reach: REACH,
    used: subj.reachUsed(mine.map((t) => ({ bond: t.bond, ownSubjects: own.get(t.s) ?? 0, distance: 0 }))),
    gold: subjects.reduce((n, x) => n + x.pays, 0),
    subjects,
    overlord: above ? { ...one(above), overlord: above.o } : null,
  };
}
