import { isHuman } from "./humans.ts";
import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as gov from "./domain/government/index.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { knownSet } from "./research.ts";
import * as rs from "./domain/research/index.ts";
import { LOYALTY } from "./lords.ts";
import { GRIEVANCES } from "./moods.ts";
import { NO_TONGUE, TONGUE_FAMILY } from "./peoples.ts";
import { titlesFor, type Titles } from "./domain/realm/index.ts";

/**
 * Government in the game (GOV-058 to GOV-066): every realm has a government
 * form, and its officials cap and lords cap. Over the officials cap, the
 * newest officials' provinces get *Grasping officials*; over the lords cap,
 * lords lose a loyalty step each New Year. A realm changes form by reform,
 * the player from the Government tab and the AI each January. The form's
 * laws (succession, colonial range, subjects it can hold) are read from it.
 * Cap buildings are not built in the game yet; until they are, each realm's
 * caps carry what it held above its form in 1444 as *Custom* (D-GOV-18).
 */

export interface GovernmentState {
  /** Each realm's form (index into gov.FORM_IDS) and the last form not set by a revolution (D-GOV-9). */
  nationForm: Uint8Array;
  nationOldForm: Uint8Array;
  /** Officials and lords each realm held above its form's part on 1 January 1444 (D-GOV-18). */
  nationCustomOfficials: Int16Array;
  nationCustomLords: Int16Array;
  /** 1 where the official is over his realm's officials cap: the province holds *Grasping officials* (GOV-005). */
  provinceGrasping: Uint8Array;
}

export function createGovernmentState(P: number, N: number): GovernmentState {
  return {
    nationForm: new Uint8Array(N),
    nationOldForm: new Uint8Array(N),
    nationCustomOfficials: new Int16Array(N),
    nationCustomLords: new Int16Array(N),
    provinceGrasping: new Uint8Array(P),
  };
}

/**
 * Realms of the map that the catalogue names otherwise: the record whose
 * start form they take, or a form where the catalogue has no record (D-GOV-18).
 */
const START_RECORD: Record<string, string> = {
  ireland: "lordship_of_ireland",
  modena: "ferrara",
  bavaria: "bavaria_munich",
  wurttemberg: "wurttemberg_stuttgart",
  pomerania: "pomerania_wolgast",
  switzerland: "swiss_confederation",
  ottomans: "ottoman",
  knights_of_rhodes: "knights_hospitaller",
  mamluks: "mamluk",
  hejaz: "mecca",
  yemen: "rasulid_yemen",
  oman: "oman_nabhani",
  timurids: "timurid_empire",
  mongols: "northern_yuan",
  tibet: "phagmodrupa",
  jurchens: "wild_jurchens",
  korea: "joseon",
  japan: "ashikaga",
  khmer: "cambodia",
  pegu: "hanthawaddy",
  bahmanis: "bahmani",
  vijayanagar: "vijayanagara",
  orissa: "gajapati",
  tunis: "hafsid",
  mossi: "mossi_ouagadougou",
  kanem_bornu: "bornu",
  aztecs: "triple_alliance",
  zapotec: "zaachila",
  maya: "maya_mani_xiu",
  chimu: "chimor",
  muisca: "muisca_bacata",
  iroquois: "haudenosaunee",
  huron: "wendat",
  pueblo: "pueblo_rio_grande",
};
const START_FORM: Record<string, gov.FormId> = { albania: "confederation", cherokee: "chiefdom", creek: "chiefdom" };

let records: Map<string, gov.CatalogueRecord> | null = null;

/** A realm's form on 1 January 1444, by the start-form rules (GOV-043). */
export function startFormOf(nationId: string): gov.FormId {
  if (START_FORM[nationId]) return START_FORM[nationId]!;
  records ??= new Map(gov.startRecords1444().map((r) => [r.id, r]));
  const r = records.get(START_RECORD[nationId] ?? nationId);
  return r ? gov.assignStartForm(r).form : "chiefdom";
}

const formIndex = new Map(gov.FORM_IDS.map((id, k) => [id, k]));

export function formOf(world: World, n: number): gov.FormId {
  return gov.FORM_IDS[world.nationForm[n]!]!;
}

/** Sets a realm's form; any change but a revolution makes it the old form too (D-GOV-9). */
export function setForm(world: World, n: number, to: gov.FormId): void {
  world.nationForm[n] = formIndex.get(to)!;
  world.nationOldForm[n] = world.nationForm[n]!;
}

/**
 * A realm-by-realm count in one pass over the provinces: the crown's
 * officials (royal provinces with an official at his post; a lord's are his
 * own), provinces held, the lords holding land (each counts 1, GOV-003) and
 * each lord's provinces.
 */
interface Census {
  officials: Int32Array;
  provinces: Int32Array;
  lords: number[][];
  lordSize: Int32Array;
}

function census(world: World): Census {
  const N = world.nationCount;
  const c: Census = { officials: new Int32Array(N), provinces: new Int32Array(N), lords: Array.from({ length: N }, () => []), lordSize: new Int32Array(world.lords.length) };
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o < 0) continue;
    c.provinces[o]!++;
    const l = world.provinceLord[p]!;
    if (l < 0) {
      if (world.provinceOfficial[p]! >= 0) c.officials[o]!++;
    } else if (c.lordSize[l]!++ === 0 && world.lords[l]!.nation >= 0) c.lords[world.lords[l]!.nation]!.push(l);
  }
  return c;
}

/** Each realm's start form, and Custom for what it holds above the form in 1444 (D-GOV-18). Runs after lords and officials are seeded. */
export function seedGovernment(world: World): void {
  const c = census(world);
  for (let n = 0; n < world.nationCount; n++) {
    const f = startFormOf(world.nationIds[n]!);
    setForm(world, n, f);
    world.nationCustomOfficials[n] = Math.max(0, c.officials[n]! - gov.form(f).officials);
    world.nationCustomLords[n] = Math.max(0, c.lords[n]!.length - gov.form(f).lords);
  }
}

/** Both caps of a realm with their parts: the form, then Custom (GOV-001, GOV-002, D-GOV-18). */
export function capsOf(world: World, n: number): { officials: gov.Cap; lords: gov.Cap } {
  const caps = gov.workOutCaps({ form: formOf(world, n), buildings: [] });
  const custom = (cap: gov.Cap, value: number): gov.Cap => (value ? { total: cap.total + value, parts: [...cap.parts, { source: "custom", value }] } : cap);
  return { officials: custom(caps.officials, world.nationCustomOfficials[n]!), lords: custom(caps.lords, world.nationCustomLords[n]!) };
}

/** Reform gold is the data's gold at this economy's scale, as works and gifts are (D-GOV-18). */
const scale = (world: World) => world.rules.defines.works.goldScale;
export const reformGold = (world: World, dataGold: number): number => Math.round(dataGold * scale(world));

/** The caps' totals without their parts, for the monthly step: the form, then Custom (no cap falls below 0, D-GOV-11). */
const officialsCap = (world: World, n: number) => Math.max(0, gov.form(formOf(world, n)).officials + world.nationCustomOfficials[n]!);
const lordsCap = (world: World, n: number) => Math.max(0, gov.form(formOf(world, n)).lords + world.nationCustomLords[n]!);

/** What a realm's reform needs are checked against (GOV-028), its gold in the data's units: no cap buildings and no conditions are in the game yet. */
function reformCountry(world: World, n: number, c: Census): gov.ReformCountry {
  return {
    form: formOf(world, n),
    gold: world.nationTreasury[n]! / scale(world),
    inventions: knownSet(world, n),
    buildings: new Set(),
    provinces: c.provinces[n]!,
    lords: c.lords[n]!.length,
    subjects: dip.relations.subjectsOf(world.diplomacy.graph, world.nationIds[n]!).length,
    facts: new Set(),
  };
}

const lordLoyalty = (l: string) => l.toLowerCase().replace(" ", "_") as gov.Loyalty;

/** The lords to slip, lowest loyalty first, then most provinces (GOV-007, GOV-031). */
function pickLords(world: World, c: Census, n: number, count: number): number[] {
  if (count <= 0) return [];
  const pad = (k: number) => String(k).padStart(6, "0");
  const view = c.lords[n]!.map((k) => ({ id: pad(k), loyalty: lordLoyalty(world.lords[k]!.loyalty), provinces: c.lordSize[k]! }));
  return gov.lordsToSlip(view, count).map(Number);
}

/** A lord loses a loyalty step; falling stops at Disloyal, as for every loyalty step (going into revolt is a rising). */
function slip(world: World, lord: number, why: string, news: News[]): void {
  const l = world.lords[lord]!;
  const i = LOYALTY.indexOf(l.loyalty);
  const next = Math.min(LOYALTY.indexOf("Disloyal"), i + 1);
  if (next <= i) return;
  l.loyalty = LOYALTY[next]!;
  if (isHuman(world, l.nation)) news.push({ kind: "unrest", text: `${l.name} is now ${l.loyalty.toLowerCase()}: ${why}`, nations: [l.nation] });
}

/**
 * The monthly government step (GOV §9), before moods read the grievances:
 * *Grasping officials* on the newest officials over a realm's cap (GOV-005,
 * GOV-006); at New Year one lord slips for each lord over the lords cap
 * (GOV-007) and the AI orders its reform (GOV-052).
 */
export function monthlyGovernment(world: World, news: News[]): void {
  const c = census(world);
  world.provinceGrasping.fill(0);
  const over = new Int32Array(world.nationCount);
  for (let n = 0; n < world.nationCount; n++) over[n] = c.officials[n]! - officialsCap(world, n);
  const posts: number[][] = Array.from({ length: world.nationCount }, () => []);
  for (let p = 0; p < world.provinceCount; p++) {
    const o = world.provinceOwner[p]!;
    if (o >= 0 && over[o]! > 0 && world.provinceLord[p]! < 0 && world.provinceOfficial[p]! >= 0) posts[o]!.push(p);
  }
  for (let n = 0; n < world.nationCount; n++) {
    if (over[n]! <= 0) continue;
    // Newest hires first, by the day each took up his post (D-GOV-17).
    posts[n]!.sort((a, b) => world.provinceOfficialSince[b]! - world.provinceOfficialSince[a]! || b - a);
    for (const p of posts[n]!.slice(0, over[n]!)) world.provinceGrasping[p] = 1;
  }
  if (world.date.month !== 1) return;
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n]) continue;
    for (const k of pickLords(world, c, n, c.lords[n]!.length - lordsCap(world, n))) slip(world, k, "more lords than the realm can hold", news);
    if (isHuman(world, n)) continue;
    const to = gov.aiReform(reformCountry(world, n, c), world.date.month);
    if (to) reformWith(world, n, to, c, news);
  }
}

/** The Reform order (GOV-027 to GOV-032): to a next form, needs met, gold paid, the listed lords slip. */
export function reform(world: World, n: number, to: string, news: News[]): string | null {
  if (!gov.isFormId(to)) return "no such form";
  return reformWith(world, n, to, census(world), news);
}

function reformWith(world: World, n: number, to: gov.FormId, c: Census, news: News[]): string | null {
  const from = formOf(world, n);
  const r = gov.reform(reformCountry(world, n, c), to);
  if (!r.ok) return WHY[r.reason] ?? r.reason;
  world.nationTreasury[n] = world.nationTreasury[n]! - reformGold(world, r.goldPaid);
  setForm(world, n, to);
  for (const k of pickLords(world, c, n, r.lordsSlip)) slip(world, k, `the reform to ${gov.formName(to).toLowerCase()}`, news);
  if (isHuman(world, n)) news.push({ kind: "reform", text: `${world.rules.nations[n]!.name} reforms from ${gov.formName(from).toLowerCase()} to ${gov.formName(to).toLowerCase()}`, nations: [n] });
  return null;
}

const WHY: Record<string, string> = {
  no_reform: "only by revolution or event",
  automatic: "it comes by itself when its condition holds",
  need_missing: "a need is not met",
  gold: "not enough gold",
};

/** A need as the player reads it: the config's words, an invention with its name, without notes on which design owns it. */
const needText = (need: string) => need.replace(/\s*\([^)]*design\)$/, "");

/** One next form on the Government tab: its numbers, each need met or not, gold, lords slipping, and why it can't be ordered. */
export interface NextFormView {
  id: string;
  name: string;
  family: string;
  officials: number;
  lords: number;
  /** "reform", "revolution" (by revolution or event only, D-GOV-2) or "condition" (comes by itself, D-GOV-3). */
  way: "reform" | "revolution" | "condition";
  needs: { label: string; met: boolean }[];
  gold: number;
  lordsSlip: number;
  /** Why the Reform button is off, or null when it can be ordered now. */
  whyNot: string | null;
  /** The new form's change to subject reach; null where it holds no subjects. */
  subjectReach: number | null;
  /** Inventions that help once in the new form, by id and name (GOV-078). */
  helpedBy: { id: string; name: string }[];
}

export interface GovernmentView {
  form: string;
  family: string;
  officials: { used: number; cap: gov.Cap };
  lords: { used: number; cap: gov.Cap };
  /** Provinces holding *Grasping officials* now. */
  grasping: number;
  laws: { succession: string; colonialRange: number; subjectReach: number | null };
  /** A horde's edge and its end: the inventions its riders fade against, null for other forms (GOV-077). */
  riders: { id: string; label: string }[] | null;
  next: NextFormView[];
}

/** The player's Government tab (GOV-049, GOV-064). */
export function governmentView(world: World, n: number): GovernmentView {
  const f = gov.form(formOf(world, n));
  const k = census(world);
  const c = reformCountry(world, n, k);
  const caps = capsOf(world, n);
  let grasping = 0;
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceGrasping[p] && world.provinceOwner[p] === n) grasping++;
  return {
    form: gov.formName(f.id),
    family: f.family,
    officials: { used: k.officials[n]!, cap: caps.officials },
    lords: { used: k.lords[n]!.length, cap: caps.lords },
    grasping,
    laws: { succession: gov.successionName(f.id), colonialRange: f.colonialRange, subjectReach: f.subjectReach },
    riders: gov.ridersLine(f.id)?.map((x) => ({ id: x.invention, label: x.label })) ?? null,
    next: f.next.map((to): NextFormView => {
      const t = gov.form(to);
      const rule = gov.findReform(f.id, to);
      const helpedBy = (rule?.helpedBy ?? []).map((id) => ({ id, name: rs.invention(id).name }));
      const base = { id: to, name: gov.formName(to), family: t.family, officials: t.officials, lords: t.lords, subjectReach: t.subjectReach, helpedBy };
      if (!rule) return { ...base, way: "revolution", needs: [], gold: 0, lordsSlip: 0, whyNot: WHY.no_reform! };
      const needs = rule.needs.map((need) => ({ label: needText(need), met: gov.needMet(need, c) }));
      if (rule.automatic) return { ...base, way: "condition", needs, gold: 0, lordsSlip: rule.lordsSlip, whyNot: WHY.automatic! };
      const r = gov.reform(c, to);
      return { ...base, way: "reform", needs, gold: reformGold(world, rule.gold), lordsSlip: rule.lordsSlip, whyNot: r.ok ? null : r.reason === "need_missing" ? `needs ${needText(r.missing!)}` : WHY[r.reason]! };
    }),
  };
}

/** Every realm's form by name, for another realm's card. */
export function realmForms(world: World): string[] {
  return Array.from({ length: world.nationCount }, (_, n) => gov.formName(formOf(world, n)));
}

/** What every realm calls its lords and officials, by its court language and its form (REALM-242). */
export function realmTitles(world: World): Titles[] {
  return Array.from({ length: world.nationCount }, (_, n) => {
    const court = world.nationCourt[n]!;
    return titlesFor(court === NO_TONGUE ? "" : TONGUE_FAMILY[court]!, gov.form(formOf(world, n)).family);
  });
}

/** Government as saved: forms by id, so a later build with other forms still reads them. */
export interface SavedGovernment {
  form: string[];
  oldForm: string[];
  customOfficials: number[];
  customLords: number[];
}

export function saveGovernment(world: World): SavedGovernment {
  return {
    form: Array.from(world.nationForm, (k) => gov.FORM_IDS[k]!),
    oldForm: Array.from(world.nationOldForm, (k) => gov.FORM_IDS[k]!),
    customOfficials: Array.from(world.nationCustomOfficials),
    customLords: Array.from(world.nationCustomLords),
  };
}

export function restoreGovernment(world: World, saved: SavedGovernment, mapNation: (old: number) => number): void {
  saved.form.forEach((id, old) => {
    const n = mapNation(old);
    if (n < 0 || !gov.isFormId(id)) return;
    world.nationForm[n] = formIndex.get(id)!;
    const was = saved.oldForm[old]!;
    world.nationOldForm[n] = gov.isFormId(was) ? formIndex.get(was)! : world.nationForm[n]!;
    world.nationCustomOfficials[n] = saved.customOfficials[old] ?? 0;
    world.nationCustomLords[n] = saved.customLords[old] ?? 0;
  });
}

/** Which officials are over the cap, as the saved grievances hold it, so a loaded week goes on as it was. */
export function graspingFromGrievances(world: World): void {
  const bit = 1 << GRIEVANCES.indexOf("Grasping officials");
  for (let p = 0; p < world.provinceCount; p++) world.provinceGrasping[p] = world.provinceGrievances[p]! & bit ? 1 : 0;
}
