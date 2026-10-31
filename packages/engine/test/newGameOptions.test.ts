import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createEngineHost, createWorld } from "../src/index.ts";
import { campaignOptionsOf, DEFAULT_CHOICES, DIFFICULTIES, endYears, newGameChoices } from "../src/domain/scenario-setup/campaign.ts";
import { newCampaign, type SaveHeader } from "../src/domain/saves/index.ts";
import { Rng } from "../src/rng.ts";

// The new game's options step (SETUP-054, SETUP-055, SHELL-033): what it offers, and what each choice does.
describe("the options step's choices", () => {
  it("offers easy, normal and hard, normal by default, with plausible events, fog on, ironman off and 31 August 1939", () => {
    expect(DIFFICULTIES).toEqual(["easy", "normal", "hard"]);
    expect(DEFAULT_CHOICES).toEqual({ difficulty: "normal", events: "plausible", fogOfWar: true, ironman: false, endDate: "1939-08-31" });
    expect(endYears()[0]).toBe(1494);
    expect(endYears().at(-1)).toBe(1939);
  });

  it("keeps what is offered and puts the default in place of anything else", () => {
    expect(newGameChoices({ difficulty: "hard", events: "free", fogOfWar: false, ironman: true, endDate: "1600-08-31" })).toEqual({ difficulty: "hard", events: "free", fogOfWar: false, ironman: true, endDate: "1600-08-31" });
    expect(newGameChoices({ difficulty: "nightmare", events: "divergent", fogOfWar: "yes", endDate: "1950-08-31" })).toEqual(DEFAULT_CHOICES);
    expect(newGameChoices({ endDate: "1600-01-01" }).endDate).toBe("1939-08-31");
    expect(newGameChoices(null)).toEqual(DEFAULT_CHOICES);
  });

  it("saves difficulty, events, end date and fog as the campaign options; ironman is the campaign's own flag", () => {
    expect(campaignOptionsOf(newGameChoices({ difficulty: "easy", ironman: true }))).toEqual({ difficulty: "easy", events: "plausible", endDate: "1939-08-31", fogOfWar: true });
  });
});

describe("a new game with the options", () => {
  const rules = loadDefaultRuleset();

  it("keeps the options on the world, plays the chosen events preset and ends on the chosen date", () => {
    const host = createEngineHost(() => rules);
    host({ id: 1, type: "newGame", seed: 1, playerNation: "france", choices: { difficulty: "hard", events: "historical", endDate: "1700-08-31" } });
    const w = host.world()!;
    expect(w.campaign.difficulty).toBe("hard");
    expect(w.events!.state.rules.mode).toBe("historical");
    expect(w.campaign.endDate).toBe("1700-08-31");
    host({ id: 2, type: "newGame", seed: 1, playerNation: "france", choices: { events: "free" } });
    expect(host.world()!.events!.state.rules.mode).toBe("divergent");
    host({ id: 3, type: "newGame", seed: 1, playerNation: "france", choices: { events: "plausible" } });
    expect(host.world()!.events!.state.rules.mode).toBe("plausible");
    expect(host.world()!.options).not.toHaveProperty("difficulty");
  });

  it("takes the difficulty sent on its own, as the AI difficulty work sends it", () => {
    const host = createEngineHost(() => rules);
    host({ id: 1, type: "newGame", seed: 1, playerNation: "france", difficulty: "easy" });
    expect(host.world()!.campaign.difficulty).toBe("easy");
  });

  it("a world made without options plays as before", () => {
    const w = createWorld(rules, 1);
    expect(w.options).toBeUndefined();
    expect(w.events!.state.rules.mode).toBe("plausible");
  });

  it("earns achievements only in ironman (ACH-034)", () => {
    const host = createEngineHost(() => rules);
    const eligible = (choices: { ironman: boolean }) => {
      const r = host({ id: 1, type: "newGame", seed: 1, playerNation: "france", choices });
      return (r.response as { snapshot: { achievements: { eligible: boolean } } }).snapshot.achievements.eligible;
    };
    expect(eligible({ ironman: true })).toBe(true);
    expect(eligible({ ironman: false })).toBe(false);
  });

  it("keeps the rules through a save and a load", () => {
    const host = createEngineHost(() => rules);
    host({ id: 1, type: "newGame", seed: 1, playerNation: "france", choices: { difficulty: "easy", events: "historical", ironman: true } });
    const options = campaignOptionsOf(newGameChoices({ difficulty: "easy", events: "historical" }));
    const campaign = newCampaign(new Rng(5), { playerNation: "france", nationName: "France", ironman: true, options });
    const saved = host({ id: 2, type: "save", kind: "ironman", campaign, listing: [], device: "test", platform: "web", gameVersion: "1", now: 1_700_000_000_000 });
    const r = saved.response as { type: string; bytes: Uint8Array; header: SaveHeader };
    expect(r.type).toBe("saved");
    expect(r.header.options.difficulty).toBe("easy");
    expect(r.header.ironman).toBe(true);
    const other = createEngineHost(() => rules);
    expect(other({ id: 3, type: "load", bytes: r.bytes }).response.type).toBe("snapshot");
    const w = other.world()!;
    expect(w.campaign.difficulty).toBe("easy");
    expect(w.events!.state.rules.mode).toBe("historical");
  });
});
