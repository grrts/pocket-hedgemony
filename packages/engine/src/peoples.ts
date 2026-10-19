import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import start from "../../rules/data/domain/culture-start-1444.json" with { type: "json" };
import * as cult from "./domain/culture/index.ts";
import * as relg from "./domain/religion/index.ts";
import { catalogueIdOf } from "./domain/scenario-setup/index.ts";
import { knowsInvention } from "./works.ts";

/**
 * Tongues and faiths in the game (CULT-094 to CULT-101, RELG-127 to RELG-134):
 * every province holds up to three tongues and three faiths as shares of its
 * people, seeded from the 1444 catalogue; each realm has a court tongue, a
 * Tongue policy, a state faith and one Faith policy per faith. Each New Year
 * tongues drift toward the pull tongue and faiths move toward their pulls, by
 * the culture and religion libraries' rules; their grievances (*Foreign rule*,
 * *Banned language*, *Wrong faith*, *Persecuted*) feed the province's mood.
 * Lords and officials carry no tongue or faith yet: a lord counts as of the
 * court tongue, and faith buildings stand for the 1444 communities (D-RELG-24).
 */

/** Tongues and faiths by index, as the province arrays store them. */
export const TONGUE_IDS: readonly string[] = cult.tongues().map((t) => t.id);
export const FAITH_IDS: readonly string[] = relg.faithIds();
const TONGUE_INDEX = new Map(TONGUE_IDS.map((t, k) => [t, k]));
const FAITH_INDEX = new Map(FAITH_IDS.map((f, k) => [f, k]));
export const NO_TONGUE = 0xffff;
export const NO_FAITH = 0xff;
/** Slots per province: at most three tongues and three faiths (INV-CULT-7, INV-RELG-3). */
export const SLOTS = 3;
export const TONGUE_POLICIES: readonly cult.TonguePolicy[] = ["let_be", "teach", "impose"];
/** Faith policies a realm sets per faith; the state faith is Established. */
export const FAITH_POLICIES: readonly Exclude<relg.Policy, "established">[] = ["tolerated", "restricted", "persecuted"];
/** Held from before 1444: counts as held long enough for the court's pull (D-CULT-18). */
export const HELD_BEFORE_START = -1;

/** Grievance bits culture and religion give a province, which the mood reads (moods.ts). */
export const BELIEF_GRIEVANCES = ["Foreign rule", "Banned language", "Wrong faith", "Persecuted"] as const;
const FOREIGN_RULE = 1;
const BANNED_TONGUE = 2;
const WRONG_FAITH = 4;
const PERSECUTED = 8;

/** The inventions that speed drift (CULT-031), as research names them. */
const DRIFT_INVENTIONS: Record<string, string> = { printing: "printing", mass_schooling: "mass_literacy_schooling", railways: "railways" };

interface StartRealm {
  court: string;
  mix: [string, number][];
  faith?: string;
}
const REALMS = start.realms as unknown as Record<string, StartRealm>;

export interface PeoplesState {
  /** Up to three tongues per province (index into TONGUE_IDS, NO_TONGUE empty) and their shares of its people. */
  provinceTongue: Uint16Array;
  provinceTongueShare: Float32Array;
  /** The tongue whose homeland the province is: its majority in 1444 (D-CULT-18). */
  provinceHomeland: Uint16Array;
  /** Year the owner began holding the province, HELD_BEFORE_START for the 1444 owner, and that owner. */
  provinceHeldSince: Int16Array;
  provinceHeldBy: Int16Array;
  /** Up to three faiths per province (index into FAITH_IDS, NO_FAITH empty) and their shares. */
  provinceFaith: Uint8Array;
  provinceFaithShare: Float32Array;
  /** Faith of each house of worship standing in the province, up to three (D-RELG-24). */
  provinceHouses: Uint8Array;
  /** Bits of BELIEF_GRIEVANCES standing in each province. */
  provinceBelief: Uint8Array;
  /** Tax a province pays by its faiths' policies: Restricted pays 25 % more on its share, Persecuted none (RELG-050, RELG-052). */
  provinceFaithTax: Float32Array;
  /** Each realm's court tongue, Tongue policy (index into TONGUE_POLICIES) and state faith. */
  nationCourt: Uint16Array;
  nationTonguePolicy: Uint8Array;
  nationStateFaith: Uint8Array;
  /** Policy of each faith in each realm (nation * FAITH_IDS.length + faith; index into FAITH_POLICIES), and changes waiting for New Year (NO_FAITH none). */
  nationFaithPolicy: Uint8Array;
  nationFaithPending: Uint8Array;
}

export function createPeoplesState(P: number, N: number): PeoplesState {
  return {
    provinceTongue: new Uint16Array(P * SLOTS).fill(NO_TONGUE),
    provinceTongueShare: new Float32Array(P * SLOTS),
    provinceHomeland: new Uint16Array(P).fill(NO_TONGUE),
    provinceHeldSince: new Int16Array(P).fill(HELD_BEFORE_START),
    provinceHeldBy: new Int16Array(P).fill(-1),
    provinceFaith: new Uint8Array(P * SLOTS).fill(NO_FAITH),
    provinceFaithShare: new Float32Array(P * SLOTS),
    provinceHouses: new Uint8Array(P * SLOTS).fill(NO_FAITH),
    provinceBelief: new Uint8Array(P),
    provinceFaithTax: new Float32Array(P).fill(1),
    nationCourt: new Uint16Array(N).fill(NO_TONGUE),
    nationTonguePolicy: new Uint8Array(N).fill(TONGUE_POLICIES.indexOf("teach")),
    nationStateFaith: new Uint8Array(N).fill(NO_FAITH),
    nationFaithPolicy: new Uint8Array(N * FAITH_IDS.length),
    nationFaithPending: new Uint8Array(N * FAITH_IDS.length).fill(NO_FAITH),
  };
}

// ---------------------------------------------------------------- the 1444 start

/** A map realm's 1444 tongues: its court and up to three tongues with shares (CULT-009, CULT-086). */
export function startTongues(nationId: string): StartRealm | null {
  return REALMS[nationId] ?? null;
}

/** A map realm's 1444 state faith and province mix: its catalogue record's (RELG-107, RELG-108), or the faith the start data names where the map realm has no record. */
export function startFaiths(nationId: string): { stateFaith: string; mix: Record<string, number> } | null {
  const own = REALMS[nationId]?.faith;
  if (own) return { stateFaith: own, mix: { [own]: 1 } };
  const id = catalogueIdOf(nationId);
  return id ? relg.startMix(id) : null;
}

/** The region overrides of the start mix that the map can place: an area named for its 1444 owner, and the Ottoman Balkans west of the Bosporus (RELG-107, D-RELG-24). */
function startOverride(world: World, p: number, owner: string, mix: Record<string, number>): Record<string, number> {
  const rid = catalogueIdOf(owner) ?? owner;
  let out = relg.startOverride(`area:${owner}`, mix, { owner: rid });
  if (out === mix || sameMix(out, mix)) out = relg.startOverride(`area:${rid}`, mix, { owner: rid });
  const lon = (world.rules.provinces[p]!.x ?? 0) / (world.rules.map?.pxPerDeg ?? 16) - 180;
  if (lon < 29) out = relg.startOverride("region:balkans", out, { owner: rid });
  return out;
}
const sameMix = (a: Record<string, number>, b: Record<string, number>) => Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([k, v]) => b[k] === v);

/** Seeds every realm's court tongue and state faith and every owned land province's mixes and houses. */
export function seedPeoples(world: World): void {
  const F = FAITH_IDS.length;
  for (let n = 0; n < world.nationCount; n++) {
    const id = world.nationIds[n]!;
    const t = startTongues(id);
    if (t) world.nationCourt[n] = TONGUE_INDEX.get(t.court) ?? NO_TONGUE;
    const f = startFaiths(id);
    if (f) world.nationStateFaith[n] = FAITH_INDEX.get(f.stateFaith) ?? NO_FAITH;
    world.nationFaithPolicy.fill(FAITH_POLICIES.indexOf("tolerated"), n * F, (n + 1) * F);
  }
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    world.provinceHeldBy[p] = o;
    if (o < 0 || world.provinceWater[p]) continue;
    const id = world.nationIds[o]!;
    const t = startTongues(id);
    if (t) {
      writeTongues(world, p, Object.fromEntries(t.mix));
      world.provinceHomeland[p] = world.provinceTongue[p * SLOTS]!;
    }
    const f = startFaiths(id);
    if (f) {
      const mix = startOverride(world, p, id, f.mix);
      writeFaiths(world, p, mix);
      // Each 1444 community holds its house of worship, until faith buildings can be built (D-RELG-24).
      let k = 0;
      for (const [faith, sh] of Object.entries(mix)) if (sh >= relg.religionConfig.communities.min_share && relg.hasHouses(faith) && k < SLOTS) world.provinceHouses[p * SLOTS + k++] = FAITH_INDEX.get(faith)!;
    }
  }
  refreshBeliefs(world);
}

// ---------------------------------------------------------------- reading and writing the arrays

/** A province's tongues as shares, largest first. */
export function tonguesOf(d: Pick<PeoplesState, "provinceTongue" | "provinceTongueShare">, p: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let k = 0; k < SLOTS; k++) {
    const t = d.provinceTongue[p * SLOTS + k]!;
    if (t !== NO_TONGUE) out[TONGUE_IDS[t]!] = d.provinceTongueShare[p * SLOTS + k]!;
  }
  return out;
}

/** A province's faiths as shares, largest first. */
export function faithsOf(d: Pick<PeoplesState, "provinceFaith" | "provinceFaithShare">, p: number): Record<string, number> {
  const out: Record<string, number> = {};
  for (let k = 0; k < SLOTS; k++) {
    const f = d.provinceFaith[p * SLOTS + k]!;
    if (f !== NO_FAITH) out[FAITH_IDS[f]!] = d.provinceFaithShare[p * SLOTS + k]!;
  }
  return out;
}

/** Writes up to three tongues, largest first, as shares that sum to 1. */
function writeTongues(world: World, p: number, mix: Record<string, number>): void {
  const rows = top(mix);
  for (let k = 0; k < SLOTS; k++) {
    world.provinceTongue[p * SLOTS + k] = rows[k] ? TONGUE_INDEX.get(rows[k]![0])! : NO_TONGUE;
    world.provinceTongueShare[p * SLOTS + k] = rows[k]?.[1] ?? 0;
  }
}

function writeFaiths(world: World, p: number, mix: Record<string, number>): void {
  const rows = top(mix);
  for (let k = 0; k < SLOTS; k++) {
    world.provinceFaith[p * SLOTS + k] = rows[k] ? FAITH_INDEX.get(rows[k]![0])! : NO_FAITH;
    world.provinceFaithShare[p * SLOTS + k] = rows[k]?.[1] ?? 0;
  }
}

/** The three largest groups, largest first; a fourth folds into the majority (CULT-033, RELG-024), and the shares sum to 1. */
function top(mix: Record<string, number>): [string, number][] {
  const rows = Object.entries(mix)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  const kept = rows.slice(0, SLOTS);
  if (kept.length) for (const [, v] of rows.slice(SLOTS)) kept[0]![1] += v;
  const sum = kept.reduce((a, [, v]) => a + v, 0);
  return kept.map(([k, v]) => [k, sum > 0 ? v / sum : 0]);
}

// ---------------------------------------------------------------- the libraries' views of a province and a realm

/**
 * What the culture and religion rules read, from the world or from a
 * snapshot: the arrays above plus each province's owner and who governs it,
 * each realm's capital and the drift inventions it knows.
 */
export interface PeoplesData extends PeoplesState {
  year: number;
  provinceOwner: Int16Array;
  /** 0 no one, 1 an official of the realm, 2 a lord. */
  provinceGovernor: Uint8Array;
  nationIds: readonly string[];
  /** Each realm's capital province, -1 none. */
  nationCapital: Int32Array;
  /** Bits of the drift inventions each realm knows, in DRIFT_INVENTIONS order. */
  nationInventions: Uint8Array;
  /** 1 where a realm serves a faith's communities as the patron of its head while of another faith (nation * FAITH_IDS.length + faith; RELG-145). */
  nationServes?: Uint8Array;
}

/** The culture rules' view of a realm (CountryCulture). */
export function realmCulture(d: PeoplesData, n: number): cult.CountryCulture | null {
  const court = d.nationCourt[n]!;
  if (court === NO_TONGUE) return null;
  const bits = d.nationInventions[n]!;
  return cult.newCountryCulture(d.nationIds[n]!, TONGUE_IDS[court]!, {
    policy: TONGUE_POLICIES[d.nationTonguePolicy[n]!]!,
    inventions: Object.keys(DRIFT_INVENTIONS).filter((_, k) => bits & (1 << k)),
  });
}

/** The culture rules' view of a province (ProvinceTongues). */
export function provinceTongues(d: PeoplesData, p: number): cult.ProvinceTongues {
  const owner = d.provinceOwner[p]!;
  const court = owner >= 0 ? d.nationCourt[owner]! : NO_TONGUE;
  const held = d.provinceHeldSince[p]!;
  const g = d.provinceGovernor[p]!;
  const home = d.provinceHomeland[p]!;
  return cult.newProvinceTongues(String(p), tonguesOf(d, p), {
    homelandOf: home === NO_TONGUE ? [] : [TONGUE_IDS[home]!],
    // Held from before 1444: as long as the court's pull needs (D-CULT-18).
    yearsHeld: held === HELD_BEFORE_START ? cult.cultureConfig.drift.court_pull_needs_years_held : d.year - held,
    // Lords carry no tongue yet: a lord counts as of the court tongue (D-CULT-18).
    governor: g === 1 ? { kind: "official" } : g === 2 && court !== NO_TONGUE ? { kind: "lord", tongue: TONGUE_IDS[court]! } : { kind: "none" },
  });
}

/** The religion rules' view of a realm (RealmFaith). */
export function realmFaith(d: PeoplesData, n: number): relg.RealmFaith | null {
  const sf = d.nationStateFaith[n]!;
  if (sf === NO_FAITH) return null;
  const F = FAITH_IDS.length;
  const policies: Record<string, relg.Policy> = {};
  const pending: Record<string, relg.Policy> = {};
  for (let f = 0; f < F; f++) {
    policies[FAITH_IDS[f]!] = f === sf ? "established" : FAITH_POLICIES[d.nationFaithPolicy[n * F + f]!]!;
    const w = d.nationFaithPending[n * F + f]!;
    if (w !== NO_FAITH && f !== sf) pending[FAITH_IDS[f]!] = FAITH_POLICIES[w]!;
  }
  const served = d.nationServes ? FAITH_IDS.filter((_, f) => d.nationServes![n * F + f]) : [];
  return relg.newRealm(d.nationIds[n]!, FAITH_IDS[sf]!, { policies, pending, ...(served.length ? { servedByPatronage: served } : {}) });
}

/** The religion rules' view of a province (ProvinceFaith): its mix, its houses, and the capital's pull. */
export function provinceFaith(d: PeoplesData, p: number): relg.ProvinceFaith {
  const owner = d.provinceOwner[p]!;
  const sf = owner >= 0 ? d.nationStateFaith[owner]! : NO_FAITH;
  const buildings: relg.FaithBuilding[] = [];
  for (let k = 0; k < SLOTS; k++) {
    const h = d.provinceHouses[p * SLOTS + k]!;
    if (h !== NO_FAITH) buildings.push({ faith: FAITH_IDS[h]!, kind: h === sf ? "house" : "minority", step: 1 });
  }
  return relg.newProvince(String(p), owner >= 0 ? d.nationIds[owner]! : "", faithsOf(d, p), { buildings, capital: owner >= 0 && d.nationCapital[owner] === p });
}

/** The world as PeoplesData: its own arrays, with who governs each province and each realm's capital and inventions worked out now. */
export function peoplesData(world: World): PeoplesData {
  const P = world.provinceCount;
  const governor = new Uint8Array(P);
  for (let p = 0; p < P; p++) governor[p] = world.provinceLord[p]! >= 0 ? 2 : world.provinceOfficial[p]! >= 0 ? 1 : 0;
  const capital = new Int32Array(world.nationCount);
  const inventions = new Uint8Array(world.nationCount);
  const keys = Object.values(DRIFT_INVENTIONS);
  for (let n = 0; n < world.nationCount; n++) {
    const c = world.provinceIndex.get(world.rules.nations[n]!.capital);
    capital[n] = c !== undefined && world.provinceOwner[c] === n ? c : -1;
    keys.forEach((id, k) => {
      if (knowsInvention(world, n, id)) inventions[n] = inventions[n]! | (1 << k);
    });
  }
  return { ...pick(world), year: world.date.year, provinceOwner: world.provinceOwner, provinceGovernor: governor, nationIds: world.nationIds, nationCapital: capital, nationInventions: inventions, nationServes: world.nationServes };
}

function pick(s: PeoplesState): PeoplesState {
  return {
    provinceTongue: s.provinceTongue,
    provinceTongueShare: s.provinceTongueShare,
    provinceHomeland: s.provinceHomeland,
    provinceHeldSince: s.provinceHeldSince,
    provinceHeldBy: s.provinceHeldBy,
    provinceFaith: s.provinceFaith,
    provinceFaithShare: s.provinceFaithShare,
    provinceHouses: s.provinceHouses,
    provinceBelief: s.provinceBelief,
    provinceFaithTax: s.provinceFaithTax,
    nationCourt: s.nationCourt,
    nationTonguePolicy: s.nationTonguePolicy,
    nationStateFaith: s.nationStateFaith,
    nationFaithPolicy: s.nationFaithPolicy,
    nationFaithPending: s.nationFaithPending,
  };
}

// ---------------------------------------------------------------- grievances and faith tax

/** Works out the belief grievances and faith tax of province p (or every province) from the rules. */
export function refreshBeliefs(world: World, only = -1, d: PeoplesData = peoplesData(world)): void {
  const cc = new Map<number, cult.CountryCulture | null>();
  const rf = new Map<number, relg.RealmFaith | null>();
  const from = only >= 0 ? only : 0;
  const to = only >= 0 ? only + 1 : world.provinceCount;
  for (let p = from; p < to; p++) {
    const o = world.provinceOwner[p]!;
    world.provinceBelief[p] = 0;
    world.provinceFaithTax[p] = 1;
    if (o < 0 || world.provinceWater[p]) continue;
    if (!cc.has(o)) cc.set(o, realmCulture(d, o));
    if (!rf.has(o)) rf.set(o, realmFaith(d, o));
    world.provinceBelief[p] = beliefBits(d, p, cc.get(o)!, rf.get(o)!);
    const r = rf.get(o);
    if (r) {
      let tax = 0;
      for (const [f, sh] of Object.entries(faithsOf(d, p))) tax += sh * relg.faithTaxMultiplier(r, f);
      world.provinceFaithTax[p] = tax;
    }
  }
}

/** The belief grievance bits of a province under its owner's culture and faith. */
export function beliefBits(d: PeoplesData, p: number, cc: cult.CountryCulture | null, r: relg.RealmFaith | null): number {
  let bits = 0;
  if (cc && d.provinceTongue[p * SLOTS] !== NO_TONGUE) {
    const g = cult.updateGrievances(provinceTongues(d, p), cc);
    // A realm's own 1444 land is not foreign-ruled: its court has held it for generations (D-CULT-18).
    if (g.includes("Foreign rule") && d.provinceHeldSince[p] !== HELD_BEFORE_START) bits |= FOREIGN_RULE;
    if (g.includes("Banned language")) bits |= BANNED_TONGUE;
  }
  if (r && d.provinceFaith[p * SLOTS] !== NO_FAITH) {
    const g = relg.faithGrievances(provinceFaith(d, p), r);
    if (g["Wrong faith"]) bits |= WRONG_FAITH;
    if (g["Persecuted"]) bits |= PERSECUTED;
  }
  return bits;
}

/** Does province p hold this belief grievance (moods.ts reads them). */
export function hasBelief(world: World, p: number, g: (typeof BELIEF_GRIEVANCES)[number]): boolean {
  return (world.provinceBelief[p]! & (1 << BELIEF_GRIEVANCES.indexOf(g))) !== 0;
}

// ---------------------------------------------------------------- each month and each New Year

/**
 * The monthly step (X-2: culture, religion): a province that changed hands
 * is held from this year and its grievances are worked out again; each New
 * Year the pending Faith policies take effect (RELG-055), tongues drift
 * (CULT-016) and faith mixes move (RELG-021), and every province's
 * grievances follow.
 */
export function monthlyPeoples(world: World, news: News[]): void {
  const newYear = world.date.month === 1;
  let d: PeoplesData | null = null;
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (world.provinceHeldBy[p] === o) continue;
    world.provinceHeldBy[p] = o;
    world.provinceHeldSince[p] = world.date.year;
    if (!newYear) refreshBeliefs(world, p, (d ??= peoplesData(world)));
  }
  if (!newYear) return;
  d ??= peoplesData(world);
  for (let n = 0; n < world.nationCount; n++) applyPending(world, n, news);
  driftYear(world, d);
  refreshBeliefs(world, -1, d);
}

/** Pending Faith policies take effect at New Year: Persecuted faiths' houses close (RELG-052, RELG-055). */
function applyPending(world: World, n: number, news: News[]): void {
  const F = FAITH_IDS.length;
  for (let f = 0; f < F; f++) {
    const w = world.nationFaithPending[n * F + f]!;
    if (w === NO_FAITH) continue;
    world.nationFaithPending[n * F + f] = NO_FAITH;
    const old = world.nationFaithPolicy[n * F + f]!;
    world.nationFaithPolicy[n * F + f] = w;
    if (FAITH_POLICIES[w] === "persecuted" && FAITH_POLICIES[old] !== "persecuted") {
      for (let p = 0; p < world.provinceCount; p++) {
        if (world.provinceOwner[p] !== n) continue;
        for (let k = 0; k < SLOTS; k++) if (world.provinceHouses[p * SLOTS + k] === f) world.provinceHouses[p * SLOTS + k] = NO_FAITH;
      }
    }
    if (isHuman(world, n)) news.push({ kind: "reform", text: `${faithName(FAITH_IDS[f]!)} is now ${FAITH_POLICIES[w]} in the realm.`, nations: [n] });
  }
}

/** One year of drift and faith moves in every owned land province (CULT-016 to CULT-033, RELG-009 to RELG-024). */
function driftYear(world: World, d: PeoplesData): void {
  const cc = Array.from({ length: world.nationCount }, (_, n) => realmCulture(d, n));
  const rf = Array.from({ length: world.nationCount }, (_, n) => realmFaith(d, n));
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0 || world.provinceWater[p]) continue;
    const c = cc[o];
    if (c && world.provinceTongue[p * SLOTS] !== NO_TONGUE) {
      const pt = provinceTongues(d, p);
      cult.driftYear(pt, c);
      writeTongues(world, p, pt.people);
    }
    const r = rf[o];
    if (r && world.provinceFaith[p * SLOTS] !== NO_FAITH) {
      const pf = provinceFaith(d, p);
      relg.yearMix(pf, r);
      writeFaiths(world, p, pf.mix);
    }
  }
}

// ---------------------------------------------------------------- orders

/** Sets the realm's Tongue policy (CULT-038, CULT-042): Impose needs Printing or a chancery tradition. */
export function setTonguePolicy(world: World, n: number, policy: string): string | null {
  const k = TONGUE_POLICIES.indexOf(policy as cult.TonguePolicy);
  if (k < 0) return "no such Language policy";
  const cc = realmCulture(peoplesData(world), n);
  if (!cc) return "the realm has no court language";
  if (policy === "impose" && !cult.mayImpose(cc)) return "Impose needs Printing or a chancery tradition";
  world.nationTonguePolicy[n] = k;
  refreshRealm(world, n);
  return null;
}

/** Sets a faith's policy, taking effect at the next New Year (RELG-055); choosing the policy in force again cancels a change. */
export function setFaithPolicy(world: World, n: number, faith: string, policy: string): string | null {
  const f = FAITH_INDEX.get(faith);
  const k = FAITH_POLICIES.indexOf(policy as (typeof FAITH_POLICIES)[number]);
  if (f === undefined || k < 0) return "no such faith or policy";
  if (world.nationStateFaith[n] === f) return "the state faith is Established";
  const r = realmFaith(peoplesData(world), n);
  if (!r || !relg.setPolicy(r, faith, FAITH_POLICIES[k]!)) return "a secular state may only Tolerate or Restrict";
  const F = FAITH_IDS.length;
  world.nationFaithPending[n * F + f] = world.nationFaithPolicy[n * F + f] === k ? NO_FAITH : k;
  return null;
}

function refreshRealm(world: World, n: number): void {
  const d = peoplesData(world);
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) refreshBeliefs(world, p, d);
}

// ---------------------------------------------------------------- the Peoples tab

const title = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, " ");
/** A tongue's name (French, Occitan). */
export const tongueName = (id: string): string => cult.tongue(id)?.name ?? title(id);
/** A faith's name in English (Catholic, Sunni). */
export const faithName = (id: string): string => title(id);

export interface TongueRow {
  tongue: string;
  name: string;
  family: string;
  relation: cult.Relation;
  people: number;
  provinces: number;
  /** Provinces where it is the majority, and where it is the homeland. */
  majority: number;
  homeland: number;
  /** Provinces of it with *Foreign rule* or *Banned language*. */
  grieved: number;
}

export interface FaithRow {
  faith: string;
  name: string;
  family: string;
  policy: relg.Policy;
  /** The policy waiting for New Year, if any. */
  pending: relg.Policy | null;
  people: number;
  provinces: number;
  majority: number;
  /** Provinces with *Wrong faith* or *Persecuted* where it is a community. */
  grieved: number;
}

export interface PeoplesView {
  court: string;
  courtName: string;
  tonguePolicy: cult.TonguePolicy;
  mayImpose: boolean;
  /** Tongue %: kin plus half the cousins (CULT-013). */
  tonguePercent: number;
  tongues: TongueRow[];
  stateFaith: string;
  stateFaithName: string;
  /** Faith %: people of the state faith or a faith layered with it (RELG-113). */
  faithPercent: number;
  faiths: FaithRow[];
  people: number;
}

/** A realm's Peoples tab: its tongues and faiths, one row each, largest first (CULT-083, RELG-117). */
export function peoplesView(d: PeoplesData, n: number, provincePeople: ArrayLike<number>): PeoplesView | null {
  const cc = realmCulture(d, n);
  const rf = realmFaith(d, n);
  if (!cc || !rf) return null;
  const tongues = new Map<string, TongueRow>();
  const faiths = new Map<string, FaithRow>();
  const byTongue: Record<string, number> = {};
  const byFaith: Record<string, number> = {};
  let all = 0;
  const F = FAITH_IDS.length;
  for (let p = 0; p < d.provinceOwner.length; p++) {
    if (d.provinceOwner[p] !== n) continue;
    const people = provincePeople[p]! * 1000;
    all += people;
    const bits = d.provinceBelief[p]!;
    for (let k = 0; k < SLOTS; k++) {
      const t = d.provinceTongue[p * SLOTS + k]!;
      if (t !== NO_TONGUE) {
        const id = TONGUE_IDS[t]!;
        const row = tongues.get(id) ?? { tongue: id, name: tongueName(id), family: cult.familyOf(id) ?? "", relation: cult.relationTo(cc.court, id), people: 0, provinces: 0, majority: 0, homeland: 0, grieved: 0 };
        const n = people * d.provinceTongueShare[p * SLOTS + k]!;
        row.people += n;
        byTongue[id] = (byTongue[id] ?? 0) + n;
        row.provinces++;
        if (k === 0) row.majority++;
        if (d.provinceHomeland[p] === t) {
          row.homeland++;
          if (bits & (FOREIGN_RULE | BANNED_TONGUE)) row.grieved++;
        }
        tongues.set(id, row);
      }
      const f = d.provinceFaith[p * SLOTS + k]!;
      if (f !== NO_FAITH) {
        const id = FAITH_IDS[f]!;
        const pend = d.nationFaithPending[n * F + f]!;
        const row = faiths.get(id) ?? { faith: id, name: faithName(id), family: relg.familyOf(id), policy: relg.policyOf(rf, id), pending: pend !== NO_FAITH && f !== d.nationStateFaith[n] ? FAITH_POLICIES[pend]! : null, people: 0, provinces: 0, majority: 0, grieved: 0 };
        const sh = d.provinceFaithShare[p * SLOTS + k]!;
        row.people += people * sh;
        byFaith[id] = (byFaith[id] ?? 0) + people * sh;
        row.provinces++;
        if (k === 0) row.majority++;
        if (id !== rf.stateFaith && sh >= relg.religionConfig.communities.min_share && bits & (WRONG_FAITH | PERSECUTED)) row.grieved++;
        faiths.set(id, row);
      }
    }
  }
  // The state faith always has its row, even where none of the realm's people hold it (RELG-045).
  if (!faiths.has(rf.stateFaith)) faiths.set(rf.stateFaith, { faith: rf.stateFaith, name: faithName(rf.stateFaith), family: relg.familyOf(rf.stateFaith), policy: "established", pending: null, people: 0, provinces: 0, majority: 0, grieved: 0 });
  const byPeople = <T extends { people: number }>(a: T, b: T) => b.people - a.people;
  return {
    court: cc.court,
    courtName: tongueName(cc.court),
    tonguePolicy: cc.policy,
    mayImpose: cult.mayImpose(cc),
    tonguePercent: cult.tonguePercent(cc.court, byTongue),
    tongues: [...tongues.values()].sort(byPeople),
    stateFaith: rf.stateFaith,
    stateFaithName: faithName(rf.stateFaith),
    faithPercent: relg.faithPercent(rf.stateFaith, byFaith),
    faiths: [...faiths.values()].sort(byPeople),
    people: all,
  };
}

/** Peoples data from a snapshot's arrays (the UI works out the Tongue and Faith lines with the same rules). */
export function peoplesDataOf(s: PeoplesSnapshot): PeoplesData {
  return { ...s, provinceHeldBy: s.provinceOwner, provinceBelief: s.provinceBelief, provinceFaithTax: new Float32Array(0) };
}

/** What the snapshot carries of tongues and faiths. */
export type PeoplesSnapshot = Omit<PeoplesData, "provinceHeldBy" | "provinceFaithTax">;

/** Copies the world's peoples arrays for the snapshot. */
export function peoplesSnapshot(world: World): PeoplesSnapshot {
  const d = peoplesData(world);
  return {
    year: d.year,
    provinceOwner: d.provinceOwner.slice(),
    provinceGovernor: d.provinceGovernor,
    nationIds: d.nationIds,
    nationCapital: d.nationCapital,
    nationInventions: d.nationInventions,
    nationServes: world.nationServes.slice(),
    provinceTongue: d.provinceTongue.slice(),
    provinceTongueShare: d.provinceTongueShare.slice(),
    provinceHomeland: d.provinceHomeland.slice(),
    provinceHeldSince: d.provinceHeldSince.slice(),
    provinceFaith: d.provinceFaith.slice(),
    provinceFaithShare: d.provinceFaithShare.slice(),
    provinceHouses: d.provinceHouses.slice(),
    provinceBelief: d.provinceBelief.slice(),
    nationCourt: d.nationCourt.slice(),
    nationTonguePolicy: d.nationTonguePolicy.slice(),
    nationStateFaith: d.nationStateFaith.slice(),
    nationFaithPolicy: d.nationFaithPolicy.slice(),
    nationFaithPending: d.nationFaithPending.slice(),
  };
}

// ---------------------------------------------------------------- the province card's lines

export interface TongueLine {
  rows: { tongue: string; name: string; share: number; relation: cult.Relation; homeland: boolean }[];
  /** This year's drift: the pull tongue, why, and each group's yearly rate with its reasons (CULT-081). */
  pull: string;
  pullName: string;
  why: string;
  groups: { name: string; rate: number; reasons: string[] }[];
  heldSince: number | null;
}

/** The province card's Tongue line and what tapping it shows (CULT-080, CULT-081). */
export function tongueLine(d: PeoplesData, p: number): TongueLine | null {
  const o = d.provinceOwner[p]!;
  const cc = o >= 0 ? realmCulture(d, o) : null;
  if (!cc || d.provinceTongue[p * SLOTS] === NO_TONGUE) return null;
  const pt = provinceTongues(d, p);
  const ex = cult.driftExplanation(pt, cc);
  const held = d.provinceHeldSince[p]!;
  return {
    rows: Object.entries(pt.people).map(([t, sh]) => ({ tongue: t, name: tongueName(t), share: sh, relation: cult.relationTo(cc.court, t, pt.nationalism), homeland: pt.homelandOf.includes(t) })),
    pull: ex.pull,
    pullName: tongueName(ex.pull),
    why: ex.pull === cc.court ? (held === HELD_BEFORE_START ? "held from before 1444 and governed for the court" : `held since ${held} and governed for the court`) : held !== HELD_BEFORE_START && d.year - held < cult.cultureConfig.drift.court_pull_needs_years_held ? `the majority language; the court's pulls after ${cult.cultureConfig.drift.court_pull_needs_years_held} years held (since ${held})` : "the majority language; the court's pulls only where an official or a lord governs",
    groups: ex.groups.map((g) => ({ name: tongueName(g.tongue), rate: g.rate, reasons: g.multipliers })),
    heldSince: held === HELD_BEFORE_START ? null : held,
  };
}

/** The province card's Faith line and what tapping it shows (RELG-116, RELG-027). */
export function faithLine(d: PeoplesData, p: number): (ReturnType<typeof relg.faithLine> & { names: Record<string, string> }) | null {
  const o = d.provinceOwner[p]!;
  const r = o >= 0 ? realmFaith(d, o) : null;
  if (!r || d.provinceFaith[p * SLOTS] === NO_FAITH) return null;
  const line = relg.faithLine(provinceFaith(d, p), r);
  const names: Record<string, string> = {};
  for (const row of line.rows) names[row.faith] = faithName(row.faith);
  return { ...line, names };
}

/** The majority tongue and faith of every province, for the Tongue and Faith lenses (CULT-085, RELG-118). */
export function majorities(d: Pick<PeoplesState, "provinceTongue" | "provinceFaith" | "provinceFaithShare">, p: number): { tongue: number; faith: number; mixed: boolean } {
  return { tongue: d.provinceTongue[p * SLOTS]!, faith: d.provinceFaith[p * SLOTS]!, mixed: d.provinceFaithShare[p * SLOTS + 1]! >= 0.3 };
}

/** The family of each tongue by index, for the lens. */
export const TONGUE_FAMILY: readonly string[] = TONGUE_IDS.map((t) => cult.familyOf(t) ?? "");
/** The family of each faith by index. */
export const FAITH_FAMILY: readonly string[] = FAITH_IDS.map((f) => relg.familyOf(f));

// ---------------------------------------------------------------- saves

export interface SavedPeoples {
  tongues: string[];
  faiths: string[];
  arrays: Record<string, number[]>;
  nations: string[];
  provinces: string[];
}

/** The peoples arrays for a save, with tongue and faith ids so a later build with other tables still reads them. */
export function savePeoples(world: World): SavedPeoples {
  const arrays: Record<string, number[]> = {};
  for (const [k, v] of Object.entries(pick(world))) if (k !== "provinceBelief" && k !== "provinceFaithTax") arrays[k] = Array.from(v as ArrayLike<number>);
  return { tongues: [...TONGUE_IDS], faiths: [...FAITH_IDS], arrays, nations: [...world.nationIds], provinces: [...world.provinceIds] };
}

/** Restores the peoples arrays; a save from before them keeps the 1444 start. */
export function restorePeoples(world: World, s: SavedPeoples | undefined): void {
  if (s) {
    const t = (k: number) => (k === NO_TONGUE ? NO_TONGUE : (TONGUE_INDEX.get(s.tongues[k]!) ?? NO_TONGUE));
    const f = (k: number) => (k === NO_FAITH ? NO_FAITH : (FAITH_INDEX.get(s.faiths[k]!) ?? NO_FAITH));
    const pIdx = s.provinces.map((id) => world.provinceIndex.get(id) ?? -1);
    const nIdx = s.nations.map((id) => world.nationIndex.get(id) ?? -1);
    const a = s.arrays;
    const perProvince = (key: keyof PeoplesState, width: number, map: (v: number) => number = (v) => v) => {
      const src = a[key];
      const dst = world[key] as unknown as { [i: number]: number };
      if (!src) return;
      pIdx.forEach((p, old) => {
        if (p >= 0) for (let k = 0; k < width; k++) dst[p * width + k] = map(src[old * width + k]!);
      });
    };
    perProvince("provinceTongue", SLOTS, t);
    perProvince("provinceTongueShare", SLOTS);
    perProvince("provinceHomeland", 1, t);
    perProvince("provinceHeldSince", 1);
    perProvince("provinceHeldBy", 1, (v) => (v >= 0 ? (nIdx[v] ?? -1) : v));
    perProvince("provinceFaith", SLOTS, f);
    perProvince("provinceFaithShare", SLOTS);
    perProvince("provinceHouses", SLOTS, f);
    const F = FAITH_IDS.length;
    const oldF = s.faiths.length;
    nIdx.forEach((n, old) => {
      if (n < 0) return;
      if (a.nationCourt) world.nationCourt[n] = t(a.nationCourt[old]!);
      if (a.nationTonguePolicy) world.nationTonguePolicy[n] = a.nationTonguePolicy[old]!;
      if (a.nationStateFaith) world.nationStateFaith[n] = f(a.nationStateFaith[old]!);
      for (let k = 0; k < oldF; k++) {
        const nf = FAITH_INDEX.get(s.faiths[k]!);
        if (nf === undefined) continue;
        if (a.nationFaithPolicy) world.nationFaithPolicy[n * F + nf] = a.nationFaithPolicy[old * oldF + k]!;
        if (a.nationFaithPending) world.nationFaithPending[n * F + nf] = a.nationFaithPending[old * oldF + k]!;
      }
    });
  }
  refreshBeliefs(world);
}
