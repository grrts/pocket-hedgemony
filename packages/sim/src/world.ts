import { loadDefaultRuleset, type Ruleset } from "@ph/rules";
import { createWorld, generateSyntheticRuleset, setDifficulty, type MapTiles, type World } from "@ph/engine";
import { decodeRgb, loadMapTiles } from "@ph/engine/node";

/** "real": the 1444 scenario on the real map; "synthetic": a small made-up world (tests, trying the tools). */
export type MapKind = "real" | "synthetic";

const SYNTHETIC = { provinces: 400, nations: 40 };

let real: { rules: Ruleset; map: MapTiles } | null = null;

/** The ruleset a run plays with. */
export function rulesFor(kind: MapKind): Ruleset {
  if (kind === "synthetic") return generateSyntheticRuleset(loadDefaultRuleset(), SYNTHETIC);
  return realScenario().rules;
}

/** The real map's images as the client hands them to the engine (for the engine host the bot plays through). */
export function mapImagesFor(kind: MapKind): MapTiles | undefined {
  return kind === "real" ? realScenario().map : undefined;
}

/**
 * A new world for an AI-only run: nobody plays it (player -1), so every realm
 * is the AI's. A synthetic world gets the engine's one-tile-a-province grid,
 * as the engine host gives the bot's world without map images. The
 * difficulty is the campaign's (SETUP-099); left out, it plays on normal.
 */
export function newWorld(kind: MapKind, seed: number, rules: Ruleset = rulesFor(kind), difficulty?: string): World {
  const world = kind === "real" ? createWorld(rules, seed, loadMapTiles(rules)) : createWorld(rules, seed);
  world.player = -1;
  if (difficulty !== undefined) setDifficulty(world, difficulty);
  return world;
}

function realScenario(): { rules: Ruleset; map: MapTiles } {
  if (real) return real;
  const rules = loadDefaultRuleset();
  const dir = new URL("../../../apps/client/public/", import.meta.url);
  const ids = decodeRgb(new URL(rules.map?.provinceImage ?? "map/provinces.png", dir).pathname);
  const terrain = decodeRgb(new URL(rules.map?.terrainImage ?? "map/terrain.png", dir).pathname);
  const province = new Uint16Array(ids.width * ids.height);
  for (let p = 0, i = 0; p < province.length; p++, i += 3) province[p] = (ids.rgb[i]! << 16) | (ids.rgb[i + 1]! << 8) | ids.rgb[i + 2]!;
  real = { rules, map: { width: ids.width, height: ids.height, province, terrain: terrain.rgb } };
  return real;
}
