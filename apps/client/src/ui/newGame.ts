import { DIFFICULTIES, endYears, EVENTS_CHOICES, newGameChoices, type NewGameChoices } from "@ph/engine/domain/scenario-setup";

/**
 * The options step of a new game (scenario-setup SETUP-054, SETUP-055,
 * SETUP-058; game-shell SHELL-033, SHELL-034). After the player picks a realm
 * (a suggested realm, or Rule on a realm's card) the sheet turns into one
 * card, "Rules of the campaign": the realm at the top, then one row per rule,
 * each a row of 44-point buttons (difficulty, events, fog of war, ironman) or
 * a select (the end year), a line saying what the chosen rules mean, and one
 * big Begin button. The rules are kept for the whole campaign and shown
 * read-only in the game menu. The last choices are remembered for the next
 * new game.
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export type RuleKey = "difficulty" | "events" | "fogOfWar" | "ironman";

/** One choice of a rule as its button shows it. */
interface Choice {
  value: string;
  label: string;
}

const ROWS: { key: RuleKey; label: string; choices: () => Choice[] }[] = [
  { key: "difficulty", label: "Difficulty", choices: () => DIFFICULTIES.map((d) => ({ value: d, label: cap(d) })) },
  { key: "events", label: "Events", choices: () => EVENTS_CHOICES.map((e) => ({ value: e, label: cap(e) })) },
  { key: "fogOfWar", label: "Fog of war", choices: () => [{ value: "true", label: "On" }, { value: "false", label: "Off" }] },
  { key: "ironman", label: "Ironman", choices: () => [{ value: "false", label: "Off" }, { value: "true", label: "On" }] },
];

const DIFFICULTY_LINES: Record<NewGameChoices["difficulty"], string> = {
  easy: "AI realms are slower to war and poorer, your provinces calmer",
  normal: "AI realms fight and earn as balanced",
  hard: "AI realms are quicker to war and richer, your provinces more restless",
};

const EVENTS_LINES: Record<NewGameChoices["events"], string> = {
  historical: "Historical events: history leans hard the way it went.",
  plausible: "Plausible events: history leans the way it went, with room to change.",
  free: "Free events: history is free to go its own way.",
};

/** What the chosen rules mean, in a few short lines: a phone has no hover to explain a button. */
export function rulesMeaning(c: NewGameChoices): string[] {
  return [
    // What the chosen difficulty changes (SETUP-099 to SETUP-103, scenario-setup 5.11).
    `${cap(c.difficulty)}: ${DIFFICULTY_LINES[c.difficulty]}.`,
    EVENTS_LINES[c.events],
    c.fogOfWar ? "Fog of war: lands you have not charted stay hidden." : "No fog of war: the whole map is shown from the start.",
    c.ironman ? "Ironman: one save, kept after every week, no going back. Achievements count." : "Not ironman: save and load as you like. Achievements are earned only in ironman campaigns.",
    "The rules stay for the whole campaign; the game menu shows them.",
  ];
}

/** The rules in one line, for the game menu (read-only, SETUP-055) and the remembered choices. */
export function rulesLine(c: { difficulty: string; events: string; fogOfWar?: boolean; endDate: string }, ironman: boolean): string {
  const fog = c.fogOfWar === false ? "no fog" : "fog of war";
  return `${cap(c.difficulty)} · ${c.events} events · ${fog} · ${ironman ? "ironman" : "not ironman"} · ends 31 Aug ${c.endDate.slice(0, 4)}`;
}

const valueOf = (c: NewGameChoices, key: RuleKey): string => String(c[key]);

/** The card's body: one row per rule, the end year, what they mean, and Begin. `realm` is the realm's pennant and name, already escaped. */
export function newGameOptionsHtml(o: { realm: string; realmName: string; nation: string; start: string; choices: NewGameChoices; closeIcon: string; crownIcon: string }): string {
  const c = o.choices;
  const rows = ROWS.map(
    (r) => `<div class="ng-row" role="radiogroup" aria-label="${r.label}"><span class="ng-label">${r.label}</span><span class="ng-seg">${r
      .choices()
      .map((ch) => {
        const on = valueOf(c, r.key) === ch.value;
        return `<button class="paper${on ? " on" : ""}" role="radio" aria-checked="${on}" data-rule="${r.key}" data-value="${esc(ch.value)}">${esc(ch.label)}</button>`;
      })
      .join("")}</span></div>`,
  ).join("");
  const year = Number(c.endDate.slice(0, 4));
  const years = endYears()
    .slice()
    .reverse()
    .map((y) => `<option value="${y}-08-31"${y === year ? " selected" : ""}>31 August ${y}</option>`)
    .join("");
  return `<header><h2 class="ribbon">Rules of the campaign</h2><span class="panel-buttons"><button class="close" data-options-back aria-label="Back to the realms">${o.closeIcon}</button></span></header>
    <p class="ng-realm">${o.realm}<b>${esc(o.realmName)}</b><small>from ${esc(o.start)}</small></p>
    <div class="ng-rules">${rows}<label class="ng-row"><span class="ng-label">Ends</span><select data-rule-end aria-label="The campaign ends on">${years}</select></label></div>
    <ul class="ng-meaning">${rulesMeaning(c).map((l) => `<li>${esc(l)}</li>`).join("")}</ul>
    <button class="wax play ng-begin" data-begin="${esc(o.nation)}">${o.crownIcon}Begin as ${esc(o.realmName)}</button>`;
}

/** A tap on a rule's button: the choices with that rule set. */
export function setRule(c: NewGameChoices, key: RuleKey | "endDate", value: string): NewGameChoices {
  const next: Record<string, unknown> = { ...c };
  next[key] = key === "fogOfWar" || key === "ironman" ? value === "true" : value;
  return newGameChoices(next);
}

/** The key the last choices are remembered under, on this device only (SETUP-058). */
export const LAST_CHOICES_KEY = "ph-new-game-rules";

/** The choices of the last new game, or the defaults; storage a private window refuses counts as none. */
export function loadLastChoices(storage: Pick<Storage, "getItem"> | null): NewGameChoices {
  try {
    const raw = storage?.getItem(LAST_CHOICES_KEY);
    return newGameChoices(raw ? (JSON.parse(raw) as Partial<NewGameChoices>) : null);
  } catch {
    return newGameChoices(null);
  }
}

export function saveLastChoices(storage: Pick<Storage, "setItem"> | null, c: NewGameChoices): void {
  try {
    storage?.setItem(LAST_CHOICES_KEY, JSON.stringify(c));
  } catch {
    // Without storage the next new game starts from the defaults.
  }
}
