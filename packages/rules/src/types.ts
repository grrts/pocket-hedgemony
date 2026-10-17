export interface GameDate {
  year: number;
  month: number;
  /** Day of the month the turn starts on; absent means the 1st. Only the first turn starts mid-month (X-5). */
  day?: number;
}

export interface Defines {
  startDate: GameDate;
  economy: {
    goldPerThousandPeoplePerMonth: number;
    goldPerWealthPerMonth: number;
    startingTreasury: number;
    /** Gold at each tax step against normal (none, light, normal, heavy, crushing). */
    taxRateFactor: number[];
    /** Gold a month each official running a province is paid. */
    officialWagePerMonth: number;
  };
  levies: {
    menPerThousandPeople: number;
    monthlyRecoveryFraction: number;
  };
  military: {
    upkeepPerThousandMenPerMonth: number;
  };
  march: MarchDefines;
  war: WarDefines;
  recruit: RecruitDefines;
  living: LivingDefines;
}

/** Wars, sieges and occupation (milestone 1; the warfare context's own numbers stay in domain/warfare.json). */
export interface WarDefines {
  /** Weeks an army must hold a province without walls to occupy it (warfare occupation.hold_months, scaled to the weekly turn). */
  holdWeeks: number;
  /** Tiles within which a commander finds an enemy army and a battle begins: this plus his cunning, between the two bounds (10 to 15). */
  engageBase: number;
  engageMin: number;
  engageMax: number;
  /** Men a side fields for each 4-hour round a battle lasts. */
  menPerBattleRound: number;
  /** Men behind the walls of a capital, a stone castle and an earthwork ring fort. */
  garrison: { capital: number; castle: number; fort: number };
  /** Share of a full garrison that returns each month while not besieged. */
  garrisonRecoveryPerMonth: number;
  /** Months of food in a castle store when a siege begins. */
  castleStoreMonths: number;
  /** Besiegers per garrison man needed to storm a breach. */
  stormRatio: number;
  /** A beaten army smaller than this scatters. */
  disperseBelow: number;
  /** Monthly chance that an AI realm at peace looks for a war. */
  aiDeclareChancePerMonth: number;
  /** The AI only attacks a neighbour this many times weaker. */
  aiDeclareStrengthRatio: number;
}

/** A kind of free company (warfare free_companies): where it gathers and what it fields. */
export interface FreeCompanyDef {
  group: string;
  /** Nations whose capitals the company gathers at. */
  homes: string[];
  names: string[];
  captains: string[];
  /** Share of the company's men by arm, as [lowest, highest]. */
  mix: Record<string, number[]>;
}

/** Raising, paying and training armies (milestone 2; the domain's own numbers stay in domain/recruiting.json and domain/warfare.json). */
export interface RecruitDefines {
  /** Treasury gold per domain gold. */
  goldScale: number;
  /** Weekly turns a levy spends gathering before it takes the field (recruiting: 2 weeks). */
  gatherWeeks: number;
  /** Thousands a province can have waiting to gather at once: its recruit queue (Leroy, 17 Oct). */
  queueMax: number;
  /** Arms a realm can train in 1444, before any invention. */
  armsAtStart: string[];
  /** A free company's size in this age: from min up to max men. */
  freeCompanyMen: { min: number; max: number };
  /** Free companies offered for hire at a time. */
  freeCompaniesForHire: number;
  /** The free companies of the age: where they gather, their names and captains, and each arm's share range of their men. */
  freeCompanies: FreeCompanyDef[];
  /** Share of levies and hired men who leave each month the treasury can't pay them. */
  unpaidDesertion: number;
  /** Weekly turns a free company takes to arrive at the least; farther homes take longer. */
  mercenaryWeeks: number;
  /** Gold to commission an official as a commander. */
  commanderGold: number;
  /** First names for commanders the realm hires. */
  commanderNames: string[];
}

/** Land grounds an army can march over: every Terrain but the water zones. */
export type Ground = Exclude<Terrain, "sea" | "ocean">;

/** Marching and feeding armies (warfare design sections 5 and 6). */
export interface MarchDefines {
  /** Nominal month the domain's troop-movement rules count in; the game's own calendar uses real month lengths (X-3). */
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
  /** Real days added for stepping onto a river tile (no bridges yet). */
  riverCrossingDays: number;
  /** Map tiles in one crossing unit's distance (a province of about 100 km, at about 7 km a tile). */
  tilesPerCrossing: number;
  /** How much slower deep snow makes a march (1 = twice as slow). */
  snowSlowdown: number;
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
  /** Men under arms at the start (1444), a rough historical estimate; realms without one start with a quarter of their troop cap. */
  army?: number;
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
  /** A river runs through it. */
  river?: boolean;
  /** Walls: a stone castle or an earthwork ring fort (warfare design 8.1); none when absent. */
  castle?: "castle" | "fort";
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

/** How a culture puts a name together (data/names.json). */
export type NameStyle = "family" | "family_first" | "of" | "patronym" | "single" | "title";

export interface CultureNames {
  style: NameStyle;
  given: string[];
  family?: string[];
  /** The word joining a patronym: "ibn", "bin". */
  patronym?: string;
  /** Titles after the name: "Bey", "Khan". */
  title?: string[];
}

/** Names for officials and commanders by culture, and each realm's culture (feedback 33). */
export interface NameBook {
  fallback: string;
  cultures: Record<string, CultureNames>;
  nations: Record<string, string>;
}

/** Everything the engine needs to run a campaign, loaded from JSON config. */
export interface Ruleset {
  defines: Defines;
  units: UnitType[];
  nations: NationDef[];
  provinces: ProvinceDef[];
  map?: MapInfo;
  /** Culture names; without them, names come from defines.recruit.commanderNames. */
  names?: NameBook;
}

/** People by class at the start (milestone 3); the classes, birth and death rates are the province context's. */
export interface LivingDefines {
  /** Share of a province's people living in town: base plus a step per wealth above 1, up to the max. */
  townShareBase: number;
  townSharePerWealth: number;
  townShareMax: number;
  /** How townsfolk split by class. */
  townMix: Record<string, number>;
  /** Share of the people without work or home. */
  homelessShare: number;
  /** Share of the countryfolk of a coastal province who fish and sail. */
  coastalSeafolk: number;
  /** How countryfolk split by class on each ground. */
  countryMix: Record<string, Record<string, number>>;
  /** People one worker of a food class feeds a year (province: farm 1.5, bare tiles 0.67); farmers' food comes at the harvest, the rest month by month. */
  foodPerWorker: Record<string, number>;
  /** Months of eating each province holds beyond its first harvest at the start. */
  startingStoreMonths: number;
  /** A province of the same realm with more than this many months stored feeds a hungry neighbour. */
  reliefAboveMonths: number;
}
