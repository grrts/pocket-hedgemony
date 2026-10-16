import { CucumberExpression, ParameterTypeRegistry, RegularExpression, type Expression } from "@cucumber/cucumber-expressions";

/** A data table from a step, as rows of cells. The first row is the header when the step says so. */
export type Table = string[][];

/** State shared by the steps of one scenario. Each scenario starts with an empty one. */
export type Scenario = Record<string, any>;

export type StepFn = (s: Scenario, ...args: any[]) => void | Promise<void>;

export interface StepDefinition {
  expression: Expression;
  fn: StepFn;
  pattern: string;
  /** The bounded context whose features may use this step, or "common" for all. */
  context: string;
}

const parameterTypes = new ParameterTypeRegistry();
const definitions: StepDefinition[] = [];

type Define = (pattern: string | RegExp, fn: StepFn) => void;

/**
 * Step definitions for one bounded context: they match only that context's
 * features, so two contexts may word a step the same way and mean different
 * things. Use "common" for steps every context shares. Given, When and Then
 * are the same thing, as in Cucumber: the keyword only helps the reader.
 * Patterns are Cucumber expressions ({string}, {int}, {float}, {word}) or
 * regular expressions.
 */
export function steps(context: string): { Given: Define; When: Define; Then: Define } {
  const define: Define = (pattern, fn) => {
    const expression = typeof pattern === "string" ? new CucumberExpression(pattern, parameterTypes) : new RegularExpression(pattern, parameterTypes);
    definitions.push({ expression, fn, pattern: String(pattern), context });
  };
  return { Given: define, When: define, Then: define };
}

export interface Match {
  definition: StepDefinition;
  args: unknown[];
}

export function match(text: string, context: string): Match[] {
  const found: Match[] = [];
  for (const definition of definitions) {
    if (definition.context !== context && definition.context !== "common") continue;
    const args = definition.expression.match(text);
    if (args) found.push({ definition, args: args.map((a) => a.getValue(null)) });
  }
  return found;
}

export function definitionCount(): number {
  return definitions.length;
}
