import * as E from "../events/index.ts";
import { decree, family, regime, revolution, revolutionsConfig, LOYALTY_STEPS, type Decree, type Sign } from "./model.ts";
import { colourOf, eventOf, litCount, needFor } from "./revolution.ts";
import { actionLabel, grievancesIn, hasFlag, holding, provincesOf, waver, type RevoState } from "./state.ts";

/**
 * After a revolution (REVO-055 … REVO-059), the AI's part (REVO-070,
 * REVO-072 … REVO-074), the phone views (REVO-076, REVO-077) and the
 * regimes' decrees (REVO-052 … REVO-054).
 */

// ---------------------------------------------------------------- the wave (REVO-055)

export interface WaveResult {
  kind: string;
  id?: string;
  amount?: number;
  /** Countries or provinces reached. */
  targets: string[];
}

function neighbours(r: RevoState, country: string): string[] {
  const w = r.es.world;
  const mine = w.countries[country]?.borders ?? [];
  const theirs = Object.entries(w.countries)
    .filter(([, c]) => (c.borders ?? []).includes(country))
    .map(([k]) => k);
  return [...new Set([...mine, ...theirs])].filter((k) => k !== country);
}

function inRegion(r: RevoState, country: string): string[] {
  const w = r.es.world;
  const region = w.countries[country]?.region;
  if (!region) return [];
  return Object.entries(w.countries)
    .filter(([k, c]) => k !== country && c.region === region && c.exists !== false)
    .map(([k]) => k);
}

/** A won revolution spreads its family's wave (REVO-055); from above and restoration spread nothing. */
export function spreadWave(r: RevoState, id: string, country: string): WaveResult {
  const fam = revolution(id).family;
  const wave = revolution(id).wave ?? family(fam).wave;
  const reach = wave.where === "region" ? inRegion(r, country) : wave.where === "neighbours" ? neighbours(r, country) : [];
  const w = r.es.world;
  const g = (revolutionsConfig.wave_grievances as unknown as Record<string, { id: string; where: string } | undefined>)[fam];
  let out: WaveResult;
  if (wave.kind === "ideology" && wave.id && (wave.amount ?? 0) > 0) {
    for (const c of reach) {
      const ideas = (E.country(w, c).ideologies ??= {});
      ideas[wave.id] = Math.min(1, (ideas[wave.id] ?? 0) + wave.amount!);
    }
    out = { kind: "ideology", id: wave.id, amount: wave.amount!, targets: reach };
  } else if (wave.kind === "religion") {
    out = { kind: "faith_wave", amount: wave.amount ?? 0, targets: reach };
  } else if (g && g.where === "neighbouring provinces") {
    const provinces = reach.flatMap((c) => provincesOf(r, c));
    for (const p of provinces) if (!grievancesIn(r, p).includes(g.id)) grievancesIn(r, p).push(g.id);
    out = { kind: "grievance", id: g.id, targets: provinces };
  } else out = { kind: "none", targets: [] };
  if (out.kind !== "none") r.log.push({ type: "WaveSpread", revolution: id, ...out });
  return out;
}

// ---------------------------------------------------------------- émigrés, generals, funding friends (REVO-056, REVO-058, REVO-065)

/** Rivals of a country with an émigré court can fund its pretender (REVO-056, REVO-072). */
export function canFundPretender(r: RevoState, funder: string, country: string): boolean {
  return hasFlag(r, country, "emigre_court") && rivals(r, funder, country);
}

export function rivals(r: RevoState, a: string, b: string): boolean {
  const w = r.es.world;
  const has = (x: string, y: string) => (w.countries[x]?.relations ?? []).some((o) => o.other === y && o.type === "rivalry");
  return has(a, b) || has(b, a);
}
export function allied(r: RevoState, a: string, b: string): boolean {
  const w = r.es.world;
  const has = (x: string, y: string) => (w.countries[x]?.relations ?? []).some((o) => o.other === y && o.type === "alliance");
  return has(a, b) || has(b, a);
}

/** Generals growing too big: × 2 under a regime whose risk says "twice" (REVO-058). */
export function generalsTooBigMult(r: RevoState, country: string): number {
  const id = holding(r, country).regime;
  return id && /twice/i.test(regime(id).risk ?? "") ? revolutionsConfig.generals_too_big_mult : 1;
}
/** The regimes a winning general can switch a republic born in revolution to (REVO-058). */
export function generalSwitches(r: RevoState, country: string): string[] {
  return generalsTooBigMult(r, country) > 1 ? [...revolutionsConfig.generals_switch_to.regimes] : [];
}

/** Monarchy-hostile regimes: their `abroad` line turns every monarchy against them (REVO-065). */
export function hostileToMonarchies(regimeId: string): boolean {
  return /every monarchy|monarchies -/i.test(regime(regimeId).abroad ?? "");
}

/** The new regime's opinion of the funder of a won revolution: +25 unless hostile to its form (REVO-065). */
export function fundedWinOpinion(r: RevoState, regimeId: string, funderGovernment: string | undefined): number {
  const hostile = funderGovernment === "monarchy" && hostileToMonarchies(regimeId);
  return hostile ? 0 : revolutionsConfig.foreign_backing.win_opinion;
}

// ---------------------------------------------------------------- AI (REVO-070, REVO-072 … REVO-074)

export type SignKind = "faith" | "tax" | "debt" | "other";

/** What a sign is about, from its condition and ease hint. */
export function signKind(s: Pick<Sign, "if" | "ease" | "label">): SignKind {
  const text = JSON.stringify(s.if);
  if (/religion|wrong_faith|"faith"/.test(text) || /faith/i.test(s.label)) return "faith";
  if (/"debt"/.test(text)) return "debt";
  if (/heavy_taxes|tax/i.test(text) || /tax/i.test(s.label)) return "tax";
  return "other";
}

/**
 * The order an AI eases its lit signs in, by its ruler's personality
 * (REVO-070): a pious ruler eases faith signs first; a miserly one never
 * eases by cutting taxes and so takes the other signs first.
 */
export function aiEaseOrder(kinds: SignKind[], trait: string): { order: SignKind[]; cutsTaxes: boolean } {
  const t = trait.toLowerCase();
  const order = [...kinds];
  if (t === "pious") order.sort((a, b) => Number(b === "faith") - Number(a === "faith"));
  if (t === "miserly") order.sort((a, b) => Number(a === "tax") - Number(b === "tax"));
  return { order, cutsTaxes: t !== "miserly" };
}

/** The AI eases only while its card is amber or red (REVO-070). */
export function aiEases(r: RevoState, id: string, country: string): boolean {
  const rev = revolution(id);
  const need = needFor(r, id, country);
  return colourOf(litCount(r, id, country), Math.min(rev.signs?.warn_at ?? need, need), need) !== "neutral";
}

/** An émigré host that is a rival of the revolutionary state funds the pretender (REVO-072). */
export function aiFundsPretender(r: RevoState, host: string, country: string): boolean {
  const hosts = r.pretenders.some((p) => p.country === country && p.host === host);
  return hosts && hasFlag(r, country, "emigre_court") && rivals(r, host, country);
}

/** A stronger monarchy holding the counter-revolution reason may use it (REVO-073). */
export function aiUsesCounterRevolution(r: RevoState, monarchy: string, target: string): boolean {
  const w = r.es.world;
  const holds = r.opinions.some((o) => o.from === monarchy && o.to === target && o.reason === "counter_revolution");
  const strong = (w.countries[monarchy]?.stats.army_strength ?? 0) > (w.countries[target]?.stats.army_strength ?? 0);
  return holds && strong && w.countries[monarchy]?.government === "monarchy";
}

/** A rival funds a revolution whose card is amber or red, unless allied (REVO-074). */
export function aiFundsRevolution(r: RevoState, funder: string, target: string, id: string): boolean {
  return rivals(r, funder, target) && !allied(r, funder, target) && aiEases(r, id, target);
}

// ---------------------------------------------------------------- phone views (REVO-076, REVO-077)

/** Province-level signs: grievance signs, met by a province that has the grievance. */
export function provinceSigns(id: string): string[] {
  return (revolution(id).signs?.list ?? []).flatMap((s) => {
    const g = (s.if as { grievance?: { id: string } }).grievance;
    return g ? [g.id] : [];
  });
}

/** The revolution lens: shade by province-level signs met, hatch risen provinces (REVO-076). */
export function lens(r: RevoState, id: string, country: string): { province: string; shade: number; hatched: boolean; colour?: string }[] {
  const ids = provinceSigns(id);
  return provincesOf(r, country).map((p) => {
    const risen = r.risings.some((t) => t.revolution === id && t.castles.includes(p));
    return { province: p, shade: ids.filter((g) => grievancesIn(r, p).includes(g)).length, hatched: risen, ...(risen ? { colour: id } : {}) };
  });
}

/** The regime card on the government screen: loop line, decree buttons, locks greyed (REVO-077). */
export function regimeCard(r: RevoState, country: string): { regime: string; name: string; loop: string; decrees: DecreeButton[]; locked: { action: string; note: string }[] } | null {
  const id = holding(r, country).regime;
  if (!id) return null;
  const reg = regime(id);
  return {
    regime: id,
    name: reg.name,
    loop: reg.loop ?? "",
    decrees: (r.decrees[country] ?? []).map(decreeButton),
    locked: (r.locks[country] ?? []).map((a) => ({ action: a, note: actionLabel(r, country, a).note ?? "" })),
  };
}

// ---------------------------------------------------------------- decrees (REVO-052 … REVO-054)

export interface DecreeButton {
  decree: string;
  card: Decree["card"];
  cost: string;
  limit: string;
}

/** A decree as one button with its cost and limit; source references in brackets are left off (REVO-052). */
export function decreeButton(id: string): DecreeButton {
  const d = decree(id);
  return { decree: id, card: d.card, cost: d.cost.replace(/\s*\([^)]*\)\s*$/, ""), limit: d.limit };
}

/** The decree buttons on a country's country or province card. */
export function decreeButtons(r: RevoState, country: string, card: Decree["card"]): DecreeButton[] {
  return (r.decrees[country] ?? []).map(decreeButton).filter((b) => b.card === card);
}

export interface DecreeInput {
  province?: string;
  /** Yearly income of the state church's tiles (sell_church_lands). */
  churchTileIncome?: number;
  /** chauth (Maratha) or rakhi (Sikh) for protection_tribute; the province's tax and owner. */
  tribute?: "chauth" | "rakhi";
  provinceTax?: number;
  owner?: string;
  refused?: boolean;
}

export interface DecreeResult {
  gains: Record<string, unknown>;
  prices: Record<string, unknown>;
}

type DecreeEffects = Record<string, Record<string, unknown>>;
const effectsOf = (id: string): Record<string, unknown> => {
  const e = (revolutionsConfig.decree_effects as unknown as DecreeEffects)[id];
  if (!e) throw new Error(`No effects data for the decree ${id}`);
  return e;
};

/** Uses a decree the regime granted: its gain and the price the player feels (REVO-053, REVO-054). */
export function useDecree(r: RevoState, country: string, id: string, i: DecreeInput = {}): DecreeResult {
  if (!(r.decrees[country] ?? []).includes(id)) throw new Error(`${country} holds no decree ${id}`);
  const e = effectsOf(id);
  const w = r.es.world;
  const lords = r.lords[country] ?? [];
  const add = (p: string, g: string) => {
    if (!grievancesIn(r, p).includes(g)) grievancesIn(r, p).push(g);
  };
  switch (id) {
    case "sell_church_lands": {
      const gold = Number(e.treasury_years_of_church_income) * (i.churchTileIncome ?? 0);
      const c = E.country(w, country);
      c.stats.treasury = (c.stats.treasury ?? 0) + gold;
      const trait = (e.waver as { lord_trait: string }).lord_trait;
      const wavered = lords.filter((l) => (l.traits ?? []).includes(trait));
      for (const l of wavered) l.loyalty = waver(l.loyalty);
      return { gains: { treasury: gold }, prices: { clergyWaver: true, lordsWaver: wavered.map((l) => l.id) } };
    }
    case "levy_en_masse": {
      const until = E.now(w) + Number(e.grievance_years) * 12;
      for (const p of provincesOf(r, country)) add(p, String(e.grievance));
      return { gains: { levyShareOf: e.levy_share_of, everyClass: true, levyCapMult: e.levy_cap_mult, forOneWar: true }, prices: { grievance: e.grievance, everywhere: true, until } };
    }
    case "revolutionary_tribunal": {
      const step = LOYALTY_STEPS.indexOf(e.removes_loyalty_at_least as never);
      const tried = lords.filter((l) => LOYALTY_STEPS.indexOf(l.loyalty) >= step);
      r.lords[country] = lords.filter((l) => !tried.includes(l));
      const provinces = tried.flatMap((l) => l.provinces ?? []);
      for (const p of provinces) add(p, String(e.grievance));
      return { gains: { removed: tried.map((l) => l.id) }, prices: { grievance: e.grievance, provinces, scholarsMayFlee: e.scholars_may_flee } };
    }
    case "divide_the_estates": {
      const p = i.province ?? "";
      grievancesIn(r, p);
      r.grievances[p] = grievancesIn(r, p).filter((g) => g !== e.ends);
      const lord = lords.find((l) => (l.provinces ?? []).includes(p));
      if (lord) lord.loyalty = e.lord_turns as never;
      return { gains: { tiles: e.tiles_become, ends: e.ends, food: e.food }, prices: { lordTurns: e.lord_turns, lord: lord?.id, exportWares: e.export_wares } };
    }
    case "censorship":
      return { gains: { ideasSpreadMult: e.ideas_spread_mult }, prices: { scholarsPerYear: e.scholars_per_year, pressesAndSchools: e.presses_and_schools } };
    case "protection_tribute": {
      const share = (e.tax_share as Record<string, number>)[i.tribute ?? "chauth"] ?? 0;
      if (i.owner) {
        const c = E.country(w, i.owner);
        (c.opinions ??= {})[country] = (c.opinions[country] ?? 0) + Number(e.owner_opinion);
      }
      if (i.refused && i.province) add(i.province, String(e.refused_grievance));
      return { gains: { taxShare: share, yearly: share * (i.provinceTax ?? 0) }, prices: { ownerOpinion: e.owner_opinion, ...(i.refused ? { raid: e.refused_grievance } : {}) } };
    }
    default:
      throw new Error(`The decree ${id} has no worked-out effect`);
  }
}

/** Call the assembly agrees when fewer than a third of provinces have grievances and the realm is not deep in debt (REVO-054). */
export function assemblyAgrees(r: RevoState, country: string, deepInDebt: boolean): { agrees: boolean; grievancePenalties: boolean } {
  const e = effectsOf("call_the_assembly");
  const ps = provincesOf(r, country);
  const share = ps.length ? ps.filter((p) => grievancesIn(r, p).length > 0).length / ps.length : 0;
  const agrees = (r.decrees[country] ?? []).includes("call_the_assembly") && share < Number(e.agrees_below_grievance_share) && !deepInDebt;
  return { agrees, grievancePenalties: !agrees };
}


/** A restoration may fire for the country with an émigré court: its role selector binds it (REVO-056, REVO-059). */
export function restorationCandidates(r: RevoState): string[] {
  return E.roleCandidates(r.es, eventOf(r, "restoration_of_the_old_order"), "realm");
}
