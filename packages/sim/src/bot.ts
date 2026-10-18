import type { Ruleset } from "@ph/rules";
import { Rng, TAX_RATES, WORKS, type Order, type Snapshot } from "@ph/engine";
import type { SimConfig } from "./config.ts";

/**
 * The break-the-game bot: plays one realm as a human would, through the same
 * orders the game's screens send and from the same snapshot they draw, and
 * plays it hard. It taxes heavily, builds whenever it has gold, keeps its
 * troop cap full, picks fights it should win, marches on the nearest enemy
 * land and presses for land at the peace table. It reads nothing the player
 * could not see.
 *
 * Its pieces (answering, the treasury, building, the army, war and peace) are
 * exported for the balance model's probe strategies (strategies.ts), which
 * put them together differently.
 */
export interface Bot {
  /** The orders for this week, from the snapshot at its start. */
  decide(s: Snapshot): Order[];
  /** Round trips that must never leave the realm richer (probes), when one is due. */
  probes(s: Snapshot): Probe[];
}

/** Two orders that undo each other: after both, gold less debt must not be higher than before. */
export interface Probe {
  name: string;
  orders: [Order, Order];
}

export type Bc = SimConfig["bot"];

/** Thousands that may wait to gather in one province (the engine refuses more). */
const MUSTER_QUEUE = 10;

/** What a scripted player knows of the map from the rules data (the same map the screens draw), and its memory between weeks. */
export interface Kit {
  config: Bc;
  rng: Rng;
  /** Provinces. */
  P: number;
  /** Land neighbours of each province, by index. */
  neighbours: number[][];
  taxRate: number;
  workRank(name: string): number;
  /** The month last seen, the last commission and the last probe (month counts). */
  memory: { lastMonth: number; lastCommission: number; lastProbeMonth: number };
}

export function createKit(rules: Ruleset, config: Bc, seed: number): Kit {
  const index = new Map(rules.provinces.map((p, i) => [p.id, i]));
  const land = rules.provinces.map((p) => p.terrain !== "sea" && p.terrain !== "ocean");
  return {
    config,
    rng: new Rng(seed),
    P: rules.provinces.length,
    neighbours: rules.provinces.map((p) => p.neighbors.map((id) => index.get(id)!).filter((q) => q !== undefined && land[q])),
    taxRate: Math.max(0, TAX_RATES.indexOf(config.tax_rate as (typeof TAX_RATES)[number])),
    workRank: (name: string) => {
      const k = config.works_first.findIndex((w) => name.toLowerCase().startsWith(w));
      return k < 0 ? config.works_first.length : k;
    },
    memory: { lastMonth: -1, lastCommission: -Infinity, lastProbeMonth: -1 },
  };
}

/** Where the realm stands this week, worked out once from the snapshot. */
export interface Situation {
  me: number;
  month: number;
  /** The first week of a month. */
  newMonth: boolean;
  /** Men under arms by nation. */
  men: Float64Array;
  myWars: Snapshot["wars"];
  enemies: Set<number>;
  enemyMen: number;
  mine: number;
}

/** Men under arms plus half the levies a realm could still call. */
export const strength = (s: Snapshot, n: number, men: Float64Array) => men[n]! + 0.5 * s.nationLevies[n]!;

export function situation(kit: Kit, s: Snapshot): Situation {
  const me = s.playerNation;
  const month = s.date.year * 12 + s.date.month;
  const newMonth = month !== kit.memory.lastMonth;
  kit.memory.lastMonth = month;
  const men = new Float64Array(s.nationTreasury.length);
  for (let i = 0; i < s.armies.id.length; i++) if (s.armies.owner[i]! >= 0) men[s.armies.owner[i]!]! += s.armies.men[i]!;
  const myWars = s.wars.filter((w) => w.attackers.includes(me) || w.defenders.includes(me));
  const enemies = new Set<number>();
  for (const w of myWars) for (const n of w.attackers.includes(me) ? w.defenders : w.attackers) enemies.add(n);
  const enemyMen = [...enemies].reduce((t, n) => t + strength(s, n, men), 0);
  return { me, month, newMonth, men, myWars, enemies, enemyMen, mine: strength(s, me, men) };
}

/** How a script answers what waits on the player; each left out answers as the bot does. */
export interface AnswerPolicy {
  peace?: (offer: Snapshot["peaceOffers"][number]) => boolean;
  call?: (call: Snapshot["calls"][number]) => boolean;
  ask?: (ask: NonNullable<Snapshot["statecraft"]>["asks"][number]) => boolean;
}

/** Answers everything that waits on the player: events, peace offers, calls to arms, envoys' asks, risings, verdicts and a revolution. */
export function answerWaiting(kit: Kit, s: Snapshot, x: Situation, policy: AnswerPolicy = {}): Order[] {
  const { config, rng } = kit;
  const orders: Order[] = [];
  for (const card of s.events) {
    const pick = config.events === "historical" ? (card.options.find((o) => o.historical) ?? card.options[0]) : config.events === "first" ? card.options[0] : card.options[rng.int(card.options.length)];
    if (pick) orders.push({ type: "answerEvent", event: card.event, option: pick.id });
  }
  for (const offer of s.peaceOffers) {
    const yes = policy.peace ? policy.peace(offer) : offer.terms === "give" || (offer.terms === "white" && x.mine < x.enemyMen) || (offer.terms === "take" && x.mine * 3 < x.enemyMen);
    orders.push({ type: "answerPeace", offer: offer.id, yes });
  }
  for (const call of s.calls) orders.push({ type: "answerCall", call: call.id, yes: policy.call ? policy.call(call) : call.kind === "defensive" || x.mine >= config.war_odds * strength(s, call.against, x.men) });
  for (const ask of s.statecraft?.asks ?? []) orders.push({ type: "answerAsk", ask: ask.id, yes: policy.ask ? policy.ask(ask) : !ask.kind || x.mine * 2 < strength(s, ask.from, x.men) });
  for (const r of s.rebels.risings) {
    if (r.owner !== x.me) continue;
    const answer = r.answers.filter((a) => a.why === null && a.gold <= s.nationTreasury[x.me]!).sort((a, b) => a.gold - b.gold)[0];
    if (answer) orders.push({ type: "answerRebels", rising: r.id, answer: answer.answer });
  }
  for (const v of s.rebels.verdicts) orders.push({ type: "treatRebels", rising: v.id, treatment: "Punish the leaders" });
  if (s.revolution?.outbreak) orders.push({ type: "answerRevolution", stance: "lead" });
  return orders;
}

/** Taxes, the cheapest study, and money: borrow when short, repay what is above the reserve. Returns the orders and the gold left to spend above the reserve. */
export function realmOrders(kit: Kit, s: Snapshot, x: Situation): { orders: Order[]; spare: number } {
  const { config } = kit;
  const orders: Order[] = [];
  if (s.taxDefault !== kit.taxRate) orders.push({ type: "setTax", province: -1, rate: kit.taxRate });
  if (s.research && !s.research.study && s.research.options.length) {
    const cheapest = [...s.research.options].sort((a, b) => a.cost - b.cost)[0]!;
    orders.push({ type: "setStudy", invention: cheapest.id });
  }
  let gold = s.nationTreasury[x.me]!;
  const income = Math.max(0, s.nationMonthlyIncome[x.me]!);
  if (gold < config.borrow_when_treasury_below && s.canBorrow > 0) {
    const loan = Math.min(s.canBorrow, config.borrow_when_treasury_below - gold + income);
    orders.push({ type: "borrow", gold: loan });
    gold += loan;
  } else {
    const repay = Math.min(s.debt, gold - income * config.reserve_months_of_income * 2);
    if (s.debt > 0 && repay >= 1) orders.push({ type: "repay", gold: Math.floor(repay) });
  }
  return { orders, spare: gold - income * config.reserve_months_of_income };
}

/** Up to `most` works it ranks first, cheapest first, within `spare` gold, once a month while the queue is short. Returns the orders and the gold left. */
export function buildOrders(kit: Kit, s: Snapshot, x: Situation, spare: number, most = 1, queue = 3): { orders: Order[]; spare: number } {
  const orders: Order[] = [];
  if (!x.newMonth || s.workQueue.length >= queue) return { orders, spare };
  const rows: { province: number; work: number; gold: number; rank: number }[] = [];
  for (const [p, sheet] of Object.entries(s.buildSheets)) for (const r of sheet) if (r.why === null) rows.push({ province: Number(p), work: r.work, gold: r.gold, rank: kit.workRank(WORKS[r.work] ?? r.name) });
  rows.sort((a, b) => a.rank - b.rank || a.gold - b.gold);
  const used = new Set<number>();
  for (const r of rows.slice(0, 200)) {
    if (orders.length >= most) break;
    if (r.gold > spare || used.has(r.province)) continue;
    orders.push({ type: "build", province: r.province, work: r.work });
    used.add(r.province);
    spare -= r.gold;
  }
  return { orders, spare };
}

/** How the army is kept: the share of the troop cap filled at peace, and whether it hires companies when outnumbered in war. */
export interface ArmyPolicy {
  peaceFill: number;
  hire: boolean;
  /** Marches on enemy land; without it, armies only retake their own. */
  attack: boolean;
}

/** Fills the cap, leads every army, merges what stands together, sends an army home when the realm pays more than it earns, marches on the enemy. */
export function armyOrders(kit: Kit, s: Snapshot, x: Situation, spare: number, policy: ArmyPolicy): Order[] {
  const { me, enemies, newMonth, month } = x;
  const orders: Order[] = [];
  const room = s.nationTroopCap[me]! - s.nationCapUsed[me]!;
  const want = enemies.size ? room : room - s.nationTroopCap[me]! * (1 - policy.peaceFill);
  // Only while the realm earns more than it pays: the men's pay is in the income already.
  if (want >= 1000 && spare > 0 && (enemies.size || s.nationMonthlyIncome[me]! > 0)) {
    let left = Math.floor(want / 1000);
    const provs: number[] = [];
    // A lord's men answer his call, not the crown's: only royal land is called up.
    for (let p = 0; p < kit.P; p++) if (s.provinceOwner[p] === me && s.provinceLord[p]! < 0 && s.provinceRecruits[p]! >= 1000) provs.push(p);
    provs.sort((a, b) => s.provinceRecruits[b]! - s.provinceRecruits[a]!);
    const queued = new Map(s.musters.map((m) => [m.province, Math.ceil(m.men / 1000)]));
    for (const p of provs) {
      if (left <= 0) break;
      const k = Math.min(left, Math.floor(s.provinceRecruits[p]! / 1000), MUSTER_QUEUE - (queued.get(p) ?? 0));
      if (k <= 0) continue;
      orders.push({ type: "recruit", province: p, thousands: k });
      left -= k;
    }
  }
  if (policy.hire && enemies.size && x.enemyMen > x.mine) {
    const company = s.freeCompanies.filter((c) => c.pay <= spare).sort((a, b) => b.men - a.men)[0];
    if (company) orders.push({ type: "hire", company: company.id });
  }
  const idle = s.commanders.flatMap((c, i) => (c.owner === me && c.army < 0 && c.fleet < 0 ? [i] : []));
  const armies: number[] = [];
  for (let i = 0; i < s.armies.id.length; i++) if (s.armies.owner[i] === me && s.armies.battle[i]! < 0 && !s.armies.retreating[i]) armies.push(i);
  // At peace and paying more than it earns: send the smallest army home.
  if (!enemies.size && newMonth && s.nationMonthlyIncome[me]! < 0 && armies.length > 1) {
    const smallest = [...armies].sort((a, b) => s.armies.men[a]! - s.armies.men[b]!)[0]!;
    orders.push({ type: "disband", army: s.armies.id[smallest]! });
    armies.splice(armies.indexOf(smallest), 1);
  }
  const merged = new Set<number>();
  const byPlace = new Map<number, number>();
  for (const i of armies) {
    const at = s.armies.location[i]!;
    const lead = byPlace.get(at);
    if (lead === undefined) byPlace.set(at, i);
    else if (s.armies.commander[lead]! >= 0) {
      orders.push({ type: "merge", army: s.armies.id[i]!, into: s.armies.id[lead]! });
      merged.add(i);
    }
  }
  for (const i of armies) {
    if (merged.has(i) || s.armies.commander[i]! >= 0) continue;
    const c = idle.shift();
    if (c !== undefined) orders.push({ type: "appoint", army: s.armies.id[i]!, commander: c });
    else if (newMonth && spare > 0 && month - kit.memory.lastCommission >= 3) {
      const p = s.armies.location[i]!;
      if (s.provinceOwner[p] === me && s.provinceOfficial[p]) {
        orders.push({ type: "commission", province: p });
        kit.memory.lastCommission = month;
      }
    }
  }
  // March every led army on the nearest land it wants and does not hold yet.
  if (enemies.size) {
    const wanted = (q: number) => (policy.attack && enemies.has(s.provinceOwner[q]!) && s.provinceOccupier[q] !== me) || (s.provinceOwner[q] === me && enemies.has(s.provinceOccupier[q]!));
    for (const i of armies) {
      if (merged.has(i) || s.armies.commander[i]! < 0 || s.armies.route[i]!.length) continue;
      // An army standing on land it wants is besieging or retaking it: it stays.
      if (wanted(s.armies.location[i]!)) continue;
      const to = nearest(kit, s.armies.location[i]!, wanted);
      if (to >= 0) orders.push({ type: "move", army: s.armies.id[i]!, to });
    }
  }
  return orders;
}

/** Realms owning land next to the realm's own. */
export function neighbourRealms(kit: Kit, s: Snapshot, me: number): Set<number> {
  const near = new Set<number>();
  for (let p = 0; p < kit.P; p++) if (s.provinceOwner[p] === me) for (const q of kit.neighbours[p]!) if (s.provinceOwner[q]! >= 0 && s.provinceOwner[q] !== me) near.add(s.provinceOwner[q]!);
  return near;
}

/** Realms the player is tied to by anything but war (truce, alliance, subject, overlord): no war may be declared on them. */
export const tiedRealms = (s: Snapshot) => new Set(s.relations.filter((r) => r.state !== "war").map((r) => r.nation));

/** The weakest of `among`, by men and half their levies. */
export function weakest(s: Snapshot, x: Situation, among: Iterable<number>): number | undefined {
  return [...among].sort((a, b) => strength(s, a, x.men) - strength(s, b, x.men))[0];
}

/** Peace as the war leader, once a month: ask for the land held, or after `afterMonths` a white peace (or give up what is lost when outmatched). */
export function peaceOrders(kit: Kit, s: Snapshot, x: Situation, terms: { take: boolean; afterMonths: number }): Order[] {
  const orders: Order[] = [];
  // Not in a week it already answered a peace offer: that war may be over.
  if (!x.newMonth || s.peaceOffers.length) return orders;
  const { me, enemies } = x;
  for (const w of x.myWars) {
    const leader = w.attackers[0] === me || w.defenders[0] === me;
    if (!leader) continue;
    const foe = w.attackers[0] === me ? w.defenders[0]! : w.attackers[0]!;
    const held = countWhere(kit.P, (p) => enemies.has(s.provinceOwner[p]!) && s.provinceOccupier[p] === me);
    const lost = countWhere(kit.P, (p) => s.provinceOwner[p] === me && enemies.has(s.provinceOccupier[p]!));
    const months = x.month - monthIndex(w.start);
    if (terms.take && held > 0) orders.push({ type: "offerPeace", target: foe, terms: "take" });
    else if (months >= terms.afterMonths) orders.push({ type: "offerPeace", target: foe, terms: lost > 0 && x.mine < x.enemyMen ? "give" : "white" });
  }
  return orders;
}

export function createBot(rules: Ruleset, config: Bc, seed: number): Bot {
  const kit = createKit(rules, config, seed);

  function decide(s: Snapshot): Order[] {
    const x = situation(kit, s);
    const orders = answerWaiting(kit, s, x);
    const realm = realmOrders(kit, s, x);
    orders.push(...realm.orders);
    const built = buildOrders(kit, s, x, realm.spare);
    orders.push(...built.orders);
    orders.push(...armyOrders(kit, s, x, built.spare, { peaceFill: 0.5, hire: config.hire_companies, attack: true }));
    // War: pick on the weakest neighbour it outmatches, when at peace.
    if (!x.myWars.length && x.newMonth) {
      const ties = tiedRealms(s);
      const target = weakest(s, x, [...neighbourRealms(kit, s, x.me)].filter((n) => !ties.has(n)));
      if (target !== undefined && x.mine >= config.war_odds * strength(s, target, x.men)) orders.push({ type: "declareWar", target });
    }
    orders.push(...peaceOrders(kit, s, x, { take: true, afterMonths: config.peace_after_months }));
    return orders;
  }

  function probes(s: Snapshot): Probe[] {
    const month = s.date.year * 12 + s.date.month;
    if (kit.memory.lastProbeMonth >= 0 && month - kit.memory.lastProbeMonth < config.probe_every_months) return [];
    kit.memory.lastProbeMonth = month;
    const me = s.playerNation;
    const out: Probe[] = [];
    if (s.canBorrow >= 1) out.push({ name: "borrow then repay", orders: [{ type: "borrow", gold: 1 }, { type: "repay", gold: 1 }] });
    const p = s.provinceOwner.findIndex((o, i) => o === me && s.provinceRecruits[i]! >= 1000);
    if (p >= 0) out.push({ name: "recruit then cancel", orders: [{ type: "recruit", province: p, thousands: 1 }, { type: "cancelRecruit", province: p }] });
    for (const [prov, sheet] of Object.entries(s.buildSheets)) {
      const row = sheet.find((r) => r.why === null && r.gold <= s.nationTreasury[me]!);
      if (row) {
        out.push({ name: "build then cancel", orders: [{ type: "build", province: Number(prov), work: row.work }, { type: "cancelBuild", province: Number(prov), work: row.work }] });
        break;
      }
    }
    return out;
  }

  return { decide, probes };
}

function nearest(kit: Kit, from: number, wanted: (q: number) => boolean): number {
  const seen = new Uint8Array(kit.P);
  const queue = [from];
  seen[from] = 1;
  for (let k = 0; k < queue.length && k < 4000; k++) {
    const p = queue[k]!;
    if (p !== from && wanted(p)) return p;
    for (const q of kit.neighbours[p]!) if (!seen[q]) (seen[q] = 1), queue.push(q);
  }
  return -1;
}

function countWhere(n: number, f: (p: number) => boolean): number {
  let c = 0;
  for (let p = 0; p < n; p++) if (f(p)) c++;
  return c;
}

/** "1444-11" as a month count comparable with year * 12 + month. */
export function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return (y ?? 0) * 12 + (m ?? 1);
}
