import type { World } from "./world.ts";
import { isoDate } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";

/**
 * What the map's diplomacy lens draws for the player (DIPL-183, DIPL-184,
 * DIPL-209): each realm's relation to them, the realms in a league against
 * them, their envoys on the road and the realms they hold a war aim on. The
 * library decides the colours; this file only puts them in nation indices.
 */

/** The lens's relations, in the order of `DiplomacyLensView.relation`'s values (DIPL-183). */
export const LENS_RELATIONS = ["own", "ally", "pledged", "close", "warm", "neutral", "cold", "hostile", "war"] as const;
export type LensRelation = (typeof LENS_RELATIONS)[number];

const BY_COLOUR: Record<string, LensRelation> = {
  own: "own",
  blue: "ally",
  "light blue": "pledged",
  green: "close",
  "pale green": "warm",
  grey: "neutral",
  orange: "cold",
  red: "hostile",
  "red, hatched": "war",
};

export interface DiplomacyLensView {
  /** Each nation's relation to the player, an index into LENS_RELATIONS (-1 for a realm that is gone). */
  relation: Int8Array;
  /** 1 for a member of a league against the player (drawn with a red border). */
  league: Uint8Array;
  /** The player's envoys on the road: the province they left and the one they ride to (the two capitals), how far along (0..1) and days still to go. */
  envoys: { target: number; from: number; to: number; progress: number; daysLeft: number }[];
  /** Nations the player holds a war aim on other than Raid and No aim (a crossed sword over them). */
  aims: number[];
}

const DAY_MS = 86400000;

export function diplomacyLensView(world: World, player: number): DiplomacyLensView | null {
  if (player < 0) return null;
  const d = world.diplomacy;
  const me = world.nationIds[player]!;
  const relation = new Int8Array(world.nationCount).fill(-1);
  const league = new Uint8Array(world.nationCount);
  const members = new Set(dip.leagueAgainst(d, me)?.members ?? []);
  for (let n = 0; n < world.nationCount; n++) {
    if (world.nationGone[n]) continue;
    const id = world.nationIds[n]!;
    relation[n] = LENS_RELATIONS.indexOf(BY_COLOUR[dip.lensColour(d, me, id)] ?? "neutral");
    if (members.has(id)) league[n] = 1;
  }
  const capital = (n: number | undefined) => (n === undefined ? -1 : world.provinceIndex.get(world.rules.nations[n]!.capital) ?? -1);
  const now = Date.parse(isoDate(world));
  const envoys: DiplomacyLensView["envoys"] = [];
  for (const e of d.envoys) {
    if (e.country !== me || e.status !== "road") continue;
    const target = world.nationIndex.get(e.target);
    const from = capital(player);
    const to = capital(target);
    if (target === undefined || from < 0 || to < 0) continue;
    const sent = Date.parse(e.sent);
    const arrival = Date.parse(e.arrival);
    const progress = arrival > sent ? Math.max(0, Math.min(1, (now - sent) / (arrival - sent))) : 1;
    envoys.push({ target, from, to, progress, daysLeft: Math.max(0, Math.round((arrival - now) / DAY_MS)) });
  }
  // A war aim as the demands count one: anything but the always-held Raid and No aim (DIPL-203).
  const aims: number[] = [];
  for (let n = 0; n < world.nationCount; n++) {
    if (n === player || world.nationGone[n]) continue;
    if (dip.warAimsOf(d, me, world.nationIds[n]!).some((x) => x.aim !== "raid" && x.aim !== "no_aim")) aims.push(n);
  }
  return { relation, league, envoys, aims };
}
