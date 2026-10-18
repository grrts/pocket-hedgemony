import * as E from "../events/index.ts";
import * as G from "../government/index.ts";
import type { Rising } from "../rebellions/index.ts";
import { compileSelection, compileTrigger, LOYALTY_STEPS, regime, revolutionEvents, revolutions, revolutionsConfig, roleOf, type Loyalty, type Regime } from "./model.ts";

/**
 * The state the revolution layer keeps next to the event engine's world:
 * the province, realm and government facts its signs read (grievances,
 * classes, lords, lost wars, forms), the regimes, decrees and locks
 * countries hold, and each revolution's stage per country.
 */

export type Stage = "Quiet" | "Brewing" | "Ready" | "Outbreak" | "Struggle" | "Settlement" | "Aftermath";

export interface Lord {
  id: string;
  loyalty: Loyalty;
  /** Provinces the lord holds (place keys). */
  provinces?: string[];
  faith?: string;
  culture?: string;
  traits?: string[];
  retinue?: number;
  emigre?: boolean;
  oldHouse?: boolean;
  gainedUnderRevolution?: boolean;
  planterOrSettler?: boolean;
}

/** A peace made: who, when (month index) and on which side with what terms (REVO-015). */
export interface Peace {
  who: string;
  at: number;
  side: "loser" | "winner";
  terms: "land" | "paid" | "subject" | "white";
}

export interface Holding {
  /** The one regime in place (INV-REVO-9). */
  regime?: string;
  addOns: string[];
  /** Month index each regime was applied. */
  appliedAt: Record<string, number>;
}

export interface Track {
  revolution: string;
  country: string;
  stage: Stage;
  /** Month index the revolution became Ready (REVO-008). */
  readySince?: number;
  /** Re-armed after a stop (REVO-032): "Stopped, not solved". */
  rearmed: boolean;
  rearmedAt?: number;
  option?: string;
  settledAt?: number;
  outcome?: "won" | "crushed";
  times: number;
}

/** A rising tagged `revolution: <event>` (REVO-021), carried by the rebellions model. */
export interface TaggedRising {
  revolution: string;
  country: string;
  option: string;
  roles: Record<string, string[]>;
  rising: Rising;
  /** Funded from abroad when raised: join shares × 1.5 (REVO-062). */
  funded?: boolean;
  /** Provinces whose castle the revolution camp holds (REVO-029). */
  castles: string[];
}

export interface RevoState {
  es: E.EventState;
  grievances: Record<string, string[]>;
  classes: Record<string, Record<string, number>>;
  lords: Record<string, Lord[]>;
  peaces: Peace[];
  forms: Record<string, G.FormId>;
  /** The form held before the last revolutionary regime (REVO-041). */
  formBefore: Record<string, G.FormId>;
  holdings: Record<string, Holding>;
  decrees: Record<string, string[]>;
  locks: Record<string, string[]>;
  inventions: Record<string, string[]>;
  tracks: Record<string, Track>;
  risings: TaggedRising[];
  /** Deposed rulers and heirs abroad, and who hosts them (REVO-046, REVO-056). */
  pretenders: { country: string; who: string; host?: string }[];
  /** Opinion changes and reasons to fight the layer hands to diplomacy. */
  opinions: { from: string; to: string; value: number; reason: string; years?: number }[];
  log: E.DomainEvent[];
}

/** A new state over a world; the event engine holds the merged revolution events. */
export function newRevoState(world: E.World = E.emptyWorld()): RevoState {
  const events = { ...E.clone(E.tree.events), ...E.clone(revolutionEvents) } as Record<string, E.EventDef>;
  const es = E.newState(world, { events, ages: E.tree.ages, periods: E.tree.periods });
  const r: RevoState = { es, grievances: {}, classes: {}, lords: {}, peaces: [], forms: {}, formBefore: {}, holdings: {}, decrees: {}, locks: {}, inventions: {}, tracks: {}, risings: [], pretenders: [], opinions: [], log: [] };
  es.conditions = revolutionConditions(r);
  es.effects = revolutionEffects(r);
  for (const [id, rev] of Object.entries(revolutions)) {
    const ev = es.events[id];
    if (!ev) continue;
    ev.trigger = compileTrigger(rev, ev.trigger ?? null) ?? { all: [] };
    ev.selection = { ...ev.selection, modifiers: compileSelection(rev) };
  }
  // A re-armed revolution may fire again although its event is one_time (REVO-038).
  es.mayRefire = (event, roles) => {
    const rev = revolutions[event];
    const c = rev ? roles[roleOf(rev)]?.[0] : undefined;
    return !!c && trackOf(r, event, c).rearmed;
  };
  return r;
}

/** A revolution's track in one country (REVO-007). */
export function trackOf(r: RevoState, revolution: string, country: string): Track {
  return (r.tracks[`${revolution}:${country}`] ??= { revolution, country, stage: "Quiet", rearmed: false, times: 0 });
}

// ---------------------------------------------------------------- places and people

/** Provinces of a country (owned), an area or region (listed), or a single province. */
export function provincesOf(r: RevoState, who: string): string[] {
  const w = r.es.world;
  if (w.countries[who]) return Object.entries(w.places).filter(([k, p]) => k.startsWith("province:") && p.owner === who).map(([k]) => k);
  const p = w.places[who];
  return p?.provinces?.length ? p.provinces : [who];
}

export function grievancesIn(r: RevoState, province: string): string[] {
  return (r.grievances[province] ??= []);
}

/** Share (0..1) of who's provinces that have a grievance (REVO-012). */
export function grievanceShare(r: RevoState, who: string, id: string): number {
  const ps = provincesOf(r, who);
  return ps.length ? ps.filter((p) => grievancesIn(r, p).includes(id)).length / ps.length : 0;
}

/** Share (0..1) of who's people in a class (REVO-013). */
export function classShare(r: RevoState, who: string, cls: string): number {
  const m = r.classes[who] ?? {};
  const total = Object.values(m).reduce((a, b) => a + b, 0);
  return total ? (m[cls] ?? 0) / total : 0;
}

function atLeast(l: Loyalty, step: Loyalty): boolean {
  return LOYALTY_STEPS.indexOf(l) >= LOYALTY_STEPS.indexOf(step);
}

/** The `lords` measures (REVO-014). */
export function lordsMeasure(r: RevoState, who: string, measure: string): number {
  const lords = r.lords[who] ?? [];
  switch (measure) {
    case "land_share": {
      const all = provincesOf(r, who).length;
      const held = lords.reduce((n, l) => n + (l.provinces?.length ?? 0), 0);
      return all ? held / all : 0;
    }
    case "wavering_or_worse":
      return lords.filter((l) => atLeast(l.loyalty, "wavering")).length;
    case "disloyal_or_worse":
      return lords.filter((l) => atLeast(l.loyalty, "disloyal")).length;
    case "count":
      return lords.length;
    default:
      throw new Error(`Unknown lord measure: ${measure}`);
  }
}

/** Peace on the losing side (gave land, paid, or was made a subject) within the years (REVO-015). */
export function warLost(r: RevoState, who: string, withinYears: number): boolean {
  const at = E.now(r.es.world);
  return r.peaces.some((p) => p.who === who && p.side === "loser" && p.terms !== "white" && at - p.at <= withinYears * 12);
}

/** The four new conditions, as event-engine evaluators (REVO-012 … REVO-015, REVO-079). */
export function revolutionConditions(r: RevoState): Record<string, E.LeafEval> {
  const cmp = (v: number, p: Record<string, unknown>) => (p.op === undefined ? v > 0 : E.compare(v, String(p.op), Number(p.value)));
  return {
    grievance: (p, _w, ctx) => E.resolve(p.who, ctx).some((who) => cmp(grievanceShare(r, who, String(p.id)), p)),
    class_share: (p, _w, ctx) => E.resolve(p.who, ctx).some((who) => cmp(classShare(r, who, String(p.class)), p)),
    lords: (p, _w, ctx) => E.resolve(p.who, ctx).some((who) => cmp(lordsMeasure(r, who, String(p.measure)), p)),
    war_lost: (p, _w, ctx) => E.resolve(p.who, ctx).some((who) => warLost(r, who, Number(p.within_years))),
  };
}

/** The two new effects, `regime` and `lock` (REVO-039, REVO-047, REVO-079). */
export function revolutionEffects(r: RevoState): Record<string, E.EffectEval> {
  return {
    regime: (p, _w, ctx, out) => {
      for (const on of E.resolve(p.on, ctx)) {
        applyRegime(r, on, String(p.id));
        out.push({ type: "regime", target: on, values: { id: p.id } });
      }
    },
    lock: (p, _w, ctx, out) => {
      for (const on of E.resolve(p.on, ctx)) {
        lock(r, on, String(p.id));
        out.push({ type: "lock", target: on, values: { id: p.id } });
      }
    },
  };
}

// ---------------------------------------------------------------- regimes, decrees and locks

export function holding(r: RevoState, country: string): Holding {
  return (r.holdings[country] ??= { addOns: [], appliedAt: {} });
}

export function flags(r: RevoState, country: string): string[] {
  return (E.country(r.es.world, country).flags ??= []);
}
export function hasFlag(r: RevoState, country: string, flag: string): boolean {
  return flags(r, country).includes(flag);
}
function setFlag(r: RevoState, country: string, flag: string, on: boolean): void {
  const c = E.country(r.es.world, country);
  c.flags = (c.flags ?? []).filter((f) => f !== flag);
  if (on) c.flags.push(flag);
}

/** Removes an action: shown greyed out with "Locked by the revolution" (REVO-047). */
export function lock(r: RevoState, country: string, action: string): void {
  const list = (r.locks[country] ??= []);
  if (!list.includes(action)) list.push(action);
  r.log.push({ type: "ActionLocked", country, action });
}
export function isLocked(r: RevoState, country: string, action: string): boolean {
  return (r.locks[country] ?? []).includes(action);
}
/** How an action shows on its card: locked ones greyed with the card label (REVO-047, REVO-077). */
export function actionLabel(r: RevoState, country: string, action: string): { action: string; enabled: boolean; note?: string } {
  return isLocked(r, country, action) ? { action, enabled: false, note: revolutionsConfig.card.locked_label } : { action, enabled: true };
}

/** Sets the country's form, keeping the event tree's abstract government in step. */
export function setForm(r: RevoState, country: string, form: G.FormId): void {
  r.forms[country] = form;
  E.country(r.es.world, country).government = G.form(form).eventTree;
}

/** The form a regime gives: `keep`, `old_form`, any form regardless of era, the G14 fallback (REVO-040 … REVO-043). */
export function regimeForm(r: RevoState, country: string, reg: Regime): G.FormId | undefined {
  const current = r.forms[country];
  if (!reg.form || reg.form === "keep") return current;
  if (reg.form === "old_form") return r.formBefore[country] ?? current;
  const hasG14 = (r.inventions[country] ?? []).includes("G14");
  const to = reg.form_before_g14 && !hasG14 ? reg.form_before_g14 : reg.form;
  if (!G.isFormId(to)) throw new Error(`Regime ${reg.id} names an unknown form ${to}`);
  return current ? G.setFormByRevolution(current, to) : to;
}

/**
 * Applies a regime's package (REVO-039 … REVO-050): form, ruler, decrees,
 * locks, grievances to end and add, flags to set and clear. One regime at a
 * time; add-ons stack on it (REVO-045). The form alone sets the caps (REVO-044).
 */
export function applyRegime(r: RevoState, country: string, id: string): void {
  const reg = regime(id);
  const h = holding(r, country);
  const at = E.now(r.es.world);
  const revolutionary = (reg.flags ?? []).includes("revolutionary_regime");
  if (reg.add_on) {
    if (!h.addOns.includes(id)) h.addOns.push(id);
  } else {
    const prev = h.regime ? regime(h.regime) : undefined;
    if (prev) {
      r.decrees[country] = (r.decrees[country] ?? []).filter((d) => !(prev.decrees ?? []).includes(d));
      r.locks[country] = (r.locks[country] ?? []).filter((l) => !(prev.locks ?? []).includes(l));
      if ((prev.flags ?? []).includes("revolutionary_regime") && !revolutionary) setFlag(r, country, "revolutionary_regime", false);
    }
    h.regime = id;
    const form = regimeForm(r, country, reg);
    const current = r.forms[country];
    if (revolutionary && current && !hasFlag(r, country, "revolutionary_regime")) r.formBefore[country] = current;
    if (form && form !== current) setForm(r, country, form);
  }
  h.appliedAt[id] = at;
  if (reg.ruler === "deposed") {
    r.pretenders.push({ country, who: "the ruler and heirs" });
  }
  for (const d of reg.decrees ?? []) if (!(r.decrees[country] ??= []).includes(d)) r.decrees[country]!.push(d);
  for (const l of reg.locks ?? []) lock(r, country, l);
  for (const p of provincesOf(r, country)) {
    const g = grievancesIn(r, p);
    r.grievances[p] = g.filter((x) => !(reg.grievances_end ?? []).includes(x));
    for (const a of reg.grievances_add ?? []) if (!r.grievances[p]!.includes(a)) r.grievances[p]!.push(a);
  }
  for (const f of reg.flags ?? []) setFlag(r, country, f, true);
  for (const f of reg.flags_clear ?? []) setFlag(r, country, f, false);
  if (/counter-revolution reason/i.test(reg.abroad ?? "")) {
    const cr = revolutionsConfig.counter_revolution;
    for (const [m, c] of Object.entries(r.es.world.countries))
      if (m !== country && c.exists !== false && c.government === "monarchy") r.opinions.push({ from: m, to: country, value: cr.opinion, reason: "counter_revolution", years: cr.years });
  }
  const onApply = (revolutionsConfig.regime_on_apply as Record<string, { lords_waver_steps?: number }>)[id];
  if (onApply?.lords_waver_steps) for (const l of r.lords[country] ?? []) l.loyalty = waver(l.loyalty, onApply.lords_waver_steps);
  r.log.push({ type: "RegimeApplied", country, regime: id, form: r.forms[country], flags: [...flags(r, country)] });
}

/** A lord's loyalty some steps worse. */
export function waver(l: Loyalty, steps = 1): Loyalty {
  return LOYALTY_STEPS[Math.min(LOYALTY_STEPS.length - 1, LOYALTY_STEPS.indexOf(l) + steps)]!;
}

/** The officials and lords caps: the form's alone, never the regime's (REVO-044). */
export function caps(r: RevoState, country: string): { officials: number; lords: number } {
  const form = r.forms[country];
  if (!form) throw new Error(`${country} holds no form`);
  const c = G.workOutCaps({ form, buildings: [] });
  return { officials: c.officials.total, lords: c.lords.total };
}
