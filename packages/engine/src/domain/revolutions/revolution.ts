import type { Rng } from "../../rng.ts";
import * as E from "../events/index.ts";
import * as R from "../rebellions/index.ts";
import { family, revolution, revolutions, revolutionsConfig, roleOf, type Revolution, type Sign, type Stance } from "./model.ts";
import { grievancesIn, hasFlag, holding, provincesOf, trackOf, type RevoState, type Stage, type TaggedRising, type Track } from "./state.ts";

/**
 * A revolution in one country (REVO-001 … REVO-038): the card and its signs,
 * the stages, the roll once Ready, the stances, the tagged rising and its
 * settlement, and the re-arm of a stopped revolution.
 */

export function eventOf(r: RevoState, id: string): E.EventDef {
  const ev = r.es.events[id];
  if (!ev) throw new Error(`No event for the revolution ${id}`);
  return ev;
}

/** The roles of a revolution bound to one country: its own role to it, the others to their historical holders. */
export function rolesFor(r: RevoState, id: string, country: string): Record<string, string[]> {
  const rev = revolution(id);
  const ev = eventOf(r, id);
  const out: Record<string, string[]> = {};
  for (const [n, role] of Object.entries(ev.roles)) out[n] = n === roleOf(rev) ? [country] : [...role.historical];
  return out;
}

export function ctxFor(r: RevoState, roles: Record<string, string[]>): E.EffectCtx {
  return { roles, ...(r.es.conditions ? { conditions: r.es.conditions } : {}), ...(r.es.effects ? { effects: r.es.effects } : {}) };
}

function holdsFor(r: RevoState, c: E.Condition, roles: Record<string, string[]>): boolean {
  return E.holdsIfBound(c, r.es.world, ctxFor(r, roles)) === true;
}

export function requirementsHold(r: RevoState, id: string, country: string): boolean {
  const roles = rolesFor(r, id, country);
  return revolution(id).requirements.every((c) => holdsFor(r, c, roles));
}

/** Each sign and whether it is lit (REVO-011). */
export function signs(r: RevoState, id: string, country: string): { sign: Sign; lit: boolean }[] {
  const roles = rolesFor(r, id, country);
  return (revolution(id).signs?.list ?? []).map((sign) => ({ sign, lit: holdsFor(r, sign.if, roles) }));
}
export function litCount(r: RevoState, id: string, country: string): number {
  return signs(r, id, country).filter((x) => x.lit).length;
}

/** Whether the reaction regime lowers `need` now (REVO-051). */
export function underReaction(r: RevoState, country: string): boolean {
  const h = holding(r, country);
  const at = h.appliedAt.reaction;
  return h.regime === "reaction" && at !== undefined && E.now(r.es.world) - at < revolutionsConfig.reaction.years * 12;
}

/** Signs needed to break out: the data's `need`, one fewer under the reaction (REVO-051). */
export function needFor(r: RevoState, id: string, country: string): number {
  const need = revolution(id).signs?.need ?? 0;
  return underReaction(r, country) ? Math.max(1, need - revolutionsConfig.reaction.need_reduction) : need;
}

/** "4 of 6", or "its existing trigger" for a keep_trigger revolution (REVO-017, catalogue). */
export function threshold(rev: Revolution, need = rev.signs?.need ?? 0): string {
  return rev.keep_trigger || !rev.signs ? "its existing trigger" : `${need} of ${rev.signs.list.length}`;
}

// ---------------------------------------------------------------- the card (REVO-001 … REVO-006)

export type Colour = "neutral" | "amber" | "red";

export interface Card {
  revolution: string;
  country: string;
  shown: boolean;
  stage: Stage;
  title: string;
  /** "Breaks out at 4 of 6 signs". */
  breaksOut: string;
  /** Lit signs first, then dark ones, each with its ease hint (REVO-003). */
  signs: { label: string; ease: string; lit: boolean }[];
  lit: number;
  need: number;
  warnAt: number;
  colour: Colour;
  /** Sparks with their multipliers, "label x2" (REVO-006). */
  sparks: string[];
  /** "Stopped, not solved" on a re-armed revolution (REVO-032). */
  status?: string;
  /** "may break out any month" once red (REVO-007). */
  readyLine?: string;
}

export function colourOf(lit: number, warnAt: number, need: number): Colour {
  return lit >= need ? "red" : lit >= warnAt ? "amber" : "neutral";
}

export function card(r: RevoState, id: string, country: string): Card {
  const rev = revolution(id);
  const t = trackOf(r, id, country);
  const list = signs(r, id, country);
  const lit = list.filter((x) => x.lit).length;
  const need = needFor(r, id, country);
  const warnAt = Math.min(rev.signs?.warn_at ?? need, need);
  const req = requirementsHold(r, id, country);
  const colour = colourOf(lit, warnAt, need);
  const ordered = [...list.filter((x) => x.lit), ...list.filter((x) => !x.lit)];
  return {
    revolution: id,
    country,
    shown: req && (lit > 0 || t.rearmed),
    stage: t.stage,
    title: (eventOf(r, id).name ?? id).toUpperCase(),
    breaksOut: rev.keep_trigger ? "Breaks out at its existing trigger" : `Breaks out at ${threshold(rev, need)} signs`,
    signs: ordered.map((x) => ({ label: x.sign.label, ease: x.sign.ease, lit: x.lit })),
    lit,
    need,
    warnAt,
    colour,
    sparks: rev.sparks.map((s) => `${s.label} x${s.mult}`),
    ...(t.rearmed ? { status: revolutionsConfig.card.stopped_label } : {}),
    ...(colour === "red" && req ? { readyLine: revolutionsConfig.card.ready_line } : {}),
  };
}

// ---------------------------------------------------------------- stages (REVO-007 … REVO-009)

const AFTER_OUTBREAK: Stage[] = ["Outbreak", "Struggle"];

/** Sets the stage from requirements and signs; later stages follow the event (REVO-007). */
export function evaluate(r: RevoState, id: string, country: string): Track {
  const t = trackOf(r, id, country);
  const at = E.now(r.es.world);
  if (AFTER_OUTBREAK.includes(t.stage) || t.stage === "Aftermath") return t;
  if (t.stage === "Settlement") {
    if (t.settledAt === undefined || at <= t.settledAt) return t;
    if (!t.rearmed) return setStage(r, t, "Aftermath");
  }
  const req = requirementsHold(r, id, country);
  const lit = litCount(r, id, country);
  const need = needFor(r, id, country);
  const stage: Stage = !req || lit === 0 ? "Quiet" : lit < need ? "Brewing" : "Ready";
  if (stage === "Ready" && t.stage !== "Ready") t.readySince = at;
  if (stage !== "Ready") {
    if (t.stage === "Ready" && t.rearmed) r.log.push({ type: "RevolutionDisarmed", country, revolution: id });
    delete t.readySince;
  }
  return setStage(r, t, stage);
}

function setStage(r: RevoState, t: Track, stage: Stage): Track {
  if (t.stage !== stage) r.log.push({ type: "RevolutionStageChanged", country: t.country, revolution: t.revolution, stage });
  t.stage = stage;
  return t;
}

/** Countries a revolution is followed in: every existing country of the world. */
export function countriesOf(r: RevoState): string[] {
  return Object.entries(r.es.world.countries)
    .filter(([, c]) => c.exists !== false)
    .map(([k]) => k);
}

/** Step 1 of the monthly steps: every revolution in every country. */
export function evaluateAll(r: RevoState): void {
  for (const id of Object.keys(revolutions)) if (r.es.events[id]) for (const c of countriesOf(r)) evaluate(r, id, c);
}

export type Blocked = E.Ineligible | "not ready" | "same month" | "grace";

/** Why a revolution cannot break out now, or null (REVO-008, REVO-016, REVO-033, INV-REVO-8). */
export function whyNot(r: RevoState, id: string, country: string): Blocked | null {
  const ev = eventOf(r, id);
  const g = E.gate(r.es, ev);
  if (g) return g;
  const roles = rolesFor(r, id, country);
  const rep = E.repeatBlocks(r.es, ev, roles);
  if (rep) return rep;
  const t = trackOf(r, id, country);
  const at = E.now(r.es.world);
  if (revolution(id).keep_trigger) return holdsFor(r, ev.trigger, roles) ? null : "trigger";
  if (t.stage !== "Ready") return "not ready";
  if (t.readySince === undefined || t.readySince >= at) return "same month";
  if (t.rearmed && t.rearmedAt !== undefined && at - t.rearmedAt < revolution(id).rearm.grace_years * 12) return "grace";
  return null;
}
export function mayBreakOut(r: RevoState, id: string, country: string): boolean {
  return whyNot(r, id, country) === null;
}

/** The monthly chance once Ready: the event's selection with its sparks (REVO-007, REVO-034). */
export function chance(r: RevoState, id: string, country: string): ReturnType<typeof E.poolChance> {
  return E.poolChance(r.es, eventOf(r, id), rolesFor(r, id, country));
}

/**
 * The revolutions' monthly step (spec 9), run in the turn in which a new month begins (X-18): evaluate signs and
 * stages, roll Ready revolutions through the event's selection, then the
 * event ticks (delayed regimes). The caller advances the calendar.
 */
export function processMonth(r: RevoState, rng: Rng): E.DomainEvent[] {
  const from = r.log.length;
  for (const id of Object.keys(revolutions)) {
    if (!r.es.events[id]) continue;
    for (const c of countriesOf(r)) {
      evaluate(r, id, c);
      if (!mayBreakOut(r, id, c)) continue;
      const roll = chance(r, id, c);
      r.log.push({ type: "RevolutionRolled", country: c, revolution: id, chance: roll.chance });
      if (rng.next() >= roll.chance || !E.underPacingCap(r.es, c)) continue;
      r.es.poolFired[`${c}:${r.es.world.year}`] = (r.es.poolFired[`${c}:${r.es.world.year}`] ?? 0) + 1;
      breakOut(r, id, c, rng);
    }
  }
  E.tick(r.es);
  return r.log.slice(from);
}

// ---------------------------------------------------------------- outbreak and stances (REVO-018 … REVO-025)

export interface StanceOption {
  id: string;
  stance: Stance;
  /** The family's label for lead, bend and fight (REVO-025). */
  label: string;
  historical: boolean;
}

export function stanceLabel(id: string, stance: Stance): string {
  const labels = family(revolution(id).family).stance_labels as Record<string, string>;
  return labels[stance] ?? revolutionsConfig.reference.stances.path;
}

/** The options of a revolution event with their stances and labels (REVO-018, REVO-025). */
export function stanceOptions(r: RevoState, id: string, roles?: Record<string, string[]>): StanceOption[] {
  const rev = revolution(id);
  const ev = eventOf(r, id);
  const opts = roles ? E.visibleOptions(r.es, ev, roles) : ev.options;
  return opts.map((o) => {
    const stance = rev.stances[o.id] ?? "path";
    return { id: o.id, stance, label: stanceLabel(id, stance), historical: o.historical === true };
  });
}

function regimesIn(list: E.Effect[] | undefined): string[] {
  return (list ?? []).flatMap((e) => {
    const g = (e as { regime?: { id: string } }).regime;
    return g ? [g.id] : [];
  });
}

export interface Preview {
  option: string;
  stance: Stance;
  label: string;
  regimes: string[];
  rising: boolean;
  won: string[];
  crushed: string[];
}

/** "What happens if it breaks out": each stance and the regime it leads to (REVO-005). */
export function preview(r: RevoState, id: string): Preview[] {
  const ev = eventOf(r, id);
  return stanceOptions(r, id).map((s) => {
    const o = ev.options.find((x) => x.id === s.id)!;
    return {
      option: s.id,
      stance: s.stance,
      label: s.label,
      regimes: [...regimesIn(o.effects.immediate), ...regimesIn(o.effects.delayed)],
      rising: raisesTaggedRebels(o, id),
      won: regimesIn(o.effects.rising_won),
      crushed: regimesIn(o.effects.rising_crushed),
    };
  });
}

/** Whether an option raises rebels tagged with the revolution (INV-REVO-2). */
export function raisesTaggedRebels(o: E.OptionDef, id: string): boolean {
  return (o.effects.immediate ?? []).some((e) => (e as { rebels?: { revolution?: string } }).rebels?.revolution === id);
}

/** AI weights: the event's own × 3 for the historical option (REVO-071). */
export function aiWeights(r: RevoState, id: string, roles: Record<string, string[]>): { option: string; weight: number }[] {
  const ev = eventOf(r, id);
  return E.visibleOptions(r.es, ev, roles).map((o) => ({ option: o.id, weight: E.aiWeight(r.es, o, roles) * (o.historical ? revolutionsConfig.ai.historical_mult : 1) }));
}

/** The event fires: Outbreak; a human chooser gets it queued, the AI answers at once (REVO-007, REVO-036). */
export function breakOut(r: RevoState, id: string, country: string, rng?: Rng): { queued: boolean; option?: string } {
  const ev = eventOf(r, id);
  const roles = rolesFor(r, id, country);
  const t = trackOf(r, id, country);
  E.fire(r.es, ev, roles);
  t.times += 1;
  setStage(r, t, "Outbreak");
  r.log.push({ type: "RevolutionBrokeOut", country, revolution: id, ...(ev.music ? { music: ev.music } : {}) });
  const controller = E.controllerOf(ev, roles);
  if ((controller && r.es.world.countries[controller]?.human) || !rng) return { queued: true };
  const ws = aiWeights(r, id, roles);
  const pick = E.pickWeighted(ws, ws.map((x) => x.weight), rng.next());
  takeOption(r, id, country, pick.option);
  return { queued: false, option: pick.option };
}

const CAUSES: Record<string, R.Cause> = { hunger: "Hunger", tax: "Tax", faith: "Faith", homeland: "Homeland", town: "Town", lord: "Lord", pretender: "Pretender", new_ideas: "New ideas" };

/**
 * The chooser takes an option (REVO-019 … REVO-023): its effects apply
 * through the event engine; a Fight raises a tagged rising (Struggle); an
 * option listed under `rearm.after` as chosen re-arms; a regime is Aftermath.
 */
export function takeOption(r: RevoState, id: string, country: string, optionId: string): { applied: E.Applied[]; risings: TaggedRising[] } {
  const rev = revolution(id);
  const ev = eventOf(r, id);
  const roles = rolesFor(r, id, country);
  const t = trackOf(r, id, country);
  const w = r.es.world;
  const before = w.rebels.length;
  const applied = E.answer(r.es, ev, roles, optionId);
  t.option = optionId;
  const raised = w.rebels.slice(before).filter((x) => x.revolution === id);
  const risings = raised.map((x, i) => raiseTagged(r, id, country, optionId, roles, x.on, i));
  if (risings.length) setStage(r, t, "Struggle");
  else if (rev.rearm.after[optionId] === "chosen") rearm(r, id, country);
  else {
    // A regime applied now or later (after_years): the revolution won its way (REVO-022, REVO-023).
    setStage(r, t, "Aftermath");
    const o = ev.options.find((x) => x.id === optionId)!;
    if (applied.some((a) => a.type === "regime") || regimesIn(o.effects.delayed).length) r.log.push({ type: "RevolutionWon", country, revolution: id });
  }
  return { applied, risings };
}

function raiseTagged(r: RevoState, id: string, country: string, option: string, roles: Record<string, string[]>, on: string, n: number): TaggedRising {
  const rev = revolution(id);
  const province = provincesOf(r, on)[0] ?? on;
  const funded = hasFlag(r, country, revolutionsConfig.reference.foreign_backing.flag);
  const rising = R.newRising(`${id}:${country}:${n}`, CAUSES[rev.cause] ?? "New ideas", province, { reason: id, cardShown: true });
  const tagged: TaggedRising = { revolution: id, country, option, roles, rising, castles: [], ...(funded ? { funded } : {}) };
  r.risings.push(tagged);
  r.log.push({ type: "RevolutionRisingRaised", country, revolution: id, rising: rising.id });
  return tagged;
}

/**
 * A tagged rising won or was beaten (REVO-021, REVO-024): Settlement; the
 * option's `rising_won` or `rising_crushed` applies; a crushed rising leaves
 * *Bloodshed* and re-arms when listed.
 */
export function settle(r: RevoState, tagged: TaggedRising, outcome: "won" | "crushed"): E.Applied[] {
  const { revolution: id, country, option, roles } = tagged;
  const rev = revolution(id);
  const ev = eventOf(r, id);
  const o = ev.options.find((x) => x.id === option);
  if (!o) throw new Error(`${id} has no option ${option}`);
  tagged.rising.ended = outcome === "won" ? "won" : "scattered";
  const out = E.applyEffects(outcome === "won" ? o.effects.rising_won : o.effects.rising_crushed, r.es.world, ctxFor(r, roles));
  if (outcome === "crushed") {
    for (const p of new Set([...tagged.rising.provinces, ...provincesOf(r, country)])) {
      const g = grievancesIn(r, p);
      if (!g.includes("bloodshed")) g.push("bloodshed");
    }
  }
  const t = trackOf(r, id, country);
  t.outcome = outcome;
  t.settledAt = E.now(r.es.world);
  setStage(r, t, "Settlement");
  r.risings = r.risings.filter((x) => x !== tagged);
  r.log.push({ type: "RevolutionSettled", country, revolution: id, outcome });
  if (outcome === "crushed" && rev.rearm.after[option] === "rising_crushed") rearm(r, id, country, false);
  return out;
}

/** Re-arms a stopped revolution: card up "Stopped, not solved", grace period running (REVO-032, REVO-033). */
export function rearm(r: RevoState, id: string, country: string, reevaluate = true): Track {
  const t = trackOf(r, id, country);
  t.rearmed = true;
  t.rearmedAt = E.now(r.es.world);
  r.log.push({ type: "RevolutionRearmed", country, revolution: id, graceEnds: t.rearmedAt + revolution(id).rearm.grace_years * 12 });
  if (reevaluate) {
    t.stage = "Quiet";
    evaluate(r, id, country);
  }
  return t;
}

/** A re-armed revolution whose signs fell below need is disarmed (REVO-035). */
export function disarmed(r: RevoState, id: string, country: string): boolean {
  const t = trackOf(r, id, country);
  return t.rearmed && t.stage !== "Ready";
}
