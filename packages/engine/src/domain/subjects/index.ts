/**
 * Subjects and overlords (SUBJ): the six kinds, ties and colony stages,
 * loyalty from visible reasons, overlord actions, subject reach, folding in,
 * losing and making subjects. After subjects-design v1; every number comes
 * from packages/rules/data/domain/subjects.json (subjects/config/subject-rules.json).
 * Time is counted in months (any absolute month index; a year is 12).
 */
import config from "../../../../rules/data/domain/subjects.json" with { type: "json" };
import data1444 from "../../../../rules/data/domain/subjects-1444.json" with { type: "json" };

export type Kind = "vassal" | "tributary" | "union" | "march" | "colony" | "protectorate";
export type Step = "loyal" | "wavering" | "disloyal" | "in_revolt";
export type Tie = "kin" | "held_of_the_church" | "held_in_fief" | "second_master" | "hostage_at_court";
export type ColonyStage = "outpost" | "settled" | "self_governing";
export type TributeLevel = keyof typeof config.tribute_levels;
export type Autonomy = keyof typeof config.loyalty.start_1444_by_autonomy;
export type ReasonId = keyof typeof config.reasons;

export const KINDS: Kind[] = ["vassal", "tributary", "union", "march", "colony", "protectorate"];
export const STEPS = config.loyalty.steps as Step[];

const kinds = config.kinds as Record<Kind, {
  icon: string;
  pays_share: number;
  fights: string;
  own_diplomacy: string;
  own_subjects: boolean;
  overlord_owes: string[];
  reach_weight: number;
  drift: number;
  fold_in: string;
}>;

/** "Protectorate" → "protectorate". */
export function kindFromName(name: string): Kind {
  const k = name.trim().toLowerCase() as Kind;
  if (!KINDS.includes(k)) throw new Error(`Unknown subject kind: ${name}`);
  return k;
}

/** "In revolt" → "in_revolt". */
export function stepFromName(name: string): Step {
  const s = name.trim().toLowerCase().replace(/\s+/g, "_") as Step;
  if (!STEPS.includes(s)) throw new Error(`Unknown loyalty step: ${name}`);
  return s;
}

export function stepName(step: Step): string {
  const w = step.replace(/_/g, " ");
  return w[0]!.toUpperCase() + w.slice(1);
}

/** The kind's icon, in words ("two crowns") (SUBJ-004). */
export function kindIcon(kind: Kind): string {
  return kinds[kind].icon.replace(/_/g, " ");
}

/** The kind's permanent drift reason (SUBJ-012). */
export function kindDrift(kind: Kind): number {
  return kinds[kind].drift;
}

/** What the overlord owes each kind, as config ids (SUBJ-011). */
export function overlordOwes(kind: Kind): string[] {
  return [...kinds[kind].overlord_owes];
}

/** Whether a subject of this kind may hold subjects of its own (SUBJ-010, INV-SUBJ-6). */
export function mayHoldSubjects(kind: Kind): boolean {
  return kinds[kind].own_subjects;
}

// ---------------------------------------------------------------------------
// The ladder of rule (design 1)
// ---------------------------------------------------------------------------

export type Rung = "royal land" | "lord's land" | "subject realm" | "independent";

/** Where a province sits on the ladder of rule (SUBJ-001). */
export function rungOf(p: { runBy: "official" | "lord" | "own ruler"; ownerHasOverlord: boolean }): Rung {
  if (p.runBy === "official") return "royal land";
  if (p.runBy === "lord") return "lord's land";
  return p.ownerHasOverlord ? "subject realm" : "independent";
}

/** A realm under someone is a subject only with its own country on the map; otherwise a lord (SUBJ-002). */
export function subjectOrLord(ownCountryOnMap: boolean): "subject" | "lord" {
  return ownCountryOnMap ? "subject" : "lord";
}

// ---------------------------------------------------------------------------
// Ladder of eras for protectorates (SUBJ-013)
// ---------------------------------------------------------------------------

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export function eraNumber(era: string): number {
  const n = ROMAN.indexOf(era.trim().toUpperCase());
  if (n < 0) throw new Error(`Unknown era: ${era}`);
  return n + 1;
}

/** A Protectorate needs era VI, or era IV for an overseas trade empire (SUBJ-013, INV-SUBJ-5). */
export function protectorateAllowed(era: string, overseasTradeEmpire: boolean): boolean {
  const p = config.kinds.protectorate;
  const min = overseasTradeEmpire ? p.min_era_overseas_trade_empire : p.min_era;
  return eraNumber(era) >= eraNumber(min);
}

// ---------------------------------------------------------------------------
// The bond between a subject and its overlord
// ---------------------------------------------------------------------------

/** A reason with a start and (for timed reasons) an end month. */
export interface TimedReason {
  id: string;
  label: string;
  arrow: number;
  from: number;
  /** First month it no longer applies; absent = until removed. */
  until?: number;
}

export interface SubjectBond {
  subject: string;
  overlord: string;
  kind: Kind;
  ties: Tie[];
  stage?: ColonyStage;
  tribute: TributeLevel;
  tributeForm: "gold" | "grain";
  loyalty: Step;
  /** Month it became a subject. */
  since: number;
  /** Month it has been Loyal since (null while not Loyal). */
  loyalSince: number | null;
  /** Last step change and its direction (+1 up, −1 down). */
  lastStep?: { month: number; dir: 1 | -1 };
  /** Reasons from actions and events, with their expiry. */
  reasons: TimedReason[];
  resident?: boolean;
  lentOfficial?: string;
  marriage?: boolean;
  hostageHarmed?: boolean;
  refusedCalls?: number;
  backer?: string;
  tighten?: { monthsLeft: number };
  foldIn?: { monthsLeft: number };
}

export function newBond(b: Pick<SubjectBond, "subject" | "overlord" | "kind"> & Partial<SubjectBond>, now = 0): SubjectBond {
  const loyalty = b.loyalty ?? "loyal";
  return {
    ties: [],
    tribute: "normal",
    tributeForm: "gold",
    since: now,
    loyalSince: loyalty === "loyal" ? now : null,
    reasons: [],
    ...b,
    loyalty,
    ...(b.kind === "colony" && !b.stage ? { stage: "outpost" as const } : {}),
  };
}

const REASON_LABELS: Record<string, string> = {
  much_stronger: "You are much stronger",
  not_much_stronger: "You are not much stronger",
  same_faith: "Same faith",
  different_faith: "Different faith",
  persecuted_faith: "Different faith",
  same_people: "Same people",
  different_people: "Different people",
  defended: "You defended it",
  left_alone: "You left it alone",
  gift: "Gift",
  marriage: "Marriage",
  kin: "Kin",
  hostage_at_court: "Hostage at court",
  resident_at_court: "Resident at court",
  courted: "Courted",
  common_enemy: "Common enemy",
  long_held: "Long held",
  light_tribute: "Light tribute",
  heavy_tribute: "Heavy tribute",
  crushing_tribute: "Crushing tribute",
  lost_war: "You lost a war",
  new_overlord_ruler: "New ruler",
  stretched_thin: "Stretched thin",
  far_away: "Far away",
  outgrown: "Outgrown",
  hostile_stance: "Hostile stance",
  rival_stance: "Rival stance",
  given_a_crown: "Given a crown",
  loosened: "Loosened",
  force_used_on_other_subject: "Force used",
  deposed_other_subject: "Another subject deposed",
  lapse_annexation: "Doctrine of lapse",
  refused_call_again: "Refused a call again",
  missed_stipend: "Missed stipend",
  master_of_others: "Master of others",
  lent_official: "Lent official",
  left_other_subject_alone: "You left another subject alone",
  quarrel_forbidden: "Quarrel forbidden",
  drift: "Drift",
};

export function reasonLabel(id: string): string {
  return REASON_LABELS[id] ?? id;
}

function reasonConfig(id: ReasonId): { arrow: number; months?: number } {
  return config.reasons[id] as { arrow: number; months?: number };
}

/** Adds a reason from config with its own duration (SUBJ-032). */
export function addReason(b: SubjectBond, id: ReasonId, now: number): TimedReason {
  const r = reasonConfig(id);
  const reason: TimedReason = { id, label: reasonLabel(id), arrow: r.arrow, from: now };
  if (r.months !== undefined) reason.until = now + r.months;
  b.reasons = b.reasons.filter((x) => x.id !== id);
  b.reasons.push(reason);
  return reason;
}

/** An event adds a reason by id, or a named one-off with its own arrow, for the stated months (SUBJ-035). */
export function addEventReason(b: SubjectBond, r: { id: string; label?: string; arrow: number; months?: number }, now: number): TimedReason {
  const reason: TimedReason = { id: r.id, label: r.label ?? reasonLabel(r.id), arrow: r.arrow, from: now };
  if (r.months !== undefined) reason.until = now + r.months;
  b.reasons = b.reasons.filter((x) => x.id !== r.id);
  b.reasons.push(reason);
  return reason;
}

/** An event removes a reason by id (SUBJ-035). */
export function removeReason(b: SubjectBond, id: string): void {
  b.reasons = b.reasons.filter((x) => x.id !== id);
}

export function activeTimedReasons(b: SubjectBond, now: number): TimedReason[] {
  return b.reasons.filter((r) => r.from <= now && (r.until === undefined || now < r.until));
}

// ---------------------------------------------------------------------------
// Paying (design 2.1, 3, 4)
// ---------------------------------------------------------------------------

/** The share of income it owes at normal tribute: kind, colony stage, or a tie's token (SUBJ-005, SUBJ-018, SUBJ-019, SUBJ-024). */
export function baseShare(b: Pick<SubjectBond, "kind" | "ties" | "stage">): number {
  if (b.ties.includes("held_of_the_church")) return config.ties.held_of_the_church.pays_share;
  if (b.ties.includes("held_in_fief")) return config.ties.held_in_fief.pays_share;
  if (b.kind === "colony" && b.stage) return config.kinds.colony.stages[b.stage].pays_share;
  return kinds[b.kind].pays_share;
}

/** How much of what it owes a step pays (SUBJ-026). */
export function loyaltyPays(step: Step): number {
  return config.loyalty.effects[step].pays;
}

export function tributeMultiplier(level: TributeLevel): number {
  return config.tribute_levels[level];
}

/** What it owes this month, before loyalty (SUBJ-005, SUBJ-037). */
export function tributeOwed(b: SubjectBond, income: number): number {
  return income * baseShare(b) * tributeMultiplier(b.tribute);
}

export interface TributePaid {
  gold: number;
  grain: number;
  /** Where grain tribute arrives: the overlord's nearest castle (SUBJ-007). */
  castle?: string;
}

/**
 * One month's tribute, paid from the subject's treasury, so a poor subject
 * pays little (SUBJ-005 … SUBJ-007, SUBJ-026). Grain goes to the overlord's
 * nearest castle, where it counts toward Food.
 */
export function payTribute(
  b: SubjectBond,
  income: number,
  treasury: number,
  overlordCastles: readonly { id: string; distance: number }[] = [],
): TributePaid {
  const due = Math.min(tributeOwed(b, income) * loyaltyPays(b.loyalty), Math.max(0, treasury));
  if (b.tributeForm === "grain") {
    const castle = [...overlordCastles].sort((x, y) => x.distance - y.distance)[0];
    return { gold: 0, grain: due, ...(castle ? { castle: castle.id } : {}) };
  }
  return { gold: due, grain: 0 };
}

/** A second master's small tribute (SUBJ-020). */
export function secondMasterTribute(income: number): number {
  return income * config.ties.second_master.second_master_share;
}

/** With a second master at war with the first, the subject leans to the stronger (SUBJ-020). */
export function leansTo(first: { id: string; strength: number }, second: { id: string; strength: number }): string {
  return first.strength >= second.strength ? first.id : second.id;
}

// ---------------------------------------------------------------------------
// War and diplomacy by kind and loyalty (design 2.1, 3)
// ---------------------------------------------------------------------------

export type WarAnswer = "whole_at_once" | "half_late" | "refuses" | "not_called" | "frontier" | "defends_self" | "at_war_with_overlord";

export interface WarContext {
  /** The war is on the March's own frontier. */
  onOwnFrontier?: boolean;
}

/** How a subject answers its overlord's war (SUBJ-008, SUBJ-018, SUBJ-019, SUBJ-027, SUBJ-038). */
export function warAnswer(b: SubjectBond, war: WarContext = {}): WarAnswer {
  if (b.loyalty === "in_revolt") return "at_war_with_overlord";
  if (b.ties.includes("held_of_the_church") || b.ties.includes("held_in_fief")) return "not_called";
  const fights = kinds[b.kind].fights;
  if (fights === "never") return "not_called";
  if (fights === "defends_self") return "defends_self";
  if (fights === "own_frontier_only") return war.onOwnFrontier ? "frontier" : "not_called";
  if (fights === "always_if_loyal_or_wavering") return b.loyalty === "disloyal" ? "refuses" : byLoyalty(b.loyalty);
  return byLoyalty(b.loyalty);
}

function byLoyalty(step: Step): WarAnswer {
  const call = (config.loyalty.effects[step] as { call?: string }).call;
  if (call === "full_at_once") return "whole_at_once";
  if (call === "half_late") return "half_late";
  return "refuses";
}

/**
 * A call to war from the overlord. A Disloyal subject refuses, and each call
 * after the first adds *Refused a call again* for 12 months (SUBJ-028).
 */
export function callToWar(b: SubjectBond, now: number, war: WarContext = {}): WarAnswer {
  const answer = warAnswer(b, war);
  if (answer === "refuses") {
    b.refusedCalls = (b.refusedCalls ?? 0) + 1;
    if (b.refusedCalls > 1) addReason(b, "refused_call_again", now);
  }
  return answer;
}

/** Whether a Wavering subject's army is still in the war after `months` (SUBJ-027). */
export function waveringStillInWar(months: number, warOnItsBorder: boolean): boolean {
  return warOnItsBorder || months < config.loyalty.effects.wavering.goes_home_after_months;
}

/** How a subject treats foreign envoys, by step (SUBJ-026). */
export function foreignEnvoys(step: Step): string {
  return (config.loyalty.effects[step] as { foreign_envoys?: string }).foreign_envoys ?? "at_war";
}

/** The army size the overlord sees: hidden when Disloyal unless a resident is there (SUBJ-028, SUBJ-040). */
export function armySeenByOverlord(b: SubjectBond, trueArmy: number): number | null {
  if (b.loyalty === "disloyal" && config.loyalty.effects.disloyal.hides_army && !b.resident) return null;
  return trueArmy;
}

export type DiplomaticAct = "alliance" | "war" | "envoy" | "pact";

/** Whether a subject may act abroad (SUBJ-009). `againstOverlord`: against the overlord or its allies. */
export function mayActAbroad(kind: Kind, act: DiplomaticAct, againstOverlord: boolean): boolean {
  switch (kinds[kind].own_diplomacy) {
    case "full":
      return true;
    case "none":
      return false;
    case "no_alliances":
      return act !== "alliance";
    case "limited":
      return !((act === "war" || act === "alliance") && againstOverlord);
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Ties (design 2.3)
// ---------------------------------------------------------------------------

/** If the overlord's line dies out, a Kin subject's ruler has a claim to its throne (SUBJ-017). */
export function claimOnOverlordThrone(b: SubjectBond, overlordLineDiedOut: boolean): boolean {
  return overlordLineDiedOut && b.ties.includes("kin") && config.ties.kin.claim_on_overlord_throne_if_line_ends;
}

// ---------------------------------------------------------------------------
// Colony stages (design 2.4)
// ---------------------------------------------------------------------------

/** The stage a colony has reached (SUBJ-022 … SUBJ-024). An event may set Self-governing outright. */
export function colonyStage(c: { provinces: number; mostlySettlers: boolean; years: number; current?: ColonyStage }): ColonyStage {
  if (c.current === "self_governing") return "self_governing";
  const st = config.kinds.colony.stages;
  if (c.provinces >= st.self_governing.min_provinces && c.years >= st.self_governing.min_years) return "self_governing";
  if (c.provinces >= st.settled.min_provinces && c.mostlySettlers) return "settled";
  return c.current ?? "outpost";
}

/** What a stage brings: own army or militia, settler voice, own lords. */
export function colonyStageTraits(stage: ColonyStage): { ownArmy: boolean; militia: boolean; settlerVoice: boolean; ownLords: boolean; governorRuns: boolean } {
  return {
    ownArmy: stage !== "outpost",
    militia: stage !== "outpost",
    settlerVoice: stage !== "outpost",
    ownLords: stage === "self_governing",
    governorRuns: stage === "outpost",
  };
}

/** A colony founded by a country is an Outpost (SUBJ-022). */
export function foundColony(subject: string, overlord: string, now: number): SubjectBond {
  return newBond({ subject, overlord, kind: "colony", stage: "outpost" }, now);
}

/** A Disloyal Settled or Self-governing colony triggers settler independence (SUBJ-025). */
export function settlerIndependenceTrigger(b: SubjectBond): boolean {
  return b.kind === "colony" && b.loyalty === "disloyal" && (b.stage === "settled" || b.stage === "self_governing");
}

// ---------------------------------------------------------------------------
// Loyalty reasons (design 3.1)
// ---------------------------------------------------------------------------

/** Everything the season count reads about one subject; absent facts give no reason. */
export interface SubjectSituation {
  overlordSoldiers?: number;
  subjectSoldiers?: number;
  sameFaith?: boolean;
  persecuted?: boolean;
  sameCulture?: boolean;
  cultureAccepted?: boolean;
  commonEnemy?: boolean;
  courted?: boolean;
  farAway?: boolean;
  overlordProvinces?: number;
  subjectProvinces?: number;
  stance?: "hostile" | "rival" | null;
  ownSubjects?: number;
  /** Arrows of *Stretched thin* from the overlord's roster (≤ 0). */
  stretchedThin?: number;
}

export interface Reason {
  id: string;
  label: string;
  arrow: number;
}

function r(id: string, arrow: number, label = reasonLabel(id)): Reason {
  return { id, label, arrow };
}

/** *Outgrown*: more provinces than the overlord, or than its kind allows (a Vassal: half the overlord's) (SUBJ-034). */
export function outgrown(kind: Kind, subjectProvinces: number, overlordProvinces: number): boolean {
  if (subjectProvinces > overlordProvinces) return true;
  return kind === "vassal" && subjectProvinces > overlordProvinces * config.reasons.outgrown.vassal_max_province_share;
}

/** Every reason that applies to a subject now, with its arrow (SUBJ-012, SUBJ-017, SUBJ-021, SUBJ-032 … SUBJ-034, SUBJ-060). */
export function reasonsOf(b: SubjectBond, now: number, sit: SubjectSituation = {}): Reason[] {
  const out: Reason[] = [];
  const R = config.reasons;
  if (sit.overlordSoldiers !== undefined && sit.subjectSoldiers !== undefined) {
    if (sit.overlordSoldiers >= 3 * sit.subjectSoldiers) out.push(r("much_stronger", R.much_stronger.arrow));
    else if (sit.subjectSoldiers >= 0.5 * sit.overlordSoldiers) out.push(r("not_much_stronger", R.not_much_stronger.arrow));
  }
  if (sit.sameFaith === true) out.push(r("same_faith", R.same_faith.arrow));
  if (sit.sameFaith === false) out.push(sit.persecuted ? r("persecuted_faith", R.persecuted_faith.arrow) : r("different_faith", R.different_faith.arrow));
  if (sit.sameCulture === true) out.push(r("same_people", R.same_people.arrow));
  if (sit.sameCulture === false && !sit.cultureAccepted) out.push(r("different_people", R.different_people.arrow));
  if (b.marriage) out.push(r("marriage", R.marriage.arrow));
  if (b.ties.includes("kin")) out.push(r("kin", config.ties.kin.loyalty));
  if (b.ties.includes("hostage_at_court")) {
    out.push(r("hostage_at_court", b.hostageHarmed ? config.ties.hostage_at_court.loyalty_if_harmed : config.ties.hostage_at_court.loyalty));
  }
  if (b.resident) out.push(r("resident_at_court", R.resident_at_court.arrow));
  if (b.lentOfficial) out.push(r("lent_official", R.lent_official.arrow));
  if (sit.courted) out.push(r("courted", R.courted.arrow));
  if (sit.commonEnemy) out.push(r("common_enemy", R.common_enemy.arrow));
  if (now - b.since >= R.long_held.min_years * 12) out.push(r("long_held", R.long_held.arrow));
  if (b.tribute === "light") out.push(r("light_tribute", R.light_tribute.arrow));
  if (b.tribute === "heavy") out.push(r("heavy_tribute", R.heavy_tribute.arrow));
  if (b.tribute === "crushing") out.push(r("crushing_tribute", R.crushing_tribute.arrow));
  if (sit.stretchedThin) out.push(r("stretched_thin", sit.stretchedThin));
  if (sit.farAway) out.push(r("far_away", R.far_away.arrow));
  if (sit.overlordProvinces !== undefined && sit.subjectProvinces !== undefined && outgrown(b.kind, sit.subjectProvinces, sit.overlordProvinces)) {
    out.push(r("outgrown", R.outgrown.arrow));
  }
  if (sit.ownSubjects) out.push(r("master_of_others", R.master_of_others.arrow));
  if (sit.stance === "hostile") out.push(r("hostile_stance", R.hostile_stance.arrow));
  if (sit.stance === "rival") out.push(r("rival_stance", R.rival_stance.arrow));
  const drift = kindDrift(b.kind);
  if (drift) out.push(r("drift", drift, "Kind's drift"));
  for (const t of activeTimedReasons(b, now)) out.push({ id: t.id, label: t.label, arrow: t.arrow });
  return out;
}

export function arrows(reasons: readonly Reason[]): { up: number; down: number; total: number } {
  let up = 0;
  let down = 0;
  for (const x of reasons) {
    if (x.arrow > 0) up += x.arrow;
    else down -= x.arrow;
  }
  return { up, down, total: up - down };
}

/** The worst (most negative) reason, for the subjects list. */
export function worstReason(reasons: readonly Reason[]): Reason | undefined {
  return [...reasons].filter((x) => x.arrow < 0).sort((a, b) => a.arrow - b.arrow)[0];
}

// ---------------------------------------------------------------------------
// The season count (design 3.1)
// ---------------------------------------------------------------------------

/** Whether the month that just ended closes a season (SUBJ-030, SUBJ-101). `month` counts from 1. */
export function isSeasonEnd(month: number): boolean {
  return month % config.loyalty.check_every_months === 0;
}

function setLoyalty(b: SubjectBond, step: Step, now: number): void {
  if (step === b.loyalty) return;
  const dir: 1 | -1 = STEPS.indexOf(step) < STEPS.indexOf(b.loyalty) ? 1 : -1;
  b.loyalty = step;
  b.lastStep = { month: now, dir };
  b.loyalSince = step === "loyal" ? now : null;
}

/** Moves loyalty one step up or down, as an action or a rule does (not the count). */
export function moveLoyalty(b: SubjectBond, dir: 1 | -1, now: number): void {
  const i = STEPS.indexOf(b.loyalty) - dir;
  const next = STEPS[Math.max(0, Math.min(STEPS.length - 1, i))]!;
  setLoyalty(b, next, now);
}

/**
 * The season count (SUBJ-030, SUBJ-031): +2 or more moves one step up, −2 or
 * less one step down, but never twice the same way within 12 months. The
 * count moves between Loyal and Disloyal; In revolt comes only by rising (8.2).
 */
export function seasonCount(b: SubjectBond, total: number, now: number): Step {
  if (b.loyalty === "in_revolt") return b.loyalty;
  const L = config.loyalty;
  const dir: 0 | 1 | -1 = total >= L.step_up_at ? 1 : total <= L.step_down_at ? -1 : 0;
  if (dir === 0) return b.loyalty;
  if (b.lastStep && b.lastStep.dir === dir && now - b.lastStep.month < L.min_months_between_same_direction_steps) return b.loyalty;
  const i = STEPS.indexOf(b.loyalty) - dir;
  if (i < 0 || i > STEPS.indexOf("disloyal")) return b.loyalty;
  setLoyalty(b, STEPS[i]!, now);
  return b.loyalty;
}

/** Starting loyalty in 1444 from autonomy, one step lower with a Hostile stance (SUBJ-036). */
export function startLoyalty1444(autonomy: Autonomy, hostileToOverlord: boolean): Step {
  const base = config.loyalty.start_1444_by_autonomy[autonomy] as Step;
  if (!hostileToOverlord) return base;
  const i = STEPS.indexOf(base) + config.loyalty.start_1444_hostile_stance_steps_down;
  return STEPS[Math.min(i, STEPS.indexOf("disloyal"))]!;
}

/** Years held and years Loyal counted at the 1444 start (SUBJ-065). */
export function heldAtStart(startDate: string | null, startYear: number, loyalAtStart: boolean): { yearsHeld: number; yearsLoyal: number } {
  const year = startDate ? Number(startDate.slice(0, 4)) : null;
  return {
    yearsHeld: year === null ? config.fold_in.start_1444_years_if_unknown : startYear - year,
    yearsLoyal: loyalAtStart ? config.fold_in.min_loyal_years : 0,
  };
}

// ---------------------------------------------------------------------------
// Subject reach (design 6)
// ---------------------------------------------------------------------------

/** Subject reach from the catalogue's administrative capacity, with the government form's change (SUBJ-056). */
export function reachFromCapacity(capacity: keyof typeof config.reach_by_administrative_capacity, formChange = 0): number {
  return config.reach_by_administrative_capacity[capacity] + formChange;
}

/** What one direct subject counts against reach (SUBJ-057, SUBJ-059). */
export function reachWeight(b: Pick<SubjectBond, "kind" | "ties">, ownSubjects = 0): number {
  const base = b.ties.includes("held_in_fief") ? config.ties.held_in_fief.reach_weight : kinds[b.kind].reach_weight;
  if (ownSubjects <= 0) return base;
  const w = config.subjects_with_subjects;
  return base * w.reach_multiplier + ownSubjects * w.reach_per_own_subject;
}

export interface RosterEntry {
  bond: SubjectBond;
  ownSubjects: number;
  /** Distance from the overlord, for *Stretched thin* (larger = further). */
  distance: number;
}

/** Reach used: the weights of the direct subjects only (SUBJ-057, SUBJ-061). */
export function reachUsed(roster: readonly RosterEntry[]): number {
  return roster.reduce((n, e) => n + reachWeight(e.bond, e.ownSubjects), 0);
}

/**
 * *Stretched thin* arrows per subject: every subject −1 while over reach, and
 * −1 more to the furthest for each subject beyond reach (SUBJ-058).
 */
export function stretchedThin(roster: readonly RosterEntry[], reach: number): Map<string, number> {
  const out = new Map<string, number>();
  const used = reachUsed(roster);
  if (used <= reach) return out;
  const R = config.reasons.stretched_thin;
  for (const e of roster) out.set(e.bond.subject, R.arrow);
  const furthest = [...roster].sort((a, b) => b.distance - a.distance)[0];
  if (furthest) out.set(furthest.bond.subject, R.arrow + Math.ceil(used - reach) * R.per_subject_over_reach_to_furthest);
  return out;
}

/** Only the direct overlord acts on a subject (SUBJ-061, INV-SUBJ-7). */
export function mayAct(overlord: string, b: SubjectBond): boolean {
  return b.overlord === overlord || config.subjects_with_subjects.overlord_can_act_on_sub_subjects;
}

/** When a subject is folded in or falls, its subjects step up to the overlord, keeping their loyalty (SUBJ-063). */
export function stepUp(subSubjects: SubjectBond[], newOverlord: string): void {
  for (const b of subSubjects) b.overlord = newOverlord;
}

// ---------------------------------------------------------------------------
// Overlord actions (design 4)
// ---------------------------------------------------------------------------

export type ActionResult = { ok: true } | { ok: false; missing: string };

export function setTribute(b: SubjectBond, level: TributeLevel): void {
  b.tribute = level;
}

/** A gift: +1 for 5 years (SUBJ-039). How it scales with income is open (OQ-SUBJ-10). */
export function sendGift(b: SubjectBond, now: number): void {
  addReason(b, "gift", now);
}

export function stationResident(b: SubjectBond): void {
  b.resident = true;
}

/** Foreign envoys courting a subject that the overlord can see: all of them with a resident there (SUBJ-040). */
export function courtingSeen(b: SubjectBond, courting: readonly string[]): string[] {
  return b.resident ? [...courting] : [];
}

export function lendOfficial(b: SubjectBond, official: string): void {
  b.lentOfficial = official;
}

/** A hostage only from a Loyal or Wavering subject, or as a peace term (SUBJ-042). */
export function takeHostage(b: SubjectBond, asPeaceTerm = false): ActionResult {
  if (!asPeaceTerm && b.loyalty !== "loyal" && b.loyalty !== "wavering") return { ok: false, missing: "Loyal or Wavering" };
  if (!b.ties.includes("hostage_at_court")) b.ties.push("hostage_at_court");
  return { ok: true };
}

/** The heir returns when the subject's ruler dies (SUBJ-042). */
export function subjectRulerDied(b: SubjectBond): void {
  b.ties = b.ties.filter((t) => t !== "hostage_at_court");
  delete b.hostageHarmed;
}

export function harmHostage(b: SubjectBond): void {
  if (b.ties.includes("hostage_at_court")) b.hostageHarmed = true;
}

/** A marriage between the houses: the Marriage reason, and a path to a Union (SUBJ-043). */
export function arrangeMarriage(b: SubjectBond): void {
  b.marriage = true;
}

export function unionPathOpen(b: SubjectBond): boolean {
  return b.marriage === true;
}

/**
 * Tighten: only Tributary → Vassal, one envoy for 6 months, the subject Loyal;
 * a Wavering subject refuses and drops a step (SUBJ-044).
 */
export function tighten(b: SubjectBond, now: number): ActionResult {
  const order = config.tighten.order as Kind[];
  const i = order.indexOf(b.kind);
  if (i < 0 || i === order.length - 1) return { ok: false, missing: `${b.kind} cannot be tightened` };
  if (b.loyalty !== config.tighten.requires) {
    if (b.loyalty === "wavering") for (let n = 0; n < config.tighten.refusal_steps_down; n++) moveLoyalty(b, -1, now);
    return { ok: false, missing: "Loyal" };
  }
  b.tighten = { monthsLeft: config.tighten.envoy_months };
  return { ok: true };
}

/** The kind one notch tighter, if any. */
export function tighterKind(kind: Kind): Kind | undefined {
  const order = config.tighten.order as Kind[];
  const i = order.indexOf(kind);
  return i >= 0 ? order[i + 1] : undefined;
}

/** Loosen: Vassal or Protectorate → Tributary at no cost, +2 for 10 years (SUBJ-045). */
export function loosen(b: SubjectBond, now: number): ActionResult {
  const to = (config.loosen.order as Partial<Record<Kind, string>>)[b.kind];
  if (!to) return { ok: false, missing: `${b.kind} cannot be loosened` };
  b.kind = to as Kind;
  addReason(b, "loosened", now);
  return { ok: true };
}

/** Release: independent, Friendly toward the old overlord (SUBJ-046). */
export function release(_b: SubjectBond): { independent: true; stance: "friendly" } {
  return { independent: true, stance: "friendly" };
}

/**
 * Depose a subject's ruler: needs a pretender or a Disloyal ruler, and a won
 * war if In revolt; the candidate starts Loyal and every other subject gets
 * −1 for 5 years (SUBJ-047).
 */
export function depose(b: SubjectBond, others: SubjectBond[], now: number, opts: { pretender?: boolean; wonWar?: boolean } = {}): ActionResult {
  if (b.loyalty === "in_revolt" && !opts.wonWar) return { ok: false, missing: "win the war first" };
  if (!opts.pretender && b.loyalty !== "disloyal" && b.loyalty !== "in_revolt") return { ok: false, missing: "a pretender or a Disloyal ruler" };
  b.loyalty = "loyal";
  b.loyalSince = now;
  b.lastStep = { month: now, dir: 1 };
  for (const o of others) if (o !== b) addReason(o, "deposed_other_subject", now);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Folding in (design 7)
// ---------------------------------------------------------------------------

export interface FoldInContext {
  reachable: boolean;
  lordRoom: boolean;
}

/**
 * The first missing requirement to fold a subject in, or null (SUBJ-064, SUBJ-026,
 * SUBJ-024, SUBJ-048, INV-SUBJ-4). A not-Loyal subject's button names its step.
 */
export function foldInMissing(b: SubjectBond, now: number, ctx: FoldInContext): string | null {
  if (kinds[b.kind].fold_in === "tighten_first") return "tighten to vassal first";
  if (b.kind === "colony" && b.stage === "self_governing") return "a Self-governing colony is only released or kept";
  if (b.loyalty !== "loyal") return stepName(b.loyalty);
  const F = config.fold_in;
  if (b.loyalSince === null || now - b.loyalSince < F.min_loyal_years * 12) return `Loyal for the last ${F.min_loyal_years} years`;
  if (now - b.since < F.min_years_as_subject * 12) return `a subject for ${F.min_years_as_subject} years`;
  if (F.needs_path && !ctx.reachable) return "a land path or sea route";
  if (F.needs_lord_capacity && !ctx.lordRoom) return "room in lord capacity";
  return null;
}

/** Starts folding in: one envoy for 1 month per province (SUBJ-066). */
export function startFoldIn(b: SubjectBond, provinces: number, now: number, ctx: FoldInContext): ActionResult {
  const missing = foldInMissing(b, now, ctx);
  if (missing) return { ok: false, missing };
  b.foldIn = { monthsLeft: provinces * config.fold_in.envoy_months_per_province };
  return { ok: true };
}

export type EnvoyProgress = "none" | "continues" | "stopped" | "folded_in" | "tightened";

/** A month of envoy work: tighten and fold in progress; folding stops if the subject drops to Wavering (SUBJ-044, SUBJ-066). */
export function progressEnvoys(b: SubjectBond): EnvoyProgress {
  if (b.foldIn) {
    if (b.loyalty !== "loyal") {
      delete b.foldIn;
      return "stopped";
    }
    b.foldIn.monthsLeft -= 1;
    if (b.foldIn.monthsLeft <= 0) {
      delete b.foldIn;
      return "folded_in";
    }
    return "continues";
  }
  if (b.tighten) {
    b.tighten.monthsLeft -= 1;
    if (b.tighten.monthsLeft <= 0) {
      delete b.tighten;
      const next = tighterKind(b.kind);
      if (next) b.kind = next;
      return "tightened";
    }
    return "continues";
  }
  return "none";
}

export interface SubjectRealm {
  name: string;
  provinces: string[];
  lords: { name: string; provinces: string[] }[];
  buildings: string[];
  army: number;
  treasury: number;
  sharesFaithAndPeople: boolean;
}

export interface FoldedIn {
  /** One lord holding every province, its own lords merged into his card. */
  lord: { name: string; provinces: string[]; retinue: number; wealth: number; buildings: string[]; mergedLords: string[] };
  /** Provinces that become royal land at once (colonies). */
  royalLand: string[];
  foreignRuleYears: number;
}

/** What folding in does (SUBJ-067 … SUBJ-069). */
export function foldIn(b: SubjectBond, realm: SubjectRealm): FoldedIn {
  const foreignRuleYears = realm.sharesFaithAndPeople ? 0 : config.fold_in.foreign_rule_grievance_years;
  if (b.kind === "colony") {
    if (b.stage === "self_governing") throw new Error("A Self-governing colony cannot be folded in");
    return { lord: { name: "", provinces: [], retinue: 0, wealth: 0, buildings: [], mergedLords: [] }, royalLand: [...realm.provinces], foreignRuleYears };
  }
  return {
    lord: {
      name: realm.name,
      provinces: [...realm.provinces],
      retinue: realm.army,
      wealth: realm.treasury,
      buildings: [...realm.buildings],
      mergedLords: realm.lords.map((l) => l.name),
    },
    royalLand: [],
    foreignRuleYears,
  };
}

/** Merge the crowns: a Union 50 years in union and Loyal (SUBJ-070). */
export function mergeCrownsMissing(b: SubjectBond, now: number): string | null {
  if (b.kind !== "union") return "a Union";
  if (now - b.since < config.kinds.union.merge_requires_years * 12) return `${config.kinds.union.merge_requires_years} years in union`;
  if (b.loyalty !== "loyal") return stepName(b.loyalty);
  return null;
}

export interface MergedCrowns {
  provinces: string[];
  lords: { name: string; loyalty: Step }[];
  charterIn: string[];
}

export function mergeCrowns(realm: { provinces: string[]; lords: { name: string; loyalty: Step }[] }): MergedCrowns {
  return { provinces: [...realm.provinces], lords: realm.lords.map((l) => ({ ...l })), charterIn: [...realm.provinces] };
}

export type HeirlessOutcome = "inherited_and_folded_in" | "lords_pick_new_ruler" | "lapse_folded_in";

/** A subject's ruler dies without an heir (SUBJ-071 … SUBJ-073). */
export function rulerDiesWithoutHeir(b: SubjectBond, others: SubjectBond[], now: number, overlordFlags: ReadonlySet<string> = new Set()): HeirlessOutcome {
  if (overlordFlags.has("doctrine_of_lapse")) {
    for (const o of others) if (o !== b) addReason(o, "lapse_annexation", now);
    return "lapse_folded_in";
  }
  if (b.loyalty === "loyal" && (b.kind === "vassal" || b.kind === "union")) return "inherited_and_folded_in";
  return "lords_pick_new_ruler";
}

// ---------------------------------------------------------------------------
// Raising a lord (design 4.1)
// ---------------------------------------------------------------------------

/** Whether a lord can be raised: at least 3 provinces, Loyal or Wavering (SUBJ-049). */
export function raiseLordMissing(lord: { provinces: number; loyalty: Step }): string | null {
  const R = config.raise_lord;
  if (lord.provinces < R.min_provinces) return `${R.min_provinces} provinces`;
  if (!R.allowed_loyalty.includes(lord.loyalty)) return "Loyal or Wavering";
  return null;
}

/** Raises a lord to a Vassal, or a March on a frontier; a Wavering lord is *Given a crown* (SUBJ-049 … SUBJ-051). */
export function raiseLord(
  lord: { name: string; provinces: string[]; loyalty: Step; retinue: number; onFrontier: boolean },
  overlord: string,
  now: number,
): { bond: SubjectBond; country: { name: string; provinces: string[]; army: number } } | { missing: string } {
  const missing = raiseLordMissing({ provinces: lord.provinces.length, loyalty: lord.loyalty });
  if (missing) return { missing };
  const kind: Kind = lord.onFrontier ? "march" : "vassal";
  const bond = newBond({ subject: lord.name, overlord, kind, loyalty: lord.loyalty }, now);
  if (lord.loyalty === "wavering") addReason(bond, "given_a_crown", now);
  return { bond, country: { name: lord.name, provinces: [...lord.provinces], army: lord.retinue } };
}

// ---------------------------------------------------------------------------
// Obligations both ways (design 5)
// ---------------------------------------------------------------------------

/** Whether the overlord owes defence against this attacker (SUBJ-011, SUBJ-052). */
export function owesDefence(b: SubjectBond, attacker: string): boolean {
  const owes = kinds[b.kind].overlord_owes;
  if (owes.includes("defence")) return true;
  if (owes.includes("defence_except_from_overlord")) return attacker !== b.overlord;
  return false;
}

/** The overlord answers or refuses a subject's call for defence (SUBJ-052). */
export function answerDefence(b: SubjectBond, others: SubjectBond[], answers: boolean, now: number): { oathBroken: boolean } {
  if (answers) {
    addReason(b, "defended", now);
    return { oathBroken: false };
  }
  addReason(b, "left_alone", now);
  for (const o of others) if (o !== b) addReason(o, "left_other_subject_alone", now);
  return { oathBroken: true };
}

/** A year ends: a March whose stipend was not paid gets −1 (SUBJ-053). */
export function yearEndStipend(b: SubjectBond, paid: boolean, now: number): void {
  if (b.kind === "march" && !paid) addReason(b, "missed_stipend", now);
}

/** A Union shares every war of its ruler (SUBJ-054). */
export function sharesOverlordWars(b: SubjectBond): boolean {
  return kinds[b.kind].overlord_owes.includes("shared_ruler");
}

/** Two subjects at odds may not fight without leave; the overlord sides or forbids (SUBJ-055). */
export function judgeQuarrel(a: SubjectBond, b: SubjectBond, decision: { sideWith: SubjectBond } | "forbid", now: number): void {
  if (decision === "forbid") {
    addReason(a, "quarrel_forbidden", now);
    addReason(b, "quarrel_forbidden", now);
    return;
  }
  const loser = decision.sideWith === a ? b : a;
  moveLoyalty(loser, -1, now);
}

/** Subjects of one overlord may not attack each other without its leave (SUBJ-055). */
export function mayAttackFellowSubject(attacker: SubjectBond, target: SubjectBond, leave: boolean): boolean {
  return attacker.overlord !== target.overlord || leave;
}

// ---------------------------------------------------------------------------
// Losing subjects (design 8)
// ---------------------------------------------------------------------------

export interface RisingContext {
  backer?: { atPeace: boolean; willing: boolean };
  overlordAtWarElsewhere?: boolean;
  /** Share of the overlord's peace voices for peace. */
  overlordPeaceShare?: number;
  eventSaysRise?: boolean;
}

/** Whether a Disloyal subject rises now (SUBJ-076). */
export function rises(b: SubjectBond, ctx: RisingContext): boolean {
  if (b.loyalty !== "disloyal") return false;
  if (ctx.eventSaysRise) return true;
  if (ctx.backer && ctx.backer.atPeace && ctx.backer.willing) return true;
  return !!ctx.overlordAtWarElsewhere && (ctx.overlordPeaceShare ?? 0) > config.rising.overlord_losing_peace_voice_share;
}

/** Other Disloyal subjects of the same overlord that border it or share its backer rise too (SUBJ-075). */
export function joinRising(
  risen: { bond: SubjectBond; neighbours: ReadonlySet<string> },
  others: readonly { bond: SubjectBond; neighbours: ReadonlySet<string> }[],
): SubjectBond[] {
  if (!config.rising.disloyal_neighbours_join) return [];
  return others
    .filter((o) => o.bond !== risen.bond && o.bond.overlord === risen.bond.overlord && o.bond.loyalty === "disloyal")
    .filter((o) => risen.neighbours.has(o.bond.subject) || o.neighbours.has(risen.bond.subject) || (!!risen.bond.backer && o.bond.backer === risen.bond.backer))
    .map((o) => o.bond);
}

export interface IndependenceWar {
  rebel: string;
  overlord: string;
  warAim: "Independence";
  rebelSide: string[];
}

/** A subject rises: In revolt, the Subject relation ends, the independence war starts with its backer (SUBJ-077). */
export function rise(b: SubjectBond, now: number): IndependenceWar {
  setLoyalty(b, "in_revolt", now);
  return { rebel: b.subject, overlord: b.overlord, warAim: "Independence", rebelSide: [b.subject, ...(b.backer ? [b.backer] : [])] };
}

export type OverlordPeace = { restoreAs?: Kind; foldInAtOnce: boolean };

/** What the overlord's peace may do after it wins (SUBJ-078). */
export function overlordWinsIndependenceWar(b: SubjectBond, sharesBorder: boolean): OverlordPeace {
  const tighter = tighterKind(b.kind);
  return { ...(tighter ? { restoreAs: tighter } : {}), foldInAtOnce: sharesBorder };
}

/** The subject wins: independent, Hostile toward the old overlord (SUBJ-079). */
export function subjectWinsIndependenceWar(_b: SubjectBond): { independent: true; stance: "hostile" } {
  return { independent: true, stance: "hostile" };
}

export type FallFate = "free" | "to_capital_taker";

/** When the overlord is destroyed or becomes a subject (SUBJ-082). */
export function fateWhenOverlordFalls(kind: Kind, takerWants: boolean): FallFate {
  if (kind === "tributary" || kind === "march") return "free";
  return takerWants ? "to_capital_taker" : "free";
}

// ---------------------------------------------------------------------------
// Making subjects (design 9)
// ---------------------------------------------------------------------------

/** Peace term *Become a subject* (SUBJ-083): over three quarters peace voices; kind by era and path. */
export function becomeSubjectAllowed(t: { kind: Kind; era: string; landPath: boolean; overseasTradeEmpire?: boolean; peaceShare: number }): boolean {
  if (t.peaceShare <= 0.75) return false;
  if (t.kind === "protectorate") return protectorateAllowed(t.era, t.overseasTradeEmpire ?? false);
  if (t.kind === "tributary") return true;
  if (t.kind === "vassal") return t.landPath;
  return false;
}

/** After 20 years of tribute, the payer accepts Tributary if weaker (SUBJ-084). */
export function acceptsTributaryOffer(yearsPaid: number, payerStrength: number, receiverStrength: number): boolean {
  return yearsPaid >= 20 && payerStrength < receiverStrength;
}

/** A seated pretender's realm: the winner's Vassal (or ally), its ruler Loyal (SUBJ-085). */
export function seatPretender(realm: string, winner: string, pick: "vassal" | "ally", now: number): SubjectBond | "ally" {
  return pick === "ally" ? "ally" : newBond({ subject: realm, overlord: winner, kind: "vassal", loyalty: "loyal" }, now);
}

/** An inherited crown arrives as a Union (SUBJ-087). */
export function inheritCrown(inherited: string, heir: string, now: number): SubjectBond {
  return newBond({ subject: inherited, overlord: heir, kind: "union" }, now);
}

/** A frontier grant makes a chief who is nobody's subject and shares a border a March (SUBJ-088). */
export function frontierGrant(chief: { name: string; overlord: string | null; bordersGrantor: boolean }, grantor: string, gift: boolean, now: number): SubjectBond | null {
  if (chief.overlord !== null || !chief.bordersGrantor || !gift) return null;
  return newBond({ subject: chief.name, overlord: grantor, kind: "march" }, now);
}

/** Colonial provinces in one distant region chartered as one Colony (SUBJ-089). */
export function charterColony(overlord: string, provinces: readonly { id: string; region: string }[], name: string, now: number): SubjectBond | null {
  const regions = new Set(provinces.map((p) => p.region));
  if (provinces.length === 0 || regions.size !== 1) return null;
  return foundColony(name, overlord, now);
}

/** Event `vassalize` types onto kinds (SUBJ-015). */
export function kindFromEventType(type: string): { kind: Kind; stage?: ColonyStage } {
  const m = (config.mapping_1444.event_vassalize_type as Record<string, string | string[]>)[type];
  if (!m) throw new Error(`Unknown vassalize type: ${type}`);
  if (Array.isArray(m)) return { kind: m[0] as Kind, stage: m[1] as ColonyStage };
  return { kind: m as Kind };
}

/** An event creates a subject: `vassalize`, `create_country … subject_of` (Self-governing colony unless named) or `relation personal_union` (SUBJ-090). */
export function subjectFromEvent(
  e: { key: "vassalize"; type: string } | { key: "create_country"; kind?: Kind } | { key: "personal_union" },
  subject: string,
  overlord: string,
  now: number,
): SubjectBond {
  if (e.key === "personal_union") return newBond({ subject, overlord, kind: "union" }, now);
  if (e.key === "create_country") {
    if (e.kind) return newBond({ subject, overlord, kind: e.kind }, now);
    return newBond({ subject, overlord, kind: "colony", stage: "self_governing" }, now);
  }
  const k = kindFromEventType(e.type);
  return newBond({ subject, overlord, kind: k.kind, ...(k.stage ? { stage: k.stage } : {}) }, now);
}

// ---------------------------------------------------------------------------
// The 1444 data (design 2.2, 3.2, 7)
// ---------------------------------------------------------------------------

export type Mapped = { kind: Kind; ties: Tie[] } | { lord: true };

/** Relations `subject_kind` onto kinds and ties; estates become lords (SUBJ-014). */
export function mapRelationKind(subjectKind: string, overlordIsReligiousHead: boolean): Mapped {
  const m = (config.mapping_1444.relations_subject_kind as Record<string, string | string[]>)[subjectKind];
  if (m === undefined) throw new Error(`Unknown subject_kind: ${subjectKind}`);
  if (m === "lord") return { lord: true };
  if (typeof m === "string") return { kind: m as Kind, ties: [] };
  const [kind, tie] = m as [string, string];
  if (tie === "kin") return { kind: kind as Kind, ties: ["kin"] };
  return { kind: kind as Kind, ties: [overlordIsReligiousHead ? "held_of_the_church" : "held_in_fief"] };
}

export interface Record1444 {
  subject: string;
  overlord: string;
  subjectKind: string;
  autonomy: Autonomy;
  startDate: string | null;
}

export function records1444(): Record1444[] {
  return (data1444.subjects as (string | null)[][]).map(([subject, overlord, subjectKind, autonomy, startDate]) => ({
    subject: subject!,
    overlord: overlord!,
    subjectKind: subjectKind!,
    autonomy: autonomy as Autonomy,
    startDate: startDate ?? null,
  }));
}

export function isReligiousHead(country: string): boolean {
  return data1444.religious_heads.includes(country);
}

export function hostileIn1444(subject: string, overlord: string): boolean {
  return (data1444.stances as string[][]).some(([s, t, type]) => s === subject && t === overlord && type === "hostile");
}

export const PLAYABLE_SUBJECTS: readonly string[] = data1444.playable_subjects;

/**
 * The 1444 start (SUBJ-003, SUBJ-014, SUBJ-016, SUBJ-036, SUBJ-065): each
 * record becomes a subject of its mapped kind, or a lord when it is an estate
 * or has no nation on the map.
 */
export function start1444(
  records: readonly Record1444[],
  opts: { isMapNation: (id: string) => boolean; startMonth: number; startYear: number },
): { bonds: SubjectBond[]; lords: { name: string; overlord: string; fromCatalogue: true }[] } {
  const bonds: SubjectBond[] = [];
  const lords: { name: string; overlord: string; fromCatalogue: true }[] = [];
  for (const rec of records) {
    const mapped = mapRelationKind(rec.subjectKind, isReligiousHead(rec.overlord));
    if ("lord" in mapped || !opts.isMapNation(rec.subject)) {
      lords.push({ name: rec.subject, overlord: rec.overlord, fromCatalogue: true });
      continue;
    }
    const loyalty = startLoyalty1444(rec.autonomy, hostileIn1444(rec.subject, rec.overlord));
    const held = heldAtStart(rec.startDate, opts.startYear, loyalty === "loyal");
    bonds.push({
      ...newBond({ subject: rec.subject, overlord: rec.overlord, kind: mapped.kind, ties: mapped.ties, loyalty }, opts.startMonth),
      since: opts.startMonth - held.yearsHeld * 12,
      loyalSince: loyalty === "loyal" ? opts.startMonth - held.yearsLoyal * 12 : null,
    });
  }
  return { bonds, lords };
}

// ---------------------------------------------------------------------------
// AI (design 11.2)
// ---------------------------------------------------------------------------

export type OverlordAiAction = { act: "fold_in" | "loosen" | "station_resident"; subject: string } | { act: "none" };

/** One AI overlord decision (SUBJ-098). */
export function aiOverlord(o: {
  subjects: readonly { bond: SubjectBond; foldInReady: boolean; size: number }[];
  likesCentralising: boolean;
  atWarElsewhere: boolean;
  freeEnvoy: boolean;
}): OverlordAiAction {
  if (o.likesCentralising) {
    const ready = o.subjects.find((x) => x.bond.loyalty === "loyal" && x.foldInReady);
    if (ready) return { act: "fold_in", subject: ready.bond.subject };
  }
  if (o.atWarElsewhere) {
    const disloyal = o.subjects.find((x) => x.bond.loyalty === "disloyal" && config.loosen.order[x.bond.kind as keyof typeof config.loosen.order]);
    if (disloyal) return { act: "loosen", subject: disloyal.bond.subject };
  }
  if (o.freeEnvoy) {
    const big = [...o.subjects].filter((x) => x.bond.loyalty === "wavering" && !x.bond.resident).sort((a, b) => b.size - a.size)[0];
    if (big) return { act: "station_resident", subject: big.bond.subject };
  }
  return { act: "none" };
}

/** An AI overlord never takes a subject that would put reach used more than 1 over its reach (SUBJ-098). */
export function aiAcceptsNewSubject(used: number, reach: number, weight: number): boolean {
  return used + weight <= reach + 1;
}

export type SubjectAiAction = "rise" | "wait" | "seek_backer";

/** One AI subject decision while Disloyal (SUBJ-099). */
export function aiSubject(s: { personality: "opportunist" | "cautious"; overlordLosing: boolean; hasBacker: boolean; neighboursReady?: boolean }): SubjectAiAction {
  if (s.personality === "opportunist" && s.overlordLosing) return "rise";
  if (!s.hasBacker) return s.overlordLosing ? "wait" : "seek_backer";
  return s.neighboursReady ? "rise" : "wait";
}

/** A Loyal subject asks politely to loosen; the AI overlord grants it if cautious or over reach (SUBJ-103). */
export function grantsLoosenAsk(b: SubjectBond, overlord: { cautious: boolean; overReach: boolean }): boolean {
  return b.loyalty === "loyal" && (overlord.cautious || overlord.overReach);
}

// ---------------------------------------------------------------------------
// On screen (design 10)
// ---------------------------------------------------------------------------

export interface SubjectRow {
  icon: string;
  name: string;
  loyalty: string;
  arrows: string;
  pays: string;
  worst: string;
}

/** One row of the subjects list (SUBJ-091). */
export function subjectRow(b: SubjectBond, reasons: readonly Reason[], paysGold: number): SubjectRow {
  const a = arrows(reasons);
  return {
    icon: kindIcon(b.kind),
    name: b.subject,
    loyalty: stepName(b.loyalty),
    arrows: `▲${a.up} ▼${a.down}`,
    pays: `pays ${Math.round(paysGold)}`,
    worst: worstReason(reasons)?.label ?? "",
  };
}

/** The subjects list: header and rows sorted by loyalty, worst first (SUBJ-091). */
export function subjectsList(
  rows: readonly { bond: SubjectBond; reasons: readonly Reason[]; paysGold: number }[],
  header: { used: number; reach: number; gold: number; grain: number },
): { header: string; tribute: string; rows: SubjectRow[] } {
  const sorted = [...rows].sort((x, y) => STEPS.indexOf(y.bond.loyalty) - STEPS.indexOf(x.bond.loyalty));
  return {
    header: `SUBJECTS ${header.used} of ${header.reach} reach`,
    tribute: `Tribute ${header.gold} gold / ${header.grain} grain a month`,
    rows: sorted.map((x) => subjectRow(x.bond, x.reasons, x.paysGold)),
  };
}

/** The subject's mark at region zoom: kind icon, frame tinted by loyalty (SUBJ-094). */
export function regionMark(b: SubjectBond): { icon: string; tint: string } {
  return { icon: kindIcon(b.kind), tint: (config.loyalty.tint_by_step as Record<string, string>)[b.loyalty]! };
}

/** The action buttons on a subject's card for an overlord; none for anyone but the direct overlord (SUBJ-048, SUBJ-061). */
export function cardButtons(viewer: string, b: SubjectBond, now: number, ctx: FoldInContext): { action: string; locked: string | null }[] {
  if (!mayAct(viewer, b)) return [];
  return [
    { action: "Set tribute", locked: null },
    { action: "Gift", locked: null },
    { action: "Resident", locked: null },
    { action: "Marriage", locked: null },
    { action: "Call to war", locked: kinds[b.kind].fights === "never" ? "never called" : null },
    { action: "Fold in", locked: foldInMissing(b, now, ctx) },
  ];
}
