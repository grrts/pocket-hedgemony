/**
 * Navigation by input (SHELL-002, SHELL-007, SHELL-117..128): what Back is on
 * each device, touch on the map and on panels, the iOS edge swipe, focus,
 * trackpads, button prompts, text entry, mouse and keyboard.
 */
import { SHELL, back, layerOf, screen, topId, type BackResult, type FrameId, type Platform, type Shell } from "./stack.ts";

export type InputDevice = "touch" | "mouse" | "keyboard" | "controller";

/** BackRouter: whether an input is Back on this platform and device (SHELL-117). */
export function isBackInput(platform: Platform, device: InputDevice, input: string): boolean {
  const lists = SHELL.backInputs as Record<string, string[]>;
  if (device === "touch") return (lists[platform] ?? []).includes(input) && !(platform === "iOS" && input === "edge swipe");
  return (lists[device] ?? []).includes(input);
}

/** Routes a device's input: Back pops the top of the stack; anything else is not Back here. */
export function routeInput(sh: Shell, device: InputDevice, input: string): BackResult | "not back" {
  return isBackInput(sh.platform, device, input) ? back(sh) : "not back";
}

/** The iOS edge swipe: Back on full screens only, never over the map, where it pans (SHELL-117). */
export function edgeSwipe(sh: Shell): BackResult | "map pans" | "nothing" {
  const id = topId(sh);
  if (!id) return "nothing";
  if (layerOf(id) === "map") return "map pans";
  if (sh.platform === "iOS" && layerOf(id) === "full screen") return back(sh);
  return "nothing";
}

export type MapGesture = { tap: string } | { drag: true } | { pinch: true } | { longPress: string } | { tapArmy: string; thenProvince: string; armyAt: string };

/** Touch on the map (SHELL-119): tap selects, drag pans, pinch zooms, long press shows without selecting, army then province marches. */
export function mapTouch(g: MapGesture): { does: "select" | "pan" | "zoom" | "show under finger" | "march" | "halt"; target?: string; selects: boolean } {
  if ("tap" in g) return { does: "select", target: g.tap, selects: true };
  if ("drag" in g) return { does: "pan", selects: false };
  if ("pinch" in g) return { does: "zoom", selects: false };
  if ("longPress" in g) return { does: "show under finger", target: g.longPress, selects: false };
  return g.thenProvince === g.armyAt ? { does: "halt", target: g.tapArmy, selects: false } : { does: "march", target: g.thenProvince, selects: false };
}

export type PanelGesture = "tap" | "drag" | "pinch" | "long press";

/** Touch on cards, the book and menus (SHELL-120): long press only explains, the same text as a desktop tooltip. */
export function panelTouch(g: PanelGesture): "press" | "scroll" | "nothing" | "explain" {
  return ({ tap: "press", drag: "scroll", pinch: "nothing", "long press": "explain" } as const)[g];
}

/** Every action and the ways to reach it; long press and hover only ever explain (SHELL-007, SHELL-120). */
export const ACTIONS: { action: string; tap: boolean; controller: boolean; longPress: boolean; hover: boolean }[] = [
  { action: "select", tap: true, controller: true, longPress: false, hover: false },
  { action: "open card", tap: true, controller: true, longPress: false, hover: false },
  { action: "march", tap: true, controller: true, longPress: false, hover: false },
  { action: "halt", tap: true, controller: true, longPress: false, hover: false },
  { action: "pan", tap: false, controller: true, longPress: false, hover: false },
  { action: "zoom", tap: false, controller: true, longPress: false, hover: false },
  { action: "End turn", tap: true, controller: true, longPress: false, hover: false },
  { action: "mute an Attention line", tap: true, controller: true, longPress: true, hover: false },
  { action: "explain", tap: false, controller: true, longPress: true, hover: true },
];

/** Actions reachable only by long press or only by hover; must be none. */
export function longPressOrHoverOnly(actions = ACTIONS): string[] {
  return actions.filter((a) => !a.tap && !a.controller && (a.longPress || a.hover)).map((a) => a.action);
}

/** The first focus of a screen, framed in gold, whenever a controller or keyboard is in use (INV-SHELL-5, SHELL-123). */
export function firstFocus(id: FrameId, device: InputDevice): { element: string; frame: "gold" } | null {
  if (device !== "controller" && device !== "keyboard") return null;
  return { element: screen(id).firstFocus, frame: "gold" };
}

/** Focus order follows reading order: top to bottom, then left to right. */
export function focusOrder<T extends { x: number; y: number }>(elements: readonly T[]): T[] {
  return [...elements].sort((a, b) => a.y - b.y || a.x - b.x);
}

/** Trackpads act as a mouse on the map; the stick drives the cursor (SHELL-125). */
export const mapPointer = (control: "trackpad" | "stick"): "the mouse pointer" | "the stick cursor" => (control === "trackpad" ? "the mouse pointer" : "the stick cursor");

export type PromptDevice = keyof typeof SHELL.prompts;

/** Button prompts match the last device used, switching at once (SHELL-126). */
export const prompts = (device: PromptDevice): string => SHELL.prompts[device];

/** A text field: a filled-in default and the platform's on-screen keyboard (SHELL-127). */
export function textField(platform: string, defaultText: string): { value: string; confirmable: boolean; keyboard: string } {
  const keyboard = (SHELL.textKeyboards as Record<string, string>)[platform];
  if (!keyboard) throw new Error(`No on-screen keyboard named for ${platform}`);
  return { value: defaultText, confirmable: defaultText.length > 0, keyboard };
}

export type DesktopInput = "hover" | "Esc" | "Enter" | "Tab" | "End turn key";

/** Mouse and keyboard (SHELL-128): hover shows what long press shows; Esc is Back, Enter selects, Tab moves focus. */
export function desktopInput(i: DesktopInput): "explain" | "Back" | "select" | "next focus" | "End turn" {
  return ({ hover: "explain", Esc: "Back", Enter: "select", Tab: "next focus", "End turn key": "End turn" } as const)[i];
}
