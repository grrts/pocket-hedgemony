import { ACHIEVEMENTS, LIMITS, pointsOf, ruledOut, shownAs, testHolds, totalPoints, type AchievementDefinition, type Tier } from "@ph/engine/domain/achievements";
import { ACHIEVEMENTS_NOT_YET, type AchievementUnlock, type Snapshot } from "@ph/engine";
import { icon, type IconName } from "../art/ui.ts";

/**
 * Achievements on screen (domain/achievements "How the player uses it",
 * ACH-076 to ACH-083): the player profile on the device keeps every unlock
 * with its date and the lifetime counters, apart from any campaign; the
 * Achievements card shows them by category with a filter and a detail; and
 * an unlock comes up as a toast at the top.
 */

const KEY = "ph.profile.default.achievements";

export interface DeviceProfile {
  /** Every achievement earned on this device, with the game date it was earned. */
  unlocked: Record<string, string>;
  /** Lifetime counters: the distinct things counted across eligible campaigns (ACH-028). */
  lifetime: Record<string, string[]>;
  /** Unlocks the player has looked at on the card; the rest mark the trophy button. */
  seen: string[];
  /** The "Achievement toasts" switch in Settings (ACH-071). */
  toasts: boolean;
}

const empty = (): DeviceProfile => ({ unlocked: {}, lifetime: {}, seen: [], toasts: true });

/** The profile from the device; a fresh one when storage is empty or blocked. */
export function loadProfile(): DeviceProfile {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    return { ...empty(), ...(JSON.parse(raw) as Partial<DeviceProfile>) };
  } catch {
    return empty();
  }
}

export function saveProfile(p: DeviceProfile): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Storage blocked (a private window): the unlocks last until the page closes.
  }
}

const isoOf = (d: { year: number; month: number; day?: number }) => `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day ?? 1).padStart(2, "0")}`;

const LIFETIME_ROWS = ACHIEVEMENTS.filter((d) => d.scope === "lifetime" && !ACHIEVEMENTS_NOT_YET.has(d.id));

/**
 * Takes in a snapshot: the campaign's new unlocks go into the profile at once
 * (ACH-051), the lifetime counters grow for an eligible campaign (ACH-041) and
 * their rows are tested. Returns what is new on this device, for the toast.
 */
export function takeAchievements(p: DeviceProfile, s: Snapshot, realm: string): AchievementUnlock[] {
  const a = s.achievements;
  if (!a) return [];
  const out: AchievementUnlock[] = [];
  const add = (u: AchievementUnlock) => {
    if (u.id in p.unlocked) return;
    p.unlocked[u.id] = u.date;
    out.push(u);
  };
  for (const u of a.fresh) add(u);
  if (a.eligible) {
    const counted = (key: string, thing: string) => {
      const list = (p.lifetime[key] ??= []);
      if (!list.includes(thing)) list.push(thing);
    };
    if (a.months >= 120) counted("distinct_realms_played_10_years", realm);
    for (const c of a.choices) counted("distinct_nonhistorical_options", c);
    const facts = Object.fromEntries(Object.entries(p.lifetime).map(([k, v]) => [k, v.length]));
    for (const d of LIFETIME_ROWS) if (testHolds(d.test, facts)) add({ id: d.id, date: isoOf(s.date) });
  }
  if (out.length || a.fresh.length || a.choices.length) saveProfile(p);
  return out;
}

export const CATEGORIES: { id: string; name: string; glyph: IconName }[] = [
  { id: "first_steps", name: "First steps", glyph: "hammer" },
  { id: "realm", name: "Realm", glyph: "coin" },
  { id: "lords", name: "Lords and rule", glyph: "crown" },
  { id: "learning", name: "Learning", glyph: "scroll" },
  { id: "war", name: "War", glyph: "swords" },
  { id: "sea", name: "Sea and the wider world", glyph: "anchor" },
  { id: "order", name: "Order", glyph: "castle" },
  { id: "abroad", name: "Abroad", glyph: "map" },
  { id: "history", name: "History", glyph: "scroll" },
  { id: "campaign", name: "Campaign", glyph: "hourglass" },
];
const glyphOf = (d: AchievementDefinition): IconName => CATEGORIES.find((c) => c.id === d.category)?.glyph ?? "crown";
const TIER_NAME: Record<Tier, string> = { copper: "Copper", silver: "Silver", gold: "Gold", crown: "Crown" };

export type Filter = "all" | "reach" | "earned";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateWords = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
};
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** A badge: the tier's frame round the category's glyph (D-ACH-15), grey while locked. */
export function badge(d: AchievementDefinition, earned: boolean, scale = 2): string {
  return `<span class="ach-badge tier-${d.tier}${earned ? " earned" : ""}${ACHIEVEMENTS_NOT_YET.has(d.id) ? " not-yet" : ""}">${icon(glyphOf(d), scale)}</span>`;
}

/** This campaign's value and the target of a row with a bar (ACH-050); lifetime rows read the device. */
function progressOf(d: AchievementDefinition, p: DeviceProfile, s: Snapshot | null): { value: number; target: number } | null {
  if (!d.progress) return null;
  const target = typeof d.progress.target === "number" ? d.progress.target : (s?.achievements?.inScope ?? 0);
  const value = d.scope === "lifetime" ? (p.lifetime[d.progress.stat]?.length ?? 0) : (s?.achievements?.counters[d.progress.stat] ?? 0);
  return target > 0 ? { value: Math.min(value, target), target } : null;
}

function detail(d: AchievementDefinition, p: DeviceProfile, s: Snapshot | null): string {
  const earned = d.id in p.unlocked;
  const shown = shownAs(d, earned);
  const bar = progressOf(d, p, s);
  const status = earned
    ? `<p class="ach-status earned">Earned on ${dateWords(p.unlocked[d.id]!)}</p>`
    : ACHIEVEMENTS_NOT_YET.has(d.id)
      ? `<p class="ach-status">Not in the game yet: its part of the realm is still being built.</p>`
      : bar
        ? `<p class="ach-status">${s?.achievements ? "This campaign" : "Start a campaign to count"}: ${fmt(bar.value)} of ${fmt(bar.target)}</p><span class="ach-bar"><i style="width:${(bar.value / bar.target) * 100}%"></i></span>`
        : `<p class="ach-status">Not earned yet.</p>`;
  return `<div class="ach-detail framed-soft" id="ach-detail">
    ${badge(d, earned, 3)}
    <div><b>${esc(shown.name)}</b><small>${TIER_NAME[d.tier]} · ${pointsOf(d)} points</small>
    ${shown.text ? `<p>${esc(shown.text)}</p>` : ""}${status}</div>
  </div>`;
}

/** The Achievements card (ACH-076 to ACH-078): the overview, the filter, the categories and the detail of the chosen badge. */
export function achievementsCard(p: DeviceProfile, s: Snapshot | null, filter: Filter, chosen: string | null, closeButtons: string): string {
  const all = ACHIEVEMENTS;
  const earnedList = all.filter((d) => d.id in p.unlocked);
  const date = s ? isoOf(s.date) : "1444-11-11";
  const show = (d: AchievementDefinition) => (filter === "earned" ? d.id in p.unlocked : filter === "reach" ? !(d.id in p.unlocked) && !ACHIEVEMENTS_NOT_YET.has(d.id) && !ruledOut(d, date) : true);
  const eligible = s?.achievements ? (s.achievements.eligible ? "This campaign can earn achievements." : "This campaign cannot earn achievements.") : "Every new campaign can earn achievements.";
  const picked = chosen ? all.find((d) => d.id === chosen) : undefined;
  const sections = CATEGORIES.map((c) => {
    const rows = all.filter((d) => d.category === c.id);
    const shown = rows.filter(show);
    if (!shown.length) return "";
    const got = rows.filter((d) => d.id in p.unlocked).length;
    return `<h3 class="sub">${icon(c.glyph, 1)} ${c.name} <small>${got} of ${rows.length}</small></h3>
      <div class="ach-grid">${shown
        .map((d) => {
          const earned = d.id in p.unlocked;
          const name = shownAs(d, earned).name;
          return `<button class="ach${d.id === chosen ? " on" : ""}${earned && !p.seen.includes(d.id) ? " new" : ""}" data-ach="${d.id}" title="${esc(name)}" aria-label="${esc(name)}, ${TIER_NAME[d.tier]}${earned ? ", earned" : ""}">${badge(d, earned)}</button>`;
        })
        .join("")}</div>
      ${picked?.category === c.id && show(picked) ? detail(picked, p, s) : ""}`;
  }).join("");
  return `<header><h2 class="ribbon">Achievements</h2>${closeButtons}</header>
    <div class="ach-head">
      <span class="ach-count"><b>${earnedList.length}</b> of ${all.length} earned</span>
      <span class="ach-count"><b>${totalPoints(earnedList)}</b> of ${totalPoints(all)} points</span>
    </div>
    <p class="hint">${eligible} Tap a badge to see what it asks. They give nothing in the game: they are for the record (up to ${LIMITS.max_achievements}).</p>
    <nav class="tabs ach-filter">${(
      [
        ["all", "All"],
        ["reach", "Within reach"],
        ["earned", "Earned"],
      ] as const
    )
      .map(([f, label]) => `<button class="tab${filter === f ? " on" : ""}" data-ach-filter="${f}">${label}</button>`)
      .join("")}</nav>
    ${sections || `<p class="hint">${filter === "earned" ? "None earned yet. Your first harvest is a good start." : "Nothing left within reach in this campaign."}</p>`}`;
}

/** The toast's markup: badge, name and tier (ACH-069). */
export function toastHtml(u: AchievementUnlock): string {
  const d = ACHIEVEMENTS.find((x) => x.id === u.id)!;
  return `${badge(d, true, 2)}<span><small>Achievement earned</small><b>${esc(d.name)}</b><em>${TIER_NAME[d.tier]} · ${pointsOf(d)} points</em></span>`;
}

export const achievementName = (id: string): string => ACHIEVEMENTS.find((d) => d.id === id)?.name ?? id;

/** Unlocks not yet looked at, for the dot on the trophy button (ACH-078). */
export const unseen = (p: DeviceProfile): number => Object.keys(p.unlocked).filter((id) => !p.seen.includes(id)).length;
