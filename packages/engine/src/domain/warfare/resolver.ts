import type { Ground } from "../province/index.ts";
import { breakPoint, levelOf, standThrough } from "./companies.ts";
import { loseBattle, winBattle } from "./commanders.ts";
import {
  armGround,
  armyBreaks,
  chargeOf,
  fleeShare,
  gunTargets,
  hasMelee,
  hitsOf,
  mightEffect,
  nightWithdrawal,
  ordersPerBell,
  seesHidden,
  shotInto,
  splitHits,
  ammunitionBells,
  wantsToRetreat,
  whoBreaks,
  type Sector,
} from "./battle.ts";
import { againstEnemy } from "./companies.ts";
import { overnight } from "./battle.ts";
import { W, armDef, type Army, type Company, type Era, type Known, type Role } from "./model.ts";
import { styleInBattle } from "./styles.ts";

/**
 * The battle resolver (spec §5.9 … §5.14): one battle, bell by bell, from the
 * two armies, the tile row and the ground, with no dice and no player orders
 * during it (WAR-094). The result, losses and one-line reason are ready
 * before any report shows; watching is playback of `lines` (WAR-135, WAR-202).
 */

// ---------------------------------------------------------------- deployment (WAR-100)

export interface Placement {
  /** Companies standing in each sector, the line first. */
  sectors: Company[][];
  /** Companies standing behind the line in a sector (Shot behind, Shock waiting). */
  behind: Company[][];
  reserve: Company[];
  hidden: { company: Company; sector: number }[];
}

const rolesOf = (c: Company): Role[] => armDef(c.arm).roles as Role[];
const has = (c: Company, r: Role): boolean => rolesOf(c).includes(r);
const menIn = (cs: Company[]): number => cs.reduce((s, c) => s + c.men, 0);

/** Put each company into the listed sector with the fewest men so far. */
function spread(list: Company[], where: number[], into: Company[][]): void {
  if (!where.length) return;
  for (const c of list) {
    const target = where.reduce((best, i) => (menIn(into[i]!) < menIn(into[best]!) ? i : best), where[0]!);
    into[target]!.push(c);
  }
}

/** Deploy an army by its commander's approach (WAR-100, approach table). */
export function deploy(companies: Company[], sectors: Sector[], approach: string, era: Era = "II"): Placement {
  const n = sectors.length;
  const all = [...Array(n).keys()];
  const p: Placement = { sectors: all.map(() => []), behind: all.map(() => []), reserve: [], hidden: [] };
  const open = all.filter((i) => sectors[i]!.charge);
  const total = menIn(companies);
  const line = (c: Company): boolean => !has(c, "Shot") && !has(c, "Guns") && !has(c, "Shock");
  switch (approach) {
    case "Breakthrough": {
      const shock = companies.filter((c) => has(c, "Shock"));
      const best = [...open].sort((a, b) => sectors[b]!.room - sectors[a]!.room || a - b);
      const massed = best.slice(0, menIn(shock) > (sectors[best[0] ?? 0]?.room ?? 0) ? 2 : 1);
      spread(shock, massed.length ? massed : all, p.sectors);
      const rest = companies.filter((c) => !has(c, "Shock")).sort((a, b) => a.men - b.men);
      if (rest.length >= 2) p.reserve.push(rest.shift()!);
      const elsewhere = all.filter((i) => !massed.includes(i));
      spread(rest, elsewhere.length ? elsewhere : all, p.sectors);
      break;
    }
    case "Envelopment": {
      const ends = [0, n - 1].filter((v, i, a) => a.indexOf(v) === i);
      const centre = all.filter((i) => !ends.includes(i));
      const pool = [...companies].sort((a, b) => a.men - b.men);
      for (const i of centre) {
        const k = pool.findIndex((c) => levelOf(c, era) >= (W.approaches.Envelopment.centre_level as number));
        if (k >= 0) p.sectors[i]!.push(pool.splice(k, 1)[0]!);
      }
      spread(pool.reverse(), ends, p.sectors);
      break;
    }
    case "Skirmish": {
      const lightShot = companies.filter((c) => (has(c, "Light") || has(c, "Shot")) && !(has(c, "Shock") && !has(c, "Shot")));
      const shock = companies.filter((c) => has(c, "Shock") && !lightShot.includes(c));
      const rest = companies.filter((c) => !lightShot.includes(c) && !shock.includes(c));
      const where = open.length ? open : all;
      spread(lightShot, where, p.sectors);
      spread(shock, where, p.behind);
      const other = all.filter((i) => !where.includes(i));
      spread(rest, other.length ? other : where, p.sectors);
      break;
    }
    case "Ambush": {
      const cover = all.filter((i) => sectors[i]!.hide);
      let hiddenMen = 0;
      const rest: Company[] = [];
      for (const c of [...companies].sort((a, b) => b.men - a.men)) {
        if (cover.length && !has(c, "Guns") && hiddenMen + c.men <= total * (W.approaches.Ambush.hidden as number)) {
          const i = cover[p.hidden.length % cover.length]!;
          p.hidden.push({ company: c, sector: i });
          hiddenMen += c.men;
        } else rest.push(c);
      }
      spread(rest, all, p.sectors);
      break;
    }
    case "Bombardment": {
      const centre = n % 2 === 1 ? [(n - 1) / 2] : [n / 2 - 1, n / 2];
      const guns = companies.filter((c) => has(c, "Guns"));
      spread(guns, centre, p.sectors);
      const lines = companies.filter((c) => !has(c, "Guns") && has(c, "Line"));
      const others = companies.filter((c) => !guns.includes(c) && !lines.includes(c));
      for (const i of centre) if (lines.length) p.sectors[i]!.push(lines.shift()!);
      const elsewhere = all.filter((i) => !centre.includes(i));
      spread([...lines, ...others], elsewhere.length ? elsewhere : centre, p.sectors);
      break;
    }
    case "Assault":
      spread([...companies].sort((a, b) => b.men - a.men), all, p.sectors);
      break;
    default: {
      // Steadfast (and Entrenchment): Line evenly in every sector, Shot behind, a quarter in reserve.
      const want = total * (W.approaches.Steadfast.reserve as number);
      const pool = [...companies].sort((a, b) => a.men - b.men);
      let held = 0;
      for (const c of [...pool]) {
        if (has(c, "Shot") || has(c, "Guns") || held + c.men > want) continue;
        p.reserve.push(c);
        held += c.men;
        pool.splice(pool.indexOf(c), 1);
      }
      spread(pool.filter(line).sort((a, b) => b.men - a.men), all, p.sectors);
      spread(pool.filter((c) => !line(c) && !has(c, "Shot") && !has(c, "Guns")), all, p.sectors);
      spread(pool.filter((c) => has(c, "Shot") || has(c, "Guns")), all, p.behind);
    }
  }
  return p;
}

// ---------------------------------------------------------------- the battle

export interface BattleSide {
  country: string;
  army: Army;
  known: Known;
  /** The commander's style; its approach sets deployment and orders. */
  style?: string;
  /** The approach, when no style is given. */
  approach?: string;
  /** Content share of the side's people (flee share). */
  content?: number;
  homeland?: boolean;
  forcedMarch?: boolean;
  hungry?: boolean;
  /** The side's regiments' strength change in percent: −20 without C01 *Iron smelting* (RSCH-094). */
  strengthPct?: number;
  /** Tokens the enemy has that make styles stale (inventions known, "W8 massed" …). */
  staleTokens?: ReadonlySet<string>;
  /** Companies whose powder was not in the store: they do not fire (WAR-013). */
  silent?: ReadonlySet<string>;
}

export interface BattleInput {
  attacker: BattleSide;
  defender: BattleSide;
  sectors: Sector[];
  ground: Ground;
  era: Era;
  /** A battle province's town buildings burn when anyone fights in its town sector. */
  playback?: boolean;
}

interface Unit {
  c: Company;
  side: 0 | 1;
  start: number;
  killed: number;
  wounded: number;
  fled: number;
  broken: boolean;
  sector: number | null;
  hidden: boolean;
  behind: boolean;
  bellsInRow: number;
  ammoUsed: number;
  refilling: boolean;
  contact: number;
}

export interface SideLoss {
  killed: number;
  wounded: number;
  fled: number;
}

export interface BattleResult {
  /** Who holds the field. */
  winner: string;
  loser: string;
  /** How the loser left: broke, withdrew cleanly, withdrew (counts as breaking), or the attacker pulled back. */
  how: "broke" | "withdrew clean" | "withdrew" | "attacker pulled back";
  bells: number;
  days: number;
  losses: Record<string, SideLoss>;
  sectorsLost: Record<string, number>;
  campTaken: boolean;
  townFought: boolean;
  /** One line per commander per bell (playback). */
  lines: string[][];
  reason: string;
  /** Companies that broke, by id. */
  brokenCompanies: string[];
  pursuitShare: number;
  ordersGiven: Record<string, number>;
}

const short = (name: string): string => name.split(" ").slice(-1)[0]!;
const plural = (use: string): string => (/(s|Town|Marsh)$/.test(use) ? use.toLowerCase() : `${use.toLowerCase()}s`);
const armWord = (arm: string): string => (arm === "knights and lancers" ? "knights" : arm);

/** Orders that reach a running battle between rounds (X-1): a retreat, or armies marching in to join. */
interface RoundControl {
  retreat: 0 | 1 | undefined;
  joins: { side: 0 | 1; companies: Company[] }[];
}

/** A battle fought over time, one round (one bell) per 4-hour step (X-1, WAR-136, WAR-205, WAR-206). */
export interface RunningFight {
  /** Fights the next round; returns the result once the battle has ended, otherwise null. */
  round(): BattleResult | null;
  /** The side orders a retreat; it takes effect at the start of the next round. */
  retreat(side: 0 | 1): void;
  /** Companies of an army that marched in join a side's reserve from the next round. */
  join(side: 0 | 1, companies: Company[]): void;
  /** Rounds fought so far. */
  rounds: number;
  /** Men each side has brought into the battle, joiners included. */
  men: [number, number];
  result: BattleResult | null;
}

/** Starts a battle that is then fought round by round (X-1). */
export function startBattle(input: BattleInput): RunningFight {
  const ctl: RoundControl = { retreat: undefined, joins: [] };
  const men = [input.attacker, input.defender].map((s) => s.army.companies.reduce((t, c) => t + c.men, 0)) as [number, number];
  const gen = fightRounds(input, ctl);
  const f: RunningFight = {
    rounds: 0,
    men,
    result: null,
    round() {
      if (f.result) return f.result;
      const r = gen.next();
      f.rounds += 1;
      if (r.done) f.result = r.value;
      return f.result;
    },
    retreat(side) {
      ctl.retreat = side;
    },
    join(side, companies) {
      ctl.joins.push({ side, companies });
      f.men[side] += companies.reduce((t, c) => t + c.men, 0);
    },
  };
  return f;
}

/** Fight one battle to its end (WAR-089 … WAR-133), round after round. Same input, same result. */
export function fightBattle(input: BattleInput): BattleResult {
  const f = startBattle(input);
  for (;;) {
    const r = f.round();
    if (r) return r;
  }
}

function* fightRounds(input: BattleInput, ctl: RoundControl): Generator<void, BattleResult> {
  const { sectors, era } = input;
  const sides = [input.attacker, input.defender] as const;
  const n = sectors.length;
  const approaches = sides.map((s, i) => {
    const a = s.style ? styleInBattle(s.style, s.staleTokens ?? new Set()) : null;
    const base = s.approach ?? (s.style ? (W.styles.find((x) => x.name === s.style)?.approach ?? "Steadfast") : "Steadfast");
    return { approach: base === "Entrenchment" && i === 0 ? "Steadfast" : base, rule: a?.rule ?? null, orderLoss: a?.orderLoss ?? 0, reason: a?.reason ?? null };
  });
  const units: Unit[] = [];
  sides.forEach((s, i) => {
    const pl = deploy(s.army.companies.filter((c) => c.men > 0), sectors, approaches[i]!.approach, era);
    const enemyCmd = sides[1 - i]!.army.commander;
    const seen = (cunning: number): boolean => seesHidden({ cunning: enemyCmd?.cunning ?? 0, careful: enemyCmd?.traits.includes("Careful") ?? false, known: sides[1 - i]!.known }, cunning);
    const mk = (c: Company, sector: number | null, extra: Partial<Unit> = {}): Unit => ({ c, side: i as 0 | 1, start: c.men, killed: 0, wounded: 0, fled: 0, broken: false, sector, hidden: false, behind: false, bellsInRow: 0, ammoUsed: 0, refilling: false, contact: 0, ...extra });
    pl.sectors.forEach((cs, k) => cs.forEach((c) => units.push(mk(c, k))));
    pl.behind.forEach((cs, k) => cs.forEach((c) => units.push(mk(c, k, { behind: true }))));
    pl.reserve.forEach((c) => units.push(mk(c, null)));
    pl.hidden.forEach((h) => units.push(mk(h.company, h.sector, { hidden: !seen(s.army.commander?.cunning ?? 0) })));
  });
  const startedIn = sides.map((_, i) => new Set(units.filter((u) => u.side === i && u.sector !== null).map((u) => u.sector!)));
  const menAtStart = sides.map((_, i) => units.filter((u) => u.side === i).reduce((s, u) => s + u.start, 0));
  const leaderSector = sides.map((_, i) => {
    let best = 0;
    for (let k = 0; k < n; k++) if (menHere(i, k) > menHere(i, best)) best = k;
    return best;
  });
  function menHere(side: number, k: number): number {
    return units.filter((u) => u.side === side && u.sector === k && !u.broken && !u.hidden).reduce((s, u) => s + u.c.men, 0);
  }
  const lossOf = (side: number): number => units.filter((u) => u.side === side).reduce((s, u) => s + u.killed + u.wounded + u.fled, 0);
  const lines: string[][] = [];
  const ordersGiven: Record<string, number> = { [sides[0].country]: 0, [sides[1].country]: 0 };
  const campTaken: [boolean, boolean] = [false, false];
  let townFought = false;
  const brokenAt: (number | null)[] = [null, null];
  let bells = 0;
  let days = 1;
  const lossMul = (approaches[0]!.approach === "Assault" || approaches[1]!.approach === "Assault" ? W.assault_losses : 1) * sides.reduce((m, s) => m * (s.army.commander?.traits.includes("Reckless") ? W.traits.Reckless.losses : 1), 1);

  const bp = (u: Unit): number => {
    const s = sides[u.side];
    const m = mightEffect(s.army.commander?.might ?? 0, era);
    const inSector = m.scope === "army" || u.sector === leaderSector[u.side];
    return breakPoint(u.c, { era, known: s.known, might: inSector ? m.breakPoint : 0, homeland: s.homeland === true, hungry: s.hungry === true, traits: s.army.commander?.traits ?? [] });
  };
  const sectorLost = (side: number): number => [...startedIn[side]!].filter((k) => menHere(side, k) <= 0 && units.every((u) => !(u.side === side && u.sector === k && !u.broken))).length;

  function hit(target: Unit[], hits: number): void {
    const men = target.reduce((s, u) => s + u.c.men, 0);
    if (men <= 0 || hits <= 0) return;
    for (const u of target) {
      const share = Math.min(u.c.men, (hits * lossMul * u.c.men) / men);
      const s = sides[u.side];
      const split = splitHits(share, fleeShare(u.c, { content: s.content ?? 1 }));
      u.killed += split.killed;
      u.wounded += split.wounded;
      u.fled += split.fled;
      u.c.men -= share;
    }
  }

  const ammo = sides.map((s) => ammunitionBells(s.army.commander?.logistics ?? 0, era === "I" || era === "II" ? "III" : era, s.known));

  for (;;) {
    for (let b = 1; b <= W.battle.bells_per_day; b++) {
      // Between rounds: a retreat ordered by a side (X-1, WAR-205), and armies that marched in (WAR-206).
      if (ctl.retreat !== undefined) {
        const i = ctl.retreat;
        const w = nightWithdrawal(sides[i]!.army.commander?.cunning ?? 0, sides[1 - i]!.army.commander?.cunning ?? 0);
        return finish(i, w.clean ? "withdrew clean" : "withdrew", w.pursuit);
      }
      for (const j of ctl.joins.splice(0))
        for (const c of j.companies.filter((x) => x.men > 0)) {
          units.push({ c, side: j.side, start: c.men, killed: 0, wounded: 0, fled: 0, broken: false, sector: null, hidden: false, behind: false, bellsInRow: 0, ammoUsed: 0, refilling: false, contact: 0 });
          menAtStart[j.side] = menAtStart[j.side]! + c.men;
        }
      bells += 1;
      const firstBell = bells === 1;
      const assault = approaches.some((a) => a.approach === "Assault");
      const bellLines: string[] = [];
      // 1. orders: the less cunning commander first (WAR-105, WAR-111).
      const order = [0, 1].sort((x, y) => (sides[x]!.army.commander?.cunning ?? 0) - (sides[y]!.army.commander?.cunning ?? 0) || x - y);
      for (const i of order) {
        const s = sides[i]!;
        const cmd = s.army.commander;
        const count = ordersPerBell(cmd?.cunning ?? 0, era, s.known, approaches[i]!.orderLoss > 0);
        let given = 0;
        const priorities = (W.approaches as Record<string, { orders: string[] }>)[approaches[i]!.approach]?.orders ?? [];
        for (const o of priorities) {
          if (given >= count) break;
          if (o === "Commit reserve") {
            const r = units.find((u) => u.side === i && u.sector === null && !u.broken && u.c.men > 0);
            if (!r || firstBell) continue;
            // To the sector closest to breaking: most losses among its companies.
            let target = 0;
            let worst = -1;
            for (let k = 0; k < n; k++) {
              const here = units.filter((u) => u.side === i && u.sector === k);
              const l = here.reduce((s2, u) => s2 + u.killed + u.wounded + u.fled, 0);
              if (l > worst) [worst, target] = [l, k];
            }
            r.sector = target;
            given++;
            bellLines.push(`${short(cmd?.name ?? s.country)} commits his ${armWord(r.c.arm)} to the ${plural(sectors[target]!.use)}`);
          } else if (o === "Spring") {
            const h = units.filter((u) => u.side === i && u.hidden);
            if (!h.length || firstBell) continue;
            h.forEach((u) => (u.hidden = false));
            given++;
            bellLines.push(`${short(cmd?.name ?? s.country)} springs his hidden companies in the ${plural(sectors[h[0]!.sector!]!.use)}`);
          } else if (o === "Drive") {
            const won = [...Array(n).keys()].find((k) => menHere(i, k) > 0 && menHere(1 - i, k) <= 0 && startedIn[1 - i]!.has(k));
            if (won === undefined) continue;
            campTaken[1 - i] = true;
            given++;
            bellLines.push(`${short(cmd?.name ?? s.country)} drives from the ${plural(sectors[won]!.use)} into the enemy camp`);
          }
        }
        if (given === 0) bellLines.push(`${short(cmd?.name ?? s.country)} holds his line`);
        ordersGiven[s.country] = (ordersGiven[s.country] ?? 0) + given;
      }
      // 2.–4. shooting, charges and melee, worked out on the line as it stood (WAR-111, WAR-112).
      const dealt: { target: Unit[]; hits: number }[] = [];
      const active = units.filter((u) => !u.broken && !u.hidden && u.sector !== null && u.c.men > 0);
      for (const u of active) {
        const s = sides[u.side];
        const e = 1 - u.side;
        const k = u.sector!;
        const sec = sectors[k]!;
        const roles = againstEnemy(u.c.arm, sides[e]!.known).roles;
        const m = mightEffect(s.army.commander?.might ?? 0, era);
        const might = m.scope === "army" || k === leaderSector[u.side] ? m.hits : 0;
        const def = armDef(u.c.arm);
        let ground = sec.all + armGround(u.c.arm, input.ground) + (def.horse ? sec.horse : 0);
        if (u.side === 1) ground += sec.defender;
        if (u.side === 0) ground += sec.attackAcross;
        const ctx = { era, known: s.known, enemyKnown: sides[e]!.known, might, sector: ground, inventions: 1 + (s.strengthPct ?? 0) / 100, bellInRow: u.bellsInRow + 1, hungry: s.hungry === true, forcedFirstDay: s.forcedMarch === true && days === 1 };
        const enemyHere = active.filter((x) => x.side === e && x.sector === k);
        // Shooting: Shot while it has ammunition and powder; no shooting in a first bell an Assault commander advances.
        const shoots = (roles.includes("Shot") || roles.includes("Guns")) && !(firstBell && assault) && !u.refilling;
        if (shoots && !s.silent?.has(u.c.id)) {
          const targets = roles.includes("Guns") ? gunTargets(k, n).flatMap((t) => active.filter((x) => x.side === e && x.sector === t)) : enemyHere;
          if (targets.length) {
            const h = hitsOf(u.c, ctx) * shotInto({ shooterArm: u.c.arm, targetRoles: rolesOf(targets[0]!.c), cover: sectors[targets[0]!.sector!]!.cover, targetKnown: sides[e]!.known, shooterKnown: s.known });
            dealt.push({ target: targets, hits: h });
            if (sec.burnsTown) townFought = true;
          }
          u.ammoUsed += 1;
          if (u.ammoUsed >= ammo[u.side]!) u.refilling = true;
        } else if (u.refilling) {
          u.refilling = false;
          u.ammoUsed = 0;
        }
        // Melee (with the charge on first contact) from the second bell, or the first under Assault.
        const melee = (!firstBell || assault) && hasMelee(roles) && !(roles.includes("Shot") && !roles.includes("Line") && !roles.includes("Brace") && !roles.includes("Shock") && !u.refilling) && !u.behind;
        if (melee && enemyHere.length) {
          let mul = 1;
          if (roles.includes("Shock")) {
            const ch = chargeOf({ sectorCharge: sec.charge, firstContact: u.contact === 0, targetRoles: rolesOf(enemyHere[0]!.c), known: s.known, enemyKnown: sides[e]!.known, attackerApproach: approaches[u.side]!.approach, ...(approaches[u.side]!.rule?.["charge"] ? { chargeMul: approaches[u.side]!.rule!["charge"] as number } : {}) });
            mul = ch.dealt;
            if (ch.taken > 1) dealt.push({ target: [u], hits: hitsOf(enemyHere[0]!.c, { ...ctx, known: sides[e]!.known, enemyKnown: s.known, inventions: 1 + (sides[e]!.strengthPct ?? 0) / 100 }) * (ch.taken - 1) });
          }
          dealt.push({ target: enemyHere, hits: hitsOf(u.c, ctx) * mul });
          u.contact += 1;
          if (sec.burnsTown) townFought = true;
        } else if (!enemyHere.length) u.contact = 0;
      }
      for (const d of dealt) hit(d.target.filter((t) => !t.broken), d.hits);
      // 5. breaking (WAR-117 … WAR-121).
      for (const u of units) {
        if (u.broken) continue;
        if (u.killed + u.wounded + u.fled > u.start * bp(u) || u.c.men <= 0) {
          u.broken = true;
          u.fled += u.c.men;
          u.c.men = 0;
        }
      }
      const breaks = [0, 1].map((i) => {
        const avg = units.filter((u) => u.side === i).reduce((s2, u) => s2 + u.start * bp(u), 0) / Math.max(1, menAtStart[i]!);
        const lost = sectorLost(i);
        const started = startedIn[i]!.size;
        const broke = armyBreaks({ startedSectors: started, lostSectors: lost, losses: lossOf(i), men: menAtStart[i]!, breakPoint: avg, campTaken: campTaken[i] === true }) || units.filter((u) => u.side === i).every((u) => u.broken || u.c.men <= 0);
        return { broke, past: Math.max(lossOf(i) / Math.max(1, menAtStart[i]! * avg), lost / Math.max(1, started / 2)) };
      });
      // 6. depth and rotation (WAR-093, WAR-108, WAR-109).
      for (const u of units) if (!u.broken && u.sector !== null && !u.hidden) u.bellsInRow += 1;
      for (let i = 0; i < 2; i++) {
        let free = sides[i]!.army.commander?.logistics ?? 0;
        for (let k = 0; k < n && free > 0; k++) {
          const tired = units.find((u) => u.side === i && u.sector === k && !u.broken && u.bellsInRow >= W.tired.after_bells);
          const fresh = units.find((u) => u.side === i && u.sector === null && !u.broken && u.c.men > 0);
          if (tired && fresh) {
            fresh.sector = k;
            tired.sector = null;
            tired.bellsInRow = 0;
            free--;
          }
        }
      }
      lines.push(bellLines);
      if (breaks[0]!.broke || breaks[1]!.broke) {
        const loser = breaks[0]!.broke && breaks[1]!.broke ? (whoBreaks({ side: "0", past: breaks[0]!.past }, { side: "1", past: breaks[1]!.past }) === "0" ? 0 : 1) : breaks[0]!.broke ? 0 : 1;
        brokenAt[loser] = bells;
        return finish(loser, "broke", 1);
      }
      yield;
    }
    // Night (WAR-123, WAR-124): fled men who come back return, ammunition refills, standing orders are checked.
    for (const u of units) {
      if (u.broken) continue;
      const night = { men: u.c.men, fled: u.fled, ammoUsed: u.ammoUsed };
      overnight(night);
      [u.c.men, u.fled, u.ammoUsed, u.refilling] = [night.men, night.fled, night.ammoUsed, false];
    }
    for (const i of [0, 1]) {
      const ours = units.filter((u) => u.side === i).reduce((s2, u) => s2 + u.c.men, 0);
      const theirs = units.filter((u) => u.side === 1 - i).reduce((s2, u) => s2 + u.c.men, 0);
      if (wantsToRetreat(ours, theirs, sides[i]!.army.orders.retreat)) {
        const w = nightWithdrawal(sides[i]!.army.commander?.cunning ?? 0, sides[1 - i]!.army.commander?.cunning ?? 0);
        return finish(i, w.clean ? "withdrew clean" : "withdrew", w.pursuit);
      }
    }
    if (days >= W.era_scale[era].max_days) return finish(0, "attacker pulled back", 0);
    days += 1;
  }

  function finish(loser: number, how: BattleResult["how"], pursuit: number): BattleResult {
    const winner = 1 - loser;
    const losses: Record<string, SideLoss> = {};
    const sectorsLost: Record<string, number> = {};
    for (const i of [0, 1]) {
      const us = units.filter((u) => u.side === i);
      losses[sides[i]!.country] = { killed: us.reduce((s, u) => s + u.killed, 0), wounded: us.reduce((s, u) => s + u.wounded, 0), fled: us.reduce((s, u) => s + u.fled, 0) };
      sectorsLost[sides[i]!.country] = sectorLost(i);
    }
    const why =
      how === "broke"
        ? `${sides[loser]!.country} broke after losing ${sectorLost(loser)} of ${startedIn[loser]!.size} sectors`
        : how === "attacker pulled back"
          ? `${sides[0].country} pulled back after ${days} days`
          : `${sides[loser]!.country} withdrew at night${how === "withdrew" ? ", counted as breaking" : ""}`;
    const reason = [why, ...approaches.map((a) => a.reason).filter((r): r is string => r !== null)].join("; ");
    return {
      winner: sides[winner]!.country,
      loser: sides[loser]!.country,
      how,
      bells,
      days,
      losses,
      sectorsLost,
      campTaken: campTaken[loser]!,
      townFought,
      lines,
      reason,
      brokenCompanies: units.filter((u) => u.broken).map((u) => u.c.id),
      pursuitShare: how === "broke" ? 1 : pursuit,
      ordersGiven,
    };
  }
}

/** After a battle: victories and defeats, scars for companies that stood, none for those that broke, all killed to Fallen (WAR-130, WAR-131, WAR-006). */
export function recordBattle(r: BattleResult, armies: Record<string, Army>, realms: Record<string, { victories: number[]; defeats: number[]; fallen: number }>, year: number): void {
  for (const [country, army] of Object.entries(armies)) {
    const won = country === r.winner;
    const cmd = army.commander;
    if (cmd) {
      if (won) winBattle(cmd);
      else loseBattle(cmd);
    }
    const realm = realms[country];
    if (realm) {
      (won ? realm.victories : realm.defeats).push(year);
      realm.fallen += r.losses[country]?.killed ?? 0;
    }
    for (const c of army.companies) if (!r.brokenCompanies.includes(c.id)) standThrough(c, won);
  }
}

/** An army's camp behind the line: wagons, food reserve, wounded and the guns not placed (WAR-091). */
export function campOf(a: Army, placement: Placement, wounded = 0): { wagons: number; reserve: number; wounded: number; guns: Company[] } {
  const placed = new Set([...placement.sectors.flat(), ...placement.behind.flat()]);
  const guns = a.companies.filter((c) => armDef(c.arm).roles.includes("Guns") && !placed.has(c));
  return { wagons: a.wagons, reserve: a.reserve, wounded, guns };
}

export interface BattleReport {
  who: [string, string];
  where: string;
  result: BattleResult;
  reason: string;
}

/**
 * The turn's battles, resolved one at a time in order: each result is ready
 * before its report is made (WAR-135). Battles with no player go to the log
 * and never slow the game (WAR-137); a player battle (WAR-136) is fought
 * round by round in 4-hour steps (X-1, D-WAR-2); its report is handed back.
 */
export function resolveTurn(battles: (BattleInput & { where: string })[], player?: string): { order: string[]; log: BattleReport[]; playerReports: BattleReport[] } {
  const order: string[] = [];
  const log: BattleReport[] = [];
  const playerReports: BattleReport[] = [];
  for (const b of battles) {
    const result = fightBattle(b);
    order.push(b.where);
    const report = { who: [b.attacker.country, b.defender.country] as [string, string], where: b.where, result, reason: result.reason };
    if (player !== undefined && report.who.includes(player)) playerReports.push(report);
    else log.push(report);
  }
  return { order, log, playerReports };
}
