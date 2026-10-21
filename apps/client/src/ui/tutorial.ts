import {
  chapter,
  chapterOver,
  guideFaceLabel,
  leaveTutorial,
  loadProgress,
  newProgress,
  nextPlayable,
  noteText,
  resolveText,
  saveProgress,
  startChapter,
  startTutorial,
  stepCounter,
  tutorialFinished,
  tutorialInput,
  tutorialString,
  type Input,
  type Progress,
  type Step,
  type StepInput,
  type Tutorial,
} from "@ph/engine/domain/onboarding";
import { icon } from "../art/ui.ts";
import { mapSpot, placeNote, visibleBox, type HintTarget } from "./hints.ts";

/**
 * The tutorial "Murad's Frontier" on screen (onboarding spec, "How the player
 * uses it: the tutorial campaign", TUT-131 … TUT-134, D-TUT-19): the engine's
 * step machine runs the chapter, and this module shows its one step as a
 * parchment note with the Grand Vizier's label and the counter, a spotlight
 * that dims the rest of the screen around what to tap, and the note's own
 * buttons (Next on a look step, Skip step, Leave). Every word comes from the
 * engine's step script; main.ts says where each anchor is on the screen and
 * reports what the player did.
 */

export interface CoachHost {
  /** Where a step's anchor is on the screen as it stands, one tap at a time. */
  target: (step: Step) => HintTarget;
  /** A card, menu or the loading screen is up: the note waits (TUT-126's moments). */
  held: () => boolean;
  sfx: (id: string) => void;
  /** A place name in the note was tapped: the camera goes there (TUT-059). */
  goTo: (place: string) => void;
  /** The tutorial ends on the end card's choice, or is left (TUT-005, TUT-107). */
  end: (how: "keep ruling" | "new campaign" | "left") => void;
}

const STORE = "ph-tutorial";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export class Coach {
  /** Tutorial progress, kept on the device apart from campaign saves (TUT-106, X-16). */
  readonly progress: Progress;
  private t: Tutorial | null = null;
  private host: CoachHost | null = null;
  private note = document.createElement("div");
  private spot = document.createElement("div");
  /** Half-dark over the screen with a hole where the spotlight is (TUT-061); takes no taps. */
  private dim = document.createElement("div");
  private queued = 0;
  private idleTimer = 0;
  private shownKey = "";
  private show: (() => void) | undefined;
  private lastInput: Input = matchMedia("(pointer: coarse)").matches ? "touch" : "mouse and keyboard";

  constructor() {
    let saved: Progress | null = null;
    try {
      const text = localStorage.getItem(STORE);
      saved = text ? loadProgress(text) : null;
    } catch {
      // Private windows may refuse storage: progress lasts this visit.
    }
    this.progress = saved ?? newProgress();
    this.note.className = "coach-note framed";
    this.note.setAttribute("role", "dialog");
    this.note.setAttribute("aria-live", "polite");
    this.note.setAttribute("aria-label", "Tutorial");
    this.note.hidden = true;
    this.spot.className = "coach-spot";
    this.spot.hidden = true;
    this.dim.className = "coach-dim";
    this.dim.hidden = true;
    this.note.addEventListener("click", (e) => {
      const el = e.target as HTMLElement;
      const place = el.closest<HTMLElement>("[data-coach-place]");
      if (place) return this.host?.goTo(place.dataset.coachPlace!);
      const b = el.closest<HTMLButtonElement>("button[data-coach]");
      if (!b) return;
      const what = b.dataset.coach!;
      if (what === "next") this.input({ type: "confirm" });
      else if (what === "skip") this.input({ type: "skip step" });
      else if (what === "show") this.show?.();
      else if (what === "leave") this.leave();
      else if (what === "keep ruling" || what === "new campaign") this.finish(what);
    });
    // The prompts in a step follow the input last used (TUT-098).
    addEventListener("pointerdown", (e: PointerEvent) => (this.lastInput = e.pointerType === "touch" ? "touch" : "mouse and keyboard"), { capture: true });
  }

  /** The tutorial is on: hints hold back, saves wait, and the note shows (D-TUT-19). */
  get running(): boolean {
    return !!this.t;
  }

  /** Every chapter the game can play today is done: Tutorial moves under More (SHELL-152). */
  get finished(): boolean {
    return tutorialFinished(this.progress);
  }

  mount(host: CoachHost): void {
    this.host = host;
    document.body.append(this.dim, this.spot, this.note);
    new MutationObserver((records) => {
      if (records.some((r) => !this.note.contains(r.target) && r.target !== this.spot && r.target !== this.dim)) this.refresh();
    }).observe(document.querySelector("#app")!, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    addEventListener("resize", () => this.refresh());
    document.addEventListener("click", (e) => {
      // A look step ends on a tap anywhere (TUT-055); a tap on the map comes through mapTap, so a drag is not a tap.
      const el = e.target as HTMLElement;
      if (this.t?.run && !this.t.run.ended && this.t.run.step.kind === "look" && !this.note.contains(el) && !el.closest("#map")) this.input({ type: "tap", target: "" });
      this.refresh();
    }, { capture: true });
    document.addEventListener("scroll", () => this.refresh(), { capture: true, passive: true });
  }

  /** Starts the tutorial where the player left it, or at chapter 0 (TUT-004, StartTutorial). */
  begin(): void {
    this.t = startTutorial(this.progress);
    // A finished chapter is played again from its start.
    if (this.t.run && chapterOver(this.t)) startChapter(this.t, this.t.run.chapter);
    this.save();
    this.shownKey = "";
    clearInterval(this.idleTimer);
    // Idle help on a do step: the ring pulses again after 8 s, the note offers Skip after 20 s (TUT-033).
    this.idleTimer = window.setInterval(() => {
      if (!this.t?.run || this.t.run.ended || this.host?.held()) return;
      const { pulse, stuckHint } = this.t.run;
      tutorialInput(this.t, { type: "idle", seconds: 1 });
      if (this.t.run.pulse !== pulse || this.t.run.stuckHint !== stuckHint) this.refresh();
    }, 1000);
    this.refresh();
  }

  /** The player did what a do step asks (its `done` condition, as the script writes it). */
  did(done: string): void {
    if (!this.t?.run || this.t.run.ended || this.t.run.step.done !== done) return;
    this.input({ type: "condition", done });
  }

  /** A tap on the map, not a drag: ends a look step. */
  mapTap(): void {
    if (this.t?.run && !this.t.run.ended && this.t.run.step.kind === "look") this.input({ type: "tap", target: "map" });
  }

  /** Skip this chapter, from the game menu: the next chapter that can be played, else the end card (TUT-005). */
  skipChapter(): void {
    if (!this.t?.run) return;
    const n = this.t.run.chapter;
    const next = nextPlayable(n);
    this.t.events.push({ type: "ChapterSkipped", chapter: n });
    if (next !== null) startChapter(this.t, next);
    else {
      // Nothing after it can be played yet: the chapter ends here, done, with the end card.
      while (this.t.run && !this.t.run.ended) tutorialInput(this.t, { type: "skip step" });
    }
    this.save();
    this.refresh();
  }

  /** Leave the tutorial: progress and the step are kept for next time; nothing is locked (TUT-005). */
  leave(): void {
    if (!this.t) return;
    leaveTutorial(this.t);
    this.close();
    this.host?.end("left");
  }

  /** "Reset tutorial and hints" (Settings) starts the tutorial over too. */
  reset(): void {
    Object.assign(this.progress, newProgress());
    this.save();
  }

  refresh(): void {
    if (this.queued || !this.host) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.draw();
    });
  }

  private input(i: StepInput): void {
    const t = this.t;
    if (!t?.run) return;
    const before = t.run.step.id;
    tutorialInput(t, i);
    const moved = t.run!.step.id !== before || chapterOver(t);
    if (moved) {
      this.host?.sfx("ui_confirm");
      // The next playable chapter follows on from the one just done.
      if (chapterOver(t)) {
        const next = nextPlayable(t.run!.chapter);
        if (next !== null) startChapter(t, next);
      }
    }
    this.save();
    this.refresh();
  }

  private finish(how: "keep ruling" | "new campaign"): void {
    this.close();
    this.host?.end(how);
  }

  private close(): void {
    this.t = null;
    clearInterval(this.idleTimer);
    this.save();
    this.note.hidden = true;
    this.spot.hidden = true;
    this.dim.hidden = true;
    this.shownKey = "";
  }

  private save(): void {
    try {
      localStorage.setItem(STORE, saveProgress(this.progress));
    } catch {
      // Kept for this visit only.
    }
  }

  /** The note's text with its tokens: place names become buttons that move the camera (TUT-059). */
  private textHtml(text: string): string {
    return resolveText(text, { lastInput: this.lastInput })
      .map((seg) => {
        if (seg.kind === "text") return esc(seg.text);
        if (seg.kind === "prompt") return `<b>${esc(seg.text)}</b>`;
        if (seg.kind === "screen") return `<b>${esc(seg.name)}</b>`;
        if (seg.kind === "stat") return `<b>${esc(seg.name)}</b>`;
        const key = placeKeyOf(text, seg.text);
        return key ? `<button class="coach-place" data-coach-place="${key}">${esc(seg.text)}</button>` : `<b>${esc(seg.text)}</b>`;
      })
      .join("");
  }

  /** A button's prompt for the input last used, as the step script's tokens give it (TUT-006). */
  private prompt(action: string): string {
    const seg = resolveText(`{btn:${action}}`, { lastInput: this.lastInput })[0];
    return seg?.kind === "prompt" ? seg.text : action;
  }

  private draw(): void {
    const t = this.t;
    const host = this.host!;
    if (!t?.run || host.held()) {
      this.note.hidden = true;
      this.spot.hidden = true;
      this.dim.hidden = true;
      return;
    }
    const run = t.run;
    const over = chapterOver(t);
    let box: DOMRect | null = null;
    this.show = undefined;
    if (!over) {
      const tg = host.target(run.step);
      box = tg.el ? visibleBox(tg.el) : tg.at ? mapSpot(tg.at) : null;
      if (tg.el && !box && tg.el.closest("#panel, .lens-menu") && !(tg.el as HTMLElement).closest("[hidden]")) tg.el.scrollIntoView({ block: "nearest" });
      this.show = !box && (tg.el !== undefined || tg.at !== undefined) && tg.show ? tg.show : undefined;
    }
    const key = over ? `end|${run.chapter}` : `${run.step.id}|${run.stuckHint}|${!!this.show}|${this.lastInput}`;
    if (key !== this.shownKey) {
      if (this.shownKey.split("|")[0] !== key.split("|")[0]) host.sfx("ui_hint");
      this.shownKey = key;
      const face = `<span class="coach-face">${icon("crown", 2)}<span><b>${esc(guideFaceLabel())}</b><small>${esc(chapter(run.chapter).name)}${over ? "" : ` · ${stepCounter(run)}`}</small></span></span>`;
      this.note.innerHTML = over
        ? `${face}<p>${esc(tutorialString("tut.end.playable_done"))}</p>
          <span class="coach-buttons">
            <button class="wax" data-coach="keep ruling">${esc(tutorialString("tut.end.keep_ruling"))}</button>
            <button class="paper" data-coach="new campaign">${esc(tutorialString("tut.end.new_campaign"))}</button>
          </span>`
        : `${face}<p>${this.textHtml(noteText(run))}</p>
          <span class="coach-buttons">
            ${this.show ? `<button class="wax" data-coach="show">Show me</button>` : ""}
            ${run.step.kind === "look" ? `<button class="wax" data-coach="next">${esc(tutorialString("tut.note.next"))}</button>` : ""}
            <button class="paper" data-coach="skip">${esc(this.prompt("skip_step"))}</button>
            <button class="paper leave" data-coach="leave" aria-label="${esc(tutorialString("tut.note.leave"))}" title="${esc(tutorialString("tut.note.leave"))}">${icon("close", 2)}</button>
          </span>`;
    }
    this.note.classList.toggle("end", over);
    this.note.hidden = false;
    placeNote(this.note, box);
    this.spot.hidden = !box;
    this.dim.hidden = !box;
    this.spot.classList.toggle("pulse", run.pulse);
    if (box) {
      const pad = 4;
      const [l, t, r, b] = [box.left - pad, box.top - pad, box.right + pad, box.bottom + pad];
      Object.assign(this.spot.style, { left: `${l}px`, top: `${t}px`, width: `${r - l}px`, height: `${b - t}px` });
      // The outline runs one way round the screen and the other way round the hole, so the hole stays clear.
      this.dim.style.clipPath = `polygon(0 0, 100% 0, 100% 100%, 0 100%, 0 0, ${l}px ${t}px, ${l}px ${b}px, ${r}px ${b}px, ${r}px ${t}px, ${l}px ${t}px)`;
    }
  }
}

/** The token key behind a place name in a step's text, so a tap can move the camera there. */
function placeKeyOf(text: string, name: string): string | null {
  for (const m of text.matchAll(/\{place:([a-z_]+)\}/g)) {
    const seg = resolveText(m[0], { lastInput: "touch" })[0];
    if (seg?.kind === "name" && seg.text === name) return m[1]!;
  }
  return null;
}
