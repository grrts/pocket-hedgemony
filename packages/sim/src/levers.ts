import type { Ruleset } from "@ph/rules";
// The domain files the engine reads its numbers from, imported by the same
// files the engine imports, so these are the very objects it reads (one module
// per file): a lever scales them in place for one run and puts them back.
import buildings from "../../rules/data/domain/buildings.json" with { type: "json" };
import diplomacy from "../../rules/data/domain/diplomacy.json" with { type: "json" };
import government from "../../rules/data/domain/government.json" with { type: "json" };
import naval from "../../rules/data/domain/naval.json" with { type: "json" };
import province from "../../rules/data/domain/province.json" with { type: "json" };
import realm from "../../rules/data/domain/realm.json" with { type: "json" };
import rebellions from "../../rules/data/domain/rebellions.json" with { type: "json" };
import recruiting from "../../rules/data/domain/recruiting.json" with { type: "json" };
import research from "../../rules/data/domain/research.json" with { type: "json" };
import subjects from "../../rules/data/domain/subjects.json" with { type: "json" };
import trade from "../../rules/data/domain/trade.json" with { type: "json" };
import warfare from "../../rules/data/domain/warfare.json" with { type: "json" };

/**
 * Lever sweeps (BAL-022 to BAL-024). A lever is a dotted path to a number, or
 * to an object or list of numbers, in the rules data: `defines.<path>` in the
 * ruleset's defines, or `<domain file>.<path>` in one of the domain files the
 * game plays by (warfare, diplomacy, realm …). Applying it multiplies every
 * number under the path by the factor; numbers that were whole stay whole.
 * The game's rules are not changed: a run plays with the scaled copy, and
 * domain files are put back as they were when the run ends.
 *
 * "provisional" stands for every key the gameplay domain files list under
 * `_provisional` (DECISIONS rule 4). A provisional key the engine copies into a
 * constant when it loads, rather than reading it when it plays, shows up as a
 * dead lever: the sweep cannot reach it.
 */
export const DOMAIN: Record<string, Record<string, unknown>> = { buildings, diplomacy, government, naval, province, realm, rebellions, recruiting, research, subjects, trade, warfare };

export interface Lever {
  path: string;
  factor: number;
}

/** The levers a sweep runs: the list given, or "provisional" for every provisional key of the domain files that exists as numbers. */
export function sweepLevers(levers: string | readonly string[]): string[] {
  if (typeof levers !== "string") return [...levers];
  if (levers !== "provisional") return levers.split(",").filter(Boolean);
  const out: string[] = [];
  for (const [file, data] of Object.entries(DOMAIN)) {
    const keys = (data as { _provisional?: string[] })._provisional ?? [];
    for (const k of keys) if (hasNumbers(lookup(data, k.split(".")))) out.push(`${file}.${k}`);
  }
  return out;
}

/** Whether a lever names numbers in the rules data (a lever the data lacks yet, such as a key a spec names before it is built, cannot be swept). */
export function leverExists(path: string, rules?: Ruleset): boolean {
  const [file, ...rest] = path.split(".");
  if (file === "defines") return !!rules && hasNumbers(lookup(rules.defines as unknown as Record<string, unknown>, rest));
  const data = DOMAIN[file ?? ""];
  return !!data && hasNumbers(lookup(data, rest));
}

/**
 * Applies a lever for one run: returns the ruleset to play with (a copy with
 * scaled defines, or the same one) and a function that puts the domain file back.
 */
export function applyLever(rules: Ruleset, lever: Lever): { rules: Ruleset; restore: () => void } {
  const [file, ...rest] = lever.path.split(".");
  if (!rest.length) throw new Error(`lever ${lever.path}: name a key inside ${file}`);
  if (file === "defines") {
    const defines = structuredClone(rules.defines) as unknown as Record<string, unknown>;
    scaleAt(defines, rest, lever);
    return { rules: { ...rules, defines: defines as unknown as Ruleset["defines"] }, restore: () => {} };
  }
  const data = DOMAIN[file ?? ""];
  if (!data) throw new Error(`lever ${lever.path}: no domain file "${file}" (one of defines, ${Object.keys(DOMAIN).join(", ")})`);
  const parent = lookup(data, rest.slice(0, -1)) as Record<string, unknown> | undefined;
  const key = rest[rest.length - 1]!;
  if (!parent || typeof parent !== "object" || !(key in parent)) throw new Error(`lever ${lever.path}: not in the rules data`);
  const before = structuredClone(parent[key]);
  scaleInPlace(parent, key, lever.factor);
  return { rules, restore: () => putBack(parent, key, before) };
}

function scaleAt(root: Record<string, unknown>, path: string[], lever: Lever): void {
  const parent = lookup(root, path.slice(0, -1)) as Record<string, unknown> | undefined;
  const key = path[path.length - 1]!;
  if (!parent || typeof parent !== "object" || !(key in parent)) throw new Error(`lever ${lever.path}: not in the rules data`);
  scaleInPlace(parent, key, lever.factor);
}

/** Scales the numbers under parent[key] in place, so code holding a reference to an inner object sees them too. */
function scaleInPlace(parent: Record<string, unknown>, key: string, factor: number): void {
  const v = parent[key];
  if (typeof v === "number") parent[key] = scaled(v, factor);
  else if (v && typeof v === "object") for (const k of Object.keys(v)) if (!k.startsWith("$") && !k.startsWith("_")) scaleInPlace(v as Record<string, unknown>, k, factor);
}

/** Writes `saved` back into parent[key] in place. */
function putBack(parent: Record<string, unknown>, key: string, saved: unknown): void {
  const v = parent[key];
  if (v && typeof v === "object" && saved && typeof saved === "object") for (const k of Object.keys(saved)) putBack(v as Record<string, unknown>, k, (saved as Record<string, unknown>)[k]);
  else parent[key] = saved;
}

/** Every number in `v` times `factor`; whole numbers stay whole (and keep at least their sign's 1). */
export function scaled(v: unknown, factor: number): unknown {
  if (typeof v === "number") {
    if (!Number.isInteger(v)) return v * factor;
    const x = Math.round(v * factor);
    return x === 0 && v !== 0 ? Math.sign(v) : x;
  }
  if (Array.isArray(v)) return v.map((x) => scaled(x, factor));
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k.startsWith("$") || k.startsWith("_") ? x : scaled(x, factor)]));
  return v;
}

function lookup(root: unknown, path: readonly string[]): unknown {
  let at = root;
  for (const k of path) {
    if (!at || typeof at !== "object") return undefined;
    at = (at as Record<string, unknown>)[k];
  }
  return at;
}

function hasNumbers(v: unknown): boolean {
  if (typeof v === "number") return true;
  if (Array.isArray(v)) return v.some(hasNumbers);
  if (v && typeof v === "object") return Object.entries(v).some(([k, x]) => !k.startsWith("$") && hasNumbers(x));
  return false;
}
