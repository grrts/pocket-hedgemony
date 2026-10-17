import * as E from "../events/index.ts";
import * as G from "../government/index.ts";
import { compileSelection, compileTrigger, decrees, families, regimes, revolutionEvents, revolutions, revolutionsConfig, type Decree, type Family, type Regime, type Revolution, type RevolutionEvent } from "./model.ts";
import { raisesTaggedRebels, threshold } from "./revolution.ts";

/**
 * The revolution layer's build (REVO-010, REVO-017, REVO-066, REVO-080):
 * validate families, regimes against the government forms, decrees, sign
 * leaves and stances; compile triggers and selection; merge into a scratch
 * copy of the event tree and run its validator; write the catalogue, the
 * runtime data and the patch. The event tree itself is never edited.
 */

export const NEW_CONDITIONS = ["grievance", "class_share", "lords", "war_lost"];
export const NEW_EFFECTS = ["regime", "lock"];
/** Flags the layer adds to the event tree's system flags (OQ-REVO-15). */
export const NEW_FLAGS = ["revolutionary_regime", "emigre_court", "reaction_regime", "revolution_funded"];
const STANCES = ["lead", "bend", "fight", "path"];

export interface LayerInput {
  families: Record<string, Family>;
  regimes: Record<string, Regime>;
  decrees: Record<string, Decree>;
  revolutions: Record<string, Revolution>;
  events: Record<string, RevolutionEvent>;
}

export function defaultLayer(): LayerInput {
  return E.clone({ families, regimes, decrees, revolutions, events: revolutionEvents });
}

export interface CatalogueRow {
  event: string;
  name: string;
  family: string;
  years: string;
  threshold: string;
  isNew: boolean;
}

export interface LayerBuild {
  counts: { revolutions: number; regimes: number; decrees: number; families: number };
  errors: string[];
  /** The patch: each revolution event with its compiled trigger and selection. */
  patch: Record<string, E.EventDef>;
  /** The scratch copy of the event tree with the patch merged in. */
  merged: Record<string, E.EventDef>;
  /** The event tree's validator on the merged copy. */
  treeReport: E.BuildReport;
  catalogue: CatalogueRow[];
  runtime: { families: Record<string, Family>; regimes: Record<string, Regime>; decrees: Record<string, Decree>; revolutions: Record<string, Revolution> };
  newEvents: string[];
  extended: string[];
  /** The event tree's events were left as they were. */
  treeUntouched: boolean;
  checked: string[];
}

function formOk(f: string | undefined): boolean {
  return f === undefined || f === "keep" || f === "old_form" || G.isFormId(f);
}

/** Validates the layer (REVO-080): every error names its item. */
export function validateLayer(l: LayerInput): string[] {
  const errors: string[] = [];
  const conds = new Set([...E.DECLARED_CONDITIONS, ...NEW_CONDITIONS]);
  const actions = Object.keys(revolutionsConfig.reference.actions);
  for (const [id, f] of Object.entries(l.families)) {
    for (const s of ["lead", "bend", "fight"]) if (!(f.stance_labels as Record<string, string>)[s]) errors.push(`family ${id}: no ${s} label`);
  }
  for (const [id, g] of Object.entries(l.regimes)) {
    if (!formOk(g.form)) errors.push(`regime ${id}: unknown form ${g.form}`);
    if (g.form_before_g14 && !G.isFormId(g.form_before_g14)) errors.push(`regime ${id}: unknown form ${g.form_before_g14}`);
    for (const d of g.decrees ?? []) if (!l.decrees[d]) errors.push(`regime ${id}: unknown decree ${d}`);
    for (const a of g.locks ?? []) if (!actions.includes(a)) errors.push(`regime ${id}: unknown action ${a}`);
  }
  for (const [id, d] of Object.entries(l.decrees)) if (d.card !== "country" && d.card !== "province") errors.push(`decree ${id}: card ${d.card}`);
  for (const [id, rev] of Object.entries(l.revolutions)) {
    const ctx = `revolution ${id}`;
    if (!l.families[rev.family]) errors.push(`${ctx}: unknown family ${rev.family}`);
    const ev = l.events[id];
    if (!ev) {
      errors.push(`${ctx}: no event`);
      continue;
    }
    if (rev.signs) {
      const { need, warn_at, list } = rev.signs;
      if (!(warn_at <= need && need <= list.length)) errors.push(`${ctx}: warn_at ${warn_at}, need ${need}, ${list.length} signs`);
      for (const s of list) E.leaves(s.if, (t) => (conds.has(t) ? undefined : errors.push(`${ctx}: sign "${s.label}" uses undeclared condition ${t}`)));
    } else if (!rev.keep_trigger) errors.push(`${ctx}: no signs and no kept trigger`);
    for (const c of rev.requirements) E.leaves(c, (t) => (conds.has(t) ? undefined : errors.push(`${ctx}: requirement uses undeclared condition ${t}`)));
    if (ev.options.length < 2 || ev.options.length > 4) errors.push(`${ctx}: ${ev.options.length} options`);
    if (ev.options.filter((o) => o.historical).length !== 1) errors.push(`${ctx}: not exactly one historical option`);
    for (const o of ev.options) {
      const st = rev.stances[o.id];
      if (!st || !STANCES.includes(st)) errors.push(`${ctx}: option ${o.id} has no stance`);
      if (st === "fight" && !raisesTaggedRebels(o, id)) errors.push(`${ctx}: Fight option ${o.id} raises no tagged rebels`);
      for (const tier of ["immediate", "delayed", "rising_won", "rising_crushed"] as const)
        for (const e of o.effects[tier] ?? []) {
          const g = (e as { regime?: { id: string } }).regime;
          if (g && !l.regimes[g.id]) errors.push(`${ctx}: option ${o.id} names unknown regime ${g.id}`);
        }
    }
    for (const opt of Object.keys(rev.rearm.after)) if (!ev.options.some((o) => o.id === opt)) errors.push(`${ctx}: rearm lists unknown option ${opt}`);
  }
  return errors;
}

/** Runs the build over a layer (the data's by default). */
export function buildLayer(l: LayerInput = defaultLayer()): LayerBuild {
  const before = JSON.stringify(E.tree.events);
  const errors = validateLayer(l);
  const patch: Record<string, E.EventDef> = {};
  for (const [id, rev] of Object.entries(l.revolutions)) {
    const ev = l.events[id];
    if (!ev) continue;
    const { new: _n, ...def } = E.clone(ev);
    def.trigger = compileTrigger(rev, def.trigger ?? null) ?? { all: [] };
    def.selection = { ...def.selection, modifiers: compileSelection(rev) };
    patch[id] = def;
  }
  const merged = { ...E.clone(E.tree.events), ...E.clone(patch) };
  const treeReport = E.validate({ events: Object.values(merged), ages: E.tree.ages, periods: E.tree.periods, conditions: NEW_CONDITIONS, effectTypes: NEW_EFFECTS, systemFlags: [...E.eventsConfig.system_flags, ...NEW_FLAGS] });
  const catalogue = Object.entries(l.revolutions).map(([id, rev]) => {
    const ev = l.events[id];
    return { event: id, name: ev?.name ?? id, family: rev.family, years: ev ? `${ev.availability.earliest}–${ev.availability.latest}` : "", threshold: threshold(rev), isNew: ev?.new === true };
  });
  const ids = Object.keys(l.revolutions);
  return {
    counts: { revolutions: ids.length, regimes: Object.keys(l.regimes).length, decrees: Object.keys(l.decrees).length, families: Object.keys(l.families).length },
    errors,
    patch,
    merged,
    treeReport,
    catalogue,
    runtime: { families: l.families, regimes: l.regimes, decrees: l.decrees, revolutions: l.revolutions },
    newEvents: ids.filter((id) => l.events[id]?.new),
    extended: ids.filter((id) => l.events[id] && !l.events[id]!.new),
    treeUntouched: JSON.stringify(E.tree.events) === before,
    checked: ["families", "regimes against government forms", "decrees", "sign leaves", "stances", "Fight options raise tagged rebels"],
  };
}
