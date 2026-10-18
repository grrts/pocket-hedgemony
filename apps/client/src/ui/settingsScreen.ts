import { isChanged, label, optionsOf, resolve, rowEnabled, sectionRows, setBy, STRINGS, type Value } from "@ph/engine/domain/settings";
import { icon } from "../art/ui.ts";
import { env, pref, prefs, resetPref, resetPrefSection, setPref } from "../settings/prefs.ts";
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
  "accessibility.text_size",
]);

const rowsOf = (section: string) => sectionRows(prefs, section, env).filter((id) => BUILT.has(id));
const sections = () => prefs.cat.sections.filter((s) => rowsOf(s).length);
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
  const rows = rowsOf(ui.section);
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
          ${rows.map(rowHtml).join("")}
          <button class="paper reset-section" data-reset-section>Reset this section</button>
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
  card.querySelector("[data-reset-section]")!.addEventListener("click", () => {
    resetPrefSection(ui.section);
    renderSettings(root, close);
  });
  card.querySelectorAll<HTMLButtonElement>("[data-set]").forEach((b) =>
    b.addEventListener("click", () => {
      const id = b.dataset.set!;
      setPref(id, JSON.parse(b.dataset.v!) as Value);
      keepScroll(root, () => renderSettings(root, close));
    }),
  );
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
    control = `<div class="seg" role="radiogroup" aria-label="${esc(nameOf(id))}">${optionsOf(def)
      .map((o) => `<button class="paper${o === v ? " on" : ""}" role="radio" aria-checked="${o === v}" data-set="${id}" data-v='${JSON.stringify(o)}'>${esc(label(prefs.cat, id, o))}</button>`)
      .join("")}</div>`;
  }
  return `
    <div class="set-row${on ? "" : " off"}" data-row="${id}">
      <div class="set-label"><b>${esc(nameOf(id))}</b><i class="changed" title="Changed from the default"${isChanged(prefs, id) ? "" : " hidden"}></i><small>${esc(by ?? descOf(id))}</small></div>
      <div class="set-control">${control}</div>
    </div>`;
}
