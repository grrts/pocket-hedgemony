import { holds, resolve, type Ctx } from "./conditions.ts";
import { applyModifier, modifierTargets, parseChange } from "./modifiers.ts";
import { balance, country, eventsConfig, modifierDef, now, place, type Effect, type World } from "./model.ts";

/**
 * Effects (EVT-045 … EVT-050): one applier per effect type declared in
 * vocabulary.yaml. Each applier changes the world and reports what it did;
 * the owning contexts read those reports (EffectApplied) to land the
 * abstract changes on their own models.
 */

export interface Applied {
  type: string;
  target?: string;
  values: Record<string, unknown>;
}

export type EffectEval = (params: Record<string, unknown>, w: World, ctx: EffectCtx, out: Applied[]) => void;

export interface EffectCtx extends Ctx {
  /** Extra effect appliers (other contexts' effects, e.g. revolutions' regime and lock). */
  effects?: Record<string, EffectEval>;
}

const ENVELOPE = new Set(["after_years", "if", "on", "years"]);

/** The type and params of an effect, with the data's shapes `{on, modifier}` and `{on, stat}`. */
export function effectType(e: Effect): [string, Record<string, unknown>] {
  if ("modifier" in e) return ["modifier", { on: e.on, id: e.modifier, ...(e.years === undefined ? {} : { years: e.years }) }];
  if ("stat" in e && typeof e.stat === "object") return ["stat", { on: e.on, changes: e.stat }];
  const keys = Object.keys(e).filter((k) => !ENVELOPE.has(k));
  if (keys.length !== 1) throw new Error(`An effect has one type: ${JSON.stringify(e)}`);
  const type = keys[0]!;
  const raw = e[type];
  if (raw !== null && typeof raw === "object" && !Array.isArray(raw)) return [type, raw as Record<string, unknown>];
  return [type, { id: raw }];
}

/** Statistics an event may never write directly (EVT-054). */
export function isDerived(stat: string): boolean {
  const s = eventsConfig.statistics as Record<string, Record<string, { kind: string | null }>>;
  return Object.values(s).some((scope) => scope[stat]?.kind === "derived");
}

/** The range of a statistic (EVT-055), if the catalogue gives one. */
export function statRange(stat: string): [number, number] | undefined {
  const s = eventsConfig.statistics as Record<string, Record<string, { range?: number[] | null }>>;
  for (const scope of Object.values(s)) {
    const r = scope[stat]?.range;
    if (r && r.length === 2) return [r[0]!, r[1]!];
  }
  return undefined;
}

function clamp(stat: string, v: number): number {
  const r = statRange(stat);
  return r ? Math.min(r[1], Math.max(r[0], v)) : v;
}

function statsOf(w: World, id: string): Record<string, number | string> {
  return w.countries[id] ? w.countries[id].stats : place(w, id).stats;
}

/** A one-off `+n` / `-n` or `+n%` / `-n%` change (EVT-047). */
export function changeStat(current: number, change: number | string): number {
  const c = parseChange(change);
  return c.percent ? current * (1 + c.value / 100) : current + c.value;
}

function provincesOf(w: World, where: string): string[] {
  const p = w.places[where];
  return p?.provinces?.length ? p.provinces : [where];
}

function relate(w: World, a: string, b: string, type: string, set: boolean): void {
  const c = country(w, a);
  c.relations = (c.relations ?? []).filter((r) => !(r.other === b && r.type === type));
  if (set) c.relations.push({ other: b, type });
}

function shareOf(amount: unknown, of: number): number {
  const s = String(amount);
  return s.endsWith("%") ? (of * Number(s.replace("%", "").replace("+", ""))) / 100 : Number(s);
}

const all = (v: unknown, ctx: Ctx): string[] => (Array.isArray(v) ? v.flatMap((x) => resolve(x, ctx)) : resolve(v, ctx));

/** One applier per effect type of vocabulary.yaml (EVT-046). */
export const EFFECTS: Record<string, EffectEval> = {
  modifier: (p, w, ctx, out) => {
    const def = modifierDef(String(p.id));
    for (const t of resolve(p.on, ctx)) {
      const owned = (c: string) => Object.entries(w.places).filter(([k, v]) => k.startsWith("province:") && v.owner === c).map(([k]) => k);
      for (const target of modifierTargets(def, t, owned)) {
        w.modifiers = applyModifier(w.modifiers, def, target, now(w), p.years === undefined ? def.years : Number(p.years));
        out.push({ type: "modifier", target, values: { id: def.id } });
      }
    }
  },
  stat: (p, w, ctx, out) => {
    for (const t of resolve(p.on, ctx)) {
      const stats = statsOf(w, t);
      for (const [stat, change] of Object.entries(p.changes as Record<string, number | string>)) {
        if (isDerived(stat)) throw new Error(`An event never writes the derived statistic ${stat}; change its inputs or apply a modifier (EVT-054)`);
        const before = Number(stats[stat] ?? 0);
        stats[stat] = clamp(stat, changeStat(before, change));
        out.push({ type: "stat", target: t, values: { stat, change, before, after: stats[stat] } });
      }
    }
  },
  transfer: (p, w, ctx, out) => {
    const from = all(p.from, ctx);
    const [to] = resolve(p.to, ctx);
    for (const k of provincesOf(w, String(p.where))) {
      const pr = place(w, k);
      if (pr.owner !== undefined && from.includes(pr.owner)) {
        pr.owner = to!;
        out.push({ type: "transfer", target: k, values: { to } });
      }
    }
  },
  create_country: (p, w, ctx, out) => {
    const id = String(p.entity);
    const c = country(w, id);
    c.exists = true;
    if (p.where !== undefined) {
      const from = p.from === undefined ? undefined : all(p.from, ctx);
      for (const k of provincesOf(w, String(p.where))) {
        const pr = place(w, k);
        if (!from || pr.owner === undefined || from.includes(pr.owner)) pr.owner = id;
      }
    }
    if (p.subject_of !== undefined) {
      const [over] = resolve(p.subject_of, ctx);
      relate(w, id, over!, "subject", true);
      relate(w, over!, id, "overlord", true);
    }
    out.push({ type: "create_country", target: id, values: { ...p } });
  },
  annex: (p, w, ctx, out) => {
    const [who] = resolve(p.who, ctx);
    for (const target of resolve(p.target, ctx)) {
      for (const pr of Object.values(w.places)) if (pr.owner === target) pr.owner = who!;
      country(w, target).exists = false;
      out.push({ type: "annex", target, values: { who } });
    }
  },
  vassalize: (p, w, ctx, out) => {
    const [who] = resolve(p.who, ctx);
    for (const target of resolve(p.target, ctx)) {
      relate(w, target, who!, "subject", true);
      relate(w, who!, target, "overlord", true);
      out.push({ type: "vassalize", target, values: { who, kind: p.type } });
    }
  },
  release: (p, w, ctx, out) => {
    const [who] = resolve(p.who, ctx);
    for (const target of resolve(p.target, ctx)) {
      relate(w, target, who!, "subject", false);
      relate(w, who!, target, "overlord", false);
      out.push({ type: "release", target, values: { who } });
    }
  },
  war: (p, w, ctx, out) => {
    const attackers = all(p.attackers, ctx);
    const defenders = all(p.defenders, ctx);
    w.wars[String(p.id)] = { id: String(p.id), attackers, defenders, goal: String(p.goal), ongoing: true };
    for (const a of attackers)
      for (const d of defenders) {
        const ca = country(w, a);
        const cd = country(w, d);
        ca.enemies = [...new Set([...(ca.enemies ?? []), d])];
        cd.enemies = [...new Set([...(cd.enemies ?? []), a])];
      }
    out.push({ type: "war", values: { id: p.id, attackers, defenders } });
  },
  peace: (p, w, _ctx, out) => {
    const war = w.wars[String(p.war)];
    if (!war) return;
    war.ongoing = false;
    for (const a of war.attackers)
      for (const d of war.defenders) {
        country(w, a).enemies = (country(w, a).enemies ?? []).filter((x) => x !== d);
        country(w, d).enemies = (country(w, d).enemies ?? []).filter((x) => x !== a);
      }
    out.push({ type: "peace", values: { war: p.war, terms: p.terms } });
  },
  casus_belli: (p, w, ctx, out) => {
    for (const who of resolve(p.who, ctx))
      for (const against of resolve(p.against, ctx)) {
        w.casusBelli.push({ who, against, type: String(p.type), ...(p.years ? { until: now(w) + Number(p.years) * 12 } : {}) });
        out.push({ type: "casus_belli", target: who, values: { against } });
      }
  },
  relation: (p, w, ctx, out) => {
    for (const who of resolve(p.who, ctx))
      for (const other of resolve(p.other, ctx)) {
        relate(w, who, other, String(p.type), p.set !== false);
        out.push({ type: "relation", target: who, values: { other, type: p.type, set: p.set !== false } });
      }
  },
  rebels: (p, w, ctx, out) => {
    for (const on of resolve(p.on, ctx)) {
      w.rebels.push({ on, type: String(p.type), size: String(p.size), ...(p.revolution ? { revolution: String(p.revolution) } : {}) });
      out.push({ type: "rebels", target: on, values: { type: p.type, size: p.size, revolution: p.revolution } });
    }
  },
  spread: (p, w, ctx, out) => {
    const field = ({ ideology: "ideologies", religion: "religionShares", innovation: "innovations", culture: "cultureShares" } as const)[String(p.kind) as "ideology"];
    if (!field) throw new Error(`Unknown spread kind: ${String(p.kind)}`);
    for (const where of resolve(p.where, ctx)) {
      const target = (w.countries[where] ?? place(w, where)) as unknown as Record<string, Record<string, number> | undefined>;
      const map = (target[field] ??= {});
      map[String(p.id)] = Math.min(1, (map[String(p.id)] ?? 0) + Number(p.amount));
      out.push({ type: "spread", target: where, values: { kind: p.kind, id: p.id, amount: p.amount } });
    }
  },
  population: (p, w, ctx, out) => {
    for (const on of resolve(p.on, ctx)) {
      const pl = place(w, on);
      if (p.group !== undefined) {
        const g = (pl.groups ??= {});
        g[String(p.group)] = changeStat(g[String(p.group)] ?? 0, p.change as string);
      } else pl.stats.population = changeStat(Number(pl.stats.population ?? 0), p.change as string);
      out.push({ type: "population", target: on, values: { change: p.change, group: p.group } });
    }
  },
  move_population: (p, w, ctx, out) => {
    const [from] = resolve(p.from, ctx);
    const [to] = resolve(p.to, ctx);
    const g = String(p.group);
    const src = (place(w, from!).groups ??= {});
    const moved = Math.min(src[g] ?? 0, shareOf(p.amount, src[g] ?? 0));
    src[g] = (src[g] ?? 0) - moved;
    const dst = (place(w, to!).groups ??= {});
    dst[g] = (dst[g] ?? 0) + moved;
    out.push({ type: "move_population", target: to!, values: { group: g, from, moved } });
  },
  set_flag: (p, w, ctx, out) => {
    for (const on of resolve(p.on ?? "global", ctx)) {
      const years = Number(p.years ?? 0);
      w.flags = w.flags.filter((f) => !(f.on === on && f.id === p.id));
      w.flags.push({ on, id: String(p.id), ...(years > 0 ? { until: now(w) + years * 12 } : {}) });
      out.push({ type: "set_flag", target: on, values: { id: p.id, years } });
    }
  },
  start_period: (p, w, _ctx, out) => {
    if (!w.periods.includes(String(p.id))) w.periods.push(String(p.id));
    out.push({ type: "start_period", values: { id: p.id } });
  },
  end_period: (p, w, _ctx, out) => {
    w.periods = w.periods.filter((x) => x !== p.id);
    out.push({ type: "end_period", values: { id: p.id } });
  },
  unlock: (p, w, ctx, out) => {
    for (const on of resolve(p.on, ctx)) {
      const c = country(w, on);
      c.unlocked = [...new Set([...(c.unlocked ?? []), String(p.id)])];
      out.push({ type: "unlock", target: on, values: { id: p.id } });
    }
  },
  government: (p, w, ctx, out) => {
    for (const on of resolve(p.on, ctx)) {
      country(w, on).government = String(p.set);
      out.push({ type: "government", target: on, values: { set: p.set } });
    }
  },
  religion: (p, w, ctx, out) => {
    for (const on of resolve(p.on, ctx)) {
      country(w, on).religion = String(p.set);
      out.push({ type: "religion", target: on, values: { set: p.set } });
    }
  },
  trade_route: (p, w, _ctx, out) => {
    const from = String(p.from_hub ?? p.from);
    const to = String(p.to_hub ?? p.to);
    w.tradeRoutes = w.tradeRoutes.filter((r) => !(r.from === from && r.to === to));
    w.tradeRoutes.push({ from, to, open: p.open !== false });
    out.push({ type: "trade_route", values: { from, to, open: p.open !== false } });
  },
  colony: (p, w, ctx, out) => {
    for (const who of resolve(p.who, ctx)) {
      const where = String(p.where);
      w.colonies.push({ who, where, type: String(p.type) });
      const c = country(w, who);
      c.colonies = { ...(c.colonies ?? {}), [where]: (c.colonies?.[where] ?? 0) + 1 };
      out.push({ type: "colony", target: who, values: { where, type: p.type } });
    }
  },
};

/** Applies one effect (its `if`, when present, must hold). */
export function applyEffect(e: Effect, w: World, ctx: EffectCtx, out: Applied[] = []): Applied[] {
  if (e.if !== undefined && !holds(e.if as Record<string, unknown>, w, ctx)) return out;
  const [type, params] = effectType(e);
  const fn = ctx.effects?.[type] ?? EFFECTS[type];
  if (!fn) throw new Error(`Undeclared effect type: ${type}`);
  fn(params, w, ctx, out);
  return out;
}

export function applyEffects(list: Effect[] | undefined, w: World, ctx: EffectCtx, out: Applied[] = []): Applied[] {
  for (const e of list ?? []) applyEffect(e, w, ctx, out);
  return out;
}

/** Rebels raised by a `rebels` effect: size × the province's manpower yield (balance rebel_sizes). */
export function rebelMen(size: string, manpowerYield: number): number {
  const mult = (balance.rebel_sizes as Record<string, number>)[size];
  if (mult === undefined) throw new Error(`Unknown rebel size: ${size}`);
  return mult * manpowerYield;
}

/** Declared effect types (vocabulary.yaml). */
export const DECLARED_EFFECTS = Object.keys(eventsConfig.vocabulary.effects);
