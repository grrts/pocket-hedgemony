import type { Rng } from "../../rng.ts";
import { holds, holdsIfBound, holdsSoFar, leaves, resolve, type Ctx, type LeafEval } from "./conditions.ts";
import { applyEffects, effectType, type Applied, type EffectCtx, type EffectEval } from "./effects.ts";
import { expired } from "./modifiers.ts";
import { deriveAll } from "./mapping.ts";
import {
  balance,
  eventsConfig,
  monthIndex,
  now,
  type AgeDef,
  type Condition,
  type Effect,
  type EventDef,
  type OptionDef,
  type PeriodDef,
  type World,
} from "./model.ts";

/**
 * The event engine (EVT-011 … EVT-045): the age and period clock,
 * eligibility and role binding, selection and pacing, follow-up boosts,
 * options and the AI's choice, firing, effects by tier and running events.
 * State is plain data the caller owns; dice come from the caller's Rng.
 */

export type AlternateHistoryMode = "historical" | "plausible" | "divergent";

export interface GameRules {
  mode: AlternateHistoryMode;
  /** Last day of the campaign, ISO (EVT-001). */
  endDate: string;
  /** A real campaign never fires tutorial-only events (EVT-067). */
  tutorial: boolean;
}

export function defaultRules(): GameRules {
  return { mode: rulesForChoice(eventsConfig.campaign.events_choice.default), endDate: eventsConfig.campaign.end_date, tutorial: false };
}

/** The new-game "Events" choice (Historical, Plausible, Free) as its alternate history preset (EVT-036, D-EVT-9). */
export function rulesForChoice(choice: string): AlternateHistoryMode {
  const mode = (eventsConfig.campaign.events_choice.values as Record<string, string>)[choice];
  if (!mode) throw new Error(`Unknown events choice: ${choice}`);
  return mode as AlternateHistoryMode;
}

export interface Boost {
  event: string;
  from: string;
  /** Month indexes the window opens and closes. */
  start: number;
  end: number;
  boost: number;
}

/** An event that fired and waits for its chooser's answer, or was offered as a decision. */
export interface Pending {
  event: string;
  roles: Record<string, string[]>;
  /** The country whose controller answers. */
  controller?: string;
  kind: "fired" | "offered";
  at: number;
}

export interface DelayedEffect {
  due: number;
  effect: Effect;
  roles: Record<string, string[]>;
}

export interface DomainEvent {
  type: string;
  [k: string]: unknown;
}

export interface EventState {
  world: World;
  rules: GameRules;
  events: Record<string, EventDef>;
  ages: AgeDef[];
  periods: PeriodDef[];
  /** Events removed for good, with the entity whose loss removed them (EVT-024). */
  invalidated: Record<string, { vanished?: string }>;
  /** The roles each event was last bound to when it became eligible. */
  bound: Record<string, Record<string, string[]>>;
  boosts: Boost[];
  /** Pool events fired per `country:year` (EVT-033). */
  poolFired: Record<string, number>;
  /** Decisions an AI left unanswered past decision_expiry_years: they re-enter the pool (EVT-032). */
  lapsed: string[];
  pending: Pending[];
  delayed: DelayedEffect[];
  /** Ages and periods that have ended (they do not start again) or ever started. */
  agesEnded: string[];
  periodsEnded: string[];
  periodsEverActive: string[];
  ended: boolean;
  log: DomainEvent[];
  /** Extensions from other contexts: extra conditions and effects. */
  conditions?: Record<string, LeafEval>;
  effects?: Record<string, EffectEval>;
  /** Other contexts can let a one-time event fire again (revolutions' re-arm, REVO-038). */
  mayRefire?: (event: string, roles: Record<string, string[]>) => boolean;
}

export function newState(world: World, data: { events: Record<string, EventDef>; ages?: AgeDef[]; periods?: PeriodDef[] }, rules: GameRules = defaultRules()): EventState {
  return {
    world,
    rules,
    events: data.events,
    ages: data.ages ?? [],
    periods: data.periods ?? [],
    invalidated: {},
    bound: {},
    boosts: [],
    poolFired: {},
    lapsed: [],
    pending: [],
    delayed: [],
    agesEnded: [],
    periodsEnded: [],
    periodsEverActive: [],
    ended: false,
    log: [],
  };
}

function ctxOf(s: EventState, roles: Record<string, string[]>, extra: Partial<Ctx> = {}): EffectCtx {
  return { roles, ...(s.conditions ? { conditions: s.conditions } : {}), ...(s.effects ? { effects: s.effects } : {}), ...extra };
}

export function preset(mode: AlternateHistoryMode): { follow_up_boost_mult: number; historical_option_mult: number; mean_years_mult: number } {
  return balance.selection.alternate_history_mode[mode];
}

// ---------------------------------------------------------------- campaign span (EVT-001 … EVT-003)

/** ISO start of an event's history date; a bare year counts from 1 January. */
export function historyStart(date: unknown): string {
  const first = Array.isArray(date) ? date[0] : date;
  const s = String(first);
  if (/^\d{4}$/.test(s)) return `${s}-01-01`;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-01`;
  return s;
}

/** Events whose history starts after the end date are out of scope (EVT-002). */
export function outOfScope(date: unknown, endDate = eventsConfig.campaign.end_date): boolean {
  return historyStart(date) > endDate;
}

/**
 * The events a campaign loads: every event whose history starts after the
 * end date is dropped (EVT-002, D-EVT-1). The data keeps them as reference.
 */
export function campaignEvents(events: Record<string, EventDef>, endDate = eventsConfig.campaign.end_date): Record<string, EventDef> {
  return Object.fromEntries(Object.entries(events).filter(([, e]) => !e.history || !outOfScope(e.history.date, endDate)));
}

export function isoOf(w: World, day = 1): string {
  return `${w.year}-${String(w.month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The campaign ends on its end date (EVT-001). */
export function campaignOver(w: World, endDate: string, day = 1): boolean {
  return isoOf(w, day) >= endDate || `${w.year}-${String(w.month).padStart(2, "0")}` > endDate.slice(0, 7);
}

// ---------------------------------------------------------------- ages and periods (EVT-011 … EVT-017)

/** What decides whether an age's or a period's condition holds; the real world by default. */
export type Holds = (c: Condition, kind: "start" | "end", id: string) => boolean;

/**
 * The yearly age check: inside its window an age starts when its start
 * condition holds, at its force_start regardless, and ends when its end
 * condition holds or at force_end (EVT-011, EVT-012). Out-of-scope ages never start (EVT-003).
 */
export function yearlyAgeCheck(s: EventState, year: number, h?: Holds): DomainEvent[] {
  const w = s.world;
  const test: Holds = h ?? ((c) => holds(c, w, ctxOf(s, {})));
  const out: DomainEvent[] = [];
  for (const a of s.ages) {
    if (s.agesEnded.includes(a.id) || eventsConfig.campaign.out_of_scope_ages.includes(a.id)) continue;
    const latest = a.window.latest_end ?? Infinity;
    if (!w.ages.includes(a.id)) {
      const forced = a.force_start !== undefined && year >= a.force_start && year <= latest;
      const inWindow = year >= a.window.earliest_start && year <= latest;
      if (forced || (inWindow && test(a.start, "start", a.id))) {
        w.ages.push(a.id);
        out.push({ type: "AgeStarted", age: a.id, year });
      }
    }
    if (w.ages.includes(a.id)) {
      const forced = a.force_end !== undefined && year >= a.force_end;
      if (forced || year > latest || test(a.end, "end", a.id)) {
        w.ages = w.ages.filter((x) => x !== a.id);
        s.agesEnded.push(a.id);
        out.push({ type: "AgeEnded", age: a.id, year });
      }
    }
  }
  s.log.push(...out);
  return out;
}

/** "Has the age begun in this region?" for exploration, national strengths and music (EVT-014). */
export function ageBegunIn(s: EventState, age: string, region: string): boolean {
  const a = s.ages.find((x) => x.id === age);
  return !!a && s.world.ages.includes(age) && a.regions.includes(region);
}

/** Periods with `start: initial` are active at the 1444 start (EVT-015). */
export function startCampaign(s: EventState, year = eventsConfig.campaign.start_year): void {
  for (const p of s.periods) {
    if (p.start === "initial" && year >= p.window[0] && year <= p.window[1] && !s.world.periods.includes(p.id)) {
      s.world.periods.push(p.id);
      s.periodsEverActive.push(p.id);
      s.log.push({ type: "PeriodStarted", period: p.id });
    }
  }
}

/** A period starts when its start condition holds inside its window and ends on its end condition (EVT-015). */
export function periodCheck(s: EventState, year: number, h?: Holds): DomainEvent[] {
  const w = s.world;
  const test: Holds = h ?? ((c) => holds(c, w, ctxOf(s, {})));
  const out: DomainEvent[] = [];
  for (const p of s.periods) {
    if (s.periodsEnded.includes(p.id)) continue;
    const inWindow = year >= p.window[0] && year <= p.window[1];
    if (!w.periods.includes(p.id) && inWindow && p.start !== "initial" && test(p.start, "start", p.id)) {
      w.periods.push(p.id);
      s.periodsEverActive.push(p.id);
      out.push({ type: "PeriodStarted", period: p.id });
    }
    if (w.periods.includes(p.id) && (year > p.window[1] || test(p.end, "end", p.id))) {
      w.periods = w.periods.filter((x) => x !== p.id);
      s.periodsEnded.push(p.id);
      out.push({ type: "PeriodEnded", period: p.id });
    }
  }
  s.log.push(...out);
  return out;
}

/** Each period's and age's event list, derived from the events' own fields (EVT-016). */
export function membership(index: Record<string, { ages: string[]; periods: string[] }>): { periods: Record<string, string[]>; ages: Record<string, string[]> } {
  const periods: Record<string, string[]> = {};
  const ages: Record<string, string[]> = {};
  for (const [id, e] of Object.entries(index)) {
    for (const p of e.periods) (periods[p] ??= []).push(id);
    for (const a of e.ages) (ages[a] ??= []).push(id);
  }
  return { periods, ages };
}

// ---------------------------------------------------------------- roles and eligibility (EVT-005, EVT-018 … EVT-028)

/** Countries a role's selector can bind: `fixed` = the historical holders (EVT-005). */
export function roleCandidates(s: EventState, ev: EventDef, role: string): string[] {
  const r = ev.roles[role];
  if (!r) throw new Error(`${ev.id} has no role ${role}`);
  if (r.select === "fixed") return [...r.historical];
  const sel = r.select;
  // Read every month for every country, so it walks the countries without copying them.
  const ctx: Ctx = ctxOf(s, {});
  const out: string[] = [];
  for (const id in s.world.countries) {
    const c = s.world.countries[id]!;
    if (c.exists === false || (sel.where !== undefined && `region:${c.region}` !== sel.where)) continue;
    ctx.this = id;
    if (holdsIfBound(sel.condition, s.world, ctx) === true) out.push(id);
  }
  return out;
}

/**
 * Every way to bind the roles: the first role with a selector is bound to
 * one candidate at a time; other selected roles take all their candidates.
 */
export function bindings(s: EventState, ev: EventDef): Record<string, string[]>[] {
  const names = Object.keys(ev.roles);
  const lead = names.find((n) => ev.roles[n]!.select !== "fixed");
  const base: Record<string, string[]> = {};
  for (const n of names) if (n !== lead) base[n] = roleCandidates(s, ev, n);
  if (!lead) return [base];
  return roleCandidates(s, ev, lead).map((c) => ({ ...base, [lead]: [c] }));
}

export type Ineligible = "tutorial" | "campaign over" | "out of scope" | "invalidated" | "outside years" | "fired" | "cooldown" | "exclusive" | "requires" | "trigger" | "no role";

/** The reasons an event cannot fire, before roles are bound. */
export function gate(s: EventState, ev: EventDef): Ineligible | null {
  const w = s.world;
  if (ev.tutorial_only && !s.rules.tutorial) return "tutorial";
  if (s.ended) return "campaign over";
  if (ev.history && outOfScope(ev.history.date, s.rules.endDate)) return "out of scope";
  if (s.invalidated[ev.id]) return "invalidated";
  // A window without a latest year (null in the data) stays open to the end date.
  if (w.year < ev.availability.earliest || (ev.availability.latest != null && w.year > ev.availability.latest)) return "outside years";
  for (const x of ev.exclusive_with ?? []) if (w.history.some((o) => o.event === x)) return "exclusive";
  if (!holds(ev.requires, w, ctxOf(s, {}))) return "requires";
  return null;
}

/** Whether a past firing blocks this binding (EVT-020): one_time once, recurring after cooldown, process per country. */
export function repeatBlocks(s: EventState, ev: EventDef, roles: Record<string, string[]>): Ineligible | null {
  const past = s.world.history.filter((o) => o.event === ev.id);
  if (!past.length) return null;
  const repeat = ev.availability.repeat;
  if (repeat === "one_time") return s.mayRefire?.(ev.id, roles) ? null : "fired";
  if (repeat === "process") {
    const key = JSON.stringify(roles);
    return past.some((o) => JSON.stringify(o.roles) === key) ? "fired" : null;
  }
  const max = ev.execution?.max_occurrences;
  if (max !== undefined && past.length >= max) return "fired";
  const cooldown = ev.execution?.cooldown_years ?? ev.availability.cooldown_years ?? 0;
  const last = Math.max(...past.map((o) => monthIndex(o.year, o.month)));
  return now(s.world) - last < cooldown * 12 ? "cooldown" : null;
}

/** When `invalidated_if` holds the event is removed for good; a vanished entity is remembered for re-emergence (EVT-024). */
export function checkInvalidation(s: EventState, ev: EventDef): boolean {
  if (!ev.invalidated_if || s.invalidated[ev.id]) return !!s.invalidated[ev.id];
  const roles = s.bound[ev.id] ?? {};
  if (holdsIfBound(ev.invalidated_if, s.world, ctxOf(s, roles)) !== true) return false;
  const vanished = vanishedEntity(ev.invalidated_if);
  s.invalidated[ev.id] = vanished ? { vanished } : {};
  s.log.push({ type: "EventInvalidated", event: ev.id });
  return true;
}

function vanishedEntity(c: Condition): string | undefined {
  const n = c.not as Condition | undefined;
  if (!n || !("exists" in n)) return undefined;
  const e = n.exists;
  const id = typeof e === "string" ? e : (e as { who?: string }).who;
  return id && !id.startsWith("$") ? id : undefined;
}

/** Re-opens branches removed because an entity vanished, when an effect creates it again (EVT-024). */
export function reemerge(s: EventState, entity: string): string[] {
  const opened = Object.entries(s.invalidated)
    .filter(([, v]) => v.vanished === entity)
    .map(([k]) => k);
  for (const k of opened) delete s.invalidated[k];
  return opened;
}

/** The bindings under which the event is eligible now (EVT-018 … EVT-025). */
export function eligible(s: EventState, ev: EventDef): Record<string, string[]>[] {
  if (checkInvalidation(s, ev)) return [];
  if (gate(s, ev)) return [];
  // A trigger already false before any role is bound is false for every binding: skip counting the candidates.
  if (holdsSoFar(ev.trigger, s.world, ctxOf(s, {})) === false) return [];
  const out: Record<string, string[]>[] = [];
  for (const roles of bindings(s, ev)) {
    if (repeatBlocks(s, ev, roles)) continue;
    if (holdsIfBound(ev.trigger, s.world, ctxOf(s, roles)) === true) out.push(roles);
  }
  if (out[0]) s.bound[ev.id] = out[0];
  return out;
}

// ---------------------------------------------------------------- selection and pacing (EVT-029 … EVT-036)

/** Monthly chance from an expected wait of `meanYears` (a roll every pool_roll_interval_months). */
export function baseChance(meanYears: number): number {
  return balance.selection.pool_roll_interval_months / (meanYears * 12);
}

/** Follow-up boost of one window at a month: none before, full inside, fading linearly after (EVT-034). */
export function boostAt(b: Boost, at: number, mode: AlternateHistoryMode = "plausible"): number {
  const full = b.boost * preset(mode).follow_up_boost_mult;
  if (at < b.start) return 1;
  if (at <= b.end) return full;
  const fade = balance.follow_ups.boost_decay_years * 12;
  const t = at - b.end;
  if (t >= fade) return 1;
  return 1 + (full - 1) * (1 - t / fade);
}

/** All boosts on an event, multiplied and capped at max_boost (EVT-034). */
export function followUpBoost(s: EventState, event: string, at = now(s.world)): number {
  const product = s.boosts.filter((b) => b.event === event).reduce((m, b) => m * boostAt(b, at, s.rules.mode), 1);
  return Math.min(balance.follow_ups.max_boost, product);
}

/** Registers an event's follow-ups when it fires (EVT-034). */
export function addFollowUps(s: EventState, ev: EventDef, at = now(s.world)): void {
  for (const f of ev.follow_ups ?? []) s.boosts.push({ event: f.event, from: ev.id, start: at + f.delay[0] * 12, end: at + f.delay[1] * 12, boost: f.boost });
}

/** The parts of a pool event's monthly chance (EVT-030, EVT-022, EVT-035). */
/**
 * How strongly the date binds (EVT-019): an approximate event's chance is
 * weighted toward its history year, fading over approximate_spread_years;
 * a mandatory event is certain in the last year of its window; a reference
 * event's date is only a guide.
 */
export function dateFactor(ev: EventDef, year: number): number {
  const a = ev.availability;
  if (a.mode === "mandatory") return a.latest != null && year >= a.latest ? Infinity : 1;
  if (a.mode !== "approximate" || !ev.history) return 1;
  const b = balance.date_binding;
  const hist = Number(historyStart(ev.history.date).slice(0, 4));
  const near = Math.max(0, 1 - Math.abs(year - hist) / b.approximate_spread_years);
  return 1 + (b.approximate_peak_mult - 1) * near;
}

export function poolChance(s: EventState, ev: EventDef, roles: Record<string, string[]>): { base: number; modifiers: number; optional: number; boost: number; date: number; chance: number } {
  const mean = (ev.selection.mean_years ?? 1) * preset(s.rules.mode).mean_years_mult;
  const base = baseChance(mean);
  let modifiers = 1;
  for (const m of ev.selection.modifiers ?? []) if (holdsIfBound(m.if ?? m.condition, s.world, ctxOf(s, roles)) === true) modifiers *= m.mult;
  let optional = 1;
  for (const o of ev.optional ?? []) if (s.world.history.some((h) => h.event === o.event)) optional *= o.weight;
  const boost = followUpBoost(s, ev.id);
  const date = dateFactor(ev, s.world.year);
  return { base, modifiers, optional, boost, date, chance: Math.min(1, base * modifiers * optional * boost * date) };
}

/** The country a firing counts against for pacing: the first bound role holder. */
export function pacingCountry(ev: EventDef, roles: Record<string, string[]>): string | undefined {
  const lead = Object.keys(ev.roles).find((n) => ev.roles[n]!.select !== "fixed") ?? Object.keys(ev.roles)[0];
  return lead ? roles[lead]?.[0] : undefined;
}

/** At most max_pool_events_per_country_year pool events per country per year (EVT-033). */
export function underPacingCap(s: EventState, countryId: string | undefined, year = s.world.year): boolean {
  if (!countryId) return true;
  return (s.poolFired[`${countryId}:${year}`] ?? 0) < balance.selection.max_pool_events_per_country_year;
}

// ---------------------------------------------------------------- options and choice (EVT-039 … EVT-044)

/** Options whose `allowed` holds for the chooser (EVT-041). */
export function visibleOptions(s: EventState, ev: EventDef, roles: Record<string, string[]>): OptionDef[] {
  return ev.options.filter((o) => holdsIfBound(o.allowed, s.world, ctxOf(s, roles)) !== false);
}

/** The country whose controller answers an option, or undefined for a weighted roll (EVT-040). */
export function chooserOf(o: OptionDef, roles: Record<string, string[]>): string | undefined {
  if (!o.chooser) return undefined;
  return roles[o.chooser.replace(/^\$/, "")]?.[0];
}

/** What the named AI factors read about a chooser (balance ai_factors, EVT-042). */
export interface Situation {
  chooser: string;
  /** The other party of the event, for same_religion and rival. */
  other?: string;
}

/** Whether a named AI factor applies to the chooser (EVT-042). */
export function namedFactorHolds(name: string, w: World, sit: Situation): boolean {
  const r = eventsConfig.ai_factor_rules;
  const c = w.countries[sit.chooser];
  if (!c) return false;
  const o = sit.other ? w.countries[sit.other] : undefined;
  const rival = (a: string, b: string) => (w.countries[a]?.relations ?? []).some((x) => x.other === b && x.type === "rivalry") || (w.countries[b]?.relations ?? []).some((x) => x.other === a && x.type === "rivalry");
  switch (name) {
    case "at_war":
      return (c.enemies ?? []).length > 0;
    case "low_treasury":
      return (c.stats.treasury ?? 0) < (c.stats.expenses ?? 0) * r.low_treasury_years_of_expenses;
    case "high_unrest": {
      // no anger meter (D-EVT-5): more than half the provinces are Plotting (4+ grievances)
      const own = Object.values(w.places).filter((p) => p.owner === sit.chooser);
      const plotting = own.filter((p) => Number(p.stats.grievances ?? 0) >= r.high_unrest_grievances).length;
      return own.length > 0 && plotting / own.length > r.high_unrest_share;
    }
    case "same_religion":
      return !!o && !!c.religion && o.religion === c.religion;
    case "rival":
      return !!sit.other && rival(sit.chooser, sit.other);
    case "great_power": {
      const mine = c.stats.great_power_score ?? 0;
      const rank = 1 + Object.values(w.countries).filter((x) => x.exists !== false && (x.stats.great_power_score ?? 0) > mine).length;
      return rank <= r.great_power_top;
    }
    case "threatened":
      return (c.borders ?? []).some((n) => {
        const nb = w.countries[n];
        const hostile = (c.enemies ?? []).includes(n) || rival(sit.chooser, n);
        return !!nb && hostile && (nb.stats.army_strength ?? 0) > r.threatened_ratio * (c.stats.army_strength ?? 0);
      });
    default:
      throw new Error(`Unknown AI factor: ${name}`);
  }
}

/** An option's AI weight: base × factors × the preset's historical multiplier (EVT-035, EVT-042). */
export function aiWeight(s: EventState, o: OptionDef, roles: Record<string, string[]>, sit?: Situation): number {
  let w = o.ai.base;
  for (const f of o.ai.factors ?? []) {
    if (typeof f.factor === "string") {
      if (sit && namedFactorHolds(f.factor, s.world, sit)) w *= f.mult ?? 1;
    } else if (holdsIfBound(f.if, s.world, ctxOf(s, roles)) === true) w *= f.factor;
  }
  if (o.historical) w *= preset(s.rules.mode).historical_option_mult;
  return w;
}

/** Picks one of several weights with a roll in [0, 1). */
export function pickWeighted<T>(items: readonly T[], weights: readonly number[], roll: number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let at = roll * total;
  for (let i = 0; i < items.length; i++) {
    at -= weights[i]!;
    if (at < 0) return items[i]!;
  }
  return items[items.length - 1]!;
}

/** The AI's (or the roll's) option: weighted by aiWeight (EVT-040, EVT-042). */
export function chooseForAi(s: EventState, ev: EventDef, roles: Record<string, string[]>, rng: Rng, sit?: Situation): OptionDef {
  const opts = visibleOptions(s, ev, roles);
  return pickWeighted(opts, opts.map((o) => aiWeight(s, o, roles, sit)), rng.next());
}

// ---------------------------------------------------------------- firing and answering

/** Who answers an event: the chooser of its options when one is bound, or nobody (a roll). */
export function controllerOf(ev: EventDef, roles: Record<string, string[]>): string | undefined {
  for (const o of ev.options) {
    const c = chooserOf(o, roles);
    if (c) return c;
  }
  return undefined;
}

/**
 * Fires an event: records it, registers its follow-ups and either queues it
 * for the human chooser (who must answer, EVT-044) or lets the AI or the roll answer at once.
 */
export function fire(s: EventState, ev: EventDef, roles: Record<string, string[]>, rng?: Rng): { option?: OptionDef; queued: boolean } {
  const w = s.world;
  w.history.push({ event: ev.id, year: w.year, month: w.month, roles });
  addFollowUps(s, ev);
  s.log.push({ type: "EventFired", event: ev.id, roles, year: w.year, month: w.month, ...(ev.music ? { music: ev.music } : {}) });
  const controller = controllerOf(ev, roles);
  if (controller && w.countries[controller]?.human) {
    s.pending.push({ event: ev.id, roles, controller, kind: "fired", at: now(w) });
    return { queued: true };
  }
  if (!rng) return { queued: false };
  const option = chooseForAi(s, ev, roles, rng);
  answer(s, ev, roles, option.id);
  return { option, queued: false };
}

/** Offers a decision to its chooser's controller (EVT-031). */
export function offer(s: EventState, ev: EventDef, roles: Record<string, string[]>): Pending {
  const controller = controllerOf(ev, roles);
  const p: Pending = { event: ev.id, roles, kind: "offered", at: now(s.world), ...(controller ? { controller } : {}) };
  s.pending.push(p);
  s.log.push({ type: "DecisionOffered", event: ev.id, controller });
  return p;
}

/**
 * Answers an event: event-level effects plus the option's effects
 * (EVT-043), by tier (EVT-045). Starts a duration event running (EVT-037).
 */
export function answer(s: EventState, ev: EventDef, roles: Record<string, string[]>, optionId: string): Applied[] {
  const o = ev.options.find((x) => x.id === optionId);
  if (!o) throw new Error(`${ev.id} has no option ${optionId}`);
  const w = s.world;
  const last = [...w.history].reverse().find((h) => h.event === ev.id && !h.option);
  if (last) last.option = optionId;
  else w.history.push({ event: ev.id, year: w.year, month: w.month, roles, option: optionId });
  s.pending = s.pending.filter((p) => !(p.event === ev.id && JSON.stringify(p.roles) === JSON.stringify(roles)));
  s.log.push({ type: "OptionChosen", event: ev.id, option: optionId, historical: o.historical === true });
  const out: Applied[] = [];
  const ctx = ctxOf(s, roles);
  for (const tier of [ev.effects, o.effects]) {
    applyEffects(tier.immediate, w, ctx, out);
    applyEffects(tier.long_term, w, ctx, out);
    for (const d of tier.delayed ?? []) s.delayed.push({ due: now(w) + delayYears(d) * 12, effect: d, roles });
  }
  const years = ev.execution?.duration_years;
  if (years) {
    w.running.push({ event: ev.id, roles, option: optionId, start: now(w), end: now(w) + years * 12 });
    for (const tier of [ev.effects, o.effects]) applyEffects(tier.ongoing, w, ctx, out);
  }
  afterEffects(s, out);
  return out;
}

/**
 * What stops a player's End turn (EVT-044): the first event waiting for that
 * country's answer, oldest first. Nothing answers it for them.
 */
export function unansweredFor(s: EventState, controller: string): Pending | undefined {
  return s.pending.filter((p) => p.controller === controller).sort((a, b) => a.at - b.at)[0];
}

/**
 * Decisions an AI controller left unanswered for decision_expiry_years lapse
 * and re-enter the pool (EVT-032). A player's decision never lapses (D-EVT-8).
 */
export function lapseDecisions(s: EventState): string[] {
  const w = s.world;
  const limit = balance.selection.decision_expiry_years * 12;
  const gone = s.pending.filter((p) => p.kind === "offered" && !(p.controller && w.countries[p.controller]?.human) && now(w) - p.at >= limit);
  for (const p of gone) {
    s.pending = s.pending.filter((x) => x !== p);
    if (!s.lapsed.includes(p.event)) s.lapsed.push(p.event);
    s.log.push({ type: "DecisionLapsed", event: p.event, controller: p.controller });
  }
  return gone.map((p) => p.event);
}

/** How an eligible event is selected now: a lapsed decision is rolled as a pool event (EVT-032). */
export function selectionMode(s: EventState, ev: EventDef): EventDef["selection"]["mode"] {
  return ev.selection.mode === "decision" && s.lapsed.includes(ev.id) ? "pool" : ev.selection.mode;
}

/**
 * When a rising tagged with an event ends (rebellions), the option chosen
 * applies its rising_won or rising_crushed effects (EVT-068, D-EVT-11).
 */
export function risingEnded(s: EventState, event: string, won: boolean): Applied[] {
  const ev = s.events[event];
  const w = s.world;
  const last = [...w.history].reverse().find((h) => h.event === event && h.option);
  if (!ev || !last) return [];
  const o = ev.options.find((x) => x.id === last.option);
  const out: Applied[] = [];
  const tier = won ? "rising_won" : "rising_crushed";
  applyEffects(ev.effects[tier], w, ctxOf(s, last.roles), out);
  if (o) applyEffects(o.effects[tier], w, ctxOf(s, last.roles), out);
  s.log.push({ type: "RisingTierApplied", event, tier });
  afterEffects(s, out);
  return out;
}

function delayYears(d: Effect): number {
  const a = d.after_years ?? d.years;
  return Array.isArray(a) ? Number(a[0]) : Number(a ?? 0);
}

/** Engine reactions to applied effects: re-emergence of created entities. */
function afterEffects(s: EventState, out: Applied[]): void {
  for (const a of out) {
    if (a.type === "create_country" && a.target) reemerge(s, a.target);
    s.log.push({ type: "EffectApplied", effect: a.type, target: a.target, values: a.values });
  }
}

/**
 * Ticks what runs each month: delayed effects that fall due, ongoing effects
 * of running events, `maintain` and `cancel_if`, durations, modifier expiry (EVT-037, EVT-045).
 */
export function tick(s: EventState): Applied[] {
  const w = s.world;
  const at = now(w);
  const out: Applied[] = [];
  const due = s.delayed.filter((d) => d.due <= at);
  s.delayed = s.delayed.filter((d) => d.due > at);
  for (const d of due) applyEffects([d.effect], w, ctxOf(s, d.roles), out);
  for (const r of [...w.running]) {
    const ev = s.events[r.event];
    if (!ev) continue;
    const ctx = ctxOf(s, r.roles);
    const ex = ev.execution ?? {};
    let stop: string | undefined;
    if (ex.cancel_if && holdsIfBound(ex.cancel_if, w, ctx) === true) stop = "cancelled";
    else if (ex.maintain && holdsIfBound(ex.maintain, w, ctx) === false) stop = "maintain failed";
    else if (at >= r.end) stop = "ended";
    if (stop) {
      w.running = w.running.filter((x) => x !== r);
      s.log.push({ type: stop === "ended" ? "EventEnded" : "EventCancelled", event: r.event, reason: stop });
      continue;
    }
    const o = ev.options.find((x) => x.id === r.option);
    applyEffects(ev.effects.ongoing, w, ctx, out);
    if (o) applyEffects(o.effects.ongoing, w, ctx, out);
  }
  w.modifiers = w.modifiers.filter((m) => !expired(m, at));
  w.flags = w.flags.filter((f) => f.until === undefined || f.until > at);
  deriveAll(w);
  afterEffects(s, out);
  return out;
}

/** Advances the calendar by one month. */
export function nextMonth(w: World): void {
  w.month += 1;
  if (w.month > 12) {
    w.month = 1;
    w.year += 1;
  }
}

/**
 * The events' monthly work (spec 9), run in the turn in which a new month
 * begins (X-18): yearly age and period checks in January, eligibility, immediate firing, pool rolls under
 * the pacing cap, decision offers, then the ticks. Stops at the end date.
 */
export function processMonth(s: EventState, rng: Rng): DomainEvent[] {
  const w = s.world;
  const from = s.log.length;
  if (s.ended) return [];
  if (campaignOver(w, s.rules.endDate, 31)) {
    s.ended = true;
    // every running age is cut at the end date (X-14)
    for (const a of w.ages) {
      s.agesEnded.push(a);
      s.log.push({ type: "AgeEnded", age: a, year: w.year, cut: true });
    }
    w.ages = [];
    s.log.push({ type: "CampaignEnded", year: w.year, month: w.month });
    return s.log.slice(from);
  }
  if (w.month === 1) {
    yearlyAgeCheck(s, w.year);
    periodCheck(s, w.year);
  }
  lapseDecisions(s);
  for (const ev of Object.values(s.events)) {
    const mode = selectionMode(s, ev);
    for (const roles of eligible(s, ev)) {
      if (mode === "immediate") fire(s, ev, roles, rng);
      else if (mode === "decision") {
        if (!s.pending.some((p) => p.event === ev.id && JSON.stringify(p.roles) === JSON.stringify(roles))) offer(s, ev, roles);
      } else {
        const who = pacingCountry(ev, roles);
        const { chance } = poolChance(s, ev, roles);
        if (rng.next() >= chance) continue;
        if (!underPacingCap(s, who)) continue;
        if (who) s.poolFired[`${who}:${w.year}`] = (s.poolFired[`${who}:${w.year}`] ?? 0) + 1;
        fire(s, ev, roles, rng);
      }
      if (ev.availability.repeat === "one_time") break;
    }
  }
  tick(s);
  return s.log.slice(from);
}

/** True when the condition tree uses a leaf type anywhere. */
export function usesCondition(c: unknown, type: string): boolean {
  let found = false;
  leaves(c, (t) => {
    if (t === type) found = true;
  });
  return found;
}

/** Effect types used by an effects block. */
export function effectTypes(list: Effect[] | undefined): string[] {
  return (list ?? []).map((e) => effectType(e)[0]);
}

export { resolve };
