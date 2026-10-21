import { describe, expect, it } from "vitest";
import { loadDefaultRuleset } from "@ph/rules";
import { createWorld, setPlayer, type World } from "../src/index.ts";
import { aiWarChanceFactor, incomePaidIn, risingChanceByDifficulty, setDifficulty } from "../src/difficulty.ts";
import { DEFAULT_DIFFICULTY, DIFFICULTIES, difficultyEffects, difficultyOf } from "../src/domain/scenario-setup/campaign.ts";
import { DEFAULT_OPTIONS } from "../src/domain/saves/library.ts";
import { restoreWorld, worldChunks } from "../src/domain/saves/world-chunks.ts";
import { runLedger } from "../src/treasury.ts";
import { risingChanceIn } from "../src/rebels.ts";
import { aiDeclarations } from "../src/war.ts";
import { GRIEVANCES } from "../src/moods.ts";
import { restoreCampaignEnd, saveCampaignEnd } from "../src/campaignEnd.ts";
import { loadMapTiles } from "../src/node/mapTiles.ts";

const rules = loadDefaultRuleset();
const tiles = loadMapTiles(rules);

function game(level?: string): World {
  const w = createWorld(rules, 7, tiles);
  setPlayer(w, w.nationIndex.get("france")!);
  if (level !== undefined) setDifficulty(w, level);
  return w;
}

/** One world for the checks that only read it: the factors are read live, so switching level is enough. */
let shared: World | undefined;
const one = (level: string): World => {
  shared ??= game();
  setDifficulty(shared, level);
  return shared;
};

/** Four plain grievances: Plotting, 5 % a month as balanced (X-9). */
const FOUR = ["Hungry", "Conscription", "Soldiers quartered", "Ungoverned"].reduce((g, name) => g | (1 << GRIEVANCES.indexOf(name as (typeof GRIEVANCES)[number])), 0);

describe("difficulty (SETUP-099 to SETUP-103)", () => {
  it("has the save library's level names, normal by default, with every factor 1 on normal", () => {
    expect(DIFFICULTIES).toEqual(["easy", "normal", "hard"]);
    expect(DEFAULT_DIFFICULTY).toBe(DEFAULT_OPTIONS.difficulty);
    expect(difficultyEffects("normal")).toEqual({ ai_war_chance: 1, ai_income: 1, player_rising_chance: 1 });
    expect(difficultyEffects("easy")).toEqual({ ai_war_chance: 0.5, ai_income: 0.8, player_rising_chance: 0.75 });
    expect(difficultyEffects("hard")).toEqual({ ai_war_chance: 1.5, ai_income: 1.25, player_rising_chance: 1.25 });
    expect(difficultyOf("nightmare")).toBe("normal");
    expect(difficultyOf(undefined)).toBe("normal");
  });

  it("starts a world on normal and keeps the chosen level through a save", () => {
    expect(createWorld(rules, 7).campaign.difficulty).toBe("normal");
    const w = one("hard");
    const save = worldChunks(w, { playerNation: "france", options: { difficulty: "hard", events: "historical", endDate: "1939-08-31" } });
    expect(restoreWorld(new Map(save.map((c) => [c.id, c])), rules, {}, tiles).world.campaign.difficulty).toBe("hard");
  });

  it("opens a save from before difficulty was kept on normal", () => {
    const w = one("easy");
    const { difficulty: _, ...old } = saveCampaignEnd(w);
    restoreCampaignEnd(w, old, (n) => n);
    expect(w.campaign.difficulty).toBe("normal");
  });

  it("pays an AI realm's income in by the factor, never the player's, and leaves a deficit as it is", () => {
    const w = one("hard");
    const ai = w.nationIndex.get("castile")!;
    expect(incomePaidIn(w, ai, 40)).toBe(50);
    expect(incomePaidIn(w, w.player, 40)).toBe(40);
    expect(incomePaidIn(w, ai, -10)).toBe(-10);
    setDifficulty(w, "easy");
    expect(incomePaidIn(w, ai, 40)).toBe(32);
  });

  it("credits the monthly treasury by the difficulty for AI realms only", () => {
    const paid = (level: string) => {
      const w = one(level);
      const ai = w.nationIndex.get("castile")!;
      const before = [w.nationTreasury[w.player]!, w.nationTreasury[ai]!];
      runLedger(w, true);
      return { player: w.nationTreasury[w.player]! - before[0]!, ai: w.nationTreasury[ai]! - before[1]!, income: w.nationMonthlyIncome[ai]! };
    };
    const normal = paid("normal");
    const hard = paid("hard");
    expect(normal.income).toBeGreaterThan(0);
    expect(normal.ai).toBeCloseTo(normal.income, 9);
    expect(hard.ai).toBeCloseTo(normal.income * 1.25);
    expect(hard.player).toBe(normal.player);
  });

  it("scales the rising chance of the player's plotting provinces only", () => {
    const chances = (level: string) => {
      const w = one(level);
      const mine = w.campaign.playerLands[0]!;
      const theirs = w.provinceOwner.findIndex((o, p) => o >= 0 && o !== w.player && !w.provinceWater[p]);
      w.provinceGrievances[mine] = FOUR;
      w.provinceGrievances[theirs] = FOUR;
      return { mine: risingChanceIn(w, mine), theirs: risingChanceIn(w, theirs) };
    };
    const normal = chances("normal");
    expect(normal.mine).toBeGreaterThan(0);
    expect(chances("hard").mine).toBeCloseTo(normal.mine * 1.25);
    expect(chances("easy").mine).toBeCloseTo(normal.mine * 0.75);
    expect(chances("hard").theirs).toBe(normal.theirs);
    const w = one("hard");
    expect(risingChanceByDifficulty(w, w.campaign.playerLands[0]!, 0.9)).toBe(1);
  });

  it("makes the AI look for wars more readily on hard and less on easy", () => {
    const wars = (level: string) => {
      const w = game(level);
      expect(aiWarChanceFactor(w)).toBe(difficultyEffects(level).ai_war_chance);
      // Every monthly roll lands just above the balanced chance: under the chance on hard, over it on normal and easy.
      const roll = rules.defines.war.aiDeclareChancePerMonth * 1.2;
      w.rng.next = () => roll;
      const before = w.diplomacy.wars.length;
      aiDeclarations(w, []);
      return { wars: w.diplomacy.wars.length - before };
    };
    const normal = wars("normal");
    const hard = wars("hard");
    const easy = wars("easy");
    expect(hard.wars).toBeGreaterThan(normal.wars);
    expect(easy.wars).toBeLessThanOrEqual(normal.wars);
  });
});
