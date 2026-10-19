import { isChanged, label, optionsOf, resolve, rowEnabled, sectionRows, setBy, STRINGS, type Value } from "@ph/engine/domain/settings";
import { icon } from "../art/ui.ts";
import { env, lensPatternsOn, pref, prefs, resetPref, resetPrefSection, setPref, visionPref } from "../settings/prefs.ts";
import { bandPattern, hexRgb, lensRamp, nationColours, patternCss, rgbHex } from "../map/colourVision.ts";
import { sound } from "../audio/sound.ts";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * The rows whose effect the client has built (D-SET-22): the screen lists
 * only these, in settings.json's order, so no row promises what the game
 * does not do. Rows join here as their effects are built.
 */
const BUILT = new Set([
  "gameplay.autosave",
  "gameplay.autosaves_kept",
  "gameplay.tutorial_hints",
  "gameplay.reset_tutorial_hints",
  "gameplay.achievement_toasts",
  "gameplay.turn_speed",
  "gameplay.battle_speed",
  "graphics.battery_saver",
  "graphics.frame_cap",
  "graphics.sharpness",
  "graphics.animations",
  "audio.master",
  "audio.music",
  "audio.music_volume",
  "audio.effects_volume",
  "audio.interface_sounds",
  "audio.ambience",
  "audio.ambience_volume",
  "accessibility.colour_vision",
  "accessibility.lens_patterns",
  "accessibility.text_size",
]);

/**
 * Tutorial hints and achievements keep their own records on the device
 * (onboarding TUT-128, TUT-129; achievements' toasts switch); the Gameplay
 * rows show and change them.
 */
export interface HintsRows {
  on(): boolean;
  progress(): { done: number; of: number };
  setOn(on: boolean): void;
  reset(): void;
  toasts(): boolean;
  setToasts(on: boolean): void;
}
let hintsRows: HintsRows | undefined;
/** The rows drawn from those records rather than from the settings file. */
const OWN_ROWS = new Set(["gameplay.tutorial_hints", "gameplay.reset_tutorial_hints", "gameplay.achievement_toasts"]);
export function setHintsRows(rows: HintsRows): void {
  hintsRows = rows;
}

/**
 * Account and cloud saves draws its own card (accounts-design §3) and shows
 * only when the build has a server to sync with (D-SET-22).
 */
export interface OwnSection {
  html(): string;
  /** `redraw` draws the screen again while it is still shown, keeping the scroll. */
  bind(card: HTMLElement, redraw: () => void): void;
}
const ownSections = new Map<string, OwnSection>();
export function setOwnSection(section: string, own: OwnSection): void {
  ownSections.set(section, own);
}

const rowsOf = (section: string) => sectionRows(prefs, section, env).filter((id) => BUILT.has(id));
const sections = () => prefs.cat.sections.filter((s) => ownSections.has(s) || rowsOf(s).length);
const nameOf = (id: string) => STRINGS[`settings.${id}.name`] ?? id;
const descOf = (id: string) => STRINGS[`settings.${id}.desc`] ?? "";

/** What the screen has open: the section, and in a tall window whether its rows are shown (SET-012). */
const ui = { section: "gameplay", open: false };

/** Opens Settings at a section next time it is drawn (the Sound card's "All sound settings"). */
export function openSettingsAt(section: string): void {
  ui.section = section;
  ui.open = true;
}

/**
 * The Settings screen (SET-132 … SET-137): sections on the left, the open
 * section's rows on the right; in a tall window the sections first, a section
 * full screen with Back. Every change applies at once (SET-003).
 */
export function renderSettings(root: HTMLElement, close: () => void): void {
  if (!sections().includes(ui.section)) ui.section = sections()[0]!;
  const redraw = () => {
    if (root.querySelector(".settings")) keepScroll(root, () => renderSettings(root, close));
  };
  const rows = rowsOf(ui.section);
  const own = ownSections.get(ui.section);
  root.innerHTML = `
    <div class="shell-card settings framed" data-open="${ui.open}" role="dialog" aria-label="Settings">
      <header><h2 class="ribbon">Settings</h2><span class="panel-buttons"><button class="close" aria-label="Close">${icon("close", 2)}</button></span></header>
      <div class="settings-body">
        <nav class="settings-sections" aria-label="Sections">${sections()
          .map((s) => `<button class="paper section-tab${s === ui.section ? " on" : ""}" data-section="${s}"${s === ui.section ? ' aria-current="true"' : ""}>${esc(STRINGS[`settings.section.${s}`] ?? s)}</button>`)
          .join("")}</nav>
        <div class="settings-rows">
          <button class="paper settings-back" data-back>${icon("collapse", 1)} Sections</button>
          <h3 class="sub">${esc(STRINGS[`settings.section.${ui.section}`] ?? ui.section)}</h3>
          ${own ? own.html() : `${rows.map(rowHtml).join("")}
          <button class="paper reset-section" data-reset-section>Reset this section</button>`}
        </div>
      </div>
    </div>`;
  const card = root.querySelector<HTMLElement>(".settings")!;
  card.querySelector(".close")!.addEventListener("click", close);
  card.querySelectorAll<HTMLButtonElement>("[data-section]").forEach((b) =>
    b.addEventListener("click", () => {
      ui.section = b.dataset.section!;
      ui.open = true;
      renderSettings(root, close);
      root.querySelector(".settings-rows")?.scrollTo(0, 0);
    }),
  );
  card.querySelector("[data-back]")!.addEventListener("click", () => {
    ui.open = false;
    renderSettings(root, close);
  });
  if (own) own.bind(card, redraw);
  card.querySelector("[data-reset-section]")?.addEventListener("click", () => {
    resetPrefSection(ui.section);
    if (ui.section === "gameplay") {
      hintsRows?.setOn(true);
      hintsRows?.setToasts(true);
    }
    renderSettings(root, close);
  });
  card.querySelectorAll<HTMLButtonElement>("[data-set]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.set!;
      setPref(id, JSON.parse(b.dataset.v!) as Value);
      keepScroll(root, () => renderSettings(root, close));
    }),
  );
  card.querySelector("[data-hints-toggle]")?.addEventListener("click", () => {
    hintsRows!.setOn(!hintsRows!.on());
    keepScroll(root, () => renderSettings(root, close));
  });
  card.querySelector("[data-ach-toasts]")?.addEventListener("click", () => {
    hintsRows!.setToasts(!hintsRows!.toasts());
    keepScroll(root, () => renderSettings(root, close));
  });
  card.querySelector("[data-hints-reset]")?.addEventListener("click", () => {
    hintsRows!.reset();
    sound.sfx("ui_back");
    keepScroll(root, () => renderSettings(root, close));
  });
  card.querySelectorAll<HTMLInputElement>("[data-slide]").forEach((input) => {
    input.addEventListener("input", () => {
      setPref(input.dataset.slide!, Number(input.value));
      const out = input.nextElementSibling;
      if (out) out.textContent = `${input.value} %`;
      input.closest(".set-row")?.querySelector(".changed")?.toggleAttribute("hidden", !isChanged(prefs, input.dataset.slide!));
    });
    input.addEventListener("change", () => sound.sfx("ui_tap"));
  });
  // A long press or a right-click on a row's name puts it back to its default (SET-015).
  card.querySelectorAll<HTMLElement>("[data-row]").forEach((row) => {
    const id = row.dataset.row!;
    if (OWN_ROWS.has(id)) return;
    const name = row.querySelector<HTMLElement>(".set-label")!;
    let timer = 0;
    const reset = () => {
      resetPref(id);
      sound.sfx("ui_back");
      keepScroll(root, () => renderSettings(root, close));
    };
    name.addEventListener("pointerdown", () => (timer = window.setTimeout(reset, 600)));
    for (const ev of ["pointerup", "pointerleave", "pointercancel"]) name.addEventListener(ev, () => clearTimeout(timer));
    name.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      clearTimeout(timer);
      reset();
    });
  });
}

/** Redraws without the rows jumping back to the top. */
function keepScroll(root: HTMLElement, redraw: () => void): void {
  const y = root.querySelector(".settings-rows")?.scrollTop ?? 0;
  redraw();
  root.querySelector(".settings-rows")?.scrollTo(0, y);
}

function rowHtml(id: string): string {
  if (OWN_ROWS.has(id)) return hintsRowHtml(id);
  const def = resolve(prefs.cat, id);
  const v = pref(id);
  const on = rowEnabled(prefs, id);
  const by = setBy(prefs, id);
  let control = "";
  if (def.type === "slider") {
    control = `<input type="range" min="${def.min}" max="${def.max}" step="${def.step ?? 5}" value="${v}" data-slide="${id}" aria-label="${esc(nameOf(id))}"${on ? "" : " disabled"}><output>${v} %</output>`;
  } else if (def.type === "toggle") {
    control = `<button class="paper toggle${v ? " on" : ""}" data-set="${id}" data-v="${!v}" aria-pressed="${!!v}" data-sfx="${v ? "ui_toggle_off" : "ui_toggle_on"}">${v ? "On" : "Off"}</button>`;
  } else {
    control = `<div class="seg${optionsOf(def).length > 4 ? " many" : ""}" role="radiogroup" aria-label="${esc(nameOf(id))}">${optionsOf(def)
      .map((o) => `<button class="paper${o === v ? " on" : ""}" role="radio" aria-checked="${o === v}" data-set="${id}" data-v='${JSON.stringify(o)}'>${esc(label(prefs.cat, id, o))}</button>`)
      .join("")}</div>`;
  }
  return `
    <div class="set-row${on ? "" : " off"}" data-row="${id}">
      <div class="set-label"><b>${esc(nameOf(id))}</b><i class="changed" title="Changed from the default"${isChanged(prefs, id) ? "" : " hidden"}></i><small>${esc(by ?? descOf(id))}</small></div>
      <div class="set-control${def.type !== "slider" && def.type !== "toggle" && optionsOf(def).length > 4 ? " wide" : ""}">${control}</div>
      ${id === "accessibility.colour_vision" ? visionPreview() : ""}
    </div>`;
}

/** Four neighbouring realms, red and green among them, and the Food lens's red to green ramp. */
const PREVIEW_REALMS = ["#b13e53", "#38b764", "#3b5dc9", "#ef7d57"];
const PREVIEW_RAMP = ["#a8323e", "#d08a48", "#e9d79a", "#8cb85a", "#3f7a44"].map(hexRgb);

/**
 * What Colour vision and Patterns on lenses draw, under the Colour vision
 * row (SET-095, SET-096): the sample realms and lens ramp in the chosen
 * mode, so the player sees the change before closing Settings.
 */
function visionPreview(): string {
  const v = visionPref();
  const near = PREVIEW_REALMS.map((_, i) => new Set(PREVIEW_REALMS.map((_, j) => j).filter((j) => j !== i)));
  const realms = nationColours(v, { colours: PREVIEW_REALMS, neighbours: near, order: PREVIEW_REALMS.map((_, i) => i) });
  const ramp = lensRamp(v, PREVIEW_RAMP, "diverging");
  const sw = (c: number[], pattern: number) => `<i class="swatch" style="background-color:${rgbHex(c)};${patternCss(pattern, c)}"></i>`;
  return `<div class="vision-preview" aria-hidden="true">
      <span class="vision-sample"><small>Realms</small>${realms.colours.map((c, i) => sw(hexRgb(c), realms.patterns[i]!)).join("")}</span>
      <span class="vision-sample"><small>Lens</small>${ramp.map((c, i) => sw(c, lensPatternsOn() ? bandPattern(i) : 0)).join("")}</span>
    </div>`;
}

function hintsRowHtml(id: string): string {
  if (!hintsRows) return "";
  if (id === "gameplay.reset_tutorial_hints") {
    return `
    <div class="set-row" data-row="${id}">
      <div class="set-label"><b>${esc(nameOf(id))}</b><small>${esc(descOf(id))}</small></div>
      <div class="set-control"><button class="paper" data-hints-reset>Reset</button></div>
    </div>`;
  }
  if (id === "gameplay.achievement_toasts") {
    const t = hintsRows.toasts();
    return `
    <div class="set-row" data-row="${id}">
      <div class="set-label"><b>${esc(nameOf(id))}</b><i class="changed" title="Changed from the default"${t ? " hidden" : ""}></i><small>${esc(descOf(id))}</small></div>
      <div class="set-control"><button class="paper toggle${t ? " on" : ""}" data-ach-toasts aria-pressed="${t}" data-sfx="${t ? "ui_toggle_off" : "ui_toggle_on"}">${t ? "On" : "Off"}</button></div>
    </div>`;
  }
  const on = hintsRows.on();
  const p = hintsRows.progress();
  return `
    <div class="set-row" data-row="${id}">
      <div class="set-label"><b>${esc(nameOf(id))}</b><i class="changed" title="Changed from the default"${on ? " hidden" : ""}></i><small>${p.done} of ${p.of} done</small></div>
      <div class="set-control"><button class="paper toggle${on ? " on" : ""}" data-hints-toggle aria-pressed="${on}" data-sfx="${on ? "ui_toggle_off" : "ui_toggle_on"}">${on ? "On" : "Off"}</button></div>
    </div>`;
}
