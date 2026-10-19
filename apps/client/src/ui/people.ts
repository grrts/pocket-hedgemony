import { officialEffect, OFFICIALS, type Snapshot, type Titles } from "@ph/engine";
import { fold } from "./fold.ts";
import { DEFAULT_TITLES, an, cap } from "./titles.ts";
import type { Ruleset } from "@ph/rules";
import { siegeHeld } from "@ph/engine/domain/map-presentation";
import { sprite } from "../art/sprites.ts";
import { lookOfCulture, portrait, type Look } from "../art/portraits.ts";
import { PALETTE } from "../art/palette.ts";

/**
 * The people of a realm in the panels: portraits for commanders and
 * officials, the province's official on its overview, the realm's Officials
 * tab and an official's own screen (feedback 40-42), and the siege view a
 * besieged province opens on (feedback 32).
 */

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => Math.round(n).toLocaleString("en-US");

/** What each official's post looks after, in a few words. */
export const POST_DUTIES: Record<string, string> = {
  Warden: "keeps the walls and the peace",
  Steward: "runs the lands and the stores",
  "Muster master": "keeps the rolls of men who can be called",
  "Master of works": "sees to roads, walls and buildings",
  "Tax collector": "gathers the taxes",
  "Customs officer": "takes the tolls on trade",
  Judge: "holds the courts",
  Schoolmaster: "keeps the schools and the language",
};

export function lookOf(rules: Ruleset, nation: number): Look {
  const id = rules.nations[nation]?.id ?? "";
  return lookOfCulture(rules.names?.nations[id]);
}

/** A commander's portrait. */
export function commanderPortrait(rules: Ruleset, name: string, nation: number, scale = 3): string {
  return portrait({ name, color: rules.nations[nation]!.color, kind: "commander", look: lookOf(rules, nation), nation: rules.nations[nation]!.id }, scale);
}

export interface Official {
  province: number;
  name: string;
  /** The post's title: "Warden". */
  post: string;
  /** Years served in this province; his effect grows to full at 5. */
  years: number;
  /** Realm a foreign specialist came from, -1 = one of the realm's own. */
  from: number;
}

/** The official in province p's post as the snapshot gives it, or null when the post stands empty. */
export function officialOf(s: Snapshot, p: number, owner: number): Official | null {
  const post = s.provinceOfficial[p];
  const name = s.provinceOfficialName[p];
  if (!post || !name || owner < 0) return null;
  return { province: p, name, post, years: s.provinceOfficialYears[p] ?? 0, from: s.provinceOfficialFrom?.[p] ?? -1 };
}

export function officialPortrait(rules: Ruleset, o: Official, nation: number, scale = 3): string {
  return portrait({ name: o.name, color: rules.nations[nation]!.color, kind: "official", look: lookOf(rules, nation), nation: rules.nations[nation]!.id, post: o.post }, scale);
}

/** "master of works" → "masters of works", "judge" → "judges". */
const plural = (t: string) => t.replace(/^(.+?)( of .*)?$/, (_, head: string, tail = "") => `${head}s${tail}`);
const yearsText = (y: number) => (y < 1 ? "first year" : `${Math.floor(y)} year${Math.floor(y) === 1 ? "" : "s"}`);

/** How far an official has grown into his province: five pips, one a year, and the share of his effect. */
export function servicePips(years: number, share: number): string {
  return `<span class="pips" title="${yearsText(years)} here: ${Math.round(share * 100)}% of his effect, full after 5 years">${Array.from({ length: 5 }, (_, i) => `<i class="${years >= i + 1 ? "on" : ""}"></i>`).join("")}</span>`;
}

/** His effect in one line: the type's effect lines, scaled by years served. */
export function effectText(o: Official): string {
  const e = officialEffect(o.post, o.years);
  return e.lines.join(", ") + (e.note ? ` (${e.note.toLowerCase()})` : "");
}

/** The official as a card on the province's overview: portrait, name and post, his effect, and a button to their screen. */
export function officialCard(rules: Ruleset, o: Official | null, nation: number, mine: boolean, servesLord = false, fill = -1, t: Titles = DEFAULT_TITLES): string {
  const place = rules.provinces[o?.province ?? 0]?.name ?? "";
  if (!o)
    return `<div class="army person empty-post"><span class="portrait-slot"></span><span class="who"><b>No ${esc(t.official)}</b><br><small>The post stands empty: half tax and recruits until it is filled again.</small></span>
      ${mine && !servesLord && fill >= 0 ? `<span class="army-buttons"><button class="paper small" data-official="${fill}">Fill the post</button></span>` : ""}</div>`;
  const e = officialEffect(o.post, o.years);
  return `<div class="army person">${officialPortrait(rules, o, nation)}
    <span class="who"><b>${esc(o.name)}</b><br><small>${esc(o.post)} of ${esc(place)}${o.from >= 0 ? `, from ${esc(rules.nations[o.from]!.name)}` : ""}${servesLord ? `. He serves the ${esc(t.lord)}.` : ""}</small><br>
    <small class="effect">${esc(effectText(o))}</small> ${servicePips(o.years, e.share)}</span>
    ${mine ? `<span class="army-buttons"><button class="paper small" data-official="${o.province}">${esc(cap(t.official))}</button></span>` : ""}</div>`;
}

/**
 * The realm's Officials tab: how many posts are filled and of which types,
 * then every official as a row (portrait, name, post and province, his
 * effect there and his years), each opening his screen, and the empty posts.
 */
export function officialsTab(rules: Ruleset, list: { province: number; official: Official | null }[], nation: number, lordPosts: number, newLands: number[] = [], t: Titles = DEFAULT_TITLES): string {
  const filled = list.filter((x) => x.official).map((x) => x.official!);
  const empty = list.filter((x) => !x.official);
  const types = new Map<string, number>();
  for (const o of filled) types.set(o.post, (types.get(o.post) ?? 0) + 1);
  const missing = OFFICIALS.filter((t) => !types.has(t));
  filled.sort((a, b) => a.post.localeCompare(b.post) || b.years - a.years);
  // Land just taken comes first: its official fled or fell with it, and End turn waits for a decision on each (PROV-340).
  const fresh = newLands.length
    ? `<section class="new-lands framed-soft"><h3 class="sub">New lands · ${newLands.length}</h3>
      <p class="hint">Their ${esc(t.officials)} fled or fell. Before the turn ends, fill each post, grant it to ${esc(an(t.lord))}, or keep it royal with the post empty.</p>
      ${newLands
        .map((p) => `<div class="new-land"><b>${esc(rules.provinces[p]!.name)}</b><span class="post-buttons">
          <button class="paper small wax" data-official="${p}">Fill the post</button>
          <button class="paper small" data-show-province="${p}" data-grant-here>Grant to ${esc(an(t.lord))}</button>
          <button class="paper small" data-settle="${p}">Keep it royal</button></span></div>`)
        .join("")}</section>`
    : "";
  const older = empty.filter((x) => !newLands.includes(x.province));
  return `${fresh}<p><b>${filled.length}</b> ${esc(filled.length === 1 ? t.official : t.officials)} run your royal provinces: ${[...types].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${c} ${esc(c === 1 ? k.toLowerCase() : plural(k.toLowerCase()))}`).join(", ")}.${lordPosts ? ` Your ${esc(t.lords)}' own ${esc(t.officials)} run their ${lordPosts} provinces.` : ""}</p>
    ${missing.length ? `<p class="hint">No royal post has ${missing.map((k) => `a ${esc(k.toLowerCase())}`).join(", ")}: those come only as foreign specialists.</p>` : ""}
    ${older.length ? `<h3 class="sub">Empty posts · ${older.length}</h3><p class="hint">Half tax and recruits until ${esc(an(t.official))} is moved in or hired. Tap one to fill it.</p><p class="post-buttons">${older.map((x) => `<button class="paper small" data-official="${x.province}">${esc(rules.provinces[x.province]!.name)}</button>`).join(" ")}</p>` : ""}
    ${fold("officials-in-post", `In post · ${filled.length}`, `Tap ${esc(an(t.official))} to move him`, `<p class="hint">Each type helps the province it runs, at half in his first year and in full after 5 years there. Open ${esc(an(t.official))} to move him where his type helps most.</p>
    <div class="lord-list">${filled
      .map((o) => {
        const e = officialEffect(o.post, o.years);
        return `<button class="paper lord-row" data-official="${o.province}">${officialPortrait(rules, o, nation, 2)}
          <span class="lord-who"><b>${esc(o.name)}</b><small>${esc(o.post)} · ${esc(rules.provinces[o.province]!.name)}</small><small>${esc(effectText(o))}</small></span>
          <span class="lord-state">${servicePips(o.years, e.share)}<small>${yearsText(o.years)}</small></span>
        </button>`;
      })
      .join("")}</div>`)}`;
}

/** A province the official could move to: who holds that post now, and how well his type suits it. */
export interface MoveOption {
  province: number;
  thumb: string;
  /** The official there now, or null for an empty post. */
  other: Official | null;
  /** Why it suits his type ("2.1 gold tax a month"). */
  fit: string;
}

/** An official's own screen: who they are, the post and what it does now, moving him to another province, and commissioning him. */
export function officialScreen(rules: Ruleset, o: Official, nation: number, gold: number, treasury: number, moves: MoveOption[], allMoves: boolean, t: Titles = DEFAULT_TITLES): string {
  const place = rules.provinces[o.province]!.name;
  const e = officialEffect(o.post, o.years);
  return `<div class="person-card">${officialPortrait(rules, o, nation, 5)}
      <div><p><b>${esc(o.name)}</b></p><p>${esc(o.post)} of ${esc(place)}</p>${o.from >= 0 ? `<p><small>A foreign specialist from ${esc(rules.nations[o.from]!.name)}</small></p>` : ""}<p class="hint">The ${esc(o.post.toLowerCase())} ${POST_DUTIES[o.post] ?? "serves the realm"}.</p></div>
    </div>
    <dl class="facts">
      <dt>Province</dt><dd><button class="paper capital" data-show-province="${o.province}">${esc(place)}</button></dd>
      <dt>Effect</dt><dd>${esc(e.lines.join(", "))}${e.note ? `<br><small>${esc(e.note)}</small>` : ""}</dd>
      <dt>Served</dt><dd>${servicePips(o.years, e.share)} ${yearsText(o.years)} here, ${Math.round(e.share * 100)}% of his effect${e.share < 1 ? "; full after 5 years" : ""}</dd>
      <dt>In post</dt><dd>The province pays its full tax and gives all its recruits.</dd>
    </dl>
    <h3 class="sub">Move to another province</h3>
    <p class="hint">He swaps posts with the ${esc(t.official)} there, or takes an empty post and leaves this one empty. Whoever moves starts again at half his effect. Best fit for a ${esc(o.post.toLowerCase())} first.</p>
    <div class="place-list">${moves
      .map((m) => `<div class="place-row">
        <button class="place" data-show-province="${m.province}" title="Show ${esc(rules.provinces[m.province]!.name)} on the map">
          <img class="thumb" src="${m.thumb}" alt="" width="48" height="48"><span><b>${esc(rules.provinces[m.province]!.name)}</b><small>${m.other ? `${esc(m.other.post)} ${esc(m.other.name)}` : "Empty post"} · ${esc(m.fit)}</small></span>
        </button><button class="paper small" data-swap="${o.province}" data-swap-to="${m.province}" title="${m.other ? `Swap ${esc(o.name)} and ${esc(m.other.name)}` : `Move ${esc(o.name)} to the empty post`}">${m.other ? "Swap" : "Move"}</button></div>`)
      .join("")}</div>
    ${allMoves ? "" : `<button class="paper small more" data-moves-all>Show every province</button>`}
    <h3 class="sub">Command</h3>
    <p class="hint">Commissioned, ${esc(o.name)} waits at court to lead an army. The post stands empty meanwhile: half tax and recruits.</p>
    <div class="choices"><button class="wax" data-commission="${o.province}" ${gold > treasury ? "disabled" : ""}>Commission as commander · ${gold} gold</button></div>
    ${gold > treasury ? `<p class="hint">Not enough gold: the commission costs ${gold}.</p>` : ""}`;
}

/** A type the empty post could be filled with by hiring: what it would do here, and whether one can be found at home. */
export interface HireRow {
  /** Index in OFFICIALS. */
  type: number;
  /** Someone of this type serves in another royal post, so one can be hired at home. */
  home: boolean;
}

/**
 * An empty post's screen (PROV-336): first the realm's officials who could
 * move in, best fit for this province first, then each type to hire, at
 * home or from abroad, with what he would do here in his first year.
 */
export function postScreen(rules: Ruleset, province: number, moves: MoveOption[], allMoves: boolean, hires: HireRow[], price: { home: number; foreign: number }, treasury: number, t: Titles = DEFAULT_TITLES): string {
  const place = rules.provinces[province]!.name;
  const hireButton = (r: HireRow, foreign: boolean) => {
    const gold = foreign ? price.foreign : price.home;
    const why = !foreign && !r.home ? "No one at home knows this trade" : gold > treasury ? `Not enough gold: ${gold} needed` : "";
    return `<button class="paper small${foreign ? "" : " wax"}" data-hire="${province}" data-hire-type="${r.type}" data-hire-foreign="${foreign ? 1 : 0}" ${why ? `disabled title="${why}"` : ""}>${foreign ? "Foreign" : "Hire"} · ${gold} gold</button>`;
  };
  return `<p>The post at <button class="paper capital" data-show-province="${province}">${esc(place)}</button> stands empty: the province pays half its tax and gives half its recruits until it is filled.</p>
    <h3 class="sub">Move ${esc(an(t.official))} here</h3>
    <p class="hint">He leaves his own post empty, or you fill it next. A new post starts him at half his effect. Best fit for ${esc(place)} first.</p>
    ${moves.length ? `<div class="place-list">${moves
      .map((m) => `<div class="place-row">
        <button class="place" data-official="${m.province}" title="Open ${esc(m.other!.name)}">
          <img class="thumb" src="${m.thumb}" alt="" width="48" height="48"><span><b>${esc(m.other!.name)}</b><small>${esc(m.other!.post)} of ${esc(rules.provinces[m.province]!.name)} · here: ${esc(officialEffect(m.other!.post, 0).lines.join(", "))}</small></span>
        </button><button class="paper small" data-swap="${m.province}" data-swap-to="${province}">Move here</button></div>`)
      .join("")}</div>
    ${allMoves ? "" : `<button class="paper small more" data-moves-all>Show every ${esc(t.official)}</button>`}` : `<p class="hint">No other royal province has ${esc(an(t.official))} to spare.</p>`}
    <h3 class="sub">Hire ${esc(an(t.official))}</h3>
    <p class="hint">Gold up front. A type no royal post of yours has can only come from abroad, as a foreign specialist at ${price.foreign} gold.</p>
    <div class="hire-list">${hires
      .map((r) => {
        const post = OFFICIALS[r.type]!;
        return `<div class="hire-row"><span><b>${esc(post)}</b><small>${esc(officialEffect(post, 0).lines.join(", "))} in the first year${officialEffect(post, 0).note ? ` · ${esc(officialEffect(post, 0).note!.toLowerCase())}` : ""}</small>${r.home ? "" : "<small>No one at home knows this trade</small>"}</span>
          <span class="hire-buttons">${hireButton(r, false)}${hireButton(r, true)}</span></div>`;
      })
      .join("")}</div>`;
}

export interface SiegeInfo {
  province: number;
  by: number;
  months: number;
  progress: number;
  breaches: number;
  garrison: number;
  /** Days the walls have held, and months of food left in the castle (null while nobody eats from it). */
  days: number;
  foodMonths: number | null;
  /** Commanders of the besieging armies in the province, by name. */
  besiegers: { name: string; men: number }[];
  /** The defender, or -1 for land nobody holds. */
  holder: number;
  walls: "castle" | "fort" | null;
}

/**
 * The siege view, first on a besieged province's overview: a picture of the
 * walls with the besiegers' camp round them, how long they have held, the
 * breaches made, the men inside, and how far into the next siege month.
 */
export function siegeView(rules: Ruleset, st: SiegeInfo): string {
  const by = rules.nations[st.by]!;
  const holder = st.holder >= 0 ? rules.nations[st.holder]! : null;
  const months = Math.max(1, st.months + 1);
  return `<section class="siege framed-soft">
      <h3 class="sub">Under siege</h3>
      <canvas class="siege-art" width="300" height="96" data-siege="${st.province}"></canvas>
      <p><b>${esc(by.name)}</b> besieges ${holder ? `${esc(holder.name)}'s` : "the"} ${st.walls === "castle" ? "stone castle" : st.walls === "fort" ? "ring fort" : "town"}.</p>
      <div class="siege-months" title="Siege months: each ends with a roll to breach the walls">${Array.from({ length: months }, (_, i) =>
        `<span class="${i < st.months ? "done" : "now"}">${i < st.months ? "" : `<i style="width:${Math.round(st.progress * 100)}%"></i>`}</span>`).join("")}</div>
      <dl class="facts">
        <dt>Held</dt><dd>${siegeHeld(st)} · ${Math.round(st.progress * 100)}% into the next month</dd>
        <dt>Breaches</dt><dd>${st.breaches ? "▮".repeat(Math.min(st.breaches, 8)) + ` ${st.breaches}` : "none yet"}</dd>
        <dt>Inside</dt><dd>${fmt(st.garrison)} men hold the walls</dd>
        <dt>Food</dt><dd>${st.foodMonths === null ? "nobody eats from the store" : st.foodMonths < 0.05 ? "the store is empty: they starve" : `${(Math.floor(st.foodMonths * 10) / 10).toFixed(1).replace(/\.0$/, "")} months left in the store`}</dd>
        <dt>Camp</dt><dd>${st.besiegers.length ? st.besiegers.map((b) => `${esc(b.name)} with ${fmt(b.men)}`).join(", ") : "no army left in the siege lines"}</dd>
      </dl>
    </section>`;
}

/** Paints a siege view's picture: the walls, cracked by each breach, the besiegers' tents and riders round them. */
export function paintSiege(canvas: HTMLCanvasElement, rules: Ruleset, st: SiegeInfo, t: number): void {
  const ctx = canvas.getContext("2d")!;
  const u = 3;
  ctx.imageSmoothingEnabled = false;
  const W = canvas.width;
  const H = canvas.height;
  // Ground and sky.
  ctx.fillStyle = "#cfe0ea";
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "#8cb85a";
  ctx.fillRect(0, H - 8 * u, W, 8 * u);
  ctx.fillStyle = "#5e7a4a";
  for (let x = (t / 400) % 1; x < W; x += 9 * u) ctx.fillRect(Math.round(x), H - 6 * u, u, u);
  const holderColor = st.holder >= 0 ? rules.nations[st.holder]!.color : PALETTE.unowned;
  const byColor = rules.nations[st.by]!.color;
  const keep = sprite(st.walls === "fort" ? "town" : "capital", holderColor, u);
  const kx = Math.round(W / 2 - keep.width / 2);
  const ky = H - 7 * u - keep.height;
  ctx.drawImage(keep, kx, ky);
  if (st.walls === "fort") {
    const pal = sprite("palisade", holderColor, u);
    ctx.drawImage(pal, Math.round(W / 2 - pal.width / 2), H - 7 * u - pal.height + u);
  }
  // Breaches: dark cracks in the wall.
  ctx.fillStyle = PALETTE.ink;
  for (let i = 0; i < Math.min(st.breaches, 6); i++) {
    const bx = kx + ((i * 5 + 3) % Math.max(1, Math.floor(keep.width / u) - 2)) * u;
    const by = ky + keep.height - (4 + (i % 3) * 2) * u;
    ctx.fillRect(bx, by, u, 3 * u);
    ctx.fillRect(bx + u, by + u, u, u);
  }
  // The camp: tents in the besieger's colour on each side, and riders that pace before the walls.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 2; i++) {
      const tx = Math.round(W / 2 + side * (keep.width / 2 + (10 + i * 16) * u) - 4 * u);
      const ty = H - 7 * u;
      ctx.fillStyle = PALETTE.ink;
      for (let r = 0; r < 6; r++) ctx.fillRect(tx + (5 - r) * u - u, ty - (r + 1) * u, (r * 2 + 3) * u, u);
      ctx.fillStyle = byColor;
      for (let r = 0; r < 5; r++) ctx.fillRect(tx + (5 - r) * u, ty - (r + 1) * u, (r * 2 + 1) * u, u);
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(tx + 5 * u, ty - 3 * u, u, 3 * u);
    }
  }
  const frame = Math.floor(t / 180) % 2;
  const pace = Math.sin(t / 900) * 6 * u;
  const rider = sprite(frame ? "rider1" : "rider0", byColor, 2);
  ctx.drawImage(rider, Math.round(W / 2 - keep.width / 2 - rider.width - 2 * u + pace), H - 4 * u - rider.height);
  ctx.save();
  ctx.translate(Math.round(W / 2 + keep.width / 2 + 2 * u - pace) + rider.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(rider, 0, H - 4 * u - rider.height);
  ctx.restore();
}
