import type { GameDate, Ground, Ruleset } from "@ph/rules";
import type { WokenRealm } from "./sleeping.ts";
import { groundOf, rowWidths, wagonRations, type MarchMap, type TileMarch } from "./march.ts";
import { placeClimate, provinceTemperature, type PlaceClimate } from "./climate.ts";
import { pointTileGrid, type TileGrid } from "./tiles.ts";
import { Rng } from "./rng.ts";
import type { Diplomacy } from "./domain/diplomacy/index.ts";
import { createWarState, maxGarrison, type Battle, type PeaceOffer, type SiegeState } from "./war.ts";
import { newCommander, type Commander } from "./domain/warfare/index.ts";
import { createTreasuryState, runLedger, type TreasuryState } from "./treasury.ts";
import { createFoodState, seedStores, type FoodState } from "./food.ts";
import { createMoodState, type MoodState } from "./moods.ts";
import { byDistance, createLordState, seedLords, type LordState } from "./lords.ts";
import { mix, personName } from "./names.ts";
import { realmConfig } from "./domain/realm/index.ts";
import { createLivingState, seedClasses, type LivingState } from "./living.ts";
import { addCommander, ARMS, armIndex, createRecruitState, recount, FOOT_ARMS, HORSE_ARMS, KIND, OFFICIALS, type FreeCompany, type Mercenary, type Muster, refreshFreeCompanies } from "./recruit.ts";
import { seedOfficials } from "./officials.ts";
import { createResearchState, seedResearch, withoutOf, type ResearchState } from "./research.ts";
import { createWorksState, seedWorks, type WorksState } from "./works.ts";
import { createLandState, seedLand, type LandState } from "./land.ts";
import { createConversionState, type ConversionState } from "./conversion.ts";
import { syncCountries } from "./statecraft.ts";
import { createCastleFoodState, seedCastleStores, type CastleFoodState } from "./castleFood.ts";
import { createGameEvents, type GameEvents } from "./events.ts";
import { createGoals, monthlyGoals, type GoalState } from "./goals.ts";
import { createGameHeritage, type GameHeritage } from "./heritage.ts";
import { createGovernmentState, seedGovernment, type GovernmentState } from "./government.ts";
import { createTradeState, seedTrade, type TradeState } from "./trade.ts";
import { createPeoplesState, seedPeoples, type PeoplesState } from "./peoples.ts";
import { createRulerState, seedRulers, type RulerState } from "./rulers.ts";
import { createFallenState, type FallenState } from "./fallen.ts";
import { createBeliefState, readBeliefShares, type BeliefState } from "./belief.ts";
import { createFaithHeadsState, seedFaithHeads, type FaithHeadsState } from "./faithHeads.ts";
import { adminCapacityRank } from "./realmStrengths.ts";
import { createRebelState, type RebelState } from "./rebels.ts";
import { createRevolutionState, type RevolutionState } from "./revolutions.ts";
import { createNavyState, seedNavy, type NavyState } from "./navy.ts";
import { seedStartingFleets } from "./startingFleets.ts";
import { refreshFreeFleets } from "./hiredFleets.ts";
import { createExplorationState, seedCharts, seedRegions, type ExplorationState } from "./exploration.ts";
import { seedStartingPosts, seedStartingPurse } from "./startingCounts.ts";
import { createCampaignEndState, seedCampaign, type CampaignEndState } from "./campaignEnd.ts";
import type { AchievementLog } from "./achievements.ts";
import { createInstitutionsState, seedInstitutions, type InstitutionsState } from "./institutions.ts";
import { createTribesState, seedTribes, type TribesState } from "./tribes.ts";

/**
 * Simulation state stored as parallel typed arrays (one array per field,
 * indexed by province, nation or army). This keeps thousands of provinces
 * cache-friendly to iterate every turn and lets whole arrays be copied or
 * transferred to the UI thread without serialising objects.
 */
export interface World extends LivingState, TreasuryState, FoodState, MoodState, LordState, ResearchState, WorksState, LandState, CastleFoodState, ConversionState, GovernmentState, RebelState, RevolutionState, PeoplesState, TradeState, RulerState, FallenState, BeliefState, InstitutionsState, TribesState {
  /** Heads of the faith: patrons, the Caliph, the conclave, censures (faithHeads.ts). */
  faithHeads: FaithHeadsState;
  /** Faiths a realm serves as the patron of their head while of another faith (RELG-145). */
  nationServes: Uint8Array;
  rules: Ruleset;
  /** Weeks played. */
  turn: number;
  date: GameDate;
  /** 4-hour step of the day, 0 to 5 (STEPS_PER_DAY). */
  step: number;
  /** Days played. */
  day: number;
  rng: Rng;
  /** The game's seed for its weather rolls (hard winters), apart from `rng` so a roll there never shifts the rest of the turn. */
  weatherSeed: number;

  /** The map's tiles, which armies stand and march on. */
  tiles: TileGrid;
  /** East-west size of a tile on each row of the map. */
  rowWidth: Float32Array;
  /** What each province's weather depends on, and its sea-level temperature today (°C). */
  provincePlace: PlaceClimate[];
  provinceTemperature: Float32Array;

  provinceCount: number;
  provinceIds: string[];
  provinceIndex: Map<string, number>;
  provinceOwner: Int16Array; // nation index, -1 = unowned
  provincePopulation: Float32Array; // thousands of people
  provinceWealth: Float32Array;
  /** 1 for sea and ocean zones, which only ships can enter. */
  provinceWater: Uint8Array;
  /** Land ground per province, null for sea and ocean zones. */
  provinceGround: (Ground | null)[];
  provinceRiver: Uint8Array;
  /** Borders in compressed sparse row form: neighbors of p are adjList[adjStart[p] .. adjStart[p+1]). */
  adjStart: Int32Array;
  adjList: Int32Array;

  nationCount: number;
  nationIds: string[];
  nationIndex: Map<string, number>;
  nationTreasury: Float64Array;
  nationLevies: Float64Array;
  nationMaxLevies: Float64Array;
  nationMonthlyIncome: Float64Array;
  /** Each realm's administrative capacity from the catalogue, 1 (very low) to 5 (very high), 0 unknown: how far its rule reaches (realmStrengths.ts). */
  nationAdminCapacity: Int8Array;

  commanderIds: string[];
  commanderOwner: Int16Array;
  commanderLogistics: Int8Array;
  /** Each commander as the warfare context sees him: skills, victories and defeats grow with his battles. */
  commanders: Commander[];

  armies: ArmyPool;

  /** The nation the player rules, or -1; the AI leaves it alone. */
  player: number;
  /** Who is at war, allied, under truce or subject: the diplomacy context's state. */
  diplomacy: Diplomacy;
  /** Nation occupying each province in a war, -1 = none. */
  provinceOccupier: Int16Array;
  /** Days a hostile army has held a province without walls. */
  provinceHold: Uint8Array;
  /** Realm that began holding each province (the first to arrive takes it, Leroy F-45), -1 = none. */
  provinceHoldBy: Int16Array;
  /** Men behind each province's walls. */
  provinceGarrison: Float32Array;
  sieges: Map<number, SiegeState>;
  /** Battles being fought, round by round. */
  battles: Battle[];
  battleSeq: number;
  /** Peace the AI offers the player, waiting for an answer until the next month. */
  peaceOffers: PeaceOffer[];
  /** 1 once a nation has lost all its land; a sleeping realm is gone too, so every system passes it by (SETUP-082). */
  nationGone: Uint8Array;
  /** 1 for a sleeping realm that has not woken (SETUP-082). */
  nationAsleep: Uint8Array;
  /** Woken realms' names, colours and capitals, for saves and the client (SETUP-091). */
  woken: WokenRealm[];

  /** Men who can be called in each province now (recruiting: Recruits here), and the most there can be. */
  provinceRecruits: Float32Array;
  provinceRecruitCeiling: Float32Array;
  /** Troop cap per nation (warfare WAR-029) and the men counting toward it. */
  nationTroopCap: Float64Array;
  nationCapUsed: Float64Array;
  /** Men called up in provinces, gathering a thousand at a time. */
  musters: Muster[];
  /** Mercenary companies on their way. */
  mercs: Mercenary[];
  /** Free companies for hire, shared by every realm that can reach them. */
  freeCompanies: FreeCompany[];
  /** Number of the last free company drawn. */
  freeCompanySeq: number;
  /** Official of each province (index into OFFICIALS), -1 = his post stands empty. */
  provinceOfficial: Int8Array;
  /** Province each official's name comes from: it goes with him when he moves (officials.ts). */
  provinceOfficialSeed: Int16Array;
  /** Day (world.day) the official at each post took it up; his years served count from it. */
  provinceOfficialSince: Int32Array;
  /** Realm a foreign specialist at each post came from, -1 = one of the realm's own (PROV-334). */
  provinceOfficialFrom: Int16Array;
  /** 1 while a province the player has just taken waits for him to fill its post, grant it or keep it royal (PROV-340). */
  provinceNewLand: Uint8Array;
  /** Province each commander was commissioned from, -1 = none. */
  commanderHome: number[];
  /** Name seed of each commander commissioned from an official, -1 = none. */
  commanderSeed: number[];
  /** Ports, sailors, ships and fleets (navy.ts). */
  navy: NavyState;
  /** Charts, voyages, colonial governors and colonies being founded (exploration.ts, colonies.ts). */
  explore: ExplorationState;
  /** The event tree in play (milestone 6). */
  events?: GameEvents;
  /** Realms' historical goals (EVT-085, goals.ts). */
  goals?: GoalState;
  /** Win scores, the end date and how the campaign ended (campaignEnd.ts). */
  campaign: CampaignEndState;
  /** Every realm's heritage in play: birthright, heydays, ambitions, legacies and burden (HER-078). */
  heritage?: GameHeritage;
  /** The player's campaign as achievements see it (achievements.ts). */
  achievements?: AchievementLog;
}

export interface ArmyPool {
  count: number; // high-water mark; slots below it may be dead
  alive: Uint8Array;
  owner: Int16Array;
  /** Province the army stands in (the province of its tile). */
  location: Int32Array;
  /** Tile the army stands on. */
  tile: Int32Array;
  men: Int32Array;
  commander: Int32Array; // -1 = none
  /** Men on horseback, counted within men. */
  horse: Int32Array;
  /** Rations in the army's wagons. */
  food: Float64Array;
  /** Provinces still to march through, in order. */
  route: number[][];
  /** Tiles planned ahead, walked from pathAt on (a route is walked a province at a time when it isn't planned through). */
  path: Int32Array[];
  pathAt: Int32Array;
  /** Hours already walked toward the next tile. */
  progress: Float32Array;
  /** Tiles stepped onto since the UI last looked, for drawing the march. */
  trail: number[][];
  /** 1 while a beaten army falls back: it can't be caught or given orders until it gets there. */
  retreating: Uint8Array;
  /** Battle the army is fighting in (its id), or -1. */
  battle: Int32Array;
  /** The province the army last marched in from (-1 = none): the way back past an enemy castle. */
  cameFrom: Int32Array;
  /** Company kind: levy or hired (see KIND). */
  kind: Uint8Array;
  /** Province the men were levied from (-1 = none, as for a hired company): its people lose the army's dead (WAR-226). */
  home: Int32Array;
  /** Months since the men were raised (a levy kept at peace is paid from the fourth, at war from the first: WAR-225). */
  monthsOut: Uint16Array;
  /** Months drilled together (0 untrained, 3 trained). */
  drill: Float32Array;
  /** Shares of the foot by arm (FOOT_ARMS) and of the horse by arm (HORSE_ARMS), ARMS.length per army. */
  mix: Float32Array;
  /** Arm being trained (index into ARMS, -1 = none), men in training and months left. */
  trainArm: Int8Array;
  trainMen: Int32Array;
  trainLeft: Float32Array;
}

/** How an army's men split by arm and what kind of company they are. */
export interface ArmyMake {
  kind?: number;
  /** Tile to stand on, in the province (else its centre). */
  tile?: number;
  /** Province the men were levied from (else where they stand, or none for a hired company). */
  home?: number;
  drill?: number;
  /** Arm of the foot and of the horse. */
  foot?: string;
  horseArm?: string;
}

export function createArmyPool(capacity: number): ArmyPool {
  return {
    count: 0,
    alive: new Uint8Array(capacity),
    owner: new Int16Array(capacity),
    location: new Int32Array(capacity),
    tile: new Int32Array(capacity),
    men: new Int32Array(capacity),
    commander: new Int32Array(capacity).fill(-1),
    horse: new Int32Array(capacity),
    food: new Float64Array(capacity),
    route: Array.from({ length: capacity }, () => []),
    path: Array.from({ length: capacity }, () => NO_PATH),
    pathAt: new Int32Array(capacity),
    progress: new Float32Array(capacity),
    trail: Array.from({ length: capacity }, () => []),
    retreating: new Uint8Array(capacity),
    battle: new Int32Array(capacity).fill(-1),
    cameFrom: new Int32Array(capacity).fill(-1),
    kind: new Uint8Array(capacity),
    home: new Int32Array(capacity).fill(-1),
    monthsOut: new Uint16Array(capacity),
    drill: new Float32Array(capacity),
    mix: defaultMix(capacity),
    trainArm: new Int8Array(capacity).fill(-1),
    trainMen: new Int32Array(capacity),
    trainLeft: new Float32Array(capacity),
  };
}

export const NO_PATH = new Int32Array(0);

function defaultMix(capacity: number): Float32Array {
  const mix = new Float32Array(capacity * ARMS.length);
  for (let i = 0; i < capacity; i++) {
    mix[i * ARMS.length + armIndex(FOOT_ARMS[0])] = 1;
    mix[i * ARMS.length + armIndex(HORSE_ARMS[0])] = 1;
  }
  return mix;
}

export function spawnArmy(world: World, owner: number, location: number, men: number, commander = -1, horse = 0, make: ArmyMake = {}): number {
  let pool = world.armies;
  let slot = -1;
  for (let i = 0; i < pool.count; i++) {
    if (!pool.alive[i]) {
      slot = i;
      break;
    }
  }
  if (slot === -1) {
    if (pool.count === pool.alive.length) pool = world.armies = growArmyPool(pool);
    slot = pool.count++;
  }
  pool.alive[slot] = 1;
  pool.owner[slot] = owner;
  pool.location[slot] = location;
  pool.tile[slot] = make.tile ?? world.tiles.centre[location]!;
  pool.men[slot] = men;
  pool.commander[slot] = commander;
  pool.horse[slot] = horse;
  pool.route[slot] = [];
  pool.path[slot] = NO_PATH;
  pool.pathAt[slot] = 0;
  pool.progress[slot] = 0;
  pool.trail[slot] = [];
  pool.retreating[slot] = 0;
  pool.battle[slot] = -1;
  pool.cameFrom[slot] = -1;
  pool.kind[slot] = make.kind ?? KIND.levy;
  pool.home[slot] = make.home ?? (pool.kind[slot] === KIND.hired ? -1 : location);
  pool.monthsOut[slot] = 0;
  pool.drill[slot] = make.drill ?? 0;
  const base = slot * ARMS.length;
  pool.mix.fill(0, base, base + ARMS.length);
  pool.mix[base + armIndex(make.foot ?? FOOT_ARMS[0])] = 1;
  pool.mix[base + armIndex(make.horseArm ?? HORSE_ARMS[0])] = 1;
  pool.trainArm[slot] = -1;
  pool.trainMen[slot] = 0;
  pool.trainLeft[slot] = 0;
  // Wagons start full.
  const d = world.rules.defines.march;
  const logistics = commander >= 0 ? world.commanderLogistics[commander]! : 0;
  pool.food[slot] = wagonRations(d, { men, horse, logistics, foodCarriedPct: foodCarriedPct(world, owner) });
  return slot;
}

/** Percent of the food realm n's armies carry: half without B01 *Wheel and carts* (RSCH-094); all of it before research is seeded. */
export function foodCarriedPct(world: World, n: number): number {
  return world.research[n] ? withoutOf(world, n).foodCarriedPct : 100;
}

function growArmyPool(old: ArmyPool): ArmyPool {
  const next = createArmyPool(old.alive.length * 2);
  next.count = old.count;
  next.alive.set(old.alive);
  next.owner.set(old.owner);
  next.location.set(old.location);
  next.tile.set(old.tile);
  next.men.set(old.men);
  next.commander.set(old.commander);
  next.horse.set(old.horse);
  next.food.set(old.food);
  old.route.forEach((r, i) => (next.route[i] = r));
  old.path.forEach((r, i) => (next.path[i] = r));
  next.pathAt.set(old.pathAt);
  next.progress.set(old.progress);
  old.trail.forEach((r, i) => (next.trail[i] = r));
  next.retreating.set(old.retreating);
  next.battle.set(old.battle);
  next.kind.set(old.kind);
  next.home.set(old.home);
  next.monthsOut.set(old.monthsOut);
  next.drill.set(old.drill);
  next.mix.set(old.mix);
  next.trainArm.set(old.trainArm);
  next.trainMen.set(old.trainMen);
  next.trainLeft.set(old.trainLeft);
  next.cameFrom.set(old.cameFrom);
  return next;
}

/**
 * A new campaign. `tiles` is the map's tile grid (tileGridFromImages); without
 * one the world gets a stand-in with one tile per province, where armies
 * can't march (enough for a probe that only runs a turn).
 */
/** `seedTrade: false` leaves trade empty, for a world a save is about to fill. */
export function createWorld(rules: Ruleset, seed: number, tiles: TileGrid = pointTileGrid(rules), opts: { seedTrade?: boolean } = {}): World {
  const provinceIds = rules.provinces.map((p) => p.id);
  const provinceIndex = new Map(provinceIds.map((id, i) => [id, i]));
  const nationIds = rules.nations.map((n) => n.id);
  const nationIndex = new Map(nationIds.map((id, i) => [id, i]));
  const P = provinceIds.length;
  const N = nationIds.length;

  const provinceOwner = new Int16Array(P);
  const provincePopulation = new Float32Array(P);
  const provinceWealth = new Float32Array(P);
  const provinceWater = Uint8Array.from(rules.provinces, (p) => (p.terrain === "sea" || p.terrain === "ocean" ? 1 : 0));
  const adjStart = new Int32Array(P + 1);
  let edges = 0;
  rules.provinces.forEach((p, i) => {
    provinceOwner[i] = p.owner === null ? -1 : nationIndex.get(p.owner)!;
    provincePopulation[i] = p.population;
    provinceWealth[i] = p.wealth;
    adjStart[i] = edges;
    edges += p.neighbors.length;
  });
  adjStart[P] = edges;
  const adjList = new Int32Array(edges);
  rules.provinces.forEach((p, i) => {
    p.neighbors.forEach((nb, k) => (adjList[adjStart[i]! + k] = provinceIndex.get(nb)!));
  });

  const commanderIds: string[] = [];
  const commanderOwnerList: number[] = [];
  const commanderLogisticsList: number[] = [];
  const commanders: Commander[] = [];
  rules.nations.forEach((n, i) => {
    for (const c of n.commanders) {
      commanderIds.push(c.id);
      commanderOwnerList.push(i);
      commanderLogisticsList.push(c.logistics);
      // The map data's stand-in "General of <realm>" takes a name of the realm's own culture (feedback 125).
      const name = c.name === `General of ${n.name}` ? personName(rules, i, mix(i + 1, 125), rules.provinces.find((p) => p.id === n.capital)?.name ?? "") : c.name;
      commanders.push(newCommander(name, { country: n.id, might: c.might, cunning: c.cunning, logistics: c.logistics }));
    }
  });

  const map = rules.map;
  const lonLat = (x: number | undefined, y: number | undefined): [number, number] =>
    map ? [(x ?? 0) / map.pxPerDeg - 180, map.latTop - (y ?? 0) / map.pxPerDeg] : [0, 45];
  const provincePlace = rules.provinces.map((p) => placeClimate(...lonLat(p.x, p.y), !!p.coastal, p.terrain));
  const world: World = {
    rules,
    turn: 0,
    date: { ...rules.defines.startDate },
    step: 0,
    day: 0,
    rng: new Rng(seed),
    weatherSeed: seed >>> 0,
    tiles,
    rowWidth: map && map.height === tiles.height ? rowWidths(tiles.height, map.latTop, map.pxPerDeg) : new Float32Array(tiles.height).fill(1),
    provincePlace,
    provinceTemperature: new Float32Array(P),
    provinceCount: P,
    provinceIds,
    provinceIndex,
    provinceOwner,
    provincePopulation,
    provinceWealth,
    provinceWater,
    provinceGround: rules.provinces.map((p) => groundOf(p.terrain)),
    provinceRiver: Uint8Array.from(rules.provinces, (p) => (p.river ? 1 : 0)),
    adjStart,
    adjList,
    nationCount: N,
    nationIds,
    nationIndex,
    nationTreasury: Float64Array.from(rules.nations, (n) => (n.asleep ? 0 : rules.defines.economy.startingTreasury)),
    nationLevies: new Float64Array(N),
    nationMaxLevies: new Float64Array(N),
    nationMonthlyIncome: new Float64Array(N),
    nationAdminCapacity: Int8Array.from(nationIds, adminCapacityRank),
    commanderIds,
    commanderOwner: Int16Array.from(commanderOwnerList),
    commanderLogistics: Int8Array.from(commanderLogisticsList),
    commanders,
    armies: createArmyPool(Math.max(16, N * 2)),
    player: -1,
    diplomacy: null!,
    provinceOccupier: new Int16Array(P).fill(-1),
    provinceHold: new Uint8Array(P),
    provinceHoldBy: new Int16Array(P).fill(-1),
    provinceGarrison: new Float32Array(P),
    sieges: new Map(),
    battles: [],
    battleSeq: 0,
    peaceOffers: [],
    // Sleeping realms are gone and asleep from the start: no turn, no land, nothing listed (SETUP-082).
    nationGone: Uint8Array.from(rules.nations, (n) => (n.asleep ? 1 : 0)),
    nationAsleep: Uint8Array.from(rules.nations, (n) => (n.asleep ? 1 : 0)),
    woken: [],
    campaign: createCampaignEndState(N, rules.defines.startDate),
    ...createRecruitState(P, N),
    ...createLivingState(P),
    ...createTreasuryState(P, N),
    ...createFoodState(P),
    ...createMoodState(P),
    ...createLordState(P),
    ...createResearchState(N),
    ...createWorksState(P, N),
    ...createLandState(P),
    ...createConversionState(P),
    ...createCastleFoodState(P, N),
    ...createGovernmentState(P, N),
    ...createTradeState(P, N),
    ...createRebelState(P, N),
    ...createRevolutionState(N),
    navy: createNavyState(P),
    explore: createExplorationState(P, N),
    ...createPeoplesState(P, N),
    ...createRulerState(N, seed),
    ...createFallenState(N),
    ...createBeliefState(N),
    ...createFaithHeadsState(N),
    ...createInstitutionsState(),
    ...createTribesState(P),
  };
  world.diplomacy = createWarState(world);
  seedClasses(world);
  seedStores(world);
  seedLords(world);
  seedLand(world);
  seedWorks(world);
  seedCastleStores(world);
  updateWeather(world);
  for (let p = 0; p < P; p++) world.provinceGarrison[p] = maxGarrison(world, p);

  for (let p = 0; p < P; p++) {
    if (provinceWater[p]) continue;
    world.provinceRecruitCeiling[p] = provincePopulation[p]! * rules.defines.levies.menPerThousandPeople;
    world.provinceRecruits[p] = world.provinceRecruitCeiling[p]!;
    // Every province of a realm starts with an official, of a type dealt out in turn.
    if (provinceOwner[p]! >= 0) world.provinceOfficial[p] = p % OFFICIALS.length;
  }
  // Levies gathered and officials at their posts follow the catalogue (REALM-130).
  seedStartingPosts(world);
  world.commanderHome = commanderIds.map(() => -1);
  world.commanderSeed = commanderIds.map(() => -1);
  seedOfficials(world);
  seedGovernment(world);
  seedPeoples(world);
  // Rulers read the lords, for a child ruler's regent, and the government form, for the throne law.
  seedRulers(world);
  // The heads of the faith in 1444 read the faiths and the subjects (RELG-153).
  seedFaithHeads(world);
  // The Empire of 1444 reads the members' land and the Emperor's ruler (INST-010).
  seedInstitutions(world);
  // Tribal realms walk their first hunting grounds; the form and the tongues are known by now (TRIBE-007).
  seedTribes(world);
  readBeliefShares(world);
  recount(world);

  // Every nation starts with the men it had under arms in 1444 (a quarter of its troop cap where
  // the data has no figure), within its cap, spread over its land (REALM-196, REALM-197).
  rules.nations.forEach((n, i) => {
    if (n.asleep) return;
    const cap = world.nationTroopCap[i]!;
    const total = Math.max(1000, Math.min(Math.floor(cap / 1000) * 1000, n.army ?? Math.round(cap / 4000) * 1000));
    const capital = provinceIndex.get(n.capital)!;
    for (const { province, men, commander } of startingArmies(world, i, capital, total)) {
      // Levies already called, half of the foot armoured men-at-arms, the horse light horse.
      const slot = spawnArmy(world, i, province, men, commander, Math.round(men * rules.defines.march.startingHorseShare), { kind: KIND.levy, drill: 1.5 });
      world.armies.mix[slot * ARMS.length + armIndex("levy foot")] = 0.5;
      world.armies.mix[slot * ARMS.length + armIndex("armoured foot")] = 0.5;
    }
  });
  seedResearch(world);
  // The starting armies' wagons were filled before research was known: a realm without B01 carries half (RSCH-094).
  for (let i = 0; i < world.armies.count; i++) if (world.armies.alive[i]) world.armies.food[i] = (world.armies.food[i]! * foodCarriedPct(world, world.armies.owner[i]!)) / 100;
  if (opts.seedTrade !== false) seedTrade(world);
  seedNavy(world);
  // Realms that had ships in 1444 start with them, and free fleets gather for hire (F-115).
  seedStartingFleets(world);
  refreshFreeFleets(world);
  seedRegions(world);
  seedCharts(world);
  recount(world);
  refreshFreeCompanies(world);
  // The ledger is worked out from the start, so lenders and the treasury card know the realm's income.
  runLedger(world, false);
  // Gold, debt and envoys at court follow the catalogue, as months of that income (REALM-130).
  seedStartingPurse(world);
  // Envoy seats and AI answers read each realm's provinces, gold and soldiers from the start.
  syncCountries(world);

  // The event tree starts with the campaign, so its first month costs no more than any other.
  world.events = createGameEvents(world);
  // Realms' historical goals, shaken by the seed and the Events preset (EVT-086).
  world.goals = createGoals(world);
  monthlyGoals(world, false);
  // Heritage reads the tree's ages, so it starts after it: three ambitions drawn, the birthright in force.
  world.heritage = createGameHeritage(world);
  // Worked out again with heritage's tax in force, so lenders and the treasury card know the income the realm will have.
  runLedger(world, false);
  // The scores stand from the first day, for the country card (SHELL-162).
  seedCampaign(world);
  return world;
}

/** The most men one army starts with: a realm with more gets more commanders. */
const START_ARMY_MAX = 30000;

/**
 * Commanders a realm starts with for its men under arms: one per
 * `starting_armies.men_per_commander`, at least one and at most
 * `most_commanders`, but always enough that no army is above START_ARMY_MAX (REALM-197).
 */
export function startingCommanderCount(men: number): number {
  const c = realmConfig.starting_armies;
  return Math.max(1, Math.min(c.most_commanders, Math.round(men / c.men_per_commander)), Math.ceil(men / START_ARMY_MAX));
}

/**
 * Where a realm's starting men stand (REALM-196, REALM-197): every man in an
 * army under a commander, one army per commander, of thousands as even as
 * they come; the first in the capital and the others spread evenly over its
 * land from the capital outward (a small realm may have fewer armies than the
 * count, at least a thousand men each). The data's commanders lead first; the
 * realm gets more of its own culture to match its men.
 */
function startingArmies(world: World, n: number, capital: number, total: number): { province: number; men: number; commander: number }[] {
  const land = byDistance(world, n, capital).filter((p) => !world.provinceWater[p]);
  const armies = Math.max(1, Math.min(startingCommanderCount(total), Math.floor(total / 1000)));
  const commanders: number[] = [];
  for (let c = 0; c < world.commanderIds.length; c++) if (world.commanderOwner[c] === n && commanders.length < armies) commanders.push(c);
  const capitalName = world.rules.provinces[capital]!.name;
  for (let k = commanders.length; k < armies; k++) {
    const seed = mix(n + 1, k + 101);
    const skill = (salt: number) => 1 + (mix(seed, salt) % 3);
    const name = personName(world.rules, n, seed, capitalName);
    commanders.push(addCommander(world, n, newCommander(name, { might: skill(1), cunning: skill(2), logistics: skill(3) }), `${world.nationIds[n]}_start_${k + 1}`));
  }
  // Thousands dealt out in turn, so the armies differ by a thousand at most; the capital's takes what is left over.
  const thousands = Math.floor(total / 1000);
  const where = Array.from({ length: armies }, (_, k) => land[Math.floor((k * land.length) / armies)] ?? capital);
  return where.map((province, k) => ({
    province,
    men: (Math.floor(thousands / armies) + (k < thousands % armies ? 1 : 0)) * 1000 + (k === 0 ? total - thousands * 1000 : 0),
    commander: commanders[k]!,
  }));
}

export function areNeighbors(world: World, a: number, b: number): boolean {
  for (let k = world.adjStart[a]!, end = world.adjStart[a + 1]!; k < end; k++) {
    if (world.adjList[k] === b) return true;
  }
  return false;
}

/** The world's province graph as the march planner sees it. */
export function marchMap(world: World): MarchMap {
  return { adjStart: world.adjStart, adjList: world.adjList, ground: world.provinceGround, population: world.provincePopulation, river: world.provinceRiver };
}

/** Each province's sea-level temperature for today (the snow on its tiles slows marches). */
export function updateWeather(world: World): void {
  for (let p = 0; p < world.provinceCount; p++) if (!world.provinceWater[p]) world.provinceTemperature[p] = provinceTemperature(world.provincePlace[p]!, world.date);
}

/** The world's tiles as a march over them sees them today. */
export function tileMarch(world: World): TileMarch {
  return { d: world.rules.defines.march, grid: world.tiles, population: world.provincePopulation, temperature: world.provinceTemperature, rowWidth: world.rowWidth, roadHours: world.provinceRoadHours };
}
