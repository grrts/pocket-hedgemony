export interface GameDate {
  year: number;
  month: number;
}

export interface Defines {
  startDate: GameDate;
  economy: {
    goldPerThousandPeoplePerMonth: number;
    goldPerWealthPerMonth: number;
    startingTreasury: number;
  };
  levies: {
    menPerThousandPeople: number;
    monthlyRecoveryFraction: number;
  };
  military: {
    upkeepPerThousandMenPerMonth: number;
    movementCostPerProvince: number;
  };
}

export interface UnitType {
  id: string;
  name: string;
  cost: number;
  menPerCompany: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface CommanderDef {
  id: string;
  name: string;
  /** Battle strength. */
  might: number;
  /** Outmanoeuvring: faster marches, better retreats. */
  cunning: number;
  /** Keeping an army fed and paid on campaign. */
  logistics: number;
}

export interface NationDef {
  id: string;
  name: string;
  color: string;
  capital: string;
  commanders: CommanderDef[];
}

export type Terrain =
  | "grassland"
  | "farmland"
  | "hills"
  | "mountains"
  | "drylands"
  | "marsh"
  | "forest"
  | "desert"
  | "tundra"
  | "jungle"
  /** Water zones. "sea" lies along a coast; "ocean" is open water far from land. */
  | "sea"
  | "ocean";

export interface ProvinceDef {
  id: string;
  name: string;
  owner: string | null;
  terrain: Terrain;
  /** Thousands of people. Drives taxes and levies. */
  population: number;
  /** 1-10: trade, crafts and land value. Drives income. */
  wealth: number;
  neighbors: string[];
  /** Centre on the world map image, in map pixels. */
  x?: number;
  y?: number;
  coastal?: boolean;
}

/** Size and projection of the world map image (equirectangular). */
export interface MapInfo {
  width: number;
  height: number;
  pxPerDeg: number;
  latTop: number;
  provinceImage: string;
  /** Terrain index per pixel (R channel), only used for the close-zoom art. */
  terrainImage: string;
}

/** Everything the engine needs to run a campaign, loaded from JSON config. */
export interface Ruleset {
  defines: Defines;
  units: UnitType[];
  nations: NationDef[];
  provinces: ProvinceDef[];
  map?: MapInfo;
}
