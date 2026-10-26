import { expect } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import * as E from "@ph/engine";
import { copyWorld } from "@ph/engine/domain/time-and-turns";
import { steps, type Scenario } from "../src/registry.ts";

const { Given, When, Then } = steps("rebellions");

/** The AI raising taxes a rising lowered (REBL-072), on a copy of one whole world with nobody playing. */

const rules = loadDefaultRuleset();
let base: E.World | null = null;
const LIGHT = E.TAX_RATES.indexOf("light");

function world(s: Scenario): E.World {
  if (!s.atWorld) {
    base ??= E.createWorld(rules, 1);
    s.atWorld = copyWorld(base);
    s.atWorld.player = -1;
  }
  return s.atWorld;
}
function province(s: Scenario, name: string): number {
  const p = world(s).rules.provinces.findIndex((d) => d.name === name);
  if (p < 0) throw new Error(`no province called ${name}`);
  return p;
}

Given("a new campaign starts on 11 November 1444 with nobody playing", (s) => expect(world(s).player).toBe(-1));
function lowered(s: Scenario, name: string, keptUntil: number): void {
  const w = world(s);
  const p = province(s, name);
  w.provinceTax[p] = LIGHT;
  w.provinceLightTax[p] = keptUntil;
  w.rebelSparks = w.rebelSparks.filter((x) => x.province !== p);
}
Given("the tax of {string} was lowered to light and nothing keeps it light", (s, name: string) => lowered(s, name, 0));
Given("the tax of {string} was lowered to light and a charter keeps it light for {int} years", (s, name: string, years: number) => lowered(s, name, world(s).date.year + years));
When("the AI raises lowered taxes", (s) => E.aiRestoreTax(world(s)));
Then("{string} pays at its realm's rate", (s, name: string) => expect(world(s).provinceTax[province(s, name)]).toBe(-1));
Then("{string} still pays light tax", (s, name: string) => expect(world(s).provinceTax[province(s, name)]).toBe(LIGHT));
Then("{string} has a new burden", (s, name: string) => expect(world(s).rebelSparks.some((x) => x.province === province(s, name))).toBe(true));
