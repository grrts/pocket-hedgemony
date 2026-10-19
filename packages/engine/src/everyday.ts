import data from "../../rules/data/domain/events-everyday.json" with { type: "json" };
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import type { EventCard } from "./events.ts";
import { Rng } from "./rng.ts";
import { houseMemberName } from "./names.ts";
import { LOYALTY, loyaltyStep, newHolder } from "./lords.ts";
import { OFFICIALS, officialAt, yearsServed } from "./officials.ts";
import { storeMonths } from "./food.ts";
import { child, dynastic, rulerLabel, throneLaw } from "./rulers.ts";
import { realmConfig } from "./domain/realm/index.ts";
import { setQuarantine } from "./plague.ts";

/**
 * Everyday events (events §5.22, EVT-115 to EVT-128; feedback 152): small
 * choices about the realm's own people and stores, drawn from what the game
 * already holds. An official dies, a lord dies or is hurt, feels slighted or
 * speaks well of you, two lords quarrel, a child is born, the heir falls ill,
 * grain rots in a store. Each realm draws one every few months (never while
 * the player has an event waiting); the AI answers at once, the player on the
 * same event card as the historical events.
 */

type Effect = { quarantine?: boolean; care?: boolean; gold?: number; loyalty?: string; who?: string; count?: number; official?: "new" | "seasoned"; lands?: "crown"; heir?: "child"; heir_risk?: number; food_back?: number; new_lord?: boolean };
type OptionDef = { id: string; name: string; needs?: string; ai: number; effects: Effect[] };
type EventDef = { weight: number; needs: string; loss?: number; title: string; text: string; options: OptionDef[] };

const DEFS = data.events as Record<string, EventDef>;
const IDS = Object.keys(DEFS);
/** The events a month may draw (plague comes only when it reaches a province), and their weights together. */
const DRAWN = IDS.filter((d) => DEFS[d]!.weight > 0);
const DRAWN_WEIGHT = DRAWN.reduce((a, d) => a + DEFS[d]!.weight, 0);
const UP = new Set(realmConfig.loyalty.up as string[]);
const R = realmConfig.ruler;

/** What an event fired for: the realm and who and where it is about. */
export interface EverydayEvent {
  /** "everyday:<n>", unique in the campaign, so the card and its answer find it. */
  id: string;
  def: string;
  nation: number;
  /** Month it fired (year × 12 + month − 1). */
  at: number;
  lord?: number;
  lord2?: number;
  province?: number;
  /** Food lost from the province's store, in thousands fed for a month. */
  loss?: number;
  /** A new son's or child's name, drawn when it fired. */
  name?: string;
  daughter?: boolean;
}

export interface EverydayState {
  /** Month each realm draws its next event, by realm index. */
  due: Int32Array;
  /** Events waiting for the player's answer, oldest first. */
  pending: EverydayEvent[];
  seq: number;
  /** Its own dice, so everyday events never shift the rest of the month's rolls. */
  rng: Rng;
}

const monthIndex = (world: World) => world.date.year * 12 + world.date.month - 1;
const between = (rng: Rng, [lo, hi]: readonly number[]) => lo! + Math.floor(rng.next() * (hi! - lo! + 1));

function createEveryday(world: World): EverydayState {
  const rng = new Rng((world.weatherSeed ^ 0xe7e2d) >>> 0);
  const now = monthIndex(world);
  // Realms start at different months, so their events don't all come at once.
  const due = Int32Array.from({ length: world.nationCount }, () => now + 1 + Math.floor(rng.next() * data.first_within_months));
  return { due, pending: [], seq: 0, rng };
}

const stateOf = (world: World): EverydayState => (world.everyday ??= createEveryday(world));

/** Lords of each realm who hold land, and the land each holds, counted once for the month. */
function landedLords(world: World): { byNation: Map<number, number[]>; lands: Int32Array } {
  const lands = new Int32Array(world.lords.length);
  for (let p = 0; p < world.provinceCount; p++) {
    const l = world.provinceLord[p]!;
    if (l >= 0 && world.provinceOwner[p] === world.lords[l]?.nation) lands[l] = lands[l]! + 1;
  }
  const byNation = new Map<number, number[]>();
  world.lords.forEach((l, k) => {
    if (l.nation < 0 || !lands[k] || l.loyalty === "In revolt") return;
    const list = byNation.get(l.nation);
    if (list) list.push(k);
    else byNation.set(l.nation, [k]);
  });
  return { byNation, lands };
}

/** Each realm's provinces, listed once for the month when any realm draws. */
function provincesBy(world: World): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0 || world.provinceWater[p]) continue;
    const list = out.get(o);
    if (list) list.push(p);
    else out.set(o, [p]);
  }
  return out;
}

interface Month {
  lords: ReturnType<typeof landedLords>;
  provinces: Map<number, number[]>;
}

const pick = <T>(rng: Rng, list: readonly T[]): T | undefined => (list.length ? list[Math.floor(rng.next() * list.length)] : undefined);
const rank = (world: World, k: number) => LOYALTY.indexOf(world.lords[k]!.loyalty);

/** Binds an event to a realm: who and where it is about, or null when the realm has nothing it could be about. */
function bind(world: World, s: EverydayState, m: Month, def: string, n: number): EverydayEvent | null {
  const d = DEFS[def]!;
  const rng = s.rng;
  const lords = m.lords.byNation.get(n) ?? [];
  const ev: EverydayEvent = { id: "", def, nation: n, at: monthIndex(world) };
  const ruler = world.rulers[n];
  switch (d.needs) {
    case "official": {
      const posts = (m.provinces.get(n) ?? []).filter((p) => world.provinceLord[p]! < 0 && world.provinceOfficial[p]! >= 0 && world.provinceOccupier[p]! < 0);
      const p = pick(rng, posts);
      if (p === undefined) return null;
      ev.province = p;
      break;
    }
    case "lord":
    case "lord_not_disloyal":
    case "lord_not_loyal": {
      const ok = lords.filter((k) => {
        const l = world.lords[k]!.loyalty;
        return d.needs === "lord" || (d.needs === "lord_not_disloyal" ? l === "Loyal" || l === "Wavering" : l === "Wavering" || l === "Disloyal");
      });
      const k = pick(rng, ok);
      if (k === undefined) return null;
      ev.lord = k;
      if (def === "lord_dies") ev.name = houseMemberName(world.rules, n, s.seq * 7919 + k, world.lords[k]!.house);
      break;
    }
    case "two_lords": {
      if (lords.length < 2) return null;
      const a = Math.floor(rng.next() * lords.length);
      const b = (a + 1 + Math.floor(rng.next() * (lords.length - 1))) % lords.length;
      ev.lord = lords[a]!;
      ev.lord2 = lords[b]!;
      return ev;
    }
    case "ruler_fertile": {
      const [from, to] = R.birth_ages;
      if (!ruler || ruler.regent || ruler.age < from! || ruler.age > to! || !dynastic(throneLaw(world, n))) return null;
      const c = child(world, n, 0);
      ev.name = c.name;
      ev.daughter = c.sex === "f";
      break;
    }
    case "young_heir":
      if (!ruler?.heir || ruler.heir.age >= R.child_under) return null;
      break;
    case "store": {
      const f = data.food;
      const full = (m.provinces.get(n) ?? []).filter((p) => world.provinceStore[p]! >= f.min_store && storeMonths(world, p) >= f.min_store_months);
      const p = pick(rng, full);
      if (p === undefined) return null;
      ev.province = p;
      ev.loss = world.provinceStore[p]! * (d.loss ?? 0);
      // The province's own lord, else another of the realm, is asked for grain.
      const own = world.provinceLord[p]!;
      const asked = own >= 0 && lords.includes(own) ? own : pick(rng, lords);
      if (asked !== undefined) ev.lord2 = asked;
      return ev;
    }
    default:
      return null;
  }
  // A second lord for the options that ask one: the least loyal other lord, who gains most.
  const others = lords.filter((k) => k !== ev.lord);
  if (others.length) ev.lord2 = others.reduce((a, b) => (rank(world, b) > rank(world, a) ? b : a));
  return ev;
}

/** The realm has no event waiting for the player, so a new one may come. */
function playerFree(world: World, s: EverydayState): boolean {
  if (s.pending.length) return false;
  const g = world.events;
  if (!g) return true;
  const me = g.treeId[world.player];
  // A decision the player may take or leave waits without end, so only an event that asks an answer holds new ones back.
  return !g.state.pending.some((p) => p.controller === me && p.kind === "fired");
}

/**
 * The month's everyday events (EVT-115 to EVT-118): each realm whose month has
 * come draws one of the events it could have, by weight. The AI answers at
 * once; the player's waits on a card. While the player has an event waiting,
 * no new one comes (EVT-117).
 */
export function monthlyEveryday(world: World, news: News[]): void {
  const s = stateOf(world);
  const now = monthIndex(world);
  let m: Month | null = null;
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n] || world.nationAsleep[n] || s.due[n]! > now) continue;
    if (n === world.player && !playerFree(world, s)) {
      s.due[n] = now + 1;
      continue;
    }
    s.due[n] = now + between(s.rng, data.months_between);
    m ??= { lords: landedLords(world), provinces: provincesBy(world) };
    // Draw by weight among the events this realm could have now. One that has nothing to be
    // about is set aside and the draw is made again among the rest, which picks with the same
    // odds as weighing only those that could come, while binding just the one or two drawn.
    const left = DRAWN.slice();
    let total = DRAWN_WEIGHT;
    while (left.length) {
      let roll = s.rng.next() * total;
      let k = 0;
      while (k < left.length - 1 && (roll -= DEFS[left[k]!]!.weight) >= 0) k++;
      const def = left[k]!;
      const ev = bind(world, s, m, def, n);
      if (ev) {
        fire(world, s, ev, news);
        break;
      }
      total -= DEFS[def]!.weight;
      left.splice(k, 1);
    }
  }
}

/** Fires one everyday event for a realm now, bound as the month would bind it (tests, scripted play); null when nothing fits. */
export function fireEverydayNow(world: World, def: string, n: number, news: News[]): EverydayEvent | null {
  const s = stateOf(world);
  const ev = bind(world, s, { lords: landedLords(world), provinces: provincesBy(world) }, def, n);
  if (ev) fire(world, s, ev, news);
  return ev;
}

function fire(world: World, s: EverydayState, ev: EverydayEvent, news: News[]): void {
  ev.id = `everyday:${++s.seq}`;
  // What happens whatever is chosen lands at once: the grain is gone.
  if (ev.province !== undefined && ev.loss) world.provinceStore[ev.province] = Math.max(0, world.provinceStore[ev.province]! - ev.loss);
  if (ev.nation !== world.player) {
    const options = openOptions(world, ev);
    let roll = s.rng.next() * options.reduce((a, o) => a + o.ai, 0);
    const o = options.find((x) => (roll -= x.ai) < 0) ?? options[options.length - 1]!;
    choose(world, s, ev, o, news);
    return;
  }
  s.pending.push(ev);
  news.push({ kind: "event", text: `${fill(world, ev, DEFS[ev.def]!.title)}: your answer is awaited.`, nations: [ev.nation], ...(ev.province !== undefined ? { province: ev.province } : {}) });
}

/**
 * Plague reaches a province of the player's (EVT-130): a card asks what to do,
 * unless one about plague already waits (the News tells of the rest). Plague
 * itself fires it; it is never drawn. The AI follows its own quarantine rule.
 */
export function plagueReached(world: World, p: number): void {
  const n = world.provinceOwner[p]!;
  if (n < 0 || n !== world.player) return;
  const s = stateOf(world);
  if (s.pending.some((e) => e.def === "plague_reaches")) return;
  const ev: EverydayEvent = { id: `everyday:${++s.seq}`, def: "plague_reaches", nation: n, at: monthIndex(world), province: p };
  s.pending.push(ev);
}

/** The options open to the realm: one that costs gold it lacks or asks a lord it has none of is hidden (EVT-120). */
function openOptions(world: World, ev: EverydayEvent): OptionDef[] {
  const d = DEFS[ev.def]!;
  const gold = world.nationTreasury[ev.nation]!;
  return d.options.filter((o) => (o.needs !== "lord2" || ev.lord2 !== undefined) && o.effects.every((e) => !(e.gold !== undefined && e.gold < 0 && gold < -e.gold)));
}

/** The player answers an everyday event (AnswerEvent). */
export function answerEveryday(world: World, nation: number, event: string, option: string, news: News[]): string | null {
  const s = world.everyday;
  const ev = s?.pending.find((e) => e.id === event && e.nation === nation);
  if (!s || !ev) return "no such event waits for you";
  const o = openOptions(world, ev).find((x) => x.id === option);
  if (!o) return "that choice is not open to you";
  s.pending = s.pending.filter((e) => e !== ev);
  choose(world, s, ev, o, news);
  return null;
}

/** Lords an effect lands on. */
function targets(world: World, ev: EverydayEvent, e: Effect): number[] {
  const mine = (k: number) => world.lords[k]?.nation === ev.nation;
  switch (e.who) {
    case "lord":
      return ev.lord !== undefined && mine(ev.lord) ? [ev.lord] : [];
    case "lord2":
      return ev.lord2 !== undefined && mine(ev.lord2) ? [ev.lord2] : [];
    case "other_lords":
      return world.lords.flatMap((l, k) => (k !== ev.lord && l.nation === ev.nation && l.loyalty !== "In revolt" ? [k] : []));
    case "least_loyal_lords": {
      const all = world.lords.flatMap((l, k) => (l.nation === ev.nation && l.loyalty !== "In revolt" && l.loyalty !== "Loyal" ? [k] : []));
      return all.sort((a, b) => rank(world, b) - rank(world, a)).slice(0, e.count ?? 1);
    }
    default:
      return [];
  }
}

function choose(world: World, s: EverydayState, ev: EverydayEvent, o: OptionDef, news: News[]): void {
  const n = ev.nation;
  const mine = n === world.player;
  const told: string[] = [];
  for (const e of o.effects) {
    if (e.gold !== undefined) world.nationTreasury[n] = world.nationTreasury[n]! + e.gold;
    if (e.loyalty) for (const k of targets(world, ev, e)) loyaltyStep(world, k, e.loyalty, mine ? news : []);
    if (e.official && ev.province !== undefined && world.provinceOwner[ev.province] === n && world.provinceOfficial[ev.province]! >= 0) {
      const p = ev.province;
      // A new man in the post: a fresh name; the deputy starts at half his effect, a seasoned man keeps the post's years.
      world.provinceOfficialSeed[p] = (p + world.day * 31 + s.seq) % world.provinceCount;
      world.provinceOfficialFrom[p] = -1;
      if (e.official === "new") world.provinceOfficialSince[p] = world.day;
    }
    if (e.new_lord && ev.lord !== undefined && ev.name) {
      const l = world.lords[ev.lord]!;
      l.name = ev.name;
      l.upCredit = 0;
      delete l.traits;
      delete l.want;
      newHolder(l);
    }
    if (e.lands === "crown" && ev.lord !== undefined) {
      for (let p = 0; p < world.provinceCount; p++) if (world.provinceLord[p] === ev.lord) world.provinceLord[p] = -1;
      // His son keeps his name and stays at court with no land (PROV-201).
      if (ev.name) world.lords[ev.lord]!.name = ev.name;
    }
    if (e.heir === "child" && ev.name) {
      const r = world.rulers[n]!;
      if (!r.heir && dynastic(throneLaw(world, n))) {
        r.heir = { name: ev.name, age: 0, sex: ev.daughter ? "f" : "m", relation: "child" };
        told.push(`${ev.name} is your heir.`);
      }
    }
    if (e.heir_risk && s.rng.next() < e.heir_risk) {
      const r = world.rulers[n]!;
      if (r.heir) {
        told.push(`${r.heir.name} did not live.`);
        r.heir = null;
      }
    } else if (e.heir_risk) told.push(`${world.rulers[n]!.heir?.name ?? "The heir"} recovers.`);
    if (e.quarantine && ev.province !== undefined) setQuarantine(world, n, ev.province, true, mine ? news : []);
    if (e.care && ev.province !== undefined && world.provincePlague[ev.province]) world.provincePlagueCare[ev.province] = 1;
    if (e.food_back && ev.province !== undefined && ev.loss) world.provinceStore[ev.province] = world.provinceStore[ev.province]! + ev.loss * e.food_back;
  }
  if (mine) {
    const d = DEFS[ev.def]!;
    news.push({ kind: "event", text: `${fill(world, ev, d.title)}: you chose “${fill(world, ev, o.name)}”.${told.length ? ` ${told.join(" ")}` : ""}`, nations: [n], ...(ev.province !== undefined ? { province: ev.province } : {}) });
  }
}

// ---------------------------------------------------------------- the card

const lordName = (world: World, k: number | undefined) => (k === undefined ? "a lord" : (world.lords[k]?.name ?? "a lord"));

/** Fills `{words}` in an event's text with who and where it is about. */
function fill(world: World, ev: EverydayEvent, text: string): string {
  const r = world.rulers[ev.nation];
  const p = ev.province;
  const words: Record<string, () => string> = {
    lord: () => lordName(world, ev.lord),
    lord2: () => lordName(world, ev.lord2),
    house: () => (ev.lord === undefined ? "" : world.lords[ev.lord]!.house),
    son: () => ev.name ?? "his son",
    lands: () => {
      let k = 0;
      for (let q = 0; q < world.provinceCount; q++) if (world.provinceLord[q] === ev.lord) k++;
      return k === 1 ? "one province" : `${k} provinces`;
    },
    province: () => (p === undefined ? "" : world.rules.provinces[p]!.name),
    official: () => (p === undefined ? "Your official" : (officialAt(world, p) ?? "Your official")),
    type: () => (p === undefined ? "official" : (OFFICIALS[world.provinceOfficial[p]!]?.toLowerCase() ?? "official")),
    years: () => String(p === undefined ? 0 : Math.max(1, Math.round(yearsServed(world, p)))),
    loss: () => (p === undefined || !ev.loss ? "0" : String(Math.max(1, Math.round(ev.loss / Math.max(1e-6, world.provincePopulation[p]!))))),
    ruler: () => (r ? rulerLabel(r) : "your ruler"),
    child: () => (ev.daughter ? "daughter" : "son"),
    childName: () => ev.name ?? "",
    heir: () => r?.heir?.name ?? "your heir",
    heirAge: () => String(r?.heir?.age ?? 0),
  };
  return text.replace(/\{(\w+)\}/g, (all, k: string) => words[k]?.() ?? all);
}

/** One effect in words for the card, or null when it says nothing the player needs. */
function describe(world: World, ev: EverydayEvent, e: Effect, o: OptionDef): string | null {
  if (e.gold !== undefined) return `You: gold ${e.gold > 0 ? "+" : "−"}${Math.abs(e.gold)}`;
  if (e.loyalty) {
    const more = UP.has(e.loyalty) ? "more" : "less";
    switch (e.who) {
      case "lord":
        // After a lord's death the step falls on his son, who holds the lands by then.
        return `${o.effects.some((x) => x.new_lord) && ev.name ? ev.name : lordName(world, ev.lord)}: a step ${more} loyal`;
      case "lord2":
        return `${lordName(world, ev.lord2)}: a step ${more} loyal`;
      case "other_lords":
        return `Your other lords: a step ${more} loyal`;
      case "least_loyal_lords":
        return `Your ${e.count && e.count > 1 ? `${e.count} least loyal lords` : "least loyal lord"}: a step ${more} loyal`;
    }
  }
  if (e.official === "new") return "The new man starts at half the post's effect";
  if (e.official === "seasoned") return "The post keeps its full effect";
  if (e.new_lord && ev.lord !== undefined) return `${ev.name ?? "His son"} holds the lands, ${world.lords[ev.lord]!.loyalty.toLowerCase()} as his father was`;
  if (e.lands === "crown") return `His ${fill(world, ev, "{lands}")} become royal land`;
  if (e.heir === "child") {
    const r = world.rulers[ev.nation];
    return r && !r.heir && dynastic(throneLaw(world, ev.nation)) ? `${ev.name} becomes your heir` : null;
  }
  if (e.heir_risk) return `${Math.round(e.heir_risk * 10)} in 10 that ${world.rulers[ev.nation]?.heir?.name ?? "the heir"} dies`;
  if (e.quarantine) return "Its trade stops and its tax falls by half until you lift the quarantine; plague gets in and out far less";
  if (e.care) return "Half as many die, and the outbreak lasts the shortest time";
  if (e.food_back) return `${e.food_back === 0.5 ? "Half" : `${Math.round(e.food_back * 100)}%`} of the lost grain is made good`;
  return null;
}

/** The player's waiting everyday events as event cards (EVT-121). */
export function everydayCards(world: World, n: number): EventCard[] {
  const s = world.everyday;
  if (!s || n < 0) return [];
  return s.pending
    .filter((ev) => ev.nation === n)
    .map((ev) => {
      const d = DEFS[ev.def]!;
      const always = ev.province !== undefined && ev.loss ? [`${world.rules.provinces[ev.province]!.name}: ${fill(world, ev, "{loss}")} months of grain lost`] : [];
      return {
        event: ev.id,
        title: fill(world, ev, d.title),
        text: fill(world, ev, d.text),
        year: null,
        major: false,
        kind: "fired" as const,
        everyday: true,
        always,
        options: openOptions(world, ev).map((o) => ({
          id: o.id,
          name: fill(world, ev, o.name),
          historical: false,
          effects: o.effects.flatMap((e) => describe(world, ev, e, o) ?? []),
        })),
        ...(ev.province !== undefined ? { province: ev.province } : {}),
      };
    });
}

// ---------------------------------------------------------------- saves

export interface SavedEveryday {
  /** Month each realm draws next, by realm id. */
  due: Record<string, number>;
  pending: EverydayEvent[];
  seq: number;
  rng: number[];
}

export function saveEveryday(world: World): SavedEveryday | undefined {
  const s = world.everyday;
  if (!s) return undefined;
  return { due: Object.fromEntries(world.nationIds.map((id, n) => [id, s.due[n]!])), pending: s.pending, seq: s.seq, rng: [...s.rng.state] };
}

/** Puts saved everyday events back; a save from before them starts the draws afresh. */
export function restoreEveryday(world: World, saved: SavedEveryday | undefined): void {
  if (!saved) {
    delete world.everyday;
    return;
  }
  const s = createEveryday(world);
  for (const [id, m] of Object.entries(saved.due)) {
    const n = world.nationIndex.get(id);
    if (n !== undefined) s.due[n] = m;
  }
  s.pending = saved.pending;
  s.seq = saved.seq;
  s.rng = new Rng(Uint32Array.from(saved.rng));
  world.everyday = s;
}
