/**
 * Layout by window shape (VIEW-039..046, SHELL-108..116): the shape classifier,
 * what each shape does with cards, the Realm book's tabs and the tool column,
 * tap target sizes, safe areas and the map HUD's corners. Numbers come from the
 * "layout" block of map-presentation.json (screen-flow placeholders).
 */
import config from "../../../../rules/data/domain/map-presentation.json" with { type: "json" };

export const LAYOUT = config.layout;

export type Shape = "Short wide" | "Tall" | "Large" | "Far";
export const SHAPES: readonly Shape[] = ["Short wide", "Tall", "Large", "Far"];

export type DeviceKind = "phone" | "tablet" | "desktop" | "Steam Deck" | "TV" | "Steam Machine";

/** A window as the classifier sees it: CSS pixels, the device class and how it is shown. */
export interface Window {
  width: number;
  height: number;
  device: DeviceKind;
  /** Big screen chosen in Settings (the Far layout). */
  farChosen?: boolean;
  /** A TV output detected. */
  tvOutput?: boolean;
}

/** Phones play only in landscape; held upright they show a notice instead of any screen (VIEW-044, SHELL-113). */
export function portraitNotice(w: Window): string | null {
  return w.device === "phone" && w.height > w.width ? LAYOUT.portraitNotice : null;
}

/**
 * ShapeClassifier: Far for a TV or Steam Machine (chosen or detected), Short wide for a
 * phone in landscape under the height threshold, Tall for a tablet or desktop window
 * taller than wide (never a phone), Large otherwise (VIEW-039..043, SHELL-006, SHELL-108..111).
 * A phone in landscape at or above the threshold has no rule (OQ-SHELL-20) and gets Large.
 */
export function classifyShape(w: Window): Shape {
  if (w.farChosen || w.device === "TV" || (w.device === "Steam Machine" && w.tvOutput !== false)) return "Far";
  if (w.tvOutput) return "Far";
  if (w.device === "phone") return w.height < LAYOUT.shortWideMaxHeight ? "Short wide" : "Large";
  if (w.height > w.width) return "Tall";
  return "Large";
}

export type CardSheet =
  | { kind: "side sheet"; side: "left"; widthShare: number; fullHeight: true; mapLiveBeside: true }
  | { kind: "bottom sheet"; heightShare: number; drag: readonly ["peek strip", "full height"] }
  | { kind: "side sheet"; widthPx: number; fixedWidth: true; raisedScale: boolean };

/** Your realm's six sections show as one row of icons with names under the card's title, in every shape (SHELL-167). */
export interface BookTabs {
  place: "top row";
  narrow: boolean;
  names: boolean;
}

export interface ShapeLayout {
  shape: Shape;
  mapFirst: boolean;
  card: CardSheet;
  bookTabs: BookTabs;
  topBar: "one thin row" | "full";
  toolColumn: "right edge" | "right edge above End turn";
  menus: "centred, maximum width" | "full width";
  stretchesEdgeToEdge: boolean;
  focusFrame: "normal" | "thick";
  /** Share of the screen at each edge where nothing is drawn (TV overscan). */
  overscanShare: number;
  /** Body text as a share of screen height, where the shape sets it. */
  bodyTextShare: number | null;
}

/** The layout rule of a shape (VIEW-040..043, SHELL-053..055, SHELL-108..111, SHELL-167). */
export function layoutFor(shape: Shape, uiScale = 1): ShapeLayout {
  const large: ShapeLayout = {
    shape,
    mapFirst: false,
    card: { kind: "side sheet", widthPx: LAYOUT.cardLargeWidth * uiScale, fixedWidth: true, raisedScale: false },
    bookTabs: { place: "top row", narrow: false, names: true },
    topBar: "full",
    toolColumn: "right edge",
    menus: "centred, maximum width",
    stretchesEdgeToEdge: false,
    focusFrame: "normal",
    overscanShare: 0,
    bodyTextShare: null,
  };
  switch (shape) {
    case "Short wide":
      return {
        ...large,
        mapFirst: true,
        card: { kind: "side sheet", side: "left", widthShare: LAYOUT.cardPhoneWidthShare, fullHeight: true, mapLiveBeside: true },
        topBar: "one thin row",
        menus: "full width",
      };
    case "Tall":
      return {
        ...large,
        card: { kind: "bottom sheet", heightShare: LAYOUT.cardTallHeightShare, drag: ["peek strip", "full height"] },
        toolColumn: "right edge above End turn",
      };
    case "Large":
      return large;
    case "Far":
      return {
        ...large,
        card: { kind: "side sheet", widthPx: LAYOUT.cardLargeWidth * uiScale, fixedWidth: true, raisedScale: true },
        focusFrame: "thick",
        overscanShare: LAYOUT.farOverscanShare,
        bodyTextShare: LAYOUT.farBodyTextShare,
      };
  }
}

/** Body text height in CSS px for a screen height, where the shape fixes it (Far: about 1/30). */
export function bodyTextPx(layout: ShapeLayout, screenHeight: number): number | null {
  return layout.bodyTextShare === null ? null : screenHeight * layout.bodyTextShare;
}

/** Interface scale needed to reach the Far body text, given the body text size at scale 1. */
export function farUiScale(screenHeight: number, bodyPxAtScale1: number): number {
  return (screenHeight * LAYOUT.farBodyTextShare) / bodyPxAtScale1;
}

export type TouchTargetSize = "Normal" | "Large";

/** Minimum tap target side in points: 44, or 56 with Large touch targets (VIEW-045, SHELL-114). */
export const tapTargetMin = (size: TouchTargetSize = "Normal"): number => LAYOUT.tapTarget[size];
export const TAP_GAP: number = LAYOUT.tapGap;

// ---------------------------------------------------------------------------
// The map HUD as rectangles, to check the touch rules against

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

export interface Rect {
  name: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Ends the turn or loses something (End turn, Delete save, Exit to main menu). */
  risky?: boolean;
  frequent?: boolean;
}

export type Corner = "upper left" | "upper right" | "lower left" | "lower right";

/**
 * Lays out the map's buttons in points inside the safe area and, for Far, inside the
 * overscan band: game menu button upper left next to the banner, top bar plaques along
 * the top, the tool column on the right edge, End turn lower right, the name tab lower
 * left. Every button is a tap target with the gap kept between neighbours and from the
 * safe edge. A risky button keeps at least one target's room from any frequent one.
 */
export function mapHud(o: { width: number; height: number; shape: Shape; safe?: Insets; touch?: TouchTargetSize; plaques?: number }): Rect[] {
  const s = tapTargetMin(o.touch);
  const g = TAP_GAP;
  const lay = layoutFor(o.shape);
  const ov = { x: o.width * lay.overscanShare, y: o.height * lay.overscanShare };
  const safe = o.safe ?? NO_INSETS;
  const left = Math.max(safe.left, ov.x) + g;
  const right = o.width - Math.max(safe.right, ov.x) - g;
  const top = Math.max(safe.top, ov.y) + g;
  const bottom = o.height - Math.max(safe.bottom, ov.y) - g;
  const out: Rect[] = [];
  out.push({ name: "game menu", x: left, y: top, w: s, h: s, frequent: false });
  out.push({ name: "banner", x: left + s + g, y: top, w: s, h: s, frequent: true });
  const plaques = Math.min(o.plaques ?? 4, o.shape === "Short wide" ? topBarMaxPlaques() : Infinity);
  for (let i = 0; i < plaques; i++) out.push({ name: `plaque ${i + 1}`, x: left + (s + g) * (i + 2), y: top, w: s, h: s, frequent: true });
  out.push({ name: "End turn", x: right - s, y: bottom - s, w: s, h: s, risky: true });
  const tools = ["map mode", "go to capital", "commanders", "sound"];
  // The column hangs from the top bar, or sits above End turn with one target of room (Tall); on a phone held
  // sideways it is two targets wide so it stays clear of End turn (SHELL-168).
  const across = o.shape === "Short wide" ? 2 : 1;
  const rows = Math.ceil(tools.length / across);
  const columnBottom = lay.toolColumn === "right edge above End turn" ? bottom - s - g - s - g : top + s + g + rows * (s + g);
  tools.forEach((name, i) => {
    const y = columnBottom - (rows - Math.floor(i / across)) * (s + g) + g;
    out.push({ name, x: right - s - (i % across) * (s + g), y, w: s, h: s, frequent: true });
  });
  out.push({ name: "name tab", x: left, y: bottom - s, w: s * 3, h: s, frequent: true });
  return out;
}

/** Plaques a phone's top bar holds; the rest move into the country card (SHELL-047). */
export const topBarMaxPlaques = (): number => LAYOUT.topBarMaxPlaquesPhone;

export function cornerOf(r: Rect, width: number, height: number): Corner {
  const cx = r.x + r.w / 2;
  const cy = r.y + r.h / 2;
  return `${cy < height / 2 ? "upper" : "lower"} ${cx < width / 2 ? "left" : "right"}` as Corner;
}

export const oppositeCorners = (a: Corner, b: Corner): boolean => {
  const [av, ah] = a.split(" ");
  const [bv, bh] = b.split(" ");
  return av !== bv && ah !== bh;
};

/** Space between two rectangles (0 when they touch or overlap). */
export function gapBetween(a: Rect, b: Rect): number {
  const dx = Math.max(0, Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
  const dy = Math.max(0, Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
  return Math.max(dx, dy);
}

export interface TouchRuleBreak {
  rule: "size" | "gap" | "safe area" | "risky next to frequent" | "risky at edge";
  names: string[];
}

/** Checks the touch rules of screen-flow §7 against laid-out rectangles (SHELL-112, SHELL-114, SHELL-115, VIEW-045). */
export function checkTouchRules(rects: Rect[], o: { width: number; height: number; safe?: Insets; touch?: TouchTargetSize }): TouchRuleBreak[] {
  const s = tapTargetMin(o.touch);
  const safe = o.safe ?? NO_INSETS;
  const out: TouchRuleBreak[] = [];
  for (const r of rects) {
    if (r.w < s || r.h < s) out.push({ rule: "size", names: [r.name] });
    if (r.x < safe.left || r.y < safe.top || r.x + r.w > o.width - safe.right || r.y + r.h > o.height - safe.bottom) out.push({ rule: "safe area", names: [r.name] });
    if (r.risky && (r.x <= safe.left || r.y <= safe.top || r.x + r.w >= o.width - safe.right || r.y + r.h >= o.height - safe.bottom)) out.push({ rule: "risky at edge", names: [r.name] });
  }
  for (let i = 0; i < rects.length; i++) {
    for (let j = i + 1; j < rects.length; j++) {
      const a = rects[i]!;
      const b = rects[j]!;
      const gap = gapBetween(a, b);
      if (gap < TAP_GAP) out.push({ rule: "gap", names: [a.name, b.name] });
      if ((a.risky && b.frequent) || (b.risky && a.frequent)) if (gap < s) out.push({ rule: "risky next to frequent", names: [a.name, b.name] });
    }
  }
  return out;
}

/** Where the map's visible part lies while a card is open (Short wide: right of the side sheet). */
export function visibleMapArea(shape: Shape, width: number, height: number): { x: number; y: number; w: number; h: number } {
  const c = layoutFor(shape).card;
  if (c.kind === "side sheet" && "widthShare" in c) {
    const x = width * c.widthShare;
    return { x, y: 0, w: width - x, h: height };
  }
  if (c.kind === "bottom sheet") return { x: 0, y: 0, w: width, h: height * (1 - c.heightShare) };
  return { x: 0, y: 0, w: width - c.widthPx, h: height };
}

/**
 * Recentres the camera so a selected point (screen px) lies in the middle of the map
 * still visible beside the card (VIEW-046, SHELL-053). Returns the screen shift and
 * where the point ends up.
 */
export function recentreForCard(shape: Shape, width: number, height: number, point: { x: number; y: number }): { shift: { x: number; y: number }; at: { x: number; y: number } } {
  const v = visibleMapArea(shape, width, height);
  const at = { x: v.x + v.w / 2, y: v.y + v.h / 2 };
  const inside = point.x >= v.x && point.x <= v.x + v.w && point.y >= v.y && point.y <= v.y + v.h;
  if (inside) return { shift: { x: 0, y: 0 }, at: point };
  return { shift: { x: at.x - point.x, y: at.y - point.y }, at };
}
