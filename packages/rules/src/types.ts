export interface GameDate {
  year: number;
  month: number;
}

export interface Defines {
  startDate: GameDate;
  economy: {
    taxPerBaseTaxPerMonth: number;
    productionPerBaseProductionPerMonth: number;
    startingTreasury: number;
  };
  manpower: {
    menPerBaseManpower: number;
    monthlyRecoveryFraction: number;
  };
  military: {
    maintenancePerThousandMenPerMonth: number;
    movementCostPerProvince: number;
  };
}

export interface UnitType {
  id: string;
  name: string;
  cost: number;
  manpowerPerRegiment: number;
  attack: number;
  defense: number;
  speed: number;
}

export interface CommanderDef {
  id: string;
  name: string;
  fire: number;
  shock: number;
  maneuver: number;
  siege: number;
}

export interface NationDef {
  id: string;
  name: string;
  color: string;
  capital: string;
  commanders: CommanderDef[];
}

export type Terrain = "grassland" | "farmland" | "hills" | "mountains" | "drylands" | "marsh" | "forest" | "desert";

export interface ProvinceDef {
  id: string;
  name: string;
  owner: string | null;
  terrain: Terrain;
  tax: number;
  production: number;
  manpower: number;
  neighbors: string[];
}

/** Everything the engine needs to run a campaign, loaded from JSON config. */
export interface Ruleset {
  defines: Defines;
  units: UnitType[];
  nations: NationDef[];
  provinces: ProvinceDef[];
}
