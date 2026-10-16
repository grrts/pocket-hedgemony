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
  };
  march: MarchDefines;
}

/** Land grounds an army can march over: every Terrain but the water zones. */
export type Ground = Exclude<Terrain, "sea" | "ocean">;

/** Marching and feeding armies (warfare design sections 5 and 6). */
export interface MarchDefines {
  daysPerMonth: number;
  /** Real days for one unit in the days-to-cross table. */
  daysPerCrossing: number;
  /** Province design 3.1: crossing units per ground. */
  daysToCross: Record<Ground, number>;
  /** Share of a province's store an army can find there (rich 1, fair 0.6, poor 0.3, almost none 0.1). */
  foraging: Record<Ground, number>;
  /** An all-horse army marches this much faster (0.5 = 1.5 times). */
  horseSpeedBonus: number;
  /** Extra crossing units per province for an army bigger than the forage limit there. */
  bigArmyExtraCrossings: number;
  rationsPerSoldier: number;
  rationsPerHorse: number;
  /** Food a province can spare each month, in rations per person living there. */
  rationsStoredPerPerson: number;
  /** How many months of food an army's wagons carry. */
  monthsCarried: number;
  /** Rations cut per point of the commander's logistics. */
  logisticsRationCut: number;
  /** Men (and horses) lost in a month with no food at all. */
  hungerLossPerMonth: number;
  startingHorseShare: number;
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
  | "savanna"
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
