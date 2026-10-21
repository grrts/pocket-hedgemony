import type { World } from "./world.ts";
import type { News } from "./war.ts";
import * as dip from "./domain/diplomacy/index.ts";
import { loyaltyStep } from "./lords.ts";
import { GRIEVANCES } from "./moods.ts";

/**
 * A war with no aim (F-167, Leroy 20 Oct): declaring one punishes the
 * declarer hugely, and at once. Its lords turn away, its name abroad darkens,
 * its people call it an unjust war while it lasts, its peace voices speak
 * louder and its allies may stay out. The numbers live in
 * `diplomacy.war_aims.no_aim_penalty`.
 */

export const NO_AIM = dip.config.war_aims.no_aim_penalty;

/** A war declared with no aim. */
export const aimless = (war: dip.War): boolean => war.aim === "no_aim";

/** Lords of realm n who still have a step to lose: loyalty falls no lower than Disloyal (REALM-088). */
export function lordsWhoTurn(world: World, n: number): number {
  let k = 0;
  for (const l of world.lords) if (l.nation === n && !l.gone && (l.loyalty === "Loyal" || l.loyalty === "Wavering")) k++;
  return k;
}

/** Realms fighting a war they declared with no aim, by nation index. */
export function aimlessDeclarers(world: World): Set<number> {
  const out = new Set<number>();
  for (const w of world.diplomacy.wars) if (aimless(w)) {
    const n = world.nationIndex.get(w.declarer);
    if (n !== undefined) out.add(n);
  }
  return out;
}

/**
 * Realm n has just declared war with no aim: every lord, Warlike or not,
 * takes the aimless_war cause lord_steps times; the realm gains notoriety, the
 * Notorious deed with every realm that knows it (DIPL-174); and its provinces
 * hold Unjust war from this day (moods.ts keeps it while the war lasts).
 */
export function aimlessWarDeclared(world: World, n: number, news: News[]): void {
  let turned = 0;
  world.lords.forEach((l, k) => {
    if (l.nation !== n || l.gone) return;
    const before = l.loyalty;
    for (let i = 0; i < NO_AIM.lord_steps; i++) loyaltyStep(world, k, "aimless_war");
    if (l.loyalty !== before) turned++;
  });
  dip.eventNotoriety(world.diplomacy, world.nationIds[n]!, NO_AIM.notoriety);
  const unjust = 1 << GRIEVANCES.indexOf("Unjust war");
  for (let p = 0; p < world.provinceCount; p++) if (world.provinceOwner[p] === n) world.provinceGrievances[p]! |= unjust;
  if (n !== world.player) return;
  const lords = turned ? `${turned} of your lord${turned === 1 ? "" : "s"} turn against the crown` : "your lords turn against the crown";
  news.push({ kind: "unrest", text: `A war with no aim: ${lords}, every realm that knows you counts it a Notorious deed, and your people call it an Unjust war until it ends.`, nations: [n] });
}
