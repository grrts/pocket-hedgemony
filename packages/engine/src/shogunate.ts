import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import { cedeProvince, checkDestroyed, strength, type News } from "./war.ts";
import { formOf, setForm } from "./government.ts";
import { inAnyWar, lordLands, LOYALTY } from "./lords.ts";
import { spareSleepers, wakeRealm } from "./sleeping.ts";
import { eventFired } from "./institutions.ts";
import { fireEventNow } from "./events.ts";
import { realmConfig } from "./domain/realm/index.ts";
import { isSeasonEnd } from "./domain/subjects/index.ts";
import * as dip from "./domain/diplomacy/index.ts";
import * as inst from "./domain/institutions/index.ts";

/**
 * The Shogunate in the game (institutions slice 3, INST-060 to INST-069,
 * INST-082): Japan's great houses are its lords; hold moves with revolts,
 * heirs, unhappy wars and summoned houses; each season the houses read the
 * hold; at hold 0, or when the shogun loses the Court's province, each house
 * wakes as its own warlord domain (its sleeping realm) and `onin_war` fires.
 * While the office is vacant the warlord domains of Japan are its members,
 * and one that holds the Court and over half of Japan may ask the Court.
 */

const S = inst.S;
const rel = dip.relations;

const idx = (world: World, id: string) => world.nationIndex.get(id) ?? -1;
const nameOf = (world: World, n: number) => world.rules.nations[n]!.name;
const date = (world: World) => world.diplomacy.date;
const court = (world: World) => world.provinceIndex.get(S.court_province) ?? -1;

/** The realm data's seated houses of Japan, by house name: the sleeping realm each wakes as (D-INST-1). */
const HOUSE_REALM = new Map(
  Object.entries((realmConfig.starting_lords.house_lands as unknown as Record<string, Record<string, { name: string }>>)[S.holder_1444] ?? {}).map(([id, h]) => [h.name, id]),
);

/** The Shogunate of 1444 (INST-060), after the lords are seeded. */
export function seedShogunate(world: World): void {
  const n = idx(world, S.holder_1444);
  if (n < 0 || formOf(world, n) !== "shogunate") return;
  const land: string[] = [];
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && !world.provinceWater[p]) land.push(world.provinceIds[p]!);
  world.shogunate = inst.startShogunate(S.holder_1444, land, date(world));
}

/** The shogun's realm, or -1 while the office is vacant. */
export function shogunOf(world: World): number {
  const s = world.shogunate;
  return s?.holder && !s.ended ? idx(world, s.holder) : -1;
}

/** The great houses: the shogun's lords who hold land (INST-060). */
export function housesOf(world: World): number[] {
  const n = shogunOf(world);
  if (n < 0) return [];
  const landed = new Set<number>();
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.provinceLord[p]! >= 0) landed.add(world.provinceLord[p]!);
  return [...landed].filter((k) => world.lords[k]!.nation === n).sort((a, b) => a - b);
}

/** Members while the office is vacant: every warlord domain whose capital is in Japan (INST-066). */
export function vacantMembers(world: World): number[] {
  const s = world.shogunate;
  if (!s || s.ended || s.holder) return [];
  const land = new Set(s.land);
  const out: number[] = [];
  for (let n = 0; n < world.nationCount; n++) if (!world.nationGone[n] && formOf(world, n) === "warlord_domain" && land.has(world.rules.nations[n]!.capital)) out.push(n);
  return out;
}

/** Japan's land provinces a realm owns or holds as subjects (INST-066). */
export function japanHeld(world: World, n: number): number {
  const s = world.shogunate;
  if (!s) return 0;
  const id = world.nationIds[n]!;
  let held = 0;
  for (const pid of s.land) {
    const o = world.provinceOwner[world.provinceIndex.get(pid)!]!;
    if (o < 0) continue;
    if (o === n || rel.overlord(world.diplomacy.graph, world.nationIds[o]!) === id) held++;
  }
  return held;
}

/** Moves a house one loyalty step, never past Disloyal: going into revolt is a rising (realm). */
function step(world: World, lord: number, by: 1 | -1, why: string, news: News[]): void {
  const l = world.lords[lord]!;
  const i = LOYALTY.indexOf(l.loyalty);
  const next = by > 0 ? Math.max(0, i - 1) : Math.min(LOYALTY.indexOf("Disloyal"), i + 1);
  if (next === i || l.loyalty === "In revolt") return;
  l.loyalty = LOYALTY[next]!;
  if (isHuman(world, l.nation)) news.push({ kind: "unrest", text: `${l.name} is now ${l.loyalty.toLowerCase()}: ${why}`, nations: [l.nation] });
}

// ---------------------------------------------------------------- the monthly step

/**
 * The Shogunate's month (spec §9), inside the institutions step: the end by
 * reform, the break when the Court's province is lost, oaths that lapse,
 * summons that lapse; at a season's end the break at hold 0 and the houses'
 * reading of hold; in January the summoned lords' wealth and the year's hold.
 */
export function monthlyShogunate(world: World, news: News[]): void {
  const s = world.shogunate;
  if (!s || s.ended) return;
  const n = shogunOf(world);
  if (s.holder && n >= 0) {
    if (world.nationGone[n]) {
      inst.breakOffice(s, date(world));
      news.push({ kind: "crown", text: `The office of Shogun stands vacant: ${nameOf(world, n)} is no more.`, nations: [n], major: true });
    } else if (formOf(world, n) !== "shogunate") return endShogunate(world, "reform", news);
    else if (world.provinceOwner[court(world)] !== n) breakShogunate(world, "the shogun has lost the Court's province", news);
  }
  oathsLapse(world, news);
  if (inst.summonsLapse(s)) news.push({ kind: "crown", text: "The houses at the capital go home: the shogun's hold is no longer Firm.", nations: [shogunOf(world)].filter((x) => x >= 0) });
  if (s.holder && isSeasonEnd(world.date.month)) {
    if (s.hold <= 0) breakShogunate(world, "the shogun's hold is gone", news);
    else {
      const by = inst.holdStep(s.hold);
      if (by) for (const k of housesOf(world)) step(world, k, by, "the shogun's hold", news);
    }
  }
  if (s.holder && world.date.month === 1) {
    for (const k of s.summoned) {
      const l = world.lords[k]!;
      l.wealth = Math.round((l.wealth ?? 100) * (1 - S.summon_wealth_loss));
    }
    yearCount(world, news);
  }
  if (s.closed && eventFired(world, "perry_expedition")) openPorts(world, true, news);
  heelAims(world);
  aiShogunate(world, news);
}

function yearCount(world: World, news: News[]): void {
  const s = world.shogunate!;
  const n = shogunOf(world);
  const houses = housesOf(world);
  const ruler = world.rulers[n];
  const wavering = houses.filter((k) => LOYALTY.indexOf(world.lords[k]!.loyalty) >= LOYALTY.indexOf("Wavering")).length;
  const facts: inst.ShogunYearFacts = {
    revolts: houses.filter((k) => world.lords[k]!.loyalty === "In revolt").map((k) => world.lords[k]!.house),
    noAdultHeir: !ruler?.heir || ruler.heir.age < realmConfig.ruler.child_under,
    unhappyWar: inAnyWar(world, n) && wavering * 2 > houses.length,
  };
  const before = s.hold;
  inst.countShogunYear(s, inst.shogunYearLines(s, facts));
  if (isHuman(world, n) && inst.holdWord(before) !== inst.holdWord(s.hold)) news.push({ kind: "crown", text: `The shogun's hold is now ${inst.holdWord(s.hold)} (${s.hold}).`, nations: [n] });
}

/** INST-067: *Bring to heel* on every member that refused the oath, while it stands and the office is held. */
function heelAims(world: World): void {
  const d = world.diplomacy;
  const s = world.shogunate!;
  d.aims = d.aims.filter((a) => a.aim !== "bring_to_heel" || (a.holder === s.holder && !world.nationGone[idx(world, a.target)]));
}

// ---------------------------------------------------------------- the break (INST-065)

/** The sleeping realm a house wakes as: the one it was before it swore, its own (D-INST-1), else a spare named for it. */
function realmOfHouse(world: World, lord: number): { n: number; name?: string } | null {
  const s = world.shogunate!;
  const id = s.sworn.find((x) => x.lord === lord)?.realm ?? HOUSE_REALM.get(world.lords[lord]!.house);
  const n = id ? idx(world, id) : -1;
  if (n >= 0 && (world.nationGone[n] || world.nationAsleep[n])) return { n };
  const spare = spareSleepers(world)[0];
  return spare === undefined ? null : { n: spare, name: world.lords[lord]!.house };
}

/** The given name of a lord whose name leads or ends with his house. */
const givenOf = (lord: { name: string; house: string }) => lord.name.replace(lord.house, "").trim() || lord.name;

/**
 * INST-065: the Shogunate breaks. Each great house wakes as a warlord domain
 * on its land, ruled by its lord; the shogun keeps his royal provinces as a
 * warlord domain; the office falls vacant and `onin_war` fires if it has not.
 */
export function breakShogunate(world: World, why: string, news: News[]): void {
  const s = world.shogunate;
  const n = shogunOf(world);
  if (!s || n < 0) return;
  const quiet: News[] = [];
  const woke: number[] = [];
  for (const k of housesOf(world)) {
    const lord = world.lords[k]!;
    const land = lordLands(world, k).filter((p) => world.provinceOwner[p] === n);
    const r = realmOfHouse(world, k);
    if (!r || !land.length) continue;
    if (!wakeRealm(world, r.n, { provinces: land, ...(r.name ? { name: r.name } : {}) }, quiet)) continue;
    setForm(world, r.n, "warlord_domain");
    world.rulers[r.n] = { ...world.rulers[r.n]!, name: givenOf(lord) };
    woke.push(r.n);
  }
  for (const x of quiet) if (x.kind === "destroyed") news.push(x);
  setForm(world, n, "warlord_domain");
  inst.breakOffice(s, date(world));
  world.diplomacy.aims = world.diplomacy.aims.filter((a) => a.aim !== "bring_to_heel");
  const names = woke.map((m) => nameOf(world, m));
  news.push({ kind: "crown", text: `The Shogunate breaks: ${why}. ${names.length ? `${list(names)} now rule their own land as warlord domains, and` : ""} ${nameOf(world, n)} keeps only its royal provinces.`.replace(/\s+/g, " "), nations: [n, ...woke], major: true });
  if (!eventFired(world, "onin_war")) fireEventNow(world, "onin_war", news);
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

// ---------------------------------------------------------------- the vacant office, the Court and the oath (INST-066, INST-067)

/** Why realm n can't ask the Court now, or null. */
export function whyNotAskCourt(world: World, n: number): string | null {
  const s = world.shogunate;
  if (!s) return "there is no Shogunate";
  return inst.whyNotAskCourt(s, { member: vacantMembers(world).includes(n), holdsCourt: world.provinceOwner[court(world)] === n, landHeld: japanHeld(world, n) });
}

/** INST-066: the Court appoints realm n shogun; it takes the shogunate form at no gold, and every other member is asked to swear. */
export function askTheCourt(world: World, n: number, news: News[]): string | null {
  const why = whyNotAskCourt(world, n);
  if (why) return why;
  const s = world.shogunate!;
  const members = vacantMembers(world).filter((m) => m !== n);
  setForm(world, n, "shogunate");
  inst.appoint(s, world.nationIds[n]!, date(world));
  news.push({ kind: "crown", text: `The Court appoints ${nameOf(world, n)} Shogun. Every warlord domain of Japan is asked to swear to the shogun.`, nations: [n, ...members], major: true });
  for (const m of members) {
    if (isHuman(world, m)) s.oaths.push({ realm: world.nationIds[m]!, ends: dip.addMonths(date(world), S.oath.answer_months) });
    else swearOrRefuse(world, m, oathCount(world, m).yes, news);
  }
  return null;
}

/** The reasons count of member m asked to swear to the shogun (INST-067). */
export function oathCount(world: World, m: number): dip.Count {
  return inst.oathCount(world.diplomacy, world.shogunate!, world.nationIds[m]!, (id) => (idx(world, id) >= 0 ? strength(world, idx(world, id)) : 0));
}

/** INST-067: a member that swears becomes the shogun's great house with its land, Wavering; one that refuses stays a realm under *Bring to heel*. */
export function swearOrRefuse(world: World, m: number, yes: boolean, news: News[]): void {
  const s = world.shogunate!;
  const n = shogunOf(world);
  if (n < 0 || world.nationGone[m]) return;
  const id = world.nationIds[m]!;
  s.oaths = s.oaths.filter((o) => o.realm !== id);
  if (!yes) {
    world.diplomacy.aims.push({ holder: s.holder!, target: id, aim: "bring_to_heel", source: "refused the oath to the shogun" });
    news.push({ kind: "crown", text: `${nameOf(world, m)} refuses to swear to the shogun; ${nameOf(world, n)} may bring it to heel.`, nations: [n, m] });
    return;
  }
  const lord = world.lords.length;
  world.lords.push({ name: world.rulers[m]?.name ? `${nameOf(world, m)} ${world.rulers[m]!.name}` : nameOf(world, m), house: nameOf(world, m), nation: n, loyalty: "Wavering", upCredit: 0 });
  const quiet: News[] = [];
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== m) continue;
    cedeProvince(world, p, n, quiet);
    world.provinceLord[p] = lord;
  }
  s.sworn.push({ lord, realm: id });
  checkDestroyed(world, quiet);
  news.push({ kind: "crown", text: `${nameOf(world, m)} swears to the shogun and is now a great house of ${nameOf(world, n)}.`, nations: [n, m] });
}

/** Oaths asked of the player that lapse unanswered count as a refusal (INST-083). */
function oathsLapse(world: World, news: News[]): void {
  const s = world.shogunate!;
  for (const o of [...s.oaths]) if (dip.monthOf(date(world)) >= dip.monthOf(o.ends)) swearOrRefuse(world, idx(world, o.realm), false, news);
}

// ---------------------------------------------------------------- summons, confirmation, the closed country, the end

/** INST-064: the ruler confirms a house's land: one step more loyal, for hold. */
export function confirmHouse(world: World, lord: number, news: News[]): string | null {
  const s = world.shogunate!;
  const n = shogunOf(world);
  if (!housesOf(world).includes(lord)) return "not one of the shogun's houses";
  const ruler = world.rulers[n]?.name ?? "";
  const why = inst.whyNotConfirm(s, lord, ruler);
  if (why) return why;
  step(world, lord, 1, "his land confirmed", news);
  s.confirmed.push({ lord, ruler });
  inst.moveShogunHold(s, `Confirmed the land of ${world.lords[lord]!.house}`, -S.confirm_cost);
  return null;
}

/** INST-063: the shogun summons a house to the capital. */
export function summonHouse(world: World, lord: number): string | null {
  const s = world.shogunate!;
  if (!housesOf(world).includes(lord)) return "not one of the shogun's houses";
  const why = inst.whyNotSummon(s, lord);
  if (why) return why;
  s.summoned.push(lord);
  return null;
}

/** INST-063: a summoned lord cannot join a rising. */
export function mayJoinRising(world: World, lord: number): boolean {
  return !world.shogunate?.summoned.includes(lord);
}

/** INST-068: the shogun closes the country with one port open to foreign traders. */
export function closeCountry(world: World, port: number, news: News[]): string | null {
  const s = world.shogunate!;
  const n = shogunOf(world);
  const why = inst.whyNotClose(world.diplomacy, s);
  if (why) return why;
  if (world.provinceOwner[port] !== n) return "the port must be the shogun's";
  s.closed = { port: world.provinceIds[port]!, since: date(world) };
  setTreeFlag(world, true);
  news.push({ kind: "crown", text: `${nameOf(world, n)} closes the country: foreign traders may trade only at ${world.rules.provinces[port]!.name}.`, nations: [n], major: true });
  return null;
}

/** INST-068: the ports open, lifted by the shogun or forced by `perry_expedition`. */
export function openPorts(world: World, forced: boolean, news: News[]): void {
  const s = world.shogunate!;
  if (!s.closed) return;
  s.closed = null;
  if (forced) s.forcedOpen = true;
  setTreeFlag(world, false);
  news.push({ kind: "crown", text: forced ? "Foreign ships force the ports of Japan open." : "The shogun opens the ports of Japan.", nations: [shogunOf(world)].filter((x) => x >= 0) });
}

/** The tree's `japan_closed` flag that `perry_expedition` waits for. */
function setTreeFlag(world: World, on: boolean): void {
  const flags = world.events?.state.world.flags;
  if (!flags) return;
  const at = flags.findIndex((f) => f.on === "global" && f.id === "japan_closed");
  if (on && at < 0) flags.push({ on: "global", id: "japan_closed" });
  if (!on && at >= 0) flags.splice(at, 1);
}

/** INST-068: whether realm n's traders may not stop in province q: Japan's land while closed, except the one port. */
export function closedTo(world: World, n: number, q: number): boolean {
  const s = world.shogunate;
  if (!s?.closed) return false;
  const shogun = shogunOf(world);
  return n !== shogun && world.provinceOwner[q] === shogun && world.provinceIds[q] !== s.closed.port;
}

/** INST-068: foreign faiths send no preachers into the closed country. */
export function missionariesBarred(world: World, from: number, q: number): boolean {
  const s = world.shogunate;
  return !!s?.closed && from !== shogunOf(world) && world.provinceOwner[q] === shogunOf(world);
}

/** INST-069: the Shogunate ends when its realm leaves the shogunate form. */
export function endShogunate(world: World, how: string, news: News[]): void {
  const s = world.shogunate;
  if (!s || s.ended) return;
  const n = shogunOf(world);
  inst.endShogunate(s, date(world), how);
  world.diplomacy.aims = world.diplomacy.aims.filter((a) => a.aim !== "bring_to_heel");
  setTreeFlag(world, false);
  news.push({ kind: "crown", text: `The Shogunate has ended: ${n >= 0 ? nameOf(world, n) : "its realm"} has left the shogunate form.`, nations: [n].filter((x) => x >= 0), major: true });
}

/** INST-069: the restoration for the Court is open to the revolutions context. */
export function restorationOpen(world: World): boolean {
  const s = world.shogunate;
  return !!s && inst.restorationOpen(world.diplomacy, s);
}

// ---------------------------------------------------------------- the AI (spec §12)

/** An AI shogun summons the least loyal houses first while hold allows and confirms Wavering houses; an AI member that qualifies asks the Court. */
function aiShogunate(world: World, news: News[]): void {
  const s = world.shogunate!;
  const n = shogunOf(world);
  if (n >= 0 && !isHuman(world, n)) {
    const houses = housesOf(world).sort((a, b) => LOYALTY.indexOf(world.lords[b]!.loyalty) - LOYALTY.indexOf(world.lords[a]!.loyalty) || a - b);
    for (const k of houses) if (world.lords[k]!.loyalty !== "Loyal" && !inst.whyNotSummon(s, k)) summonHouse(world, k);
    // Confirming costs hold: only while it leaves the office clear of Weak.
    for (const k of houses) if (world.lords[k]!.loyalty === "Wavering" && s.hold - S.confirm_cost >= 50) confirmHouse(world, k, news);
  }
  if (!s.holder) for (const m of vacantMembers(world)) if (!isHuman(world, m) && !whyNotAskCourt(world, m)) return void askTheCourt(world, m, news);
}

// ---------------------------------------------------------------- orders and the card (INST-082)

export type ShogunateOrder =
  | { type: "shogunate"; do: "summon"; lord: number }
  | { type: "shogunate"; do: "release"; lord: number }
  | { type: "shogunate"; do: "confirm"; lord: number }
  | { type: "shogunate"; do: "askCourt" }
  | { type: "shogunate"; do: "oath"; yes: boolean }
  | { type: "shogunate"; do: "close"; port: number }
  | { type: "shogunate"; do: "open" };

export function shogunateOrder(world: World, n: number, o: ShogunateOrder, news: News[]): string | null {
  const s = world.shogunate;
  if (!s || s.ended) return "there is no Shogunate";
  const shogun = shogunOf(world) === n;
  switch (o.do) {
    case "summon":
      return shogun ? summonHouse(world, o.lord) : "only the shogun summons houses";
    case "release":
      if (!shogun) return "only the shogun releases houses";
      if (!s.summoned.includes(o.lord)) return "not at the capital";
      s.summoned = s.summoned.filter((k) => k !== o.lord);
      return null;
    case "confirm":
      return shogun ? confirmHouse(world, o.lord, news) : "only the shogun confirms land";
    case "askCourt":
      return askTheCourt(world, n, news);
    case "oath": {
      if (!s.oaths.some((x) => x.realm === world.nationIds[n])) return "no oath is asked of you";
      swearOrRefuse(world, n, o.yes, news);
      return null;
    }
    case "close":
      return shogun ? closeCountry(world, o.port, news) : "only the shogun closes the country";
    case "open":
      if (!shogun) return "only the shogun opens the ports";
      if (!s.closed) return "the ports are open";
      openPorts(world, false, news);
      return null;
  }
}

export interface HouseView {
  lord: number;
  name: string;
  house: string;
  provinces: number;
  loyalty: string;
  wealth: number;
  summoned: boolean;
  summonWhyNot: string | null;
  confirmWhyNot: string | null;
}

export interface ShogunateView {
  name: string;
  /** The shogun's realm, -1 while vacant. */
  shogun: number;
  ruler: string;
  since: string;
  hold: number;
  word: string;
  role: "Shogun" | "House" | "Member" | null;
  /** The great houses while the office is held. */
  houses: HouseView[];
  /** The member realms while it is vacant, with Japan's provinces each holds. */
  members: { realm: number; provinces: number }[];
  court: { province: number; holder: number };
  askWhyNot: string | null;
  closed: { port: number } | null;
  closeWhyNot: string | null;
  /** The player's ports that could be the one open port. */
  ports: number[];
  /** The oath asked of the player, or null. */
  oath: { shogun: number; ends: string; reasons: { name: string; number: number }[]; total: number } | null;
  year: inst.HoldLine[];
  record: inst.HoldLine[];
  /** "At hold 0 the houses break away" while hold is Weak or lower. */
  warning: string | null;
  broke: string | null;
  ended: { date: string; how: string } | null;
}

/** The Shogunate card's view, for the player (INST-082). */
export function shogunateView(world: World, player: number): ShogunateView | null {
  const s = world.shogunate;
  if (!s) return null;
  const n = shogunOf(world);
  const me = player >= 0 ? world.nationIds[player]! : "";
  const ruler = n >= 0 ? (world.rulers[n]?.name ?? "") : "";
  const houses = housesOf(world);
  const members = vacantMembers(world);
  const c = court(world);
  const oath = s.oaths.find((o) => o.realm === me);
  const count = oath && n >= 0 ? oathCount(world, player) : null;
  const ports: number[] = [];
  if (n === player && n >= 0) for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n && world.rules.provinces[p]!.coastal) ports.push(p);
  return {
    name: S.name,
    shogun: n,
    ruler,
    since: s.since,
    hold: s.hold,
    word: inst.holdWord(s.hold),
    role: !me ? null : n === player && n >= 0 ? "Shogun" : members.includes(player) ? "Member" : null,
    houses: houses.map((k) => {
      const l = world.lords[k]!;
      return {
        lord: k,
        name: l.name,
        house: l.house,
        provinces: lordLands(world, k).length,
        loyalty: l.loyalty,
        wealth: l.wealth ?? 100,
        summoned: s.summoned.includes(k),
        summonWhyNot: n !== player ? "only the shogun summons houses" : inst.whyNotSummon(s, k),
        confirmWhyNot: n !== player ? "only the shogun confirms land" : inst.whyNotConfirm(s, k, ruler),
      };
    }),
    members: members.map((m) => ({ realm: m, provinces: japanHeld(world, m) })),
    court: { province: c, holder: c >= 0 ? world.provinceOwner[c]! : -1 },
    askWhyNot: player >= 0 ? whyNotAskCourt(world, player) : "no realm",
    closed: s.closed ? { port: world.provinceIndex.get(s.closed.port) ?? -1 } : null,
    closeWhyNot: n !== player ? "only the shogun closes the country" : inst.whyNotClose(world.diplomacy, s),
    ports,
    oath: oath && count && n >= 0 ? { shogun: n, ends: oath.ends, reasons: count.reasons.map((r) => ({ name: r.name, number: r.number })), total: count.total } : null,
    year: s.year.filter((l) => l.number),
    record: s.record,
    warning: s.holder && s.hold < 50 ? inst.BREAK_WARNING : null,
    broke: s.broke,
    ended: s.ended,
  };
}

/** The Institutions map mode for Japan (INST-084): per province the house (lord index + 1) while whole, 0 elsewhere. */
export function shogunateLens(world: World): Int16Array {
  const out = new Int16Array(world.provinceCount);
  const n = shogunOf(world);
  if (n < 0) return out;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) out[p] = world.provinceLord[p]! + 1;
  return out;
}

export function shogunateHashData(world: World): number[] {
  const s = world.shogunate;
  if (!s) return [];
  return [s.hold, shogunOf(world), s.summoned.length, s.confirmed.length, s.sworn.length, s.oaths.length, s.closed ? 1 : 0, s.forcedOpen ? 1 : 0, s.ended ? 1 : 0, s.year.length];
}
