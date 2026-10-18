import { statecraftView, type StatecraftView } from "./statecraft.ts";
import { eventCards, type EventCard } from "./events.ts";
import { diplomacyLensView, type DiplomacyLensView } from "./diplomacyLens.ts";
import { giftGold } from "./lords.ts";
import { stabilityOf, type Stability } from "./stability.ts";
import { governmentView, realmForms, type GovernmentView } from "./government.ts";
import { rebelsView, type RebelsView } from "./rebels.ts";
import { peoplesSnapshot, type PeoplesSnapshot } from "./peoples.ts";
import { GRIEVANCES, moodIndex, MOODS } from "./moods.ts";
import { CLASS_NAMES } from "./living.ts";
import { canBorrow, LEDGER, loanDebt, loanUnsettlesLords, LEDGER_LINES, NORMAL_TAX, provinceTax, TAX_RATES } from "./treasury.ts";
import { CLIMATES, harvestMonthsOf, HARVESTS, provinceClimates, storeMonths } from "./food.ts";
import { badWeatherName } from "./domain/realm/index.ts";
import { foodView, mapNetwork, type FoodView } from "./castleFood.ts";
import { buildSheets, landSheets, slotsOf, slotsUsed, townSize, workCost, WORKS, workStepName, workEffect, type LandTileRow, type WorkRow } from "./works.ts";
import { buildingType } from "./domain/buildings/index.ts";
import type { GameDate, Ruleset } from "@ph/rules";
import { hashWorld } from "./hash.ts";
import { advance, applyNow, campaigning, HOURS_PER_STEP, mayMarchInto, processTurn, refillHere, type Order } from "./turn.ts";
import { createWorld, tileMarch, type World } from "./world.ts";
import { armyBreak, controller, relationState, SIEGE_MONTH_DAYS, type News } from "./war.ts";
import { tileStepHours } from "./march.ts";
import { tileGridFromImages } from "./tiles.ts";
import { navyView, type NavyView } from "./navy.ts";
import { explorationView, type ExplorationView } from "./colonies.ts";
import { realmResearch, researchView, type ResearchView } from "./research.ts";
import { officialAt, yearsServed } from "./officials.ts";
import { armyPay, armyRations, ARMS, menByArm, companyMen, companyPay, companyWeeks, freeCompaniesFor, type FreeCompany, nationPay, OFFICIALS, weeksToGather } from "./recruit.ts";

/** A free company as the UI shows it: men by arm, only the arms it has. */
export interface CompanyView {
  name: string;
  group: string;
  captain: string;
  men: number;
  byArm: Record<string, number>;
}

const companyView = (c: FreeCompany): CompanyView => ({
  name: c.name,
  group: c.group,
  captain: c.captain,
  men: companyMen(c),
  byArm: Object.fromEntries(ARMS.flatMap((arm, k) => (c.byArm[k]! > 0 ? [[arm, c.byArm[k]!]] : []))),
});

/** Messages the UI thread sends to the engine worker. */
export type EngineRequest =
  /** `map` is the map's images as the UI decoded them, so armies march over its tiles; without it they stand still. */
  | { id: number; type: "newGame"; seed: number; playerNation: string; map?: MapTiles }
  /** Plays a whole week at once (the start-up probe and the benchmarks). */
  | { id: number; type: "endTurn"; orders: Order[] }
  /** Plays the clock on by some 4-hour steps (six a day). */
  | { id: number; type: "advance"; steps: number }
  /** An order that acts at once (everything but moves: war and peace, recruiting, training, commanders). */
  | { id: number; type: "act"; order: Order };

/** The decoded map images: province id + 1 per pixel (0 = water), and the terrain image's RGB. */
export interface MapTiles {
  width: number;
  height: number;
  province: Uint16Array;
  terrain: Uint8Array;
}

/** Messages the engine worker sends back. */
export type EngineResponse =
  | { id: number; type: "snapshot"; snapshot: Snapshot }
  | { id: number; type: "error"; message: string };

/**
 * Read-only copy of the state the UI draws from. Arrays are fresh copies so
 * they can be transferred (zero-copy) to the UI thread while the engine keeps
 * its own. SharedArrayBuffer is deliberately not used: it needs cross-origin
 * isolation headers that mobile webviews don't provide.
 */
export interface Snapshot {
  turn: number;
  date: GameDate;
  /** Hour of the day (0, 4, 8 … 20). */
  hour: number;
  playerNation: number;
  hash: string;
  computeMs: number;
  rejectedOrders: { order: Order; reason: string }[];
  provinceOwner: Int16Array;
  /** Nation occupying each province, -1 = none. */
  provinceOccupier: Int16Array;
  /** 1 for land the player's armies have no right to enter (no war, alliance or passage, MOVE-128), so the map can mark its borders. */
  provinceClosed: Uint8Array;
  /** What happened this turn (or from the last order) that concerns the player. */
  news: News[];
  /** Wars under way, by nation index. */
  wars: { id: string; attackers: number[]; defenders: number[]; start: string }[];
  /** Peace offered to the player by an AI war leader, until the next month: terms as the AI sends them ("give": it gives up land the player holds). */
  peaceOffers: { id: number; from: number; terms: "take" | "white" | "give" }[];
  /** Calls to arms waiting for the player's answer. */
  calls: { id: string; caller: number; against: number; kind: "offensive" | "defensive" }[];
  /** The player's standing with every other nation that has one. */
  relations: { nation: number; state: "war" | "truce" | "alliance" | "subject" | "overlord"; until?: string }[];
  /** Events and decisions waiting for the player's answer, oldest first (milestone 6). */
  events: EventCard[];
  /** Envoys, answers and what other realms think of the player (milestone 5); null without a player. */
  statecraft: StatecraftView | null;
  /** The map's diplomacy lens: each realm's relation to the player, leagues, envoys on the road and war aims (DIPL-209); null without a player. */
  diplomacyLens: DiplomacyLensView | null;
  /** Sieges under way: months gone, how far into the next siege month (0..1), breaches and men inside. */
  sieges: { province: number; by: number; months: number; progress: number; breaches: number; garrison: number }[];
  /** Battles being fought: where, each side's leading realm with its men now and at the start, and rounds fought of all. */
  battles: { id: number; tile: number; province: number; attacker: number; defender: number; attMen: number; defMen: number; attStart: number; defStart: number; round: number; rounds: number; player: boolean }[];
  /** Width of the tile grid (tile = y * width + x, in map pixels). */
  tileWidth: number;
  nationTreasury: Float64Array;
  nationLevies: Float64Array;
  nationMonthlyIncome: Float64Array;
  /** Troop cap and the men counting toward it, by nation. */
  nationTroopCap: Float64Array;
  nationCapUsed: Float64Array;
  /** Gold the player pays their men this month. */
  pay: number;
  /** Men who can be called in each province now. */
  provinceRecruits: Float32Array;
  /** People of each province in thousands, and by class (CLASS_NAMES, CLASS_COUNT per province). */
  provincePeople: Float32Array;
  provinceClasses: Float32Array;
  classNames: readonly string[];
  /** Tax rate names, each province's own rate (-1 = the realm default) and the player's default. */
  taxRates: readonly string[];
  provinceTax: Int8Array;
  /** Tax gold each province pays its holder a month. */
  provinceTaxGold: Float32Array;
  taxDefault: number;
  /** The player's ledger this month (gold by line, + in and − out), debt, interest a month and what lenders would still give. */
  ledger: { line: string; gold: number }[];
  debt: number;
  canBorrow: number;
  /** Most the player may owe (a year's tax and trade), the debt a loan of one gold adds (gold plus interest, REALM-188), and whether a loan now unsettles the lords (REALM-189). */
  debtLimit: number;
  loanDebtFactor: number;
  loanUnsettlesLords: boolean;
  /** Months of eating in each province's store, its last harvest (index into harvests, -1 = none yet) and people starved there this year (thousands). */
  provinceFoodMonths: Float32Array;
  provinceHarvest: Int8Array;
  provinceStarved: Float32Array;
  harvests: readonly string[];
  /** The weather of each province's last harvest (-1 bad, 0 normal, 1 good), its harvest climate (index into climates) and the months it harvests. */
  provinceWeather: Int8Array;
  provinceClimate: Int8Array;
  provinceHarvestMonths: number[][];
  climates: readonly string[];
  /** What bad weather is called in each climate (drought, floods, bad weather). */
  badWeather: readonly string[];
  /** The castle feeding each province (-1 = none in reach) and its ring from it (feedback 84). */
  provinceCastle: Int32Array;
  provinceRing: Int8Array;
  /** The player's Food tab (null before a realm is chosen). */
  food: FoodView | null;
  /** Each province's grievances (bits of grievanceNames) and mood (index into moods). */
  provinceGrievances: Uint16Array;
  provinceMood: Int8Array;
  grievanceNames: readonly string[];
  moods: readonly string[];
  /** Every lord (index = provinceLord's value): name, house, realm, loyalty and provinces held; the gold a gift costs. */
  lords: { name: string; house: string; nation: number; loyalty: string; lands: number }[];
  provinceLord: Int16Array;
  giftGold: number;
  /** The player's stability: the weakest of its lords, subjects, officials and provinces (REALM-199); null before a realm is chosen. */
  stability: Stability | null;
  /** The player's Government tab: form, both caps, the form's laws and the next forms (GOV-064); null before a realm is chosen. */
  government: GovernmentView | null;
  /** Risings in every realm (the player's with their card and answers), the player's beaten risings waiting for a verdict, and each plotting province's monthly chance to rise (REBL-063). */
  rebels: RebelsView;
  /** Rising holding each province (its id), 0 = none. */
  provinceRebels: Int32Array;
  /** Every realm's government form by name, for its card. */
  realmForms: string[];
  /** Tongues and faiths of every province and realm; the UI reads them with peoples.ts (tongueLine, faithLine, peoplesView). */
  peoples: PeoplesSnapshot;
  /** The player's men gathering in provinces: men still to come, weeks to the next thousand and to the last. */
  musters: { province: number; men: number; weeksLeft: number; weeksAll: number }[];
  /** The player's free companies on their way to the capital. */
  mercs: (CompanyView & { weeksLeft: number })[];
  /** Free companies the player can hire: their pay a month (paid at once on hiring) and weeks to reach the capital. */
  freeCompanies: (CompanyView & { id: number; pay: number; weeks: number })[];
  /** Official of each province (a name from OFFICIALS), or null when the post stands empty. */
  provinceOfficial: (string | null)[];
  /** Name of the official at each province's post, or null when it stands empty (or no realm owns it). */
  provinceOfficialName: (string | null)[];
  /** Years the official at each post has served there, to one decimal (0 when empty); his effect grows to full at 5 (see officialEffect). */
  provinceOfficialYears: number[];
  /** Every commander: who they serve (-1 = none), their skills and record, the army they lead (index in armies, -1 = at court) and the province they left as an official (-1 = none). */
  commanders: { name: string; owner: number; might: number; cunning: number; logistics: number; victories: number; defeats: number; army: number; home: number; origin: string; fleet: number }[];
  /** Ports, sailors and fleets: every fleet for the map, the player's ports and fleets in full (navy.ts). */
  navy: NavyView;
  /** The player's charts, colonial governors and colonies, and every colony being founded that they have charted (colonies.ts). */
  exploration: ExplorationView;
  armies: {
    id: Int32Array;
    owner: Int16Array;
    location: Int32Array;
    /** Tile the army stands on. */
    tile: Int32Array;
    men: Int32Array;
    commander: Int32Array;
    horse: Int32Array;
    /** Rations in the wagons, rounded. */
    food: Int32Array;
    /** Provinces still to march through. */
    route: number[][];
    /** The player's armies: tiles still to walk, and hours to the end. Empty for others. */
    path: Int32Array[];
    /** Hours from now to reach each tile of path (for marking where the army stands at each week's end). */
    pathHours: Float32Array[];
    etaHours: number[];
    /** Tiles stepped onto since the last snapshot, in order (for drawing the march). */
    trail: number[][];
    /** Battle being fought (its id), or -1; 1 while falling back after a defeat. */
    battle: Int32Array;
    retreating: Int16Array;
    /** 0 levy, 1 hired company. */
    kind: Int16Array;
    monthsOut: Int32Array;
    /** Months drilled, ×10. */
    drill: Int32Array;
    /** Men by arm, in the order of `arms`. */
    byArm: number[][];
    /** Gold a month and rations a month. */
    pay: number[];
    rations: number[];
    /** 1 while on campaign (at war or abroad: men eat double), and the rations a month the store where it stands can give it. */
    campaigning: Uint8Array;
    refill: number[];
    /** Share of its men an army can lose before it breaks (the player's armies only; 0 for others). */
    breakPoint: number[];
    training: ({ arm: string; men: number; months: number } | null)[];
  };
  /** Arm names for armies.byArm. */
  arms: readonly string[];
  /** The player's research for the Learning tab (null before a realm is chosen). */
  research: ResearchView | null;
  /** Every realm's research at a glance, by nation index: inventions known, its study and how far along (%). */
  realmResearch: { known: number; study: string | null; pct: number }[];
  /** Works (milestone 4): their names, each step's name and what it does, and the step built of each in each province (works.length per province, 0 = none). */
  works: readonly string[];
  workSteps: { name: string; effect: string }[][];
  provinceWorks: Uint8Array;
  /** The player's building sites: months left of all. */
  sites: { province: number; work: number; step: number; monthsLeft: number; months: number }[];
  /** The player's works waiting to start, in order, with their gold. */
  workQueue: { province: number; work: number; step: number; gold: number }[];
  /** Build sheet of each of the player's provinces, by province index. */
  buildSheets: Record<number, WorkRow[]>;
  /** Land tab of each of the player's provinces: its tiles, the building working them, people, food and wares (feedback 80, 87). */
  landSheets: Record<number, LandTileRow[]>;
  /** Slots of each of the player's provinces: taken, all, and the town's size that goes with its people. */
  buildSlots: Record<number, { used: number; total: number; town: string }>;
  /** The player's works go unpaid (treasury empty): they give half. */
  worksNeglected: boolean;
}

/** Land nation n's armies may not march into, worked out once per realm holding it. */
function closedTo(w: World, n: number): Uint8Array {
  const out = new Uint8Array(w.provinceCount);
  const byHolder = new Map<number, boolean>();
  for (let p = 0; p < w.provinceCount; p++) {
    if (w.provinceWater[p]) continue;
    const holder = controller(w, p);
    let shut = byHolder.get(holder);
    if (shut === undefined) byHolder.set(holder, (shut = !mayMarchInto(w, n, p)));
    if (shut) out[p] = 1;
  }
  return out;
}

export interface HostReply {
  response: EngineResponse;
  transfer: ArrayBuffer[];
}

/**
 * Engine side of the worker protocol, kept free of Worker APIs so it can be
 * tested directly and reused by a server-side runner later.
 */
export function createEngineHost(loadRules: () => Ruleset, now: () => number = () => performance.now()) {
  let world: World | null = null;
  let player = -1;

  function snapshot(id: number, started: number, rejectedOrders: Snapshot["rejectedOrders"], news: News[] = []): HostReply {
    const w = world!;
    const idx = (ids: string[]) => ids.map((x) => w.nationIndex.get(x)!).filter((n) => n !== undefined);
    const wars = w.diplomacy.wars.map((x) => ({ id: x.id, attackers: idx(x.attackers), defenders: idx(x.defenders), start: x.start }));
    // The player hears of what involves them, their partners and their neighbours' wars.
    const close = new Set<number>([player]);
    for (const x of wars) if (x.attackers.includes(player) || x.defenders.includes(player)) for (const n of [...x.attackers, ...x.defenders]) close.add(n);
    const relations: Snapshot["relations"] = [];
    for (let n = 0; n < w.nationCount; n++) {
      if (n === player) continue;
      const r = relationState(w, player, n);
      if (r.state) {
        relations.push({ nation: n, state: r.state, ...(r.until ? { until: r.until } : {}) });
        if (r.state === "alliance" || r.state === "overlord" || r.state === "subject") close.add(n);
      }
    }
    const a = w.armies;
    const live: number[] = [];
    for (let i = 0; i < a.count; i++) if (a.alive[i]) live.push(i);
    const pick = <T extends Int16Array | Int32Array>(src: T, make: (n: number) => T): T => {
      const out = make(live.length);
      live.forEach((slot, k) => (out[k] = src[slot]!));
      return out;
    };
    const snap: Snapshot = {
      turn: w.turn,
      date: { ...w.date },
      hour: w.step * HOURS_PER_STEP,
      playerNation: player,
      hash: hashWorld(w),
      computeMs: now() - started,
      rejectedOrders,
      provinceOwner: w.provinceOwner.slice(),
      provinceOccupier: w.provinceOccupier.slice(),
      provinceClosed: closedTo(w, player),
      news: news.filter((x) => x.nations.some((n) => close.has(n)) || x.kind === "war" || x.kind === "destroyed" || x.major),
      wars,
      peaceOffers: w.peaceOffers.map((o) => ({ ...o })),
      calls: w.diplomacy.calls
        .filter((c) => !c.answer && c.called === w.nationIds[player])
        .map((c) => ({ id: c.id, caller: w.nationIndex.get(c.caller)!, against: w.nationIndex.get(c.against)!, kind: c.kind as "offensive" | "defensive" })),
      relations,
      statecraft: statecraftView(w, player),
      events: eventCards(w, player),
      diplomacyLens: diplomacyLensView(w, player),
      sieges: [...w.sieges].map(([p, st]) => ({ province: p, by: st.by, months: st.siege.months, progress: (st.days % SIEGE_MONTH_DAYS) / SIEGE_MONTH_DAYS, breaches: st.siege.breaches, garrison: Math.round(st.siege.garrison) })),
      battles: w.battles.map((b) => {
        const men = (slots: number[]) => slots.reduce((t, s) => t + (a.alive[s] ? a.men[s]! : 0), 0);
        return {
          id: b.id,
          tile: b.tile,
          province: b.province,
          attacker: a.owner[b.attackers[0]!]!,
          defender: a.owner[b.defenders[0]!]!,
          attMen: men(b.attackers),
          defMen: men(b.defenders),
          attStart: b.attStart,
          defStart: b.defStart,
          round: b.round,
          rounds: b.rounds,
          player: [...b.attackers, ...b.defenders].some((s) => a.owner[s] === player),
        };
      }),
      tileWidth: w.tiles.width,
      nationTreasury: w.nationTreasury.slice(),
      nationLevies: w.nationLevies.slice(),
      nationMonthlyIncome: w.nationMonthlyIncome.slice(),
      nationTroopCap: w.nationTroopCap.slice(),
      nationCapUsed: w.nationCapUsed.slice(),
      pay: player >= 0 ? nationPay(w, player) : 0,
      provinceRecruits: w.provinceRecruits.slice(),
      provincePeople: w.provincePopulation.slice(),
      provinceClasses: w.provinceClasses.slice(),
      classNames: CLASS_NAMES,
      taxRates: TAX_RATES,
      provinceTax: w.provinceTax.slice(),
      provinceTaxGold: Float32Array.from({ length: w.provinceCount }, (_, p) => {
        const holder = controller(w, p);
        return holder >= 0 ? provinceTax(w, p, holder) : 0;
      }),
      taxDefault: player >= 0 ? w.nationTaxDefault[player]! : NORMAL_TAX,
      ledger: player >= 0 ? LEDGER.map((line, k) => ({ line, gold: w.nationLedger[player * LEDGER_LINES + k]! })) : [],
      debt: player >= 0 ? w.nationDebt[player]! : 0,
      canBorrow: player >= 0 ? canBorrow(w, player) : 0,
      debtLimit: player >= 0 ? w.nationDebt[player]! + canBorrow(w, player) * loanDebt(1) : 0,
      loanDebtFactor: loanDebt(1),
      loanUnsettlesLords: player >= 0 && loanUnsettlesLords(w, player),
      provinceFoodMonths: Float32Array.from({ length: w.provinceCount }, (_, p) => storeMonths(w, p)),
      provinceHarvest: w.provinceHarvest.slice(),
      provinceStarved: w.provinceStarved.slice(),
      harvests: HARVESTS,
      provinceWeather: w.provinceWeather.slice(),
      provinceClimate: provinceClimates(w).slice(),
      provinceHarvestMonths: Array.from({ length: w.provinceCount }, (_, p) => (w.provinceWater[p] ? [] : harvestMonthsOf(w, p))),
      climates: CLIMATES,
      badWeather: CLIMATES.map(badWeatherName),
      ...(mapNetwork(w), { provinceCastle: w.provinceCastle.slice(), provinceRing: w.provinceRing.slice() }),
      food: player >= 0 ? foodView(w, player) : null,
      provinceGrievances: w.provinceGrievances.slice(),
      provinceMood: Int8Array.from({ length: w.provinceCount }, (_, p) => moodIndex(w, p)),
      grievanceNames: GRIEVANCES,
      moods: MOODS,
      lords: (() => {
        const lands = new Int32Array(w.lords.length);
        for (let p = 0; p < w.provinceCount; p++) if (w.provinceLord[p]! >= 0) lands[w.provinceLord[p]!]!++;
        return w.lords.map((l, k) => ({ name: l.name, house: l.house, nation: l.nation, loyalty: l.loyalty, lands: lands[k]! }));
      })(),
      provinceLord: w.provinceLord.slice(),
      giftGold: giftGold(w),
      stability: player >= 0 ? stabilityOf(w, player) : null,
      government: player >= 0 ? governmentView(w, player) : null,
      rebels: rebelsView(w),
      provinceRebels: w.provinceRebels.slice(),
      realmForms: realmForms(w),
      peoples: peoplesSnapshot(w),
      musters: w.musters.filter((m) => m.nation === player).map((m) => ({ province: m.province, men: m.men, weeksLeft: m.weeksLeft, weeksAll: weeksToGather(w, m) })),
      mercs: w.mercs.filter((m) => m.nation === player).map((m) => ({ ...companyView(m.company), weeksLeft: m.weeksLeft })),
      freeCompanies: player >= 0 ? freeCompaniesFor(w, player).map((c) => ({ ...companyView(c), id: c.id, pay: companyPay(w, c), weeks: companyWeeks(w, c, player) })) : [],
      provinceOfficial: Array.from(w.provinceOfficial, (o) => (o >= 0 ? OFFICIALS[o]! : null)),
      provinceOfficialName: Array.from({ length: w.provinceCount }, (_, p) => officialAt(w, p)),
      provinceOfficialYears: Array.from({ length: w.provinceCount }, (_, p) => Math.floor(yearsServed(w, p) * 10) / 10),
      commanders: w.commanders.map((c, k) => ({
        name: c.name,
        owner: w.commanderOwner[k]!,
        might: c.might,
        cunning: c.cunning,
        logistics: c.logistics,
        victories: c.victories,
        defeats: c.defeats,
        army: live.findIndex((slot) => a.commander[slot] === k),
        home: w.commanderHome[k]!,
        origin: c.origin ?? "",
        fleet: w.navy.fleets.find((f) => f.admiral === k)?.id ?? -1,
      })),
      navy: navyView(w, player),
      exploration: explorationView(w, player),
      arms: ARMS,
      research: player >= 0 ? researchView(w, player, ARMS) : null,
      realmResearch: realmResearch(w),
      works: WORKS,
      workSteps: WORKS.map((name, k) => buildingType(name).steps.map((_, i) => ({ name: workStepName(k, i + 1), effect: workEffect(w, k, i + 1) }))),
      provinceWorks: w.provinceWorks.slice(),
      sites: w.sites.filter((s) => s.nation === player).map((s) => ({ province: s.province, work: s.work, step: s.step, monthsLeft: s.monthsLeft, months: s.months })),
      workQueue: w.workQueue.filter((q) => q.nation === player).map((q) => ({ province: q.province, work: q.work, step: q.step, gold: workCost(w, q.province, q.work, q.step).gold })),
      buildSheets: buildSheets(w, player),
      landSheets: landSheets(w, player),
      buildSlots: (() => {
        const out: Snapshot["buildSlots"] = {};
        if (player >= 0) for (let p = 0; p < w.provinceCount; p++) if (w.provinceOwner[p] === player && !w.provinceWater[p]) out[p] = { used: slotsUsed(w, p), total: slotsOf(w, p), town: townSize(w, p).replace("_", " ") };
        return out;
      })(),
      worksNeglected: player >= 0 && !!w.nationNeglect[player],
      armies: {
        id: Int32Array.from(live),
        owner: pick(a.owner, (n) => new Int16Array(n)),
        location: pick(a.location, (n) => new Int32Array(n)),
        tile: pick(a.tile, (n) => new Int32Array(n)),
        men: pick(a.men, (n) => new Int32Array(n)),
        commander: pick(a.commander, (n) => new Int32Array(n)),
        horse: pick(a.horse, (n) => new Int32Array(n)),
        food: Int32Array.from(live, (slot) => Math.round(a.food[slot]!)),
        route: live.map((slot) => a.route[slot]!.slice()),
        path: live.map((slot) => (a.owner[slot] === player ? a.path[slot]!.slice(a.pathAt[slot]!) : new Int32Array(0))),
        pathHours: live.map((slot) => (a.owner[slot] === player ? pathHours(w, slot) : new Float32Array(0))),
        etaHours: live.map((slot) => (a.owner[slot] === player ? hoursLeft(w, slot) : 0)),
        trail: live.map((slot) => a.trail[slot]!.slice()),
        battle: pick(a.battle, (n) => new Int32Array(n)),
        retreating: Int16Array.from(live, (slot) => a.retreating[slot]!),
        kind: Int16Array.from(live, (slot) => a.kind[slot]!),
        monthsOut: Int32Array.from(live, (slot) => a.monthsOut[slot]!),
        drill: Int32Array.from(live, (slot) => Math.round(a.drill[slot]! * 10)),
        byArm: live.map((slot) => menByArm(w, slot).map(Math.round)),
        pay: live.map((slot) => armyPay(w, slot)),
        rations: live.map((slot) => armyRations(w, slot)),
        campaigning: Uint8Array.from(live, (slot) => Number(campaigning(w, slot))),
        refill: live.map((slot) => (a.owner[slot] === player ? refillHere(w, slot) : 0)),
        breakPoint: live.map((slot) => (a.owner[slot] === player ? armyBreak(w, slot) : 0)),
        training: live.map((slot) => (a.trainArm[slot]! >= 0 ? { arm: ARMS[a.trainArm[slot]!]!, men: a.trainMen[slot]!, months: a.trainLeft[slot]! } : null)),
      },
    };
    const transfer = [
      snap.provinceOwner,
      snap.provinceOccupier,
      snap.provinceClosed,
      snap.nationTreasury,
      snap.nationLevies,
      snap.nationMonthlyIncome,
      snap.nationTroopCap,
      snap.nationCapUsed,
      snap.provinceRecruits,
      snap.provincePeople,
      snap.provinceClasses,
      snap.provinceTax,
      snap.provinceTaxGold,
      snap.provinceFoodMonths,
      snap.provinceHarvest,
      snap.provinceWeather,
      snap.provinceClimate,
      snap.provinceStarved,
      snap.provinceCastle,
      snap.provinceRing,
      snap.provinceGrievances,
      snap.provinceMood,
      snap.provinceRebels,
      snap.rebels.chance,
      snap.provinceLord,
      snap.provinceWorks,
      ...Object.values(snap.armies).filter((v): v is Int32Array | Int16Array => ArrayBuffer.isView(v)),
      ...snap.armies.path,
    ].map((arr) => arr.buffer as ArrayBuffer);
    // The trail is for one look only.
    for (const slot of live) a.trail[slot] = [];
    return { response: { id, type: "snapshot", snapshot: snap }, transfer };
  }

  return function handle(req: EngineRequest): HostReply {
    const started = now();
    try {
      switch (req.type) {
        case "newGame": {
          const rules = loadRules();
          const grid = req.map ? tileGridFromImages(rules, req.map.width, req.map.height, req.map.province, req.map.terrain) : undefined;
          world = createWorld(rules, req.seed, grid);
          const idx = world.nationIndex.get(req.playerNation);
          if (idx === undefined) throw new Error(`unknown nation ${req.playerNation}`);
          player = idx;
          world.player = idx;
          return snapshot(req.id, started, []);
        }
        case "endTurn": {
          if (!world) throw new Error("no game in progress");
          const report = processTurn(world, req.orders, player);
          return snapshot(req.id, started, report.rejectedOrders, report.news);
        }
        case "advance": {
          if (!world) throw new Error("no game in progress");
          const news = advance(world, Math.max(1, Math.min(req.steps, 42)));
          return snapshot(req.id, started, [], news);
        }
        case "act": {
          if (!world) throw new Error("no game in progress");
          const report = applyNow(world, req.order, player);
          return snapshot(req.id, started, report.rejectedOrders, report.news);
        }
      }
    } catch (e) {
      return { response: { id: req.id, type: "error", message: e instanceof Error ? e.message : String(e) }, transfer: [] };
    }
  };
}

/** Hours an army still has to march along the tiles it has planned (left of a march planned a province at a time: none). */
function hoursLeft(world: World, slot: number): number {
  const h = pathHours(world, slot);
  return h.length ? h[h.length - 1]! : 0;
}

/** Hours from now until army slot steps onto each tile still on its path. */
function pathHours(world: World, slot: number): Float32Array {
  const a = world.armies;
  const path = a.path[slot]!;
  const from = a.pathAt[slot]!;
  const out = new Float32Array(Math.max(0, path.length - from));
  if (!out.length) return out;
  const m = tileMarch(world);
  const army = { men: a.men[slot]!, horse: a.horse[slot]!, logistics: 0 };
  let hours = -a.progress[slot]!;
  let at = a.tile[slot]!;
  for (let k = from; k < path.length; k++) {
    hours += tileStepHours(m, at, path[k]!, army);
    at = path[k]!;
    out[k - from] = Math.max(0, hours);
  }
  return out;
}
