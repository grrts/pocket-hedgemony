import { W, knows, type Known } from "./model.ts";

/**
 * The war AI (spec §5.21) and inventions outside battle (spec §5.20). The AI
 * uses the same counts as the player; its personality picks among them.
 */

/** Which kinds an AI raises, from its personality (Castile; a city republic) (WAR-195). */
export function kindsRaised(o: { country: string; form?: string }): string[] {
  const k = W.ai.kinds_raised as Record<string, string[]>;
  return k[o.country] ?? (o.form ? k[o.form] : undefined) ?? [];
}

/** The peace-voice share at which an AI offers peace: low risk at a third; a hegemon seeker only when forced (WAR-196). */
export function aiPeaceAt(personality: string): number {
  const v = (W.ai.peace_at as Record<string, number | string>)[personality];
  if (v === undefined) throw new Error(`no peace threshold for ${personality}`);
  return v === "forced" ? W.peace.half : (v as number);
}

/** The AI reads exactly what the player sees: forage limits, food reserves, peace voices (WAR-197). */
export const aiReads = <T extends { forageLimits: unknown; reserves: unknown; peaceVoices: unknown }>(playerView: T): T => playerView;

/** B inventions in war: castle types, siege parallels, road factors (WAR-190). */
export function bInvention(id: string): { castle?: string; siege?: number; road?: string; bombardsNearlyUseless?: boolean } {
  const e = (W.inventions_outside_battle as Record<string, { castle?: string; siege?: number; road?: string }>)[id] ?? {};
  const out: { castle?: string; siege?: number; road?: string; bombardsNearlyUseless?: boolean } = { ...e };
  if (e.castle) out.bombardsNearlyUseless = (W.castles as Record<string, { bombards_nearly_useless?: boolean }>)[e.castle]?.bombards_nearly_useless === true;
  return out;
}

/** Castle types a realm can have by what it knows (WAR-190). */
export const castleTypes = (known: Known): string[] => Object.entries(W.castles).filter(([, c]) => knows(known, c.invention)).map(([n]) => n);

/** W14: armies split and join in a day (WAR-191). */
export const splitJoinDays = (known: Known): number | null => (knows(known, "W14") ? W.inventions_outside_battle.W14.split_join_days : null);

/** W22: scouts see 4 provinces; it can bomb castles and wagons (WAR-193). */
export const aircraft = (known: Known): { scoutRange: number; bombs: string[] } | null =>
  knows(known, "W22") ? { scoutRange: W.inventions_outside_battle.W22.scout_range, bombs: W.inventions_outside_battle.W22.bomb } : null;

export type NoticeKind = keyof typeof W.notifications;
/** Notifications for short sessions: battle won or lost with the reason, a breach, terms, peace voices passing half, pay owed, an army hungry (WAR-203). */
export const notification = (kind: NoticeKind, reason?: string): { title: string; reason?: string } => ({ title: W.notifications[kind], ...(reason === undefined ? {} : { reason }) });

export type RiskTolerance = "low" | "medium" | "high";

/** An AI army's standing orders from its realm's risk tolerance (WAR-194, D-WAR-14). */
export function aiStandingOrders(risk: RiskTolerance): { order: "attack" | "wait"; retreat: string } {
  const o = W.ai.standing_orders[risk];
  return { order: o.order === "wait" ? "wait" : "attack", retreat: o.retreat };
}

/** Whether an AI army besieges or raids: a high-risk realm raids with horse-only armies, others besiege (WAR-195, D-WAR-14). */
export const aiBesiegesOrRaids = (risk: RiskTolerance, horseOnly: boolean): "raid" | "besiege" =>
  horseOnly && (W.ai.raids_at as string[]).includes(risk) ? "raid" : "besiege";

/** What the player can do at each 4-hour step of a running battle (WAR-136, X-1); there is no Skip to result. */
export const BATTLE_STEP_CHOICES: readonly string[] = W.battle_step_choices;
