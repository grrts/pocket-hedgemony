import config from "../../../../rules/data/domain/onboarding.json" with { type: "json" };
import { realmConfig } from "../realm/index.ts";
import { TILE_TYPES } from "../world-map/index.ts";
import { tree, type Tree } from "../research/index.ts";
import { CHAPTERS } from "./tutorial.ts";
import { CHECKS, type Check } from "./attention.ts";

/**
 * Tooltips, "Why?", linked words, the Almanac and measuring (onboarding spec
 * §4–§5, TUT-084 … TUT-097, TUT-114, TUT-115). String tables and the
 * glossary belong to localisation; these functions read them as given.
 */

export type Strings = Record<string, string>;

// ---------------------------------------------------------------- tooltips and Why? (TUT-084 … TUT-087)

/** What a gesture opens on a number, by input (TUT-084, TUT-085). */
export function numberGesture(input: "touch" | "mouse" | "controller", gesture: string): "tooltip" | "why" | null {
  if ((config.inputs.tooltip_gesture as Record<string, string>)[input] === gesture) return "tooltip";
  if ((config.inputs.why_gesture as Record<string, string>)[input] === gesture) return "why";
  return null;
}

/** A tooltip: the stat's name and one line on what it is. */
export function tooltip(stat: string, strings: Strings): { name: string; line: string } {
  const name = strings[`stat.${stat}.name`];
  const line = strings[`stat.${stat}.line`];
  if (!name || !line) throw new Error(`no tooltip for ${stat}`);
  return { name, line };
}

/** Why?: the full gain and lose list of a stat with this month's numbers, and an Almanac link (TUT-085, TUT-086). */
export function why(stat: string, month: Record<string, number>): { gain: { cause: string; amount: number }[]; lose: { cause: string; amount: number }[]; almanac: string } {
  const st = (realmConfig.stats as Record<string, { gain: string[]; lose: string[] }>)[stat];
  if (!st) throw new Error(`no stat ${stat}`);
  return {
    gain: st.gain.map((cause) => ({ cause, amount: month[cause] ?? 0 })),
    lose: st.lose.map((cause) => ({ cause, amount: month[cause] ?? 0 })),
    almanac: `stats/${stat}`,
  };
}

/** The lint over the UI string tables: every stat key has a tooltip line and an Almanac entry (TUT-087). */
export function lintStats(stats: string[], strings: Strings, almanacEntries: string[]): string[] {
  const errors: string[] = [];
  for (const s of stats) {
    if (!strings[`stat.${s}.line`]) errors.push(`${s}: no tooltip line`);
    if (!almanacEntries.includes(`stats/${s}`)) errors.push(`${s}: no Almanac entry`);
  }
  return errors;
}

export const statKeys = (): string[] => Object.keys(realmConfig.stats);

// ---------------------------------------------------------------- linked words (TUT-088, TUT-089)

/** Glossary: each word form of a language mapped to its Almanac entry. */
export type Glossary = Record<string, string>;

export type Piece = { text: string; link?: string; dotted?: boolean };

/** Links a game term to its Almanac entry the first time it appears; later uses are plain (TUT-088). */
export function linkTerms(text: string, glossary: Glossary): Piece[] {
  const forms = Object.keys(glossary).sort((a, b) => b.length - a.length);
  if (!forms.length) return [{ text }];
  const re = new RegExp(`\\b(${forms.map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "g");
  const linked = new Set<string>();
  const out: Piece[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const entry = glossary[m[0]]!;
    if (linked.has(entry)) continue;
    linked.add(entry);
    if (m.index! > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], link: entry, dotted: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

// ---------------------------------------------------------------- the Almanac (TUT-090 … TUT-097)

/** The Almanac opens offline from the pause menu, any link and any Why? (TUT-090). */
export function openAlmanac(from: string): { offline: true; from: string } {
  if (!config.almanac.opens_from.includes(from)) throw new Error(`the Almanac doesn't open from ${from}`);
  return { offline: true, from };
}

export interface AlmanacContext {
  met: string[];
  eventsSeen: { id: string; history: { summary: string; sources: string[] } }[];
  checks?: Check[];
  tree?: Tree;
}

export interface Almanac {
  "How to play": { topic: string; chapter: number; practice: true }[];
  Stats: { stat: string; gain: string[]; lose: string[] }[];
  Inventions: { name: string; needs: string[]; unlocks: string }[];
  Ground: { type: string; ground: string; startingTiles: string }[];
  Realms: string[];
  "Events seen": { id: string; history: { summary: string; sources: string[] } }[];
  style: string[];
}

/** Builds the generated sections from config and data (TUT-091, TUT-093, TUT-095, TUT-096). */
export function buildAlmanac(ctx: AlmanacContext): Almanac {
  const t = ctx.tree ?? tree();
  return {
    "How to play": CHAPTERS.filter((c) => c.topic).map((c) => ({ topic: c.topic!, chapter: c.n, practice: true })),
    Stats: Object.entries(realmConfig.stats as Record<string, { gain: string[]; lose: string[] }>).map(([stat, v]) => ({ stat, gain: v.gain, lose: v.lose })),
    Inventions: [...t.inventions.values()].map((i) => ({ name: i.name, needs: [i.parent, ...i.or_parents, ...i.also_needs], unlocks: i.unlocks })),
    Ground: TILE_TYPES.map((x) => ({ type: x.type, ground: x.ground, startingTiles: x.startingTiles })),
    Realms: [...ctx.met],
    "Events seen": [...ctx.eventsSeen],
    style: [...config.almanac.style],
  };
}

/** The Stats entry for a check's number reads the checks config, so a patch updates it (TUT-096). */
export function checkEntryNumber(id: string, checks: Check[] = CHECKS): number {
  const c = checks.find((x) => x.id === id);
  if (!c) throw new Error(`no check ${id}`);
  const n = c.under_days ?? c.under_turns;
  if (n === undefined) throw new Error(`${id} has no number`);
  return n;
}

/** Practice this: the How-to-play page's chapter opens (TUT-092). */
export function practiceThis(topic: string): { chapter: number; name: string } {
  const c = CHAPTERS.find((x) => x.topic === topic);
  if (!c) throw new Error(`no chapter for ${topic}`);
  return { chapter: c.n, name: c.name };
}

/** Search: a text box, or a letter wheel on a controller (TUT-094). */
export const almanacSearch = (input: string): string => (config.inputs.search as Record<string, string>)[input]!;

export interface Tip {
  text: string;
  entry: string;
}

/** A loading-screen tip, preferring one linked to an unopened page (TUT-097). */
export function pickTip(tips: Tip[], opened: string[], seed = 0): Tip {
  const fresh = tips.filter((t) => !opened.includes(t.entry));
  const pool = fresh.length ? fresh : tips;
  return pool[seed % pool.length]!;
}

/** The devshirme entry: sourced, with no invented numbers (TUT-053). */
export const devshirmeEntry = () => config.almanac.devshirme_entry;

// ---------------------------------------------------------------- measuring (TUT-114, TUT-115)

export interface Measuring {
  consent: boolean;
  online: boolean;
  queue: { event: string; day: number }[];
  sent: { event: string; day: number }[];
}

export const newMeasuring = (consent: boolean, online = true): Measuring => ({ consent, online, queue: [], sent: [] });

/** One event per step reached, skipped or finished, per entry followed or kind muted, with consent only. */
export function measure(m: Measuring, event: string, day: number): void {
  if (!m.consent) return;
  if (!config.measuring.events.includes(event)) throw new Error(`not measured: ${event}`);
  (m.online ? m.sent : m.queue).push({ event, day });
}

/** Back online: queued events older than 30 days are dropped (TUT-115). */
export function goOnline(m: Measuring, day: number): void {
  m.online = true;
  for (const e of m.queue) if (day - e.day <= config.measuring.offline_retention_days) m.sent.push(e);
  m.queue = [];
}
