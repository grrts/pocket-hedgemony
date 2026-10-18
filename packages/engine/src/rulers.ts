import type { World } from "./world.ts";
import type { News } from "./war.ts";
import { Rng } from "./rng.ts";
import { cultureOf } from "./names.ts";
import { realmConfig, successor, type Person, type ThroneLaw } from "./domain/realm/index.ts";
import * as gov from "./domain/government/index.ts";
import { formOf } from "./government.ts";
import data from "../../rules/data/domain/rulers-1444.json" with { type: "json" };

/**
 * Rulers in play (realm REALM-233 to REALM-237): every realm has a ruler from
 * the 1444 records, with an age, years on the throne, two traits and perhaps
 * an heir. Each January they grow a year older, an old ruler may die and an
 * heirless one may have a child. Who follows a dead ruler is crowns.ts's
 * matter (succeed), so the January roll for a ruler dying without a direct
 * heir (SUBJ-126) and a death of old age change the ruler the same way.
 * Traits lean the AI's event choices (events.ts) and give small bonuses,
 * read like heritage's percent levers (traitPct).
 */

const R = realmConfig.ruler;
type Trait = keyof typeof R.traits;
export const TRAITS = Object.keys(R.traits) as Trait[];
const RECORDS = data.rulers as Record<string, { title: string | null; name: string; since: number | null; age: number | null; heir?: { name: string; age: number } } | null>;

export interface Heir {
  name: string;
  age: number;
  sex: "m" | "f";
  /** A child of the ruler, or a brother or kinsman under the eldest-of-the-house law. */
  relation: "child" | "sibling";
}

export interface GameRuler {
  /** King, Duke, Sultan …, or null where the records give none. */
  title: string | null;
  name: string;
  sex: "m" | "f";
  age: number;
  years: number;
  traits: string[];
  heir: Heir | null;
  /** The lord who rules for a child ruler (REALM-170), null otherwise. */
  regent: string | null;
}

export interface RulerState {
  rulers: GameRuler[];
  /** Its own dice, so births and deaths never shift the rest of the turn's rolls. */
  rulerRng: Rng;
}

export function createRulerState(N: number, seed: number): RulerState {
  return { rulers: Array.from({ length: N }, () => ({ title: null, name: "", sex: "m", age: 30, years: 0, traits: [], heir: null, regent: null })), rulerRng: new Rng((seed ^ 0x2a1e5) >>> 0) };
}

const between = (rng: Rng, [lo, hi]: readonly number[]) => lo! + Math.floor(rng.next() * (hi! - lo! + 1));
const FEMALE_TITLES = new Set(["Queen", "Duchess", "Empress", "Countess"]);

/** The throne law of a realm's government form (REALM-161). */
export function throneLaw(world: World, n: number): ThroneLaw {
  const by = realmConfig.succession_by_form as Record<string, string>;
  const law = (by[gov.successionName(formOf(world, n))] ?? "eldest son") as ThroneLaw;
  // Where the crown may pass to a daughter, the eldest child inherits (REALM-107, REALM-161).
  return law === "eldest son" && (realmConfig.daughters_inherit_crown as string[]).includes(world.nationIds[n]!) ? "eldest child" : law;
}

const dynastic = (law: ThroneLaw) => law === "eldest son" || law === "eldest child";

/** A given name of the realm's culture, for a ruler, heir or kinsman the records don't name. */
function givenName(world: World, n: number): string {
  const c = cultureOf(world.rules, n);
  const names = c?.given ?? world.rules.defines.recruit.commanderNames;
  return names[Math.floor(world.rulerRng.next() * names.length)]!;
}

/** Two different traits (REALM-104). */
function drawTraits(rng: Rng): string[] {
  const a = Math.floor(rng.next() * TRAITS.length);
  const b = (a + 1 + Math.floor(rng.next() * (TRAITS.length - 1))) % TRAITS.length;
  return [TRAITS[a]!, TRAITS[b]!];
}

/** A child born to the ruler: a daughter only where daughters may inherit the crown (REALM-107). */
function child(world: World, n: number, age: number): Heir {
  const daughters = (realmConfig.daughters_inherit_crown as string[]).includes(world.nationIds[n]!);
  const sex = daughters && world.rulerRng.next() < R.daughter_heir ? "f" : "m";
  return { name: givenName(world, n), age, sex, relation: "child" };
}

/** An heir by the realm's law: a child (dynastic), a brother or kinsman (eldest of the house), none where lords choose. */
function drawHeir(world: World, n: number, rulerAge: number): Heir | null {
  const rng = world.rulerRng;
  const law = throneLaw(world, n);
  if (law === "eldest of the house") return { name: givenName(world, n), age: Math.max(R.child_under, rulerAge - between(rng, [0, 15])), sex: "m", relation: "sibling" };
  if (!dynastic(law) || rng.next() >= R.heir_at_start) return null;
  const age = rulerAge - between(rng, R.heir_age_gap);
  return age >= 0 ? child(world, n, age) : null;
}

/** The most loyal lord of a realm (then the most provinces, then by name) rules for a child (REALM-170, D-REALM-17). */
function regentOf(world: World, n: number): string | null {
  const rank = ["Loyal", "Wavering", "Disloyal", "In revolt"];
  const lands = new Map<number, number>();
  for (let p = 0; p < world.provinceCount; p++) {
    const l = world.provinceLord[p]!;
    if (l >= 0 && world.provinceOwner[p] === n) lands.set(l, (lands.get(l) ?? 0) + 1);
  }
  const lords = [...lands.keys()].map((k) => ({ k, l: world.lords[k]! }));
  lords.sort((a, b) => rank.indexOf(a.l.loyalty) - rank.indexOf(b.l.loyalty) || lands.get(b.k)! - lands.get(a.k)! || a.l.name.localeCompare(b.l.name));
  return lords[0]?.l.name ?? null;
}

/** Every realm's ruler on 11 November 1444: the records' name, reign and age where they have them, the campaign's dice for the rest (REALM-233). */
export function seedRulers(world: World): void {
  const rng = world.rulerRng;
  const s = R.start_age;
  for (let n = 0; n < world.nationCount; n++) {
    const rec = RECORDS[world.nationIds[n]!] ?? null;
    const years = rec?.since != null ? Math.max(0, world.date.year - rec.since) : between(rng, s.unknown_since_years);
    const age = rec?.age ?? Math.min(s.oldest, years + between(rng, [s.accession_from, s.accession_to]));
    const title = rec?.title ?? null;
    const r: GameRuler = { title, name: rec?.name ?? givenName(world, n), sex: title && FEMALE_TITLES.has(title) ? "f" : "m", age, years, traits: drawTraits(rng), heir: null, regent: null };
    r.heir = rec?.heir ? { ...rec.heir, sex: "m", relation: "child" } : drawHeir(world, n, age);
    world.rulers[n] = r;
  }
  // Regents read the lords, who are seeded first.
  for (let n = 0; n < world.nationCount; n++) if (world.rulers[n]!.age < R.child_under) world.rulers[n]!.regent = regentOf(world, n);
}

/** The yearly chance a ruler of this age dies (REALM-100, `ruler.death_per_year`). */
export function deathChance(age: number): number {
  return R.death_per_year.find(([under]) => age < under!)?.[1] ?? R.death_per_year[R.death_per_year.length - 1]![1]!;
}

/** Realms the player borders: they hear of a death there. */
function bordersPlayer(world: World, n: number): boolean {
  const me = world.player;
  if (me < 0) return false;
  for (let p = 0; p < world.provinceCount; p++) {
    if (world.provinceOwner[p] !== n) continue;
    for (let k = world.adjStart[p]!, end = world.adjStart[p + 1]!; k < end; k++) if (world.provinceOwner[world.adjList[k]!] === me) return true;
  }
  return false;
}

/** A ruler as the card writes him: "King Charles VII". */
export const rulerLabel = (r: GameRuler) => (r.title ? `${r.title} ${r.name}` : r.name);

/**
 * A ruler dies (REALM-100 to REALM-103): his heir takes the throne by the
 * realm's law (REALM-113) with 0 years on it, new traits and no heir; with
 * none, a kinsman takes it and the lords take the disputed-heir cause, which
 * stands for the lords' succession war until it is built. Every lord takes
 * the new-ruler cause; a child ruler gets a regent and the lords the
 * child-ruler cause too. Lord loyalty is applied by `step` (lords.ts).
 */
export function newRuler(world: World, n: number, news: News[], step: (lord: number, cause: string) => void, kinsman = false): void {
  const old = world.rulers[n]!;
  const law = throneLaw(world, n);
  const heir = old.heir;
  const someone = (relation: NonNullable<Person["relation"]>): Person => ({ name: givenName(world, n), sex: "m", age: between(world.rulerRng, R.kinsman_age), relation, claim: 1, votes: 1 });
  // Dying without a direct heir (SUBJ-126) a kinsman follows; under a dynastic law with no heir at all, nobody does.
  const candidates: Person[] = kinsman
    ? [someone(law === "eldest son" || law === "eldest child" ? "child" : law === "eldest of the house" ? "sibling" : "lord")]
    : heir
      ? [{ name: heir.name, sex: heir.sex, age: heir.age, relation: heir.relation }]
      : dynastic(law) || law === "eldest of the house"
        ? []
        : [someone("lord")];
  const pick = successor(law, candidates);
  const disputed = pick === "succession war";
  const next: Person = disputed ? { name: givenName(world, n), sex: "m", age: between(world.rulerRng, R.kinsman_age) } : pick;
  const title = old.title && old.sex !== next.sex ? (next.sex === "f" ? FEMALE_OF[old.title] ?? old.title : MALE_OF[old.title] ?? old.title) : old.title;
  const ruler: GameRuler = { title, name: next.name, sex: next.sex, age: next.age, years: 0, traits: drawTraits(world.rulerRng), heir: null, regent: null };
  if (law === "eldest of the house") ruler.heir = drawHeir(world, n, ruler.age);
  world.rulers[n] = ruler;
  const child = ruler.age < R.child_under;
  if (child) ruler.regent = regentOf(world, n);
  world.lords.forEach((l, k) => {
    if (l.nation !== n) return;
    step(k, "new_ruler");
    if (disputed) step(k, "disputed_heir");
    if (child) step(k, "child_ruler");
  });
  const pron = old.sex === "f" ? "She" : "He";
  const what = disputed ? `${pron} leaves no heir: a kinsman, ${ruler.name}, ${ruler.age}, takes the throne, and the lords dispute it.` : `${ruler.name}, ${ruler.age}, takes the throne${child ? `, with ${ruler.regent ?? "the council"} as regent` : ""}.`;
  if (n === world.player) news.push({ kind: "ruler", text: `${rulerLabel(old)} dies at ${old.age}. ${what} Your lords waver at a new ruler.`, nations: [n] });
  else if (bordersPlayer(world, n)) news.push({ kind: "ruler", text: `${rulerLabel(old)} of ${world.rules.nations[n]!.name} dies at ${old.age}. ${what}`, nations: [n, world.player] });
}

/**
 * A revolution's regime takes the throne (revolutions REVO-039): the
 * rising's leader, or a ruler the lords elect, with no title of the old house,
 * 0 years on the throne, new traits and no heir. The regime posts its own news.
 */
export function revolutionRuler(world: World, n: number, leader: string | null): void {
  world.rulers[n] = { title: null, name: leader ?? givenName(world, n), sex: "m", age: between(world.rulerRng, R.kinsman_age), years: 0, traits: drawTraits(world.rulerRng), heir: null, regent: null };
}

const FEMALE_OF: Record<string, string> = { King: "Queen", Duke: "Duchess", Emperor: "Empress", Count: "Countess", "Grand Duke": "Grand Duchess", "Grand Prince": "Grand Princess" };
const MALE_OF: Record<string, string> = Object.fromEntries(Object.entries(FEMALE_OF).map(([m, f]) => [f, m]));

/**
 * Each January (REALM-100 to REALM-102): rulers and heirs grow a year older,
 * rulers reign a year longer, a child ruler who comes of age rules alone, a
 * ruler dies with the chance of his age (crowns.ts names who follows), and
 * an heirless ruler of an age to have children may have one.
 */
export function yearlyRulers(world: World, news: News[], die: (n: number) => void): void {
  if (world.date.month !== 1) return;
  const rng = world.rulerRng;
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n]) continue;
    const r = world.rulers[n]!;
    r.age++;
    r.years++;
    if (r.heir) r.heir.age++;
    if (r.regent && r.age >= R.child_under) {
      r.regent = null;
      if (n === world.player) news.push({ kind: "ruler", text: `${rulerLabel(r)} comes of age and rules without a regent.`, nations: [n] });
    }
    if (rng.next() < deathChance(r.age)) {
      die(n);
      continue;
    }
    const [from, to] = R.birth_ages;
    if (!r.heir && dynastic(throneLaw(world, n)) && r.age >= from! && r.age <= to! && rng.next() < R.birth_per_year) {
      r.heir = child(world, n, 0);
      if (n === world.player) news.push({ kind: "ruler", text: `An heir is born to ${rulerLabel(r)}: ${r.heir.sex === "f" ? "a daughter" : "a son"}, ${r.heir.name}.`, nations: [n] });
    }
  }
}

/** A realm's percent lever from its ruler's traits (`ruler.traits.<trait>.bonus`), 0 without. */
export function traitPct(world: World, n: number, lever: string): number {
  if (n < 0 || !world.rulers) return 0;
  let pct = 0;
  for (const t of world.rulers[n]?.traits ?? []) pct += (R.traits[t as Trait]?.bonus as Record<string, number> | undefined)?.[lever] ?? 0;
  return pct;
}

/** How much a trait of the chooser's ruler leans an event option: `lean_factor` for each trait whose words its effects name (REALM-104). */
export function traitLean(world: World, n: number, effects: unknown): number {
  const traits = world.rulers?.[n]?.traits;
  if (!traits?.length) return 1;
  const text = JSON.stringify(effects);
  let lean = 1;
  for (const t of traits) if (R.traits[t as Trait]?.leans.some((w) => text.includes(w))) lean *= R.lean_factor;
  return lean;
}

/** What each trait does, for the player: "Pious: faith risings a quarter rarer". */
export function traitNote(trait: string): string {
  const b = (R.traits[trait as Trait]?.bonus ?? {}) as Record<string, number>;
  const parts = Object.entries(b).map(([k, v]) => {
    const pct = Math.abs(v);
    switch (k) {
      case "faith_revolts_pct":
        return `faith risings ${pct} % rarer`;
      case "recruit_refill_pct":
        return `recruits refill ${pct} % faster`;
      case "building_cost_pct":
        return `works cost ${pct} % less`;
      case "tax_reach_pct":
        return `${pct} % more tax`;
      default:
        return `${k} ${v > 0 ? "+" : ""}${v} %`;
    }
  });
  return parts.join(", ");
}

export interface SavedRuler extends GameRuler {
  nation: string;
}

export function saveRulers(world: World): { rulers: SavedRuler[]; rng: number[] } {
  return { rulers: world.rulers.map((r, n) => ({ ...r, nation: world.nationIds[n]! })), rng: [...world.rulerRng.state] };
}

/** Rulers by realm id; a save from before rulers keeps the ones the campaign's seed drew. */
export function restoreRulers(world: World, saved: { rulers: SavedRuler[]; rng: number[] } | undefined): void {
  if (!saved) return;
  for (const { nation, ...r } of saved.rulers) {
    const n = world.nationIndex.get(nation);
    if (n !== undefined) world.rulers[n] = r;
  }
  world.rulerRng = new Rng(Uint32Array.from(saved.rng));
}

/** A realm's ruler as the General tab shows him (REALM-240). */
export interface RulerView {
  label: string;
  age: number;
  years: number;
  traits: { name: string; note: string }[];
  heir: { name: string; age: number; daughter: boolean; relation: "child" | "sibling" } | null;
  regent: string | null;
  /** Under an elective law the lords choose; with no heir a kinsman would follow and the lords dispute it. */
  law: ThroneLaw;
}

export function rulerViews(world: World): RulerView[] {
  return world.rulers.map((r, n) => ({
    label: rulerLabel(r),
    age: r.age,
    years: r.years,
    traits: r.traits.map((t) => ({ name: t, note: traitNote(t) })),
    heir: r.heir ? { name: r.heir.name, age: r.heir.age, daughter: r.heir.sex === "f", relation: r.heir.relation } : null,
    regent: r.regent,
    law: throneLaw(world, n),
  }));
}
