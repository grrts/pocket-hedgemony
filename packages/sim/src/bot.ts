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

type Bc = SimConfig["bot"];

/** Thousands that may wait to gather in one province (the engine refuses more). */
const MUSTER_QUEUE = 10;

export function createBot(rules: Ruleset, config: Bc, seed: number): Bot {
  const rng = new Rng(seed);
  const P = rules.provinces.length;
  const index = new Map(rules.provinces.map((p, i) => [p.id, i]));
  const land = rules.provinces.map((p) => p.terrain !== "sea" && p.terrain !== "ocean");
  const neighbours = rules.provinces.map((p) => p.neighbors.map((id) => index.get(id)!).filter((q) => q !== undefined && land[q]));
  const taxRate = Math.max(0, TAX_RATES.indexOf(config.tax_rate as (typeof TAX_RATES)[number]));
  const workRank = (name: string) => {
    const k = config.works_first.findIndex((w) => name.toLowerCase().startsWith(w));
    return k < 0 ? config.works_first.length : k;
  };
  let lastProbeMonth = -1;
  let lastCommission = -Infinity;
  let lastMonth = -1;

  /** Men under arms plus half the levies a realm could still call. */
  const strength = (s: Snapshot, n: number, men: Float64Array) => men[n]! + 0.5 * s.nationLevies[n]!;

  function decide(s: Snapshot): Order[] {
    const me = s.playerNation;
    const orders: Order[] = [];
    const month = s.date.year * 12 + s.date.month;
    const newMonth = month !== lastMonth;
    lastMonth = month;
    const men = new Float64Array(s.nationTreasury.length);
    for (let i = 0; i < s.armies.id.length; i++) if (s.armies.owner[i]! >= 0) men[s.armies.owner[i]!]! += s.armies.men[i]!;
    const myWars = s.wars.filter((w) => w.attackers.includes(me) || w.defenders.includes(me));
    const enemies = new Set<number>();
    for (const w of myWars) for (const n of w.attackers.includes(me) ? w.defenders : w.attackers) enemies.add(n);
    const enemyMen = [...enemies].reduce((t, n) => t + strength(s, n, men), 0);
    const mine = strength(s, me, men);

    // Whatever waits on the player's answer is answered first.
    for (const card of s.events) {
      const pick = config.events === "historical" ? (card.options.find((o) => o.historical) ?? card.options[0]) : config.events === "first" ? card.options[0] : card.options[rng.int(card.options.length)];
      if (pick) orders.push({ type: "answerEvent", event: card.event, option: pick.id });
    }
    for (const offer of s.peaceOffers) {
      const yes = offer.terms === "give" || (offer.terms === "white" && mine < enemyMen) || (offer.terms === "take" && mine * 3 < enemyMen);
      orders.push({ type: "answerPeace", offer: offer.id, yes });
    }
    for (const call of s.calls) orders.push({ type: "answerCall", call: call.id, yes: call.kind === "defensive" || mine >= config.war_odds * strength(s, call.against, men) });
    for (const ask of s.statecraft?.asks ?? []) orders.push({ type: "answerAsk", ask: ask.id, yes: !ask.kind || mine * 2 < strength(s, ask.from, men) });
    for (const r of s.rebels.risings) {
      if (r.owner !== me) continue;
      const answer = r.answers.filter((a) => a.why === null && a.gold <= s.nationTreasury[me]!).sort((a, b) => a.gold - b.gold)[0];
      if (answer) orders.push({ type: "answerRebels", rising: r.id, answer: answer.answer });
    }
    for (const v of s.rebels.verdicts) orders.push({ type: "treatRebels", rising: v.id, treatment: "Punish the leaders" });
    if (s.revolution?.outbreak) orders.push({ type: "answerRevolution", stance: "lead" });

    // The realm: taxes, learning, money.
    if (s.taxDefault !== taxRate) orders.push({ type: "setTax", province: -1, rate: taxRate });
    if (s.research && !s.research.study && s.research.options.length) {
      const cheapest = [...s.research.options].sort((a, b) => a.cost - b.cost)[0]!;
      orders.push({ type: "setStudy", invention: cheapest.id });
    }
    let gold = s.nationTreasury[me]!;
    if (gold < config.borrow_when_treasury_below && s.canBorrow > 0) {
      const loan = Math.min(s.canBorrow, config.borrow_when_treasury_below - gold + Math.max(0, s.nationMonthlyIncome[me]!));
      orders.push({ type: "borrow", gold: loan });
      gold += loan;
    } else {
      const repay = Math.min(s.debt, gold - Math.max(0, s.nationMonthlyIncome[me]!) * config.reserve_months_of_income * 2);
      if (s.debt > 0 && repay >= 1) orders.push({ type: "repay", gold: Math.floor(repay) });
    }

    // Building: the works it ranks first, cheapest first, while gold above the reserve lasts.
    let spare = gold - Math.max(0, s.nationMonthlyIncome[me]!) * config.reserve_months_of_income;
    if (newMonth && s.workQueue.length < 3) {
      const rows: { province: number; work: number; gold: number; rank: number }[] = [];
      for (const [p, sheet] of Object.entries(s.buildSheets)) for (const r of sheet) if (r.why === null) rows.push({ province: Number(p), work: r.work, gold: r.gold, rank: workRank(WORKS[r.work] ?? r.name) });
      rows.sort((a, b) => a.rank - b.rank || a.gold - b.gold);
      for (const r of rows.slice(0, 50)) {
        if (r.gold > spare) continue;
        orders.push({ type: "build", province: r.province, work: r.work });
        spare -= r.gold;
        break;
      }
    }

    // The army: fill the cap, lead every army, merge what stands together.
    const room = s.nationTroopCap[me]! - s.nationCapUsed[me]!;
    const want = enemies.size ? room : room - s.nationTroopCap[me]! * 0.5;
    // Only while the realm earns more than it pays: the men's pay is in the income already.
    if (want >= 1000 && spare > 0 && (enemies.size || s.nationMonthlyIncome[me]! > 0)) {
      let left = Math.floor(want / 1000);
      const provs: number[] = [];
      for (let p = 0; p < P; p++) if (s.provinceOwner[p] === me && s.provinceRecruits[p]! >= 1000) provs.push(p);
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
    if (config.hire_companies && enemies.size && enemyMen > mine) {
      const company = s.freeCompanies.filter((c) => c.pay <= spare).sort((a, b) => b.men - a.men)[0];
      if (company) orders.push({ type: "hire", company: company.id });
    }
    const idle = s.commanders.flatMap((c, i) => (c.owner === me && c.army < 0 && c.fleet < 0 ? [i] : []));
    const armies: number[] = [];
    for (let i = 0; i < s.armies.id.length; i++) if (s.armies.owner[i] === me && s.armies.battle[i]! < 0 && !s.armies.retreating[i]) armies.push(i);
    // At peace and paying more than it earns: send the smallest army home.
    if (!enemies.size && newMonth && s.nationMonthlyIncome[me]! < 0 && armies.length > 1) {
      const smallest = [...armies].sort((x, y) => s.armies.men[x]! - s.armies.men[y]!)[0]!;
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
      else if (newMonth && spare > 0 && month - lastCommission >= 3) {
        const p = s.armies.location[i]!;
        if (s.provinceOwner[p] === me && s.provinceOfficial[p]) {
          orders.push({ type: "commission", province: p });
          lastCommission = month;
        }
      }
    }

    // War: pick on the weakest neighbour it outmatches, when at peace.
    const ties = new Set(s.relations.filter((r) => r.state !== "war").map((r) => r.nation));
    if (!myWars.length && newMonth) {
      const near = new Set<number>();
      for (let p = 0; p < P; p++) if (s.provinceOwner[p] === me) for (const q of neighbours[p]!) if (s.provinceOwner[q]! >= 0 && s.provinceOwner[q] !== me) near.add(s.provinceOwner[q]!);
      const target = [...near].filter((n) => !ties.has(n)).sort((a, b) => strength(s, a, men) - strength(s, b, men))[0];
      if (target !== undefined && mine >= config.war_odds * strength(s, target, men)) orders.push({ type: "declareWar", target });
    }
    // March every led army on the nearest enemy land it does not hold yet.
    if (enemies.size) {
      for (const i of armies) {
        if (merged.has(i) || s.armies.commander[i]! < 0 || s.armies.route[i]!.length) continue;
        const wanted = (q: number) => (enemies.has(s.provinceOwner[q]!) && s.provinceOccupier[q] !== me) || (s.provinceOwner[q] === me && enemies.has(s.provinceOccupier[q]!));
        // An army standing on land it wants is besieging or retaking it: it stays.
        if (wanted(s.armies.location[i]!)) continue;
        const to = nearest(s.armies.location[i]!, wanted);
        if (to >= 0) orders.push({ type: "move", army: s.armies.id[i]!, to });
      }
    }
    // Peace: press for land, then settle.
    // Not in a week it already answered a peace offer: that war may be over.
    if (newMonth && !s.peaceOffers.length) {
      for (const w of myWars) {
        const leader = w.attackers[0] === me || w.defenders[0] === me;
        if (!leader) continue;
        const foe = w.attackers[0] === me ? w.defenders[0]! : w.attackers[0]!;
        const held = countWhere(P, (p) => enemies.has(s.provinceOwner[p]!) && s.provinceOccupier[p] === me);
        const lost = countWhere(P, (p) => s.provinceOwner[p] === me && enemies.has(s.provinceOccupier[p]!));
        const months = month - monthIndex(w.start);
        if (held > 0) orders.push({ type: "offerPeace", target: foe, terms: "take" });
        else if (months >= config.peace_after_months) orders.push({ type: "offerPeace", target: foe, terms: lost > 0 && mine < enemyMen ? "give" : "white" });
      }
    }
    return orders;
  }

  function nearest(from: number, wanted: (q: number) => boolean): number {
    const seen = new Uint8Array(P);
    const queue = [from];
    seen[from] = 1;
    for (let k = 0; k < queue.length && k < 4000; k++) {
      const p = queue[k]!;
      if (p !== from && wanted(p)) return p;
      for (const q of neighbours[p]!) if (!seen[q]) (seen[q] = 1), queue.push(q);
    }
    return -1;
  }

  function probes(s: Snapshot): Probe[] {
    const month = s.date.year * 12 + s.date.month;
    if (lastProbeMonth >= 0 && month - lastProbeMonth < config.probe_every_months) return [];
    lastProbeMonth = month;
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

function countWhere(n: number, f: (p: number) => boolean): number {
  let c = 0;
  for (let p = 0; p < n; p++) if (f(p)) c++;
  return c;
}

/** "1444-11" as a month count comparable with year * 12 + month. */
function monthIndex(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return (y ?? 0) * 12 + (m ?? 1);
}
