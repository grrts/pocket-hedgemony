/**
 * Playable realms and campaign rules (spec §5.7): the free tier, the realm
 * picker's locks and filters, campaign rules fixed at the start, a new game
 * from a seed, the save header and quick start.
 */
import type { Rng } from "../../rng.ts";
import config from "../../../../rules/data/domain/scenario-setup.json" with { type: "json" };

/** Realms playable without buying the full game (SETUP-051). */
export const FREE_REALMS: readonly string[] = config.free_realms;
export const TUTORIAL_REALM: string = config.tutorial_realm;

export function needsFullGame(realm: string): boolean {
  return !FREE_REALMS.includes(realm);
}

export function realmState(realm: string, ownsFullGame: boolean): "playable" | "locked" {
  return ownsFullGame || !needsFullGame(realm) ? "playable" : "locked";
}

// ---------------------------------------------------------------------------
// The realm picker (SETUP-052, SETUP-053)

export interface RealmCard {
  id: string;
  region: string;
}

export interface RealmPicker {
  ownsFullGame: boolean;
  chosen: string | null;
  screen: "picker" | "unlock";
}

export function newPicker(ownsFullGame: boolean): RealmPicker {
  return { ownsFullGame, chosen: null, screen: "picker" };
}

/** Tapping a realm chooses it; a locked one shows its padlock and the button to Unlock. */
export function tapRealm(p: RealmPicker, realm: string): { locked: boolean } {
  p.chosen = realm;
  return { locked: realmState(realm, p.ownsFullGame) === "locked" };
}

export function openUnlock(p: RealmPicker): void {
  p.screen = "unlock";
}

/** Coming back from a purchase returns to the picker with the realm still chosen. */
export function purchaseDone(p: RealmPicker, bought: boolean): void {
  if (bought) p.ownsFullGame = true;
  p.screen = "picker";
}

export type RealmFilter = { by: "region"; region: string } | { by: "free_or_locked"; state: "playable" | "locked" };

export function filterRealms(realms: readonly RealmCard[], f: RealmFilter, ownsFullGame: boolean): RealmCard[] {
  if (f.by === "region") return realms.filter((r) => r.region === f.region);
  return realms.filter((r) => realmState(r.id, ownsFullGame) === f.state);
}

// ---------------------------------------------------------------------------
// Campaign rules (SETUP-054, SETUP-055)

export interface CampaignRules {
  difficulty: string;
  ai_temper: string;
  fog: boolean;
  events: "historical" | "free";
  ironman: boolean;
  end_date: string;
}

export const CAMPAIGN_RULE_FIELDS = config.campaign_rules.fields as (keyof CampaignRules)[];
export const DEFAULT_END_DATE = config.campaign_rules.default_end_date;

export interface Campaign {
  id: string;
  seed: number;
  nation: string;
  /** Saved with the campaign and read-only from here on (INV-SETUP-11). */
  rules: Readonly<CampaignRules>;
}

/** A campaign id from the game's own random generator, seeded by the shell. */
export function campaignId(rng: Rng): string {
  let id = "";
  for (let i = 0; i < 4; i++) id += rng.nextU32().toString(16).padStart(8, "0");
  return id;
}

/** Begin: a new game from a seed, the player's nation and the options, with a new random campaign id (SETUP-056). */
export function beginCampaign(seed: number, nation: string, rules: CampaignRules, idRng: Rng): Campaign {
  return { id: campaignId(idRng), seed, nation, rules: Object.freeze({ ...rules }) };
}

/** Pause → Campaign rules: the saved rules, read-only. */
export function campaignRulesView(c: Campaign): { rules: Readonly<CampaignRules>; editable: false } {
  return { rules: c.rules, editable: false };
}

/** The save header's realm fields (SETUP-057). */
export function saveHeader(c: Campaign): { nation: string; needsFullGame: boolean } {
  return { nation: c.nation, needsFullGame: needsFullGame(c.nation) };
}

/** Quick start: Begin with the last options used and the realm last tapped, or the first suggested one (SETUP-058). */
export function quickStart(last: { tapped: string | null; options: CampaignRules | null }, suggested: readonly string[], defaults: CampaignRules): { step: "begin"; realm: string; rules: CampaignRules } {
  const realm = last.tapped ?? suggested[0];
  if (!realm) throw new Error("no realm to start with");
  return { step: "begin", realm, rules: last.options ?? defaults };
}
