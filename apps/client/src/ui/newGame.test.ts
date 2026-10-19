import { describe, expect, it } from "vitest";
import { DEFAULT_CHOICES } from "@ph/engine/domain/scenario-setup";
import { LAST_CHOICES_KEY, loadLastChoices, newGameOptionsHtml, rulesLine, rulesMeaning, saveLastChoices, setRule } from "./newGame.ts";

const html = (choices = { ...DEFAULT_CHOICES }) => newGameOptionsHtml({ realm: "", realmName: "France", nation: "france", start: "20 September 1378", choices, closeIcon: "x", crownIcon: "" });

describe("the options step of a new game (SETUP-054)", () => {
  it("offers difficulty, events, fog of war, ironman and the end year on one card, then Begin", () => {
    const h = html();
    for (const v of ["easy", "normal", "hard", "historical", "plausible", "free"]) expect(h).toContain(`data-value="${v}"`);
    expect(h.match(/data-rule="fogOfWar"/g)).toHaveLength(2);
    expect(h.match(/data-rule="ironman"/g)).toHaveLength(2);
    expect(h).toContain(`<option value="1939-08-31" selected>`);
    expect(h).toContain(`<option value="1494-08-31">`);
    expect(h).toContain(`data-begin="france"`);
    expect(h).toContain("Begin as France");
  });

  it("marks the chosen values, the defaults to begin with", () => {
    const h = html();
    expect(h).toContain(`aria-checked="true" data-rule="difficulty" data-value="normal"`);
    expect(h).toContain(`aria-checked="true" data-rule="events" data-value="plausible"`);
    expect(h).toContain(`aria-checked="true" data-rule="fogOfWar" data-value="true"`);
    expect(h).toContain(`aria-checked="true" data-rule="ironman" data-value="false"`);
  });

  it("sets a rule from a tap, and says what the rules mean", () => {
    const c = setRule(setRule(setRule(DEFAULT_CHOICES, "ironman", "true"), "fogOfWar", "false"), "difficulty", "hard");
    expect(c).toMatchObject({ ironman: true, fogOfWar: false, difficulty: "hard" });
    expect(setRule(c, "endDate", "1700-08-31").endDate).toBe("1700-08-31");
    expect(rulesMeaning(c).join(" ")).toContain("Achievements count");
    expect(rulesMeaning(DEFAULT_CHOICES).join(" ")).toContain("only in ironman");
    expect(rulesLine({ ...c, events: c.events }, c.ironman)).toBe("Hard · plausible events · no fog · ironman · ends 31 Aug 1939");
  });

  it("remembers the last choices, and starts from the defaults without storage (SETUP-058)", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    saveLastChoices(storage, { ...DEFAULT_CHOICES, difficulty: "easy", ironman: true });
    expect(store.has(LAST_CHOICES_KEY)).toBe(true);
    expect(loadLastChoices(storage)).toMatchObject({ difficulty: "easy", ironman: true });
    expect(loadLastChoices(null)).toEqual(DEFAULT_CHOICES);
    store.set(LAST_CHOICES_KEY, "not json");
    expect(loadLastChoices(storage)).toEqual(DEFAULT_CHOICES);
  });
});
