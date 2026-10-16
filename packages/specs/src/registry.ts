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
}

const parameterTypes = new ParameterTypeRegistry();
const definitions: StepDefinition[] = [];

/**
 * Registers a step. Given, When and Then are the same thing, as in Cucumber:
 * the keyword only helps the reader. Patterns are Cucumber expressions
 * ({string}, {int}, {float}, {word}) or regular expressions.
 */
export function step(pattern: string | RegExp, fn: StepFn): void {
  const expression = typeof pattern === "string" ? new CucumberExpression(pattern, parameterTypes) : new RegularExpression(pattern, parameterTypes);
  definitions.push({ expression, fn, pattern: String(pattern) });
}
export const Given = step;
export const When = step;
export const Then = step;

export interface Match {
  definition: StepDefinition;
  args: unknown[];
}

export function match(text: string): Match[] {
  const found: Match[] = [];
  for (const definition of definitions) {
    const args = definition.expression.match(text);
    if (args) found.push({ definition, args: args.map((a) => a.getValue(null)) });
  }
  return found;
}

export function definitionCount(): number {
  return definitions.length;
}
