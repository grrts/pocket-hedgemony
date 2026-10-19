import { humansOf, isHuman } from "./humans.ts";
import { armyDead } from "./fallen.ts";
import { W as WARFARE } from "./domain/warfare/index.ts";
import { monthlyPeople } from "./living.ts";
import { monthlyBelief } from "./belief.ts";
import { setFood, setFoodPreset } from "./castleFood.ts";
import { aiTreasury, monthlyDebts, repayLoan, runLedger, setTax, takeLoan } from "./treasury.ts";
import { monthlyFood } from "./food.ts";
import { callStudentsToArms, foundSchool, monthlyResearch, moveQueued as moveQueuedStudy, queuePath, queueStudy, setSeats, setStudy, unqueue } from "./research.ts";
import { aiChanges, monthlyChanges, orderChange, stopChange } from "./conversion.ts";
import { answerAsk, breakAlliance, libraryEvents, makeDemand, monthlyStatecraft, sendEnvoy, syncCountries } from "./statecraft.ts";
import { monthlyConquest } from "./conquest.ts";
import { backersOf, bondOf, riseUp, subjectAction, subjectChoice } from "./subjects.ts";
import { court, recallCourting } from "./courting.ts";
import { aiWorks, cancelWork, judgeNeglect, mineYear, monthlyWorks, moveQueued, orderWork } from "./works.ts";
import { monthlyMoods } from "./moods.ts";
import { monthlyThrone } from "./throne.ts";
import { monthlyStability } from "./stability.ts";
import { answerRebels, dailyRebels, monthlyRebels, verdictOrder } from "./rebels.ts";
import { answerRevolution, lockedOrder, monthlyRevolutions } from "./revolutions.ts";
import { answerEvent, monthlyEvents } from "./events.ts";
import { answerEveryday, monthlyEveryday } from "./everyday.ts";
import { monthlyGoals } from "./goals.ts";
import { heritageChoice, monthlyHeritage, payCounsel } from "./heritage.ts";
import { monthlyGovernment, reform } from "./government.ts";
import { dismissTrader, draftTradeRoute, foundTrader, monthlyTrade, setTradeRoute, tradeDay, type GameTraderKind } from "./trade.ts";
import { monthlyNavy, navyOrder, stepNavy, type NavyOrder } from "./navy.ts";
import { hiredFleetOrder, monthlyHiredFleets, type HireOrder } from "./hiredFleets.ts";
import { dailyExploration, exploreOrder, monthlyColonies, stepVoyages, type ExploreOrder } from "./colonies.ts";
import { monthlyPeoples, setFaithPolicy, setTonguePolicy } from "./peoples.ts";
import { claimCaliphate, faithHeadsWars, monthlyFaithHeads, raiseOwnPatriarch, sendConclaveGold } from "./faithHeads.ts";
import { dismissOfficial, fillAllPosts, hireOfficial, monthlyPosts, setAutoFill, settleLand, swapOfficials } from "./officials.ts";
import { assassinate } from "./assassination.ts";
import { giveGift, grantFief, inAnyWar, lordGetsBuilding, monthlyLords, seizeFief } from "./lords.ts";
import { callLord, callLords, monthlyRetinues, weeklyRetinues } from "./retinues.ts";
import { clockStopped, dailyEndCheck, keepPlaying, playOn, weeklyEndCheck, yearlyScores } from "./campaignEnd.ts";
import { noteMoment, turnEndAchievements } from "./achievements.ts";
import { empireOrder, monthlyInstitutions, type EmpireOrder } from "./institutions.ts";
import { shogunateOrder, type ShogunateOrder } from "./shogunate.ts";
import { huntOf, monthlyTribes, tribesOrder, type TribesOrder } from "./tribes.ts";
import { isPlagueWeek, setQuarantine, weeklyPlague } from "./plague.ts";
import { addDays, DAYS_PER_RATION_MONTH, DAYS_PER_TURN } from "./calendar.ts";
import { corridor, monthlyRations, refillRations, wagonRations, planRoute, planTilePath, tileStepHours, type MarchingArmy } from "./march.ts";
import { foodCarriedPct, marchMap, NO_PATH, tileMarch, updateWeather, type World } from "./world.ts";
import {
  aiCollect,
  appointCommander,
  disbandArmy,
  dismissTroops,
  commissionOfficial,
  hireCompany,
  mergeArmies,
  monthlyRecruits,
  nationPay,
  pickUp,
  recount,
  recountLordsMen,
  cancelRecruit,
  recruit,
  releaseCommander,
  splitTroops,
  trainTroops,
  ungoverned,
  weeklyMusters,
} from "./recruit.ts";
import { emptyProvinceEffect } from "./domain/recruiting/index.ts";
import { mayEnter } from "./domain/diplomacy/actions.ts";
import {
  aiDeclarations,
  aiMarches,
  aiRaise,
  answerAiCalls,
  answerCall,
  answerPeace,
  atWar,
  controller,
  declareWar,
  monthlyDiplomacy,
  offerPeace,
  relationState,
  engage,
  fightRound,
  runOccupation,
  syncDate,
  wallsOf,
  type News,
  type PeaceTerms,
} from "./war.ts";

export type Order =
  /** March to a province, to the given tile in it if any (else its centre). */
  | { type: "move"; army: number; to: number; tile?: number }
  /** Declare war with an aim the realm holds (else the best it holds, else no aim, WAR-178); `breakTruce` breaks a truce first (WAR-179). */
  | { type: "declareWar"; target: number; aim?: string; province?: number; breakTruce?: boolean }
  | { type: "conclaveGold"; gold: number }
  | { type: "claimCaliphate" }
  | { type: "raiseOwnPatriarch" }
  /** Offer peace; `provinces` and `gold` are the terms chosen at the peace table: asked with "take", given with "give" (WAR-242); none means the most the war allows. */
  | { type: "offerPeace"; target: number; terms: PeaceTerms; provinces?: number[]; gold?: number }
  | { type: "answerCall"; call: string; yes: boolean }
  /** Take or turn down a peace the AI offers (its id in the snapshot's peaceOffers). */
  | { type: "answerPeace"; offer: number; yes: boolean }
  /** Call up thousands of men from one province's people; each thousand gathers in two weeks. */
  | { type: "recruit"; province: number; thousands: number }
  /** Take the last thousand off a province's recruit queue, with its levy money back. */
  | { type: "cancelRecruit"; province: number }
  /** The army's commander takes in the garrison troops where it stands. */
  | { type: "pickUp"; army: number; men?: number }
  /** Commission a province's official as a commander; release one back to his post. */
  /** Commission the province's official as a general, or as an admiral when `sea` (RECR-128). */
  | { type: "commission"; province: number; sea?: boolean }
  | { type: "release"; commander: number }
  /** Train levy foot of an army as another arm. */
  | { type: "train"; army: number; arm: string; men: number }
  /** Send home men of one arm. */
  | { type: "dismiss"; army: number; arm: string; men: number }
  /** Split men of one arm off, under a commander at court or left as the province's garrison. */
  | { type: "split"; army: number; arm: string; men: number; commander?: number }
  | { type: "hire"; company: number }
  | { type: "merge"; army: number; into: number }
  /** Put a commander at the head of an army or garrison troops (swapping with the army he led); -1 leaves the men as a garrison. */
  | { type: "appoint"; army: number; commander: number }
  | { type: "disband"; army: number }
  /** Set a province's tax rate (index into TAX_RATES, -1 = the realm default), or the realm default when province is -1. */
  | { type: "setTax"; province: number; rate: number }
  /** Borrow gold from lenders, or pay some of it back. */
  | { type: "borrow"; gold: number }
  | { type: "repay"; gold: number }
  /** Give a lord gold, grant him a royal province, or take a province back from its lord. */
  | { type: "gift"; lord: number }
  /** Call the lords' retinues to war: every lord, or one (WAR-253). */
  | { type: "callLords"; lord?: number }
  | { type: "grantFief"; province: number; lord: number }
  | { type: "seizeFief"; province: number }
  /** Send an assassin after one of the realm's lords (REALM-280). */
  | { type: "assassinateLord"; lord: number }
  /** Move officials between two royal provinces: they swap posts, or one takes the other's empty post (AssignOfficial). */
  | { type: "swapOfficials"; a: number; b: number }
  /** Hire an official of a type (an OFFICIALS index) into an empty royal post; a foreign specialist costs more (HireOfficial). */
  | { type: "hireOfficial"; province: number; official: number; foreign: boolean }
  /** Keep a province just taken as royal land with its post empty for now (SettleLand, PROV-340). */
  | { type: "settleLand"; province: number }
  /** Dismiss a royal post's official, or replace him with a hire of another type (PROV-345). */
  | { type: "dismissOfficial"; province: number; hire?: { official: number; foreign: boolean } }
  /** Auto-fill posts on or off (PROV-342); fill every empty post now (PROV-348). */
  | { type: "autoFillPosts"; on: boolean }
  | { type: "fillPosts" }
  /** Research: choose the invention to study, how many students to keep, empty the schools into recruits, found a school in a town. */
  | { type: "setStudy"; invention: string }
  /** The study queue (RSCH-108 to RSCH-110): add one, queue the path to one, take one out, move one a place earlier (-1) or later (1). */
  | { type: "queueStudy"; invention: string }
  | { type: "queuePath"; invention: string }
  | { type: "unqueueStudy"; invention: string }
  | { type: "moveQueuedStudy"; invention: string; by: number }
  | { type: "setSeats"; n: number }
  | { type: "callStudentsToArms" }
  | { type: "foundSchool"; province: number }
  /** Order the next step of a work (index into WORKS) in a province, or take it off the queue or give up its site. */
  | { type: "build"; province: number; work: number }
  | { type: "cancelBuild"; province: number; work: number }
  /** Move a queued work one place earlier (-1) or later (1) in its province's queue. */
  | { type: "moveBuild"; province: number; work: number; by: number }
  /** Change the use of one of a province's tiles (clear woods, to pasture, plough, drain, irrigate), or stop the change under way, with half its gold back (feedback 86). */
  | { type: "changeTile"; province: number; change: string }
  /** Send an envoy to another realm's court with a mission (ENVOY_ACTIONS); end an alliance. */
  | { type: "sendEnvoy"; target: number; action: string }
  | { type: "breakAlliance"; target: number }
  | { type: "makeDemand"; target: number; kind: string; province?: number }
  /** Agree to, give in to or refuse an envoy's ask at the player's court (its id in the snapshot's statecraft asks, DIPL-212). */
  | { type: "answerAsk"; ask: string; yes: boolean }
  /** The overlord's action on its subject: set the tribute (with `level`), send a gift, loosen or release it (SUBJ-037 to SUBJ-046). */
  | { type: "subjectAction"; subject: number; action: "tribute" | "gift" | "loosen" | "release" | "resident" | "recall" | "hostage" | "send_heir_home" | "tighten" | "fold_in" | "merge"; level?: string }
  /** Send an envoy to court lord `lord` of realm `target`, or subject `target` without a lord; `recall` calls him home (DIPL-215). */
  | { type: "court"; target: number; lord?: number; recall?: boolean }
  /** A Disloyal subject rises against its overlord (SUBJ-076, SUBJ-077). */
  | { type: "riseUp" }
  /** A subject's own choices toward its overlord: stop paying, pay again, ask politely to loosen (SUBJ-131). */
  | { type: "subjectChoice"; action: "stop_paying" | "pay" | "ask_loosen" }
  | { type: "stopChange"; province: number }
  /** Answer an event or take a decision waiting for the realm, with one of its options (AnswerEvent, EVT-044). */
  | { type: "answerEvent"; event: string; option: string }
  /** Heritage: pay the court's counsel to read one sealed ambition (HER-024); choose which heyday sleeps or which legacy goes (HER-013, HER-030). */
  | { type: "heritageCounsel"; ambition: string }
  | { type: "heritageChoice"; id: string }
  /** Reform the government into one of its next forms (GOV-027). */
  | { type: "reform"; to: string }
  /** Found a trader in an own city (TRADE-003), set its route of 2 to 8 cities (TRADE-050), draw one for its preview (TRADE-054), or dismiss it (TRADE-006). */
  | { type: "foundTrader"; city: number; kind: GameTraderKind }
  | { type: "setTradeRoute"; trader: number; stops: number[] }
  | { type: "draftTradeRoute"; trader: number; stops: number[] }
  | { type: "dismissTrader"; trader: number }
  /** Set the realm's Tongue policy (CULT-038), or a faith's policy from the next New Year (RELG-055). */
  | { type: "tonguePolicy"; policy: string }
  | { type: "faithPolicy"; faith: string; policy: string }
  /** Set a Food policy setting for the realm (castle -1) or one castle's own value (null: follow the realm again); or fill it all from a preset. */
  | { type: "setFood"; castle: number; key: string; value: string | number | null }
  | { type: "foodPreset"; name: string }
  /** Answer a rising against the player: grant its demand, talk or bribe its leader (REBL-045 to REBL-047); waiting needs no order, attacking is a march. */
  | { type: "answerRebels"; rising: number; answer: "grant" | "talk" | "bribe" }
  /** The verdict on a beaten rising: Pardon, Punish the leaders or Massacre (REBL-050). */
  | { type: "treatRebels"; rising: number; treatment: "Pardon" | "Punish the leaders" | "Massacre" }
  /** The answer to the player's revolution: Lead, Bend or Fight (REVO-084). */
  | { type: "answerRevolution"; stance: "lead" | "bend" | "fight" }
  /** Ports, sailors and fleets: muster, buy a ship, sail, board, land, admiral, merge, split, disband (navy.ts). */
  | NavyOrder
  /** Hire a free or lent fleet, or dismiss one (hiredFleets.ts). */
  | HireOrder
  /** Voyages, colonial governors and colonies: explore, hire, embark, load, unload, found, abandon, dismiss (colonies.ts). */
  | ExploreOrder
  /** The Empire: stand for the crown, vote, seek a vote, grant a seat, admit a member (institutions.ts). */
  | EmpireOrder
  | ShogunateOrder
  /** Hunting grounds: claim, leave, take in, ask for the land, answer an ask (tribes.ts). */
  | TribesOrder
  /** Close a province of the realm against plague (quarantine), or open it again (QuarantineProvince, PROV-357). */
  | { type: "quarantine"; province: number; on: boolean }
  /** After world domination, play on to the end date; after game over, play on as another realm (SHELL-164). */
  | { type: "keepPlaying" }
  | { type: "playOn"; nation: number };

export type MoveOrder = Extract<Order, { type: "move" }>;

export interface TurnReport {
  turn: number;
  rejectedOrders: { order: Order; reason: string }[];
  news: News[];
}

/** A day is played as six 4-hour steps: armies march a step at a time and battles fight a round a step (TIME-027). */
export const STEPS_PER_DAY = 6;
export const HOURS_PER_STEP = 24 / STEPS_PER_DAY;
export const STEPS_PER_TURN = STEPS_PER_DAY * DAYS_PER_TURN;

/** Orders act at once, whenever they are given: a march sets off with the next step of the clock. */
export function applyNow(world: World, order: Order, actingNation: number): TurnReport {
  const news: News[] = [];
  const reason = applyOrder(world, order, actingNation, news);
  return { turn: world.turn, rejectedOrders: reason ? [{ order, reason }] : [], news };
}

/**
 * Plays the world on by a number of 4-hour steps. Each step marches every
 * army, finds the enemies that come within reach of each other and fights a
 * round of every battle; each day ends with food, sieges and occupation, each
 * week with musters and the AI's plans, and the 1st of each month brings the
 * monthly steps. Only seeded randomness is used, so the same world played the
 * same way always gives the same result.
 */
export function advance(world: World, steps: number): News[] {
  const news: News[] = [];
  for (let s = 0; s < steps; s++) {
    if (clockStopped(world)) break;
    if (world.step === 0) startDay(world, news);
    stepMarches(world, HOURS_PER_STEP);
    stepNavy(world, HOURS_PER_STEP, news);
    stepVoyages(world, news);
    engage(world, news);
    fightRound(world, news);
    for (let i = 0; i < world.armies.count; i++) if (world.armies.alive[i] && world.armies.men[i]! < 1) world.armies.alive[i] = 0;
    if (++world.step === STEPS_PER_DAY) {
      world.step = 0;
      endDay(world, news);
    }
  }
  return news;
}

/**
 * Applies orders, then plays a whole turn (one week). Kept for tests and the
 * benchmark; the game plays the week a day or a step at a time (advance).
 */
export function processTurn(world: World, orders: readonly Order[], actingNation: number): TurnReport {
  const rejectedOrders: TurnReport["rejectedOrders"] = [];
  const news: News[] = [];
  for (const order of orders) {
    const reason = applyOrder(world, order, actingNation, news);
    if (reason) rejectedOrders.push({ order, reason });
  }
  news.push(...advance(world, STEPS_PER_TURN - world.step));
  // The acting realm's ledger is current at the end of its turn, as the player's is each week.
  if (actingNation >= 0 && !isHuman(world, actingNation) && actingNation < world.nationCount) runLedger(world, false, actingNation);
  return { turn: world.turn, rejectedOrders, news };
}

function startDay(world: World, news: News[]): void {
  syncDate(world);
  // The 1st of the month: pools refill, pay, diplomacy, the AI's monthly choices.
  if (world.day > 0 && world.date.day === 1) {
    monthlyPeople(world, news);
    monthlyFood(world, news);
    monthlyGovernment(world, news);
    // Hunting grounds read the form and come before the ledger pays their furs (TRIBE §9).
    monthlyTribes(world, news);
    monthlyPeoples(world, news);
    monthlyFaithHeads(world, news);
    monthlyBelief(world, news);
    // Days to each capital, if land changed hands, before the grievances read them (X-29).
    monthlyThrone(world);
    monthlyMoods(world, news);
    // Each realm's stability, read once for the month: low stability costs tax, recruits and risings (X-29).
    monthlyStability(world);
    monthlyRebels(world, news);
    monthlyRevolutions(world, news);
    monthlyLords(world, (n) => !inAnyWar(world, n), news);
    monthlyRecruits(world, news);
    monthlyResearch(world, news);
    monthlyTrade(world, news);
    runLedger(world, true);
    // With the month's gold in, realms fill their empty posts (PROV-342).
    monthlyPosts(world, news);
    monthlyNavy(world, news);
    monthlyHiredFleets(world, news);
    monthlyColonies(world, news);
    judgeNeglect(world);
    if (world.date.month === 1) mineYear(world, news);
    monthlyWorks(world, news);
    aiWorks(world, news);
    monthlyChanges(world, news);
    aiChanges(world);
    aiTreasury(world, news);
    // A realm broke for months defaults on its debts (X-29).
    monthlyDebts(world, news);
    monthlyDiplomacy(world, news);
    monthlyStatecraft(world, news);
    // Lands taken over the last 20 years each month; the league check each January (DIPL-221).
    monthlyConquest(world, news);
    // Institutions read standing and forms and add war aims, so they come after diplomacy and before the wars (INST §9).
    monthlyInstitutions(world, news);
    // Goals end with their reasons and pull their realms before the AI looks for wars (EVT-103 to EVT-105).
    monthlyGoals(world);
    aiDeclarations(world, news);
    // A war just declared may be censured, or call a patron to a holy place (RELG-147, RELG-149).
    faithHeadsWars(world, news);
    // A demand made before war may reach the player's court this month (DIPL-213).
    libraryEvents(world, news);
    aiRaise(world, news);
    // Retinues go home at peace or when their lord no longer serves; the AI calls its lords (WAR-256, WAR-258).
    monthlyRetinues(world, news);
    // Events come last in the month, after every other system (X-2).
    monthlyEveryday(world, news);
    monthlyEvents(world, news);
    if (world.date.month === 1) yearlyScores(world, news);
    monthlyHeritage(world, news);
  }
  // The plague week, on days 7, 14, 21 and 28 of the month (D-PROV-4): only the sick provinces are visited.
  if (world.day > 0 && isPlagueWeek(world.date.day ?? 1)) weeklyPlague(world, news);
  if (world.day % DAYS_PER_TURN === 0) aiMarches(world);
}

function endDay(world: World, news: News[]): void {
  feedArmies(world);
  dailyExploration(world);
  runOccupation(world, world.date.day === 1, news);
  // Traders walk a day on, as the armies march (TRADE-132).
  tradeDay(world);
  dailyRebels(world, news);
  world.date = addDays(world.date, 1);
  world.day++;
  updateWeather(world);
  syncDate(world);
  dailyEndCheck(world, news);
  if (world.day % DAYS_PER_TURN === 0) {
    weeklyMusters(world, news);
    weeklyRetinues(world, news);
    aiCollect(world, news);
    recount(world);
    recountLordsMen(world);
    // The player's ledger is kept current each week; every realm's is worked out when the month turns.
    for (const h of humansOf(world)) runLedger(world, false, h);
    answerAiCalls(world, news);
    weeklyEndCheck(world, news);
    // Achievement tests read the turn's final values, last of all (ACH-033).
    turnEndAchievements(world);
    world.turn++;
  }
}

function applyOrder(world: World, order: Order, actingNation: number, news: News[]): string | null {
  const locked = lockedOrder(world, actingNation, order);
  if (locked) return locked;
  switch (order.type) {
    case "keepPlaying":
      return keepPlaying(world);
    case "playOn":
      return playOn(world, order.nation);
    case "declareWar": {
      const why = declareWar(world, actingNation, order.target, news, {
        ...(order.aim ? { aim: order.aim } : {}),
        ...(order.province !== undefined && world.provinceIds[order.province] ? { province: world.provinceIds[order.province] } : {}),
        ...(order.breakTruce ? { breakTruce: true } : {}),
      });
      if (!why) faithHeadsWars(world, news);
      return why;
    }
    case "offerPeace":
      return offerPeace(world, actingNation, order.target, order.terms, news, false, order.provinces ?? [], order.gold ?? 0);
    case "answerPeace":
      return answerPeace(world, order.offer, order.yes, news, actingNation);
    case "answerCall": {
      const call = world.diplomacy.calls.find((c) => c.id === order.call && c.called === world.nationIds[actingNation] && !c.answer);
      if (!call) return "no such call to arms";
      answerCall(world, call, order.yes, news);
      return null;
    }
    case "recruit":
      return recruit(world, actingNation, order.province, order.thousands, news);
    case "cancelRecruit":
      return cancelRecruit(world, actingNation, order.province);
    case "pickUp":
      return pickUp(world, actingNation, order.army, order.men);
    case "commission":
      return commissionOfficial(world, actingNation, order.province, news, !!order.sea);
    case "release":
      return releaseCommander(world, actingNation, order.commander);
    case "train":
      return trainTroops(world, actingNation, order.army, order.arm, order.men, news);
    case "dismiss":
      return dismissTroops(world, actingNation, order.army, order.arm, order.men);
    case "split":
      return splitTroops(world, actingNation, order.army, order.arm, order.men, order.commander);
    case "hire":
      return hireCompany(world, actingNation, order.company, news);
    case "merge":
      return mergeArmies(world, actingNation, order.army, order.into);
    case "appoint":
      return appointCommander(world, actingNation, order.army, order.commander);
    case "disband":
      return disbandArmy(world, actingNation, order.army);
    case "setTax":
      return setTax(world, actingNation, order.province, order.rate, news);
    case "borrow":
      return takeLoan(world, actingNation, order.gold, news);
    case "repay":
      return repayLoan(world, actingNation, order.gold);
    case "gift":
      return giveGift(world, actingNation, order.lord);
    case "callLords": {
      const refused = order.lord === undefined ? callLords(world, actingNation, news) : callLord(world, actingNation, order.lord, news);
      if (!refused) recountLordsMen(world);
      return refused;
    }
    case "grantFief":
      return grantFief(world, actingNation, order.province, order.lord);
    case "seizeFief":
      return seizeFief(world, actingNation, order.province, news);
    case "assassinateLord":
      return assassinate(world, actingNation, order.lord, news);
    case "swapOfficials": {
      const reason = swapOfficials(world, actingNation, order.a, order.b, news);
      // The ledger shows the new sums at once.
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "settleLand":
      return settleLand(world, actingNation, order.province);
    case "dismissOfficial": {
      const reason = dismissOfficial(world, actingNation, order.province, order.hire ? { type: order.hire.official, foreign: !!order.hire.foreign } : null, news);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "autoFillPosts":
      return setAutoFill(world, actingNation, !!order.on);
    case "fillPosts": {
      const reason = fillAllPosts(world, actingNation, news);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "hireOfficial": {
      const reason = hireOfficial(world, actingNation, order.province, order.official, !!order.foreign, news);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "setStudy":
      return setStudy(world, actingNation, order.invention);
    case "queueStudy":
      return queueStudy(world, actingNation, order.invention);
    case "queuePath":
      return queuePath(world, actingNation, order.invention);
    case "unqueueStudy":
      return unqueue(world, actingNation, order.invention);
    case "moveQueuedStudy":
      return moveQueuedStudy(world, actingNation, order.invention, order.by < 0 ? -1 : 1);
    case "setSeats":
      return setSeats(world, actingNation, order.n);
    case "callStudentsToArms":
      return callStudentsToArms(world, actingNation);
    case "foundSchool": {
      const reason = foundSchool(world, actingNation, order.province);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "build": {
      const reason = orderWork(world, actingNation, order.province, order.work, news);
      if (!reason) lordGetsBuilding(world, order.province, news);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "cancelBuild": {
      const reason = cancelWork(world, actingNation, order.province, order.work);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "setFood":
    case "foodPreset": {
      const reason = order.type === "setFood" ? setFood(world, actingNation, order.castle, order.key, order.value) : setFoodPreset(world, actingNation, order.name);
      if (!reason) noteMoment(world, actingNation, "food_policy_changed", { food_policy_changed: true });
      return reason;
    }
    case "changeTile": {
      const reason = orderChange(world, actingNation, order.province, order.change);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "stopChange":
      return stopChange(world, actingNation, order.province);
    case "reform":
      return reform(world, actingNation, order.to, news);
    case "foundTrader":
      return foundTrader(world, actingNation, order.city, order.kind);
    case "setTradeRoute":
      return setTradeRoute(world, actingNation, order.trader, order.stops);
    case "draftTradeRoute":
      return draftTradeRoute(world, actingNation, order.trader, order.stops);
    case "dismissTrader":
      return dismissTrader(world, actingNation, order.trader);
    case "tonguePolicy":
      return setTonguePolicy(world, actingNation, order.policy);
    case "conclaveGold":
      return sendConclaveGold(world, actingNation, order.gold);
    case "claimCaliphate":
      return claimCaliphate(world, actingNation, news);
    case "raiseOwnPatriarch":
      return raiseOwnPatriarch(world, actingNation, news);
    case "faithPolicy":
      return setFaithPolicy(world, actingNation, order.faith, order.policy);
    case "sendEnvoy": {
      syncCountries(world);
      const reason = sendEnvoy(world, actingNation, order.target, order.action);
      if (!reason && order.action === "send_gift") runLedger(world, false);
      return reason;
    }
    case "breakAlliance":
      return breakAlliance(world, actingNation, order.target);
    case "heritageCounsel":
      return payCounsel(world, actingNation, order.ambition);
    case "heritageChoice":
      return heritageChoice(world, actingNation, order.id);
    case "answerEvent":
      return order.event.startsWith("everyday:") ? answerEveryday(world, actingNation, order.event, order.option, news) : answerEvent(world, actingNation, order.event, order.option, news);
    case "makeDemand":
      syncCountries(world);
      return makeDemand(world, actingNation, order.target, order.kind, order.province ?? -1);
    case "answerAsk": {
      const reason = answerAsk(world, actingNation, order.ask, order.yes, news);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "riseUp": {
      // The first realm that would back the rising joins it (SUBJ-133).
      const b = bondOf(world, actingNation);
      const o = b ? world.nationIndex.get(b.overlord) : undefined;
      return riseUp(world, actingNation, news, o === undefined ? undefined : backersOf(world, actingNation, o)[0]);
    }
    case "subjectChoice": {
      const reason = subjectChoice(world, actingNation, order.action, news);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "court":
      return order.recall ? recallCourting(world, actingNation, order.target, order.lord) : court(world, actingNation, order.target, order.lord);
    case "subjectAction": {
      const reason = subjectAction(world, actingNation, order.subject, order.action, news, order.level);
      if (!reason) runLedger(world, false);
      return reason;
    }
    case "answerRebels":
      return answerRebels(world, actingNation, order.rising, order.answer, news);
    case "treatRebels":
      return verdictOrder(world, actingNation, order.rising, order.treatment, news);
    case "empire":
      return empireOrder(world, actingNation, order, news);
    case "shogunate":
      return shogunateOrder(world, actingNation, order, news);
    case "tribes":
      return tribesOrder(world, actingNation, order, news);
    case "answerRevolution":
      return answerRevolution(world, actingNation, order.stance, news);
    case "moveBuild":
      return moveQueued(world, actingNation, order.province, order.work, order.by);
    case "move":
      return orderMarch(world, order, actingNation);
    case "navy":
      return order.do === "hire" || order.do === "dismiss" ? hiredFleetOrder(world, order, actingNation, news) : navyOrder(world, order, actingNation, news);
    case "explore":
      return exploreOrder(world, order, actingNation, news);
    case "quarantine":
      return setQuarantine(world, actingNation, order.province, order.on, news);
  }
}

/** An enemy castle with men inside stands in province p and stops nation n's armies (warfare 5.5). */
export function blockingCastle(world: World, p: number, n: number): boolean {
  return world.provinceGarrison[p]! > 0 && wallsOf(world, p) !== null && atWar(world, controller(world, p), n);
}

/**
 * Whether a blocking castle where the army stands keeps it from stepping to
 * `to`: it may only go back the way it came, or into land its own side holds.
 */
export function castleBars(world: World, slot: number, to: number): boolean {
  const a = world.armies;
  const n = a.owner[slot]!;
  if (!blockingCastle(world, a.location[slot]!, n) || to === a.cameFrom[slot]) return false;
  return !ownSide(world, n, to);
}

/** Land nation n's armies may always step into: its own side's. */
function ownSide(world: World, n: number, to: number): boolean {
  const holder = controller(world, to);
  if (holder === n) return true;
  const tie = relationState(world, n, holder).state;
  return tie === "alliance" || tie === "subject" || tie === "overlord";
}

/**
 * Whether nation n's armies may march into province q: unclaimed land, its own
 * side's, an enemy's, or a realm that gave it passage (DIPL-116).
 */
export function mayMarchInto(world: World, n: number, q: number): boolean {
  const holder = controller(world, q);
  if (holder < 0 || ownSide(world, n, q)) return true;
  return mayEnter(world.diplomacy, world.nationIds[n]!, world.nationIds[holder]!);
}

/**
 * Steps an army of `slot` may not take when planning: into land it has no
 * right to enter, and (with `castles`) out of an enemy castle's province,
 * but back the way it came from where it stands.
 */
export function routeBars(world: World, slot: number, castles = true): (p: number, q: number) => boolean {
  const here = world.armies.location[slot]!;
  const n = world.armies.owner[slot]!;
  return (p, q) => !mayMarchInto(world, n, q) || (castles && (p === here ? castleBars(world, slot, q) : blockingCastle(world, p, n) && !ownSide(world, n, q)));
}

/** Leaves out of a march's corridor the land nation n may not enter, but where the army stands. */
function keepToRights(world: World, n: number, here: number, allowed: Uint8Array): void {
  for (let p = 0; p < allowed.length; p++) if (allowed[p] && p !== here && !mayMarchInto(world, n, p)) allowed[p] = 0;
}

export function marching(world: World, slot: number): MarchingArmy {
  const a = world.armies;
  const c = a.commander[slot]!;
  return { men: a.men[slot]!, horse: a.horse[slot]!, logistics: c >= 0 ? world.commanderLogistics[c]! : 0 };
}

/** Rations a month an army can take from the store where it stands: the locals keep a reserve unless they are the enemy's (feedback 83). */
export function refillHere(world: World, slot: number, map = marchMap(world)): number {
  const p = world.armies.location[slot]!;
  if (world.provinceWater[p]) return 0;
  const d = world.rules.defines.march;
  // A tribe's hunting ground is its land to forage: friendly to it and its allies, enemy land to its enemies (TRIBE-015).
  const owner = world.provinceOwner[p]! >= 0 ? world.provinceOwner[p]! : huntOf(world, p);
  const enemy = owner >= 0 && atWar(world, owner, world.armies.owner[slot]!);
  const reserve = enemy ? 0 : world.provincePopulation[p]! * 1000 * d.homeReserveMonths;
  return refillRations(d, map.ground[p]!, Math.max(0, world.provinceStore[p]!) * 1000, reserve);
}

/** An army is on campaign while its realm is at war or it stands outside its own land (REALM-054). */
export function campaigning(world: World, slot: number): boolean {
  const owner = world.armies.owner[slot]!;
  return world.provinceOwner[world.armies.location[slot]!] !== owner || realmsAtWar(world).has(owner);
}

/**
 * The realms in any war. Worked out each time it is read: a cache kept for the
 * day went stale when a war began later that day, so whether the screens had
 * read it between two steps changed how armies ate (multiplayer desync).
 */
function realmsAtWar(world: World): Set<number> {
  const set = new Set<number>();
  for (const w of world.diplomacy.wars) for (const id of [...w.attackers, ...w.defenders]) set.add(world.nationIndex.get(id) ?? -1);
  return set;
}

/** The army stops where it stands. */
export function halt(world: World, slot: number): void {
  const a = world.armies;
  a.route[slot] = [];
  a.path[slot] = NO_PATH;
  a.pathAt[slot] = 0;
  a.progress[slot] = 0;
}

/** Whether the army has a march under way. */
export function isMarching(world: World, slot: number): boolean {
  const a = world.armies;
  return a.route[slot]!.length > 0 || a.pathAt[slot]! < a.path[slot]!.length;
}

/** A march to a province, to a chosen tile in it when given, else to its centre. */
function orderMarch(world: World, order: MoveOrder, n: number): string | null {
  const a = world.armies;
  const i = order.army;
  if (i < 0 || i >= a.count || !a.alive[i]) return "no such army";
  if (a.owner[i] !== n) return "not your army";
  if (a.commander[i]! < 0) return "troops without a commander can't march: give them one";
  if (a.battle[i]! >= 0) return "the army is fighting a battle";
  if (a.retreating[i]) return "the army is falling back and won't take orders until it gets there";
  if (order.to < 0 || order.to >= world.provinceCount || world.provinceWater[order.to]) return "armies need ships to cross water";
  const target = order.tile !== undefined && world.tiles.province[order.tile]! - 1 === order.to ? order.tile : world.tiles.centre[order.to]!;
  if (target === a.tile[i]) {
    // Marching to where it stands is a halt.
    halt(world, i);
    return null;
  }
  return marchTo(world, i, order.to, target);
}

const corridorScratch = new WeakMap<World, Uint8Array>();

/**
 * Plans a march for army `slot` to a tile in province `to`: the fastest road
 * over the provinces, then the walk over the tiles of that road and the land
 * beside it. Returns why it can't go, or null.
 */
export function marchTo(world: World, slot: number, to: number, target: number = world.tiles.centre[to]!): string | null {
  const a = world.armies;
  const here = a.location[slot]!;
  const army = marching(world, slot);
  if (to !== here && !mayMarchInto(world, a.owner[slot]!, to)) {
    if (!planRoute(world.rules.defines.march, marchMap(world), here, to, army)) return "no road there over land";
    return `you have no right to march into ${world.rules.nations[controller(world, to)]?.name ?? "that land"}: you need war or passage`;
  }
  // The best road no enemy castle bars; failing that, the road up to the first castle in the way, where the army stops.
  // Either way only through land the army may enter.
  const route = to === here ? { path: [] as number[] } : (planRoute(world.rules.defines.march, marchMap(world), here, to, army, routeBars(world, slot)) ?? planRoute(world.rules.defines.march, marchMap(world), here, to, army, routeBars(world, slot, false)));
  if (!route) return "no road there over land";
  if (route.path.length && castleBars(world, slot, route.path[0]!)) return "an enemy castle bars the road: go back, or take it first";
  let allowed = corridorScratch.get(world);
  if (!allowed) corridorScratch.set(world, (allowed = new Uint8Array(world.provinceCount)));
  corridor(marchMap(world), [here, ...route.path], allowed);
  keepToRights(world, a.owner[slot]!, here, allowed);
  const walk = world.tiles.coarse
    ? { tiles: Int32Array.from(route.path, (p) => world.tiles.centre[p]!) }
    : planTilePath(tileMarch(world), a.tile[slot]!, target, allowed, army);
  a.route[slot] = route.path.slice();
  a.progress[slot] = 0;
  a.pathAt[slot] = 0;
  // Without a walk through the corridor, the army goes province by province.
  a.path[slot] = walk ? walk.tiles : NO_PATH;
  if (!walk && !route.path.length) return "no way over the land there";
  return null;
}

/** Stretches walked a province at a time take a nearly fastest way (the AI plans many each day). */
const LEG_GREED = 1.6;

/** The next stretch of a march planned province by province: to the centre of the next province on the route. */
function planLeg(world: World, slot: number): boolean {
  const a = world.armies;
  const next = a.route[slot]![0]!;
  if (world.tiles.coarse) {
    a.path[slot] = Int32Array.of(world.tiles.centre[next]!);
    a.pathAt[slot] = 0;
    return true;
  }
  let allowed = corridorScratch.get(world);
  if (!allowed) corridorScratch.set(world, (allowed = new Uint8Array(world.provinceCount)));
  // Through the two provinces alone first, the land beside them too if that finds no way.
  allowed.fill(0);
  allowed[a.location[slot]!] = 1;
  allowed[next] = 1;
  const m = tileMarch(world);
  const army = marching(world, slot);
  let walk = planTilePath(m, a.tile[slot]!, world.tiles.centre[next]!, allowed, army, LEG_GREED);
  if (!walk) {
    corridor(marchMap(world), [a.location[slot]!, next], allowed);
    keepToRights(world, a.owner[slot]!, a.location[slot]!, allowed);
    walk = planTilePath(m, a.tile[slot]!, world.tiles.centre[next]!, allowed, army, LEG_GREED);
  }
  a.path[slot] = walk ? walk.tiles : NO_PATH;
  a.pathAt[slot] = 0;
  return !!walk;
}

/**
 * Every army that isn't fighting walks its hours along its tiles. Stepping
 * into another province it checks the walls there: an enemy castle with men
 * inside bars the way on (warfare 5.5) and stops an army that comes in.
 */
function stepMarches(world: World, hours: number): void {
  const m = tileMarch(world);
  const a = world.armies;
  const tiles = world.tiles;
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i] || a.battle[i]! >= 0) continue;
    if (a.pathAt[i]! >= a.path[i]!.length) {
      if (!a.route[i]!.length) {
        a.progress[i] = 0;
        a.retreating[i] = 0;
        continue;
      }
      if (!planLeg(world, i)) {
        halt(world, i);
        a.retreating[i] = 0;
        continue;
      }
    }
    const army = marching(world, i);
    let have = a.progress[i]! + hours;
    while (a.pathAt[i]! < a.path[i]!.length) {
      const next = a.path[i]![a.pathAt[i]!]!;
      const into = tiles.province[next]! - 1;
      const owner = a.owner[i]!;
      // Inside a province with an enemy castle the army goes where it likes, but leaves only the way it came.
      if (into !== a.location[i] && (castleBars(world, i, into) || !mayMarchInto(world, owner, into))) {
        halt(world, i);
        have = 0;
        break;
      }
      const cost = tileStepHours(m, a.tile[i]!, next, army);
      if (have < cost) break;
      have -= cost;
      a.tile[i] = next;
      a.pathAt[i] = a.pathAt[i]! + 1;
      a.trail[i]!.push(next);
      if (into !== a.location[i]) {
        a.cameFrom[i] = a.location[i]!;
        a.location[i] = into;
        const k = a.route[i]!.indexOf(into);
        if (k >= 0) a.route[i]!.splice(0, k + 1);
      }
      if (a.pathAt[i]! >= a.path[i]!.length && a.route[i]!.length && !planLeg(world, i)) {
        halt(world, i);
        have = 0;
        break;
      }
    }
    if (a.pathAt[i]! >= a.path[i]!.length && !a.route[i]!.length) {
      a.path[i] = NO_PATH;
      a.pathAt[i] = 0;
      a.retreating[i] = 0;
      have = 0;
    }
    a.progress[i] = have;
  }
}

/**
 * A day's food. Every army eats a day of rations from its wagons and refills
 * them from the store of the province where it stands (feedback 83): at home
 * the locals keep a reserve, enemy land is stripped of what foragers find.
 * What the land can't make up is hunger: men desert and die, and horses are
 * eaten.
 */
const HUNGER_DEAD_SHARE = WARFARE.hunger.die / (WARFARE.hunger.die + WARFARE.hunger.desert);

function feedArmies(world: World): void {
  const d = world.rules.defines.march;
  const map = marchMap(world);
  const a = world.armies;
  const day = 1 / DAYS_PER_RATION_MONTH;
  // What each realm's wagons hold (RSCH-094: half without B01), read once per realm per day.
  const carried = new Int16Array(world.nationCount).fill(-1);
  for (let i = 0; i < a.count; i++) {
    if (!a.alive[i]) continue;
    const n = a.owner[i]!;
    if (carried[n]! < 0) carried[n] = foodCarriedPct(world, n);
    const army = { ...marching(world, i), campaigning: campaigning(world, i), foodCarriedPct: carried[n]! };
    const need = monthlyRations(d, army) * day;
    a.food[i] = a.food[i]! - need;
    const room = wagonRations(d, army) - a.food[i]!;
    if (room > 0) {
      const take = Math.min(room, refillHere(world, i, map) * day);
      a.food[i] = a.food[i]! + take;
      world.provinceStore[a.location[i]!] = world.provinceStore[a.location[i]!]! - take / 1000;
    }
    if (a.food[i]! < 0) {
      const short = Math.min(1, -a.food[i]! / need);
      const loss = d.hungerLossPerMonth * day * short;
      const before = a.men[i]!;
      a.men[i] = Math.round(before * (1 - loss));
      // Of the men hunger takes, those who die (warfare hunger: die against desert) are missed at home (WAR-226).
      armyDead(world, i, (before - a.men[i]!) * HUNGER_DEAD_SHARE);
      a.horse[i] = Math.round(a.horse[i]! * (1 - loss));
      a.food[i] = 0;
    }
  }
}

