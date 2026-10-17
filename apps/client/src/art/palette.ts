// The game's 32-colour palette. Every pixel on screen comes from this list
// (nation colours too: tools/mapgen/config.json uses the same values).

export const PALETTE = {
  ink: "#1a1c2c",
  night: "#29366f",
  deepSea: "#243a6b",
  sea: "#2b4f8f",
  shallows: "#3b6fb5",
  foam: "#73eff7",
  slate: "#333c57",
  steel: "#566c86",
  mist: "#94b0c2",
  paper: "#f4f4f4",
  gold: "#ffcd75",
  sun: "#fbf236",
  sand: "#eec39a",
  clay: "#d9a066",
  rust: "#ef7d57",
  blood: "#b13e53",
  plum: "#5d275d",
  grass: "#38b764",
  leaf: "#a7f070",
  moss: "#4b692f",
  pine: "#257179",
  snow: "#cbdbfc",
  rock: "#847e87",
  wheat: "#d9c27a",
  marsh: "#5e7a4a",
  jungle: "#2e6b3a",
  dune: "#e0b878",
  tundra: "#9badb7",
  unowned: "#8a8a7a",
} as const;

/** Terrain order is shared with the map shader. */
export const TERRAINS = [
  "grassland", "farmland", "hills", "mountains", "drylands", "marsh", "forest", "desert", "tundra", "jungle",
  "savanna", "glacier", "badlands", "highlands",
  "snowpeaks", "broadleaf", "mediterranean", "steppe", "dunes", "colddesert", "swamp", "paddies",
] as const;

export const TERRAIN_COLORS: Record<(typeof TERRAINS)[number], string> = {
  grassland: PALETTE.grass,
  farmland: PALETTE.wheat,
  hills: PALETTE.clay,
  mountains: PALETTE.rock,
  drylands: PALETTE.sand,
  marsh: PALETTE.marsh,
  forest: PALETTE.pine,
  desert: PALETTE.dune,
  tundra: PALETTE.tundra,
  jungle: PALETTE.jungle,
  savanna: "#c2b04a",
  glacier: "#e8f0fc",
  badlands: "#b0583a",
  highlands: "#3f7a44",
  snowpeaks: "#dfe6f2",
  broadleaf: "#3a7a3a",
  mediterranean: "#a8a45a",
  steppe: "#c4c278",
  dunes: "#eab060",
  colddesert: "#a89a84",
  swamp: "#3e5a3a",
  paddies: "#6ec060",
};

/** Tile types by landscape, for the art page and docs/terrain.md. */
export const TERRAIN_CATEGORIES: Record<string, readonly (typeof TERRAINS)[number][]> = {
  "Temperate": ["grassland", "farmland", "broadleaf", "mediterranean", "paddies"],
  "Boreal and polar": ["forest", "tundra", "glacier"],
  "Dry lands": ["steppe", "drylands", "desert", "dunes", "colddesert"],
  "Tropical": ["savanna", "jungle"],
  "Wetlands": ["marsh", "swamp"],
  "Hills and mountains": ["hills", "mountains", "snowpeaks", "badlands", "highlands"],
};

/** Ocean colour by depth band: shelf, slope, deep, abyss, trench. */
export const DEPTH_COLORS = ["#3f7fc2", "#2f66aa", "#26518f", "#1e3f74", "#17305c"] as const;

export function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}
