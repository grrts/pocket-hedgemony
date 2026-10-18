import type { World } from "./world.ts";
import { checkDestroyed, declareWar, peaceShare, strength, type News } from "./war.ts";
import { personName } from "./names.ts";
import { capsOf } from "./government.ts";
import { FAITH_IDS, FAITH_POLICIES, NO_FAITH, NO_TONGUE } from "./peoples.ts";
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
/** The month the overlord took the heir, kept on the bond so a save keeps it. */
type HostageBond = Bond & { hostageSince?: number };
/** The heir goes home after this long, standing in for his father's death until rulers age (SUBJ-042, D-SUBJ-29). */
const HOSTAGE_MONTHS = 20 * 12;

/** When a held heir goes home, as "YYYY-MM", or null when none is held. */
function heldUntil(b: Bond): { until: string } | null {
  const since = (b as HostageBond).hostageSince;
  if (!b.ties.includes("hostage_at_court") || since === undefined) return null;
  const m = since + HOSTAGE_MONTHS;
  return { until: `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}` };
}

function sendHeirHome(b: Bond): void {
  subj.subjectRulerDied(b);
  delete (b as HostageBond).hostageSince;
}

/** Reach of a realm whose administrative capacity the catalogue does not know: moderate, 5 (SUBJ-056, D-SUBJ-28). */
export const REACH = subj.reachFromCapacity("moderate");
const CAPACITY = [null, "very_low", "low", "moderate", "high", "very_high"] as const;

/** A realm's subject reach from its catalogue administrative capacity, moderate when unknown (SUBJ-056, D-SUBJ-28). */
export function reachOf(world: World, n: number): number {
  return subj.reachFromCapacity(CAPACITY[world.nationAdminCapacity[n] ?? 0] ?? "moderate");
}

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
  // Court tongue and state faith from the 1444 culture and faith seed (D-SUBJ-28); the name books stand in for a realm without a court tongue.
  const ts = world.nationCourt[s]!, to = world.nationCourt[o]!;
  const fs = world.nationStateFaith[s]!, fo = world.nationStateFaith[o]!;
  const sameCulture = ts !== NO_TONGUE && to !== NO_TONGUE ? ts === to : culture(a) && culture(b) ? culture(a) === culture(b) : undefined;
  const faith = fs !== NO_FAITH && fo !== NO_FAITH ? { sameFaith: fs === fo, persecuted: fs !== fo && FAITH_POLICIES[world.nationFaithPolicy[o * FAITH_IDS.length + fs]!] === "persecuted" } : {};
  const stance = rel.stance(g, a, b);
  const theirs = new Set(rel.enemiesOf(g, a));
  return {
    overlordSoldiers: co.soldiers ?? 0,
    subjectSoldiers: cs.soldiers ?? 0,
    ...(sameCulture === undefined ? {} : { sameCulture }),
    ...faith,
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
  for (const [o, roster] of byOverlord) for (const [k, v] of subj.stretchedThin(roster, reachOf(world, o))) out.set(k, v);
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
  if (action === "resident") return b.resident ? "a resident is at their court already" : dip.freeSeats(world.diplomacy, b.overlord) <= 0 ? "no free envoy: every seat is taken" : null;
  if (action === "recall") return b.resident ? null : "you have no resident there";
  if (action === "hostage") return b.ties.includes("hostage_at_court") ? "you hold their heir already" : b.loyalty === "disloyal" ? "they are Disloyal; a hostage is taken only from a Loyal or Wavering subject" : null;
  if (action === "send_heir_home") return b.ties.includes("hostage_at_court") ? null : "you hold no heir of theirs";
  if (action === "merge") {
    if (b.kind !== "union") return "only a Union's crowns are merged";
    const years = Math.floor((monthNow(world) - b.since) / 12);
    const need = config.kinds.union.merge_requires_years;
    if (years < need) return `${years} of the ${need} years in union needed`;
    return b.loyalty === "loyal" ? null : `they are ${STEP_WORD[b.loyalty]}; merging needs them Loyal`;
  }
  if (action === "fold_in" && b.kind === "union") return "a Union joins your realm by merging the crowns";
  if (action === "tighten" || action === "fold_in") {
    if (b.tighten || b.foldIn) return "your envoy is already at work there";
    if (dip.freeSeats(world.diplomacy, b.overlord) <= 0) return "no free envoy: every seat is taken";
    if (action === "tighten") return subj.tighterKind(b.kind) && b.kind === "tributary" ? (b.loyalty === "loyal" ? null : `they are ${STEP_WORD[b.loyalty]}; tightening needs them Loyal`) : `a ${KIND_NAME[b.kind]} cannot be tightened`;
    // The cheap requirements first; the land path and lord room only when they pass.
    return subj.foldInMissing(b, monthNow(world), { reachable: true, lordRoom: true }) ?? subj.foldInMissing(b, monthNow(world), foldContext(world, n, s));
  }
  return "no such action";
}

/** Whether the overlord can reach the subject by land and has room for one more lord (SUBJ-064). */
function foldContext(world: World, n: number, s: number): subj.FoldInContext {
  let reachable = false;
  for (let p = 0; p < world.provinceCount && !reachable; p++) {
    if (world.provinceOwner[p] !== s) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) if (world.provinceOwner[world.adjList[k]!] === n) reachable = true;
  }
  const landed = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.provinceLord[p]! >= 0) landed.add(world.provinceLord[p]!);
  return { reachable, lordRoom: landed.size < capsOf(world, n).lords.total };
}

/** An envoy that stays at the subject's court while he works there: he takes one of the overlord's seats (SUBJ-040, SUBJ-044, SUBJ-066). */
function seatEnvoy(world: World, b: Bond, action: string): void {
  const month = dip.monthOf(world.diplomacy.date);
  world.diplomacy.envoys.push({ id: `subject-${action}-${b.subject}-${monthNow(world)}`, country: b.overlord, person: "", personKind: "official", type: "", years: 0, action, target: b.subject, status: "resident", sent: month, arrival: month, residentSince: month });
}

function unseatEnvoy(world: World, b: Bond, action: string): void {
  const d = world.diplomacy;
  d.envoys = d.envoys.filter((e) => !(e.country === b.overlord && e.target === b.subject && e.action === action && e.status === "resident"));
}

const hasSeatEnvoy = (world: World, b: Bond, action: string) => world.diplomacy.envoys.some((e) => e.country === b.overlord && e.target === b.subject && e.action === action && e.status === "resident");

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
    for (const a of ["subject_resident", "subject_tighten", "subject_fold_in"]) unseatEnvoy(world, b, a);
    rel.releaseSubject(world.diplomacy.graph, b.subject);
    news.push({ kind: "envoy", text: `${name(n)} releases ${name(s)}, which goes free as a friend.`, nations: [n, s] });
  }
  if (action === "resident") {
    subj.stationResident(b);
    seatEnvoy(world, b, "subject_resident");
  }
  if (action === "recall") {
    delete b.resident;
    unseatEnvoy(world, b, "subject_resident");
  }
  if (action === "hostage") {
    subj.takeHostage(b);
    (b as HostageBond).hostageSince = now;
    news.push({ kind: "envoy", text: `${name(s)}'s heir comes to ${name(n)}'s court as a hostage.`, nations: [n, s] });
  }
  if (action === "send_heir_home") sendHeirHome(b);
  if (action === "merge") mergeCrownsRealm(world, s, n, news);
  if (action === "tighten") {
    subj.tighten(b, now);
    seatEnvoy(world, b, "subject_tighten");
  }
  if (action === "fold_in") {
    subj.startFoldIn(b, provincesOf(world, s).length, now, foldContext(world, n, s));
    seatEnvoy(world, b, "subject_fold_in");
    news.push({ kind: "envoy", text: `Your envoy goes to ${name(s)}'s court to fold it into your realm: a month for each of its provinces, as long as it stays Loyal.`, nations: [n, s] });
  }
  bondsChanged(world);
  return null;
}

const provincesOf = (world: World, n: number): number[] => {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) out.push(p);
  return out;
};

/**
 * A month of the overlord's envoys at its subjects' courts (SUBJ-044, SUBJ-066):
 * tightening makes a Tributary a Vassal after 6 months, folding in takes a
 * month per province and stops if the subject is no longer Loyal; an envoy
 * recalled for want of seats ends the work.
 */
export function monthlySubjectEnvoys(world: World, news: News[]): void {
  const name = (k: number) => world.rules.nations[k]!.name;
  const now = monthNow(world);
  for (const t of subjectTies(world)) {
    const b = t.bond;
    if (b.resident && !hasSeatEnvoy(world, b, "subject_resident")) delete b.resident;
    const since = (b as HostageBond).hostageSince;
    if (since !== undefined && now - since >= HOSTAGE_MONTHS) {
      sendHeirHome(b);
      bondsChanged(world);
      if (t.o === world.player || t.s === world.player) news.push({ kind: "envoy", text: `${name(t.s)}'s heir goes home from ${name(t.o)}'s court to take up his inheritance.`, nations: [t.o, t.s] });
    }
    if (!b.tighten && !b.foldIn) continue;
    const action = b.foldIn ? "subject_fold_in" : "subject_tighten";
    if (!hasSeatEnvoy(world, b, action)) {
      delete b.tighten;
      delete b.foldIn;
      continue;
    }
    const step = subj.progressEnvoys(b);
    if (step === "continues") continue;
    unseatEnvoy(world, b, action);
    bondsChanged(world);
    if (step === "tightened") {
      t.r.subject_kind = b.kind;
      news.push({ kind: "envoy", text: `${name(t.s)} is now ${name(t.o)}'s vassal.`, nations: [t.s, t.o] });
    } else if (step === "stopped") {
      if (t.o === world.player) news.push({ kind: "envoy", text: `${name(t.s)} is no longer Loyal: your envoy stops folding it in and comes home.`, nations: [t.s, t.o] });
    } else if (step === "folded_in") foldInRealm(world, t.s, t.o, news);
  }
}

/**
 * Folding in completes (SUBJ-063, SUBJ-067): the subject's land joins the
 * overlord's realm under one lord, its ruler, who also takes over its own
 * lords' land; its subjects step up to the overlord; the country leaves the map.
 */
export function foldInRealm(world: World, s: number, o: number, news: News[]): void {
  const g = world.diplomacy.graph;
  const sid = world.nationIds[s]!;
  const oid = world.nationIds[o]!;
  stepUpSubjects(world, sid, oid);
  rel.removeRelation(g, "subject", sid, oid);
  const land = provincesOf(world, s);
  const capital = world.provinceIndex.get(world.rules.nations[s]!.capital) ?? land[0]!;
  const lord = world.lords.length;
  world.lords.push({ name: personName(world.rules, s, capital * 7, world.rules.nations[s]!.name), house: world.rules.nations[s]!.name, nation: o, loyalty: "Loyal", upCredit: 0 });
  for (const p of land) {
    world.provinceOwner[p] = o;
    world.provinceLord[p] = lord;
  }
  news.push({ kind: "envoy", text: `${world.rules.nations[s]!.name} is folded into ${world.rules.nations[o]!.name}: its ruler holds its ${land.length} province${land.length === 1 ? "" : "s"} as a lord of the realm.`, nations: [s, o], province: capital });
  dip.provincesTaken(world.diplomacy, oid, sid, land.map((p) => world.provinceIds[p]!));
  checkDestroyed(world, news);
  bondsChanged(world);
}

/**
 * Merging the crowns completes (SUBJ-070, SUBJ-129): one ruler wears both, so
 * the Union's land joins the realm as it is held, its lords serving the
 * overlord with the loyalty they had and its royal land the overlord's own.
 */
export function mergeCrownsRealm(world: World, s: number, o: number, news: News[]): void {
  const g = world.diplomacy.graph;
  const sid = world.nationIds[s]!;
  const oid = world.nationIds[o]!;
  stepUpSubjects(world, sid, oid);
  rel.removeRelation(g, "subject", sid, oid);
  const land = provincesOf(world, s);
  for (const p of land) {
    world.provinceOwner[p] = o;
    const l = world.provinceLord[p]!;
    if (l >= 0 && world.lords[l]) world.lords[l]!.nation = o;
  }
  const capital = world.provinceIndex.get(world.rules.nations[s]!.capital) ?? land[0];
  news.push({ kind: "crown", text: `The crowns of ${world.rules.nations[o]!.name} and ${world.rules.nations[s]!.name} are merged: its ${land.length} province${land.length === 1 ? "" : "s"} join the realm, its lords keep their land.`, nations: [s, o], ...(capital === undefined ? {} : { province: capital }) });
  dip.provincesTaken(world.diplomacy, oid, sid, land.map((p) => world.provinceIds[p]!));
  checkDestroyed(world, news);
  bondsChanged(world);
}

/** A folded-in or merged realm's own subjects step up to its overlord, keeping their bonds (SUBJ-063). */
function stepUpSubjects(world: World, sid: string, oid: string): void {
  const g = world.diplomacy.graph;
  for (const r of g.relations.filter((x) => x.type === "subject" && x.target === sid)) {
    const bond = bondOn(world, r);
    rel.removeRelation(g, "subject", r.source, sid);
    try {
      const next = rel.makeSubject(g, r.source, oid, bond.kind);
      next.origin = "game";
      next.bond = { ...bond, overlord: oid };
    } catch {
      // A tie the relation rules forbid: it goes free.
    }
  }
}

/** What a risen subject was, kept on its war so the peace can restore it (SUBJ-077, SUBJ-078). */
export type IndependenceWar = dip.War & { independence?: { subject: string; overlord: string; kind: subj.Kind } };

/**
 * A subject rises (SUBJ-074 to SUBJ-077): the tie ends, both turn Hostile and
 * the subject declares its independence war on its old overlord.
 */
export function riseUp(world: World, s: number, news: News[], backer?: number): string | null {
  const t = subjectTies(world).find((x) => x.s === s);
  if (!t) return "you answer to no overlord";
  if (t.bond.loyalty !== "disloyal") return `you are ${STEP_WORD[t.bond.loyalty]}: only a Disloyal subject rises`;
  const g = world.diplomacy.graph;
  const kind = t.bond.kind;
  for (const a of ["subject_resident", "subject_tighten", "subject_fold_in"]) unseatEnvoy(world, t.bond, a);
  rel.removeRelation(g, "subject", t.r.source, t.r.target);
  rel.setStance(g, t.r.source, t.r.target, "hostile");
  rel.setStance(g, t.r.target, t.r.source, "hostile");
  bondsChanged(world);
  const why = declareWar(world, s, t.o, news);
  if (why) return why;
  const war = world.diplomacy.wars[world.diplomacy.wars.length - 1] as IndependenceWar;
  war.independence = { subject: t.r.source, overlord: t.r.target, kind };
  news.push({ kind: "war", text: `${world.rules.nations[s]!.name} rises against ${world.rules.nations[t.o]!.name} for its independence.`, nations: [s, t.o] });
  // Its backer declares *Break a subject* and fights on its side (SUBJ-077, D-SUBJ-29).
  if (backer !== undefined && !world.nationGone[backer] && !dip.warOf(world.diplomacy, world.nationIds[backer]!)) {
    dip.joinWar(world.diplomacy, war, world.nationIds[backer]!, t.r.source, t.r.target);
    news.push({ kind: "joined", text: `${world.rules.nations[backer]!.name} backs ${world.rules.nations[s]!.name} and declares war on ${world.rules.nations[t.o]!.name}.`, nations: [backer, s, t.o] });
  }
  return null;
}

/**
 * The peace of an independence war (SUBJ-078, SUBJ-079): when the subject
 * gives up land the overlord has won and takes it back one kind tighter;
 * otherwise it stays free, Hostile toward its old overlord.
 */
export function independencePeace(world: World, war: dip.War, cededFrom: ReadonlySet<number>, news: News[]): void {
  const x = (war as IndependenceWar).independence;
  if (!x) return;
  const s = world.nationIndex.get(x.subject);
  const o = world.nationIndex.get(x.overlord);
  if (s === undefined || o === undefined || world.nationGone[s] || world.nationGone[o]) return;
  if (!cededFrom.has(s)) {
    news.push({ kind: "peace", text: `${world.rules.nations[s]!.name} has won its independence from ${world.rules.nations[o]!.name}.`, nations: [s, o] });
    return;
  }
  const kind = subj.tighterKind(x.kind) ?? x.kind;
  try {
    makeSubject(world, s, o, kind);
  } catch {
    return;
  }
  const b = bondOf(world, s)!;
  b.loyalty = "wavering";
  b.loyalSince = null;
  b.lastStep = { month: monthNow(world), dir: 1 };
  const now = monthNow(world);
  subj.forceUsed(subjectTies(world).filter((t) => t.o === o).map((t) => t.bond), x.subject, now);
  news.push({ kind: "peace", text: `${world.rules.nations[s]!.name} is beaten and made ${world.rules.nations[o]!.name}'s ${KIND_NAME[kind].toLowerCase()} again; its other subjects take note.`, nations: [s, o] });
}

/**
 * AI subjects rise when Disloyal and their overlord is losing a war elsewhere
 * (over half its voices for peace), or a stronger rival of the overlord at
 * peace borders them; Disloyal neighbours of the same overlord rise with
 * them (SUBJ-075, SUBJ-076, SUBJ-099). Checked once a season.
 */
export function aiRisings(world: World, news: News[]): void {
  if (!subj.isSeasonEnd(world.date.month)) return;
  const ties = subjectTies(world).filter((t) => t.bond.loyalty === "disloyal" && t.s !== world.player);
  if (!ties.length) return;
  const d = world.diplomacy;
  const g = d.graph;
  const near = (s: number): Set<string> => {
    const out = new Set<string>();
    for (let p = 0; p < world.provinceCount; p++) {
      if (world.provinceOwner[p] !== s) continue;
      for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) {
        const q = world.provinceOwner[world.adjList[k]!]!;
        if (q >= 0 && q !== s) out.add(world.nationIds[q]!);
      }
    }
    return out;
  };
  const risen = new Set<number>();
  for (const t of ties) {
    if (risen.has(t.s)) continue;
    const war = dip.warOf(d, t.r.target);
    let losing = false;
    if (war) {
      const idx = (ids: string[]) => ids.map((id) => world.nationIndex.get(id)!).filter((n) => n !== undefined);
      const ours = war.attackers.includes(t.r.target) ? idx(war.attackers) : idx(war.defenders);
      const theirs = war.attackers.includes(t.r.target) ? idx(war.defenders) : idx(war.attackers);
      losing = peaceShare(world, ours, theirs) > config.rising.overlord_losing_peace_voice_share;
    }
    const neighbours = near(t.s);
    const backer = [...neighbours].find((id) => {
      const c = world.nationIndex.get(id)!;
      const stance = rel.stance(g, id, t.r.target);
      return id !== t.r.target && (stance === "rival" || stance === "hostile") && !dip.warOf(d, id) && strength(world, c) >= strength(world, t.o);
    });
    if (!subj.rises(t.bond, { ...(backer ? { backer: { atPeace: true, willing: true } } : {}), overlordAtWarElsewhere: !!war, overlordPeaceShare: losing ? 1 : 0 })) continue;
    const others = ties.filter((x) => x.o === t.o && x !== t && !risen.has(x.s)).map((x) => ({ bond: x.bond, neighbours: near(x.s), s: x.s }));
    const joiners = subj.joinRising({ bond: t.bond, neighbours }, others).map((b) => others.find((x) => x.bond === b)!.s);
    const backing = backer === undefined ? undefined : world.nationIndex.get(backer);
    for (const s of [t.s, ...joiners]) if (!riseUp(world, s, news, s === t.s ? backing : undefined)) risen.add(s);
  }
}

/** AI overlords fold in Loyal subjects that are ready, and station residents on and take hostages from Wavering ones, once a season (SUBJ-098). */
export function aiOverlordEnvoys(world: World, news: News[]): void {
  if (!subj.isSeasonEnd(world.date.month)) return;
  const ties = subjectTies(world);
  // One fold-in at a time for each overlord, and only for a third of the realms: those that like centralising.
  const folding = new Set(ties.filter((t) => t.bond.foldIn).map((t) => t.o));
  for (const t of ties) {
    if (t.o === world.player) continue;
    const centralising = (t.o * 7) % 3 === 0;
    // A Union ready to merge is merged at once (SUBJ-098, SUBJ-129).
    if (centralising && t.bond.kind === "union" && !whyNotSubjectAction(world, t.o, t.s, "merge")) {
      subjectAction(world, t.o, t.s, "merge", news);
      continue;
    }
    if (t.bond.loyalty === "loyal" && centralising && !folding.has(t.o) && !whyNotSubjectAction(world, t.o, t.s, "fold_in")) {
      subjectAction(world, t.o, t.s, "fold_in", news);
      folding.add(t.o);
    }
    else if (t.bond.loyalty === "wavering" && !whyNotSubjectAction(world, t.o, t.s, "resident")) subjectAction(world, t.o, t.s, "resident", news);
    // A Wavering subject's heir is also worth holding (SUBJ-098, D-SUBJ-29).
    if (t.bond.loyalty === "wavering" && !whyNotSubjectAction(world, t.o, t.s, "hostage")) subjectAction(world, t.o, t.s, "hostage", news);
  }
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
  return subj.aiAcceptsNewSubject(used, reachOf(world, n), subj.reachWeight({ kind: "tributary", ties: [] }));
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
  why: { gift: string | null; loosen: string | null; release: string | null; resident: string | null; recall: string | null; hostage: string | null; send_heir_home: string | null; tighten: string | null; fold_in: string | null; merge: string | null };
  /** Months left of tightening or folding in, when an envoy is at work. */
  work: { action: "tighten" | "fold_in"; monthsLeft: number } | null;
  resident: boolean;
  /** Whether the overlord holds the subject's heir, and the month he goes home. */
  hostage: { until: string } | null;
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
      why: Object.fromEntries((["gift", "loosen", "release", "resident", "recall", "hostage", "send_heir_home", "tighten", "fold_in", "merge"] as const).map((a) => [a, whyNotSubjectAction(world, t.o, t.s, a)])) as SubjectView["why"],
      work: t.bond.foldIn ? { action: "fold_in", monthsLeft: t.bond.foldIn.monthsLeft } : t.bond.tighten ? { action: "tighten", monthsLeft: t.bond.tighten.monthsLeft } : null,
      resident: !!t.bond.resident,
      hostage: heldUntil(t.bond),
      giftCost: subjectGiftCost(world, t.s),
    };
  };
  const mine = ties.filter((t) => t.o === player);
  const order = subj.STEPS;
  const subjects = mine.map(one).sort((x, y) => order.indexOf(y.loyalty.toLowerCase().replace(" ", "_") as subj.Step) - order.indexOf(x.loyalty.toLowerCase().replace(" ", "_") as subj.Step));
  const above = ties.find((t) => t.s === player);
  return {
    reach: reachOf(world, player),
    used: subj.reachUsed(mine.map((t) => ({ bond: t.bond, ownSubjects: own.get(t.s) ?? 0, distance: 0 }))),
    gold: subjects.reduce((n, x) => n + x.pays, 0),
    subjects,
    overlord: above ? { ...one(above), overlord: above.o } : null,
  };
}
