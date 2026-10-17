import { officialName } from "@ph/engine";
import type { Ruleset } from "@ph/rules";
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
  Schoolmaster: "keeps the schools and the tongue",
};

export function lookOf(rules: Ruleset, nation: number): Look {
  const id = rules.nations[nation]?.id ?? "";
  return lookOfCulture(rules.names?.nations[id]);
}

/** A commander's portrait. */
export function commanderPortrait(rules: Ruleset, name: string, nation: number, scale = 3): string {
  return portrait({ name, color: rules.nations[nation]!.color, kind: "commander", look: lookOf(rules, nation) }, scale);
}

export interface Official {
  province: number;
  name: string;
  /** The post's title: "Warden". */
  post: string;
}

/** The official in province p's post, or null when the post stands empty. */
export function officialOf(rules: Ruleset, p: number, owner: number, post: string | null | undefined): Official | null {
  if (!post || owner < 0) return null;
  return { province: p, name: officialName(rules, p, owner), post };
}

export function officialPortrait(rules: Ruleset, o: Official, nation: number, scale = 3): string {
  return portrait({ name: o.name, color: rules.nations[nation]!.color, kind: "official", look: lookOf(rules, nation) }, scale);
}

/** The official as a card on the province's overview: portrait, name and post, and a button to their screen. */
export function officialCard(rules: Ruleset, o: Official | null, nation: number, mine: boolean): string {
  const place = rules.provinces[o?.province ?? 0]?.name ?? "";
  if (!o)
    return `<div class="army person empty-post"><span class="portrait-slot"></span><span class="who"><b>No official</b><br><small>The post stands empty: half tax and recruits until it is filled again.</small></span></div>`;
  return `<div class="army person">${officialPortrait(rules, o, nation)}
    <span class="who"><b>${esc(o.name)}</b><br><small>${esc(o.post)} of ${esc(place)}: ${POST_DUTIES[o.post] ?? "serves the realm"}</small></span>
    ${mine ? `<span class="army-buttons"><button class="paper small" data-official="${o.province}">Official</button></span>` : ""}</div>`;
}

/** The realm's Officials tab: every post, filled ones first, each opening its official's screen. */
export function officialsTab(rules: Ruleset, list: { province: number; official: Official | null }[], nation: number): string {
  const filled = list.filter((x) => x.official);
  const empty = list.filter((x) => !x.official);
  return `<p class="hint">Each province has one official, who runs it for you. Commission one as a commander and the post stands empty until they return.</p>
    <h3 class="sub">In post · ${filled.length}</h3>
    <div class="people">${filled
      .map(({ official: o }) => `<button class="paper person-tile" data-official="${o!.province}">${officialPortrait(rules, o!, nation, 2)}<span><b>${esc(o!.name)}</b><small>${esc(o!.post)} · ${esc(rules.provinces[o!.province]!.name)}</small></span></button>`)
      .join("")}</div>
    ${empty.length ? `<h3 class="sub">Empty posts · ${empty.length}</h3><p>${empty.map((x) => `<button class="paper small" data-show-province="${x.province}">${esc(rules.provinces[x.province]!.name)}</button>`).join(" ")}</p>` : ""}`;
}

/** An official's own screen: who they are, the post and what it does, and what can be done with them. */
export function officialScreen(rules: Ruleset, o: Official, nation: number, gold: number, treasury: number): string {
  const place = rules.provinces[o.province]!.name;
  return `<div class="person-card">${officialPortrait(rules, o, nation, 5)}
      <div><p><b>${esc(o.name)}</b></p><p>${esc(o.post)} of ${esc(place)}</p><p class="hint">The ${esc(o.post.toLowerCase())} ${POST_DUTIES[o.post] ?? "serves the realm"}.</p></div>
    </div>
    <dl class="facts">
      <dt>Province</dt><dd><button class="paper capital" data-show-province="${o.province}">${esc(place)}</button></dd>
      <dt>In post</dt><dd>The province pays its full tax and gives all its recruits.</dd>
    </dl>
    <h3 class="sub">Command</h3>
    <p class="hint">Commissioned, ${esc(o.name)} waits at court to lead an army. The post stands empty meanwhile: half tax and recruits.</p>
    <div class="choices"><button class="wax" data-commission="${o.province}" ${gold > treasury ? "disabled" : ""}>Commission as commander · ${gold} gold</button></div>`;
}

export interface SiegeInfo {
  province: number;
  by: number;
  months: number;
  progress: number;
  breaches: number;
  garrison: number;
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
        <dt>Held</dt><dd>${st.months} month${st.months === 1 ? "" : "s"} · ${Math.round(st.progress * 100)}% into the next</dd>
        <dt>Breaches</dt><dd>${st.breaches ? "▮".repeat(Math.min(st.breaches, 8)) + ` ${st.breaches}` : "none yet"}</dd>
        <dt>Inside</dt><dd>${fmt(st.garrison)} men hold the walls</dd>
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
