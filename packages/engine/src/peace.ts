import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as wf from "./domain/warfare/index.ts";
import type { Lord } from "./domain/realm/index.ts";
import { GRIEVANCES } from "./moods.ts";
import { fallenEffect } from "./fallen.ts";
import { TRAITS } from "./rulers.ts";

/**
 * The price of war, peace part (X-21): each side's peace voices counted in the
 * game from its lords, royal provinces and capital (WAR-180, WAR-221), what
 * they oblige and what refusing costs (WAR-181, WAR-182), lords who waver at a
 * war with no fitting aim or a truce broken (WAR-178, WAR-179, WAR-222), lords
 * who tire of a long war (WAR-223) and how much one peace may take (WAR-227).
 * The rules are the warfare context's (domain/warfare/war.ts); this file maps
 * the engine's lords, provinces and wars onto them.
 */

const P = wf.W.peace;

/** A war as the game keeps it: diplomacy's war, with what the peace rules need (saved with the diplomacy state). */
export type GameWar = dip.War & {
  /** The province a Take land aim names (WAR-180: a lord whose Want it is says war). */
  aimProvince?: string;
  /** Battles won in this war, by realm id (WAR-180: loyal lords of the side with more victories say war). */
  wins?: Record<string, number>;
  /** Realms (ids) that refused a peace their voices obliged them to take, until the obligation passes or the war ends (WAR-181). */
  refused?: string[];
};

// ---------------------------------------------------------------- lords' traits and wants

const fnv = (s: string): number => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
};

/** A lord's two traits (REALM-070): his own when set, else two of the ruler traits drawn from his name, the same every game. */
export function lordTraits(world: World, k: number): string[] {
  const l = world.lords[k]!;
  if (l.traits) return l.traits;
  const h = fnv(`${world.nationIds[l.nation]}|${l.house}|${l.name}`);
  const a = h % TRAITS.length;
  const b = (a + 1 + ((h >>> 8) % (TRAITS.length - 1))) % TRAITS.length;
  return [TRAITS[a]!, TRAITS[b]!];
}

export const lordWarlike = (world: World, k: number): boolean => lordTraits(world, k).includes("Warlike");

// ---------------------------------------------------------------- what each realm at war says, counted once a day

interface LordTally {
  lord: number;
  provinces: number;
  occupied: boolean;
  hungry: boolean;
  /** His Want: his own when set, else a foreign province on his lands' border, picked from his name. */
  want: string | undefined;
  wantScore: number;
}

interface RealmTally {
  lords: LordTally[];
  royal: wf.Voice[];
  capitalPeace: boolean;
  provinces: number;
}

const tallyCache = new WeakMap<World, Day>();
/** What one day's count holds: each realm's tally, and the voices and war cards worked out from it. */
interface Day {
  key: string;
  realms: Map<number, RealmTally>;
  voices: Map<string, Omit<PeaceVoices, "refused">>;
  views: Map<string, WarPeaceView | null>;
}
/** Grievance bits, read once on first use (moods.ts loads after this file in the import cycle). */
let bits: { hungry: number; royal: number[] } | undefined;
const grievanceBits = () =>
  (bits ??= {
    hungry: 1 << GRIEVANCES.indexOf("Hungry"),
    // Burned homes is not kept by the game yet; the war grievances it keeps count.
    royal: (P.royal_grievances as string[]).map((g) => GRIEVANCES.indexOf(g as (typeof GRIEVANCES)[number])).filter((i) => i >= 0),
  });

/**
 * One pass over the provinces of every realm at war, kept until the day, the
 * wars or the relations change: occupation moves a day at a time, so the
 * count never runs more than once a day however often it is read.
 */
function tallies(world: World): Map<number, RealmTally> {
  return today(world).realms;
}

function today(world: World): Day {
  const d = world.diplomacy;
  const key = `${world.day}|${d.wars.length}|${d.seq}|${d.graph.relations.length}`;
  const hit = tallyCache.get(world);
  if (hit && hit.key === key) return hit;
  const realms = new Map<number, RealmTally>();
  const lordAt = new Map<number, LordTally>();
  for (const w of d.wars) {
    for (const id of [...w.attackers, ...w.defenders]) {
      const n = world.nationIndex.get(id);
      if (n !== undefined && !realms.has(n)) realms.set(n, { lords: [], royal: [], capitalPeace: false, provinces: 0 });
    }
  }
  if (realms.size) {
    const { hungry: HUNGRY, royal: ROYAL_BITS } = grievanceBits();
    const capitals = new Map<number, number>();
    for (const n of realms.keys()) {
      const c = world.provinceIndex.get(world.rules.nations[n]!.capital);
      // A realm that has lost its capital speaks for peace as if it were occupied.
      if (c === undefined || world.provinceOwner[c] !== n) realms.get(n)!.capitalPeace = true;
      else capitals.set(n, c);
    }
    for (let p = 0; p < world.provinceCount; p++) {
      const n = world.provinceOwner[p]!;
      const r = n >= 0 ? realms.get(n) : undefined;
      if (!r) continue;
      r.provinces++;
      const occupied = world.provinceOccupier[p]! >= 0;
      if (capitals.get(n) === p) {
        r.capitalPeace = occupied || world.sieges.has(p);
        continue;
      }
      const k = world.provinceLord[p]!;
      if (k >= 0 && world.lords[k]?.nation === n) {
        let t = lordAt.get(k);
        if (!t) {
          const own = world.lords[k]!.want;
          t = { lord: k, provinces: 0, occupied: false, hungry: false, want: own, wantScore: own ? -1 : Infinity };
          lordAt.set(k, t);
          r.lords.push(t);
        }
        t.provinces++;
        if (occupied) t.occupied = true;
        if (world.provinceGrievances[p]! & HUNGRY) t.hungry = true;
        if (t.wantScore >= 0) {
          for (let j = world.adjStart[p]!; j < world.adjStart[p + 1]!; j++) {
            const q = world.adjList[j]!;
            const o = world.provinceOwner[q]!;
            if (o < 0 || o === n) continue;
            const s = fnv(`${world.lords[k]!.name}|${world.provinceIds[q]}`);
            if (s < t.wantScore) ((t.wantScore = s), (t.want = world.provinceIds[q]));
          }
        }
        continue;
      }
      // A royal province: peace with two of the war's grievances, or when occupied; else no voice.
      const g = world.provinceGrievances[p]!;
      let count = 0;
      for (const i of ROYAL_BITS) if (g & (1 << i)) count++;
      r.royal.push(occupied || count >= P.royal_grievances_needed ? "peace" : "none");
    }
  }
  const day: Day = { key, realms, voices: new Map(), views: new Map() };
  tallyCache.set(world, day);
  return day;
}

/** A lord's Want (REALM-070): his own when set, else a foreign province on his lands' border, the same while the borders stay. */
export function lordWant(world: World, k: number): string | undefined {
  const l = world.lords[k];
  if (!l) return undefined;
  if (l.want) return l.want;
  for (const r of tallies(world).values()) for (const t of r.lords) if (t.lord === k) return t.want;
  return undefined;
}

// ---------------------------------------------------------------- peace voices (WAR-180, WAR-221)

export interface PeaceVoices {
  nation: number;
  peace: number;
  war: number;
  none: number;
  total: number;
  /** Share saying peace, after a Warlike ruler's quarter and the fallen of ten years (REALM-096), 0 to 1. */
  share: number;
  obligation: wf.Obligation;
  /** Over half say peace: the ruler must take a peace asking only for land the enemy occupies and gold (WAR-181). */
  obliged: boolean;
  /** The ruler refused such a peace and pays for it each season (WAR-181). */
  refused: boolean;
}

export const warMonths = (world: World, war: dip.War): number => dip.monthsBetween(war.start, dip.monthOf(world.diplomacy.date));

/** The war has lasted long enough that lords who aren't Warlike tire of it (WAR-223). */
export const longWar = (world: World, war: dip.War): boolean => warMonths(world, war) >= P.long_war_years * 12;

/** A war's aim is fitting for taking land: it has one, and it is not a raid (WAR-178). */
export const fittingAim = (war: dip.War): boolean => war.aim !== "no_aim" && war.aim !== "raid";

function sideOf(war: dip.War, id: string): { ours: string[]; theirs: string[] } | null {
  if (war.attackers.includes(id)) return { ours: war.attackers, theirs: war.defenders };
  if (war.defenders.includes(id)) return { ours: war.defenders, theirs: war.attackers };
  return null;
}

/** Realm n's peace voices in this war (WAR-180): its lords, royal provinces and capital; a Warlike ruler ignores a quarter of the peace voices. */
export function peaceVoices(world: World, n: number, war: dip.War): PeaceVoices {
  const id = world.nationIds[n]!;
  const day = today(world);
  const k = `${war.id}|${n}`;
  let v = day.voices.get(k);
  if (!v) day.voices.set(k, (v = countRealm(world, n, war, day)));
  return { ...v, refused: !!(war as GameWar).refused?.includes(id) };
}

function countRealm(world: World, n: number, war: dip.War, day: Day): Omit<PeaceVoices, "refused"> {
  const id = world.nationIds[n]!;
  const r = day.realms.get(n) ?? { lords: [], royal: [], capitalPeace: false, provinces: 0 };
  const gw = war as GameWar;
  const side = sideOf(war, id);
  const wins = (ids: string[]) => ids.reduce((t, x) => t + (gw.wins?.[x] ?? 0), 0);
  const moreVictories = !!side && wins(side.ours) > wins(side.theirs);
  const attacking = war.attackers.includes(id);
  const leader = id === war.declarer || id === war.target;
  const months = warMonths(world, war);
  const lords: wf.LordVoiceState[] = r.lords.map((t) => {
    const warlike = lordWarlike(world, t.lord);
    const aimIsWant = attacking && war.aim === "take_land" && !!gw.aimProvince && t.want === gw.aimProvince;
    return {
      provinces: t.provinces,
      anyOccupied: t.occupied,
      loyalty: world.lords[t.lord]!.loyalty,
      landsHungry: t.hungry,
      warlike,
      aimIsWant,
      moreVictories,
      tired: leader && wf.tiredOfWar(months, { warlike, aimIsWant }),
    };
  });
  const c = wf.countVoices({ lords, royal: r.royal, capitalPeace: r.capitalPeace, warlikeRuler: world.rulers[n]?.traits.includes("Warlike") ?? false });
  const share = Math.min(1, c.peaceShare + fallenEffect(world, n).peace);
  const obligation = wf.obligation(share);
  return { nation: n, peace: c.peace, war: c.war, none: c.none, total: c.total, share, obligation, obliged: obligation !== "free" };
}

/** The share of realm n's voices saying peace in `war` (else its first war; at peace, what its fallen add). */
export function peaceShare(world: World, n: number, war?: dip.War): number {
  const w = war ?? dip.warOf(world.diplomacy, world.nationIds[n]!);
  // At peace only the fallen of ten years lean the realm toward peace (REALM-096).
  return w ? peaceVoices(world, n, w).share : Math.min(1, fallenEffect(world, n).peace);
}

// ---------------------------------------------------------------- how much one peace may take (WAR-227)

/** The most one peace may take from `loser` (a third of its provinces, rounded up), and how many it holds. */
export function maxCeded(world: World, loser: number): { max: number; of: number } {
  const r = tallies(world).get(loser);
  if (r) return wf.maxCeded(r.provinces);
  let of = 0;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === loser) of++;
  return wf.maxCeded(of);
}

/**
 * The provinces one peace takes from `loser` for realms `takers`: those they
 * occupy, at most maxCeded, the capital only when it is the loser's last
 * province. The asker's `picks` come first; then the land on the takers'
 * borders, then the most people, then the map's order: the same every time.
 */
export function cededProvinces(world: World, loser: number, takers: Iterable<number>, picks: readonly number[] = []): number[] {
  const by = new Set(takers);
  const { max, of } = maxCeded(world, loser);
  const capital = world.provinceIndex.get(world.rules.nations[loser]!.capital);
  const fits = (p: number) => world.provinceOwner[p] === loser && by.has(world.provinceOccupier[p]!) && (p !== capital || wf.capitalMayBeCeded(of));
  const out: number[] = [];
  for (const p of picks) if (out.length < max && p >= 0 && p < world.provinceCount && fits(p) && !out.includes(p)) out.push(p);
  if (out.length >= max) return out;
  const rest: { p: number; border: number; people: number }[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (!fits(p) || out.includes(p)) continue;
    const occ = world.provinceOccupier[p]!;
    let border = 0;
    for (let j = world.adjStart[p]!; j < world.adjStart[p + 1]!; j++) if (world.provinceOwner[world.adjList[j]!] === occ) border = 1;
    rest.push({ p, border, people: world.provincePopulation[p]! });
  }
  rest.sort((a, b) => b.border - a.border || b.people - a.people || a.p - b.p);
  for (const r of rest) {
    if (out.length >= max) break;
    out.push(r.p);
  }
  return out;
}

// ---------------------------------------------------------------- lords waver (WAR-178, WAR-179, WAR-181)

const LOYALTY_RANK = ["Loyal", "Wavering", "Disloyal", "In revolt"];

/** Runs a warfare rule over realm n's lords as the rule library sees them, and keeps the loyalty it gives them. */
function withLords(world: World, n: number, rule: (lords: (Lord & { warlike?: boolean })[]) => void, why: string, news: News[]): number {
  const ks: number[] = [];
  world.lords.forEach((l, k) => l.nation === n && ks.push(k));
  const views = ks.map((k) => {
    const l = world.lords[k]!;
    return { name: l.name, house: l.house, provinces: [], retinue: 0, wealth: 0, traits: lordTraits(world, k), loyalty: l.loyalty, sons: [] } as Lord & { warlike?: boolean };
  });
  rule(views);
  let worse = 0;
  ks.forEach((k, i) => {
    const l = world.lords[k]!;
    if (LOYALTY_RANK.indexOf(views[i]!.loyalty) > LOYALTY_RANK.indexOf(l.loyalty)) worse++;
    l.loyalty = views[i]!.loyalty;
  });
  if (worse && n === world.player) news.push({ kind: "unrest", text: `${worse} of your lord${worse === 1 ? "" : "s"} waver: ${why}.`, nations: [n] });
  return worse;
}

/** Land taken in a war with no fitting aim: the taker's lords who aren't Warlike waver a step (WAR-178). */
export function landTakenWithoutAim(world: World, n: number, provinces: number, news: News[]): void {
  withLords(world, n, (lords) => wf.noAimTaken(provinces, lords), "you took land in a war with no fitting aim", news);
}

/** A truce broken: every lord of the realm wavers a step (WAR-179). */
export function truceBroken(world: World, n: number, news: News[]): void {
  withLords(world, n, (lords) => wf.breakTruce(lords), "you broke a truce", news);
}

// ---------------------------------------------------------------- refusing an obliged peace (WAR-181)

/** Realm n turned down an offered peace: if its voices obliged it to take it, it pays each season until the obligation passes or the war ends. */
export function refusedPeace(world: World, n: number, war: dip.War, news: News[]): void {
  const v = peaceVoices(world, n, war);
  if (!v.obliged) return;
  const gw = war as GameWar;
  const id = world.nationIds[n]!;
  if (gw.refused?.includes(id)) return;
  (gw.refused ??= []).push(id);
  if (n === world.player) news.push({ kind: "unrest", text: `${Math.round(v.share * 100)} in 100 of your voices wanted that peace: each season of this war your lords lose a step of loyalty and your levies desert twice as fast.`, nations: [n] });
}

/** Realm n refuses an obliged peace in some war: its levies desert twice as fast (WAR-181). */
export function refusingPeace(world: World, n: number): boolean {
  const id = world.nationIds[n]!;
  return world.diplomacy.wars.some((w) => (w as GameWar).refused?.includes(id));
}

/**
 * The monthly check of refusals: a ruler whose voices no longer oblige him is
 * free again; each season the lords of one who still refuses lose a step (WAR-181).
 */
export function monthlyRefusals(world: World, news: News[]): void {
  const season = world.date.month % 3 === 0;
  for (const war of world.diplomacy.wars as GameWar[]) {
    if (!war.refused?.length) continue;
    war.refused = war.refused.filter((id) => {
      const n = world.nationIndex.get(id);
      return n !== undefined && peaceVoices(world, n, war).obliged;
    });
    if (!season) continue;
    for (const id of war.refused) {
      const n = world.nationIndex.get(id)!;
      withLords(world, n, (lords) => lords.forEach(wf.waver), "you refused a peace your voices obliged you to take", news);
    }
  }
}

/** A battle won counts toward its side's victories in the war between the two realms (WAR-180). */
export function noteWarVictory(world: World, winner: number, loser: number): void {
  const a = world.nationIds[winner]!;
  const b = world.nationIds[loser]!;
  const war = world.diplomacy.wars.find((w) => (w.attackers.includes(a) && w.defenders.includes(b)) || (w.attackers.includes(b) && w.defenders.includes(a))) as GameWar | undefined;
  if (!war) return;
  (war.wins ??= {})[a] = (war.wins[a] ?? 0) + 1;
}

// ---------------------------------------------------------------- the war card (WAR-230, WAR-231)

export interface WarPeaceView {
  /** The war's aim, as diplomacy names it ("no_aim", "take_land" …), and the province a Take land aim names. */
  aim: string;
  aimProvince?: number;
  months: number;
  /** Lords who aren't Warlike now say peace (WAR-223). */
  longWar: boolean;
  /** The two war leaders' peace voices. */
  voices: { attacker: PeaceVoices; defender: PeaceVoices };
  /** The most one peace may take from each war leader: the cap (a third, rounded up), its provinces, and what the other side could take now. */
  cede: { attacker: { max: number; of: number; now: number }; defender: { max: number; of: number; now: number } };
}

export function warPeaceView(world: World, war: dip.War): WarPeaceView | null {
  const day = today(world);
  if (!day.views.has(war.id)) day.views.set(war.id, buildView(world, war));
  const v = day.views.get(war.id)!;
  if (!v) return null;
  // Refusals change within the day; the rest is the day's count.
  const fresh = (x: PeaceVoices) => ({ ...x, refused: !!(war as GameWar).refused?.includes(world.nationIds[x.nation]!) });
  return { ...v, voices: { attacker: fresh(v.voices.attacker), defender: fresh(v.voices.defender) } };
}

function buildView(world: World, war: dip.War): WarPeaceView | null {
  const att = world.nationIndex.get(war.declarer);
  const def = world.nationIndex.get(war.target);
  if (att === undefined || def === undefined) return null;
  const idx = (ids: string[]) => ids.map((x) => world.nationIndex.get(x)!).filter((x) => x !== undefined);
  const cede = (loser: number, takers: number[]) => ({ ...maxCeded(world, loser), now: cededProvinces(world, loser, takers).length });
  const gw = war as GameWar;
  const aimProvince = gw.aimProvince !== undefined ? world.provinceIndex.get(gw.aimProvince) : undefined;
  return {
    aim: war.aim,
    ...(aimProvince !== undefined ? { aimProvince } : {}),
    months: warMonths(world, war),
    longWar: longWar(world, war),
    voices: { attacker: peaceVoices(world, att, war), defender: peaceVoices(world, def, war) },
    cede: { attacker: cede(att, idx(war.defenders)), defender: cede(def, idx(war.attackers)) },
  };
}
