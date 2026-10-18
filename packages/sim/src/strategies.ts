import type { Ruleset } from "@ph/rules";
import { ENVOY_ACTIONS, type EnvoyAction, type Order, type Snapshot } from "@ph/engine";
import { answerWaiting, armyOrders, buildOrders, createKit, neighbourRealms, peaceOrders, realmOrders, situation, strength, tiedRealms, weakest, type Kit, type Situation } from "./bot.ts";
import type { SimConfig } from "./config.ts";

/**
 * The balance model's probe strategies (BAL-008): fixed scripts that play a
 * probe realm through the engine host with only the orders the player's
 * screens send, deciding from the snapshot alone (INV-BAL-3). Each answers
 * everything that waits on the player (BAL-009). They share the bot's pieces
 * (bot.ts): the answers, the treasury, building and the army.
 *
 * Court is the plain AI: its runs are AI-only worlds (probe.ts), so it has no script here.
 */
export type StrategyName = "conqueror" | "builder" | "diplomat" | "court";
export const STRATEGIES: readonly StrategyName[] = ["conqueror", "builder", "diplomat", "court"];
export const STRATEGY_LABEL: Record<StrategyName, string> = { conqueror: "Conqueror", builder: "Builder", diplomat: "Diplomat", court: "Court" };

export interface Strategy {
  name: StrategyName;
  decide(s: Snapshot): Order[];
}

export function createStrategy(name: Exclude<StrategyName, "court">, rules: Ruleset, config: SimConfig, seed: number): Strategy {
  const kit = createKit(rules, config.bot, seed);
  const decide = name === "conqueror" ? conqueror(kit) : name === "builder" ? builder(kit, config) : diplomat(kit, config);
  return { name, decide };
}

/** Not in debt: no loan owed and gold in the treasury. */
const solvent = (s: Snapshot, x: Situation) => s.debt <= 0 && s.nationTreasury[x.me]! >= 0;

/**
 * Conqueror: declares war on the weakest neighbour it may (no truce, alliance
 * or subject tie) whenever it is at peace and not in debt, keeps its troop cap
 * full, marches on enemy land and asks every peace for all the land it holds.
 * It builds nothing.
 */
function conqueror(kit: Kit): (s: Snapshot) => Order[] {
  return (s) => {
    const x = situation(kit, s);
    const orders = answerWaiting(kit, s, x);
    const realm = realmOrders(kit, s, x);
    orders.push(...realm.orders);
    orders.push(...armyOrders(kit, s, x, realm.spare, { peaceFill: 1, hire: true, attack: true }));
    if (!x.myWars.length && x.newMonth && solvent(s, x)) {
      const ties = tiedRealms(s);
      const target = weakest(s, x, [...neighbourRealms(kit, s, x.me)].filter((n) => !ties.has(n)));
      if (target !== undefined) orders.push({ type: "declareWar", target });
    }
    orders.push(...peaceOrders(kit, s, x, { take: true, afterMonths: kit.config.peace_after_months }));
    return orders;
  };
}

/**
 * Builder: never declares war; spends its gold on works and learning (founding
 * schools and filling their seats); joins a war only when bound to defend; in a
 * war it is drawn into it retakes its own land and takes any peace that costs
 * it nothing.
 */
function builder(kit: Kit, config: SimConfig): (s: Snapshot) => Order[] {
  const sc = config.balance.strategy;
  return (s) => {
    const x = situation(kit, s);
    const orders = answerWaiting(kit, s, x, {
      call: (call) => call.kind === "defensive",
      peace: (offer) => offer.terms !== "take" || x.mine * 3 < x.enemyMen,
    });
    const realm = realmOrders(kit, s, x);
    orders.push(...realm.orders);
    const built = buildOrders(kit, s, x, realm.spare, sc.builder_works_per_month, sc.builder_queue);
    orders.push(...built.orders);
    let spare = built.spare;
    const r = s.research;
    if (r && x.newMonth) {
      if (r.seatsWanted < r.seats) orders.push({ type: "setSeats", n: r.seats });
      if (r.found.type && r.found.provinces.length && r.found.gold <= spare && !r.founding.length) {
        orders.push({ type: "foundSchool", province: r.found.provinces[0]! });
        spare -= r.found.gold;
      }
    }
    orders.push(...armyOrders(kit, s, x, spare, { peaceFill: 0.25, hire: false, attack: false }));
    orders.push(...peaceOrders(kit, s, x, { take: false, afterMonths: 1 }));
    return orders;
  };
}

/**
 * Diplomat: declares war only on a realm it holds a war aim on (and outmatches);
 * spends on envoys: subjects offered to smaller neighbours, alliances with
 * stronger ones, marriages, gifts to the coldest neighbour, courtesy visits;
 * makes demands of weaker neighbours; folds subjects in when it may.
 */
function diplomat(kit: Kit, config: SimConfig): (s: Snapshot) => Order[] {
  const sc = config.balance.strategy;
  let lastDemandYear = -1;
  return (s) => {
    const x = situation(kit, s);
    const orders = answerWaiting(kit, s, x);
    const realm = realmOrders(kit, s, x);
    orders.push(...realm.orders);
    let spare = realm.spare;
    const st = s.statecraft;
    if (st && x.newMonth) {
      const near = [...neighbourRealms(kit, s, x.me)].filter((n) => st.realms[n]);
      const allies = s.relations.filter((r) => r.state === "alliance").length;
      const can = (n: number, action: EnvoyAction) => st.realms[n]!.why[ENVOY_ACTIONS.indexOf(action)] === null;
      let free = st.free;
      const send = (n: number | undefined, action: EnvoyAction) => {
        if (n === undefined || free <= 0) return;
        orders.push({ type: "sendEnvoy", target: n, action });
        free--;
      };
      const byStanding = [...near].sort((a, b) => st.realms[a]!.standing - st.realms[b]!.standing);
      send(byStanding.find((n) => can(n, "offer_overlordship")), "offer_overlordship");
      if (allies < sc.diplomat_max_allies) send([...near].sort((a, b) => strength(s, b, x.men) - strength(s, a, x.men)).find((n) => can(n, "propose_alliance")), "propose_alliance");
      send(near.find((n) => can(n, "arrange_marriage") && !st.realms[n]!.married), "arrange_marriage");
      if (spare >= st.giftGold * sc.diplomat_gift_reserve) {
        const cold = byStanding.find((n) => can(n, "send_gift"));
        if (cold !== undefined && free > 0) spare -= st.giftGold;
        send(cold, "send_gift");
      }
      send(byStanding.find((n) => can(n, "courtesy_visit")), "courtesy_visit");
      // A demand a year, of a neighbour it far outmatches: tribute, else a border province.
      if (s.date.year !== lastDemandYear) {
        for (const n of byStanding) {
          const dv = st.realms[n]!.demands;
          if (dv.why !== null || x.mine < sc.diplomat_demand_odds * strength(s, n, x.men)) continue;
          if (dv.tribute === null) orders.push({ type: "makeDemand", target: n, kind: "pay_tribute" });
          else if (dv.provinces.length) orders.push({ type: "makeDemand", target: n, kind: "hand_over_province", province: dv.provinces.find((p) => !p.capital)?.province ?? dv.provinces[0]!.province });
          else continue;
          lastDemandYear = s.date.year;
          break;
        }
      }
      for (const sub of st.subjects?.subjects ?? []) if (sub.why.fold_in === null && !sub.work) orders.push({ type: "subjectAction", subject: sub.subject, action: "fold_in" });
    }
    orders.push(...armyOrders(kit, s, x, spare, { peaceFill: 0.5, hire: kit.config.hire_companies, attack: true }));
    // War only on a realm it holds a war aim on.
    if (!x.myWars.length && x.newMonth && solvent(s, x)) {
      const ties = tiedRealms(s);
      const target = weakest(s, x, (s.diplomacyLens?.aims ?? []).filter((n) => !ties.has(n)));
      if (target !== undefined && x.mine >= kit.config.war_odds * strength(s, target, x.men)) orders.push({ type: "declareWar", target });
    }
    orders.push(...peaceOrders(kit, s, x, { take: true, afterMonths: kit.config.peace_after_months }));
    return orders;
  };
}
