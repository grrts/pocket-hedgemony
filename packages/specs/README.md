# @ph/specs

Runs the Gherkin features in `domain/` against the game code. Each bounded context has its step
definitions in `steps/<context>.steps.ts`; `steps/common.steps.ts` holds steps every context shares.

```sh
pnpm --filter @ph/specs test          # run every automated scenario; the rest show as todo
pnpm specs                            # per context: scenarios written, automated, passing
pnpm --filter @ph/specs context-map   # regenerate domain/README.md, context-map-seams.md, open-questions.md
```

A scenario runs only when every one of its steps matches a definition of its own context (or a common
one). It then has to pass. So a context grows one scenario at a time: write the rule in
`packages/engine/src/domain/<context>/`, define the steps, and the scenario turns from todo to passing.

## Writing steps

```ts
import { expect } from "vitest";
import { steps } from "../src/registry.ts";

const { Given, When, Then } = steps("trade");

Given("the trader {string} stands in {string}", (s, trader: string, province: string) => {
  s.trader = { name: trader, at: province };
});
```

- The first argument `s` is the scenario's own state; it starts empty for every scenario.
- Patterns are [Cucumber expressions](https://github.com/cucumber/cucumber-expressions):
  `{string}` for quoted text, `{int}`, `{float}`, `{word}`; or a regular expression.
- A data table arrives as `string[][]`, a doc string as `string`, after the other arguments.
- Never change a feature file to make a step easier: the features are the spec. When a scenario
  cannot pass because the design is open, leave its steps undefined so it stays todo.

## Rules code

Rules live in `packages/engine/src/domain/<context>/index.ts` (imported as `@ph/engine/domain/<context>`):
pure, deterministic TypeScript with no DOM and no `Math.random`. Balance numbers come from JSON in
`packages/rules/data/domain/<context>.json`, never from constants in code.
