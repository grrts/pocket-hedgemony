/**
 * The Attention list (SHELL-083..089, INV-SHELL-10, INV-SHELL-12): warnings
 * and waiting items posted by every system, in two groups, most urgent first,
 * with mutes per item and per kind. It says what is wrong, never what to do:
 * a line's sentence is its kind from the one config table and its place.
 */
import config from "../../../../rules/data/domain/game-shell.json" with { type: "json" };

export type AttentionGroup = "Warnings" | "Waiting for you";
export type AttentionKind = keyof typeof config.attention;

export interface AttentionLine {
  id: string;
  kind: AttentionKind;
  /** Where Show jumps: a province, army, fleet or card. */
  target: { kind: string; name: string };
  /** Urgency as the posting system rates it; higher is more urgent. */
  urgency: number;
}

export interface ShownLine extends AttentionLine {
  group: AttentionGroup;
  icon: string;
  sentence: string;
  button: "Show";
}

export interface AttentionList {
  lines: AttentionLine[];
  mutedItems: Set<string>;
  mutedKinds: Set<AttentionKind>;
}

export const newAttention = (): AttentionList => ({ lines: [], mutedItems: new Set(), mutedKinds: new Set() });

export const ATTENTION_KINDS = Object.keys(config.attention) as AttentionKind[];

export function isAttentionKind(k: string): k is AttentionKind {
  return Object.hasOwn(config.attention, k);
}

export function groupOf(kind: AttentionKind): AttentionGroup {
  return config.attention[kind].group as AttentionGroup;
}

/** A system posts a line (policy: added unless muted when shown). */
export function post(list: AttentionList, line: AttentionLine): void {
  list.lines = list.lines.filter((l) => l.id !== line.id);
  list.lines.push(line);
}

/** One sentence naming what is wrong and where; never advice (SHELL-089). */
export function sentence(line: AttentionLine): string {
  const k = line.kind;
  return `${k[0]!.toUpperCase()}${k.slice(1)}: ${line.target.name}`;
}

/** Visible lines: Warnings then Waiting for you, most urgent first, muted ones left out (SHELL-084, INV-SHELL-12). */
export function visibleLines(list: AttentionList): ShownLine[] {
  const order: AttentionGroup[] = ["Warnings", "Waiting for you"];
  return list.lines
    .filter((l) => !list.mutedItems.has(l.id) && !list.mutedKinds.has(l.kind))
    .map((l) => ({ ...l, group: groupOf(l.kind), icon: config.attention[l.kind].icon, sentence: sentence(l), button: "Show" as const }))
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.urgency - a.urgency);
}

/** Muted kinds are listed at the bottom so they can be unmuted (SHELL-087). */
export const mutedKindsListed = (list: AttentionList): AttentionKind[] => [...list.mutedKinds];

/** MuteAttentionLine: this item, or every item of its kind (SHELL-087). */
export function mute(list: AttentionList, lineId: string, scope: "item" | "kind"): { type: "AttentionMuteChanged"; item?: string; kind?: AttentionKind } {
  const line = list.lines.find((l) => l.id === lineId);
  if (!line) throw new Error(`No Attention line ${lineId}`);
  if (scope === "item") {
    list.mutedItems.add(lineId);
    return { type: "AttentionMuteChanged", item: lineId };
  }
  list.mutedKinds.add(line.kind);
  return { type: "AttentionMuteChanged", kind: line.kind };
}

export function unmuteKind(list: AttentionList, kind: AttentionKind): { type: "AttentionMuteChanged"; kind: AttentionKind } {
  list.mutedKinds.delete(kind);
  return { type: "AttentionMuteChanged", kind };
}

/** The End turn badge counts the visible lines (SHELL-049). */
export const badgeCount = (list: AttentionList): number => visibleLines(list).length;

/** The bell lights while a warning is visible (SHELL-050). */
export const bellLit = (list: AttentionList): boolean => visibleLines(list).some((l) => l.group === "Warnings");

export const openWarnings = (list: AttentionList): number => visibleLines(list).filter((l) => l.group === "Warnings").length;
