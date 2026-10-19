import type { Ruleset } from "@ph/rules";

/**
 * A world that wakes a sleeping realm keeps its own copy of the nation list
 * (SETUP-088, SETUP-091); the build's ruleset stays as it was, so a save's
 * rules hash is the build's and other worlds never see the woken names.
 */
const base = new WeakMap<Ruleset, Ruleset>();

/** A copy of `rules` whose nations this world may change. */
export function ownCopy(rules: Ruleset): Ruleset {
  if (base.has(rules)) return rules;
  const copy: Ruleset = { ...rules, nations: rules.nations.map((d) => ({ ...d })) };
  base.set(copy, rules);
  return copy;
}

/** The build's ruleset a world's copy was made from (itself when it has none). */
export const baseRules = (rules: Ruleset): Ruleset => base.get(rules) ?? rules;
