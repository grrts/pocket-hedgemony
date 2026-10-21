import { currentHint, dismissHint, hintAction, hintsProgress, loadHints, resetHints, setHints, type Hint, type HintAction, type HintsState } from "@ph/engine/domain/onboarding";
import { icon } from "../art/ui.ts";

/**
 * First-campaign hints (onboarding spec, "How the player uses it: first-campaign
 * hints", TUT-121 … TUT-130): one parchment note along the bottom saying what
 * to tap, and a brass ring around it. main.ts says where each hint's target is
 * on the screen as it stands; this module keeps the note and ring on it.
 */

/** Where a hint points now: the element to tap, a line for this moment, and how to bring the target on screen. */
export interface HintTarget {
  el?: Element | null;
  /** A spot on the map to tap (a province), in screen pixels, when the target is not a button. */
  at?: [number, number] | null;
  line?: string;
  show?: () => void;
}

export interface HintsHost {
  /** Where the hint's target is on the screen as it stands. */
  target: (h: Hint) => HintTarget;
  /** An event card is open or a turn plays: the hint waits (TUT-126). */
  moment: () => { eventOpen: boolean; turnPlaying: boolean };
  sfx: (id: string) => void;
}

const STORE = "ph-hints";
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

export class Hints {
  readonly state: HintsState;
  private host: HintsHost | null = null;
  private note = document.createElement("div");
  private ring = document.createElement("div");
  private shownKey = "";
  private scrolledTo: Element | null = null;
  private queued = 0;
  private show: (() => void) | undefined;
  /** Called when the setting changes, so the Settings card can redraw. */
  onChange: () => void = () => {};

  constructor() {
    let saved: unknown = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    } catch {
      // Private windows may refuse storage; hints then start fresh each visit.
    }
    this.state = loadHints(saved);
    this.note.className = "hint-note framed";
    this.note.setAttribute("role", "status");
    this.note.setAttribute("aria-live", "polite");
    this.note.hidden = true;
    this.ring.className = "hint-ring";
    this.ring.hidden = true;
    this.note.addEventListener("click", (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
      if (!b) return;
      const id = this.note.dataset.hint!;
      if (b.dataset.hint === "show") this.show?.();
      else if (b.dataset.hint === "dismiss") {
        dismissHint(this.state, id);
        this.save();
      } else if (b.dataset.hint === "stop") this.setOn(false);
      this.refresh();
    });
  }

  /** Puts the note and ring on the page and follows every change to it. */
  mount(host: HintsHost): void {
    this.host = host;
    document.body.append(this.ring, this.note);
    // Cards redraw as the player taps: the ring follows its target to wherever it is drawn next.
    new MutationObserver((records) => {
      if (records.some((r) => !this.note.contains(r.target) && r.target !== this.ring)) this.refresh();
    }).observe(document.querySelector("#app")!, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
    addEventListener("resize", () => this.refresh());
    // Some taps change only what the game holds, not the page (an army chosen): look again after each.
    document.addEventListener("click", () => this.refresh(), { capture: true });
    document.addEventListener("scroll", () => this.refresh(), { capture: true, passive: true });
    this.refresh();
  }

  /** The player did something (a realm chosen, the turn ended, an order taken): its hint ticks off (TUT-122). */
  did(action: HintAction | string): void {
    if (!hintAction(this.state, action).length) return;
    this.save();
    if (this.state.on) this.host?.sfx("ui_confirm");
    this.onChange();
    this.refresh();
  }

  setOn(on: boolean): void {
    setHints(this.state, on);
    this.save();
    this.onChange();
    this.refresh();
  }

  reset(): void {
    resetHints(this.state);
    this.save();
    this.onChange();
    this.refresh();
  }

  progress() {
    return hintsProgress(this.state);
  }

  /** Redraws on the next frame, once however many changes come in it. */
  refresh(): void {
    if (this.queued || !this.host) return;
    this.queued = requestAnimationFrame(() => {
      this.queued = 0;
      this.draw();
    });
  }

  private save(): void {
    try {
      localStorage.setItem(STORE, JSON.stringify(this.state));
    } catch {
      // Kept for this visit only.
    }
  }

  private draw(): void {
    const hint = currentHint(this.state, this.host!.moment());
    if (!hint) {
      this.note.hidden = true;
      this.ring.hidden = true;
      this.shownKey = "";
      return;
    }
    const t = this.host!.target(hint);
    const el = t.el ?? null;
    const box = el ? visibleBox(el) : t.at ? mapSpot(t.at) : null;
    // A target inside a card that scrolls is brought into view once.
    if (el && !box && el !== this.scrolledTo && el.closest("#panel, .lens-menu") && !(el as HTMLElement).closest("[hidden]")) {
      this.scrolledTo = el;
      el.scrollIntoView({ block: "nearest" });
      this.refresh();
    }
    this.show = !box && t.show ? t.show : undefined;
    const line = t.line ?? hint.line;
    const key = `${hint.id}|${line}|${!!this.show}`;
    if (key !== this.shownKey) {
      if (this.shownKey.split("|")[0] !== hint.id) this.host!.sfx("ui_hint");
      this.shownKey = key;
      this.note.dataset.hint = hint.id;
      this.note.innerHTML = `
        <span class="hint-count" aria-label="Hint ${this.progress().counter}">${this.progress().counter}</span>
        <p>${esc(line)}</p>
        <span class="hint-buttons">
          ${this.show ? `<button class="wax small" data-hint="show">Show me</button>` : ""}
          <button class="paper small" data-hint="stop" title="Turn hints off; Settings turns them back on">Stop hints</button>
          <button class="paper small dismiss" data-hint="dismiss" aria-label="Dismiss this hint" title="Dismiss this hint">${icon("close", 2)}</button>
        </span>`;
    }
    this.note.hidden = false;
    placeNote(this.note, box);
    this.ring.hidden = !box;
    if (box) {
      const pad = 4;
      Object.assign(this.ring.style, { left: `${box.left - pad}px`, top: `${box.top - pad}px`, width: `${box.width + 2 * pad}px`, height: `${box.height + 2 * pad}px` });
    }
  }
}

/**
 * Puts a note where it covers neither what it points at nor an open card
 * or button (TUT-130, TUT-134): along the bottom, in the widest free stretch
 * beside an open card, else under the top bar. The tutorial's coach note
 * uses it too.
 */
export function placeNote(n: HTMLElement, target: DOMRect | null): void {
  const reset = () => {
    n.classList.remove("top");
    n.style.left = "";
    n.style.width = "";
  };
  reset();
  const boxes = COVERS.flatMap((q) => [...document.querySelectorAll<HTMLElement>(q)])
    .filter((el) => !el.hidden && !el.closest("[hidden]") && el.offsetParent !== null)
    .map((el) => el.getBoundingClientRect())
    .filter((r) => r.width && r.height);
  if (target) boxes.push(target);
  const clear = () => !boxes.some((b) => overlaps(b, n.getBoundingClientRect()));
  if (clear()) return;
  for (const top of [false, true]) {
    reset();
    n.classList.toggle("top", top);
    const r = n.getBoundingClientRect();
    const gap = widestGap({ top: r.top, bottom: r.bottom }, boxes);
    if (gap.right - gap.left < 280) continue;
    n.style.left = `${(gap.left + gap.right) / 2}px`;
    n.style.width = `${Math.min(460, gap.right - gap.left - 16)}px`;
    if (clear()) return;
  }
  // Nowhere is wholly clear: keep at least the target uncovered.
  reset();
  if (target && overlaps(target, n.getBoundingClientRect())) n.classList.add("top");
}

/** The cards and buttons the note must not cover: open side cards and menus, the overview button, End turn and Auto. */
const COVERS = ["#panel", "#army-list", "#lenses", "#sound-menu", "#reopen", "#fab", "#auto-turns", ".tools", ".alerts > .alert"];

const overlaps = (a: DOMRect, b: DOMRect) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** The widest free stretch of a band across the screen, between the boxes standing in it. */
function widestGap(band: { top: number; bottom: number }, boxes: DOMRect[]): { left: number; right: number } {
  const edge = 8;
  const inBand = boxes.filter((b) => b.top < band.bottom && band.top < b.bottom).sort((a, b) => a.left - b.left);
  let best = { left: 0, right: 0 };
  let x = edge;
  for (const b of [...inBand, new DOMRect(innerWidth - edge, 0, 0, 0)]) {
    if (b.left - x > best.right - best.left) best = { left: x, right: b.left };
    x = Math.max(x, b.right);
  }
  return best;
}

/** A tap-sized box round a spot on the map, when the map is what is there to tap. */
export function mapSpot([x, y]: [number, number]): DOMRect | null {
  // The whole ring must sit on open map, clear of the top bar, the cards and the buttons.
  for (const [dx, dy] of [[0, 0], [-22, -22], [22, -22], [-22, 22], [22, 22]] as const) {
    const px = x + dx;
    const py = y + dy;
    if (px < 0 || py < 0 || px > innerWidth || py > innerHeight) return null;
    const hit = document.elementFromPoint(px, py);
    if (!hit || !(hit.closest("#map") || hit.closest(".hint-note, .hint-ring, .coach-note, .coach-spot"))) return null;
  }
  return new DOMRect(x - 24, y - 24, 48, 48);
}

/** The target's box when the player can see and tap it, else null: on screen, not hidden, and not under another card. */
export function visibleBox(el: Element): DOMRect | null {
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return null;
  // Half cut off by the edge of a card that scrolls: not yet, it is scrolled into view first.
  for (let box = el.parentElement; box && box.closest("#panel, .lens-menu"); box = box.parentElement) {
    if (!/auto|scroll/.test(getComputedStyle(box).overflowY)) continue;
    const frame = box.getBoundingClientRect();
    if (r.top < frame.top - 1 || r.bottom > frame.bottom + 1) return null;
  }
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return null;
  const hit = document.elementFromPoint(x, y);
  if (!hit) return null;
  // The hint note itself may sit over it for a moment; it moves out of the way.
  if (hit.closest(".hint-note, .coach-note") || el.contains(hit) || hit.contains(el)) return r;
  return null;
}
