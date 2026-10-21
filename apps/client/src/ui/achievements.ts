import { ACHIEVEMENTS, LIMITS, ladders, ladderState, lifetimeFacts, pointsOf, ruledOut, shownAs, testHolds, totalPoints, type AchievementDefinition, type Tier } from "@ph/engine/domain/achievements";
import { ACHIEVEMENTS_NOT_YET, type AchievementUnlock, type Snapshot } from "@ph/engine";
import { icon, type IconName } from "../art/ui.ts";
import { START_DATE } from "@ph/rules/start";

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
  /** Lifetime totals: amounts added up across eligible campaigns, such as province harvests (ACH-085). */
  totals: Record<string, number>;
  /** Unlocks the player has looked at on the card; the rest mark the trophy button. */
  seen: string[];
  /** The "Achievement toasts" switch in Settings (ACH-071). */
  toasts: boolean;
}

const empty = (): DeviceProfile => ({ unlocked: {}, lifetime: {}, totals: {}, seen: [], toasts: true });

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
    for (const [k, n] of Object.entries(a.added ?? {})) p.totals[k] = (p.totals[k] ?? 0) + n;
    const facts = lifetimeFacts(p);
    for (const d of LIFETIME_ROWS) if (testHolds(d.test, facts)) add({ id: d.id, date: isoOf(s.date) });
  }
  if (out.length || a.fresh.length || a.choices.length || Object.keys(a.added ?? {}).length) saveProfile(p);
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
// A ladder's levels share the glyph of its first level's category, where its badge sits (ACH-086).
const glyphOf = (d: AchievementDefinition): IconName => {
  const category = (d.ladder ? ACHIEVEMENTS.find((x) => x.ladder === d.ladder) : d)?.category ?? d.category;
  return CATEGORIES.find((c) => c.id === category)?.glyph ?? "crown";
};
const TIER_NAME: Record<Tier, string> = { copper: "Copper", silver: "Silver", gold: "Gold", crown: "Crown" };

export type Filter = "all" | "reach" | "earned";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dateWords = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
};
const esc = (t: string) => t.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** A badge: the tier's frame round the category's glyph (D-ACH-15), grey while locked; a ladder's carries its level (ACH-086). */
export function badge(d: AchievementDefinition, earned: boolean, scale = 2, level?: { level: number; of: number }): string {
  const mark = level ? `<i class="ach-level">${level.level}/${level.of}</i>` : "";
  return `<span class="ach-badge tier-${d.tier}${earned ? " earned" : ""}${ACHIEVEMENTS_NOT_YET.has(d.id) ? " not-yet" : ""}">${icon(glyphOf(d), scale)}${mark}</span>`;
}

/** Each ladder's levels, lowest first, and the ladder each row belongs to (ACH-084). */
const LADDERS = ladders();
const ladderOf = (d: AchievementDefinition): AchievementDefinition[] | null => (d.ladder ? (LADDERS[d.ladder] ?? null) : null);
/** A badge in the grid: a row on its own, or a whole ladder under its first level's category (ACH-086). */
interface Tile {
  /** The row the tile opens and is chosen by: the ladder's first level. */
  key: AchievementDefinition;
  levels: AchievementDefinition[];
}
const TILES: Tile[] = ACHIEVEMENTS.flatMap((d) => {
  const ladder = ladderOf(d);
  if (!ladder) return [{ key: d, levels: [d] }];
  return ladder[0] === d ? [{ key: d, levels: ladder }] : [];
});
const tileOf = (id: string): Tile | undefined => TILES.find((t) => t.levels.some((d) => d.id === id));

/** This campaign's value and the target of a row with a bar (ACH-050); lifetime rows read the device. */
function progressOf(d: AchievementDefinition, p: DeviceProfile, s: Snapshot | null): { value: number; target: number } | null {
  if (!d.progress) return null;
  const target = typeof d.progress.target === "number" ? d.progress.target : (s?.achievements?.inScope ?? 0);
  const value = d.scope === "lifetime" ? (p.totals[d.progress.stat] ?? p.lifetime[d.progress.stat]?.length ?? 0) : (s?.achievements?.counters[d.progress.stat] ?? 0);
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

/** A ladder's detail: the level reached, every level with its target, tier, points and date, and the bar to the next (ACH-086). */
function ladderDetail(levels: AchievementDefinition[], p: DeviceProfile, s: Snapshot | null): string {
  const st = ladderState(levels, p.unlocked);
  const shown = st.top ?? levels[0]!;
  const next = st.next;
  const bar = next ? progressOf(next, p, s) : null;
  const lifetime = levels.some((d) => d.scope === "lifetime");
  const status = !next
    ? `<p class="ach-status earned">Every level earned.</p>`
    : bar
      ? `<p class="ach-status">${lifetime ? "All your campaigns" : "This campaign"}: ${fmt(bar.value)} of ${fmt(bar.target)} for ${esc(next.name)}</p><span class="ach-bar"><i style="width:${(bar.value / bar.target) * 100}%"></i></span>`
      : `<p class="ach-status">Next: ${esc(next.name)}.</p>`;
  const rows = levels
    .map((d, i) => {
      const at = p.unlocked[d.id];
      const target = d.progress && typeof d.progress.target === "number" ? fmt(d.progress.target) : "1";
      return `<li class="${at ? "earned" : ""}"><b>${i + 1}</b><span>${esc(d.name)}<small>${target} · ${TIER_NAME[d.tier]} · ${pointsOf(d)} points</small></span><em>${at ? dateWords(at) : "Not yet"}</em></li>`;
    })
    .join("");
  return `<div class="ach-detail framed-soft" id="ach-detail">
    ${badge(shown, st.level > 0, 3, st)}
    <div><b>${esc(shown.name)}</b><small>Level ${st.level} of ${st.of}</small>
    <p>${esc((next ?? shown).text)}</p>${status}</div>
    <ol class="ach-levels">${rows}</ol>
  </div>`;
}

/** The Achievements card (ACH-076 to ACH-078): the overview, the filter, the categories and the detail of the chosen badge. */
export function achievementsCard(p: DeviceProfile, s: Snapshot | null, filter: Filter, chosen: string | null, closeButtons: string): string {
  const all = ACHIEVEMENTS;
  const earnedList = all.filter((d) => d.id in p.unlocked);
  const date = s ? isoOf(s.date) : isoOf(START_DATE);
  const show = (d: AchievementDefinition) => (filter === "earned" ? d.id in p.unlocked : filter === "reach" ? !(d.id in p.unlocked) && !ACHIEVEMENTS_NOT_YET.has(d.id) && !ruledOut(d, date) : true);
  // A ladder shows while any level passes the filter: Within reach while a level is left, Earned once one is (ACH-086).
  const showTile = (t: Tile) => t.levels.some(show);
  const eligible = s?.achievements ? (s.achievements.eligible ? "This campaign can earn achievements." : "This campaign cannot earn achievements: only an ironman campaign, played as the realm it began with, earns them.") : "An ironman campaign can earn achievements; choose Ironman on before you begin.";
  const picked = chosen ? tileOf(chosen) : undefined;
  const sections = CATEGORIES.map((c) => {
    const tiles = TILES.filter((t) => t.key.category === c.id);
    const shown = tiles.filter(showTile);
    if (!shown.length) return "";
    const rows = tiles.flatMap((t) => t.levels);
    const got = rows.filter((d) => d.id in p.unlocked).length;
    return `<h3 class="sub">${icon(c.glyph, 1)} ${c.name} <small>${got} of ${rows.length}</small></h3>
      <div class="ach-grid">${shown
        .map((t) => {
          const ladder = t.levels.length > 1 ? ladderState(t.levels, p.unlocked) : null;
          const d = ladder?.top ?? t.key;
          const earned = d.id in p.unlocked;
          const name = shownAs(d, earned).name;
          const fresh = t.levels.some((x) => x.id in p.unlocked && !p.seen.includes(x.id));
          const label = `${esc(name)}, ${TIER_NAME[d.tier]}${ladder ? `, level ${ladder.level} of ${ladder.of}` : earned ? ", earned" : ""}`;
          return `<button class="ach${t === picked ? " on" : ""}${fresh ? " new" : ""}" data-ach="${t.key.id}" title="${esc(name)}" aria-label="${label}">${badge(d, earned, 2, ladder ?? undefined)}</button>`;
        })
        .join("")}</div>
      ${picked?.key.category === c.id && showTile(picked) ? (picked.levels.length > 1 ? ladderDetail(picked.levels, p, s) : detail(picked.key, p, s)) : ""}`;
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
  const ladder = ladderOf(d);
  const level = ladder ? ` · level ${ladder.indexOf(d) + 1} of ${ladder.length}` : "";
  return `${badge(d, true, 2)}<span><small>Achievement earned</small><b>${esc(d.name)}</b><em>${TIER_NAME[d.tier]} · ${pointsOf(d)} points${level}</em></span>`;
}

export const achievementName = (id: string): string => ACHIEVEMENTS.find((d) => d.id === id)?.name ?? id;

/** Unlocks not yet looked at, for the dot on the trophy button (ACH-078). */
export const unseen = (p: DeviceProfile): number => Object.keys(p.unlocked).filter((id) => !p.seen.includes(id)).length;

/** The badge an achievement sits under: a ladder's level opens the whole ladder (ACH-086). */
export const tileKey = (id: string): string => tileOf(id)?.key.id ?? id;
