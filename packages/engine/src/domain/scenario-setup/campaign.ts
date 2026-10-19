/**
 * Playable realms and campaign rules (spec §5.7): the free tier, the realm
 * picker's locks and filters, campaign rules fixed at the start, a new game
 * from a seed, the save header and quick start.
 */
import type { Rng } from "../../rng.ts";
import config from "../../../../rules/data/domain/scenario-setup.json" with { type: "json" };
import shell from "../../../../rules/data/domain/game-shell.json" with { type: "json" };
import type { CampaignOptions } from "../saves/format.ts";

/** Realms playable without buying the full game (SETUP-051). */
export const FREE_REALMS: readonly string[] = config.free_realms;
export const TUTORIAL_REALM: string = config.tutorial_realm;

export function needsFullGame(realm: string): boolean {
  return !FREE_REALMS.includes(realm);
}

export function realmState(realm: string, ownsFullGame: boolean): "playable" | "locked" {
  return ownsFullGame || !needsFullGame(realm) ? "playable" : "locked";
}

// ---------------------------------------------------------------------------
// The realm picker (SETUP-052, SETUP-053)

export interface RealmCard {
  id: string;
  region: string;
}

export interface RealmPicker {
  ownsFullGame: boolean;
  chosen: string | null;
  screen: "picker" | "unlock";
}

export function newPicker(ownsFullGame: boolean): RealmPicker {
  return { ownsFullGame, chosen: null, screen: "picker" };
}

/** Tapping a realm chooses it; a locked one shows its padlock and the button to Unlock. */
export function tapRealm(p: RealmPicker, realm: string): { locked: boolean } {
  p.chosen = realm;
  return { locked: realmState(realm, p.ownsFullGame) === "locked" };
}

export function openUnlock(p: RealmPicker): void {
  p.screen = "unlock";
}

/** Coming back from a purchase returns to the picker with the realm still chosen. */
export function purchaseDone(p: RealmPicker, bought: boolean): void {
  if (bought) p.ownsFullGame = true;
  p.screen = "picker";
}

export type RealmFilter = { by: "region"; region: string } | { by: "free_or_locked"; state: "playable" | "locked" };

export function filterRealms(realms: readonly RealmCard[], f: RealmFilter, ownsFullGame: boolean): RealmCard[] {
  if (f.by === "region") return realms.filter((r) => r.region === f.region);
  return realms.filter((r) => realmState(r.id, ownsFullGame) === f.state);
}

// ---------------------------------------------------------------------------
// Campaign rules (SETUP-054, SETUP-055)

export interface CampaignRules {
  difficulty: string;
  ai_temper: string;
  fog: boolean;
  events: EventsChoice;
  ironman: boolean;
  end_date: string;
}

// ---------------------------------------------------------------------------
// Difficulty (SETUP-099 to SETUP-103)

/** The difficulty levels, easiest first: the same names the save library's options use. */
export const DIFFICULTIES = config.campaign_rules.difficulty.levels as readonly Difficulty[];
export type Difficulty = "easy" | "normal" | "hard";
/** Normal: every factor 1, the game as balanced (SETUP-100). */
export const DEFAULT_DIFFICULTY = config.campaign_rules.difficulty.default as Difficulty;

/** What a difficulty changes, each a factor on today's rule (SETUP-101 to SETUP-103). */
export interface DifficultyEffects {
  /** On the AI's monthly chance to look for a war. */
  ai_war_chance: number;
  /** On the gold an AI realm's monthly income pays in; never the player's. */
  ai_income: number;
  /** On the monthly chance a plotting province of the player's realm rises. */
  player_rising_chance: number;
}

const EFFECTS = config.campaign_rules.difficulty.effects as Record<Difficulty, DifficultyEffects>;

/** A saved or chosen difficulty as a level; anything unknown (an old save) is normal. */
export function difficultyOf(value: unknown): Difficulty {
  return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : DEFAULT_DIFFICULTY;
}

export function difficultyEffects(level: unknown): DifficultyEffects {
  return EFFECTS[difficultyOf(level)];
}

export const CAMPAIGN_RULE_FIELDS = config.campaign_rules.fields as (keyof CampaignRules)[];
export const DEFAULT_END_DATE = config.campaign_rules.default_end_date;

// ---------------------------------------------------------------------------
// The options step at new game (SETUP-054, SHELL-033): what is offered, the defaults, and what the engine is given

/** The events choice (D-SETUP-21): the three presets the events spec offers (EVT-036), Plausible by default. */
export type EventsChoice = "historical" | "plausible" | "free";
export const EVENTS_CHOICES: readonly EventsChoice[] = config.campaign_rules.events.values as EventsChoice[];

/** The choices of the options step: everything but AI temper, which has no values yet (OQ-SETUP-22). */
export interface NewGameChoices {
  difficulty: Difficulty;
  events: EventsChoice;
  fogOfWar: boolean;
  ironman: boolean;
  endDate: string;
}

export const DEFAULT_CHOICES: Readonly<NewGameChoices> = Object.freeze({
  difficulty: DEFAULT_DIFFICULTY,
  events: config.campaign_rules.events.default as EventsChoice,
  fogOfWar: config.campaign_rules.fog_default,
  ironman: config.campaign_rules.ironman_default,
  endDate: DEFAULT_END_DATE,
});

/** The end years offered: 31 August of each year from the earliest (provisional 1494) to 1939 (SHELL-033, D-SHELL-14). */
export function endYears(): number[] {
  const last = Number(DEFAULT_END_DATE.slice(0, 4));
  const years: number[] = [];
  for (let y = shell.endDateEarliestYear; y <= last; y++) years.push(y);
  return years;
}

const validEndDate = (d: unknown): d is string => typeof d === "string" && /^\d{4}-08-31$/.test(d) && endYears().includes(Number(d.slice(0, 4)));

/**
 * The options step's choices, checked: anything missing or not offered takes
 * its default, so choices remembered by an older build still start a game.
 */
export function newGameChoices(input?: Partial<Record<keyof NewGameChoices, unknown>> | null): NewGameChoices {
  const i = input ?? {};
  return {
    difficulty: difficultyOf(i.difficulty),
    events: EVENTS_CHOICES.includes(i.events as EventsChoice) ? (i.events as EventsChoice) : DEFAULT_CHOICES.events,
    fogOfWar: typeof i.fogOfWar === "boolean" ? i.fogOfWar : DEFAULT_CHOICES.fogOfWar,
    ironman: typeof i.ironman === "boolean" ? i.ironman : DEFAULT_CHOICES.ironman,
    endDate: validEndDate(i.endDate) ? i.endDate : DEFAULT_CHOICES.endDate,
  };
}

/** The campaign options saved with the campaign and in every save header (SETUP-055, D-SAVE-8); ironman is the campaign's own flag. */
export function campaignOptionsOf(c: NewGameChoices): CampaignOptions {
  return { difficulty: c.difficulty, events: c.events, endDate: c.endDate, fogOfWar: c.fogOfWar };
}

/** The campaign rules the world keeps as `world.options`; difficulty is kept as `world.campaign.difficulty` instead (SETUP-099). */
export type WorldOptions = Omit<CampaignOptions, "difficulty">;

export function worldOptionsOf(c: NewGameChoices | CampaignOptions): WorldOptions {
  const { difficulty: _difficulty, ...rest } = "ironman" in c ? campaignOptionsOf(c) : c;
  return rest;
}

export interface Campaign {
  id: string;
  seed: number;
  nation: string;
  /** Saved with the campaign and read-only from here on (INV-SETUP-11). */
  rules: Readonly<CampaignRules>;
}

/** A campaign id from the game's own random generator, seeded by the shell. */
export function campaignId(rng: Rng): string {
  let id = "";
  for (let i = 0; i < 4; i++) id += rng.nextU32().toString(16).padStart(8, "0");
  return id;
}

/** Begin: a new game from a seed, the player's nation and the options, with a new random campaign id (SETUP-056). */
export function beginCampaign(seed: number, nation: string, rules: CampaignRules, idRng: Rng): Campaign {
  return { id: campaignId(idRng), seed, nation, rules: Object.freeze({ ...rules }) };
}

/** Pause → Campaign rules: the saved rules, read-only. */
export function campaignRulesView(c: Campaign): { rules: Readonly<CampaignRules>; editable: false } {
  return { rules: c.rules, editable: false };
}

/** The save header's realm fields (SETUP-057). */
export function saveHeader(c: Campaign): { nation: string; needsFullGame: boolean } {
  return { nation: c.nation, needsFullGame: needsFullGame(c.nation) };
}

/** Quick start: Begin with the last options used and the realm last tapped, or the first suggested one (SETUP-058). */
export function quickStart(last: { tapped: string | null; options: CampaignRules | null }, suggested: readonly string[], defaults: CampaignRules): { step: "begin"; realm: string; rules: CampaignRules } {
  const realm = last.tapped ?? suggested[0];
  if (!realm) throw new Error("no realm to start with");
  return { step: "begin", realm, rules: last.options ?? defaults };
}
