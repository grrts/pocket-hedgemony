import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { bondOf, foldInRealm, makeSubject, mergeCrownsRealm, monthNow } from "./subjects.ts";
import config from "../../rules/data/domain/subjects.json" with { type: "json" };

/**
 * Personal unions in the game (milestone 5, SUBJ-126 to SUBJ-129, D-SUBJ-30):
 * rulers don't age yet, so each January a roll stands in for a ruler dying
 * without a direct heir. His marriages may give the other houses a claim and
 * a pretender (DIPL-107); with no heir at all his crown passes to the house
 * married most often into his (DIPL-110) as a Union, or a Loyal subject's
 * overlord takes it at once (SUBJ-071).
 */

const rel = dip.relations;
const C = config.crowns;
/** A claim the game placed: the month it lapses, kept on the pretender so a save keeps it. */
type Claim = dip.Pretender & { until?: number };

const yearMonth = (m: number): string => `${Math.floor(m / 12)}-${String((m % 12) + 1).padStart(2, "0")}`;

/** The houses married into x's, most marriages first (the first married on a tie): the strongest claim leads (DIPL-110). */
function marriedHouses(d: dip.Diplomacy, x: string): string[] {
  const out: string[] = [];
  for (const m of d.marriages) {
    const other = m.a === x ? m.b : m.b === x ? m.a : null;
    if (other && !out.includes(other)) out.push(other);
  }
  return out.map((h, i) => [h, i] as const).sort((p, q) => dip.marriagesBetween(d, q[0], x) - dip.marriagesBetween(d, p[0], x) || p[1] - q[1]).map(([h]) => h);
}

/** The January roll for every ruler but the player's, and claims that lapse (SUBJ-126 to SUBJ-128). */
export function yearlyCrowns(world: World, news: News[]): void {
  if (world.date.month !== 1) return;
  const d = world.diplomacy;
  const now = monthNow(world);
  const name = (n: number) => world.rules.nations[n]!.name;
  const gone = (id: string) => {
    const n = world.nationIndex.get(id);
    return n === undefined || world.nationGone[n]!;
  };
  d.pretenders = d.pretenders.filter((p) => {
    const until = (p as Claim).until;
    if (until === undefined) return true;
    const keep = until > now && !gone(p.throne) && !gone(p.court);
    const court = world.nationIndex.get(p.court);
    if (!keep && court === world.player && !gone(p.throne)) news.push({ kind: "crown", text: `Your house's claim to the throne of ${name(world.nationIndex.get(p.throne)!)} lapses.`, nations: [court] });
    return keep;
  });
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n] || n === world.player) continue;
    if (dip.draw(d) >= C.heirless_per_year) continue;
    const id = world.nationIds[n]!;
    const before = d.pretenders.length;
    dip.rulerDiesWithoutDirectHeir(d, id);
    for (const p of d.pretenders.slice(before) as Claim[]) {
      p.until = now + C.claim_years * 12;
      if (world.nationIndex.get(p.court) === world.player) news.push({ kind: "crown", text: `${name(n)}'s ruler dies without a son: your house gains a claim to its throne until ${Math.floor(p.until / 12)}.`, nations: [world.player, n] });
    }
    if (dip.draw(d) >= C.no_heir_share) continue;
    inheritCrown(world, n, news);
  }
}

/** Ruler n dies with no heir at all (SUBJ-127, SUBJ-128): who takes his crown, if anyone. */
export function inheritCrown(world: World, n: number, news: News[]): void {
  const d = world.diplomacy;
  const id = world.nationIds[n]!;
  const name = (k: number) => world.rules.nations[k]!.name;
  const bond = bondOf(world, n);
  if (bond) {
    // A subject's crown is its overlord's matter (D-SUBJ-22): a Loyal Vassal or Union is taken at once.
    if (bond.loyalty !== "loyal" || (bond.kind !== "vassal" && bond.kind !== "union")) return;
    const o = world.nationIndex.get(bond.overlord)!;
    news.push({ kind: "crown", text: `${name(n)}'s ruler dies with no heir: ${name(o)}, its overlord, takes its crown.`, nations: [n, o] });
    if (bond.kind === "union") mergeCrownsRealm(world, n, o, news);
    else foldInRealm(world, n, o, news);
    return;
  }
  if (dip.warOf(d, id)) return;
  for (const house of marriedHouses(d, id)) {
    const h = world.nationIndex.get(house);
    if (h === undefined || world.nationGone[h]) continue;
    if (rel.overlord(d.graph, house) || dip.warOf(d, house)) return;
    try {
      makeSubject(world, n, h, "union");
    } catch {
      return;
    }
    d.pretenders = d.pretenders.filter((p) => !(p.throne === id && p.court === house));
    news.push({ kind: "crown", text: h === world.player ? `The last of ${name(n)}'s line dies: its crown passes to your ruler. ${name(n)} is now your union.` : `The last of ${name(n)}'s line dies: its crown passes to the ruler of ${name(h)}, a union of two crowns.`, nations: [n, h] });
    return;
  }
}

/** The player's house: the houses married into it and its claims, for the Diplomacy tab (SUBJ-130). */
export interface HouseView {
  married: number[];
  claims: { throne: number; until: string | null }[];
}

export function houseView(world: World, player: number): HouseView | null {
  if (player < 0) return null;
  const d = world.diplomacy;
  const id = world.nationIds[player]!;
  const idx = (x: string) => world.nationIndex.get(x);
  const married = marriedHouses(d, id).map(idx).filter((n): n is number => n !== undefined && !world.nationGone[n]);
  const claims = d.pretenders
    .filter((p) => p.court === id)
    .map((p) => ({ throne: idx(p.throne), until: (p as Claim).until }))
    .filter((c): c is { throne: number; until: number | undefined } => c.throne !== undefined && !world.nationGone[c.throne])
    .map((c) => ({ throne: c.throne, until: c.until === undefined ? null : yearMonth(c.until) }));
  return { married, claims };
}
