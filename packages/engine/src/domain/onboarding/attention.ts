import config from "../../../../rules/data/domain/onboarding.json" with { type: "json" };

/**
 * Needs attention and guided first turns (onboarding spec §4–§5, TUT-065 …
 * TUT-083). One checks config is read after each turn's simulation; the
 * facts it reads are reported by the contexts that own them (realm, warfare,
 * recruiting, rebellions, province, research, events).
 */

const AT = config.attention;

// ---------------------------------------------------------------- the checks (TUT-077, TUT-079)

export type EntryKind = "warning" | "opportunity" | "new";

export interface Check {
  id: string;
  kind: EntryKind;
  line: string;
  source: string;
  go: string;
  cooldown_months?: number;
  under_days?: number;
  under_turns?: number;
  loyalties?: string[];
}

/** The one checks config file (TUT-077). Later systems add their own rows (TUT-083). */
export const CHECKS: Check[] = AT.checks as Check[];

export function check(id: string, checks: Check[] = CHECKS): Check {
  const c = checks.find((x) => x.id === id);
  if (!c) throw new Error(`no check ${id}`);
  return c;
}

/** A later system's warnings and first-time moments join the same config (TUT-083). */
export function addSystemChecks(checks: Check[], added: Check[]): Check[] {
  for (const a of added) if (checks.some((c) => c.id === a.id)) throw new Error(`check ${a.id} already listed`);
  return [...checks, ...added];
}

/** What the owning contexts report at the end of a turn's simulation. */
export interface AttentionFacts {
  /** Province stores that reach zero before the next harvest (realm), with the month they run out. */
  storesRunningOut?: { province: string; month: string }[];
  armies?: { name: string; place: string; reserveDays: number }[];
  /** Lords whose loyalty changed this turn (realm). */
  lords?: { name: string; loyalty: string; want: string; place?: string }[];
  monthsUnpaid?: number;
  gold?: { turnsLeft: number; emptyBy: string };
  /** Recruiting's report of many farmers levied with the harvest near. */
  leviedNearHarvest?: { farmers: number; weeks: number };
  /** Provinces whose grievances pass the rising threshold (rebellions). */
  risingTalk?: string[];
  royalWithoutOfficial?: string[];
  disloyalBorderLords?: { place: string }[];
  grain?: { market: string; castle: string };
  /** Systems seen for the first time this turn (warfare, rebellions, province, research, events). */
  firsts?: string[];
}

export interface Entry {
  key: string;
  kind: EntryKind;
  check: string;
  line: string;
  place?: string;
  screen?: string;
  almanac?: string;
}

const ONES = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

/** Numbers in words for the lines ("twelve days", "Five thousand farmers"). */
export function inWords(n: number): string {
  if (n < 20) return ONES[n]!;
  if (n < 100) return TENS[Math.floor(n / 10)]! + (n % 10 ? `-${ONES[n % 10]}` : "");
  if (n < 1000) return `${ONES[Math.floor(n / 100)]} hundred${n % 100 ? ` and ${inWords(n % 100)}` : ""}`;
  if (n < 1_000_000) return `${inWords(Math.floor(n / 1000))} thousand${n % 1000 ? ` ${inWords(n % 1000)}` : ""}`;
  return String(n);
}

const fill = (template: string, values: Record<string, string>) => {
  const s = template.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? `{${k}}`);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Runs every check on the facts; returns the entries whose condition holds (TUT-079). */
export function runChecks(f: AttentionFacts, checks: Check[] = CHECKS): Entry[] {
  const out: Entry[] = [];
  const add = (id: string, key: string, values: Record<string, string>, where: { place?: string; screen?: string } = {}) => {
    const c = checks.find((x) => x.id === id);
    if (!c) return;
    out.push({ key: `${id}:${key}`, kind: c.kind, check: id, line: fill(c.line, values), ...where });
  };
  for (const s of f.storesRunningOut ?? []) add("province bread", s.province, { province: s.province, month: s.month }, { place: s.province });
  const food = checks.find((c) => c.id === "army food low");
  for (const a of f.armies ?? []) if (food && a.reserveDays < food.under_days!) add("army food low", a.name, { army: a.name, days: inWords(a.reserveDays) }, { place: a.place });
  const cold = checks.find((c) => c.id === "lord cold");
  for (const l of f.lords ?? []) if (cold && cold.loyalties!.includes(l.loyalty)) add("lord cold", l.name, { lord: l.name, want: l.want }, { screen: "lords_list" });
  if ((f.monthsUnpaid ?? 0) > 0) add("pay owed", "army", { months: inWords(f.monthsUnpaid!) }, { screen: "army" });
  const gold = checks.find((c) => c.id === "treasury empty");
  if (f.gold && gold && f.gold.turnsLeft < gold.under_turns!) add("treasury empty", "gold", { month: f.gold.emptyBy }, { screen: "country_card" });
  if (f.leviedNearHarvest) add("farmers under arms", "levy", { farmers: inWords(f.leviedNearHarvest.farmers), weeks: inWords(f.leviedNearHarvest.weeks) }, { screen: "levy" });
  for (const p of f.risingTalk ?? []) add("talk of rising", p, { province: p }, { place: p });
  for (const p of f.royalWithoutOfficial ?? []) add("no official", p, { province: p }, { place: p });
  for (const l of f.disloyalBorderLords ?? []) add("lord across the border", l.place, {}, { place: l.place });
  if (f.grain) add("grain sells high", f.grain.market, { market: f.grain.market, castle: f.grain.castle }, { place: f.grain.castle });
  return out;
}

// ---------------------------------------------------------------- the list (TUT-072 … TUT-082)

export interface AttentionList {
  entries: Entry[];
  muted: string[];
  /** Dismissed entries and the month count when they may return. */
  dismissed: Record<string, number>;
  seen: string[];
  /** Months since the campaign began, as the checks last ran. */
  month: number;
}

export const newAttentionList = (muted: string[] = [], seen: string[] = []): AttentionList => ({ entries: [], muted, dismissed: {}, seen, month: 0 });

const ORDER = AT.kinds_order as EntryKind[];

/**
 * After each turn's simulation: add entries whose check holds, drop those
 * whose cause ended, skip muted kinds and dismissed entries in cooldown, and
 * add a New entry the first time a system shows up (TUT-074, TUT-075,
 * TUT-076, TUT-082). Warnings first, then opportunities, then New (TUT-073).
 */
export function runAttention(list: AttentionList, f: AttentionFacts, month: number, checks: Check[] = CHECKS): Entry[] {
  list.month = month;
  const fresh = runChecks(f, checks).filter((e) => !list.muted.includes(e.check) && !((list.dismissed[e.key] ?? -1) > month));
  const news: Entry[] = [];
  for (const sys of f.firsts ?? []) {
    if (list.seen.includes(sys)) continue;
    list.seen.push(sys);
    const page = (AT.first_time as Record<string, string>)[sys];
    if (!page) throw new Error(`no first-time entry for ${sys}`);
    news.push({ key: `new:${sys}`, kind: "new", check: `first ${sys}`, line: sys, almanac: page });
  }
  const keptNews = list.entries.filter((e) => e.kind === "new");
  const added = fresh.filter((e) => !list.entries.some((x) => x.key === e.key));
  list.entries = sortEntries([...fresh, ...keptNews, ...news]);
  return [...added, ...news];
}

export function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind));
}

/** Dismiss one entry: it leaves, and its check's cooldown starts (TUT-075, TUT-082). */
export function dismiss(list: AttentionList, key: string, checks: Check[] = CHECKS): void {
  const e = list.entries.find((x) => x.key === key);
  if (!e) return;
  list.entries = list.entries.filter((x) => x.key !== key);
  const c = checks.find((x) => x.id === e.check);
  list.dismissed[key] = list.month + (c?.cooldown_months ?? 0);
}

/** The entry menu opens on a long-press, a right-click or {btn:info} (TUT-076). */
export function entryMenu(gesture: string): string[] | null {
  return Object.values(config.inputs.entry_menu_gesture).includes(gesture) ? ["Don't list this kind again"] : null;
}

/** "Don't list this kind again" (TUT-076). */
export function muteKind(list: AttentionList, kind: string): void {
  if (!list.muted.includes(kind)) list.muted.push(kind);
  list.entries = list.entries.filter((e) => e.check !== kind);
}

/** Go there: the camera moves to the place, or the screen opens (TUT-072). */
export function goThere(e: Entry): { camera?: string; screen?: string } {
  if (e.place) return { camera: e.place };
  if (e.almanac) return { screen: `almanac:${e.almanac}` };
  return e.screen ? { screen: e.screen } : {};
}

/** The End turn button's count of warnings; the turn report links to the list (TUT-080, TUT-081). */
export function endTurnBadge(list: AttentionList): number {
  return list.entries.filter((e) => e.kind === "warning").length;
}
export const turnReportAttention = (): { links: "Needs attention"; repeats: false } => ({ links: "Needs attention", repeats: false });

/** In the tutorial the vizier reads the same checks in his note; outside it there is no advisor (TUT-071, TUT-078). */
export function vizierNotes(entries: Entry[], tutorialRunning: boolean): string[] {
  return tutorialRunning ? entries.filter((e) => e.kind !== "new").map((e) => e.line) : [];
}

// ---------------------------------------------------------------- guided first turns (TUT-065 … TUT-070)

export interface Goal {
  id: string;
  text: string;
  screen: string;
  done: string;
  needs?: string;
  dismissable?: boolean;
  steps?: string[];
}

export const GOALS: Goal[] = config.goals as Goal[];

export interface GoalsList {
  goals: { goal: Goal; done: boolean }[];
  folded: boolean;
  closedForGood: boolean;
}

/** Who sees the goals list: a player who skipped the tutorial, or one who finished it and starts a first real campaign (TUT-065). */
export function showsGoals(profile: { skippedTutorial?: boolean; finishedTutorial?: boolean; realCampaignsStarted: number }): boolean {
  return !!profile.skippedTutorial || (!!profile.finishedTutorial && profile.realCampaignsStarted === 0);
}

/** The goals adapt to the realm: no lords, no "Check your lords" (TUT-069). */
export function newGoalsList(realm: { hasLords: boolean }): GoalsList {
  return { goals: GOALS.filter((g) => g.needs !== "lords" || realm.hasLords).map((goal) => ({ goal, done: false })), folded: false, closedForGood: false };
}

export type GoalEvent =
  | { type: "opened"; screen: string }
  | { type: "chosen"; screen: string }
  | { type: "royal provinces without official"; count: number }
  | { type: "pressed"; screen: string }
  | { type: "dismissed"; goal: string };

/** A goal ticks off when its done condition is met (TUT-066). */
export function goalEvent(list: GoalsList, e: GoalEvent): string[] {
  const ticked: string[] = [];
  for (const g of list.goals) {
    if (g.done) continue;
    const ok =
      (e.type === "dismissed" && e.goal === g.goal.id && !!g.goal.dismissable) ||
      (e.type === "royal provinces without official" && g.goal.id === "officials" && e.count === 0) ||
      ((e.type === "opened" || e.type === "chosen" || e.type === "pressed") && e.type === g.goal.done && e.screen === g.goal.screen);
    if (ok) {
      g.done = true;
      ticked.push(g.goal.text);
    }
  }
  return ticked;
}

/** The list is visible under the top bar for the first in-game year, unless closed for good (TUT-065, TUT-070). */
export function goalsVisible(list: GoalsList, monthsSinceStart: number): boolean {
  return !list.closedForGood && monthsSinceStart < config.goals_months;
}

/** Folded: a single icon with the count of open goals, never over the map (TUT-067). */
export function foldGoals(list: GoalsList): { icon: true; count: number; coversMap: false } {
  list.folded = true;
  return { icon: true, count: list.goals.filter((g) => !g.done).length, coversMap: false };
}

export function closeGoalsForGood(list: GoalsList): void {
  list.closedForGood = true;
}

/** Show me: the goal's tutorial steps, run in this campaign without the scenario overrides (TUT-068). */
export function showMe(goalText: string): { steps: string[]; scenarioOverrides: false } {
  const g = GOALS.find((x) => x.text === goalText);
  if (!g) throw new Error(`no goal "${goalText}"`);
  return { steps: g.steps ?? [], scenarioOverrides: false };
}
