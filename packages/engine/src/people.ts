import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as wf from "./domain/warfare/index.ts";
import { ageFrom, deathChance, PEOPLE, type PersonKind } from "./mortality.ts";
import { houseMemberName, mix } from "./names.ts";
import { regentOf, rulerLabel, yearlyRulers } from "./rulers.ts";
import { rulerDies } from "./crowns.ts";
import { hireGold, officialAt, OFFICIALS } from "./officials.ts";
import { realmTitles } from "./government.ts";
import { lordOfCommander, newHolder } from "./lords.ts";

/**
 * People in play (REALM-270 to REALM-279): every person the game names, the
 * ruler and his heir, lords and their heirs, officials, commanders and
 * admirals, and colonial governors, ages a year each January and dies with
 * the chance of his age from one table (mortality.ts). A death of any cause
 * (old age, battle, an assassin, an event) goes through personDies, which
 * runs that kind's own succession and then tells every listener, so the
 * armies going home, the events and the news all hang on one hook.
 */

export type { PersonKind } from "./mortality.ts";

/** Who: the realm for a ruler or heir, the lord's index, the province of an official's post, the commander's index, the governor's id. */
export type PersonRef =
  | { kind: "ruler"; n: number }
  | { kind: "heir"; n: number }
  | { kind: "lord"; lord: number }
  | { kind: "official"; p: number }
  | { kind: "commander"; c: number }
  | { kind: "governor"; id: number };

export type DeathCause = "old age" | "battle" | "at sea" | "assassinated" | "illness" | "event";

/** A death as listeners hear of it: who he was, as he was the moment before. */
export interface PersonDeath {
  who: PersonRef;
  /** The realm he served or ruled. */
  nation: number;
  name: string;
  age: number;
  cause: DeathCause;
  /** An official's post as he left it: its type (an OFFICIALS index) and the day he took it, for whoever fills it next. */
  post?: { type: number; since: number };
  /** A commander's army slot and fleet id the moment before he died, -1 for none: what is left without a leader (leaderless.ts). */
  led?: { army: number; fleet: number };
}

export type DeathListener = (world: World, death: PersonDeath, news: News[]) => void;

/**
 * The listeners, kept on a function rather than a module constant: a module
 * that people.ts itself loads (through officials, recruiting and the turn) may
 * hang its reaction while this file is still loading.
 */
function listeners(): DeathListener[] {
  const store = listeners as { list?: DeathListener[] };
  return (store.list ??= []);
}

/** Hangs a reaction on every death (an army going home, an event, a dispatch); returns a function that takes it off again. */
export function onPersonDeath(fn: DeathListener): () => void {
  listeners().push(fn);
  return () => {
    const k = listeners().indexOf(fn);
    if (k >= 0) listeners().splice(k, 1);
  };
}

const K = PEOPLE.kinds;
const dice = (world: World) => world.rulerRng.next();

// ---------------------------------------------------------------- ages

/** A lord's age and heir, drawn from his index the first time the game needs them (seeded lords, lords made later, older saves). */
function ensureLord(world: World, k: number): void {
  const l = world.lords[k]!;
  if (l.age !== undefined) return;
  const h = mix(k + 1, 0x10d5);
  l.age = ageFrom(h, K.lord.start_age);
  const [gapLo, gapHi] = K.lord.heir_age_gap;
  const heirAge = l.age - ageFrom(mix(h, 2), [gapLo!, gapHi!]);
  l.heir = (mix(h, 1) % 1000) / 1000 < K.lord.heir_at_start && heirAge >= 0 ? { name: houseMemberName(world.rules, l.nation, mix(h, 3), l.house), age: heirAge } : null;
}

/** The age of the official at province p's post: drawn from his name's seed when he took a new post, then a year older each January. */
export function officialAge(world: World, p: number): number {
  const stored = world.provinceOfficialAge[p]!;
  return stored > 0 ? stored : ageFrom(mix(world.provinceOfficialSeed[p]! + 1, 0x0ff1), K.official.hire_age);
}

/** A lord's age (his heir's too), for the Lords tab. */
export function lordAge(world: World, k: number): { age: number; heir: { name: string; age: number } | null } {
  ensureLord(world, k);
  const l = world.lords[k]!;
  return { age: l.age!, heir: l.heir ?? null };
}

/**
 * Ages for the people of 1444 (REALM-274): lords, officials and commanders
 * get an age (and a lord perhaps an heir) from a hash of who they are, so
 * every game with the same start agrees and no other roll shifts.
 */
export function seedPeople(world: World): void {
  for (let k = 0; k < world.lords.length; k++) ensureLord(world, k);
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOfficial[p]! >= 0) world.provinceOfficialAge[p] = ageFrom(mix(p + 1, 0x0ff0), K.official.start_age);
  }
  for (let c = 0; c < world.commanders.length; c++) world.commanders[c]!.age = ageFrom(mix(c + 1, 0xc0de), K.commander.start_age);
}

// ---------------------------------------------------------------- who dies

const placeName = (world: World, p: number) => world.rules.provinces[p]!.name;

/** Who a reference names now, or null if no one holds it. */
function describe(world: World, who: PersonRef): Omit<PersonDeath, "who" | "cause"> | null {
  switch (who.kind) {
    case "ruler": {
      const r = world.rulers[who.n];
      return r && !world.nationGone[who.n] ? { nation: who.n, name: rulerLabel(r), age: r.age } : null;
    }
    case "heir": {
      const h = world.rulers[who.n]?.heir;
      return h ? { nation: who.n, name: h.name, age: h.age } : null;
    }
    case "lord": {
      const l = world.lords[who.lord];
      if (!l || l.gone) return null;
      ensureLord(world, who.lord);
      return { nation: l.nation, name: l.name, age: l.age! };
    }
    case "official": {
      const n = world.provinceOwner[who.p]!;
      const name = officialAt(world, who.p);
      return name && n >= 0 ? { nation: n, name, age: officialAge(world, who.p), post: { type: world.provinceOfficial[who.p]!, since: world.provinceOfficialSince[who.p]! } } : null;
    }
    case "commander": {
      const n = world.commanderOwner[who.c]!;
      const c = world.commanders[who.c];
      return c && n >= 0 ? { nation: n, name: c.name, age: c.age } : null;
    }
    case "governor": {
      const g = world.explore.governors.find((x) => x.id === who.id);
      return g ? { nation: g.owner, name: g.name, age: g.age } : null;
    }
  }
}

const how = (cause: DeathCause, age: number) => (cause === "old age" ? `dies at ${age}` : cause === "battle" ? `falls in battle at ${age}` : cause === "at sea" ? `is lost at sea at ${age}` : cause === "assassinated" ? `is murdered at ${age}` : cause === "illness" ? `dies of a fever at ${age}` : `dies at ${age}`);

/** The heir dies before his father (REALM-272): the ruler is heirless until a child is born. */
function heirDies(world: World, n: number, d: Omit<PersonDeath, "who">, news: News[]): void {
  world.rulers[n]!.heir = null;
  if (n === world.player) news.push({ kind: "ruler", text: `Your heir, ${d.name}, ${how(d.cause, d.age)}. ${rulerLabel(world.rulers[n]!)} has no heir now: should the ruler die, the lords will dispute the throne.`, nations: [n] });
}

/**
 * A lord dies (REALM-079, REALM-082, REALM-273): his heir takes his lands,
 * his loyalty and his want, under his own name and with traits of his own;
 * with none, his line dies out and his lands return to the crown as royal
 * provinces whose posts stand empty. A regent who dies is replaced.
 */
function lordDies(world: World, k: number, d: Omit<PersonDeath, "who">, news: News[]): void {
  const l = world.lords[k]!;
  const n = l.nation;
  const title = n === world.player ? realmTitles(world)[n]!.lord : "lord";
  // With no son, a brother or cousin of the house may still take the lands (`people.kinds.lord.kinsman_share`).
  const son = l.heir;
  const heir = son ?? (dice(world) < K.lord.kinsman_share ? { name: houseMemberName(world.rules, n, mix(k + 1, world.day + 7), l.house), age: ageFrom(mix(k + 1, world.day), K.lord.kinsman_age) } : null);
  if (heir) {
    l.name = heir.name;
    l.age = heir.age;
    l.heir = null;
    l.upCredit = 0;
    delete l.traits;
    newHolder(l);
    if (n === world.player) news.push({ kind: "ruler", text: `${d.name}, ${title} of the house of ${l.house}, ${how(d.cause, d.age)}. His ${heir === son ? "heir" : "kinsman"} ${l.name}, ${l.age}, holds his lands now.`, nations: [n] });
  } else {
    l.gone = true;
    l.heir = null;
    const lands: number[] = [];
    for (let p = 0; p < world.provinceCount; p++) {
      if (world.provinceLord[p] !== k) continue;
      world.provinceLord[p] = -1;
      // His officials served him: the crown's new provinces need officials of their own (REALM-082).
      world.provinceOfficial[p] = -1;
      world.provinceOfficialFrom[p] = -1;
      world.provinceOfficialSince[p] = world.day;
      world.provinceOfficialAge[p] = 0;
      lands.push(p);
    }
    if (n !== world.player) for (const p of lands) refillPost(world, p);
    if (n === world.player) news.push({ kind: "ruler", text: `${d.name}, ${title} of the house of ${l.house}, ${how(d.cause, d.age)}, the last of his line. ${lands.length ? `${lands.map((p) => placeName(world, p)).join(", ")} return${lands.length === 1 ? "s" : ""} to the crown as royal land, with ${lands.length === 1 ? "its post" : "their posts"} empty.` : "He held no land."}`, nations: [n], ...(lands.length ? { province: lands[0]! } : {}) });
  }
  // His command (WAR-252): his heir leads his men on; with his line gone, the men have no lord and go home.
  const c = l.commander;
  if (c !== undefined && world.commanderOwner[c]! >= 0) {
    const cmd = world.commanders[c]!;
    if (heir) {
      cmd.name = heir.name;
      cmd.age = heir.age;
    } else {
      world.commanderOwner[c] = -1;
      for (let i = 0; i < world.armies.count; i++) if (world.armies.commander[i] === c) world.armies.commander[i] = -1;
      delete l.commander;
    }
  }
  const r = world.rulers[n];
  if (r?.regent === d.name) r.regent = regentOf(world, n);
}

/**
 * An AI realm, or a lord, fills a dead official's post at once with a new man
 * of the same type (REALM-275, `people.ai_refills_posts`): a lord's man costs
 * the crown nothing, a royal post the hire price if the treasury has it.
 */
function refillPost(world: World, p: number, type = OFFICIALS.indexOf("Warden")): void {
  const n = world.provinceOwner[p]!;
  if (!PEOPLE.ai_refills_posts || n < 0 || world.provinceOccupier[p]! >= 0) return;
  if (world.provinceLord[p]! < 0) {
    const gold = hireGold(false);
    if (world.nationTreasury[n]! < gold) return;
    world.nationTreasury[n] = world.nationTreasury[n]! - gold;
  }
  world.provinceOfficial[p] = type;
  world.provinceOfficialSeed[p] = (p + world.day * 31) % world.provinceCount;
  world.provinceOfficialSince[p] = world.day;
  world.provinceOfficialFrom[p] = -1;
  world.provinceOfficialAge[p] = 0;
}

/** An official dies at his post (PROV-194, REALM-275): it stands empty for the player to fill; an AI realm or a lord fills it at once. */
function officialDies(world: World, p: number, d: Omit<PersonDeath, "who">, news: News[]): void {
  const type = world.provinceOfficial[p]!;
  world.provinceOfficial[p] = -1;
  world.provinceOfficialFrom[p] = -1;
  world.provinceOfficialSince[p] = world.day;
  world.provinceOfficialAge[p] = 0;
  const lords = world.provinceLord[p]! >= 0;
  if (d.nation !== world.player || lords) return refillPost(world, p, type);
  const title = realmTitles(world)[d.nation]!.official;
  news.push({ kind: "raised", text: `${d.name}, ${OFFICIALS[type]!.toLowerCase()} of ${placeName(world, p)}, ${how(d.cause, d.age)}. The ${title}'s post stands empty: hire a new one on the province card.`, nations: [d.nation], province: p });
}

/** A commander dies (WAR-062, REALM-276): he leaves the realm's service, and the army or fleet he led is left without a leader. */
function commanderDies(world: World, c: number, d: Omit<PersonDeath, "who">, news: News[]): void {
  world.commanderOwner[c] = -1;
  const a = world.armies;
  let led = "";
  for (let i = 0; i < a.count; i++) if (a.alive[i] && a.commander[i] === c) (a.commander[i] = -1), (led = "his army");
  for (const f of world.navy.fleets) if (f.admiral === c) (f.admiral = -1), (led = "his fleet");
  if (d.nation === world.player) news.push({ kind: "raised", text: `${d.name} ${how(d.cause, d.age)}.${led ? ` ${led[0]!.toUpperCase()}${led.slice(1)} has no commander now.` : ""}`, nations: [d.nation] });
}

/** A colonial governor dies (EXPL-028, D-EXPL-10): his slot frees, and a colony he was founding is lost with him. */
function governorDies(world: World, id: number, d: Omit<PersonDeath, "who">, news: News[]): void {
  const e = world.explore;
  e.governors = e.governors.filter((g) => g.id !== id);
  if (d.nation === world.player) news.push({ kind: "colony", text: `${d.name}, your colonial governor, ${how(d.cause, d.age)}.`, nations: [d.nation] });
}

/**
 * The one path for a death of any cause (REALM-270): the kind's own
 * succession first, then every listener with who he was. Nothing happens if
 * no one holds the reference any more.
 */
export function personDies(world: World, who: PersonRef, cause: DeathCause, news: News[]): void {
  // A lord leading his own retinue is one man: his death as a commander is the lord's death (WAR-252).
  const lord = who.kind === "commander" ? lordOfCommander(world, who.c) : -1;
  if (lord >= 0) return personDies(world, { kind: "lord", lord }, cause, news);
  const d = describe(world, who);
  if (!d) return;
  const death: PersonDeath = { who, cause, ...d, ...(who.kind === "commander" ? { led: ledBy(world, who.c) } : {}) };
  switch (who.kind) {
    case "ruler":
      rulerDies(world, who.n, news);
      break;
    case "heir":
      heirDies(world, who.n, death, news);
      break;
    case "lord":
      lordDies(world, who.lord, death, news);
      break;
    case "official":
      officialDies(world, who.p, death, news);
      break;
    case "commander":
      commanderDies(world, who.c, death, news);
      break;
    case "governor":
      governorDies(world, who.id, death, news);
      break;
  }
  for (const fn of [...listeners()]) fn(world, death, news);
}

/** The army and fleet a commander leads, -1 for none. */
function ledBy(world: World, c: number): { army: number; fleet: number } {
  const a = world.armies;
  let army = -1;
  for (let i = 0; i < a.count && army < 0; i++) if (a.alive[i] && a.commander[i] === c) army = i;
  return { army, fleet: world.navy.fleets.find((f) => f.admiral === c)?.id ?? -1 };
}

/** The losing commander of a battle may fall (WAR-062, REALM-276): 1 in 20, twice that when Reckless. */
export function battleDeath(world: World, c: number, news: News[]): void {
  if (c < 0 || world.commanderOwner[c]! < 0) return;
  const B = PEOPLE.battle_death;
  const chance = B.loser * (wf.hasTrait(world.commanders[c], "Reckless") ? B.reckless_mult : 1);
  if (dice(world) < chance) personDies(world, { kind: "commander", c }, "battle", news);
}

// ---------------------------------------------------------------- each January

const rolls = (world: World, age: number, kind: PersonKind) => dice(world) < deathChance(age, kind);

/**
 * Each January (REALM-271): everyone ages a year and may die of it, rulers
 * and heirs first (rulers.ts), then lords and their heirs, officials,
 * commanders and governors; lords of an age to have children may gain an heir.
 */
export function yearlyPeople(world: World, news: News[]): void {
  if (world.date.month !== 1) return;
  yearlyRulers(world, news, (kind, n) => personDies(world, { kind, n }, "old age", news));
  const L = K.lord;
  for (let k = 0; k < world.lords.length; k++) {
    const l = world.lords[k]!;
    if (l.gone || world.nationGone[l.nation]) continue;
    ensureLord(world, k);
    l.age!++;
    if (l.heir) {
      l.heir.age++;
      if (rolls(world, l.heir.age, "heir")) l.heir = null;
    }
    if (rolls(world, l.age!, "lord")) {
      personDies(world, { kind: "lord", lord: k }, "old age", news);
      continue;
    }
    if (!l.heir && l.age! >= L.birth_ages[0]! && l.age! <= L.birth_ages[1]! && dice(world) < L.birth_per_year) l.heir = { name: houseMemberName(world.rules, l.nation, mix(k + 1, world.day), l.house), age: 0 };
  }
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOfficial[p]! < 0 || world.provinceOwner[p]! < 0) continue;
    const age = officialAge(world, p) + 1;
    world.provinceOfficialAge[p] = Math.min(255, age);
    if (rolls(world, age, "official")) personDies(world, { kind: "official", p }, "old age", news);
  }
  for (let c = 0; c < world.commanders.length; c++) {
    if (world.commanderOwner[c]! < 0) continue;
    const cmd = world.commanders[c]!;
    // A lord's own command is the lord himself: his age, and his roll above (WAR-252).
    const lord = lordOfCommander(world, c);
    if (lord >= 0) cmd.age = world.lords[lord]!.age! - 1;
    // Past 60 Might and past 65 Cunning fall a step every 5 years (WAR-051, WAR-053).
    wf.birthday(cmd);
    world.commanderLogistics[c] = cmd.logistics;
    if (lord < 0 && rolls(world, cmd.age, "commander")) personDies(world, { kind: "commander", c }, "old age", news);
  }
  for (const g of [...world.explore.governors]) {
    g.age++;
    if (rolls(world, g.age, "governor")) personDies(world, { kind: "governor", id: g.id }, "old age", news);
  }
}
