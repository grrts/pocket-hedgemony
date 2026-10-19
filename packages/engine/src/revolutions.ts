import { revolutionRuler } from "./rulers.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import type { Order } from "./turn.ts";
import * as gov from "./domain/government/index.ts";
import * as rv from "./domain/revolutions/index.ts";
import type { Cause } from "./domain/rebellions/index.ts";
import { Rng } from "./rng.ts";
import { knownSet } from "./research.ts";
import { LOYALTY } from "./lords.ts";
import { grievanceCount, GRIEVANCES, moodIndex } from "./moods.ts";
import { formOf } from "./government.ts";
import { lightTax, openGranary, startRevolutionRising, type Band } from "./rebels.ts";
import { START_YEAR } from "../../rules/src/start.ts";

/**
 * Revolutions in the game (first slice, REVO-082 to REVO-093, D-REVO-17):
 * every realm carries one revolution card, of the estates family while it is
 * a monarchy with no hunger, else of the agrarian family. Its six signs read
 * the game's own stats; with `need` of them lit the card is Ready and breaks
 * out on a monthly roll. The ruler leads it (a regime at once), bends (a
 * charter, and it can come back) or fights it (a tagged rising whose win or
 * defeat sets the regime). A won ordinary rising lights a sign and, on a
 * Ready card or with the capital taken, wins the revolution at once. The
 * rules and regimes are the revolutions context's (domain/revolutions); this
 * file maps the engine's arrays onto them, as rebels.ts does for rebellions.
 */

const G = rv.revolutionsConfig.game;
type Family = keyof typeof G.families;
export type Stance = "lead" | "bend" | "fight";
export type SignKey = "tax" | "hunger" | "restless" | "lords" | "debt" | "rebels";

/** One realm's revolution: its stage, grace, the regime it holds and its ruler. */
export interface RealmRevolution {
  /** Month index (year × 12 + month − 1) the card became Ready, −1 = not Ready. */
  readySince: number;
  /** Month index until which it cannot break out (after a revolution, a Bend or a crushed rising). */
  graceUntil: number;
  /** Stopped by Bend or a crushed or granted rising, until its signs fall below `need` (REVO-032). */
  stopped: boolean;
  /** The family of an outbreak waiting on the player's stance, "" = none. */
  outbreak: string;
  /** The tagged rising fighting it (its id), 0 = none. */
  rising: number;
  /** The regime it holds, "" = none, and when it began. */
  regime: string;
  regimeSince: string;
  /** Form held before the first regime of a run of revolutions, "" = none. */
  formBefore: string;
  /** The ruler: "" = the house that ruled in 1444; else the name of who rules now. */
  ruler: string;
  rulerRule: "kept" | "replaced" | "elected";
  /** The old house lives abroad as pretenders (`emigre_court`). */
  emigre: boolean;
  locks: string[];
  /** Year until which the reaction regime lowers `need` by one. */
  reactionUntil: number;
  /** Year rebels last won against the realm, −1 = never. */
  rebelsWonYear: number;
}

export interface RevolutionState {
  revo: RealmRevolution[];
  /** Its own dice, so a revolution roll never shifts the rest of the month's (seeded from the world). */
  revoRng: Rng | null;
}

const fresh = (): RealmRevolution => ({ readySince: -1, graceUntil: 0, stopped: false, outbreak: "", rising: 0, regime: "", regimeSince: "", formBefore: "", ruler: "", rulerRule: "kept", emigre: false, locks: [], reactionUntil: 0, rebelsWonYear: -1 });

export function createRevolutionState(N: number): RevolutionState {
  return { revo: Array.from({ length: N }, fresh), revoRng: null };
}

const rng = (world: World) => (world.revoRng ??= new Rng(world.weatherSeed ^ 0x2e7017));
const monthIndex = (world: World) => world.date.year * 12 + world.date.month - 1;
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const when = (world: World) => `${MONTH_NAMES[world.date.month - 1]} ${world.date.year}`;
const realmName = (world: World, n: number) => world.rules.nations[n]!.name;
const pname = (world: World, p: number) => world.rules.provinces[p]!.name;
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");
const bit = (g: (typeof GRIEVANCES)[number]) => 1 << GRIEVANCES.indexOf(g);

// ---------------------------------------------------------------- signs

/** What the signs read of one realm, from one pass over the provinces (REVO-082). */
interface Census {
  provinces: Int32Array;
  heavy: Int32Array;
  hungry: Int32Array;
  restless: Int32Array;
  wavering: Int32Array;
  disloyal: Int32Array;
  rebels: Uint8Array;
}

function census(world: World, only = -1): Census {
  const N = world.nationCount;
  const c: Census = { provinces: new Int32Array(N), heavy: new Int32Array(N), hungry: new Int32Array(N), restless: new Int32Array(N), wavering: new Int32Array(N), disloyal: new Int32Array(N), rebels: new Uint8Array(N) };
  const heavy = bit("Heavy taxes");
  const hungry = bit("Hungry");
  const landed = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0 || (only >= 0 && o !== only)) continue;
    c.provinces[o]!++;
    const g = world.provinceGrievances[p]!;
    if (g & heavy) c.heavy[o]!++;
    if (g & hungry) c.hungry[o]!++;
    if (g && moodIndex(world, p) >= 2) c.restless[o]!++;
    if (world.provinceRebels[p]) c.rebels[o] = 1;
    if (world.provinceLord[p]! >= 0) landed.add(world.provinceLord[p]!);
  }
  for (const k of landed) {
    const l = world.lords[k]!;
    if (l.nation < 0) continue;
    const step = LOYALTY.indexOf(l.loyalty);
    if (step >= 1) c.wavering[l.nation]!++;
    if (step >= 2) c.disloyal[l.nation]!++;
  }
  return c;
}

export interface Sign {
  key: SignKey;
  label: string;
  ease: string;
  /** The tab of the player's card that eases it. */
  tab: string;
  lit: boolean;
}

const pct = (x: number) => `${Math.round(x * 100)} %`;

function signsOf(world: World, n: number, c: Census): Sign[] {
  const s = G.signs;
  const all = Math.max(1, c.provinces[n]!);
  const r = world.revo[n]!;
  const income = world.nationMonthlyIncome[n]! * 12;
  return [
    { key: "tax", label: `Heavy taxes in a quarter of the realm (${c.heavy[n]} of ${c.provinces[n]})`, ease: "Lower the tax", tab: "provinces", lit: c.heavy[n]! >= all * s.heavy_taxes_share },
    { key: "hunger", label: `Hunger in a fifth of the realm (${c.hungry[n]} of ${c.provinces[n]})`, ease: "Feed them: castle granaries, less grain sold", tab: "food", lit: c.hungry[n]! >= all * s.hungry_share },
    { key: "restless", label: `Riots or plots in a tenth of the realm (${c.restless[n]} of ${c.provinces[n]})`, ease: "Judges, lighter taxes and food calm provinces", tab: "provinces", lit: c.restless[n]! >= all * s.restless_share },
    { key: "lords", label: `${s.lords_wavering} or more lords waver (${c.wavering[n]} now)`, ease: "Gifts and fiefs win lords back", tab: "lords", lit: c.wavering[n]! >= s.lords_wavering },
    { key: "debt", label: `Debt above a year's income (${fmt(world.nationDebt[n]!)} gold)`, ease: "Repay your loans", tab: "treasury", lit: world.nationDebt[n]! > 0 && world.nationDebt[n]! > income * s.debt_years_of_income },
    { key: "rebels", label: `Rebels hold land, or won in the last ${s.rebels_won_years} years`, ease: "Beat or answer the rebels", tab: "provinces", lit: c.rebels[n] === 1 || (r.rebelsWonYear >= 0 && world.date.year - r.rebelsWonYear < s.rebels_won_years) },
  ];
}

const monarchy = (world: World, n: number) => gov.form(formOf(world, n)).family === "house";

/** Estates while a monarchy without hunger, else agrarian (D-REVO-17). */
function familyOf(world: World, n: number, signs: Sign[]): Family {
  return monarchy(world, n) && !signs.find((s) => s.key === "hunger")!.lit ? "estates" : "agrarian";
}

/** `need`, one lower under the reaction regime (REVO-051). */
const needOf = (world: World, n: number) => G.need - (world.revo[n]!.reactionUntil > world.date.year ? rv.revolutionsConfig.reaction.need_reduction : 0);

/** The spark: a great lord turns against the court (two or more Disloyal). */
const sparkLit = (n: number, c: Census) => c.disloyal[n]! >= G.spark_lords_disloyal;

/** Monthly chance of breaking out while Ready (REVO-083). */
const chanceOf = (n: number, c: Census) => (1 / (12 * G.mean_years)) * (sparkLit(n, c) ? G.spark_mult : 1);

// ---------------------------------------------------------------- the monthly step

/**
 * The monthly revolutions step (spec §9), after the risings: each realm's
 * signs and stage, the roll of a Ready card, and the AI's stance.
 */
export function monthlyRevolutions(world: World, news: News[]): void {
  const m = monthIndex(world);
  const c = census(world);
  for (let n = 0; n < world.nationCount; n++) {
    const r = world.revo[n]!;
    if (world.nationGone[n] || !c.provinces[n] || r.outbreak || r.rising) continue;
    const signs = signsOf(world, n, c);
    const lit = signs.filter((s) => s.lit).length;
    if (lit < needOf(world, n)) {
      // Easing the signs below `need` stops the roll and disarms a stopped revolution (REVO-009, REVO-035).
      r.readySince = -1;
      r.stopped = false;
      continue;
    }
    if (m < r.graceUntil) continue;
    // Never in the month it became Ready (REVO-008).
    if (r.readySince < 0) {
      r.readySince = m;
      continue;
    }
    if (rng(world).next() < chanceOf(n, c)) breakOut(world, n, familyOf(world, n, signs), news);
  }
}

function breakOut(world: World, n: number, family: Family, news: News[]): void {
  const r = world.revo[n]!;
  r.readySince = -1;
  if (n === world.player) {
    r.outbreak = family;
    news.push({ kind: "revolution", text: `Revolution in ${realmName(world, n)}: ${rv.family(family).idea} Choose how to answer it.`, nations: [n], begins: true });
    return;
  }
  takeStance(world, n, aiStance(world, n, family), family, news);
}

/** The AI's stance by weight (REVO-088): Fight leans on whether its armies outnumber the rising. */
function aiStance(world: World, n: number, family: Family): Stance {
  const w = { ...G.ai_weights };
  const p = mostRestless(world, n);
  const a = world.armies;
  let men = 0;
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.owner[i] === n) men += a.men[i]!;
  w.fight *= men > risingGuess(world, p, family) ? G.ai_fight_strong : G.ai_fight_weak;
  const total = w.fight + w.bend + w.lead;
  let roll = rng(world).next() * total;
  for (const s of ["fight", "bend", "lead"] as const) if ((roll -= w[s]) < 0) return s;
  return "lead";
}

/** The realm's most restless province: most grievances, not held by rebels (−1 = none). */
function mostRestless(world: World, n: number): number {
  let best = -1;
  let most = -1;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n || world.provinceRebels[p]) continue;
    const g = grievanceCount(world, p);
    if (g > most) ((most = g), (best = p));
  }
  return best;
}

/** Men a Fight would raise in p, roughly: a third of its recruits (shown before the choice). */
const risingGuess = (world: World, p: number, _f: Family) => (p >= 0 ? Math.round(Math.min(world.provinceRecruits[p]!, world.provinceRecruits[p]! * 0.05 * G.fight_first_musters * 1.1)) : 0);

/** The player's answer to their revolution (the answerRevolution order). */
export function answerRevolution(world: World, n: number, stance: string, news: News[]): string | null {
  const r = world.revo[n];
  if (!r?.outbreak) return "no revolution waits for an answer";
  if (stance !== "lead" && stance !== "bend" && stance !== "fight") return "no such stance";
  takeStance(world, n, stance, r.outbreak as Family, news);
  return null;
}

const STANCE_NEWS: Record<Stance, string> = { lead: "leads it", bend: "bends to it", fight: "fights it" };

/** A stance taken (REVO-084): Lead applies the regime, Bend gives a charter and stops it, Fight raises the tagged rising. */
function takeStance(world: World, n: number, stance: Stance, family: Family, news: News[]): void {
  const r = world.revo[n]!;
  const f = G.families[family];
  const label = rv.family(family).stance_labels[stance];
  r.outbreak = "";
  const year = world.date.year;
  let what: string;
  if (stance === "lead") {
    applyRegime(world, n, f.lead, null);
    what = `"${label}": ${rv.regime(f.lead).name.toLowerCase()}, ${formLine(world, n)}`;
  } else if (stance === "bend") {
    const own = ownProvinces(world, n);
    const heavy = own.filter((p) => world.provinceGrievances[p]! & bit("Heavy taxes"));
    lightTax(world, heavy, year + G.bend_light_tax_years);
    let fed = 0;
    if (family === "agrarian") fed = openGranary(world, own.filter((p) => world.provinceGrievances[p]! & bit("Hungry")), G.bend_granary_months);
    r.stopped = true;
    what = `"${label}": tax light for ${G.bend_light_tax_years} years in ${heavy.length} province${heavy.length === 1 ? "" : "s"}${fed > 0 ? ", the granaries opened" : ""}; stopped, not solved`;
  } else {
    const p = mostRestless(world, n);
    const band = p >= 0 ? startRevolutionRising(world, p, { cause: f.cause as Cause, family, musters: G.fight_first_musters }, news) : null;
    if (band) {
      r.rising = band.id;
      news.push({ kind: "revolution", text: `${n === world.player ? "You fight" : `${realmName(world, n)} fights`} the revolution: ${band.leader?.name ?? "its leaders"} raise${band.leader ? "s" : ""} ${fmt(band.men)} men in ${pname(world, p)}.`, nations: [n], province: p, ...(n === world.player ? { begins: true as const } : {}) });
      notifyNeighbours(world, n, `Revolution in ${realmName(world, n)}: the crown fights it, and ${fmt(band.men)} rise in ${pname(world, p)}.`, news);
      return;
    }
    // Too few rose to fight: the movement scatters before it starts.
    r.stopped = true;
    what = `"${label}": too few rise, and the movement scatters for now`;
  }
  r.graceUntil = monthIndex(world) + 12 * G.grace_years;
  if (n === world.player) news.push({ kind: "revolution", text: `You answer the revolution with ${what}.`, nations: [n] });
  else notifyNeighbours(world, n, `Revolution in ${realmName(world, n)}: the ruler ${STANCE_NEWS[stance]}, ${what}.`, news);
}

const ownProvinces = (world: World, n: number) => {
  const out: number[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) out.push(p);
  return out;
};

/** The realm's form in words for the news. */
const formLine = (world: World, n: number) => `now a ${gov.formName(formOf(world, n)).toLowerCase()}`;

/** A news line for the player's neighbours' revolutions (REVO-093). */
function notifyNeighbours(world: World, n: number, text: string, news: News[]): void {
  const me = world.player;
  if (me < 0 || n === me || !borders(world, me, n)) return;
  news.push({ kind: "revolution", text, nations: [n] });
}

function borders(world: World, a: number, b: number): boolean {
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== a) continue;
    for (let k = world.adjStart[p]!; k < world.adjStart[p + 1]!; k++) if (world.provinceOwner[world.adjList[k]!] === b) return true;
  }
  return false;
}

// ---------------------------------------------------------------- the struggle's end

/** A tagged rising ended (REVO-085): won sets the family's won regime, crushed the reaction, stopped nothing. */
export function revolutionSettled(world: World, b: Band, outcome: "won" | "crushed" | "stopped", news: News[]): void {
  const n = b.owner;
  const r = world.revo[n];
  if (!r) return;
  const family = (b.revolution ?? "agrarian") as Family;
  const f = G.families[family];
  r.rising = 0;
  r.graceUntil = monthIndex(world) + 12 * G.grace_years;
  let text: string;
  if (outcome === "won") {
    applyRegime(world, n, f.fight_won, b.leader?.name ?? null);
    text = `The revolution wins in ${realmName(world, n)}: ${rv.regime(f.fight_won).name.toLowerCase()}, ${formLine(world, n)}${r.rulerRule === "replaced" ? `, ruled by ${r.ruler}` : r.rulerRule === "elected" ? ", its ruler elected" : ""}.`;
  } else if (outcome === "crushed") {
    applyRegime(world, n, f.crushed, null);
    for (const p of b.provinces) world.provinceBattleYear[p] = world.date.year;
    r.stopped = true;
    text = `The revolution in ${realmName(world, n)} is crushed: reaction and bloodshed, and it may come back.`;
  } else {
    r.stopped = true;
    text = `The revolution in ${realmName(world, n)} ends in a deal: stopped, not solved.`;
  }
  if (n === world.player) news.push({ kind: "revolution", text, nations: [n], province: b.provinces[0]!, begins: true });
  else notifyNeighbours(world, n, text, news);
}

/** An ordinary rising won against a realm (REVO-086): the rebels sign lights, and on a Ready card or with the capital taken the revolution wins at once. */
export function rebelsWonAgainst(world: World, b: Band, news: News[]): void {
  const n = b.owner;
  const r = world.revo[n];
  if (!r || world.nationGone[n]) return;
  r.rebelsWonYear = world.date.year;
  if (monthIndex(world) < r.graceUntil || r.outbreak || r.rising) return;
  const c = census(world, n);
  const signs = signsOf(world, n, c);
  const capital = world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1;
  if (signs.filter((s) => s.lit).length < needOf(world, n) && !b.castles.includes(capital)) return;
  const family = familyOf(world, n, signs);
  revolutionSettled(world, { ...b, revolution: family }, "won", news);
}

// ---------------------------------------------------------------- regimes

/** Lords a step less loyal, at most to Disloyal. */
function waverAll(world: World, n: number, to?: string): void {
  const floor = LOYALTY.indexOf("Disloyal");
  for (const l of world.lords) {
    if (l.nation !== n || l.gone) continue;
    const i = LOYALTY.indexOf(l.loyalty);
    const next = to ? Math.max(i, LOYALTY.indexOf(to as (typeof LOYALTY)[number])) : Math.min(floor, i + 1);
    if (next > i) l.loyalty = LOYALTY[next]!;
  }
}

const formIndex = new Map(gov.FORM_IDS.map((id, k) => [id, k]));

/** Applies a regime (REVO-039, REVO-087): form, ruler, locks, and the parts the game carries. */
export function applyRegime(world: World, n: number, id: string, leader: string | null): void {
  const reg = rv.regime(id);
  const r = world.revo[n]!;
  const year = world.date.year;
  if (reg.form && reg.form !== "keep" && reg.form !== "old_form") {
    const to = (reg.form_before_g14 && !knownSet(world, n).has("G14") ? reg.form_before_g14 : reg.form) as gov.FormId;
    if (gov.isFormId(to) && to !== formOf(world, n)) {
      if (!r.formBefore) r.formBefore = formOf(world, n);
      // A revolution sets the form without making it the old form (D-GOV-9, REVO-041).
      world.nationForm[n] = formIndex.get(to)!;
    }
  }
  if (reg.ruler === "replaced") ((r.ruler = leader ?? "a leader of the rising"), (r.rulerRule = "replaced"), (r.emigre = true));
  else if (reg.ruler === "elected") ((r.ruler = ""), (r.rulerRule = "elected"));
  else if (reg.ruler === "deposed") ((r.ruler = ""), (r.rulerRule = "elected"), (r.emigre = true));
  // The ruler on the General tab follows (REALM-233): the rising's leader, or an elected one.
  if (reg.ruler === "replaced" || reg.ruler === "elected" || reg.ruler === "deposed") revolutionRuler(world, n, reg.ruler === "replaced" ? r.ruler : null);
  r.locks = [...(reg.locks ?? [])];
  r.regime = id;
  r.regimeSince = when(world);
  if (id === "reaction") r.reactionUntil = year + rv.revolutionsConfig.reaction.years;
  if (id === "new_dynasty") {
    // Every lord starts Wavering; tax is light everywhere for 10 years (regimes.yaml).
    waverAll(world, n, "Wavering");
    lightTax(world, ownProvinces(world, n), year + G.new_dynasty_light_tax_years);
  }
  // The lords give up their farm land to the villages (agrarian_reform): each loses a loyalty step.
  if (id === "agrarian_reform") waverAll(world, n);
}

// ---------------------------------------------------------------- locks

const LOCK_NAME: Record<string, string> = {
  crushing_taxes: "Crushing taxes",
  grant_fief: "Granting fiefs",
  seize_land: "Seizing a lord's land",
  hire_companies: "Hiring mercenary companies",
  massacre: "Massacring beaten rebels",
  sell_title: "Selling titles",
  revoke_charter: "Revoking town charters",
  call_the_lords: "Calling the lords to arms",
  persecute: "Persecution",
};

/** The lock an order runs into, if any (REVO-087). */
function lockOf(order: Order): string | null {
  switch (order.type) {
    case "setTax":
      return order.rate === 4 ? "crushing_taxes" : null;
    case "grantFief":
      return "grant_fief";
    case "seizeFief":
      return "seize_land";
    case "hire":
      return "hire_companies";
    case "treatRebels":
      return order.treatment === "Massacre" ? "massacre" : null;
    default:
      return null;
  }
}

/** "Locked by the revolution" when the realm's regime locks the order, else null. */
export function lockedOrder(world: World, n: number, order: Order): string | null {
  const lock = lockOf(order);
  return lock && world.revo[n]?.locks.includes(lock) ? `${LOCK_NAME[lock]}: locked by the revolution` : null;
}

// ---------------------------------------------------------------- the view

export interface StanceView {
  stance: Stance;
  label: string;
  /** What it does, a line each. */
  does: string[];
}

export interface RegimeView {
  id: string;
  name: string;
  loop: string;
  since: string;
  ruler: string;
  formBefore: string | null;
  emigre: boolean;
  locks: { action: string; label: string }[];
}

export interface RevolutionView {
  family: string;
  name: string;
  idea: string;
  stage: "Quiet" | "Brewing" | "Ready" | "Stopped";
  colour: "neutral" | "amber" | "red";
  lit: number;
  need: number;
  warnAt: number;
  /** Lit signs first. */
  signs: Sign[];
  spark: { label: string; mult: number; lit: boolean };
  /** Monthly chance (0..1) while Ready. */
  chance: number;
  /** "Stopped, not solved" and the month the grace ends, or null. */
  stopped: { until: string | null } | null;
  /** The three stances and what each leads to (REVO-005). */
  stances: StanceView[];
  /** True while the outbreak waits on the player's stance. */
  outbreak: boolean;
  /** The tagged rising fighting it (its id), 0 = none. */
  rising: number;
  regime: RegimeView | null;
  /** The ruler line for the Government tab. */
  ruler: string;
}

const RULER: Record<string, string> = { kept: "Your ruler stays", replaced: "The rising's leader rules; your house goes abroad as pretenders", elected: "The ruler is elected; your house goes abroad" };

function regimeLines(world: World, n: number, id: string): string[] {
  const reg = rv.regime(id);
  const lines: string[] = [];
  if (reg.form && reg.form !== "keep") {
    const to = (reg.form_before_g14 && !knownSet(world, n).has("G14") ? reg.form_before_g14 : reg.form) as gov.FormId;
    if (gov.isFormId(to) && to !== formOf(world, n)) {
      const f = gov.form(to);
      lines.push(`Form: ${gov.formName(to).toLowerCase()} (officials ${f.officials}, lords ${f.lords})`);
    }
  }
  if (!lines.length) lines.push(`Form stays ${gov.formName(formOf(world, n)).toLowerCase()}`);
  lines.push(RULER[reg.ruler === "deposed" ? "elected" : (reg.ruler ?? "kept")] ?? RULER.kept!);
  if (reg.locks?.length) lines.push(`Locked: ${reg.locks.map((l) => LOCK_NAME[l]?.toLowerCase() ?? l).join(", ")}`);
  if (id === "new_dynasty") lines.push(`Every lord wavers; tax light everywhere for ${G.new_dynasty_light_tax_years} years`);
  if (id === "agrarian_reform") lines.push("Every lord loses a loyalty step for the land he gives up");
  if (id === "reaction") lines.push(`Bloodshed where they rose; it comes back sooner (one sign fewer for ${rv.revolutionsConfig.reaction.years} years)`);
  return lines;
}

function stancesOf(world: World, n: number, family: Family, c: Census): StanceView[] {
  const f = G.families[family];
  const labels = rv.family(family).stance_labels;
  const own = ownProvinces(world, n);
  const heavy = own.filter((p) => world.provinceGrievances[p]! & bit("Heavy taxes")).length;
  const hungry = own.filter((p) => world.provinceGrievances[p]! & bit("Hungry")).length;
  const p = mostRestless(world, n);
  void c;
  return [
    { stance: "lead", label: labels.lead, does: [`${rv.regime(f.lead).name} at once`, ...regimeLines(world, n, f.lead)] },
    {
      stance: "bend",
      label: labels.bend,
      does: [
        `Tax fixed at light for ${G.bend_light_tax_years} years in ${heavy} province${heavy === 1 ? "" : "s"} with heavy taxes`,
        ...(family === "agrarian" ? [`Castle granaries opened in ${hungry} hungry province${hungry === 1 ? "" : "s"}`] : []),
        `Stopped, not solved: after ${G.grace_years} years it can break out again while the signs stay lit`,
      ],
    },
    {
      stance: "fight",
      label: labels.fight,
      does: [
        p >= 0 ? `About ${fmt(risingGuess(world, p, family))} rise in ${pname(world, p)}` : "Nobody is left to rise",
        `If they win: ${rv.regime(f.fight_won).name.toLowerCase()}. ${regimeLines(world, n, f.fight_won).join(". ")}`,
        `If you crush them: ${rv.regime(f.crushed).name.toLowerCase()}. ${regimeLines(world, n, f.crushed).slice(1).join(". ")}`,
      ],
    },
  ];
}

function rulerLine(world: World, r: RealmRevolution): string {
  if (r.rulerRule === "replaced") return `${r.ruler}, risen from the revolution${r.emigre ? "; the old house lives abroad as pretenders" : ""}`;
  if (r.rulerRule === "elected") return `Elected${r.emigre ? "; the old house lives abroad as pretenders" : ""}`;
  void world;
  return `The house that ruled in ${START_YEAR}`;
}

/** The player's revolution card, regime and ruler (REVO-090 to REVO-092). */
export function revolutionView(world: World, n: number): RevolutionView {
  const c = census(world, n);
  const r = world.revo[n]!;
  const signs = signsOf(world, n, c);
  const family = (r.outbreak || familyOf(world, n, signs)) as Family;
  const fam = rv.family(family);
  const lit = signs.filter((s) => s.lit).length;
  const need = needOf(world, n);
  const m = monthIndex(world);
  const grace = m < r.graceUntil;
  const stage = r.stopped || grace ? "Stopped" : lit === 0 ? "Quiet" : lit < need ? "Brewing" : "Ready";
  const reg = r.regime ? rv.regime(r.regime) : null;
  return {
    family,
    name: fam.name,
    idea: fam.idea,
    stage,
    colour: lit >= need ? "red" : lit >= G.warn_at ? "amber" : "neutral",
    lit,
    need,
    warnAt: G.warn_at,
    signs: [...signs.filter((s) => s.lit), ...signs.filter((s) => !s.lit)],
    spark: { label: "A great lord turns against the court (2 or more Disloyal)", mult: G.spark_mult, lit: sparkLit(n, c) },
    chance: stage === "Ready" ? chanceOf(n, c) : 0,
    stopped: stage === "Stopped" ? { until: grace ? `${MONTH_NAMES[r.graceUntil % 12]} ${Math.floor(r.graceUntil / 12)}` : null } : null,
    stances: stancesOf(world, n, family, c),
    outbreak: !!r.outbreak,
    rising: r.rising,
    regime: reg
      ? { id: reg.id, name: reg.name, loop: reg.loop ?? "", since: r.regimeSince, ruler: rulerLine(world, r), formBefore: r.formBefore ? gov.formName(r.formBefore as gov.FormId) : null, emigre: r.emigre, locks: r.locks.map((l) => ({ action: l, label: LOCK_NAME[l] ?? l })) }
      : null,
    ruler: rulerLine(world, r),
  };
}

// ---------------------------------------------------------------- saves

export interface SavedRevolutions {
  revo: RealmRevolution[];
  rng: number[] | null;
}

export function saveRevolutions(world: World): SavedRevolutions {
  return { revo: world.revo, rng: world.revoRng ? [...world.revoRng.state] : null };
}

/** Restores each realm's revolution by its new index; a save from before revolutions starts every card fresh. */
export function restoreRevolutions(world: World, s: SavedRevolutions, mapN: (old: number) => number): void {
  s.revo.forEach((r, old) => {
    const n = mapN(old);
    if (n >= 0) world.revo[n] = { ...fresh(), ...r, locks: [...(r.locks ?? [])] };
  });
  if (s.rng) world.revoRng = new Rng(Uint32Array.from(s.rng));
}

/** Numbers of the revolutions for the world's hash. */
export function revolutionsHashData(world: World): Float64Array {
  return new Float64Array(world.revo.flatMap((r) => [r.readySince, r.graceUntil, r.stopped ? 1 : 0, r.outbreak.length, r.rising, r.regime.length, r.reactionUntil, r.rebelsWonYear, r.locks.length]));
}
