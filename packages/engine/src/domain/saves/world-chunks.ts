import type { RealmLord } from "../../lords.ts";
import { CLASS_COUNT, rescaleClasses } from "../../living.ts";
import { LEDGER_LINES } from "../../treasury.ts";
import { restoreResearch, saveResearch, type SavedResearch } from "../../research.ts";
import { restoreEvents, saveEvents, type SavedEvents } from "../../events.ts";
import { restoreHeritage, saveHeritage, type SavedRealmHeritage } from "../../heritage.ts";
import { restoreRulers, saveRulers } from "../../rulers.ts";
import { restoreFallen, saveFallen, type SavedFallen } from "../../fallen.ts";
import { readBeliefShares } from "../../belief.ts";
import { graspingFromGrievances, restoreGovernment, saveGovernment, type SavedGovernment } from "../../government.ts";
import { restoreRebels, saveRebels, type SavedRebels } from "../../rebels.ts";
import { restorePeoples, savePeoples, type SavedPeoples } from "../../peoples.ts";
import { refreshWorks, WORK_COUNT, workIndex, WORKS, type QueuedWork, type Site } from "../../works.ts";
import { MAX_TILES } from "../../land.ts";
import { restoreNavy, saveNavy, type SavedNavy } from "../../navy.ts";
import { restoreExploration, saveExploration, type SavedExploration } from "../../colonies.ts";
import type { Ruleset } from "@ph/rules";
import { hashWorld } from "../../hash.ts";
import { Rng } from "../../rng.ts";
import type { Order } from "../../turn.ts";
import { createArmyPool, createWorld, type World } from "../../world.ts";
import type { TileGrid } from "../../tiles.ts";
import type { Battle, SiegeState } from "../../war.ts";
import { addCommander, ARMS, type FreeCompany, type Mercenary, type Muster } from "../../recruit.ts";

/** A mercenary as saved: before free companies it held one arm and its men instead of a company. */
type OldMercenary = { nation: number; weeksLeft: number; company?: FreeCompany; arm?: string; men?: number };
import { newCommander } from "../warfare/index.ts";
import type { FoodPolicyScreen } from "../realm/index.ts";
import { base64, encodePng, fnv1a } from "./bytes.ts";
import { packChunk, savesConfig, unpackChunk, type CampaignOptions, type RawChunk } from "./format.ts";

/**
 * The world at a turn boundary as chunks, and back (save-system §4.3): one
 * chunk per system with its own version; only changing state, never what
 * comes from the build (adjacency, terrain, water, rivers, shapes); typed
 * arrays indexed through the `ids` chunk so a later build can map them.
 */

const V = savesConfig.format.chunk_versions;

/** What the save holds besides the world itself. */
export interface SavedGame {
  playerNation: string;
  options: CampaignOptions;
  /** Orders queued so far (only a Resume save carries them, SAVE-044). */
  orders?: readonly Order[];
  /** Events fired, flags, pending choices and cooldowns; owned by the events context. */
  events?: EventsState;
  /** The realm timeline for the ledger and end screens. */
  history?: unknown[];
}

export interface EventsState {
  fired: string[];
  flags: string[];
  pending: string[];
  cooldowns: Record<string, number>;
}

const EMPTY_EVENTS: EventsState = { fired: [], flags: [], pending: [], cooldowns: {} };

/** Chunks for the world plus what goes with it. `orders` is added only when given. */
const MIX = ARMS.length;

export function worldChunks(world: World, game: SavedGame): RawChunk[] {
  const a = world.armies;
  const live: number[] = [];
  for (let i = 0; i < a.count; i++) if (a.alive[i]) live.push(i);
  const routes: number[] = [];
  const routeLen: number[] = [];
  const paths: number[] = [];
  const pathLen: number[] = [];
  for (const s of live) {
    routes.push(...a.route[s]!);
    routeLen.push(a.route[s]!.length);
    const left = a.path[s]!.subarray(a.pathAt[s]!);
    paths.push(...left);
    pathLen.push(left.length);
  }
  const pick = <T extends Int16Array | Int32Array | Float32Array | Float64Array>(src: T, make: (n: number) => T): T => {
    const out = make(live.length);
    live.forEach((slot, k) => (out[k] = src[slot]!));
    return out;
  };
  const chunks = [
    packChunk("core", V.core, {
      meta: { turn: world.turn, weatherSeed: world.weatherSeed, date: world.date, day: world.day, step: world.step, options: game.options, playerNation: game.playerNation },
      arrays: { rng: new Uint32Array(world.rng.state) },
    }),
    packChunk("ids", V.ids, { meta: { provinces: world.provinceIds, nations: world.nationIds, commanders: world.commanderIds, commanderNames: world.commanders.map((c) => c.name) }, arrays: {} }),
    packChunk("provinces", V.provinces, {
      // Sieges under way, by province (occupation and garrisons are arrays below); the ground is the map's, not the save's.
      meta: { sieges: [...world.sieges].map(([p, st]) => [p, { ...st, siege: { ...st.siege, ground: undefined } }]), workNames: WORKS },
      arrays: { owner: world.provinceOwner, population: world.provincePopulation, wealth: world.provinceWealth, recruits: world.provinceRecruits, official: world.provinceOfficial, officialSeed: world.provinceOfficialSeed, officialSince: world.provinceOfficialSince, classes: world.provinceClasses, tax: world.provinceTax, food: world.provinceStore, harvest: world.provinceHarvest, weather: world.provinceWeather, starved: world.provinceStarved, grievances: Int32Array.from(world.provinceGrievances), armyMonths: world.provinceArmyMonths, battleYear: world.provinceBattleYear, lord: world.provinceLord, occupier: world.provinceOccupier, hold: world.provinceHold, holdBy: world.provinceHoldBy, garrison: world.provinceGarrison, works: world.provinceWorks, tiles: world.provinceTiles, castleStore: world.castleStore, game: world.provinceGame, hardWinter: world.provinceHardWinter, seam: world.provinceSeam, seamYears: world.provinceSeamYears, changeTile: world.provinceChangeTile, change: world.provinceChange, changeLeft: world.provinceChangeLeft, changeMonths: world.provinceChangeMonths, changeGold: world.provinceChangeGold },
    }),
    packChunk("nations", V.nations, {
      // Works being built and waiting, with works by name so a build with other works still reads them.
      meta: { research: saveResearch(world), sites: world.sites.map((s) => ({ ...s, work: WORKS[s.work] })), workQueue: world.workQueue.map((q) => ({ ...q, work: WORKS[q.work] })), lords: world.lords, musters: world.musters, mercs: world.mercs, freeCompanies: world.freeCompanies, freeCompanySeq: world.freeCompanySeq, commanderHome: world.commanderHome, commanderSeed: world.commanderSeed, foodPolicy: world.foodPolicy, diplomacy: { ...world.diplomacy, events: [] }, government: saveGovernment(world), events: saveEvents(world), navy: saveNavy(world), exploration: saveExploration(world), peoples: savePeoples(world), rebels: saveRebels(world), heritage: saveHeritage(world), rulers: saveRulers(world), fallen: saveFallen(world) },
      arrays: {
        treasury: world.nationTreasury,
        levies: world.nationLevies,
        maxLevies: world.nationMaxLevies,
        monthlyIncome: world.nationMonthlyIncome,
        taxDefault: world.nationTaxDefault,
        debt: world.nationDebt,
        loanMonth: world.nationLoanMonth,
        ledger: world.nationLedger,
        neglect: world.nationNeglect,
        grainGold: world.nationGrainGold,
        foodSold: world.nationFoodSold,
        foodSpoiled: world.nationFoodSpoiled,
        commanderOwner: world.commanderOwner,
        // Skills, victories, defeats and wounds of each commander, as they grow in battle.
        commanderRecord: Int32Array.from(world.commanders.flatMap((c) => [c.might, c.cunning, c.logistics, c.victories, c.defeats, c.wounds])),
      },
    }),
    packChunk("armies", V.armies, {
      // Battles still being fought when the week ended go on with the same armies.
      meta: { count: a.count, battles: world.battles, battleSeq: world.battleSeq },
      arrays: {
        slot: Int32Array.from(live),
        owner: pick(a.owner, (n) => new Int16Array(n)),
        location: pick(a.location, (n) => new Int32Array(n)),
        tile: pick(a.tile, (n) => new Int32Array(n)),
        men: pick(a.men, (n) => new Int32Array(n)),
        commander: pick(a.commander, (n) => new Int32Array(n)),
        horse: pick(a.horse, (n) => new Int32Array(n)),
        food: pick(a.food, (n) => new Float64Array(n)),
        progress: pick(a.progress, (n) => new Float32Array(n)),
        kind: Uint8Array.from(live, (s) => a.kind[s]!),
        monthsOut: Int32Array.from(live, (s) => a.monthsOut[s]!),
        drill: Float32Array.from(live, (s) => a.drill[s]!),
        trainArm: Int8Array.from(live, (s) => a.trainArm[s]!),
        trainMen: Int32Array.from(live, (s) => a.trainMen[s]!),
        trainLeft: Float32Array.from(live, (s) => a.trainLeft[s]!),
        mix: Float32Array.from(live.flatMap((s) => Array.from(a.mix.subarray(s * MIX, (s + 1) * MIX)))),
        routeLen: Int32Array.from(routeLen),
        route: Int32Array.from(routes),
        pathLen: Int32Array.from(pathLen),
        path: Int32Array.from(paths),
        retreating: Uint8Array.from(live, (s) => a.retreating[s]!),
        // The province it came from: the way back past an enemy castle.
        cameFrom: pick(a.cameFrom, (n) => new Int32Array(n)),
      },
    }),
    packChunk("events", V.events, { meta: { ...(game.events ?? EMPTY_EVENTS) }, arrays: {} }),
    packChunk("history", V.history, { meta: { timeline: game.history ?? [] }, arrays: {} }),
  ];
  if (game.orders) {
    // Province targets go by id, so a later build can still place them (INV-SAVE-9).
    const orders = game.orders.map((o) => (o.type === "move" ? { ...o, to: world.provinceIds[o.to] ?? null } : o));
    chunks.push(packChunk("orders", V.orders, { meta: { orders }, arrays: {} }));
  }
  return chunks;
}

/** How a build that differs from the save's maps it (SAVE-047, SAVE-048). */
export interface MappingTables {
  /** Old province id → new ids with shares of the people (written by tools/mapgen). */
  renames?: Record<string, { id: string; share: number }[]>;
  /** Dropped nation id → the nation that takes its place. */
  nations?: Record<string, string>;
}

export interface RestoredGame {
  world: World;
  game: SavedGame & { orders: Order[] };
  /** Problems that are not errors (a dropped nation with no table entry …). */
  warnings: string[];
  /** Build provinces the save did not know, given the rules' starting values. */
  defaulted: string[];
}

/**
 * Rebuilds the world from its chunks on top of `rules`. Provinces, nations and
 * commanders are matched by id through the `ids` chunk; fields missing from an
 * older chunk keep the value the rules give.
 */
/** `tiles` is the map's tile grid, as for createWorld; tiles saved under another map fall back to the province's centre. */
export function restoreWorld(chunks: Map<string, RawChunk>, rules: Ruleset, tables: MappingTables = {}, tiles?: TileGrid): RestoredGame {
  const need = (id: string) => {
    const c = chunks.get(id);
    if (!c) throw new Error(`save has no ${id} chunk`);
    return unpackChunk(c);
  };
  const core = need("core");
  const ids = need("ids").meta as { provinces: string[]; nations: string[]; commanders: string[]; commanderNames?: string[] };
  const provChunk = need("provinces");
  const prov = provChunk.arrays;
  const nat = need("nations").arrays;
  const arm = need("armies");
  const warnings: string[] = [];

  const world = createWorld(rules, 0, tiles);
  const meta = core.meta as { turn: number; weatherSeed?: number; day?: number; step?: number; date: { year: number; month: number; day?: number }; options: CampaignOptions; playerNation: string };
  world.turn = meta.turn;
  world.day = meta.day ?? meta.turn * 7;
  world.step = meta.step ?? 0;
  // The whole date, with its day when the engine keeps one (X-18 weekly turns).
  world.date = { ...meta.date } as typeof world.date;
  world.rng = new Rng(core.arrays.rng as Uint32Array);
  world.weatherSeed = meta.weatherSeed ?? 0;

  // Nations: by id, then the nation table, else gone with a warning.
  const nationMap = ids.nations.map((id) => {
    const direct = world.nationIndex.get(id);
    if (direct !== undefined) return direct;
    const to = tables.nations?.[id];
    if (to !== undefined && world.nationIndex.has(to)) return world.nationIndex.get(to)!;
    warnings.push(`nation ${id} is not in this build; its provinces become unowned`);
    return -1;
  });

  // Provinces: by id, then the rename table with shares.
  const provinceTargets = ids.provinces.map((id): { index: number; share: number }[] => {
    const direct = world.provinceIndex.get(id);
    if (direct !== undefined) return [{ index: direct, share: 1 }];
    const parts = tables.renames?.[id] ?? [];
    return parts.filter((p) => world.provinceIndex.has(p.id)).map((p) => ({ index: world.provinceIndex.get(p.id)!, share: p.share }));
  });
  const covered = new Uint8Array(world.provinceCount);
  const bestShare = new Float64Array(world.provinceCount);
  const population = new Float64Array(world.provinceCount);
  const classesFrom = new Int32Array(world.provinceCount).fill(-1);
  provinceTargets.forEach((targets, old) => {
    for (const t of targets) {
      if (!covered[t.index]) population[t.index] = 0;
      covered[t.index] = 1;
      if (prov.population) population[t.index] = population[t.index]! + prov.population[old]! * t.share;
      if (t.share >= bestShare[t.index]!) {
        bestShare[t.index] = t.share;
        if (prov.owner) {
          const o = prov.owner[old]!;
          world.provinceOwner[t.index] = o < 0 ? -1 : nationMap[o]!;
        }
        if (prov.wealth) world.provinceWealth[t.index] = prov.wealth[old]!;
        if (prov.recruits) world.provinceRecruits[t.index] = prov.recruits[old]!;
        if (prov.official) world.provinceOfficial[t.index] = prov.official[old]!;
        // Saves from before officials moved name each one after his own province, with years served from the start.
        if (prov.officialSeed) {
          const seed = prov.officialSeed[old]!;
          const to = seed >= 0 && seed < ids.provinces.length ? world.provinceIndex.get(ids.provinces[seed]!) : undefined;
          world.provinceOfficialSeed[t.index] = to ?? t.index;
        }
        if (prov.officialSince) world.provinceOfficialSince[t.index] = prov.officialSince[old]!;
        if (prov.tax) world.provinceTax[t.index] = prov.tax[old]!;
        classesFrom[t.index] = old;
        if (prov.food) world.provinceStore[t.index] = prov.food[old]! * t.share;
        if (prov.harvest) world.provinceHarvest[t.index] = prov.harvest[old]!;
        if (prov.weather) world.provinceWeather[t.index] = prov.weather[old]!;
        if (prov.grievances) world.provinceGrievances[t.index] = prov.grievances[old]!;
        if (prov.armyMonths) world.provinceArmyMonths[t.index] = prov.armyMonths[old]!;
        if (prov.battleYear) world.provinceBattleYear[t.index] = prov.battleYear[old]!;
        if (prov.lord) world.provinceLord[t.index] = prov.lord[old]!;
        // Who holds it in war, and the men behind its walls.
        const nationAt = (o: number) => (o < 0 ? -1 : nationMap[o]!);
        if (prov.occupier) world.provinceOccupier[t.index] = nationAt(prov.occupier[old]!);
        if (prov.hold) world.provinceHold[t.index] = prov.hold[old]!;
        if (prov.holdBy) world.provinceHoldBy[t.index] = nationAt(prov.holdBy[old]!);
        if (prov.garrison) world.provinceGarrison[t.index] = prov.garrison[old]!;
        // Works by name; saves from before works keep the 1444 ones.
        if (prov.works) {
          const names = (provChunk.meta as { workNames?: string[] }).workNames ?? [];
          world.provinceWorks.fill(0, t.index * WORK_COUNT, (t.index + 1) * WORK_COUNT);
          names.forEach((name, k) => {
            const now = workIndex(name);
            if (now >= 0) world.provinceWorks[t.index * WORK_COUNT + now] = prov.works![old * names.length + k]!;
          });
        }
        // Tiles as saved; saves from before land keep the ones laid out from the map.
        if (prov.tiles) world.provinceTiles.set(prov.tiles.subarray(old * MAX_TILES, (old + 1) * MAX_TILES), t.index * MAX_TILES);
        if (prov.starved) world.provinceStarved[t.index] = prov.starved[old]! * t.share;
        // Game in the woods and this year's winter; saves from before hunting keep the 1444 game.
        if (prov.game) world.provinceGame[t.index] = prov.game[old]!;
        if (prov.hardWinter) world.provinceHardWinter[t.index] = prov.hardWinter[old]!;
        // Seams left; saves from before mines keep the 1444 seams.
        if (prov.seam && prov.seamYears) {
          world.provinceSeam[t.index] = prov.seam[old]!;
          world.provinceSeamYears[t.index] = prov.seamYears[old]!;
        }
        // A tile change under way (feedback 86), kept when the province keeps its tiles.
        if (prov.changeTile && prov.tiles) {
          world.provinceChangeTile[t.index] = prov.changeTile[old]!;
          world.provinceChange[t.index] = prov.change![old]!;
          world.provinceChangeLeft[t.index] = prov.changeLeft![old]!;
          world.provinceChangeMonths[t.index] = prov.changeMonths![old]!;
          world.provinceChangeGold[t.index] = prov.changeGold![old]!;
        }
        // Castle stores; saves from before them keep each castle's starting reserve.
        if (prov.castleStore) world.castleStore[t.index] = prov.castleStore[old]! * t.share;
      }
    }
  });
  const defaulted: string[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (covered[p] && prov.population) world.provincePopulation[p] = population[p]!;
    // People by class keep the saved mix (or the starting mix, for saves from before classes), scaled to the people now there.
    if (covered[p]) rescaleClasses(world, p, prov.classes ? prov.classes.subarray(classesFrom[p]! * CLASS_COUNT, (classesFrom[p]! + 1) * CLASS_COUNT) : null);
    if (!covered[p]) defaulted.push(world.provinceIds[p]!);
  }

  // Nation fields by id; fields an older chunk lacks keep the rules' values.
  ids.nations.forEach((id, old) => {
    const n = world.nationIndex.get(id);
    if (n === undefined) return;
    if (nat.treasury) world.nationTreasury[n] = nat.treasury[old]!;
    if (nat.levies) world.nationLevies[n] = nat.levies[old]!;
    if (nat.maxLevies) world.nationMaxLevies[n] = nat.maxLevies[old]!;
    if (nat.monthlyIncome) world.nationMonthlyIncome[n] = nat.monthlyIncome[old]!;
    if (nat.taxDefault) world.nationTaxDefault[n] = nat.taxDefault[old]!;
    if (nat.debt) world.nationDebt[n] = nat.debt[old]!;
    if (nat.loanMonth) world.nationLoanMonth[n] = nat.loanMonth[old]!;
    // Saves from before a ledger line was added hold fewer lines a realm; the ledger is worked out again each week.
    const lines = nat.ledger ? Math.min(LEDGER_LINES, nat.ledger.length / ids.nations.length) : 0;
    if (nat.ledger) world.nationLedger.set(nat.ledger.subarray(old * lines, old * lines + lines), n * LEDGER_LINES);
    if (nat.neglect) world.nationNeglect[n] = nat.neglect[old]!;
    if (nat.grainGold) world.nationGrainGold[n] = nat.grainGold[old]!;
    if (nat.foodSold) world.nationFoodSold[n] = nat.foodSold[old]!;
    if (nat.foodSpoiled) world.nationFoodSpoiled[n] = nat.foodSpoiled[old]!;
  });
  // Commanders by id; ones the realm hired during the game come back by name and owner.
  const commanderMap = ids.commanders.map((id, old) => {
    const found = world.commanderIds.indexOf(id);
    if (found >= 0) return found;
    const owner = nat.commanderOwner ? nat.commanderOwner[old]! : -1;
    const name = ids.commanderNames?.[old];
    if (!name || owner < 0 || nationMap[owner]! < 0) return -1;
    return addCommander(world, nationMap[owner]!, newCommander(name), id);
  });
  const natMeta = need("nations").meta as { research?: SavedResearch; lords?: RealmLord[]; musters?: Muster[]; mercs?: OldMercenary[]; freeCompanies?: FreeCompany[]; freeCompanySeq?: number; commanderHome?: number[]; commanderSeed?: number[]; foodPolicy?: FoodPolicyScreen[]; diplomacy?: World["diplomacy"]; government?: SavedGovernment; events?: SavedEvents; navy?: SavedNavy; exploration?: SavedExploration; peoples?: SavedPeoples; rebels?: SavedRebels; heritage?: Record<string, SavedRealmHeritage>; rulers?: ReturnType<typeof saveRulers>; fallen?: SavedFallen };
  const mapP = (old: number) => world.provinceIndex.get(ids.provinces[old]!) ?? -1;
  const mapN = (old: number) => nationMap[old] ?? -1;
  const mapCompany = (c: FreeCompany): FreeCompany => ({ ...c, home: c.home < 0 ? -1 : mapP(c.home) });
  if (natMeta.freeCompanies) {
    world.freeCompanies = natMeta.freeCompanies.map(mapCompany);
    world.freeCompanySeq = natMeta.freeCompanySeq ?? Math.max(0, ...world.freeCompanies.map((c) => c.id));
  }
  if (natMeta.mercs) {
    world.mercs = natMeta.mercs
      .map((m): Mercenary => {
        // Saves from before free companies held one arm and its men: that becomes a company of its own.
        const company = m.company ? mapCompany(m.company) : { id: ++world.freeCompanySeq, group: "free company", name: "A free company", captain: "", home: -1, byArm: ARMS.map((arm) => (arm === m.arm ? (m.men ?? 0) : 0)) };
        return { nation: mapN(m.nation), company, weeksLeft: m.weeksLeft };
      })
      .filter((m) => m.nation >= 0);
  }
  natMeta.commanderHome?.forEach((p, old) => {
    const c = commanderMap[old]!;
    if (c >= 0) world.commanderHome[c] = p < 0 ? -1 : mapP(p);
  });
  // A commissioned official's name seed; before it was saved, he was named after his home province.
  (natMeta.commanderSeed ?? natMeta.commanderHome)?.forEach((p, old) => {
    const c = commanderMap[old]!;
    if (c >= 0) world.commanderSeed[c] = p < 0 ? -1 : mapP(p);
  });
  // Diplomacy (wars, truces, alliances, envoys, ledgers) by nation id; saves from before it keep the 1444 relations.
  if (natMeta.diplomacy) world.diplomacy = natMeta.diplomacy;
  // The event tree (ages, periods, what fired, events waiting for an answer); a save from before it starts the tree afresh.
  if (natMeta.events) restoreEvents(world, natMeta.events);
  // Heritage by realm (heydays, ambitions, legacies, burden); a save from before it draws afresh.
  if (natMeta.heritage) restoreHeritage(world, natMeta.heritage);
  // Rulers and the fallen by realm; a save from before them keeps the rulers the seed drew and counts no fallen.
  restoreRulers(world, natMeta.rulers);
  restoreFallen(world, natMeta.fallen);
  // Food policies by realm (castles' own values are keyed by province id); saves from before them keep the starting policy.
  natMeta.foodPolicy?.forEach((screen, old) => {
    const n = mapN(old);
    if (n >= 0 && screen) world.foodPolicy[n] = { realm: { ...screen.realm }, overrides: { ...screen.overrides }, ...(screen.custom ? { custom: { ...screen.custom } } : {}) };
  });
  // Forms and Custom by realm; a save from before government keeps the 1444 start.
  if (natMeta.government) restoreGovernment(world, natMeta.government, mapN);
  graspingFromGrievances(world);
  // Risings by realm and province; a save from before rebellions has none.
  if (natMeta.rebels) restoreRebels(world, natMeta.rebels, mapN, mapP);
  // Tongues and faiths by province and realm; a save from before them keeps the 1444 start.
  restorePeoples(world, natMeta.peoples);
  readBeliefShares(world);
  // Research by realm; a save from before research keeps the 1444 start.
  if (natMeta.research) restoreResearch(world, natMeta.research, mapN, mapP);
  // Ports, sailors and fleets; a save from before the navy keeps the 1444 ports.
  if (natMeta.navy) restoreNavy(world, natMeta.navy, mapN, mapP, (old) => commanderMap[old] ?? -1);
  // Charts and colonies; a save from before exploration keeps the 1444 charts.
  if (natMeta.exploration) restoreExploration(world, natMeta.exploration, mapN, mapP);
  // Lords keep their places in the list (provinces point at them); one of a realm that is gone holds nothing.
  type SavedWork<T> = Omit<T, "work"> & { work: string };
  const worksMeta = need("nations").meta as { sites?: SavedWork<Site>[]; workQueue?: SavedWork<QueuedWork>[] };
  const mapWork = <T extends { nation: number; province: number }>(x: Omit<T, "work"> & { work: string }) => ({ ...x, nation: mapN(x.nation), province: mapP(x.province), work: workIndex(x.work) }) as unknown as T;
  const placed = (x: { nation: number; province: number; work: number }) => x.nation >= 0 && x.province >= 0 && x.work >= 0;
  if (worksMeta.sites) world.sites = worksMeta.sites.map((s) => mapWork<Site>(s)).filter(placed);
  if (worksMeta.workQueue) world.workQueue = worksMeta.workQueue.map((q) => mapWork<QueuedWork>(q)).filter(placed);
  refreshWorks(world);
  if (natMeta.lords) world.lords = natMeta.lords.map((l) => ({ ...l, nation: mapN(l.nation) }));
  if (natMeta.musters) world.musters = natMeta.musters.map((m) => ({ ...m, nation: mapN(m.nation), province: mapP(m.province) })).filter((m) => m.nation >= 0 && m.province >= 0);
  const rec = nat.commanderRecord;
  if (rec) {
    commanderMap.forEach((now, old) => {
      if (now < 0) return;
      const [might, cunning, logistics, victories, defeats, wounds] = rec.subarray(old * 6, old * 6 + 6);
      Object.assign(world.commanders[now]!, { might, cunning, logistics, victories, defeats, wounds });
      world.commanderLogistics[now] = logistics!;
    });
  }
  if (nat.commanderOwner) {
    ids.commanders.forEach((_, old) => {
      const c = commanderMap[old]!;
      if (c >= 0) {
        const o = nat.commanderOwner![old]!;
        world.commanderOwner[c] = o < 0 ? -1 : nationMap[o]!;
      }
    });
  }

  // Sieges under way, where their province and besieger are in this build.
  world.sieges = new Map();
  for (const [old, st] of ((provChunk.meta as { sieges?: [number, SiegeState][] }).sieges ?? [])) {
    const p = provinceTargets[old]?.[0]?.index;
    const by = nationMap[st.by] ?? -1;
    if (p !== undefined && by >= 0) world.sieges.set(p, { ...st, by, siege: { ...st.siege, ground: world.provinceGround[p] ?? "farmland" } });
  }

  // Armies: the live ones back in their own slots, so queued orders still name them.
  const A = arm.arrays;
  const count = (arm.meta as { count: number }).count;
  const pool = createArmyPool(Math.max(16, count));
  pool.count = count;
  const mapProvince = (old: number) => provinceTargets[old]?.[0]?.index ?? -1;
  let ro = 0;
  let po = 0;
  const slots = A.slot!;
  for (let k = 0; k < slots.length; k++) {
    const slot = slots[k]!;
    const routeLen = A.routeLen![k]!;
    const pathLen = A.pathLen?.[k] ?? 0;
    const route = Array.from(A.route!.subarray(ro, ro + routeLen), mapProvince).filter((p) => p >= 0);
    const path = A.path ? Int32Array.from(A.path.subarray(po, po + pathLen)) : new Int32Array(0);
    ro += routeLen;
    po += pathLen;
    const owner = nationMap[A.owner![k]!]!;
    const location = mapProvince(A.location![k]!);
    if (owner < 0 || location < 0) {
      warnings.push(`army in slot ${slot} has no owner or place in this build and is dropped`);
      continue;
    }
    pool.alive[slot] = 1;
    pool.owner[slot] = owner;
    pool.location[slot] = location;
    const tile = A.tile?.[k] ?? -1;
    const sameMap = tile >= 0 && world.tiles.province[tile]! - 1 === location;
    pool.tile[slot] = sameMap ? tile : world.tiles.centre[location]!;
    pool.men[slot] = A.men![k]!;
    const cmd = A.commander![k]!;
    pool.commander[slot] = cmd < 0 ? -1 : commanderMap[cmd]!;
    pool.horse[slot] = A.horse![k]!;
    pool.food[slot] = A.food![k]!;
    pool.progress[slot] = A.progress![k]!;
    if (A.kind) pool.kind[slot] = A.kind[k]!;
    if (A.monthsOut) pool.monthsOut[slot] = A.monthsOut[k]!;
    if (A.drill) pool.drill[slot] = A.drill[k]!;
    if (A.trainArm) pool.trainArm[slot] = A.trainArm[k]!;
    if (A.trainMen) pool.trainMen[slot] = A.trainMen[k]!;
    if (A.trainLeft) pool.trainLeft[slot] = A.trainLeft[k]!;
    if (A.mix) pool.mix.set(A.mix.subarray(k * MIX, (k + 1) * MIX), slot * MIX);
    pool.route[slot] = route;
    // A path walked over another map's tiles is planned again from the route.
    pool.path[slot] = sameMap && path.every((t) => world.tiles.province[t]! > 0) ? path : new Int32Array(0);
    if (A.retreating) pool.retreating[slot] = A.retreating[k]!;
    if (A.cameFrom) pool.cameFrom[slot] = A.cameFrom[k]! < 0 ? -1 : mapProvince(A.cameFrom[k]!);
  }
  world.armies = pool;
  const armMeta = arm.meta as { battles?: Battle[]; battleSeq?: number };
  for (const b of armMeta.battles ?? []) {
    const attackers = b.attackers.filter((x) => pool.alive[x]);
    const defenders = b.defenders.filter((x) => pool.alive[x]);
    if (!attackers.length || !defenders.length) continue;
    world.battles.push({ ...b, attackers, defenders, province: mapProvince(b.province) });
    for (const x of [...attackers, ...defenders]) pool.battle[x] = b.id;
  }
  world.battleSeq = armMeta.battleSeq ?? 0;

  const events = chunks.has("events") ? (unpackChunk(chunks.get("events")!).meta as unknown as EventsState) : { ...EMPTY_EVENTS };
  const history = chunks.has("history") ? ((unpackChunk(chunks.get("history")!).meta.timeline as unknown[]) ?? []) : [];
  const orders: Order[] = [];
  if (chunks.has("orders")) {
    const saved = unpackChunk(chunks.get("orders")!).meta.orders as { type: "move"; army: number; to: string | null }[];
    for (const o of saved) {
      const to = o.to === null ? undefined : world.provinceIndex.get(o.to);
      if (to !== undefined) orders.push({ type: o.type, army: o.army, to });
    }
  }
  return {
    world,
    game: { playerNation: meta.playerNation, options: meta.options, orders, events, history },
    warnings,
    defaulted,
  };
}

// ---------------------------------------------------------------- hashes of the build

const hashes = new WeakMap<Ruleset, { rules: string; map: string }>();

function buildHashes(rules: Ruleset): { rules: string; map: string } {
  let h = hashes.get(rules);
  if (!h) {
    h = {
      rules: fnv1a(JSON.stringify({ defines: rules.defines, units: rules.units, nations: rules.nations })),
      map: fnv1a(JSON.stringify(rules.provinces.map((p) => [p.id, p.terrain, p.neighbors, p.river ?? false]))),
    };
    hashes.set(rules, h);
  }
  return h;
}

/** `rulesHash` of a build: defines, units and nations. */
export function rulesHash(rules: Ruleset): string {
  return buildHashes(rules).rules;
}

/** `mapHash` of a build: province ids, ground and borders. */
export function mapHash(rules: Ruleset): string {
  return buildHashes(rules).map;
}

/** `hashWorld()` of the state exactly as a save holds it (SAVE-039). */
export function savedWorldHash(chunks: readonly RawChunk[], rules: Ruleset, tiles?: TileGrid): string {
  return hashWorld(restoreWorld(new Map(chunks.map((c) => [c.id, c])), rules, {}, tiles).world);
}

// ---------------------------------------------------------------- the thumbnail

/** A 96 × 64 crop of the map around the player's realm, as a base64 PNG (the Load list's map crop). */
export function thumbnail(world: World, playerNation: string): string {
  const { width, height } = savesConfig.format.thumbnail;
  const rgb = new Uint8Array(width * height * 3).fill(40);
  const provs = world.rules.provinces;
  const me = world.nationIndex.get(playerNation) ?? -1;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  provs.forEach((p, i) => {
    if (world.provinceOwner[i] !== me || p.x === undefined || p.y === undefined) return;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  });
  if (minX === Infinity) return base64(encodePng(width, height, rgb));
  const span = Math.max((maxX - minX) / width, (maxY - minY) / height, 1) * 1.5;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const colours = world.rules.nations.map((n) => {
    const v = parseInt(n.color.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255] as const;
  });
  provs.forEach((p, i) => {
    if (p.x === undefined || p.y === undefined) return;
    const x = Math.floor((p.x - cx) / span + width / 2);
    const y = Math.floor((p.y - cy) / span + height / 2);
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const o = world.provinceOwner[i]!;
    const c = world.provinceWater[i] ? ([30, 60, 110] as const) : o >= 0 ? colours[o]! : ([150, 140, 110] as const);
    rgb.set(c, (y * width + x) * 3);
  });
  return base64(encodePng(width, height, rgb));
}
