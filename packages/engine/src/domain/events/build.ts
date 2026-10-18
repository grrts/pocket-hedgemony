import { leaves } from "./conditions.ts";
import { effectType } from "./effects.ts";
import { balance, eventsConfig, type AgeDef, type Condition, type Effect, type EventDef, type IndexEntry, type PeriodDef } from "./model.ts";

/**
 * The event tree build (EVT-057 … EVT-065): structural checks, coverage,
 * the runtime layers and localization. Errors fail check mode; warnings are
 * reported only (EVT-064).
 */

export interface BuildInput {
  events: EventDef[];
  ages?: AgeDef[];
  periods?: PeriodDef[];
  /** Closed lists (enums.yaml); adding a value needs no engine change (EVT-058). */
  enums?: Record<string, string[]>;
  systemFlags?: string[];
  /** Entities with their existence spans, for the anachronism check (EVT-059). */
  entities?: Record<string, [number, number | null][]>;
  /** Extra declared condition and effect types (a sibling design's additions, EVT-050). */
  conditions?: string[];
  effectTypes?: string[];
}

export interface BuildReport {
  errors: string[];
  warnings: string[];
}

const ROLE_RE = /\$([a-z0-9_]+)/g;

function walkRoles(x: unknown, found: Set<string>): void {
  if (typeof x === "string") for (const m of x.matchAll(ROLE_RE)) found.add(m[1]!);
  else if (Array.isArray(x)) x.forEach((y) => walkRoles(y, found));
  else if (x && typeof x === "object") Object.values(x).forEach((y) => walkRoles(y, found));
}

function allEffects(ev: EventDef): { effect: Effect; option?: string }[] {
  const out: { effect: Effect; option?: string }[] = [];
  const tiers = (b: EventDef["effects"], option?: string) => {
    for (const list of Object.values(b ?? {})) for (const e of (list as Effect[]) ?? []) out.push(option === undefined ? { effect: e } : { effect: e, option });
  };
  tiers(ev.effects);
  for (const o of ev.options) tiers(o.effects, o.id);
  return out;
}

function conditionsOf(ev: EventDef): { where: string; c: unknown }[] {
  const list: { where: string; c: unknown }[] = [
    { where: "requires", c: ev.requires },
    { where: "trigger", c: ev.trigger },
    { where: "invalidated_if", c: ev.invalidated_if },
    { where: "maintain", c: ev.execution?.maintain },
    { where: "cancel_if", c: ev.execution?.cancel_if },
  ];
  for (const [n, r] of Object.entries(ev.roles)) if (r.select !== "fixed") list.push({ where: `roles.${n}`, c: r.select.condition });
  for (const o of ev.options) list.push({ where: `option.${o.id}.allowed`, c: o.allowed });
  return list;
}

/** Events an event needs to have happened: `event` leaves reachable only through all (the mandatory chain). */
export function mandatoryPrerequisites(c: unknown): { id: string; outcome?: string }[] {
  if (!c || typeof c !== "object") return [];
  if (Array.isArray(c)) return c.flatMap(mandatoryPrerequisites);
  const o = c as Condition;
  if ("all" in o) return (o.all as unknown[]).flatMap(mandatoryPrerequisites);
  if ("any" in o || "not" in o || "at_least" in o) return [];
  if ("event" in o) {
    const e = o.event;
    return typeof e === "string" ? [{ id: e }] : [{ id: String((e as { id: string }).id), ...((e as { outcome?: string }).outcome ? { outcome: String((e as { outcome?: string }).outcome) } : {}) }];
  }
  return [];
}

/** Strongly connected components with more than one member, or a self loop (Tarjan). */
export function cycles(nodes: string[], edges: Record<string, string[]>): string[][] {
  let i = 0;
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: string[] = [];
  const on = new Set<string>();
  const out: string[][] = [];
  const strong = (v: string): void => {
    index.set(v, i);
    low.set(v, i);
    i++;
    stack.push(v);
    on.add(v);
    for (const w of edges[v] ?? []) {
      if (!index.has(w)) {
        strong(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (on.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const comp: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        on.delete(w);
        comp.push(w);
      } while (w !== v);
      if (comp.length > 1 || (edges[v] ?? []).includes(v)) out.push(comp);
    }
  };
  for (const n of nodes) if (!index.has(n)) strong(n);
  return out;
}

function payoff(stat: string, change: unknown): boolean {
  const n = typeof change === "number" ? change : Number(String(change).replace("%", "").replace("+", ""));
  if (!(n > 0)) return false;
  return !eventsConfig.rise_is_cost.stats.includes(stat);
}

/** Options of a narrative-only event that pay a perpetrator: a positive stat or prestige change on an initiator role (EVT-007). */
export function perpetratorPayoffs(ev: EventDef): string[] {
  const perpetrators = Object.entries(ev.roles)
    .filter(([, r]) => r.as.includes("initiator") && !r.as.includes("victim") && !r.as.includes("resister"))
    .map(([n]) => `$${n}`);
  const out: string[] = [];
  for (const o of ev.options)
    for (const list of Object.values(o.effects ?? {}))
      for (const e of (list as Effect[]) ?? []) {
        const [type, p] = effectType(e);
        if (type === "stat" && perpetrators.includes(String(p.on)))
          for (const [stat, change] of Object.entries(p.changes as Record<string, unknown>)) if (payoff(stat, change)) out.push(`${o.id}: ${stat} ${String(change)}`);
      }
  return out;
}

const ENUM_PARAMS: Record<string, [string, string]> = { religion: ["is", "religions"], government: ["is", "governments"], ideology: ["id", "ideologies"], culture_group: ["is", "culture_groups"], innovation: ["id", "innovations"] };

/** Runs the build's checks (EVT-062, EVT-025, EVT-027, EVT-057 … EVT-059). */
export function validate(input: BuildInput): BuildReport {
  const errors: string[] = [];
  const warnings: string[] = [];
  const conds = new Set([...Object.keys(eventsConfig.vocabulary.conditions), ...(input.conditions ?? [])]);
  const effs = new Set([...Object.keys(eventsConfig.vocabulary.effects), ...(input.effectTypes ?? [])]);
  const enums = input.enums ?? (eventsConfig.enums as Record<string, string[]>);
  const systemFlags = new Set(input.systemFlags ?? eventsConfig.system_flags);
  const byId = new Map(input.events.map((e) => [e.id, e]));
  const flagsSet = new Set<string>();
  const flagsRead: { flag: string; ctx: string }[] = [];

  for (const ev of input.events) {
    const ctx = `event ${ev.id}`;
    // roles
    const roleNames = Object.keys(ev.roles ?? {});
    if (!roleNames.length) errors.push(`${ctx}: no role`);
    const used = new Set<string>();
    walkRoles({ c: conditionsOf(ev).map((x) => x.c), e: allEffects(ev).map((x) => x.effect), ch: ev.options.map((o) => o.chooser), s: ev.selection }, used);
    for (const r of used) if (!roleNames.includes(r)) errors.push(`${ctx}: undeclared role $${r}`);
    // conditions
    for (const { where, c } of [...conditionsOf(ev), ...((ev.selection.modifiers ?? []).map((m) => ({ where: "selection", c: m.if ?? m.condition })))]) {
      leaves(c, (type, p) => {
        if (!conds.has(type)) errors.push(`${ctx}.${where}: undeclared condition type ${type}`);
        if (type === "flag") flagsRead.push({ flag: String(p.id), ctx: `${ctx}.${where}` });
        const en = ENUM_PARAMS[type];
        if (en && enums[en[1]] && p[en[0]] !== undefined && !enums[en[1]]!.includes(String(p[en[0]]))) errors.push(`${ctx}.${where}: unknown ${type} ${String(p[en[0]])}`);
      });
    }
    // effects
    for (const { effect } of allEffects(ev)) {
      const [type, p] = effectType(effect);
      if (!effs.has(type)) errors.push(`${ctx}: undeclared effect type ${type}`);
      if (type === "set_flag") flagsSet.add(String(p.id));
      if (type === "religion" && enums.religions && !enums.religions.includes(String(p.set))) errors.push(`${ctx}: unknown religion ${String(p.set)}`);
    }
    // options
    const { min, max } = eventsConfig.balance.options;
    if (ev.options.length < min) (ev.importance === "major" ? warnings : errors).push(`${ctx}: ${ev.options.length} option(s); ${min} to ${max} expected`);
    if (ev.options.length > max) errors.push(`${ctx}: ${ev.options.length} options; at most ${max} (D-EVT-7)`);
    const hist = ev.options.filter((o) => o.historical).length;
    if (hist !== 1) errors.push(`${ctx}: ${hist} historical options; exactly one expected`);
    const ids = ev.options.map((o) => o.id);
    if (new Set(ids).size !== ids.length) errors.push(`${ctx}: duplicate option id`);
    for (const o of ev.options) if (o.chooser && !roleNames.includes(o.chooser.slice(1))) errors.push(`${ctx}.option.${o.id}: chooser must be null or a role`);
    if (ev.depiction === "narrative_only") for (const p of perpetratorPayoffs(ev)) errors.push(`${ctx}: narrative_only option pays the perpetrator (${p})`);
    // anachronisms
    if (input.entities && ev.history) {
      const year = Number(String(Array.isArray(ev.history.date) ? ev.history.date[0] : ev.history.date).slice(0, 4));
      for (const [rn, r] of Object.entries(ev.roles))
        for (const en of r.historical) {
          const spans = input.entities[en];
          if (spans && !spans.some(([a, b]) => year >= a && (b === null || year <= b))) warnings.push(`anachronism: ${ev.id}.${rn} lists ${en} (exists ${JSON.stringify(spans)}) but history date is ${year}`);
        }
    }
    for (const x of ev.exclusive_with ?? []) if (byId.has(x) && !(byId.get(x)!.exclusive_with ?? []).includes(ev.id)) errors.push(`${ctx}: exclusive_with ${x} is not symmetric`);
  }
  for (const { flag, ctx } of flagsRead) if (!flagsSet.has(flag) && !systemFlags.has(flag)) errors.push(`${ctx}: flag ${flag} is never set by any effect and is not a system flag`);

  // the mandatory prerequisite graph
  const edges: Record<string, string[]> = {};
  for (const ev of input.events) edges[ev.id] = [...mandatoryPrerequisites(ev.requires), ...mandatoryPrerequisites(ev.trigger)].map((x) => x.id).filter((x) => byId.has(x));
  for (const comp of cycles(input.events.map((e) => e.id), edges)) errors.push(`circular mandatory dependency: ${comp.sort().join(" -> ")}`);
  // earliest reachable date
  const earliest = new Map<string, number>();
  const reach = (id: string, seen: Set<string>): number => {
    if (earliest.has(id)) return earliest.get(id)!;
    const ev = byId.get(id)!;
    if (seen.has(id)) return ev.availability.earliest;
    seen.add(id);
    const e = Math.max(ev.availability.earliest, ...(edges[id] ?? []).map((p) => reach(p, seen)));
    earliest.set(id, e);
    return e;
  };
  for (const ev of input.events) if (reach(ev.id, new Set()) > ev.availability.latest) errors.push(`event ${ev.id}: impossible trigger (earliest reachable ${earliest.get(ev.id)} after latest ${ev.availability.latest})`);
  // exclusive pairs jointly required
  for (const ev of input.events) {
    const req = edges[ev.id] ?? [];
    for (const a of req) for (const b of byId.get(a)?.exclusive_with ?? []) if (req.includes(b) && a < b) errors.push(`event ${ev.id}: requires the exclusive pair ${a} and ${b}`);
  }
  // ages and periods
  const ages = new Map((input.ages ?? []).map((a) => [a.id, a]));
  for (const a of input.ages ?? []) if (!a.start || !a.end) errors.push(`age ${a.id}: missing start or end condition`);
  for (const p of input.periods ?? []) {
    if (!p.start || !p.end) errors.push(`period ${p.id}: missing start or end condition`);
    const inside = p.ages.some((id) => {
      const a = ages.get(id);
      return a && p.window[0] <= (a.window.latest_end ?? Infinity) && p.window[1] >= a.window.earliest_start;
    });
    if (!inside) errors.push(`period ${p.id}: lies inside none of its ages`);
  }
  return { errors, warnings };
}

/** Check mode: errors fail the build, warnings do not (EVT-064). */
export function checkMode(report: BuildReport): { exitCode: number } {
  return { exitCode: report.errors.length ? 1 : 0 };
}

/** Regions an age lists that fewer than min_events_per_region_age events touch in that age (EVT-063). */
export function coverageGaps(index: Record<string, IndexEntry>, ages: AgeDef[]): string[] {
  const min = balance.coverage.min_events_per_region_age;
  const out: string[] = [];
  for (const a of ages)
    for (const r of a.regions) {
      const n = Object.values(index).filter((e) => e.ages.includes(a.id) && e.regions.includes(r)).length;
      if (n < min) out.push(`${r} in ${a.id}: ${n} event(s)`);
    }
  return out;
}

/** Active share of a region's role slots: (initiator + beneficiary + resister) / all (EVT-063). */
export function agencyShare(slots: Partial<Record<"initiator" | "participant" | "beneficiary" | "resister" | "affected" | "cost_bearer" | "victim", number>>, total?: number): { share: number; flagged: boolean } {
  const all = total ?? Object.values(slots).reduce((a, b) => a + (b ?? 0), 0);
  const share = all ? ((slots.initiator ?? 0) + (slots.beneficiary ?? 0) + (slots.resister ?? 0)) / all : 0;
  return { share, flagged: share < balance.coverage.min_agency_share };
}

/** Splits merged events into the runtime layers (EVT-060). */
export function splitLayers(events: EventDef[], extra: { ages?: unknown; periods?: unknown; modifiers?: unknown; statistics?: unknown; localization?: Record<string, string> } = {}): Record<string, unknown> {
  const by = <T>(f: (e: EventDef) => T) => Object.fromEntries(events.map((e) => [e.id, f(e)]));
  const loc: Record<string, string> = { ...(extra.localization ?? {}) };
  for (const e of events) if (e.name) loc[`event.${e.id}.name`] ??= e.name;
  const layers: Record<string, unknown> = {
    history_reference: by((e) => e.history ?? {}),
    ages: extra.ages ?? [],
    periods: extra.periods ?? [],
    event_definitions: by((e) => ({ name: e.name, ages: e.ages, periods: e.periods, regions: e.regions, importance: e.importance, roles: e.roles })),
    triggers: by((e) => ({ availability: e.availability, requires: e.requires, optional: e.optional, trigger: e.trigger, invalidated_if: e.invalidated_if })),
    selection: by((e) => e.selection),
    execution: by((e) => e.execution ?? {}),
    choices: by((e) => e.options.map(({ ai: _ai, ...o }) => o)),
    ai: by((e) => Object.fromEntries(e.options.map((o) => [o.id, o.ai]))),
    effects: by((e) => ({ effects: e.effects, follow_ups: e.follow_ups ?? [] })),
    modifiers: extra.modifiers ?? [],
    statistics: extra.statistics ?? eventsConfig.statistics,
    balance,
    "localization.en": loc,
  };
  return layers;
}

/** Player-facing text, keyed by id (EVT-061). */
export function text(localization: Record<string, string>, key: string): string {
  const t = localization[key];
  if (t === undefined) throw new Error(`No localization for ${key}`);
  return t;
}
export function eventName(localization: Record<string, string>, id: string): string {
  return text(localization, `event.${id}.name`);
}

export interface Source {
  id: string;
  short?: string;
  verified: boolean;
}

/** Sources a historian must check before release (EVT-065). */
export function sourcesForReview(sources: Source[]): Source[] {
  return sources.filter((s) => !s.verified);
}
