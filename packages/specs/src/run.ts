import type { Pickle, PickleStep } from "@cucumber/messages";
import { match, type Scenario, type Table } from "./registry.ts";

export type Readiness = { automated: true } | { automated: false; missing: string[] };

/** A scenario is automated when every one of its steps matches exactly one step definition. */
export function readiness(pickle: Pickle, context: string): Readiness {
  const missing = pickle.steps.filter((s) => match(s.text, context).length === 0).map((s) => s.text);
  return missing.length ? { automated: false, missing } : { automated: true };
}

function argument(step: PickleStep): Table | string | undefined {
  if (step.argument?.dataTable) return step.argument.dataTable.rows.map((r) => r.cells.map((c) => c.value));
  if (step.argument?.docString) return step.argument.docString.content;
  return undefined;
}

export async function runPickle(pickle: Pickle, context: string): Promise<Scenario> {
  const scenario: Scenario = {};
  for (const step of pickle.steps) {
    const found = match(step.text, context);
    if (found.length !== 1) throw new Error(`${found.length ? "Ambiguous" : "Undefined"} step: ${step.text}`);
    const { definition, args } = found[0]!;
    const extra = argument(step);
    try {
      await definition.fn(scenario, ...args, ...(extra === undefined ? [] : [extra]));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      err.message = `Step failed: ${step.text}\n${err.message}`;
      throw err;
    }
  }
  return scenario;
}

/** Requirement ids a scenario checks, from tags like @TRADE-004. */
export function requirementIds(pickle: Pickle): string[] {
  return pickle.tags.map((t) => t.name.slice(1)).filter((t) => /^[A-Z]+-\d+$/.test(t));
}
