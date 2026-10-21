import config from "../../../../rules/data/domain/onboarding.json" with { type: "json" };
import { loyaltyRank, callRetinue, type Loyalty, type Lord } from "../realm/index.ts";
import { conditionalEntries, type Diplomacy, type LedgerEntry } from "../diplomacy/index.ts";
import { ferryDays, ferryOpen, straitBetween, type Army, type MoveWorld } from "../troop-movement/index.ts";

/**
 * The tutorial campaign "Murad's Frontier" (the Ottomans under Murad I from
 * 20 September 1378; onboarding spec §4–§5, TUT-001 … TUT-064, TUT-098 …
 * TUT-113): chapters, the step script and the pure step
 * machine that runs it, tutorial progress, text tokens and prompts, the
 * pacing tools and the scenario file's world rules. State is plain data the
 * caller owns; nothing here touches the screen.
 */

export type OnboardingConfig = typeof config;
export const onboardingConfig: OnboardingConfig = config;

// ---------------------------------------------------------------- chapters (TUT-011 … TUT-013)

export interface Chapter {
  n: number;
  name: string;
  date: string;
  turns: number | number[];
  advance?: boolean;
  topic: string | null;
  done_when: string[];
}

export const CHAPTERS: Chapter[] = config.chapters as Chapter[];

export function chapter(n: number): Chapter {
  const c = CHAPTERS.find((x) => x.n === n);
  if (!c) throw new Error(`no chapter ${n}`);
  return c;
}

export function chapterByName(name: string): Chapter {
  const c = CHAPTERS.find((x) => x.name === name);
  if (!c) throw new Error(`no chapter "${name}"`);
  return c;
}

/** A chapter is done when every part of its Done-when condition has happened (TUT-013). */
export function chapterDoneWhen(n: number, happened: ReadonlySet<string>): boolean {
  return chapter(n).done_when.every((c) => happened.has(c));
}

// ---------------------------------------------------------------- progress (TUT-004, TUT-105, TUT-106)

/** Tutorial progress lives on the player profile, apart from campaign saves (TUT-106). */
export interface Progress {
  done: number[];
  current: { chapter: number; step: number } | null;
  muted: string[];
  seen: string[];
  goalsClosed: string[];
}

export const newProgress = (): Progress => ({ done: [], current: null, muted: [], seen: [], goalsClosed: [] });

export function markDone(p: Progress, n: number): void {
  if (!p.done.includes(n)) p.done.push(n);
  p.done.sort((a, b) => a - b);
}

/** The chapter list: a tick on each chapter done; any chapter can be started (TUT-105). */
export function chapterList(p: Progress): { n: number; name: string; tick: boolean; canStart: boolean }[] {
  return CHAPTERS.map((c) => ({ n: c.n, name: c.name, tick: p.done.includes(c.n), canStart: true }));
}

/** Progress as the profile stores it, so closing the app keeps the step (TUT-004). */
export const saveProgress = (p: Progress): string => JSON.stringify(p);
export const loadProgress = (text: string): Progress => JSON.parse(text) as Progress;

// ---------------------------------------------------------------- the step script (TUT-054 … TUT-058)

export type StepKind = "look" | "do" | "choose" | "watch";

export interface Step {
  id: string;
  kind: StepKind;
  text: string;
  anchor: string;
  allow: string[];
  done: string;
  guide_face: string;
  max_chars: number;
  lens?: string;
}

const SCRIPT = config.steps as unknown as Record<string, Step[]>;

/** The steps of a chapter; chapter 0 has one script per input (TUT-103). */
export function chapterSteps(n: number): Step[] {
  return SCRIPT[String(n)] ?? [];
}

export function stepById(id: string): Step {
  for (const list of Object.values(SCRIPT)) for (const s of list) if (s.id === id) return s;
  throw new Error(`no step ${id}`);
}

/** How a kind of step ends (TUT-055 … TUT-058). */
export function stepKind(kind: StepKind): { ends_on: string[]; next_button: boolean; auto_advance: boolean; next_reacts?: boolean; pausable?: boolean } {
  return (config.step_kinds as Record<StepKind, { ends_on: string[]; next_button: boolean; auto_advance: boolean; next_reacts?: boolean; pausable?: boolean }>)[kind];
}

/** The chapter 0 script for an input: one step per camera action, each tried once (TUT-103). */
export function chapter0Script(input: string): { input: string; cameraSteps: string[] } {
  if (!config.chapter0_inputs.includes(input)) throw new Error(`no chapter 0 script for ${input}`);
  const cams = chapterSteps(0).filter((s) => s.done.startsWith("camera_action("));
  return { input, cameraSteps: cams.map((s) => /camera_action\((\w+)\)/.exec(s.done)![1]!) };
}

export type StepInput =
  | { type: "confirm" }
  | { type: "tap"; target: string }
  | { type: "condition"; done: string }
  | { type: "choice"; option: string }
  | { type: "played out" }
  | { type: "idle"; seconds: number }
  | { type: "free look" }
  | { type: "pause" }
  | { type: "skip step" };

export interface StepRun {
  chapter: number;
  index: number;
  step: Step;
  freeLook: boolean;
  idle: number;
  pulse: boolean;
  stuckHint: boolean;
  paused: boolean;
  /** The choice made on the last `choose` step, for the next step to react to. */
  lastChoice?: string;
  ended: boolean;
  how?: "completed" | "skipped";
}

export function showStep(chapterN: number, index: number, step: Step = chapterSteps(chapterN)[index]!): StepRun {
  return { chapter: chapterN, index, step, freeLook: false, idle: 0, pulse: false, stuckHint: false, paused: false, ended: false };
}

/** Does a control respond while this step is shown (TUT-020, TUT-021)? Dimmed controls stay visible. */
export function controlState(r: StepRun, control: string): { responds: boolean; dimmed: boolean; hidden: false } {
  if (r.step.kind !== "do" || r.freeLook) return { responds: true, dimmed: false, hidden: false };
  const ok = r.step.allow.includes(control);
  return { responds: ok, dimmed: !ok, hidden: false };
}

/**
 * Feeds one input to a running step. `look` ends on confirm or a tap anywhere
 * and never by time (TUT-055, TUT-112); `do` ends when its condition is met
 * (TUT-056); `choose` on any choice (TUT-057); `watch` when what it plays
 * ends (TUT-058). Idle help on a `do` step after 8 and 20 seconds (TUT-033).
 */
export function stepInput(r: StepRun, input: StepInput): StepRun {
  if (r.ended) return r;
  const end = (how: "completed" | "skipped") => ({ ...r, ended: true, how });
  switch (input.type) {
    case "skip step":
      return end("skipped");
    case "free look":
      return r.step.kind === "do" ? { ...r, freeLook: true } : r;
    case "pause":
      return stepKind(r.step.kind).pausable ? { ...r, paused: true } : r;
    case "idle": {
      const idle = r.idle + input.seconds;
      if (r.step.kind !== "do") return { ...r, idle };
      return { ...r, idle, pulse: idle >= config.idle.pulse_after_s, stuckHint: idle >= config.idle.skip_hint_after_s };
    }
    case "confirm":
      return r.step.kind === "look" ? end("completed") : r;
    case "tap":
      if (r.step.kind === "look") return end("completed");
      return { ...r, idle: 0 };
    case "condition":
      return r.step.kind === "do" && input.done === r.step.done ? end("completed") : r;
    case "choice":
      return r.step.kind === "choose" ? { ...end("completed"), lastChoice: input.option } : r;
    case "played out":
      return r.step.kind === "watch" ? end("completed") : r;
  }
}

/** The note's text with the idle hint added after 20 seconds (TUT-033). */
export function noteText(r: StepRun, lang = "en"): string {
  const strings = (config.strings as Record<string, Record<string, string>>)[lang]!;
  const base = strings[r.step.text] ?? r.step.text;
  return r.stuckHint ? `${base} ${strings["tut.idle.stuck"]}` : base;
}

/** Whether a step has a Next button: only `look` steps (TUT-056). */
export const hasNextButton = (s: Step): boolean => stepKind(s.kind).next_button;

// ---------------------------------------------------------------- the tutorial session (TUT-004, TUT-005, TUT-064)

export interface Tutorial {
  progress: Progress;
  run: StepRun | null;
  inMenu: boolean;
  /** What the chapter save loaded (TUT-012). */
  loadedSave: number | null;
  events: { type: string; chapter: number; step?: string }[];
}

export function startTutorial(p: Progress): Tutorial {
  const t: Tutorial = { progress: p, run: null, inMenu: false, loadedSave: null, events: [] };
  if (p.current) resume(t, p.current.chapter, p.current.step);
  else startChapter(t, 0);
  return t;
}

/** Starts a chapter from its own chapter save (TUT-012). */
export function startChapter(t: Tutorial, n: number): void {
  chapter(n);
  t.loadedSave = n;
  t.inMenu = false;
  t.events.push({ type: "ChapterStarted", chapter: n });
  resume(t, n, 0);
}

function resume(t: Tutorial, n: number, index: number): void {
  const steps = chapterSteps(n);
  const step = steps[index] ?? { id: `ch${n}.step${index + 1}`, kind: "look" as const, text: "", anchor: "", allow: [], done: "confirm", guide_face: "vizier", max_chars: config.max_chars };
  t.run = showStep(n, index, step);
  t.progress.current = { chapter: n, step: index };
  t.events.push({ type: "StepShown", chapter: n, step: step.id });
}

/**
 * Feeds an input; an ended step moves on to the next, or the chapter's end:
 * the last step ended marks the chapter done and clears the place to resume
 * (TUT-013, TUT-004), and the run stays ended for the caller to close.
 */
export function tutorialInput(t: Tutorial, input: StepInput): void {
  if (!t.run || t.run.ended) return;
  t.run = stepInput(t.run, input);
  if (!t.run.ended) return;
  const { chapter: n, index, step, how } = t.run;
  t.events.push({ type: how === "skipped" ? "StepSkipped" : "StepCompleted", chapter: n, step: step.id });
  if (index + 1 < chapterSteps(n).length) resume(t, n, index + 1);
  else {
    markDone(t.progress, n);
    t.progress.current = null;
    t.events.push({ type: "ChapterCompleted", chapter: n });
  }
}

/** The chapter's last step has ended: the chapter is over (TUT-013). */
export const chapterOver = (t: Tutorial): boolean => !!t.run?.ended && t.run.index + 1 >= chapterSteps(t.run.chapter).length;

/** The chapters the game can play today; the rest wait for their chapter saves and scripted events (D-TUT-19). */
export const playableNow = (): number[] => [...config.playable_now];

/** The next chapter after n that can be played today, or null: the tutorial's end card comes next (D-TUT-19). */
export function nextPlayable(n: number): number | null {
  return playableNow().find((c) => c > n) ?? null;
}

/** The tutorial is finished once every chapter playable today is done; Tutorial then moves under More (SHELL-152, D-TUT-19). */
export const tutorialFinished = (p: Progress): boolean => playableNow().every((n) => p.done.includes(n));

/** The map province a place token points at, by its name on the map (TUT-059). */
export function placeProvince(key: string): string | null {
  return (config.tokens.place_province as Record<string, string>)[key] ?? null;
}

/** A tutorial string by key, for the note's own words (TUT-113). */
export function tutorialString(key: string, lang = "en"): string {
  return (config.strings as Record<string, Record<string, string>>)[lang]![key] ?? key;
}

/** The tutorial's three pause-menu lines (TUT-064). */
export const pauseMenuLines = (): string[] => [...config.pause_menu_lines];

/** Skip this chapter: the next chapter starts from its own save (TUT-005). */
export function skipChapter(t: Tutorial): void {
  const n = t.run?.chapter ?? 0;
  t.events.push({ type: "ChapterSkipped", chapter: n });
  startChapter(t, Math.min(n + 1, CHAPTERS.length - 1));
}

/** Leave the tutorial: back to the menu, progress kept, nothing locked (TUT-005). */
export function leaveTutorial(t: Tutorial): { menu: true; locked: string[] } {
  const n = t.run?.chapter ?? 0;
  t.events.push(t.run ? { type: "TutorialLeft", chapter: n, step: t.run.step.id } : { type: "TutorialLeft", chapter: n });
  t.inMenu = true;
  t.run = null;
  return { menu: true, locked: [] };
}

/** Counter of steps in the chapter (TUT-063). */
export const stepCounter = (r: StepRun): string => `${r.index + 1} / ${chapterSteps(r.chapter).length}`;

// ---------------------------------------------------------------- how a step looks (TUT-060 … TUT-062, TUT-109, TUT-111)

/** The note sits at the bottom edge, at the top when the target is low, never over it (TUT-060). */
export function notePlacement(targetY: number): { edge: string; maxHeightShare: number } {
  const [num, den] = config.note.max_height_share as [number, number];
  return { edge: targetY > 0.5 ? config.note.edge_when_target_low : config.note.edge, maxHeightShare: num / den };
}

export function stepLook(o: { reducedMotion?: boolean; uiScale?: "default" | "largest" } = {}): {
  dim: number;
  black: boolean;
  face: string;
  handBobs: boolean;
  spotlightPulses: boolean;
  textScale: string;
  extraLines: number;
} {
  return {
    dim: config.note.dim,
    black: false,
    face: `the ${config.guide_face.title} ${config.guide_face.name}`,
    handBobs: !o.reducedMotion,
    spotlightPulses: !o.reducedMotion,
    textScale: o.uiScale ?? "default",
    extraLines: o.uiScale === "largest" ? config.note.extra_lines_at_largest_scale : 0,
  };
}

/** The guide face appears only in the tutorial (TUT-062, TUT-071). */
export const guideFace = (inTutorial: boolean): string | null => (inTutorial ? config.guide_face.name : null);

/** The label on the note's face (TUT-119, D-TUT-2). */
export const guideFaceLabel = (): string => config.guide_face.label;

/** Any battle, the chapter 5 clash before Pera included, can be skipped to the result; under reduced motion the hand and spotlight stay still (TUT-111). */
export const battleSkippable = (): boolean => true;

// ---------------------------------------------------------------- tokens and prompts (TUT-006, TUT-059, TUT-098, TUT-099, TUT-113)

export type Input = "touch" | "mouse and keyboard" | "controller";

export interface PromptContext {
  /** The last input the player touched; prompts swap live (TUT-098). */
  lastInput: Input;
  controller?: string;
  steamInput?: boolean;
}

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "prompt"; action: string; text: string; glyphs?: string }
  | { kind: "screen"; name: string; bold: true; icon: string }
  | { kind: "stat"; name: string; icon: string; link: string }
  | { kind: "name"; text: string; link: true; cameraTo: string };

/** The glyph set for a controller (TUT-099). */
export function glyphs(controller: string | undefined, steamInput = false): string {
  if (steamInput) return config.inputs.steam_input_glyphs;
  return (controller && (config.inputs.glyph_families as Record<string, string>)[controller]) || config.inputs.generic_glyphs;
}

const TOKEN = /\{(btn|ui|stat|place|lord):([a-z_]+)\}/g;

/** Tokens in a text, in order, as written (TUT-113). */
export const tokensOf = (text: string): string[] => [...text.matchAll(TOKEN)].map((m) => m[0]);

/** Replaces text tokens for the player's current input (TUT-059). */
export function resolveText(text: string, ctx: PromptContext): Segment[] {
  const out: Segment[] = [];
  let last = 0;
  for (const m of text.matchAll(TOKEN)) {
    if (m.index! > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    last = m.index! + m[0].length;
    const [, kind, key] = m as unknown as [string, string, string];
    const T = config.tokens;
    if (kind === "btn") {
      const p = (config.inputs.prompts as Record<string, Record<string, string>>)[ctx.lastInput]![key]!;
      out.push(ctx.lastInput === "controller" ? { kind: "prompt", action: key, text: p, glyphs: glyphs(ctx.controller, ctx.steamInput) } : { kind: "prompt", action: key, text: p });
    } else if (kind === "ui") {
      const u = (T.ui as Record<string, { name: string; icon: string }>)[key]!;
      out.push({ kind: "screen", name: u.name, bold: true, icon: u.icon });
    } else if (kind === "stat") {
      const st = (T.stat as Record<string, { name: string; icon: string; almanac: string }>)[key]!;
      out.push({ kind: "stat", name: st.name, icon: st.icon, link: st.almanac });
    } else {
      const name = (T[kind as "place" | "lord"] as Record<string, string>)[key]!;
      out.push({ kind: "name", text: name, link: true, cameraTo: name });
    }
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

/** The step length lint, per language; tokens must stay in the string (INV-TUT-6, TUT-113). */
export function lintStepText(source: string, translated: string, maxChars = config.max_chars): string[] {
  const errors: string[] = [];
  if (translated.length > maxChars) errors.push(`${translated.length} characters, over ${maxChars}`);
  const a = [...tokensOf(source)].sort();
  const b = [...tokensOf(translated)].sort();
  if (a.join() !== b.join()) errors.push("tokens changed");
  return errors;
}

/** Focus starts on the button the step wants; the spotlight follows the focused element (TUT-101). */
export function controllerFocus(step: Step, moved?: string): { focus: string; spotlight: string } {
  const focus = moved ?? step.anchor;
  return { focus, spotlight: focus };
}

/** No step asks for typed text (TUT-102). */
export const stepNeedsText = (s: Step): boolean => /text_entry|type\(/.test(s.done);

// ---------------------------------------------------------------- pacing tools (TUT-019, TUT-022, TUT-023)

const SC = config.scenario;

/** The quiet world holds back AI wars against the Ottomans and in its regions, except scripted ones (TUT-022). */
export function warHeldBack(war: { attacker: string; target?: string; region?: string; scripted?: boolean }, tutorialRunning: boolean): boolean {
  if (!tutorialRunning || war.scripted) return false;
  const q = SC.quiet_world;
  if (war.target === q.protected) return true;
  const region = war.region ?? (q.countries_in_regions as Record<string, string>)[war.attacker];
  return !!region && q.regions.includes(region);
}

/** The chapter 5 clash before Pera always opens the battle screen at one bell every 3 seconds (TUT-023). */
export function battleView(battle: string, tutorialRunning: boolean): { battleScreen: boolean; secondsPerBell: number | null } {
  const w = SC.watch_speed;
  if (tutorialRunning && battle === w.battle) return { battleScreen: w.opens_battle_screen, secondsPerBell: w.seconds_per_bell };
  return { battleScreen: false, secondsPerBell: null };
}

// ---------------------------------------------------------------- scenario file (TUT-024 … TUT-027)

export interface ScriptedEvent {
  id: string;
  name: string;
  date: string;
  tutorial_only: boolean;
  chapter: number;
  history: { summary: string; sources: string[] };
  line?: string;
  options?: string[];
}

export const SCRIPTED_EVENTS: ScriptedEvent[] = config.scripted_events as ScriptedEvent[];

/** A scripted event by id. */
export function scriptedEvent(id: string): ScriptedEvent {
  const e = SCRIPTED_EVENTS.find((x) => x.id === id);
  if (!e) throw new Error(`no scripted event ${id}`);
  return e;
}

/** Events that may fire: `tutorial_only` events never fire in a real campaign (TUT-026). */
export function mayFire(e: { tutorial_only?: boolean }, campaign: "tutorial" | "real"): boolean {
  return !e.tutorial_only || campaign === "tutorial";
}

export const historicalDate = (what: keyof typeof config.historical_dates): string => config.historical_dates[what];

export const scenarioOverrides = () => SC.overrides;

export interface ForcedAi {
  chapter: number;
  realm: string;
  holds: string;
  with?: string;
  commander?: string;
  offers_terms_after_failing_castle_months?: number;
  accepts_terms_when?: string;
}

/** The forced AI of chapters 5 and 8, by the leader it steers (TUT-027, TUT-031). */
export function forcedAi(leader: string): ForcedAi | undefined {
  return (SC.forced_ai as Record<string, ForcedAi>)[leader];
}

/** Andronikos IV's side offers terms after failing to take one castle in two months, when the clash before Pera was lost (TUT-031). */
export function andronikosOffersTerms(monthsFailingOneCastle: number): boolean {
  return monthsFailingOneCastle >= SC.forced_ai["Andronikos IV"].offers_terms_after_failing_castle_months;
}

/** Manuel II accepts terms once Serres has fallen (TUT-027). */
export const manuelAcceptsTerms = (serresFallen: boolean): boolean => serresFallen && SC.forced_ai["Manuel II"].accepts_terms_when === "Serres fallen";

/** A chapter that needs more gold than the player has starts with a scripted loan, shown as a real debt line (TUT-034). */
export function chapterStartLoan(minimum: number, gold: number, house: number): { lender: string; amount: number; debtLine: true } | null {
  if (gold >= minimum) return null;
  const houses = SC.loan_houses;
  return { lender: `a ${houses[house % houses.length]} banking house`, amount: minimum - gold, debtLine: true };
}

/** The chapter 8 siege of Serres after a failed storm: month by month until breached or terms (TUT-035). */
export function siegeMonth(s: { breached: boolean; enemyOffersTerms: boolean }): "carries on" | "chapter ends" {
  return s.breached || s.enemyOffersTerms ? "chapter ends" : "carries on";
}

/** After a lost clash before Pera the step text changes (TUT-031). */
export function clashStepText(won: boolean, lang = "en"): string | null {
  return won ? null : (config.strings as Record<string, Record<string, string>>)[lang]!["tut.ch5.lost_clash"]!;
}

/** The opening card of a chapter says in one line that history is back on course after a choice that differed (TUT-015). */
export function openingCard(n: number, previousDiffered: boolean): { chapter: number; backOnCourseLine: boolean; fromSave: number } {
  return { chapter: n, backOnCourseLine: previousDiffered, fromSave: n };
}

/** Every chapter can be played in the free tier and the demo (TUT-017). */
export function playableChapters(edition: string): number[] {
  if (!config.editions.includes(edition)) throw new Error(`unknown edition ${edition}`);
  return config.free_tier.includes(config.tutorial_nation) ? CHAPTERS.map((c) => c.n) : [];
}

// ---------------------------------------------------------------- the Byzantine civil war (TUT-036 … TUT-049)

export type EmperorChoice = keyof typeof SC.civil_war.sides;

export interface CivilWarSide {
  emperor: string;
  partner: string;
  partner_brings: string;
  war_aim: string | null;
  aim_granted_by: string | null;
  enemy: string;
  enemy_partner: string;
  closed_strait: string;
  historical: boolean;
}

/**
 * The start state's civil war (TUT-037): Andronikos IV on the throne since
 * 12 August 1376, John V and Manuel II in his prison, Venice and Genoa at war
 * over Tenedos; the country card's line once John V has escaped.
 */
export function civilWar(): { emperor: string; since: string; prisoners: string[]; partnersAtWar: { a: string; b: string; over: string; since: string }; cardLine: string; choices: EmperorChoice[] } {
  const w = SC.civil_war;
  return { emperor: w.emperor, since: w.since, prisoners: [...w.prisoners], partnersAtWar: { ...w.partners_at_war }, cardLine: w.card_line, choices: Object.keys(w.sides) as EmperorChoice[] };
}

/** What backing one emperor brings: the Italian partner, the war aim, the enemy and the strait his partner's galleys close (TUT-038, TUT-040). */
export function emperorChoice(choice: EmperorChoice): CivilWarSide {
  return (SC.civil_war.sides as Record<EmperorChoice, CivilWarSide>)[choice];
}

/** The news that ends chapter 3: John V and Manuel have escaped to Murad (TUT-037). */
export function escapeNewsLine(): string {
  return scriptedEvent("tut_john_escapes").line!;
}

/** The tutorial's start state (X-25, D-TUT-9): 20 September 1378, Murad I with Bayezid his heir, Edirne the capital and Bursa the second seat, Andronikos IV on the Byzantine throne. */
export function tutorialStart(): { date: string; ruler: string; rulerAge: number; heir: string; heirAge: number; capital: string; secondSeat: string; emperor: string; prisoners: string[] } {
  const c = SC.catalogue_court;
  return { date: config.start_date, ruler: c.ruler, rulerAge: c.ruler_age, heir: c.heir, heirAge: c.heir_age, capital: c.capital, secondSeat: c.second_seat, emperor: SC.civil_war.emperor, prisoners: [...SC.civil_war.prisoners] };
}

/**
 * Off script inside one chapter (TUT-030, TUT-032, D-TUT-3): asking after
 * John V sends Andronikos's envoy away cold until chapter 1 ends; ignoring the
 * wavering lord drops him one step within chapter 2. The next chapter's save
 * carries nothing over.
 */
export function offScript(choice: "Take the tribute" | "Ask after John V" | "ignored lord", chapterN: number): { chapter: number; effect?: string; until?: string; loyaltyStepsDown?: number; carriesOver: false } {
  const o = SC.off_script;
  if (choice === "ignored lord") return { chapter: chapterN, loyaltyStepsDown: chapterN === o.ignored_lord.chapter ? o.ignored_lord.loyalty_steps_down : 0, carriesOver: false };
  if (choice === "Take the tribute") return { chapter: chapterN, carriesOver: false };
  return { chapter: chapterN, effect: o.asked_after_john.effect, until: o.asked_after_john.until, carriesOver: false };
}

/** The Ottoman worked-example numbers for the recruiting, battle and siege lessons (TUT-018, D-TUT-11; provisional). */
export const ottomanExamples = () => config.ottoman_examples;

export type FaithChoice = keyof typeof SC.faith_choice;

/**
 * The chapter 4 Faith policy choice (TUT-042 … TUT-044): the Christian
 * sipahis' loyalty, the faith tax and the Pious Sunni lords; a wavering lord
 * brings no retinue (realm's callRetinue).
 */
export function faithChoice(choice: FaithChoice, sipahis: Lord, piousSunniLords: Lord[]): { sipahis: Loyalty; faithTax: string; retinue: number; piousWaver: boolean } {
  const c = SC.faith_choice[choice];
  sipahis.loyalty = c.sipahis as Loyalty;
  if (c.pious_sunni_lords_waver) for (const l of piousSunniLords) l.loyalty = stepDown(l.loyalty);
  return { sipahis: sipahis.loyalty, faithTax: c.faith_tax, retinue: callRetinue(sipahis), piousWaver: c.pious_sunni_lords_waver };
}

const LADDER: Loyalty[] = ["Loyal", "Wavering", "Disloyal", "In revolt"];
/** One step lower in loyalty, stopping at Disloyal. */
export function stepDown(l: Loyalty): Loyalty {
  const i = loyaltyRank(l);
  return LADDER[Math.min(i + 1, loyaltyRank("Disloyal"))]!;
}

/** Persecute is on the screen, dimmed in the tutorial, with its note (TUT-045). */
export function persecuteOption(tutorialRunning: boolean): { shown: true; dimmed: boolean; note: string } {
  return { shown: true, dimmed: tutorialRunning && SC.persecute.dimmed, note: SC.persecute.note };
}

/** The Faith lens of chapter 0: hatching where a community is 30 % or more (TUT-041). */
export function faithLensHatched(share: number): boolean {
  return share >= SC.faith_lens.hatch_share;
}

/** What the chapter 0 lens step asks for, and the marks that make it work without colour (TUT-110). */
export function lensStep(): { lens: string; marks: string[] } {
  const step = chapterSteps(0).find((s) => s.lens)!;
  return { lens: step.lens!, marks: (SC.lenses as Record<string, { marks: string[] }>)[step.lens!]!.marks };
}

/** The turn report after the clash before Pera: the result with the faith choice and the partner's help, both sides' dead counted the same way (TUT-047, TUT-049). */
export function clashReport(r: { won: boolean; choice: FaithChoice; emperor: EmperorChoice; sipahis: Lord; dead: Record<string, number> }): {
  result: string;
  faithChoice: FaithChoice;
  sipahisRode: number;
  stayedHomeBecause: Loyalty | null;
  partnerBrought: string;
  dead: { side: string; dead: number }[];
  reward: null;
} {
  const rode = callRetinue(r.sipahis);
  return {
    result: r.won ? "won" : "lost",
    faithChoice: r.choice,
    sipahisRode: rode,
    stayedHomeBecause: rode ? null : r.sipahis.loyalty,
    partnerBrought: emperorChoice(r.emperor).partner_brings,
    dead: Object.entries(r.dead).map(([side, dead]) => ({ side, dead })),
    reward: null,
  };
}

/** Peace with Andronikos IV's side ends the war for the throne, and his Genoese partner's part in it (TUT-047). */
export function afterClashPeace(): { warEnds: true; partnerLeaves: true } {
  return { warEnds: true, partnerLeaves: true };
}

/** Chapter 3's Faith line and the madrasa's faith (TUT-048). */
export const chapter3Faith = () => SC.chapter3_faith_line;

/** The Janissary lesson: the pençik and the first yeniçeri (TUT-050 … TUT-053). */
export const pencik = () => SC.pencik;

/** The vignette's cost on the map: the Orthodox lords there sit one step lower (TUT-052). */
export function pencikCost(orthodoxLords: Lord[]): { peopleLine: string; grievance: string } {
  for (const l of orthodoxLords) for (let i = 0; i < SC.pencik.province_card.orthodox_lords_step_down; i++) l.loyalty = stepDown(l.loyalty);
  return { peopleLine: SC.pencik.province_card.people_line, grievance: SC.pencik.province_card.grievance };
}

// ---------------------------------------------------------------- keep ruling (TUT-107, TUT-108)

export interface TutorialSave {
  id: string;
  kind: "tutorial" | "campaign";
  quietWorld: boolean;
  scriptedEvents: boolean;
  advice: "vizier notes" | "Needs attention";
  beganAsTutorial: boolean;
  ironman: boolean;
}

export const tutorialSave = (id: string): TutorialSave => ({ id, kind: "tutorial", quietWorld: true, scriptedEvents: true, advice: "vizier notes", beganAsTutorial: false, ironman: false });

/** "Keep ruling the Ottomans": the save becomes a campaign, marked "began as the tutorial", never ironman (TUT-107). */
export function keepRuling(s: TutorialSave): TutorialSave {
  return { ...s, kind: "campaign", quietWorld: false, scriptedEvents: false, advice: "Needs attention", beganAsTutorial: true, ironman: false };
}

/** Achievements need an ironman save, so the tutorial earns none (TUT-108). */
export const achievementsAllowed = (s: TutorialSave): boolean => s.kind === "campaign" && s.ironman && !s.beganAsTutorial;

// ---------------------------------------------------------------- the layers (TUT-009, TUT-010)

/** The four layers; tooltips, "Why?", the Almanac and Needs attention stay whatever the player skipped. */
export function layers(o: { tutorial: boolean; goals: boolean }): string[] {
  const out: string[] = [];
  if (o.tutorial) out.push("tutorial campaign");
  if (o.goals) out.push("guided first turns");
  out.push("Needs attention", "tooltips and Why?", "Almanac");
  return out;
}

// ---------------------------------------------------------------- Advance to… (TUT-019)

/** Runs turns in a row until the named date, and shows one combined turn report. */
export function advanceTo<R>(now: () => { year: number; month: number }, target: { year: number; month: number }, playTurn: () => R): { turns: number; reports: R[]; combinedReports: 1 } {
  const reports: R[] = [];
  const key = (d: { year: number; month: number }) => d.year * 12 + d.month;
  while (key(now()) < key(target)) reports.push(playTurn());
  return { turns: reports.length, reports, combinedReports: 1 };
}

// ---------------------------------------------------------------- civil-war lessons on other contexts' rules (TUT-038 … TUT-040, TUT-046)

/** The war screen of the war for John V's throne: the aim, its cause, and a linked line on why not Take land (TUT-038). */
export function warScreen(choice: EmperorChoice = "Back John V"): { aim: string | null; cause: string | null; whyNotTakeLand: { linked: true; almanac: string } } {
  const side = emperorChoice(choice);
  return { aim: side.war_aim, cause: side.aim_granted_by, whyNotTakeLand: { linked: true, almanac: "war aims" } };
}

/** A partner's reasons, on the same screen as the player's own alliances (diplomacy's ledger) (TUT-039). */
export function partnerReasons(d: Diplomacy, partner: string, other: string): { screen: "alliance reasons"; entries: LedgerEntry[] } {
  return { screen: "alliance reasons", entries: conditionalEntries(d, partner, other) };
}

/** A strait crossing as the map shows it: closed under an enemy fleet, with that fleet's banner (TUT-040, TUT-046). */
export function straitCrossing(w: MoveWorld, a: Army, from: string, to: string): { open: boolean; days?: number; banner?: string; reason?: string } {
  const v = ferryOpen(w, a, from, to);
  if (v.ok) return { open: true, days: ferryDays(a.men) };
  const s = straitBetween(w, from, to);
  const fleet = s && w.movers.find((m) => m.kind === "fleet" && m.place === s.zone);
  return fleet ? { open: false, banner: fleet.owner, reason: v.reason ?? "" } : { open: false, reason: v.reason ?? "" };
}

/** The tutorial's action per input, with the controller column the game shell adopted (TUT-100, D-TUT-12). */
export function tutorialAction(action: string, input: Input): string {
  const a = (config.inputs.actions as Record<string, Record<Input, string>>)[action];
  if (!a) throw new Error(`no tutorial action ${action}`);
  return a[input];
}

/** Controller holds: skip a step (B / Circle) and End turn (Menu / Options), in seconds (D-TUT-12). */
export const controllerHolds = () => config.controller_holds;
